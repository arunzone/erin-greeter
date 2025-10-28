import { KyselyTrx } from '../types';

export interface UserRepository<TSelect, TInsert> {
  // Read methods use the TSelect (Output) type
  findAllUsers(): Promise<TSelect[]>;
  findUserById(id: string): Promise<TSelect | undefined>;

  // Write methods use the TInsert (Input) type, but still return TSelect (the final inserted object)
  createUser(userData: TInsert, trx: KyselyTrx): Promise<TSelect>;
}
