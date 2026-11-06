"use client";

import { useTranslations } from "next-intl";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Tooltip } from "@/components/ui/tooltip";

// A setting's name on the left, its control on the right. What it does waits
// behind a question mark (ADR 0106), as Field's own hint does.
export function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 py-4 first:pt-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
      <div className="flex items-center gap-1 self-start md:min-h-12">
        <p className="text-label-sm">{label}</p>
        {hint && (
          <button
            type="button"
            className="group relative flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:text-ink focus-visible:text-ink"
          >
            <span
              aria-hidden="true"
              className="flex size-4.5 items-center justify-center rounded-full border-[1.5px] border-current text-label-xs leading-none font-semibold"
            >
              ?
            </span>
            <Tooltip wide>{hint}</Tooltip>
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}

export function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-title-h5">{title}</h2>
      <p className="mt-1 max-w-xl text-p-md text-pretty text-muted">{hint}</p>
    </div>
  );
}

interface Props {
  title: string;
  hint: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDiscard: () => void;
  // Unsaved changes wake the bar, which stays put so nothing moves as they do.
  dirty: boolean;
  pending: boolean;
  failure: string | null;
  children: ReactNode;
}

export function SectionForm({ title, hint, onSubmit, onDiscard, dirty, pending, failure, children }: Props) {
  const t = useTranslations("settings");
  const tDetail = useTranslations("ticketDetail");
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <SectionHeading title={title} hint={hint} />
      {failure && (
        <div className="mb-5">
          <FormAlert>{failure}</FormAlert>
        </div>
      )}
      <div className="flex-1">{children}</div>
      <div className="sticky bottom-0 -mx-5 mt-6 flex justify-end gap-2 border-t border-border bg-surface px-5 py-4 max-md:bottom-16 lg:-mx-10 lg:px-10">
        <Button variant="secondary" disabled={!dirty || pending} onClick={onDiscard}>
          {t("discard")}
        </Button>
        <Button type="submit" disabled={!dirty} pending={pending} pendingLabel={tDetail("saving")}>
          {tDetail("save")}
        </Button>
      </div>
    </form>
  );
}
