# User Service

RESTful API service for user management in the Erin Birthday Greeter system. This service handles CRUD operations for users, stores birthday and timezone information, and publishes events to downstream processors.

## Project Structure

```
user-service/
├── src/
│   ├── controller/          # HTTP request handlers
│   │   ├── dto/            # Data Transfer Objects
│   │   └── middleware/     # Auth, validation middleware
│   ├── service/            # Business logic layer
│   ├── repository/         # Data access layer
│   │   └── interface/      # Repository interfaces
│   ├── domain/             # Domain models and entities
│   ├── di/                 # Dependency injection setup
│   ├── prisma/             # Prisma client wrapper
│   └── index.ts            # Application entry point
├── tests/
│   ├── controller/         # Controller tests
│   ├── service/            # Service tests
│   ├── repository/         # Repository tests
│   └── jest.setup.ts       # Test configuration
├── liquibase/
│   └── changelog/          # Database migrations
├── prisma/
│   └── schema.prisma       # Prisma schema (generated)
└── package.json
```

## Prerequisites

- Node.js 20+ and npm
- Docker (for PostgreSQL)
- Docker Compose

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://app:app@localhost:5432/user_service

# JWT
JWT_SECRET=your-secret-key-change-in-production

# AWS (for SQS event publishing)
AWS_REGION=us-east-1
USER_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/user-events

# Server
PORT=3000
NODE_ENV=development
```

### 3. Start PostgreSQL Database

```bash
# From project root
cd ..
docker-compose up -d postgres
```

### 4. Run Database Migrations

```bash
# Wait for database to be ready
npm run test:db:wait

# Run Liquibase migrations
npm run liquibase:update

# Generate Prisma client
npm run prisma:generate
```

### 5. Start the Service

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

## Running Tests

### All Tests with Coverage

```bash
npm test
```

### Watch Mode

```bash
npm run dev
```

### Specific Test File

```bash
npm test -- tests/service/UserService.test.ts
```

### Test Coverage Thresholds
| % Stmts | % Branch | % Funcs | % Lines |
|---------|----------|---------|---------|
| 98.01   | 74.7     | 100     | 98.24   |


View coverage report:
```bash
npm test
open coverage/lcov-report/index.html
```

## Database Management

### Liquibase Commands

```bash
# Apply all pending migrations
npm run liquibase:update

# Check migration status
npm run liquibase:status

# Rollback last migration
npm run liquibase:rollbackCount

# Drop all database objects (DESTRUCTIVE)
npm run liquibase:dropAll
```

### Prisma Commands

```bash
# Generate Prisma client from database
npm run prisma:generate

# Pull schema from database (updates schema.prisma)
npm run prisma:pull

# Convert schema from snake_case to camelCase (run inside prisma folder)
npx prisma-case-format --map-table-case snake --map-field-case snake
```

### Direct Database Access

```bash
# Using psql
psql -h localhost -p 5432 -U app -d user_service

# List tables
\dt

# Describe table
\d users
\d user_birthday

# Query data
SELECT * FROM users;
SELECT * FROM user_birthday;
```

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

## Development Workflow

### Code Quality

```bash
# Lint check
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Type check
npm run typecheck
```

### Git Hooks

The project uses Husky for pre-commit hooks:

- **Pre-commit**: Runs lint-staged (ESLint + Prettier on changed files)
- **Setup**: `npm run prepare`

### Hot Reload Development

```bash
# Start with nodemon (watches src/ for changes)
npm run dev
```

## Architecture

### Layered Architecture

```
Controller → Service → Repository → Database
    ↓
Middleware
```

**Layers**:
1. **Controller**: HTTP request/response handling, validation
2. **Service**: Business logic, orchestration
3. **Repository**: Data access abstraction
4. **Domain**: Core business entities

### Dependency Injection

Uses Inversify for IoC:

```typescript
// Register dependencies
container.bind<UserService>(TYPES.UserService).to(UserService);
container.bind<UserRepository>(TYPES.UserRepository).to(PostgresUserRepository);

// Inject in controller
@controller('/')
export class UserController {
  constructor(@inject(TYPES.UserService) private userService: UserService) {}
}
```

### Event Publishing

User events are published to SQS for downstream processing:

## Database Schema
// TODO

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | Secret key for JWT signing | - | Yes |
| `AWS_REGION` | AWS region for SQS | us-east-1 | No |
| `USER_QUEUE_URL` | SQS queue URL for user events | - | No |
| `PORT` | HTTP server port | 3000 | No |
| `NODE_ENV` | Environment (development/production) | development | No |

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs erin-greeter-postgres

# Restart database
docker-compose restart postgres
```

### Migration Failures

```bash
# Check migration status
npm run liquibase:status

# If stuck, drop all and reapply
npm run liquibase:dropAll
npm run liquibase:update
```

### Test Failures

```bash
# Ensure database is up
npm run test:db:setup

# Run tests with verbose output
npm test -- --verbose

# Run specific test in isolation
npm test -- --testNamePattern="UserService create"
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma client
npm run prisma:generate

# Pull latest schema
npm run prisma:pull
```

## Performance Considerations

### Database Connection Pooling

Prisma automatically handles connection pooling:
- Default pool size: 10
- Configure via `DATABASE_URL`: `?connection_limit=20`

### Query Optimization

- Indexes on `email`, `timezone`, `date_of_birth`
- Avoid N+1 queries using Prisma's `include`
- Use batch operations for bulk inserts

## Security

### Authentication

- JWT tokens required for all user endpoints
- Tokens expire after 24 hours (configurable)
- Use strong `JWT_SECRET` in production

### Input Validation

- Zod schemas for request validation
- Email format validation
- Timezone validation (IANA standard)
- SQL injection prevention via Prisma

## Deployment

### Build for Production

```bash
npm run build
```

Output: `dist/` directory with compiled JavaScript

### Production Environment

```bash
# Set environment
export NODE_ENV=production

# Start service
npm start
```

### Docker Deployment

```bash
docker-compose up -d
```
## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x (ES Modules)
- **Framework**: Express.js 4.x
- **DI Container**: Inversify 6.x
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5.x
- **Migrations**: Liquibase 4.27
- **Testing**: Jest 29.x + Supertest
- **Validation**: Zod 3.x
- **Authentication**: JWT (jsonwebtoken)

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Ensure tests pass: `npm test`
4. Ensure linting passes: `npm run lint:fix`
5. Submit pull request

## License

MIT License

---

For system architecture and overall project documentation, see [main README](../README.md)
