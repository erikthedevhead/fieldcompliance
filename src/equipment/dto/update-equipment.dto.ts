import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsIn,
  IsDateString,
  MaxLength,
} from "class-validator";

// Matches EPA Subpart W's actual pneumatic device categories (Table W-2).
// See create-equipment.dto.ts for the full explanation of why 'instrument'
// was removed from this list.
const PNEUMATIC_DEVICE_TYPES = [
  "CONTINUOUS_HIGH_BLEED",
  "INTERMITTENT_BLEED",
  "CONTINUOUS_LOW_BLEED",
] as const;

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  installDate?: string;

  @IsOptional()
  @IsDateString()
  lastServiceDate?: string;

  @IsOptional()
  @IsIn(PNEUMATIC_DEVICE_TYPES)
  pneumaticType?: (typeof PNEUMATIC_DEVICE_TYPES)[number];

  @IsOptional()
  @IsNumber()
  tankCapacityBbls?: number;

  @IsOptional()
  @IsInt()
  compressorHp?: number;

  @IsOptional()
  @IsNumber()
  throughputMcfd?: number;
}
