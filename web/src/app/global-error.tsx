"use client";

import { useEffect } from "react";
import { ErrorMessage } from "@/components/error-message";
import { Button } from "@/components/ui/button";
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
          <Button onClick={() => location.reload()} className="self-start">
            Try again · Réessayer
          </Button>
        </ErrorMessage>
      </body>
    </html>
  );
}
