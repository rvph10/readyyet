"use client";

import { ErrorCode } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { RadioCards } from "@/components/ui/radio-cards";
import { useToast } from "@/components/ui/toast";
import type { ActionFailure } from "@/lib/api/errors";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { changeRole, inviteMember, leaveLocation, removeMember, resendInvitation, revokeInvitation } from "./actions";
import { canManage, type InvitationState } from "./team-views";

type Member = components["schemas"]["MemberDto"] & { joinedShown: string };
type Invitation = components["schemas"]["InvitationDto"] & { state: InvitationState; expiresInDays: number };
type InvitableRole = "ADMIN" | "EMPLOYEE";

interface Props {
  locationId: string;
  meId: string;
  myRole: string;
  members: Member[];
  invitations: Invitation[];
  taken: number;
  // Null when the plan has none.
  limit: number | null;
  canInvite: boolean;
}

function inviteFailure(code: ActionFailure["code"]) {
  if (code === ErrorCode.CONFLICT) return "alreadyThere";
  if (code === ErrorCode.MEMBER_LIMIT_REACHED) return "full";
  if (code === ErrorCode.LOCATION_FROZEN) return "frozen";
  if (code === ErrorCode.RATE_LIMITED) return "tooMany";
  return "failed";
}

export function TeamBoard({ locationId, meId, myRole, members, invitations, taken, limit, canInvite }: Props) {
  const t = useTranslations("team");
  const tDashboard = useTranslations("dashboard");
  const tDetail = useTranslations("ticketDetail");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("EMPLOYEE");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [managedId, setManagedId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<InvitableRole>("EMPLOYEE");
  const [removing, setRemoving] = useState<Member | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const managed = members.find(({ id }) => id === managedId);
  const ownerActs = myRole === "OWNER";
  const waiting = invitations.filter(({ state }) => state === "pending").length;
  const roleOptions = (["EMPLOYEE", "ADMIN"] as const).map((value) => ({
    value,
    label: tDashboard(`roles.${value}`),
    description: t(`roleHints.${value}`),
  }));

  function startInvite(invited?: { email: string; role: InvitableRole }) {
    setEmail(invited?.email ?? "");
    setRole(invited?.role ?? "EMPLOYEE");
    setEmailError(null);
    setFailure(null);
    setInviting(true);
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!z.email().safeParse(address).success) {
      setEmailError(tForm("emailInvalid"));
      return;
    }
    setEmailError(null);
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(inviteMember(locationId, { email: address, role }));
      if (result.ok) {
        setInviting(false);
        toast({ message: t("invited", { email: address }) });
      } else if (result.fields?.email) {
        setEmailError(tForm("emailInvalid"));
      } else {
        setFailure(t(`errors.${inviteFailure(result.code)}`));
      }
    });
  }

  function run(action: () => Promise<{ ok: boolean }>, done: string, onDone?: () => void) {
    startTransition(async () => {
      const result = await orFailure(action());
      if (result.ok) {
        onDone?.();
        toast({ message: done });
      } else {
        toast({ tone: "error", message: t("errors.failed") });
      }
    });
  }

  function manage(member: Member) {
    setNewRole(member.role === "ADMIN" ? "ADMIN" : "EMPLOYEE");
    setManagedId(member.id);
  }

  return (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-5">
      <Panel as="section" aria-labelledby="team-members" padding="none" className="lg:row-span-2">
        <h2 id="team-members" className="px-5 pt-5 pb-3 text-title-h6 lg:px-7 lg:pt-6">
          {t("members")}
        </h2>
        <ul>
          {members.map((member) => {
            const mine = member.user.id === meId;
            return (
              <li
                key={member.id}
                className="flex items-center gap-3 border-t border-border px-5 py-4 first:border-t-0 lg:min-h-20 lg:gap-4 lg:px-7 lg:py-3"
              >
                <Avatar
                  id={member.user.id}
                  name={member.user.name}
                  src={member.user.avatarUrl}
                  className="lg:size-12! lg:text-base!"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span title={member.user.name} className="truncate text-label-md">
                      {member.user.name}
                    </span>
                    {mine && <Badge>{t("you")}</Badge>}
                  </span>
                  <span title={member.user.email} className="block truncate text-p-xs text-muted">
                    {member.user.email}
                  </span>
                  <span className="block text-p-xs text-muted sm:hidden">{tDashboard(`roles.${member.role}`)}</span>
                </span>
                <span className="hidden shrink-0 text-label-sm sm:block sm:w-28">
                  {tDashboard(`roles.${member.role}`)}
                </span>
                <span className="hidden w-32 shrink-0 text-p-sm text-muted xl:block">
                  {t("joined", { date: member.joinedShown })}
                </span>
                <span className="flex shrink-0 justify-end sm:w-24">
                  {canManage(myRole, member.role) && (
                    <Button variant="secondary" size="sm" onClick={() => manage(member)}>
                      {t("manage")}
                    </Button>
                  )}
                  {mine && myRole !== "OWNER" && (
                    <Button variant="danger-secondary" size="sm" onClick={() => setLeaving(true)}>
                      {t("leave")}
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel as="section" padding="lg" className="flex flex-col max-lg:order-first">
        <p className="text-label-sm">{t("people")}</p>
        {/* Who has joined: an invitation isn't a person here until it's accepted. */}
        <p className="mt-1 text-[2.5rem] leading-[3rem] font-bold tracking-tight lg:text-[3.25rem] lg:leading-[3.75rem]">
          {members.length}
        </p>
        {waiting > 0 && <p className="mt-0.5 text-label-sm">{t("waitingToJoin", { count: waiting })}</p>}
        <p className="mt-0.5 text-p-sm text-muted">
          {limit === null
            ? t("noLimit")
            : canInvite
              ? t("essentielPlaces", { taken, limit })
              : t("essentielFull", { limit })}
        </p>
        <div className="mt-4">
          {canInvite ? (
            <Button onClick={() => startInvite()} className="w-full">
              <Icon name="add" className="size-3.5 text-brand" />
              {t("invite")}
            </Button>
          ) : (
            <Link href={`/locations/${locationId}/billing`} className={`${buttonClass({ variant: "brand" })} w-full`}>
              {t(limit === null ? "seePlans" : "movePro")}
              <Icon name="arrow-right" className="size-2.5" />
            </Link>
          )}
        </div>
      </Panel>

      <Panel as="section" aria-labelledby="team-invitations" className="flex flex-col lg:min-h-0">
        <h2 id="team-invitations" className="text-title-h6">
          {t("invitations")}
        </h2>
        {invitations.length === 0 ? (
          <EmptyState illustration="talking" title={t("noInvitations")} description={t("noInvitationsHint")} />
        ) : (
          // It only grows, so it scrolls inside its tile.
          <ul className="mt-3 min-h-0 overflow-y-auto max-lg:max-h-96 lg:grow lg:basis-0">
            {invitations.map((invitation) => {
              const manageable = canManage(myRole, invitation.role);
              return (
                <li key={invitation.id} className="border-t border-border py-3 first:border-t-0 first:pt-0">
                  <p title={invitation.email} className="truncate text-label-sm">
                    {invitation.email}
                  </p>
                  <p className="text-p-xs text-muted">
                    {tDashboard(`roles.${invitation.role}`)}
                    {" · "}
                    <span className={invitation.state === "pending" ? "" : "text-danger"}>
                      {invitation.state === "pending"
                        ? t("expiresIn", { days: invitation.expiresInDays })
                        : t(invitation.state)}
                    </span>
                  </p>
                  {manageable && invitation.state === "pending" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => resendInvitation(locationId, invitation.id),
                            t("resent", { email: invitation.email }),
                          )
                        }
                      >
                        {t("resend")}
                      </Button>
                      <Button
                        variant="danger-secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => revokeInvitation(locationId, invitation.id), t("revoked"))}
                      >
                        {t("revoke")}
                      </Button>
                    </div>
                  )}
                  {manageable && invitation.state !== "pending" && canInvite && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => startInvite({ email: invitation.email, role: invitation.role })}
                    >
                      {t("inviteAgain")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Dialog open={inviting} onClose={() => setInviting(false)} title={t("inviteTitle")} variant="panel">
        <form onSubmit={submitInvite} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-3 md:px-7">
            {failure && <FormAlert>{failure}</FormAlert>}
            <Field
              label={tForm("email")}
              type="email"
              autoComplete="off"
              hint={t("emailHint")}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
                setFailure(null);
              }}
              error={emailError}
            />
            {ownerActs ? (
              <RadioCards
                legend={t("roleLegend")}
                name="invite-role"
                columns={1}
                options={roleOptions}
                value={role}
                onChange={(value) => setRole(value as InvitableRole)}
              />
            ) : (
              <p className="text-p-sm text-muted">{t("adminInvites")}</p>
            )}
          </div>
          <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
            <Button type="submit" pending={pending} pendingLabel={t("sending")} className="flex-1">
              {t("send")}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setInviting(false)}>
              {tForm("cancel")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* In a side panel, so changing someone never moves the page (ADR 0087). */}
      <Dialog
        open={Boolean(managed)}
        onClose={() => setManagedId(null)}
        title={managed?.user.name ?? ""}
        variant="panel"
      >
        {managed && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-3 md:px-7">
              <p className="text-p-sm wrap-anywhere text-muted">{managed.user.email}</p>
              {ownerActs && (
                <RadioCards
                  legend={t("roleLegend")}
                  name="member-role"
                  columns={1}
                  options={roleOptions}
                  value={newRole}
                  onChange={(value) => setNewRole(value as InvitableRole)}
                />
              )}
              <section>
                <h3 className="text-label-sm">{t("removeTitle")}</h3>
                <p className="mt-1 text-p-sm text-muted">{t("removeHint")}</p>
                <Button
                  variant="danger-secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setManagedId(null);
                    setRemoving(managed);
                  }}
                >
                  {t("removeAction")}
                </Button>
              </section>
            </div>
            <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
              {ownerActs && (
                <Button
                  pending={pending}
                  pendingLabel={tDetail("saving")}
                  disabled={newRole === managed.role}
                  className="flex-1"
                  onClick={() =>
                    run(
                      () => changeRole(locationId, managed.id, newRole),
                      t("roleChanged"),
                      () => setManagedId(null),
                    )
                  }
                >
                  {tDetail("save")}
                </Button>
              )}
              <Button variant="secondary" disabled={pending} onClick={() => setManagedId(null)}>
                {ownerActs ? tForm("cancel") : t("close")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={t("removeConfirmTitle", { name: removing?.user.name ?? "" })}
        variant="destructive"
      >
        <p className="text-p-sm text-muted">{t("removeConfirmBody")}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setRemoving(null)}>
            {tForm("cancel")}
          </Button>
          <Button
            variant="danger"
            pending={pending}
            onClick={() =>
              run(
                () => removeMember(locationId, removing!.id),
                t("removed"),
                () => setRemoving(null),
              )
            }
          >
            {t("removeAction")}
          </Button>
        </div>
      </Dialog>

      <Dialog open={leaving} onClose={() => setLeaving(false)} title={t("leaveTitle")} variant="destructive">
        <p className="text-p-sm text-muted">{t("leaveBody")}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setLeaving(false)}>
            {tForm("cancel")}
          </Button>
          <Button
            variant="danger"
            pending={pending}
            onClick={() =>
              startTransition(async () => {
                // On success this redirects and never comes back here.
                const result = await orFailure(leaveLocation(locationId));
                if (!result.ok) {
                  setLeaving(false);
                  toast({ tone: "error", message: t("errors.failed") });
                }
              })
            }
          >
            {t("leave")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
