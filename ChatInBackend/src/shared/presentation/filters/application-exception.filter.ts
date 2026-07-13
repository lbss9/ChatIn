import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApplicationError, ApplicationErrorCode } from '../../domain/errors/application.error';

const statusByCode: Record<ApplicationErrorCode, HttpStatus> = {
  DELETED: HttpStatus.GONE,
  EMAIL_ALREADY_IN_USE: HttpStatus.CONFLICT,
  EMPTY_CONTENT: HttpStatus.BAD_REQUEST,
  EMPTY_MESSAGE: HttpStatus.BAD_REQUEST,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  INVALID: HttpStatus.BAD_REQUEST,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  INVALID_CONVERSATION_TITLE: HttpStatus.BAD_REQUEST,
  INVALID_DIRECT_CONVERSATION: HttpStatus.BAD_REQUEST,
  INVALID_REFRESH_TOKEN: HttpStatus.UNAUTHORIZED,
  INVALID_PASSWORD_RESET_TOKEN: HttpStatus.BAD_REQUEST,
  MESSAGE_TOO_LONG: HttpStatus.BAD_REQUEST,
  NOT_CONVERSATION_MEMBER: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  SENDER_NOT_FOUND: HttpStatus.NOT_FOUND,
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
};

@Catch(ApplicationError)
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = statusByCode[exception.code];
    response.status(statusCode).json({ statusCode, code: exception.code, message: exception.message });
  }
}
