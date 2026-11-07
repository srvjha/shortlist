import { type ResumeContent, resumeContentSchema } from "../schemas/resume-content.js";

// Made-up people at made-up companies, rendered into frontend/public/templates by scripts/render-template-previews.ts.
// Keep real employers out of these: a preview must never suggest that someone worked at a real company.

let nextId = 0;
const id = () => `p${++nextId}`;
const bullets = (texts: string[] = []) => texts.map((text) => ({ id: id(), text }));

const exp = (
  organization: string,
  role: string,
  location: string,
  start: string,
  end: string,
  points: string[] = [],
) => ({ id: id(), organization, role, location, start, end, bullets: bullets(points) });

const edu = (
  institution: string,
  fields: { degree?: string; field?: string; score?: string; location?: string; start?: string; end?: string },
  points: string[] = [],
) => ({ id: id(), institution, ...fields, bullets: bullets(points) });

const project = (
  name: string,
  technologies: string[],
  links: [string, string][],
  points: string[],
  dates: { start?: string; end?: string } = {},
) => ({
  id: id(),
  name,
  technologies,
  links: links.map(([label, url]) => ({ label, url })),
  bullets: bullets(points),
  ...dates,
});

const item = (title: string, date?: string, subtitle?: string, points: string[] = []) => ({
  id: id(),
  title,
  ...(date && { date }),
  ...(subtitle && { subtitle }),
  bullets: bullets(points),
});

const experience = (title: string, entries: unknown[]) => ({ id: id(), type: "experience", title, entries });
const education = (title: string, entries: unknown[]) => ({ id: id(), type: "education", title, entries });
const projects = (title: string, entries: unknown[]) => ({ id: id(), type: "projects", title, entries });
const list = (title: string, entries: unknown[]) => ({ id: id(), type: "list", title, entries });
const summary = (title: string, text: string) => ({ id: id(), type: "summary", title, text });
const skills = (title: string, groups: [string, string[]][]) => ({
  id: id(),
  type: "skills",
  title,
  groups: groups.map(([name, items]) => ({ id: id(), name, items })),
});
const links = (title: string, entries: [string, string][]) => ({
  id: id(),
  type: "links",
  title,
  links: entries.map(([label, url]) => ({ label, url })),
});

const resume = (basics: object, sections: unknown[]): ResumeContent =>
  resumeContentSchema.parse({ basics: { links: [], ...basics }, sections });

const linkedIn = (slug: string) => ({ label: "LinkedIn", url: `https://linkedin.com/in/${slug}` });

