"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { orFailure } from "@/lib/api/or-failure";
import { markCollected } from "./actions";

interface Props {
  code: string;
  variant: "primary" | "secondary";
  label: string;
}

// Stops the reminders, the Status stays the Location's to change (ADR 0028). It
// records on this click only, never on opening a link (ADR 0037).
export function PickedUpButton({ code, variant, label }: Props) {
  const t = useTranslations("tracking");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function pickedUp() {
    setFailed(false);
    startTransition(async () => {
      const outcome = await orFailure(markCollected(code));
      if (!outcome.ok && outcome.code !== "CONFLICT") setFailed(true);
    });
  }

  return (
    <>
      <Button variant={variant} pending={pending} pendingLabel={t("pickedUpSaving")} onClick={pickedUp}>
        {label}
      </Button>
      {failed && (
        <div className="w-full">
          <FormAlert>{t("actionFailed")}</FormAlert>
        </div>
      )}
    </>
  );
}
