import { PinataSDK } from 'pinata';
import { getEnv } from '../../config/env';

const env = getEnv();

export const pinata = new PinataSDK({
  pinataJwt: env.PINATA_JWT,
  pinataGateway: env.PINATA_GATEWAY_URL,
});
