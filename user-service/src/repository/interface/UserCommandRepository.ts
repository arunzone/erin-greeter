export type CreateUserDto = { firstName: string; lastName?: string; timeZone: string };

export interface UserCommandRepository<T> {
  create(data: CreateUserDto): Promise<T>;
}
