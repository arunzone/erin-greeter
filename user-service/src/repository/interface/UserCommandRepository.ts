export type CreateUserDto = { firstName: string; lastName?: string; timeZone: string; birthday?: Date };

export interface UserCommandRepository<T> {
  create(data: CreateUserDto): Promise<T>;
  deleteById(id: string): Promise<boolean>;
}
