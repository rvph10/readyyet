"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

const noSubscription = () => () => undefined;

// The server and the browser can list countries and time zones differently, so
// the long lists wait for the browser, the saved value being all a first paint needs.
export function useInBrowser() {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

// What a group of fields is about beside them, and the fields on a six-column
// grid, each as wide as what it holds rather than as wide as the page.
export function FieldGroup({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border py-6 first:border-t-0 first:pt-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h3 className="text-label-md">{title}</h3>
        <p className="mt-1 text-p-sm text-pretty text-muted">{hint}</p>
      </div>
      <div className="grid max-w-2xl grid-cols-6 gap-x-3 gap-y-4">{children}</div>
    </section>
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
      <div className="sticky bottom-0 -mx-5 mt-6 flex justify-end gap-2 border-t border-border bg-surface px-5 py-4 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:-mx-10 lg:px-10">
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
