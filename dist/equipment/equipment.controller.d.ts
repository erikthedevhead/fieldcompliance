import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
export declare class EquipmentController {
    private equipment;
    constructor(equipment: EquipmentService);
    list(user: any, facilityId?: string): Promise<({
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
    findOne(user: any, id: string): Promise<{
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
    create(user: any, dto: CreateEquipmentDto): Promise<{
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
    update(user: any, id: string, dto: UpdateEquipmentDto): Promise<{
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
    remove(user: any, id: string): Promise<{
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
