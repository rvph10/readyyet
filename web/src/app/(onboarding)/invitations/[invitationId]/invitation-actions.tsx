"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { ActionFailure } from "@/lib/api/errors";
import { authClient } from "@/lib/auth-client";
import { acceptInvitation, declineInvitation } from "./actions";

const KNOWN_ERRORS = ["NOT_FOUND", "UNAUTHORIZED", "CONFLICT"];

type Answer = "accept" | "decline";

interface Props {
  invitationId: string;
  // The invited address, where a signed-out visitor's code goes.
  email: string;
  signedIn: boolean;
  // Said in a toast after accepting, translated by the page, which has the
  // names.
  joined: string;
}

// ADR 0064: the same Decline and Accept signed in or out. Signed out, an
// answer sends the sign-in code to the invited address and opens sign-in, and
// finishes here on the way back. It waits in this tab's storage rather than
// the link, so a link can't answer for anyone (ADR 0083). Declining
// can't be undone, only a new invitation brings it back, so it asks once
// more first (ADR 0051). Accepting leads to the Location, whose page doesn't
// say it was just joined, so a toast does (ADR 0062).
export function InvitationActions({ invitationId, email, signedIn, joined }: Props) {
  const t = useTranslations("invitation");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [codeFailed, setCodeFailed] = useState<"rateLimited" | "unexpected" | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [running, setRunning] = useState<Answer | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingAnswerKey = `invitation-answer:${invitationId}`;

  function finish(answer: Answer) {
    startTransition(async () => {
      setRunning(answer);
      if (answer === "decline") {
        // Declined, the action shows the page again, as declined.
        const outcome = await declineInvitation(invitationId);
        if (!outcome.ok) setFailure(outcome);
        return;
      }
      const outcome = await acceptInvitation(invitationId);
      if (!outcome.ok) {
        setFailure(outcome);
        return;
      }
      toast({ message: joined });
      router.push(`/locations/${outcome.locationId}`);
    });
  }

  function signInFirst(answer: Answer) {
    startTransition(async () => {
      try {
        const { error } = await authClient.emailOtp.sendVerificationOtp(
          { email, type: "sign-in" },
          // The code email takes the page's language (ADR 0047).
          { headers: { "Accept-Language": locale } },
        );
        if (error) {
          setCodeFailed(error.status === 429 ? "rateLimited" : "unexpected");
          return;
        }
      } catch {
        // Better Auth's client throws when the request never reaches the API.
        setCodeFailed("unexpected");
        return;
      }
      sessionStorage.setItem(pendingAnswerKey, answer);
      router.push(`/sign-in?${new URLSearchParams({ next: `/invitations/${invitationId}`, sentTo: email })}`);
    });
  }

  function answer(given: Answer) {
    setRunning(given);
    setFailure(null);
    setCodeFailed(null);
    if (signedIn) finish(given);
    else signInFirst(given);
  }

  // Back from sign-in with an answer already given. Removed first, so it
  // finishes once, and Back to this page can't send it again.
  useEffect(() => {
    if (!signedIn) return;
    const given = sessionStorage.getItem(pendingAnswerKey) as Answer | null;
    if (!given) return;
    sessionStorage.removeItem(pendingAnswerKey);
    finish(given);
  });

  const busyLabel = signedIn ? { accept: t("accepting"), decline: t("declining") } : null;

  return (
    <div className="mt-7 flex flex-col gap-4 text-left">
      {failure && (
        <FormAlert>{t(KNOWN_ERRORS.includes(failure.code) ? `errors.${failure.code}` : "errors.unexpected")}</FormAlert>
      )}
      {codeFailed && <FormAlert>{t(`codeErrors.${codeFailed}`)}</FormAlert>}
      {confirmingDecline ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-subtle p-4">
          <p className="text-p-sm">{t("declineConfirm")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" disabled={pending} onClick={() => setConfirmingDecline(false)}>
              {t("keep")}
            </Button>
            <Button
              variant="danger"
              size="lg"
              disabled={pending}
              pending={pending && running === "decline"}
              pendingLabel={busyLabel?.decline ?? t("sendingCode")}
              onClick={() => answer("decline")}
            >
              {t("decline")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button
            variant="danger-secondary"
            size="lg"
            disabled={pending}
            onClick={() => setConfirmingDecline(true)}
            className="px-6"
          >
            {t("decline")}
          </Button>
          <Button
            size="lg"
            disabled={pending}
            pending={pending && running === "accept"}
            pendingLabel={busyLabel?.accept ?? t("sendingCode")}
            onClick={() => answer("accept")}
            className="whitespace-nowrap"
          >
            <Icon name="check" className="size-3.5" />
            {t("accept")}
          </Button>
        </div>
      )}
      {!signedIn && <p className="text-center text-p-xs text-muted">{t("codeHint", { email })}</p>}
    </div>
  );
}
