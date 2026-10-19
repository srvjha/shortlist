import type { ResumeContent, ResumeSection } from "../schemas/resume-content.js";
import {
  compactList,
  contactParts,
  dateRange,
  fitsOneLine,
  tex,
  texRich,
  texUrl,
  visibleContent,
  gap,
  withGap,
  displayUrl,
} from "./latex.js";
import { applyLayout, nameGap, type ResumeLayout } from "./layout.js";

// The Jake's Resume variant popular with Indian developers: small-caps name, icon header,
// tight margins, company above a bold role, projects with Live and Github links.
// Based on Jake Gutierrez's template (MIT), adapted for XeTeX.

const preamble = String.raw`\documentclass[letterpaper,10pt]{article}
\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{fontawesome5}
\usepackage{accsupp}

\addtolength{\oddsidemargin}{-0.7in}
\addtolength{\evensidemargin}{-0.7in}
\addtolength{\textwidth}{1.4in}
\addtolength{\topmargin}{-0.7in}
\addtolength{\textheight}{1.4in}

\titleformat{\section}{\vspace{-4pt}\scshape\raggedright\large\bfseries}{}{0em}{}[\color{black}\titlerule \vspace{-4pt}]

\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\newcommand{\resumeItem}[1]{\item\small{#1 \vspace{-2pt}}}
\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
  \begin{tabular*}{1.0\textwidth}[t]{l@{\extracolsep{\fill}}r}
    \textbf{#1} & \textbf{\small #2} \\
    \textit{\small#3} & \textit{\small #4} \\
  \end{tabular*}\vspace{-7pt}
}
\newcommand{\resumeProjectHeading}[2]{
  \item
  \begin{tabular*}{1.001\textwidth}{l@{\extracolsep{\fill}}r}
    \small#1 & \textbf{\small #2} \\
  \end{tabular*}\vspace{-7pt}
}
\renewcommand\labelitemi{$\vcenter{\hbox{\tiny$\bullet$}}$}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
`;

function header(basics: ResumeContent["basics"], layout?: ResumeLayout) {
  return contactParts(basics, layout?.links).join(" ~\n  ");
}

// `lead` lines are LaTeX that goes first without a bullet, like a project's tech list.
function bullets(items: { text: string }[], lead: string[] = []) {
  if (items.length === 0 && lead.length === 0) return "";
  return [
    "\\resumeItemListStart",
    ...lead.map((line) => `  \\item[] \\small{\\emph{${line}}}`),
    ...items.map((item) => `  \\resumeItem{${texRich(item.text)}}`),
    "\\resumeItemListEnd",
  ].join("\n");
}

const link = (url: string, label: string) => `\\href{${texUrl(url)}}{\\underline{${tex(label)}}}`;

function section(title: string, body: string) {
  return `\\section{${tex(title)}}\n${body}`;
}

