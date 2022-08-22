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
/* Imports: External */
import { BaseService } from "@eth-optimism/service-base";
import express, { json, Request, Response } from "express";
import cors from "cors";
import pino from "pino";
import { Logger } from "@eth-optimism/core-utils";

import { errResphonse, okResphonse, ERR_MSG } from "../../utils";
import { LRCHandler } from "../loopring/handler";

import Web3 from "web3";

const HDWalletProvider = require("@truffle/hdwallet-provider");

import { NacosNamingClient } from "nacos";
import {ConnectorNames} from "@loopring-web/loopring-sdk";

interface LrcConf {
      adminAddress: string;
      adminPRIV: string;
      chainId: number;
      infroUrl: string;
}

interface nacosConf {
      serverList: string;
      namespace: string;
}

export interface DataTransportServiceOptions {
      //host
      serverHost: string;
      serverPort: number;
      serverIp: string;
      serverName: string;
      nacosConf: nacosConf;
      lrcConf: LrcConf;
}

const isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"`;

export class DataTransportService extends BaseService<DataTransportServiceOptions> {
      protected name = "BiCai middlware Service";

      private lrcHandler: any;
      private flag: boolean = true;
      private nacosClient: NacosNamingClient = null;

      private state: {
            app: express.Express;
            server: any;
            lrcConf: LrcConf;
            nacosConf: nacosConf;
            adminWeb3: any;
      } = {} as any;

      protected async _init(): Promise<void> {
            //initialize App
            this._initializeApp();

            this.state.lrcConf = this.options.lrcConf;
            this.state.nacosConf = this.options.nacosConf;
            try {
                  const provider = new HDWalletProvider(
                        this.state.lrcConf.adminPRIV,
                        this.state.lrcConf.infroUrl
                  );

                  const adminWeb3 = new Web3(provider);
                  this.state.adminWeb3 = adminWeb3;

                  this.lrcHandler = new LRCHandler(
                        this.state.lrcConf.chainId,
                        this.logger
                  );

                  await this._nacos();
                  await this.lrcHandler.initAdminCount(
                        this.state.lrcConf.chainId,
                        adminWeb3
                  );
            } catch (error) {
                  if (this.nacosClient != null) {
                        this.nacosClient.deregisterInstance(
                              this.options.serverName,
                              {
                                    ip: this.options.serverHost,
                                    port: this.options.serverPort,
                              }
                        );
                  }

                  this.logger.error("initial error", error);
                  this.flag = false;
            }
      }

      protected async _start(): Promise<void> {
            this.state.server = this.state.app.listen(
                  this.options.serverPort,
                  this.options.serverIp
            );

            this.logger.info("Server started and listening", {
                  port: this.options.serverPort,
                  host: this.options.serverIp,
            });
      }

      protected async _stop(): Promise<void> {
            this.state.server.close((err) => {
                  console.log("server closed");
                  process.exit(err ? 1 : 0);
            });
      }

      async start() {
            if (this.running) {
                  return;
            }

            if (this.logger === undefined) {
                  this.logger = new Logger({ name: this.name });
                  this.logger.inner = new pino({
                        name: this.name,
                        prettyPrint: true,
                        timestamp: isoTime,
                  });
            }
            this.running = true;
            this.logger.info("Service is starting...");
            await super.init();
            if (this.flag != true) {
                  this.logger.info("service initial failed...");
                  process.exit(1);
                  //return;
            }

            await this._start();
            this.logger.info("Service has started");
      }

      /**
       * Initializes the server application.
       * Do any sort of initialization here that you want. Mostly just important that
       * `_registerAllRoutes` is called at the end.
       */
      private _initializeApp() {
            this.state.app = express();
            this.state.app.use(cors());
            this.state.app.use(json());
            this._registerAllRoutes();
      }
      /**
       * registry nacos
       *
       */

