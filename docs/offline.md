# Offline access

Enable **Settings → Offline access** while signed in online. Choose a separate
passphrase of at least 12 characters. Memoria automatically prepares the desk,
library lists, and account-owned notes and reviewers. Keep the app open until
the preparation notification appears. Other authenticated pages and supported
read API responses save as they are opened while the vault is unlocked.

Use the existing login page's **Use offline passphrase** action to unlock saved
data. The email must match the account enrolled on this device. Offline unlock
does not create a server session. Each device needs an initial online sign-in
and its own offline setup. Passphrases are device-local and cannot be recovered.

## UI and behavior

The worker saves the application's actual HTML, React Server Component
responses, scripts, and styles. The existing layouts, readers, editors,
components, and animation styles render those responses. There is no separate
offline dashboard or alternate editor.

Flight responses are keyed by URL and router context. Preparation also downloads
complete root-tree responses so normal offline navigation uses the existing
Next router and transitions. If neither a matching patch nor a complete tree is
available, Next performs a full document navigation to saved HTML. This is
**not an assurance of identical navigation timing/transitions** on every browser.
Saved list pages show their last captured server state; document editors restore
newer local drafts over that snapshot.

Notes and reviewers automatically persist edits after 400 ms, and attempt a
flush on navigation/page hiding. A successful local save is acknowledged only
after the encrypted IndexedDB transaction commits. Sudden OS/browser termination
before that acknowledgment can still lose the last keystrokes.

The connected, unlocked app syncs on saves, reconnect, foregrounding, and every
30 seconds. Clean open documents also poll for changes from another device.
Sync requires a valid server session for the enrolled account and current edit
permissions. Conflicts retain the local draft; download it from the existing
document page, load the online version, and merge in the same editor.

## Current coverage and limits

- Offline viewing: saved authenticated pages, loaded scripts/styles/brand
  assets, and allowlisted read APIs. Media API responses above 10 MB are not
  cached. Assets or pages never downloaded are not available offline.
- Offline editing and automatic cross-device synchronization: existing notes
  and reviewers, including title and content. No new database migration is needed.
- Creating/deleting resources, workspaces/diagrams mutations, quiz submissions,
  flashcard reviews, account settings, sharing, imports, integrations, and AI
  generation still require a connection. These writes are never reported as
  successfully queued when they are not supported.
- Sync runs while an unlocked app is open. It does not upload after all tabs
  close, and data cannot move between disconnected devices.
- Browser quota, private browsing, and storage eviction can prevent persistence.
  The app requests persistent storage, but the browser may decline. A passphrase
  does not make a local-only draft a backup.
- Service worker/browser visual testing remains necessary before claiming 1:1
  parity across browsers. Use a production build over HTTPS or localhost;
  development chunks are not suitable for offline release testing.

## Storage and authentication

<<<<<<< HEAD
`memoria-encrypted-offline-v1` contains an encrypted identity, encrypted page/API
=======
`memoria-offline-v1` contains an encrypted identity, encrypted page/API
>>>>>>> 2e5a531e04c559242f347345eeb5696f429f9d34
snapshots, and encrypted drafts. AES-GCM uses a fresh random 96-bit IV per write
and authenticates the record name. PBKDF2-SHA-256 (600,000 iterations, random
128-bit salt) derives a nonextractable 256-bit key from the separate passphrase.
Neither the account password nor the offline passphrase is persisted. Session
cookies and authentication responses are never added to offline storage.

<<<<<<< HEAD
The previous offline library used `memoria-offline-v1` with an incompatible,
unencrypted account-snapshot store. The encrypted system uses a separate database
and disables the old library, snapshot polling, and worker registration. Existing
legacy copies are left intact; they are not automatically migrated or encrypted.

=======
>>>>>>> 2e5a531e04c559242f347345eeb5696f429f9d34
The worker and open tabs keep unlock keys only in memory. A live tab can resume
its suspended worker by structured-cloning the key. Explicit sign-out rotates
the resume identifier, drops the key, and locks other open tabs. Offline sign-out
locks local data; server session revocation needs a connection. Removing offline
data clears the encrypted identity and all local drafts, including unsynced ones.

This protects data at rest, not against malicious same-origin scripts while
unlocked. Offline copies cannot receive remote access revocations until the
device reconnects. Server authorization is rechecked for every sync.

The sync endpoint uses a serializable transaction and an atomic timestamp
condition. It preserves a revision before changing content. Replays of an
already applied document are accepted without another revision. Newer server
content is never silently replaced by a stale offline edit.

## Verification

Automated worker tests execute the real worker logic and Web Crypto with an
in-memory adapter for the IndexedDB boundary. They cover wrong credentials,
encrypted records, locking, account isolation, coalescing, interrupted sync,
in-flight edits, conflicts, and distinct Flight navigation keys. API tests cover
authorization, payload validation, compare-and-set writes, and idempotent replay.
They do not replace testing actual IndexedDB, service-worker lifecycle, or
browser rendering.

Manual release checklist:

1. Run `npm run build` and `npm start`. In a supported browser, sign in, enable
   offline access, and wait for preparation to finish.
2. Compare each prepared page with its online version in both themes, with
   reduced motion on/off and on narrow/wide viewports. Exercise editor dialogs.
3. Disconnect. Reload, follow saved links, edit a note/reviewer, leave the page,
   and reopen it. Confirm the draft survives and says it is saved on this device.
4. Sign out while offline. Back navigation must not restore unlocked data.
   Verify wrong email/passphrase rejection, then unlock using the existing form.
5. Reconnect with an expired online session. Confirm drafts remain queued until
   the same account signs in. An unrelated account must never receive them.
6. Use two devices to edit the same document from the same base. Confirm the
   second upload reports a conflict and retains the local draft for export/merge.
7. Close tabs during an upload, reopen/unlock, and reconnect. Verify replay does
   not duplicate revisions or discard later local edits.
8. Test denied storage, quota exhaustion, worker suspension, multiple tabs, an
   app deployment update, and removal of local data with pending edits.
