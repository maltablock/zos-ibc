import { NextFunction, Request, Response } from "express";
import { fetchHeadBlockNumber } from "../eos/fetch";
import { formatTimeDifference } from "../utils";
import { knex } from "../db";
import WatcherConfig from "../models/WatcherConfig";
import { NETWORKS_TO_WATCH } from "../eos/networks";
import Report from "../models/Report";
import { EventStatus } from "../types";
import Health from "../models/Health";

const BLOCKS_IN_10_MINUTES = 2 * 10 * 60;
export default class HealthController {
  async version(request: Request, response: Response, next: NextFunction) {
    try {
      const configs = await WatcherConfig.query().findByIds(NETWORKS_TO_WATCH);

      const configsWithHeadblock = await Promise.all(
        configs.map(c =>
          fetchHeadBlockNumber(c.blockchain)().then(headBlockNumber => {
            const diffToHead = headBlockNumber - c.LastCommittedBlockNumber;

            return {
              ...c,
              headBlockNumber,
              diffToHead,
              isError: diffToHead > BLOCKS_IN_10_MINUTES
            };
          })
        )
      );

      const health = await Health.query().findById(0);
      const reports = await Report.query()
        .select("eventId")
        .where("status", ">", EventStatus.finished)
        .andWhere("eventId", ">", health.lastReviewedEventId)
        .orderBy("status", "DESC")
        .limit(1);
      const reportsNeedManualReview = reports.length > 0;

      return JSON.stringify({
        watchers: configsWithHeadblock,
        reports: {
          isError: reportsNeedManualReview
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async clear(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = Number.parseInt(req.params.eventId);
      if(!eventId) throw new Error(`No eventId param passed`)

      const health = await Health.query().findById("0");
      await health.$query().patch({
        lastReviewedEventId: eventId
      });

      return JSON.stringify({
        success: true
      });
    } catch (err) {
      next(err);
    }
  }
}
