import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { ImageUpload } from "../storage/image-upload.decorator";
import { TicketPhotoDto } from "./dto/ticket.response.dto";
import { TicketPhotoService } from "./ticket-photo.service";

@ApiTags("Tickets")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations/:locationId/tickets/:ticketId/photos")
@LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
@UseGuards(LocationMembershipGuard)
export class TicketPhotoController {
  constructor(private readonly photos: TicketPhotoService) {}

  @Post()
  @ImageUpload()
  @ApiOperation({ summary: "Add a photo the Customer sees on the tracking page, 5 per ticket (ADR 0026)" })
  @ApiErrors(HttpStatus.CONFLICT)
  add(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
    @CurrentUser() user: User,
    @UploadedFile(new ParseFilePipe()) file: { buffer: Buffer },
  ): Promise<TicketPhotoDto> {
    return this.photos.add(locationId, ticketId, user.id, file.buffer);
  }

  @Delete(":photoId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a photo: an Employee their own, an Owner or Admin any" })
  remove(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
    @Param("photoId") photoId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.photos.remove(locationId, ticketId, photoId, user.id);
  }
}
