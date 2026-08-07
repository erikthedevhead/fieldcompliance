import { Injectable, BadRequestException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFacilityDto } from '../facilities/dto/create-facility.dto'
import { CreateEquipmentDto } from '../equipment/dto/create-equipment.dto'
import { parseBuffer, RawRow, str, num, int } from './import-parsing'

export interface RowError {
  row: number // 1-based data row (excluding header)
  errors: string[]
}
export interface ImportReport {
  totalRows: number
  validRows: number
  errors: RowError[]
  warnings: RowError[]
  committed: boolean
  createdCount: number
}

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // FACILITIES
  // ============================================================
  async importFacilities(
    orgId: string,
    buffer: Buffer,
    commit: boolean,
  ): Promise<ImportReport> {
    const raw = await parseBuffer(buffer)
    if (raw.length === 0) {
      throw new BadRequestException('File contains no data rows')
    }

    const dtos: CreateFacilityDto[] = []
    const errors: RowError[] = []
    const warnings: RowError[] = []
    const seenNames = new Set<string>()

    raw.forEach((row, i) => {
      const rowNum = i + 1
      const candidate = {
        name: str(row, 'name'),
        type: str(row, 'type')?.toUpperCase().replace(/[\s-]+/g, '_'),
        state: str(row, 'state')?.toUpperCase(),
        apiWellNumber: str(row, 'apiwellnumber'),
        county: str(row, 'county'),
        latitude: num(row, 'latitude'),
        longitude: num(row, 'longitude'),
        legalDescription: str(row, 'legaldescription'),
        commissionedAt: str(row, 'commissionedat'),
      }
      const dto = plainToInstance(CreateFacilityDto, candidate)
      dtos.push(dto)

      if (candidate.name) {
        const key = candidate.name.toLowerCase()
        if (seenNames.has(key)) {
          warnings.push({ row: rowNum, errors: [`Duplicate facility name in file: "${candidate.name}"`] })
        }
        seenNames.add(key)
      }
    })

    // class-validator pass
    for (let i = 0; i < dtos.length; i++) {
      const v = await validate(dtos[i] as object, { whitelist: true })
      if (v.length > 0) {
        errors.push({
          row: i + 1,
          errors: v.flatMap(e => Object.values(e.constraints ?? {})),
        })
      }
    }

    return this.prisma.asOrg(orgId, async tx => {
      // Plan-limit check across the whole batch
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { maxFacilities: true },
      })
      const current = await tx.facility.count({ where: { orgId, isActive: true } })
      if (org && current + dtos.length > org.maxFacilities) {
        errors.push({
          row: 0,
          errors: [
            `Import would exceed plan limit: ${current} existing + ${dtos.length} new > ${org.maxFacilities} allowed`,
          ],
        })
      }

      // Duplicate-name warnings against existing DB rows
      const existing = await tx.facility.findMany({
        where: { orgId, isActive: true },
        select: { name: true },
      })
      const existingNames = new Set(existing.map(f => f.name.toLowerCase()))
      dtos.forEach((d, i) => {
        if (d.name && existingNames.has(d.name.toLowerCase())) {
          warnings.push({ row: i + 1, errors: [`Facility named "${d.name}" already exists in your org`] })
        }
      })

      const report: ImportReport = {
        totalRows: dtos.length,
        validRows: dtos.length - new Set(errors.map(e => e.row)).size,
        errors: errors.sort((a, b) => a.row - b.row),
        warnings,
        committed: false,
        createdCount: 0,
      }

      if (!commit || errors.length > 0) return report

      // All-or-nothing: we are already inside asOrg's transaction
      for (const d of dtos) {
        await tx.facility.create({
          data: {
            ...d,
            orgId,
            commissionedAt: d.commissionedAt ? new Date(d.commissionedAt) : undefined,
          },
        })
      }
      report.committed = true
      report.createdCount = dtos.length
      return report
    })
  }

  // ============================================================
  // EQUIPMENT
  // ============================================================
  async importEquipment(
    orgId: string,
    buffer: Buffer,
    commit: boolean,
  ): Promise<ImportReport> {
    const raw = await parseBuffer(buffer)
    if (raw.length === 0) {
      throw new BadRequestException('File contains no data rows')
    }

    return this.prisma.asOrg(orgId, async tx => {
      const facilities = await tx.facility.findMany({
        where: { orgId, isActive: true },
        select: { id: true, name: true, apiWellNumber: true },
      })
      const byName = new Map(facilities.map(f => [f.name.toLowerCase(), f]))
      const byApi = new Map(
        facilities.filter(f => f.apiWellNumber).map(f => [f.apiWellNumber as string, f]),
      )

      const errors: RowError[] = []
      const warnings: RowError[] = []
      const dtos: (CreateEquipmentDto & { _facilityId?: string })[] = []
      const seenTags = new Set<string>() // facilityId::tag within file

      raw.forEach((row, i) => {
        const rowNum = i + 1
        const facilityName = str(row, 'facilityname')
        const apiWell = str(row, 'apiwellnumber')
        const facility =
          (apiWell && byApi.get(apiWell)) ||
          (facilityName && byName.get(facilityName.toLowerCase())) ||
          undefined

        if (!facility) {
          errors.push({
            row: rowNum,
            errors: [
              `Cannot match facility — provide facilityName or apiWellNumber matching an existing facility` +
                (facilityName ? ` (no facility named "${facilityName}")` : '') +
                (apiWell ? ` (no facility with API ${apiWell})` : ''),
            ],
          })
        }

        const candidate = {
          facilityId: facility?.id ?? 'unresolved',
          tag: str(row, 'tag'),
          category: str(row, 'category')?.toUpperCase().replace(/[\s-]+/g, '_'),
          description: str(row, 'description'),
          manufacturer: str(row, 'manufacturer'),
          model: str(row, 'model'),
          serialNumber: str(row, 'serialnumber'),
          installDate: str(row, 'installdate'),
          pneumaticType: str(row, 'pneumatictype')?.toUpperCase().replace(/[\s-]+/g, '_'),
          tankCapacityBbls: num(row, 'tankcapacitybbls'),
          compressorHp: int(row, 'compressorhp'),
          throughputMcfd: num(row, 'throughputmcfd'),
        }
        const dto = plainToInstance(CreateEquipmentDto, candidate) as CreateEquipmentDto & {
          _facilityId?: string
        }
        dto._facilityId = facility?.id
        dtos.push(dto)

        if (facility && candidate.tag) {
          const key = `${facility.id}::${candidate.tag.toLowerCase()}`
          if (seenTags.has(key)) {
            errors.push({ row: rowNum, errors: [`Duplicate tag "${candidate.tag}" for the same facility within this file`] })
          }
          seenTags.add(key)
        }

        // Domain nudges, not blockers
        if (candidate.category === 'PNEUMATIC_CONTROLLER' && !candidate.pneumaticType) {
          warnings.push({
            row: rowNum,
            errors: [
              'PNEUMATIC_CONTROLLER without pneumaticType will be SKIPPED by the emissions calculator (device type must never be guessed)',
            ],
          })
        }
      })

      for (let i = 0; i < dtos.length; i++) {
        const { _facilityId, ...pure } = dtos[i]
        const v = await validate(plainToInstance(CreateEquipmentDto, pure) as object, {
          whitelist: true,
        })
        if (v.length > 0) {
          errors.push({
            row: i + 1,
            errors: v.flatMap(e => Object.values(e.constraints ?? {})),
          })
        }
      }

      // Existing-tag conflicts in DB
      const facilityIds = [...new Set(dtos.map(d => d._facilityId).filter(Boolean))] as string[]
      if (facilityIds.length > 0) {
        const existingEq = await tx.equipment.findMany({
          where: { facilityId: { in: facilityIds } },
          select: { facilityId: true, tag: true },
        })
        const existingKeys = new Set(existingEq.map(e => `${e.facilityId}::${e.tag.toLowerCase()}`))
        dtos.forEach((d, i) => {
          if (d._facilityId && d.tag && existingKeys.has(`${d._facilityId}::${d.tag.toLowerCase()}`)) {
            errors.push({ row: i + 1, errors: [`Tag "${d.tag}" already exists on that facility`] })
          }
        })
      }

      const report: ImportReport = {
        totalRows: dtos.length,
        validRows: dtos.length - new Set(errors.map(e => e.row)).size,
        errors: errors.sort((a, b) => a.row - b.row),
        warnings,
        committed: false,
        createdCount: 0,
      }

      if (!commit || errors.length > 0) return report

      for (const d of dtos) {
        const { _facilityId, ...pure } = d
        await tx.equipment.create({
          data: {
            ...pure,
            facilityId: _facilityId as string,
            installDate: pure.installDate ? new Date(pure.installDate) : undefined,
          },
        })
      }
      report.committed = true
      report.createdCount = dtos.length
      return report
    })
  }
}
