# Memoria: complete step-by-step setup

This guide takes you from a local checkout to a production deployment with individual Google Drive and Notion connections, AI generation, and account emails.

Configure the application credentials once. Every user then signs in to Memoria and authorizes their own Google account or Notion workspace. You do not create a separate OAuth application or maintain an email allowlist for every user.

## What you will set up

| Component | Required for |
| --- | --- |
| Node.js 22 and npm | Running and building this repository |
| PostgreSQL | User accounts, notes, settings and encrypted connections |
| Authentication and encryption secrets | Sessions and stored provider credentials |
| Google OAuth client and Picker key | Each user's Google Drive connection |
| Public Notion OAuth connection | Each user's Notion workspace connection |
| AI provider API key | Direct AI generation; optional for manual copy/paste workflows |
| Resend and a verified sending domain | Verification and password-reset emails |
| Vercel or another Node.js host | Making the application publicly available |

If the website is already deployed, keep its existing database and secrets. Start with Step 4 for email, Step 5 for Drive, Step 6 for Notion, or Step 7 for AI, then redeploy using Step 8.

## Step 1: choose your URLs and prepare the tools

1. Install Node.js **22.x**, matching `package.json`.
2. Open a terminal in this repository. On your Windows machine:

   ```powershell
   Set-Location E:\Github\Memoria
   node --version
   npm.cmd --version
   ```

3. Use `http://localhost:3000` for local development.
4. Choose a stable production origin. This guide uses `https://memoria.example.com`; replace it everywhere with your actual address. If you use `https://memoria-studynotes.vercel.app`, use that exact address instead.
5. Use the same production origin for `NEXTAUTH_URL`, OAuth callbacks and the URL users open. Avoid temporary preview URLs for production OAuth.
6. Prepare an app homepage, support contact, privacy policy and terms URLs for provider registration. These must describe the actual service. This setup guide does not create those public pages for you.

The commands below use `npm.cmd` on Windows so PowerShell's script-execution policy does not block `npm.ps1`. On macOS/Linux, use `npm` instead.

## Step 2: prepare PostgreSQL and the environment file

1. Create a PostgreSQL database, either locally or with your chosen hosting provider. Obtain its connection string, including the database name, username, password and any required SSL options.
2. Use separate databases for development and production. Keep your production database close to your server region. This repository's `vercel.json` currently specifies Singapore (`sin1`).
3. Create `.env` from the example **only if `.env` does not already exist**:

   ```powershell
   if (-not (Test-Path -LiteralPath .env)) {
     Copy-Item -LiteralPath .env.example -Destination .env
   }
   ```

4. For a new installation, run this command twice and save the two different outputs securely:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. Edit `.env` and fill in:

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
   AUTH_SECRET="FIRST_GENERATED_VALUE"
   NEXTAUTH_URL="http://localhost:3000"
   INTEGRATION_ENCRYPTION_KEY="SECOND_GENERATED_VALUE"
   ```

6. Use your database provider's actual URL instead of the illustrative URL above. For production, use the pooled URL when supported by your provider and deployment. Local PostgreSQL may use different SSL settings.
7. Keep `.env` out of Git. Do not put server secrets in variables beginning with `NEXT_PUBLIC_`.

**Existing installation:** do not replace `AUTH_SECRET` or `INTEGRATION_ENCRYPTION_KEY` just to follow this guide. Replacing the encryption key makes saved OAuth tokens and personal AI keys unreadable. If the encryption key was previously omitted, the app used its authentication secret as the fallback; preserve that effective encryption secret when introducing a dedicated variable, or plan for users to reconnect.

## Step 3: install and start locally

1. Install the dependencies recorded in the lockfile:

   ```powershell
   npm.cmd ci
   ```

2. Apply the repository's existing migrations to the database configured in `.env`:

   ```powershell
   npm.cmd run db:deploy
   ```

3. Start the development server:

   ```powershell
   npm.cmd run dev
   ```

4. Open `http://localhost:3000/api/health`. A working connection returns `status: "ok"` and `database: "ok"`.
5. Open `http://localhost:3000/register` and create a Memoria account.
6. Sign in and confirm you can create and reopen a note.

