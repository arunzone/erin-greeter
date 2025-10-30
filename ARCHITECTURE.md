# Erin Birthday Greeter - Architecture Documentation

This document provides detailed architecture diagrams and design documentation for the Erin Birthday Greeter system.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Data Flow Diagram](#data-flow-diagram)
- [User Service Architecture](#user-service-architecture)
- [Birthday Processing Flow](#birthday-processing-flow)
- [Database Schema](#database-schema)
- [Deployment Architecture](#deployment-architecture)

---

## High-Level Architecture

```mermaid
graph LR
    subgraph "Client Layer"
        Client["<img src='https://api.iconify.design/mdi:application.svg' width='40' height='40'><br>Client Application"]
    end

    subgraph "API Layer"
        API["<img src='https://api.iconify.design/logos:nodejs.svg' width='40' height='40'><br>User Service<br/>Express.js API"]
        PostgresDB["<img src='https://api.iconify.design/logos:postgresql.svg' width='40' height='40'><br>Postgres (User)"]

    end

    subgraph AWS ["AWS Cloud"]
        subgraph "VPC"
            subgraph Subnet ["Private Subnet"]
                RDS["<img src='https://api.iconify.design/logos:aws-rds.svg' width='40' height='40'><br>RDS PostgreSQL"]
                Lambda1["<img src='https://api.iconify.design/logos:aws-lambda.svg' width='40' height='40'><br>Birthday Finder<br/>Lambda Function"]
                Lambda2["<img src='https://api.iconify.design/logos:aws-lambda.svg' width='40' height='40'><br>Birthday Greeter<br/>Lambda Function"]
                LambdaIngest["<img src='https://api.iconify.design/logos:aws-lambda.svg' width='40' height='40'><br>Birthday Greeter<br/>Lambda Function"]
            end
        end

        EventBridge["<img src='https://api.iconify.design/logos:aws-eventbridge.svg' width='40' height='40'><br>EventBridge<br/>Cron: Every 20 min"]
        SQSIngest["<img src='https://api.iconify.design/logos:aws-sqs.svg' width='40' height='40'><br>SQS Queue<br/>Birthday Greetings"]
        DLQIngest["<img src='https://api.iconify.design/logos:aws-sqs.svg' width='40' height='40'><br>DLQ<br/>Failed Messages"]
        SQS["<img src='https://api.iconify.design/logos:aws-sqs.svg' width='40' height='40'><br>SQS Queue<br/>Birthday Greetings"]
        DLQ["<img src='https://api.iconify.design/logos:aws-sqs.svg' width='40' height='40'><br>DLQ<br/>Failed Messages"]
        Secrets["<img src='https://api.iconify.design/logos:aws-secrets-manager.svg' width='40' height='40'><br>Secrets Manager<br>DB Credentials"]
    end

    subgraph "External Services"
        RequestBin["<img src='https://api.iconify.design/mdi:link-variant.svg' width='40' height='40'><br>RequestBin<br/>Webhook Service"]
    end

    Client -->|HTTP REST| API
    API -->|Store User Data| PostgresDB
    API -->|Publish event| SQSIngest
    SQSIngest -.->|Failed Messages| DLQIngest
    SQSIngest --> |Consume event| LambdaIngest
    LambdaIngest --> |Store User Data| RDS
    EventBridge -->|Trigger Every 20m| Lambda1
    Lambda1 -.->|Get Credentials| Secrets
    Lambda2 -.->|Get Credentials| Secrets
    Lambda1 -->|Query Users| RDS
    Lambda1 -->|Send Messages| SQS
    SQS -->|Trigger| Lambda2
    SQS -.->|Failed Messages| DLQ
    Lambda2 -->|Query/Update| RDS
    Lambda2 -->|Send Greetings| RequestBin

    classDef subgraphStyle fill:#050836,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef aws fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef compute fill:#01240a,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef lambda fill:#523107,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef database fill:#3B48CC,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef messaging fill:#470631,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef external fill:#6AB04C,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef external fill:#6AB04C,stroke:#232F3E,stroke-width:2px,color:#fff

    class EventBridge,Secrets,VPC aws
    class Lambda1,Lambda2,LambdaIngest lambda
    class API compute
    class RDS,SQS,DLQ,SQSIngest,DLQIngest messaging
    class Client,RequestBin external
    class AWS subgraphStyle
    class Subnet subgraphStyle
```
---

## Data Flow Diagram

### Birthday Greeting Flow

```mermaid
sequenceDiagram
    participant EB as EventBridge<br/>(Cron Scheduler)
    participant BF as Birthday Finder<br/>Lambda
    participant DB as RDS PostgreSQL
    participant SQS as SQS Queue
    participant BG as Birthday Greeter<br/>Lambda
    participant EXT as External Service<br/>(RequestBin)

    Note over EB: Every 20 minutes
    EB->>BF: Trigger Lambda
    activate BF

    BF->>BF: Calculate timezones<br/>in 9 AM window
    BF->>DB: Query users with<br/>birthdays today
    DB-->>BF: Return matching users

    loop For each user
        BF->>BF: Calculate delay<br/>to reach 9 AM local
        BF->>SQS: Send message<br/>(with delay 0-900s)
    end

    deactivate BF

    Note over SQS: Message delivered<br/>after delay
    SQS->>BG: Trigger Lambda<br/>(batch of 10)
    activate BG

    loop For each message
        BG->>DB: Check sent_year
        alt Not sent this year
            BG->>DB: UPDATE sent_year = 2025
            BG->>EXT: POST birthday greeting
            EXT-->>BG: 200 OK
        else Already sent
            BG->>BG: Skip (idempotent)
        end
    end

    BG-->>SQS: Return success/failures
    deactivate BG

    alt Has failures
        SQS->>SQS: Retry failed messages
    end
```

---

## User Service Architecture

### User Creation Flow

```mermaid
graph LR
    subgraph "Client"
        C[fa:fa-user Client]
    end

    subgraph "User Service"
        subgraph "Controller Layer"
            UC[UserController]
        end

        subgraph "Middleware"
            JWT[JWT Auth]
            VAL[Validation]
        end

        subgraph "Service Layer"
            US[UserService]
            EP[Event Publisher]
        end

        subgraph "Repository Layer"
            UR[UserRepository]
            BR[BirthdayRepository]
        end
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Database)]
        SQS[fa:fa-envelope SQS Queue<br/>User Events]
    end

    C -->|POST /users| JWT
    JWT --> VAL
    VAL --> UC
    UC --> US
    US --> UR
    US --> BR
    US --> EP
    UR --> DB
    BR --> DB
    EP --> SQS

    classDef controller fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef service fill:#8B5CF6,stroke:#5B21B6,stroke-width:2px,color:#fff
    classDef repo fill:#EC4899,stroke:#9F1239,stroke-width:2px,color:#fff
    classDef data fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff

    class UC,JWT,VAL controller
    class US,EP service
    class UR,BR repo
    class DB,SQS data
```

---

## Birthday Processing Flow

### Detailed Birthday Finder Logic

```mermaid
flowchart TD
    Start([EventBridge Trigger]) --> Init[Initialize Service]
    Init --> GetTime[Get Current UTC Time]
    GetTime --> CalcWindow[Calculate Timezone Window<br/>Target: 9:00 AM ± 10 min]
    CalcWindow --> FindTZ[Find All Timezones<br/>in Window]

    FindTZ --> CheckTZ{Timezones<br/>Found?}
    CheckTZ -->|No| NoUsers[Return 0 users]
    CheckTZ -->|Yes| GetDate[Get Current Date<br/>in Those Timezones]

    GetDate --> QueryDB[Query Database]
    QueryDB --> CheckUsers{Users<br/>Found?}

    CheckUsers -->|No| NoUsers
    CheckUsers -->|Yes| LoopStart[For Each User]

    LoopStart --> CalcDelay[Calculate Delay:<br/>Time until 9 AM<br/>+ Stagger Index]
    CalcDelay --> MinMax[Min: 0s, Max: 900s]
    MinMax --> SendSQS[Send to SQS<br/>with DelaySeconds]
    SendSQS --> NextUser{More<br/>Users?}

    NextUser -->|Yes| LoopStart
    NextUser -->|No| Complete([Return Count])
    NoUsers --> Complete

    classDef process fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef decision fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    classDef data fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    classDef endpoint fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff

    class Init,GetTime,CalcWindow,FindTZ,GetDate,CalcDelay,MinMax process
    class CheckTZ,CheckUsers,NextUser decision
    class QueryDB,SendSQS data
    class Start,Complete,NoUsers endpoint
```

### Birthday Greeter Processing

```mermaid
flowchart TD
    Start([SQS Batch Trigger<br/>Max 10 Messages]) --> Init[Initialize DB Connection]
    Init --> LoopStart[For Each Message in Batch]

    LoopStart --> Parse[Parse Message JSON:<br/>userId, firstName,<br/>lastName, year]
    Parse --> TryCatch{Try}

    TryCatch -->|Success| CheckDB[Query Database:<br/>SELECT sent_year<br/>WHERE user_id = ?]
    CheckDB --> Compare{sent_year < year<br/>OR sent_year IS NULL?}

    Compare -->|Yes, Send Greeting| Update[UPDATE user_birthday<br/>SET sent_year = year<br/>WHERE user_id = ?<br/>RETURNING id]
    Update --> CheckUpdate{Row<br/>Updated?}

    CheckUpdate -->|Yes| BuildMsg[Build Greeting:<br/>'Hey, FirstName LastName<br/>it's your birthday!']
    BuildMsg --> PostHTTP[HTTP POST to<br/>RequestBin]
    PostHTTP --> LogSuccess[Log: Greeting Sent]
    LogSuccess --> NextMsg

    CheckUpdate -->|No| LogSkip[Log: Already sent<br/>this year]
    LogSkip --> NextMsg

    Compare -->|No, Already Sent| LogSkip

    TryCatch -->|Error| CatchError[Catch Exception]
    CatchError --> LogError[Log Error]
    LogError --> AddFailure[Add to<br/>batchItemFailures]
    AddFailure --> NextMsg

    NextMsg{More<br/>Messages?}
    NextMsg -->|Yes| LoopStart
    NextMsg -->|No| Return[Return Response:<br/>batchItemFailures array]
    Return --> End([End])

    classDef process fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef decision fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    classDef database fill:#8B5CF6,stroke:#5B21B6,stroke-width:2px,color:#fff
    classDef external fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    classDef error fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff

    class Init,Parse,BuildMsg,LogSuccess,LogSkip process
    class TryCatch,Compare,CheckUpdate,NextMsg decision
    class CheckDB,Update database
    class PostHTTP,Return external
    class CatchError,LogError,AddFailure error
    class Start,End endpoint
```

---

## Database Schema

```mermaid
erDiagram
    USERS ||--o| USER_BIRTHDAY : has

    USERS {
        uuid id PK
        varchar first_name
        varchar last_name
        varchar email UK
        timestamp created_at
        timestamp updated_at
    }

    USER_BIRTHDAY {
        uuid id PK
        uuid user_id FK
        date date_of_birth
        varchar timezone
        integer sent_year
        timestamp created_at
        timestamp updated_at
    }
```

### Database Indexes

```mermaid
graph LR
    subgraph "users Table"
        U1[PRIMARY KEY: id]
        U2[UNIQUE INDEX: email]
    end

    subgraph "user_birthday Table"
        B1[PRIMARY KEY: id]
        B2[FOREIGN KEY: user_id → users.id]
        B3[UNIQUE INDEX: user_id]
        B4[COMPOSITE INDEX:<br/>timezone, date_of_birth]
        B5[INDEX: sent_year]
    end

    subgraph "Query Patterns"
        Q1[Find users by email<br/>→ Uses email index]
        Q2[Find birthdays by date & timezone<br/>→ Uses composite index]
        Q3[Check if greeting sent<br/>→ Uses sent_year index]
    end

    U2 -.->|Optimizes| Q1
    B4 -.->|Optimizes| Q2
    B5 -.->|Optimizes| Q3

    classDef index fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef query fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff

    class U1,U2,B1,B2,B3,B4,B5 index
    class Q1,Q2,Q3 query
```

---

## Deployment Architecture

### AWS Infrastructure

## CDK Stack Relationships

```mermaid
graph TD
    subgraph "CDK Application"
        App[CDK App<br/>bin/infrastructure.ts]
    end

    subgraph "Core Infrastructure"
        App --> DB[DatabaseStack]
        DB --> VPC[VPC Construct]
        DB --> RDS[RDS Instance]
        DB --> Secrets[Secrets Manager]
        DB --> Migrator[Database Migrator<br/>Lambda]
    end

    subgraph "Birthday Processing"
        App --> BG[BirthdayGreetingStack]
        BG --> Queue[Queue Construct]
        BG --> Finder[Birthday Finder<br/>Processor]
        BG --> Greeter[Birthday Greeter<br/>Processor]

        Queue --> SQS[SQS Queue]
        Queue --> DLQ[DLQ]

        Finder --> FinderLambda[Lambda Function]
        Finder --> EventBridgeRule[EventBridge Rule<br/>Every 20 min]

        Greeter --> GreeterLambda[Lambda Function]
        Greeter --> SQSTrigger[SQS Event Source]
    end

    subgraph "Dependencies"
        BG -.->|Uses| VPC
        BG -.->|Uses| RDS
        BG -.->|Uses| Secrets
        FinderLambda -.->|Connects to| RDS
        GreeterLambda -.->|Connects to| RDS
    end

    classDef app fill:#EC4899,stroke:#9F1239,stroke-width:3px,color:#fff
    classDef stack fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef construct fill:#8B5CF6,stroke:#5B21B6,stroke-width:2px,color:#fff
    classDef resource fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff

    class App app
    class DB,BG stack
    class VPC,Queue,Finder,Greeter construct
    class RDS,Secrets,Migrator,SQS,DLQ,FinderLambda,EventBridgeRule,GreeterLambda,SQSTrigger resource
```

---

## System Scale and Performance

### Load Distribution Strategy

```mermaid
graph LR
    subgraph "Birthday Finder - Load Balancing"
        Start[Found 1000 Users<br/>with Birthdays]
        Start --> Calc[Calculate Delays]
        Calc --> Spread[Spread Over 5 Minutes<br/>300 seconds]

        Spread --> U1[User 1: 0s delay]
        Spread --> U2[User 2: 0.3s delay]
        Spread --> U3[...]
        Spread --> U1000[User 1000: 300s delay]
    end

    subgraph "SQS Queue"
        U1 --> SQS[Messages Queued<br/>with Delays]
        U2 --> SQS
        U3 --> SQS
        U1000 --> SQS
    end

    subgraph "Birthday Greeter - Batch Processing"
        SQS --> B1[Batch 1: 10 messages<br/>@ t=0]
        SQS --> B2[Batch 2: 10 messages<br/>@ t=0.3s]
        SQS --> B3[...]
        SQS --> B100[Batch 100: 10 messages<br/>@ t=300s]

        B1 --> L1[Lambda Instance 1]
        B2 --> L2[Lambda Instance 2]
        B3 --> L3[Lambda Instance ...]
        B100 --> L100[Lambda Instance N]
    end

    subgraph "External Service"
        L1 --> API[RequestBin API<br/>Rate Limit Protected]
        L2 --> API
        L3 --> API
        L100 --> API
    end

    classDef finder fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef queue fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    classDef lambda fill:#8B5CF6,stroke:#5B21B6,stroke-width:2px,color:#fff
    classDef external fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff

    class Start,Calc,Spread,U1,U2,U3,U1000 finder
    class SQS queue
    class B1,B2,B3,B100,L1,L2,L3,L100 lambda
    class API external
```

---

## Error Handling and Retry Strategy

```mermaid
stateDiagram-v2
    [*] --> SQS: Message Arrives

    SQS --> Lambda: Trigger Processing

    Lambda --> Processing: Start
    Processing --> Success: Greeting Sent
    Processing --> TransientError: Network Error
    Processing --> PermanentError: Invalid Data

    Success --> [*]: Delete from Queue

    TransientError --> Retry1: Attempt 1/3
    Retry1 --> Processing: After Backoff
    Retry1 --> Retry2: Still Failing
    Retry2 --> Processing: After Backoff
    Retry2 --> Retry3: Still Failing
    Retry3 --> DLQ: Max Retries Exceeded

    PermanentError --> DLQ: Move to DLQ

    DLQ --> ManualReview: Alert Triggered
    ManualReview --> Fix: Investigate & Fix
    Fix --> SQS: Requeue if Fixable
    Fix --> [*]: Discard if Invalid

    note right of SQS
        Visibility Timeout: 30s
        MaxReceiveCount: 3
    end note

    note right of DLQ
        Messages require
        manual intervention
    end note
```

---

## Deployment Pipeline (Future State)

```mermaid
graph LR
    subgraph "Source Control"
        GH[GitHub Repository]
    end

    subgraph "CI Pipeline"
        GHA[GitHub Actions]

        GHA --> Lint[Lint & Format]
        GHA --> Test[Unit Tests]
        GHA --> Build[Build TypeScript]
        GHA --> IntTest[Integration Tests<br/>with Localstack]
    end

    subgraph "CD Pipeline"
        IntTest --> CDKDiff[CDK Diff Review]
        CDKDiff --> Approve{Manual<br/>Approval?}

        Approve -->|Yes| DeployStage[Deploy to Staging]
        DeployStage --> SmokeTest[Smoke Tests]
        SmokeTest --> DeployProd[Deploy to Production]

        Approve -->|No| Cancel[Cancel Deployment]
    end

    subgraph "AWS Production"
        DeployProd --> Stack1[DatabaseStack]
        DeployProd --> Stack2[BirthdayGreetingStack]
    end

    subgraph "Monitoring"
        Stack1 -.->|Metrics| Monitor[CloudWatch Dashboard]
        Stack2 -.->|Metrics| Monitor
        Monitor -->|Alerts| Rollback{Health<br/>Check}
        Rollback -->|Failed| Revert[Auto Rollback]
    end

    GH -->|Push to main| GHA

    classDef source fill:#6366F1,stroke:#4338CA,stroke-width:2px,color:#fff
    classDef ci fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    classDef cd fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    classDef prod fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    classDef monitor fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff

    class GH source
    class GHA,Lint,Test,Build,IntTest ci
    class CDKDiff,Approve,DeployStage,SmokeTest,DeployProd,Cancel cd
    class Stack1,Stack2 prod
    class Monitor,Rollback,Revert monitor
```
---


*For implementation details, see the main [README.md](./README.md)*
