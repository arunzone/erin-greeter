import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { DatabaseConfigRetriever } from './constructs/database/DatabaseConfigRetriever';
import { DatabaseConfigProps } from './constructs/database/DatabaseConfigProps';

interface StackProps extends cdk.StackProps {
  database: rds.DatabaseInstance;
  databaseSecret: sm.Secret;
  vpc: ec2.Vpc;
  databaseName: string;
}

export class MigrateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const { database, databaseSecret, vpc } = props;
    const databaseMigraterPath = path.join(
      __dirname,
      '..',
      'lambda',
      'database-migrater',
      'index.ts'
    );

    const databaseConfigProps: DatabaseConfigProps = DatabaseConfigRetriever.getDatabaseConfig(
      this.node,
      database,
      databaseSecret
    );
    console.log('Database config for local deployment:', databaseConfigProps);
    const onEventHandler = new NodejsFunction(this, 'DatabaseMigrate', {
      vpc,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: databaseMigraterPath,
      handler: 'handler',
      functionName: 'DatabaseMigrate',
      environment: {
        DB_HOST: databaseConfigProps.databaseHost,
        DB_PORT: databaseConfigProps.databasePort,
        DB_USERNAME: databaseConfigProps.databaseUsername,
        DB_PASSWORD: databaseConfigProps.databasePassword,
        DB_NAME: databaseConfigProps.databaseName,
        SECRET_ARN: databaseSecret.secretArn,
      },
      logGroup: logs.LogGroup.fromLogGroupName(
        this,
        'DatabaseMigrateLogGroup',
        `/aws/lambda/DatabaseMigrate`
      ),
      timeout: Duration.minutes(2),
      bundling: {
        externalModules: [],
        nodeModules: ['kysely', 'pg'],
        commandHooks: {
          beforeBundling(_inputDir: string, _outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              `cp -r ${inputDir}/lambda/database-migrater/migrations ${outputDir}/migrations`,
            ];
          },
          beforeInstall() {
            return [];
          },
        },
      },
    });

    // Grant the Lambda function permission to access the database secret
    databaseSecret.grantRead(onEventHandler);

    const databaseMigrationProvider = new cr.Provider(this, 'DatabaseMigrateProvider', {
      onEventHandler,
      logGroup: logs.LogGroup.fromLogGroupName(
        this,
        'DatabaseMigrateProviderLogGroup',
        `/aws/lambda/DatabaseMigrateProvider`
      ),
    });

    new cdk.CustomResource(this, 'DatabaseMigrateResource', {
      serviceToken: databaseMigrationProvider.serviceToken,
    });
  }
}
