"use client";

import { ErrorCode } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { markSalesPartner } from "./actions";

function failureKey(code: string) {
  if (code === ErrorCode.NOT_FOUND) return "noAccount";
  if (code === ErrorCode.CONFLICT) return "already";
  return "failed";
}

// In a side panel, like inviting someone to a Team (ADR 0087).
export function AddPartner() {
  const t = useTranslations("admin.add");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setEmail("");
    setEmailError(null);
    setFailure(null);
    setOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!z.email().safeParse(address).success) {
      setEmailError(tForm("emailInvalid"));
      return;
    }
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(markSalesPartner(address));
      if (result.ok) {
        setOpen(false);
        toast({ message: t("done", { email: address }) });
      } else {
        setFailure(t(`errors.${failureKey(result.code)}`));
      }
    });
  }

  return (
    <>
      <Button onClick={start}>
        <Icon name="add" className="size-3 text-brand" />
        {t("open")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("title")} variant="panel" locked={pending}>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-3 md:px-7">
            <p className="text-p-sm text-muted">{t("intro")}</p>
            {failure && <FormAlert>{failure}</FormAlert>}
            <Field
              label={tForm("email")}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
                setFailure(null);
              }}
              error={emailError}
            />
          </div>
          <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
            <Button type="submit" pending={pending} pendingLabel={t("saving")} className="flex-1">
              {t("submit")}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              {tForm("cancel")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
