const initEnvironment = require(`eosiac`);
const { getAccountNames } = require(`../_helpers`)

const { sendTransaction, env } = initEnvironment(
  process.env.EOSIAC_ENV || `dev`,
  { verbose: true }
);

const { ZOS_TOKEN_CONTRACT, ZOS_CONVERTER_WAX, ZOS_REPORTER, ZOS_RECEIVER_1 } = getAccountNames()

async function action() {
  try {
    await sendTransaction({
      account: ZOS_TOKEN_CONTRACT,
      name: `create`,
      authorization: [
        {
          actor: ZOS_TOKEN_CONTRACT,
          permission: `active`
        }
      ],
      data: {
        issuer: ZOS_TOKEN_CONTRACT,
        // https://bloks.io/account/zosdiscounts?loadContract=true&tab=Tables&table=stat&account=zosdiscounts&scope=ZOS&limit=100
        maximum_supply: `10000000000.0000 ZOS`
      }
    });

    // await sendTransaction({
    //   account: ZOS_TOKEN_CONTRACT,
    //   name: `issue`,
    //   authorization: [
    //     {
    //       actor: ZOS_TOKEN_CONTRACT,
    //       permission: `active`
    //     }
    //   ],
    //   data: {
    //     to: ZOS_TOKEN_CONTRACT,
    //     quantity: `5000000000.0000 ZOS`,
    //     memo: `issue half of it`,
    //   }
    // });

    // await sendTransaction({
    //   account: ZOS_TOKEN_CONTRACT,
    //   name: `transfer`,
    //   authorization: [
    //     {
    //       actor: ZOS_TOKEN_CONTRACT,
    //       permission: `active`
    //     }
    //   ],
    //   data: {
    //     from: ZOS_TOKEN_CONTRACT,
    //     to: ZOS_RECEIVER_1,
    //     quantity: `100000.0000 ZOS`,
    //     memo: `issue 100k`,
    //   }
    // });

    process.exit(0);
  } catch (error) {
    console.error(error.message)
    // ignore
    process.exit(1);
  }
}

action();
