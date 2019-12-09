import express from "express";
import bodyParser from "body-parser";
import { Request, Response } from "express";
import "./dotenv";
import { Routes } from "./routes";
import { logger } from "./logger";
import Watcher from "./watcher";
import { getClientForNetwork } from "./eos/dfuse";
import { knex, migrate } from "./db";
import { NETWORKS_TO_WATCH, getContractsForNetwork } from "./eos/networks";
import Reporter from "./reporter";
import { DfuseClientError, DfuseError } from "@dfuse/client";

async function start() {
  // create express app
  const app = express();
  app.enable("trust proxy");
  app.use(bodyParser.json());

  // register express routes from defined application routes
  Routes.forEach(route => {
    (app as any)[route.method](
      route.route,
      (req: Request, res: Response, next: Function) => {
        const result = new (route.controller as any)()[route.action](
          req,
          res,
          next
        );
        if (result instanceof Promise) {
          result.then(result =>
            result !== null && result !== undefined
              ? res.send(result)
              : undefined
          );
        } else if (result !== null && result !== undefined) {
          res.json(result);
        }
      }
    );
  });

  // test db connection
  await knex.raw("select 1+1 as result");
  await migrate();

  // start express server
  const PORT = process.env.PORT || 8080;
  app.set('views', __dirname + '/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.listen(PORT);

  const watchers = NETWORKS_TO_WATCH.map(
    network =>
      new Watcher({
        client: getClientForNetwork(network),
        accountToWatch: getContractsForNetwork(network).zosIbc,
        networkName: network,
      })
  );
  watchers.map(watcher => watcher.start());

  const reporter = new Reporter()
  reporter.start()

  logger.info(
    `Express server has started on port ${PORT}. Open http://localhost:${PORT}/info`
  );
}

start().catch(error => logger.error(error.message || error));

// dfuse sometimes soft-crashes with an unhandled promise
// breaking the contract
// (node:xx) UnhandledPromiseRejectionWarning: Error: The returned body shall have been a valid JSON object, got ...
//  at DefaultHttpClient.<anonymous> (/app/packages/transaction-logger/node_modules/@dfuse/client/dist/lib/client/http-client.js:148:24)
process.on("unhandledRejection", function(reason: any, p) {
  let message = reason ? (reason as any).stack : reason;
  if(reason instanceof DfuseClientError) {
    message = `DfuseCause: ${message}\n${reason.cause.stack}`
  }
  logger.error(`Possibly Unhandled Rejection at: ${message}`);

  // another dfuse error, this breaks watchers
  // TODO: find some way to resolve this unhandled promise rejection
  // or just reset dfuse client + restart watcher

  // if(reason instanceof DfuseError) {
  //   logger.info(`Restarting watcher because of dfuse error`)
  // } else {
  // }
  process.exit(1);

});
