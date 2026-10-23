"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/api/endpoints";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/misc";
import { ProfileSection } from "./profile-section";
import { FarmsSection } from "./farms-section";
import { FeedbackSection } from "./feedback-section";

export function SettingsPage() {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const signOut = async () => {
    try {
      await auth.logout();
    } catch {
      /* cookies are cleared server-side; leave regardless */
    }
    qc.clear();
    router.replace("/login");
  };
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader kicker={t("nav.more")} title={t("nav.settings")} />
      <ProfileSection />
      <FarmsSection />
      <FeedbackSection />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">{t("settings.signOutTitle")}</h2>
          <p className="text-sm text-ink2">{t("settings.signOutLead")}</p>
        </div>
        <Button variant="secondary" onClick={() => void signOut()}>{t("settings.signOut")}</Button>
      </Card>
    </div>
  );
}
