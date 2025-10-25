import { handler } from '../lib/database-migrate-lambda';
import { Client } from 'pg'; 

describe('Lambda Handler Full Integration with LocalStack Secrets Manager & RDS', () => {
    const TEST_DB_CREDENTIALS = {
        username: 'test_user',
        password: 'test_password',
    };
    
    const MOCK_ENV = {
        DB_HOST: 'localhost', 
        DB_PORT: '5432', 
        DB_NAME: 'test_db_integration',
        DB_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test_secret',
    };
    
    const originalEnv = process.env;

    beforeAll(() => {
        process.env = { 
            ...originalEnv,
            DB_HOST: MOCK_ENV.DB_HOST,
            DB_PORT: MOCK_ENV.DB_PORT,
            DB_NAME: MOCK_ENV.DB_NAME,
            DB_SECRET_ARN: MOCK_ENV.DB_SECRET_ARN,
            SECRETS_MANAGER_ENDPOINT: 'http://localhost:4566',
            AWS_REGION: 'us-east-1',
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
        };
    });

    afterAll(async () => {
        try {
            const client = new Client({
                port: +(MOCK_ENV.DB_PORT),
                host: MOCK_ENV.DB_HOST,
                user: TEST_DB_CREDENTIALS.username, 
                password: TEST_DB_CREDENTIALS.password,
                database: 'postgres', 
            });
            await client.connect();
            await client.query(`DROP DATABASE IF EXISTS ${MOCK_ENV.DB_NAME} WITH (FORCE);`);
            await client.end();
            console.log(`Successfully cleaned up database: ${MOCK_ENV.DB_NAME}`);
        } catch (error) {
            console.warn(`Could not perform DB cleanup. Ensure LocalStack RDS is running and accessible: ${error}`);
        }
        
        process.env = originalEnv;
    });

    it('should successfully fetch the secret from LocalStack and create/seed the database', async () => {
        const event = { RequestType: 'Create' };

        const response = await handler(event);

        expect(response).toEqual({ statusCode: 200, body: 'DB setup complete' });
        
        const verificationClient = new Client({
            port: +(MOCK_ENV.DB_PORT),
            host: MOCK_ENV.DB_HOST,
            user: TEST_DB_CREDENTIALS.username,
            password: TEST_DB_CREDENTIALS.password,
            database: MOCK_ENV.DB_NAME,
        });

        await verificationClient.connect();
        
        const tableCheck = await verificationClient.query("SELECT to_regclass('users');");
        expect(tableCheck.rows[0].to_regclass).toBe('users');
        
        const rowCheck = await verificationClient.query("SELECT username FROM users WHERE id = 1;");
        expect(rowCheck.rows[0].username).toBe('helloworld');
        
        await verificationClient.end();
    });
    
    it('should throw an error if DB_SECRET_ARN is missing', async () => {
        const originalArn = process.env.DB_SECRET_ARN;
        delete process.env.DB_SECRET_ARN;

        await expect(handler({ RequestType: 'Create' })).rejects.toThrow('Environment variable DB_SECRET_ARN is missing.');

        process.env.DB_SECRET_ARN = originalArn;
    });
});
