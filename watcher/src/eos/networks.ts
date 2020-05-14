import { JsonRpc } from "eosjs";
import fetch from "node-fetch";
import { NetworkName, exhaustiveCheck } from "../types";
import { isProduction } from "../utils";

const NETWORKS_TO_WATCH: NetworkName[] = isProduction() ? [`mainnet`, `wax`] : [`kylin`]

const getContractsForNetwork = (network: NetworkName) => {
  switch (network) {
    case `jungle`:
      return {
        zosToken: `zosdiscount1`,
        zosIbc: `zoseosconvr3`,
        zosReporter: `zosreporter1`,
        cpuPayer: `cmicheljungl`,
      };
    case `kylin`:
      return {
        zosToken: `zosdiscount1`,
        zosIbc: `zoswaxconvr2`,
        zosReporter: `zosreporter1`,
        cpuPayer: ``,
      };
    case `mainnet`:
      return {
        zosToken: `zosdiscounts`,
        zosIbc: `zoseosconvrt`,
        zosReporter: `zoscpustaker`,
        cpuPayer: `mb.bank`,
      };
    case `wax`:
      return {
        zosToken: `zoswaxtokens`,
        zosIbc: `zoswaxconvrt`,
        zosReporter: `zoswaxreport`,
        cpuPayer: ``,
      };
    default:
      throw new Error(`No contract accounts for "${network}" network defined yet`);
  }
};


const createNetwork = (nodeEndpoint, chainId) => {
  const matches = /^(https?):\/\/(.+):(\d+)\D*$/.exec(nodeEndpoint);
  if (!matches) {
    throw new Error(
      `Could not parse EOS HTTP endpoint. Needs protocol and port: "${nodeEndpoint}"`
    );
  }

  const [, httpProtocol, host, port] = matches;

  return {
    chainId,
    protocol: httpProtocol,
    host,
    port: Number.parseInt(port, 10),
    nodeEndpoint
  };
};

const KylinNetwork = createNetwork(
  `https://api-kylin.eoslaomao.com:443`,
  `5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191`
);
const JungleNetwork = createNetwork(
  `https://jungle2.cryptolions.io:443`,
  `e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473`
);
const MainNetwork = createNetwork(
  `https://eos.greymass.com:443`,
  `aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906`
);
const WaxNetwork = createNetwork(
  `https://chain.wax.io:443`,
  `1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4`
);

function getNetwork(networkName: string) {
  switch (networkName) {
    case `kylin`:
      return KylinNetwork;
    case `jungle`:
      return JungleNetwork;
    case `mainnet`:
      return MainNetwork;
    case `wax`:
      return WaxNetwork;
    default:
      throw new Error(`Network "${networkName}" not supported yet.`);
  }
}

const getRpc = (() => {
  const rpcs = {};

  return (networkName: string) => {
    if (!rpcs[networkName]) {
      rpcs[networkName] = new JsonRpc(getNetwork(networkName).nodeEndpoint, {
        fetch: fetch
      });
    }

    return rpcs[networkName];
  };
})();

export { getContractsForNetwork, NETWORKS_TO_WATCH, getRpc };
