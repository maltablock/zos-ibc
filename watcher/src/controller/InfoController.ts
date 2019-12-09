import { NextFunction, Request, Response } from "express";
import WatcherConfig from "../models/WatcherConfig";
import { NETWORKS_TO_WATCH, getRpc } from "../eos/networks";
import { fetchHeadBlockNumber } from "../eos/fetch";

export default class InfoController {
  async version(req: Request, res: Response, next: NextFunction) {
    try {
      const configs = await WatcherConfig.query().findByIds(NETWORKS_TO_WATCH);
      const configsWithHeadblock = await Promise.all(
        configs.map(c =>
          fetchHeadBlockNumber(c.blockchain)().then(headBlockNumber => ({
            ...c,
            headBlockNumber,
            diffToHead: headBlockNumber - c.LastCommittedBlockNumber,
          }))
        )
      );

      return JSON.stringify({
        version: process.env.npm_package_version,
        configsWithHeadblock,
      }, null, 2);
    } catch (err) {
      next(err);
    }
  }
}
