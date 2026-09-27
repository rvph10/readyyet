"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import type { ActionResult } from "@/lib/api/errors";
import { acceptInvitation } from "./actions";

const KNOWN_ERRORS = ["NOT_FOUND", "UNAUTHORIZED", "CONFLICT"];

export function AcceptInvitationForm({ invitationId }: { invitationId: string }) {
  const t = useTranslations("invitation");
  const [result, action, pending] = useActionState<ActionResult | null>(() => acceptInvitation(invitationId), null);
  return (
    <form action={action} className="mt-7 flex flex-col gap-4 text-left">
      {result?.ok === false && (
        <FormAlert>{t(KNOWN_ERRORS.includes(result.code) ? `errors.${result.code}` : "errors.unexpected")}</FormAlert>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        <Icon name="check" className="size-3.5" />
        {t("accept")}
      </Button>
    </form>
  );
}
