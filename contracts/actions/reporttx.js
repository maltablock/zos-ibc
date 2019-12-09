const initEnvironment = require(`eosiac`);
const { getAccountNames } = require(`./_helpers`)

const { sendTransaction, env } = initEnvironment(
  process.env.EOSIAC_ENV || `dev`,
  { verbose: true }
);

const { ZOS_TOKEN_CONTRACT, ZOS_CONVERTER_WAX, ZOS_REPORTER, ZOS_RECEIVER_1 } = getAccountNames()

async function action() {
  try {
    await sendTransaction({
      account: ZOS_CONVERTER_WAX,
      name: `reporttx`,
      authorization: [
        {
          actor: ZOS_REPORTER,
          permission: `active`
        }
      ],
      data: {
        blockchain: `EOS`,
        data: {"txHash":"0x1c947a8e67bb9712e35c18dea519686a197c5247706f209f21a7d11a77727400"},
        memo: ``,
        quantity: `1963.6389 ZOS`,
        reporter: ZOS_REPORTER,
        target: ZOS_RECEIVER_1,
        tx_id: 9519594750095,
        x_transfer_id: 287525349966,
      }
    });
    process.exit(0);
  } catch (error) {
    // ignore
    process.exit(1);
  }
}

action();
