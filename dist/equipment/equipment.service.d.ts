import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
export declare class EquipmentService {
    private prisma;
    constructor(prisma: PrismaService);
    list(orgId: string, opts?: {
        facilityId?: string;
    }): Promise<({
        facility: {
            id: string;
            name: string;
            state: string;
        };
    } & {
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
    })[]>;
    findById(id: string, orgId: string): Promise<{
        facility: {
            id: string;
            name: string;
            state: string;
        };
    } & {
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
    }>;
    create(orgId: string, dto: CreateEquipmentDto): Promise<{
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
    }>;
    update(id: string, orgId: string, dto: UpdateEquipmentDto): Promise<{
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
    }>;
    remove(id: string, orgId: string): Promise<{
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
    }>;
}
