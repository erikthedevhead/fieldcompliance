import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private users;
    constructor(users: UsersService);
    me(user: any): Promise<{
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
    list(user: any): Promise<{
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
    create(user: any, dto: CreateUserDto): Promise<{
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
    update(user: any, id: string, dto: UpdateUserDto): Promise<{
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
    deactivate(user: any, id: string): Promise<{
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
}
