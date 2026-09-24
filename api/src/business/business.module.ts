import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { BusinessController } from "./business.controller";
import { BusinessService } from "./business.service";

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [BusinessController],
  providers: [BusinessService],
})
export class BusinessModule {}
