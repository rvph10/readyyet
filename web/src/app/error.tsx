"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { ErrorMessage } from "@/components/error-message";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  const router = useRouter();

  useEffect(() => {
    // An error with a digest was thrown on the server, where onRequestError
    // has already reported it.
    if (!error.digest) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  // A server error only goes away if the server renders the page again,
  // reset() alone would re-render what the browser already has.
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <ErrorMessage title={t("title")}>
      <p className="text-p-md text-muted">{t("body")}</p>
      {error.digest && <p className="font-mono text-p-xs text-muted">{t("reference", { digest: error.digest })}</p>}
      <Button onClick={retry} className="mt-2 self-start">
        {t("retry")}
      </Button>
    </ErrorMessage>
  );
}
