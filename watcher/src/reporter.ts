import _ from "lodash";
import Long from "long";
import { logger } from "./logger";
import Event from "./models/Event";
import { EventStatus } from "./types";
import { sleep, formatStatus } from "./utils";
import { sendTransaction } from "./eos/fetch";
import { getContractsForNetwork } from "./eos/networks";
import Report from "./models/Report";

type Task = {
  event: Event;
  report: Report;
};
type ReportProcessPayload = {
  status: EventStatus;
  error: string;
};

const formatLastError = message =>
  message.replace(/assertion failure with message: /gi, ``).slice(0, 200);

export default class Reporter {
  constructor() {}

  public static computeTransferId(event: Event) {
    const x_transfer_id = Long.fromString(
      event.transactionId.slice(0, 16),
      true,
      16
    ).xor(Long.fromString(event.Edata.transfer_id, true, 10));
    return x_transfer_id.toString(10);
  }

  public async start() {
    logger.info(`Reporter started`);

    while (true) {
      let eventId = undefined;
      try {
        eventId = undefined;
        const task = await this.getTaskToProcess();
        if (!task) {
          continue;
        }

        eventId = task.event.id;
        logger.info(
          `Reporter: Starting to process event "${eventId}" (${formatStatus(
            task.report.status
          )})`
        );
        const newStatus = await this.processTask(task);
        await this.commitNewStatus(task.report, newStatus);
      } catch (error) {
        logger.error(
          `Reporter: Error during event "${eventId}": ${error.message}`
        );
      } finally {
        await sleep(10000);
      }
    }
  }

  protected async processEventObserved(
    event: Event
  ): Promise<ReportProcessPayload> {
    if (!event.eversion || !event.etype || _.isEmpty(event.Edata)) {
      const message = `Reporter: Encountered a broken event "${
        event.id
      }": ${JSON.stringify(event)}`;
      logger.info(message);
      return { status: EventStatus.broken_event, error: message };
    }

    // report it
    try {
      const targetBlockchain = event.TargetBlockchain
      const targetBlockchainContracts = getContractsForNetwork(
        targetBlockchain
      );
      await sendTransaction(targetBlockchain)([
        {
          account: targetBlockchainContracts.zosIbc,
          name: `reporttx`,
          authorization: [
            {
              actor: targetBlockchainContracts.zosReporter,
              permission: `report`
            }
          ],
          data: {
            reporter: targetBlockchainContracts.zosReporter,
            blockchain: event.Blockchain,
            x_transfer_id: Reporter.computeTransferId(event),
            target: event.Edata.target_account,
            quantity: event.Edata.quantity,
            memo: ``,
            data: JSON.stringify({
              txId: event.transactionId,
              globalSequence: event.globalSequence
            })
          }
        }
      ]);
      logger.info(`Reporter: Successfully reported event "${event.id}"`);
      return {
        status: EventStatus.report_success,
        error: ``
      };
    } catch (error) {
      logger.error(
        `Reporter: Error while processing event "${event.id}": ${error.message}`
      );
      return {
        status: EventStatus.report_failed,
        error: formatLastError(error.message)
      };
    }
  }

  protected async processEventReportSuccess(
    event: Event
  ): Promise<ReportProcessPayload> {
    // resolve
    try {
      // let's require manual clearamount action for now
      // which prevents double-reporting a transfer
      // const targetBlockchain = event.Edata.target_blockchain
      // const targetBlockchainContracts = getContractsForNetwork(targetBlockchain)
      // await sendTransaction(targetBlockchain)([{
      //   account: targetBlockchainContracts.zosIbc,
      //   name: `clearamount`,
      //   authorization: [{
      //     actor: targetBlockchainContracts.zosIbc,
      //     permission: `active`,
      //   }],
      //   data: {
      //     x_transfer_id: Reporter.computeTransferId(event),
      //   }
      // }])
      const blockchainContracts = getContractsForNetwork(event.Blockchain);
      await sendTransaction(event.Blockchain)([
        {
          account: blockchainContracts.zosIbc,
          name: `resolverecord`,
          authorization: [
            {
              actor: blockchainContracts.zosReporter,
              permission: `report`
            }
          ],
          data: {
            reporter: blockchainContracts.zosReporter,
            transfer_id: event.Edata.transfer_id,
            refund: false,
            reason: ``
          }
        }
      ]);

      logger.info(`Reporter: Successfully resolved event "${event.id}"`);
      return { status: EventStatus.finished, error: `` };
    } catch (error) {
      logger.error(
        `Reporter: Error while processing event "${event.id}": ${error.message}`
      );
      return {
        status: EventStatus.report_success_resolve_failed,
        error: formatLastError(error.message)
      };
    }
  }

  protected async processEventReportFailed(
    event: Event,
    report: Report
  ): Promise<ReportProcessPayload> {
    // refund
    try {
      const blockchainContracts = getContractsForNetwork(event.Blockchain);
      await sendTransaction(event.Blockchain)([
        {
          account: blockchainContracts.zosIbc,
          name: `resolverecord`,
          authorization: [
            {
              actor: blockchainContracts.zosReporter,
              permission: `report`
            }
          ],
          data: {
            reporter: blockchainContracts.zosReporter,
            transfer_id: event.Edata.transfer_id,
            refund: true,
            reason: report.lastError
          }
        }
      ]);

      logger.info(`Reporter: Successfully refunded event "${event.id}"`);
      return { status: EventStatus.report_failed_refund_success, error: `` };
    } catch (error) {
      logger.error(
        `Reporter: Error while processing event "${event.id}": ${error.message}`
      );
      return {
        status: EventStatus.report_failed_refund_failed,
        error: formatLastError(error.message)
      };
    }
  }

  protected async processTask({
    event,
    report
  }: Task): Promise<ReportProcessPayload> {
    const currentStatus = report.status as EventStatus;
    switch (currentStatus) {
      case EventStatus.observed: {
        return this.processEventObserved(event);
      }
      case EventStatus.report_success: {
        return this.processEventReportSuccess(event);
      }
      case EventStatus.report_failed: {
        return this.processEventReportFailed(event, report);
      }
      default:
        throw new Error(
          `Unknown status "${report.status} (${formatStatus(
            report.status
          )})" in event ${report.eventId}`
        );
    }
  }

  protected async getTaskToProcess(): Promise<Task> {
    const report = (
      await Report.query()
        .where("status", "<", EventStatus.finished)
        .orderBy("eventId", "ASC")
        .limit(1)
    )[0];

    if (!report) return undefined;

    const event = ((await report.$relatedQuery<Event>(
      "event"
    )) as unknown) as Event;
    const task = {
      report,
      event: event
    };
    return task;
  }

  protected async commitNewStatus(
    report: Report,
    { status, error }: ReportProcessPayload
  ) {
    logger.info(
      `Reporter: Committing new status "${formatStatus(status)}" for event "${
        report.eventId
      }"`
    );

    await report.$query().patch({ status, lastError: error });
  }
}
