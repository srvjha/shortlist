import { z } from "zod";
import { shortId } from "../../lib/ids.js";
import {
  BULLET_MAX,
  type ResumeContent,
  resumeContentSchema,
  type ResumeSection,
} from "../../schemas/resume-content.js";
import { inlineLink, plainText } from "../../schemas/rich-text.js";

// What the model fills in. Deliberately loose (plain strings, nullable fields) so a single
// odd value doesn't fail the whole extraction; normalizeExtraction() cleans it up.
const text = z.string().nullable();
const aiLink = z.object({ label: z.string(), url: z.string() });

export const extractionSchema = z.object({
  basics: z.object({
    name: z.string(),
    headline: text.describe("Short title under the name, like 'Backend Engineer'; never a paragraph"),
    email: text,
    phone: text,
    location: text,
    links: z.array(aiLink),
  }),
  sections: z.array(
    z.object({
      type: z.enum(["experience", "education", "projects", "skills", "list", "links", "summary"]),
      title: z.string(),
      text: text.describe("summary sections only: the paragraph"),
      entries: z.array(
        z.object({
          organization: text,
          role: text,
          institution: text,
          degree: text,
          field: text,
          score: text,
          name: text,
          title: text,
          subtitle: text,
          url: text,
          location: text,
          start: text.describe("YYYY or YYYY-MM"),
          end: text.describe('YYYY, YYYY-MM or "present"'),
          date: text,
          technologies: z.array(z.string()),
          links: z.array(aiLink),
          bullets: z.array(z.string()),
        }),
      ),
      groups: z.array(z.object({ name: z.string(), items: z.array(z.string()) })),
      links: z.array(aiLink),
    }),
  ),
});

export type Extraction = z.infer<typeof extractionSchema>;

const yearMonth = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
// Soft hyphens and the noncharacters XeLaTeX leaves at hyphenation points ("Certifi\uFFFEcate").
// Soft hyphens, unmapped glyphs and control characters, which icon fonts (a GitHub star) leave in a PDF's text.
const pdfLeftovers = /[^\P{Cc}\t\n\r]|[\u00AD\uFFFE\uFFFF]/gu;
const clean = (value: string | null | undefined) => {
  // A removed icon leaves its spaces behind: "(36k+ )" becomes "(36k+)".
  const v = value?.replace(pdfLeftovers, "").replace(/\( +/g, "(").replace(/ +\)/g, ")").trim();
  return v ? v : undefined;
};
// Names, titles and labels are never formatted; bold markers only belong in bullets and descriptions.
const plain = (value: string | null | undefined) => clean(value?.replace(/\*\*/g, ""));
const date = (value: string | null | undefined) => {
  const v = clean(value)?.toLowerCase();
  return v && yearMonth.test(v) ? v : undefined;
};
const endDate = (value: string | null | undefined) =>
  clean(value)?.toLowerCase() === "present" ? "present" : date(value);
const url = (value: string | null | undefined) => {
  const v = clean(value);
  if (!v) return undefined;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  // PDFs often give only a link's words ("Live", "GitHub"); keep it only if it has a real domain.
  return z.url().safeParse(withScheme).success && new URL(withScheme).hostname.includes(".") ? withScheme : undefined;
};
const siteNames: [RegExp, string][] = [
  [/linkedin\./, "LinkedIn"],
  [/github\.com/, "GitHub"],
  [/gitlab\.com/, "GitLab"],
  [/(twitter|x)\.com/, "X"],
  [/leetcode\./, "LeetCode"],
  [/codeforces\./, "Codeforces"],
  [/codechef\./, "CodeChef"],
  [/kaggle\./, "Kaggle"],
  [/behance\./, "Behance"],
  [/dribbble\./, "Dribbble"],
  [/medium\.com/, "Medium"],
];
// A label that is itself a URL prints the whole address on the resume; show the site's name instead.
const linkLabel = (label: string, u: string) =>
  /:\/\/|^www\.|\.(com|in|io|dev|org|me)\b/i.test(label)
    ? (siteNames.find(([pattern]) => pattern.test(u))?.[1] ?? "Portfolio")
    : label.trim().slice(0, 40);
const links = (items: { label: string; url: string }[]) =>
  items.flatMap((item) => {
    const u = url(item.url);
    const label = plain(item.label);
    return u && label ? [{ label: linkLabel(label, u), url: u }] : [];
  });
