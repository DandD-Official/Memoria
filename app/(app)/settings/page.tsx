import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";
import { IntegrationConnections } from "@/components/settings/integration-connections";
import { connectionStatuses } from "@/lib/integrations/repository";
import { isProviderConfigured } from "@/lib/integrations/config";
import { AccountSettings } from "@/components/settings/account-settings";
import { AiConnections } from "@/components/settings/ai-connections";
import { DEFAULT_AI_MODELS } from "@/lib/ai/providers";
import { isCodeThemeId } from "@/lib/mmd/code-themes";
import { PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, connections, aiConnections] = await Promise.all([
    prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
    connectionStatuses(user.id),
    prisma.aiConnection.findMany({ where: { userId: user.id }, select: { id: true, provider: true, label: true, model: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <PageShell className="max-w-4xl">
      <PageHeader>
        <PageHeaderContent>
          <p className="section-kicker">Make the workspace yours</p>
          <PageTitle className="mt-2">Settings</PageTitle>
          <PageDescription>Manage preferences, connected services, and account security for {user.email}.</PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <nav aria-label="Settings sections" className="mt-5 flex flex-wrap gap-2">
        {[['Preferences', '#appearance'], ['Navigation', '#navigation'], ['Quiz defaults', '#quiz-defaults'], ['Connections', '#connections'], ['AI', '#ai-providers'], ['Account', '#account']].map(([label, href]) => <a key={href} href={href} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-accent hover:text-ink">{label}</a>)}
      </nav>

      <div className="mt-8">
        <SettingsForm
          initial={{
            appearance: settings.appearance,
            defaultQuestionCount: settings.defaultQuestionCount,
            defaultDifficulty: settings.defaultDifficulty,
            defaultQuizMode: settings.defaultQuizMode,
            showExplanations: settings.showExplanations,
            autoSave: settings.autoSave,
            sidebarMode: settings.sidebarMode === "HOVER" ? "HOVER" : "MANUAL",
            sidebarCollapsed: settings.sidebarCollapsed,
            compactLayout: settings.compactLayout,
            reduceMotion: settings.reduceMotion,
            codeTheme: isCodeThemeId(settings.codeTheme) ? settings.codeTheme : "memoria-dark",
          }}
        />
      </div>
      <IntegrationConnections
        initialData={{
          connections,
          configured: { google: isProviderConfigured("google"), notion: isProviderConfigured("notion") },
        }}
      />
      <AiConnections initialConnections={aiConnections} defaults={DEFAULT_AI_MODELS} />
      <AccountSettings initial={{ name: user.name ?? "", email: user.email ?? "" }} />
    </PageShell>
  );
}
