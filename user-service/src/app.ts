import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());

app.get('/healthz', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
