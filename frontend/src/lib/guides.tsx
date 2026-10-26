import { Link } from '@tanstack/react-router'
import type { DocSection } from '@/lib/docs'

export type Guide = {
  slug: string
  title: string
  // The <title> and search snippet; title is the on-page heading.
  seoTitle: string
  summary: string
  updated: string
  sections: DocSection[]
}

const T = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <Link to="/templates/$templateId" params={{ templateId: id }}>
    {children}
  </Link>
)

export const guides: Guide[] = [
  {
    slug: 'resume-format-for-freshers',
    title: 'Resume format for freshers',
    seoTitle: 'Resume Format for Freshers (2026): Section Order and Examples',
    summary:
      'The resume format that works for freshers and campus placements in India: what goes on the page, in what order, and what to leave out.',
    updated: '2026-10-05',
    sections: [
      {
        id: 'at-a-glance',
        title: 'The format at a glance',
        body: (
          <>
            <p>
              A fresher resume has one job: get you shortlisted for an
              interview. Recruiters spend well under a minute on a first read,
              and most use an applicant tracking system (ATS) to search and sort
              applications. The format below works for both.
            </p>
            <ul>
              <li>
                <strong>One page.</strong> Without full-time experience, a
                second page only dilutes your best points.
              </li>
              <li>
                <strong>Single column</strong>, with standard section headings.
              </li>
              <li>
                <strong>Education first</strong>, then skills, projects,
                internships and achievements.
              </li>
              <li>
                <strong>Newest first</strong> inside every section.
              </li>
              <li>
                <strong>A PDF</strong> with selectable text, unless the job post
                asks for Word.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: 'section-order',
        title: 'Section order for freshers',
        body: (
          <>
            <ol>
              <li>Name and contact details</li>
              <li>Education</li>
              <li>Skills</li>
              <li>Projects</li>
              <li>Internships or work experience</li>
              <li>Achievements and positions of responsibility</li>
              <li>Certifications (optional)</li>
            </ol>
            <p>
              If you have a solid internship, move it above projects. Once you
              have a full-time job, experience moves to the top and education
              goes to the bottom.
            </p>
          </>
        ),
      },
      {
        id: 'contact',
        title: 'Name and contact details',
        body: (
          <>
            <p>
              Put your name in large type, then one line with your phone number,
              a professional email address, your city, and links to LinkedIn and
              GitHub or a portfolio. Write links out in a short form like{' '}
              <code>github.com/aarav</code> so they still work on a printed
              copy.
            </p>
            <p>
              Leave out your photo, date of birth, gender, marital status,
              father's name and full postal address. Indian companies and
              recruiters abroad do not need them, and they take space from
              things that get you shortlisted.
            </p>
          </>
        ),
      },
      {
        id: 'education',
        title: 'Education',
        body: (
          <>
            <p>
              List your degree, college, CGPA or percentage, and year of
              graduation (or expected graduation). Most campus recruiters also
              expect Class XII and Class X, with the board and your percentage,
              until you have your first job. A table with degree, institution,
              score and year, like the{' '}
              <T id="campus">Campus placement template</T>, fits all of this in
              a few lines.
            </p>
            <p>
              Write your score the way your college reports it ("8.4 CGPA" or
              "86%"). Add a line of relevant coursework only if it matches the
              jobs you are applying for.
            </p>
          </>
        ),
      },
      {
        id: 'skills',
        title: 'Skills',
        body: (
          <>
            <p>
              Group skills by type so they are quick to scan, for example
              Languages, Frameworks, Tools and Databases. List only what you
              could answer interview questions on: a recruiter or interviewer
              will pick anything on the page and ask about it.
            </p>
            <p>
              Leave out soft skills like "hard-working" or "team player" here.
              Show them in your bullets instead ("Led a team of 4 to build…").
            </p>
          </>
        ),
      },
      {
        id: 'projects',
        title: 'Projects',
        body: (
          <>
            <p>
              For most freshers, projects are the strongest section. Pick your
              two or three best, and for each one give the name, the tech stack
              and a link to the code or a live demo. Then add two or three
              bullets that say what you built, how, and what came of it.
            </p>
            <p>A weak bullet and a strong one:</p>
            <ul>
              <li>Weak: "Made a food delivery website using React."</li>
              <li>
                Strong: "Built a food ordering app in React and Node.js with UPI
                payments; 120 students in my hostel used it in its first month."
              </li>
            </ul>
            <p>
              Numbers make a bullet believable: users, speed, accuracy, rank,
              time saved. Small, honest numbers are fine.
            </p>
          </>
        ),
      },
      {
        id: 'internships',
        title: 'Internships and experience',
        body: (
          <p>
            Give the company, your role, the dates and two to four bullets on
            what you did. Unpaid, remote and short internships all count, and so
            do freelance work and teaching assistant roles. Start each bullet
            with a verb (built, analysed, reduced, launched) and end it with a
            result where you can.
          </p>
        ),
      },
      {
        id: 'achievements',
        title: 'Achievements and positions of responsibility',
        body: (
          <p>
            This is where hackathons, coding contest ranks, scholarships, paper
            presentations and club roles go. Be specific: "Winner, Smart India
            Hackathon 2025 (team of 6)" or "Organised a 3-day tech fest with 40
            volunteers and 2,000 attendees" says far more than "Active member of
            the coding club".
          </p>
        ),
      },
      {
        id: 'leave-out',
        title: 'What to leave out',
        body: (
          <ul>
            <li>
              A generic career objective ("Seeking a challenging position…").
              Use a two-line summary only if it says something specific about
              you.
            </li>
            <li>
              The declaration line ("I hereby declare…") and your signature.
            </li>
            <li>"References available on request".</li>
            <li>Hobbies, unless they are unusual or relevant to the job.</li>
            <li>
              Skills ratings drawn as bars or stars; an ATS cannot read them.
            </li>
          </ul>
        ),
      },
      {
        id: 'formatting',
        title: 'Formatting rules',
        body: (
          <ul>
            <li>Font size 10 to 11 pt, with margins of about half an inch.</li>
            <li>One date format everywhere, like "Jun 2025" or "06/2025".</li>
            <li>
              No text inside images, icons or text boxes, and nothing important
              in the page header or footer.
            </li>
            <li>
              Name the file after yourself: <code>Aarav-Sharma-Resume.pdf</code>
              , not <code>resume_final_v3.pdf</code>.
            </li>
          </ul>
        ),
      },
      {
        id: 'template',
        title: 'A template that follows this format',
        body: (
          <>
            <p>
              The <T id="campus">Campus placement template</T> follows this
              format exactly, and <T id="jake">Jake's Resume</T> is the standard
              for software roles. Both are free on Shortlist: fill in a form or
              import your current resume, and it is typeset for you. When you
              apply, paste the job description to tailor the resume to that
              role.
            </p>
            <p>
              Before you send it, run it through the free{' '}
              <Link to="/ats-checker">ATS resume checker</Link> to catch
              anything a parser would trip on.
            </p>
          </>
        ),
      },
    ],
  },
  {
    slug: 'ats-friendly-resume',
    title: 'How to make an ATS-friendly resume',
    seoTitle: 'How to Make an ATS-Friendly Resume: Rules That Matter',
    summary:
      'What an applicant tracking system actually does with your resume, the formatting rules that keep it readable, and the myths you can ignore.',
    updated: '2026-10-05',
    sections: [
      {
        id: 'what-ats-does',
        title: 'What an ATS actually does',
        body: (
          <>
            <p>
              An applicant tracking system (ATS) is the software companies use
              to collect applications. Workday, Greenhouse, Lever,
              SuccessFactors and Naukri RMS are common ones. When you apply, the
              ATS reads your resume and fills fields like name, email, job
              titles, dates, education and skills. Recruiters then search and
              filter those fields, and many systems rank applicants against the
              job.
            </p>
            <p>
              Most of the time, an ATS does not reject resumes on its own.
              Rejections usually come from knockout questions on the application
              form (location, notice period, years of experience) or from a
              recruiter who never finds you in a search. So the goal has two
              parts: a resume the ATS reads correctly, and one that matches the
              words a recruiter searches for.
            </p>
          </>
        ),
      },
      {
        id: 'layout',
        title: 'Keep the layout simple',
        body: (
          <ul>
            <li>
              <strong>Use one column.</strong> Many parsers read straight across
              the page, so two columns can come out as lines from both sides
              mixed together.
            </li>
            <li>
              <strong>Use standard headings:</strong> Education, Experience,
              Projects, Skills. Clever names like "My Journey" may not be
              recognised as a section.
            </li>
            <li>
              <strong>Keep contact details in the main body</strong>, not in the
              page header or footer, which some systems skip.
            </li>
            <li>
              <strong>Avoid text in images, icons and text boxes.</strong> A
              phone icon with no number written next to it reads as nothing, or
              as a stray character.
            </li>
            <li>
              <strong>Avoid tables for important content.</strong> A simple
              education table usually parses fine; a full layout built from
              tables often does not.
            </li>
          </ul>
        ),
      },
      {
        id: 'file',
        title: 'Use a text-based PDF',
        body: (
          <p>
            Modern ATS software reads PDFs well, as long as the text is real
            text. Check by opening your PDF and trying to select a line. If you
            cannot, it was scanned or exported as an image, and the ATS will see
            an empty page. Export again from Word, Google Docs or LaTeX. Send a
            Word file only when the job post asks for one.
          </p>
        ),
      },
      {
        id: 'keywords',
        title: 'Match the job description',
        body: (
          <>
            <p>
              Recruiters search the ATS for skills and job titles. Read the job
              description and make sure the must-have skills it lists appear in
              your resume, in the same words, wherever they are true for you. If
              the post says "PostgreSQL", write PostgreSQL, not just "SQL
              databases".
            </p>
            <ul>
              <li>
                Write both forms of common acronyms once: "Machine Learning
                (ML)".
              </li>
              <li>
                Put skills in the bullets where you used them, not only in a
                skills list.
              </li>
              <li>
                Never paste the job description in white text or stuff keywords.
                Recruiters read the result, and it costs you more than it gains.
              </li>
            </ul>
            <p>
              Tailoring every application by hand is slow. Shortlist does it in
              one click: paste the job description and review each suggested
              change before you accept it. Any change that adds something it
              can't find in your resume or profile is flagged and left unchecked
              for you to decide.
            </p>
          </>
        ),
      },
      {
        id: 'details',
        title: 'Small details that break parsing',
        body: (
          <ul>
            <li>
              One date format throughout ("Jun 2024 to Present"), so the ATS can
              work out your experience.
            </li>
            <li>
              Standard fonts, and no letter-spaced names like "A A R A V".
            </li>
            <li>
              Write links in full or in short form (linkedin.com/in/aarav), not
              only as an icon.
            </li>
            <li>Plain bullets, not emoji or custom symbols.</li>
          </ul>
        ),
      },
      {
        id: 'myths',
        title: 'Myths you can ignore',
        body: (
          <ul>
            <li>
              <strong>"ATS software can't read PDFs."</strong> It could not, a
              long time ago. Text-based PDFs are fine today.
            </li>
            <li>
              <strong>"75% of resumes are rejected by the ATS."</strong> This
              figure has no real source. Most filtering is done by people and by
              the questions on the application form.
            </li>
            <li>
              <strong>"You need a perfect ATS score."</strong> There is no
              universal score; every company sets up its system differently. A
              checker tells you what to fix, not whether you will be hired.
            </li>
          </ul>
        ),
      },
      {
        id: 'check',
        title: 'Check your resume',
        body: (
          <p>
            The free <Link to="/ats-checker">ATS resume checker</Link> reads
            your PDF the way a parser does and shows what comes through, what
            breaks and how to fix it. No signup needed. If you are starting
            fresh, every <Link to="/templates">Shortlist template</Link> marked
            ATS-friendly follows these rules.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'tailor-resume-to-job-description',
    title: 'How to tailor your resume to a job description',
    seoTitle: 'How to Tailor Your Resume to a Job Description (With Examples)',
    summary:
      'A step-by-step way to fit one resume to each job you apply for: read the job description, match its words honestly, reorder what matters and cut the rest.',
    updated: '2026-10-09',
    sections: [
      {
        id: 'why',
        title: 'Why one resume for every job does not work',
        body: (
          <>
            <p>
              Most students send the same resume to every opening. It feels
              efficient, but each job is looking for something slightly
              different, and a recruiter reading 200 applications decides in
              seconds whether yours fits. Applicant tracking systems (ATS) make
              this stricter: recruiters search them for the skills in the job
              post, and a resume that never uses those words does not come up.
            </p>
            <p>
              Tailoring means making the parts of your experience that match{' '}
              <em>this</em> job easy to find. It never means adding things you
              have not done.
            </p>
          </>
        ),
      },
      {
        id: 'read',
        title: 'Step 1: Read the job description like a checklist',
        body: (
          <>
            <p>
              Copy the job description and split it into three lists before you
              touch your resume:
            </p>
            <ul>
              <li>
                <strong>Must-haves:</strong> skills and qualifications the post
                says are required.
              </li>
              <li>
                <strong>Nice-to-haves:</strong> anything marked preferred, a
                plus or good to have.
              </li>
              <li>
                <strong>The work itself:</strong> what you would actually do
                every day.
              </li>
            </ul>
            <p>
              For example, a backend developer opening in Bengaluru might list
              Java, Spring Boot, MySQL and REST APIs as must-haves, Docker and
              AWS as nice-to-haves, and "build and maintain APIs for our
              payments team" as the work. Those three lists tell you what to
              lead with.
            </p>
          </>
        ),
      },
      {
        id: 'match',
        title: 'Step 2: Use their words, where they are true',
        body: (
          <>
            <p>
              If the post says <strong>REST APIs</strong> and your resume says
              "backend services", a recruiter searching for REST APIs will miss
              you. For every must-have you genuinely have, use the job's exact
              wording at least once:
            </p>
            <ul>
              <li>
                In your <strong>skills</strong> section, so it is found in a
                search.
              </li>
              <li>
                In a <strong>bullet</strong>, so it is backed by something you
                did. A skill that appears only in a list is easy to doubt.
              </li>
            </ul>
            <p>
              Do not paste keywords in white text or repeat them ten times.
              Recruiters read the resume after the search, and keyword stuffing
              is obvious to a person.
            </p>
          </>
        ),
      },
      {
        id: 'reorder',
        title: 'Step 3: Move the most relevant things up',
        body: (
          <>
            <p>
              Recruiters read top to bottom and stop early. Put what matches the
              job where they will see it first:
            </p>
            <ul>
              <li>
                Reorder your <strong>projects</strong> so the one closest to the
                job comes first.
              </li>
              <li>
                Reorder <strong>skills</strong> so the must-haves lead each
                group.
              </li>
              <li>Inside each entry, put the most relevant bullet first.</li>
              <li>
                If you use a headline, make it match the role: "Backend
                Developer (Java, Spring Boot)" rather than "Software Engineer".
              </li>
            </ul>
          </>
        ),
      },
      {
        id: 'rewrite',
        title: 'Step 4: Rewrite bullets to show what the job needs',
        body: (
          <>
            <p>
              The same work can be described in a way that fits the job better.
              For the backend role above:
            </p>
            <ul>
              <li>
                <strong>Before:</strong> "Made a college event website with a
                login system."
              </li>
              <li>
                <strong>After:</strong> "Built REST APIs in Spring Boot and
                MySQL for a college event site with login and registrations,
                used by 1,200 students during the fest."
              </li>
            </ul>
            <p>
              Nothing new was invented. The rewrite names the tools the job asks
              for, says what you built and adds a result.
            </p>
          </>
        ),
      },
      {
        id: 'cut',
        title: 'Step 5: Cut what does not help',
        body: (
          <p>
            Space on one page is limited, so every line should earn its place
            for this job. Hide the project that has nothing to do with the role,
            drop skills the job will never use, and shorten old or unrelated
            bullets. Keep the resume to one page; for a fresher, a second page
            almost always means weaker points diluting strong ones.
          </p>
        ),
      },
      {
        id: 'honest',
        title: 'Stay honest',
        body: (
          <p>
            Tailoring only works with things you can talk about. If a skill from
            the job description is missing, do not add it; interviewers ask
            about every line. Instead, mention related work you have done, or
            learn the basics and build a small project with it before you apply.
          </p>
        ),
      },
      {
        id: 'checklist',
        title: 'A quick checklist before you apply',
        body: (
          <ul>
            <li>Every must-have you have appears in skills and in a bullet.</li>
            <li>The most relevant project or internship is at the top.</li>
            <li>Your headline, if you use one, names this role.</li>
            <li>No line on the page is there only for other jobs.</li>
            <li>It still fits on one page and reads well as a PDF.</li>
            <li>Every claim is something you can explain in an interview.</li>
          </ul>
        ),
      },
      {
        id: 'shortlist',
        title: 'Tailor a resume in Shortlist',
        body: (
          <>
            <p>
              Doing this by hand for every application takes time, which is why
              most people skip it. In Shortlist you keep one main resume and
              tailor a copy for each job:
            </p>
            <ol>
              <li>
                Open your resume, choose <strong>Improve with AI</strong> and
                add the job by pasting the description or a link to the post.
              </li>
              <li>
                Choose <strong>Tailor resume</strong>. It reorders, trims and
                rewrites bullets for that job, using only what is already in
                your resume and profile.
              </li>
              <li>
                Review every change side by side and apply the ones you agree
                with. Nothing changes until you apply, and you can undo from
                History.
              </li>
            </ol>
            <p>
              Then run the free{' '}
              <Link to="/ats-checker">ATS resume checker</Link> with the same
              job to see which of its keywords your resume covers. The free plan
              includes 5 tailored resumes in your first week, then one a month.
            </p>
          </>
        ),
      },
    ],
  },
  {
    slug: 'resume-for-internship-no-experience',
    title: 'Resume for an internship with no experience',
    seoTitle:
      'Resume for an Internship With No Experience: What to Write (2026)',
    summary:
      'What to put on your first resume when you have never had an internship: the right order, how to turn projects and college work into experience, and the mistakes to avoid.',
    updated: '2026-10-09',
    sections: [
      {
        id: 'what-they-want',
        title: 'What recruiters look for in a first-time intern',
        body: (
          <>
            <p>
              Nobody expects an internship applicant to have work experience;
              that is what the internship is for. A recruiter hiring an intern
              is looking for three things:
            </p>
            <ul>
              <li>
                <strong>Proof you can build or do something</strong> in the
                field, even on a small scale.
              </li>
              <li>
                <strong>Signs you learn quickly</strong>: things you picked up
                on your own, and how far you took them.
              </li>
              <li>
                <strong>The basics</strong>: your degree, year, college and the
                skills the role needs.
              </li>
            </ul>
            <p>
              Everything on your resume should support one of these. That is why
              projects and achievements matter more than a long list of
              certificates.
            </p>
          </>
        ),
      },
      {
        id: 'order',
        title: 'The section order that works',
        body: (
          <ol>
            <li>
              <strong>Education:</strong> degree, college, year of graduation
              and your CGPA or percentage. Add Class XII and Class X if you are
              applying through campus.
            </li>
            <li>
              <strong>Skills:</strong> grouped, such as languages, frameworks
              and tools.
            </li>
            <li>
              <strong>Projects:</strong> your main section. Two or three good
              ones.
            </li>
            <li>
              <strong>Achievements:</strong> hackathons, contests, ranks,
              scholarships.
            </li>
            <li>
              <strong>Positions of responsibility:</strong> clubs, fests,
              societies.
            </li>
            <li>
              <strong>Certifications:</strong> only those relevant to the role.
            </li>
          </ol>
        ),
      },
      {
        id: 'projects',
        title: 'Projects are your experience',
        body: (
          <>
            <p>
              Without an internship, projects do the job that work experience
              does on other resumes. Pick two or three, with the one closest to
              the internship first, and write each like a job:
            </p>
            <ul>
              <li>
                <strong>The problem:</strong> what it does and for whom.
              </li>
              <li>
                <strong>How:</strong> the tools you used, named specifically.
              </li>
              <li>
                <strong>The result:</strong> users, speed, accuracy, or simply
                that it is live and in use.
              </li>
              <li>
                <strong>A link:</strong> GitHub or a live demo, so they can see
                it.
              </li>
            </ul>
            <p>For example:</p>
            <ul>
              <li>
                <strong>Weak:</strong> "Made a weather app using React."
              </li>
              <li>
                <strong>Strong:</strong> "Built a weather app in React using the
                OpenWeather API with 5-day forecasts and saved cities; deployed
                on Vercel and used by 60 classmates."
              </li>
            </ul>
            <p>
              Academic projects count too. A semester project you built properly
              is better than a copied tutorial with a fancier name.
            </p>
          </>
        ),
      },
      {
        id: 'other-proof',
        title: 'Other things that count',
        body: (
          <ul>
            <li>
              <strong>Hackathons</strong>, including ones you did not win: what
              you built in 36 hours says a lot.
            </li>
            <li>
              <strong>Coding contests:</strong> a Codeforces, CodeChef or
              LeetCode rating, or a rank in a contest.
            </li>
            <li>
              <strong>Open source:</strong> even a few merged pull requests.
            </li>
            <li>
              <strong>College clubs and fests:</strong> running an event,
              managing sponsors or leading a team.
            </li>
            <li>
              <strong>Freelance or family business work:</strong> a website for
              a local shop, social media for a small brand.
            </li>
            <li>
              <strong>Teaching:</strong> tutoring, teaching assistant roles,
              running workshops.
            </li>
          </ul>
        ),
      },
      {
        id: 'skills',
        title: 'Skills: only what you can be asked about',
        body: (
          <p>
            List the skills you have used in a project or could answer questions
            on in an interview. Group them, so a recruiter can scan them in a
            second: languages, frameworks, tools. Leave out percentage bars and
            star ratings; they mean nothing to a reader and often break ATS
            software.
          </p>
        ),
      },
      {
        id: 'summary',
        title: 'Do you need a summary or objective?',
        body: (
          <>
            <p>
              Not usually. If you add one, keep it to two lines and make it
              specific, or it wastes the best space on the page.
            </p>
            <ul>
              <li>
                <strong>Weak:</strong> "Hardworking and passionate student
                seeking a challenging role to grow my skills."
              </li>
              <li>
                <strong>Better:</strong> "Third-year B.Tech CSE student looking
                for a backend internship; built two Node.js APIs used by college
                clubs."
              </li>
            </ul>
          </>
        ),
      },
      {
        id: 'mistakes',
        title: 'Common mistakes',
        body: (
          <ul>
            <li>Adding a photo, date of birth or a declaration at the end.</li>
            <li>Going onto a second page.</li>
            <li>
              Listing every online course you started instead of the two that
              matter.
            </li>
            <li>Skills you have only watched a video about.</li>
            <li>Words like hardworking, passionate and team player.</li>
            <li>
              A design with columns, tables or images that ATS software cannot
              read.
            </li>
          </ul>
        ),
      },
      {
        id: 'non-tech',
        title: 'Not in tech?',
        body: (
          <p>
            The same rules apply for commerce, marketing, design and other
            fields; only the proof changes. Case competitions, fest
            sponsorships, a social media page you grew, a market research
            project or a portfolio of designs all play the part that coding
            projects play for engineers.
          </p>
        ),
      },
      {
        id: 'shortlist',
        title: 'Build it in Shortlist',
        body: (
          <p>
            The <T id="campus">Campus template</T> follows the education-first
            order placement cells expect, and{' '}
            <T id="jake">Jake&apos;s Resume</T> is the classic one-page layout
            for tech roles. If you are starting from nothing, Write with AI
            turns a few notes about your projects and college into a first draft
            you can edit. When you are done, run it through the free{' '}
            <Link to="/ats-checker">ATS resume checker</Link>.
          </p>
        ),
      },
    ],
  },
]

export const findGuide = (slug: string) => guides.find((g) => g.slug === slug)
