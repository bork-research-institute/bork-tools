export interface HeliusResponse<T> {
  jsonrpc: string;
  result: T;
  id: string;
}