`npm ci` generates Prisma Client through the existing post-install script. If generation was interrupted, run `npm.cmd run db:generate`.

Use `db:deploy` to apply existing migrations. `db:migrate` is for development work that changes the database schema; you do not need to create a new migration merely to enable these integrations. If an existing database reports migration-history errors, inspect that history rather than resetting a database containing user data.

## Step 4: configure account email

The app uses Resend for account verification and password-reset emails.

1. Create or sign in to your Resend account.
2. Add a sending domain you own in its Domains area.
3. Add the DNS records Resend provides at your DNS host and wait for verification. Use the records shown for your domain rather than copying another project's values. See [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction).
4. Create a Resend API key with permission to send from that domain.
5. Set:

   ```dotenv
   RESEND_API_KEY="YOUR_RESEND_API_KEY"
   EMAIL_FROM="Memoria <no-reply@your-verified-domain.com>"
   ```

6. Restart the local server after changing `.env`.
7. Register a fresh test account, receive its verification code and complete verification. Then test password reset.

For a public launch, use a verified sender domain. The `onboarding@resend.dev` test sender is restricted and is not suitable for emailing every user. You cannot verify `vercel.app` as your sender domain because you do not control its DNS.

In the current implementation, leaving both email variables empty skips verification for newly registered accounts. Password-reset email delivery is then unavailable. Setting both variables enables verification, so test delivery before inviting users.

## Step 5: configure Google Drive for all users

