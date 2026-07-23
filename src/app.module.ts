import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { FacilitiesModule } from "./facilities/facilities.module";
import { EquipmentModule } from "./equipment/equipment.module";
import { DeadlinesModule } from "./deadlines/deadlines.module";
import { EmissionsModule } from "./emissions/emissions.module";
import { ReportsModule } from "./reports/reports.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { AlertsModule } from "./alerts/alerts.module";

import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    FacilitiesModule,
    EquipmentModule,
    DeadlinesModule,
    EmissionsModule,
    ReportsModule,
    HealthModule,
    MailModule,
    AlertsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
