const whitelist: string[] = ['6beUUSBkDLPXWTeTQKEy66KcA4CBv7CL2EVpYa4HHwiz'];

export function isWhitelisted(address: string) {
  return whitelist.includes(address);
}
