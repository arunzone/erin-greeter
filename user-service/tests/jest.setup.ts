import { afterAll, jest } from '@jest/globals';
import dotenv from 'dotenv';

import prisma from '../src/prisma';

dotenv.config({ path: `${__dirname}/../.env` });

jest.setTimeout(30000);

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
});
