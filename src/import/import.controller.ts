import {
  Controller,
  Post,
  Get,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { ImportService } from './import.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

const FACILITY_TEMPLATE =
  'name,type,state,apiWellNumber,county,latitude,longitude,legalDescription,commissionedAt\n' +
  'Midland Basin Pad A,PRODUCTION_WELL,TX,42-329-12345-0000,Midland,31.9974,-102.0779,,2023-03-15\n'

const EQUIPMENT_TEMPLATE =
  'facilityName,apiWellNumber,tag,category,description,manufacturer,model,serialNumber,installDate,pneumaticType,tankCapacityBbls,compressorHp,throughputMcfd\n' +
  'Midland Basin Pad A,,PC-101,PNEUMATIC_CONTROLLER,High-bleed level controller,Fisher,,,2023-03-15,CONTINUOUS_HIGH_BLEED,,,\n' +
  'Midland Basin Pad A,,ST-101,STORAGE_TANK,Crude storage 400 bbl,,,,2023-03-15,,400,,\n'

@Controller('import')
export class ImportController {
  constructor(private imports: ImportService) {}

  /**
   * Upload facilities (.csv or .xlsx). Default is a dry-run validation
   * report; pass ?commit=true to write. Commit is all-or-nothing and is
   * refused when any row has errors.
   */
  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Post('facilities')
  @UseInterceptors(FileInterceptor('file'))
  importFacilities(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Query('commit') commit?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('No file uploaded (field name: "file")')
    return this.imports.importFacilities(user.orgId, file.buffer, commit === 'true')
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Post('equipment')
  @UseInterceptors(FileInterceptor('file'))
  importEquipment(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Query('commit') commit?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('No file uploaded (field name: "file")')
    return this.imports.importEquipment(user.orgId, file.buffer, commit === 'true')
  }

  /** Downloadable CSV templates with a header row and one example row. */
  @Get('templates/facilities.csv')
  facilityTemplate(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="facilities-import-template.csv"')
    res.send(FACILITY_TEMPLATE)
  }

  @Get('templates/equipment.csv')
  equipmentTemplate(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="equipment-import-template.csv"')
    res.send(EQUIPMENT_TEMPLATE)
  }
}
