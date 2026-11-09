"use client";

import { ErrorCode } from "@readyyet/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { findOnGoogle, updateLocation } from "./actions";

type Place = components["schemas"]["GooglePlaceDto"];
type Hours = components["schemas"]["OpeningHoursSpecificationDto"];

interface Props {
  locationId: string;
  // The shop's name and town, what someone would type into Google Maps.
  query: string;
  // What Google may fill in, only what the shop hasn't set itself (ADR 0126).
  needsAddress: boolean;
  needsHours: boolean;
  onSaved?: () => void;
}

// "Mon to Fri, 10:00 to 18:00 · Sat, 10:00 to 17:00": days in a row with the
// same hours read as one.
function useHoursSummary() {
  const locale = useLocale();
  const t = useTranslations("settings.google");
  // 2026-11-09 is a Monday: each weekday's short name in the page's language.
  const day = (index: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(Date.UTC(2026, 10, 9 + index));
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return (hours: Hours[]) => {
    const days = order.map((name) =>
      hours
        .filter(({ dayOfWeek }) => dayOfWeek === name)
        .map(({ opens, closes }) => t("hoursRange", { opens, closes }))
        .join(", "),
    );
    const groups: { from: number; to: number; ranges: string }[] = [];
    days.forEach((ranges, index) => {
      const last = groups.at(-1);
      if (last && last.to === index - 1 && last.ranges === ranges) last.to = index;
      else groups.push({ from: index, to: index, ranges });
    });
    return groups
      .filter(({ ranges }) => ranges)
      .map(({ from, to, ranges }) =>
        t("hoursDays", { days: from === to ? day(from) : t("daysRange", { from: day(from), to: day(to) }), ranges }),
      )
      .join(" · ");
  };
}

// ADR 0126: the shop picks itself from Google Maps, which gives its review
// link, and its address and hours where it has none yet.
export function GoogleFinder({ locationId, query: initialQuery, needsAddress, needsHours, onSaved }: Props) {
  const t = useTranslations("settings.google");
  const tSettings = useTranslations("settings");
  const format = useFormatter();
  const toast = useToast();
  const summary = useHoursSummary();
  const [query, setQuery] = useState(initialQuery);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [failed, setFailed] = useState<"failed" | "rateLimited" | null>(null);
  const [chosen, setChosen] = useState<Place | null>(null);
  const [useAddress, setUseAddress] = useState(true);
  const [useHours, setUseHours] = useState(true);
  const [searching, startSearching] = useTransition();
  const [saving, startSaving] = useTransition();
  // Only the last search's answer is shown, whichever comes back last.
  const latest = useRef(0);

  // Each place offers Google's address and hours ticked, whatever was
  // unticked for another.
  function choose(place: Place | null) {
    setChosen(place);
    setUseAddress(true);
    setUseHours(true);
  }

  function search() {
    if (!query.trim()) return;
    const run = ++latest.current;
    choose(null);
    setFailed(null);
    startSearching(async () => {
      const found = await findOnGoogle(locationId, query.trim());
      if (run !== latest.current) return;
      if (typeof found === "string") {
        setPlaces(null);
        setFailed(found);
        return;
      }
      setPlaces(found);
      if (found.length === 1) choose(found[0]);
    });
  }

  const offersAddress = needsAddress && chosen?.address != null;
  const offersHours = needsHours && (chosen?.openingHours.length ?? 0) > 0;

  function confirm() {
    const place = chosen!;
    startSaving(async () => {
      const result = await orFailure(
        updateLocation(locationId, {
          googleReviewUrl: place.reviewUrl,
          ...(offersAddress && useAddress && { address: place.address }),
          ...(offersHours && useHours && { openingHours: place.openingHours }),
        }),
      );
      if (result.ok) {
        toast({ message: t("saved", { name: place.name }) });
        onSaved?.();
      } else
        toast({
          tone: "error",
          message: result.code === ErrorCode.PLAN_REQUIRED ? tSettings("reviewNeedsPro") : t("saveFailed"),
        });
    });
  }

  return (
    <section className="rounded-3xl border border-border-strong p-5">
      <h3 className="text-label-md">{t("title")}</h3>
      <p className="mt-0.5 text-p-sm text-muted">{t("hint")}</p>

      {/* Not a form: it sits inside the section's own, which Enter must not save. */}
      <div role="search" className="mt-4 flex items-start gap-2">
        <Field
          className="min-w-0 flex-1"
          label={t("searchLabel")}
          hideLabel
          type="search"
          autoComplete="off"
          maxLength={200}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            search();
          }}
        />
        <Button variant="secondary" pending={searching} pendingLabel={t("searching")} onClick={search}>
          <Icon name="search" className="size-3.5" />
          {t("search")}
        </Button>
      </div>

      <div aria-live="polite">
        {failed && (
          <div className="mt-4">
            <FormAlert>{t(failed)}</FormAlert>
          </div>
        )}
        {places?.length === 0 && <p className="mt-4 text-p-sm">{t("nothing")}</p>}
        {places && places.length > 0 && (
          <ul role="radiogroup" aria-label={t("results")} className="mt-4 flex flex-col gap-2">
            {places.map((place) => {
              const on = chosen?.placeId === place.placeId;
              return (
                <li key={place.placeId}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => choose(place)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                      on ? "border-pine bg-pine-subtle" : "border-border hover:bg-subtle"
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${on ? "bg-pine text-brand" : "bg-subtle text-muted"}`}
                    >
                      <Icon name={on ? "check" : "home"} className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-sm">{place.name}</span>
                      <span className="block truncate text-p-xs text-muted">
                        {place.formattedAddress ?? t("noPublicAddress")}
                      </span>
                    </span>
                    {place.rating !== null && (
                      <span className="shrink-0 text-right text-label-sm">
                        ★ {format.number(place.rating, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                        <span className="block text-p-xs text-muted">
                          {t("onGoogle", { count: place.ratingCount ?? 0 })}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {/* Google's terms: its places shown off a map say where they're from. */}
        {places && places.length > 0 && (
          <p translate="no" className="mt-2 text-right text-p-xs text-muted">
            Google Maps
          </p>
        )}
      </div>

      {chosen && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-subtle p-4">
          {(offersAddress || offersHours) && (
            <>
              <p className="text-label-sm">{t("alsoUse")}</p>
              {offersAddress && (
                <Checkbox
                  label={t("useAddress")}
                  description={chosen.formattedAddress ?? undefined}
                  checked={useAddress}
                  onChange={(event) => setUseAddress(event.target.checked)}
                />
              )}
              {offersHours && (
                <Checkbox
                  label={t("useHours")}
                  description={summary(chosen.openingHours)}
                  checked={useHours}
                  onChange={(event) => setUseHours(event.target.checked)}
                />
              )}
            </>
          )}
          <Button pending={saving} pendingLabel={t("saving")} onClick={confirm} className="self-start">
            <Icon name="check" className="size-3.5 text-brand" />
            {t("confirm", { name: chosen.name })}
          </Button>
        </div>
      )}
    </section>
  );
}
