import type { ResumeContent } from "../../schemas/resume-content.js";
import { findTemplate } from "../../templates/index.js";
import type { ResumeLayout } from "../../templates/layout.js";
import { tex } from "../../templates/latex.js";

// \newline{} and not \\: a line starting with "[" after \\ would be read as an optional length and fail to compile.
export function letterBodyTex(body: string) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => tex(line.trim()))
        .filter(Boolean)
        .join("\\newline{}\n"),
    )
    .filter(Boolean);
  return `\\par\\vspace{16pt}
\\begingroup
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{10pt}
${paragraphs.join("\n\n")}
\\par
\\endgroup
`;
}

// A resume template with no sections renders its own fonts and contact header, so the letter goes in after that.
export function renderLetter(
  body: string,
  look: { templateId?: string | null | undefined; basics: ResumeContent["basics"]; layout?: ResumeLayout | undefined },
) {
  const template = findTemplate(look.templateId ?? "") ?? findTemplate("developer")!;
  const shell = template.render({ basics: look.basics, sections: [] }, look.layout);
  const end = shell.lastIndexOf("\\end{document}");
  return `${shell.slice(0, end)}${letterBodyTex(body)}${shell.slice(end)}`;
}
