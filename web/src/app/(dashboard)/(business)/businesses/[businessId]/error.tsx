"use client";

import { ErrorBoundary } from "@/components/error-boundary";

// Inside the Business's layout, so a failing page keeps its navigation.
export default function ErrorPage(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary {...props} inLayout />;
}
