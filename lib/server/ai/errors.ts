/** Messages must be safe to return to a browser: never include upstream bodies or credentials. */
export class AiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.status = status;
  }
}
