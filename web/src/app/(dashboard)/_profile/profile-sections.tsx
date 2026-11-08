"use client";

import { ErrorCode, type SupportedLocale } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon, type IconName } from "@/components/ui/icon";
import { RadioCards } from "@/components/ui/radio-cards";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { authClient } from "@/lib/auth-client";
import { FieldGroup, SectionForm, SectionHeading } from "../locations/[locationId]/settings/section-form";
import { deleteAccount, leaveShop, removeAvatar, setAvatar, setLanguage } from "./actions";

type Me = components["schemas"]["MeWithMembershipsDto"];
type Membership = Me["memberships"][number];

// Who the User is to their colleagues. The photo is saved as soon as it's
// chosen, like a Business's logo (ADR 0109), the name with the section's bar.
export function ProfileDetails({ me }: { me: Me }) {
  const t = useTranslations("profile");
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(me.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [photoPending, startPhoto] = useTransition();

  function photo(action: () => Promise<{ ok: boolean }>, done: string) {
    startPhoto(async () => {
      const result = await orFailure(action());
      toast(result.ok ? { message: done } : { tone: "error", message: t("photoFailed") });
      if (result.ok) router.refresh();
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = name.trim();
    if (!next) {
      setNameError(t("nameMissing"));
      return;
    }
    setFailure(null);
    startSaving(async () => {
      const { error } = await authClient.updateUser({ name: next });
      if (error) {
        setFailure(t("nameFailed"));
        return;
      }
      toast({ message: t("nameSaved") });
      router.refresh();
    });
  }

  return (
    <SectionForm
      title={t("nav.details")}
      hint={t("detailsHint")}
      onSubmit={submit}
      onDiscard={() => {
        setName(me.name);
        setNameError(null);
        setFailure(null);
      }}
      dirty={name.trim() !== me.name}
      pending={saving}
      failure={failure}
    >
      <FieldGroup title={t("photo")} hint={t("photoHint")}>
        <div className="col-span-6 flex flex-wrap items-center gap-4" aria-busy={photoPending}>
          <Avatar id={me.id} name={me.name} src={me.avatarUrl} size="xl" />
          <label className="relative flex h-10 cursor-pointer items-center gap-2 overflow-clip rounded-full border border-border-strong px-4 text-label-sm transition-colors hover:bg-subtle">
            <Icon name="camera" className="size-3.5" />
            {me.avatarUrl ? t("photoChange") : t("photoAdd")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={t("photo")}
              disabled={photoPending}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                event.target.value = "";
                if (!chosen) return;
                const body = new FormData();
                body.set("file", chosen);
                photo(() => setAvatar(body), t("photoSaved"));
              }}
            />
          </label>
          {me.avatarUrl && (
            <Button variant="link" disabled={photoPending} onClick={() => photo(removeAvatar, t("photoRemoved"))}>
              {t("photoRemove")}
            </Button>
          )}
        </div>
      </FieldGroup>
      <FieldGroup title={t("nameTitle")} hint={t("nameHint")}>
        <Field
          className="col-span-6 sm:col-span-4"
          label={t("name")}
          autoComplete="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(null);
          }}
          error={nameError}
        />
      </FieldGroup>
      <FieldGroup title={t("email")} hint={t("emailHint")}>
        <Field className="col-span-6 sm:col-span-4" label={t("email")} hideLabel value={me.email} disabled readOnly />
      </FieldGroup>
    </SectionForm>
  );
}

const LANGUAGES: { value: SupportedLocale; label: string }[] = [
  { value: "EN", label: "English" },
  { value: "FR", label: "Français" },
];

// ADR 0118: one language, for the app and the emails alike.
export function LanguageSection({ locale }: { locale: SupportedLocale }) {
  const t = useTranslations("profile");
  const toast = useToast();
  const [chosen, setChosen] = useState<SupportedLocale>(locale);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(setLanguage(chosen));
      if (result.ok) toast({ message: t("languageSaved") });
      else setFailure(t("languageFailed"));
    });
  }

  return (
    <SectionForm
      title={t("nav.language")}
      hint={t("languageHint")}
      onSubmit={submit}
      onDiscard={() => {
        setChosen(locale);
        setFailure(null);
      }}
      dirty={chosen !== locale}
      pending={pending}
      failure={failure}
    >
      <FieldGroup title={t("languageTitle")} hint={t("languageWhere")}>
        <RadioCards
          className="col-span-6"
          legend={t("languageTitle")}
          name="language"
          columns={2}
          options={LANGUAGES}
          value={chosen}
          onChange={(value) => setChosen(value as SupportedLocale)}
        />
      </FieldGroup>
    </SectionForm>
  );
}

const ROLE_TONES: Record<string, string> = {
  OWNER: "bg-pine text-brand",
  ADMIN: "bg-pine-subtle text-pine",
  EMPLOYEE: "bg-subtle text-ink",
};