      private async _nacos() {
            const logger = console;
            this.nacosClient = new NacosNamingClient({
                  logger,
                  serverList: this.state.nacosConf.serverList,
                  namespace: this.state.nacosConf.namespace,
            });
            await this.nacosClient.ready();

            await this.nacosClient.registerInstance(this.options.serverName, {
                  ip: this.options.serverHost,
                  port: this.options.serverPort,
            });
      }

      /**
       * Registers a route on the server.
       * @param method Http method type.
       * @param route Route to register.
       * @param handler Handler called and is expected to return a JSON response.
       */
      private _registerRoute(
            method: string, // Just handle GET for now, but could extend this with whatever.
            route: string,
            handler: (req?: Request, res?: Response) => Promise<any>
      ): void {
            this.state.app[method](route, async (req, res) => {
                  const start = Date.now();
                  try {
                        const json = await handler(req, res);
                        const elapsed = Date.now() - start;

                        this.logger.info("Served HTTP Request", {
                              method: req.method,
                              url: req.url,
                              body: req.body,
                              res: json,
                              elapsed,
                        });

                        return res.json(json);
                  } catch (e) {
                        const elapsed = Date.now() - start;
                        this.logger.error("Failed HTTP Request", {
                              method: req.method,
                              url: req.url,
                              body: req.body,
                              elapsed,
                              msg: e.toString(),
                        });
                        return res.status(400).json({
                              error: e.toString(),
                        });
                  }
            });
      }

