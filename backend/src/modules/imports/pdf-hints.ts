import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type Run = { str: string; x: number; y: number; width: number; bold: boolean };

// CMBX and SFBX are Computer Modern bold as pdflatex (Overleaf's default) embeds it, with no "Bold" in the name.
const boldFont = /bold|black|heavy|semibold|demi|cmbx|sfbx/i;

// What the model can't see in a PDF's text: links hidden behind words or icons, and which words are bold.
// Each link comes with the words under it, or its whole line when it sits on an icon.
export async function pdfHints(pdf: Uint8Array, maxPages = 4) {
  const task = getDocument({ data: pdf.slice(), useSystemFonts: false, verbosity: 0 });
  const links: { text: string; url: string }[] = [];
  const bold = new Set<string>();
  let pages = 0;
  try {
    const doc = await task.promise;
    pages = doc.numPages;
    for (let number = 1; number <= Math.min(doc.numPages, maxPages); number++) {
      const page = await doc.getPage(number);
      await page.getOperatorList();
      const fonts = new Map<string, boolean>();
      const runs: Run[] = (await page.getTextContent()).items.flatMap((item) => {
        if (!("str" in item) || !item.str.trim()) return [];
        if (!fonts.has(item.fontName)) {
          let name = "";
          try {
            name = (page.commonObjs.get(item.fontName) as { name?: string }).name ?? "";
          } catch {
            // A font pdf.js never loaded has no name; it just isn't bold.
          }
          fonts.set(item.fontName, boldFont.test(name));
        }
        const [, , , , x, y] = item.transform as number[];
        return [{ str: item.str, x: x!, y: y!, width: item.width, bold: fonts.get(item.fontName)! }];
      });

      // Bold runs on the same line join into one phrase. Only bold with something before it on its line counts:
      // a word stressed inside a sentence or bullet. Bold that starts a line is a heading, a company or a project
      // name, and bolding those everywhere they're mentioned would be wrong.
      // A phrase that wraps onto the next line continues there, so it stays inline.
      let phrase: Run[] = [];
      let inline = false;
      let wasInline = false;
      let previous: Run | undefined;
      const flush = () => {
        const text = phrase
          .map((run) => run.str.trim())
          .join(" ")
          .trim();
        if (inline && text.length > 1 && text.length <= 80) bold.add(text);
        wasInline = phrase.length > 0 && inline;
        phrase = [];
      };
      for (const run of runs) {
        const sameLine = previous !== undefined && Math.abs(previous.y - run.y) < 2;
        if (run.bold && phrase.length && sameLine) phrase.push(run);
        else {
          const continues = !sameLine && previous?.bold === true;
          flush();
          if (run.bold) {
            phrase.push(run);
            inline = sameLine || (continues && wasInline);
          }
        }
        previous = run;
      }
      flush();

      for (const annotation of await page.getAnnotations()) {
        const url = annotation.subtype === "Link" ? (annotation.url as string | undefined) : undefined;
        if (!url || !/^(https?:\/\/|mailto:|tel:)/i.test(url)) continue;
        const [x1, y1, x2, y2] = annotation.rect as [number, number, number, number];
        const onLine = runs.filter((run) => run.y >= y1 - 2 && run.y <= y2).sort((a, b) => a.x - b.x);
        const under = onLine.filter((run) => run.x < x2 && run.x + run.width > x1);
        // Icon fonts give one stray glyph ("a", "]"); the rest of the line says what the link is for.
        // A run is often a whole line, so only the words whose middle sits inside the link count. Glyph widths
        // vary, so a word's place is estimated from the run's average character width.
        // ponytail: on a long line the estimate can drift a word; per-glyph widths from the font would fix that.
        const words = under
          .flatMap((run) => {
            const glyph = run.width / run.str.length;
            return [...run.str.matchAll(/\S+/g)]
              .filter((m) => {
                const middle = run.x + (m.index + m[0].length / 2) * glyph;
                return middle >= x1 && middle <= x2;
              })
              .map((m) => m[0]);
          })
          .join(" ")
          .replace(/^["']+|["',.;:]+$/g, "");
        const text = words.length > 1 ? unwrap(words) : onLine.map((run) => run.str.trim()).join(" ");
        links.push({ text: text.slice(0, 80), url });
      }
      page.cleanup();
    }
  } catch {
    // Hints are a bonus; a PDF pdf.js can't read still imports from its text.
  } finally {
    await task.destroy();
  }
  return { links, bold: [...bold].slice(0, 80), pages };
}

// "(PR #2526" and "PR #1110)" lose the bracket the link only half covers; "(ESP-Website)" loses both, and
// "Project (beta)" keeps its own.
const unwrap = (words: string) => {
  if (/^\(.*\)$/.test(words)) return words.slice(1, -1);
  if (words.startsWith("(") && !words.includes(")")) return words.slice(1);
  if (words.endsWith(")") && !words.includes("(")) return words.slice(0, -1);
  return words;
};

// A header that names its links ("LinkedIn", "Github") instead of printing their addresses was made in the icon
// and name style; the imported resume keeps it. Only the header's profile links count: projects name their links
// ("Live", "GitHub") in every style.
export function linkStyleOf(links: { text: string; url: string }[], profileUrls: string[]) {
  const bare = (url: string) =>
    url
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\/$/, "");
  const profile = new Set(profileUrls.map(bare));
  const header = links.filter((link) => profile.has(bare(link.url)));
  if (header.length === 0) return undefined;
  // Icon fonts leave a stray glyph or two in front of the words; only letters, spaces and dashes are a name.
  const named = header.filter((link) => {
    const words = link.text.replace(/^\S{1,2}\s+/, "").trim();
    return /\p{L}/u.test(words) && !/[./@]/.test(words) && words.length <= 30;
  });
  return named.length * 2 > header.length ? ("icon-and-name" as const) : undefined;
}
