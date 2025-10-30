# Infrastructure

AWS CDK infrastructure for the Erin Birthday Greeter system. This project defines all cloud resources including Lambda functions, SQS queues, EventBridge rules, RDS database, and VPC networking.

## Features

- **Infrastructure as Code**: Type-safe AWS infrastructure using CDK
- **Serverless Processing**: Lambda functions for birthday finding and greeting
- **Event-Driven**: EventBridge scheduling and SQS message queuing
- **Database**: RDS PostgreSQL with automated migrations
- **Local Development**: Localstack support for testing without AWS
- **Modular Design**: Reusable CDK constructs

## Technology Stack

- **IaC Framework**: AWS CDK 2.x (TypeScript)
- **Runtime**: Node.js 20+
- **Bundler**: esbuild (fast Lambda bundling)
- **Testing**: Jest with Localstack
- **AWS Services**:
  - Lambda (serverless compute)
  - EventBridge (scheduling)
  - SQS (message queuing)
  - RDS PostgreSQL (database)
  - VPC (networking)
  - Secrets Manager (credentials)

## Project Structure

```
infrastructure/
├── lib/
│   ├── constructs/                 # Reusable CDK constructs
│   │   ├── BirthdayFinderProcessor.ts
│   │   ├── BirthdayGreeterProcessor.ts
│   │   └── BirthdayGreetingQueueConstruct.ts
│   ├── birthday-greeting-stack.ts  # Main stack
│   ├── database-stack.ts           # RDS & VPC stack
│   └── infrastructure-stack.ts     # Root stack
├── lambda/
│   ├── birthday-finder-handler/    # Finds users with birthdays
│   │   ├── index.ts
│   │   ├── service/
│   │   ├── repository/
│   │   └── utils/
│   ├── birthday-greeter-handler/   # Sends birthday greetings
│   │   └── index.ts
│   ├── database-migrater/          # Runs DB migrations
│   │   └── index.ts
│   └── user-ingestion-handler/     # Processes user events
│       └── index.ts
├── test/                           # Infrastructure tests
│   └── lambda/                     # Lambda function tests
├── bin/
│   └── infrastructure.ts           # CDK app entry point
└── cdk.json                        # CDK configuration
```

## Prerequisites

- Node.js 20+ and npm
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- Docker (for Localstack testing)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

```bash
aws configure
```

### 3. Bootstrap CDK (First Time Only)

```bash
# Bootstrap your AWS account for CDK
cdk bootstrap

# Verify bootstrap
cdk ls
```

### 4. Deploy to AWS

```bash
# Synthesize CloudFormation templates
cdk synth

# Deploy all stacks
cdk deploy --all

# Deploy specific stack
cdk deploy BirthdayGreetingStack
```

### 5. Development Mode

```bash
# Watch for changes and auto-deploy
cdk watch --all --hotswap-fallback --no-rollback
```

## CDK Stacks

### DatabaseStack

Provisions database and networking infrastructure:

- **VPC**: 2 availability zones, public/private subnets
- **RDS PostgreSQL**: Database instance in private subnet
- **Security Groups**: Controlled database access
- **Secrets Manager**: Database credentials
- **Database Migrator Lambda**: Runs migrations on deployment

```typescript
new DatabaseStack(app, 'DatabaseStack', {
  env: { account: '123456789', region: 'us-east-1' },
});
```

### BirthdayGreetingStack

Provisions birthday processing infrastructure:

- **SQS Queues**: Main queue + DLQ
- **Birthday Finder Lambda**: Scheduled by EventBridge
- **Birthday Greeter Lambda**: Triggered by SQS
- **EventBridge Rule**: Runs every 20 minutes

```typescript
new BirthdayGreetingStack(app, 'BirthdayGreetingStack', {
  database,
  databaseSecret,
  vpc,
  databaseName: 'user_service',
});
```

## Lambda Functions

### Birthday Finder Handler

**Purpose**: Find users with birthdays and queue greeting messages

**Trigger**: EventBridge (cron: every 20 minutes)

**Logic**:
1. Calculate timezones currently in 9 AM window (±10 min)
2. Query database for users with birthdays in those timezones
3. Calculate delay for each user to reach exactly 9 AM local time
4. Send message to SQS with delay (0-900 seconds)
5. Spread messages over 5 minutes for load balancing

**Environment Variables**:
- `DATABASE_SECRET_ARN`: Secrets Manager ARN
- `GREETING_QUEUE_URL`: SQS queue URL

