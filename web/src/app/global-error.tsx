"use client";

import { useEffect } from "react";
import { ErrorMessage } from "@/components/error-message";
import "./globals.css";

// Shown only when the root layout itself fails, which is also what provides
// translations, so it says what it can in both languages.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (!error.digest) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-canvas font-sans text-ink antialiased">
        <ErrorMessage title="Something went wrong · Une erreur s'est produite">
          {error.digest && <p className="font-mono text-sm">Reference · Référence&nbsp;: {error.digest}</p>}
          <button
            type="button"
            onClick={() => location.reload()}
            className="self-start rounded-md bg-brand px-4 py-2 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Try again · Réessayer
          </button>
        </ErrorMessage>
      </body>
    </html>
  );
}
