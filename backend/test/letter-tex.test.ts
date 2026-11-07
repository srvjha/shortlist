import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/db/index.js", () => ({ db: {} }));

import { compileTex } from "../src/lib/latex/compile.js";
import { letterBodyTex, renderLetter } from "../src/modules/letters/letter-tex.js";
import { templates } from "../src/templates/index.js";

const basics = {
  name: "Neha Kulkarni",
  email: "neha@example.com",
  phone: "+91 98765 43210",
  location: "Pune",
  links: [],
};

describe("letterBodyTex", () => {
  it("escapes every LaTeX special in the letter's text", () => {
    const out = letterBodyTex("Grew sales 50% & cut $5_000 #1 {x} ~ ^ \\input{/etc/passwd}");
    expect(out).toContain("Grew sales 50\\% \\& cut \\$5\\_000 \\#1 \\{x\\}");
    expect(out).toContain("\\textbackslash{}input\\{/etc/passwd\\}");
    expect(out).not.toContain("\\input{");
  });

  it("keeps paragraphs and line breaks, and survives a line starting with a bracket", () => {
    const out = letterBodyTex("Sincerely,\n[Your name]\n\nNext   \n\n\n\nLast");
    expect(out).toContain("Sincerely,\\newline{}\n[Your name]\n\nNext\n\nLast");
  });
});

describe("renderLetter", () => {
  it("puts the letter inside the document, after the template's header", () => {
    const out = renderLetter("Dear Hiring Manager,", { templateId: "campus", basics });
    expect(out.indexOf("Neha Kulkarni")).toBeLessThan(out.indexOf("Dear Hiring Manager,"));
    expect(out.indexOf("Dear Hiring Manager,")).toBeLessThan(out.lastIndexOf("\\end{document}"));
  });

  it("falls back to the default look for a template that no longer exists", () => {
    expect(renderLetter("Hello", { templateId: "gone", basics })).toContain("Hello");
  });

  const hasTectonic = spawnSync("tectonic", ["--version"]).status === 0;
  it.skipIf(!hasTectonic).each(templates.map((template) => template.id))(
    "compiles with the %s template",
    async (id) => {
      const result = await compileTex(
        renderLetter("Dear Hiring Manager,\n\nGrew sales 50% & more.\n\nSincerely,\n[Your name]", {
          templateId: id,
          basics,
        }),
      );
      expect(result.ok ? "ok" : result.errors).toBe("ok");
    },
  );
});
