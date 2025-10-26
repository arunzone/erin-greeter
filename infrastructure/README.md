# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Setup

```bash
aws configure

cdk init app --language typescript
cdk synth
cdk bootstrap

cdk deploy
```

## Useful commands

### Aws development
- `cdk bootstrap` bootstrap for aws env before `cdk watch`
- `cdk watch --all --hotswap-fallback --no-rollback` watch for changes and deploy for development
- `cdk deploy --all` deploy for production
- `cdk destroy --all` destroy for production

### Localstack development
- `npm run test:watch` run test while making changes using localstack
#### Fine grained control
- `npm test -- infrastructure/test/lambda/database-migrater/index.test.ts` to run lambda test
- `docker-compose up -d` to start localstack
- `docker-compose down` to stop localstack
- `NODE_PATH=${PWD}/node_modules npx cdklocal bootstrap` to bootstrap localstack
- `NODE_PATH=${PWD}/node_modules npx cdklocal deploy -vvv --all --context envType=local --require-approval never` to deploy to localstack
### local database access
- `psql postgres://test:test@localhost:5433/postgres -c '\dt;'` to access local database
- `psql -h localhost -p 5433 -U test -d postgres` to access local database

### pre-commit commands
- `npm run lint:fix` perform the eslint fix
- `npm run test` perform the jest unit tests
- `npx cdk synth` emits the synthesized CloudFormation template

### localstack util commands
- `awslocal lambda get-function-configuration --function-name DatabaseMigrate` to get lambda configuration