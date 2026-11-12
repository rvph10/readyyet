import type { ResolvingMetadata } from "next";
import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export function generateMetadata(props: PageProps<"/[locale]/terms">, parent: ResolvingMetadata) {
  return legalMetadata("terms", props, parent);
}

export default function Page(props: PageProps<"/[locale]/terms">) {
  return <LegalPage legal="terms" {...props} />;
}
