/** Feedback authors may remove only their own authenticated comments. */
export function canDeleteFeedback(viewerUserId: string | null | undefined, authorUserId: string | null | undefined): boolean {
  return Boolean(viewerUserId && authorUserId && viewerUserId === authorUserId);
}
