### convert prisma schema from snake_case to camelCase
Run it inside prisma folder
`npx prisma-case-format --map-table-case snake --map-field-case snake`

Sync prisma after database schema change
```bash
npm run prisma:pull --prefix user-service
npm run prisma:generate --prefix user-service
```