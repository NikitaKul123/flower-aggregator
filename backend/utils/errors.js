export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Некорректный запрос') {
        super(message, 400, 'BAD_REQUEST');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Требуется авторизация') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Доступ запрещён') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Не найдено') {
        super(message, 404, 'NOT_FOUND');
    }
}
