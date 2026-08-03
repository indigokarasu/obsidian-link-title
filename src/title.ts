export function extractUrl(body: string): string | null {
  const value = body.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:" ? url.href : null; } catch { return null; }
}
export function hostname(url: string): string { const host = new URL(url).hostname.toLowerCase(); return host.startsWith("www.") ? host.slice(4) : host; }
export function cleanTitle(value: string): string { return value.replace(/\s+/g, " ").replace(/[\/\\:#?%*|<>"\x00-\x1f]/g, " ").trim().replace(/\s+/g, " ").slice(0, 180); }
export function targetName(url: string, title: string): string { return `${hostname(url)} — ${cleanTitle(title)}`; }
