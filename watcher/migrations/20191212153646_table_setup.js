const createConfigTable = table => {
  table.string("blockchain").primary();
  table.decimal("lastCommittedBlockNumber", 128, 0).unsigned();
};

const createEventTable = table => {
  table.increments(`id`).primary();
  table.string("blockchain");
  table.decimal("blockNumber", 128, 0).unsigned();
  table.timestamp("timestamp");
  table.string("transactionId");
  table.decimal("globalSequence", 128, 0).unsigned();
  table.string("eversion");
  table.string("etype");
  table.json("edata");
  table.json("actionData");
  table.string("print");

  // indexes / uniqueness constraints
  // so actions are not inserted twice
  table.unique(["blockchain", "globalSequence"]);
};

const createReportTable = table => {
  table.integer(`eventId`).primary();
  table.integer("status");
  table.integer("retries");
  table.string("lastError");

  table.index("status");
};

const getStartBlockNumber = network => {
  const THREE_DAYS_AS_BLOCKS = 2 * 60 * 60 * 24 * 2;
  switch (network) {
    case `kylin`:
      return 104224728 - THREE_DAYS_AS_BLOCKS;
    case `jungle`:
      return 91045607 - THREE_DAYS_AS_BLOCKS;
    case `mainnet`:
      return 98817667;
    case `wax`:
      return 33756246;
    default:
      return 0;
  }
};
const networks = [`mainnet`, `kylin`, `jungle`, `wax`];

exports.up = async function(knex) {
  console.log(`Running table setup migration`);

  await knex.schema.createTable(`watcherconfigs`, createConfigTable);
  await Promise.all(
    networks.map(blockchain =>
      knex(`watcherconfigs`).insert({
        blockchain: blockchain,
        lastCommittedBlockNumber: getStartBlockNumber(blockchain)
      })
    )
  );
  await knex.schema.createTable(`events`, createEventTable);
  await knex.schema.createTable(`reports`, createReportTable);

  console.log(`Migration done`);
};

exports.down = function(knex, Promise) {};
