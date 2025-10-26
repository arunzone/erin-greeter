export const TYPES = {
  UserService: Symbol.for('UserService'),
  UserCommandRepository: Symbol.for('UserCommandRepository'),
  UserQueryRepository: Symbol.for('UserQueryRepository'),
  Prisma: Symbol.for('Prisma'),
  JwtAuthMiddleware: Symbol.for('JwtAuthMiddleware'),
  Config: Symbol.for('Config'),
  SqsService: Symbol.for('SqsService'),
  SQSClient: Symbol.for('SQSClient'),
};
