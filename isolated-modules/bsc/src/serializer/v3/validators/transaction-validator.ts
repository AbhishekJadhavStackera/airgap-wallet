// tslint:disable: max-classes-per-file
import { async } from '@airgap/coinlib-core/dependencies/src/validate.js-0.13.1/validate'
import { TransactionValidator, TransactionValidatorV2, validateSyncScheme } from '@airgap/serializer'

import { BSCTransactionSignRequest } from '../schemas/definitions/transaction-sign-request-bsc'
import { BSCTransactionSignResponse } from '../schemas/definitions/transaction-sign-response-bsc'

const unsignedTransactionConstraints = {
  nonce: {
    presence: { allowEmpty: false },
    type: 'String',
    isHexStringWithPrefix: true
  },
  gasPrice: {
    presence: { allowEmpty: false },
    type: 'String',
    isHexStringWithPrefix: true
  },
  gasLimit: {
    presence: { allowEmpty: false },
    type: 'String',
    isHexStringWithPrefix: true
  },
  to: {
    presence: { allowEmpty: false },
    type: 'String',
    isHexStringWithPrefix: true,
    format: {
      pattern: '^0x[a-fA-F0-9]{40}$', // Should be new EthereumProtocol().addressValidationPattern, but then there is a runtime issue because of circular dependencies
      flags: 'i',
      message: 'is not a valid bsc address'
    }
  },
  value: {
    presence: { allowEmpty: false },
    type: 'String',
    isHexStringWithPrefix: true
  },
  chainId: {
    presence: { allowEmpty: false },
    numericality: { noStrings: true, onlyInteger: true, greaterThanOrEqualTo: 0 }
  },
  data: {
    presence: { allowEmpty: false },
    type: 'String',
    isHexStringWithPrefix: true
  }
}

const signedTransactionConstraints = {
  transaction: {
    presence: { allowEmpty: false },
    type: 'String',
    isValidEthereumTransactionString: true
  }
}
const success = () => undefined
const error = (errors: any) => errors

export class BSCTransactionValidator implements TransactionValidator, TransactionValidatorV2 {
  public validateUnsignedTransaction(request: BSCTransactionSignRequest): Promise<any> {
    const transaction = request.transaction
    validateSyncScheme({})

    return async(transaction, unsignedTransactionConstraints).then(success, error)
  }
  public validateSignedTransaction(signedTx: BSCTransactionSignResponse): any {
    return async(signedTx, signedTransactionConstraints).then(success, error)
  }
}
