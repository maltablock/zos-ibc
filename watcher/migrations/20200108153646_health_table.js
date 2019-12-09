const createHealthTable = table => {
  table.integer(`id`).primary();
  table.integer("lastReviewedEventId"); // used to mark events that need manual review as reviewed
};

exports.up = async function(knex) {
  console.log(`Running health table migration`);

  await knex.schema.createTable(`health`, createHealthTable);
  await knex(`health`).insert({
    id: 0,
    lastReviewedEventId: 0,
  });

  console.log(`Migration done`);
};

exports.down = function(knex, Promise) {};
