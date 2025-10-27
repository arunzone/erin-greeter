import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import { Node } from 'constructs';
import { DatabaseConfigProps } from './DatabaseConfigProps';

export class DatabaseConfigRetriever {
  static getDatabaseConfig(
    node: Node,
    database: rds.DatabaseInstance,
    databaseSecret: sm.Secret
  ): DatabaseConfigProps {
    const envType = node.tryGetContext('envType');
    const isLocal = envType === 'local';
    console.log('Environment type:', envType);
    console.log('isLocal:', isLocal);

    if (isLocal) {
      // Hardcode all values for local testing, assuming a standard setup
      return {
        databaseHost: 'postgres',
        databasePort: '5432',
        databaseUsername: 'test',
        databasePassword: 'test',
        databaseName: 'postgres',
      };
    } else {
      // Use dynamic references for real AWS deployment
      return {
        databaseHost: database.dbInstanceEndpointAddress,
        databasePort: database.dbInstanceEndpointPort,
        databaseUsername: databaseSecret.secretValueFromJson('username').unsafeUnwrap(),
        databasePassword: databaseSecret.secretValueFromJson('password').unsafeUnwrap(),
        databaseName: 'postgres',
      };
    }
  }
}
