import { LambdaClient, InvokeCommand, InvokeCommandInput, LogType } from '@aws-sdk/client-lambda';
import { Kysely, sql, PostgresDialect } from 'kysely'
import { Pool } from 'pg';

const localstackConfig = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

const lambdaClient = new LambdaClient(localstackConfig);
  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: 'localhost',
        port: 5433,
        user: 'test',
        password: 'test',
        database: 'postgres',
        max: 2,
        min: 0,
        idleTimeoutMillis: 10000,
      }),
    }),
  });

const emptyDabatase = async () => {
  await sql`ALTER TABLE "user_birthday" drop constraint user_birthday_user_id_fkey;`.execute(db);
  await sql`drop table "user_birthday";`.execute(db);
  await sql`drop table "user";`.execute(db);
  await sql`drop table kysely_migration;;`.execute(db);
  await sql`drop table kysely_migration_lock;`.execute(db);
}

describe('Lambda Function Invocation', () => {
  const functionName = 'DatabaseMigrate';

  beforeEach(async () => {
    await emptyDabatase();
  });

  it('should migrate database', async () => {
    const payload = JSON.stringify({ key: 'test-value' });

    const params: InvokeCommandInput = {
      FunctionName: functionName,
      Payload: Buffer.from(payload),
      InvocationType: 'RequestResponse',
      LogType: LogType.Tail,
    };

    try {
      const command = new InvokeCommand(params);
      const response = await lambdaClient.send(command);

      const responsePayload = Buffer.from(response.Payload!).toString('utf-8');
      const parsedPayload = JSON.parse(responsePayload);

      expect(response.StatusCode).toBe(200);
      expect(parsedPayload.body).toContain('Migrations completed');
    } catch (error) {
      console.error('Error invoking Lambda:', error);
      fail(`Test failed due to Lambda invocation error: ${error}`);
    }
  });
});
