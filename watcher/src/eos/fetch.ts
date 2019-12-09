import { getClientForNetwork } from "./dfuse"
import { GetChainInfoResult, TEosAction } from "./types"
import { getApi } from "./api"
import { Action } from "eosjs/dist/eosjs-serialize"
import { logger } from "../logger"
import { getContractsForNetwork } from "./networks"
import { NetworkName } from "../types"

// https://github.com/EOSIO/eosjs-api/blob/master/docs/api.md#eos.getTableRows
type GetTableRowsOptions = {
  json?: boolean
  code?: string
  scope?: string
  table?: string
  lower_bound?: number | string
  upper_bound?: number | string
  limit?: number
  key_type?: string
  index_position?: string
}

export const fetchRow = (network:string) => async <T>(options: GetTableRowsOptions, blockNumber?: number): Promise<T> => {
  const client = getClientForNetwork(network)
  const mergedOptions = {
      json: true,
      lower_bound: undefined,
      upper_bound: undefined,
      limit: 9999,
      ...options,
  }

  const result = await client.stateTableRow<T>(mergedOptions.code, mergedOptions.scope, mergedOptions.table, `${mergedOptions.lower_bound}`, {
      json: true,
      keyType: `name`,
      blockNum: blockNumber,
  })

  return result.row.json
}

export const fetchHeadBlockNumber = (network:string) =>  async ():Promise<number> => {
  const client = getClientForNetwork(network)
  const response = await client.apiRequest<GetChainInfoResult>(
    `/v1/chain/get_info`,
    `GET`,
  )
  return response.last_irreversible_block_num;
}


export const sendTransaction = (network:NetworkName) => async (actions: Action[]):Promise<void> => {
  const txOptions = {
    broadcast: true,
    sign: true,
    blocksBehind: 3,
    expireSeconds: 60*5,
  }
  const eosApi = getApi(network)

  const contracts = getContractsForNetwork(network)
  if(contracts.cpuPayer) {
    actions.unshift({
      account: contracts.cpuPayer,
      name: `payforcpu`,
      authorization: [{
        actor: contracts.cpuPayer,
        permission: `payforcpu`,
      }],
      data: {}
    })
  }

  return eosApi.transact({
    actions,
  }, txOptions)
}