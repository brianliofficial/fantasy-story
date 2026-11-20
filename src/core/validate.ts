import type { GameEventConfig } from './types'

export function eventError(event: GameEventConfig): string | null {
  if (!event.title.trim()) return 'Write a title.'
  if (!event.description.trim()) return 'Write what happens.'
  if (event.minAge != null && event.maxAge != null && event.minAge > event.maxAge) return 'The minimum age cannot be higher than the maximum.'
  if (event.options.length === 0) return 'Add at least one option.'
  if (event.options.some((option) => !option.text.trim())) return 'Every option needs button text.'
  if (event.options.some((option) => !option.success.log.trim())) return 'Every option needs a success log.'
  if (event.options.some((option) => (option.checkStat || option.checkLuck) && !option.failure?.log.trim())) {
    return 'A check needs a failure log.'
  }
  return null
}
