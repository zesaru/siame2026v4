export interface Repository<TRecord, TId = string> {
  findById(id: TId): Promise<TRecord | null>
  delete(id: TId): Promise<void>
}

export interface CommandBus<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>
}

export interface QueryBus<TQuery, TResult> {
  execute(query: TQuery): Promise<TResult>
}
