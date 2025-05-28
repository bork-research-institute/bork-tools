const whitelist: string[] = [];

export function isWhitelisted(address: string) {
  return whitelist.includes(address);
}
