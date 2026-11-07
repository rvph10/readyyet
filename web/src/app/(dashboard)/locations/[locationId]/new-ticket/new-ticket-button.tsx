"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useLocationActions } from "../location-actions";

export function NewTicketButton() {
  const t = useTranslations("tickets");
  const { newTicket } = useLocationActions();
  return (
    <Button onClick={newTicket}>
      <Icon name="add" className="size-3.5 text-brand" />
      {t("new")}
    </Button>
  );
}