### 5.1 Create the Cloud project and enable APIs

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project for Memoria. Prefer separate development and production projects.
3. Open **APIs & Services > Library**.
4. Enable **Google Drive API**.
5. Enable **Google Picker API** in the same project.
6. Find the numeric **Project number**. Google shows a project picker in the top bar of Cloud Console. Click it, select your Memoria project, then use either of these paths:

   - Open **Dashboard** from the left menu. Look for **Project info** or **Project details**. It lists **Project name**, **Project ID**, and **Project number**.
   - Open **IAM & Admin > Settings**. The project details section lists **Project number**.

   Copy **Project number** only. It is usually a long number such as `123456789012`.

   Do not copy the Project ID (letters/hyphens), OAuth client ID (ends in `.apps.googleusercontent.com`), or API key. Put the number in `.env` like this:

   ```dotenv
   GOOGLE_CLOUD_PROJECT_NUMBER="123456789012"
   ```

   If you have Google Cloud Shell or the `gcloud` CLI, you can retrieve it with:

   ```bash
   gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
   ```

   Replace `YOUR_PROJECT_ID` with the letters/hyphens value shown in **Project info**. Google’s [project-identification guide](https://docs.cloud.google.com/resource-manager/docs/view-update-projects) documents these project identifiers.

### 5.2 Configure the application identity and permissions

**Data Access means the permissions Memoria asks users to approve.** Google calls each permission a *scope*. You configure the permission list here; each user still chooses whether to grant it when connecting their account.

#### 5.2.1 Finish the initial Google Auth Platform setup

1. Check the project selector at the top of Google Cloud Console. Select the Memoria project where you enabled Drive API and Picker API in Step 5.1.
2. Open **Google Auth Platform**. If Google says it is not configured, click **Get Started**.
3. For **App Information**, enter `Memoria` as the app name and select your support email. Click **Next**.
4. For **Audience**, choose **External**. Click **Next**.
5. For **Contact Information**, enter an email address you monitor. Click **Next**.
6. Review the displayed policy, accept it if you agree, then click **Continue** and **Create**.
7. If the application was already configured, skip the wizard. Check **Audience** is External, then fill in the app's homepage, privacy policy, terms and authorized domains under **Branding**. Complete the production branding requirements before launch. See [Google's setup overview](https://support.google.com/cloud/answer/15544987) and [brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

#### 5.2.2 Open the scope selector

1. In the Google Auth Platform sidebar, click **Data Access**. You can also open [the Data Access page](https://console.cloud.google.com/auth/scopes), then check that the correct project is selected.
2. Click **Add or Remove Scopes**.
3. A scope-selection panel opens. Its table contains checkboxes and a **Scope** column. Select the three entries below. Use the filter/search control to find one at a time; leave each selected when changing the filter.

| What to search for | Scope to select | Why Memoria needs it |
| --- | --- | --- |
| `openid` | `openid` | Identifies the Google account being connected. |
| `userinfo.email` | `https://www.googleapis.com/auth/userinfo.email` | Displays the connected account's email in Settings. |
| `drive.file` | `https://www.googleapis.com/auth/drive.file` | Grants access to individual files the user selects through Picker. |

Google may abbreviate the URLs in the table as `.../auth/userinfo.email` or `.../auth/drive.file`. Match the scope name, not just the API name. The app's authorization request uses `email`; the console can show that email permission as `userinfo.email`.

#### 5.2.3 If you cannot find a scope, add it manually

1. Stay inside **Add or Remove Scopes** and scroll to **Manually add scopes**. Do not paste into the table's search/filter box.
2. Paste these scope values into the manual-entry field, one per line:

   ```text
   openid
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/drive.file
   ```

3. Click **Add to Table**. If your console accepts one entry at a time, add each line separately.
4. Confirm that the three entries are present and selected. If an entry was already selected, do not add a duplicate.
5. Click **Update** at the bottom of the panel.
6. Back on Data Access, click **Save** if shown. Do not stop after merely pasting the values.

Google documents the manual-entry **Add to Table** control in its [OAuth scope-selection walkthrough](https://developers.google.com/workspace/chat/authenticate-authorize-chat-user). That walkthrough uses a Chat permission; use the three Memoria values above instead.

#### 5.2.4 Confirm the result before continuing

1. On Data Access, confirm that the saved scopes include `openid`, `userinfo.email` and `drive.file`. They should appear as non-sensitive scopes. For a dedicated Memoria project, no sensitive or restricted scope is needed for this integration.
2. If you selected `drive`, `drive.readonly`, or a Gmail-reading scope by mistake, reopen **Add or Remove Scopes**, deselect the unintended entry, then **Update** and **Save**. If this project also serves other applications, check their requirements before removing shared configuration.
3. Refresh Data Access and confirm the intended entries remain saved.
4. Continue to **Step 5.3** to create the OAuth client. Scope values are not client IDs, client secrets or API keys, and do not belong in those `.env` fields.

The Drive permission's user-facing description can mention creating, editing or deleting selected files. That is Google's permission bundle for `drive.file`; Memoria's connected import code only reads selected Google Docs. See [Google Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

Saving Data Access does **not** publish the app. Complete **Step 5.5** for production access without maintaining a list of test-user emails. The official [consent-screen guide](https://developers.google.com/workspace/guides/configure-oauth-consent) also covers selecting and saving scopes.

| If you get stuck | What to check |
| --- | --- |
| Data Access is missing | Finish the Get Started wizard and confirm you are in Google Auth Platform for the right project. |
| The scope table is empty or Drive is missing | Confirm Google Drive API is enabled in this project, refresh, or use Manually add scopes. |
| Pasted scopes disappear | Click Add to Table, then Update, then Save if shown. |
| The page is read-only or editing is denied | Ask the Cloud project owner for permission to manage this project's OAuth configuration. |
| Google asks for email addresses under Test users | That is the Audience page, not Data Access. Public launch is covered in Step 5.5. |

### 5.3 Create the web OAuth client

1. Open **Google Auth Platform > Clients** and create a **Web application** client.
2. Add the production origin to **Authorized JavaScript origins**:

   ```text
   https://memoria.example.com
   ```

3. Add this exact **Authorized redirect URI**:

   ```text
   https://memoria.example.com/api/integrations/google/callback
   ```

4. For local development, configure the development client with:

   ```text
   JavaScript origin: http://localhost:3000
   Redirect URI:      http://localhost:3000/api/integrations/google/callback
   ```

5. Copy the client ID and client secret. Keep the secret server-side. See [Google OAuth client configuration](https://support.google.com/cloud/answer/15549257).

These are integration callbacks, not NextAuth Google-login callbacks. Users first sign in with their Memoria account, then connect Drive.

### 5.4 Create and restrict the Picker API key

There are two separate settings: **Application restrictions** controls which websites can use the key; **API restrictions** controls which Google APIs it can call. The current website option is labeled **Websites**. "HTTP referrers" describes how it works, not an API to select.

1. Open [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials) and select your Memoria Cloud project.
2. Under **API Keys**, click your Picker key's name to open its edit page. Do not open the OAuth client under **OAuth 2.0 Client IDs** or the Google Picker API's service overview page.
3. If you have no API key, use **Create credentials > API key**. Create a standard API key, not a key bound to a service account. If the creation screen only asks which APIs to allow, select Google Picker API, finish creation, then open the new key's edit page.
4. Find **Application restrictions** (or **Set an application restriction**) on the key's edit page and select **Websites**.
5. Under the **Website restrictions** section that appears, use **Add** or **Add an item** to enter each allowed referrer separately:

   ```text
   https://memoria.example.com/*
   https://docs.google.com/*
   ```

6. Replace `memoria.example.com` with your real domain. For a development key, also allow `http://localhost:3000/*`.
7. In the separate **API restrictions** section, select **Restrict key**, then select **Google Picker API** from the API list. Websites will not appear in this list.
8. Click **Save**. Reopen the key and confirm that both its website entries and API restriction were saved.

Picker is hosted in a Google iframe, which is why its referrer must also be allowed. See [Google Picker setup](https://developers.google.com/workspace/drive/picker/guides/web-picker).

| What you see instead | What to do |
| --- | --- |
| Authorized JavaScript origins / Authorized redirect URIs | You opened an OAuth client. Return to Credentials and open a key under API Keys. |
| Only a list of Google APIs | You are editing API restrictions. On the full key edit page, find the separate Application restrictions section. |
| Only IP address restrictions are available | Check whether this is an authorization key bound to a service account. Create a separate standard API key for browser Picker use; do not repurpose the service-account key. |
| No edit controls or a permission error | Ask the Cloud project owner for permission to manage API keys. |

Google distinguishes standard keys from service-account authorization keys; the latter only support IP application restrictions. See [Google's API key restrictions documentation](https://docs.cloud.google.com/docs/authentication/api-keys).

### 5.5 Save the credentials and publish

1. Set these variables in the appropriate environment:

   ```dotenv
   GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
   GOOGLE_PICKER_API_KEY="YOUR_RESTRICTED_PICKER_KEY"
   GOOGLE_CLOUD_PROJECT_NUMBER="YOUR_NUMERIC_PROJECT_NUMBER"
   ```

2. For the production Google app, open **Audience** and publish it so the status is **In production**.
3. Complete any verification Google requires. Publishing and verification are distinct checks.
4. Do not leave the public app in **Testing**, which restricts this flow to registered test users. **External + In production**, with the applicable verification completed, is how you avoid manually adding every user's Gmail address. See [Google audience settings](https://support.google.com/cloud/answer/15549945).
5. Restart locally or redeploy production after setting the variables.

Google Workspace administrators can still restrict third-party apps for their users. Public configuration does not override organizational policy. See [Google OAuth application states](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).

If you previously authorized Memoria with broad `drive.readonly` access, remove the old grant from Google's connected-app settings and reconnect to use the selected-file flow.

## Step 6: configure Notion for all workspaces

1. Open the [Notion developer portal](https://www.notion.so/profile/integrations).
2. Create a **public OAuth connection**, not an internal connection.
3. Choose installation scope **Any workspace**. Do not choose **Selected workspaces only**. Notion documents this choice as fixed at creation, so a restricted connection may need to be recreated.
4. Enable **Read content**. Imports do not need insert/update-content permissions.
5. Complete the app information and applicable public-distribution review steps requested by Notion. Marketplace listing is separate.
6. Register this production redirect URI:

   ```text
   https://memoria.example.com/api/integrations/notion/callback
   ```

7. For local testing, register `http://localhost:3000/api/integrations/notion/callback` if supported by your connection configuration.
8. Copy the **OAuth client ID** and **OAuth client secret**, not an internal token or authorization URL:

   ```dotenv
   NOTION_CLIENT_ID="YOUR_OAUTH_CLIENT_ID"
   NOTION_CLIENT_SECRET="YOUR_OAUTH_CLIENT_SECRET"
   ```

9. Restart locally or redeploy. Each user authorizes their own workspace and selects pages; you do not register their email individually. Page-sharing rights and workspace restrictions still apply. See [Notion's public authorization guide](https://developers.notion.com/guides/get-started/authorization).

## Step 7: configure AI generation

Drive/Notion credentials do not provide AI access. Choose one or both options below, or retain the manual prompt-copying workflow.

### Option A: deployment-owned AI access

1. Obtain an API key from a provider supported by this app: OpenAI, Anthropic or Google Gemini.
2. Choose a model ID available to that API account. Use the provider's exact model ID; model availability can differ between accounts and gateways.
3. Configure the app's server variables:

   ```dotenv
   AI_SYSTEM_PROVIDER="OPENAI"
   AI_SYSTEM_MODEL="YOUR_AVAILABLE_MODEL_ID"
   AI_SYSTEM_API_KEYS="YOUR_PROVIDER_API_KEY"
   AI_SYSTEM_BASE_URL=""
   ```

4. Use `ANTHROPIC` or `GEMINI` for the other supported providers. Leave `AI_SYSTEM_BASE_URL` empty for direct provider connections.
5. For an OpenAI-compatible gateway, use `AI_SYSTEM_PROVIDER="OPENAI"`, the gateway's API key/model, and its documented base URL, typically ending in `/v1`. The app appends `/chat/completions`; do not put that full endpoint into the base URL.
6. To configure backup keys for the same provider, separate them with commas or newlines in `AI_SYSTEM_API_KEYS`. The app tries the configured candidates in order after failures.
7. Restart or redeploy, then generate a short note to verify the provider/model/key combination.

The shared pool is available to visitors, including guests. Usage is charged to its API account. Structural SVG repair can require an additional generation request. Configure provider-side spending controls appropriate to your deployment.

### Option B: each user's personal AI keys

1. Ensure `INTEGRATION_ENCRYPTION_KEY` is configured and stable.
2. The user signs in and opens **Settings > AI providers**.
3. They choose the provider and enter their API key, model ID and an optional label.
4. They select **Save encrypted key** and repeat for any backup keys.
5. They select personal AI access in the generation workflow and test a short request.

Personal AI keys belong to the signed-in user. The shared deployment key is configured separately. Without either option, users can still copy the generated prompt into an external AI tool and paste the result back.

### SVG and PDF settings

No additional SVG service, image-generation key or animation package is required.

1. Select **Visual & Creative** for more detailed visual teaching. Other styles retain information-first explanations with useful diagrams.
2. Generate a reviewer and check its diagram labels, relationships, units and completeness. Structural validation catches some broken markup; it cannot certify factual or visual accuracy.
3. For a PDF containing diagrams, use **Files & documents** to upload it.
4. When the app identifies graphics, choose **Use an AI/OCR tool** if you want to reconstruct them.
5. Copy the prepared prompt and attach the **original PDF or page images** in your external AI/OCR tool. The extracted text alone cannot show all figure relationships.
6. Paste the completed Markdown back into Memoria. Repair reported SVG errors, review the result, then save.

PDF figure reconstruction uses this explicit AI/OCR workflow; uploading a PDF does not automatically send its pages to a vision model. You may choose partial-text import instead.

Animations are enabled by the application code. Reduced-motion preferences intentionally suppress them; there is no environment variable to enable motion.

## Step 8: deploy to Vercel

1. Import this repository into a Vercel project using the Next.js framework preset. Keep the repository root as the project root and use Node.js 22.x.
2. Add the production values in the project's **Settings > Environment Variables**. Select **Production** for the live site's variables. Store secrets using the dashboard's Secret option where available, and paste raw values without the surrounding `.env` quotation marks.
3. Set production `NEXTAUTH_URL` to your stable HTTPS origin. Local `.env` values are not automatically production environment variables.
4. Keep the repository's `vercel.json` build command, `npm run vercel-build`. That script applies existing database migrations for production, generates Prisma Client and builds Next.js. Preview deployments skip migrations; prepare a separate preview database if using previews.
5. Deploy. Environment changes apply to new deployments, so redeploy whenever credentials or URLs change. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
6. Open the deployed `/api/health` endpoint, then test registration, sign-in, note creation and integrations.

Do not assign production credentials or the production database to untrusted preview deployments. If you change domains, update `NEXTAUTH_URL`, both OAuth callback configurations, and the Google Picker referrer restrictions together.

The app defaults to a 10 MB upload limit, but the hosting platform can impose a lower request-body limit. Increasing `MAX_UPLOAD_SIZE_BYTES` does not increase the host limit. If uploads return HTTP 413 before reaching the app, use smaller files or implement a separate upload-storage flow. AI requests can also hit the host's function-duration limit. Check your deployment settings against [Vercel function limits](https://vercel.com/docs/functions/limitations).

## Step 9: check the complete production variable list

| Variable | Value/source |
| --- | --- |
| `DATABASE_URL` | Production PostgreSQL connection string |
| `AUTH_SECRET` | Existing stable secret, or a newly generated value for a fresh installation |
| `NEXTAUTH_URL` | Production HTTPS origin |
| `INTEGRATION_ENCRYPTION_KEY` | Stable encryption secret |
| `GOOGLE_CLIENT_ID` | Google's web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google's web OAuth client secret |
| `GOOGLE_PICKER_API_KEY` | Restricted Picker key from the same project |
| `GOOGLE_CLOUD_PROJECT_NUMBER` | Numeric Cloud project number |
| `NOTION_CLIENT_ID` | Public Notion OAuth client ID |
| `NOTION_CLIENT_SECRET` | Public Notion OAuth client secret |
| `RESEND_API_KEY` | Transactional email API key |
| `EMAIL_FROM` | Sender on a verified domain |
| `AI_SYSTEM_PROVIDER` | `OPENAI`, `ANTHROPIC`, or `GEMINI` for shared AI |
| `AI_SYSTEM_MODEL` | Exact model ID available to your API account |
| `AI_SYSTEM_API_KEYS` | Shared AI key or comma/newline-separated fallback keys |
| `AI_SYSTEM_BASE_URL` | Empty for direct access; gateway base URL when applicable |
| `MAX_UPLOAD_SIZE_BYTES` | App file-size limit; example default is `10485760` |
| `CRON_SECRET` | Optional independent secret for the cleanup endpoint |

Leave optional service variables empty until you configure that service. Do not paste illustrative placeholders as working credentials. All four Google variables are required for the Connect button to be available.

## Step 10: connect and import as a user

1. Register/sign in to a Memoria account. Complete email verification if enabled.
2. Open **Settings > Connected accounts**.
3. Select **Connect** beside Google Drive, choose the user's Google account, and complete consent.
4. Select **Connect** beside Notion, choose the user's workspace and pages, and complete consent.
5. Confirm that Settings shows the intended Google email and Notion workspace.
6. Open **Notes > Import > Connected sources**.
7. For Drive, select **Choose from Google Drive**, choose a Google Doc and select **Import document**. Previously authorized Docs appear in the list.
8. For Notion, select an authorized page and import it. Use **Load more documents** if necessary.
9. Use **Reconnect** to change accounts or revise Notion page access. Each Memoria account stores one connection per provider.
10. Use **Disconnect** to remove stored credentials from Memoria. Existing imported notes remain. To revoke the provider-side grant as well, remove Memoria in the provider's connected-app settings.

Connected Drive imports support Google Docs. Use file upload for PDFs, Word documents and PowerPoint files. Notion imports selected page text and nested blocks; it is not a full recursive workspace/database synchronization service.

## Step 11: verify public access and user isolation

1. Create two independent Memoria test accounts, A and B.
2. Connect A to one Google account and Notion workspace.
3. In another browser profile, connect B to a different Google account and Notion workspace.
4. Confirm that account B cannot see A's connection metadata or private imported notes. Do not share those notes or source documents between the accounts during this test.
5. Import one document as each user, then reopen the imported notes.
6. Test Google with an account that is not a project member and is not on a test-user list. Test Notion with a workspace outside the developer's own workspace.
7. Cancel an OAuth consent screen and confirm Memoria explains the cancellation. Retry successfully.
8. Reconnect to a different provider account, then test disconnect and reconnect.
9. Test account verification/password reset and a direct AI generation request.
10. Review a generated SVG and an imported PDF figure at normal and expanded sizes. Confirm reduced-motion behavior on a device with that preference enabled.

For local code verification, run:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Automated tests do not confirm your Google/Notion application is publicly published, that email DNS is correct, or that live consent works. Complete the manual checks after configuring the provider dashboards.

## Step 12: optional scheduled cleanup

1. Generate a separate random secret and save it as `CRON_SECRET`.
2. Configure your chosen scheduler to make a **POST** request to:

   ```text
   https://memoria.example.com/api/maintenance/cleanup
   ```

3. Set this request header using the scheduler's secret store:

   ```text
   Authorization: Bearer YOUR_CRON_SECRET
   ```

4. Run it once and confirm the response contains deletion counts. Then choose an interval, such as daily.

The endpoint deletes expired account tokens/invites, old rate-limit buckets and old read notifications. The repository does not currently configure a schedule. Use a scheduler that supports POST and authorization headers; simply opening the URL in a browser will not run cleanup.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| PowerShell blocks `npm.ps1` | Use the `npm.cmd` commands above. |
| `/api/health` reports unavailable database | Check URL, database availability, SSL and network access. |
| Prisma reports missing tables | Apply the existing migrations to the correct database. |
| Connect button is disabled | Check the required environment variables and restart/redeploy. |
| Google accepts only specific Gmail addresses | Confirm External audience, In production status and applicable verification. |
| `redirect_uri_mismatch` | Match hostname, protocol, port and callback path exactly. |
| Google Picker API key is invalid | Check both APIs, matching project number/client/key, and website restrictions including `docs.google.com`. |
| Drive list is empty | First authorize a Google Doc through Choose from Google Drive. |
| Notion works only in your workspace | Confirm a public OAuth connection with Any workspace scope. |
| Notion page is missing | Reconnect, select the page or parent, and check sharing rights/workspace policy. |
| OAuth state expired | Start Connect again in the same browser while signed in. |
| Saved credentials fail after a deployment | Check that the encryption secret has not changed; reconnect if recovery is impossible. |
| Users cannot receive verification emails | Verify Resend sender domain, key and delivery logs; do not use the restricted test sender for launch. |
| Shared AI says not configured | Set the provider and shared API key; redeploy. |
| AI rejects the model/key | Check model access, provider, billing/quota and gateway URL. |
| Uploaded PDF has text but no diagrams | Choose the AI/OCR reconstruction workflow and attach the original PDF to the external tool. |
| Upload fails with 413 | Check the hosting request-size limit as well as the app limit. |
| Animations do not play | Check both the account's Reduce motion preference and the device's reduced-motion setting. |

For connection-specific implementation details, see [the connections guide](docs/connections-setup.md). The environment template is [.env.example](.env.example).
