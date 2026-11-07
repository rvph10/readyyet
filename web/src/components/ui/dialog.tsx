"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icon";

type Variant = "default" | "destructive" | "announcement" | "image" | "panel";

interface Props {
  open: boolean;
  onClose: () => void;
  // Named for screen readers in every variant, shown as the caption of an image.
  title: string;
  variant?: Variant;
  // Stays open, while a form inside is waiting on an answer it would otherwise lose.
  locked?: boolean;
  // The picture over an announcement, or the image an image dialog shows.
  media?: ReactNode;
  children?: ReactNode;
}

const frames: Record<Variant, string> = {
  default: "max-w-md rounded-sheet bg-surface backdrop:bg-ink/40",
  destructive: "max-w-md rounded-sheet bg-surface backdrop:bg-ink/40",
  announcement: "max-w-lg overflow-hidden rounded-sheet bg-surface backdrop:bg-ink/40",
  image: "max-w-4xl bg-transparent backdrop:bg-ink/85",
  // From the right edge, for a form that keeps the page behind it (ADR 0087).
  panel: "bg-surface backdrop:bg-ink/40 md:rounded-l-sheet",
};

// The browser's own modal <dialog>, which traps focus, closes on Escape and
// makes the page behind it inert. ADR 0049 and 0056: a panel over the page
// dimmed and blurred, with a round close button. A click on the backdrop
// closes it.
export function Dialog({ open, onClose, title, variant = "default", locked, media, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dismiss = () => {
    if (!locked) onClose();
  };

  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Chrome and Firefox only let a page refuse the first Escape, so closedby
      // turns it off. Safari doesn't know it, but always asks through cancel.
      closedby={locked ? "none" : undefined}
      onCancel={(event) => {
        if (locked) event.preventDefault();
      }}
      onClick={(event) => event.target === ref.current && dismiss()}
      className={`${variant === "panel" ? "my-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-none md:max-w-xl" : "m-auto w-[calc(100%-2rem)]"} text-ink backdrop:backdrop-blur-sm motion-safe:transition motion-safe:starting:open:scale-95 motion-safe:starting:open:opacity-0 ${frames[variant]}`}
    >
      {variant === "panel" && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-2 md:px-7">
            <h2 id={titleId} className="text-title-h6">
              {title}
            </h2>
            <CloseButton onClose={dismiss} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      )}

      {variant === "image" && (
        <figure className="relative">
          {media}
          <CloseButton onClose={dismiss} light className="absolute top-3 right-3" />
          <figcaption id={titleId} className="mt-3 text-center text-label-sm text-surface">
            {title}
          </figcaption>
        </figure>
      )}

      {variant === "announcement" && (
        <>
          <div className="relative aspect-video overflow-hidden bg-brand">
            {media}
            <CloseButton onClose={dismiss} light className="absolute top-4 right-4" />
          </div>
          <div className="p-6">
            <h2 id={titleId} className="text-label-xl">
              {title}
            </h2>
            <div className="mt-2">{children}</div>
          </div>
        </>
      )}

      {(variant === "default" || variant === "destructive") && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            {variant === "destructive" ? (
              <span className="flex size-11 items-center justify-center rounded-full bg-danger-subtle text-danger">
                <Icon name="info-triangle" className="size-5" />
              </span>
            ) : (
              <h2 id={titleId} className="pt-2 text-title-h6">
                {title}
              </h2>
            )}
            <CloseButton onClose={dismiss} />
          </div>
          {variant === "destructive" && (
            <h2 id={titleId} className="mt-4 text-title-h6">
              {title}
            </h2>
          )}
          <div className="mt-2">{children}</div>
        </div>
      )}
    </dialog>
  );
}

// Ink on a panel, white over a picture so it stays visible on any photo.
// 44px like an icon button, the target size a thumb needs (ADR 0057).
function CloseButton({ onClose, light, className }: { onClose: () => void; light?: boolean; className?: string }) {
  const t = useTranslations("common");
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={t("close")}
      className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${
        light ? "bg-surface text-ink hover:bg-canvas" : "text-muted hover:bg-subtle hover:text-ink"
      } ${className ?? ""}`}
    >
      <Icon name="close" className="size-3.5" />
    </button>
  );
}
