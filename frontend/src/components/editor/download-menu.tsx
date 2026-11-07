import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronDownIcon, DownloadIcon } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { errorMessage } from '@/lib/api/client'
import { upgradeAction } from '@/lib/api/errors'
import { queryKeys, usageQuery } from '@/lib/api/queries'
import { downloadFile, fetchFile } from '@/lib/download'

export function DownloadMenu({
  resumeId,
  title,
  structured,
  saveFirst,
}: {
  resumeId: string
  title: string
  structured: boolean
  saveFirst: () => Promise<void>
}) {
  const queryClient = useQueryClient()
  const { data: usage } = useQuery(usageQuery)
  const pdfsLeft = usage?.pdf
    ? Math.max(0, usage.pdf.limit - usage.pdf.used)
    : null
  async function download(path: string, extension: string) {
    try {
      await saveFirst()
      await downloadFile(
        `/v1/resumes/${resumeId}/${path}`,
        `${title.trim() || 'resume'}.${extension}`,
      )
    } catch (error) {
      toast.error(errorMessage(error), upgradeAction(error))
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.usage })
    }
  }
  async function copyLatex() {
    try {
      // A promised ClipboardItem keeps Safari's copy permission across the fetch.
      const text = saveFirst()
        .then(() => fetchFile(`/v1/resumes/${resumeId}/tex`))
        .then((response) => response.text())
        .then((tex) => new Blob([tex], { type: 'text/plain' }))
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': text }),
      ])
      toast.success('LaTeX code copied')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <DownloadIcon data-icon="inline-start" />
              Download
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Save as PDF, LaTeX or JSON</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {[
            {
              path: 'pdf?download=true',
              extension: 'pdf',
              label: 'PDF',
              hint:
                pdfsLeft === null
                  ? 'Ready to send or upload to job portals'
                  : pdfsLeft === 0
                    ? 'No free downloads left. A version you already downloaded is still free.'
                    : `${pdfsLeft} of ${usage?.pdf?.limit} free downloads left. Downloading a version again is free.`,
            },
            {
              path: 'tex',
              extension: 'tex',
              label: 'LaTeX source (.tex)',
              hint: 'Keep editing it on Overleaf',
            },
            ...(structured
              ? [
                  {
                    path: 'json-resume',
                    extension: 'json',
                    label: 'JSON Resume',
                    hint: 'Your data in an open format for other tools',
                  },
                ]
              : []),
          ].map((option) => (
            <DropdownMenuItem
              key={option.path}
              onSelect={() => download(option.path, option.extension)}
              className="flex-col items-start gap-0"
            >
              {option.label}
              <span className="text-xs text-muted-foreground">
                {option.hint}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onSelect={copyLatex}
            className="flex-col items-start gap-0"
          >
            Copy LaTeX code
            <span className="text-xs text-muted-foreground">
              Paste it straight into Overleaf
            </span>
          </DropdownMenuItem>
          {pdfsLeft === 0 && (
            <DropdownMenuItem asChild>
              <Link to="/pricing" className="font-medium text-primary">
                See plans for unlimited PDFs
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
