import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createTectonic } from "../src/lib/latex/tectonic.js";
import { resumeContentSchema } from "../src/schemas/resume-content.js";
import { templates } from "../src/templates/index.js";
import { sampleResume } from "../src/templates/sample.js";
import { leadsWithEducation } from "../src/templates/shared-business.js";

const hasTectonic = (() => {
  try {
    execFileSync("tectonic", ["--version"]);
    return true;
  } catch {
    return false;
  }
})();

const compile = createTectonic({ bin: "tectonic", onlyCached: false, timeoutMs: 120_000, concurrency: 2 });
const bare = resumeContentSchema.parse({ basics: { name: "Only Name" }, sections: [] });
const nameless = resumeContentSchema.parse({ basics: { name: "", headline: "Data Analyst" }, sections: [] });

describe.skipIf(!hasTectonic)("templates compile", () => {
  for (const template of templates) {
    it(`${template.id} with full content`, async () => {
      const result = await compile(template.render(sampleResume));
      expect(result.ok, JSON.stringify(result)).toBe(true);
    });

    it(`${template.id} with a summary section`, async () => {
      const text = "Analyst with **5 years** in M&A and 20% growth, focused on #fintech.";
      const withSummary = {
        ...sampleResume,
        sections: [
          { id: "summary", title: "Summary", hidden: false, type: "summary" as const, text },
          ...sampleResume.sections,
        ],
      };
      const tex = template.render(withSummary);
      expect(tex).toContain("5 years");
      const result = await compile(tex);
      expect(result.ok, JSON.stringify(result)).toBe(true);
    });

    it(`${template.id} with no name yet`, async () => {
      const result = await compile(template.render(nameless));
      expect(result.ok, JSON.stringify(result)).toBe(true);
    });

    it(`${template.id} with only a name`, async () => {
      const result = await compile(template.render(bare));
      expect(result.ok, JSON.stringify(result)).toBe(true);
    });

    it(`${template.id} with a skills section added but not filled in`, async () => {
      const empty = resumeContentSchema.parse({
        basics: { name: "Only Name" },
        sections: [
          { id: "s", title: "Technical Skills", type: "skills", groups: [{ id: "g", name: "Languages", items: [] }] },
        ],
      });
      const result = await compile(template.render(empty));
      expect(result.ok, JSON.stringify(result)).toBe(true);
    });

    it(`${template.id} with links as icon and name, and as link only`, async () => {
      for (const links of ["icon-and-name", "link"] as const) {
        const result = await compile(template.render(sampleResume, { spacing: "normal", links }));
        expect(result.ok, JSON.stringify(result)).toBe(true);
      }
    });

    it(`${template.id} with every spacing preset and font size`, async () => {
      for (const layout of [
        { spacing: "compact", fontSize: 10 },
        { spacing: "relaxed", fontSize: 12 },
      ] as const) {
        const result = await compile(template.render(sampleResume, layout));
        expect(result.ok, JSON.stringify(result)).toBe(true);
      }
    });
  }
});

describe("templates hide content", () => {
  it("omits hidden bullets, entries and sections", () => {
    const content = structuredClone(sampleResume);
    const experience = content.sections.find((s) => s.type === "experience");
    if (experience?.type !== "experience") throw new Error("fixture changed");
    experience.entries[0]!.bullets[0]!.hidden = true;
    const skills = content.sections.find((s) => s.type === "skills")!;
    skills.hidden = true;

    for (const template of templates) {
      const texSource = template.render(content);
      expect(texSource).not.toContain("payouts API");
      expect(texSource).not.toContain("Technical Skills");
    }
  });
});

describe("project heading", () => {
  const yugati = (dated: boolean) =>
    resumeContentSchema.parse({
      basics: { name: "A" },
      sections: [
        {
          id: "p",
          type: "projects",
          title: "Projects",
          entries: [
            {
              id: "e",
              name: "Yugati",
              technologies: ["OpenAI Agents SDK", "GPT-4.1", "Next.js", "TypeScript", "Redis"],
              links: [
                { label: "Live", url: "https://yugati.in" },
                { label: "GitHub", url: "https://github.com/srvjha/yugati" },
              ],
              ...(dated && { start: "2025-01", end: "2025-04" }),
            },
          ],
        },
      ],
    });
  const jake = templates.find((t) => t.id === "jake")!;

  it("keeps a 79-character stack on the heading line when no date needs the room", () => {
    expect(jake.render(yugati(false))).toContain(String.raw`$|$ \emph{OpenAI Agents SDK`);
  });

  it("moves the same stack under the heading when a date sits on the right", () => {
    expect(jake.render(yugati(true))).not.toContain(String.raw`$|$ \emph{OpenAI Agents SDK`);
  });
});

