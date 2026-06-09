import { PrismaService } from '../prisma/prisma.service';
export declare class EmissionsService {
    private prisma;
    constructor(prisma: PrismaService);
    list(orgId: string, opts?: {
        facilityId?: string;
        pollutant?: string;
        year?: number;
    }): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
        equipment: {
            id: string;
            tag: string;
            category: import(".prisma/client").$Enums.EquipmentCategory;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string;
        notes: string | null;
        equipmentId: string | null;
        reportingPeriodStart: Date;
        reportingPeriodEnd: Date;
        emissionSource: import(".prisma/client").$Enums.EmissionSource;
        pollutant: string;
        calculationMethod: string;
        emissionFactorId: string | null;
        activityData: import("@prisma/client/runtime/client").JsonValue;
        calculatedQuantity: import("@prisma/client-runtime-utils").Decimal;
        unit: string;
        co2Equivalent: import("@prisma/client-runtime-utils").Decimal | null;
        verifiedAt: Date | null;
        verifiedBy: string | null;
    })[]>;
    summaryByPollutant(orgId: string, year: number): Promise<{
        pollutant: string;
        total: import("@prisma/client-runtime-utils").Decimal;
        co2Equivalent: import("@prisma/client-runtime-utils").Decimal;
    }[]>;
}
