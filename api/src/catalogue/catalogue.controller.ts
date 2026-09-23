import { Controller, Get, Header } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { CatalogueService } from "./catalogue.service";

// Developer-seeded reference data, only changes with a deploy.
const CACHE_CONTROL = "public, max-age=300";

@ApiTags("Catalogue")
@AllowAnonymous()
@Controller("catalogue")
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get("business-types")
  @Header("Cache-Control", CACHE_CONTROL)
  @ApiOperation({ summary: "Every business type with its labels and default workflow" })
  listBusinessTypes() {
    return this.catalogue.listBusinessTypes();
  }

  @Get("statuses")
  @Header("Cache-Control", CACHE_CONTROL)
  @ApiOperation({ summary: "Every status with its labels, flagging the five system statuses" })
  listStatuses() {
    return this.catalogue.listStatuses();
  }
}
