export type Result<T, E = Error> = Success<T> | Failure<E>

export interface Success<T> {
  ok: true
  value: T
}

export interface Failure<E> {
  ok: false
  error: E
}

export function ok<T>(value: T): Success<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Failure<E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.ok
}
