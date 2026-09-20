export interface History<T> { past: T[]; present: T; future: T[] }
export const initialHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });
export function commitHistory<T>(history: History<T>, next: T): History<T> { return JSON.stringify(history.present) === JSON.stringify(next) ? history : { past: [...history.past.slice(-199), history.present], present: next, future: [] }; }
export function undoHistory<T>(h: History<T>): History<T> { return h.past.length ? { past: h.past.slice(0,-1), present: h.past.at(-1)!, future: [h.present,...h.future] } : h; }
export function redoHistory<T>(h: History<T>): History<T> { return h.future.length ? { past: [...h.past,h.present], present: h.future[0], future: h.future.slice(1) } : h; }
