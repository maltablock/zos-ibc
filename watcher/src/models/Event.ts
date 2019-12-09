import { Model } from 'objection'
import { EventStatus, NetworkName } from '../types';

type EData = {
  transfer_id: string,
  from: string,
  target_blockchain: string,
  target_account: string,
  quantity: string,
}

const stringToNetworkName = (network: string) => {
  switch(network) {
    case `eos`: {
      return `mainnet`
    }
    default: {
      return network as NetworkName
    }
  }
}

export default class Event extends Model {
  readonly id: number;
  private readonly blockchain: string;
  readonly blockNumber: string;
  readonly timestamp: string;
  readonly transactionId: string;
  readonly globalSequence: string;
  readonly eversion?: string;
  readonly etype?: string;
  readonly edata?: string;
  readonly actionData: string;
  readonly print: string;

  static get tableName() {
    return 'events';
  }

  static get idColumn() {
    return 'id';
  }

  get Edata(): Partial<EData> {
    try {
      if(typeof this.edata === `string`) return JSON.parse(this.edata)
      return this.edata
    } catch {
      return {}
    }
  }

  get Blockchain(): NetworkName {
    // value controlled by us should always be a valid network name
    return this.blockchain as NetworkName
  }

  // event data is controlled by users, parse it to an internal network name
  get TargetBlockchain(): NetworkName {
    return stringToNetworkName(this.Edata.target_blockchain)
  }
}