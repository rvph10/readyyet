import { AppHeader } from "@/components/app-header";
import { getLocale } from "next-intl/server";
import { legalLinks } from "@/lib/legal";
import { getMe } from "@/lib/me";
import { referralCode } from "@/lib/referral";
import { getBusinessTypeOptions } from "./business-types";
import { CreateBusinessForm } from "./create-business-form";

export default async function CreateBusinessPage({ searchParams }: PageProps<"/businesses/new">) {
  const [me, options, { ref }, locale] = await Promise.all([
    getMe(),
    getBusinessTypeOptions(),
    searchParams,
    getLocale(),
  ]);
  return (
    <CreateBusinessForm
      header={<AppHeader me={me} />}
      businessTypes={options}
      email={me.email}
      referralCode={referralCode(ref)}
      legal={legalLinks(locale)}
    />
  );
}
