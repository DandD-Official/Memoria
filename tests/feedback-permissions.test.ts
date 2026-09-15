import { describe, expect, it } from "vitest";
import { canDeleteFeedback } from "@/lib/feedback-permissions";

describe("feedback delete permissions", () => {
  it("allows an authenticated author to delete their own feedback", () => {
    expect(canDeleteFeedback("user-1", "user-1")).toBe(true);
  });

  it("does not let owners or other users impersonate the author", () => {
    expect(canDeleteFeedback("owner", "author")).toBe(false);
    expect(canDeleteFeedback("reader", "author")).toBe(false);
    expect(canDeleteFeedback(null, "author")).toBe(false);
  });
});