describe("contact link styles", () => {
  const withLinks = structuredClone(sampleResume);
  withLinks.basics.links = [{ label: "GitHub", url: "https://github.com/srvjha" }];

  it("shows the icon and the link's name instead of its address, and keeps the email readable", () => {
    for (const template of templates) {
      const texSource = template.render(withLinks, { spacing: "normal", links: "icon-and-name" });
      expect(texSource).toContain("\\href{https://github.com/srvjha}");
      expect(texSource).toContain("\\faGithub");
      expect(texSource).toContain("\\underline{GitHub}");
      expect(texSource).not.toContain("\\underline{github.com/srvjha}");
      expect(texSource).toContain(withLinks.basics.email!);
    }
  });

  it("drops every contact icon in link mode", () => {
    for (const template of templates) {
      const texSource = template.render(withLinks, { spacing: "normal", links: "link" });
      for (const icon of ["\\faGithub", "\\faEnvelope", "\\faPhone"]) expect(texSource).not.toContain(icon);
      expect(texSource).toContain("github.com/srvjha");
    }
  });
});

// sha256 of each template's sample render before layouts existed. The default layout must not change a byte;
// if the sample or a template changes on purpose, update the hash.
const beforeLayouts: Record<string, string> = {
  developer: "e9b18fa1bc63fa21c6e081c6e572fda9f48bce22313062cf0ac282082642a4c2",
  jake: "2c03fb4f439b9f3097c45be13542288d03ccb10f2360b02eac240c8ad00449ad",
  modern: "aa7f5595542b834eca6e2570ce8ec707f0af5d10290d028ed3fd98c076e743c7",
  sb2nov: "c6d4ae634f41bd395d0106a81d7cd242198e232c849653d8155034f4e6bd0528",
  "ml-research": "24526965ad855c92644461488659b91b3c079a90a86e7e38c5b3cc303b1607e4",
  "data-analyst": "dc486274b91f6dbd2eee3a645ef0b84f10b11a5a54f0bb030c8979bfc1aed078",
  "product-manager": "68fd096b28bcd23de44a00ea6e6583315ff5b0a5eea50196c74253764c759b38",
  designer: "413f3bd51ab1ada960469d91aa9b982579a8dc716165fabf46ad68e6f24ebf1a",
  campus: "bf680b9c8494c2946843a137e25743198389c3a9c532256650c8f3d70b78658b",
  banking: "73a22719b1ba1ee35862e97943e50b35c43971c9ba183f027655b66bed8ed1a0",
  finance: "db8b4d50932966fb847b28936210df2073f1ff9b16aab745500b80c851b3c452",
  consulting: "0b001f778617274761e389c687969ccfd97c3730cd270260c690634e6c834d54",
  marketing: "ae956a440047c0b7948a1ba48f1d1679385e5ab7775a3cbe6257c7b22df92cc4",
  executive: "0df214f4a70739c7aa24f4a43c12376e116a4ce770fd769d61218f07e5c8c7e4",
};

describe("default layout", () => {
  const sha = (texSource: string) => createHash("sha256").update(texSource).digest("hex");
  for (const template of templates) {
    it(`${template.id} renders exactly as before`, () => {
      expect(sha(template.render(sampleResume))).toBe(beforeLayouts[template.id]);
      expect(sha(template.render(sampleResume, { spacing: "normal" }))).toBe(beforeLayouts[template.id]);
    });
  }

  it("changes the font size and spacing when asked", () => {
    const texSource = templates[0]!.render(sampleResume, { spacing: "compact", fontSize: 12 });
    expect(texSource).toMatch(/^\\documentclass\[letterpaper,12pt\]/);
    expect(texSource).toContain("\\linespread{0.95}");
  });
});

describe("leadsWithEducation", () => {
  it("puts education first early in a career", () => {
    expect(leadsWithEducation(sampleResume.sections)).toBe(true);
    expect(leadsWithEducation([])).toBe(true);
  });

  it("puts experience first after two roles since graduating", () => {
    const sections = sampleResume.sections.map((section) => {
      if (section.type === "education")
        return { ...section, entries: section.entries.map((e) => ({ ...e, start: "2017-07", end: "2021-05" })) };
      if (section.type === "experience") {
        const [first] = section.entries;
        return {
          ...section,
          entries: [
            { ...first!, start: "2021-07" },
            { ...first!, id: `${first!.id}-2`, start: "2023-01" },
          ],
        };
      }
      return section;
    });
    expect(leadsWithEducation(sections)).toBe(false);
  });
});
