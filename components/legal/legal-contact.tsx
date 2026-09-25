export function LegalContact() {
  const email = process.env.SUPPORT_EMAIL?.trim();

  return email ? (
    <p>For support, privacy questions, or requests about your personal data, contact the Memoria operator at <a href={`mailto:${email}`}>{email}</a>. Include the email associated with your account, but never send your password or API keys.</p>
  ) : (
    <p>For support or privacy requests, contact the Memoria operator using the support email displayed on the Google authorization screen when connecting Memoria. You can also export your data or delete your account in Settings &gt; Account and privacy.</p>
  );
}
