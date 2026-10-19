// Integration-only server: expose the interval between Order creation and debit.
const wallet = require("../../src/services/wallet");
const changeBalance = wallet.changeBalance;
wallet.changeBalance = async (input) => {
  if (input.type === "payment") await new Promise((resolve) => setTimeout(resolve, 1000));
  return changeBalance(input);
};
require("../../src/server");
