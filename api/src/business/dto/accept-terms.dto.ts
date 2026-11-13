import { Equals } from "class-validator";
import { TERMS_VERSION } from "@readyyet/shared";

// The version the Owner was shown, refused if it isn't the one in force, so
// an old page can't accept terms it never displayed (ADR 0130).
export class AcceptTermsDto {
  @Equals(TERMS_VERSION, { message: "termsVersion must be the terms in force" })
  termsVersion!: string;
}
