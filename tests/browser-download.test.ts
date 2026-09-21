import { afterEach, expect, it, vi } from "vitest";
import { downloadBlob } from "@/lib/word-export";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("downloads through the browser even when the OS supports file sharing", async () => {
  vi.useFakeTimers();
  const share = vi.fn(), click = vi.fn(), remove = vi.fn();
  const anchor = { href: "", download: "", rel: "", style: { display: "" }, click, remove };
  vi.stubGlobal("navigator", { share, canShare: () => true });
  vi.stubGlobal("window", { document: { createElement: () => anchor, body: { appendChild: vi.fn() } }, setTimeout });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  await downloadBlob(new Blob(["editable document"]), "My Notebook", "docx");
  expect(share).not.toHaveBeenCalled();
  expect(anchor.download).toBe("my-notebook.docx");
  expect(click).toHaveBeenCalledOnce();
  expect(revoke).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(remove).toHaveBeenCalledOnce();
  expect(revoke).toHaveBeenCalledWith("blob:download");
});
