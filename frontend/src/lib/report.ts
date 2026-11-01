export type ReportedError = {
  message: string
  code?: string
  status?: number
  path?: string
}

let opener: ((error?: ReportedError) => void) | null = null
let lastApiError: ReportedError | null = null

// The report dialog registers itself here so toasts and error pages can open it.
export function setReportOpener(open: typeof opener) {
  opener = open
  return () => {
    if (opener === open) opener = null
  }
}

export const canReport = () => opener !== null

// A toast only has the message, so the code and API path come from the last failed call with that message.
export function openReport(message?: string) {
  opener?.(
    message === undefined
      ? undefined
      : lastApiError?.message === message
        ? lastApiError
        : { message },
  )
}

export function rememberApiError(error: ReportedError) {
  lastApiError = error
}
