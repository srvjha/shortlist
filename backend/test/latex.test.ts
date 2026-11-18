import { describe, expect, it } from "vitest";
import { dateRange, tex, texRich, texUrl } from "../src/templates/latex.js";
import { makeXetexCompatible, needsRerun, parseErrors } from "../src/lib/latex/tectonic.js";

describe("tex", () => {
  it("escapes every LaTeX special character", () => {
    expect(tex("50% of $5 & #1_a {b} ~ ^ \\")).toBe(
      "50\\% of \\$5 \\& \\#1\\_a \\{b\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}",
    );
  });

  it("neutralises command injection", () => {
    expect(tex("\\input{/etc/passwd}")).toBe("\\textbackslash{}input\\{/etc/passwd\\}");
    expect(tex("\\immediate\\write18{rm -rf /}")).not.toContain("\\write18{");
  });
});

describe("texRich", () => {
  it("turns **bold** into \\textbf and escapes inside it", () => {
    expect(texRich("Built **Node.js & Go** APIs")).toBe("Built \\textbf{Node.js \\& Go} APIs");
  });

  it("leaves unmatched asterisks as text", () => {
    expect(texRich("5 ** 2")).toBe("5 ** 2");
  });
});

describe("texUrl", () => {
  it("escapes characters that break \\href", () => {
    expect(texUrl("https://x.com/a%20b#top")).toBe("https://x.com/a\\%20b\\#top");
    // An unescaped & inside a project heading's table broke the compile.
    expect(texUrl("https://www.youtube.com/watch?v=abc&t=3s")).toBe("https://www.youtube.com/watch?v=abc\\&t=3s");
  });

  it("neutralises ^^ hex escapes", () => {
    expect(texUrl("https://a.com/^^7d^^5cinput")).toBe("https://a.com/\\%5E\\%5E7d\\%5E\\%5E5cinput");
  });
});

describe("dateRange", () => {
  it("formats months and present", () => {
    expect(dateRange("2025-05", "present")).toBe("May 2025 -- Present");
    expect(dateRange("2022", "2026")).toBe("2022 -- 2026");
    expect(dateRange(undefined, "2024-01")).toBe("Jan 2024");
  });
});

describe("makeXetexCompatible", () => {
  it("removes pdfTeX-only lines from Overleaf templates", () => {
    const out = makeXetexCompatible("\\input{glyphtounicode}\n\\pdfgentounicode=1\n\\begin{document}");
    expect(out).not.toContain("glyphtounicode}");
    expect(out).not.toMatch(/^\\pdfgentounicode/m);
    expect(out).toContain("\\begin{document}");
  });
});

describe("needsRerun", () => {
  it("reruns only for references, page totals and contents", () => {
    expect(needsRerun("\\href{https://x.dev}{site} \\section{Work} \\labelitemi")).toBe(false);
    for (const tex of [
      "\\ref{a}",
      "\\pageref{LastPage}",
      "\\usepackage{lastpage}",
      "\\label{a}",
      "\\cite{b}",
      "\\tableofcontents",
      "\\Cref{c}",
    ]) {
      expect(needsRerun(tex)).toBe(true);
    }
  });
});

describe("parseErrors", () => {
  it("extracts line numbers and adds hints", () => {
    const errors = parseErrors(
      "error: main.tex:12: Misplaced alignment tab character &\nerror: the XeTeX engine had an unrecoverable error",
    );
    expect(errors).toEqual([
      { line: 12, message: "Misplaced alignment tab character &", hint: "Write \\& for a literal ampersand." },
    ]);
  });

  it("falls back to a generic error", () => {
    expect(parseErrors("warning: nothing useful")).toEqual([{ line: null, message: "LaTeX compilation failed" }]);
  });
});
