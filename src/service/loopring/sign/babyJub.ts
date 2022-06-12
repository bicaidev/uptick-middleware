import { BigNumber } from "ethers";
import { SignatureScheme, bytesToHexString } from "./eddsa";
import { field } from "./field";


export class babyJub {
  
  static packPoint(P0: BigNumber, P1: BigNumber) {
    const packed = SignatureScheme.to_bytes(P1).reverse()
    // console.log("packed", packed)
    if (babyJub.lt(P0, BigNumber.from("0"))) {
      // console.log("Update .... lt ")
      packed[0] = packed[0] | 0x80
    }
    const hexStr = bytesToHexString(packed)
    // console.log("hexStr", hexStr)
    return hexStr
  }

  static lt(a: BigNumber, b: BigNumber) {
    const half = field.SNARK_SCALAR_FIELD.div(BigNumber.from("2"))
    const p = field.SNARK_SCALAR_FIELD
    let aa: BigNumber
    let bb: BigNumber
    if (a.gt(half)) {
      aa = a.sub(p)
    } else {
      aa = a
    }
    if (b.gt(half)) {
      bb = b.sub(p)
    } else {
      bb = b
    }
    // console.log("lt", a.toString(), b.toString(), aa.toString(), bb.toString());
    return aa.lt(bb)
  }

  static gt(a: BigNumber, b: BigNumber) {
    const half = field.SNARK_SCALAR_FIELD.div(BigNumber.from("2"))
    const p = field.SNARK_SCALAR_FIELD
    let aa: BigNumber
    let bb: BigNumber
    if (a.gt(half)) {
      aa = a.sub(p)
    } else {
      aa = a
    }
    if (b.gt(half)) {
      bb = b.sub(p)
    } else {
      bb = b
    }
    // console.log("gt", a.toString(), b.toString(), aa.toString(), bb.toString());
    return aa.gt(bb)
  }

}
