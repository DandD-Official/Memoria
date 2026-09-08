import { describe, expect, it } from "vitest";
import { resolveBookAccess } from "@/lib/share-collections-repo";

describe("Book access", () => {
  it("always gives the owner owner access", () => {
    expect(resolveBookAccess({ viewerUserId: "owner", ownerId: "owner", isPublished: false, linkPermission: "VIEW" })).toBe("OWNER");
  });

  it("uses an added person's permission even when the link is disabled", () => {
    expect(resolveBookAccess({ viewerUserId: "reader", ownerId: "owner", memberPermission: "VIEW", isPublished: false, linkPermission: "EDIT" })).toBe("VIEW");
    expect(resolveBookAccess({ viewerUserId: "editor", ownerId: "owner", memberPermission: "EDIT", isPublished: false, linkPermission: "VIEW" })).toBe("EDIT");
  });

  it("uses link access only while the link is enabled", () => {
    expect(resolveBookAccess({ viewerUserId: "visitor", ownerId: "owner", isPublished: true, linkPermission: "VIEW" })).toBe("VIEW");
    expect(resolveBookAccess({ viewerUserId: "visitor", ownerId: "owner", isPublished: true, linkPermission: "EDIT" })).toBe("EDIT");
    expect(resolveBookAccess({ viewerUserId: "visitor", ownerId: "owner", isPublished: false, linkPermission: "EDIT" })).toBeNull();
  });
});
