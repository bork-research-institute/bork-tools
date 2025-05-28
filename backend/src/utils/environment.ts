/**
 * Environment detection utilities
 */

export const getEnvironment = (): string => {
  return process.env.NODE_ENV || 'development';
};

export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};
