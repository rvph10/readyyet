import { useTranslations } from "next-intl";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface SetupStep {
  key: string;
  done: boolean;
  href: string | null;
}

// ADR 0116: what's left before the shop gets everything out of ReadyYet. It's
// worked out from the shop itself, so it leaves on its own once all is done.
// Only what's left is listed, the bar already counts what's done.
export function SetupTile({ steps, className = "" }: { steps: SetupStep[]; className?: string }) {
  const t = useTranslations("today.setup");
  const left = steps.filter((step) => !step.done);
  const done = steps.length - left.length;

  return (
    <section
      className={`@container flex flex-col rounded-sheet border-2 border-pine bg-surface p-5 lg:p-6 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-title-h6">{t("title")}</h2>
        <span className="text-label-lg">
          {done}/{steps.length}
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar value={done} max={steps.length} label={t("title")} />
      </div>
      <ul className="mt-4 grid gap-x-4 @3xl:grid-cols-2 @5xl:grid-cols-4">
        {left.map(({ key, href }) => {
          const content = (
            <>
              <span className="size-8 shrink-0 rounded-full border-2 border-border-strong" />
              <span className="min-w-0 flex-1">
                <span className="block text-label-sm">{t(`${key}.title`)}</span>
                <span className="block text-p-xs text-muted">{t(`${key}.body`)}</span>
              </span>
              {href && <Icon name="arrow-right" className="size-3 shrink-0" />}
            </>
          );
          return (
            <li key={key}>
              {href ? (
                <Link
                  href={href}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-subtle"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
