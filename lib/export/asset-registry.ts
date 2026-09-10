/**
 * Tracks asynchronous visual work performed by an MMD render tree.
 *
 * The registry is deliberately framework-agnostic so the renderer can report
 * diagram/network work while the eventual PDF/DOCX pipeline can wait for the
 * same state without knowing anything about individual MMD blocks.
 */
export interface MmdAssetRegistry {
  begin(key: string): () => void;
  waitUntilSettled(): Promise<void>;
  pendingKeys(): string[];
}

export function createMmdAssetRegistry(): MmdAssetRegistry {
  const pending = new Set<string>();
  const waiters = new Set<() => void>();

  function settleIfReady() {
    if (pending.size !== 0) return;
    for (const resolve of waiters) resolve();
    waiters.clear();
  }

  return {
    begin(key) {
      pending.add(key);
      let finished = false;
      return () => {
        if (finished) return;
        finished = true;
        pending.delete(key);
        settleIfReady();
      };
    },
    waitUntilSettled() {
      if (pending.size === 0) return Promise.resolve();
      return new Promise<void>((resolve) => waiters.add(resolve));
    },
    pendingKeys() {
      return [...pending];
    },
  };
}
