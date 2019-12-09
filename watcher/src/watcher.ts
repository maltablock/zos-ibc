import { DfuseClient, SearchTransactionRow, ActionTrace } from "@dfuse/client";
import { logger } from "./logger";
import { TEosAction } from "./eos/types";
import { sleep, isProduction } from "./utils";
import { fetchHeadBlockNumber } from "./eos/fetch";
import WatcherConfig from "./models/WatcherConfig";
import Event from "./models/Event";
import { getContractsForNetwork } from "./eos/networks";
import { knex } from "./db";
import Report from "./models/Report";
import { EventStatus, NetworkName } from "./types";

const MAX_BLOCK_RANGE_PER_SEARCH = 7200 * 1; // 1 hours

export default class Watcher {
  private client: DfuseClient;
  private config?: WatcherConfig;

  private pendingActions: TEosAction[] = [];
  private accountToWatch: string;
  private networkName: NetworkName;

  constructor({
    client,
    accountToWatch,
    networkName
  }: {
    client: DfuseClient;
    accountToWatch: string;
    networkName: NetworkName;
  }) {
    this.client = client;
    this.accountToWatch = accountToWatch;
    this.networkName = networkName;
  }

  public async start() {
    this.config = await WatcherConfig.query().findOne({
      blockchain: this.networkName
    });
    logger.info(`${this.networkName}: `, this.config);
    let headBlockNumber = await fetchHeadBlockNumber(this.networkName)();
    const diffToConfig = headBlockNumber - this.config.LastCommittedBlockNumber;
    logger.info(
      `${this.networkName}: Block number - Head: ${headBlockNumber} - Config: ${this.config.lastCommittedBlockNumber} - Diff: ${diffToConfig}`
    );

    let fromBlock = this.config.LastCommittedBlockNumber + 1;
    logger.info(`${this.networkName}: Watcher starting at ${fromBlock}`);

    while (true) {
      try {
        headBlockNumber = await fetchHeadBlockNumber(this.networkName)();
        const toBlock = Math.min(
          headBlockNumber,
          fromBlock + MAX_BLOCK_RANGE_PER_SEARCH
        );

        if (toBlock > fromBlock) {
          await this.getPendingActions(fromBlock, toBlock);
          await this.commit(toBlock);
          fromBlock = this.config.LastCommittedBlockNumber + 1;
        }

        // if we're following LIB, wait 10 seconds each time
        if (toBlock === headBlockNumber) {
          await sleep(1e4);
        }
      } catch (error) {
        logger.error(`Watcher (${this.networkName}): ${error.message}`);
        await sleep(1e4);
      }
    }
  }

  isMatchingTrace = (trace: ActionTrace<any>) => {
    if (trace.receipt.receiver !== this.accountToWatch) return false;

    return (
      trace.act.account === getContractsForNetwork(this.networkName).zosToken &&
      trace.act.name === `transfer` &&
      trace.act.data.to === this.accountToWatch
    );
  };

  getActionTraces = (trans: SearchTransactionRow): TEosAction[] => {
    const matchingTraces = [];
    const blockNumber = trans.lifecycle.execution_trace!.block_num;

    // BFS through transaction traces
    const traces = trans.lifecycle.execution_trace!.action_traces;
    while (traces.length > 0) {
      const curTrace = traces.shift()!;

      if (this.isMatchingTrace(curTrace)) {
        matchingTraces.push(curTrace);
        logger.info(
          `${this.networkName}: Pending ${curTrace.act.account}:${curTrace.act.name} @ ${blockNumber}`
        );
      }

      if (Array.isArray(curTrace.inline_traces)) {
        traces.push(...curTrace.inline_traces);
      }
    }

    return matchingTraces.map(trace => {
      return {
        blockNumber: trace.block_num,
        timestamp: trace.block_time,
        account: trace.act.account,
        name: trace.act.name,
        data: trace.act.data,
        print: trace.console,
        trxId: trace.trx_id,
        // https://github.com/EOSIO/eos/blob/master/libraries/chain/apply_context.cpp#L127
        // global_sequence unique per non-failed transactions
        globalSequence: trace.receipt.global_sequence,
        // recv_sequence unique per contract, is a counter incremeted each time account is a receiver
        receiveSequence: trace.receipt.recv_sequence,
        // not necessarily unique as it just hashes the action data?
        actDigest: trace.receipt.act_digest
      };
    });
  };

