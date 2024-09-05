import { AirGapModule } from '@airgap/module-kit'
import { EtherscanBlockExplorer } from './block-explorer/EtherscanBlockExplorer'
import { BSCInfoClient } from './clients/info/BSCInfoClient'
import { EtherscanInfoClient } from './clients/info/EtherscanInfoClient'
import { BSCNodeClient } from './clients/node/BSCNodeClient'
import { BSCRPCBody, BSCRPCData, BSCRPCResponse, HttpBSCNodeClient } from './clients/node/HttpBSCNodeClient'
import { BSCModule } from './module/BSCModule'
import { erc20Tokens } from './module/ERC20Tokens'
import { BSCBaseProtocol, BSCBaseProtocolImpl, DEFAULT_BSC_UNITS_METADATA } from './protocol/BSCBaseProtocol'
import { BSCProtocol, createBSCProtocol, createBSCProtocolOptions, createBSCTestnetProtocol } from './protocol/BSCProtocol'
import { ERC20Protocol, ERC20ProtocolImpl } from './protocol/erc20/ERC20Protocol'
import { createERC20Token, ERC20Token, ERC20TokenImpl } from './protocol/erc20/ERC20Token'
import {
  bscSignedTransactionToResponse,
  bscTransactionSignRequestToUnsigned,
  bscTransactionSignResponseToSigned,
  bscUnsignedTransactionToRequest
} from './serializer/v3/schemas/converter/transaction-converter'
import { BSCTransactionSignRequest } from './serializer/v3/schemas/definitions/transaction-sign-request-bsc'
import { BSCTypedTransactionSignRequest } from './serializer/v3/schemas/definitions/transaction-sign-request-bsc-typed'
import { BSCTransactionSignResponse } from './serializer/v3/schemas/definitions/transaction-sign-response-bsc'
import { BSCTransactionValidator } from './serializer/v3/validators/transaction-validator'
import { BSCCryptoConfiguration } from './types/crypto'
import {
  BSCBaseProtocolOptions,
  BSCProtocolNetwork,
  BSCProtocolOptions,
  BSCUnits,
  ERC20TokenMetadata,
  ERC20TokenOptions
} from './types/protocol'
import {
  BSCRawUnsignedTransaction,
  BSCSignedTransaction,
  BSCTransactionCursor,
  BSCTypedUnsignedTransaction,
  BSCUnsignedTransaction
} from './types/transaction'
import { BSCUtils } from './utils/BSCUtils'
import { isAnyBSCProtocol, isBSCERC20Protocol, isBSCERC20Token, isBSCProtocol } from './utils/protocol'

// Module

export { BSCModule }

// Protocol

export {
  BSCBaseProtocol,
  BSCBaseProtocolImpl,
  BSCProtocol, createBSCProtocol, createBSCProtocolOptions, createBSCTestnetProtocol, createERC20Token, ERC20Protocol,
  ERC20ProtocolImpl,
  ERC20Token,
  ERC20TokenImpl
}

// Block Explorer

export { EtherscanBlockExplorer }

// Constants

export { DEFAULT_BSC_UNITS_METADATA }

// Clients

export { BSCInfoClient, BSCNodeClient, EtherscanInfoClient, HttpBSCNodeClient }

// Types

export {
  BSCBaseProtocolOptions, BSCCryptoConfiguration, BSCProtocolNetwork,
  BSCProtocolOptions, BSCRawUnsignedTransaction, BSCRPCBody, BSCRPCData, BSCRPCResponse, BSCSignedTransaction,
  BSCTransactionCursor, BSCTypedUnsignedTransaction, BSCUnits, BSCUnsignedTransaction, ERC20TokenMetadata,
  ERC20TokenOptions
}

// Serializer

export {
  bscSignedTransactionToResponse, BSCTransactionSignRequest, bscTransactionSignRequestToUnsigned, BSCTransactionSignResponse, bscTransactionSignResponseToSigned,
  BSCTransactionValidator, BSCTypedTransactionSignRequest, bscUnsignedTransactionToRequest
}

// Utils

export { BSCUtils, isAnyBSCProtocol, isBSCERC20Protocol, isBSCERC20Token, isBSCProtocol }

// Other

export { erc20Tokens }

export function create(): AirGapModule {
  return new BSCModule()
}
