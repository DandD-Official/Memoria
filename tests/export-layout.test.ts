import { describe,it,expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMmd } from "@/lib/mmd/parser";
import { planPageBreaks } from "@/lib/export/page-planner";
import { planTableLayout,planTableRows } from "@/lib/export/table-fit";
import { mergeTextLines,compensateWidth,resolveTextOverlaps,detectTextOverlaps,wordSafeFont,lineBoxWidth,type TextFragment } from "@/lib/export/text-lines";
const fragment=(patch:Partial<TextFragment>={}):TextFragment=>({text:"Hello ",x:48,y:90,width:45,height:20,font:"Arial",size:14,color:"22312b",bold:false,italic:false,underline:false,...patch});
it("keeps the stress fixture parseable with Unicode and all nested export cases",()=>{
  const source=readFileSync("tests/fixtures/mmd-export-stress.mmd","utf8");
  const ast=parseMmd(source);
  expect(JSON.stringify(ast)).not.toContain('"type":"error"');
  expect(source).toContain("中文");expect(source).toContain("🧠");
  for(const name of ["section","card","columns","column","details","code"])expect(source).toContain(`:::${name}`);
  expect(source).toContain("Column 12");expect(source).toContain("Row 60");expect(source).toContain("<br>");
});
describe("page planner",()=>{
  it("fills every nonfinal page above 92% at safe line boundaries",()=>{const candidates=Array.from({length:500},(_,i)=>({y:(i+1)*24,kind:"line" as const}));const result=planPageBreaks(candidates,1003);expect(result.slice(0,-1).every(page=>page.fill>=.92)).toBe(true);expect(result.every(page=>page.to>page.from&&!page.oversized)).toBe(true);expect(result.at(-1)?.to).toBe(12000);});
  it("keeps headings and two following lines together",()=>{const result=planPageBreaks([{y:840,kind:"block"},{y:920,kind:"heading"},{y:944,kind:"line"},{y:968,kind:"line"},{y:1100,kind:"block"}],950,{indivisible:[{from:900,to:968,kind:"heading"}]});expect(result[0].to).toBe(840);});
  it("keeps indivisible visuals intact and signals an oversized visual",()=>{const pages=planPageBreaks([{y:600,kind:"block"},{y:1600,kind:"block"},{y:2000,kind:"block"}],900,{indivisible:[{from:600,to:1600,kind:"visual"}]});expect(pages[0].to).toBe(600);expect(pages[1].oversized).toBe(true);expect(pages[1].to).toBe(1600);});
  it("reserves repeated table headers",()=>{const result=planPageBreaks(Array.from({length:50},(_,i)=>({y:(i+1)*40,kind:"row" as const})),400,{continuationSpace:start=>start?40:0});expect(result[0].to).toBe(400);expect(result[1].reserve).toBe(40);expect(result[1].to).toBe(760);});
  it("does not cut a line in a parallel column",()=>{const result=planPageBreaks([{y:950,kind:"line"},{y:990,kind:"line"},{y:1020,kind:"line"},{y:1200,kind:"line"}],1000,{indivisible:[{from:980,to:1005,kind:"line"}]});expect(result[0].to).toBe(950);});
  it("is deterministic, honors forced breaks and makes no blank pages",()=>{const candidates=[{y:200,kind:"forced" as const},{y:400,kind:"line" as const},{y:1100,kind:"line" as const}];const pages=planPageBreaks(candidates,1000);expect(pages).toEqual(planPageBreaks(candidates,1000));expect(pages[0].to).toBe(200);expect(pages.every(page=>page.to>page.from)).toBe(true);expect(planPageBreaks([],1000)).toEqual([]);expect(()=>planPageBreaks(candidates,0)).toThrow();});
});
describe("table planning",()=>{
  it("allocates widths proportionally and respects the available width",()=>{const plan=planTableLayout([{minContent:30,maxContent:50},{minContent:50,maxContent:400}],600);expect(plan.fontSize).toBe(13);expect(plan.segments[0].widths[1]).toBeGreaterThan(plan.segments[0].widths[0]);expect(plan.segments[0].widths.reduce((a,b)=>a+b,0)).toBeCloseTo(600);});
  it("steps down no lower than 10px and repeats row headers in wide segments",()=>{const plan=planTableLayout(Array.from({length:12},()=>({minContent:160,maxContent:500})),600);expect(plan.fontSize).toBe(10);expect(plan.segments.length).toBeGreaterThan(1);expect(plan.segments.every(s=>s.columns[0]===0&&s.caption?.includes("of 12"))).toBe(true);const columns=plan.segments.flatMap(s=>s.columns.slice(1));expect(columns).toEqual(Array.from({length:11},(_,i)=>i+1));});
  it("keeps a very long single column inside the available width",()=>{const plan=planTableLayout([{minContent:9000,maxContent:9000}],250);expect(plan.segments[0].widths[0]).toBe(250);});
  it("splits at rows and marks repeated headers and oversize rows",()=>{const result=planTableRows([100,100,100,600,50],40,400);expect(result[0].rows).toEqual([0,1,2]);expect(result[1]).toEqual({rows:[3],repeatHeader:true,oversized:true});expect(result[2].rows).toEqual([4]);});
});
describe("editable text lines",()=>{
  it("merges mixed runs on one baseline while retaining formatting and links",()=>{const lines=mergeTextLines([fragment(),fragment({x:93,text:"bold",width:30,bold:true}),fragment({x:123,text:" link",width:32,href:"https://example.com",underline:true,targetPage:2})]);expect(lines).toHaveLength(1);expect(lines[0].runs.map(r=>r.text).join("")).toBe("Hello bold link");expect(lines[0].runs[1].bold).toBe(true);expect(lines[0].runs[2].targetPage).toBe(2);});
  it("does not merge neighbouring table cells or separate columns",()=>expect(mergeTextLines([fragment({group:"cell-a"}),fragment({x:93,group:"cell-b"})])).toHaveLength(2));
  it("clamps compensation and maps unsupported fonts to the safe stack",()=>{expect(compensateWidth(200,100)).toBe(108);expect(compensateWidth(50,100)).toBe(92);expect(wordSafeFont("Segoe UI")).toBe("Arial");expect(wordSafeFont("Cascadia Code")).toBe("Consolas");});
  it("tightens touching line boxes or nudges safely",()=>{const lines=mergeTextLines([fragment({group:"a",width:100}),fragment({group:"b",x:147,width:80})]);expect(detectTextOverlaps(lines).length).toBe(1);expect(detectTextOverlaps(resolveTextOverlaps(lines))).toEqual([]);});
  it("resolves vertical intersections and limits width slack to the cell",()=>{const lines=mergeTextLines([fragment({height:24,group:"a"}),fragment({y:108,height:24,group:"b",maxRight:94})]);const fixed=resolveTextOverlaps(lines);expect(detectTextOverlaps(fixed)).toEqual([]);expect(lineBoxWidth(fixed[1])).toBeLessThanOrEqual(94-fixed[1].x);});
});
