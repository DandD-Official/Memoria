import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LegalContact } from "@/components/legal/legal-contact";

export const metadata: Metadata = {
  title: "Privacy Policy | Memoria",
  description: "How Memoria accesses, uses, stores, and shares your account information, study material, and connected Google Drive and Notion data.",
};

const sections: LegalSection[] = [
  {
    id: "overview", title: "About this policy",
    content: <p>This policy explains how Memoria handles information when you use its website and study tools. Memoria helps you import material, create notes and study guides, practice, and share resources. Google Drive, Notion, and AI connections are optional. This policy applies to Memoria; services you connect have their own privacy policies.</p>,
  },
  {
    id: "information", title: "Information we handle",
    content: <ul>
      <li><strong>Account details:</strong> your name, email address, password hash, account dates, verification records, and preferences. Passwords are hashed rather than stored as plain text.</li>
      <li><strong>Study material:</strong> content you upload, import, create, or save, including notes, images, diagrams, reviewers, quizzes, flashcards, revisions, and collections.</li>
      <li><strong>Activity and sharing:</strong> attempts, study progress, sessions, invitations, permissions, comments, reports, and notifications.</li>
      <li><strong>Connections:</strong> authorization tokens and account or workspace details needed to identify and use your connected services. Personal AI API keys are stored if you add them.</li>
      <li><strong>Technical information:</strong> session identifiers, browser information, request metadata, and IP addresses used for security and request limits. Hosting services may also process operational logs.</li>
    </ul>,
  },
  {
    id: "connected-services", title: "Google Drive and Notion",
    content: <>
      <p><strong>Google Drive:</strong> after you authorize a connection, Memoria receives your Google account identifier and email, authorization tokens, and information about files available to the app. It uses the <code>drive.file</code> permission to access files you select or authorize for Memoria, rather than requesting access to your entire Drive. When you import a selected Google Doc, Memoria reads its title and text and saves a copy as a note. The current import feature does not edit or delete your original Drive files and does not access Gmail messages.</p>
      <p><strong>Notion:</strong> after authorization, Memoria stores tokens and identifying workspace details. It lists pages available to the connection and reads a selected page and its supported nested blocks when you import it. The result is saved as a note. You control the pages shared with the connection in Notion. Importing does not edit or delete the original page.</p>
      <p>Each connection belongs to the Memoria account that authorized it. Connecting alone does not publish your documents or send them to an AI provider. Imported notes can later be used in AI generation or shared when you choose those features.</p>
      <p>Memoria follows the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including its Limited Use requirements. Google data is used to provide the features you request, not for advertising, sale to data brokers, or credit decisions. Data obtained through Google Workspace APIs is not used to develop, improve, or train generalized AI or machine-learning models. Human access is limited to your permission, necessary security investigations, or legal obligations.</p>
    </>,
  },
  {
    id: "use-and-ai", title: "How information is used",
    content: <>
      <p>We use information to run your account, save and display study material, import selected content, generate study aids you request, track progress, enable sharing, deliver account messages, and protect the service against abuse.</p>
      <p>When you request AI generation, your selected source material and instructions are sent to the chosen AI service, such as OpenAI, Anthropic, Google Gemini, or the gateway configured for shared AI access. This can include imported Drive or Notion content. Additional requests may be needed to repair generated output. The service processes that information under its own terms and privacy practices; provider retention can differ. Only submit material you are permitted to send to that provider.</p>
      <p>If you copy a prompt or attach a PDF to an external AI or OCR tool yourself, you control that transfer. Guest requests also involve server processing and, when requested, AI processing, even without a saved Memoria account.</p>
    </>,
  },
  {
    id: "sharing", title: "Sharing and service providers",
    content: <>
      <p>Infrastructure providers process data needed to operate Memoria, including Vercel for hosting and the configured database service for storage. When email delivery is enabled, Resend processes recipient details and account messages. AI services receive the content described above when you request generation. Processing may occur in countries other than your own.</p>
      <p>People you invite can access resources according to the permissions you grant. Public links and published collections make material accessible to their audience, potentially anyone with the link. People may retain copies they have downloaded. Review sharing settings before including personal or confidential information.</p>
      <p>We do not sell your personal data or use connected-service content for targeted advertising. Information may be disclosed when necessary to meet legal obligations or address fraud, abuse, or security issues.</p>
    </>,
  },
  {
    id: "storage", title: "Storage and security",
    content: <>
      <p>Saved account information and study content are stored in the application database. OAuth access and refresh tokens and saved personal AI keys are encrypted at rest. Access to account resources is checked on the server. These protections reduce risk, but no storage or transmission method is completely secure.</p>
      <p>Account data and saved material remain while you use the service unless you delete them. Expired verification records, rate-limit records, and other operational data may remain until maintenance removes them. Infrastructure logs and backups can have separate retention periods and may not disappear immediately when you delete active account data.</p>
    </>,
  },
  {
    id: "your-choices", title: "Your choices and deletion",
    content: <ul>
      <li><strong>Review, correct, and export:</strong> update your profile and use Download my data in <Link href="/settings#account">Settings &gt; Account and privacy</Link>. Individual resource exports are also available. Account exports exclude passwords and secret connection tokens.</li>
      <li><strong>Disconnect:</strong> use <Link href="/settings#connections">Settings &gt; Connected accounts</Link> to remove Memoria&apos;s saved connection tokens. Disconnecting does not delete imported notes or revoke the provider-side authorization. Remove Memoria from <a href="https://myaccount.google.com/connections">Google account connections</a> or your Notion connection settings to revoke that authorization as well.</li>
      <li><strong>Remove content or sharing:</strong> delete saved resources and disable public links or remove sharing permissions. Copies already exported by others are outside Memoria&apos;s control.</li>
      <li><strong>Delete your account:</strong> confirm your password in Settings &gt; Account and privacy. This removes your account and associated owned resources and connections from the active database. It does not delete your original Drive or Notion documents or data already held by external AI services.</li>
      <li><strong>Request help:</strong> depending on your location, you may have additional rights to access, correct, delete, restrict, or object to processing, or to complain to a data protection authority. Contact us to make a request; we may need to verify account ownership.</li>
    </ul>,
  },
  {
    id: "browser-storage", title: "Cookies and browser storage",
    content: <p>Memoria uses cookies for authentication, session security, and connection authorization. Browser storage remembers preferences and tools such as your theme, recent searches, timer settings, guest bookmarks, and remembered login email when selected. You can clear these through your browser settings; doing so may sign you out or reset preferences. The application does not include advertising trackers.</p>,
  },
  {
    id: "changes", title: "Changes to this policy",
    content: <p>We will update this page and its date when practices change. If connected-service data would be used for a new purpose requiring consent, we will explain that use and seek consent before proceeding. See also our <Link href="/terms-of-service">Terms of Service</Link>.</p>,
  },
  { id: "contact", title: "Contact", content: <LegalContact /> },
];

export default function PrivacyPolicyPage() {
  return <LegalPage title="Privacy policy" description="What Memoria handles, why it is needed, and how you stay in control of your account and study material." sections={sections} />;
}
