import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    list(orgId: string, year?: number): Promise<({
        facility: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string | null;
        periodStart: Date;
        periodEnd: Date;
        status: import(".prisma/client").$Enums.ReportStatus;
        reportType: string;
        reportingYear: number;
        generatedAt: Date | null;
        submittedAt: Date | null;
        submittedBy: string | null;
        eggrtConfirmationId: string | null;
        xmlPayload: string | null;
        pdfS3Key: string | null;
        reviewNotes: string | null;
    })[]>;
    findById(id: string, orgId: string): Promise<{
        facility: {
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
        };
    } & {
        id: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        facilityId: string | null;
        periodStart: Date;
        periodEnd: Date;
        status: import(".prisma/client").$Enums.ReportStatus;
        reportType: string;
        reportingYear: number;
        generatedAt: Date | null;
        submittedAt: Date | null;
        submittedBy: string | null;
        eggrtConfirmationId: string | null;
        xmlPayload: string | null;
        pdfS3Key: string | null;
        reviewNotes: string | null;
    }>;
}
