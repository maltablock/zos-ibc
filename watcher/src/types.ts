import { DfuseClientOptions } from "@dfuse/client";

export type IEOSNetwork = {
  chainId: string;
  nodeEndpoint: string;
  protocol: string;
  host: string;
  port: number;
};

// mimicks EOS C++ smart contract microseconds class
type microseconds = {
  _count: number | string;
};

// mimicks EOS C++ smart contract symbol class
export type TAssetSymbol = {
  code: string;
  precision: number;
};

// mimicks EOS C++ smart contract extended_symbol class
export type TExtendedSymbol = {
  symbol: TAssetSymbol;
  contract: string;
};

export type TAsset = {
  amount: number;
  symbol: TAssetSymbol;
};

export type NetworkName = `mainnet` | `jungle` | `kylin` | `wax` // DfuseClientOptions["network"] | `wax`
export function isNetworkName(networkName: string): networkName is NetworkName {
  switch (networkName) {
      case `jungle`:
      case `kylin`:
      case `mainnet`:
      case `wax`:
          return true;
  }
  return false;
}

export type TAccountsRow = {
  balance: string;
};

export enum EventStatus {
  observed = 0, // nothing happened yet
  report_success, // reported by reporter and successfully report
  report_failed, // reporter tried reporting but failed, needs refund
  finished,
  report_failed_refund_success,
  // manual review required
  report_failed_refund_failed,
  report_success_resolve_failed,
  broken_event,
}

export function exhaustiveCheck(x: never) { throw new Error('exhaustiveCheck: should not reach here') }

export type ArgsType<T> = T extends (...args: infer U) => any ? U : never;
