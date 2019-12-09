import * as process from "process";
import Knex from "knex";
import { Model } from "objection";
import { logger } from "./logger";
import { isProduction } from "./utils";

const connect = (): Knex => {
  let config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE
  } as any;

  let knex: any;
  if (
    process.env.INSTANCE_CONNECTION_NAME &&
    isProduction()
  ) {
    config.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    // the above example from Google does not even work ...
    // need to use host instead https://github.com/brianc/node-postgres/issues/1617
    config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;

    knex = Knex({
      client: "postgres",
      connection: config
    });
  } else {
    knex = Knex({
      client: "sqlite3",
      connection: { filename: "./db.sqlite" },
      useNullAsDefault: true
    });
  }

  Model.knex(knex);
  return knex;
};

const knex = connect();

const migrate = async () => {
  logger.info("(1/1) running [knex.migrate.latest()]");
  await knex.migrate.latest();
  // logger.info("(2/2) running [knex.seed.run()]");
  // await knex.seed.run();
};

export { knex, migrate };
