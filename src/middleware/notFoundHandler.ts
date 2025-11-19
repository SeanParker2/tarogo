import { Request, Response } from 'express';

/**
 * 404 处理中间件
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: '请求的资源不存在',
    path: req.originalUrl,
    method: req.method
  });
};