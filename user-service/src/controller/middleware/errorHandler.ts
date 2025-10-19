import { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../errors/HttpError.js';

export const errorHandler = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof HttpError) {
    console.error(error);
    return response
      .status(error.statusCode)
      .json({ message: error.message, details: error.details });
  }
  console.error(error);
  response.status(500).json({ message: error.message });
};
