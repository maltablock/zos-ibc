import { createDfuseClient } from "@dfuse/client";
import nodeFetch from "node-fetch";
import WebSocketClient from "ws";

const { DFUSE_API_KEY, EOS_NETWORK } = process.env;

if (!DFUSE_API_KEY) {
  throw new Error(`No dfuse API key in env variable "DFUSE_API_KEY" set`);
}

(global as any).WebSocket = WebSocketClient;

const getClientForNetwork = (() => {
  const clients = {};

  return (networkName: string) => {
    if (!clients[networkName]) {
      // wax not yet a valid network name for dfuse
      // https://github.com/dfuse-io/client-js/issues/19
      const network = networkName === `wax` ? `mainnet.wax.dfuse.io` : networkName
      clients[networkName] = createDfuseClient({
        apiKey: DFUSE_API_KEY,
        network,
        httpClientOptions: {
          fetch: nodeFetch
        }
      });
    }

    return clients[networkName];
  };
})();

export { getClientForNetwork };
