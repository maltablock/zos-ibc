
/**
 *  @file
 *  @copyright defined in ../../../LICENSE
 */

#include "converteribc.hpp"

ACTION converteribc::init(name x_token_name, uint64_t min_reporters,
                          bool do_issue) {
  require_auth(get_self());

  settings settings_table(get_self(), get_self().value);
  bool settings_exists = settings_table.exists();

  check(!settings_exists, "settings already defined");
  check(min_reporters > 0, "minimum reporters must be positive");

  settings_table.set(
      settings_t{
          .x_token_name = x_token_name,
          .rpt_enabled = false,
          .xt_enabled = false,
          .next_transfer_id = 0,
          .min_reporters = min_reporters,
          .do_issue = do_issue,
      },
      get_self());
}

ACTION converteribc::update(uint64_t min_reporters, bool do_issue) {
  require_auth(get_self());

  check(min_reporters > 0, "minimum reporters must be positive");

  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();
  st.min_reporters = min_reporters;
  st.do_issue = do_issue;

  settings_table.set(st, get_self());
}

ACTION converteribc::enablerpt(bool enable) {
  require_auth(get_self());

  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();
  st.rpt_enabled = enable;
  settings_table.set(st, get_self());
}

ACTION converteribc::enablext(bool enable) {
  require_auth(get_self());

  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();
  st.xt_enabled = enable;
  settings_table.set(st, get_self());
}

ACTION converteribc::addreporter(name reporter) {
  require_auth(get_self());
  reporters reporters_table(get_self(), get_self().value);
  auto it = reporters_table.find(reporter.value);

  check(it == reporters_table.end(), "reporter already defined");

  reporters_table.emplace(get_self(), [&](auto &s) { s.reporter = reporter; });
}

ACTION converteribc::rmreporter(name reporter) {
  require_auth(get_self());
  reporters reporters_table(get_self(), get_self().value);
  auto it = reporters_table.find(reporter.value);

  check(it != reporters_table.end(), "reporter does not exist");

  reporters_table.erase(it);
}

ACTION converteribc::reporttx(name reporter, string blockchain,
                              uint64_t x_transfer_id, name target,
                              asset quantity, string memo, string data) {
  // checks that the reporter signed on the tx
  require_auth(reporter);

  check(memo.size() <= 256, "memo has more than 256 bytes");

  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();

  check(st.rpt_enabled, "reporting is disabled");

  // checks that the signer is known reporter
  reporters reporters_table(get_self(), get_self().value);
  auto existing = reporters_table.find(reporter.value);

  check(existing != reporters_table.end(),
        "the signer is not a known reporter");
  check(is_account(target), "target account does not exist");

  transfers transfers_table(get_self(), get_self().value);
  auto transaction = transfers_table.find(x_transfer_id);

  // first reporter
  if (transaction == transfers_table.end()) {
    transfers_table.emplace(get_self(), [&](auto &s) {
      s.x_transfer_id = x_transfer_id;
      s.target = target;
      s.quantity = quantity;
      s.blockchain = blockchain;
      s.memo = memo;
      s.data = data;
      s.reporters.push_back(reporter);
    });

    EMIT_TX_REPORT_EVENT(reporter, blockchain, target, quantity, x_transfer_id,
                         memo);
  } else {
    // checks that the reporter didn't already report the transfer
    check(std::find(transaction->reporters.begin(),
                    transaction->reporters.end(),
                    reporter) == transaction->reporters.end(),
          "the reporter already reported the transfer");

    check(transaction->x_transfer_id == x_transfer_id &&
              transaction->target == target &&
              transaction->quantity == quantity &&
              transaction->blockchain == blockchain &&
              transaction->memo == memo && transaction->data == data,
          "transfer data doesn't match");

    transfers_table.modify(transaction, get_self(),
                           [&](auto &s) { s.reporters.push_back(reporter); });

    EMIT_TX_REPORT_EVENT(reporter, blockchain, target, quantity, x_transfer_id,
                         memo);
  }
  // get the transaction again in case this was the first report
  transaction = transfers_table.find(x_transfer_id);

  // checks if we have minimal reporters for issue
  if (transaction->reporters.size() >= st.min_reporters) {
    if (st.do_issue) {
      // issue tokens first
      action(permission_level{st.x_token_name, "active"_n}, st.x_token_name,
             "issue"_n,
             std::make_tuple(st.x_token_name, transaction->quantity, memo))
          .send();
    }
    action(permission_level{st.x_token_name, "active"_n}, st.x_token_name,
           "transfer"_n,
           std::make_tuple(st.x_token_name, transaction->target,
                           transaction->quantity, memo))
        .send();

    EMIT_ISSUE_EVENT(target, quantity);

    transfers_table.erase(transaction);

    if (x_transfer_id) {
      amounts amounts_table(get_self(), get_self().value);
      auto amount = amounts_table.find(x_transfer_id);
      check(amount == amounts_table.end(), "x_transfer_id already exists");
      amounts_table.emplace(get_self(), [&](auto &a) {
        a.x_transfer_id = x_transfer_id;
        a.target = target;
        a.quantity = quantity;
      });
    }

    EMIT_X_TRANSFER_COMPLETE_EVENT(target, x_transfer_id);
  }
}

