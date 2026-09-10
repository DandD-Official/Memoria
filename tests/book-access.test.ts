import { describe, expect, it } from "vitest";
import { resolveBookAccess, resolveBookExportAccess } from "@/lib/share-collections-repo";

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

  it("does not grant public editor access through a password-protected link", () => {
    expect(resolveBookAccess({ viewerUserId: "visitor", ownerId: "owner", isPublished: true, linkPermission: "EDIT", linkRequiresPassword: true })).toBe("VIEW");
    expect(resolveBookAccess({ viewerUserId: "editor", ownerId: "owner", memberPermission: "EDIT", isPublished: true, linkPermission: "EDIT", linkRequiresPassword: true })).toBe("EDIT");
  });

  it("separates export access from viewer and editor access", () => {
    expect(resolveBookExportAccess({ viewerUserId: "viewer", ownerId: "owner", hasMember: true, memberAllowExport: false, isPublished: true, allowExport: true, hasPassword: false })).toBe(false);
    expect(resolveBookExportAccess({ viewerUserId: "viewer", ownerId: "owner", hasMember: true, memberAllowExport: true, isPublished: false, allowExport: false, hasPassword: true })).toBe(true);
    expect(resolveBookExportAccess({ viewerUserId: "visitor", ownerId: "owner", hasMember: false, isPublished: true, allowExport: true, hasPassword: false })).toBe(true);
    expect(resolveBookExportAccess({ viewerUserId: "visitor", ownerId: "owner", hasMember: false, isPublished: true, allowExport: false, hasPassword: false })).toBe(false);
  });
});
