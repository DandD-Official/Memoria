export function escapeMmdAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildMediaImageBlock(input: { mediaId: string; alt: string; caption?: string }): string {
  const caption = input.caption ? ` caption="${escapeMmdAttribute(input.caption)}"` : "";
  return `:::image{src="media://${escapeMmdAttribute(input.mediaId)}" alt="${escapeMmdAttribute(input.alt)}"${caption}}\n:::`;
}
