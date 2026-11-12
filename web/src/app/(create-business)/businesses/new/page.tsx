import { AppHeader } from "@/components/app-header";
import { getLocale } from "next-intl/server";
import { legalLinks } from "@/lib/legal";
import { getMe } from "@/lib/me";
import { getBusinessTypeOptions } from "./business-types";
import { CreateBusinessForm } from "./create-business-form";

export default async function CreateBusinessPage() {
  const [me, options, locale] = await Promise.all([getMe(), getBusinessTypeOptions(), getLocale()]);
  return (
    <CreateBusinessForm
      header={<AppHeader me={me} />}
      businessTypes={options}
      email={me.email}
      legal={legalLinks(locale)}
    />
  );
}
