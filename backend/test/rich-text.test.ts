import { describe, expect, it } from "vitest";
import { applyBold, placeLinks } from "../src/modules/imports/extraction.js";
import type { ResumeContent } from "../src/schemas/resume-content.js";
import { linkParts, plainText } from "../src/schemas/rich-text.js";
import { texRich } from "../src/templates/latex.js";

const text = "Ranked [2495 globally](https://drive.google.com/file/d/x/view?usp=sharing) in **Meta Hacker Cup**";

describe("inline links", () => {
  it("splits text into plain runs and links", () => {
    expect(linkParts(text)).toEqual([
      { text: "Ranked " },
      { text: "2495 globally", url: "https://drive.google.com/file/d/x/view?usp=sharing" },
      { text: " in **Meta Hacker Cup**" },
    ]);
    expect(plainText(text)).toBe("Ranked 2495 globally in Meta Hacker Cup");
  });

  it("renders a link on its own words in LaTeX, escaping the address", () => {
    expect(
      texRich(
        "[Codeforces](https://codeforces.com/profile/a_b) and [CodeChef **4-star**](https://codechef.com/u?x=1&y=2)",
      ),
    ).toBe(
      "\\href{https://codeforces.com/profile/a_b}{\\underline{Codeforces}} and \\href{https://codechef.com/u?x=1\\&y=2}{\\underline{CodeChef \\textbf{4-star}}}",
    );
  });

  it("leaves anything that isn't a web or mail address as typed", () => {
    expect(texRich("[click](javascript:alert(1))")).toBe("[click](javascript:alert(1))");
  });

  it("never bolds inside a link during import", () => {
    const content = {
      basics: { name: "A", links: [] },
      sections: [
        {
          id: "s",
          type: "summary",
          title: "Summary",
          hidden: false,
          text: "See [my GitHub](https://github.com/a) and GitHub stars",
        },
      ],
    } as unknown as ResumeContent;
    const bolded = applyBold(content, ["GitHub"]).sections[0];
    expect(bolded?.type === "summary" && bolded.text).toBe(
      "See [my GitHub](https://github.com/a) and **GitHub** stars",
    );
  });
});

describe("placeLinks", () => {
  const drive = "https://drive.google.com/file/d/x/view";
  const content = () =>
    ({
      basics: { name: "A", links: [] },
      sections: [
        {
          id: "l",
          type: "list",
          title: "Achievements",
          hidden: false,
          entries: [
            {
              id: "a",
              hidden: false,
              title: "CopilotKit (36k+)",
              subtitle: "Resolved styling",
              url: "https://github.com/c/pull/1",
              bullets: [],
            },
            // What the model returned for Tushar: both profile links gone, and the Drive link on the wrong item.
            {
              id: "b",
              hidden: false,
              title: "Codeforces rated **1490** and CodeChef 4-star (1884)",
              url: drive,
              bullets: [],
            },
            { id: "c", hidden: false, title: "Ranked 2495 globally in Meta Hacker Cup", bullets: [] },
          ],
        },
      ],
    }) as unknown as ResumeContent;
  const hints = [
    { text: "CopilotKit", url: "https://github.com/c/pull/1" },
    { text: "Codeforces", url: "https://codeforces.com/profile/t" },
    { text: "CodeChef 4-star (1884)", url: "https://www.codechef.com/users/t" },
    { text: "2495 globally", url: drive },
  ];

  it("puts each link back on its own words and takes it off the wrong item", () => {
    const list = placeLinks(content(), hints).sections[0];
    if (list?.type !== "list") throw new Error("expected a list");
    const [copilot, judges, hacker] = list.entries;
    expect(copilot).toMatchObject({ title: "CopilotKit (36k+)", url: "https://github.com/c/pull/1" });
    expect(judges!.title).toBe(
      "[Codeforces](https://codeforces.com/profile/t) rated **1490** and [CodeChef 4-star (1884)](https://www.codechef.com/users/t)",
    );
    expect(judges!.url).toBeUndefined();
    expect(hacker!.title).toBe(`Ranked [2495 globally](${drive}) in Meta Hacker Cup`);
  });

  it("moves an exactly bold phrase inside the link and skips one half in bold", () => {
    const c = {
      basics: { name: "A", links: [] },
      sections: [
        { id: "s", type: "summary", title: "S", hidden: false, text: "Built **Shortlist** and **a big app**" },
      ],
    } as unknown as ResumeContent;
    const out = placeLinks(c, [
      { text: "Shortlist", url: "https://shortlist.co.in" },
      { text: "big", url: "https://big.example" },
    ]).sections[0];
    expect(out?.type === "summary" && out.text).toBe(
      "Built [**Shortlist**](https://shortlist.co.in) and **a big app**",
    );
  });
});

describe("placeLinks with a short first word", () => {
  it("keeps a word like PR, which isn't an icon glyph", () => {
    const c = {
      basics: { name: "A", links: [] },
      sections: [{ id: "s", type: "summary", title: "S", hidden: false, text: "Shipped PR #4945 and more" }],
    } as unknown as ResumeContent;
    const out = placeLinks(c, [{ text: "PR #4945", url: "https://github.com/a/b/pull/4945" }]).sections[0];
    expect(out?.type === "summary" && out.text).toBe("Shipped [PR #4945](https://github.com/a/b/pull/4945) and more");
  });
});

describe("placeLinks on a sentence the model linked as a whole", () => {
  it("moves the link onto its words", () => {
    const c = {
      basics: { name: "A", links: [] },
      sections: [
        {
          id: "l",
          type: "list",
          title: "Achievements",
          hidden: false,
          entries: [
            {
              id: "b",
              hidden: false,
              title: "Codeforces rated 1490 and more",
              url: "https://codeforces.com/profile/t",
              bullets: [],
            },
          ],
        },
      ],
    } as unknown as ResumeContent;
    const list = placeLinks(c, [{ text: "Codeforces", url: "https://codeforces.com/profile/t" }]).sections[0];
    if (list?.type !== "list") throw new Error("expected a list");
    expect(list.entries[0]).toMatchObject({
      title: "[Codeforces](https://codeforces.com/profile/t) rated 1490 and more",
    });
    expect(list.entries[0]!.url).toBeUndefined();
  });
});
