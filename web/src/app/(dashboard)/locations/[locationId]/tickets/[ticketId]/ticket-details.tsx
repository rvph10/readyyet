"use client";

import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, calendarDateIn } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextareaField } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { orFailure } from "@/lib/api/or-failure";
import { updateTicket } from "./actions";
import { ticketSchema } from "../../new-ticket/schema";

interface Props {
  locationId: string;
  ticketId: string;
  title: string;
  notes: string | null;
  date: string | null;
  // Already formatted, null when it has none.
  dateShown: string | null;
  receivedShown: string;
  timeZone: string;
  // On the Location's clock.
  today: string;
  // An ended Ticket's date can't change (ADR 0030).
  dateEditable: boolean;
  dateLate: boolean;
}

export function TicketDetails(props: Props) {
  const t = useTranslations("ticketDetail");
  const tForm = useTranslations("tickets.form");
  const [editing, setEditing] = useState(false);
  // What the form opened with: only what changes from it is saved, so a
  // colleague's edit made meanwhile to another field isn't overwritten.
  const [opened, setOpened] = useState({ title: props.title, notes: props.notes ?? "", date: props.date ?? "" });
  const [title, setTitle] = useState(props.title);
  const [notes, setNotes] = useState(props.notes ?? "");
  const [date, setDate] = useState(props.date ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function startEditing() {
    // A colleague may have changed them since the page opened.
    const current = { title: props.title, notes: props.notes ?? "", date: props.date ?? "" };
    setOpened(current);
    setTitle(current.title);
    setNotes(current.notes);
    setDate(current.date);
    setErrors({});
    setFailed(false);
    setEditing(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = calendarDateIn(new Date(), props.timeZone);
    // A date already passed can stay as it is, only a new one must be ahead.
    const earliest = date === opened.date ? "" : now;
    const parsed = ticketSchema(tForm, earliest).safeParse({ title, description: notes, estimatedReadyDate: date });
    const found: Record<string, string> = {};
    for (const issue of parsed.error?.issues ?? []) found[String(issue.path[0])] = issue.message;
    setErrors(found);
    setFailed(false);
    if (!parsed.success || Object.keys(found).length > 0) return;
    startTransition(async () => {
      const result = await orFailure(
        updateTicket(props.locationId, props.ticketId, {
          ...(parsed.data.title !== opened.title && { title: parsed.data.title }),
          // Empty clears the notes, where leaving it out would keep them.
          ...((parsed.data.description ?? "") !== opened.notes && { description: parsed.data.description ?? "" }),
          ...(props.dateEditable && date !== opened.date && { estimatedReadyDate: parsed.data.estimatedReadyDate }),
        }),
      );
      if (result.ok) setEditing(false);
      else setFailed(true);
    });
  }

  // In a side panel, so editing never moves the page under it (ADR 0087).
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-title-h6">{t("details")}</h2>
        <Button variant="secondary" size="sm" onClick={startEditing}>
          <Icon name="edit" className="size-3" />
          {t("edit")}
        </Button>
      </div>
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div>
          <dt className="text-p-xs text-muted">{t("expected")}</dt>
          <dd className={`mt-0.5 text-label-md ${props.dateLate ? "text-danger" : ""}`}>
            {props.dateShown ?? t("noDate")}
          </dd>
        </div>
        <div>
          <dt className="text-p-xs text-muted">{t("received")}</dt>
          <dd className="mt-0.5 text-label-md">{props.receivedShown}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-p-xs text-muted">{t("notes")}</dt>
          <dd className="mt-0.5 max-w-prose text-p-sm wrap-anywhere whitespace-pre-line">
            {props.notes || t("noNotes")}
          </dd>
        </div>
      </dl>
      <Dialog open={editing} onClose={() => setEditing(false)} title={t("editTicket")} variant="panel">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-3 md:px-7">
            {failed && <FormAlert>{t("saveFailed")}</FormAlert>}
            <Field
              label={tForm("title")}
              hint={tForm("titleHint")}
              autoComplete="off"
              maxLength={TITLE_MAX_LENGTH}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              error={errors.title}
            />
            <TextareaField
              label={tForm("notes")}
              hint={tForm("notesHint")}
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              error={errors.description}
            />
            {props.dateEditable && (
              <DateField
                label={tForm("date")}
                hint={tForm("dateHint")}
                today={props.today}
                min={props.today}
                value={date}
                onChange={setDate}
                error={errors.estimatedReadyDate}
              />
            )}
          </div>
          <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
            <Button type="submit" pending={pending} pendingLabel={t("saving")} className="flex-1">
              {t("save")}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setEditing(false)}>
              {tForm("cancel")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
