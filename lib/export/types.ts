export interface CanonicalPage {
  element: HTMLElement;
  width: number;
  height: number;
}

export interface CapturedPage extends CanonicalPage {
  dataUrl: string;
}

export interface ExportProgress {
  phase: "preparing" | "capturing" | "creating";
  current?: number;
  total?: number;
  message: string;
}

export type ExportProgressHandler = (progress: ExportProgress) => void;
