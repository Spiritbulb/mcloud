// Pure text chunker for RAG. Deterministic, no I/O. Splits on whitespace into
// ~`size`-char windows with `overlap`-char overlap, preferring word boundaries.
export function chunk(
  text: string,
  opts: { size?: number; overlap?: number } = {},
): string[] {
  const size = opts.size ?? 1200
  const overlap = opts.overlap ?? 150
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)
    // back off to the last space before `end` to avoid splitting a word
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end)
      if (lastSpace > start) end = lastSpace
    }
    const piece = clean.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= clean.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return chunks
}