**Key Files**:
- `lambda/birthday-finder-handler/index.ts`
- `lambda/birthday-finder-handler/service/BirthdayFinderService.ts`
- `lambda/birthday-finder-handler/repository/BirthdayRepository.ts`
- `lambda/birthday-finder-handler/utils/TimezoneCalculator.ts`

### Birthday Greeter Handler

**Purpose**: Send birthday greetings to users

**Trigger**: SQS queue messages

**Logic**:
1. Process SQS batch messages
2. For each message:
   - Check if greeting already sent this year (`sent_year`)
   - Update `sent_year` to current year (idempotency)
   - Send HTTP POST to external service with greeting
3. Return partial batch failures for retries

**Environment Variables**:
- `DATABASE_SECRET_ARN`: Secrets Manager ARN
- `REQUESTBIN_URL`: External greeting service URL

**Key Files**:
- `lambda/birthday-greeter-handler/index.ts`

### Database Migrator Handler

**Purpose**: Run database migrations on deployment

**Trigger**: Manual or CodePipeline

**Logic**:
1. Connect to RDS database
2. Execute migration scripts
3. Update schema version

## Local Development with Localstack

Localstack simulates AWS services locally for testing:

### Setup Localstack

```bash
# Start Localstack via Docker Compose
docker-compose up -d

# Verify Localstack is running
docker ps | grep localstack
```

### Deploy to Localstack

```bash
# Bootstrap Localstack
NODE_PATH=${PWD}/node_modules npx cdklocal bootstrap

# Deploy all stacks to Localstack
NODE_PATH=${PWD}/node_modules npx cdklocal deploy -vvv --all \
  --context envType=local \
  --require-approval never
```

### Run Tests Against Localstack

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-restart Localstack)
npm run test:watch

# Run specific test
npm test -- test/lambda/birthday-finder-handler/service/BirthdayFinderService.test.ts

# Run once against Localstack
npm run test:once
```

### Localstack Utilities

```bash
# Get Lambda configuration
awslocal lambda get-function-configuration \
  --function-name BirthdayFinderFunction

# List SQS queues
awslocal sqs list-queues

# Send test message to queue
awslocal sqs send-message \
  --queue-url http://localhost:4566/000000000000/BirthdayGreetingQueue \
  --message-body '{"userId":"123","firstName":"John","lastName":"Doe","year":2025}'

# Invoke Lambda directly
awslocal lambda invoke \
  --function-name BirthdayFinderFunction \
  --payload '{}' \
  response.json
```

## Testing

### Unit Tests

Test Lambda functions in isolation:

```bash
npm test
```

### Integration Tests

Test with Localstack (simulates real AWS):

```bash
# Start Localstack and run tests
npm run test:watch

# Or manually
npm run localstack:up
npm run test:once
npm run localstack:down
```

### Test Structure

```
test/
├── lambda/
│   ├── birthday-finder-handler/
│   │   ├── service/BirthdayFinderService.test.ts
│   │   └── utils/TimezoneCalculator.test.ts
│   └── birthday-greeter-handler/
│       └── index.test.ts
└── stacks/
    └── BirthdayGreetingStack.test.ts
```

## CDK Commands

### Synthesis

```bash
# Generate CloudFormation templates
cdk synth

# Synth specific stack
cdk synth BirthdayGreetingStack

# View synthesized template
cdk synth > template.yaml
```

### Deployment

```bash
# Deploy all stacks
cdk deploy --all

# Deploy with approval
cdk deploy --all --require-approval always

# Deploy specific stack
cdk deploy DatabaseStack

# Deploy without confirmation
cdk deploy --all --require-approval never
```

### Diff & Drift Detection

```bash
# Show changes before deployment
cdk diff

# Compare specific stack
cdk diff BirthdayGreetingStack
```

### Cleanup

```bash
# Destroy all stacks
cdk destroy --all

# Destroy specific stack
cdk destroy BirthdayGreetingStack

# Force destroy without confirmation
cdk destroy --all --force
```

### Other Commands

```bash
# List all stacks
cdk ls

# Display metadata about stack
cdk metadata BirthdayGreetingStack

# Validate CDK app
cdk doctor
```

## Configuration

### CDK Context

Configure via `cdk.json` or command line:

```bash
# Set RequestBin URL for greetings
cdk deploy --all --context requestBinUrl=https://webhook.site/your-unique-id

