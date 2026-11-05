"use client";

import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, calendarDateIn } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { orFailure } from "@/lib/api/or-failure";
import { updateTicket } from "./actions";
import { ticketSchema } from "../new/schema";

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
  // An ended Ticket's date can't change (ADR 0030).
  dateEditable: boolean;
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
    const dateField = event.currentTarget.elements.namedItem("estimatedReadyDate") as HTMLInputElement | null;
    const found: Record<string, string> = {};
    for (const issue of parsed.error?.issues ?? []) found[String(issue.path[0])] = issue.message;
    if (dateField?.validity.badInput) found.estimatedReadyDate = tForm("dateUnfinished");
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

  if (editing) {
    return (
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <h2 className="text-label-lg">{t("details")}</h2>
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
          <Field
            label={tForm("date")}
            hint={tForm("dateHint")}
            type="date"
            name="estimatedReadyDate"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            error={errors.estimatedReadyDate}
          />
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setEditing(false)}>
            {tForm("cancel")}
          </Button>
          <Button type="submit" pending={pending} pendingLabel={t("saving")}>
            {t("save")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-label-lg">{t("details")}</h2>
        <Button variant="secondary" size="sm" onClick={startEditing}>
          <Icon name="edit" className="size-3" />
          {t("edit")}
        </Button>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-label-xs text-muted">{t("expected")}</dt>
          <dd className="mt-1 text-p-sm">{props.dateShown ?? t("noDate")}</dd>
        </div>
        <div>
          <dt className="text-label-xs text-muted">{t("received")}</dt>
          <dd className="mt-1 text-p-sm">{props.receivedShown}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-label-xs text-muted">{t("notes")}</dt>
          <dd className={`mt-1 text-p-sm wrap-anywhere whitespace-pre-line ${props.notes ? "" : "text-muted"}`}>
            {props.notes || t("noNotes")}
          </dd>
        </div>
      </dl>
    </>
  );
}
