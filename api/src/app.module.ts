import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./auth/auth";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule.forRoot({ auth }), HealthModule],
})
export class AppModule {}
