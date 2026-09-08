# Books compatibility architecture

Last updated: 2026-09-08

## Product behavior

Books are presented as reading objects, not generic resource cards or published
Collections. The owner/editor studio separates the simulated Book, Chapters,
and Details into focused views instead of one long management page. The shared
reader separates Read Book from Discussion. On phones, the contents page appears
first and opens one chapter at a time; on larger screens it becomes a two-page
spread with previous/next page controls.

All Book covers and paper surfaces use semantic theme tokens. Text, muted copy,
borders, and accents must adapt with the active light or dark theme; do not pair
hard-coded paper colors with semantic text colors.

The Book toolbar has Export and, for owners, Share together at the top right.
Sharing configuration does not appear inline in the editor. The Share dialog has
exactly two methods: Anyone with the link, and Add people to the Book. Both
methods support `VIEW` and `EDIT`. User-facing copy must never call link sharing
“publishing,” and the account-specific method is called “Add people,” not
“Private sharing.”

## Current persistence boundary

The UI still uses the additive `ShareCollection*` compatibility tables while the
future dedicated Book migration is prepared. This preserves all existing data and
public slugs. The compatibility additions are `subtitle`, `tocTitle`,
`linkPermission`, `isFavorite`, member `permission`, and
`ShareCollectionProgress` for per-user last chapter and access time.

Do not remove or rename the legacy API paths or export payload format until a
separate data migration has copied and verified every existing row.

## Authorization contract

- The owner always resolves to `OWNER`.
- An added person resolves to their stored `VIEW` or `EDIT`, even while the link
  is disabled.
- A non-member receives the link permission only while the link is enabled.
- Link editors must sign into Memoria to mutate a Book. Anonymous visitors can
  read an enabled link but cannot issue authenticated editor mutations.
- Only owners may change sharing, members, favorites, passwords/expiry, or delete
  the Book.
- Editors may change Book copy and chapter structure. Non-owner candidate lists
  expose only chapters already in the Book, never the owner's unrelated library.
- Book access renders contained resources only in the Book context. It does not
  create independent Note/Reviewer/Quiz share rows.

## Reading progress and exports

Signed-in readers save progress at chapter changes rather than on scroll. Opening
the Book resumes at that chapter and the contents page marks it as Continue.

Book PDF and DOCX exports use dedicated cover-page templates followed by the
custom contents heading and chapters in Book order. The internal JSON export
keeps the legacy `memoria-collection-export` format identifier for compatibility.

## Migration

`prisma/migrations/20260908193000_add_book_sharing_permissions/migration.sql` is
strictly additive. Existing links and members become Viewers by default. Apply it
before deploying this UI. A later migration may rename/copy these tables to true
Book models only after row counts, slugs, permissions, feedback, and progress are
verified.
