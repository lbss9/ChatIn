export type ApplicationErrorCode =
  | 'DELETED'
  | 'EMAIL_ALREADY_IN_USE'
  | 'EMPTY_CONTENT'
  | 'EMPTY_MESSAGE'
  | 'FORBIDDEN'
  | 'INVALID'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_CONVERSATION_TITLE'
  | 'INVALID_DIRECT_CONVERSATION'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_PASSWORD_RESET_TOKEN'
  | 'MESSAGE_TOO_LONG'
  | 'NOT_CONVERSATION_MEMBER'
  | 'NOT_FOUND'
  | 'SENDER_NOT_FOUND'
  | 'UNAUTHENTICATED';

export class ApplicationError extends Error {
  public constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
