export type MemoryType = "NOTE" | "REVIEWER" | "QUIZ";
export interface MemoryPickerRow { id: string; title: string; description?: string | null; updatedAt?: string; isFavorite?: boolean; archived?: boolean; tags?: string[] }
export interface PickerMemory extends MemoryPickerRow { resourceType: MemoryType }
export const memoryKey = (memory: { resourceType: MemoryType; id: string }) => memory.resourceType + ":" + memory.id;
export function findPickerMemories(memories: PickerMemory[], options: { query: string; type: MemoryType | "ALL"; favorites: boolean; tag: string; sort: "recent" | "title"; archived: boolean }) {
  const terms = options.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return memories.filter(memory => {
    const text = [memory.title, memory.description, ...(memory.tags ?? [])].join(" ").toLocaleLowerCase();
    return (options.type === "ALL" || memory.resourceType === options.type) && (!options.favorites || memory.isFavorite) && (!options.tag || memory.tags?.includes(options.tag)) && (options.archived || !memory.archived) && terms.every(term => text.includes(term));
  }).sort((a, b) => options.sort === "title" ? a.title.localeCompare(b.title) : (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0) || a.title.localeCompare(b.title));
}
