import { NextFunction, Request, RequestHandler, Response } from 'express'

type HandlerAsync = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function rotaAsync(handler: HandlerAsync): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}
