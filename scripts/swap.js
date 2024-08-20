const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  ComputeBudgetProgram,
} = require("@solana/web3.js");
const {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const {
  Amm,
  LIQUIDITY_POOLS,
  getTokenAccount,
  fetchPoolKeys,
  Liquidity,
  TokenAmount,
  Market,
} = require("@raydium-io/raydium-sdk");
const {
  fetchAllPoolKeysQuote,
  fetchAllPoolKeysBase,
} = require("./get_pool_key");
const { default: axios } = require("axios");
const BigNumber = require("bignumber.js");

const connection = new Connection(
  "https://icy-dimensional-energy.solana-mainnet.quiknode.pro/edfdf17abcb6c65e8562ab86ec906bc0df14be38/"
);

const TOKEN_ADDRESS = "HEvhWqTbVqrbFNpxVKZ7sySqWy2qCJ8T9PtFD1rYaw4r";
const WSOL_ADDRESS = "So11111111111111111111111111111111111111112";

const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);

async function wrapSOL(senderKeypair, amountSOL) {
  try {
    const wSOLAccount = await createAssociatedTokenAccountIfNotExists(
      senderKeypair,
      WSOL_ADDRESS
    );
    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: "20000000",
    });

    const transaction = new Transaction().add(computeBudgetInstruction).add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: wSOLAccount,
        lamports: amountSOL * Math.pow(10, 9),
      }),
      Token.createSyncNativeInstruction(TOKEN_PROGRAM_ID, wSOLAccount)
    );

    const signature = await connection.sendTransaction(transaction, [
      senderKeypair,
    ]);
    await connection.confirmTransaction(signature);

    console.log(
      `Wrapped ${amountSOL} SOL into wSOL with signature ${signature}`
    );
  } catch (e) {
    console.log("Wrap Sol ERROR: ", e.message);
  }
}

async function unwrapSOL(senderPrivateKey) {
  try {
    const senderSecretKey = Uint8Array.from(
      Buffer.from(senderPrivateKey, "hex")
    );
    const senderKeypair = Keypair.fromSecretKey(senderSecretKey);

    const wSOLAccount = await createAssociatedTokenAccountIfNotExists(
      null,
      senderKeypair,
      WSOL_ADDRESS
    );
    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: "200000",
    });

    const closeAccountInstruction = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      wSOLAccount,
      senderKeypair.publicKey,
      senderKeypair.publicKey,
      []
    );
    const transaction = new Transaction()
      .add(computeBudgetInstruction)
      .add(closeAccountInstruction);

    const signature = await connection.sendTransaction(transaction, [
      senderKeypair,
    ]);
    await connection.confirmTransaction(signature);

    console.log(`Unwrap signature ${signature}`);
  } catch (e) {
    console.log("Wrap Sol ERROR: ", e.message);
  }
}

async function getBalanceSPL(publicKey) {
  try {
    const walletAddress = new PublicKey(publicKey);
    const tokenMintAddress = new PublicKey(TOKEN_ADDRESS);

    const tokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMintAddress,
      walletAddress
    );
    const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
    return accountInfo.value.uiAmount * 10 ** accountInfo.value.decimals;
  } catch (e) {
    console.log(e.message);
  }
}

async function subscribeToRaydiumPools(quoteToken) {
  try {
    const data = await connection.onProgramAccountChange(
      new PublicKey("GiG7Hr61RVm4CSUxJmgiCoySFQtdiwxtqf64MsRppump"),
      async (updatedAccountInfo) => {
        console.log(updatedAccountInfo);
      }
    );
  } catch (e) {
    console.log(e.message);
  }
}

async function getPoolKeysFromApi() {
  try {
    var poolKeys;
    poolKeys = await fetchAllPoolKeysQuote(
      connection,
      new PublicKey(TOKEN_ADDRESS),
      {
        4: new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"),
        5: new PublicKey("27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv"),
      }
    );
    if (poolKeys.length == 0) {
      poolKeys = await fetchAllPoolKeysBase(
        connection,
        new PublicKey(TOKEN_ADDRESS),
        {
          4: new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"),
          5: new PublicKey("27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv"),
        }
      );
    }
    return poolKeys;
  } catch (error) {
    console.error("Error fetching pool keys:", error);
    throw error;
  }
}

