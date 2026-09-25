# Public Google Drive and Notion connections

Memoria stores one Google connection and one Notion connection **per signed-in Memoria user**. Each user completes OAuth with their own account. The deployment's client IDs identify the application; they do not grant access to the deployer's documents. No email allowlist is implemented in Memoria.

## 1. Prepare the deployment

1. Choose a stable production URL, such as `https://memoria.example.com`. Set `NEXTAUTH_URL` to that exact origin, without a trailing slash. Do not use a changing preview URL for production OAuth.
2. Configure PostgreSQL and run `npm run db:deploy` to apply the existing migrations. This change does not require a new schema migration.
3. Keep `AUTH_SECRET` set. Generate a separate random `INTEGRATION_ENCRYPTION_KEY`, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Store both as server environment secrets. Keep the encryption key stable: changing it makes existing encrypted connections unreadable.
4. Publish your app homepage, accurate privacy policy, terms, and support contact for the provider configuration. Describe document imports, token storage, disconnection and data deletion accurately. Use a domain you control for production verification.

## 2. Configure Google once

1. Create/select a project in [Google Cloud Console](https://console.cloud.google.com/). Use a separate development project if needed.
2. In **APIs & Services → Library**, enable **Google Drive API** and **Google Picker API**.
3. Open **Google Auth Platform → Branding**. Enter Memoria's name, support contact, homepage, privacy/terms URLs and authorized domains. Complete any brand/domain verification Google requests. See [brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).
4. Under **Audience**, choose **External**. Under **Data Access**, request only `openid`, `email`, and `https://www.googleapis.com/auth/drive.file`. Memoria uses Picker to authorize selected Google Docs. The Drive scope permits management of selected files, although Memoria's import code only reads them. It does not request Gmail access or broad `drive.readonly`. See [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).
5. Under **Clients**, create an OAuth client of type **Web application**. Add your production origin to authorized JavaScript origins. Add the exact redirect URI `https://memoria.example.com/api/integrations/google/callback`. For local development, use origin `http://localhost:3000` and callback `http://localhost:3000/api/integrations/google/callback` in the development project. Copy the client ID and client secret into the server environment. See [OAuth clients](https://support.google.com/cloud/answer/15549257).
6. Create an API key in the **same project**. Restrict its API access to **Google Picker API** and its website referrers to your app (`https://memoria.example.com/*`) **and** `https://docs.google.com/*`. Add `http://localhost:3000/*` only for the development key. Set `GOOGLE_PICKER_API_KEY` to that key and `GOOGLE_CLOUD_PROJECT_NUMBER` to the numeric project number (not the project ID or OAuth client ID). This restricted key is intentionally used by the browser; the client secret is not. See [Picker setup](https://developers.google.com/workspace/drive/picker/guides/web-picker).
7. Under **Audience**, publish the production app so its status is **In production**. Finish any verification required by the console. **Do not leave it in Testing** for launch: Testing restricts this flow to registered test users. External production is the setting that removes the need to add each person's Gmail address. Workspace administrators can still block third-party apps; Memoria cannot override their policies. See [audience settings](https://support.google.com/cloud/answer/15549945) and [OAuth app states](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).
8. Add these environment variables and redeploy:

```dotenv
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
GOOGLE_PICKER_API_KEY="..."
GOOGLE_CLOUD_PROJECT_NUMBER="123456789012"
```

If upgrading from the old broad Drive scope, remove Memoria's old grant in your Google account's connected-app settings, then reconnect. Publishing the application does not automatically narrow existing grants.

## 3. Configure Notion once

1. Open the [Notion developer portal](https://www.notion.so/profile/integrations). Create a **public OAuth connection**, with installation scope **Any workspace**. Do not choose an internal connection or Selected workspaces only. Notion documents installation scope as fixed at creation; recreate a restricted connection if necessary.
2. Configure **Read content** capability. Memoria does not need insert/update-content capabilities for imports. Fill in the public application information requested by Notion and complete its applicable distribution/review steps. Marketplace listing is separate from OAuth setup.
3. Register `https://memoria.example.com/api/integrations/notion/callback` as a redirect URI. Add `http://localhost:3000/api/integrations/notion/callback` for development if supported by your connection configuration.
4. Copy the **OAuth client ID** and **OAuth client secret**, not an internal installation token or the authorization URL. Set the variables below and redeploy.
5. Each user authorizes their own workspace and selects pages. No per-email registration is needed in Memoria. Users need sufficient access to share those pages, and workspace policy still applies. See [Notion public authorization and installation scope](https://developers.notion.com/guides/get-started/authorization).

```dotenv
NOTION_CLIENT_ID="..."
NOTION_CLIENT_SECRET="..."
```

## 4. What each user does

1. Sign in to their own Memoria account.
2. Open **Settings → Connected accounts** and select **Connect** beside Google Drive or Notion.
3. On Google's consent page, choose the Google account and grant selected-file access. On Notion's page, choose the workspace and the pages to share.
4. Back in Memoria, check the connected email/workspace shown in Settings.
5. Open **Notes → Import → Connected sources**. For Google, select **Choose from Google Drive**, choose a Google Doc and then **Import document**. For Notion, select a shared page and import it; use **Load more documents** if needed.
6. Use **Reconnect** to change accounts or select more Notion pages. One connection per provider is kept for each Memoria account. Reimporting a source refreshes that user's imported note.
7. **Disconnect** removes Memoria's stored credentials; it keeps previously imported notes. To remove the provider-side grant too, remove Memoria in Google/Notion's connected-app settings. Delete imported notes separately if desired.

Connected Drive imports currently support Google Docs. PDF, Word and PowerPoint files use the normal file-upload flow. Notion imports page text, including its nested blocks; it is not a recursive workspace/database sync. Document graphics may require the AI/OCR workflow.

## 5. Verify before launch

1. Use two different Memoria accounts and two provider accounts/workspaces. Connect both independently. Their Settings metadata, resource lists and imports must stay separate.
2. Use an unrelated Google account that is **not** a project member or test user. Confirm it can authorize the production app. Do the same with a separate Notion workspace.
3. Cancel consent and confirm Settings explains cancellation. Retry, let a request expire, and verify the old callback cannot connect an account. A request started in one Memoria session must fail after switching users.
4. Import a selected document, then try an ungranted/private document from the other account. The provider must deny it. Do not share the documents between the test accounts, which would legitimately grant access.
5. Reconnect Google as a different account, revoke access, and test reconnect/disconnect. Check refresh-token renewal in a staging environment. Do not log tokens or paste them into bug reports.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Connect disabled | Check the provider client ID/secret (and Google Picker key/project number for Google), then redeploy. A callback URL is not a client ID. |
| Google only accepts listed emails | Audience must be External and In production; check verification and Workspace policy. |
| `redirect_uri_mismatch` | Match `NEXTAUTH_URL`, protocol, hostname, port and callback path exactly. |
| Picker says API key invalid | Enable Picker API; match the Cloud project; allow the app and `https://docs.google.com/*` referrers. |
| No Google documents listed | Choose a document in Picker first. Only previously granted Docs appear in the list. |
| Notion page missing | Reconnect and select the page/parent page; check page-sharing rights and workspace policy. |
| Invalid or expired state | Retry Connect in the same browser while signed in. The callback requires a short-lived HttpOnly cookie. |
| Existing connections fail after deployment | Restore the original encryption key or reconnect affected accounts. |

## Implementation and verification boundaries

OAuth state is signed, expires after ten minutes, and is bound to the session user, provider and browser cookie. Tokens are encrypted at rest. Resource routes derive the owner from the server session. A short-lived Google access token is returned only to the signed-in browser for Picker; it is never persisted in browser storage. Refresh tokens remain server-side, with serialized rotation and protection against overwriting a concurrent disconnect/relink.

Provider-console changes and live OAuth consent cannot be completed by editing this repository. Run the launch checks after configuring and deploying the public applications. Automated tests use mocked provider responses; they cannot prove your provider console is published or verified.
