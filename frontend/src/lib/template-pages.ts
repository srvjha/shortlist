import type { TemplateId } from '@/lib/templates'

// Copy for each template's own page at /templates/<id>: the search phrase it targets, who it suits,
// what the layout includes and how to fill it in.
export const templatePages: Record<
  TemplateId,
  {
    heading: string
    intro: string
    // Search result title and description, when the ones built from heading and intro don't match what people search for.
    metaTitle?: string
    metaDescription?: string
    whoFor: string
    includes: string[]
    tips: string[]
    // A weak bullet rewritten for this field, so the page shows what good looks like.
    example: { before: string; after: string }
    faqs: { q: string; a: string }[]
  }
> = {
  developer: {
    heading: 'Software Engineer Resume Template',
    intro:
      "The layout most developers already know from Overleaf: Jake's Resume with a small-caps name and link icons for GitHub, LinkedIn and LeetCode. It suits freshers applying for SDE roles as well as engineers with a few years of experience.",
    whoFor:
      'Pick this if you are applying for software engineering roles: SDE internships, campus placements, or a switch after a year or two at a service company. It reads as "engineer" at a glance, which is what recruiters scanning a stack of resumes for a backend or full-stack opening want to see. If you have no internship yet, it still works: lead with two strong projects and your skills.',
    includes: [
      'Contact line with icons for email, phone, GitHub and LinkedIn',
      'Experience with the company above a bold role and dates on the right',
      'Projects with Live and GitHub links next to the name and the tech stack on one line',
      'A grouped skills block: languages, frameworks, tools',
    ],
    tips: [
      'Put projects above experience if you only have one short internship.',
      'Start every bullet with a verb and end it with a result: "Cut page load from 4s to 1.2s".',
      'List only the skills you could answer interview questions on.',
    ],
    example: {
      before: 'Worked on the backend of an e-commerce website.',
      after:
        'Built order and payment APIs in Node.js and PostgreSQL for an e-commerce site handling 3,000 orders a day, cutting checkout errors by 30%.',
    },
    faqs: [
      {
        q: 'Is the Software Engineer template ATS-friendly?',
        a: 'Yes. It is a single column with real text, standard headings and no tables or images, so applicant tracking systems read it in order. The icons next to your links are hidden from ATS software, so they never show up as stray characters.',
      },
      {
        q: 'Should I put projects or experience first?',
        a: 'Whichever is stronger. If your internship was short or unrelated, put projects first and move experience below them. You can reorder sections in the editor with one click.',
      },
      {
        q: 'Can I add LeetCode or Codeforces links?',
        a: 'Yes. Add them as links in your details and they get their own icon, or add a Profile Links section if you want them lower down.',
      },
    ],
  },
  jake: {
    heading: "Jake's Resume Template",
    metaTitle:
      "Jake's Resume Template, Free: Edit Online, PDF or LaTeX | Shortlist",
    metaDescription:
      "Edit Jake's Resume in your browser with no Overleaf setup, then download it as a PDF or the LaTeX source. Free, ATS-friendly, one page. See a sample below.",
    intro:
      "Jake Gutierrez's single-column template is the most copied tech resume on the internet, and for good reason: it is plain, dense and easy for both recruiters and ATS software to read. Here it comes without the Overleaf setup.",
    whoFor:
      'This is the safe default for almost anyone in tech, especially students and freshers. Recruiters have seen thousands of resumes in this layout, so nothing about it distracts from your content. Choose it when you want a proven format and would rather spend your time on bullets than on design.',
    includes: [
      'Centered name with contact details and links on one line',
      'Education, experience, projects and skills in the classic order',
      'Bold titles with dates and locations flush right',
      'Tight one-page spacing at 11 pt',
    ],
    tips: [
      'Freshers usually keep education first; move it down once you have a full-time job.',
      'Keep each bullet to one or two lines.',
      'Use the same date format everywhere, like "Jun 2025".',
    ],
    example: {
      before: 'Made a chat app using React and Firebase.',
      after:
        'Built a real-time chat app in React and Firebase with 120 weekly users on campus; added message search that answers in under 200 ms.',
    },
    faqs: [
      {
        q: "Is this the same as Jake's Resume on Overleaf?",
        a: 'It is the same layout, typeset with LaTeX the same way, but you fill it in through a form instead of editing LaTeX code. You can still open the LaTeX source if you want to tweak it.',
      },
      {
        q: 'Can I make it fit on one page?',
        a: 'Yes. The editor shows the page count as you type and warns you when you go over your page limit. You can tighten spacing from the Layout menu or ask the AI to trim it.',
      },
      {
        q: 'Does it work for non-tech roles?',
        a: 'It does, but the Consulting, Finance or Marketing templates are designed around what those recruiters look for. Your content carries over if you switch.',
      },
    ],
  },
  sb2nov: {
    heading: 'Compact One-Page Resume Template',
    intro:
      'A denser take on the sb2nov resume, with your name on the left and contact details on the right. It fits more on one page, which helps when you have several projects, internships and achievements but still want a single page.',
    whoFor:
      'Pick Compact when you have more to say than a normal one-page layout allows: three internships, several projects, competitive programming results and positions of responsibility. It suits final-year students and engineers with two to four years of experience who do not want to spill onto a second page.',
    includes: [
      'Name left, email, phone and links right',
      'Compact section spacing at 10 pt',
      'Room for more projects and roles without spilling onto page two',
      'Skills grouped by type',
    ],
    tips: [
      'Dense does not mean crowded: cut weak bullets before you shrink spacing.',
      'Pick your three strongest projects; recruiters rarely read a fifth.',
      'Check the PDF at 100% zoom to make sure it is still easy to read.',
    ],
    example: {
      before: 'Participated in many hackathons and won some prizes.',
      after:
        'Won 2 of 6 national hackathons, including Smart India Hackathon 2024 (team of 6, healthcare track).',
    },
    faqs: [
      {
        q: 'Is a denser resume harder to read?',
        a: 'Only if every line is full. Keep bullets to one or two lines and leave the strongest items at the top of each section, and a dense layout still scans quickly.',
      },
      {
        q: 'What font size does it use?',
        a: '10 pt by default. You can switch to 11 pt or 12 pt from the Layout menu if you have room.',
      },
      {
        q: 'Is it ATS-friendly?',
        a: 'Yes. Name and contact sit side by side, but the text is still read in order, with standard headings and no tables.',
      },
    ],
  },
  modern: {
    heading: 'Modern Resume Template',
    intro:
      'Inspired by Awesome-CV: clean sans-serif type with teal section headings in a single column. It looks current without the columns and graphics that confuse ATS software, so it works for tech, product and design applications.',
    whoFor:
      "Choose Modern when you want something that looks current but still passes ATS checks: product roles, frontend and full-stack engineering, design-adjacent jobs and startups. It is a good middle ground if Jake's Resume feels too plain and a two-column design feels too risky.",
    includes: [
      'Sans-serif type with accent-colored section titles',
      'Single column, so ATS software reads it in order',
      'Experience, projects, education and skills sections',
      'Links written out in full so they survive printing',
    ],
    tips: [
      'Let the color do the styling; avoid adding bold to every line.',
      'A two-line summary works well here if you are switching fields.',
      'Keep it to one page unless you have more than eight years of experience.',
    ],
    example: {
      before: 'Responsible for improving the onboarding flow.',
      after:
        'Redesigned the signup and onboarding flow in React, lifting day-7 retention from 22% to 31% across 18,000 new users.',
    },
    faqs: [
      {
        q: 'Can I change the accent color?',
        a: 'The template uses its own teal accent so it prints well and stays readable. If you need full control over colors, you can open the LaTeX source and edit it.',
      },
      {
        q: 'Should I add a summary?',
        a: 'Add one only if it says something your experience does not, such as a career switch or the exact role you want. Two lines is enough.',
      },
      {
        q: 'Is a single column really better for ATS?',
        a: 'Yes. ATS software reads top to bottom, and columns can make it mix lines from different sections. A single column keeps your experience in the right order.',
      },
    ],
  },
  'ml-research': {
    heading: 'ML Research CV Template',
    intro:
      'An academic-leaning CV for machine learning engineers and researchers. Any list section titled Publications or Papers becomes numbered, citation-style entries, which makes it a good fit for research internships, MS and PhD applications and ML roles.',
    whoFor:
      'Use the Research template for research internships, MS and PhD applications, and ML engineering roles where papers matter. It is built around publications, so a list of papers reads like a proper CV rather than a pile of bullets.',
    includes: [
      'Serif type with small-caps headings and a leader rule',
      'Numbered, citation-style publications',
      'Sections for research experience, projects, awards and teaching',
      'Room for advisors, venues and arXiv links',
    ],
    tips: [
      'Bold your own name in each publication so it stands out.',
      'For each project, name the dataset, the model and the metric you moved.',
      'Put preprints and under-review papers in the list, labelled as such.',
    ],
    example: {
      before: 'Worked on a deep learning model for image classification.',
      after:
        'Fine-tuned a ViT-B/16 on 40k crop disease images, reaching 94.1% top-1 accuracy (+6.3 over the ResNet-50 baseline); paper under review at a workshop.',
    },
    faqs: [
      {
        q: 'How do I get numbered publications?',
        a: 'Add a list section titled Publications or Papers. The template numbers each entry and formats it like a citation.',
      },
      {
        q: 'Should I include papers under review?',
        a: 'Yes, labelled clearly as under review or as a preprint with an arXiv link. Reviewers expect it.',
      },
      {
        q: 'Can it go beyond one page?',
        a: 'Yes. Research CVs often run to two pages; set the page limit to two so the editor does not warn you.',
      },
    ],
  },
  'data-analyst': {
    heading: 'Data Analyst Resume Template',
    intro:
      'A dense sans-serif layout for data analysts and data scientists. Section headings carry an accent bar, skills read like a key and value list, and dates and locations are muted so the numbers in your bullets stand out.',
    whoFor:
      'Pick Analyst for data analyst, business analyst and junior data scientist roles. The muted dates and locations push your numbers forward, which matters because analytics recruiters read for impact: what you measured, what changed and by how much.',
    includes: [
      'Two-column skills block: SQL, Python, BI tools, statistics',
      'Muted metadata so results come first',
      'Experience and projects with space for metrics',
      'Certifications such as Google Data Analytics or Power BI',
    ],
    tips: [
      'Every bullet should have a number: rows, time saved, revenue, accuracy.',
      'Name the tools in the bullet itself: "Built a Power BI dashboard used by 40 store managers".',
      'Freshers can lead with two or three end-to-end projects using public datasets.',
    ],
    example: {
      before: 'Made dashboards for the sales team.',
      after:
        'Built a Power BI dashboard from 2M rows of sales data that 40 store managers use weekly, replacing a 6-hour manual Excel report.',
    },
    faqs: [
      {
        q: 'What skills should a data analyst list?',
        a: 'SQL first, then Python or R, one BI tool such as Power BI or Tableau, Excel, and the statistics you actually use. Only list what you could be tested on.',
      },
      {
        q: 'I have no experience. What do I put?',
        a: 'Two or three end-to-end projects on public datasets: the question, the data, the analysis and the result. Link the notebook or dashboard.',
      },
      {
        q: 'Where do certifications go?',
        a: 'In a Certifications section. Google Data Analytics, Power BI (PL-300) and similar courses are worth listing for entry-level roles.',
      },
    ],
  },
  'product-manager': {
    heading: 'Product Manager Resume Template',
    intro:
      'A roomy, outcome-first layout for product managers and APM applicants: a heavy accent rule under your name, sentence-case headings, company names in color and square bullets that keep each result on its own line.',
    whoFor:
      'Use Product for product manager and APM roles, and for engineers or analysts moving into product. The roomy layout gives each outcome its own line, which suits PM resumes where every bullet should be about a result for users or the business.',
    includes: [
      'Header with a strong accent rule',
      'Company names in the accent color, roles below',
      'Square bullets with room for outcomes and metrics',
      'Sections for experience, projects, education and skills',
    ],
    tips: [
      'Write what changed for users or the business, not the features you shipped.',
      'APM applicants: case competitions and side products count as experience.',
      'Show the team you worked with: "with 4 engineers and a designer".',
    ],
    example: {
      before: 'Launched new features for the app.',
      after:
        'Led the launch of saved searches with 4 engineers and a designer, raising weekly active users by 12% in two months.',
    },
    faqs: [
      {
        q: 'How do I show product work without a PM title?',
        a: 'Describe decisions you drove: what you prioritised, which metric moved and who you worked with. Side products, case competitions and internships all count.',
      },
      {
        q: 'Should I list tools like Jira and Figma?',
        a: 'Briefly, in skills. Recruiters care more about outcomes, so keep most of the space for results.',
      },
      {
        q: 'Is it ATS-friendly?',
        a: 'Yes. It is a single column with standard headings, so tracking systems read it in order.',
      },
    ],
  },
  designer: {
    heading: 'UI/UX Designer Resume Template',
    intro:
      'A two-column layout for UI/UX and product designers. A narrow sidebar holds contact details, skills, tools and education, and the main column tells the story of your work. Columns can trip up some ATS software, so use it where a person reads your resume first, like portfolio-led applications.',
    whoFor:
      'Choose Designer when a person, not a filter, reads your resume first: portfolio-led applications, referrals and design studios. The sidebar keeps tools and links visible while the main column tells the story of your work. For job portals with strict ATS screening, switch to Modern; your content carries over.',
    includes: [
      'Light display name and a narrow sidebar',
      'Sidebar for contact, portfolio link, tools and education',
      'Main column for experience and case studies',
      'Both columns can continue onto a second page',
    ],
    tips: [
      'Your portfolio link is the most important line: put it at the top.',
      'Describe the problem and the result for each project, not just the screens.',
      'For job portals with strict ATS checks, switch to the Modern template; your content carries over.',
    ],
    example: {
      before: 'Designed screens for a food delivery app.',
      after:
        'Redesigned the checkout flow for a food delivery app after 8 user interviews, cutting drop-off at payment from 34% to 21%.',
    },
    faqs: [
      {
        q: 'Why is this template not marked ATS-friendly?',
        a: 'Two columns can make some ATS software read lines out of order. It is fine when a recruiter reads it directly, but use a single-column template for portals that screen automatically.',
      },
      {
        q: 'Where does my portfolio link go?',
        a: 'In your details. It shows at the top of the sidebar, where it is the first thing a reviewer sees.',
      },
      {
        q: 'Can I add images of my work?',
        a: 'No, and you should not: images are invisible to ATS software and bloat the file. Link to case studies in your portfolio instead.',
      },
    ],
  },
  campus: {
    heading: 'Campus Placement Resume Template for Freshers',
    intro:
      'The format placement cells in Indian colleges ask for: education first, as a table of degree, institution, score and year, then projects, internships, achievements and positions of responsibility in a dense single column. Built for B.Tech, BCA, MCA, B.Com and MBA students.',
    whoFor:
      'This is the template for campus placements in India. Many placement cells and company forms expect education first with scores for your degree, Class XII and Class X, then projects, internships and achievements. Use it for on-campus drives and for off-campus roles that ask for academic details.',
    includes: [
      'Education table with CGPA or percentage for degree, Class XII and Class X',
      'Shaded section bars that are easy to scan',
      'Projects, internships, achievements and positions of responsibility',
      'Fits on one page at 10 pt',
    ],
    tips: [
      'Write the score the way your college does: "8.4 CGPA" or "86%".',
      'Hackathons, coding contests and club roles belong in Achievements and Positions of responsibility.',
      'Skip the photo, date of birth and declaration line; recruiters do not need them.',
    ],
    example: {
      before: 'Member of the coding club.',
      after:
        'Coding club lead (2024-25): ran 12 weekly contests on Codeforces with 150+ participants and mentored 20 first-year students.',
    },
    faqs: [
      {
        q: 'Should I include Class X and Class XII marks?',
        a: 'For campus placements, yes; many companies screen on them. Once you have a full-time job you can drop them.',
      },
      {
        q: 'Do I need a photo, date of birth or declaration?',
        a: 'No. Recruiters do not need them, and they take space your projects could use.',
      },
      {
        q: 'Can I write CGPA or percentage?',
        a: 'Either. Write the score the way your college reports it, such as 8.4 CGPA or 86%.',
      },
    ],
  },
  banking: {
    heading: 'Investment Banking Resume Template',
    intro:
      'The dense one-page Wall Street layout banks expect: Times-style serif, firm names in bold with locations and dates flush right, and uppercase ruled headings. Education leads for students applying to IB, markets and finance internships.',
    whoFor:
      'Use Investment Banking for IB, markets, private equity and finance internships, especially if you are applying to global banks or their India offices. The format follows what banking recruiters are used to, so they find education, deals and results exactly where they expect them.',
    includes: [
      'Education first with GPA, relevant coursework and honors',
      'Firm, location and dates on one line, role below',
      'Tight spacing that fits a full page of deals and results',
      'Skills, certifications and interests at the bottom',
    ],
    tips: [
      'Quantify deals and models: deal size, sector, what your analysis changed.',
      'List CFA levels and financial modelling courses under certifications.',
      'Interests are read here: keep two or three specific ones.',
    ],
    example: {
      before: 'Helped with financial modelling for clients.',
      after:
        'Built a three-statement model and DCF for a USD 120M mid-market acquisition; the valuation range went into the client pitch book.',
    },
    faqs: [
      {
        q: 'Why is education at the top?',
        a: 'For students and recent graduates, banks screen on school and grades first. Move it below experience once you have a full-time analyst role.',
      },
      {
        q: 'Should I include interests?',
        a: 'Yes, two or three specific ones. Interviewers often open with them, so pick ones you can talk about.',
      },
      {
        q: 'Where do CFA levels go?',
        a: 'In certifications, written as CFA Level I Candidate or CFA Level II Passed.',
      },
    ],
  },
  finance: {
    heading: 'Finance and Accounting Resume Template',
    intro:
      'For corporate finance, audit and CA, CFA or CMA candidates: a Palatino-style serif with navy small-caps headings, your credentials under your name and certifications right after the summary, where recruiters look for them first.',
    whoFor:
      'Choose Finance & Accounting for CA, CFA and CMA candidates, audit and articleship roles, and corporate finance jobs. It puts credentials right under your name, because for these roles the qualification is often the first filter.',
    includes: [
      'Credentials line under the name, like "CA Inter, CFA Level I"',
      'Certifications near the top',
      'Experience with articleship, audit and reporting work',
      'Education with scores and ranks',
    ],
    tips: [
      'Articleship counts as experience; list the clients and areas you covered.',
      'Name the tools: Tally, SAP, Excel and Power BI.',
      'Mention exam attempts only when they help, such as an all-India rank.',
    ],
    example: {
      before: 'Did audit work for many companies.',
      after:
        'Audited 6 manufacturing clients (turnover INR 50-400 Cr) during articleship; flagged INR 1.2 Cr of inventory mismatches before sign-off.',
    },
    faqs: [
      {
        q: 'How do I list articleship?',
        a: 'As experience: the firm, your period, the clients or industries you covered and the areas you worked on, such as statutory audit, GST or tax.',
      },
      {
        q: 'Should I mention exam ranks?',
        a: 'Yes, an all-India rank is worth showing. You do not need to list attempts.',
      },
      {
        q: 'Is it ATS-friendly?',
        a: 'Yes. It is a single column with standard headings, so ATS software reads it in order.',
      },
    ],
  },
  consulting: {
    heading: 'Consulting Resume Template',
    intro:
      'A clean one-page consulting layout: humanist sans-serif, letterspaced headings under a heavy rule, firm and dates on one line with the role below, and square bullets for impact-first results. Education leads early on for MBA and campus applicants.',
    whoFor:
      'Use Consulting for strategy and management consulting, and for MBA and campus applications to firms that hire generalists. Consulting recruiters read for structured, results-first bullets, and this layout keeps each one clean and easy to scan.',
    includes: [
      'Firm and dates on one line, role below',
      'Square bullets built for action, result and number',
      'Education early for MBA and campus roles',
      'Leadership and extracurriculars section',
    ],
    tips: [
      'Lead each bullet with the result, then how you got it.',
      'Case competitions and live projects show the same skills firms test for.',
      'Keep it to exactly one page; consulting recruiters are strict about it.',
    ],
    example: {
      before: 'Worked on a market entry project for a client.',
      after:
        "Sized a INR 900 Cr market for a D2C brand's entry into tier-2 cities and recommended a 3-city pilot the client approved.",
    },
    faqs: [
      {
        q: 'Does it have to be one page?',
        a: 'For campus and MBA applications, yes. Consulting recruiters are strict about it, and the editor warns you when you go over.',
      },
      {
        q: 'What counts as experience if I am a student?',
        a: 'Case competitions, live projects with companies, internships and leadership roles in clubs all show the problem solving firms test for.',
      },
      {
        q: 'How should each bullet be written?',
        a: 'Result first, then how: what changed, by how much, and what you did to get there.',
      },
    ],
  },
  marketing: {
    heading: 'Marketing and Sales Resume Template',
    intro:
      'A friendly sans-serif layout for marketing, sales and growth roles, with a warm accent on the tagline and section markers. The summary sits up top so your results, like growth, pipeline and revenue, are the first thing a recruiter reads.',
    whoFor:
      'Choose Marketing & Sales for growth, performance marketing, brand, sales and business development roles. The summary sits at the top so your results lead, and the warm accents make it feel less formal than a finance or consulting resume.',
    includes: [
      'Tagline and short summary under the name',
      'Accent markers on headings, companies and bullets',
      'Experience with space for campaign and sales results',
      'Skills for tools like Google Ads, HubSpot and Excel',
    ],
    tips: [
      'Numbers win here: leads, conversion, quota attainment, follower growth.',
      'Freshers can use college fests, internships and social pages they ran.',
      'Keep the tagline specific: "B2B growth marketer" beats "Passionate marketer".',
    ],
    example: {
      before: 'Handled social media for a startup.',
      after:
        "Grew a D2C brand's Instagram from 4k to 38k followers in 9 months; paid campaigns returned 3.2x ROAS on a INR 6 lakh budget.",
    },
    faqs: [
      {
        q: 'What should my tagline say?',
        a: 'Your specialty in a few words, such as B2B SaaS growth marketer or Inside sales, EdTech. Avoid adjectives like passionate or dynamic.',
      },
      {
        q: 'I am a fresher. What results can I show?',
        a: 'College fests, social pages you ran, internships and freelance work. Followers gained, registrations, sponsorship raised and leads are all real numbers.',
      },
      {
        q: 'Which tools should I list?',
        a: 'The ones the job asks for, such as Google Ads, Meta Ads, HubSpot, Salesforce, Google Analytics and Excel.',
      },
    ],
  },
  executive: {
    heading: 'Executive Resume Template',
    intro:
      'An elegant Garamond layout for senior leaders: a centered small-caps name over a double rule, a summary and core competencies first, then career history with roles grouped under each company, board positions and education.',
    whoFor:
      'Use Executive if you lead teams or functions: senior managers, directors, VPs and founders. It opens with a summary and core competencies, groups several roles under one company to show progression, and has room for board and advisory positions.',
    includes: [
      'Summary and a keyword block of core competencies',
      'Several roles grouped under one company',
      'Board roles and advisory positions',
      'Room for two pages of history',
    ],
    tips: [
      'Lead with scale: team size, budget, revenue you owned.',
      'Keep early-career roles to a single line each.',
      'Two pages is normal at this level; one page of summary and recent roles still matters most.',
    ],
    example: {
      before: 'Managed the engineering team.',
      after:
        'Scaled engineering from 18 to 70 people across 3 locations while keeping release frequency weekly; owned a USD 6M annual budget.',
    },
    faqs: [
      {
        q: 'Is two pages acceptable?',
        a: 'Yes, at this level two pages is normal. Make sure the first page alone, with your summary and recent roles, makes the case.',
      },
      {
        q: 'How do I show promotions at one company?',
        a: 'Add each role as its own entry under the same company; the template groups them so the progression is clear.',
      },
      {
        q: 'What goes in core competencies?',
        a: 'Six to nine areas you are known for, such as P&L ownership, M&A integration or platform strategy. Recruiters and ATS software both scan this block.',
      },
    ],
  },
}
