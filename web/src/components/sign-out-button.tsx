"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { Tooltip } from "./ui/tooltip";

// An icon in a page's header, a labelled button where it's the page's action.
export function SignOutButton({ labelled = false }: { labelled?: boolean }) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
  }

  if (labelled) {
    return (
      <Button variant="secondary" onClick={() => void signOut()}>
        <Icon name="sign-out" className="size-4" />
        {t("signOut")}
      </Button>
    );
  }
  return (
    <Button variant="secondary" size="icon" onClick={() => void signOut()} className="group relative">
      <Icon name="sign-out" className="size-4" />
      <Tooltip>{t("signOut")}</Tooltip>
    </Button>
  );
}