const aarav = resume(
  {
    name: "Aarav Sharma",
    headline: "Backend Engineer",
    email: "aarav@example.com",
    phone: "+91 98765 43210",
    location: "Bengaluru",
    links: [
      linkedIn("aarav"),
      { label: "Github", url: "https://github.com/aarav" },
      { label: "Portfolio", url: "https://aarav.dev" },
    ],
  },
  [
    skills("Technical Skills", [
      ["Languages", ["Go", "TypeScript", "Python", "C++", "SQL"]],
      ["Frameworks", ["Node.js", "Express", "React", "Next.js", "gRPC"]],
      ["Data & Infra", ["PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes", "AWS"]],
      ["Tools", ["Git", "Linux", "Prometheus", "Grafana"]],
    ]),
    experience("Experience", [
      exp("Paylane", "Software Engineering Intern", "Bengaluru", "2025-05", "2025-07", [
        "Built the merchant payouts service in **Go**, handling 2M requests a day with p99 under 80 ms",
        "Cut report latency by 40% by rewriting **PostgreSQL** queries and adding composite indexes",
        "Added idempotency keys to payout APIs, removing duplicate transfers during retries",
        "Wrote integration tests with Testcontainers, raising coverage of the service from 52% to 81%",
      ]),
      exp("Cardwise", "Backend Intern", "Remote", "2024-12", "2025-02", [
        "Designed a **Kafka** consumer for card events with exactly-once processing and dead-letter handling",
        "Built an internal dashboard in **React** to trace failed transactions, used daily by 30 support agents",
        "Reduced Docker image size by 60% with multi-stage builds, speeding up CI deploys",
      ]),
    ]),
    projects("Projects", [
      project(
        "Typeset",
        ["TypeScript", "Express", "PostgreSQL"],
        [
          ["Live", "https://example.com"],
          ["Github", "https://github.com/aarav"],
        ],
        [
          "Resume builder that compiles LaTeX in an isolated container, with a live preview in under 2 seconds",
          "Implemented versioned documents with append-only snapshots and one-click restore",
        ],
      ),
      project(
        "RateLimiter",
        ["Go", "Redis"],
        [["Github", "https://github.com/aarav"]],
        [
          "Distributed sliding-window rate limiter in **Go** backed by Redis Lua scripts, 50k checks per second",
          "Published as an open-source library with 400+ GitHub stars",
        ],
      ),
      project(
        "CampusEats",
        ["Next.js", "Node.js", "MongoDB"],
        [["Live", "https://example.com"]],
        ["Food ordering app for a college canteen, serving 1,500 students with real-time order tracking"],
      ),
    ]),
    education("Education", [
      edu("Indian Institute of Technology, Delhi", {
        degree: "Bachelor of Technology",
        field: "Computer Science",
        score: "CGPA: 8.9",
        location: "New Delhi",
        start: "2022-07",
        end: "2026-05",
      }),
    ]),
    list("Achievements", [
      item("Codeforces Expert", "2025", "Max rating 1720"),
      item("Smart India Hackathon", "2024", "Winner, software edition"),
    ]),
    links("Profile Links", [
      ["LeetCode", "https://leetcode.com/aarav"],
      ["Codeforces", "https://codeforces.com/profile/aarav"],
    ]),
  ],
);

