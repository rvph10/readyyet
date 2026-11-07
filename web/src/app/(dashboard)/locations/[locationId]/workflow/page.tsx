import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { statusLabel } from "@/lib/status-label";
import { getBilling, getLocation } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { WorkflowBoard } from "./workflow-board";
import { chosenCodes } from "./workflow-views";

// ADR 0101: the path a Ticket follows here, and the steps it could have.
export default async function WorkflowPage({ params }: PageProps<"/locations/[locationId]/workflow">) {
  const [{ locationId }, me, tDashboard, locale, client] = await Promise.all([
    params,
    getMe(),
    getTranslations("dashboard"),
    getLocale(),
    api(),
  ]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  const [workflow, statuses, businessTypes, location, billing] = await Promise.all([
    client.GET("/locations/{locationId}/workflow", { params: { path: { locationId } } }).then(pageData),
    client.GET("/catalogue/statuses").then(pageData),
    client.GET("/catalogue/business-types").then(pageData),
    getLocation(locationId),
    getBilling(locationId),
  ]);
  const businessType = businessTypes.find(({ code }) => code === location.businessTypeCode)!;

  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <PageHeader title={tDashboard("sections.workflow")} />
      <WorkflowBoard
        // A new id is a new version, whose steps are what's saved from now on.
        key={workflow.id}
        locationId={locationId}
        locale={locale}
        statuses={statuses}
        saved={chosenCodes(workflow.steps)}
        defaults={chosenCodes(businessType.defaultWorkflow.steps)}
        businessTypeName={statusLabel(businessType, locale)}
        canEdit={billing.plan === "PRO"}
      />
    </div>
  );
}
