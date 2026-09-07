import { z } from "zod";
import { diagramDataSchema } from "@/lib/diagrams/schema";

export const createDiagramSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  data: diagramDataSchema.optional(),
});

export const updateDiagramSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: diagramDataSchema.optional(),
});
