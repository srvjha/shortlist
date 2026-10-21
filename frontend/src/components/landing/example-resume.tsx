import { CheckIcon } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'

const rule =
  'mt-4 border-b border-neutral-800 pb-0.5 font-semibold [font-variant-caps:small-caps]' // taste-skill-ignore: the resume's own section rule, as typeset

const jobs = [
  {
    company: 'Skincare brand (D2C), Pune',
    dates: 'Jun 2024 – Present',
    role: 'Marketing Associate',
    bullets: [
      'Ran the brand’s social media, posting 4 reels a week and growing Instagram followers from 8k to 21k',
      'Coordinated 30 influencers for the Diwali sale campaign, which drove 1,200 orders',
      'Built a weekly Google Analytics report on website traffic and sales for the founders',
    ],
  },
  {
    company: 'Cafe chain, Pune',
    dates: 'Jan 2024 – Apr 2024',
    role: 'Marketing Intern',
    bullets: [
      'Planned in-store offers and posters for 3 outlets, and wrote menu and delivery app listing copy',
    ],
  },
]

const changes = [
  'Wrote a two-line summary aimed at the Marketing Executive job.',
  'Started each point with what she did and the result.',
  'Put the skills the job asks for first.',
  'Left out budgets. She has not managed one, so the resume does not claim it.',
  'Kept it to one page and one column, so hiring software can read it.',
]

export function ExampleResume() {
  return (
    <Reveal
      as="section"
      aria-labelledby="example"
      className="mx-auto max-w-6xl px-5 pt-28"
    >
      <h2
        id="example"
        data-reveal
        className="text-center font-serif text-[2rem] leading-[1.05] font-semibold tracking-[-0.02em] sm:text-5xl"
      >
        An example from marketing
      </h2>
      <p data-reveal className="mx-auto mt-4 max-w-2xl text-center text-lg">
        Ananya finished her BBA in 2024 and has worked in marketing since. This
        is her resume after tailoring it for a Marketing Executive job.
      </p>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <figure
          data-reveal
          aria-label="Example resume for Ananya Rao, a marketing professional"
          className="bg-sheet px-6 py-10 font-serif text-sm leading-snug text-sheet-foreground ring-1 ring-black/5 sm:px-12 sm:text-[15px]"
        >
          <div className="text-center">
            <p className="text-2xl tracking-wide [font-variant-caps:small-caps]">
              Ananya Rao
            </p>
            <p className="mt-1 text-[13px] text-neutral-600">
              Pune | ananya@example.com | linkedin.com/in/ananya
            </p>
          </div>
          <p className={rule}>Summary</p>
          <p className="mt-1.5">
            Marketing associate with 1.5 years in social media and influencer
            campaigns for a growing skincare brand. Comfortable with Google
            Analytics and weekly reporting.
          </p>
          <p className={rule}>Experience</p>
          {jobs.map((job) => (
            <div key={job.role} className="mt-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{job.company}</span>
                <span className="shrink-0 font-semibold">{job.dates}</span>
              </div>
              <p className="italic">{job.role}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {job.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 pl-1">
                    <span aria-hidden="true">•</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className={rule}>Education</p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="font-semibold">BBA, Marketing</span>
            <span className="shrink-0 font-semibold">2024</span>
          </div>
          <p>Savitribai Phule Pune University, CGPA 8.1 / 10</p>
          <p className={rule}>Skills</p>
          <p className="mt-1.5">
            <b>Marketing</b>: Social media, Campaign planning, Influencer
            outreach, Content writing
          </p>
          <p>
            <b>Tools</b>: Google Analytics, Canva, Meta Business Suite, Excel
          </p>
          <p>
            <b>Languages</b>: English, Hindi, Marathi
          </p>
        </figure>

        <div data-reveal className="rounded-2xl bg-card p-6">
          <h3 className="font-serif text-2xl font-semibold tracking-[-0.01em]">
            What Shortlist changed
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-base">
            {changes.map((change) => (
              <li key={change} className="flex gap-3">
                <CheckIcon
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-primary"
                />
                {change}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-base text-muted-foreground">
            Ananya is an example. Her name and details are made up.
          </p>
        </div>
      </div>
    </Reveal>
  )
}
