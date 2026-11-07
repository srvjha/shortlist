import type { ResumeContent } from "../schemas/resume-content.js";
import { renderSections } from "./classic-body.js";
import { contactParts, tex, visibleContent } from "./latex.js";
import { applyLayout, nameGapPt, type ResumeLayout } from "./layout.js";
import { sharedMacros } from "./macros.js";

// Denser layout in the style of sb2nov/resume (MIT): name left, contact details right.
export function renderSb2nov(input: ResumeContent, layout?: ResumeLayout) {
  const { basics, sections } = visibleContent(input);
  const contacts = contactParts(basics, layout?.links);
  const gap = nameGapPt(layout);
  return applyLayout(
    String.raw`\documentclass[a4paper,10pt]{article}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fontawesome5}
\usepackage{accsupp}
\usepackage{tabularx}

\pagestyle{empty}
\addtolength{\oddsidemargin}{-0.55in}
\addtolength{\evensidemargin}{-0.55in}
\addtolength{\textwidth}{1.1in}
\addtolength{\topmargin}{-.6in}
\addtolength{\textheight}{1.2in}
\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}
\setlist{itemsep=0pt, topsep=2pt}
\titleformat{\section}{\vspace{-6pt}\raggedright\large\bfseries}{}{0em}{}[\color{black}\titlerule \vspace{-6pt}]
${sharedMacros}
% The shared macros pull space back between roles, which assumes the default item spacing that this layout removes.
\renewcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}, itemsep=5pt]}
\begin{document}
\begin{tabular*}{\textwidth}{l@{\extracolsep{\fill}}r}
  \textbf{\LARGE ${tex(basics.name)}} & ${contacts.slice(0, 2).join(" $|$ ")} \\${gap ? `[${gap}pt]` : ""}
  ${basics.headline ? tex(basics.headline) : ""} & ${contacts.slice(2).join(" $|$ ")} \\
\end{tabular*}

${renderSections(sections)}
\end{document}
`,
    layout,
  );
}
