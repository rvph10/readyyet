import type { ResolvingMetadata } from "next";
import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export function generateMetadata(props: PageProps<"/[locale]/legal-notice">, parent: ResolvingMetadata) {
  return legalMetadata("legal-notice", props, parent);
}

export default function Page(props: PageProps<"/[locale]/legal-notice">) {
  return <LegalPage legal="legal-notice" {...props} />;
}
