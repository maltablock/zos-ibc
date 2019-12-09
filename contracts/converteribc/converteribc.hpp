
/**
 *  @file
 *  @copyright defined in ../../../LICENSE
 */
#pragma once

#include <eosio/asset.hpp>
#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <eosio/symbol.hpp>
#include <eosio/system.hpp>
#include <eosio/transaction.hpp>
#include "../Common/common.hpp"

using namespace eosio;
using namespace std;

/**
 * @defgroup converteribc converteribc
 * @ingroup bancorcontracts
 * @brief The converteribc contract allows cross chain token transfers.
 * @details There are two processes that take place in the contract:
 * - Initiate a cross chain transfer to a target blockchain (destroys tokens
 * from the caller account on EOS)
 * - Report a cross chain transfer initiated on a source blockchain (issues
 * tokens to an account on EOS) Reporting cross chain transfers works similar to
 * standard multisig contracts, meaning that multiple callers are required to
 * report a transfer before tokens are issued to the target account.
 * @{
 */

/// triggered when an account initiates a cross chain transafer
#define EMIT_X_TRANSFER_EVENT(transfer_id, target_blockchain, target_account, quantity)     \
  START_EVENT("xtransfer", "1.0")                                              \
  EVENTKV("transfer_id", transfer_id)                              \
  EVENTKV("target_blockchain", target_blockchain)                              \
  EVENTKV("target_account", target_account)                                    \
  EVENTKVL("quantity", quantity)                                                \
  END_EVENT()

/// triggered when account tokens are destroyed after cross chain transfer
/// initiation
#define EMIT_DESTROY_EVENT(from, quantity)                                     \
  START_EVENT("destroy", "1.0")                                                \
  EVENTKV("from", from)                                                        \
  EVENTKVL("quantity", quantity)                                               \
  END_EVENT()

/// triggered when a reporter reports a cross chain transfer from another
/// blockchain
#define EMIT_TX_REPORT_EVENT(reporter, blockchain, target,        \
                             quantity, x_transfer_id, memo)                    \
  START_EVENT("txreport", "1.0")                                               \
  EVENTKV("x_transfer_id", x_transfer_id)                                      \
  EVENTKV("reporter", reporter)                                                \
  EVENTKV("from_blockchain", blockchain)                                       \
  EVENTKV("target", target)                                                    \
  EVENTKV("quantity", quantity)                                                \
  EVENTKVL("memo", memo)                                                       \
  END_EVENT()

/// triggered when final report is succesfully submitted
#define EMIT_X_TRANSFER_COMPLETE_EVENT(target, id)                             \
  START_EVENT("xtransfercomplete", "1.0")                                      \
  EVENTKV("target", target)                                                    \
  EVENTKVL("id", id)                                                           \
  END_EVENT()

/// triggered when enough reports arrived and tokens are issued to an account
/// and the cross chain transfer is fulfilled
#define EMIT_ISSUE_EVENT(target, quantity)                                     \
  START_EVENT("issue", "1.1")                                                  \
  EVENTKV("target", target)                                                    \
  EVENTKVL("quantity", quantity)                                               \
  END_EVENT()

