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
import { LoopringAPI, TOKEN_INFO, LOOPRING_EXPORTED_SETTING } from "./const";

import {
      AccountInfo,
      ExchangeInfo,
      SigSuffix,
      GetUserApiKeyRequest,
} from "@loopring-web/loopring-sdk";

// 自定义的api todo
import { getDeposit, UserExtendAPI } from "../../loopringSDK";

import { ChainId } from "@loopring-web/loopring-sdk";
import * as sdk from "@loopring-web/loopring-sdk";

import EdDSA from "@loopring-web/loopring-sdk";
import * as fm from "@loopring-web/loopring-sdk";
import { toBig, toHex } from "@loopring-web/loopring-sdk";
import * as ethUtil from "ethereumjs-util";
import Web3 from "web3";
import { utils, BigNumber } from "ethers";
import { EDDSAUtil } from "./sign/EDDSAUtil";
import { bnToBufWithFixedLength } from "./sign/eddsa";

import axios from "axios";
// import BigNumber from "bignumber.js";
// goerli
const baseRprUrltest = "https://uat2.loopring.io/";
const baseRprUrl = "https://api3.loopring.io/";
let userExtendApi: UserExtendAPI;

export class LRCHandler {
      private adminWeb3: any;
      private adminExchangeAddress: string;
      private adminAccInfo: AccountInfo;

      private adminNftTokenAddress: string;
      private adminStorageId: any;
      private adminFee: any;
      private adminCounterFactualNftInfo: any;
      private adminEddsaKey: any;
      private adminApiKey: string;
      private logger: any;
      /**
       * @description             init
       * @param address           chaiId of the service
       */
      /**
       * name
       */
      public constructor(chainId: number, logger: any) {
            userExtendApi = new UserExtendAPI({ chainId });
            this.logger = logger;
      }

      public async initAdminCount(chainId: number, adminWeb3: any) {
            this.adminWeb3 = adminWeb3;
            let adminObj = await this.getAminDetailByAddress(
                  adminWeb3,
                  chainId
            );

            this.adminExchangeAddress = adminObj.exchangeAddress;
            this.adminAccInfo = adminObj.accInfo;
            this.adminNftTokenAddress = adminObj.nftTokenAddress;
            this.adminStorageId = adminObj.storageId;
            this.adminFee = adminObj.fee;
            this.adminCounterFactualNftInfo = adminObj.counterFactualNftInfo;
            this.adminEddsaKey = adminObj.eddsaKey;
            this.adminApiKey = adminObj.apiKey;
            this.logger.info("init admincount", {
                  adminObj: adminObj,
            });
      }

