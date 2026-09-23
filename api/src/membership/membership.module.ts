import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";

@Module({
  imports: [DatabaseModule],
  controllers: [MembershipController],
  providers: [MembershipService],
})
export class MembershipModule {}