CONTRACT converteribc : public contract {
public:
  using contract::contract;

  /**
   * @defgroup XSettings_Table Settings Table
   * @brief This table stores settings for cross-transfers
   * @{
   */
  TABLE settings_t {
    name x_token_name;
    bool rpt_enabled;
    bool xt_enabled;
    bool do_issue;
    uint64_t next_transfer_id = 0;
    uint64_t min_reporters;
  }; /** @}*/

  /**
   * @defgroup Tranfsers_Table Transfers Table
   * @brief This table stores transfer stats
   * @{
   */
  TABLE transfer_t {
    uint64_t x_transfer_id;
    name target;
    asset quantity;
    string blockchain;
    string memo;
    string data;
    vector<name> reporters;

    uint64_t primary_key() const { return x_transfer_id; }

  }; /** @}*/

  /**
   * @defgroup Amounts_Table Amounts Table
   * @brief This table quantities for cross-transfers
   * @{
   */
  TABLE amounts_t {
    uint64_t x_transfer_id;
    name target;
    asset quantity;

    uint64_t primary_key() const { return x_transfer_id; }

  }; /** @}*/

  /**
   * @defgroup Reporters_Table Reporters Table
   * @brief This table stores the account names of converteribc reporters
   * @{
   *! \cond DOCS_EXCLUDE */
  TABLE reporter_t {
    name reporter;

    uint64_t primary_key() const { return reporter.value; }

  }; /** @}*/

  TABLE record_t {
    uint64_t transfer_id;
    name from;
    asset quantity;

    uint64_t primary_key() const { return transfer_id; }

  }; /** @}*/

  /**
   * @brief initializes the contract settings
   * @details can only be called once, by the contract account
   * @param x_token_name - cross chain token account
   * @param min_reporters - minimum required number of reporters to fulfill a
   * cross chain transfer
   */
  ACTION init(name x_token_name, uint64_t min_reporters, bool do_issue);

  /**
   * @brief updates the contract settings
   * @details can only be called by the contract account
   * @param min_reporters - new minimum required number of reporters
   */
  ACTION update(uint64_t min_reporters, bool do_issue);

  /**
   * @brief can only be called by the contract account
   * @param enable - true to enable reporting (and thus issuance), false to
   * disable it
   */
  ACTION enablerpt(bool enable);

  /**
   * @brief can only be called by the contract account
   * @param enable - true to enable cross chain transfers, false to disable them
   */
  ACTION enablext(bool enable);

  /**
   * @brief adds a new reporter, can only be called by the contract account
   * @param reporter - name of the reporter
   */
  ACTION addreporter(name reporter);

  /**
   * @brief removes an existing reporter, can only be called by the contract
   * account
   * @param reporter - name of the reporter
   */
  ACTION rmreporter(name reporter);

  /**
   * @brief reports an incoming transaction from a different blockchain
   * @details can only be called by an existing reporter
   * @param reporter - reporter account
   * @param blockchain - name of the source blockchain
   * @param tx_id - unique transaction id on the source blockchain
   * @param x_transfer_id - unique (if non zero) pre-determined id (unlike _txId
   * which is determined after the transactions been mined)
   * @param target - target account on EOS
   * @param quantity - amount to issue to the target account if the minimum
   * required number of reports is met
   * @param memo - memo to pass in in the transfer action
   * @param data - custom source blockchain value, usually a string representing
   * the tx hash on the source blockchain
   */
  ACTION reporttx(name reporter, string blockchain, uint64_t x_transfer_id, name target, asset quantity, string memo, string data);

  /**
   * @brief closes row in amounts table, can only be called by bnt token
   * contract or self
   * @param x_transfer_id - the transfer id
   */
  ACTION clearamount(uint64_t x_transfer_id);
  ACTION resolverecord(name reporter, uint64_t transfer_id, bool refund, const std::string& reason);

  /**
   * @brief transfer intercepts with standard transfer args
   * @details if the token received is the cross transfers token, initiates a
   * cross transfer
   * @param from - the sender of the transfer
   * @param to - the receiver of the transfer
   * @param quantity - the quantity for the transfer
   * @param memo - the memo for the transfer
   */
  [[eosio::on_notify("*::transfer")]] void on_transfer(
      name from, name to, asset quantity, string memo);

private:
  using transfer_action =
      action_wrapper<name("transfer"), &converteribc::on_transfer>;
  typedef eosio::singleton<"settings"_n, settings_t> settings;
  typedef eosio::multi_index<"settings"_n, settings_t>
      dummy_for_abi; // hack until abi generator generates correct name
  typedef eosio::multi_index<"transfers"_n, transfer_t> transfers;
  typedef eosio::multi_index<"amounts"_n, amounts_t> amounts;
  typedef eosio::multi_index<"reporters"_n, reporter_t> reporters;
  typedef eosio::multi_index<"records"_n, record_t> records;

  struct memo_x_transfer {
    string version;
    string target_blockchain;
    string target_account;
  };

  void xtransfer(const string &target_blockchain, name from,
                 const string &target_account, const asset &quantity);

  memo_x_transfer parse_memo(string memo) {
    auto res = memo_x_transfer();
    auto parts = split(memo, ",");
    res.version = "1.0";
    res.target_blockchain = parts[0];
    res.target_account = parts[1];
    return res;
  }
};
/** @}*/ // end of @defgroup converteribc converteribc
