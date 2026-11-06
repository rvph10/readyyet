"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { z } from "zod";
import { inviteFailure } from "@/app/(dashboard)/locations/[locationId]/team/team-views";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { RadioCards } from "@/components/ui/radio-cards";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { inviteToLocations } from "./actions";

type Role = "EMPLOYEE" | "ADMIN";

interface Props {
  businessId: string;
  // Why one can't take anyone: its plan stopped, or its places are taken.
  locations: { id: string; name: string; blocked: "frozen" | "full" | null }[];
}

export function InvitePanel({ businessId, locations }: Props) {
  const t = useTranslations("business.team");
  const tTeam = useTranslations("team");
  const tDashboard = useTranslations("dashboard");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const open = locations.filter(({ blocked }) => !blocked);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [chosen, setChosen] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function start() {
    setEmail("");
    setRole("EMPLOYEE");
    // With only one to choose, there's no choice to make.
    setChosen(open.length === 1 ? [open[0].id] : []);
    setEmailError(null);
    setFailures([]);
    setInviting(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!z.email().safeParse(address).success) {
      setEmailError(tForm("emailInvalid"));
      return;
    }
    if (chosen.length === 0) {
      setFailures([t("pickLocation")]);
      return;
    }
    setEmailError(null);
    setFailures([]);
    startTransition(async () => {
      const results = await orFailure(inviteToLocations(businessId, chosen, { email: address, role }));
      if (!Array.isArray(results)) {
        setFailures([tTeam("errors.failed")]);
        return;
      }
      const refused = results.flatMap(({ locationId, outcome }) => (outcome.ok ? [] : [{ locationId, outcome }]));
      if (refused.length === 0) {
        setInviting(false);
        toast({ message: tTeam("invited", { email: address }) });
        return;
      }
      if (refused.some(({ outcome }) => outcome.fields?.email)) {
        setEmailError(tForm("emailInvalid"));
      }
      // Only what's left to retry stays ticked, so sending again can't repeat a sent one.
      setChosen(refused.map(({ locationId }) => locationId));
      setFailures(
        refused.map(({ locationId, outcome }) => {
          const { name } = locations.find(({ id }) => id === locationId)!;
          return `${name}: ${tTeam(`errors.${inviteFailure(outcome.code)}`)}`;
        }),
      );
    });
  }

  return (
    <>
      <Button disabled={open.length === 0} onClick={start}>
        <Icon name="add" className="size-3.5 text-brand" />
        {tTeam("invite")}
      </Button>
      <Dialog open={inviting} onClose={() => setInviting(false)} title={tTeam("inviteTitle")} variant="panel">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-3 md:px-7">
            {failures.length > 0 && (
              <FormAlert>
                {failures.map((failure) => (
                  <span key={failure} className="block">
                    {failure}
                  </span>
                ))}
              </FormAlert>
            )}
            <Field
              label={tForm("email")}
              type="email"
              autoComplete="off"
              hint={tTeam("emailHint")}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
              }}
              error={emailError}
            />
            <RadioCards
              legend={tTeam("roleLegend")}
              name="invite-role"
              columns={1}
              options={(["EMPLOYEE", "ADMIN"] as const).map((value) => ({
                value,
                label: tDashboard(`roles.${value}`),
                description: tTeam(`roleHints.${value}`),
              }))}
              value={role}
              onChange={(value) => setRole(value as Role)}
            />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-label-sm">{t("whichLocations")}</legend>
              {locations.map(({ id, name, blocked }) => (
                <Checkbox
                  key={id}
                  label={name}
                  description={blocked ? t(`blocked.${blocked}`) : undefined}
                  disabled={Boolean(blocked)}
                  checked={chosen.includes(id)}
                  onChange={(event) =>
                    setChosen((ids) => (event.target.checked ? [...ids, id] : ids.filter((other) => other !== id)))
                  }
                />
              ))}
            </fieldset>
          </div>
          <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
            <Button type="submit" pending={pending} pendingLabel={tTeam("sending")} className="flex-1">
              {tTeam("send")}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setInviting(false)}>
              {tForm("cancel")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
