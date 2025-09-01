import { Router, Request, Response } from 'express';

export const healthRoute = Router().get(
  '/api-health',
  (req: Request, res: Response) => {
    res.status(200).send('OK');
  },
);