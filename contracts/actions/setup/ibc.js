const initEnvironment = require(`eosiac`);
const { getAccountNames } = require(`../_helpers`)

const { sendTransaction, env } = initEnvironment(
  process.env.EOSIAC_ENV || `dev`,
  { verbose: true }
);

const { ZOS_TOKEN_CONTRACT, ZOS_CONVERTER_WAX, ZOS_REPORTER } = getAccountNames()

async function action() {
  try {
    await sendTransaction({
      account: ZOS_CONVERTER_WAX,
      name: `init`,
      authorization: [
        {
          actor: ZOS_CONVERTER_WAX,
          permission: `active`
        }
      ],
      data: {
        x_token_name: ZOS_TOKEN_CONTRACT,
        min_reporters: 1,
        do_issue: false,
      }
    });

    await sendTransaction({
      account: ZOS_CONVERTER_WAX,
      name: `addreporter`,
      authorization: [
        {
          actor: ZOS_CONVERTER_WAX,
          permission: `active`
        }
      ],
      data: {
        reporter: ZOS_REPORTER
      }
    });

    await sendTransaction({
      account: ZOS_CONVERTER_WAX,
      name: `enablerpt`,
      authorization: [
        {
          actor: ZOS_CONVERTER_WAX,
          permission: `active`
        }
      ],
      data: {
        enable: true,
      }
    });

    await sendTransaction({
      account: ZOS_CONVERTER_WAX,
      name: `enablext`,
      authorization: [
        {
          actor: ZOS_CONVERTER_WAX,
          permission: `active`
        }
      ],
      data: {
        enable: true,
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
