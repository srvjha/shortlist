import { Link } from '@tanstack/react-router'
import { ArrowDownIcon } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { site } from '@/lib/site'
import { templateCatalog } from '@/lib/templates'
import { cn } from '@/lib/utils'

export type DocSection = { id: string; title: string; body: React.ReactNode }
export type DocPage = {
  slug: string
  title: string
  summary: string
  group: (typeof docGroups)[number]
  sections: DocSection[]
}

// Prose styles for article bodies (docs and guides), which are plain elements.
export const prose =
  'flex flex-col gap-4 leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5'

export const docGroups = [
  'Getting started',
  'Writing',
  'AI',
  'Check and share',
  'Account',
] as const

// Flowcharts read top to bottom as plain text, so screen readers get the same steps in order.
function Flow({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <figure className="flex flex-col items-center rounded-lg border bg-card p-4 sm:p-6">
      {children}
      <figcaption className="mt-4 text-center text-sm text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}

const flowNodeStyles = {
  start: 'rounded-full bg-muted font-medium',
  step: 'rounded-lg border bg-background',
  question: 'rounded-lg border-2 border-primary/50 bg-primary/5 font-medium',
  end: 'rounded-lg border border-primary/25 bg-background',
}

function FlowNode({
  kind = 'step',
  children,
}: {
  kind?: keyof typeof flowNodeStyles
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'w-full max-w-sm px-4 py-2.5 text-center text-sm leading-snug text-balance',
        flowNodeStyles[kind],
      )}
    >
      {children}
    </div>
  )
}

const FlowArrow = () => (
  <ArrowDownIcon
    aria-hidden
    className="my-1.5 size-4 shrink-0 text-muted-foreground"
  />
)

const FlowBranches = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-1.5 grid w-full gap-6 sm:grid-cols-2 sm:gap-4">
    {children}
  </div>
)

function FlowBranch({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center">
      <FlowArrow />
      <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-semibold">
        {label}
      </span>
      <FlowArrow />
      {children}
    </div>
  )
}

const K = ({ children }: { children: React.ReactNode }) => (
  <Kbd className="align-[0.1em]">{children}</Kbd>
)

