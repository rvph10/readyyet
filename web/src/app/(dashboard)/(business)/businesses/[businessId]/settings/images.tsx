"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { removeImage, setImage } from "./actions";

type ImageKind = "logo" | "banner";

export function useImage(businessId: string, onDone?: () => void) {
  const t = useTranslations("business.settings");
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function run(kind: ImageKind, action: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      const result = await orFailure(action());
      toast(result.ok ? { message: t(`${kind}Saved`) } : { tone: "error", message: t(`${kind}Failed`) });
      if (result.ok) onDone?.();
    });
  }
  return {
    pending,
    upload: (kind: ImageKind, chosen: File) => {
      const body = new FormData();
      body.set("file", chosen);
      run(kind, () => setImage(businessId, kind, body));
    },
    remove: (kind: ImageKind) => run(kind, () => removeImage(businessId, kind)),
  };
}

// A hidden file field and what opens it, either the drawn button or a round one.
export function ImageInput({ label, onChosen }: { label: string; onChosen: (file: File) => void }) {
  return (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      aria-label={label}
      className="absolute inset-0 cursor-pointer opacity-0"
      onChange={(event) => {
        const chosen = event.target.files?.[0];
        event.target.value = "";
        if (chosen) onChosen(chosen);
      }}
    />
  );
}
