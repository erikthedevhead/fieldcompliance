declare const CATEGORIES: readonly ["PNEUMATIC_CONTROLLER", "PNEUMATIC_PUMP", "STORAGE_TANK", "SEPARATOR", "COMPRESSOR_RECIPROCATING", "COMPRESSOR_CENTRIFUGAL", "DEHYDRATOR_GLYCOL", "METER_SEPARATOR", "FLARE_SYSTEM", "WELLHEAD", "FUGITIVE_COMPONENT"];
export declare class CreateEquipmentDto {
    facilityId: string;
    tag: string;
    category: (typeof CATEGORIES)[number];
    description?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    installDate?: string;
    pneumaticType?: string;
    tankCapacityBbls?: number;
    compressorHp?: number;
    throughputMcfd?: number;
}
export {};
