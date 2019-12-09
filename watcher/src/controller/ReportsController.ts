import { NextFunction, Request, Response } from "express";
import { knex } from "../db";
import Report from "../models/Report";
import { EventStatus, NetworkName } from "../types";
import { logger } from "../logger";
import Event from "../models/Event";
import { formatStatus, formatBloksTransaction } from "../utils";
import _ from "lodash";

type Row = {
  id: number;
  status: string;
  fromBlockchain: string;
  quantity: string;
  toBlockchain: string;
  transferUrl: string; // bloks url
  lastError: string;
};

const stringToNetworkName = (network: string) => {
  switch (network) {
    case `eos`: {
      return `mainnet`;
    }
    default: {
      return network as NetworkName;
    }
  }
};

export default class ReportsController {
  async reports(req: Request, res: Response, next: NextFunction) {
    try {
      const reportsToProcess = (await Report.query()
        .select("*")
        // .where("status", ">", EventStatus.finished)
        .orderBy("status", "DESC")
        .limit(100)
        .joinRelated("event")) as any[];

      const rows: Row[] = reportsToProcess.map(x => {
        const edata =
          typeof x.edata === `string`
            ? _.attempt(() => JSON.parse(x.edata)) || {}
            : x.edata;

        return {
          id: x.eventId,
          status: formatStatus(x.status),
          fromBlockchain: x.blockchain,
          quantity: edata.quantity,
          toBlockchain: edata.target_blockchain || `unknown`,
          lastError: x.lastError,
          transferUrl: formatBloksTransaction(
            stringToNetworkName(x.blockchain),
            x.transactionId
          )
        };
      });

      const ejsOptions = {
        rows
      };

      res.render("reports.html", ejsOptions);
    } catch (err) {
      next(err);
    }
  }
}
