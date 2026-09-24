import { Controller, Get, Header, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CatalogueService } from "./catalogue.service";
import { BusinessTypeDto, CatalogueStatusDto } from "./dto/catalogue.response.dto";

// Developer-seeded reference data, only changes with a deploy.
const CACHE_CONTROL = "public, max-age=300";

@ApiTags("Catalogue")
@AllowAnonymous()
@ApiErrors(HttpStatus.TOO_MANY_REQUESTS)
@Controller("catalogue")
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get("business-types")
  @Header("Cache-Control", CACHE_CONTROL)
  @ApiOperation({ summary: "Every business type with its labels and default workflow" })
  listBusinessTypes(): Promise<BusinessTypeDto[]> {
    return this.catalogue.listBusinessTypes();
  }

  @Get("statuses")
  @Header("Cache-Control", CACHE_CONTROL)
  @ApiOperation({ summary: "Every status with its labels, flagging the five system statuses" })
  listStatuses(): Promise<CatalogueStatusDto[]> {
    return this.catalogue.listStatuses();
  }
}
