"use client";

import { FEEDBACK_MAX_LENGTH } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { fieldErrors } from "@/lib/validation";
import { sendFeedback } from "../actions";

// Once sent, the page shows its thanks in place of this form.
export function PrivateFeedbackForm({ code }: { code: string }) {
  const t = useTranslations("tracking");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = z
      .object({
        message: z
          .string()
          .trim()
          .min(1, t("feedbackMissing"))
          .max(FEEDBACK_MAX_LENGTH, t("feedbackTooLong", { max: FEEDBACK_MAX_LENGTH })),
      })
      .safeParse({ message });
    setError(parsed.success ? null : fieldErrors(parsed.error).message);
    setFailed(false);
    if (!parsed.success) return;
    startTransition(async () => {
      const outcome = await sendFeedback(code, parsed.data.message);
      if (!outcome.ok && outcome.code !== "CONFLICT") setFailed(true);
    });
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      {failed && <FormAlert>{t("actionFailed")}</FormAlert>}
      <TextareaField
        label={t("feedbackPrivateTitle")}
        hideLabel
        placeholder={t("feedbackPlaceholder")}
        value={message}
        maxLength={FEEDBACK_MAX_LENGTH}
        error={error}
        onChange={(event) => setMessage(event.target.value)}
      />
      <Button type="submit" pending={pending} pendingLabel={t("feedbackSending")} className="self-start">
        {t("feedbackSend")}
      </Button>
    </form>
  );
}
