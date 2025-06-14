const whitelist: string[] = [
  '6beUUSBkDLPXWTeTQKEy66KcA4CBv7CL2EVpYa4HHwiz',
  'CKgwpSnJFgzmCQGMgRjWkGUjk8V7jU7nYaanZBjTeofF',
  'FgPHTo7CYZxjZPyQFahToLh8xiyQtYDCAfKFynborsud',
];

export function isWhitelisted(address: string) {
  return whitelist.includes(address);
}
