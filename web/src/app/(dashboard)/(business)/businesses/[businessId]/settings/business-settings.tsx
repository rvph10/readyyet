"use client";

import { NAME_MAX_LENGTH } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { SettingRow } from "@/app/(dashboard)/locations/[locationId]/settings/section-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { RadioCards } from "@/components/ui/radio-cards";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { removeLogo, renameBusiness, setLogo, transferOwnership } from "./actions";

interface Business {
  id: string;
  name: string;
  logoUrl: string | null;
}

function Details({ business }: { business: Business }) {
  const t = useTranslations("business.settings");
  const tDetail = useTranslations("ticketDetail");
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(business.name);
  const [saving, startSaving] = useTransition();
  const [changingLogo, startChangingLogo] = useTransition();
  const trimmed = name.trim();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await orFailure(renameBusiness(business.id, trimmed));
      toast(result.ok ? { message: t("saved") } : { tone: "error", message: t("failed") });
    });
  }

  function logo(action: () => Promise<{ ok: boolean }>) {
    startChangingLogo(async () => {
      const result = await orFailure(action());
      toast(result.ok ? { message: t("logoSaved") } : { tone: "error", message: t("logoFailed") });
    });
  }

  function upload(chosen: File) {
    const body = new FormData();
    body.set("file", chosen);
    logo(() => setLogo(business.id, body));
  }

  return (
    <>
      <SettingRow label={t("name")}>
        <form onSubmit={save} className="flex items-start gap-3">
          <Field
            className="min-w-0 flex-1"
            label={t("name")}
            hideLabel
            maxLength={NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="submit"
            disabled={!trimmed || trimmed === business.name}
            pending={saving}
            pendingLabel={tDetail("saving")}
          >
            {tDetail("save")}
          </Button>
        </form>
      </SettingRow>
      <SettingRow label={t("logo")} hint={t("logoHint")}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" size="lg" />
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={t("logo")}
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              event.target.value = "";
              if (chosen) upload(chosen);
            }}
          />
          <Button
            variant="secondary"
            pending={changingLogo}
            pendingLabel={tDetail("saving")}
            onClick={() => file.current!.click()}
          >
            {t(business.logoUrl ? "logoChange" : "logoAdd")}
          </Button>
          {business.logoUrl && (
            <Button variant="link" disabled={changingLogo} onClick={() => logo(() => removeLogo(business.id))}>
              {t("logoRemove")}
            </Button>
          )}
        </div>
      </SettingRow>
    </>
  );
}

function Ownership({
  business,
  admins,
}: {
  business: Business;
  admins: { id: string; name: string; email: string }[];
}) {
  const t = useTranslations("business.settings");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const [chosen, setChosen] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const admin = admins.find(({ id }) => id === chosen);

  function transfer() {
    startTransition(async () => {
      // On success this redirects and never comes back here.
      const result = await orFailure(transferOwnership(business.id, chosen));
      if (!result.ok) {
        setOpen(false);
        toast({ tone: "error", message: t("transferFailed") });
      }
    });
  }

  return (
    <div className="mt-2 flex justify-end">
      <Button variant="link" onClick={() => setOpen(true)}>
        {t("transferAction")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("transferTitle")} variant="destructive">
        <p className="text-p-sm text-muted">{t("transferConfirmBody", { business: business.name })}</p>
        <RadioCards
          className="mt-4"
          legend={t("transferTo")}
          name="newOwner"
          columns={1}
          options={admins.map(({ id, name, email }) => ({ value: id, label: name, description: email }))}
          value={chosen}
          onChange={setChosen}
        />
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {tForm("cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={!admin}
            pending={pending}
            pendingLabel={t("transferring")}
            onClick={transfer}
          >
            {t("transferConfirm")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export function BusinessSettings({
  business,
  admins,
}: {
  business: Business;
  admins: { id: string; name: string; email: string }[];
}) {
  return (
    <Panel as="section" padding="lg" className="max-w-3xl lg:p-8">
      {/* Keyed, so a saved name becomes the field's new starting point. */}
      <Details key={business.name} business={business} />
      {/* Nobody can take over without an Admin, so nothing to offer until then. */}
      {admins.length > 0 && <Ownership business={business} admins={admins} />}
    </Panel>
  );
}
