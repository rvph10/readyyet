import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { StorageModule } from "../storage/storage.module";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
