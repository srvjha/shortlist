import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { compileTex } from "../lib/latex/compile.js";
import { templates } from "../templates/index.js";
import { previewResumes } from "../templates/preview-resumes.js";

// Rewrites frontend/public/templates and its thumbs from previewResumes. Needs tectonic, pdftoppm and cwebp.
const output = resolve(import.meta.dirname, "../../../frontend/public/templates");
const work = mkdtempSync(join(tmpdir(), "previews-"));

for (const template of templates) {
  const content = previewResumes[template.id];
  if (!content) throw new Error(`No preview resume for ${template.id}`);
  const result = await compileTex(template.render(content, { spacing: "normal", links: "icon-and-name" }));
  if (!result.ok) throw new Error(`${template.id}: ${JSON.stringify(result.errors)}`);
  const pdf = join(work, `${template.id}.pdf`);
  writeFileSync(pdf, result.pdf);
  execFileSync("pdftoppm", ["-png", "-r", "120", "-singlefile", "-f", "1", "-l", "1", pdf, join(output, template.id)]);
  execFileSync("cwebp", [
    "-quiet",
    "-q",
    "82",
    "-resize",
    "560",
    "0",
    join(output, `${template.id}.png`),
    "-o",
    join(output, "thumbs", `${template.id}.webp`),
  ]);
  console.log(template.id, result.pageCount ?? "");
}
process.exit(0);
