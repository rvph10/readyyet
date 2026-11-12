// Prisma passes contains, and equals in insensitive mode, through to ILIKE
// as is: a % or _ in the text, as in jean_dupont@, would match any character.
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}
