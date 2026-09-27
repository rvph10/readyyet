import { redirect } from "next/navigation";
import { getMe } from "@/lib/me";

export default async function DashboardPage() {
  const { memberships } = await getMe();
  redirect(memberships.length > 0 ? `/locations/${memberships[0].location.id}` : "/businesses/new");
}
