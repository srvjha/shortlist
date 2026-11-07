import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { extractTextItems } from "../src/modules/ats/parser/extract.js";
import { parseItems } from "../src/modules/ats/parser/parse.js";
import { parseQuality } from "../src/modules/ats/parser/quality.js";
import type { ParseReport, TextItem } from "../src/modules/ats/parser/types.js";
import { createTectonic } from "../src/lib/latex/tectonic.js";
import { templates } from "../src/templates/index.js";
import { sampleResume } from "../src/templates/sample.js";

const hasTectonic = (() => {
  try {
    execFileSync("tectonic", ["--version"]);
    return true;
  } catch {
    return false;
  }
})();

const page = { width: 595, height: 842 };
const item = (text: string, x: number, y: number, extra: Partial<TextItem> = {}): TextItem => ({
  text,
  x,
  y,
  width: text.length * 5,
  height: 10,
  page: 1,
  ...extra,
});
const report = (items: TextItem[]) => parseQuality(parseItems(items, page), { items, page });
const issue = (result: ParseReport, id: string) => result.issues.find((i) => i.id === id)!;

const body = [
  item("Aarav Sharma", 40, 80, { height: 20, bold: true }),
  item("Experience", 40, 130, { height: 12, bold: true }),
  item("SDE Intern", 40, 150, { bold: true }),
  item("May 2025 - Jul 2025", 460, 150),
  item("Paylane", 40, 163),
  item("• Cut p99 latency of the payouts API by 40% using Go and Redis caching", 50, 176),
];

describe("parseQuality on hand-built items", () => {
  it("fails contact details that only sit in the page header", () => {
    const result = report([item("aarav@example.com | +91 98765 43210", 40, 20, { height: 9 }), ...body]);
    expect(issue(result, "contact").status).toBe("fail");
    expect(issue(result, "contact").fix).toContain("main body");
    expect(result.parsed.name).toBe("Aarav Sharma");
    expect(result.parsed.jobs).toEqual([{ title: "SDE Intern", company: "Paylane", dates: "May 2025 - Jul 2025" }]);
  });

  it("reads contact details in the body", () => {
    const result = report([...body, item("aarav@example.com | +91 98765 43210", 40, 102)]);
    expect(issue(result, "contact").status).toBe("pass");
  });

  it("flags private-use icon glyphs", () => {
    const result = report([...body, item("", 40, 102), item("aarav@example.com", 52, 102)]);
    expect(issue(result, "glyphs").status).not.toBe("pass");
  });

  it("reads right-aligned dates as part of a single column", () => {
    // Four roles whose dates end on the right margin and happen to start at nearly the same x.
    const dates = ["May 2025 - Jul 2025", "Aug 2023 - Apr 2025", "Jan 2025 - Apr 2025", "Jun 2024 - Sep 2024"];
    const items = dates.flatMap((date, i) => {
      const y = 150 + i * 70;
      return [
        item(`Role ${i + 1}`, 40, y, { bold: true }),
        item(date, 555 - date.length * 5 + (i % 2), y, { width: date.length * 5 - (i % 2) }),
        item("Company", 40, y + 13),
        item("• Built and shipped a service used by thousands of students every day", 50, y + 26),
        item("• Cut response times in half with caching and better queries", 50, y + 39),
      ];
    });
    expect(issue(report([...body.slice(0, 2), ...items]), "columns").status).toBe("pass");
  });

  it("still flags a real two-column layout", () => {
    const left = Array.from({ length: 12 }, (_, i) => item(`Skill line ${i} with a few words`, 40, 150 + i * 14));
    const right = Array.from({ length: 12 }, (_, i) => item(`Experience text ${"x".repeat(i % 5)}`, 330, 150 + i * 14));
    expect(issue(report([...body.slice(0, 2), ...left, ...right]), "columns").status).not.toBe("pass");
  });

  it("counts a company read without the city typed after it as read correctly", () => {
    const expected = { jobs: [{ title: "SDE Intern", company: "Paylane, Bengaluru" }] };
    const result = parseQuality(parseItems(body, page), { items: body, page, expected });
    expect(result.fields.find((f) => f.id === "job1.company")?.ok).toBe(true);
  });

  it("knows Open-Source Contributions as a standard heading", () => {
    const items = [
      ...body,
      item("Open-Source Contributions", 40, 200, { height: 12, bold: true }),
      item("• Fixed a bug in a Rails gem used by thousands of apps", 50, 220),
    ];
    expect(issue(report(items), "sections").status).toBe("pass");
  });

  it("treats an empty PDF as scanned", () => {
    const result = report([]);
    expect(issue(result, "density").status).toBe("fail");
    expect(issue(result, "density").detail).toContain("scanned");
    expect(result.parseRate).toBeNull();
  });
});

describe.skipIf(!hasTectonic)("templates round-trip through the parser", () => {
  const compile = createTectonic({ bin: "tectonic", onlyCached: false, timeoutMs: 120_000, concurrency: 4 });
  const expected = {
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+91 98765 43210",
    sectionKinds: ["skills", "experience", "projects", "education"],
    jobs: [{ title: "SDE Intern", company: "Paylane" }],
  };
  const reports = new Map<string, ParseReport>();

  beforeAll(async () => {
    await Promise.all(
      templates.map(async (template) => {
        const result = await compile(template.render(sampleResume));
        if (!result.ok) throw new Error(`${template.id}: ${JSON.stringify(result.errors)}`);
        const { items, pageWidth, pageHeight } = await extractTextItems(new Uint8Array(result.pdf));
        const size = { width: pageWidth, height: pageHeight };
        reports.set(template.id, parseQuality(parseItems(items, size), { items, page: size, expected }));
      }),
    );
  }, 300_000);

  for (const template of templates) {
    it(`${template.id} ${template.atsSafe ? "parses back" : "is flagged for columns"}`, () => {
      const result = reports.get(template.id)!;
      const columns = issue(result, "columns").status;
      // Every template hides its icons behind empty ActualText, which extractors like pdftotext honour.
      expect(issue(result, "glyphs").status, issue(result, "glyphs").detail).toBe("pass");
      if (template.atsSafe) {
        expect(result.parseRate, JSON.stringify(result.fields.filter((f) => !f.ok))).toBeGreaterThanOrEqual(0.9);
        expect(columns).toBe("pass");
      } else expect(["warn", "fail"]).toContain(columns);
    });
  }
});
