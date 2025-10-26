## Configuration

### Database Setup
1. Ensure PostgreSQL is running (via docker-compose in the project root)
2. Run database migrations: `npm run liquibase:update`

### SQS Integration
The service can send user events to AWS SQS. Configure the following environment variables:

```bash
# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/123456789012/your-queue-name"
```

If `SQS_QUEUE_URL` is not configured, SQS events will be skipped with a warning.

### Environment Variables
Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `AWS_REGION`: AWS region for SQS (default: us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key (optional if using IAM roles)
- `AWS_SECRET_ACCESS_KEY`: AWS secret key (optional if using IAM roles)
- `SQS_QUEUE_URL`: URL of the SQS queue to send events to

## Development

### convert prisma schema from snake_case to camelCase
Run it inside prisma folder
`npx prisma-case-format --map-table-case snake --map-field-case snake`

Sync prisma after database schema change
```bash
npm run prisma:pull --prefix user-service
npm run prisma:generate --prefix user-service
```