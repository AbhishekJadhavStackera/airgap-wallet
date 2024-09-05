import { implementsInterface, newSignedTransaction, newUnsignedTransaction } from '@airgap/module-kit'

import {
  BSCRawUnsignedTransaction,
  BSCSignedTransaction,
  BSCTypedUnsignedTransaction,
  BSCUnsignedTransaction
} from '../../../../types/transaction'
import { BSCTransactionSignRequest } from '../definitions/transaction-sign-request-bsc'
import {
  BSCTypedTransactionSignRequest,
  SerializableBSCTypedUnsignedTransaction
} from '../definitions/transaction-sign-request-bsc-typed'
import { BSCTransactionSignResponse } from '../definitions/transaction-sign-response-bsc'

function isBSCTypedTransactionSignRequest(
  request: BSCTransactionSignRequest | BSCTypedTransactionSignRequest
): request is BSCTypedTransactionSignRequest {
  return implementsInterface<SerializableBSCTypedUnsignedTransaction>(request.transaction, {
    derivationPath: 'required',
    masterFingerprint: 'required',
    serialized: 'required'
  })
}

export function bscUnsignedTransactionToRequest(
  unsigned: BSCUnsignedTransaction,
  publicKey: string,
  callbackUrl?: string
): BSCTransactionSignRequest | BSCTypedTransactionSignRequest {
  return unsigned.bscType === 'raw'
    ? bscRawUnsignedTransactionToRequest(unsigned, publicKey, callbackUrl)
    : bscTypedUnsignedTransactionToRequest(unsigned, publicKey, callbackUrl)
}

function bscRawUnsignedTransactionToRequest(
  unsigned: BSCRawUnsignedTransaction,
  publicKey: string,
  callbackUrl?: string
): BSCTransactionSignRequest {
  const { type: _, ...rest } = unsigned

  return {
    transaction: rest,
    publicKey,
    callbackURL: callbackUrl
  }
}

function bscTypedUnsignedTransactionToRequest(
  unsigned: BSCTypedUnsignedTransaction,
  publicKey: string,
  callbackUrl?: string
): BSCTypedTransactionSignRequest {
  const { type: _, ...rest } = unsigned

  return {
    transaction: rest,
    publicKey,
    callbackURL: callbackUrl
  }
}

export function bscSignedTransactionToResponse(
  signed: BSCSignedTransaction,
  accountIdentifier: string
): BSCTransactionSignResponse {
  return { transaction: signed.serialized, accountIdentifier }
}

export function bscTransactionSignRequestToUnsigned(
  request: BSCTransactionSignRequest | BSCTypedTransactionSignRequest
): BSCUnsignedTransaction {
  return isBSCTypedTransactionSignRequest(request)
    ? bscTransactionSignRequestToTypedUnsigned(request)
    : bscTransactionSignRequestToRawUnsigned(request)
}

function bscTransactionSignRequestToRawUnsigned(request: BSCTransactionSignRequest): BSCRawUnsignedTransaction {
  return newUnsignedTransaction<BSCRawUnsignedTransaction>({ bscType: 'raw', ...request.transaction })
}

function bscTransactionSignRequestToTypedUnsigned(request: BSCTypedTransactionSignRequest): BSCTypedUnsignedTransaction {
  return newUnsignedTransaction<BSCTypedUnsignedTransaction>({ bscType: 'typed', ...request.transaction })
}

export function bscTransactionSignResponseToSigned(response: BSCTransactionSignResponse): BSCSignedTransaction {
  return newSignedTransaction<BSCSignedTransaction>({ serialized: response.transaction })
}
