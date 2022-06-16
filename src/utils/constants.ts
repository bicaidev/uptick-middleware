// +----------------------------------------------------------------------------
// | UptickLite is the community version of Uptick NFT marketpalce, including
// | three major components - service, api and web, powered by Uptick Network
// | and Loopring. It is available to the Uptick and Loopring dev community
// | through the open source license.
// | Uptick Network is a busienss grade NFT infrastructure for NFT applications
// | with multichian and interchain support. Loopring is a zkRollup layer2 on top
// | of Ethereum.
// +----------------------------------------------------------------------------
// | Copyright (c) 2022~2099 Uptick Network (https://uptick.network/)
// | All rights reserved.
// +----------------------------------------------------------------------------
// | Licensed ( https://www.gnu.org/licenses/gpl-3.0.en.html )
// +----------------------------------------------------------------------------
// | Author: Uptick Network development team tech@uptickproject.com
// +----------------------------------------------------------------------------
export const CROSS_TYPE = {
      NO_CROSS: -1,
      IRIS2BSC: 0,
      BSC2IRIS: 1,
};

export const ERR_MSG = {
      MINT_ERROR: {
            NO: -1001,
            MSG: "Mint error",
      },
      USER_APIKEY: {
            NO: -2001,
            MSG: "USER APIKEY error",
      },
      NFT_BALANCE: {
            NO: -3001,
            MSG: "NFT Balance error",
      },
      NFT_TRANSFER: {
            NO: -4001,
            MSG: "NFT transfer error",
      },
      NFT_ORDER: {
            NO: -4002,
            MSG: "NFT order error",
      },
      NFT_TRADE: {
            NO: -4003,
            MSG: "NFT trade error",
      },
      NFT_DETAIL: {
            NO: -4004,
            MSG: "NFT detail error",
      },
      NFT_CONTRACT: {
            NO: -4005,
            MSG: "NFT contract error",
      },
      NFT_HOLDER: {
            NO: -4006,
            MSG: "NFT holder error",
      },
      NFT_INFO: {
            NO: -4007,
            MSG: "NFT info error",
      },
      NFT_ORDER_FEE: {
            NO: -4008,
            MSG: "NFT order fee error",
      },
      NFT_FEE: {
            NO: -4009,
            MSG: "NFT fee error",
      },
      NFT_TRADE_VALIDATE: {
            NO: -4010,
            MSG: "NFT  validate trade error",
      },
      NFT_EXCHANE_ADDRESS: {
            NO: -4011,
            MSG: "NFT  exchange  exchangeAddress error",
      },
      BLOCK_INFO: {
            NO: -5005,
            MSG: "BLOCK  error",
      },
      USER_ACCOUNT: {
            NO: -6001,
            MSG: "user account  error",
      },
      USER_FEE: {
            NO: -6002,
            MSG: "user opration fee error",
      },
};

export const CHAIN_IDS = {
      IRIS_TETNET: "nyancat-8",
      IRIS_MAINNET: "irishub-1",
      BSC_TETNET: 97,
      BSC_MAINNET: 56,
};

export const IRIS_PARAMS = {
      TIMEOUT: 10000,
};

export const CROSS_STATUS = {
      START_DATA: 0,
      PACK_OK: 1,

      FROM_CHAIN_PENNDING: 2,
      FROM_CHAIN_OK: 3,

      CHAIN_CROSSING: 4,

      TO_CHAIN_PENNDING: 5,
      TO_CHAIN_OK: 6,

      FROM_CHAIN_ERROR: 7,
      TO_CHAIN_ERROR: 8,

      POST_SERVER_OK: 9,
};
