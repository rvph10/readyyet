"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useLocationActions } from "../location-actions";

export function ChoosePlanButton() {
  const t = useTranslations("plans");
  const { choosePlan } = useLocationActions();
  return <Button onClick={choosePlan}>{t("choosePlan")}</Button>;
}
