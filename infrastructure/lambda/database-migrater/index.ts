import { Handler } from 'aws-lambda';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';

interface EventType {
  RequestType: 'Create' | string;
}
const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USERNAME!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: false,
    pool: { max: 2, min: 0, idle: 10 },
  }
);

const umzug = new Umzug({
  migrations: {
    glob: ['migrations/*.ts', { cwd: __dirname }],
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});


export const handler = async (event: EventType): Promise<any> => {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = process.env;

  console.log('event', event);
  console.log('process.env', process.env);
  const port = +(DB_PORT || 5432);

  if (event.RequestType === 'Create') {
    console.log('Starting database migration...');
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully');
      const result = await umzug.up();
      console.log('Migrations completed successfully');
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Migrations completed',
          applied: result.map(m => m.name),
        }),
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: (error as Error).message }),
      };
    } finally {
      await sequelize.close();
    }
  }
};
