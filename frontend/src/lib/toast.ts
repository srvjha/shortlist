import { toast as sonner } from 'sonner'
import { canReport, openReport } from './report'

// Every error toast gets a Report button, unless it already has its own action.
const error: typeof sonner.error = (message, data) =>
  sonner.error(
    message,
    canReport() && !data?.action
      ? {
          ...data,
          action: {
            label: 'Report',
            onClick: () => openReport(String(message)),
          },
        }
      : data,
  )

export const toast = Object.assign(
  (...args: Parameters<typeof sonner>) => sonner(...args),
  sonner,
  { error },
)
