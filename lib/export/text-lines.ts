export interface TextFragment {
  text:string;x:number;y:number;width:number;height:number;font:string;size:number;color:string;bold:boolean;italic:boolean;underline:boolean;href?:string;targetPage?:number;
  /** Fragment grouping must not cross a table cell or separate column. */
  group?:string; baseline?:number; lineHeight?:number; naturalWidth?:number; maxRight?:number;
}
export interface TextLine { x:number;y:number;width:number;height:number;baseline:number;runs:TextFragment[];scale:number;maxRight?:number }
export const WORD_FONTS=["Arial","Calibri","Georgia","Cambria","Consolas","Courier New"] as const;
export function wordSafeFont(font:string):string { return WORD_FONTS.find(name=>font.toLowerCase().includes(name.toLowerCase()))??(/mono|courier|cascadia/i.test(font)?"Consolas":/serif|iowan|palatino|antiqua/i.test(font)?"Georgia":"Arial"); }
export const compensateWidth=(measured:number,natural:number)=>natural>0?Math.max(92,Math.min(108,measured/natural*100)):100;
/** Conservative metric fallback when no canvas/font is available (Arial-like advance classes). */
export function metricWidth(text:string,size:number,font:string):number {return [...text].reduce((sum,char)=>sum+(char.codePointAt(0)!>255?1:/mono|consolas|courier/i.test(font)?.6:/[ilI.,'!| ]/.test(char)?.28:/[MW@%]/.test(char)?.85:.55),0)*size;}
export function mergeTextLines(fragments:TextFragment[]):TextLine[]{
  const groups=new Map<string,TextFragment[]>();
  for(const fragment of fragments){if(!fragment.text||fragment.width<=0||fragment.height<=0)continue;const key=fragment.group??"default";groups.set(key,[...(groups.get(key)??[]),fragment]);}
  const output:TextLine[]=[];
  for(const entries of groups.values()){
    const sorted=[...entries].sort((a,b)=>(a.baseline??a.y+a.height*.8)-(b.baseline??b.y+b.height*.8)||a.x-b.x);
    let line:TextLine|undefined;
    for(const fragment of sorted){const baseline=fragment.baseline??fragment.y+fragment.height*.8;
      if(!line||Math.abs(line.baseline-baseline)>2||fragment.x-(line.x+line.width)>Math.max(16,fragment.size*1.5)){
        line={x:fragment.x,y:fragment.y,width:fragment.width,height:fragment.lineHeight??fragment.height,baseline,runs:[],scale:100,maxRight:fragment.maxRight};output.push(line);
      }
      line.runs.push({...fragment,font:wordSafeFont(fragment.font)});line.y=Math.min(line.y,fragment.y);line.height=Math.max(line.height,fragment.lineHeight??fragment.height);line.width=Math.max(line.width,fragment.x+fragment.width-line.x);if(fragment.maxRight!==undefined)line.maxRight=Math.min(line.maxRight??Infinity,fragment.maxRight);
    }
  }
  for(const line of output){line.runs.sort((a,b)=>a.x-b.x);const natural=line.runs.reduce((sum,run)=>sum+(run.naturalWidth??metricWidth(run.text,run.size,run.font)),0);line.scale=compensateWidth(line.width,natural);}
  return output.sort((a,b)=>a.y-b.y||a.x-b.x);
}
export interface TextOverlap { a:number;b:number;gap:number;axis:"horizontal"|"vertical" }
export function detectTextOverlaps(lines:TextLine[],gap=1.5):TextOverlap[]{
  const overlaps:TextOverlap[]=[];
  for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){const a=lines[i],b=lines[j];const xgap=Math.max(a.x,b.x)-Math.min(a.x+a.width,b.x+b.width),ygap=Math.max(a.y,b.y)-Math.min(a.y+Math.max(...a.runs.map(run=>run.height)),b.y+Math.max(...b.runs.map(run=>run.height)));if(Math.abs(a.baseline-b.baseline)<=2&&ygap<-.5&&xgap<gap)overlaps.push({a:i,b:j,gap:xgap,axis:"horizontal"});else if(xgap<-.5&&ygap<gap)overlaps.push({a:i,b:j,gap:ygap,axis:"vertical"});}
  return overlaps;
}
export function resolveTextOverlaps(input:TextLine[],gap=1.5):TextLine[]{
  const lines=input.map(line=>({...line,runs:line.runs.map(run=>({...run}))}));
  for(const overlap of detectTextOverlaps(lines,gap)){
    let a=lines[overlap.a],b=lines[overlap.b];
    if(Math.abs(a.baseline-b.baseline)<=2){if(a.x>b.x)[a,b]=[b,a];const available=Math.max(0,b.x-a.x-gap);const scale=a.scale*available/Math.max(1,a.width);
      if(scale>=92){a.width=available;a.scale=Math.min(a.scale,scale);}else{const shift=a.x+a.width+gap-b.x;const right=b.maxRight??Infinity;if(b.x+b.width+shift<=right){b.x+=shift;b.runs.forEach(run=>run.x+=shift);}}
    }else{if(a.y>b.y)[a,b]=[b,a];const shift=a.y+a.height+gap-b.y;if(shift>0){b.y+=shift;b.baseline+=shift;b.runs.forEach(run=>run.y+=shift);}}
  }
  return lines;
}
export function lineBoxWidth(line:TextLine):number {return Math.max(1,Math.min(line.width*1.04,(line.maxRight??Infinity)-line.x));}
