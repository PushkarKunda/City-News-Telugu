/**
 * Shared avatar-initials utility.
 *
 * getInitials('John Doe')   → 'JD'
 * getInitials('john')       → 'J'
 * getInitials('  rahul  ')  → 'R'
 * getInitials('రాము కుమార్')   → 'రక'  (works for Telugu & other non-Latin scripts)
 * getInitials('')           → 'U'    (fallback)
 *
 * Notes:
 * - Uses Array.from() so surrogate pairs (emoji, rare scripts) don't break.
 * - Does NOT strip non-ASCII characters (the old inline regex in
 *   CommentsModal turned every Telugu name into 'U').
 */
export function getInitials(name?: string | null, fallback = 'U'): string {
  if (!name || typeof name !== 'string') return fallback;

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;

  const letters = words
    .slice(0, 2)
    .map((word) => {
      const chars = Array.from(word);
      // Skip leading punctuation/symbols (e.g. "'John" or "@user")
      const firstLetter = chars.find((c) => /[\p{L}\p{N}]/u.test(c));
      return firstLetter ?? '';
    })
    .filter(Boolean);

  if (letters.length === 0) return fallback;

  return letters.join('').toLocaleUpperCase();
}
