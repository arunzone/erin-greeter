export interface UserCommandRepository<T> {
  create(data: T): Promise<T>;
}