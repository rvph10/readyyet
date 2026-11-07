"use client";

import { isNotifyingStatus } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition, type LiHTMLAttributes, type ReactNode } from "react";
import { statusTone, toneIcons, type StatusTone } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { SearchField } from "@/components/ui/search-field";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "@/lib/status-label";
import { resetWorkflow, saveWorkflow } from "./actions";
import { addableSteps, moveStep, sameSteps } from "./workflow-views";

type CatalogueStatus = components["schemas"]["CatalogueStatusDto"];

interface Props {
  locationId: string;
  locale: string;
  statuses: CatalogueStatus[];
  // The steps between RECEIVED and READY, in order.
  saved: string[];
  defaults: string[];
  businessTypeName: string;
  // A custom Workflow is Pro's (ADR 0031), Essentiel follows the default.
  canEdit: boolean;
}

// ADR 0111: the colours of ADR 0042's tones, so the kind of each step reads at a
// glance, down the path and in what can be added to it.
const TONES: Record<StatusTone, { row: string; mark: string; bar: string; text: string }> = {
  received: {
    row: "bg-status-received/10",
    mark: "bg-status-received text-surface",
    bar: "bg-status-received",
    text: "text-info",
  },
  working: {
    row: "bg-status-working/10",
    mark: "bg-status-working text-surface",
    bar: "bg-status-working",
    text: "text-status-working",
  },
  waiting: {
    row: "bg-status-waiting/10",
    mark: "bg-status-waiting text-surface",
    bar: "bg-status-waiting",
    text: "text-warning",
  },
  ready: { row: "bg-brand/35", mark: "bg-brand text-ink", bar: "bg-brand", text: "text-ink" },
  completed: { row: "bg-pine-subtle", mark: "bg-pine text-brand", bar: "bg-pine", text: "text-pine" },
  stopped: { row: "bg-danger-subtle", mark: "bg-danger text-surface", bar: "bg-danger", text: "text-danger" },
};

// One stop on the path: the same round marks as a Ticket's track, joined by a
// line that the last one doesn't draw.
function PathRow({
  code,
  label,
  last,
  note,
  children,
  rowProps,
}: {
  code: string;
  label: string;
  last?: boolean;
  note?: string;
  children?: ReactNode;
  rowProps?: LiHTMLAttributes<HTMLLIElement>;
}) {
  const tone = statusTone(code);
  return (
    <li
      {...rowProps}
      className={`relative grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-2xl px-3 lg:gap-4 ${TONES[tone].row} ${rowProps?.className ?? ""}`}
    >
      {!last && (
        <span
          aria-hidden="true"
          className="absolute top-13 bottom-[-0.75rem] left-[1.875rem] w-1 rounded-full bg-border-strong"
        />
      )}
      <span
        className={`relative z-10 flex size-10 shrink-0 self-center items-center justify-center rounded-full ${TONES[tone].mark}`}
      >
        <Icon name={toneIcons[tone]} className="size-3.5" />
      </span>
      <div className="grid min-h-16 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <span className="min-w-0">
          <span className="block text-label-md wrap-anywhere">{label}</span>
          {note && <span className="block text-p-xs text-muted">{note}</span>}
        </span>
        {children}
      </div>
    </li>
  );
}

