/** Words separated by whitespace, counted the same way as metis-api, which enforces `maxWords` when saving. */
export function countWords(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}
