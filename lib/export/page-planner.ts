export interface BreakCandidate { y:number; kind:"line"|"block"|"row"|"heading"|"forced"; avoid?:boolean; keepWithNext?:number }
export interface IndivisibleRange { from:number; to:number; kind?:"line"|"row"|"visual"|"heading" }
export interface PagePlanOptions { totalHeight?:number; indivisible?:IndivisibleRange[]; occupied?:IndivisibleRange[]; continuationSpace?:(start:number)=>number; minFill?:number }
export interface PlannedPage { from:number; to:number; reserve:number; fill:number; oversized:boolean }
/** Numeric geometry only. Never rescales text or invents a cut through a protected range. */
export function planPageBreaks(candidates:BreakCandidate[],pageHeight:number,options:PagePlanOptions={}):PlannedPage[]{
  if(!Number.isFinite(pageHeight)||pageHeight<=0)throw Error("Page height must be positive.");
  const sorted=candidates.filter(c=>Number.isFinite(c.y)&&c.y>=0).sort((a,b)=>a.y-b.y);
  const total=options.totalHeight??sorted.at(-1)?.y??0;if(!Number.isFinite(total)||total<=0)return [];
  const ranges=(options.indivisible??[]).filter(r=>Number.isFinite(r.from+r.to)&&r.to>r.from).sort((a,b)=>a.from-b.from);
  // Union overlapping restrictions once; a binary search makes each candidate check cheap.
  const union:IndivisibleRange[]=[];for(const range of ranges){const last=union.at(-1);if(last&&range.from<last.to-.05)last.to=Math.max(last.to,range.to);else union.push({...range});}
  const crossing=(y:number)=>{let lo=0,hi=union.length-1;while(lo<=hi){const mid=(lo+hi)>>1;if(union[mid].from<y-.05)lo=mid+1;else hi=mid-1;}const range=union[hi];return range&&y<range.to-.05?range:undefined;};
  const safe=sorted.filter(c=>!crossing(c.y));
  const occupied=options.occupied?.filter(r=>r.to>r.from).sort((a,b)=>a.from-b.from);
  const pages:PlannedPage[]=[];let from=0,index=0;
  while(from<total-.05){
    if(from>0&&occupied){
      const next=occupied.find(range=>range.to>from+.05);
      if(!next)break; // Never emit a page containing only trailing margins/padding.
      if(next.from>from+8)from=next.from-8; // Retain a small inset, not the previous page's top margin.
    }
    const reserve=Math.max(0,Math.min(pageHeight*.4,options.continuationSpace?.(from)??0));const bottom=Math.min(total,from+pageHeight-reserve);
    while(index<safe.length&&safe[index].y<=from+.05)index++;
    let endIndex=index;while(endIndex<safe.length&&safe[endIndex].y<=bottom+.05)endIndex++;
    const available=safe.slice(index,endIndex);
    const forced=available.find(c=>c.kind==="forced");
    const good=available.filter(c=>!c.avoid&&(!c.keepWithNext||c.keepWithNext<=bottom));
    let to=forced?.y??(bottom>=total&&!crossing(total)?total:good.at(-1)?.y);
    if(to===undefined||(to-from+reserve)/pageHeight<(options.minFill??.92))to=forced?.y??available.at(-1)?.y??to;
    if(to===undefined||to<=from+.05){const next=safe[index]?.y;const obstruction=crossing(bottom);to=Math.min(total,next??obstruction?.to??bottom);}
    if(to<=from+.05)throw Error("No progressing page boundary could be planned.");
    pages.push({from,to,reserve,fill:Math.min(1,(to-from+reserve)/pageHeight),oversized:to-from+reserve>pageHeight+.5});from=to;
  }
  return pages;
}
