"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "@/lib/status-label";
import { changeStatus, undoStatus } from "./tickets/[ticketId]/actions";

type Status = components["schemas"]["StatusDto"];

interface Props {
  locationId: string;
  ticketId: string;
  next: Status;
}

// The next step as a word and a round arrow: the word says where it goes, the
// shape says it's a move, not a form's button. Lime when it finishes the job.
export function NextStep({ locationId, ticketId, next }: Props) {
  const t = useTranslations("tickets");
  const tDetail = useTranslations("ticketDetail");
  const locale = useLocale();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const finishes = next.code === "COMPLETED";
  const label = statusLabel(next, locale);
  const icon: IconName = finishes ? "check" : "arrow-right";

  function move() {
    startTransition(async () => {
      const result = await orFailure(changeStatus(locationId, ticketId, next.code));
      if (!result.ok) {
        toast({
          tone: "error",
          message: tDetail(`statusErrors.${result.code === "CONFLICT" ? "conflict" : "unexpected"}`),
        });
        return;
      }
      toast({
        message: finishes ? t("handedOver") : t("movedTo", { status: label }),
        action: {
          label: tDetail("undo"),
          onClick: () => {
            void orFailure(undoStatus(locationId, ticketId));
          },
        },
      });
    });
  }

  const title = finishes ? t("handOver") : tDetail("moveTo", { status: label });
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={pending}
      onClick={move}
      className="flex min-h-11 max-w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-full py-1 pr-1 pl-3.5 transition-[background-color,scale] lg:max-@3xl:pl-1 hover:bg-pine-subtle active:scale-[0.97] disabled:cursor-progress disabled:opacity-60"
    >
      <span className="min-w-0 truncate text-label-sm lg:max-@3xl:hidden">{finishes ? t("handOver") : label}</span>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          finishes ? "bg-brand text-ink" : "bg-pine text-brand"
        }`}
      >
        <Icon name={icon} className={finishes ? "size-3" : "size-2.5"} />
      </span>
    </button>
  );
}
