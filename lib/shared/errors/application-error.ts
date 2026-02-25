import { AppError } from "./base"

export class ApplicationError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, details)
  }
}
