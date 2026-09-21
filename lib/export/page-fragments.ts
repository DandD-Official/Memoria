/** A measured layout tree. Containers keep their original paint and coordinates;
 * inline text/table layout stays intact inside leaves. Pruning cannot reflow siblings. */
export interface FragmentBox { left: number; top: number; width: number; height: number }
interface LayoutFragment {
  element: HTMLElement;
  box: FragmentBox;
  borderLeft: number;
  borderTop: number;
  typography: Record<string, string>;
  children: LayoutFragment[] | null;
}

export function fragmentPlacement(box: FragmentBox, parent: FragmentBox, borderLeft = 0, borderTop = 0): FragmentBox {
  return { left: box.left - parent.left - borderLeft, top: box.top - parent.top - borderTop, width: box.width, height: box.height };
}

export function measureLayoutTree(element: HTMLElement): LayoutFragment {
  const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
  const children = Array.from(element.children) as HTMLElement[];
  const hasOwnText = Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
  const canPrune = children.length > 0 && !hasOwnText && !element.matches("table,svg,math,ul,ol") &&
    children.every(child => !getComputedStyle(child).display.startsWith("inline"));
  const typography = Object.fromEntries([
    "font-family", "font-size", "font-weight", "font-style", "line-height",
    "letter-spacing", "text-align", "text-indent", "color", "white-space",
  ].map(property => [property, style.getPropertyValue(property)]));
  return {
    element, box: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    borderLeft: parseFloat(style.borderLeftWidth) || 0, borderTop: parseFloat(style.borderTopWidth) || 0,
    typography, children: canPrune ? children.map(measureLayoutTree) : null,
  };
}

export function cloneLayoutWindow(tree: LayoutFragment, from: number, to: number, origin: number): HTMLElement {
  const clone = (item: LayoutFragment, parent?: LayoutFragment): HTMLElement => {
    const copy = item.element.cloneNode(item.children === null) as HTMLElement;
    const placement = parent ? fragmentPlacement(item.box, parent.box, parent.borderLeft, parent.borderTop) : { ...item.box, left: 0, top: 0 };
    for (const [property, value] of Object.entries(item.typography)) copy.style.setProperty(property, value);
    Object.assign(copy.style, {
      position: parent ? "absolute" : "relative", inset: "auto",
      left: `${placement.left}px`, top: `${placement.top}px`,
      width: `${placement.width}px`, height: `${placement.height}px`,
      minWidth: "0", minHeight: "0", maxWidth: "none", maxHeight: "none",
      boxSizing: "border-box", margin: "0", flex: "none",
    });
    for (const child of item.children ?? []) {
      if (child.box.top + child.box.height <= origin + from || child.box.top >= origin + to) continue;
      copy.append(clone(child, item));
    }
    return copy;
  };
  return clone(tree);
}