export const docs: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    group: 'Getting started',
    summary:
      'Create an account, make your first resume and send it, in about five minutes.',
    sections: [
      {
        id: 'what-it-is',
        title: 'What Shortlist is',
        body: (
          <>
            <p>
              {site.name} is a resume builder for every field, from software and
              data to banking, consulting, marketing and design. You write your
              resume once, tailor a copy to each job with AI you can check word
              by word, test it against an applicant tracking system (ATS), and
              share it with a link that tells you when it was opened.
            </p>
            <p>
              Every resume is typeset through real LaTeX templates, so it looks
              like the clean, dense resumes recruiters are used to, without you
              writing any LaTeX.
            </p>
          </>
        ),
      },
      {
        id: 'sign-in',
        title: 'Sign in',
        body: (
          <p>
            Sign in with Google or GitHub. We create your account and a username
            from your name, which you can change later in Settings. Sign in with
            ChatGPT is coming once OpenAI opens it to partners.
          </p>
        ),
      },
      {
        id: 'first-resume',
        title: 'Make your first resume',
        body: (
          <>
            <p>
              Open <b>New resume</b> and pick how to start:
            </p>
            <ul>
              <li>
                <b>Import a file</b>: a PDF, a <code>.tex</code> file or pasted
                text. See <DocLink slug="import">Importing a resume</DocLink>.
              </li>
              <li>
                <b>Paste LaTeX</b> to keep editing an Overleaf resume.
              </li>
              <li>
                <b>From my profile</b> once you have filled in your{' '}
                <DocLink slug="profile">profile</DocLink>.
              </li>
              <li>
                <b>Start blank</b> from any template, a blank LaTeX page or a
                template you saved.
              </li>
            </ul>
            <p>
              Give it a name only you will see, such as the role or company you
              are applying to.
            </p>
          </>
        ),
      },
      {
        id: 'send-it',
        title: 'Download or share it',
        body: (
          <p>
            Use <b>Download</b> for a PDF, or <b>Share</b> for a link like{' '}
            <code>{site.displayDomain}/your-name/backend-roles</code>. Links
            stay up to date with your edits and show you who opened them. See{' '}
            <DocLink slug="sharing">Share links</DocLink>.
          </p>
        ),
      },
      {
        id: 'next',
        title: 'What to do next',
        body: (
          <ul>
            <li>
              <DocLink slug="ai-tailoring">Tailor it to a job</DocLink> with AI.
            </li>
            <li>
              <DocLink slug="ats-checker">Check it against an ATS</DocLink>.
            </li>
            <li>
              Save a job post on the <b>Jobs</b> page so you can tailor to it
              any time.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    slug: 'profile',
    title: 'Your profile',
    group: 'Getting started',
    summary:
      'One place for every fact about your career. Resumes start from it, and AI can only use what is in it.',
    sections: [
      {
        id: 'why',
        title: 'Why a profile',
        body: (
          <p>
            Your profile holds every job, project, degree and skill you have,
            even ones that don't fit on one page. Each resume is a selection
            from it. When the AI tailors a resume, it may rephrase, reorder,
            emphasise or hide what is in your resume and profile, but never add
            employers, titles, dates, numbers or skills that aren't there.
          </p>
        ),
      },
      {
        id: 'filling-it-in',
        title: 'Filling it in',
        body: (
          <p>
            Open <b>Profile</b> and fill it in like a resume, or save an
            imported resume as your profile when you create it. The same editor
            and the same <DocLink slug="ai-privacy">Hide from AI</DocLink>{' '}
            toggles work here.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'editor',
    title: 'The editor',
    group: 'Writing',
    summary:
      'Two editors, one engine: a form for most people, LaTeX for those who want full control.',
    sections: [
      {
        id: 'form',
        title: 'Form editor',
        body: (
          <>
            <p>
              Fill in your details, then add sections such as Experience,
              Education, Projects and Skills. Move items up or down, hide any
              item without deleting it, and use <b>**bold**</b> inside a bullet
              to emphasise words.
            </p>
            <p>
              Everything saves automatically a moment after you stop typing, and
              every save becomes a version you can go back to.
            </p>
          </>
        ),
      },
      {
        id: 'latex',
        title: 'LaTeX editor',
        body: (
          <p>
            Resumes started from LaTeX open in a code editor. When the document
            doesn't compile, the preview lists each error with its line number
            and a plain-English hint; click a line to jump to it, or use{' '}
            <b>Fix it with AI</b>. LaTeX compiles with XeTeX, so the pdfTeX-only
            lines in many Overleaf templates are handled for you.
          </p>
        ),
      },
      {
        id: 'preview',
        title: 'Live preview and page limit',
        body: (
          <p>
            The preview updates as you type and shows the page count. If a
            resume runs over its page limit, a warning appears above the preview
            with quick fixes: remove space you added, switch to compact spacing,
            or allow another page (one page reads best, so that is the last
            resort). You can also hide or shorten something, or ask the AI to
            "Trim it to fit on one page". The other way round, when a full
            resume leaves a gap at the bottom of the page (common after
            tailoring hides weaker items), a hint offers roomier spacing to
            spread it down the page.
          </p>
        ),
      },
      {
        id: 'focus',
        title: 'Focus mode',
        body: (
          <p>
            Press <K>⌘</K> <K>.</K> on a Mac or <K>Ctrl</K> <K>.</K> elsewhere
            to hide the preview and AI panels and give the editor the whole
            screen. Press it again to bring them back.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'templates',
    title: 'Templates and layout',
    group: 'Writing',
    summary: `${templateCatalog.length} LaTeX templates for different fields, plus spacing and font size presets.`,
    sections: [
      {
        id: 'choosing',
        title: 'Choosing a template',
        body: (
          <>
            <p>
              Pick a template when you create a resume, or switch any time from
              the template menu in the editor; your content stays the same.
              Browse them all on the <Link to="/templates">templates page</Link>
              , filtered by field.
            </p>
            <div className="docs-table">
              <table>
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Best for</th>
                    <th>ATS-friendly</th>
                  </tr>
                </thead>
                <tbody>
                  {templateCatalog.map((template) => (
                    <tr key={template.id}>
                      <td>{template.name}</td>
                      <td>{template.description}</td>
                      <td>{template.atsSafe ? 'Yes' : 'Two columns'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ),
      },
      {
        id: 'layout',
        title: 'Spacing and font size',
        body: (
          <p>
            Open <b>Layout</b> next to the template menu to choose Compact,
            Normal or Relaxed spacing and 10, 11 or 12 point text. Normal keeps
            each template exactly as designed. Layout applies to form resumes; a
            LaTeX resume is your own document, so it sets its own spacing.
          </p>
        ),
      },
      {
        id: 'space-below',
        title: 'Space between sections and entries',
        body: (
          <p>
            To add room after one section or one entry, like a single project,
            open its <b>⋯</b> menu and choose <b>Space below</b>: None, Small,
            Medium or Large. It changes only that spot, and works in every
            template. If the extra space pushes the resume past its page limit,
            the preview warns you and offers to remove it.
          </p>
        ),
      },
      {
        id: 'your-own',
        title: 'Your own templates',
        body: (
          <p>
            Save any resume, or any LaTeX you have written, as a template from{' '}
            <b>Templates</b> in the app. It then appears as a starting point
            when you create a resume.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'import',
    title: 'Importing a resume',
    group: 'Writing',
    summary: 'Turn a PDF, a LaTeX file or pasted text into an editable resume.',
    sections: [
      {
        id: 'how',
        title: 'How import works',
        body: (
          <p>
            Upload a PDF or <code>.tex</code> file, or paste text. The AI reads
            it into your name, contact details, sections, entries and bullets,
            and shows a live preview in the template you choose. Nothing is
            saved until you create the resume, and you can edit everything
            afterwards.
          </p>
        ),
      },
      {
        id: 'nothing-lost',
        title: 'Nothing gets lost',
        body: (
          <p>
            After the AI reads a PDF, Shortlist also reads the file line by line
            and checks every line made it in. If the AI skipped one, it is added
            back as a hidden bullet under the entry it came from, and the review
            screen lists it. Hidden bullets don't print; turn one on with the
            eye icon in the editor.
          </p>
        ),
      },
      {
        id: 'tips',
        title: 'Tips for a clean import',
        body: (
          <ul>
            <li>
              Use a PDF exported from Word, Google Docs or LaTeX. A scanned or
              image-only PDF has no text to read.
            </li>
            <li>
              Pasting LaTeX instead of importing it keeps your exact document in
              the LaTeX editor.
            </li>
            <li>
              Importing is free on every plan. See{' '}
              <DocLink slug="plans">Plans and limits</DocLink>.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    slug: 'write-with-ai',
    title: 'Writing a resume with AI',
    group: 'AI',
    summary:
      'No resume yet? Describe yourself in a few notes and the AI writes a first draft.',
    sections: [
      {
        id: 'how',
        title: 'How it works',
        body: (
          <ol>
            <li>
              In <b>New resume</b>, choose <b>Write with AI</b>.
            </li>
            <li>
              Add the role you are applying for, then write about yourself the
              way you would tell a friend: where you study, internships,
              projects, numbers and skills. Rough notes are fine.
            </li>
            <li>
              Pick a template and check the draft in the preview. Create it,
              then edit anything in the editor like any other resume.
            </li>
          </ol>
        ),
      },
      {
        id: 'facts',
        title: 'It only uses what you write',
        body: (
          <p>
            The AI turns your notes into resume bullets and sections. It never
            adds an employer, a date, a number or a skill you did not mention,
            so the more specific your notes, the stronger the draft. Your name
            and email come from your account and are never sent to the AI.
          </p>
        ),
      },
      {
        id: 'limits',
        title: 'How many you get',
        body: (
          <p>
            Free includes one AI-written resume per account, to try it. Season
            Pass and Pro include 30 a month, and with your own AI key there is
            no limit. Writing and editing resumes yourself is always free.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'ai-tailoring',
    title: 'Tailoring with AI',
    group: 'AI',
    summary:
      'Tailor a resume to a job post, then approve every change before it is applied.',
    sections: [
      {
        id: 'jobs',
        title: 'Add a job',
        body: (
          <p>
            Paste a job description or its URL on the <b>Jobs</b> page or from
            the editor. The AI reads the title and the must-have and
            nice-to-have requirements, and the job is saved for later.
          </p>
        ),
      },
      {
        id: 'tailor',
        title: 'Tailor to a job',
        body: (
          <>
            <p>
              Open <b>Improve with AI</b>, choose the job, optionally say what
              to focus on, and start. The AI reorders, trims and rephrases your
              resume for that job. This can take a minute or two; if you reload
              the page, the finished suggestion waits for you in the panel.
            </p>
            <p>
              Use <b>Quick changes</b> such as "Make every bullet start with a
              verb", or type any request in the chat box. Select a bullet to
              edit just that one.
            </p>
          </>
        ),
      },
      {
        id: 'review',
        title: 'Apply or review changes',
        body: (
          <>
            <p>
              Suggestions arrive as a list of separate changes. Choose{' '}
              <b>Apply all</b> to take them at once, with an Undo button right
              after, or <b>Review changes</b> to see each one with its reason.
              Removed words are struck through in red and new words underlined
              in green. Untick anything you don't want, then apply the rest as a
              new version.
            </p>
            <p>
              If a change mentions something that isn't in your resume or
              profile, it is flagged, for example{' '}
              <i>Not found in your profile: Kafka</i>. Apply all leaves flagged
              changes out; only accept one if it is true.
            </p>
          </>
        ),
      },
      {
        id: 'coverage',
        title: 'Job coverage',
        body: (
          <p>
            For a chosen job, the panel shows which requirements your resume
            already covers, which are only in your profile and could be added,
            and which you don't have.
          </p>
        ),
      },
      {
        id: 'cost',
        title: 'What a run costs',
        body: (
          <p>
            Each suggestion shows the model that wrote it and what it cost.
            Settings lists your recent AI runs and this month's total, and AI
            credits are explained in{' '}
            <DocLink slug="plans">Plans and limits</DocLink>.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'ai-privacy',
    title: 'Hide from AI',
    group: 'AI',
    summary:
      'Keep personal details out of every AI request, while your resume still shows them.',
    sections: [
      {
        id: 'always',
        title: 'Always hidden',
        body: (
          <p>
            Your email address and phone number are never sent to an AI model.
            The AI never needs them to improve a resume.
          </p>
        ),
      },
      {
        id: 'your-choice',
        title: 'Hidden when you choose',
        body: (
          <p>
            Use the lock button next to your name, location, each link and each
            company name. Locked values are replaced with placeholders like{' '}
            <code>[company 1]</code> before the request leaves our server, and
            the real values are put back when the answer arrives.
          </p>
        ),
      },
      {
        id: 'limits',
        title: "What it can't hide",
        body: (
          <ul>
            <li>Importing a file: the AI has to read the file to import it.</li>
            <li>
              LaTeX resumes: values are hidden if they are locked in your
              profile and written the same way in your LaTeX. Emails and most
              phone numbers are always caught.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    slug: 'own-ai-key',
    title: 'Use your own AI key',
    group: 'AI',
    summary:
      'Bring an OpenAI, Anthropic or OpenRouter key and AI limits no longer apply.',
    sections: [
      {
        id: 'before',
        title: 'Before you start',
        body: (
          <>
            <p>
              You need an account with at least one of these providers, with
              billing or credit set up, and an API key from its dashboard:
            </p>
            <ul>
              <li>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenAI
                </a>
                : GPT models, billed by OpenAI.
              </li>
              <li>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  Anthropic
                </a>
                : Claude models, billed by Anthropic.
              </li>
              <li>
                <a
                  href="https://openrouter.ai/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenRouter
                </a>
                : one key for models from many companies, billed by OpenRouter.
              </li>
            </ul>
            <p>
              You can save a key for all three. Only one is used at a time, and
              you can switch whenever you like.
            </p>
          </>
        ),
      },
      {
        id: 'add',
        title: 'Add a key',
        body: (
          <>
            <ol>
              <li>
                Go to <b>Settings</b>, then <b>AI provider</b>.
              </li>
              <li>
                On the provider's card, choose <b>Add key</b> and paste your API
                key.
              </li>
              <li>
                Optionally pick a model. Leave it empty to use our recommended
                models for that provider.
              </li>
              <li>
                Choose <b>Test and save</b>. We send the provider one tiny
                request to check the key works before anything is stored.
              </li>
            </ol>
            <Flow caption="What happens when you add a key">
              <FlowNode kind="start">
                Settings, AI provider, then <b>Add key</b> on a provider's card
              </FlowNode>
              <FlowArrow />
              <FlowNode>
                Paste your API key, and a model if you want one
              </FlowNode>
              <FlowArrow />
              <FlowNode kind="question">
                We send the provider a tiny test request. Does it pass?
              </FlowNode>
              <FlowBranches>
                <FlowBranch label="Yes">
                  <FlowNode kind="end">
                    The key is encrypted, saved and turned on
                  </FlowNode>
                  <FlowArrow />
                  <FlowNode kind="end">
                    Any other saved key turns off, but stays saved
                  </FlowNode>
                </FlowBranch>
                <FlowBranch label="No">
                  <FlowNode kind="end">
                    Nothing is saved, and you see what went wrong
                  </FlowNode>
                  <FlowArrow />
                  <FlowNode>
                    Fix the key or model and choose <b>Test and save</b> again
                  </FlowNode>
                </FlowBranch>
              </FlowBranches>
            </Flow>
          </>
        ),
      },
      {
        id: 'which-key',
        title: 'Which key runs a request',
        body: (
          <>
            <p>
              Every AI request, whether tailoring, an import, a draft or an
              inline edit, checks your keys first:
            </p>
            <Flow caption="How each AI request is routed">
              <FlowNode kind="start">
                You tailor, import, draft or ask AI to edit
              </FlowNode>
              <FlowArrow />
              <FlowNode kind="question">
                Is one of your keys turned on?
              </FlowNode>
              <FlowBranches>
                <FlowBranch label="Yes">
                  <FlowNode>
                    Runs on that key, with your chosen model or the provider's
                    defaults
                  </FlowNode>
                  <FlowArrow />
                  <FlowNode kind="end">
                    Billed by your provider. Plan AI limits don't apply.
                  </FlowNode>
                </FlowBranch>
                <FlowBranch label="No">
                  <FlowNode>Runs on {site.name}'s own AI</FlowNode>
                  <FlowArrow />
                  <FlowNode kind="end">
                    Counts toward your plan's AI limits
                  </FlowNode>
                </FlowBranch>
              </FlowBranches>
            </Flow>
            <p>
              If the provider refuses a request, for example because the key ran
              out of credit, the request stops and tells you why. It doesn't
              quietly switch to your plan.
            </p>
          </>
        ),
      },
      {
        id: 'models',
        title: 'Pick a model',
        body: (
          <>
            <p>
              The model box on each card is searchable and lists the models your
              key can use. You can also type any model ID. A model you choose is
              used for every AI step, and we test it with your key before saving
              it. Use <b>Edit model</b> to change it later; models you have used
              before stay in the list.
            </p>
            <p>With the model left empty, these defaults are used:</p>
            <div className="docs-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Provider</th>
                    <th scope="col">Quick steps (imports, job posts, edits)</th>
                    <th scope="col">Tailoring</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>OpenAI</td>
                    <td>
                      <code>gpt-5.4-mini</code>
                    </td>
                    <td>
                      <code>gpt-5.5</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Anthropic</td>
                    <td>
                      <code>claude-haiku-4-5</code>
                    </td>
                    <td>
                      <code>claude-sonnet-5</code>
                    </td>
                  </tr>
                  <tr>
                    <td>OpenRouter</td>
                    <td>
                      <code>openai/gpt-5.4-mini</code>
                    </td>
                    <td>
                      <code>anthropic/claude-sonnet-5</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Small models can return changes that don't fit your resume. If a
              run comes back empty or off, try a stronger model.
            </p>
          </>
        ),
      },
      {
        id: 'switch',
        title: 'Switch providers or go back to your plan',
        body: (
          <ul>
            <li>
              <b>Switch provider:</b> turn on <b>Use this key</b> on another
              card. Your other keys turn off but stay saved.
            </li>
            <li>
              <b>Use your plan again:</b> turn off the active key. Requests run
              on your plan and its limits until you turn a key back on.
            </li>
            <li>
              <b>Change a key:</b> choose <b>Replace key</b> on its card. The
              new key is tested before the old one is replaced.
            </li>
            <li>
              <b>Delete a key:</b> choose <b>Remove key</b>. If it was the
              active one, requests go back to your plan.
            </li>
          </ul>
        ),
      },
      {
        id: 'what-changes',
        title: 'What changes on your own key',
        body: (
          <ul>
            <li>
              AI requests run on your key and are billed by your provider.
            </li>
            <li>
              Plan limits on AI tailoring, edits, imports and drafts stop
              applying.
            </li>
            <li>
              <b>AI runs</b> in the same tab lists each request and its cost.
              Costs show as "Unknown" for models we don't have prices for; your
              provider's dashboard has the exact figure.
            </li>
          </ul>
        ),
      },
      {
        id: 'troubleshooting',
        title: 'If something goes wrong',
        body: (
          <div className="docs-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">You see</th>
                  <th scope="col">What to do</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>The provider rejected this key</td>
                  <td>
                    Copy the whole key again, and check it hasn't been revoked
                    in the provider's dashboard.
                  </td>
                </tr>
                <tr>
                  <td>This key can't use that model</td>
                  <td>
                    Check the model ID, pick one from the list, or leave the
                    model empty to use the defaults.
                  </td>
                </tr>
                <tr>
                  <td>Out of credit or rate limited</td>
                  <td>
                    Add credit with the provider, or wait a minute and try
                    again.
                  </td>
                </tr>
                <tr>
                  <td>Your saved key can't be read anymore</td>
                  <td>Remove the key and add it again.</td>
                </tr>
                <tr>
                  <td>The model list doesn't load</td>
                  <td>Type the model ID directly; it is still tested.</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: 'security',
        title: 'How your keys are kept',
        body: (
          <p>
            Keys are encrypted before they are stored, and only their last four
            characters are ever shown back. They are never included in exports
            or logs, and they are only sent to the provider they belong to.
            Remove them any time from the same page.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'ats-checker',
    title: 'ATS checker',
    group: 'Check and share',
    summary:
      'See how an applicant tracking system will read your resume, and exactly what to fix.',
    sections: [
      {
        id: 'where',
        title: 'Where to find it',
        body: (
          <p>
            In the editor, open <b>Improve with AI</b> and use{' '}
            <b>Test your resume</b>, optionally against a saved job. Anyone can
            also use the free <Link to="/ats-checker">ATS checker</Link> page
            with a PDF or pasted text. The text is checked and not stored.
          </p>
        ),
      },
      {
        id: 'what-ats-do',
        title: 'What an ATS really does',
        body: (
          <p>
            There is no universal ATS score. Real systems read your resume into
            fields, recruiters search those fields, and many rank applicants for
            each job. They rarely reject a resume on their own; what filters
            people is a resume that doesn't read cleanly, missing must-have
            skills, and knockout questions such as work authorisation. So that
            is what we check.
          </p>
        ),
      },
      {
        id: 'score',
        title: 'How the score works',
        body: (
          <>
            <p>
              The score uses fixed rules, not AI, so the same resume always gets
              the same score. Each check passes (full points), warns (half) or
              fails (none).
            </p>
            <div className="docs-table">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Points</th>
                    <th>With a job</th>
                    <th>What it checks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Parsing and format</td>
                    <td>20</td>
                    <td>15</td>
                    <td>
                      How well a parser reads your PDF: columns, contact details
                      in page headers, icon characters, scanned pages,
                      consistent dates, file name and size, links hidden behind
                      icons, tiny or off-page text
                    </td>
                  </tr>
                  <tr>
                    <td>Contact details</td>
                    <td>15</td>
                    <td>10</td>
                    <td>
                      Email, phone, location, LinkedIn or portfolio, a
                      professional email address
                    </td>
                  </tr>
                  <tr>
                    <td>Standard sections</td>
                    <td>15</td>
                    <td>15</td>
                    <td>
                      Experience, education, skills, standard headings, section
                      order for your stage, gaps over six months between roles
                    </td>
                  </tr>
                  <tr>
                    <td>Impact and content</td>
                    <td>35</td>
                    <td>25</td>
                    <td>
                      Action verbs, numbers in bullets, bullet length, no "I",
                      no filler, varied verbs, no keyword stuffing
                    </td>
                  </tr>
                  <tr>
                    <td>Length</td>
                    <td>15</td>
                    <td>10</td>
                    <td>
                      About 300 to 900 words, and the real page count of an
                      uploaded PDF
                    </td>
                  </tr>
                  <tr>
                    <td>Job match</td>
                    <td>0</td>
                    <td>25</td>
                    <td>
                      Must-have skills, other skills, job title, the title in
                      your headline, acronyms written out
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Each problem shows the lines from your resume behind it, with the
              word to change highlighted, and a before and after example.
            </p>
          </>
        ),
      },
      {
        id: 'job-match',
        title: 'Job match',
        body: (
          <p>
            Skills are matched against a list of 774 skills and their common
            names (JS for JavaScript, k8s for Kubernetes), built from O*NET,
            ESCO and our own list. Must-have skills count three times, other
            hard skills twice and soft skills once. The job title check knows
            that SDE II and Software Engineer are the same role.
          </p>
        ),
      },
      {
        id: 'knockouts',
        title: 'Requirements a recruiter will check',
        body: (
          <p>
            With a job, the report lists its hard requirements, such as years of
            experience, degree, location, visa, notice period and
            certifications, each marked Met, Not met, Unclear or Not on your
            resume. They don't change your score, but they tell you what to
            mention or be ready to answer.
          </p>
        ),
      },
      {
        id: 'report',
        title: 'Reading the report',
        body: (
          <p>
            Fixes come first, then how a parser read your resume, the job match
            and the score breakdown. Use <b>Fix with AI</b> to send the fixes to
            the AI editor, and <b>Download PDF</b> on the public page to keep a
            copy.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'versions',
    title: 'Versions and history',
    group: 'Check and share',
    summary:
      'Every change is kept. Go back to any version and see what changed.',
    sections: [
      {
        id: 'history',
        title: 'Your history',
        body: (
          <p>
            Open <b>History</b> in the editor. Every autosave, import, applied
            AI change and restore is listed. Restoring copies an old version
            forward as a new one, so nothing is ever lost.
          </p>
        ),
      },
      {
        id: 'changes',
        title: 'See what changed',
        body: (
          <p>
            Select a version and open <b>Changes</b> to compare it with the
            version before it, or with your current version, word by word.{' '}
            <b>Preview</b> shows that version's PDF.
          </p>
        ),
      },
      {
        id: 'naming',
        title: 'Name a version',
        body: (
          <p>
            Use <b>Name it</b> to mark a checkpoint such as "Sent to Google",
            and turn on <b>Named versions only</b> to find it quickly.
          </p>
        ),
      },
      {
        id: 'deleted',
        title: 'Deleted resumes',
        body: (
          <p>
            Deleting a resume removes it from your workspace straight away. We
            keep it for 30 days in case you deleted it by mistake (email{' '}
            {site.contactEmail} to get it back), then remove it for good. To
            hide a resume without deleting it, archive it instead.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'sharing',
    title: 'Share links',
    group: 'Check and share',
    summary:
      'Send a link instead of an attachment and see when, where and how often it is opened.',
    sections: [
      {
        id: 'create',
        title: 'Create a link',
        body: (
          <p>
            Open <b>Share</b> in the editor and create a link. Give it a name
            such as <code>backend-roles</code>, or leave it empty to use the
            resume's name. The link looks like{' '}
            <code>{site.displayDomain}/your-name/backend-roles</code>.
          </p>
        ),
      },
      {
        id: 'options',
        title: 'Link options',
        body: (
          <ul>
            <li>
              <b>Pin this version</b>: show exactly this version, or turn it off
              to always show your latest edits. You can switch any time.
            </li>
            <li>
              <b>Phone and email</b>: hidden by default, so strangers can't
              scrape them. Choose <b>Shown</b> to show them to everyone. On
              Season Pass or Pro, <b>Password</b> lets anyone read the resume
              but only people with the contact password see your phone and
              email, on the page and in the PDF. If your plan ends, they stay
              hidden.
            </li>
            <li>
              <b>List on my public profile</b>: show it on your profile page, or
              keep it unlisted.
            </li>
            <li>An optional password and an expiry date.</li>
          </ul>
        ),
      },
      {
        id: 'analytics',
        title: 'Who opened it',
        body: (
          <p>
            Each link shows its views, the number of people, where they came
            from, their approximate city, region and country, and their device.
            The <b>Analytics</b> page adds them up across all your links, with
            your top sources, countries, cities and devices. Your own views
            while signed in aren't counted, and we never store visitors' IP
            addresses.
          </p>
        ),
      },
      {
        id: 'detailed-analytics',
        title: 'Detailed analytics',
        body: (
          <p>
            With the Season Pass or Pro, the <b>Analytics</b> page also shows
            which weekdays and hours your links get opened, in your time zone,
            and compares your links side by side: views, how often someone
            opened the same link again on the same day, its top source and its
            views per day. <b>Download CSV</b> saves every view in the chosen
            range. Visitors stay anonymous: we can't tell you who opened a link
            or which company they work for.
          </p>
        ),
      },
      {
        id: 'turn-off',
        title: 'Turn a link off',
        body: (
          <p>
            <b>Turn off this link</b> makes it show a not found page straight
            away. Changing your username doesn't break links: old usernames keep
            redirecting.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'plans',
    title: 'Plans and limits',
    group: 'Account',
    summary:
      'Writing, downloading and sharing are free. Plans only raise AI limits.',
    sections: [
      {
        id: 'plans',
        title: 'Plans',
        body: (
          <div className="docs-table">
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Price</th>
                  <th>AI-tailored resumes</th>
                  <th>AI edits</th>
                  <th>AI imports</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Free</td>
                  <td>₹0</td>
                  <td>5 in the first week, then 1 a month</td>
                  <td>50 a month</td>
                  <td>Free</td>
                </tr>
                <tr>
                  <td>Season Pass</td>
                  <td>₹499 once, for 6 months</td>
                  <td>40 a month</td>
                  <td>1,000 a month</td>
                  <td>Free</td>
                </tr>
                <tr>
                  <td>Pro</td>
                  <td>₹129 a month</td>
                  <td>60 a month</td>
                  <td>1,000 a month</td>
                  <td>Free</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: 'free',
        title: 'Free on every plan',
        body: (
          <p>
            Unlimited resumes you write yourself, every template, both editors,
            PDF downloads, share links and analytics, version history, the ATS
            checker and importing from a file.
          </p>
        ),
      },
      {
        id: 'codes',
        title: 'Promo and ambassador codes',
        body: (
          <p>
            Got a code from a campus ambassador, a college club or us? Open{' '}
            <Link to="/billing">Plans and billing</Link>, enter it under "Have a
            code?" and press Redeem. The plan it gives starts right away. A link
            with the code in it fills the box for you. Each account can redeem
            one code, and a code can't be used on an account that already has a
            paid plan.
          </p>
        ),
      },
      {
        id: 'counting',
        title: 'How AI use is counted',
        body: (
          <ul>
            <li>Tailoring a resume to a job counts as one tailored resume.</li>
            <li>
              Chat requests, bullet edits and LaTeX fixes count as AI edits.
            </li>
            <li>
              Imports are free on every plan, with a fair-use cap that only
              stops abuse.
            </li>
            <li>
              Limits reset at the start of each calendar month. With{' '}
              <DocLink slug="own-ai-key">your own AI key</DocLink>, none of them
              apply.
            </li>
          </ul>
        ),
      },
      {
        id: 'billing',
        title: 'Billing',
        body: (
          <p>
            The Season Pass is one payment and never renews on its own. Pro
            renews monthly until you cancel, and stays active until the end of
            the month you paid for. Payments are handled by Razorpay; we never
            see your card or UPI details. To upgrade, see what you have used, or
            cancel Pro, open <b>Plans and billing</b> in the sidebar.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'account',
    title: 'Account and data',
    group: 'Account',
    summary:
      'Your username, your data, and how to take it with you or delete it.',
    sections: [
      {
        id: 'username',
        title: 'Username and profile page',
        body: (
          <p>
            Your username is part of every share link and your public profile at{' '}
            <code>{site.displayDomain}/your-name</code>. Change it in Settings;
            your old one keeps redirecting so links you sent still work.
          </p>
        ),
      },
      {
        id: 'export-delete',
        title: 'Export or delete everything',
        body: (
          <p>
            Settings lets you download all your data as a JSON file, or delete
            your account and everything in it. Deleting can't be undone.
          </p>
        ),
      },
      {
        id: 'storage',
        title: 'Where your data lives',
        body: (
          <p>
            Your data is stored on servers in India and encrypted in transit.
            Database backups are encrypted before they leave the server. Read
            the full <Link to="/privacy">privacy policy</Link>.
          </p>
        ),
      },
      {
        id: 'theme',
        title: 'Theme',
        body: (
          <p>
            {site.name} opens in light mode. Switch to dark or follow your
            system from the account menu.
          </p>
        ),
      },
      {
        id: 'help',
        title: 'Getting help',
        body: (
          <p>
            Email{' '}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> with
            questions about your account, billing or data.
          </p>
        ),
      },
    ],
  },
]

export function DocLink({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  return (
    <Link to="/docs/$slug" params={{ slug }}>
      {children}
    </Link>
  )
}

export const findDoc = (slug: string) => docs.find((doc) => doc.slug === slug)
