import 'reflect-metadata';
import { SQSClient } from '@aws-sdk/client-sqs';
import { PrismaClient } from '@prisma/client';
import { Container } from 'inversify';

import { JwtAuthMiddleware } from 'controller/middleware/JwtAuthMiddleware.js';
import { TYPES } from 'di/types.js';
import { UserCommandRepository } from 'repository/interface/UserCommandRepository.js';
import { UserQueryRepository } from 'repository/interface/UserQueryRepository.js';
import { PostgressUserCommandRepository } from 'repository/PostgressUserCommandRepository.js';
import { PostgressUserQueryRepository } from 'repository/PostgressUserQueryRepository.js';
import UserService from 'service/UserService.js';

import { loadConfig, AppConfig } from '../config/config.js';
import prisma from '../prisma.js';
import { AwsSqsService } from '../service/AwsSqsService.js';

const container = new Container({ defaultScope: 'Singleton' });

// Core singletons
container.bind<PrismaClient>(TYPES.Prisma).toConstantValue(prisma);
container.bind<AppConfig>(TYPES.Config).toConstantValue(loadConfig());

// AWS SQS Client
container.bind<SQSClient>(TYPES.SQSClient).toDynamicValue((context) => {
  const config = context.container.get<AppConfig>(TYPES.Config);
  return new SQSClient({
    region: config.aws.region,
    credentials:
      config.aws.accessKeyId && config.aws.secretAccessKey
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined,
  });
});

container.bind<UserService>(TYPES.UserService).to(UserService);

container.bind<JwtAuthMiddleware>(JwtAuthMiddleware).toSelf();

container
  .bind<UserCommandRepository<any>>(TYPES.UserCommandRepository)
  .to(PostgressUserCommandRepository);

container
  .bind<UserQueryRepository<any>>(TYPES.UserQueryRepository)
  .to(PostgressUserQueryRepository);

// External services
container.bind(TYPES.SqsService).to(AwsSqsService);

export default container;
