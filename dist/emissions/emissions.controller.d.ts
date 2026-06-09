import { EmissionsService } from './emissions.service';
export declare class EmissionsController {
    private emissions;
    constructor(emissions: EmissionsService);
    list(user: any, facilityId?: string, pollutant?: string, year?: string): Promise<({
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
    summary(user: any, year?: string): Promise<{
        pollutant: string;
        total: import("@prisma/client-runtime-utils").Decimal;
        co2Equivalent: import("@prisma/client-runtime-utils").Decimal;
    }[]>;
}
