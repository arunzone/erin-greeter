export interface UserRepository<TEntity> {
  findAllUsers(): Promise<TEntity[]>;

  findUserById(id: string): Promise<TEntity | undefined>

  createUser(userData: {
    id: string;
    first_name: string;
    last_name: string;
    birthday?: string;
    timezone: string;
  }): Promise<TEntity>;
}