      /**
       * @description             getAccount
       * @param address           address from account info
       * @returns                 {Promise<AccountInfo>}
       */
      public async getKeyPairMsg(address: string): Promise<any> {
            try {
                  //1. get exchange Info
                  console.log("****1.get exchange Info");
                  const exchangeInfo = await this.getExchangeInfo();
                  let exchangeAddress = exchangeInfo.exchangeAddress;

                  //2. get address nonce
                  console.log("****2.get address nonce ");
                  const accInfo = await this.getAccount(address);

                  //3. get keySeed
                  const keySeed = this.getKeySeed(accInfo, exchangeAddress);

                  return keySeed;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description             getAccount    api docs
       * @param address           address from account info
       * @returns                 {Promise<AccountInfo>}
       */
      public async getAccount(address: string): Promise<AccountInfo> {
            try {
                  const { accInfo } = await LoopringAPI.exchangeAPI.getAccount({
                        owner: address,
                  });

                  if (!accInfo) {
                        return null;
                  }
                  return accInfo;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description             getExchangeInfo  api docs
       * @returns                 {Promise<ExchangeInfo>}
       */
      public async getExchangeInfo(): Promise<ExchangeInfo> {
            try {
                  const { exchangeInfo } =
                        await LoopringAPI.exchangeAPI.getExchangeInfo();
                  return exchangeInfo;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description getDeposit
       * @param from              from address to deposit
       * @param exchangeAddress   exhange address
       * @param value             depoist value unit ETH
       * @param fee               deposit fee unit Wei
       * @param gasPrice          gasPrice unit GWei
       * @param gasLimit          gasLimit for evm contract run
       * @param chainId           chainId for the env
       * @param nonce             account nonce
       * @returns {Promise.<*>}
       */
      public async getDeposit(
            from: string,
            exchangeAddress: string,
            value: number,
            fee: number,
            gasPrice: number,
            gasLimit: number,
            chainId: ChainId,
            nonce: number
      ): Promise<any> {
            try {
                  // LoopringAPI.nftAPI.depositNFT();
                  // todo
                  return await getDeposit(
                        from,
                        exchangeAddress,
                        TOKEN_INFO.tokenMap.ETH,
                        value,
                        fee,
                        gasPrice,
                        gasLimit,
                        chainId,
                        nonce
                  );
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description getKeySeed
       * @param accInfo           account information
       * @param exchangeAddress   exhange address
       * @returns keySeed
       */
      private getKeySeed(accInfo: AccountInfo, exchangeAddress: string) {
            const keySeed =
                  accInfo.keySeed && accInfo.keySeed !== ""
                        ? accInfo.keySeed
                        : sdk.GlobalAPI.KEY_MESSAGE.replace(
                                "${exchangeAddress}",
                                exchangeAddress
                          ).replace("${nonce}", accInfo.nonce.toString());

            return keySeed;
      }

      /**
       * @description getUpdateAccountMsg
       * @param fromAddress       update account address
       * @param keyPairSignature  keyPair sig
       * @param chainId           chainId for env
       * @returns {Promise.<*>}
       */
      public async getUpdateAccountMsg(
            fromAddress: string,
            keyPairSignature: string,
            chainId: number
      ): Promise<any> {
            try {
                  //1.get get Update Account RequestV3
                  let request = await this.getUpdateAccountRequestV3(
                        fromAddress,
                        keyPairSignature,
                        chainId
                  );
                  //2.get UpdateAccount Msg
                  const msg = await userExtendApi.getUpdateAccountMsg(
                        request,
                        chainId
                  );
                  return msg;
            } catch (reason) {
                  return reason;
            }
      }

      /**
       * @description sendUpdateAccount
       * @param fromAddress       update account address
       * @param keyPairSignature  keyPair signature
       * @param ecdsaSignature    ecdsa   signature
       * @param chainId           chainId for env
       * @returns {Promise.<*>}
       */
      public async sendUpdateAccount(
            fromAddress: string,
            keyPairSignature: string,
            ecdsaSignature: string,
            chainId: number
      ): Promise<any> {
            //1.get get Update Account RequestV3
            let request = await this.getUpdateAccountRequestV3(
                  fromAddress,
                  keyPairSignature,
                  chainId
            );

            //2.get UpdateAccount Msg
            const resultTx = await userExtendApi.sendUpdateAccount(
                  request,
                  this.addSigSuffix(ecdsaSignature)
            );
            return resultTx;
      }

      /**
       * @description addSigSuffix
       * @param ecdsaSignature    ecdsa signature
       * @returns ecdsaSignature + Suffix
       */
      private addSigSuffix(ecdsaSignature: string) {
            return ecdsaSignature + SigSuffix.Suffix03;
      }

      /**
       * @description getUpdateAccountRequestV3
       * @param fromAddress       update account address
       * @param keyPairSignature  keyPair signation
       * @returns {Promise.<*>}
       */
      public async getUpdateAccountRequestV3(
            fromAddress: string,
            keyPairSignature: string,
            chainId: number
      ): Promise<any> {
            //1.0 get Account detail
            const { exchangeInfo, accInfo, eddsaKey, fee, keySeed } =
                  await this.getAccountDetail(
                        fromAddress,
                        keyPairSignature,
                        chainId
                  );

            //2. set requst data
            const request = {
                  exchange: exchangeInfo.exchangeAddress,
                  owner: accInfo.owner,
                  accountId: accInfo.accountId,
                  publicKey: { x: eddsaKey.formatedPx, y: eddsaKey.formatedPy },
                  maxFee: {
                        tokenId: TOKEN_INFO.tokenMap["LRC"].tokenId,
                        volume: fee.fees["LRC"].fee ?? "9400000000000000000",
                  },
                  keySeed,
                  validUntil: LOOPRING_EXPORTED_SETTING.validUntil,
                  nonce: accInfo.nonce as number,
            };

            return request;
      }

      /**
       * @description getAccountDetail   api docs
       * @param fromAddress       update account address
       * @param keyPairSignature  keyPair signation
       * @param chainId           chainId for env
       * @param tokenId           tokenId of the from address
       * @returns {Promise.<*>}
       */
      private async getAccountDetail(
            fromAddress: string,
            keyPairSignature: string,
            chainId: number,
            tokenId: number = 1
      ): Promise<any> {
            let exchangeInfo: any,
                  accInfo: any,
                  eddsaKey: any,
                  fee: any,
                  keySeed: any,
                  apiKey: any,
                  storageId: any,
                  tokenAddress: string;
            try {
                  //1. get exchange Info
                  this.logger.info("****1.get exchange Info ");
                  exchangeInfo = await this.getExchangeInfo();

                  //2. get address nonce
                  this.logger.info("****2.get address nonce ");
                  accInfo = await this.getAccount(fromAddress);

                  //3. get SignatureKeyPair
                  this.logger.info("****3.getSignatureKeyPair ");
                  eddsaKey = await this.getSignatureKeyPair(keyPairSignature);

                  //4. get fee
                  this.logger.info("****4.getActiveFeeInfo ");
                  fee = await LoopringAPI.globalAPI.getActiveFeeInfo({
                        accountId: accInfo.accountId,
                  });

                  //5. keySeed
                  this.logger.info("****5.keySeed ");
                  keySeed = this.getKeySeed(
                        accInfo,
                        exchangeInfo.exchangeAddress
                  );

                  //6.getUserApiKeys
                  let apiKeyObj = await LoopringAPI.userAPI.getUserApiKey(
                        { accountId: accInfo.accountId },
                        eddsaKey.sk
                  );

                  if (apiKeyObj.hasOwnProperty("apiKey")) {
                        apiKey = apiKeyObj["apiKey"];
                        // Step 7. storageId
                        storageId = await LoopringAPI.userAPI.getNextStorageId(
                              {
                                    accountId: accInfo.accountId,
                                    sellTokenId: tokenId,
                              },
                              apiKey
                        );
                        this.logger.info("****6 storageId:", storageId);
                  }

                  //8.nftTokenAddress
                  const counterFactualNftInfo = {
                        nftOwner: accInfo.owner,
                        nftFactory: sdk.NFTFactory[chainId],
                        nftBaseUri: "",
                  };
                  tokenAddress =
                        LoopringAPI.nftAPI.computeNFTAddress(
                              counterFactualNftInfo
                        ).tokenAddress || "";
                  console.log("****7 nftTokenAddress:", tokenAddress);

                  return {
                        exchangeInfo,
                        accInfo,
                        eddsaKey,
                        fee,
                        keySeed,
                        apiKey,
                        storageId,
                        tokenAddress,
                  };
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description getKeySeed
       * @param fromAddress       update account address
       * @param keyPairSignature  keyPair signation
       * @returns Signature KeyPair
       */
      // 实现的区别？
      private async getSignatureKeyPair(keyPairSignature: string) {
            // const keyPair = EdDSA.generateKeyPair(
            //       ethUtil.sha256(fm.toBuffer(keyPairSignature))
            // );
            const seedBuff = ethUtil.sha256(fm.toBuffer(keyPairSignature));
            const seed = BigNumber.from("0x" + seedBuff.toString("hex"));
            const bitIntDataItems = bnToBufWithFixedLength(seed.toString(), 32);

            const keyPair = EDDSAUtil.generateKeyPair(bitIntDataItems);

            const formatedPx = fm.formatEddsaKey(
                  toHex(toBig(keyPair.publicKeyX))
            );
            const formatedPy = fm.formatEddsaKey(
                  toHex(toBig(keyPair.publicKeyY))
            );
            const sk = toHex(toBig(keyPair.secretKey));

            return {
                  keyPair,
                  formatedPx,
                  formatedPy,
                  sk,
            };
      }

      /**
       * @description getUserApiKey
       * @param fromAddress       update account address
       * @param keyPairSignature  keyPair signation
       * @returns {Promise.<*>}
       */
      public async getUserApiKey(
            fromAddress: string,
            keyPairSignature: string,
            chaiId: number
      ): Promise<any> {
            //1. get Account detail
            const { accInfo, eddsaKey } = await this.getAccountDetail(
                  fromAddress,
                  keyPairSignature,
                  chaiId
            );

            //2. get apikey
            const request: GetUserApiKeyRequest = {
                  accountId: accInfo.accountId,
            };

            //3.get user api key
            const { apiKey } = await LoopringAPI.userAPI.getUserApiKey(
                  request,
                  eddsaKey.sk
            );

            return apiKey;
      }

      /**
       * @description mintNFTTo
       * @param adminWeb3         web3 from private key
       * @param toAddress         mint to address
       * @param nftType           nftType 0:1155 1:721
       * @param ipfs              ipfs to send
       * @param amount            amount of the nftId
       * @param royaltyPercentage royalty percentage to pay for nft
       * @param chainId           chainId of env
       * @returns {Promise.<*>}
       */
      public async mintNFTToByAdmin(
            adminWeb3: any,
            toAddress: string,
            nftType: number,
            ipfs: string,
            amount: string,
            royaltyPercentage: number,
            chainId: number
      ): Promise<any> {
            //get nftId from ipfs
            try {
                  let nftId = LoopringAPI.nftAPI.ipfsCid0ToNftID(ipfs);
                  console.log("ipfs is : ", ipfs, nftId);

                  let mintResult = await this.mintNFTByAdmin(
                        adminWeb3,
                        nftType,
                        nftId,
                        amount,
                        royaltyPercentage,
                        chainId
                  );
                  console.log("mintResult is  : ", mintResult);
                  if (
                        mintResult.hasOwnProperty("code") &&
                        mintResult.code >= 100001
                  ) {
                        return mintResult;
                  }

                  let nftTokenId = mintResult.nftTokenId;
                  let nftData = mintResult.nftData;

                  let resultTx = await this.transferByAdmin(
                        adminWeb3,
                        toAddress,
                        nftData,
                        nftTokenId,
                        amount,
                        chainId
                  );
                  return resultTx;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description mintNFTByAdmin
       * @param adminWeb3         web3 from private key
       * @param nftType           nftType 0:1155 1:721
       * @param nftId             nftId to send
       * @param amount            amount of the nftId
       * @param royaltyPercentage royalty percentage to pay for nft
       * @param chainId           chainId of env
       * @returns {Promise.<*>}
       */
      public async mintNFTByAdmin(
            adminWeb3: any,
            nftType: number,
            nftId: string,
            amount: string,
            royaltyPercentage: number,
            chainId: number
      ): Promise<any> {
            try {
                  let hex32NftId = utils.hexZeroPad(utils.hexlify(nftId), 32);

                  this.adminStorageId = await this.getAdminStorageId();
                  const response = await LoopringAPI.userAPI.submitNFTMint({
                        request: {
                              exchange: this.adminExchangeAddress,
                              minterId: this.adminAccInfo.accountId,
                              minterAddress: this.adminAccInfo.owner,
                              toAccountId: this.adminAccInfo.accountId,
                              toAddress: this.adminAccInfo.owner, //TODO?
                              nftType: nftType == 0 ? 0 : 1,
                              tokenAddress: this.adminNftTokenAddress,
                              nftId: hex32NftId,
                              amount: amount,
                              validUntil: LOOPRING_EXPORTED_SETTING.validUntil,
                              storageId: this.adminStorageId.offchainId ?? 9,
                              maxFee: {
                                    tokenId: TOKEN_INFO.tokenMap["LRC"].tokenId,
                                    amount:
                                          this.adminFee.fees["LRC"].fee ??
                                          "9400000000000000000",
                                    //amount: "20870000000000000000",
                              },
                              royaltyPercentage: royaltyPercentage,
                              counterFactualNftInfo:
                                    this.adminCounterFactualNftInfo,
                              forceToMint: true,
                        },
                        web3: adminWeb3,
                        chainId: chainId,
                        walletType: sdk.ConnectorNames.Unknown,
                        eddsaKey: this.adminEddsaKey.sk,
                        apiKey: this.adminApiKey,
                  });

                  console.log("xxl submitNFTMint ", response);

                  return response;
            } catch (reason) {
                  throw reason;
            }
      }

      private async getAdminStorageId() {
            //1 .storageId
            const storageId = await LoopringAPI.userAPI.getNextStorageId(
                  { accountId: this.adminAccInfo.accountId, sellTokenId: 1 },
                  this.adminApiKey
            );
            console.log("****1 storageId:", storageId);

            return storageId;
      }

      /**
       * @description transferByAdmin
       * @param adminWeb3         web3 from private key
       * @param toAddress         mint to address
       * @param nftData           nftData to send
       * @param nftTokenId        nftTokenId to send
       * @param amount            amount of the nftId
       * @param chainId           chainId of env
       * @returns {Promise.<*>}
       */
      public async transferByAdmin(
            adminWeb3: any,
            toAddress: string,
            nftData: string,
            nftTokenId: number,
            amount: string,
            chainId: number
      ): Promise<any> {
            try {
                  this.adminStorageId = await this.getAdminStorageId();
                  let transferResult =
                        await LoopringAPI.userAPI.submitNFTInTransfer({
                              request: {
                                    exchange: this.adminExchangeAddress,
                                    fromAccountId: this.adminAccInfo.accountId,
                                    fromAddress: this.adminAccInfo.owner,
                                    toAccountId: 0, // toAccountId is not required, input 0 as default
                                    toAddress: toAddress,
                                    token: {
                                          tokenId: nftTokenId,
                                          nftData: nftData,
                                          amount: amount,
                                    },
                                    maxFee: {
                                          tokenId: TOKEN_INFO.tokenMap["LRC"]
                                                .tokenId,
                                          amount:
                                                this.adminFee.fees["LRC"].fee ??
                                                "9400000000000000000",
                                    },
                                    storageId: this.adminStorageId.offchainId,
                                    validUntil:
                                          LOOPRING_EXPORTED_SETTING.validUntil,
                              },
                              web3: adminWeb3,
                              chainId: chainId,
                              walletType: sdk.ConnectorNames.Unknown,
                              eddsaKey: this.adminEddsaKey.sk,
                              apiKey: this.adminApiKey,
                        });

                  transferResult["nftTokenId"] = nftTokenId;
                  transferResult["nftData"] = nftData;

                  console.log("transfer Result:", transferResult);
                  return transferResult;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description getAminDetailByAddress
       * @param adminWeb3         web3 from private key
       * @param chainId           chainId of env
       * @returns {Promise.<*>}
       */
      private async getAminDetailByAddress(adminWeb3: any, chainId: number) {
            let address = (await adminWeb3.eth.getAccounts())[0];

            // 1. getAccount
            const accInfo = await this.getAccount(address);

            this.logger.info("accountInfo");
            // 2. exchange Info
            const exchangeInfo = await this.getExchangeInfo();
            let exchangeAddress = exchangeInfo.exchangeAddress;

            // 3. eddsaKey
            const eddsaKey = await this.signatureKeyPairByWeb3(
                  accInfo,
                  exchangeAddress,
                  adminWeb3,
                  chainId
            );

            //4. apiKey
            const { apiKey } = await LoopringAPI.userAPI.getUserApiKey(
                  { accountId: accInfo.accountId },
                  eddsaKey.sk
            );

            this.logger.info("apiKey");

            // 5. storageId
            const storageId = await LoopringAPI.userAPI.getNextStorageId(
                  { accountId: accInfo.accountId, sellTokenId: 1 },
                  apiKey
            );

            this.logger.info("storageId");

            // 6. fee  todo 合理的fee ?
            const fee = await LoopringAPI.userAPI.getNFTOffchainFeeAmt(
                  {
                        accountId: accInfo.accountId,
                        tokenAddress: LOOPRING_EXPORTED_SETTING.nftTokenAddress,
                        requestType: sdk.OffchainNFTFeeReqType.NFT_MINT,
                  },
                  apiKey
            );
            this.logger.info("fee");

            //7.nftTokenAddress
            const counterFactualNftInfo = {
                  nftOwner: accInfo.owner,
                  nftFactory: sdk.NFTFactory[chainId],
                  nftBaseUri: "",
            };
            this.logger.info("counterFactualNftInfo", {
                  counterFactualNftInfo: counterFactualNftInfo,
            });
            const nftTokenAddress =
                  LoopringAPI.nftAPI.computeNFTAddress(counterFactualNftInfo)
                        .tokenAddress || "";

            return {
                  exchangeAddress,
                  accInfo,
                  nftTokenAddress,
                  storageId,
                  fee,
                  counterFactualNftInfo,
                  eddsaKey,
                  apiKey,
            };
      }

      /**
       * @description signatureKeyPairByWeb3
       * @param accInfo            account info
       * @param exchangeAddress    exchange address
       * @param web3               web3 from private key
       * @returns {Promise.<*>}
       */
      private async signatureKeyPairByWeb3(
            accInfo: sdk.AccountInfo,
            exchangeAddress: string,
            web3: Web3,
            chainId: number
      ): Promise<any> {
            const eddsaKey = await sdk.generateKeyPair({
                  web3: web3,
                  address: accInfo.owner,
                  walletType: sdk.ConnectorNames.Unknown,
                  keySeed: this.getKeySeed(accInfo, exchangeAddress),
                  chainId: chainId,
                  isMobile: false,
            });
            return eddsaKey;
      }

      /**
       * @description  getNftBalances   api docs
       * @param address       adddress for quiry
       * @param quiry         quiry datqa
       * @returns {Promise.<*>}
       */
      public async getNftBalances(address: string, quiry: any): Promise<any> {
            try {
                  const accInfo = await this.getAccount(address);
                  let params = {
                        accountId: accInfo.accountId,
                        ...quiry,
                  };

                  this.logger.info("search params ", params);
                  let url = baseRprUrl + "api/v3/user/nft/balances";
                  let res = await axios({
                        method: "get", //you can set what request you want to be
                        url: url,
                        params: params,
                        headers: {
                              "X-API-KEY": this.adminApiKey,
                        },
                  });

                  return res.data;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description  getTransferNftTx
       * @param fromAddress      from address of nft
       * @param toAddress        to address of nft
       * @param nftId            nftId to send
       * @param amount           amount of 1155
       * @param keyPairSignature keyPair sig
       * @param chainId          chainId of env
       * @returns {Promise.<*>}
       */
      public async getTransferNftTx(
            fromAddress: string,
            toAddress: string,
            nftId: string,
            amount: number,
            keyPairSignature: string,
            chainId: number
      ): Promise<any> {
            try {
                  //1 get Origin NFT Transfer RequestV3
                  let request = await this.getOriginNFTTransferRequestV3(
                        fromAddress,
                        toAddress,
                        nftId,
                        amount,
                        keyPairSignature,
                        chainId
                  );

                  //2 get nft transfer msg
                  const msg = await userExtendApi.getTransferNftMsg(
                        request,
                        chainId
                  );
                  return msg;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description getOriginNFTTransferRequestV3
       * @param fromAddress      from address of nft
       * @param toAddress        to address of nft
       * @param nftId            nftId to send
       * @param amount           amount of 1155
       * @param keyPairSignature keyPair sig
       * @returns {Promise.<*>}
       */
      public async getOriginNFTTransferRequestV3(
            fromAddress: string,
            toAddress: string,
            nftId: string,
            amount: number,
            keyPairSignature: string,
            chainId: number
      ): Promise<any> {
            try {
                  const { nftData, nftTokenId } =
                        await this.getNftDetailFromNftId(fromAddress, nftId);
                  const { exchangeInfo, accInfo, fee, storageId } =
                        await this.getAccountDetail(
                              fromAddress,
                              keyPairSignature,
                              chainId,
                              nftTokenId
                        );

                  //2 setting nft transfer request data
                  const request = {
                        exchange: exchangeInfo.exchangeAddress,
                        fromAccountId: accInfo.accountId,
                        fromAddress: fromAddress,
                        toAccountId: 0, // toAccountId is not required, input 0 as default
                        toAddress: toAddress,
                        token: {
                              tokenId: nftTokenId,
                              nftData: nftData,
                              amount: amount,
                        },
                        maxFee: {
                              tokenId: TOKEN_INFO.tokenMap["LRC"].tokenId,
                              amount:
                                    fee.fees["LRC"].fee ??
                                    "9400000000000000000",
                        },
                        storageId: storageId.offchainId,
                        validUntil: LOOPRING_EXPORTED_SETTING.validUntil,
                  };
                  return request;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description sendUpdateAccount
       * @param fromAddress      from address of nft
       * @param toAddress        to address of nft
       * @param nftId            nftId to send
       * @param amount           amount of 1155
       * @param keyPairSignature keyPair sig
       * @param ecdsaSignature   ecdsa Signature
       * @param chainId          chainId of the env
       * @returns {Promise.<*>}
       */
      public async sendTransferNFT(
            fromAddress: string,
            toAddress: string,
            nftId: string,
            amount: number,
            keyPairSignature: string,
            ecdsaSignature: string,
            chainId: number
      ): Promise<any> {
            console.log("xxl handle transferNFT 01 ");
            //1.0 get Account detail
            const { apiKey } = await this.getAccountDetail(
                  fromAddress,
                  keyPairSignature,
                  chainId
            );

            //1.get get Update Account RequestV3
            let request = await this.getOriginNFTTransferRequestV3(
                  fromAddress,
                  toAddress,
                  nftId,
                  amount,
                  keyPairSignature,
                  chainId
            );

            console.log("xxl sendTransferNFT : ", request);
            console.log("xxl apiKey : ", apiKey);
            //2.send Transfer NFT
            const resultTx = await userExtendApi.sendTransferNFT(
                  request,
                  this.addSigSuffix(ecdsaSignature),
                  apiKey
            );
            return resultTx;
      }

      /**
       * @description             getNftOrder
       * @param fromAddress       minter address of nft
       * @param keyPairSignature  nftType 0:1155 1:721
       * @param isSell            true:is sell order;order buy order
       * @param nftId             nftId to send
       * @param nftAmount         nft amount for trade
       * @param tokenId           tokenId from trade
       *                          "0": "ETH",
       *                          "1": "LRC",
       *                          "2": "USDT",
       *                          "4": "LP-LRC-ETH",
       *                          "6": "DAI",
       *                          "7": "LP-ETH-USDT",
       *                          "8": "USDC",
       *                          "9": "LP-USDC-ETH",
       * @param tokenAmount       token amount for trade
       * @param chainId           chainId of the env
       * @returns {Promise.<*>}
       */
      public async getNftOrder(
            fromAddress: string,
            keyPairSignature: string,
            isSell: boolean,
            nftId: string,
            nftAmount: number,
            tokenId: number,
            tokenAmount: string,
            chaiId: number
      ): Promise<any> {
            try {
                  const { nftData, nftTokenId } =
                        await this.getNftDetailFromNftId(fromAddress, nftId);

                  //1 get Account detail
                  const { exchangeInfo, accInfo, eddsaKey, storageId } =
                        await this.getAccountDetail(
                              fromAddress,
                              keyPairSignature,
                              chaiId,
                              nftTokenId
                        );

                  //2 set tokenInfo
                  let sellToken: any, buyToken: any;
                  if (isSell) {
                        sellToken = {
                              tokenId: nftTokenId,
                              nftData: nftData,
                              amount: nftAmount,
                        };
                        buyToken = {
                              tokenId: tokenId,
                              amount: tokenAmount,
                        };
                  } else {
                        sellToken = {
                              tokenId: tokenId,
                              amount: tokenAmount,
                        };
                        buyToken = {
                              tokenId: nftTokenId,
                              nftData: nftData,
                              amount: nftAmount,
                        };
                  }

                  //3 generate Order, please read validateNFTOrder
                  const order: sdk.NFTOrderRequestV3 = {
                        exchange: exchangeInfo.exchangeAddress,
                        accountId: accInfo.accountId,
                        storageId: storageId.orderId,
                        sellToken,
                        buyToken,
                        allOrNone: false,
                        fillAmountBOrS: !isSell,
                        validUntil: LOOPRING_EXPORTED_SETTING.validUntil,
                        maxFeeBips: 1000,
                  };
                  const orderEddsaSignature = sdk.get_EddsaSig_NFT_Order(
                        order,
                        eddsaKey.sk
                  );

                  return { order, orderEddsaSignature };
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description  getNftDetailFromNftId  api docs
       * @param fromAddress    from address of nft
       * @param nftId          nftId to send
       * @returns {Promise.<*>}
       */
      private async getNftDetailFromNftId(fromAddress: string, nftId: string) {
            try {
                  let hexNftId = utils.hexlify(nftId);
                  //1 get account detail
                  const nftDataObj = await this.getNftDataFromNftId(
                        this.adminAccInfo.owner,
                        this.adminNftTokenAddress,
                        hexNftId,
                        this.adminApiKey
                  );
                  this.logger.info("nftDataObj : ", nftDataObj);
                  let nftData = nftDataObj.nftData;

                  const balanceObj = await this.getNftBalances(fromAddress, [
                        nftData,
                  ]);
                  this.logger.info("balanceObj :", balanceObj);
                  let nftTokenId;
                  if (balanceObj.data.length > 0) {
                        nftTokenId = balanceObj.data[0].tokenId;
                  } else {
                        nftTokenId = -1;
                  }

                  return { nftData, nftTokenId };
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description          getNftDataFromNftId   api docs
       * @param minter         minter address of nft
       * @param tokenAddress   nftType 0:1155 1:721
       * @param nftId          nftId to send
       * @param apiKey         chainId of env
       * @returns {Promise.<*>}
       */
      private async getNftDataFromNftId(
            minter: string,
            tokenAddress: string,
            nftId: string,
            apiKey: string
      ): Promise<any> {
            try {
                  let getParams = { minter, tokenAddress, nftId };
                  let url = baseRprUrl + "api/v3/nft/info/nftData";
                  let res = await axios({
                        method: "get", //you can set what request you want to be
                        url: url,
                        params: getParams,
                        headers: {
                              "X-API-KEY": apiKey,
                        },
                  });
                  return res.data;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description                           tradeNFT   api docs
       * @param makerOrder                      maker Order for trade
       * @param makerOrderEddsaSignature        maker Order EddsaSignature for trade
       * @param takerOrder                      the maker feeBips, should <= maxFeeBips in makers order
       * @param makerFeeBips                    taker Order for trade
       * @param makerOrderEddsaSignature        taker Order EddsaSignature for trade
       * @param takerFeeBips                    The taker feeBips, should <= maxFeeBips in takers order
       * @param chainId                         chainId of the env
       * @returns {Promise.<*>}
       */
      public async tradeNFT(
            makerOrder: any,
            makerOrderEddsaSignature: string,
            makerFeeBips: number,
            takerOrder: any,
            takeOrderEddsaSignature: string,
            takerFeeBips: number,
            chainId: number
      ): Promise<any> {
            try {
                  //  NFT Trade
                  const response = await LoopringAPI.userAPI.submitNFTTrade({
                        request: {
                              maker: {
                                    ...makerOrder,
                                    eddsaSignature: makerOrderEddsaSignature,
                              },
                              makerFeeBips,
                              taker: {
                                    ...takerOrder,
                                    eddsaSignature: takeOrderEddsaSignature,
                              },
                              takerFeeBips,
                        },
                        web3: this.adminWeb3,
                        chainId,
                        walletType: sdk.ConnectorNames.Unknown,
                        apiKey: this.adminApiKey,
                        eddsaKey: this.adminEddsaKey.sk,
                  });
                  this.logger.info(" trade response ", response);

                  return response;
            } catch (reason) {
                  //this.logger.error("tradeNFT error", reason);
                  throw reason;
            }
      }

      /**
       * @description  getContractNFTMeta
       * @param nftId  nftId from serach metaData
       * @returns {Promise.<*>}
       */
      public async getContractNFTMeta(nftId: string): Promise<any> {
            try {
                  let hex32NftId = utils.hexZeroPad(utils.hexlify(nftId), 32);
                  const result = await LoopringAPI.nftAPI.getContractNFTMeta({
                        web3: this.adminWeb3,
                        tokenAddress: this.adminNftTokenAddress,
                        nftId: hex32NftId,
                        nftType: sdk.NFTType.ERC1155,
                  });

                  this.logger.info("getContractNFTMeta ", result);
                  return result;
            } catch (reason) {
                  throw reason;
            }
      }
      /**
       * @description user tradesList  not used
       * @param params
       * @returns {Promise.<*>}
       */

      public async getUserTradesList(params: any): Promise<any> {
            try {
                  const result = await LoopringAPI.userAPI.getUserTrades(
                        {
                              accountId: params.accountId,
                              offset: params.offset,
                              limit: params.limit,
                        },
                        this.adminApiKey
                  );

                  return result;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * Query NFT info by looprings nftData   api docs
       * @param params
       * @returns
       */

      public async getNftInfo(params: any): Promise<any> {
            try {
                  const result = await LoopringAPI.nftAPI.getInfoForNFTTokens({
                        nftDatas: params.nftDatas,
                  });
                  return result;
            } catch (error) {
                  throw error;
            }
      }
      /**
       * @description  getBlock
       * @param params       adddress for quiry
       * @returns {Promise.<*>}
       */
      public async getBlock(params: any): Promise<any> {
            try {
                  if (!params.hasOwnProperty("id")) {
                        return "do not have id key";
                  }

                  let url = baseRprUrl + "api/v3/block/getBlock";
                  let res = await axios({
                        method: "get", //you can set what request you want to be
                        url: url,
                        params,
                        headers: {
                              "X-API-KEY": this.adminApiKey,
                        },
                  });

                  return res.data;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description  getNftBalances   api docs
       * @param quiry         quiry datqa
       * @returns {Promise.<*>}
       */
      public async getNftHolders(quiry: any): Promise<any> {
            try {
                  let url = baseRprUrl + "api/v3/nft/info/nftHolders";

                  let res = await axios({
                        method: "get", //you can set what request you want to be
                        url: url,
                        params: quiry,
                        headers: {
                              "X-API-KEY": this.adminApiKey,
                        },
                  });

                  return res.data;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description  getNftBalances  api docs
       * @param quiry         quiry datqa
       * @returns {Promise.<*>}
       */
      public async getAccountInfo(quiry: any): Promise<any> {
            try {
                  let url = baseRprUrl + "api/v3/account";

                  let res = await axios({
                        method: "get", //you can set what request you want to be
                        url: url,
                        params: quiry,
                        headers: {
                              "X-API-KEY": this.adminApiKey,
                        },
                  });

                  return res.data;
            } catch (reason) {
                  throw reason;
            }
      }

      /**
       * @description get user opration fee
       * @param params     quiry params
       * @returns {Promise.<*>}
       */

      public async getUserFee(params: any): Promise<any> {
            try {
                  const result = await LoopringAPI.userAPI.getOffchainFeeAmt(
                        {
                              accountId: params.accountId,
                              requestType: params.requestType,
                        },
                        this.adminApiKey
                  );
                  return result;
            } catch (error) {
                  throw error;
            }
      }

      /**
       * @description get nft place order fee
       * @param params     quiry params
       * @returns {Promise.<*>}
       */

      public async getNftOrderFee(params: any): Promise<any> {
            try {
                  let url = baseRprUrl + "api/v3/user/nft/orderFee";

                  let res = await axios({
                        method: "get", //you can set what request you want to be
                        url: url,
                        params: params,
                        headers: {
                              "X-API-KEY": this.adminApiKey,
                        },
                  });

                  return res.data;
            } catch (error) {
                  throw error;
            }
      }

      /**
       * @description get nft place order fee
       * @param params     quiry params
       * @returns {Promise.<*>}
       */

      public async getNftFee(params: any): Promise<any> {
            try {
                  const result = await LoopringAPI.userAPI.getNFTOffchainFeeAmt(
                        {
                              accountId: params.accountId,
                              requestType: params.requestType,
                              tokenAddress: params.tokenAddress,
                        },
                        this.adminApiKey
                  );
                  return result;
            } catch (error) {
                  throw error;
            }
      }

      /**
       * @description get nft transactions  api docs
       * @param params     quiry params
       * @returns {Promise.<*>}
       */

      public async getNftTransactions(params: any): Promise<any> {
            try {
                  const result =
                        await LoopringAPI.userAPI.getUserNFTTransactionHistory(
                              {
                                    ...params,
                              },
                              this.adminApiKey
                        );
                  return result;
            } catch (error) {
                  throw error;
            }
      }

      /**
       * @description get nft trade history  api docs
       * @param params     quiry params
       * @returns {Promise.<*>}
       */

      public async getNftTrade(params: any): Promise<any> {
            try {
                  let url = baseRprUrl + "api/v3/user/nft/trades";

                  let res = await axios({
                        method: "get", //you can set what request you want to be
                        url: url,
                        params: params,
                        headers: {
                              "X-API-KEY": this.adminApiKey,
                        },
                  });

                  return res.data;
            } catch (error) {
                  throw error;
            }
      }

      /**
       * @description validate a NFT order  api docs
       * @param params   quiry params
       * @returns {Promise.<*>}
       */

      public async validateNftOrder(
            params: any,
            chainId: number
      ): Promise<any> {
            try {
                  const result =
                        await LoopringAPI.userAPI.submitNFTValidateOrder({
                              request: {
                                    ...params,
                              },
                              web3: this.adminWeb3,
                              chainId,
                              walletType: sdk.ConnectorNames.Unknown,
                              apiKey: this.adminApiKey,
                              eddsaKey: this.adminEddsaKey.sk,
                        });
                  return result;
            } catch (error) {
                  throw error;
            }
      }
}
