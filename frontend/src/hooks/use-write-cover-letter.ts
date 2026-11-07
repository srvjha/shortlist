import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api, unwrap } from '@/lib/api/client'
import { aiErrorMessage } from '@/lib/api/errors'
import { queryKeys } from '@/lib/api/queries'
import { toast } from '@/lib/toast'

// Writes a cover letter for a saved resume and job, then opens it to read and edit.
export function useWriteCoverLetter() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (input: { resumeId: string; jobId: string }) =>
      unwrap(api.POST('/v1/letters', { body: { kind: 'cover', ...input } })),
    onSuccess: (letter) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.letters })
      void navigate({
        to: '/letters/$letterId',
        params: { letterId: letter.id },
      })
    },
    onError: (error) => toast.error(aiErrorMessage(error)),
  })
}
