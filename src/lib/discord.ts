export function formatCaptainDiscordDisplay(
  username: string | null | undefined,
  isEnglish: boolean
): string {
  if (!username?.trim()) {
    return isEnglish ? 'Captain: not registered' : 'Kaptein: ikke registrert'
  }

  const handle = username.startsWith('@') ? username : `@${username.trim()}`
  return isEnglish ? `Captain: ${handle}` : `Kaptein: ${handle}`
}
