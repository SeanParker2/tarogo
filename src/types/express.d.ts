import 'express'

declare global {
  namespace Express {
    interface UserPayload { id: number | string }
    interface Request { user?: UserPayload }
  }
}