import { describe, expect, it } from "vitest";
import { cloneLayoutWindow, fragmentPlacement } from "@/lib/export/page-fragments";

// A deliberately small DOM adapter: the geometry is supplied explicitly. These
// tests verify pruning/placement, not browser layout or raster appearance.
class ElementStub {
  style: Record<string, string | ((property: string, value: string) => void)> = {};
  children: ElementStub[] = [];
  constructor(public className: string, public textContent = "") {
    this.style.setProperty = (property, value) => { this.style[property] = value; };
  }
  append(child: ElementStub) { this.children.push(child); }
  cloneNode(deep: boolean): ElementStub {
    const clone = new ElementStub(this.className, deep ? this.textContent : "");
    if (deep) clone.children = this.children.map(child => child.cloneNode(true));
    return clone;
  }
}
type Tree = Parameters<typeof cloneLayoutWindow>[0];
const node = (name: string, top: number, height: number, children: Tree[] | null = null): Tree => ({
  element: new ElementStub(name, children ? "" : "Editable content") as unknown as HTMLElement,
  box: { left: 48, top, width: 698, height }, borderLeft: 0, borderTop: 0,
  typography: { "font-family": "Arial", "line-height": "24px" }, children,
});

describe("continuation-page geometry", () => {
  it("preserves a continuing card's design and the position of its surviving text", () => {
    const card = node("rounded-card border bg-surface", 80, 1600, [
      node("previous-paragraph", 100, 800), node("continued-paragraph", 920, 700),
    ]);
    const root = node("mmd-export-flow", 0, 1800, [card]);
    const copy = cloneLayoutWindow(root, 1000, 1800, 0) as unknown as ElementStub;
    const continuation = copy.children[0];
    expect(continuation.className).toBe("rounded-card border bg-surface");
    expect(continuation.style.height).toBe("1600px");
    expect(continuation.children).toHaveLength(1);
    expect(continuation.children[0].style.top).toBe("840px");
    expect(continuation.children[0].style.visibility).toBeUndefined();
    expect(continuation.children[0].textContent).toBe("Editable content");
  });

  it("retains both columns at their measured positions when pruning preceding blocks", () => {
    const left = node("left-column", 300, 1500, [node("text", 950, 300)]);
    const right = node("right-column", 300, 1500, [node("text", 960, 300)]);
    left.box.width = 330; right.box.left = 410; right.box.width = 330;
    const root = node("flow", 0, 1800, [node("heading", 0, 100), left, right]);
    const copy = cloneLayoutWindow(root, 900, 1800, 0) as unknown as ElementStub;
    expect(copy.children.map(child => child.style.left)).toEqual(["0px", "362px"]);
    expect(copy.children.map(child => child.style.top)).toEqual(["300px", "300px"]);
  });

  it("accounts for containing borders without adding padding twice", () => {
    expect(fragmentPlacement({ left: 65, top: 117, width: 600, height: 24 }, { left: 48, top: 100, width: 698, height: 500 }, 1, 1))
      .toEqual({ left: 16, top: 16, width: 600, height: 24 });
  });
});
