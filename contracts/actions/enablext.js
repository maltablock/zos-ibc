const initEnvironment = require(`eosiac`);

const { sendTransaction, env } = initEnvironment(
  process.env.EOSIAC_ENV || `dev`,
  { verbose: true }
);

const accounts = Object.keys(env.accounts);

const CONTRACT_ACCOUNT = accounts[3];

async function action() {
  try {
    await sendTransaction({
      account: CONTRACT_ACCOUNT,
      name: `enablext`,
      authorization: [
        {
          actor: CONTRACT_ACCOUNT,
          permission: `active`
        }
      ],
      data: {
        enable: "enable"
      }
    });
    process.exit(0);
  } catch (error) {
    // ignore
    process.exit(1);
  }
}

action();