export const previewResumes: Record<string, ResumeContent> = {
  developer: aarav,
  jake: aarav,
  modern: aarav,
  sb2nov: aarav,

  banking: resume(
    {
      name: "Ananya Rao",
      email: "ananya.rao@example.com",
      phone: "+91 98200 45120",
      location: "Mumbai",
      links: [linkedIn("ananya-rao")],
    },
    [
      education("Education", [
        edu(
          "Indian Institute of Management Ahmedabad",
          {
            degree: "MBA (PGP)",
            field: "Finance",
            score: "CGPA: 3.62/4.33",
            location: "Ahmedabad",
            start: "2024",
            end: "2026",
          },
          ["Relevant coursework: Corporate Valuation, Mergers & Acquisitions, Financial Modelling, Private Equity"],
        ),
        edu(
          "Shri Ram College of Commerce, University of Delhi",
          { degree: "B.Com (Hons)", score: "92.4%", location: "New Delhi", start: "2019", end: "2022" },
          ["Ranked 3rd of 540 students; Merit scholarship for all three years"],
        ),
      ]),
      experience("Experience", [
        exp("Meridian Capital Advisors", "Summer Analyst, Mergers & Acquisitions", "Mumbai", "2025-05", "2025-07", [
          "Built a three-statement model and DCF for a ₹4,200 Cr sell-side mandate in specialty chemicals, used in the final pitch to the client",
          "Screened 60+ strategic and financial buyers and drafted teaser and buyer profiles, shortlisting 12 for outreach",
          "Prepared trading and precedent transaction comps across 25 listed peers, supporting a valuation range of 18x to 22x EV/EBITDA",
          "Coordinated a virtual data room of 900+ documents with legal and diligence advisors under a two-week deadline",
        ]),
        exp("Harbourline Partners", "Investment Banking Intern, Technology", "Bengaluru", "2024-12", "2025-01", [
          "Analysed unit economics of 8 consumer internet companies for a $45M Series C fundraise, highlighting contribution margin",
          "Drafted 15 pages of the information memorandum covering market sizing, competition and the company's growth plan",
        ]),
        exp("IIM Ahmedabad Finance Club", "Head of Equity Research", "Ahmedabad", "2024-06", "present", [
          "Lead a team of 6 publishing weekly initiating-coverage notes; two stock pitches won a regional research challenge",
        ]),
      ]),
      list("Certifications", [
        item("CFA Level II Candidate, CFA Institute", "Aug 2026"),
        item("Financial Modeling & Valuation Analyst (FMVA), Corporate Finance Institute", "2024"),
      ]),
      list("Leadership & Activities", [
        item("General Secretary, Students' Union, SRCC", "2021-2022", undefined, [
          "Managed a ₹38 lakh annual budget across 22 societies and led the college's largest fundraising drive",
        ]),
        item("National finalist, Inter-College Analytics Case Challenge", "2023"),
      ]),
      skills("Skills & Interests", [
        ["Technical", ["Excel (VBA)", "PowerPoint", "Capital IQ", "Bloomberg", "Python (pandas)"]],
        ["Languages", ["English", "Hindi", "Telugu", "French (B1)"]],
        ["Interests", ["Carnatic violin", "Half-marathons", "Chess (FIDE 1810)"]],
      ]),
    ],
  ),

  campus: resume(
    {
      name: "Aarav Sharma",
      headline: "B.Tech, Computer Science and Engineering, IIT Delhi",
      email: "aarav@example.com",
      phone: "+91 98765 43210",
      location: "New Delhi",
      links: [
        linkedIn("aarav"),
        { label: "Github", url: "https://github.com/aarav" },
        { label: "Codeforces", url: "https://codeforces.com/profile/aarav" },
      ],
    },
    [
      education("Education", [
        edu("Indian Institute of Technology Delhi", {
          degree: "B.Tech",
          field: "Computer Science and Engineering",
          score: "8.9/10",
          start: "2022",
          end: "2026",
        }),
        edu("Delhi Public School, R. K. Puram", { degree: "Class XII (CBSE)", score: "96.4%", end: "2022" }),
        edu("Delhi Public School, R. K. Puram", { degree: "Class X (CBSE)", score: "97.2%", end: "2020" }),
      ]),
      experience("Internships", [
        exp("Paylane", "SDE Intern", "Bengaluru", "2025-05", "2025-07", [
          "Cut p99 latency of the payouts API by 40% using Go and Redis caching",
          "Added idempotency keys to payout APIs, removing duplicate transfers during retries",
        ]),
      ]),
      projects("Projects", [
        project(
          "Distributed Key-Value Store",
          ["Go", "Raft"],
          [["Github", "https://github.com/aarav"]],
          [
            "Raft-replicated store passing a full suite of linearizability tests",
            "Snapshotting and log compaction keep recovery under 2 seconds",
          ],
          { start: "2025-01", end: "2025-04" },
        ),
        project(
          "CampusEats",
          ["Next.js", "Node.js", "MongoDB"],
          [["Live", "https://example.com"]],
          ["Food ordering app for the college canteen, serving 1,500 students"],
          { start: "2024-08", end: "2024-11" },
        ),
      ]),
      list("Achievements", [
        item("JEE Advanced", "2022", "All India Rank 412 among 1.8 lakh candidates"),
        item("Codeforces Expert", "2025", "Max rating 1720"),
        item("Smart India Hackathon", "2024", "Winner, software edition"),
      ]),
      list("Positions of Responsibility", [
        item("Coordinator, Devclub IIT Delhi", "2024 - 2025", undefined, [
          "Led a team of 12 running weekly workshops for 300+ students",
        ]),
      ]),
      skills("Technical Skills", [
        ["Languages", ["C++", "Go", "Python", "TypeScript"]],
        ["Tools", ["Git", "Docker", "PostgreSQL", "Linux"]],
      ]),
      summary(
        "Relevant Coursework",
        "Data Structures, Algorithms, Operating Systems, Computer Networks, DBMS, Machine Learning",
      ),
    ],
  ),

  consulting: resume(
    {
      name: "Kabir Malhotra",
      email: "kabir.malhotra@example.com",
      phone: "+91 98111 20304",
      location: "Gurugram",
      links: [linkedIn("kabir-malhotra")],
    },
    [
      education("Education", [
        edu(
          "Indian School of Business",
          {
            degree: "PGP in Management",
            field: "Dean's List, top 10%",
            location: "Hyderabad",
            start: "2025",
            end: "2026",
          },
          ["Elected President, Consulting Club (900 members); led case prep for 140 students"],
        ),
        edu(
          "Indian Institute of Technology Bombay",
          {
            degree: "B.Tech",
            field: "Chemical Engineering",
            score: "CPI: 8.7/10",
            location: "Mumbai",
            start: "2017",
            end: "2021",
          },
          ["Institute Silver Medal for best undergraduate thesis"],
        ),
      ]),
      experience("Professional Experience", [
        exp("Alder & Stone Consulting", "Summer Associate", "New Delhi", "2025-04", "2025-06", [
          "Sized a ₹12,000 Cr cold-chain market for a PE client across 9 states, shaping a go/no-go recommendation adopted by the investment committee",
          "Interviewed 35 distributors and built a margin waterfall that revealed 4 points of leakage in last-mile delivery",
        ]),
        exp("Narmada Process Industries", "Senior Process Engineer", "Jamnagar", "2021-07", "2025-03", [
          "Led a 7-member team to debottleneck a 1.2 MTPA unit, raising throughput 6% and adding ₹85 Cr in annual EBITDA",
          "Designed an energy-saving programme across 3 plants that cut steam use 11%, now the site-wide standard",
          "Presented quarterly reliability reviews to the plant head and trained 20 new engineers",
        ]),
      ]),
      list("Leadership & Extracurriculars", [
        item("Founder, Project Saksham", "2019 - 2023", "STEM tutoring for 300 government school students"),
        item("Winner, ISB Strategy Case Competition", "2025", "1st of 220 teams"),
      ]),
      skills("Additional Information", [
        ["Skills", ["Excel modelling", "Alteryx", "Tableau", "SQL"]],
        ["Interests", ["Long-distance cycling", "Hindustani vocals", "Quizzing"]],
      ]),
    ],
  ),

  "data-analyst": resume(
    {
      name: "Rohan Mehta",
      headline: "Data Scientist",
      email: "rohan@example.com",
      phone: "+91 98765 43210",
      location: "Mumbai",
      links: [
        linkedIn("rohan"),
        { label: "Github", url: "https://github.com/rohan" },
        { label: "Kaggle", url: "https://kaggle.com/rohan" },
      ],
    },
    [
      skills("Skills", [
        ["Languages", ["Python", "SQL", "R"]],
        ["Modelling", ["scikit-learn", "XGBoost", "statsmodels", "Prophet", "A/B testing"]],
        ["Data & BI", ["BigQuery", "dbt", "Airflow", "Tableau", "Looker"]],
      ]),
      experience("Experience", [
        exp("BasketRun", "Data Scientist", "Bengaluru", "2023-07", "present", [
          "Built a delivery-time model (XGBoost) that cut ETA error by 22% across 600 cities",
          "Designed the experiment platform's CUPED variance reduction, shortening A/B tests from 14 to 9 days",
          "Automated weekly business reviews in dbt and Looker, saving analysts 30 hours a week",
        ]),
        exp("Tarang Analytics", "Decision Scientist", "Bengaluru", "2021-07", "2023-06", [
          "Forecast demand for a US retailer's 4,000 SKUs with hierarchical Prophet models, MAPE 8.4%",
          "Presented churn drivers to the client's VP of Marketing, leading to a ₹2 crore retention budget",
        ]),
      ]),
      projects("Projects", [
        project(
          "UPI Fraud Detection",
          ["Python", "LightGBM", "SHAP"],
          [["Github", "https://github.com/rohan"]],
          ["Top 3% on a 1.2M-transaction Kaggle dataset; explained flags to reviewers with SHAP values"],
        ),
      ]),
      education("Education", [
        edu("IIT Bombay", {
          degree: "B.Tech",
          field: "Mechanical Engineering, Minor in Statistics",
          score: "CGPA: 8.4",
          location: "Mumbai",
          start: "2017",
          end: "2021",
        }),
      ]),
      list("Certifications", [
        item("Google Cloud Professional Data Engineer", "2024"),
        item("dbt Analytics Engineering", "2023"),
      ]),
    ],
  ),

  designer: resume(
    {
      name: "Meera Kapoor",
      headline: "Product Designer",
      email: "meera@example.com",
      phone: "+91 98765 43210",
      location: "Pune",
      links: [
        { label: "Portfolio", url: "https://meerakapoor.design" },
        { label: "Dribbble", url: "https://dribbble.com/meera" },
        linkedIn("meera"),
      ],
    },
    [
      skills("Skills", [
        ["Design", ["Interaction design", "Design systems", "Prototyping", "Usability testing"]],
        ["Tools", ["Figma", "ProtoPie", "Framer", "Adobe Illustrator"]],
      ]),
      education("Education", [
        edu("National Institute of Design", {
          degree: "B.Des",
          field: "Communication Design",
          location: "Ahmedabad",
          start: "2017",
          end: "2021",
        }),
      ]),
      list("Recognition", [item("Kyoorius Design Award", "2024", "Digital, Blue Elephant")]),
      experience("Experience", [
        exp("Zestly", "Product Designer II", "Bengaluru", "2023-02", "present", [
          "Redesigned bill payments end to end; task completion rose from 71% to 89% in usability tests",
          "Built 60+ components for the Figma design system now used by 9 product squads",
          "Ran 25 user interviews to shape the rewards roadmap, presented to the CPO",
        ]),
        exp("TableHop", "UI/UX Designer", "Gurugram", "2021-06", "2023-01", [
          "Shipped the restaurant partner app's new onboarding, cutting support tickets by 35%",
          "Prototyped micro-interactions in ProtoPie for the order tracking screen",
        ]),
      ]),
      projects("Selected Work", [
        project(
          "Bus Pass for Pune",
          ["Case study"],
          [],
          ["Concept app for city bus commuters; research with 40 riders, accessible to WCAG 2.2 AA"],
        ),
        project(
          "Type Specimen Tool",
          ["Figma plugin"],
          [["Plugin", "https://example.com"]],
          ["Figma plugin with 12k installs that generates type scale specimens"],
        ),
      ]),
    ],
  ),

  executive: resume(
    {
      name: "Vikram Iyer",
      headline: "Chief Financial Officer | Listed Companies | M&A and Capital Markets",
      email: "vikram.iyer@example.com",
      phone: "+91 98200 99887",
      location: "Mumbai",
      links: [linkedIn("vikram-iyer")],
    },
    [
      summary(
        "Executive Summary",
        "Finance leader with 22 years in consumer and industrial businesses, including 9 years as CFO of NSE-listed companies. Raised ₹6,500 Cr across IPO, QIP and debt markets, led 11 acquisitions, and built finance teams of 180 people across India and Southeast Asia.",
      ),
      skills("Core Competencies", [
        [
          "",
          [
            "P&L Leadership",
            "Capital Markets & IPOs",
            "Mergers & Acquisitions",
            "Investor Relations",
            "Treasury & Risk",
            "Board Governance",
            "Cost Transformation",
            "ERP Transformation",
            "Tax Strategy",
            "Post-Merger Integration",
            "Working Capital",
            "Team Building",
          ],
        ],
      ]),
      experience("Career History", [
        exp("Suryan Electricals Ltd", "Chief Financial Officer", "Noida", "2019-04", "present", [
          "Lead finance, treasury, tax, investor relations and IT for a ₹21,000 Cr consumer electricals company, reporting to the Chairman and Board",
          "Delivered 340 bps of EBITDA margin expansion through a cost programme across 14 plants",
          "Raised ₹2,000 Cr through a QIP at a 4% discount, the tightest pricing in the sector that year",
        ]),
        exp("Suryan Electricals Ltd", "Vice President, Corporate Finance", "Noida", "2016-01", "2019-03", [
          "Led the ₹1,600 Cr acquisition and integration of a consumer durables brand, achieving synergy targets one year early",
        ]),
        exp("Kalyani Coatings Ltd", "Head of Financial Planning & Analysis", "Mumbai", "2010-06", "2015-12", [
          "Built the group's first rolling forecast and capital allocation framework across 15 countries",
          "Managed due diligence on 3 international acquisitions in Southeast Asia and the Middle East",
        ]),
        exp("Mehta Rao & Associates", "Manager, Transaction Services", "Mumbai", "2003-07", "2010-05", [
          "Led buy-side financial due diligence on 40+ deals for private equity and strategic clients",
        ]),
      ]),
      list("Board & Advisory Roles", [
        item("Independent Director, Audit Committee Chair", "2022 - present", "Urban Cart Retail Ltd"),
        item("Advisory Board Member", "2020 - present", "National Forum on Corporate Governance"),
      ]),
      education("Education", [
        edu("Indian Institute of Management Bangalore", {
          degree: "PGDM",
          field: "Finance",
          location: "Bengaluru",
          start: "2001",
          end: "2003",
        }),
        edu("Institute of Chartered Accountants of India", { degree: "Chartered Accountant", end: "2000" }),
      ]),
    ],
  ),

  finance: resume(
    {
      name: "Rohan Mehta, ACA",
      headline: "Chartered Accountant | CFA Level III Candidate",
      email: "rohan.mehta@example.com",
      phone: "+91 99870 11223",
      location: "Pune",
      links: [linkedIn("rohan-mehta")],
    },
    [
      summary(
        "Professional Summary",
        "Chartered Accountant with 4 years of statutory audit and FP&A experience across manufacturing and fintech. Led Ind AS transitions and month-end close for a ₹1,800 Cr group.",
      ),
      list("Certifications", [
        item("Chartered Accountant (ACA)", "2021", "ICAI, All India Rank 27"),
        item("CFA Level III Candidate", "2026", "CFA Institute"),
        item("Certified Internal Auditor (CIA)", "2023", "The IIA"),
      ]),
      experience("Professional Experience", [
        exp("Sahyadri Finance", "Manager, Financial Planning & Analysis", "Pune", "2023-04", "present", [
          "Own the annual operating plan and rolling forecast for a ₹1,800 Cr lending business, presenting monthly variance analysis to the CFO",
          "Cut month-end close from 9 to 5 working days by automating 40+ reconciliations in Power Query",
          "Built a driver-based cost model that identified ₹22 Cr of savings in collections and branch operations",
        ]),
        exp("Shah Kelkar & Co LLP", "Audit Senior, Assurance", "Mumbai", "2021-02", "2023-03", [
          "Led statutory audits of 6 listed manufacturing clients with revenues up to ₹9,000 Cr, managing teams of 4 associates",
          "Reviewed Ind AS 115 and Ind AS 116 adoption, raising 18 control observations accepted by audit committees",
          "Tested IT general controls and SOX-style internal financial controls for a US-listed subsidiary",
        ]),
        exp("Shah Kelkar & Co LLP", "Articled Assistant", "Mumbai", "2018-01", "2020-12", [
          "Performed substantive testing on revenue, inventory and fixed assets for 12 audit engagements",
        ]),
      ]),
      education("Education", [
        edu("Institute of Chartered Accountants of India", {
          degree: "Chartered Accountancy",
          score: "AIR 27",
          end: "2021",
        }),
        edu("Brihan Maharashtra College of Commerce", {
          degree: "B.Com",
          field: "Accounting & Finance",
          score: "88%",
          location: "Pune",
          start: "2015",
          end: "2018",
        }),
      ]),
      skills("Skills", [
        ["Accounting", ["Ind AS", "IFRS", "US GAAP", "Consolidation", "Transfer pricing"]],
        ["Tools", ["SAP S/4HANA", "Oracle NetSuite", "Excel", "Power BI", "Power Query", "Tally Prime"]],
      ]),
    ],
  ),

  marketing: resume(
    {
      name: "Meera Kapoor",
      headline: "Growth marketer who scaled D2C brands from launch to ₹100 Cr ARR",
      email: "meera.kapoor@example.com",
      phone: "+91 98450 67890",
      location: "Bengaluru",
      links: [linkedIn("meera-kapoor"), { label: "Portfolio", url: "https://example.com" }],
    },
    [
      summary(
        "Summary",
        "Performance and brand marketer with 6 years across D2C and fintech. I pair creative storytelling with rigorous testing, and I have built and led teams of up to 9.",
      ),
      experience("Experience", [
        exp("Petal & Leaf", "Senior Growth Marketing Manager", "Gurugram", "2023-01", "present", [
          "Grew new-customer revenue 3.1x in 18 months by rebuilding the Meta and Google funnel around creator-led video",
          "Cut blended CAC 27% with a weekly creative testing cadence of 40+ ad variants",
          "Launched a WhatsApp retention programme reaching 2.4M subscribers at a 31% repeat-purchase rate",
        ]),
        exp("Zestly", "Brand Marketing Manager", "Bengaluru", "2020-06", "2022-12", [
          "Co-led a national cricket campaign seen by 300M viewers, lifting app installs 4x during the tournament",
          "Managed a ₹40 Cr annual media budget across TV, OTT and digital with agency partners",
        ]),
        exp("Everglow Consumer", "Associate Brand Manager", "Mumbai", "2019-07", "2020-05", [
          "Relaunched a skincare SKU in 4 South Indian states, gaining 1.8 points of market share",
        ]),
      ]),
      projects("Selected Campaigns", [
        project(
          "#NoFilterSkin",
          ["Instagram", "YouTube Shorts", "Influencers"],
          [["Case study", "https://example.com"]],
          ["Creator-led campaign with 120 micro-influencers: 48M views, regional marketing award 2024"],
          { start: "2024-03", end: "2024-05" },
        ),
      ]),
      skills("Skills", [
        ["Channels", ["Meta Ads", "Google Ads", "Influencer marketing", "SEO", "CRM and WhatsApp"]],
        ["Tools", ["GA4", "Mixpanel", "MoEngage", "Looker Studio", "Figma"]],
      ]),
      education("Education", [
        edu("MICA, Ahmedabad", {
          degree: "PGDM-C",
          field: "Marketing Communications",
          score: "CGPA: 3.4/4",
          start: "2017",
          end: "2019",
        }),
      ]),
    ],
  ),

  "ml-research": resume(
    {
      name: "Ananya Iyer",
      headline: "Machine Learning Engineer, NLP and Efficient Inference",
      email: "ananya@example.com",
      phone: "+91 98765 43210",
      location: "Bengaluru",
      links: [
        { label: "Google Scholar", url: "https://scholar.google.com" },
        linkedIn("ananya"),
        { label: "Github", url: "https://github.com/ananya" },
      ],
    },
    [
      education("Education", [
        edu(
          "Indian Institute of Science",
          {
            degree: "M.Tech (Research)",
            field: "Computational and Data Sciences",
            score: "CGPA: 9.1/10",
            location: "Bengaluru",
            start: "2022",
            end: "2024",
          },
          ["Thesis: Low-rank adapters for multilingual speech recognition, advised by Prof. R. Menon"],
        ),
        edu("NIT Trichy", {
          degree: "B.Tech",
          field: "Electronics and Communication",
          score: "CGPA: 8.7/10",
          location: "Tiruchirappalli",
          start: "2018",
          end: "2022",
        }),
      ]),
      experience("Experience", [
        exp("Indus Language Labs", "ML Engineer", "Bengaluru", "2024-07", "present", [
          "Trained a 2B parameter Indic language model on 400B tokens across 64 H100 GPUs with FSDP and bf16",
          "Cut serving cost by 3.1x with speculative decoding and 4-bit AWQ quantization at equal accuracy",
          "Built an evaluation harness covering 11 Indian languages, now the gate for every model release",
        ]),
        exp("Bharat Speech Research", "Research Intern", "Bengaluru", "2023-05", "2023-08", [
          "Proposed a contrastive pretraining objective that improved low-resource ASR WER by 12% relative",
          "Released the code and a 2,000-hour benchmark, cited in 40+ follow-up papers",
        ]),
      ]),
      list("Publications", [
        item(
          "Adapters All the Way Down: Parameter-Efficient Multilingual ASR",
          undefined,
          "A. Iyer, R. Menon. Interspeech. 2024",
        ),
        item(
          "Speculative Decoding for Low-Resource Languages",
          undefined,
          "A. Iyer, K. Rao, P. Shah. EMNLP Findings. 2025",
        ),
        item(
          "IndicBench: A Benchmark for Instruction Following in 11 Languages",
          undefined,
          "K. Rao, A. Iyer et al. NeurIPS Datasets and Benchmarks. 2025",
        ),
      ]),
      projects("Research Projects", [
        project(
          "tinyserve",
          ["PyTorch", "Triton", "CUDA"],
          [["Github", "https://github.com/ananya"]],
          ["Paged-attention inference server in 3k lines of Python and Triton, 1.8k GitHub stars"],
          { start: "2025-01", end: "present" },
        ),
      ]),
      skills("Skills", [
        ["ML", ["PyTorch", "JAX", "Hugging Face", "DeepSpeed", "vLLM"]],
        ["Languages", ["Python", "C++", "CUDA", "SQL"]],
      ]),
      list("Awards", [
        item("National PhD Fellowship finalist", "2024"),
        item("KVPY Fellow - Department of Science and Technology", "2018"),
      ]),
    ],
  ),

  "product-manager": resume(
    {
      name: "Kavya Reddy",
      headline: "Product Manager, Payments and Growth",
      email: "kavya@example.com",
      phone: "+91 98765 43210",
      location: "Bengaluru",
      links: [linkedIn("kavya"), { label: "Writing", url: "https://example.com" }],
    },
    [
      experience("Experience", [
        exp("Paylane", "Senior Product Manager", "Bengaluru", "2023-04", "present", [
          "Own instant payments for 40M monthly users; launched offline payments that grew small-ticket volume by 31%",
          "Led a team of 14 engineers and 2 designers through 6 releases a quarter with zero P0 incidents",
          "Cut onboarding drop-off from 38% to 21% by rebuilding KYC as a 3-step flow, adding ₹18 crore in annual GMV",
        ]),
        exp("Cardwise", "Product Manager", "Bengaluru", "2021-01", "2023-03", [
          "Launched payment links for SMBs, reaching 120k merchants and ₹900 crore TPV in the first year",
          "Defined the north-star metric and dashboard used by leadership in every monthly business review",
        ]),
        exp("Bazaarly", "Associate Product Manager", "Bengaluru", "2019-07", "2020-12", [
          "Ran 40+ A/B tests on search ranking, lifting add-to-cart rate by 4.2%",
        ]),
      ]),
      skills("Skills", [
        ["Product", ["Roadmapping", "PRDs", "Experimentation", "Pricing", "User research"]],
        ["Tools", ["SQL", "Amplitude", "Mixpanel", "Figma", "Jira"]],
      ]),
      education("Education", [
        edu("IIM Ahmedabad", { degree: "MBA", location: "Ahmedabad", start: "2017", end: "2019" }),
        edu("BITS Pilani", {
          degree: "B.E.",
          field: "Computer Science",
          location: "Pilani",
          start: "2013",
          end: "2017",
        }),
      ]),
      list("Talks and Writing", [item("Designing payments for the next 300M users - Product Folks Summit", "2025")]),
    ],
  ),
};
