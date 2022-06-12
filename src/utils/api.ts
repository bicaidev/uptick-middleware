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

import { APIData } from "../types";

export const errResphonse = (result: number, message: string): APIData => {
      let timestamp = Date.now();

      return {
            result: result,
            message: message,
            timestamp: timestamp,
            data: "",
      };
};

export const okResphonse = (data: any): APIData => {
      let timestamp = Date.now();

      return {
            result: 0,
            message: "",
            timestamp: timestamp,
            data: data,
      };
};
