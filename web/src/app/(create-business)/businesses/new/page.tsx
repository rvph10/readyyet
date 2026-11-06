import { AppHeader } from "@/components/app-header";
import { getMe } from "@/lib/me";
import { getBusinessTypeOptions } from "./business-types";
import { CreateBusinessForm } from "./create-business-form";

export default async function CreateBusinessPage() {
  const [me, options] = await Promise.all([getMe(), getBusinessTypeOptions()]);
  return <CreateBusinessForm header={<AppHeader me={me} />} businessTypes={options} email={me.email} />;
}
