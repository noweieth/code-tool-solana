const solanaWeb3 = require("@solana/web3.js");

const connection = new solanaWeb3.Connection(
  solanaWeb3.clusterApiUrl("mainnet-beta"),
  "confirmed"
);

const transferSOL = async (
  senderPrivateKey,
  recipientPublicKeyString,
  amount
) => {
  try {
    const senderSecretKey = Uint8Array.from(
      Buffer.from(senderPrivateKey, "hex")
    );
    const senderKeypair = solanaWeb3.Keypair.fromSecretKey(senderSecretKey);

    const recipientPublicKey = new solanaWeb3.PublicKey(
      recipientPublicKeyString
    );

    let transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: amount * solanaWeb3.LAMPORTS_PER_SOL,
      })
    );

    let signature = await solanaWeb3.sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );

    console.log("Transaction signature", signature);
  } catch (error) {
    console.error("Error transferring SOL:", error);
  }
};

const multiTransferSOL = async (
  senderPrivateKey,
  recipientsPublicKey,
  amount
) => {
  try {
    const senderSecretKey = Uint8Array.from(
      Buffer.from(senderPrivateKey, "hex")
    );
    const senderKeypair = solanaWeb3.Keypair.fromSecretKey(senderSecretKey);
    let transaction = new solanaWeb3.Transaction();
    for (let reciptent of recipientsPublicKey) {
      const recipientPublicKey = new solanaWeb3.PublicKey(reciptent.publicKey);
      transaction.add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: recipientPublicKey,
          lamports: amount * solanaWeb3.LAMPORTS_PER_SOL,
        })
      );
    }

    let signature = await solanaWeb3.sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );

    console.log("Transaction signature", signature);
  } catch (error) {
    console.error("Error transferring SOL:", error);
  }
};

const getBalanceSol = async (publicKeyString) => {
  try {
    const publicKey = new solanaWeb3.PublicKey(publicKeyString);
    const balance = await connection.getBalance(publicKey);
    return balance / solanaWeb3.LAMPORTS_PER_SOL;
  } catch (e) {
    console.log(e.message);
    return 0;
  }
};

module.exports = { transferSOL, multiTransferSOL, getBalanceSol };
