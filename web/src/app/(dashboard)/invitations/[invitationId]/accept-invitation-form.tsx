"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { ActionResult } from "@/lib/api/errors";
import { acceptInvitation } from "./actions";

const KNOWN_ERRORS = ["NOT_FOUND", "UNAUTHORIZED", "CONFLICT"];

export function AcceptInvitationForm({ invitationId }: { invitationId: string }) {
  const t = useTranslations("invitation");
  const [result, action, pending] = useActionState<ActionResult | null>(() => acceptInvitation(invitationId), null);
  return (
    <form action={action} className="flex flex-col gap-4">
      {result?.ok === false && (
        <p role="alert" className="text-sm text-red-700">
          {t(KNOWN_ERRORS.includes(result.code) ? `errors.${result.code}` : "errors.unexpected")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-ink px-3 py-2 text-surface disabled:opacity-60"
      >
        {t("accept")}
      </button>
    </form>
  );
}
