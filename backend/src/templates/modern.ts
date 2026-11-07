import type { ResumeContent } from "../schemas/resume-content.js";
import { renderSections } from "./classic-body.js";
import { contactParts, tex, visibleContent } from "./latex.js";
import { applyLayout, nameGap, type ResumeLayout } from "./layout.js";
import { sharedMacros } from "./macros.js";
import { rupeeFallback } from "./shared-business.js";

// Inspired by Awesome-CV: sans-serif type, accent-colored section titles, single column.
export function renderModern(input: ResumeContent, layout?: ResumeLayout) {
  const { basics, sections } = visibleContent(input);
  return applyLayout(
    String.raw`\documentclass[a4paper,10.5pt]{article}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fontawesome5}
\usepackage{accsupp}
\usepackage{tabularx}
\usepackage{fontspec}
\setmainfont{texgyreheros}[Extension=.otf, UprightFont=*-regular, BoldFont=*-bold, ItalicFont=*-italic, BoldItalicFont=*-bolditalic]
${rupeeFallback}

\definecolor{accent}{HTML}{0F766E}
\definecolor{muted}{HTML}{4B5563}
\pagestyle{empty}
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.55in}
\addtolength{\textheight}{1.1in}
\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}
\titleformat{\section}{\vspace{-4pt}\color{accent}\raggedright\large\bfseries}{}{0em}{\MakeUppercase}[{\color{accent}\titlerule} \vspace{-5pt}]
${sharedMacros}
\begin{document}
\begin{center}
  \leavevmode{\fontsize{26pt}{30pt}\selectfont\bfseries ${tex(basics.name)}}${nameGap(layout)} \\ \vspace{4pt}
  ${basics.headline ? String.raw`{\color{accent}\small ${tex(basics.headline)}} \\ \vspace{2pt}` : ""}
  {\color{muted}\small ${contactParts(basics, layout?.links).join(" \\textbullet{} ")}}
\end{center}

${renderSections(sections)}
\end{document}
`,
    layout,
  );
}
