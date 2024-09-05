import { Domain, SubProtocolSymbols } from '@airgap/coinlib-core'
import { UnsupportedError } from '@airgap/coinlib-core/errors'
import { AirGapV3SerializerCompanion, SignedTransaction, UnsignedTransaction } from '@airgap/module-kit'
import { V3SchemaConfiguration } from '@airgap/module-kit/types/serializer'
import { IACMessageType, SchemaRoot, TransactionSignRequest, TransactionSignResponse } from '@airgap/serializer'

import { BSCSignedTransaction, BSCUnsignedTransaction } from '../../types/transaction'

import {
  bscSignedTransactionToResponse,
  bscTransactionSignRequestToUnsigned,
  bscTransactionSignResponseToSigned,
  bscUnsignedTransactionToRequest
} from './schemas/converter/transaction-converter'
import { BSCTransactionValidator } from './validators/transaction-validator'

const bscTransactionSignRequest: SchemaRoot = require('./schemas/generated/transaction-sign-request-bsc.json')
const bscTypedTransactionSignRequest: SchemaRoot = require('./schemas/generated/transaction-sign-request-bsc-typed.json')
const bscTransactionSignResponse: SchemaRoot = require('./schemas/generated/transaction-sign-response-bsc.json')

export class BSCV3SerializerCompanion implements AirGapV3SerializerCompanion {
  public readonly schemas: V3SchemaConfiguration[] = [
    {
      type: IACMessageType.TransactionSignRequest,
      schema: { schema: bscTransactionSignRequest },
      protocolIdentifier: "bsc"
    },
    {
      type: IACMessageType.TransactionSignRequest,
      schema: { schema: bscTypedTransactionSignRequest },
      protocolIdentifier: "bsc"
    },
    {
      type: IACMessageType.TransactionSignResponse,
      schema: { schema: bscTransactionSignResponse },
      protocolIdentifier: "bsc"
    },
    {
      type: IACMessageType.TransactionSignRequest,
      schema: { schema: bscTransactionSignRequest },
      protocolIdentifier: SubProtocolSymbols.ETH_ERC20
    },
    {
      type: IACMessageType.TransactionSignResponse,
      schema: { schema: bscTransactionSignResponse },
      protocolIdentifier: SubProtocolSymbols.ETH_ERC20
    }
  ]

  private readonly bscTransactionValidator: BSCTransactionValidator = new BSCTransactionValidator()

  public async toTransactionSignRequest(
    identifier: string,
    unsignedTransaction: UnsignedTransaction,
    publicKey: string,
    callbackUrl?: string
  ): Promise<TransactionSignRequest> {
    if (identifier === "bsc" || identifier.startsWith(SubProtocolSymbols.ETH_ERC20)) {
      return bscUnsignedTransactionToRequest(unsignedTransaction as BSCUnsignedTransaction, publicKey, callbackUrl)
    } else {
      throw new UnsupportedError(Domain.ETHEREUM, `Protocol ${identifier} not supported`)
    }
  }

  public async fromTransactionSignRequest(
    identifier: string,
    transactionSignRequest: TransactionSignRequest
  ): Promise<UnsignedTransaction> {
    if (identifier === "bsc" || identifier.startsWith(SubProtocolSymbols.ETH_ERC20)) {
      return bscTransactionSignRequestToUnsigned(transactionSignRequest)
    } else {
      throw new UnsupportedError(Domain.ETHEREUM, `Protocol ${identifier} not supported`)
    }
  }

  public async validateTransactionSignRequest(identifier: string, transactionSignRequest: TransactionSignRequest): Promise<boolean> {
    if (identifier === "bsc" || identifier.startsWith(SubProtocolSymbols.ETH_ERC20)) {
      try {
        await this.bscTransactionValidator.validateUnsignedTransaction(transactionSignRequest)

        return true
      } catch {
        return false
      }
    } else {
      throw new UnsupportedError(Domain.ETHEREUM, `Protocol ${identifier} not supported`)
    }
  }

  public async toTransactionSignResponse(
    identifier: string,
    signedTransaction: SignedTransaction,
    accountIdentifier: string
  ): Promise<TransactionSignResponse> {
    if (identifier === "bsc" || identifier.startsWith(SubProtocolSymbols.ETH_ERC20)) {
      return bscSignedTransactionToResponse(signedTransaction as BSCSignedTransaction, accountIdentifier)
    } else {
      throw new UnsupportedError(Domain.ETHEREUM, `Protocol ${identifier} not supported`)
    }
  }

  public async fromTransactionSignResponse(
    identifier: string,
    transactionSignResponse: TransactionSignResponse
  ): Promise<SignedTransaction> {
    if (identifier === "bsc" || identifier.startsWith(SubProtocolSymbols.ETH_ERC20)) {
      return bscTransactionSignResponseToSigned(transactionSignResponse)
    } else {
      throw new UnsupportedError(Domain.ETHEREUM, `Protocol ${identifier} not supported`)
    }
  }

  public async validateTransactionSignResponse(identifier: string, transactionSignResponse: TransactionSignResponse): Promise<boolean> {
    if (identifier === "bsc" || identifier.startsWith(SubProtocolSymbols.ETH_ERC20)) {
      try {
        await this.bscTransactionValidator.validateSignedTransaction(transactionSignResponse)

        return true
      } catch {
        return false
      }
    } else {
      throw new UnsupportedError(Domain.ETHEREUM, `Protocol ${identifier} not supported`)
    }
  }
}
