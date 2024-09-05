import { TransactionSignRequest } from '@airgap/serializer'
import { HexString } from '@airgap/serializer/v3/schemas/definitions/hex-string'

import { BSCRawUnsignedTransaction } from '../../../../types/transaction'

export interface SerializableBSCRawUnsignedTransaction extends Omit<BSCRawUnsignedTransaction, 'type' | 'bscType'> {
  nonce: HexString
  gasPrice: HexString
  gasLimit: HexString
  to: HexString
  value: HexString
  chainId: number
  data: HexString
}

export interface BSCTransactionSignRequest extends TransactionSignRequest<SerializableBSCRawUnsignedTransaction> { }
