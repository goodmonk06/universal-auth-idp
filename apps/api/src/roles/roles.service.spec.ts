import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new role successfully', async () => {
      const tenantId = 'tenant-123';
      const createDto = { name: 'Editor', description: 'Can edit content' };
      const mockRole = {
        id: 'role-123',
        tenantId,
        name: 'Editor',
        description: 'Can edit content',
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.create.mockResolvedValue(mockRole);
      mockPrismaService.role.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...mockRole,
        rolePermissions: [],
      });

      const result = await service.create(tenantId, createDto);

      expect(result.name).toBe('Editor');
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { tenantId_name: { tenantId, name: 'Editor' } },
      });
    });

    it('should throw ConflictException if role name already exists', async () => {
      const tenantId = 'tenant-123';
      const createDto = { name: 'Editor' };
      const existingRole = { id: 'role-123', name: 'Editor', tenantId };

      mockPrismaService.role.findUnique.mockResolvedValue(existingRole);

      await expect(service.create(tenantId, createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all roles for a tenant', async () => {
      const tenantId = 'tenant-123';
      const mockRoles = [
        {
          id: 'role-1',
          tenantId,
          name: 'Admin',
          description: 'Admin role',
          rolePermissions: [],
        },
        {
          id: 'role-2',
          tenantId,
          name: 'Editor',
          description: 'Editor role',
          rolePermissions: [],
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Admin');
      expect(result[1].name).toBe('Editor');
    });
  });

  describe('findOne', () => {
    it('should return a single role', async () => {
      const roleId = 'role-123';
      const mockRole = {
        id: roleId,
        tenantId: 'tenant-123',
        name: 'Admin',
        rolePermissions: [],
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.findOne(roleId);

      expect(result.name).toBe('Admin');
    });

    it('should throw NotFoundException if role does not exist', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      const dto = { userId: 'user-123', roleId: 'role-123' };
      const mockRole = { id: 'role-123', tenantId: 'tenant-123', name: 'Admin' };
      const mockUser = { id: 'user-123', tenantId: 'tenant-123', email: 'user@example.com' };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userRole.create.mockResolvedValue({});

      await service.assignRoleToUser(dto);

      expect(mockPrismaService.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-123', roleId: 'role-123' },
      });
    });

    it('should throw NotFoundException if role does not exist', async () => {
      const dto = { userId: 'user-123', roleId: 'role-123' };

      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRoleToUser(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if role and user are in different tenants', async () => {
      const dto = { userId: 'user-123', roleId: 'role-123' };
      const mockRole = { id: 'role-123', tenantId: 'tenant-1', name: 'Admin' };
      const mockUser = { id: 'user-123', tenantId: 'tenant-2', email: 'user@example.com' };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.assignRoleToUser(dto)).rejects.toThrow(ConflictException);
    });
  });
});
