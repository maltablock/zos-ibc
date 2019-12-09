const initEnvironment = require(`eosiac`);
const defaultEnvName = process.env.EOSIAC_ENV || `dev`;

const getAccountNames = (envName = defaultEnvName) => {
  const { env } = initEnvironment(envName, {
    verbose: false
  });

  const accounts = Object.keys(env.accounts);

  let ZOS_TOKEN_CONTRACT, ZOS_CONVERTER_WAX, ZOS_REPORTER, ZOS_RECEIVER_1, CPU_PAYER;

  if (envName === `dev`) {
    let _;
    [
      CPU_PAYER,
      __,
      ZOS_TOKEN_CONTRACT,
      ZOS_CONVERTER_WAX,
      ZOS_REPORTER,
      ZOS_RECEIVER_1
    ] = accounts;
  } else if(envName === `wax`) {
    [
      ZOS_TOKEN_CONTRACT,
      ZOS_CONVERTER_WAX,
      ZOS_REPORTER,
    ] = accounts;
  } else if(envName === `mainnet`) {
    [
      ZOS_TOKEN_CONTRACT,
      ZOS_CONVERTER_WAX,
      ZOS_REPORTER,
    ] = accounts;
  } else {
    [
      CPU_PAYER,
      ZOS_TOKEN_CONTRACT,
      ZOS_CONVERTER_WAX,
      ZOS_REPORTER,
      ZOS_RECEIVER_1
    ] = accounts;
  }

  return {
    CPU_PAYER,
    ZOS_TOKEN_CONTRACT,
    ZOS_CONVERTER_WAX,
    ZOS_REPORTER,
    ZOS_RECEIVER_1
  };
};

console.log(getAccountNames());

module.exports = {
  getAccountNames
};
