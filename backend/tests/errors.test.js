import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    AppError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError
} from '../utils/errors.js';

describe('AppError', () => {
    it('sets status and code', () => {
        const err = new ForbiddenError('Нет доступа');
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'FORBIDDEN');
        assert.equal(err.isOperational, true);
        assert.equal(err.message, 'Нет доступа');
    });

    it('not found defaults', () => {
        const err = new NotFoundError();
        assert.equal(err.statusCode, 404);
    });

    it('unauthorized defaults', () => {
        const err = new UnauthorizedError();
        assert.equal(err.statusCode, 401);
    });

    it('generic app error', () => {
        const err = new AppError('fail', 502, 'BAD_GATEWAY');
        assert.equal(err.statusCode, 502);
        assert.equal(err.code, 'BAD_GATEWAY');
    });
});
