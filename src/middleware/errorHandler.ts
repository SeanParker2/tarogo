import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface ApiError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // 默认错误
  if (!error.statusCode) {
    error.statusCode = 500;
  }

  // Mongoose错误处理
  if (error.name === 'CastError') {
    const message = '资源未找到';
    error = new AppError(message, 404);
  }

  // 重复字段错误
  if (error.code === 11000) {
    const message = '字段值已存在';
    error = new AppError(message, 400);
  }

  // 验证错误
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((val: any) => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    const message = '无效的token，请重新登录';
    error = new AppError(message, 401);
  }

  // JWT过期错误
  if (error.name === 'TokenExpiredError') {
    const message = 'token已过期，请重新登录';
    error = new AppError(message, 401);
  }

  // 开发环境返回详细错误信息
  if (config.nodeEnv === 'development') {
    res.status(error.statusCode).json({
      status: error.status,
      error,
      message: error.message,
      stack: err.stack
    });
  } else {
    // 生产环境
    if (error.isOperational) {
      res.status(error.statusCode).json({
        status: error.status,
        message: error.message
      });
    } else {
      // 未知错误，不暴露详细信息
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: '服务器内部错误'
      });
    }
  }
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new AppError(`未找到 ${req.originalUrl} 路由`, 404);
  next(err);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};