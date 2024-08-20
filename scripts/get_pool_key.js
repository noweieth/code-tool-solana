const { PublicKey } = require("@solana/web3.js");
const {
  Liquidity,
  TokenAmount,
  LIQUIDITY_VERSION_TO_STATE_LAYOUT,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  getMultipleAccountsInfo,
  Market,
} = require("@raydium-io/raydium-sdk");

async function fetchAllPoolKeysQuote(connection, quote, programId, config) {
  const allPools = (
    await Promise.all(
      Object.entries(LIQUIDITY_VERSION_TO_STATE_LAYOUT).map(
        ([version, layout]) => {
          try {
            return connection
              .getProgramAccounts(programId[Number(version)], {
                filters: [
                  { dataSize: layout.span },
                  {
                    memcmp: {
                      offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
                      bytes: quote.toString(),
                    },
                  },
                ],
              })
              .then((accounts) => {
                return accounts.map((info) => {
                  return {
                    id: info.pubkey,
                    version: Number(version),
                    programId: programId[Number(version)],
                    ...layout.decode(info.account.data),
                  };
                });
              });
          } catch (error) {
            if (error instanceof Error) {
              console.log("failed to fetch pool info", {
                message: error.message,
              });
            }
          }
        }
      )
    )
  ).flat();

  const allMarketIds = allPools.map((i) => i.marketId);
  const marketsInfo = {};
  try {
    const _marketsInfo = await getMultipleAccountsInfo(
      connection,
      allMarketIds,
      config
    );
    for (const item of _marketsInfo) {
      if (item === null) continue;

      const _i = {
        programId: item.owner,
        ...MARKET_STATE_LAYOUT_V3.decode(item.data),
      };
      marketsInfo[_i.ownAddress.toString()] = _i;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("failed to fetch markets", {
        message: error.message,
      });
    }
  }

  const authority = {};
  for (const [version, _programId] of Object.entries(programId))
    authority[version] = Liquidity.getAssociatedAuthority({
      programId: _programId,
    }).publicKey;

  const formatPoolInfos = [];
  for (const pool of allPools) {
    if (pool === undefined) continue;
    if (pool.baseMint.equals(PublicKey.default)) continue;
    const market = marketsInfo[pool.marketId.toString()];

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const marketProgramId = market.programId;

    formatPoolInfos.push({
      id: pool.id,
      baseMint: pool.baseMint,
      quoteMint: pool.quoteMint,
      lpMint: pool.lpMint,
      baseDecimals: pool.baseDecimal.toNumber(),
      quoteDecimals: pool.quoteDecimal.toNumber(),
      lpDecimals:
        pool.id.toString() === "6kmMMacvoCKBkBrqssLEdFuEZu2wqtLdNQxh9VjtzfwT"
          ? 5
          : pool.baseDecimal.toNumber(),
      version: pool.version,
      programId: pool.programId,
      authority: authority[pool.version],
      openOrders: pool.openOrders,
      targetOrders: pool.targetOrders,
      baseVault: pool.baseVault,
      quoteVault: pool.quoteVault,
      marketVersion: 3,
      marketProgramId,
      marketId: market.ownAddress,
      marketAuthority: Market.getAssociatedAuthority({
        programId: marketProgramId,
        marketId: market.ownAddress,
      }).publicKey,
      marketBaseVault: market.baseVault,
      marketQuoteVault: market.quoteVault,
      marketBids: market.bids,
      marketAsks: market.asks,
      marketEventQueue: market.eventQueue,
      ...(pool.version === 5
        ? {
            modelDataAccount: pool.modelDataAccount,
            withdrawQueue: PublicKey.default,
            lpVault: PublicKey.default,
          }
        : {
            withdrawQueue: pool.withdrawQueue,
            lpVault: pool.lpVault,
          }),
      lookupTableAccount: PublicKey.default,
    });
  }
  return formatPoolInfos;
}

async function fetchAllPoolKeysBase(connection, base, programId, config) {
  const allPools = (
    await Promise.all(
      Object.entries(LIQUIDITY_VERSION_TO_STATE_LAYOUT).map(
        ([version, layout]) => {
          try {
            return connection
              .getProgramAccounts(programId[Number(version)], {
                filters: [
                  { dataSize: layout.span },
                  {
                    memcmp: {
                      offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
                      bytes: base.toString(),
                    },
                  },
                ],
              })
              .then((accounts) => {
                return accounts.map((info) => {
                  return {
                    id: info.pubkey,
                    version: Number(version),
                    programId: programId[Number(version)],
                    ...layout.decode(info.account.data),
                  };
                });
              });
          } catch (error) {
            if (error instanceof Error) {
              console.log("failed to fetch pool info", {
                message: error.message,
              });
            }
          }
        }
      )
    )
  ).flat();

  const allMarketIds = allPools.map((i) => i.marketId);
  const marketsInfo = {};
  try {
    const _marketsInfo = await getMultipleAccountsInfo(
      connection,
      allMarketIds,
      config
    );
    for (const item of _marketsInfo) {
      if (item === null) continue;

      const _i = {
        programId: item.owner,
        ...MARKET_STATE_LAYOUT_V3.decode(item.data),
      };
      marketsInfo[_i.ownAddress.toString()] = _i;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("failed to fetch markets", {
        message: error.message,
      });
    }
  }

  const authority = {};
  for (const [version, _programId] of Object.entries(programId))
    authority[version] = Liquidity.getAssociatedAuthority({
      programId: _programId,
    }).publicKey;

  const formatPoolInfos = [];
  for (const pool of allPools) {
    if (pool === undefined) continue;
    if (pool.baseMint.equals(PublicKey.default)) continue;
    const market = marketsInfo[pool.marketId.toString()];

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const marketProgramId = market.programId;

    formatPoolInfos.push({
      id: pool.id,
      baseMint: pool.baseMint,
      quoteMint: pool.quoteMint,
      lpMint: pool.lpMint,
      baseDecimals: pool.baseDecimal.toNumber(),
      quoteDecimals: pool.quoteDecimal.toNumber(),
      lpDecimals:
        pool.id.toString() === "6kmMMacvoCKBkBrqssLEdFuEZu2wqtLdNQxh9VjtzfwT"
          ? 5
          : pool.baseDecimal.toNumber(),
      version: pool.version,
      programId: pool.programId,
      authority: authority[pool.version],
      openOrders: pool.openOrders,
      targetOrders: pool.targetOrders,
      baseVault: pool.baseVault,
      quoteVault: pool.quoteVault,
      marketVersion: 3,
      marketProgramId,
      marketId: market.ownAddress,
      marketAuthority: Market.getAssociatedAuthority({
        programId: marketProgramId,
        marketId: market.ownAddress,
      }).publicKey,
      marketBaseVault: market.baseVault,
      marketQuoteVault: market.quoteVault,
      marketBids: market.bids,
      marketAsks: market.asks,
      marketEventQueue: market.eventQueue,
      ...(pool.version === 5
        ? {
            modelDataAccount: pool.modelDataAccount,
            withdrawQueue: PublicKey.default,
            lpVault: PublicKey.default,
          }
        : {
            withdrawQueue: pool.withdrawQueue,
            lpVault: pool.lpVault,
          }),
      lookupTableAccount: PublicKey.default,
    });
  }
  return formatPoolInfos;
}

module.exports = { fetchAllPoolKeysQuote, fetchAllPoolKeysBase };
