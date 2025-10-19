export interface UserQueryRepository<T> {
  getById(id: string): Promise<T | undefined>;
}
