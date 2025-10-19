export type CreateUserDto = { firstName: string; lastName?: string };

export interface UserCommandRepository<T> {
  create(data: CreateUserDto): Promise<T>;
}
