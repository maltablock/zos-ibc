import { Model } from 'objection'

export default class WatcherConfig extends Model {
  readonly blockchain: string;
  lastCommittedBlockNumber: string;

  static get tableName() {
    return 'watcherconfigs';
  }

  static get idColumn() {
    return 'blockchain';
  }

  public get LastCommittedBlockNumber() {
    return Number.parseInt(this.lastCommittedBlockNumber)
  }
}