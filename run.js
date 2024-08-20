const bs58 = require("bs58");
const { generateWallet } = require("./scripts/generate_wallet");
const {
  buyToken,
  getBalanceSPL,
  sellToken,
  unwrapSOL,
} = require("./scripts/swap");
const { transferSOL, multiTransferSOL } = require("./scripts/transfer_sol");

const mnemonic =
  "";

const run = async () => {
  try {
    const wallets = generateWallet(mnemonic, 0, 1);
    for (let wallet of wallets) {
      // let balanceToken = await getBalanceSPL(wallet.publicKey);
      // await sellToken(wallet.privateKey, balanceToken);
      wallet.privateKey = bs58.default.decode(wallet.privateKey);
      await buyToken(wallet.privateKey, 0.001);
      console.log(wallet.privateKey);
    }
  } catch (e) {
    console.log(e.message);
  }
};

run();