async function createAssociatedTokenAccountIfNotExists(
  transaction,
  ownerKeypair,
  tokenMint
) {
  const associatedTokenAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    new PublicKey(tokenMint),
    ownerKeypair.publicKey
  );

  const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
  if (accountInfo === null) {
    transaction.add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(tokenMint),
        associatedTokenAddress,
        ownerKeypair.publicKey,
        ownerKeypair.publicKey
      )
    );
  }

  return associatedTokenAddress;
}

async function buyToken(senderPrivateKey, amountInSOL) {
  try {
    const senderSecretKey = Uint8Array.from(
      Buffer.from(senderPrivateKey, "hex")
    );
    const senderKeypair = Keypair.fromSecretKey(senderSecretKey);

    const poolKeys = await getPoolKeysFromApi();
    if (!poolKeys) {
      throw new Error("Invalid pool ID");
    }

    const transaction = new Transaction();

    const wSOLAccount = await createAssociatedTokenAccountIfNotExists(
      transaction,
      senderKeypair,
      WSOL_ADDRESS
    );

    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 150000,
    });

    transaction.add(computeBudgetInstruction);

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: wSOLAccount,
        lamports: amountInSOL * Math.pow(10, 9),
      }),
      Token.createSyncNativeInstruction(TOKEN_PROGRAM_ID, wSOLAccount)
    );

    const tokenOutAccount = await createAssociatedTokenAccountIfNotExists(
      transaction,
      senderKeypair,
      TOKEN_ADDRESS
    );

    const swap = await Liquidity.makeSwapFixedInInstruction({
      poolKeys: poolKeys[0],
      userKeys: {
        tokenAccountIn: wSOLAccount,
        tokenAccountOut: tokenOutAccount,
        owner: senderKeypair.publicKey,
      },
      amountIn: (amountInSOL * LAMPORTS_PER_SOL).toString(),
      minAmountOut: "0",
      fixedSide: "in",
      programId: RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    });

    transaction.add(...swap.innerTransaction.instructions);

    const closeAccountInstruction = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      wSOLAccount,
      senderKeypair.publicKey,
      senderKeypair.publicKey,
      []
    );

    transaction.add(closeAccountInstruction);

    let signature = await sendAndConfirmTransaction(connection, transaction, [
      senderKeypair,
      ...swap.innerTransaction.signers,
    ]);

    const confirmed = await connection.confirmTransaction(signature);
    console.log("Transaction confirmed:", confirmed);
  } catch (error) {
    console.error("Error swapping token:", error);
  }
}

async function sellToken(senderPrivateKey, amountToken) {
  try {
    const senderSecretKey = Uint8Array.from(
      Buffer.from(senderPrivateKey, "hex")
    );
    const senderKeypair = Keypair.fromSecretKey(senderSecretKey);

    const poolKeys = await getPoolKeysFromApi();
    if (!poolKeys) {
      throw new Error("Invalid pool ID");
    }

    const transaction = new Transaction();

    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 200000,
    });

    transaction.add(computeBudgetInstruction);

    const tokenInAccount = await createAssociatedTokenAccountIfNotExists(
      transaction,
      senderKeypair,
      TOKEN_ADDRESS
    );

    const tokenOutAccount = await createAssociatedTokenAccountIfNotExists(
      transaction,
      senderKeypair,
      WSOL_ADDRESS
    );

    const swap = await Liquidity.makeSwapFixedInInstruction({
      poolKeys: poolKeys[0],
      userKeys: {
        tokenAccountIn: tokenInAccount,
        tokenAccountOut: tokenOutAccount,
        owner: senderKeypair.publicKey,
      },
      amountIn: amountToken.toString(),
      minAmountOut: "0",
      fixedSide: "out",
      programId: RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    });

    const closeAccountInstruction = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      tokenOutAccount,
      senderKeypair.publicKey,
      senderKeypair.publicKey,
      []
    );
    transaction.add(...swap.innerTransaction.instructions);

    transaction.add(closeAccountInstruction);

    let signature = await sendAndConfirmTransaction(connection, transaction, [
      senderKeypair,
      ...swap.innerTransaction.signers,
    ]);

    const confirmed = await connection.confirmTransaction(signature);
    console.log("Transaction confirmed:", confirmed);
  } catch (error) {
    console.error("Error swapping token:", error);
  }
}

module.exports = { buyToken, sellToken, getBalanceSPL, unwrapSOL };
