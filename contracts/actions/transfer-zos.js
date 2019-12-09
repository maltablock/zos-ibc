const initEnvironment = require(`eosiac`);
const { getAccountNames } = require(`./_helpers`);

const envName = process.env.EOSIAC_ENV || `dev`;
const { sendTransaction, env } = initEnvironment(envName, { verbose: true });

const {
  ZOS_TOKEN_CONTRACT,
  ZOS_CONVERTER_WAX,
  ZOS_REPORTER,
  ZOS_RECEIVER_1,
} = getAccountNames();

// jungle := EOS, kylin := WAX
const X_CHAIN_ENV_NAME = envName === `jungle` ? `kylin` : `jungle`;
const {
  ZOS_RECEIVER_1: ZOS_X_CHAIN_RECEIVER
} = getAccountNames(X_CHAIN_ENV_NAME);

async function action() {
  try {
    await sendTransaction({
      account: ZOS_TOKEN_CONTRACT,
      name: `transfer`,
      authorization: [
        {
          actor: ZOS_RECEIVER_1,
          permission: `active`,
        }
      ],
      data: {
        from: ZOS_RECEIVER_1,
        to: ZOS_CONVERTER_WAX,
        quantity: `1.2345 ZOS`,
        memo: `${X_CHAIN_ENV_NAME},${ZOS_X_CHAIN_RECEIVER}`,
      }
    });
    process.exit(0);
  } catch (error) {
    console.error(error.message)
    // ignore
    process.exit(1);
  }
}

action();
