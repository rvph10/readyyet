"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect } from "react";
import { ErrorMessage } from "@/components/error-message";
import { Button } from "@/components/ui/button";

const RETRY_EVERY_MS = 60 * 1000;

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
  const retry = useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);

  // A page left open, like a counter's list or a Customer's tracking page, ends
  // up here on one failed refresh and must come back without anyone there. Only
  // a server error can go away by itself, a bug in the browser would just report
  // again every minute.
  const fromServer = Boolean(error.digest);
  useEffect(() => {
    if (!fromServer) return;
    const retryIfVisible = () => {
      if (document.visibilityState === "visible") retry();
    };
    const timer = setInterval(retryIfVisible, RETRY_EVERY_MS);
    document.addEventListener("visibilitychange", retryIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", retryIfVisible);
    };
  }, [fromServer, retry]);

  return (
    <ErrorMessage title={t("title")}>
      <p className="text-p-md text-muted">
        {t("body")} {fromServer && t("retrying")}
      </p>
      {error.digest && <p className="font-mono text-p-xs text-muted">{t("reference", { digest: error.digest })}</p>}
      <Button onClick={retry} className="mt-2 self-start">
        {t("retry")}
      </Button>
    </ErrorMessage>
  );
}
