import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationDto } from "../location/dto/location.response.dto";
import { BusinessService } from "./business.service";
import { BusinessDto, BusinessWithLocationsDto, CreatedBusinessDto } from "./dto/business.response.dto";
import { CreateBusinessDto, CreateLocationDto } from "./dto/create-business.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@ApiTags("Businesses")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.TOO_MANY_REQUESTS)
@Controller("businesses")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Post()
  @ApiOperation({ summary: "Create a business with its first location and an owner membership" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  create(@CurrentUser() user: User, @Body() dto: CreateBusinessDto): Promise<CreatedBusinessDto> {
    return this.business.create(user.id, dto);
  }

  @Get(":businessId")
  @ApiOperation({ summary: "Get a business with its locations (owner only)" })
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  findOne(@Param("businessId") businessId: string, @CurrentUser() user: User): Promise<BusinessWithLocationsDto> {
    return this.business.findOne(businessId, user.id);
  }

  @Patch(":businessId")
  @ApiOperation({ summary: "Rename a business (owner only)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  update(
    @Param("businessId") businessId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBusinessDto,
  ): Promise<BusinessDto> {
    return this.business.update(businessId, user.id, dto);
  }

  @Post(":businessId/locations")
  @ApiOperation({ summary: "Add another location to an existing business (owner only)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  addLocation(
    @Param("businessId") businessId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateLocationDto,
  ): Promise<LocationDto> {
    return this.business.addLocation(businessId, user.id, dto);
  }

  @Post(":businessId/transfer-ownership")
  @HttpCode(200)
  @ApiOperation({ summary: "Hand the business to one of its admins, the owner stays on as admin (ADR 0017)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  transferOwnership(
    @Param("businessId") businessId: string,
    @CurrentUser() user: User,
    @Body() dto: TransferOwnershipDto,
  ): Promise<BusinessDto> {
    return this.business.transferOwnership(businessId, user.id, dto);
  }
}
