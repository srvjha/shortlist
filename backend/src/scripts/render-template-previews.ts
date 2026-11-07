import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { compileTex } from "../lib/latex/compile.js";
import { formatSamples } from "../templates/format-samples.js";
import { templates } from "../templates/index.js";
import { previewResumes } from "../templates/preview-resumes.js";

// Rewrites frontend/public/templates and public/formats, with their thumbs, from previewResumes and formatSamples.
// Needs tectonic, pdftoppm and cwebp.
const publicDir = resolve(import.meta.dirname, "../../../frontend/public");
const work = mkdtempSync(join(tmpdir(), "previews-"));

const jobs = [
  ...templates.map((template) => ({
    folder: "templates",
    name: template.id,
    template,
    content: previewResumes[template.id],
  })),
  ...formatSamples.map((sample) => ({
    folder: "formats",
    name: sample.slug,
    template: templates.find((t) => t.id === sample.templateId),
    content: sample.content,
  })),
];

for (const { folder, name, template, content } of jobs) {
  if (!template || !content) throw new Error(`No template or content for ${folder}/${name}`);
  const result = await compileTex(template.render(content, { spacing: "normal", links: "icon-and-name" }));
  if (!result.ok) throw new Error(`${folder}/${name}: ${JSON.stringify(result.errors)}`);
  const output = join(publicDir, folder);
  mkdirSync(join(output, "thumbs"), { recursive: true });
  const pdf = join(work, `${name}.pdf`);
  writeFileSync(pdf, result.pdf);
  execFileSync("pdftoppm", ["-png", "-r", "120", "-singlefile", "-f", "1", "-l", "1", pdf, join(output, name)]);
  execFileSync("cwebp", [
    "-quiet",
    "-q",
    "82",
    "-resize",
    "560",
    "0",
    join(output, `${name}.png`),
    "-o",
    join(output, "thumbs", `${name}.webp`),
  ]);
  console.log(`${folder}/${name}`, result.pageCount ?? "");
}
process.exit(0);