// The source's own bullet glyphs ("• Built X", "- Built X"); templates draw their own bullet.
// A dash only counts when a space follows, and "*" is left alone since "**bold**" starts with it.
const bulletMarker = /^(?:\s*(?:[•·▪▸►‣⁃◦○●■□➢➤✓✔→]|[-\u2013\u2014](?=\s)))+\s*/u;
const bullets = (items: (string | null)[]) =>
  items
    .map((b) => clean(b?.replace(bulletMarker, "")))
    .filter((b): b is string => Boolean(b))
    .map((text) => ({ id: shortId(), text: text.slice(0, BULLET_MAX), hidden: false }));

type Entry = Extraction["sections"][number]["entries"][number];
// Text the model put in a field this entry type doesn't have (a project's description in subtitle) would be
// dropped; it becomes the first bullet instead.
const withLeftovers = (x: Entry, fields: ("title" | "subtitle" | "name")[], kept: (string | null)[]) =>
  bullets([...fields.map((f) => (kept.includes(x[f]) ? null : x[f])), ...x.bullets]);

// A lone date comes back as the same start and end; keep it once, as the end ("2019", not "2019 - 2019").
function range(x: Entry) {
  const start = date(x.start);
  const end = endDate(x.end);
  return start && start === end ? { end } : { start, end };
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shown = (value: string | undefined) => {
  if (!value) return undefined;
  if (value === "present") return "Present";
  const [year, month] = value.split("-");
  return month ? `${monthNames[Number(month) - 1]} ${year}` : year;
};

// List items keep one free-text date. Jobs in a list like "Earlier experience" come back with a start and end
// instead, which would otherwise be dropped.
function listDate(x: Entry) {
  const { start, end } = range(x);
  return [shown(start), shown(end)].filter(Boolean).join(" \u2013 ") || undefined;
}

// Templates link a project's url from its name without a label, so a repo the model put there would look lost
// next to a visible "Live" link. It's shown as a labelled link too, first, as resumes usually list code first.
// A link labelled with the project's own name was the name itself in the source, so it links the title and isn't
// repeated as "Name | Name".
function projectLinks(x: Entry) {
  const name = plain(x.name)?.toLowerCase();
  const all = links(x.links);
  const onName = all.find((l) => l.label.toLowerCase() === name);
  const listed = all.filter((l) => l !== onName);
  const u = url(x.url) ?? onName?.url;
  if (!u || u === onName?.url || listed.some((l) => l.url === u)) return { url: u, links: listed };
  const label = siteNames.find(([pattern]) => pattern.test(u))?.[1] ?? "Live";
  return { url: u, links: [{ label, url: u }, ...listed].slice(0, 5) };
}

// A "Tech Stack: React, Node" line belongs in the project's technologies, not in its bullets.
const techLine = /^(tech(nologies|nology)?( stack)?|stack|built with|tools( used)?)\s*:/i;
function projectTech(x: Entry) {
  const listed = x.technologies.map((t) => plain(t) ?? "").filter(Boolean);
  const line = x.bullets.find((b) => techLine.test(b.replace(bulletMarker, "").trim()));
  const fromLine = line
    ? (plain(line.replace(bulletMarker, "").trim().replace(techLine, ""))
        ?.split(/,(?![^(]*\))/)
        .map((t) => t.trim())
        .filter(Boolean) ?? [])
    : [];
  return (listed.length ? listed : fromLine).slice(0, 20);
}

// A comma list of short names with no sentence in it ("OpenAI Agents SDK, GPT-4.1, Next.js") is a project's stack.
const stackParts = (text: string) =>
  text
    .replace(/\*\*/g, "")
    .split(/,(?![^(]*\))/)
    .map((part) => part.trim());
const stackList = (text: string) => {
  const parts = stackParts(text);
  return (
    parts.length >= 3 &&
    !/[.!?]$/.test(text.trim()) &&
    parts.every((part) => part && part.length <= 30 && part.split(/\s+/).length <= 4)
  );
};

// A short Title Case line among bullets is a tagline or a heading ("AI-Driven QA Automation"), not something the
// person did. There is no field for it, so it stays as a hidden bullet: kept in the editor, left off the PDF.
const smallWord = /^(a|an|and|&|as|at|by|for|in|of|on|or|the|to|with|via|[/+|-])$/i;
const headingLine = (text: string) => {
  const words = text.replace(/\*\*/g, "").trim().split(/\s+/);
  return (
    words.length <= 7 &&
    !/[.:;!?]$/.test(text.trim()) &&
    words.every((word) => smallWord.test(word) || /^[^\p{L}]*\p{Lu}/u.test(word) || !/\p{L}/u.test(word))
  );
};
const hideHeadings = (items: { id: string; text: string; hidden: boolean }[]) =>
  items.map((bullet) => (headingLine(bullet.text) ? { ...bullet, hidden: true } : bullet));

// Words that only name a link ("Verify", "Live") aren't content once the URL is attached.
const linkWord = /^(verify|verified|link|code|live|demo|pdf|github|website|certificate|credential|view|here)$/i;

// A line under a project's name that only repeats its stack and link labels ("React, Go | Live | Code").
function stackOnly(text: string, technologies: string[]) {
  const known = new Set(technologies.map((t) => t.toLowerCase()));
  const parts = text
    .replace(/\*\*/g, "")
    .split(/\s*[|,·]\s*/)
    .filter(Boolean);
  return known.size > 0 && parts.every((part) => known.has(part.toLowerCase()) || linkWord.test(part));
}

// "Full Stack Developer — Acme" when Acme is already the organization, which templates print as well.
function bareRole(role: string, organization: string) {
  if (!organization) return role;
  const org = organization.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sep = String.raw`\s*(?:[|,@\-–—]|\bat\b)\s*`;
  return role.replace(new RegExp(`${sep}${org}$|^${org}${sep}`, "i"), "").trim() || role;
}

function normalizeSection(section: Extraction["sections"][number]): ResumeSection | null {
  const base = { id: shortId(), title: plain(section.title) ?? section.type, hidden: false };
  const e = section.entries;
  // Jobs in a compact list like "Earlier experience" come back as a list with roles and companies. The list
  // reads only titles, so they would vanish; they're jobs, so they become an experience section.
  const jobs = section.type === "list" && e.length > 0 && e.every((x) => plain(x.role) && !clean(x.title));
  switch (jobs ? "experience" : section.type) {
    case "experience":
      return {
        ...base,
        type: "experience",
        entries: e
          .filter((x) => plain(x.organization) || plain(x.role))
          .map((x) => ({
            id: shortId(),
            hidden: false,
            organization: plain(x.organization) ?? "",
            role: bareRole(plain(x.role) ?? "", plain(x.organization) ?? ""),
            location: plain(x.location),
            ...range(x),
            bullets: hideHeadings(
              withLeftovers(x, ["title", "subtitle", "name"], [x.organization, x.role, x.location]),
            ),
          })),
      };
    case "education":
      return {
        ...base,
        type: "education",
        entries: e
          .filter((x) => plain(x.institution))
          .map((x) => ({
            id: shortId(),
            hidden: false,
            institution: plain(x.institution)!,
            degree: plain(x.degree),
            field: plain(x.field),
            score: plain(x.score)?.slice(0, 20),
            location: plain(x.location),
            ...range(x),
            bullets: withLeftovers(x, ["title", "subtitle"], [x.institution, x.degree, x.field, x.location]),
          })),
      };
    case "projects":
      return {
        ...base,
        type: "projects",
        entries: e
          .filter((x) => plain(x.name))
          .map((x) => {
            const lines = withLeftovers(x, ["title", "subtitle"], [x.name]);
            const stack = lines.find((b) => !techLine.test(b.text) && stackList(b.text));
            const technologies = [
              ...new Set([...projectTech(x), ...(stack ? stackParts(stack.text).map((t) => plain(t) ?? "") : [])]),
            ]
              .filter(Boolean)
              .slice(0, 20);
            return {
              id: shortId(),
              hidden: false,
              name: plain(x.name)!,
              ...projectLinks(x),
              technologies,
              ...range(x),
              bullets: hideHeadings(
                lines.filter((b) => b !== stack && !techLine.test(b.text) && !stackOnly(b.text, technologies)),
              ),
            };
          }),
      };
    case "skills":
      return {
        ...base,
        type: "skills",
        groups: section.groups
          .filter((g) => g.items.length > 0)
          .map((g) => ({
            id: shortId(),
            // The template adds its own colon after a group name.
            name: plain(g.name)?.replace(/\s*:+$/, "") ?? "",
            items: g.items.map((i) => plain(i) ?? "").filter(Boolean),
          })),
      };
    case "links":
      return { ...base, type: "links", links: links(section.links) };
    case "summary":
      return { ...base, type: "summary", text: clean(section.text) ?? "" };
    case "list":
      return {
        ...base,
        type: "list",
        entries: e.flatMap((x): Extract<ResumeSection, { type: "list" }>["entries"] => {
          const raw = clean(x.title) ?? plain(x.name);
          // A title that is bold as a whole is just a name; bold inside a sentence stays.
          const title = raw && /^\*\*[^*]+\*\*$/.test(raw) ? raw.slice(2, -2) : raw;
          // Achievements often come back as bullets with no title; each one is its own item.
          if (!title)
            return bullets(x.bullets).map((b) => ({ id: shortId(), hidden: false, title: b.text, bullets: [] }));
          // "**Name:** description" in one field splits into a bold name and its description.
          const joined = !clean(x.subtitle) ? /^\*\*(.+?):?\*\*\s*[:\-\u2013\u2014]?\s*(.+)$/.exec(title) : null;
          const subtitle = joined ? joined[2] : clean(x.subtitle);
          return [
            {
              id: shortId(),
              hidden: false,
              title: joined ? joined[1]!.trim() : title,
              subtitle: subtitle && !linkWord.test(subtitle) && subtitle !== clean(x.date) ? subtitle : undefined,
              date: clean(x.date) ?? listDate(x),
              url: url(x.url),
              bullets: bullets(x.bullets),
            },
          ];
        }),
      };
  }
}

export function normalizeExtraction(extraction: Extraction): ResumeContent {
  const email = clean(extraction.basics.email)?.replace(/^mailto:/i, "");
  const sections = extraction.sections.map(normalizeSection).filter((s): s is ResumeSection => s !== null);
  let headline = plain(extraction.basics.headline);
  // Models sometimes put the summary paragraph in the headline; give it its own section instead.
  if (headline && headline.length > 100 && !sections.some((s) => s.type === "summary")) {
    sections.unshift({ id: shortId(), title: "Summary", hidden: false, type: "summary", text: headline });
    headline = undefined;
  }
  const content = {
    basics: {
      name: plain(extraction.basics.name) ?? "",
      headline,
      email: email && z.email().safeParse(email).success ? email : undefined,
      phone: clean(extraction.basics.phone)?.slice(0, 30),
      location: plain(extraction.basics.location),
      links: links(extraction.basics.links),
    },
    sections,
  };
  // Drops undefined keys and applies schema defaults so the result is valid resume content.
  return fitToLimits(JSON.parse(JSON.stringify(content)));
}

// Models sometimes return a field longer than the schema allows (a paragraph as the headline);
// cut each over-long string or list to its limit instead of failing the whole import.
function fitToLimits(content: Record<string, unknown>): ResumeContent {
  for (;;) {
    const result = resumeContentSchema.safeParse(content);
    if (result.success) return result.data;
    const tooBig = result.error.issues.filter((issue) => issue.code === "too_big");
    if (tooBig.length < result.error.issues.length) throw result.error;
    for (const issue of tooBig) {
      const parent = issue.path
        .slice(0, -1)
        .reduce<unknown>((node, key) => (node as Record<PropertyKey, unknown>)[key], content) as Record<
        PropertyKey,
        string | unknown[]
      >;
      const key = issue.path.at(-1)!;
      parent[key] = parent[key]!.slice(0, Number(issue.maximum));
    }
  }
}

type Field = { get: () => string; set: (value: string) => void; max: number };

// Every piece of text that can carry an inline link, in reading order.
function linkableFields(content: ResumeContent): Field[] {
  return content.sections.flatMap((section): Field[] => {
    if (section.type === "summary") return [{ get: () => section.text, set: (v) => (section.text = v), max: 1000 }];
    if (!("entries" in section)) return [];
    return (section.entries as Array<{ title?: string; subtitle?: string; bullets: { text: string }[] }>).flatMap(
      (entry) => [
        ...(section.type === "list"
          ? (["title", "subtitle"] as const).flatMap((key) =>
              entry[key] ? [{ get: () => entry[key] ?? "", set: (v: string) => (entry[key] = v), max: 400 }] : [],
            )
          : []),
        ...entry.bullets.map((bullet) => ({
          get: () => bullet.text,
          set: (v: string) => (bullet.text = v),
          max: BULLET_MAX,
        })),
      ],
    );
  });
}

// Wraps the first whole-word occurrence of words in a field as [words](url). A bold span that is exactly those
// words moves inside the link; text inside another link or half inside bold is left alone.
function wrapWords(field: Field, words: string, url: string) {
  const text = field.get();
  const taken = [...text.matchAll(inlineLink)].map((m) => [m.index, m.index + m[0].length] as const);
  for (let at = text.indexOf(words); at !== -1; at = text.indexOf(words, at + 1)) {
    const end = at + words.length;
    if (/[\p{L}\p{N}]/u.test(text[at - 1] ?? "") || /[\p{L}\p{N}]/u.test(text[end] ?? "")) continue;
    if (taken.some(([from, to]) => at < to && end > from)) continue;
    const boldBefore = (text.slice(0, at).match(/\*\*/g) ?? []).length % 2 === 1;
    const exactBold = text.slice(at - 2, at) === "**" && text.slice(end, end + 2) === "**";
    if (boldBefore && !exactBold) continue;
    const next = exactBold
      ? `${text.slice(0, at - 2)}[**${words}**](${url})${text.slice(end + 2)}`
      : `${text.slice(0, at)}[${words}](${url})${text.slice(end)}`;
    if (next.length > field.max) return false;
    field.set(next);
    return true;
  }
  return false;
}

// The PDF says which words each link sits on, but the model tends to move a link onto a whole item, sometimes the
// wrong one, and drops a second link in the same item. This puts each web link back on its own words: a link on an
// item's name stays the item's link; one inside a sentence becomes [words](url) there; and an item that held it
// without containing its words loses it.
export function placeLinks(content: ResumeContent, links: { text: string; url: string }[]): ResumeContent {
  const next = structuredClone(content);
  const owners = (url: string) =>
    next.sections.flatMap((section) =>
      "entries" in section
        ? (section.entries as Array<{ url?: string; title?: string; name?: string }>).filter((e) => e.url === url)
        : [],
    );
  for (const link of links) {
    if (!/^https?:/i.test(link.url)) continue;
    // Icon fonts leave a stray glyph or two before the words, but a short word like "PR" is part of them.
    const words = link.text.replace(/^(\S|[^\p{L}\p{N}\s]{2})\s+/u, "").trim();
    if (words.length < 3 || words.length > 80) continue;
    if (next.basics.links.some((l) => l.url === link.url)) continue;
    const fields = linkableFields(next);
    if (fields.some((f) => f.get().includes(`](${link.url})`))) continue;
    const holders = owners(link.url);
    // The item's name is the link's words, perhaps with a short note like "(36k+)", or the words are the line the
    // name sits on (an icon link). A sentence that merely mentions the words isn't a name.
    const named = (e: { title?: string; name?: string }) => {
      const name = plainText(e.title ?? e.name ?? "").toLowerCase();
      const said = words.toLowerCase();
      return Boolean(name) && (said.includes(name) || (name.startsWith(said) && name.length - said.length <= 12));
    };
    if (holders.some(named)) continue;
    if (fields.some((f) => wrapWords(f, words, link.url))) for (const holder of holders) delete holder.url;
  }
  return next;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The model doesn't always wrap the PDF's bold words in **, so this does it for bullets and summaries.
// Text already inside ** is left alone, and only whole words match ("Go" never bolds part of "Google").
export function applyBold(content: ResumeContent, phrases: string[]): ResumeContent {
  const usable = phrases.filter((p) => p.length > 1 && !p.includes("*")).sort((a, b) => b.length - a.length);
  if (usable.length === 0) return content;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${usable.map(escapeRegex).join("|")})(?![\\p{L}\\p{N}])`, "gu");
  const bold = (text: string, max: number) => {
    const bolded = text
      // Already bold text and links, whose addresses must stay intact, are left alone.
      .split(/(\*\*[^*]+\*\*|\[[^\]\n]+\]\([^\s)]+\))/)
      .map((part) => (part.startsWith("**") || part.startsWith("[") ? part : part.replace(pattern, "**$1**")))
      .join("");
    return bolded.length > max ? text : bolded;
  };
  return {
    ...content,
    sections: content.sections.map((section) => {
      if (section.type === "summary") return { ...section, text: bold(section.text, 1000) };
      if (!("entries" in section)) return section;
      return {
        ...section,
        entries: section.entries.map((entry) => ({
          ...entry,
          bullets: entry.bullets.map((bullet) => ({ ...bullet, text: bold(bullet.text, BULLET_MAX) })),
        })),
      } as typeof section;
    }),
  };
}
