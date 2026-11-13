import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { Response } from "express";
import { ApiError, ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CheckReviewLinkDto, ReviewLinkCheckDto } from "./dto/check-review-link.dto";
import { GooglePlacesDto, SearchGooglePlacesQueryDto } from "./dto/google-places.dto";
import { LocationDto } from "./dto/location.response.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationExportService } from "./location-export";
import { LocationService } from "./location.service";
import { checkReviewLink } from "./review-link-check";

@ApiTags("Locations")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations")
export class LocationController {
  constructor(
    private readonly location: LocationService,
    private readonly locationExport: LocationExportService,
  ) {}

  @Get(":locationId")
  // Asked on every load of the Ticket list, so the same room as that route.
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Get a location's own fields" })
  findOne(@Param("locationId") locationId: string): Promise<LocationDto> {
    return this.location.findById(locationId);
  }

  @Patch(":locationId")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Update a location's settings" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.PAYMENT_REQUIRED, "PLAN_REQUIRED: a Google review link needs Pro")
  update(@Param("locationId") locationId: string, @Body() dto: UpdateLocationDto): Promise<LocationDto> {
    return this.location.update(locationId, dto);
  }

  @Get(":locationId/google-places")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  // Each one is billed to ReadyYet by Google.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiParam({ name: "locationId" })
  @ApiOperation({ summary: "Find this shop on Google Maps, for its review link, address and hours (ADR 0126)" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  @ApiError(HttpStatus.PAYMENT_REQUIRED, "PLAN_REQUIRED: the review link it's for needs Pro")
  findOnGoogle(
    @Param("locationId") locationId: string,
    @Query() query: SearchGooglePlacesQueryDto,
  ): Promise<GooglePlacesDto> {
    return this.location.findOnGoogle(locationId, query.q);
  }

  @Post(":locationId/review-link/check")
  @HttpCode(HttpStatus.OK)
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  // Each one is a few calls to Google, made on someone's behalf.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiParam({ name: "locationId" })
  @ApiOperation({ summary: "Follow a Google review link to see if it still leads somewhere (ADR 0109)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async checkReviewLink(@Body() dto: CheckReviewLinkDto): Promise<ReviewLinkCheckDto> {
    return { result: await checkReviewLink(dto.url) };
  }

  @Get(":locationId/export")
  @LocationRoles(Role.OWNER)
  @UseGuards(LocationMembershipGuard)
  // Held to five an hour for the Location, in LocationExportService.
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "locationId" })
  @ApiOperation({ summary: "Download everything the Location holds, CSV and JSON in a ZIP, owner only (ADR 0129)" })
  @ApiOkResponse({ content: { "application/zip": { schema: { type: "string", format: "binary" } } } })
  async export(
    @Param("locationId") locationId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { stream, filename } = await this.locationExport.zip(locationId);
    // Nest doesn't stop the archive when the Owner cancels the download.
    response.on("close", () => stream.destroy());
    return new StreamableFile(stream, { type: "application/zip", disposition: `attachment; filename="${filename}"` });
  }

  @Delete(":locationId")
  @LocationRoles(Role.OWNER)
  @UseGuards(LocationMembershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a location for good, owner only (ADR 0017)" })
  remove(@Param("locationId") locationId: string) {
    return this.location.remove(locationId);
  }
}
