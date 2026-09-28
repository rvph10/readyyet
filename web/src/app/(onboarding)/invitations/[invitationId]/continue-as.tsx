"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";

// Sends the sign-in code to the invited address, then opens sign-in at the
// code step, coming back here once signed in (ADR 0051).
export function ContinueAs({ email, invitationId }: { email: string; invitationId: string }) {
  const t = useTranslations("invitation");
  const locale = useLocale();
  const router = useRouter();
  const [failed, setFailed] = useState<"rateLimited" | "unexpected" | null>(null);
  const [pending, startTransition] = useTransition();

  function continueAs() {
    startTransition(async () => {
      try {
        const { error } = await authClient.emailOtp.sendVerificationOtp(
          { email, type: "sign-in" },
          // The code email takes the page's language (ADR 0047).
          { headers: { "Accept-Language": locale } },
        );
        if (error) {
          setFailed(error.status === 429 ? "rateLimited" : "unexpected");
          return;
        }
      } catch {
        // Better Auth's client throws when the request never reaches the API.
        setFailed("unexpected");
        return;
      }
      router.push(`/sign-in?${new URLSearchParams({ next: `/invitations/${invitationId}`, sentTo: email })}`);
    });
  }

  return (
    <div className="mt-7 flex flex-col gap-4 text-left">
      {failed && <FormAlert>{t(`continueErrors.${failed}`)}</FormAlert>}
      <Button size="lg" disabled={pending} onClick={continueAs}>
        {t("continueAs", { email })}
      </Button>
      <p className="text-center text-p-xs text-muted">{t("continueHint")}</p>
    </div>
  );
}
