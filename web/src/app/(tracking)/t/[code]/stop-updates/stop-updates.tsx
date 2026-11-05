"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { stopUpdates } from "../actions";

interface Props {
  code: string;
  title: string;
  stillToBeReady: boolean;
  trackingPath: string;
}

export function StopUpdates({ code, title, stillToBeReady, trackingPath }: Props) {
  const t = useTranslations("tracking");
  const [stopped, setStopped] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function stop() {
    setFailed(false);
    startTransition(async () => {
      const outcome = await stopUpdates(code);
      if (outcome.ok) setStopped(true);
      else setFailed(true);
    });
  }

  return (
    <>
      <h1 className="font-display text-label-xl text-balance md:text-title-h4">
        {t(stopped ? "stoppedTitle" : "stopTitle")}
      </h1>
      <p className="mt-1 text-p-sm wrap-anywhere text-muted">{title}</p>
      {/* Announced when it replaces the question, the focus stays on the page. */}
      <p role={stopped ? "status" : undefined} className="mt-4 text-p-md">
        {t(stopped ? "stoppedText" : stillToBeReady ? "stopTextBeforeReady" : "stopText")}
      </p>
      {failed && (
        <div className="mt-4">
          <FormAlert>{t("actionFailed")}</FormAlert>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {stopped ? (
          <Link href={trackingPath} className={buttonClass()}>
            {t("seeProgress")}
          </Link>
        ) : (
          <>
            <Button pending={pending} pendingLabel={t("stopping")} onClick={stop}>
              {t("stopConfirm")}
            </Button>
            <Link href={trackingPath} className={buttonClass({ variant: "secondary" })}>
              {t("stopKeep")}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
