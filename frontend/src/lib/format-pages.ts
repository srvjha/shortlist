import type { TemplateId } from '@/lib/templates'

// Pages at /resume-format/<slug>: the resume format for one role, shown on a rendered sample from a made-up person
// (backend/src/templates/format-samples.ts, rendered by `pnpm previews` into public/formats/<slug>.png).
export type FormatPage = {
  slug: string
  // The role as people search for it, e.g. "Cloud Engineer". The page title is "<role> Resume Format".
  role: string
  intro: string
  templateId: TemplateId
  // Why this template suits the role, in one or two sentences.
  layoutWhy: string
  // Sections top to bottom, each with why it sits there for this role.
  sections: { name: string; why: string }[]
  // Grouped the way the sample groups them, e.g. { group: 'Cloud', items: ['AWS', ...] }.
  skills: { group: string; items: string[] }[]
  examples: { before: string; after: string }[]
  // Things specific to applying in India: CGPA, notice period, Naukri headline, what to leave out.
  indiaTips: string[]
  mistakes: string[]
  faqs: { q: string; a: string }[]
}

export const formatPages: FormatPage[] = [
  {
    slug: 'software-engineer-fresher',
    role: 'Software Engineer Fresher',
    intro:
      'A software engineer fresher resume should be one page: education, internship, projects, skills, achievements. Projects carry most of the weight, so give them the most space. Below is a full sample and what to put in each section.',
    templateId: 'jake',
    layoutWhy:
      "Jake's Resume is the plain single-column layout most tech recruiters already know, so nothing distracts from your projects. It parses cleanly in every ATS and fits a fresher's content on one page at 11 pt.",
    sections: [
      {
        name: 'Education',
        why: 'As a fresher your degree is the most recent thing you have done, and campus and off-campus forms filter on CGPA and graduation year first. Add one line of coursework only if it matches the job.',
      },
      {
        name: 'Internship',
        why: 'Even a two-month internship shows you have shipped code in a real codebase with reviews and deadlines. If you have none, drop this section and move projects up.',
      },
      {
        name: 'Projects',
        why: 'This is where you prove you can build. Two or three projects with a live link or GitHub, the stack, and one result each beat six tutorial clones.',
      },
      {
        name: 'Technical Skills',
        why: 'Grouped skills let a recruiter match you to the job in one glance. Keep it to what you could be interviewed on.',
      },
      {
        name: 'Achievements',
        why: 'Coding ratings, hackathon results and club work separate you from classmates with the same degree. Keep each to one line with a number.',
      },
    ],
    skills: [
      {
        group: 'Languages',
        items: ['Java', 'Python', 'JavaScript', 'Go', 'SQL'],
      },
      {
        group: 'Web and backend',
        items: ['React', 'Node.js', 'Express', 'REST APIs', 'Flask'],
      },
      {
        group: 'Databases and tools',
        items: ['PostgreSQL', 'MongoDB', 'Git', 'Docker', 'Linux', 'Postman'],
      },
      {
        group: 'Core CS',
        items: [
          'Data Structures and Algorithms',
          'OOP',
          'DBMS',
          'Operating Systems',
        ],
      },
    ],
    examples: [
      {
        before: 'Made a hostel food app using MERN stack.',
        after:
          'Built a meal booking app in React, Express and MongoDB for a 400-student hostel; food wasted per day fell from about 30 kg to 18 kg in the first month.',
      },
      {
        before: 'Worked on backend APIs during internship.',
        after:
          'Built REST endpoints in Node.js and PostgreSQL for an invoice module used by 300 small businesses, plus a nightly job that catches about 40 duplicate invoices a week.',
      },
    ],
    indiaTips: [
      'Write CGPA the way your university does (8.4/10). Add Class X and XII percentages only if the company form asks for them or they are strong, since many service company drives still filter on 60% or 70% across all three.',
      'Many campus drives set a no-active-backlogs rule. Do not hide backlogs on the resume, but you do not need to list cleared ones either.',
      'Put your GitHub and LeetCode or Codeforces links in the header. Interviewers for SDE roles in India often open them before the call.',
      'If you are applying off campus, write your city and say "open to relocate" in your Naukri profile, not on the resume.',
      'Leave out photo, date of birth, father\'s name, and a "Declaration" line at the bottom. They take space and are not needed for software roles.',
    ],
    mistakes: [
      'Listing every language you touched in a first-year lab. If you cannot write a loop in it today, remove it.',
      'Projects with no link. A recruiter cannot check a project that only lives on your laptop.',
      'A career objective like "seeking a challenging role in a reputed organisation". It says nothing; cut it.',
      'Copying the same to-do and weather apps as everyone in your batch, with no change or result of your own.',
      'Going to two pages. Freshers almost never need more than one.',
    ],
    faqs: [
      {
        q: 'Should a software engineer fresher put projects or education first?',
        a: 'Education first is the norm for freshers in India, since it is your latest activity and forms filter on it. Projects come right after, above skills. Once you have a full-time job, move education to the bottom.',
      },
      {
        q: 'How many projects should a fresher resume have?',
        a: 'Two or three strong ones. Each should have a link, the stack, and one line on what it does and what changed because of it.',
      },
      {
        q: 'Is it okay to have no internship?',
        a: 'Yes. Drop the internship section and give projects more room. Open-source contributions or a freelance build for a local business can stand in for experience.',
      },
      {
        q: 'Should I change my resume for each company?',
        a: 'At least reorder skills and pick the projects that match the job. Shortlist can tailor your resume to a pasted job description and shows every change so you keep only what is true.',
      },
    ],
  },
  {
    slug: 'cloud-devops-engineer',
    role: 'Cloud and DevOps Engineer',
    intro:
      'A cloud or DevOps engineer resume should open with a short summary and a grouped tools list, then experience with numbers on cost, deploys and uptime. Keep it to one page up to about five years.',
    templateId: 'developer',
    layoutWhy:
      'The Developer template keeps the dense, single-column tech layout recruiters expect and puts GitHub in the header with an icon, which matters when you have Terraform or homelab repos to show.',
    sections: [
      {
        name: 'Summary',
        why: 'Two lines that say your years, your cloud and your daily tools. DevOps titles vary a lot (SRE, platform, cloud engineer), so the summary tells the reader which one you are.',
      },
      {
        name: 'Technical Skills',
        why: 'DevOps job posts are mostly lists of tools, and recruiters and ATS match on them. Put the grouped list near the top so the match is obvious.',
      },
      {
        name: 'Experience',
        why: 'The core of the page. Each bullet should name the tool and the change it made: cost, deploy time, recovery time, tickets.',
      },
      {
        name: 'Projects',
        why: 'A homelab cluster or a small automation repo shows you work with the stack beyond your current job, especially if your employer is mostly on-premise.',
      },
      {
        name: 'Certifications',
        why: 'AWS, Azure, CKA and Terraform certifications are often listed in Indian DevOps job posts. A short list with years is enough.',
      },
      {
        name: 'Education',
        why: 'One line at the bottom. After three years of work, your degree branch matters far less than what you run.',
      },
    ],
    skills: [
      {
        group: 'Cloud',
        items: ['AWS (EC2, EKS, RDS, S3, IAM, VPC, CloudFront)', 'basic Azure'],
      },
      {
        group: 'Containers and IaC',
        items: ['Docker', 'Kubernetes', 'Helm', 'Terraform', 'Ansible'],
      },
      { group: 'CI/CD', items: ['GitHub Actions', 'Jenkins', 'Argo CD'] },
      {
        group: 'Monitoring',
        items: ['Prometheus', 'Grafana', 'Loki', 'CloudWatch', 'PagerDuty'],
      },
      {
        group: 'Scripting',
        items: ['Bash', 'Python', 'Linux administration'],
      },
    ],
    examples: [
      {
        before: 'Responsible for managing Kubernetes clusters and deployments.',
        after:
          'Moved 28 services from EC2 to EKS with Helm charts, cutting monthly compute spend by about 22%.',
      },
      {
        before: 'Worked on CI/CD pipelines using Jenkins.',
        after:
          'Set up Argo CD for GitOps deploys; release frequency went from weekly to 6 or 7 times a day.',
      },
    ],
    indiaTips: [
      'If you are moving from a support or system admin role at a service company, title the bullets around what you automated, not the tickets you closed. Many DevOps engineers in India start this way, and that is fine to show.',
      'Mention your notice period and current location on Naukri, and keep the resume headline matching your Naukri headline ("DevOps Engineer, AWS and Kubernetes") so searches find both.',
      'Write cloud spend in the currency you were billed in. Most AWS bills are in dollars, so "$900 a month" is clearer than a rupee conversion.',
      'Product companies and GCCs in Bengaluru, Hyderabad, Pune and Chennai often ask for on-call experience. If you have done it, say so in one bullet.',
      'Leave out client names under NDA. "A US retail client" is enough.',
    ],
    mistakes: [
      'A skills list with 40 tools and no bullet that uses any of them.',
      'Listing certifications you have not finished ("AWS SAA, in progress") above real work.',
      'Writing "maintained 99.9% uptime" with no detail on what you did to get it.',
      'Leaving out scripting. Bash and Python are expected; say what you automated with them.',
    ],
    faqs: [
      {
        q: 'Do I need certifications to get a DevOps job in India?',
        a: 'They are not required, but AWS Solutions Architect Associate, CKA and Terraform Associate show up often in job posts and help when your current role is not on the cloud. Hands-on bullets still matter more.',
      },
      {
        q: 'How do I move from a support role to DevOps on my resume?',
        a: 'Lead with what you automated or containerised, add a homelab or small project on GitHub, and put your tools list near the top. A summary that names the target role helps too.',
      },
      {
        q: 'Should a DevOps resume be one page or two?',
        a: 'One page up to about five years of experience. After that, two pages is fine if the second page has real projects, not a longer tool list.',
      },
    ],
  },
  {
    slug: 'mlops-engineer',
    role: 'MLOps and ML Engineer',
    intro:
      'An MLOps or ML engineer resume should show models running in production: pipelines, serving, monitoring and retraining, each with a latency, cost or accuracy number. Lead with experience; keep it to one page.',
    templateId: 'sb2nov',
    layoutWhy:
      'The Compact layout fits a dense stack (training, serving, infra, LLM tools) and two jobs with four bullets each on one page, without shrinking the text.',
    sections: [
      {
        name: 'Summary',
        why: 'One or two lines that place you between data science and platform engineering, since "ML engineer" means different things at different companies.',
      },
      {
        name: 'Experience',
        why: 'Hiring managers want proof a model you touched served real traffic. Lead each bullet with the pipeline or service and end with latency, throughput, time saved or a metric.',
      },
      {
        name: 'Technical Skills',
        why: 'Group by ML, MLOps tools, serving and infra so a reader sees you cover the whole path from training to production.',
      },
      {
        name: 'Projects',
        why: 'A self-hosted RAG service or an evaluation setup shows current work with LLMs, which many Indian ML job posts now ask about.',
      },
      {
        name: 'Education',
        why: 'Below experience once you have two or more years. Keep the branch and CGPA; drop coursework.',
      },
      {
        name: 'Certifications and Writing',
        why: 'A cloud ML certification and a few technical blog posts are small but useful signals. Keep it to two or three lines.',
      },
    ],
    skills: [
      {
        group: 'ML and data',
        items: [
          'Python',
          'scikit-learn',
          'PyTorch',
          'LightGBM',
          'pandas',
          'SQL',
          'PySpark',
        ],
      },
      {
        group: 'MLOps',
        items: [
          'MLflow',
          'Kubeflow Pipelines',
          'Feast',
          'Evidently',
          'DVC',
          'Airflow',
        ],
      },
      {
        group: 'Serving and infra',
        items: [
          'FastAPI',
          'Docker',
          'Kubernetes',
          'AWS (S3, EKS, SageMaker)',
          'Terraform',
        ],
      },
      {
        group: 'LLM work',
        items: ['vLLM', 'LangChain', 'RAG evaluation', 'prompt versioning'],
      },
    ],
    examples: [
      {
        before: 'Deployed machine learning models to production.',
        after:
          'Served 4 models behind FastAPI on EKS with p95 latency of 45 ms at about 1,200 requests a minute.',
      },
      {
        before: 'Built an ML pipeline for model training.',
        after:
          'Built the credit risk training pipeline in Kubeflow and MLflow, so a retrain runs end to end in 3 hours instead of 2 days of manual steps.',
      },
    ],
    indiaTips: [
      'Many ML roles in India are at GCCs and fintech or lending companies with strict data rules. Describe the model and the result, never customer data or the client by name.',
      'If you are moving from data analyst or data scientist to ML engineer, keep the earlier role but write its bullets around packaging, testing and scheduling models.',
      'Put a GitHub link in the header. For ML roles, a repo with a Dockerfile and a README that runs is worth more than a Kaggle notebook.',
      'State your notice period on Naukri and LinkedIn. Many ML openings in India want 30 days or less, and some buy out longer notice.',
      'Leave out an "Interests: AI, deep learning" line. Everything else on the page should already show it.',
    ],
    mistakes: [
      'Listing accuracy with no baseline. "94% accuracy" means little; "from 88% to 94% over the previous model" means something.',
      'Only notebook projects, with nothing deployed, versioned or monitored.',
      'Naming every LLM framework you have read about. List what you have shipped or evaluated.',
      'Mixing research and production bullets so the reader cannot tell which models went live.',
    ],
    faqs: [
      {
        q: 'What is the difference between an ML engineer and an MLOps engineer resume?',
        a: 'An ML engineer resume weighs model building and evaluation; an MLOps one weighs pipelines, serving, monitoring and infrastructure. Most roles in India want both, so show at least one bullet for each stage.',
      },
      {
        q: 'Should I add LLM and GenAI projects?',
        a: 'Yes, if they are real: a RAG service with an evaluation set, fine-tuning with measured results, or cost and latency work on serving. Avoid listing a chatbot wrapper with no numbers.',
      },
      {
        q: "Do I need a master's degree for ML engineer roles?",
        a: "Not for most product and GCC roles. A B.Tech with production ML experience is common. Research roles are where a master's or papers matter more.",
      },
    ],
  },
  {
    slug: 'data-analyst',
    role: 'Data Analyst',
    intro:
      'A data analyst resume should lead with a short summary and a skills block (SQL first), then experience where every bullet has a number. One page is enough up to about five years.',
    templateId: 'data-analyst',
    layoutWhy:
      'The Analyst template mutes dates and locations so the numbers in your bullets stand out, and its key and value skills block reads like a quick checklist of SQL, Python and BI tools.',
    sections: [
      {
        name: 'Summary',
        why: 'Name your domain (retail, fintech, healthcare) and what you produce. Analyst roles differ a lot by domain, and the summary sets that context fast.',
      },
      {
        name: 'Skills',
        why: 'Analyst job posts in India almost always ask for SQL, Excel and one BI tool. Putting skills second lets a recruiter tick those off before reading the rest.',
      },
      {
        name: 'Experience',
        why: 'Each bullet should say the data, the tool and the decision or time saved. This is what separates you from someone who only did courses.',
      },
      {
        name: 'Projects',
        why: 'One public project with a live dashboard link shows how you think. With experience, one is enough; freshers should have two or three.',
      },
      {
        name: 'Education',
        why: 'A statistics, maths, economics or engineering degree supports an analyst profile. Keep it to one line.',
      },
      {
        name: 'Certifications',
        why: 'PL-300 and the Google Data Analytics certificate are widely recognised for entry and mid-level roles. List them with years.',
      },
    ],
    skills: [
      {
        group: 'Querying',
        items: [
          'SQL (joins, window functions, CTEs)',
          'BigQuery',
          'PostgreSQL',
        ],
      },
      {
        group: 'Analysis',
        items: [
          'Python (pandas, NumPy)',
          'Excel (pivot tables, XLOOKUP, Power Query)',
        ],
      },
      {
        group: 'BI and reporting',
        items: ['Power BI (DAX)', 'Looker Studio', 'Tableau'],
      },
      {
        group: 'Statistics',
        items: [
          'A/B testing',
          'cohort and funnel analysis',
          'regression basics',
        ],
      },
    ],
    examples: [
      {
        before: 'Created dashboards for sales team using Power BI.',
        after:
          'Built a Power BI sales dashboard on 12M order rows that 35 category managers use weekly, replacing a 5-hour Excel report.',
      },
      {
        before: 'Did analysis on customer behaviour.',
        after:
          'Analysed checkout drop-off with funnel and cohort queries; the fix to the address step lifted completed checkouts by 3.1%.',
      },
    ],
    indiaTips: [
      'Many analyst roles in India are titled MIS Executive, Business Analyst or Reporting Analyst. Read the job post, not the title, and match your summary to it.',
      'If you are moving from MIS or Excel reporting, show the step up: SQL instead of manual exports, a dashboard instead of an emailed sheet.',
      'Recruiters on Naukri search by tool names. Use the exact words: "Power BI", "SQL", "Tableau", not "BI tools".',
      'Mention notice period and current CTC only on the job portal or when asked, not on the resume.',
      'Do not list MS Word and PowerPoint as analyst skills; they are assumed.',
    ],
    mistakes: [
      'Bullets with no numbers. An analyst resume without metrics reads like it was written by someone who does not measure things.',
      'Listing Python, R, SAS, Tableau, Power BI and Qlik when you have used two of them.',
      'Course projects on the Titanic or Iris datasets. Pick a dataset tied to a real question.',
      'Describing the dashboard instead of what people decided with it.',
    ],
    faqs: [
      {
        q: 'What skills should a data analyst resume have in 2026?',
        a: 'SQL first, then Excel, one BI tool (Power BI is most asked for in India), and Python with pandas. Basic statistics such as A/B testing and cohort analysis help for product and e-commerce roles.',
      },
      {
        q: 'Can a fresher become a data analyst without experience?',
        a: 'Yes. Replace experience with two or three end-to-end projects on public data: the question, the SQL or Python, the dashboard and the answer. Link each one.',
      },
      {
        q: 'Is a data analyst resume different from a data scientist one?',
        a: 'Yes. Analyst resumes focus on SQL, reporting and business decisions; data scientist resumes add modelling, experiments and Python depth. Use the title the job post uses.',
      },
    ],
  },
  {
    slug: 'mba-fresher',
    role: 'MBA Fresher',
    intro:
      'An MBA fresher resume should be one page with education first, then summer internship, live projects, positions of responsibility and achievements. The same order works for marketing, finance and HR.',
    templateId: 'consulting',
    layoutWhy:
      'The Consulting template is the clean one-page format B-school placement cells expect: ruled headings, firm and dates on one line, and square bullets that keep each result on its own line.',
    sections: [
      {
        name: 'Education',
        why: 'Your MBA is the reason you are in the placement process, and recruiters compare candidates on institute and CGPA. Add your graduation degree below it.',
      },
      {
        name: 'Experience',
        why: 'The summer internship goes first, then any full-time work before the MBA. Work experience, even in an unrelated field, often counts in lateral and final placements.',
      },
      {
        name: 'Live Projects',
        why: 'Short projects with real companies show you can work on a live problem. Keep one or two with a clear finding.',
      },
      {
        name: 'Positions of Responsibility',
        why: 'Clubs and committees are a standard section in Indian B-school resumes and show leadership when you have little work history.',
      },
      {
        name: 'Achievements',
        why: 'Case competition results and certifications relevant to your specialisation. Put the rank and number of teams.',
      },
      {
        name: 'Skills',
        why: 'Last, and short. Name tools for your track: Google Ads and GA4 for marketing, financial modelling for finance, HRMS tools for HR.',
      },
    ],
    skills: [
      {
        group: 'Marketing',
        items: [
          'Market research',
          'brand plans',
          'Google Ads',
          'Meta Ads Manager',
        ],
      },
      {
        group: 'Tools',
        items: ['Excel', 'PowerPoint', 'Google Analytics 4', 'SPSS'],
      },
      {
        group: 'Languages',
        items: ['English', 'Hindi', 'Marathi (conversational)'],
      },
    ],
    examples: [
      {
        before:
          'Did a market research project on consumer preferences for snacks.',
        after:
          'Ran a consumer survey of 420 buyers across 3 cities for a new millet snack range and presented pack and price options to the brand head.',
      },
      {
        before: 'Member of the placement committee.',
        after:
          'Handled communication with 30 visiting companies as a placement committee member, from first contact to final offers.',
      },
    ],
    indiaTips: [
      'Many B-schools have a fixed placement resume format. If yours does, use it for campus and keep this version for off-campus applications.',
      'Write CGPA on the scale your institute uses (3.4/4 or 7.8/10). Graduation percentage is still asked for by many recruiters, so keep it.',
      'For finance, swap the skills to financial modelling, valuation and Excel. For HR, use recruitment, HR analytics and labour law basics. The section order stays the same.',
      'Work experience before the MBA counts. Write it with numbers even if it was in a different field, such as accounts or IT services.',
      'Leave out hobbies unless they are notable (state-level sport, a published piece). Interviewers do ask about them.',
    ],
    mistakes: [
      'A long objective at the top. Your specialisation and graduation year in the headline do the job.',
      'Listing every club you joined. Keep two or three roles where you did something you can measure.',
      'Writing internship bullets about what the company does instead of what you did.',
      'Different date and number formats across the page ("Jun\'25", "June 2025", "6/2025"). Pick one.',
    ],
    faqs: [
      {
        q: 'Should an MBA fresher add work experience from before the MBA?',
        a: 'Yes. Put it under Experience after your summer internship, with numbers. Even unrelated work shows you have handled clients, deadlines or targets.',
      },
      {
        q: 'Is the resume different for MBA marketing, finance and HR?',
        a: 'The section order is the same. What changes is which internship bullets you pick, which live projects you show and which skills you list. Keep a version for each track you apply to.',
      },
      {
        q: 'Can an MBA fresher resume be two pages?',
        a: 'For placements, no. Indian B-schools and recruiters expect one page for freshers.',
      },
      {
        q: 'How do I tailor my MBA resume to a specific role?',
        a: "Reorder bullets so the ones closest to the job come first and use the job post's terms where they are true for you. Shortlist can do a first pass against a pasted job description and flags anything that is not in your resume.",
      },
    ],
  },
  {
    slug: 'bcom-accountant',
    role: 'B.Com and Accountant',
    intro:
      'An accountant resume after B.Com should show certifications near the top, then experience with the returns, ledgers and tools you handle every month. Tally, GST and TDS work belong in the bullets, not just in skills.',
    templateId: 'finance',
    layoutWhy:
      'The Finance & Accounting template puts certifications right under the summary, where a CA Inter or Tally certificate is seen first, and its classic serif reads as steady and careful.',
    sections: [
      {
        name: 'Summary',
        why: 'Two lines on your years, the kind of businesses you have kept books for and your software. CA firms and companies hire differently, and this tells them which you have worked in.',
      },
      {
        name: 'Certifications',
        why: 'CA Inter, CMA Inter or a Tally with GST course is often a filter for accounts roles. Showing them early saves a recruiter from looking.',
      },
      {
        name: 'Experience',
        why: 'Name the returns, the number of clients or vouchers and the software. This is what an accounts manager reads to judge if you can start without training.',
      },
      {
        name: 'Skills',
        why: 'Group into accounting, tax and compliance, and software. Indian job posts often ask for these exact words.',
      },
      {
        name: 'Education',
        why: 'Once you have worked for a year, B.Com moves to the bottom. A fresh graduate should put it right after certifications.',
      },
    ],
    skills: [
      {
        group: 'Accounting',
        items: [
          'Bookkeeping',
          'bank reconciliation',
          'accounts payable and receivable',
          'month-end closing',
        ],
      },
      {
        group: 'Tax and compliance',
        items: [
          'GST returns',
          'input tax credit matching',
          'TDS returns',
          'e-invoicing',
        ],
      },
      {
        group: 'Software',
        items: [
          'Tally Prime',
          'Zoho Books',
          'Excel (VLOOKUP, pivot tables)',
          'GST portal',
        ],
      },
    ],
    examples: [
      {
        before: 'Responsible for GST filing.',
        after:
          'File GSTR-1 and GSTR-3B for 12 clients every month; matching purchases against GSTR-2B recovered ₹3.2 lakh of missed input credit in 2025.',
      },
      {
        before: 'Did data entry in Tally.',
        after:
          'Entered about 600 purchase and sales vouchers a month in Tally Prime and kept the stock register in step with the godown.',
      },
    ],
    indiaTips: [
      'If you are pursuing CA or CMA, write the exact status: "CA Intermediate, Group I cleared, May 2024". Firms read this closely, and "CA Inter" alone looks unfinished.',
      'Name the returns you file (GSTR-1, GSTR-3B, 24Q, 26Q). An accounts manager trusts specific form names more than "taxation".',
      'Freshers can list Class XII marks if commerce stream scores were strong; many CA firms and mid-size companies still ask for them.',
      'Write the number of clients or the size of the books you handle. It tells a reader your workload without naming clients.',
      'On Naukri, use a headline like "Accounts Executive, Tally, GST, TDS" so you appear in recruiter searches for those terms.',
    ],
    mistakes: [
      'Listing "MS Office" and "typing speed" as main skills. Tally, GST and reconciliations are what matter.',
      'Writing "knowledge of accounting standards" with no example of where you used them.',
      'Leaving out the software version. "Tally Prime" and "Tally ERP 9" are both searched for.',
      'Adding a declaration and signature line at the bottom. It is not needed on a resume.',
    ],
    faqs: [
      {
        q: 'What should a B.Com fresher put on an accountant resume?',
        a: 'Education and any certification first (Tally, GST course, CA or CMA Inter status), then internships or articleship, then skills. A short project such as keeping books for a family business counts if you can describe it with numbers.',
      },
      {
        q: 'Should I mention that I left CA midway?',
        a: 'Mention the levels you cleared, such as "CA Intermediate, Group I cleared". You do not need to explain why you stopped on the resume. Be ready to answer it in the interview.',
      },
      {
        q: 'Is Tally still worth listing in 2026?',
        a: 'Yes. Tally Prime is still the most common accounting software in small and mid-size Indian businesses. Add Zoho Books or SAP basics if you have used them.',
      },
    ],
  },
  {
    slug: 'sales-executive',
    role: 'Sales Executive',
    intro:
      'A sales executive resume should start with a summary that states your target record, then experience where every role shows revenue, accounts or target achieved. Put numbers in the first words of each bullet.',
    templateId: 'marketing',
    layoutWhy:
      'The Marketing & Sales template puts the summary at the top in a friendly sans-serif, with company names in a warm accent so your track record across employers is easy to follow.',
    sections: [
      {
        name: 'Summary',
        why: 'Sales managers want the headline number first: years, what you sell, and how often you hit target. Add the region you want to work in.',
      },
      {
        name: 'Experience',
        why: 'Show target achieved, revenue closed, new accounts and your rank in the team. The product and the buyer type (retailers, SMEs, enterprises) matter as much as the numbers.',
      },
      {
        name: 'Achievements',
        why: 'Awards like top performer or fastest ramp-up are common in sales and quick to read. Keep them separate so they do not get lost in bullets.',
      },
      {
        name: 'Skills',
        why: 'List the sales motions you have done, your CRM and your languages. Regional languages are a real plus for field sales in India.',
      },
      {
        name: 'Education',
        why: 'One line at the bottom. In sales, results outweigh the degree after the first job.',
      },
    ],
    skills: [
      {
        group: 'Sales',
        items: [
          'Lead generation',
          'cold calling',
          'product demos',
          'negotiation',
          'account management',
        ],
      },
      {
        group: 'Tools',
        items: [
          'Zoho CRM',
          'Salesforce (basic)',
          'Excel',
          'LinkedIn Sales Navigator',
        ],
      },
      { group: 'Languages', items: ['English', 'Hindi', 'Punjabi'] },
    ],
    examples: [
      {
        before: 'Handled sales and achieved targets.',
        after:
          'Achieved 112% of annual target in FY 2024-25, ranked 2nd of 11 executives in the region.',
      },
      {
        before: 'Met clients and generated new business.',
        after:
          'Added 22 new corporate accounts through visits to business parks in Okhla and Noida.',
      },
    ],
    indiaTips: [
      'Use the Indian financial year ("FY 2024-25") for targets. Sales managers here think in it, and it avoids confusion about which year you mean.',
      'Write money in lakh or crore with ₹, the way your target sheet was written.',
      'Name the territory you covered. A manager hiring for Delhi NCR or Pune wants to know you know the market.',
      'If you are open to field work and travel, say it on Naukri or in the summary. Many sales roles in India are field roles.',
      'Do not put your current CTC or expected CTC on the resume. Share it when the recruiter asks.',
    ],
    mistakes: [
      'Writing "achieved targets" without the percentage or amount.',
      'Hiding a weak quarter by listing no numbers at all. A record of 9 of 11 quarters is believable; no record looks worse.',
      'Listing soft skills like "good communication" and "team player". Your numbers already show them.',
      'Leaving out what you sold and to whom. Selling SaaS to SMEs and FMCG to retailers are different jobs.',
    ],
    faqs: [
      {
        q: 'What should I write in a sales executive resume summary?',
        a: 'Your years in sales, what you sell and to whom, your target record and the region you want. For example: "3 years in B2B sales for SaaS and office supplies; met or beat target in 9 of the last 11 quarters."',
      },
      {
        q: 'How do I write a sales resume with no experience?',
        a: 'Use anything with a number: fundraising for a college fest, selling sponsorships, a part-time retail job, or a summer internship with a lead target. Put the result first in each bullet.',
      },
      {
        q: 'Should I list my sales targets if I missed some?',
        a: 'List your overall record honestly, such as "met target in 9 of 11 quarters", and lead with your best year. Interviewers will ask, so the numbers must match what you say.',
      },
    ],
  },
  {
    slug: 'digital-marketing',
    role: 'Digital Marketing',
    intro:
      'A digital marketing resume should open with a summary naming your channels and budget, then experience with CAC, ROAS, conversion or traffic numbers. Add certifications and a portfolio link; keep it to one page.',
    templateId: 'modern',
    layoutWhy:
      'Modern is a single column with teal headings and a portfolio link in the header, so it looks current without the columns that trip up ATS. It suits marketers who want a clean page that still reads in order.',
    sections: [
      {
        name: 'Summary',
        why: 'Digital marketing covers paid ads, SEO, social, email and more. Two lines that name your channels, your budget and your industry tell the reader which kind of marketer you are.',
      },
      {
        name: 'Experience',
        why: 'Each bullet should tie a channel to a business number: CAC, ROAS, conversion rate, organic sessions or leads. Agency and brand-side work both count.',
      },
      {
        name: 'Skills',
        why: 'Group by channel and analytics so a hiring manager sees the platforms you run, not a cloud of buzzwords.',
      },
      {
        name: 'Certifications',
        why: 'Google Ads and Meta certifications are common asks in Indian job posts and are free or cheap to earn. List current ones only.',
      },
      {
        name: 'Education',
        why: 'At the bottom. A marketing degree helps but results carry the page.',
      },
    ],
    skills: [
      {
        group: 'Paid media',
        items: [
          'Google Ads (Search, PMax, YouTube)',
          'Meta Ads Manager',
          'audience and budget planning',
        ],
      },
      {
        group: 'Analytics',
        items: ['GA4', 'Google Tag Manager', 'Looker Studio', 'Excel'],
      },
      {
        group: 'SEO and content',
        items: ['Keyword research', 'on-page SEO', 'Ahrefs', 'Search Console'],
      },
      {
        group: 'Email and CRM',
        items: ['Klaviyo', 'WhatsApp campaigns', 'Shopify'],
      },
    ],
    examples: [
      {
        before: 'Managed Facebook and Google ad campaigns for the brand.',
        after:
          'Ran Meta and Google Ads with a monthly budget of Rs 8 to 12 lakh; brought blended CAC down from Rs 610 to Rs 470 over 9 months.',
      },
      {
        before: 'Wrote SEO blogs for clients.',
        after:
          "Wrote 30 blog posts from Ahrefs keyword plans; organic sessions to one client's site grew from 3k to 11k a month.",
      },
    ],
    indiaTips: [
      'Say whether your work was agency-side or brand-side, and for which kind of business (D2C, edtech, real estate). Indian hiring managers read these as very different jobs.',
      'Write budgets in lakh a month. It is the clearest way to show the scale you have handled.',
      'Add a portfolio or case study link in the header. A one-page case study with before and after numbers is often read before the resume.',
      'Many entry roles in India mix social media, SEO and ads. If you did all three, say what share of your time went to each.',
      'Leave out follower counts on your personal accounts unless the job is about growing a personal brand.',
    ],
    mistakes: [
      'Reporting impressions and likes instead of leads, sales or CAC.',
      'Listing every tool on the market (HubSpot, Marketo, SEMrush, Hootsuite) without using them in a bullet.',
      'No budget figures, so the reader cannot judge the scale of your work.',
      'Using a heavily designed two-column template that ATS software reads out of order.',
    ],
    faqs: [
      {
        q: 'What should a digital marketing fresher put on a resume?',
        a: 'Certifications (Google Ads, GA4, Meta), one or two real projects such as running ads for a local business or growing a college page, and the numbers from them. A small budget with clear results beats a big claim.',
      },
      {
        q: 'Which certifications matter for digital marketing jobs in India?',
        a: 'Google Ads (Search, Measurement), Google Analytics 4 and Meta Blueprint certifications are the most asked for. HubSpot content and email courses help for content roles.',
      },
      {
        q: 'Should I include a portfolio link?',
        a: 'Yes. Link a short page with two or three campaigns: the goal, what you changed and the result. Remove client names if you are not allowed to share them.',
      },
    ],
  },
  {
    slug: 'mechanical-civil-engineer',
    role: 'Mechanical and Civil Engineering Fresher',
    intro:
      'A mechanical or civil engineering fresher resume should open with an education table (degree, Class XII, Class X), then internships, academic projects and design software. One page, laid out for campus placements.',
    templateId: 'campus',
    layoutWhy:
      'The Campus template shows education as a degree, institution, score and year table, which is exactly what core engineering companies check first at placements, and its shaded section bars keep a dense page readable.',
    sections: [
      {
        name: 'Education',
        why: 'Core companies often filter on marks in B.E. or B.Tech, Class XII and Class X. A table puts all three in one place.',
      },
      {
        name: 'Internships',
        why: 'Plant, site or design internships show you have seen a shop floor or a construction site. Write what you measured or changed, not just the department.',
      },
      {
        name: 'Academic Projects',
        why: 'Your final-year project and team builds (go-kart, SAE, concrete mix studies) are your main technical proof. Give each a measured result.',
      },
      {
        name: 'Technical Skills',
        why: 'Design and analysis software is what core job posts list: SolidWorks, AutoCAD, ANSYS for mechanical; AutoCAD, STAAD.Pro, Revit for civil.',
      },
      {
        name: 'Positions of Responsibility',
        why: 'Team and club roles show you can lead people, which matters for production, site and maintenance roles where you will manage workers.',
      },
      {
        name: 'Certifications',
        why: 'CSWA, NPTEL and software certificates help freshers stand apart in a batch with similar marks. Keep the ones linked to the role.',
      },
    ],
    skills: [
      {
        group: 'Design and analysis',
        items: ['SolidWorks', 'AutoCAD', 'CATIA (basic)', 'ANSYS', 'GD&T'],
      },
      {
        group: 'Manufacturing',
        items: [
          'CNC programming basics',
          'lean and 5S',
          'Pareto and root cause analysis',
        ],
      },
      { group: 'Software', items: ['MS Excel', 'MATLAB', 'Python (basic)'] },
    ],
    examples: [
      {
        before: 'Did internship in production department of a forging company.',
        after:
          'Studied cycle times on a crankshaft machining line and proposed a fixture change that cut setup time from 42 to 30 minutes.',
      },
      {
        before: 'Final year project on solar dryer.',
        after:
          'Designed and built a solar-assisted grain dryer that brought grain moisture from 22% to 13% in 7 hours, against 2 days of sun drying.',
      },
    ],
    indiaTips: [
      'Keep Class X and XII marks. PSUs and many core companies still set cut-offs across all three, and leaving them out raises questions.',
      'Civil freshers: swap in site internship bullets (quantity estimation, bar bending schedules, quality checks) and list AutoCAD, STAAD.Pro and Revit.',
      'If you have a GATE score, add it as a row in the education table or under achievements, with the year.',
      'Write your home city and state. Plant and site roles are often outside metros, and recruiters look for people willing to work there; say "open to relocation" on Naukri.',
      'Leave out the generic "Hobbies: reading, cricket" line and a declaration with signature. They waste space on a page you need for projects.',
    ],
    mistakes: [
      'Writing the industrial visit as an internship. Visits can go in one line under achievements, not as experience.',
      'A project title with no description of what you built or measured.',
      'Listing software you used once in a lab. Interviewers for design roles will ask you to model something.',
      'Putting an IT career objective on a core engineering resume. Write a separate version for each kind of role.',
    ],
    faqs: [
      {
        q: 'Should mechanical and civil freshers include 10th and 12th marks?',
        a: 'Yes. Core companies and PSUs often have cut-offs for Class X and XII as well as the degree. Put all three in the education table.',
      },
      {
        q: 'What software should a civil engineering fresher list?',
        a: 'AutoCAD is expected. STAAD.Pro or ETABS for structures, Revit for building design, and MS Project or Primavera for planning roles. List only what you can use in a test.',
      },
      {
        q: 'Can a mechanical engineer apply for IT jobs with the same resume?',
        a: 'Keep a separate version. For IT roles, move coding projects and skills up and shorten the core engineering detail. Mixing both on one page weakens each.',
      },
    ],
  },
  {
    slug: 'hr-executive',
    role: 'HR Executive',
    intro:
      'An HR executive resume with 1 to 3 years should open with a short summary, then experience showing hiring numbers, time to hire and HR operations you run. One page, with HRMS tools and labour law basics named.',
    templateId: 'consulting',
    layoutWhy:
      'The Consulting template is clean and corporate, with ruled headings and square bullets that suit numbers like positions closed and time to hire. It looks like the documents an HR team already works with.',
    sections: [
      {
        name: 'Summary',
        why: 'HR executive roles range from pure recruitment to payroll and compliance. Two lines that say which parts you have done and for what kind of workforce set the right expectations.',
      },
      {
        name: 'Experience',
        why: 'Show positions closed, time to hire, sourcing channels and the size of the workforce you support. Recruitment and operations bullets should both be there if you do both.',
      },
      {
        name: 'Skills',
        why: 'Split recruitment, HR operations and tools. Indian HR job posts often name Naukri RMS, greytHR or Keka and PF and ESIC directly.',
      },
      {
        name: 'Education',
        why: 'An MBA or PGDM in HR is common for these roles, so keep it with the specialisation. After two jobs it goes below experience.',
      },
      {
        name: 'Certifications',
        why: 'A labour law or payroll course supports operations work. Keep it short and recent.',
      },
    ],
    skills: [
      {
        group: 'Recruitment',
        items: [
          'Sourcing',
          'screening',
          'Naukri RMS',
          'LinkedIn Recruiter',
          'campus hiring',
        ],
      },
      {
        group: 'HR operations',
        items: [
          'Onboarding',
          'PF and ESIC',
          'attendance and leave',
          'payroll inputs',
          'HR policies',
        ],
      },
      {
        group: 'Tools',
        items: ['greytHR', 'Excel (pivot tables, VLOOKUP)', 'Google Workspace'],
      },
      { group: 'Languages', items: ['English', 'Hindi', 'Marathi'] },
    ],
    examples: [
      {
        before: 'Handled end-to-end recruitment.',
        after:
          'Closed 92 positions in 2025 across production, quality and support functions, with average time to hire down from 38 to 27 days.',
      },
      {
        before: 'Responsible for onboarding new employees.',
        after:
          'Run joining formalities and induction for about 10 new joiners a month, plus PF and ESIC registration.',
      },
    ],
    indiaTips: [
      'Name the statutory work you handle (PF, ESIC, gratuity, Shops and Establishments). Manufacturing and staffing companies in India look for it.',
      'Say what kind of roles you hire for: IT, blue-collar, sales or leadership. Hiring 90 technicians and hiring 10 engineers are different jobs.',
      'If you started at a staffing or recruitment agency, keep it. It shows volume hiring and sourcing on Naukri and LinkedIn, which in-house teams value.',
      'Regional languages help in plant HR and blue-collar hiring. List them under skills.',
      'Keep employee and candidate names out of bullets, even in passing. HR resumes are read for discretion too.',
    ],
    mistakes: [
      '"End-to-end recruitment" with no number of hires, roles or time to hire.',
      'Listing HR theory topics (Maslow, OD, training needs analysis) as skills without having done them.',
      'Leaving out the HRMS or ATS you use daily.',
      'A summary full of traits like "people person" and "strong interpersonal skills" instead of what you have done.',
    ],
    faqs: [
      {
        q: 'What skills should an HR executive resume have?',
        a: 'Sourcing and screening on job portals, interview coordination, onboarding, attendance and leave, payroll inputs and statutory compliance such as PF and ESIC. Add the HRMS you use, such as greytHR, Keka or Darwinbox.',
      },
      {
        q: 'How do I show HR work with numbers?',
        a: 'Count what you handle: positions closed, time to hire, joiners a month, employees on payroll, offer-to-join ratio. Even estimates like "about 10 joiners a month" are better than none.',
      },
      {
        q: 'Should an MBA HR fresher use this format?',
        a: 'Use the same sections, but put education first and replace experience with your summer internship and live projects, as an MBA fresher resume does.',
      },
    ],
  },
]

export const findFormatPage = (slug: string) =>
  formatPages.find((page) => page.slug === slug)