function renderSection(s: ResumeSection): string {
  switch (s.type) {
    case "skills": {
      const lines = s.groups
        .filter((group) => group.items.length > 0)
        .map((group) => `    \\textbf{${tex(group.name)}}{: ${tex(group.items.join(", "))}}`)
        .join(" \\\\\n");
      if (!lines) return "";
      return section(
        s.title,
        `\\begin{itemize}[leftmargin=0.15in, label={}]\n  \\item \\small{\n${lines}\n  }\n\\end{itemize}`,
      );
    }
    case "summary":
      if (!s.text) return "";
      return section(
        s.title,
        `\\begin{itemize}[leftmargin=0.15in, label={}]\n  \\item \\small{${texRich(s.text)}}\n\\end{itemize}`,
      );
    case "links":
      if (s.links.length === 0) return "";
      return section(
        s.title,
        `\\begin{itemize}[leftmargin=0.15in, label={}]\n  \\item \\small{\n    ${s.links.map((l) => `\\mbox{${tex(l.label)}: ${link(l.url, displayUrl(l.url))}}`).join(", ")}\n  }\n\\end{itemize}`,
      );
    case "experience": {
      if (s.entries.length === 0) return "";
      const entries = s.entries.map((e) =>
        [
          `\\resumeSubheading\n  {${tex(e.organization)}}{${dateRange(e.start, e.end)}}\n  {\\textbf{${tex(e.role)}}}{${tex(e.location)}}`,
          bullets(e.bullets) + gap(e),
        ].join("\n"),
      );
      return section(
        s.title,
        `\\resumeSubHeadingListStart\n${entries.join("\n\\vspace{-5pt}\n")}\n\\resumeSubHeadingListEnd`,
      );
    }
    case "education": {
      if (s.entries.length === 0) return "";
      const entries = s.entries.map((e) => {
        const degree = [e.degree ? tex(e.degree) : "", e.field ? `\\textbf{${tex(e.field)}}` : ""]
          .filter(Boolean)
          .join(" in ");
        const subtitle = [degree, e.score ? `(${tex(e.score)})` : ""].filter(Boolean).join(" ");
        return [
          `\\resumeSubheading\n  {${tex(e.institution)}}{${dateRange(e.start, e.end)}}\n  {${subtitle}}{${tex(e.location)}}`,
          bullets(e.bullets) + gap(e),
        ].join("\n");
      });
      return section(s.title, `\\resumeSubHeadingListStart\n${entries.join("\n")}\n\\resumeSubHeadingListEnd`);
    }
    case "projects": {
      if (s.entries.length === 0) return "";
      const entries = s.entries.map((e) => {
        const title = e.url ? `\\href{${texUrl(e.url)}}{\\textbf{${tex(e.name)}}}` : `\\textbf{${tex(e.name)}}`;
        const techs = e.technologies.join(", ");
        const inline = fitsOneLine([e.name, techs, ...e.links.map((l) => l.label)], Boolean(e.start || e.end));
        const bold = e.technologies.map((t) => `\\textbf{${tex(t)}}`).join(", ");
        const tech = techs && inline ? ` $|$ \\emph{${bold}}` : "";
        const links = e.links.map((l) => ` $|$ ${link(l.url, l.label)}`).join("");
        return [
          `\\resumeProjectHeading\n  {${title}${tech}${links}}{${dateRange(e.start, e.end)}}\n\\vspace{-10pt}`,
          bullets(e.bullets, techs && !inline ? [bold] : []) + gap(e),
        ].join("\n");
      });
      return section(
        s.title,
        `\\resumeSubHeadingListStart\n${entries.join("\n\\vspace{-13pt}\n")}\n\\resumeSubHeadingListEnd`,
      );
    }
    case "list": {
      if (s.entries.length === 0) return "";
      if (s.entries.every((e) => e.bullets.length === 0)) return section(s.title, compactList(s.entries));
      const entries = s.entries.map((e) => {
        const title = e.url ? link(e.url, e.title) : `\\textbf{${tex(e.title)}}`;
        const subtitle = e.subtitle ? ` $|$ \\emph{${tex(e.subtitle)}}` : "";
        return [`\\resumeProjectHeading\n  {${title}${subtitle}}{${tex(e.date)}}`, bullets(e.bullets) + gap(e)].join(
          "\n",
        );
      });
      // Spaced like projects, which share the heading; without it each item sat almost twice as far apart.
      return section(
        s.title,
        `\\resumeSubHeadingListStart\n${entries.join("\n\\vspace{-13pt}\n")}\n\\resumeSubHeadingListEnd`,
      );
    }
  }
}

export function renderDeveloper(input: ResumeContent, layout?: ResumeLayout) {
  const { basics, sections } = visibleContent(input);
  // \leavevmode starts the line even when the name is empty, so the line break after it has a line to end.
  const lines = [`\\leavevmode{\\Huge \\scshape ${tex(basics.name)}}${nameGap(layout)}`];
  if (basics.headline) lines.push(`\\small ${tex(basics.headline)}`);
  const contacts = header(basics, layout);
  if (contacts) lines.push(contacts);
  return applyLayout(
    `${preamble}
\\begin{document}
\\begin{center}
  ${lines.join(" \\\\ \\vspace{1pt}\n  ")}
  \\vspace{-3pt}
\\end{center}

${sections
  .map((s) => withGap(renderSection(s), s))
  .filter(Boolean)
  .join("\n\n")}

\\end{document}
`,
    layout,
  );
}
