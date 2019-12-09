import { NetworkName } from "../types";
import { Api } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { TextDecoder, TextEncoder } from 'util';
import { getRpc } from './networks';
import { logger } from "../logger";
import { isProduction } from "../utils";

// CPU + reporter keys
let keys = process.env[isProduction() ? `EOSIO_KEYS` : `EOSIO_KEYS_DEV`].split(`;`).filter(Boolean).map(s => s.trim()).filter(Boolean)
if(keys.length === 0) {
    logger.warn(`No private keys passed. You'll be unable to sign`)
}
const signatureProvider = new JsSignatureProvider(keys)

export const getApi = (networkName: NetworkName) => {
  return new Api({
      rpc: getRpc(networkName),
      signatureProvider,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder() as any,
  })
  
}