export function WorkflowBoard({ locationId, locale, statuses, saved, defaults, businessTypeName, canEdit }: Props) {
  const t = useTranslations("workflow");
  const tDetail = useTranslations("ticketDetail");
  const tSettings = useTranslations("settings");
  const toast = useToast();
  const [steps, setSteps] = useState(saved);
  const [dragged, setDragged] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [pending, startTransition] = useTransition();
  const byCode = new Map(statuses.map((status) => [status.code, status]));
  const label = (code: string) => statusLabel(byCode.get(code)!, locale);
  const dirty = !sameSteps(steps, saved);
  const custom = !sameSteps(saved, defaults);
  const groups = addableSteps(statuses, steps, query, (status) => statusLabel(status, locale), statusTone);

  function save() {
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(saveWorkflow(locationId, steps));
      if (result.ok) toast({ message: t("saved") });
      else setFailure(t("saveFailed"));
    });
  }

  function reset() {
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(resetWorkflow(locationId));
      setResetting(false);
      if (result.ok) toast({ message: t("resetDone") });
      else toast({ tone: "error", message: t("saveFailed") });
    });
  }

  const path = ["RECEIVED", ...steps, "READY", "COMPLETED"];
  const emailsNote = (code: string) => (isNotifyingStatus(code) ? t("emails") : undefined);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:gap-5">
      <Panel
        as="section"
        aria-labelledby="workflow-path"
        padding="none"
        className="flex min-h-0 flex-col overflow-clip"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-5 pt-5 lg:px-7 lg:pt-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="workflow-path" className="text-title-h6">
                {t("pathTitle")}
              </h2>
              <span className="text-label-sm text-muted">{t("stepCount", { count: path.length })}</span>
            </div>
            <div aria-hidden="true" className="mt-3 flex h-2.5 gap-0.5">
              {path.map((code) => (
                <span key={code} title={label(code)} className={`flex-1 rounded-full ${TONES[statusTone(code)].bar}`} />
              ))}
            </div>
            {!canEdit && <p className="mt-0.5 text-p-sm text-muted">{t("pathDefault", { type: businessTypeName })}</p>}
            {failure && (
              <div className="mt-3">
                <FormAlert>{failure}</FormAlert>
              </div>
            )}
          </div>
          <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-5 lg:px-7">
            <PathRow code="RECEIVED" label={label("RECEIVED")} note={t("firstNote")} />
            {steps.map((code, index) => (
              <PathRow
                key={code}
                code={code}
                label={label(code)}
                note={emailsNote(code)}
                rowProps={
                  canEdit
                    ? {
                        draggable: true,
                        className: `cursor-grab rounded-xl transition-opacity ${dragged === code ? "opacity-50" : ""}`,
                        onDragStart: (event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", code);
                          setDragged(code);
                        },
                        onDragOver: (event) => {
                          if (!dragged) return;
                          event.preventDefault();
                          if (dragged !== code) setSteps((current) => moveStep(current, dragged, index));
                        },
                        onDrop: (event) => event.preventDefault(),
                        onDragEnd: () => setDragged(null),
                      }
                    : undefined
                }
              >
                {canEdit && (
                  <span className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={t("moveUp", { step: label(code) })}
                      disabled={index === 0}
                      className="size-11! lg:size-10!"
                      onClick={() => setSteps((current) => moveStep(current, code, index - 1))}
                    >
                      <Icon name="arrow-up-1" className="size-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={t("moveDown", { step: label(code) })}
                      disabled={index === steps.length - 1}
                      className="size-11! lg:size-10!"
                      onClick={() => setSteps((current) => moveStep(current, code, index + 1))}
                    >
                      <Icon name="arrow-down-1" className="size-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={t("remove", { step: label(code) })}
                      className="size-11! lg:size-10!"
                      onClick={() => setSteps((current) => current.filter((other) => other !== code))}
                    >
                      <Icon name="close" className="size-3" />
                    </Button>
                  </span>
                )}
              </PathRow>
            ))}
            <PathRow code="READY" label={label("READY")} note={t("readyNote")} />
            <PathRow code="COMPLETED" label={label("COMPLETED")} last note={t("completedNote")} />
          </ol>
          <p className="mx-5 mb-4 flex gap-2 rounded-xl bg-subtle px-3.5 py-3 text-p-sm text-muted lg:mx-7">
            <Icon name="ban" className="mt-1 size-3.5 shrink-0" />
            {t("stoppedNote", { cancelled: label("CANCELLED"), rejected: label("REJECTED") })}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4 lg:px-7">
            <p className="min-w-0 flex-1 basis-56 text-p-sm text-muted">{t("openTicketsNote")}</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={!dirty || pending} onClick={() => setSteps(saved)}>
                {tSettings("discard")}
              </Button>
              <Button disabled={!dirty} pending={pending} pendingLabel={tDetail("saving")} onClick={save}>
                {tDetail("save")}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {canEdit ? (
        <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:gap-5">
          <Panel as="section" aria-labelledby="workflow-add" className="flex min-h-0 flex-1 flex-col">
            <h2 id="workflow-add" className="text-title-h6">
              {t("addTitle")}
            </h2>
            <SearchField
              className="mt-3"
              label={t("search")}
              placeholder={t("search")}
              autoComplete="off"
              value={query}
              onChange={setQuery}
            />
            {groups.length === 0 ? (
              <p className="py-8 text-center text-p-sm text-muted">{t(query ? "noMatch" : "allAdded")}</p>
            ) : (
              // The whole catalogue is long, so it scrolls inside its tile.
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                {groups.map(({ group, statuses: inGroup }) => (
                  <section key={group} className="mb-4 last:mb-0">
                    <h3 className={`flex items-center gap-2 pb-1 text-label-xs font-semibold ${TONES[group].text}`}>
                      <span className={`size-2.5 rounded-full ${TONES[group].bar}`} />
                      {t(`groups.${group}`)}
                    </h3>
                    <ul>
                      {inGroup.map((status) => (
                        <li key={status.code}>
                          <button
                            type="button"
                            onClick={() => setSteps((current) => [...current, status.code])}
                            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-subtle"
                          >
                            <span
                              className={`flex size-7 shrink-0 items-center justify-center rounded-full ${TONES[group].row} ${TONES[group].text}`}
                            >
                              <Icon name="add" className="size-3" />
                            </span>
                            <span className="min-w-0 flex-1 text-label-sm wrap-anywhere">
                              {statusLabel(status, locale)}
                            </span>
                            {isNotifyingStatus(status.code) && <Badge icon="message">{t("emailsShort")}</Badge>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Panel>
          {custom && (
            <Panel as="section" padding="lg">
              <h2 className="text-label-md">{t("resetTitle", { type: businessTypeName })}</h2>
              <p className="mt-0.5 text-p-sm text-muted">{t("resetHint")}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setResetting(true)}>
                {t("resetAction")}
              </Button>
            </Panel>
          )}
        </div>
      ) : (
        <section className="flex flex-col items-start self-start rounded-sheet border border-brand bg-brand p-6">
          <h2 className="text-title-h6">{t("proTitle")}</h2>
          <p className="mt-1 text-p-sm">{t("proHint")}</p>
          <Link href={`/locations/${locationId}/billing`} className={`${buttonClass()} mt-4`}>
            {tSettings("seePlans")}
            <Icon name="arrow-right" className="size-2.5" />
          </Link>
        </section>
      )}

      <Dialog open={resetting} onClose={() => setResetting(false)} title={t("resetTitle", { type: businessTypeName })}>
        <p className="text-p-sm text-muted">{t("resetConfirm")}</p>
        <ul className="mt-3 list-disc pl-5 text-p-sm">
          {defaults.map((code) => (
            <li key={code}>{label(code)}</li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setResetting(false)}>
            {tSettings("discard")}
          </Button>
          <Button pending={pending} pendingLabel={tDetail("saving")} onClick={reset}>
            {t("resetAction")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
