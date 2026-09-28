"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import type { ActionResult } from "@/lib/api/errors";
import { acceptInvitation, declineInvitation } from "./actions";

const KNOWN_ERRORS = ["NOT_FOUND", "UNAUTHORIZED", "CONFLICT"];

// Declining can't be undone, only a new invitation brings it back, so it
// asks once more before (ADR 0051).
export function InvitationActions({ invitationId }: { invitationId: string }) {
  const t = useTranslations("invitation");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"accept" | "decline" | null>(null);

  function run(kind: "accept" | "decline", action: (id: string) => Promise<ActionResult>) {
    setRunning(kind);
    startTransition(async () => setResult(await action(invitationId)));
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
              onClick={() => run("decline", declineInvitation)}
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
            onClick={() => run("accept", acceptInvitation)}
          >
            <Icon name="check" className="size-3.5" />
            {t("accept")}
          </Button>
        </div>
      )}
    </div>
  );
}
