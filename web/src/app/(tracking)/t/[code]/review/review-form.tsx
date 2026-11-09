"use client";

import { FEEDBACK_MAX_LENGTH, FEEDBACK_TAGS, type FeedbackTag } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { orFailure } from "@/lib/api/or-failure";
import { sendFeedback } from "../actions";
import { GoogleChoice } from "./google-choice";

interface Props {
  code: string;
  stars: number;
  savedTags: FeedbackTag[];
  // Null when the shop set no Google review link.
  reviewUrl: string | null;
}

// ADR 0125: the tags, then the two choices every rating gets (ADR 0114). Nothing
// is saved until the Customer sends or leaves for Google.
export function ReviewForm({ code, stars, savedTags, reviewUrl }: Props) {
  const t = useTranslations("tracking");
  const tTags = useTranslations("feedbackTags");
  const [tags, setTags] = useState(savedTags);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const rating = { stars, tags };

  function toggle(tag: FeedbackTag) {
    setTags((current) => (current.includes(tag) ? current.filter((each) => each !== tag) : [...current, tag]));
    setSaved(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    const tooLong = text.length > FEEDBACK_MAX_LENGTH;
    setError(tooLong ? t("feedbackTooLong", { max: FEEDBACK_MAX_LENGTH }) : null);
    setFailed(false);
    if (tooLong) return;
    startTransition(async () => {
      const outcome = await orFailure(sendFeedback(code, rating, text));
      // A message closes the answer, and the page then thanks them by itself.
      if (outcome.ok) setSaved(!text);
      else if (outcome.code !== "CONFLICT") setFailed(true);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-label-md">{t("tagsTitle")}</legend>
        <p className="mt-0.5 text-p-sm text-muted">{t("tagsHint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FEEDBACK_TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tag)}
                className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-label-sm transition-colors ${
                  on ? "border-pine bg-pine text-surface" : "border-border-strong bg-surface hover:bg-subtle"
                }`}
              >
                {on && <Icon name="check" className="size-3 text-brand" />}
                {tTags(tag)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <form noValidate onSubmit={submit} className="flex flex-col gap-3 border-t border-border pt-5">
        <div>
          <h2 className="text-label-md">{t("feedbackPrivateTitle")}</h2>
          <p className="mt-0.5 text-p-sm text-muted">{t("privateNoteText")}</p>
        </div>
        {failed && <FormAlert>{t("actionFailed")}</FormAlert>}
        {saved && <FormAlert tone="success">{t("ratingSaved")}</FormAlert>}
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

      {reviewUrl && <GoogleChoice code={code} reviewUrl={reviewUrl} rating={rating} />}
    </div>
  );
}
