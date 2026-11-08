"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const noSubscription = () => () => {};

// The phone's own share sheet, for sending the link by message on the spot.
// Hidden where the browser has none, the copy button beside it still works.
export function ShareLink({ link }: { link: string }) {
  const t = useTranslations("salesPartner.link");
  const canShare = useSyncExternalStore(
    noSubscription,
    () => typeof navigator.share === "function",
    () => false,
  );
  if (!canShare) return null;

  function share() {
    // Closing the share sheet rejects, which is no failure.
    navigator.share({ title: "ReadyYet", text: t("shareText"), url: link }).catch(() => {});
  }

  return (
    <Button variant="secondary" onClick={share}>
      <Icon name="link" className="size-3.5" />
      {t("share")}
    </Button>
  );
}
