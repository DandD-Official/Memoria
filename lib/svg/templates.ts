export type StudyVisualTemplate = "concept-card" | "process-flow" | "comparison";

function escapeXml(value: string): string {
  return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[char] ?? char));
}

function lines(value: string, max = 72): string[] {
  const words = value.trim().split(/\s+/);
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > max && current) { result.push(current); current = word; }
    else current = `${current} ${word}`.trim();
  }
  if (current) result.push(current);
  return result.slice(0, 5);
}

function textLines(value: string, x: number, y: number, size = 20): string {
  return lines(value).map((line, index) => `<text x="${x}" y="${y + index * (size + 8)}" font-family="Inter,Arial,sans-serif" font-size="${size}" fill="#352b22">${escapeXml(line)}</text>`).join("");
}

export function buildStudyVisualSvg(input: { title: string; purpose: string; template: StudyVisualTemplate }): string {
  const title = escapeXml(input.title.trim() || "Study visual");
  const purpose = input.purpose.trim() || "A visual summary";
  const heading = `<text x="40" y="48" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700" fill="#352b22">${title}</text>`;
  let body = "";
  if (input.template === "process-flow") {
    const steps = lines(purpose, 22).slice(0, 4);
    body = steps.map((step, index) => { const x = 40 + index * 205; return `<g><rect x="${x}" y="120" width="165" height="100" rx="14" fill="#fffaf0" stroke="#9b7653" stroke-width="2"/><text x="${x + 82}" y="155" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="15" fill="#352b22">${escapeXml(step)}</text>${index < steps.length - 1 ? `<path d="M${x + 165} 170 H${x + 195}" stroke="#c2764a" stroke-width="3" marker-end="url(#arrow)"/>` : ""}</g>`; }).join("");
  } else if (input.template === "comparison") {
    body = `<rect x="40" y="100" width="390" height="300" rx="16" fill="#fffaf0" stroke="#9b7653" stroke-width="2"/><rect x="470" y="100" width="390" height="300" rx="16" fill="#f4eee5" stroke="#9b7653" stroke-width="2"/><text x="235" y="140" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="700" fill="#352b22">Key idea</text><text x="665" y="140" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="700" fill="#352b22">Contrast</text>${textLines(purpose, 70, 190, 18)}${textLines("Compare the defining property, trade-off, or outcome.", 500, 190, 18)}`;
  } else {
    body = `<rect x="40" y="100" width="820" height="300" rx="20" fill="#fffaf0" stroke="#9b7653" stroke-width="2"/><circle cx="105" cy="170" r="34" fill="#c2764a"/><text x="105" y="179" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="700" fill="white">i</text>${textLines(purpose, 170, 165, 21)}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 460" role="img" aria-labelledby="title"><title id="title">${title}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#c2764a"/></marker></defs>${heading}${body}</svg>`;
}
