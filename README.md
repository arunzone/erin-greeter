# erin-greeter monorepo

This monorepo contains a Node.js Express service (`user-service`) 

## Structure

- `user-service/` - Express API service with a health check and sample route.

## Prerequisites

- Node.js 20+ and npm

## Quick start

1. Install dependencies

```bash
# user-service deps
npm install --prefix user-service
```

2. Run tests

```bash
# user-service test
npm run test --prefix user-service
```

3. Local run (optional)

```bash
npm run start --prefix user-service
# http://localhost:3000/healthz
```
