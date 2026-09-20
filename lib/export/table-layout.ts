import { planTableLayout } from "./table-fit";
/** DOM adapter: content measurement and colgroup construction, including nested tables. */
export function fitExportTables(flow:HTMLElement):void {
  const context=document.createElement("canvas").getContext("2d");
  for(const table of Array.from(flow.querySelectorAll<HTMLTableElement>("table"))){
    const rows=Array.from(table.rows);const count=Math.max(0,...rows.map(row=>row.cells.length));if(!count)continue;
    const width=Math.max(1,table.parentElement!.getBoundingClientRect().width);const style=getComputedStyle(table);if(context)context.font=`13px ${style.fontFamily}`;
    const measure=(value:string)=>context?.measureText(value).width??[...value].length*7;
    const columns=Array.from({length:count},(_,i)=>{const content=rows.map(row=>row.cells[i]?.textContent??"");return {minContent:Math.max(0,...content.flatMap(text=>text.split(/\s+/).map(measure))),maxContent:Math.max(0,...content.map(measure))};});
    const plan=planTableLayout(columns,width);
    const copies=plan.segments.map(segment=>{
      const copy=table.cloneNode(true) as HTMLTableElement;copy.querySelectorAll("colgroup").forEach(group=>group.remove());
      for(const row of Array.from(copy.rows))Array.from(row.cells).forEach((cell,i)=>{if(!segment.columns.includes(i))cell.remove();});
      const group=document.createElement("colgroup");segment.widths.forEach(value=>{const col=document.createElement("col");col.style.width=`${value}px`;group.append(col);});copy.insertBefore(group,copy.firstChild);
      copy.style.width=`${width}px`;copy.style.maxWidth="100%";copy.style.fontSize=`${plan.fontSize}px`;copy.dataset.exportTable="true";
      if(segment.caption){const caption=document.createElement("caption");caption.textContent=segment.caption;caption.className="mmd-export-table-caption";copy.prepend(caption);}
      return copy;
    });
    table.replaceWith(...copies);
  }
}
