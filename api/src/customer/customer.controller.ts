import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CustomerService } from "./customer.service";
import { ListCustomersQueryDto } from "./dto/list-customers.query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Controller("locations/:locationId/customers")
@LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
@UseGuards(LocationMembershipGuard)
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get()
  list(@Param("locationId") locationId: string, @Query() query: ListCustomersQueryDto) {
    return this.customer.list(locationId, query);
  }

  @Get(":customerId")
  findOne(@Param("locationId") locationId: string, @Param("customerId") customerId: string) {
    return this.customer.findOne(locationId, customerId);
  }

  @Patch(":customerId")
  update(
    @Param("locationId") locationId: string,
    @Param("customerId") customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customer.update(locationId, customerId, dto);
  }

  @Delete(":customerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("locationId") locationId: string, @Param("customerId") customerId: string) {
    return this.customer.remove(locationId, customerId);
  }
}
