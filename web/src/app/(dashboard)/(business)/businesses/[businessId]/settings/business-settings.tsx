"use client";

import { NAME_MAX_LENGTH } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { RadioCards } from "@/components/ui/radio-cards";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { removeImage, renameBusiness, setImage, transferOwnership } from "./actions";

interface Business {
  id: string;
  name: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}

type ImageKind = "logo" | "banner";

function useImage(businessId: string) {
  const t = useTranslations("business.settings");
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function run(kind: ImageKind, action: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      const result = await orFailure(action());
      toast(result.ok ? { message: t(`${kind}Saved`) } : { tone: "error", message: t(`${kind}Failed`) });
    });
  }
  return {
    pending,
    upload: (kind: ImageKind, chosen: File) => {
      const body = new FormData();
      body.set("file", chosen);
      run(kind, () => setImage(businessId, kind, body));
    },
    remove: (kind: ImageKind) => run(kind, () => removeImage(businessId, kind)),
  };
}

// A hidden file field and what opens it, either the drawn button or a round one.
function ImageInput({ label, onChosen }: { label: string; onChosen: (file: File) => void }) {
  return (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      aria-label={label}
      className="absolute inset-0 cursor-pointer opacity-0"
      onChange={(event) => {
        const chosen = event.target.files?.[0];
        event.target.value = "";
        if (chosen) onChosen(chosen);
      }}
    />
  );
}

// ADR 0109: the picture and the logo as Customers meet them, each changed where
// it stands, as on a profile.
function Identity({ business }: { business: Business }) {
  const t = useTranslations("business.settings");
  const { pending, upload, remove } = useImage(business.id);
  const pill =
    "relative flex h-10 items-center gap-2 overflow-clip rounded-full bg-surface px-3.5 text-label-xs font-semibold text-ink transition-colors hover:bg-subtle";
  return (
    <div aria-busy={pending}>
      <div className="relative h-40 overflow-clip rounded-t-[inherit] bg-pine md:h-52">
        {business.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          {business.bannerUrl && (
            <button
              type="button"
              disabled={pending}
              onClick={() => remove("banner")}
              className={`${pill} cursor-pointer`}
            >
              {t("logoRemove")}
            </button>
          )}
          <label className={`${pill} cursor-pointer`}>
            <Icon name="camera" className="size-3.5" />
            {t(business.bannerUrl ? "bannerChange" : "bannerAdd")}
            <ImageInput label={t("banner")} onChosen={(file) => upload("banner", file)} />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 px-6 lg:px-8">
        <label className="group relative -mt-12 block cursor-pointer rounded-2xl ring-4 ring-surface">
          <Avatar
            id={business.id}
            name={business.name}
            src={business.logoUrl}
            shape="square"
            size="xl"
            className="size-24! text-3xl!"
          />
          <span className="absolute -right-1.5 -bottom-1.5 flex size-9 items-center justify-center rounded-full bg-pine text-brand ring-4 ring-surface transition-colors group-hover:bg-pine-hover">
            <Icon name="camera" className="size-3.5" />
          </span>
          <ImageInput label={t("logo")} onChosen={(file) => upload("logo", file)} />
        </label>
        <div className="min-w-0 flex-1 pt-3">
          <p className="text-label-md">{t("imagesTitle")}</p>
          <p className="text-p-xs text-muted">{t("imagesHint")}</p>
        </div>
        {business.logoUrl && (
          <Button variant="link" disabled={pending} onClick={() => remove("logo")}>
            {t("logoRemoveLong")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Details({ business }: { business: Business }) {
  const t = useTranslations("business.settings");
  const tDetail = useTranslations("ticketDetail");
  const toast = useToast();
  const [name, setName] = useState(business.name);
  const [saving, startSaving] = useTransition();
  const trimmed = name.trim();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await orFailure(renameBusiness(business.id, trimmed));
      toast(result.ok ? { message: t("saved") } : { tone: "error", message: t("failed") });
    });
  }

  return (
    <form onSubmit={save} className="flex items-end gap-3">
      <Field
        className="min-w-0 flex-1"
        label={t("name")}
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
    <Panel as="section" padding="none" className="max-w-3xl">
      <Identity business={business} />
      <div className="p-6 lg:p-8">
        {/* Keyed, so a saved name becomes the field's new starting point. */}
        <Details key={business.name} business={business} />
        {/* Nobody can take over without an Admin, so nothing to offer until then. */}
        {admins.length > 0 && <Ownership business={business} admins={admins} />}
      </div>
    </Panel>
  );
}
