import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LegalContact } from "@/components/legal/legal-contact";

export const metadata: Metadata = {
  title: "Terms of Service | Memoria",
  description: "Terms for using Memoria accounts, study tools, AI generation, connected services, and sharing features.",
};

const sections: LegalSection[] = [
  {
    id: "using-memoria", title: "Using Memoria",
    content: <p>These terms govern your use of Memoria, including guest access, accounts, study tools, imports, AI generation, and sharing. By using the service, you agree to these terms. If you do not agree, do not use it. You must be legally able to agree to these terms or have the permission of a parent or guardian where required. Our <Link href="/privacy-policy">Privacy Policy</Link> explains how information is handled.</p>,
  },
  {
    id: "account", title: "Your account",
    content: <p>Provide accurate account information and keep your password and API keys secure. You are responsible for activity you authorize through your account. Do not use another person&apos;s account or connect a Google account or Notion workspace without permission. Contact us if you believe your account has been compromised.</p>,
  },
  {
    id: "content", title: "Your content and sharing",
    content: <>
      <p>You retain your rights in material you upload, import, or create. You give Memoria permission to store, process, reproduce, and display that material as needed to provide features you request, including imports, exports, AI processing, and sharing.</p>
      <p>You must have the rights and permissions needed for the content you submit and the ways you use it. Respect copyright, privacy, confidentiality, and your school or organization&apos;s rules. Do not upload another person&apos;s sensitive information without appropriate permission.</p>
      <p>You control the sharing permissions you enable. Public links and published collections may be accessed and copied by others. Removing a link or deleting content cannot recall copies others already obtained.</p>
    </>,
  },
  {
    id: "acceptable-use", title: "Acceptable use",
    content: <ul>
      <li>Do not use Memoria for unlawful activity, harassment, infringement, fraud, or distributing malicious content.</li>
      <li>Do not attempt unauthorized access, extract other users&apos; information, bypass access controls or usage limits, or disrupt the service.</li>
      <li>Do not misuse sharing, invitations, or comments to send spam or impersonate others.</li>
      <li>Use study tools consistently with applicable academic integrity and examination rules.</li>
    </ul>,
  },
  {
    id: "ai", title: "AI and imported material",
    content: <>
      <p>AI output and file extraction can contain omissions, incorrect facts, formatting problems, or inaccurate diagrams and answers. Review the result against your original sources before relying on it, sharing it, or using it in an assessment. Memoria does not guarantee accuracy, originality, or a particular learning outcome.</p>
      <p>AI features provide study assistance and are not a substitute for qualified medical, legal, financial, or other professional advice. Generated material may be similar to output provided to other users.</p>
    </>,
  },
  {
    id: "connections", title: "Connected services and costs",
    content: <>
      <p>Google Drive, Notion, and AI providers operate under their own terms, permissions, availability, and usage limits. You choose whether to connect them. Provider restrictions or revoked permissions may prevent an import or generation request.</p>
      <p>If you supply your own AI key, requests can incur charges on your provider account under its pricing. You are responsible for those charges and for securing your key. Shared AI access may be limited or unavailable.</p>
      <p>You can disconnect services in Settings. Imported notes remain until you delete them. Disconnecting Memoria does not itself revoke authorization in the provider&apos;s settings.</p>
    </>,
  },
  {
    id: "availability", title: "Availability and responsibility",
    content: <>
      <p>Memoria is provided as available. Features may change, and interruptions, errors, or data loss can occur. Keep independent copies of important material using the export tools.</p>
      <p>To the extent permitted by applicable law, the service is provided without warranties of uninterrupted operation, fitness for a particular purpose, or error-free results. The Memoria operator is not responsible for indirect or consequential losses caused by use of, or inability to use, the service. Nothing in these terms excludes rights or liability that cannot lawfully be excluded.</p>
    </>,
  },
  {
    id: "ending-use", title: "Ending use",
    content: <p>You may stop using Memoria at any time and export or delete your account from <Link href="/settings#account">Settings &gt; Account and privacy</Link>. Access may be restricted or suspended to address violations of these terms, security risks, legal obligations, or discontinuation of the service. Deletion and retention are described in the <Link href="/privacy-policy#your-choices">Privacy Policy</Link>.</p>,
  },
  {
    id: "changes", title: "Changes to these terms",
    content: <p>These terms may be updated as the service changes. The current version and its update date appear on this page. Material changes will be communicated through an appropriate service notice. Where consent is required by law, we will request it. Otherwise, continued use after updated terms take effect means you accept them.</p>,
  },
  { id: "contact", title: "Contact", content: <LegalContact /> },
];

export default function TermsOfServicePage() {
  return <LegalPage title="Terms of service" description="The responsibilities and expectations that apply when you use Memoria to collect, connect, and share what you learn." sections={sections} />;
}
