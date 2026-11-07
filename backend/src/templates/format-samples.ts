import { type ResumeContent, resumeContentSchema } from "../schemas/resume-content.js";

// Sample resumes for the /resume-format/<slug> pages, rendered into frontend/public/formats by
// scripts/render-template-previews.ts. Made-up people at made-up companies and colleges, like preview-resumes.ts.
// The slug and templateId must match frontend/src/lib/format-pages.ts.

let nextId = 0;
const id = () => `f${++nextId}`;
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

const resume = (basics: object, sections: unknown[]): ResumeContent =>
  resumeContentSchema.parse({ basics: { links: [], ...basics }, sections });

const linkedIn = (slug: string) => ({ label: "LinkedIn", url: `https://linkedin.com/in/${slug}` });
const github = (slug: string) => ({ label: "Github", url: `https://github.com/${slug}` });

export const formatSamples: { slug: string; templateId: string; content: ResumeContent }[] = [
  {
    slug: "software-engineer-fresher",
    templateId: "jake",
    content: resume(
      {
        name: "Ishaan Verma",
        email: "ishaan.verma@example.com",
        phone: "+91 98220 31457",
        location: "Pune",
        links: [linkedIn("ishaan-verma"), github("ishaanv")],
      },
      [
        education("Education", [
          edu(
            "Western Ghats Institute of Technology",
            {
              degree: "B.Tech",
              field: "Computer Engineering",
              score: "CGPA: 8.4/10",
              location: "Pune",
              start: "2022-08",
              end: "2026-05",
            },
            ["Coursework: Data Structures, Operating Systems, DBMS, Computer Networks, System Design basics"],
          ),
        ]),
        experience("Internship", [
          exp("Quillstack", "Software Engineering Intern", "Pune", "2025-05", "2025-07", [
            "Built REST endpoints in **Node.js** and **PostgreSQL** for an invoice module used by 300 small businesses",
            "Wrote a nightly job that flags duplicate invoices, catching about 40 a week that support used to find by hand",
            "Added Jest tests to the billing service, taking coverage from 48% to 72% before a major release",
          ]),
        ]),
        projects("Projects", [
          project(
            "HostelMess",
            ["React", "Express", "MongoDB"],
            [
              ["Live", "https://example.com"],
              ["Github", "https://github.com/ishaanv"],
            ],
            [
              "Meal booking app for a 400-student hostel; cut food wasted per day from about 30 kg to 18 kg in the first month",
              "Added JWT login and role-based access for students, mess staff and the warden",
            ],
          ),
          project(
            "Mini Redis",
            ["Go"],
            [["Github", "https://github.com/ishaanv"]],
            [
              "In-memory key-value store in **Go** that speaks the Redis protocol, with TTLs and append-only file persistence",
              "Handles about 60k GET/SET operations a second on a laptop, measured with redis-benchmark",
            ],
          ),
          project(
            "PlacementPrep Tracker",
            ["Python", "Flask", "SQLite"],
            [["Github", "https://github.com/ishaanv"]],
            ["Tracks DSA practice by topic and suggests weak areas; used by 70 juniors in the coding club"],
          ),
        ]),
        skills("Technical Skills", [
          ["Languages", ["Java", "Python", "JavaScript", "Go", "SQL"]],
          ["Web and backend", ["React", "Node.js", "Express", "REST APIs", "Flask"]],
          ["Databases and tools", ["PostgreSQL", "MongoDB", "Git", "Docker", "Linux", "Postman"]],
          ["Core CS", ["Data Structures and Algorithms", "OOP", "DBMS", "Operating Systems"]],
        ]),
        list("Achievements", [
          item("LeetCode: 450+ problems solved", "2025", "Contest rating 1780"),
          item("College hackathon, first place", "2024", "Team of 4, 36-hour build"),
          item("Coding club, core member", "2023 to 2025", "Ran 12 weekly DSA sessions for second-years"),
        ]),
      ],
    ),
  },
  {
    slug: "cloud-devops-engineer",
    templateId: "developer",
    content: resume(
      {
        name: "Karthik Subramanian",
        headline: "DevOps Engineer, AWS and Kubernetes",
        email: "karthik.s@example.com",
        phone: "+91 99400 27815",
        location: "Chennai",
        links: [linkedIn("karthik-subramanian"), github("karthiks")],
      },
      [
        summary(
          "Summary",
          "DevOps engineer with 3.5 years running AWS workloads, Kubernetes clusters and CI/CD for product teams. Day to day: Terraform, EKS, GitHub Actions and on-call for a 40-service platform.",
        ),
        skills("Technical Skills", [
          ["Cloud", ["AWS (EC2, EKS, RDS, S3, IAM, VPC, CloudFront)", "basic Azure"]],
          ["Containers and IaC", ["Docker", "Kubernetes", "Helm", "Terraform", "Ansible"]],
          ["CI/CD", ["GitHub Actions", "Jenkins", "Argo CD"]],
          ["Monitoring", ["Prometheus", "Grafana", "Loki", "CloudWatch", "PagerDuty"]],
          ["Scripting", ["Bash", "Python", "Linux administration"]],
        ]),
        experience("Experience", [
          exp("Tidepool Commerce", "DevOps Engineer", "Chennai", "2024-01", "present", [
            "Moved 28 services from EC2 to **EKS** with Helm charts, cutting monthly compute spend by about 22%",
            "Wrote **Terraform** modules for VPCs, RDS and EKS used by 5 teams; a new environment now takes 40 minutes, not 2 days",
            "Set up Argo CD for GitOps deploys; release frequency went from weekly to 6 or 7 times a day",
            "Built Prometheus alerts and Grafana dashboards per service, bringing mean time to recovery from about 50 to 20 minutes",
          ]),
          exp("Corvia IT Services", "Associate Systems Engineer", "Chennai", "2022-07", "2023-12", [
            "Ran Jenkins pipelines and Linux servers for 3 client projects, handling about 15 deploy and access tickets a week",
            "Scripted patching and log rotation in **Ansible** and Bash, freeing about 6 hours of manual work a week",
            "Containerised two legacy Java apps with Docker, removing environment drift between QA and production",
          ]),
        ]),
        projects("Projects", [
          project(
            "Homelab K8s",
            ["k3s", "Terraform", "Argo CD"],
            [["Github", "https://github.com/karthiks"]],
            ["Three-node k3s cluster with GitOps, sealed secrets and automated TLS, documented as a public runbook"],
          ),
          project(
            "Cost Watch",
            ["Python", "AWS Lambda", "Slack API"],
            [["Github", "https://github.com/karthiks"]],
            [
              "Daily Lambda that posts idle EBS volumes and untagged instances to Slack; found about $900 a month of waste",
            ],
          ),
        ]),
        list("Certifications", [
          item("AWS Certified Solutions Architect, Associate", "2024"),
          item("Certified Kubernetes Administrator (CKA)", "2025"),
          item("HashiCorp Certified: Terraform Associate", "2023"),
        ]),
        education("Education", [
          edu("Coromandel College of Engineering", {
            degree: "B.E.",
            field: "Electronics and Communication",
            score: "CGPA: 7.9/10",
            location: "Chennai",
            start: "2018-08",
            end: "2022-05",
          }),
        ]),
      ],
    ),
  },
  {
    slug: "mlops-engineer",
    templateId: "sb2nov",
    content: resume(
      {
        name: "Sneha Pillai",
        headline: "ML Engineer, MLOps",
        email: "sneha.pillai@example.com",
        phone: "+91 97410 58320",
        location: "Bengaluru",
        links: [linkedIn("sneha-pillai"), github("snehapillai")],
      },
      [
        summary(
          "Summary",
          "ML engineer with 3 years taking models from notebooks to production: training pipelines, model serving, monitoring and retraining on AWS and Kubernetes.",
        ),
        experience("Experience", [
          {
            ...exp("Fernleaf Lending", "ML Engineer", "Bengaluru", "2024-04", "present", [
              "Built the training pipeline for the credit risk model in **Kubeflow** and **MLflow**, so a retrain runs end to end in 3 hours instead of 2 days of manual steps",
              "Served 4 models behind **FastAPI** on EKS with p95 latency of 45 ms at about 1,200 requests a minute",
              "Added drift checks with Evidently on daily feature data; two alerts in 2025 led to retrains before approval rates moved",
              "Set up a feature store (Feast) shared by 3 models, removing training and serving skew on 60+ features",
            ]),
          },
          exp("Brightloop Analytics", "Data Scientist", "Kochi", "2022-07", "2024-03", [
            "Trained a demand forecasting model (LightGBM) for 1,800 SKUs, cutting forecast error (MAPE) from 24% to 17%",
            "Packaged models as Docker images with CI tests, moving the team off hand-run notebooks for weekly scoring",
          ]),
        ]),
        skills("Technical Skills", [
          ["ML and data", ["Python", "scikit-learn", "PyTorch", "LightGBM", "pandas", "SQL", "PySpark"]],
          ["MLOps", ["MLflow", "Kubeflow Pipelines", "Feast", "Evidently", "DVC", "Airflow"]],
          ["Serving and infra", ["FastAPI", "Docker", "Kubernetes", "AWS (S3, EKS, SageMaker)", "Terraform"]],
          ["LLM work", ["vLLM", "LangChain", "RAG evaluation", "prompt versioning"]],
        ]),
        projects("Projects", [
          project(
            "Docs QA Service",
            ["vLLM", "pgvector", "FastAPI"],
            [["Github", "https://github.com/snehapillai"]],
            [
              "Self-hosted RAG service over 3,000 internal policy pages with an eval set of 150 questions; answer accuracy rose from 62% to 81% after chunking and reranking changes",
            ],
          ),
          project(
            "Model Registry Bot",
            ["Python", "MLflow", "GitHub Actions"],
            [["Github", "https://github.com/snehapillai"]],
            [
              "Blocks a model promotion in CI unless it beats the current model on a held-out set and passes bias checks",
            ],
          ),
        ]),
        education("Education", [
          edu("Vembanad Institute of Technology", {
            degree: "B.Tech",
            field: "Computer Science",
            score: "CGPA: 8.6/10",
            location: "Kochi",
            start: "2018-08",
            end: "2022-06",
          }),
        ]),
        list("Certifications and Writing", [
          item("AWS Certified Machine Learning Engineer, Associate", "2025"),
          item("Blog: 6 posts on model monitoring in production", "2024 to 2025"),
        ]),
      ],
    ),
  },
  {
    slug: "data-analyst",
    templateId: "data-analyst",
    content: resume(
      {
        name: "Aditi Joshi",
        headline: "Data Analyst",
        email: "aditi.joshi@example.com",
        phone: "+91 90040 61273",
        location: "Hyderabad",
        links: [linkedIn("aditi-joshi"), { label: "Portfolio", url: "https://aditijoshi.example.com" }],
      },
      [
        summary(
          "Summary",
          "Data analyst with 2.5 years in retail and e-commerce analytics. I write SQL against large order tables, build Power BI dashboards that managers use every week, and turn questions into short written recommendations.",
        ),
        skills("Skills", [
          ["Querying", ["SQL (joins, window functions, CTEs)", "BigQuery", "PostgreSQL"]],
          ["Analysis", ["Python (pandas, NumPy)", "Excel (pivot tables, XLOOKUP, Power Query)"]],
          ["BI and reporting", ["Power BI (DAX)", "Looker Studio", "Tableau"]],
          ["Statistics", ["A/B testing", "cohort and funnel analysis", "regression basics"]],
        ]),
        experience("Experience", [
          exp("Cartnest", "Data Analyst", "Hyderabad", "2024-02", "present", [
            "Built a Power BI sales dashboard on 12M order rows that 35 category managers use weekly, replacing a 5-hour Excel report",
            "Analysed checkout drop-off with funnel and cohort queries; the fix to the address step lifted completed checkouts by 3.1%",
            "Ran the analysis for 9 A/B tests on pricing and banners, writing a one-page readout for each",
            "Wrote SQL data quality checks in BigQuery that catch about 20 bad rows a day before they reach reports",
          ]),
          exp("Sunfield Retail", "Junior Analyst", "Hyderabad", "2023-06", "2024-01", [
            "Automated store-level stock reports in Python, saving the ops team about 8 hours a week",
            "Flagged 140 slow-moving SKUs across 22 stores, which fed into a clearance plan for the next quarter",
          ]),
        ]),
        projects("Projects", [
          project(
            "City Rentals Analysis",
            ["Python", "pandas", "Tableau"],
            [["Dashboard", "https://aditijoshi.example.com"]],
            [
              "Cleaned 40k public rental listings and showed how rent per sq ft changes with metro distance in 6 cities",
            ],
          ),
        ]),
        education("Education", [
          edu("Hussain Sagar College of Science and Commerce", {
            degree: "B.Sc.",
            field: "Statistics",
            score: "CGPA: 8.2/10",
            location: "Hyderabad",
            start: "2020",
            end: "2023",
          }),
        ]),
        list("Certifications", [
          item("Microsoft Certified: Power BI Data Analyst (PL-300)", "2024"),
          item("Google Data Analytics Certificate", "2023"),
        ]),
      ],
    ),
  },
  {
    slug: "mba-fresher",
    templateId: "consulting",
    content: resume(
      {
        name: "Tanvi Agarwal",
        headline: "MBA (Marketing), 2026",
        email: "tanvi.agarwal@example.com",
        phone: "+91 98190 44726",
        location: "Mumbai",
        links: [linkedIn("tanvi-agarwal")],
      },
      [
        education("Education", [
          edu(
            "Konkan School of Management",
            { degree: "MBA", field: "Marketing", score: "CGPA: 3.4/4", location: "Mumbai", start: "2024", end: "2026" },
            ["Coursework: Consumer Behaviour, Brand Management, Marketing Analytics, Sales and Distribution"],
          ),
          edu("Ravindra College of Commerce", {
            degree: "B.Com",
            score: "84%",
            location: "Jaipur",
            start: "2019",
            end: "2022",
          }),
        ]),
        experience("Experience", [
          exp("Greenbowl Foods", "Summer Intern, Brand Marketing", "Mumbai", "2025-04", "2025-06", [
            "Ran a consumer survey of 420 buyers across 3 cities for a new millet snack range and presented pack and price options to the brand head",
            "Audited 60 retail outlets in Pune for shelf share; the recommended planogram was trialled in 15 stores",
            "Drafted the launch plan for Instagram and quick-commerce listings, with a ₹6 lakh test budget",
          ]),
          exp("Ledgerway Accounting Services", "Accounts Associate", "Jaipur", "2022-07", "2024-05", [
            "Handled GST filings and reconciliations for 25 small business clients",
            "Moved monthly client reports from email to a shared Excel dashboard, cutting follow-up calls by about half",
          ]),
        ]),
        projects("Live Projects", [
          project(
            "Distribution study for a regional dairy",
            [],
            [],
            [
              "Mapped 3 distributor routes and found 18% of outlets were visited less than twice a month; proposed a revised beat plan",
            ],
          ),
        ]),
        list("Positions of Responsibility", [
          item("Marketing Club, Coordinator", "2024 to 2025", "Ran 4 case competitions with 300+ entries"),
          item("Placement Committee, Member", "2025", "Handled communication with 30 visiting companies"),
        ]),
        list("Achievements", [
          item("Brand case competition, national finalist", "2025", "Top 8 of 260 teams"),
          item("Google Ads Search Certification", "2025"),
        ]),
        skills("Skills", [
          ["Marketing", ["Market research", "brand plans", "Google Ads", "Meta Ads Manager"]],
          ["Tools", ["Excel", "PowerPoint", "Google Analytics 4", "SPSS"]],
          ["Languages", ["English", "Hindi", "Marathi (conversational)"]],
        ]),
      ],
    ),
  },
  {
    slug: "bcom-accountant",
    templateId: "finance",
    content: resume(
      {
        name: "Rahul Bansal",
        headline: "Accounts Executive, B.Com",
        email: "rahul.bansal@example.com",
        phone: "+91 98110 72364",
        location: "New Delhi",
        links: [linkedIn("rahul-bansal")],
      },
      [
        summary(
          "Summary",
          "Accounts executive with 2 years in bookkeeping, GST and TDS compliance and month-end closing for trading and service businesses. Comfortable in Tally Prime, Zoho Books and Excel.",
        ),
        list("Certifications", [
          item("CA Intermediate, Group I cleared", "2024", "ICAI"),
          item("Tally Prime with GST, certificate course", "2023"),
        ]),
        experience("Experience", [
          exp(
            "Saxena Ralhan and Associates, Chartered Accountants",
            "Accounts Executive",
            "New Delhi",
            "2025-01",
            "present",
            [
              "Keep books in **Tally Prime** for 18 clients in trading and services, with monthly bank and ledger reconciliations",
              "File GSTR-1 and GSTR-3B for 12 clients every month; matching purchases against GSTR-2B recovered ₹3.2 lakh of missed input credit in 2025",
              "Prepare TDS returns (24Q, 26Q) each quarter and track Form 16A issue for about 200 deductees",
              "Support statutory audits by preparing schedules for fixed assets, debtors and creditors",
            ],
          ),
          exp("Navkar Traders", "Accounts Assistant", "New Delhi", "2024-06", "2024-12", [
            "Entered about 600 purchase and sales vouchers a month and kept the stock register in step with the godown",
            "Cleared a backlog of 3 months of bank reconciliations in 5 weeks",
          ]),
        ]),
        skills("Skills", [
          [
            "Accounting",
            ["Bookkeeping", "bank reconciliation", "accounts payable and receivable", "month-end closing"],
          ],
          ["Tax and compliance", ["GST returns", "input tax credit matching", "TDS returns", "e-invoicing"]],
          ["Software", ["Tally Prime", "Zoho Books", "Excel (VLOOKUP, pivot tables)", "GST portal"]],
        ]),
        education("Education", [
          edu("Yamuna College of Commerce", {
            degree: "B.Com (Hons)",
            score: "78%",
            location: "New Delhi",
            start: "2021",
            end: "2024",
          }),
        ]),
      ],
    ),
  },
  {
    slug: "sales-executive",
    templateId: "marketing",
    content: resume(
      {
        name: "Aman Chauhan",
        headline: "B2B Sales Executive",
        email: "aman.chauhan@example.com",
        phone: "+91 98731 20564",
        location: "Gurugram",
        links: [linkedIn("aman-chauhan")],
      },
      [
        summary(
          "Summary",
          "Sales executive with 3 years in B2B field and inside sales for SaaS and office supplies. Met or beat quarterly target in 9 of the last 11 quarters. Open to roles across Delhi NCR.",
        ),
        experience("Experience", [
          exp("Tillbook Cloud Solutions", "Sales Executive", "Gurugram", "2024-03", "present", [
            "Sell billing software to retailers and distributors in Delhi NCR; closed 64 new accounts in FY 2024-25 worth ₹38 lakh in annual contracts",
            "Achieved 112% of annual target in FY 2024-25, ranked 2nd of 11 executives in the region",
            "Run about 25 demos a month from inbound leads and cold calls, logged and followed up in **Zoho CRM**",
            "Cut the average time from demo to signed order from 21 to 14 days with a fixed follow-up sequence",
          ]),
          exp("Officeline Supplies", "Sales Associate", "New Delhi", "2022-08", "2024-02", [
            "Managed 70 corporate accounts for stationery and pantry supplies, with 90% of them reordering each quarter",
            "Added 22 new accounts through visits to business parks in Okhla and Noida",
          ]),
        ]),
        list("Achievements", [
          item("Top performer, North region", "Q3 FY 2024-25"),
          item("Fastest ramp-up in new hire batch", "2024", "First quarter at 104% of target"),
        ]),
        skills("Skills", [
          ["Sales", ["Lead generation", "cold calling", "product demos", "negotiation", "account management"]],
          ["Tools", ["Zoho CRM", "Salesforce (basic)", "Excel", "LinkedIn Sales Navigator"]],
          ["Languages", ["English", "Hindi", "Punjabi"]],
        ]),
        education("Education", [
          edu("Aravalli Institute of Commerce", {
            degree: "BBA",
            score: "71%",
            location: "New Delhi",
            start: "2019",
            end: "2022",
          }),
        ]),
      ],
    ),
  },
  {
    slug: "digital-marketing",
    templateId: "modern",
    content: resume(
      {
        name: "Meera Iyer",
        headline: "Performance Marketing Executive",
        email: "meera.iyer@example.com",
        phone: "+91 96860 35912",
        location: "Bengaluru",
        links: [linkedIn("meera-iyer"), { label: "Portfolio", url: "https://meeraiyer.example.com" }],
      },
      [
        summary(
          "Summary",
          "Digital marketer with 2.5 years running Google and Meta ads for D2C brands, with a monthly budget of up to Rs 12 lakh. I plan campaigns, test creatives and report on CAC and ROAS from GA4 and Looker Studio.",
        ),
        experience("Experience", [
          exp("Kesarine Skincare", "Performance Marketing Executive", "Bengaluru", "2024-05", "present", [
            "Run Meta and Google Ads with a monthly budget of Rs 8 to 12 lakh; brought blended CAC down from Rs 610 to Rs 470 over 9 months",
            "Test about 20 ad creatives a month with the design team; UGC-style videos now drive 45% of purchases from Meta",
            "Set up GA4 events and server-side conversion tracking, fixing a 30% gap between ad platform and store orders",
            "Built a weekly Looker Studio report on ROAS, CAC and repeat rate read by the founders",
          ]),
          exp("Brandloom Digital", "Digital Marketing Associate", "Bengaluru", "2023-06", "2024-04", [
            "Managed search and social campaigns for 5 clients in education and real estate, about Rs 15 lakh a month in total",
            "Rewrote landing pages for a coaching client with the dev team, lifting lead form conversion from 4.2% to 6.8%",
            "Wrote 30 blog posts on keyword plans from Ahrefs; organic sessions to one client's site grew from 3k to 11k a month",
          ]),
        ]),
        skills("Skills", [
          ["Paid media", ["Google Ads (Search, PMax, YouTube)", "Meta Ads Manager", "audience and budget planning"]],
          ["Analytics", ["GA4", "Google Tag Manager", "Looker Studio", "Excel"]],
          ["SEO and content", ["Keyword research", "on-page SEO", "Ahrefs", "Search Console"]],
          ["Email and CRM", ["Klaviyo", "WhatsApp campaigns", "Shopify"]],
        ]),
        list("Certifications", [
          item("Google Ads Search and Measurement Certifications", "2024"),
          item("Meta Certified Media Buying Professional", "2025"),
        ]),
        education("Education", [
          edu("Nandi Hills College of Commerce", {
            degree: "BBA",
            field: "Marketing",
            score: "CGPA: 8.1/10",
            location: "Bengaluru",
            start: "2020",
            end: "2023",
          }),
        ]),
      ],
    ),
  },
  {
    slug: "mechanical-civil-engineer",
    templateId: "campus",
    content: resume(
      {
        name: "Vikram Patil",
        headline: "B.E. Mechanical Engineering, 2026",
        email: "vikram.patil@example.com",
        phone: "+91 94220 81736",
        location: "Kolhapur",
        links: [linkedIn("vikram-patil")],
      },
      [
        education("Education", [
          edu("Panchganga College of Engineering, Kolhapur", {
            degree: "B.E.",
            field: "Mechanical Engineering",
            score: "CGPA: 8.1/10",
            start: "2022",
            end: "2026",
          }),
          edu("Krishnai Junior College, Satara", { degree: "Class XII (HSC)", score: "86.5%", end: "2022" }),
          edu("Krishnai Vidya Mandir, Satara", { degree: "Class X (SSC)", score: "92.4%", end: "2020" }),
        ]),
        experience("Internships", [
          exp("Panhala Forgings", "Production Intern", "Kolhapur MIDC", "2025-06", "2025-07", [
            "Studied cycle times on a crankshaft machining line and proposed a fixture change that cut setup time from 42 to 30 minutes",
            "Tracked rejection reasons for 6 weeks and built a Pareto chart in Excel; the top two causes made up 61% of rejects",
          ]),
          exp("Krishnavel Pumps", "Design Trainee", "Pune", "2024-12", "2025-01", [
            "Modelled impeller and casing parts in **SolidWorks** and made drawings to GD&T standards for the shop floor",
          ]),
        ]),
        projects("Academic Projects", [
          project(
            "Solar-assisted grain dryer",
            ["SolidWorks", "ANSYS Fluent"],
            [],
            [
              "Final-year project: designed and built a dryer that brought grain moisture from 22% to 13% in 7 hours, against 2 days of sun drying",
            ],
          ),
          project(
            "Go-kart chassis, college team",
            ["SolidWorks", "ANSYS"],
            [],
            [
              "Ran static and impact analysis on the chassis; cut frame weight by 4 kg while keeping the safety factor above 2",
            ],
          ),
        ]),
        skills("Technical Skills", [
          ["Design and analysis", ["SolidWorks", "AutoCAD", "CATIA (basic)", "ANSYS", "GD&T"]],
          ["Manufacturing", ["CNC programming basics", "lean and 5S", "Pareto and root cause analysis"]],
          ["Software", ["MS Excel", "MATLAB", "Python (basic)"]],
        ]),
        list("Positions of Responsibility", [
          item("Go-kart team, chassis lead", "2024 to 2025", "Led a group of 5 for a national student event"),
          item("Mechanical Engineering Students' Association, Treasurer", "2024"),
        ]),
        list("Certifications", [
          item("Certified SolidWorks Associate (CSWA)", "2024"),
          item("NPTEL: Fundamentals of Manufacturing Processes, Elite", "2024"),
        ]),
      ],
    ),
  },
  {
    slug: "hr-executive",
    templateId: "consulting",
    content: resume(
      {
        name: "Pooja Deshmukh",
        headline: "HR Executive, Talent Acquisition",
        email: "pooja.deshmukh@example.com",
        phone: "+91 98500 64291",
        location: "Pune",
        links: [linkedIn("pooja-deshmukh")],
      },
      [
        summary(
          "Summary",
          "HR executive with 2.5 years in recruitment and HR operations for IT services and manufacturing. Hired for 150+ roles, from shop-floor technicians to software engineers, and run onboarding and attendance for a 400-person site.",
        ),
        experience("Experience", [
          exp("Ashvek Precision Components", "HR Executive", "Pune", "2024-04", "present", [
            "Closed 92 positions in 2025 across production, quality and support functions, with average time to hire down from 38 to 27 days",
            "Built a referral and campus pipeline with 6 ITIs and polytechnics, which now fills about 40% of technician roles",
            "Run joining formalities and induction for about 10 new joiners a month, plus PF and ESIC registration",
            "Maintain attendance and leave records in **greytHR** and send inputs for monthly payroll of 400 employees",
          ]),
          exp("Talentkaar Staffing", "HR Trainee, Recruitment", "Pune", "2023-06", "2024-03", [
            "Sourced and screened candidates on Naukri and LinkedIn for 4 IT services clients, about 60 screening calls a week",
            "Scheduled and coordinated 300+ interviews; 41 of my candidates joined",
          ]),
        ]),
        skills("Skills", [
          ["Recruitment", ["Sourcing", "screening", "Naukri RMS", "LinkedIn Recruiter", "campus hiring"]],
          ["HR operations", ["Onboarding", "PF and ESIC", "attendance and leave", "payroll inputs", "HR policies"]],
          ["Tools", ["greytHR", "Excel (pivot tables, VLOOKUP)", "Google Workspace"]],
          ["Languages", ["English", "Hindi", "Marathi"]],
        ]),
        education("Education", [
          edu("Shaniwar Institute of Management Studies", {
            degree: "MBA",
            field: "Human Resource Management",
            score: "CGPA: 7.8/10",
            location: "Pune",
            start: "2021",
            end: "2023",
          }),
          edu("Mula Mutha College of Arts", {
            degree: "BA",
            field: "Psychology",
            score: "76%",
            location: "Pune",
            start: "2018",
            end: "2021",
          }),
        ]),
        list("Certifications", [item("Certificate in Labour Laws and Payroll Management", "2024")]),
      ],
    ),
  },
];
