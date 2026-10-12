import { PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pdfHints } from "../src/modules/imports/pdf-hints.js";

// One line drawn as a single text run, with a link over only "PR #42", the way LaTeX's \href sits inside a bullet.
async function lineWithLink(line: string, words: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(line, { x: 50, y: 100, size: 11, font });
  const x1 = 50 + font.widthOfTextAtSize(line.slice(0, line.indexOf(words)), 11);
  const x2 = x1 + font.widthOfTextAtSize(words, 11);
  const link = doc.context.register(
    doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x1, 98, x2, 110],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of("https://github.com/acme/app/pull/42") },
    }),
  );
  page.node.set(PDFName.of("Annots"), doc.context.obj([link]));
  return doc.save();
}

describe("link words from the PDF", () => {
  it("takes only the words under the link, not its whole line", async () => {
    const { links } = await pdfHints(
      await lineWithLink("Shipped auth fixes in PR #42, then cut CI time by half", "PR #42"),
    );
    expect(links).toEqual([{ text: "PR #42", url: "https://github.com/acme/app/pull/42" }]);
  });

  it("drops the brackets and punctuation around the words", async () => {
    const { links } = await pdfHints(await lineWithLink("Built the request workflow (PR #42).", "(PR #42)."));
    expect(links[0]?.text).toBe("PR #42");
  });

  it("keeps brackets that belong to the words", async () => {
    const { links } = await pdfHints(await lineWithLink("Shipped Project (beta), used by 40 teams", "Project (beta),"));
    expect(links[0]?.text).toBe("Project (beta)");
  });
});
