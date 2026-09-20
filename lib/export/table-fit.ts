export interface ColumnMeasure { minContent:number; maxContent:number }
export interface TableSegment { columns:number[]; widths:number[]; caption?:string }
export interface TableLayout { fontSize:number; segments:TableSegment[] }
/** Keep row labels with each segment. Font size has a hard 10px floor. */
export function planTableLayout(columns:ColumnMeasure[],width:number,floor=48):TableLayout {
  if(!Number.isFinite(width)||width<=0)throw Error("Table width must be positive.");
  if(!columns.length)return{fontSize:13,segments:[]};
  const desired=(i:number,size:number)=>Math.max(floor,Math.min(140,Math.max(0,columns[i].minContent)+16))*size/13;
  let fontSize=13;while(fontSize>10&&columns.reduce((sum,_,i)=>sum+desired(i,fontSize),0)>width)fontSize--;
  const groups:number[][]=[];let current=[0],used=desired(0,fontSize);
  for(let i=1;i<columns.length;i++){const next=desired(i,fontSize);if(current.length>1&&used+next>width){groups.push(current);current=[0];used=desired(0,fontSize);}current.push(i);used+=next;}groups.push(current);
  return{fontSize,segments:groups.map(indices=>{
    const mins=indices.map(i=>Math.min(desired(i,fontSize),width/indices.length)),minTotal=mins.reduce((a,b)=>a+b,0);
    const weights=indices.map((i,j)=>Math.max(1,columns[i].maxContent*fontSize/13-mins[j]));const sum=weights.reduce((a,b)=>a+b,0);
    const widths=mins.map((n,i)=>n+Math.max(0,width-minTotal)*weights[i]/sum);
    return{columns:indices,widths,...(groups.length>1?{caption:`Columns ${indices[0]+1}, ${indices[1]+1}–${indices.at(-1)!+1} of ${columns.length}`}:{})};
  })};
}
export function planTableRows(heights:number[],headerHeight:number,pageHeight:number):{rows:number[];repeatHeader:boolean;oversized:boolean}[]{
  if(pageHeight<=headerHeight)throw Error("Table header is taller than the page.");
  const pages:{rows:number[];repeatHeader:boolean;oversized:boolean}[]=[];let rows:number[]=[],used=headerHeight;
  for(let i=0;i<heights.length;i++){if(!Number.isFinite(heights[i])||heights[i]<0)throw Error("Invalid row height.");if(rows.length&&used+heights[i]>pageHeight){pages.push({rows,repeatHeader:pages.length>0,oversized:false});rows=[];used=headerHeight;}rows.push(i);used+=heights[i];if(used>pageHeight){pages.push({rows,repeatHeader:pages.length>0,oversized:true});rows=[];used=headerHeight;}}
  if(rows.length)pages.push({rows,repeatHeader:pages.length>0,oversized:false});return pages;
}
