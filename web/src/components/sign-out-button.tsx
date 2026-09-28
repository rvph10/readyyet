"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { Tooltip } from "./ui/tooltip";

// An icon in a page's header, a labelled button where it's the page's action.
// Red, since it ends the session, and the pack's icon mirrored so its arrow
// leaves the door rather than entering it (ADR 0064).
export function SignOutButton({ labelled = false }: { labelled?: boolean }) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
  }

  if (labelled) {
    return (
      <Button variant="danger-secondary" onClick={() => void signOut()}>
        <Icon name="sign-out" className="size-4 -scale-x-100" />
        {t("signOut")}
      </Button>
    );
  }
  return (
    <Button variant="danger-secondary" size="icon" onClick={() => void signOut()} className="group relative">
      <Icon name="sign-out" className="size-4 -scale-x-100" />
      <Tooltip>{t("signOut")}</Tooltip>
    </Button>
  );
}
