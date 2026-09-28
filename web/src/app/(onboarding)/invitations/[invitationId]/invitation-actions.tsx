"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/api/errors";
import { acceptInvitation, declineInvitation } from "./actions";

const KNOWN_ERRORS = ["NOT_FOUND", "UNAUTHORIZED", "CONFLICT"];

// Declining can't be undone, only a new invitation brings it back, so it
// asks once more before (ADR 0051).
// Accepting leads to the Location, whose page doesn't say it was just
// joined, so a toast does (ADR 0062). `joined` comes translated from the page,
// which has the names.
export function InvitationActions({ invitationId, joined }: { invitationId: string; joined: string }) {
  const t = useTranslations("invitation");
  const router = useRouter();
  const toast = useToast();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"accept" | "decline" | null>(null);

  function decline() {
    setRunning("decline");
    startTransition(async () => setResult(await declineInvitation(invitationId)));
  }

  function accept() {
    setRunning("accept");
    startTransition(async () => {
      const outcome = await acceptInvitation(invitationId);
      if (!outcome.ok) {
        setResult(outcome);
        return;
      }
      toast({ message: joined });
      router.push(`/locations/${outcome.locationId}`);
    });
  }

  return (
    <div className="mt-7 flex flex-col gap-4 text-left">
      {result?.ok === false && (
        <FormAlert>{t(KNOWN_ERRORS.includes(result.code) ? `errors.${result.code}` : "errors.unexpected")}</FormAlert>
      )}
      {confirmingDecline ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-subtle p-4">
          <p className="text-p-sm">{t("declineConfirm")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" disabled={pending} onClick={() => setConfirmingDecline(false)}>
              {t("keep")}
            </Button>
            <Button
              size="lg"
              disabled={pending}
              pending={pending && running === "decline"}
              pendingLabel={t("declining")}
              onClick={decline}
            >
              {t("decline")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" disabled={pending} onClick={() => setConfirmingDecline(true)}>
            {t("decline")}
          </Button>
          <Button
            size="lg"
            disabled={pending}
            pending={pending && running === "accept"}
            pendingLabel={t("accepting")}
            onClick={accept}
          >
            <Icon name="check" className="size-3.5" />
            {t("accept")}
          </Button>
        </div>
      )}
    </div>
  );
}