      /**
       * get the deposit raw transaction
       */
      private _registerAllRoutes(): void {
          this._registerRoute(
              "post",
              "/lrc/hello",
              async (req): Promise<any> => {
                    return okResphonse("HelloWorld");
              }
          ),
          this._registerRoute(
              "post",
              "/lrc/multMintNFT",
              async (req): Promise<any> => {
                  let params = req.body;
                  let owner: string = params.owner;
                  let nftBaseUri = params.nftBaseUri;
                  let tokenAddress: string = params.tokenAddress;
                  let royaltyPercentage: number = params.royaltyPercentage;
                  let royaltyAddress: string = params.royaltyAddress;

                  let exchangeInfo = await this.lrcHandler.getExchangeInfo();
                  let exchangeAddress = exchangeInfo.exchangeAddress;
                  console.log("exchangeAddress: " + exchangeAddress);

                  let account = await this.lrcHandler.getAccountInfo({owner:owner});
                  let accountId = account.accountId;
                  console.log("accountId: " + accountId);

                  let apiKey = await this.lrcHandler.getApiKey(accountId, "0x4be781c3697d35b4b6325b7204b5201712ca763e078fd5f60e591faeb3b5d2c")
                  console.log("apiKey: " + apiKey);

                  let nftOffchainFee = await this.lrcHandler.getNftFee(
                      {
                          accountId: accountId,
                          tokenAddress: tokenAddress,
                          requestType: 9,
                      },
                      apiKey
                  );
                  console.log("nftOffchainFee: " + nftOffchainFee.fees["ETH"].fee);

                  let nftIdList = params.nftIdList;
                  for (let i = 0; i < nftIdList.length; i++) {
                      let nftId = nftIdList[i].nftId;
                      let amount = nftIdList[i].amount;
                      console.log("nftIdList: " + nftId + "," + amount)

                      let storageId = await this.lrcHandler.getNextStorageId(accountId, 0, apiKey)
                      console.log("storageId: " + storageId.offchainId);

                      let reqs = {
                          // nftbaseUri 不能变
                          counterFactualNftInfo: {
                              nftFactory: "0xAE9826cc753a1B3eb81Ec64Ac1Ff007Ef8f3841C",
                              nftOwner: owner,
                              nftBaseUri: "https://realrare.io/#/collection/" + nftBaseUri,
                          },
                          exchange: exchangeAddress,
                          minterId: accountId,
                          minterAddress: owner,
                          toAccountId: accountId,
                          toAddress: owner,
                          nftType: 0,
                          tokenAddress: tokenAddress,
                          nftId: nftId, //nftId.toString(16),
                          amount: amount,
                          validUntil: Math.round(Date.now() / 1000) + 30 * 86400,
                          storageId: storageId.offchainId,
                          maxFee: {
                              tokenId: 0,
                              amount: 217000000000000,
                              //amount: "6810000000000000000"
                          },
                          royaltyPercentage: royaltyPercentage,
                          royaltyAddress: royaltyAddress,
                          forceToMint: false, // suggest use as false, for here is just for run test
                      };

                      console.log(JSON.stringify(reqs));

                      let response = await this.lrcHandler.submitNFTMint(
                          reqs,
                          this.state.adminWeb3,
                          this.state.lrcConf.chainId,
                          ConnectorNames.WalletConnect,
                          "0x4be781c3697d35b4b6325b7204b5201712ca763e078fd5f60e591faeb3b5d2c",
                          apiKey
                      );

                      console.log("🚀 ~ file: handler.js ~ line 493 ~ LRCHandler ~ response", response)
                  }

                  return okResphonse("Hello");
              }
          ),

            /**
             * @description             get key pair message from address
             * @param fromAddress       address to get message
             */
            this._registerRoute(
                  "post",
                  "/lrc/getKeyPairMsg",
                  async (req): Promise<any> => {
                        let params = req.body;
                        let address = params.address;
                        try {
                              const keySeed =
                                    await this.lrcHandler.getKeyPairMsg(
                                          address
                                    );
                              return okResphonse(keySeed);
                        } catch (reason) {
                              return errResphonse(
                                    ERR_MSG.MINT_ERROR.NO,
                                    ERR_MSG.MINT_ERROR.MSG
                              );
                        }
                  }
            ),
                  /**
                   * @description             get update account message
                   * @param keyPairSignature  keypair signature from getKeyPairMsg api
                   * @param fromAddress       address to get account message
                   */
                  this._registerRoute(
                        "post",
                        "/lrc/getUpdateAccountMsg",
                        async (req): Promise<any> => {
                              let params = req.body;
                              let keyPairSignature = params.keyPairSignature;
                              let fromAddress = params.fromAddress;

                              try {
                                    let msg =
                                          await this.lrcHandler.getUpdateAccountMsg(
                                                fromAddress,
                                                keyPairSignature,
                                                this.state.lrcConf.chainId
                                          );
                                    return okResphonse(msg);
                              } catch (reason) {
                                    console.log(reason);
                                    return errResphonse(
                                          ERR_MSG.MINT_ERROR.NO,
                                          ERR_MSG.MINT_ERROR.MSG
                                    );
                              }
                        }
                  );

            /**
             * @description             send update account to loorping layer2
             * @param ecdsaSignature    ecdsaSignature for update account
             * @param keyPairSignature  key pair signature
             * @param fromAddress       from address update account
             */
            this._registerRoute(
                  "post",
                  "/lrc/sendUpdateAccount",
                  async (req): Promise<any> => {
                        let params = req.body;

                        let fromAddress = params.fromAddress;
                        let keyPairSignature = params.keyPairSignature;
                        let ecdsaSignature = params.ecdsaSignature;

                        try {
                              let resultTx =
                                    await this.lrcHandler.sendUpdateAccount(
                                          fromAddress,
                                          keyPairSignature,
                                          ecdsaSignature,
                                          this.state.lrcConf.chainId
                                    );
                              return okResphonse(resultTx);
                        } catch (reason) {
                              console.log(reason);
                              return errResphonse(
                                    ERR_MSG.MINT_ERROR.NO,
                                    ERR_MSG.MINT_ERROR.MSG
                              );
                        }
                  }
            ),
                  /**
                   * @description             get user apiKey
                   * @param fromAddress       address to get use apiKey
                   * @param keyPairSignature  keypair signature
                   */
                  this._registerRoute(
                        "post",
                        "/lrc/userApiKey",
                        async (req): Promise<any> => {
                              let params = req.body;
                              let keyPairSignature = params.keyPairSignature;
                              let fromAddress = params.fromAddress;

                              try {
                                    const apiKey =
                                          await this.lrcHandler.getUserApiKey(
                                                fromAddress,
                                                keyPairSignature
                                          );
                                    if (apiKey == null || apiKey == "") {
                                          return errResphonse(
                                                ERR_MSG.USER_APIKEY.NO,
                                                ERR_MSG.USER_APIKEY.MSG
                                          );
                                    }
                                    return okResphonse(apiKey);
                              } catch (reason) {
                                    console.log(reason);
                                    return errResphonse(
                                          ERR_MSG.USER_APIKEY.NO,
                                          ERR_MSG.USER_APIKEY.MSG
                                    );
                              }
                        }
                  ),
                  /**
                   * @description            get nft Balances
                   * @param fromAddress      nft owner
                   * @param apiKey           api key of the account
                   * @param offset         number of records to skip
                   * @param limit          number of records to return
                   */
                  // 改造 查询单个
                  this._registerRoute(
                        "post",
                        "/lrc/getNftBalances",
                        async (req): Promise<any> => {
                              let params = req.body;
                              let fromAddress = params.fromAddress;

                              this.logger.info("lrc/getNftBalances 2");
                              try {
                                    let offset = params.hasOwnProperty("offset")
                                          ? params.offset
                                          : 0;
                                    let limit = params.hasOwnProperty("limit")
                                          ? params.limit
                                          : 20;

                                    let quiry = {
                                          offset,
                                          limit,
                                          ...params,
                                    };

                                    delete quiry.fromAddress;
                                    let response =
                                          await this.lrcHandler.getNftBalances(
                                                fromAddress,
                                                quiry
                                          );

                                    return okResphonse(response.data);
                              } catch (reason) {
                                    console.log(reason);
                                    return errResphonse(
                                          ERR_MSG.NFT_BALANCE.NO,
                                          ERR_MSG.NFT_BALANCE.MSG
                                    );
                              }
                        }
                  ),
                  /**
                   * @description            get Transfer NftTx
                   * @param fromAddress      nft owner
                   * @param toAddress        to address of nft
                   * @param amount           amount of 1155
                   * @param nftId            nftId to send
                   * @param keyPairSignature keyPair sig
                   */
                  this._registerRoute(
                        "post",
                        "/lrc/getTransferNftTx",
                        async (req): Promise<any> => {
                              let params = req.body;
                              let fromAddress = params.fromAddress;
                              let toAddress = params.toAddress;
                              let amount = params.amount;
                              let nftId = params.nftId;
                              let keyPairSignature = params.keyPairSignature;

                              try {
                                    let response =
                                          await this.lrcHandler.getTransferNftTx(
                                                fromAddress,
                                                toAddress,
                                                nftId,
                                                amount,
                                                keyPairSignature,
                                                this.state.lrcConf.chainId
                                          );
                                    return okResphonse(response);
                              } catch (reason) {
                                    this.logger.error(reason);
                                    return errResphonse(
                                          ERR_MSG.NFT_TRANSFER.NO,
                                          ERR_MSG.NFT_TRANSFER.MSG
                                    );
                              }
                        }
                  );

            /**
             * @description transfer nft
             * @param fromAddress      nft owner
             * @param toAddress        to address of nft
             * @param amount           amount of 1155
             * @param nftId            nftId to send
             * @param keyPairSignature keyPair sig
             * @param ecdsaSignature   ecdsa Signature
             */
            this._registerRoute(
                  "post",
                  "/lrc/transferNFT",
                  async (req): Promise<any> => {
                        let params = req.body;
                        let fromAddress = params.fromAddress;
                        let toAddress = params.toAddress;
                        let amount = params.amount;
                        let nftId = params.nftId;
                        let keyPairSignature = params.keyPairSignature;
                        let ecdsaSignature = params.ecdsaSignature;

                        try {
                              this.logger.info(" service transferNFT");
                              let response =
                                    await this.lrcHandler.sendTransferNFT(
                                          fromAddress,
                                          toAddress,
                                          nftId,
                                          amount,
                                          keyPairSignature,
                                          ecdsaSignature,
                                          this.state.lrcConf.chainId
                                    );
                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_TRANSFER.NO,
                                    ERR_MSG.NFT_TRANSFER.MSG
                              );
                        }
                  }
            );

