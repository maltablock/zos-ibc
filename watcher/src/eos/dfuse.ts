import { createDfuseClient } from "@dfuse/client";
import nodeFetch from "node-fetch";
import WebSocketClient from "ws"
import { isProduction } from "../utils";
import { logger } from "../logger";

const { DFUSE_API_KEY, DFUSE_API_KEY_PROD, EOS_NETWORK } = process.env;

const apiKey = isProduction() ? DFUSE_API_KEY_PROD : DFUSE_API_KEY

if (!apiKey) {
  throw new Error(`No dfuse API key in env variable "DFUSE_API_KEY${isProduction() ? `_PROD` : ``}" set`);
}

(global as any).WebSocket = WebSocketClient;

async function webSocketFactory(networkName, url: string, protocols: string[] = []) {
  const webSocket = new WebSocketClient(url, protocols, {
    handshakeTimeout: 30 * 1000, // 30s
    maxPayload: 10 * 1024 * 1000 * 1000 // 10Mb
  })

  const onUpgrade = (response: any) => {
    logger.info(`${networkName}-ws.onUpgrade: response status code: ${response.statusCode}`)

    // You need to remove the listener at some point since this factory
    // is called at each reconnection with the remote endpoint!
    webSocket.removeListener("upgrade", onUpgrade)
  }

  webSocket.on("upgrade", onUpgrade)

  return webSocket
}

const getClientForNetwork = (() => {
  const clients = {};

  return (networkName: string) => {
    if (!clients[networkName]) {
      // wax not yet a valid network name for dfuse
      // https://github.com/dfuse-io/client-js/issues/19
      const network = networkName === `wax` ? `mainnet.wax.dfuse.io` : networkName
      clients[networkName] = createDfuseClient({
        apiKey: apiKey,
        network,
        httpClientOptions: {
          fetch: nodeFetch
        },
        graphqlStreamClientOptions: {
          socketOptions: {
            // The WebSocket factory used for GraphQL stream must use this special protocols set
            // We intend on making the library handle this for you automatically in the future,
            // for now, it's required otherwise, the GraphQL will not connect correctly.
            webSocketFactory: (url) => webSocketFactory(networkName, url, ["graphql-ws"])
          }
        },
        streamClientOptions: {
          socketOptions: {
            webSocketFactory: (url) => webSocketFactory(networkName, url)
          }
        }
      });
    }

    return clients[networkName];
  };
})();

export { getClientForNetwork };
