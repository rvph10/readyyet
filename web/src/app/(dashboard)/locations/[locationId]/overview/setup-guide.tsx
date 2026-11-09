"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Illustration } from "@/components/illustration";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import type { components } from "@/lib/api/schema";
import { ImageInput, useImage } from "../../../(business)/businesses/[businessId]/settings/images";
import { useLocationActions } from "../location-actions";
import { OpeningHours } from "../settings/opening-hours";
import { ReviewLink } from "../settings/review-link";
import { InPanel } from "../settings/section-form";
import { ShopDetails } from "../settings/shop-details";
import { Turnaround } from "../settings/turnaround";
import { InviteForm } from "../team/invite-form";
import { foldedCookie, setupSteps, type StepKey } from "./setup-steps";

type Location = components["schemas"]["LocationDto"];
type Setup = components["schemas"]["InsightsSetupDto"];
// What opens in the side panel rather than somewhere else.
type PanelKey = Exclude<StepKey, "firstTicket" | "firstHandover">;
const YEAR_S = 60 * 60 * 24 * 365;

interface Props {
  location: Location;
  businessName: string;
  setup: Setup;
  // The logo is the Business's, which only its Owner changes.
  owner: boolean;
  hasPro: boolean;
  folded: boolean;
}

// ADR 0117: on Today until the shop is fully set up. The tasks as a track, the
// one to do as a card beside it, each done in a side panel and ticked off from
// the shop's own data once saved.
export function SetupGuide({ location, businessName, setup, owner, hasPro, folded: foldedAtFirst }: Props) {
  const t = useTranslations("today.setup");
  const { newTicket } = useLocationActions();
  const steps = setupSteps(setup, owner);
  const done = steps.filter(({ isDone }) => isDone).length;
  const [chosen, setChosen] = useState<StepKey | null>(null);
  const [folded, setFolded] = useState(foldedAtFirst);
  const [panel, setPanel] = useState<PanelKey | null>(null);
  // A saved task leaves the card for the next one left, unless one was picked.
  const current = steps.find(({ key }) => key === chosen) ?? steps.find(({ isDone }) => !isDone)!;
  const index = steps.indexOf(current);
  const close = () => setPanel(null);

  function fold(next: boolean) {
    setFolded(next);
    // Both ways, as a running shop's guide starts folded (ADR 0117).
    document.cookie = `${foldedCookie(location.id)}=${next ? "1" : "0"}; path=/; max-age=${YEAR_S}; samesite=lax`;
  }

  function act(key: StepKey) {
    if (key === "firstTicket") newTicket();
    else if (key !== "firstHandover") setPanel(key);
  }

  const panels: Record<PanelKey, ReactNode> = {
    address: <ShopDetails location={location} addressOnly onSaved={close} />,
    hours: (
      <OpeningHours
        locationId={location.id}
        hours={location.openingHours}
        timeZone={location.timeZone}
        onSaved={close}
      />
    ),
    turnaround: (
      <Turnaround
        locationId={location.id}
        days={location.turnaroundDays}
        openingHours={location.openingHours}
        timeZone={location.timeZone}
        startOn
        onSaved={close}
      />
    ),
    reviewLink: <ReviewLink location={location} hasPro={hasPro} onSaved={close} />,
    team: <InviteForm locationId={location.id} ownerActs={owner} onDone={close} onCancel={close} />,
    logo: <LogoPicker businessId={location.businessId} name={businessName} logoUrl={location.logoUrl} onDone={close} />,
  };

  return (
    <section
      aria-labelledby="setup-guide-title"
      className="on-pine flex flex-col rounded-sheet bg-pine p-5 text-surface lg:p-8"
    >
      {/* On a phone the words take their own row under the ring and the button. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-4">
        <Ring done={done} total={steps.length} />
        <div className="min-w-0 max-sm:order-last max-sm:col-span-3">
          <p className="text-label-sm text-brand">{t("eyebrow")}</p>
          <h2 id="setup-guide-title" className="text-title-h5 wrap-anywhere lg:text-title-h4">
            {t("title", { shop: location.name })}
          </h2>
          <p className="mt-0.5 text-p-sm">{t("progress", { done, total: steps.length })}</p>
        </div>
        <button
          type="button"
          aria-expanded={!folded}
          aria-controls="setup-guide-body"
          onClick={() => fold(!folded)}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-2 justify-self-end rounded-full bg-surface/10 px-4 text-label-sm transition-colors hover:bg-surface/16 max-sm:col-start-3"
        >
          <span className="max-sm:sr-only">{folded ? t("expand") : t("collapse")}</span>
          <Icon name={folded ? "arrow-down-1" : "arrow-up-1"} className="size-3" />
        </button>
      </div>

      <div id="setup-guide-body" inert={folded} data-open={!folded || undefined} className="fold">
        <div>
          <div className="grid gap-4 pt-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:pt-8">
            <ol className="flex flex-col max-lg:order-last">
              {steps.map((step, position) => {
                const here = step.key === current.key;
                return (
                  <li key={step.key} className="relative">
                    {/* The track between two steps, lime once the first is done. */}
                    {position < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`absolute top-10 bottom-0 left-[1.6875rem] w-0.5 -translate-x-1/2 ${
                          step.isDone ? "bg-brand" : "bg-surface/20"
                        }`}
                      />
                    )}
                    <button
                      type="button"
                      aria-current={here ? "step" : undefined}
                      onClick={() => setChosen(step.key)}
                      className={`relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        here ? "bg-surface/12" : "hover:bg-surface/6"
                      }`}
                    >
                      <Marker done={step.isDone} here={here} number={position + 1} />
                      <span className={`min-w-0 flex-1 truncate ${here ? "text-label-md" : "text-label-sm"}`}>
                        {t(`${step.key}.short`)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-col overflow-clip rounded-card bg-surface text-ink md:flex-row">
              <div className="flex flex-1 flex-col p-6 lg:p-8">
                <p className="flex items-center gap-2 text-label-xs font-semibold tracking-wide text-brand-text uppercase">
                  {t("stepOf", { number: index + 1, total: steps.length })}
                  {current.isDone && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-ink normal-case">
                      <Icon name="check" className="size-2.5" />
                      {t("done")}
                    </span>
                  )}
                </p>
                <h3 className="mt-2 text-title-h5">{t(`${current.key}.title`)}</h3>
                <p className="mt-2 max-w-md text-p-md text-muted">{t(`${current.key}.body`)}</p>
                <div className="mt-auto pt-6">
                  {current.key === "firstHandover" ? (
                    <Link
                      href={`/locations/${location.id}/tickets?view=ready`}
                      className={buttonClass({ variant: current.isDone ? "secondary" : "primary" })}
                    >
                      {t(`${current.key}.action`)}
                      <Icon name="arrow-right" className="size-3" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => act(current.key)}
                      className={buttonClass({ variant: current.isDone ? "secondary" : "primary" })}
                    >
                      {current.isDone ? t("change") : t(`${current.key}.action`)}
                      <Icon name="arrow-right" className="size-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center border-l border-border p-6 max-md:hidden md:w-64 lg:w-72">
                <Illustration name={current.illustration} className="h-40 w-auto lg:h-48" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={panel !== null} onClose={close} title={panel ? t(`${panel}.title`) : ""} variant="panel">
        {panel === "team" || panel === "logo" ? (
          panels[panel]
        ) : (
          <InPanel value={true}>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-2 md:px-7">
              {panel && panels[panel]}
            </div>
          </InPanel>
        )}
      </Dialog>
    </section>
  );
}

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The share done as a lime arc on pine, the number inside.
function Ring({ done, total }: { done: number; total: number }) {
  const t = useTranslations("today.setup");
  const percent = Math.round((done / total) * 100);
  return (
    <span
      className="relative flex size-20 shrink-0 items-center justify-center"
      role="img"
      aria-label={t("percent", { percent })}
    >
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="7" className="stroke-surface/15" />
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(CIRCUMFERENCE * done) / total} ${CIRCUMFERENCE}`}
          className="stroke-brand"
        />
      </svg>
      <span className="text-label-lg">{percent}%</span>
    </span>
  );
}

function Marker({ done, here, number }: { done: boolean; here: boolean; number: number }) {
  if (done) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
        <Icon name="check" className="size-3" />
      </span>
    );
  }
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-label-sm ${
        here ? "bg-surface text-pine ring-4 ring-brand/40" : "border-2 border-surface/30 bg-pine"
      }`}
    >
      {number}
    </span>
  );
}

function LogoPicker({
  businessId,
  name,
  logoUrl,
  onDone,
}: {
  businessId: string;
  name: string;
  logoUrl: string | null;
  onDone: () => void;
}) {
  const t = useTranslations("today.setup.logo");
  const tBusiness = useTranslations("business.settings");
  const { pending, upload } = useImage(businessId, onDone);
  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-10 text-center md:px-7" aria-busy={pending}>
      <Avatar id={businessId} name={name} src={logoUrl} shape="square" size="xl" className="size-32! text-4xl!" />
      <p className="max-w-sm text-p-sm">{t("panelHint")}</p>
      <label className={`${buttonClass()} relative overflow-clip ${pending ? "pointer-events-none opacity-70" : ""}`}>
        <Icon name="camera" className="size-3.5" />
        {pending ? t("uploading") : t("choose")}
        <ImageInput label={tBusiness("logo")} onChosen={(file) => upload("logo", file)} />
      </label>
    </div>
  );
}
