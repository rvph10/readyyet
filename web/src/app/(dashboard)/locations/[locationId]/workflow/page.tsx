import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { statusLabel } from "@/lib/status-label";
import { getBilling, getLocation } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { WorkflowBoard } from "./workflow-board";
import { chosenCodes } from "./workflow-views";
import { Reveal } from "@/components/reveal";

// ADR 0101: the path a Ticket follows here, and the steps it could have. ADR
// 0119: the panels stand at once, the steps wait.
export default async function WorkflowPage({ params }: PageProps<"/locations/[locationId]/workflow">) {
  const [{ locationId }, me, tDashboard] = await Promise.all([params, getMe(), getTranslations("dashboard")]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <PageHeader title={tDashboard("sections.workflow")} />
      <Reveal fallback={<WorkflowLoading />}>
        <WorkflowContent locationId={locationId} />
      </Reveal>
    </div>
  );
}

async function WorkflowContent({ locationId }: { locationId: string }) {
  const [locale, client] = await Promise.all([getLocale(), api()]);
  const [workflow, statuses, businessTypes, location, billing] = await Promise.all([
    client.GET("/locations/{locationId}/workflow", { params: { path: { locationId } } }).then(pageData),
    client.GET("/catalogue/statuses").then(pageData),
    client.GET("/catalogue/business-types").then(pageData),
    getLocation(locationId),
    getBilling(locationId),
  ]);
  const businessType = businessTypes.find(({ code }) => code === location.businessTypeCode)!;

  return (
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
  );
}

const STOPS_WHILE_LOADING = 6;

// WorkflowBoard's two panels: the path with its title, then what can change it,
// which depends on the plan, so it waits whole.
function WorkflowLoading() {
  const t = useTranslations("workflow");
  return (
    <div
      aria-busy="true"
      className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:gap-5"
    >
      <Panel padding="none" className="flex flex-col gap-4 px-5 pt-5 lg:px-7 lg:pt-6">
        <h2 className="text-title-h6">{t("pathTitle")}</h2>
        {Array.from({ length: STOPS_WHILE_LOADING }, (_, stop) => (
          <div key={stop} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full!" />
            <Skeleton className="h-11 flex-1 rounded-2xl!" />
          </div>
        ))}
      </Panel>
      <Panel className="flex flex-col gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-11 rounded-full!" />
        <Skeleton className="h-11 rounded-2xl!" />
        <Skeleton className="h-11 rounded-2xl!" />
      </Panel>
    </div>
  );
}
