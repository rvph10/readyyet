import { getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { AcceptInvitationForm } from "./accept-invitation-form";

// Opening the link accepts nothing: mail scanners open every link in an
// email, so the User confirms here (ADR 0043).
export default async function InvitationPage({ params }: PageProps<"/invitations/[invitationId]">) {
  const { invitationId } = await params;
  const [t, result] = await Promise.all([
    getTranslations("invitation"),
    api().then((client) => client.GET("/invitations/{invitationId}", { params: { path: { invitationId } } })),
  ]);

  // Signed in with another address than the one it was sent to.
  if (result.response.status === 403) {
    return (
      <>
        <h1 className="text-2xl font-semibold">{t("otherAccountTitle")}</h1>
        <p className="text-muted">{t("errors.UNAUTHORIZED")}</p>
      </>
    );
  }

  const { status, invitedBy, location, role } = pageData(result);
  const place = { location: location.name, business: location.business.name };
  if (status !== "PENDING") {
    return (
      <>
        <h1 className="text-2xl font-semibold">{t("unavailableTitle")}</h1>
        <p className="text-muted">
          {status === "ACCEPTED" ? t("accepted", place) : t("lapsed", { ...place, inviter: invitedBy.name })}
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{t("title", { inviter: invitedBy.name })}</h1>
      <p className="text-muted">{t("body", { ...place, role: t(`roles.${role}`) })}</p>
      <AcceptInvitationForm invitationId={invitationId} />
    </>
  );
}
