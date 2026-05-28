import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res, next) {
    next(new AppError(`Маршрут ${req.method} ${req.originalUrl} не найден`, 404, 'NOT_FOUND'));
}

export function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational === true;

    if (!isOperational) {
        console.error(`[${req.method} ${req.originalUrl}]`, err);
    }

    res.status(statusCode).json({
        error: isOperational ? err.message : 'Внутренняя ошибка сервера',
        code: err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR')
    });
}
