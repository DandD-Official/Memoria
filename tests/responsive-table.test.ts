import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MmdRenderer } from "@/components/mmd/renderer";
import { MmdExportSurface } from "@/components/exports/mmd-export-surface";
import { TableViewContext } from "@/components/markdown/table-view-context";
import { TableViewSettings } from "@/components/settings/table-view-settings";

const table = "| Field | Purpose |\n|---|---|\n| Rows | Group source records |\n| Values | Summarize numbers |";

describe("table viewing options", () => {
  it("uses the configured fit default and shows it in Settings", () => {
    const preference = { defaultTableView: "fit" as const, setDefaultTableView: () => true };
    const html = renderToStaticMarkup(createElement(TableViewContext.Provider, { value: preference }, createElement(MmdRenderer, { content: table })));
    expect(html).toContain('data-table-view="fit"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*?Fit to width<\/button>/);
    const settings = renderToStaticMarkup(createElement(TableViewContext.Provider, { value: preference }, createElement(TableViewSettings)));
    expect(settings).toContain('value="fit" selected=""');
    expect(settings).toContain("Saved on this browser");
  });

  it("keeps export layout independent of the configured screen default", () => {
    const html = renderToStaticMarkup(createElement(TableViewContext.Provider, { value: { defaultTableView: "fit", setDefaultTableView: () => true } }, createElement(MmdExportSurface, { content: table })));
    expect(html).toContain('data-table-view="scroll"');
    expect(html).not.toContain("responsive-table__controls");
    expect(html).toContain("Group source records");
  });

  it("offers both modes while preserving semantic table content and keyboard scrolling", () => {
    const html = renderToStaticMarkup(createElement(MmdRenderer, { content: table }));
    expect(html).toContain('role="group" aria-label="Table view"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*?Scroll<\/button>/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>.*?Fit to width<\/button>/);
    expect(html).toContain('data-table-view="scroll" tabindex="0" role="region"');
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Field</th>");
    expect(html).toContain("Group source records");
    expect(html).toContain("Summarize numbers");
  });

  it("associates each table's controls with its own viewport", () => {
    const html = renderToStaticMarkup(createElement(MmdRenderer, { content: `${table}\n\n${table}` }));
    const targets = [...html.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]);
    expect(targets).toHaveLength(4);
    expect(targets[0]).toBe(targets[1]);
    expect(targets[2]).toBe(targets[3]);
    expect(targets[0]).not.toBe(targets[2]);
    for (const target of new Set(targets)) expect(html).toContain(`id="${target}" class="responsive-table__viewport"`);
  });

  it("excludes viewing controls from exported documents without losing table data", () => {
    const html = renderToStaticMarkup(createElement(MmdExportSurface, { content: table }));
    expect(html).not.toContain("responsive-table__controls");
    expect(html).not.toContain("<button");
    expect(html).toContain("<table>");
    expect(html).toContain("Group source records");
    expect(html).toContain("Summarize numbers");
  });
});
