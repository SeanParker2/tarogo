import 'express'

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: number; isVip?: boolean }
  }
}