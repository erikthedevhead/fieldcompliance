import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string, orgId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
    }>;
    listForOrg(orgId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
    }[]>;
    create(orgId: string, dto: CreateUserDto): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
    }>;
    update(id: string, orgId: string, dto: UpdateUserDto): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
    }>;
    deactivate(id: string, orgId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        phone: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
    }>;
    private publicSelect;
}