export function ShopsSection({ memberships }: { memberships: Membership[] }) {
  const t = useTranslations("profile");
  const tDashboard = useTranslations("dashboard");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const router = useRouter();
  const [leaving, setLeaving] = useState<Membership | null>(null);
  const [pending, startTransition] = useTransition();

  function leave(membership: Membership) {
    startTransition(async () => {
      const result = await orFailure(leaveShop(membership.location.id));
      setLeaving(null);
      if (!result.ok) {
        toast({ tone: "error", message: t("leaveFailed") });
        return;
      }
      toast({ message: t("left", { shop: membership.location.name }) });
      // Its pages are no longer this User's, including the one around this.
      if (window.location.pathname.startsWith(`/locations/${membership.location.id}`)) router.replace("/");
      else router.refresh();
    });
  }

  return (
    <section className="max-w-3xl pb-8">
      <SectionHeading title={t("nav.shops")} hint={t("shopsHint")} />
      <ul className="flex flex-col gap-2">
        {memberships.map((membership) => {
          const { location, role } = membership;
          return (
            <li key={location.id} className="flex items-center gap-3 rounded-2xl border border-border p-3 pr-4">
              <Avatar
                id={location.business.id}
                name={location.business.name}
                src={location.business.logoUrl}
                shape="square"
              />
              <Link href={`/locations/${location.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate text-label-md">{location.name}</span>
                <span className="block truncate text-p-xs text-muted">{location.business.name}</span>
              </Link>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-label-xs font-semibold ${ROLE_TONES[role]}`}>
                {tDashboard(`roles.${role}`)}
              </span>
              {/* An Owner hands the Business over instead (ADR 0017). */}
              {role !== "OWNER" && (
                <Button variant="secondary" size="sm" onClick={() => setLeaving(membership)}>
                  {t("leave")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        title={leaving ? t("leaveTitle", { shop: leaving.location.name }) : ""}
        variant="destructive"
      >
        <p className="text-p-sm text-muted">{t("leaveBody")}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="danger"
            className="w-full"
            pending={pending}
            pendingLabel={t("leaving")}
            onClick={() => leaving && leave(leaving)}
          >
            {t("leaveConfirm")}
          </Button>
          <Button variant="secondary" className="w-full" disabled={pending} onClick={() => setLeaving(null)}>
            {tForm("cancel")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

const LOSSES: { key: "access" | "name" | "history"; icon: IconName }[] = [
  { key: "access", icon: "ban" },
  { key: "name", icon: "user" },
  { key: "history", icon: "layers" },
];

// ADR 0018: an anonymisation, and only right after a sign-in. ADR 0111: a
// danger zone that says what goes before asking anything.
export function DeleteAccountSection({ here }: { here: string }) {
  const t = useTranslations("profile");
  const tForm = useTranslations("tickets.form");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [failure, setFailure] = useState<"reauth" | "owner" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();
  const word = t("deleteWord");

  function remove() {
    startTransition(async () => {
      const result = await orFailure(deleteAccount());
      if (result.ok) {
        // Its sessions are gone with it, a full load leaves nothing behind.
        window.location.replace("/sign-in");
        return;
      }
      setFailure(
        result.code === ErrorCode.REAUTHENTICATION_REQUIRED
          ? "reauth"
          : result.code === ErrorCode.CONFLICT
            ? "owner"
            : "failed",
      );
    });
  }

  async function signInAgain() {
    await authClient.signOut();
    window.location.replace(`/sign-in?${new URLSearchParams({ next: `${here}?section=delete` })}`);
  }

  return (
    <section className="max-w-3xl pb-8">
      <SectionHeading title={t("deleteTitle")} hint={t("deleteHint")} />
      <div className="overflow-clip rounded-3xl border border-danger/40">
        <div className="p-5 lg:p-6">
          <h3 className="text-label-md">{t("deleteLosesTitle")}</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {LOSSES.map(({ key, icon }) => (
              <li key={key} className="flex items-center gap-3 text-p-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-subtle text-danger">
                  <Icon name={icon} className="size-3.5" />
                </span>
                {t(`deleteLoses.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-danger/40 bg-danger-subtle px-5 py-4 lg:px-6">
          <p className="min-w-0 flex-1 basis-56 text-p-sm text-danger">{t("deleteFinal")}</p>
          <Button
            variant="danger"
            onClick={() => {
              setTyped("");
              setFailure(null);
              setOpen(true);
            }}
          >
            {t("deleteAction")}
          </Button>
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title={t("deleteConfirmTitle")} variant="destructive">
        {failure === "reauth" ? (
          <>
            <p className="text-p-sm text-muted">{t("reauthBody")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button className="w-full" onClick={() => void signInAgain()}>
                {t("reauthAction")}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>
                {tForm("cancel")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-p-sm text-muted">{t("deleteConfirmBody")}</p>
            {failure && (
              <div className="mt-3">
                <FormAlert>{t(failure === "owner" ? "deleteOwner" : "deleteFailed")}</FormAlert>
              </div>
            )}
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-p-sm">
                {t.rich("deleteType", {
                  word,
                  strong: (chunks) => (
                    <strong className="rounded-md bg-subtle px-1.5 py-0.5 font-semibold">{chunks}</strong>
                  ),
                })}
              </p>
              <Field
                label={t("deleteTypeLabel")}
                hideLabel
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant="danger"
                className="w-full"
                disabled={typed.trim().toUpperCase() !== word.toUpperCase()}
                pending={pending}
                pendingLabel={t("deleting")}
                onClick={remove}
              >
                {t("deleteConfirm")}
              </Button>
              <Button variant="secondary" className="w-full" disabled={pending} onClick={() => setOpen(false)}>
                {tForm("cancel")}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}