ACTION converteribc::clearamount(uint64_t x_transfer_id) {
  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();

  // only the bnt contract or self
  check(has_auth(st.x_token_name) || has_auth(get_self()),
        "missing required authority to close row");

  amounts amounts_table(get_self(), get_self().value);
  auto it = amounts_table.find(x_transfer_id);

  check(it != amounts_table.end(), "amount doesn't exist in table");

  amounts_table.erase(it);
}

void converteribc::on_transfer(name from, name to, asset quantity,
                               string memo) {
  if (from == get_self() || from == "eosio.ram"_n || from == "eosio.stake"_n ||
      from == "eosio.rex"_n)
    return;

  check(to == get_self(), "contract not involved in transfer");

  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();

  if (get_first_receiver() != st.x_token_name)
    return;

  const memo_x_transfer &memo_object = parse_memo(memo);

  std::string target_blockchain(memo_object.target_blockchain);
  std::transform(target_blockchain.begin(), target_blockchain.end(), target_blockchain.begin(),
    [](unsigned char c){ return std::tolower(c); });

  check(!target_blockchain.compare("eos") || !target_blockchain.compare("wax"), "invalid memo: target blockchain \"" + target_blockchain + "\" is not valid");
  check(memo_object.target_account.size() > 0 && memo_object.target_account.size() < 13, "invalid memo: target name \"" + memo_object.target_account + "\" is not valid");

  xtransfer(target_blockchain, from, memo_object.target_account,
            quantity);
}

void converteribc::xtransfer(const string &target_blockchain, name from,
                             const string &target_account,
                             const asset &quantity) {
  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();

  check(st.xt_enabled, "x transfers are disabled");
  const auto transfer_id = st.next_transfer_id;
  st.next_transfer_id += 1;

  // record this transfer in case we need to refund it
  records records_table(get_self(), get_self().value);
  records_table.emplace(get_self(), [&](auto &x) {
    x.transfer_id = transfer_id;
    x.from = from;
    x.quantity = quantity;
  });

  settings_table.set(st, get_self());

  EMIT_X_TRANSFER_EVENT(transfer_id, target_blockchain, target_account,
                        quantity);
}

  // NOTE: requires only a single reporter to resolve!
void converteribc::resolverecord(name reporter, uint64_t transfer_id, bool refund,
                                 const std::string &reason) {
  // checks that the reporter signed on the tx
  require_auth(reporter);

  settings settings_table(get_self(), get_self().value);
  auto st = settings_table.get();

  check(st.rpt_enabled, "reporting is disabled");
  check(st.xt_enabled, "x transfers are disabled");

  // checks that the signer is known reporter
  reporters reporters_table(get_self(), get_self().value);
  auto existing = reporters_table.find(reporter.value);

  check(existing != reporters_table.end(),
        "the signer is not a known reporter");


  records records_table(get_self(), get_self().value);
  auto it = records_table.find(transfer_id);

  check(it != records_table.end(), "no such transfer recorded");

  if (refund) {
    action(permission_level{get_self(), "active"_n}, st.x_token_name,
           "transfer"_n,
           std::make_tuple(get_self(), it->from, it->quantity,
                           std::string("refund: " + reason)))
        .send();
  } else {
    if (st.do_issue) {
      // requires x_token_name@active to include get_self()@eosio.code
      action(permission_level{st.x_token_name, "active"_n}, st.x_token_name,
             "burn"_n, std::make_tuple(get_self(), it->quantity))
          .send();
    } else {
      action(permission_level{get_self(), "active"_n}, st.x_token_name,
             "transfer"_n,
             std::make_tuple(get_self(), st.x_token_name, it->quantity,
                             std::string("burn")))
          .send();
    }

    EMIT_DESTROY_EVENT(it->from, it->quantity);
  }

  records_table.erase(it);
}
