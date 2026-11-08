"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { RadioCards } from "@/components/ui/radio-cards";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { inviteMember } from "./actions";
import { inviteFailure } from "./team-views";

export type InvitableRole = "ADMIN" | "EMPLOYEE";

export function useRoleOptions() {
  const t = useTranslations("team");
  const tDashboard = useTranslations("dashboard");
  return (["EMPLOYEE", "ADMIN"] as const).map((value) => ({
    value,
    label: tDashboard(`roles.${value}`),
    description: t(`roleHints.${value}`),
  }));
}

interface Props {
  locationId: string;
  // Only an Owner chooses the Role, an Admin invites Employees (ADR 0017).
  ownerActs: boolean;
  // Asking someone again keeps what they were asked first.
  initial?: { email: string; role: InvitableRole };
  onDone: () => void;
  onCancel: () => void;
}

// The inside of a panel: the Team page's and the setup guide's (ADR 0117).
export function InviteForm({ locationId, ownerActs, initial, onDone, onCancel }: Props) {
  const t = useTranslations("team");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const roleOptions = useRoleOptions();
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<InvitableRole>(initial?.role ?? "EMPLOYEE");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!z.email().safeParse(address).success) {
      setEmailError(tForm("emailInvalid"));
      return;
    }
    setEmailError(null);
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(inviteMember(locationId, { email: address, role }));
      if (result.ok) {
        toast({ message: t("invited", { email: address }) });
        onDone();
      } else if (result.fields?.email) {
        setEmailError(tForm("emailInvalid"));
      } else {
        setFailure(t(`errors.${inviteFailure(result.code)}`));
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-3 md:px-7">
        {failure && <FormAlert>{failure}</FormAlert>}
        <Field
          label={tForm("email")}
          type="email"
          autoComplete="off"
          hint={t("emailHint")}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
            setFailure(null);
          }}
          error={emailError}
        />
        {ownerActs ? (
          <RadioCards
            legend={t("roleLegend")}
            name="invite-role"
            columns={1}
            options={roleOptions}
            value={role}
            onChange={(value) => setRole(value as InvitableRole)}
          />
        ) : (
          <p className="text-p-sm text-muted">{t("adminInvites")}</p>
        )}
      </div>
      <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
        <Button type="submit" pending={pending} pendingLabel={t("sending")} className="flex-1">
          {t("send")}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          {tForm("cancel")}
        </Button>
      </div>
    </form>
  );
}
