import type { ResolvingMetadata } from "next";
import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export function generateMetadata(props: PageProps<"/[locale]/customer-data">, parent: ResolvingMetadata) {
  return legalMetadata("customer-data", props, parent);
}

export default function Page(props: PageProps<"/[locale]/customer-data">) {
  return <LegalPage legal="customer-data" {...props} />;
}
