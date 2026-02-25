import { AppError } from "./base"

export class DomainError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, details)
  }
}
