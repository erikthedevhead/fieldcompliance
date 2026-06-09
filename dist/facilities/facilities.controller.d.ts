import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
export declare class FacilitiesController {
    private facilities;
    constructor(facilities: FacilitiesService);
    list(user: any, active?: string): Promise<({
        _count: {
            equipment: number;
            inspections: number;
            deadlines: number;
        };
    } & {
        id: string;
        orgId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.FacilityType;
        state: string;
        apiWellNumber: string | null;
        county: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        legalDescription: string | null;
        commissionedAt: Date | null;
        operatorId: string | null;
        decommissionedAt: Date | null;
    })[]>;
    findOne(user: any, id: string): Promise<{
        equipment: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            facilityId: string;
            tag: string;
            category: import(".prisma/client").$Enums.EquipmentCategory;
            description: string | null;
            manufacturer: string | null;
            model: string | null;
            serialNumber: string | null;
            installDate: Date | null;
            pneumaticType: string | null;
            tankCapacityBbls: import("@prisma/client-runtime-utils").Decimal | null;
            compressorHp: number | null;
            throughputMcfd: import("@prisma/client-runtime-utils").Decimal | null;
            lastServiceDate: Date | null;
        }[];
        _count: {
            inspections: number;
            deadlines: number;
            emissionRecords: number;
        };
    } & {
        id: string;
        orgId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.FacilityType;
        state: string;
        apiWellNumber: string | null;
        county: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        legalDescription: string | null;
        commissionedAt: Date | null;
        operatorId: string | null;
        decommissionedAt: Date | null;
    }>;
    create(user: any, dto: CreateFacilityDto): Promise<{
        id: string;
        orgId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.FacilityType;
        state: string;
        apiWellNumber: string | null;
        county: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        legalDescription: string | null;
        commissionedAt: Date | null;
        operatorId: string | null;
        decommissionedAt: Date | null;
    }>;
    update(user: any, id: string, dto: UpdateFacilityDto): Promise<{
        id: string;
        orgId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.FacilityType;
        state: string;
        apiWellNumber: string | null;
        county: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        legalDescription: string | null;
        commissionedAt: Date | null;
        operatorId: string | null;
        decommissionedAt: Date | null;
    }>;
    decommission(user: any, id: string): Promise<{
        id: string;
        orgId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.FacilityType;
        state: string;
        apiWellNumber: string | null;
        county: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        legalDescription: string | null;
        commissionedAt: Date | null;
        operatorId: string | null;
        decommissionedAt: Date | null;
    }>;
}
