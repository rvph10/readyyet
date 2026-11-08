"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

// How long the button says it copied before it offers to copy again.
const COPIED_FOR_MS = 2000;

interface Props extends Pick<ComponentProps<typeof Button>, "variant" | "size" | "className"> {
  value: string;
  label: string;
  copiedLabel: string;
}

// A link to pass on, copied without showing it: nobody reads or types the
// address (ADR 0110).
export function CopyButton({ value, label, copiedLabel, ...button }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button {...button} onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}>
      <Icon name={copied ? "check" : "link"} className="size-3.5" />
      {copied ? copiedLabel : label}
    </Button>
  );
}
