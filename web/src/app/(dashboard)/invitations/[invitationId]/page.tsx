import { getTranslations } from "next-intl/server";
import { AcceptInvitationForm } from "./accept-invitation-form";

// Opening the link accepts nothing: mail scanners open every link in an
// email, so the User confirms here (ADR 0043).
export default async function InvitationPage({ params }: PageProps<"/invitations/[invitationId]">) {
  const { invitationId } = await params;
  const t = await getTranslations("invitation");
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted">{t("body")}</p>
      <AcceptInvitationForm invitationId={invitationId} />
    </>
  );
}