# Set environment type
cdk deploy --all --context envType=production
```

### Environment Variables

Lambda functions use the following environment variables:

| Variable | Description | Set By |
|----------|-------------|--------|
| `DATABASE_SECRET_ARN` | Secrets Manager ARN | CDK |
| `GREETING_QUEUE_URL` | SQS queue URL | CDK |
| `REQUESTBIN_URL` | External greeting service | CDK context |
| `LOCALSTACK_URL` | Localstack endpoint | Test env |

## Architecture Decisions

### Why CDK?

- **Type Safety**: TypeScript provides compile-time checks
- **Reusability**: Create custom constructs for common patterns
- **Familiarity**: Same language as application code
- **Productivity**: Higher-level abstractions than CloudFormation

### Why EventBridge?

- **Managed Service**: No servers to maintain
- **Flexible Scheduling**: Cron expressions, rate expressions
- **Scalability**: Handles millions of events
- **Integration**: Native Lambda integration

### Why SQS?

- **Decoupling**: Separates finder from greeter
- **Delay Queues**: Schedule messages up to 15 minutes ahead
- **DLQ**: Capture failed messages for investigation
- **Batch Processing**: Process multiple messages efficiently

### Why RDS (vs DynamoDB)?

- **Relational Data**: User-birthday relationships
- **Complex Queries**: Join users with birthdays, filter by timezone
- **Transactions**: ACID guarantees for user operations
- **Familiarity**: Standard SQL, easy to debug

## Troubleshooting

### CDK Bootstrap Issues

```bash
# Check if account is bootstrapped
aws cloudformation describe-stacks \
  --stack-name CDKToolkit

# Re-bootstrap if needed
cdk bootstrap --force
```

### Lambda Deployment Failures

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name BirthdayGreetingStack

# View Lambda logs
aws logs tail /aws/lambda/BirthdayFinderFunction --follow

# Test Lambda locally
sam local invoke BirthdayFinderFunction \
  --event test-event.json
```

### Localstack Issues

```bash
# Check Localstack logs
docker logs localstack-main

# Restart Localstack
npm run localstack:restart

# Reset Localstack completely
docker-compose down -v
docker-compose up -d
```

### Database Connection Issues

```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier erin-greeter-db

# Get database endpoint
aws rds describe-db-instances \
  --db-instance-identifier erin-greeter-db \
  --query 'DBInstances[0].Endpoint.Address'

# Test connection from Lambda
aws lambda invoke \
  --function-name DatabaseMigratorFunction \
  --payload '{"action":"test"}' \
  response.json
```

## Performance Optimization

### Lambda Cold Starts

- **esbuild**: Fast bundling reduces package size
- **Layer Optimization**: Common dependencies in layers
- **Provisioned Concurrency**: Available for production (cost trade-off)

### SQS Throughput

- **Batch Size**: Greeter processes 10 messages per invocation
- **Visibility Timeout**: 30 seconds (adjust based on processing time)
- **MaxReceiveCount**: 3 attempts before DLQ

### Database Connection Pooling

```typescript
// Lambda handlers reuse database connections
const db = new DatabaseConnectionManager();
// Connection persists across invocations
```

## Security Best Practices

### Secrets Management

- Database credentials in Secrets Manager
- No hardcoded secrets in code
- Rotation enabled (future)

### Network Security

- RDS in private subnets only
- Lambda in VPC with NAT Gateway for external calls
- Security Groups with minimal access

### IAM Least Privilege

```typescript
// Lambda only has required permissions
birthdayFinderFunction.addToRolePolicy(new PolicyStatement({
  actions: ['sqs:SendMessage'],
  resources: [greetingQueue.queueArn],
}));
```

## Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/BirthdayFinderFunction --follow
aws logs tail /aws/lambda/BirthdayGreeterFunction --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/BirthdayFinderFunction \
  --filter-pattern "ERROR"
```

### CloudWatch Metrics

Key metrics to monitor:
- Lambda invocations, errors, duration
- SQS messages sent, received, visible
- DLQ message count (should be 0)

### Alarms (Future)

```typescript
// Example alarm for DLQ
const dlqAlarm = new Alarm(this, 'DLQAlarm', {
  metric: dlq.metricApproximateNumberOfMessagesVisible(),
  threshold: 1,
  evaluationPeriods: 1,
});
```

## Cost Optimization

- **Lambda**: Pay per invocation (~$0.20 per 1M requests)
- **EventBridge**: $1.00 per 1M events (~2K events/month = $0.002)
- **SQS**: First 1M requests free, then $0.40 per 1M
- **RDS**: t3.micro instance (~$15/month)

## Deployment Pipeline (Future)

```bash
# CI/CD with GitHub Actions
# .github/workflows/deploy.yml

name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: cdk deploy --all --require-approval never
```

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Run `npm test` and `npm run lint:fix`
4. Test with Localstack: `npm run test:watch`
5. Submit pull request

## License

MIT License

---

For system architecture and overall project documentation, see [main README](../README.md)
