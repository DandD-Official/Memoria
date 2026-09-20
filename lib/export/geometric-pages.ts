import { EXPORT_PAGE } from "./constants";
import { planPageBreaks,type BreakCandidate,type IndivisibleRange,type PlannedPage } from "./page-planner";
import { fitExportTables } from "./table-layout";
interface Geometry {origin:DOMRect;top:number;left:number;total:number;candidates:BreakCandidate[];ranges:IndivisibleRange[];tables:{table:HTMLTableElement;from:number;to:number;headerHeight:number;left:number;width:number}[]}

function fitVisuals(flow:HTMLElement){
  for(const element of flow.querySelectorAll<HTMLElement>("figure, [data-export-block='math'], .mmd-math")){
    const height=element.getBoundingClientRect().height;if(height<=EXPORT_PAGE.contentHeight)continue;
    const caption=element.querySelector("figcaption")?.getBoundingClientRect().height??0;
    for(const visual of element.querySelectorAll<HTMLElement>("img,svg")){visual.style.maxHeight=`${Math.max(40,EXPORT_PAGE.contentHeight-caption-32)}px`;visual.style.objectFit="contain";visual.style.width="auto";visual.style.maxWidth="100%";}
  }
  for(const image of flow.querySelectorAll<HTMLElement>("img,svg")){if(image.closest("figure"))continue;image.style.maxHeight=`${EXPORT_PAGE.contentHeight-16}px`;image.style.objectFit="contain";}
}
function measure(flow:HTMLElement):Geometry{
  const origin=flow.getBoundingClientRect(),style=getComputedStyle(flow),top=origin.top+parseFloat(style.paddingTop),left=origin.left+parseFloat(style.paddingLeft);
  const candidates:BreakCandidate[]=[],ranges:IndivisibleRange[]=[],lines:{top:number;bottom:number;left:number;right:number;parent:Element}[]=[];
  let total=0;
  const walker=document.createTreeWalker(flow,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode,parent=node.parentElement;if(!parent||parent.closest("svg,style,script,[data-export-ignore]")||!node.textContent?.trim())continue;
    const style=getComputedStyle(parent);if(style.display==="none"||style.visibility==="hidden")continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const rect of Array.from(range.getClientRects())){if(!rect.width||!rect.height)continue;const from=rect.top-top,to=rect.bottom-top;lines.push({top:from,bottom:to,left:rect.left,right:rect.right,parent});ranges.push({from,to,kind:"line"});candidates.push({y:to,kind:"line"});total=Math.max(total,to);}
  }
  for(const element of flow.querySelectorAll<HTMLElement>("*")){
    if(element.closest("svg,style,script,[data-export-ignore]"))continue;const rect=element.getBoundingClientRect();if(!rect.height||!rect.width)continue;
    const from=rect.top-top,to=rect.bottom-top;total=Math.max(total,to);
    const style=getComputedStyle(element);
    if(style.display!=="inline"&&style.display!=="contents"){candidates.push({y:Math.max(0,from),kind:"block"},{y:to,kind:"block"});}
    const row=element.tagName==="TR",visual=element.matches("figure:not(.mmd-code-block),img,svg,[data-export-block='math'],.mmd-math");
    if((row||visual)&&rect.height<=EXPORT_PAGE.contentHeight)ranges.push({from,to,kind:row?"row":"visual"});
    if(element.matches("h1,h2,h3,h4,h5,h6,summary,.eyebrow")){
      const next=lines.filter(line=>line.top>=to-.1&&line.right>rect.left&&line.left<rect.right).sort((a,b)=>a.top-b.top);
      const distinct=next.filter((line,i)=>i===0||Math.abs(line.top-next[i-1].top)>2).slice(0,2);
      ranges.push({from,to:distinct.at(-1)?.bottom??to,kind:"heading"});
    }
    if(style.breakBefore==="page"||element.dataset.exportBreakBefore!==undefined)candidates.push({y:Math.max(0,from),kind:"forced"});
  }
  for(const parent of flow.querySelectorAll("p,li")){
    const own=lines.filter(line=>parent.contains(line.parent));const ys=[...new Set(own.map(line=>Math.round(line.bottom*10)/10))].sort((a,b)=>a-b);
    if(ys.length>2)for(const candidate of candidates)if(Math.abs(candidate.y-ys[0])<.1||Math.abs(candidate.y-ys.at(-2)!)<.1)candidate.avoid=true;
  }
  const tables=Array.from(flow.querySelectorAll<HTMLTableElement>("table")).flatMap(table=>{const rect=table.getBoundingClientRect(),header=table.tHead;if(!header)return[];const headerRect=header.getBoundingClientRect(),firstRow=table.tBodies[0]?.rows[0]?.getBoundingClientRect();if(firstRow&&firstRow.bottom-headerRect.top<=EXPORT_PAGE.contentHeight)ranges.push({from:headerRect.top-top,to:firstRow.bottom-top,kind:"row"});return[{table,from:header.getBoundingClientRect().bottom-top,to:rect.bottom-top,headerHeight:header.getBoundingClientRect().height,left:rect.left-left,width:rect.width}];});
  candidates.push({y:total,kind:"block"});return{origin,top,left,total,candidates,ranges,tables};
}
/** Clone intersecting branches only. Shallow, invisible placeholders preserve flow geometry. */
function cloneWindow(node:Node,from:number,to:number,top:number):Node{
  if(!(node instanceof Element))return node.cloneNode(true);
  // Preserve inline flow: deleting off-window spans would rewrap a spanning paragraph.
  if(getComputedStyle(node).display.startsWith("inline"))return node.cloneNode(true);
  const rect=node.getBoundingClientRect();
  if(rect.height&&(rect.bottom<=top+from+.05||rect.top>=top+to-.05)&&!node.matches("colgroup,col,thead,style")){
    const copy=node.cloneNode(false) as HTMLElement;copy.style.visibility="hidden";copy.setAttribute("aria-hidden","true");copy.style.height=`${rect.height}px`;copy.style.minHeight=`${rect.height}px`;copy.style.boxSizing="border-box";
    if(node.tagName==="TR"){const cell=document.createElement("td");cell.colSpan=(node as HTMLTableRowElement).cells.length;cell.style.cssText=`height:${rect.height}px;padding:0;border:0`;copy.append(cell);}
    return copy;
  }
  const copy=node.cloneNode(false);for(const child of Array.from(node.childNodes))copy.appendChild(cloneWindow(child,from,to,top));return copy;
}
function continuationHeaders(geometry:Geometry,start:number){return geometry.tables.filter(t=>start>t.from+.1&&start<t.to-.1);}
export interface GeometricPage { content:HTMLElement;plan:PlannedPage }
export function buildGeometricPages(sourceFlow:HTMLElement):GeometricPage[]{
  const stage=document.createElement("div");stage.className=`mmd-export-surface${sourceFlow.closest(".book-paper")?" book-paper":""}`;stage.dataset.renderMode="export";stage.style.cssText="position:fixed;left:-100000px;top:0;width:794px;pointer-events:none";stage.inert=true;
  const flow=sourceFlow.cloneNode(true) as HTMLElement;stage.append(flow);document.body.append(stage);
  try{
    fitExportTables(flow);fitVisuals(flow);
    const geometry=measure(flow);
    const plans=planPageBreaks(geometry.candidates,EXPORT_PAGE.contentHeight,{totalHeight:geometry.total,indivisible:geometry.ranges,continuationSpace:from=>Math.max(0,...continuationHeaders(geometry,from).map(t=>t.headerHeight))});
    return plans.map(plan=>{
      if(plan.oversized)throw Error("A content region has no safe page boundary. Split the oversized row or column block and retry export.");
      const content=document.createElement("div");content.className="mmd-export-page-content";content.style.position="relative";content.dataset.pageFill=String(plan.fill);content.dataset.sourceFrom=String(plan.from);content.dataset.sourceTo=String(plan.to);
      const viewport=document.createElement("div");viewport.className="mmd-page-window";viewport.style.cssText=`position:relative;width:${EXPORT_PAGE.contentWidth}px;height:${plan.to-plan.from}px;overflow:hidden;margin-top:${plan.reserve}px`;
      const copy=cloneWindow(flow,plan.from,plan.to,geometry.top) as HTMLElement;copy.style.width=`${EXPORT_PAGE.cssWidth}px`;copy.style.position="relative";copy.style.left=`-${EXPORT_PAGE.margin}px`;copy.style.transform=`translateY(-${plan.from+EXPORT_PAGE.margin}px)`;copy.style.transformOrigin="top left";viewport.append(copy);content.append(viewport);
      for(const table of continuationHeaders(geometry,plan.from)){
        const header=table.table.cloneNode(false) as HTMLTableElement;header.dataset.exportRepeatedHeader="true";for(const node of table.table.querySelectorAll(":scope > colgroup,:scope > thead"))header.append(node.cloneNode(true));
        header.style.cssText+=`;position:absolute;left:${EXPORT_PAGE.margin+table.left}px;top:${EXPORT_PAGE.margin}px;width:${table.width}px;margin:0`;content.append(header);
      }
      return{content,plan};
    });
  }finally{stage.remove();}
}
