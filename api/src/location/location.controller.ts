import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiError, ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { ImageUpload } from "../storage/image-upload.decorator";
import { LocationDto } from "./dto/location.response.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationService } from "./location.service";

@ApiTags("Locations")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations")
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Get(":locationId")
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

  @Put(":locationId/logo")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ImageUpload()
  @ApiOperation({ summary: "Upload the location's logo, replacing any previous one (ADR 0026)" })
  setLogo(
    @Param("locationId") locationId: string,
    @UploadedFile(new ParseFilePipe()) file: { buffer: Buffer },
  ): Promise<LocationDto> {
    return this.location.setLogo(locationId, file.buffer);
  }

  @Delete(":locationId/logo")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Remove the location's logo" })
  removeLogo(@Param("locationId") locationId: string): Promise<LocationDto> {
    return this.location.removeLogo(locationId);
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
