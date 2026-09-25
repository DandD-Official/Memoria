/** Isolates local SVG references so two figures cannot steal each other's gradients or markers. Call after sanitization. */
export function namespaceSvgIds(markup: string, prefix: string): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = new Map([...markup.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], `figure-${safePrefix}-${match[1]}`]));
  return markup
    .replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${ids.get(id)}"`)
    .replace(/url\(\s*#([\w:.-]+)\s*\)/g, (value, id: string) => ids.has(id) ? `url(#${ids.get(id)})` : value)
    .replace(/\bhref="#([^"]+)"/g, (value, id: string) => ids.has(id) ? `href="#${ids.get(id)}"` : value)
    .replace(/\baria-labelledby="([^"]+)"/g, (_, values: string) => `aria-labelledby="${values.split(/\s+/).map(id => ids.get(id) || id).join(" ")}"`);
}