  protected async getPendingActions(fromBlock: number, toBlock: number) {
    const transactions = [];
    let response;
    let cursor = ``;
    do {
      try {
        // sometimes dfuse searchTransaction gets stuck on mainnet and takes ages or never returns
        response = await Promise.race([
          new Promise((res, rej) => {
            setTimeout(() => {
              rej(new Error(`searchTransactions took too long.`));
            }, 20 * 1e3);
          }),
          this.client.searchTransactions(`receiver:${this.accountToWatch}`, {
            limit: 100,
            sort: `asc`,
            cursor,
            startBlock: fromBlock,
            // toBlock = fromBlock + blockCount
            blockCount: toBlock - fromBlock
          })
        ]);
      } catch (error) {
        let message = error.message;
        if (error.details && error.details.errors)
          message = `${message}. ${JSON.stringify(error.details.errors)}`;

        // sometimes dfuse seems to have a different LIB than we receive, ignore this error
        if (!/goes beyond LIB/i.test(message)) {
          logger.error(`Watcher (${this.networkName}): ${message}`);
        }
        // try again
        await sleep(10000);
        continue;
      }

      cursor = response.cursor;

      if (response.transactions && response.transactions[0]) {
        transactions.push(...response.transactions);
      }
    } while (cursor !== ``);
    transactions.forEach(trans => {
      const actions = this.getActionTraces(trans);
      this.pendingActions.push(...actions);
    });
  }

  protected async commit(blockNum: number) {
    logger.verbose(
      `${this.networkName}: Committing all actions up to block ${blockNum}`
    );

    const actionsToProcess = this.pendingActions;
    this.pendingActions = [];
    if (actionsToProcess.length > 0) {
      await this.onActions(actionsToProcess);
    }

    await this.config!.$query().patch({ lastCommittedBlockNumber: `${blockNum}` });
  }

  protected async onActions(actions: TEosAction[]) {
    const valuesToInsert = actions.map(action => {
      let event = {
        version: undefined,
        etype: undefined,
        edata: undefined
      } as any;

      try {
        const events = action.print.split(`\n`).map(e => JSON.parse(e || `{}`));
        event = events.find(e => e.etype === `xtransfer`);
        if (!event) throw new Error(`Cannot find "xtransfer" event`);
      } catch (error) {
        logger.error(
          `Error while parsing event memo at tx "${action.trxId}": ${action.print}`
        );
      }
      const { version: eversion, etype, ...edata } = event;

      return {
        blockchain: this.networkName,
        blockNumber: `${action.blockNumber}`,
        timestamp: `${action.timestamp}Z`,
        transactionId: action.trxId,
        globalSequence: `${action.globalSequence}`,
        eversion,
        etype,
        edata: JSON.stringify(edata || {}),
        actionData: JSON.stringify(action.data),
        print: action.print
      };
    });

    if (isProduction()) {
      // batch insert only works with Postgresql
      await knex.transaction(async trx => {
        const events = await Event.query(trx).insert(valuesToInsert);
        const reports = await Report.query(trx).insert(
          events.map(e => ({
            eventId: e.id,
            status: EventStatus.observed,
            lastError: ``
          }))
        );
        return { events, reports };
      });
    } else {
      for (const value of valuesToInsert) {
        const event = await Event.query().insert(value);
        await Report.query().insert({
          eventId: event.id,
          status: EventStatus.observed,
          lastError: ``
        });
      }
    }
  }
}
