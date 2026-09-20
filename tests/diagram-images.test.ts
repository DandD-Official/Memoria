import { describe,it,expect,vi } from "vitest";
import sharp from "sharp";
vi.mock("@/lib/media/repo",()=>({findMedia:vi.fn()}));
import { findMedia } from "@/lib/media/repo";
import { resolveDiagramImages } from "@/lib/diagrams/images";
import { emptyDiagramV2 } from "@/lib/diagrams/schema";
import { newNode } from "@/lib/diagrams/editing";
const data=()=>({...emptyDiagramV2(),nodes:[{...newNode("image",{x:0,y:0}),imageRef:"media://owned"}]});
describe("owned diagram images",()=>{
  it("rejects missing owner-scoped assets",async()=>{vi.mocked(findMedia).mockResolvedValue(null);await expect(resolveDiagramImages(data(),"owner")).rejects.toThrow(/not owned/);expect(findMedia).toHaveBeenCalledWith("owned","owner");});
  it("re-encodes and bounds images to 1024 pixels",async()=>{const bytes=await sharp({create:{width:2048,height:1500,channels:4,background:"#fff"}}).png().toBuffer();vi.mocked(findMedia).mockResolvedValue({data:bytes,mimeType:"image/png"} as NonNullable<Awaited<ReturnType<typeof findMedia>>>);const images=await resolveDiagramImages(data(),"owner");expect(images["media://owned"].length).toBeLessThan(900_000);const encoded=Buffer.from(images["media://owned"].split(",")[1],"base64");const meta=await sharp(encoded).metadata();expect(meta.format).toBe("webp");expect(meta.width).toBeLessThanOrEqual(1024);expect(meta.height).toBeLessThanOrEqual(1024);});
  it("rejects SVG external references before rasterization",async()=>{vi.mocked(findMedia).mockResolvedValue({data:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.test/image"/></svg>'),mimeType:"image/svg+xml"} as NonNullable<Awaited<ReturnType<typeof findMedia>>>);await expect(resolveDiagramImages(data(),"owner")).rejects.toThrow(/unsafe/);});
});
