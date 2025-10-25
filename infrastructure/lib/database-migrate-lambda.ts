import { Client } from 'pg';

interface EventType {
  RequestType: 'Create' | string;
}

export const handler = async (event: EventType): Promise<any> => {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = process.env;
  console.log('process.env', process.env);
  console.log('event', event);
  

  
  if (event.RequestType == 'Create') {
    const port = +(DB_PORT || 5432);

    console.log('DB_HOST', DB_HOST);
    console.log('DB_NAME', DB_NAME);
    console.log('port', port);

    const rootClient = new Client({
      port,
      host: DB_HOST,
      user: DB_USERNAME,
      password: DB_PASSWORD,
      database: 'postgres',
    });

    try {
      await rootClient.connect();

      console.log(
        await rootClient.query(`
        CREATE DATABASE ${DB_NAME};
      `)
      );
    } catch (error) {
      console.warn(
        `Error creating db ${DB_NAME}, check if due to db existing, move on anyway`
      );
      console.warn(error);
    } finally {
      await rootClient.end();
    }

    const appClient = new Client({
      port,
      host: DB_HOST,
      user: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    try {
        await appClient.connect();

        console.log(
          await appClient.query(`
          CREATE TABLE users (
            id serial PRIMARY KEY,
            username VARCHAR ( 50 ) UNIQUE NOT NULL,
            password VARCHAR ( 50 ) NOT NULL
          );
          `)
        );
    
        console.log(
          await appClient.query(`
          INSERT INTO users
            (id, username, password)
          VALUES (1, 'helloworld', 'securepassword');
        `)
        );
    
        const selectResult = await appClient.query(`
          SELECT * FROM users;
          `);
        console.log('SELECT * FROM users result:', selectResult.rows);
    } catch (error) {
        console.error('Error during application DB setup:', error);
        throw error;
    } finally {
        await appClient.end();
    }
  }

  return { statusCode: 200, body: 'DB setup complete' };
};
