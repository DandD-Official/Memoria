import { it,expect } from "vitest";
import golden from "./fixtures/diagram-v1-golden.json";
import { diagramDataV1Schema } from "@/lib/diagrams/schema";
import { diagramToSvg } from "@/lib/diagrams/svg";
it("preserves the original v1 SVG output byte for byte",()=>expect(diagramToSvg(diagramDataV1Schema.parse(golden.data))).toBe(golden.svg));
