import type { ResolvingMetadata } from "next";
import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export function generateMetadata(props: PageProps<"/[locale]/privacy">, parent: ResolvingMetadata) {
  return legalMetadata("privacy", props, parent);
}

export default function Page(props: PageProps<"/[locale]/privacy">) {
  return <LegalPage legal="privacy" {...props} />;
}
