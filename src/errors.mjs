export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function assertValid(condition, message, details = undefined) {
  if (!condition) throw new HttpError(400, message, details);
}
