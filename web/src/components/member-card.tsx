"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Popover } from "./sidebar";
import { Avatar, type AvatarSize } from "./ui/avatar";
import { buttonClass } from "./ui/button";
import { Icon } from "./ui/icon";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// A colleague's picture that opens their card, with the way to what they've
// done here (ADR 0142).
export function MemberAvatar({
  locationId,
  member,
  size = "sm",
}: {
  locationId: string;
  member: Member;
  size?: AvatarSize;
}) {
  const t = useTranslations("member");
  return (
    <Popover
      label={t("open", { name: member.name })}
      popoverClass="member-popover"
      triggerClass="relative z-10 shrink-0 cursor-pointer self-start rounded-full transition-transform active:scale-95"
      trigger={<Avatar id={member.id} name={member.name} src={member.avatarUrl} size={size} />}
    >
      <div className="h-14 rounded-xl bg-pine" />
      <div className="-mt-8 flex flex-col items-start px-3 pb-2">
        <span className="rounded-full ring-4 ring-surface">
          <Avatar id={member.id} name={member.name} src={member.avatarUrl} size="lg" />
        </span>
        <p className="mt-2 text-title-h6 wrap-anywhere">{member.name}</p>
        <Link
          href={`/locations/${locationId}/members/${member.id}`}
          className={`${buttonClass({ variant: "secondary", size: "sm" })} mt-3 w-full`}
        >
          {t("profile")}
          <Icon name="arrow-right" className="size-2.5" />
        </Link>
      </div>
    </Popover>
  );
}