            /**
             * @description             get nft trade order
             * @param fromAddress       address of nft
             * @param keyPairSignature  keypair signature
             * @param isSell            true:is sell order;order buy order
             * @param nftId             nftId to send
             * @param nftAmount         nft amount for trade
             * @param tokenId           tokenId for trade
             *                          "0": "ETH",
             *                          "1": "LRC",
             *                          "2": "USDT",
             *                          "4": "LP-LRC-ETH",
             *                          "6": "DAI",
             *                          "7": "LP-ETH-USDT",
             *                          "8": "USDC",
             *                          "9": "LP-USDC-ETH",
             * @param tokenAmount       token amount for trade
             */
            this._registerRoute(
                  "post",
                  "/lrc/getNftOrder",
                  async (req): Promise<any> => {
                        let params = req.body;
                        let address = params.address;
                        let keyPairSignature = params.keyPairSignature;
                        let isSell = params.isSell;
                        let nftId = params.nftId;
                        let nftAmount = params.nftAmount;
                        let tokenId = params.tokenId;
                        let tokenAmount = params.tokenAmount;

                        try {
                              this.logger.info("service getNftOrder");
                              let response = await this.lrcHandler.getNftOrder(
                                    address,
                                    keyPairSignature,
                                    isSell,
                                    nftId,
                                    nftAmount,
                                    tokenId,
                                    tokenAmount,
                                    this.state.lrcConf.chainId
                              );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_ORDER.NO,
                                    ERR_MSG.NFT_ORDER.MSG
                              );
                        }
                  }
            );

            /**
             * @description                           submit the nft trade to platform
             * @param makerOrder                      maker Order for trade
             * @param makerOrderEddsaSignature        maker Order EddsaSignature for trade
             * @param makerFeeBips                    makerFeeBips for trade
             * @param takerOrder                      taker Order for trade
             * @param takerOrderEddsaSignature        taker Order EddsaSignature for trade
             * @param takerFeeBips                    takerFeeBips for trade
             */
            this._registerRoute(
                  "post",
                  "/lrc/tradeNFT",
                  async (req): Promise<any> => {
                        let params = req.body;

                        let makerOrder = params.makerOrder;
                        let makerOrderEddsaSignature =
                              params.makerOrderEddsaSignature;
                        let makerFeeBips = params.makerFeeBips;
                        let takerOrder = params.takerOrder;
                        let takerOrderEddsaSignature =
                              params.takerOrderEddsaSignature;
                        let takerFeeBips = params.takerFeeBips;

                        try {
                              this.logger.info("lrc/tradeNFT param : ", [
                                    makerOrder,
                                    makerOrderEddsaSignature,
                                    makerFeeBips,
                                    takerOrder,
                                    takerOrderEddsaSignature,
                                    takerFeeBips,
                                    this.state.lrcConf.chainId,
                              ]);

                              let response = await this.lrcHandler.tradeNFT(
                                    makerOrder,
                                    makerOrderEddsaSignature,
                                    makerFeeBips,
                                    takerOrder,
                                    takerOrderEddsaSignature,
                                    takerFeeBips,
                                    this.state.lrcConf.chainId
                              );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_TRADE.NO,
                                    ERR_MSG.NFT_TRADE.MSG
                              );
                        }
                  }
            );

            /**
             * @description  getNftInfoFromId
             * @param nftId  nftId for the nftInfo
             */
            this._registerRoute(
                  "post",
                  "/lrc/getNftDetailFromNftId",
                  async (req): Promise<any> => {
                        let params = req.body;
                        let nftId = params.nftId;
                        let fromAddress = params.fromAddress;
                        try {
                              this.logger.info("service getNftDetailFromNftId");
                              let response =
                                    await this.lrcHandler.getNftDetailFromNftId(
                                          fromAddress,
                                          nftId
                                    );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_DETAIL.NO,
                                    ERR_MSG.NFT_DETAIL.MSG
                              );
                        }
                  }
            );

            /**
             * @description  get l2 block info by block id to anylse nft data
             * @param id  blockId for block
             */
            this._registerRoute(
                  "post",
                  "/lrc/getBlock",
                  async (req): Promise<any> => {
                        let params = req.body;

                        try {
                              let response = await this.lrcHandler.getBlock(
                                    params
                              );
                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.BLOCK_INFO.NO,
                                    ERR_MSG.BLOCK_INFO.MSG
                              );
                        }
                  }
            ),
                  /**
                   * @description  get nft info by nftdatas, maxsize in 50
                   * @param ntfdatas  array of nftdata  using ["xxx", "xxx"]
                   */
                  this._registerRoute(
                        "post",
                        "/lrc/getNftInfo",
                        async (req): Promise<any> => {
                              let params = req.body;

                              try {
                                    let response =
                                          await this.lrcHandler.getNftInfo(
                                                params
                                          );
                                    return okResphonse(response);
                              } catch (reason) {
                                    this.logger.error(reason);
                                    return errResphonse(
                                          ERR_MSG.NFT_INFO.NO,
                                          ERR_MSG.NFT_INFO.MSG
                                    );
                              }
                        }
                  );
            /**
             * @description post     query nft holders by looprings nftData
             * @param nftData        the Loopring's NFT token data identifier which is a hash string of NFT token address and NFT_ID
             * @param offset         number of records to skip
             * @param limit          number of records to return
             */
            this._registerRoute(
                  "post",
                  "/lrc/getNftHolders",
                  async (req): Promise<any> => {
                        console.log("lrc/getNftHolders ");
                        let params = req.body;

                        try {
                              let offset = params.hasOwnProperty("offset")
                                    ? params.offset
                                    : 0;
                              let limit = params.hasOwnProperty("limit")
                                    ? params.limit
                                    : 100;

                              let quiry = {
                                    offset,
                                    limit,
                                    ...params,
                              };

                              let response =
                                    await this.lrcHandler.getNftHolders(quiry);

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_HOLDER.NO,
                                    ERR_MSG.NFT_HOLDER.MSG
                              );
                        }
                  }
            ),
                  /**
                   * @description post      get account detail information
                   * @param accountId       accountID, if owner is presented, it must be align with the owners accountId, otherwise an error occurs.
                   */
                  this._registerRoute(
                        "post",
                        "/lrc/getAccount",
                        async (req): Promise<any> => {
                              let params = req.body;

                              try {
                                    let quiry = {
                                          ...params,
                                    };

                                    let response =
                                          await this.lrcHandler.getAccountInfo(
                                                quiry
                                          );

                                    return okResphonse(response);
                              } catch (reason) {
                                    this.logger.error(reason);
                                    return errResphonse(
                                          ERR_MSG.USER_ACCOUNT.NO,
                                          ERR_MSG.USER_ACCOUNT.MSG
                                    );
                              }
                        }
                  );

            /**
             * @description query  user operation fee
             * @param accountId
             * @param requestType ['0:ORDER', '1:OFFCHAIN_WITHDRAWAL', '2:UPDATE_ACCOUNT', '3:TRANSFER', '4:FAST_OFFCHAIN_WITHDRAWAL', '5:OPEN_ACCOUNT', '6:AMM_EXIT', '7:DEPOSIT', '8:AMM_JOIN', '15:TRANSFER_AND_UPDATE_ACCOUNT']
             */

            this._registerRoute(
                  "post",
                  "/lrc/getUserFee",
                  async (req): Promise<any> => {
                        let params = req.body;

                        try {
                              let response = await this.lrcHandler.getUserFee(
                                    params
                              );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.USER_FEE.NO,
                                    ERR_MSG.USER_FEE.MSG
                              );
                        }
                  }
            );

            /**
             * @description get fee rate of users placing orders
             * @param accountId
             * @param nftTokenAddress NFT token address of order
             * @param quoteToken
             * @param quoteAmount
             */
            this._registerRoute(
                  "post",
                  "/lrc/nftOrderFee",
                  async (req): Promise<any> => {
                        try {
                              let params = req.body;
                              let response =
                                    await this.lrcHandler.getNftOrderFee(
                                          params
                                    );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_ORDER_FEE.NO,
                                    ERR_MSG.NFT_ORDER_FEE.MSG
                              );
                        }
                  }
            );

            /**
             * @description get fee rate of users placing orders
             * @param accountId
             * @param requestType ['9:NFT_MINT', '10:NFT_WITHDRAWAL', '11:NFT_TRANSFER', '13:DEPLOY_TOKENADDRESS', '19:NFT_TRANSFER_AND_UPDATE_ACCOUNT']
             * @tokenAddress need address if NFT_MINT and  NFT_WITHDRAWAL
             *
             */
            this._registerRoute(
                  "post",
                  "/lrc/nftFee",
                  async (req): Promise<any> => {
                        try {
                              let params = req.body;
                              let response = await this.lrcHandler.getNftFee(
                                    params
                              );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_FEE.NO,
                                    ERR_MSG.NFT_FEE.MSG
                              );
                        }
                  }
            );

            /**
             * @description nft transaction history
             * @param accountId
             * @types Optional default is "mint,deposit,transfer,deploy,onchain_withdrawal,offchain_withdrawal", you  can use one or more of them
             * @offset Optional Offset number
             * @limit  default 50
             * @nftdata optional nft datas, separate by ","
             */
            this._registerRoute(
                  "post",
                  "/lrc/nftTransactions",
                  async (req): Promise<any> => {
                        try {
                              let params = req.body;
                              let response =
                                    await this.lrcHandler.getNftTransactions(
                                          params
                                    );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_TRANSFER.NO,
                                    ERR_MSG.NFT_TRANSFER.MSG
                              );
                        }
                  }
            );

            /**
             * @description get nft trade history
             * @param accountId
             * @param orderHash Optional  NFT order hash
             * @nftdata optional the nftData of the NFT token
             * @limit Optional Number of records to return
             */
            this._registerRoute(
                  "post",
                  "/lrc/nftTrades",
                  async (req): Promise<any> => {
                        try {
                              let params = req.body;
                              let response = await this.lrcHandler.getNftTrade(
                                    params
                              );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_TRADE.NO,
                                    ERR_MSG.NFT_TRADE.MSG
                              );
                        }
                  }
            );

            /**
             * @description get exchange info
             *
             */
            this._registerRoute(
                  "post",
                  "/lrc/exchangeAddress",
                  async (req): Promise<any> => {
                        try {
                              const exchangeInfo =
                                    await this.lrcHandler.getExchangeInfo();
                              return okResphonse(exchangeInfo);
                        } catch (error) {
                              this.logger.error(error);
                              return errResphonse(
                                    ERR_MSG.NFT_EXCHANE_ADDRESS.NO,
                                    ERR_MSG.NFT_EXCHANE_ADDRESS.MSG
                              );
                        }
                  }
            );

            /**
             * @description validate a NFT order
             * @param exchange
             * @param accountId
             * @param storageId
             * @param sellToken
             * @param buyToken
             * @param validUntil
             * @param maxFeeBips
             */
            this._registerRoute(
                  "post",
                  "/lrc/nftVaidateTrade",
                  async (req): Promise<any> => {
                        try {
                              let params = req.body;
                              let response =
                                    await this.lrcHandler.validateNFTOrder(
                                          params,
                                          this.state.lrcConf.chainId
                                    );

                              return okResphonse(response);
                        } catch (reason) {
                              this.logger.error(reason);
                              return errResphonse(
                                    ERR_MSG.NFT_TRADE_VALIDATE.NO,
                                    ERR_MSG.NFT_TRADE_VALIDATE.MSG
                              );
                        }
                  }
            );
      }
}
