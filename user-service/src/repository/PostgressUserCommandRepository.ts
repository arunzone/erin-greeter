import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';

import { TYPES } from 'di/types.js';
import { User } from 'domain/User.js';
import { BadRequestError, NotFoundError } from 'errors/HttpError.js';
import {
  UserCommandRepository,
  CreateUserDto,
} from 'repository/interface/UserCommandRepository.js';

import prisma from '../prisma.js';

@injectable()
export class PostgressUserCommandRepository implements UserCommandRepository<User> {
  private readonly db: PrismaClient;
  constructor(@inject(TYPES.Prisma) db?: PrismaClient) {
    this.db = db ?? prisma;
  }
  async create(data: CreateUserDto): Promise<User> {
    try {
      const created = await this.db.user.create({
        data,
      });
      return new User(
        created.id,
        created.firstName,
        created.lastName ?? undefined,
        created.timeZone,
        created.createdAt,
        created.updatedAt,
        (created as any).birthday ?? undefined,
      );
    } catch (error: any) {
      // Prisma throws P2002 for unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new BadRequestError(`User with this ${field} already exists`);
      }
      // Prisma throws P2003 for foreign key constraint violations
      if (error.code === 'P2003') {
        throw new BadRequestError('Invalid reference in user data');
      }
      throw error;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.db.user.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // Extract only the updatable fields from the domain object
    const updateData: Record<string, any> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.timeZone !== undefined) updateData.timeZone = data.timeZone;
    if (data.birthday !== undefined) updateData.birthday = data.birthday;

    try {
      const updated = await this.db.user.update({
        where: { id },
        data: updateData,
      });
      return new User(
        updated.id,
        updated.firstName,
        updated.lastName ?? undefined,
        updated.timeZone,
        updated.createdAt,
        updated.updatedAt,
        (updated as any).birthday ?? undefined,
      );
    } catch (error: any) {
      // Prisma throws P2025 when record to update is not found
      if (error.code === 'P2025') {
        throw new NotFoundError(`User with id ${id} not found`);
      }
      throw error;
    }
  }
}
