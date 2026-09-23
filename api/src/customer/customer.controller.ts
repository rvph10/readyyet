import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CustomerService } from "./customer.service";
import { ListCustomersQueryDto } from "./dto/list-customers.query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@ApiTags("Customers")
@Controller("locations/:locationId/customers")
@LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
@UseGuards(LocationMembershipGuard)
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get()
  @ApiOperation({ summary: "Search/list customers at a location, optionally by partial name (?q=)" })
  list(@Param("locationId") locationId: string, @Query() query: ListCustomersQueryDto) {
    return this.customer.list(locationId, query);
  }

  @Get(":customerId")
  @ApiOperation({ summary: "Get a customer's detail" })
  findOne(@Param("locationId") locationId: string, @Param("customerId") customerId: string) {
    return this.customer.findOne(locationId, customerId);
  }

  @Patch(":customerId")
  @ApiOperation({ summary: "Update a customer's contact info" })
  update(
    @Param("locationId") locationId: string,
    @Param("customerId") customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customer.update(locationId, customerId, dto);
  }

  @Delete(":customerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete (archive) a customer" })
  remove(@Param("locationId") locationId: string, @Param("customerId") customerId: string) {
    return this.customer.remove(locationId, customerId);
  }
}
