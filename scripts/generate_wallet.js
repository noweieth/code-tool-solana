const bip39 = require("bip39");
const bs58 = require("bs58");
const { derivePath } = require("ed25519-hd-key");
const solanaWeb3 = require("@solana/web3.js");

function getSolanaAccountFromMnemonic(mnemonic, index) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const path = `m/44'/501'/${index}'/0'`;
  const { key } = derivePath(path, seed.toString("hex"));
  const account = solanaWeb3.Keypair.fromSeed(key.slice(0, 32));
  return account;
}

function generateWallet(mnemonic, start, end) {
  const accounts = [];
  for (let i = start; i < end; i++) {
    const account = getSolanaAccountFromMnemonic(mnemonic, i);
    accounts.push({
      index: i,
      publicKey: account.publicKey.toString(),
      privateKey: bs58.default.encode(Buffer.from(account.secretKey)),
    });
  }
  return accounts;
}

module.exports = { generateWallet };
