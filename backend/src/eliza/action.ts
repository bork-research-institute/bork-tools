export interface Action<TRequest, TResponse> {
  name: string;
  description: string;
  handler: (request: TRequest) => Promise<TResponse>;
}

export function createAction<TRequest, TResponse>({
  name,
  description,
  handler,
}: Action<TRequest, TResponse>): Action<TRequest, TResponse> {
  return {
    name,
    description,
    handler,
  };
}
