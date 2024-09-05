import { SignedTransaction, TransactionCursor, UnsignedTransaction } from '@airgap/module-kit'

export interface BSCRawUnsignedTransaction extends UnsignedTransaction {
  bscType: 'raw'
  nonce: string
  gasPrice: string
  gasLimit: string
  to: string
  value: string
  chainId: number
  data: string
}

export interface BSCTypedUnsignedTransaction extends UnsignedTransaction {
  bscType: 'typed'
  serialized: string
  derivationPath: string
  masterFingerprint: string
}

export type BSCUnsignedTransaction = BSCRawUnsignedTransaction | BSCTypedUnsignedTransaction

export interface BSCSignedTransaction extends SignedTransaction {
  serialized: string
}

export interface BSCTransactionCursor extends TransactionCursor {
  page?: number
}
