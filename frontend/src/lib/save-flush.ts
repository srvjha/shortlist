// What a download does next while it waits for the editor to save what's on screen.
export function flushStep({
  unsaved,
  saving,
  failed,
}: {
  unsaved: boolean
  saving: boolean
  failed: boolean
}) {
  if (saving) return 'wait'
  if (!unsaved) return 'done'
  return failed ? 'fail' : 'save'
}
