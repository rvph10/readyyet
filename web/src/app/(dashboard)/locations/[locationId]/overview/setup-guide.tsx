"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Illustration, type IllustrationName } from "@/components/illustration";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { ImageInput, useImage } from "../../../(business)/businesses/[businessId]/settings/images";
import { setSetupGuideHidden } from "../actions";
import { useLocationActions } from "../location-actions";
import { OpeningHours } from "../settings/opening-hours";
import { ReviewLink } from "../settings/review-link";
import { InPanel } from "../settings/section-form";
import { ShopDetails } from "../settings/shop-details";
import { Turnaround } from "../settings/turnaround";
import { InviteForm } from "../team/invite-form";

type Location = components["schemas"]["LocationDto"];
type Setup = components["schemas"]["InsightsSetupDto"];

// In the order a new shop should take them: what it's for first, then what
// Customers see, then the rest.
const STEPS = [
  { key: "firstTicket", done: "firstTicket", illustration: "tag" },
  { key: "address", done: "address", illustration: "search" },
  { key: "hours", done: "openingHours", illustration: "clock" },
  { key: "turnaround", done: "turnaround", illustration: "hurry" },
  { key: "reviewLink", done: "reviewLink", illustration: "star" },
  { key: "team", done: "team", illustration: "helping" },
  { key: "logo", done: "logo", illustration: "images" },
  { key: "firstHandover", done: "firstHandover", illustration: "done" },
] as const satisfies readonly { key: string; done: keyof Setup; illustration: IllustrationName }[];

type StepKey = (typeof STEPS)[number]["key"];
// What opens in the side panel rather than somewhere else.
type PanelKey = Exclude<StepKey, "firstTicket" | "firstHandover">;

interface Props {
  location: Location;
  businessName: string;
  setup: Setup;
  // The logo is the Business's, which only its Owner changes.
  owner: boolean;
  hasPro: boolean;
}

// ADR 0117: Shopify's setup guide, a card on the home page with the next task
// open and the rest one click away. Each task is done here, in a side panel, and
// ticks itself off once saved, as the shop's own data says it's done.
export function SetupGuide({ location, businessName, setup, owner, hasPro }: Props) {
  const t = useTranslations("today.setup");
  const toast = useToast();
  const router = useRouter();
  const { newTicket } = useLocationActions();
  const steps = STEPS.filter(({ key }) => key !== "logo" || owner).map((step) => ({
    ...step,
    isDone: setup[step.done],
  }));
  const left = steps.filter(({ isDone }) => !isDone);
  const [chosen, setChosen] = useState<StepKey | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [hiding, startHiding] = useTransition();
  // A saved task closes itself, and the next one left opens, as on Shopify.
  const open = chosen && left.some(({ key }) => key === chosen) ? chosen : (left[0]?.key ?? null);
  const close = () => setPanel(null);

  function hide() {
    startHiding(async () => {
      const result = await orFailure(setSetupGuideHidden(location.id, true));
      toast(result.ok ? { message: t("hidden") } : { tone: "error", message: t("hideFailed") });
    });
  }

  function act(key: StepKey) {
    if (key === "firstTicket") newTicket();
    else if (key !== "firstHandover") setPanel(key);
  }

  const panels: Record<PanelKey, ReactNode> = {
    address: <ShopDetails location={location} onSaved={close} />,
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
        onSaved={close}
      />
    ),
    reviewLink: <ReviewLink locationId={location.id} url={location.googleReviewUrl} hasPro={hasPro} onSaved={close} />,
    team: <InviteForm locationId={location.id} ownerActs={owner} onDone={close} onCancel={close} />,
    logo: (
      <LogoPicker
        businessId={location.businessId}
        name={businessName}
        logoUrl={location.logoUrl}
        onDone={() => {
          close();
          // The upload refreshes the Business's pages, Today needs asking.
          router.refresh();
        }}
      />
    ),
  };

  return (
    <section aria-labelledby="setup-guide-title" className="rounded-sheet border-2 border-pine bg-surface">
      <div className="flex flex-col gap-4 p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="setup-guide-title" className="text-title-h6">
              {left.length ? t("title") : t("allSetTitle")}
            </h2>
            <p className="mt-0.5 text-p-sm text-muted">
              {left.length ? t("hint", { shop: location.name }) : t("allSetBody")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" pending={hiding} onClick={hide}>
              {t("hide")}
            </Button>
            {left.length > 0 && (
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls="setup-guide-steps"
                aria-label={collapsed ? t("expand") : t("collapse")}
                onClick={() => setCollapsed(!collapsed)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-subtle"
              >
                <Icon name={collapsed ? "arrow-down-1" : "arrow-up-1"} className="size-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="shrink-0 text-label-sm">
            {t("progress", { done: steps.length - left.length, total: steps.length })}
          </span>
          <ProgressBar value={steps.length - left.length} max={steps.length} label={t("title")} />
        </div>
      </div>

      {!collapsed && left.length > 0 && (
        <ul id="setup-guide-steps" className="flex flex-col gap-1 px-3 pb-3 lg:px-4 lg:pb-4">
          {steps.map(({ key, isDone, illustration }) => {
            const expanded = key === open;
            return (
              <li key={key} className={`rounded-card ${expanded ? "bg-subtle" : ""}`}>
                <button
                  type="button"
                  disabled={isDone}
                  aria-expanded={isDone ? undefined : expanded}
                  onClick={() => setChosen(key)}
                  className={`flex w-full items-center gap-3 rounded-card px-3 py-3 text-left ${
                    isDone ? "cursor-default" : expanded ? "cursor-default" : "cursor-pointer hover:bg-subtle"
                  }`}
                >
                  <Check done={isDone} />
                  <span
                    className={`min-w-0 flex-1 ${expanded ? "text-label-md" : "text-label-sm"} ${isDone ? "text-muted" : ""}`}
                  >
                    {t(`${key}.title`)}
                  </span>
                </button>
                {expanded && (
                  <div className="-mt-1 flex items-start justify-between gap-6 px-3 pb-4 pl-14">
                    <div className="max-w-lg">
                      <p className="text-p-sm">{t(`${key}.body`)}</p>
                      <div className="mt-4">
                        {key === "firstHandover" ? (
                          <Link
                            href={`/locations/${location.id}/tickets?view=ready`}
                            className={buttonClass({ size: "sm" })}
                          >
                            {t(`${key}.action`)}
                          </Link>
                        ) : (
                          <Button size="sm" onClick={() => act(key)}>
                            {t(`${key}.action`)}
                          </Button>
                        )}
                      </div>
                    </div>
                    <span className="hidden shrink-0 rounded-card bg-surface p-3 md:block">
                      <Illustration name={illustration} className="h-28 w-auto" />
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={panel !== null} onClose={close} title={panel ? t(`${panel}.title`) : ""} variant="panel">
        {panel === "team" ? (
          panels.team
        ) : panel === "logo" ? (
          panels.logo
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

// Shopify's circle: dashed while to do, filled once done.
function Check({ done }: { done: boolean }) {
  return done ? (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pine text-brand">
      <Icon name="check" className="size-3" />
    </span>
  ) : (
    <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-border-strong" />
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
