import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as sm from 'aws-cdk-lib/aws-secretsmanager'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as cr from 'aws-cdk-lib/custom-resources'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Duration } from 'aws-cdk-lib'
import * as path from 'path'

interface StackProps extends cdk.StackProps {
  database: rds.DatabaseInstance
  databaseSecret: sm.Secret
  vpc: ec2.Vpc
  databaseName: string
}

export class MigrateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props)

    const { database, databaseName  , databaseSecret, vpc } = props
    
    const databaseMigraterPath = path.join(
      __dirname,
      '..',
      'lambda',
      'database-migrater',
      'index.ts'
    );

    const onEventHandler = new NodejsFunction(this, 'DatabaseMigrate', {
      vpc,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: databaseMigraterPath,
      handler: 'handler',
      environment: {
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_USERNAME: databaseSecret.secretValueFromJson('username').unsafeUnwrap(),
        DB_PASSWORD: databaseSecret.secretValueFromJson('password').unsafeUnwrap(),
        DB_NAME: databaseName,
        SECRET_ARN: databaseSecret.secretArn,
      },
      logGroup: logs.LogGroup.fromLogGroupName(this, 'DatabaseMigrateLogGroup', `/aws/lambda/DatabaseMigrate`),
      timeout: Duration.minutes(2),
      bundling: {
        externalModules: ['aws-sdk'],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              `cd ${outputDir}`,
              'npm install pg pg-hstore sequelize umzug --omit=dev',
            ];
          },
          beforeInstall() {
            return [];
          },
        },
      },
    })

    // Grant the Lambda function permission to access the database secret
    databaseSecret.grantRead(onEventHandler)

    const databaseMigrationProvider = new cr.Provider(
      this,
      'DatabaseMigrateProvider',
      {
        onEventHandler,
        logGroup: logs.LogGroup.fromLogGroupName(this, 'DatabaseMigrateProviderLogGroup', `/aws/lambda/DatabaseMigrateProvider`),
      }
    )

    const databaseMigrationResource = new cdk.CustomResource(
      this,
      'DatabaseMigrateResource',
      {
        serviceToken: databaseMigrationProvider.serviceToken,
      }
    )
  }
}