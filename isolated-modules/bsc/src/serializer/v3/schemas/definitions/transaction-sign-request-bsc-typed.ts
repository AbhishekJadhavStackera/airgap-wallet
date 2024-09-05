import { TransactionSignRequest } from '@airgap/serializer'
import { HexString } from '@airgap/serializer/v3/schemas/definitions/hex-string'

import { BSCTypedUnsignedTransaction } from '../../../../types/transaction'

export interface SerializableBSCTypedUnsignedTransaction extends Omit<BSCTypedUnsignedTransaction, 'type' | 'bscType'> {
  serialized: HexString
  derivationPath: string
  masterFingerprint: string
}

export interface BSCTypedTransactionSignRequest extends TransactionSignRequest<SerializableBSCTypedUnsignedTransaction> { }
