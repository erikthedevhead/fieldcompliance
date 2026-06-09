declare const FACILITY_TYPES: readonly ["PRODUCTION_WELL", "INJECTION_WELL", "COMPRESSOR_STATION", "GATHERING_PIPELINE", "PROCESSING_PLANT", "STORAGE_TANK_BATTERY", "MIDSTREAM_FACILITY"];
export declare class CreateFacilityDto {
    name: string;
    type: (typeof FACILITY_TYPES)[number];
    state: string;
    apiWellNumber?: string;
    county?: string;
    latitude?: number;
    longitude?: number;
    legalDescription?: string;
    commissionedAt?: string;
}
export {};
