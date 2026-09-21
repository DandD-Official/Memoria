import { BuilderElement, ExternalHyperlink, InternalHyperlink, LineRuleType, Paragraph, TextRun } from "docx";
import { lineBoxTop, lineBoxWidth, wordSafeFont, type TextLine } from "./text-lines";

/** A floating shape RUN, not a body paragraph. All runs share their page's anchor. */
export function wordLine(line: TextLine, id: string): TextRun {
  const children = line.runs.map(item => {
    const run = new TextRun({
      text: item.text, font: wordSafeFont(item.font), size: Math.round(item.size * 1.5),
      color: item.color, bold: item.bold, italics: item.italic,
      underline: item.underline ? {} : undefined, scale: Math.round(line.scale),
      characterSpacing: item.letterSpacing ? Math.round(item.letterSpacing * 15) : undefined,
      snapToGrid: false,
    });
    return item.targetPage
      ? new InternalHyperlink({ anchor: `page_${item.targetPage}`, children: [run] })
      : item.href && /^https?:\/\//i.test(item.href)
        ? new ExternalHyperlink({ link: item.href, children: [run] }) : run;
  });
  const paragraph = new Paragraph({
    spacing: { before: 0, after: 0, line: Math.max(15, Math.round(line.height * 15)), lineRule: LineRuleType.EXACT },
    widowControl: false, autoSpaceEastAsianText: false, children,
  });
  const box = new BuilderElement({
    name: "v:textbox",
    attributes: { inset: { key: "inset", value: "0,0,0,0" }, style: { key: "style", value: "mso-fit-shape-to-text:t" } },
    children: [new BuilderElement({ name: "w:txbxContent", children: [paragraph] })],
  });
  const shape = new BuilderElement({
    name: "v:shape",
    attributes: {
      id: { key: "id", value: id }, type: { key: "type", value: "#_x0000_t202" },
      filled: { key: "filled", value: "f" }, stroked: { key: "stroked", value: "f" },
      style: { key: "style", value: [
        "position:absolute", `left:${line.x * .75}pt`, `top:${lineBoxTop(line) * .75}pt`,
        `width:${lineBoxWidth(line) * .75}pt`, `height:${line.height * .75}pt`,
        "mso-position-horizontal-relative:page", "mso-position-vertical-relative:page",
        "mso-wrap-style:none", "v-text-anchor:top", "z-index:1",
      ].join(";") },
    }, children: [box],
  });
  return new TextRun({ children: [new BuilderElement({ name: "w:pict", children: [shape] })] });
}
