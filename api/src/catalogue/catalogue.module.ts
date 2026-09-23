import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CatalogueController } from "./catalogue.controller";
import { CatalogueService } from "./catalogue.service";

@Module({
  imports: [DatabaseModule],
  controllers: [CatalogueController],
  providers: [CatalogueService],
})
export class CatalogueModule {}
