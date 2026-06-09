"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEquipmentDto = void 0;
const class_validator_1 = require("class-validator");
const CATEGORIES = [
    'PNEUMATIC_CONTROLLER',
    'PNEUMATIC_PUMP',
    'STORAGE_TANK',
    'SEPARATOR',
    'COMPRESSOR_RECIPROCATING',
    'COMPRESSOR_CENTRIFUGAL',
    'DEHYDRATOR_GLYCOL',
    'METER_SEPARATOR',
    'FLARE_SYSTEM',
    'WELLHEAD',
    'FUGITIVE_COMPONENT',
];
class CreateEquipmentDto {
    facilityId;
    tag;
    category;
    description;
    manufacturer;
    model;
    serialNumber;
    installDate;
    pneumaticType;
    tankCapacityBbls;
    compressorHp;
    throughputMcfd;
}
exports.CreateEquipmentDto = CreateEquipmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "facilityId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "tag", void 0);
__decorate([
    (0, class_validator_1.IsIn)(CATEGORIES),
    __metadata("design:type", Object)
], CreateEquipmentDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "manufacturer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "serialNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "installDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['high-bleed', 'low-bleed', 'instrument']),
    __metadata("design:type", String)
], CreateEquipmentDto.prototype, "pneumaticType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEquipmentDto.prototype, "tankCapacityBbls", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateEquipmentDto.prototype, "compressorHp", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEquipmentDto.prototype, "throughputMcfd", void 0);
//# sourceMappingURL=create-equipment.dto.js.map