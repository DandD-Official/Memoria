import { describe, expect, it } from "vitest";
import { speechChunks, speechSentences, speechText } from "@/lib/speech-text";

describe("read aloud text", () => {
  it("keeps note headings, links, list text and table values without reading formatting", () => {
    const text = speechText("## Recall\n\n**Connect** an [idea](https://example.com).\n\n- [x] Try it\n\n| Habit | Purpose |\n| --- | --- |\n| Recall | Learn |\n");
    expect(text).toContain("Recall"); expect(text).toContain("Connect an idea."); expect(text).toContain("Try it"); expect(text).toContain("Learn");
    expect(text).not.toMatch(/https:|\*|\[x\]|---|##/);
  });
  it("reads nested MMD labels and explanations while skipping SVG and diagram source", () => {
    const source = ':::section{title="Cells"}\n:::definition{term="Mitosis"}\nCells divide.\n:::\n:::svg{alt="A cell" caption="Cell structure"}\n<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L20 20" /></svg>\n:::\n:::diagram{id="private-id"}\n:::\n:::';
    const text = speechText(source);
    expect(text).toContain("Cells"); expect(text).toContain("Mitosis"); expect(text).toContain("Cells divide."); expect(text).toContain("Cell structure");
    expect(text).not.toMatch(/svg|xmlns|path|M0|private-id|:::/);
  });
  it("omits raw SVG markup while retaining the surrounding note", () => {
    expect(speechText('Before.\n<svg><text>internal label</text></svg>\nAfter.')).toBe("Before.\n\nAfter.");
  });
});

describe("long note playback", () => {
  it("queues all the words of a long note in bounded utterances", () => {
    const text = "Remember this connection and explain it in your own words. ".repeat(300).trim();
    const chunks = speechChunks(text);
    expect(chunks.length).toBeGreaterThan(100);
    expect(chunks.every(chunk => chunk.length > 0 && chunk.length <= 280)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
  });
  it("handles empty notes and unbroken strings without cutting a surrogate pair", () => {
    expect(speechChunks("  \n")).toEqual([]);
    const text = "🧠".repeat(100);
    const chunks = speechChunks(text, 11);
    expect(chunks.join("")).toBe(text);
    expect(chunks.every(chunk => chunk.length <= 11 && !/[\uD800-\uDBFF]$/.test(chunk))).toBe(true);
  });
});

describe("sentence pacing", () => {
  it("keeps abbreviations, decimals, quotations, and complete sentences together", () => {
    expect(speechSentences('Dr. Chen measured 3.14 cm. "Is that right?" Yes, it is.')).toEqual(['Dr. Chen measured 3.14 cm.', '"Is that right?"', 'Yes, it is.']);
    expect(speechChunks('Dr. Chen measured 3.14 cm. "Is that right?" Yes, it is.')).toEqual(['Dr. Chen measured 3.14 cm.', '"Is that right?"', 'Yes, it is.']);
  });
  it("reads headings, list items, and non-Latin sentences separately", () => {
    expect(speechSentences("Heading\n\nFirst item\nSecond item\n\n你好。第二句！", "zh")).toEqual(["Heading", "First item", "Second item", "你好。", "第二句！"]);
  });
  it("uses a clause boundary before cutting a long sentence into words", () => {
    expect(speechChunks("Recall the idea carefully, then explain it clearly to someone.", 36)).toEqual(["Recall the idea carefully,", "then explain it clearly to someone."]);
  });
  it("handles sentence boundaries when Intl.Segmenter is unavailable", () => {
    const original = Intl.Segmenter;
    try {
      Object.defineProperty(Intl, "Segmenter", { configurable: true, value: undefined });
      expect(speechSentences("Dr. Chen used 3.14. What next?" )).toEqual(["Dr. Chen used 3.14.", "What next?"]);
    } finally { Object.defineProperty(Intl, "Segmenter", { configurable: true, value: original }); }
  });
  it("distinguishes mathematical operators from Markdown formatting and HTML", () => {
    expect(speechText("**Multiply** 2 * 3 = 6. x < y and y > z.\n\n`user_name`\n\nH₂O and x²." )).toBe("Multiply 2 times 3 equals 6. x less than y and y greater than z.\n\nuser underscore name\n\nH subscript 2 O and x squared.");
  });
});
