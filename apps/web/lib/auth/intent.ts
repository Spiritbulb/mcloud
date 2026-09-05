export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/org";
  // Must be a single-slash-rooted internal path. Reject protocol-relative
  // ("//host") and absolute ("https://host") to avoid open redirects.
  if (!raw.startsWith("/")) return "/org";
  // Reject protocol-relative ("//host") and backslash-normalized ("/\host")
  // targets — browsers normalize "\" to "/", so both become off-site redirects.
  if (raw[1] === "/" || raw[1] === "\\") return "/org";
  return raw;
}