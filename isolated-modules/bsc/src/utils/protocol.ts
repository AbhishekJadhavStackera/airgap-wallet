import {
  aesEncryptionSchema,
  AirGapAnyProtocol,
  asymmetricEncryptionOfflineSchema,
  bip32OfflineProtocolSchema,
  bip32OnlineProtocolSchema,
  fetchDataForAddressProtocolSchema,
  fetchDataForMultipleAddressesProtocolSchema,
  getTokenBalancesSchema,
  implementsInterface,
  offlineProtocolSchema,
  onlineProtocolSchema,
  Schema,
  signMessageOfflineSchema,
  singleTokenSubProtocolSchema,
  transactionStatusCheckerSchema,
  walletConnectProtocolSchema
} from '@airgap/module-kit'

import { BSCBaseProtocol } from '../protocol/BSCBaseProtocol'
import { BSCProtocol } from '../protocol/BSCProtocol'
import { ERC20Protocol } from '../protocol/erc20/ERC20Protocol'
import { ERC20Token } from '../protocol/erc20/ERC20Token'

// Schemas

export const bscBaseProtocolSchema: Schema<BSCBaseProtocol> = {
  ...offlineProtocolSchema,
  ...onlineProtocolSchema,
  ...bip32OfflineProtocolSchema,
  ...bip32OnlineProtocolSchema,
  ...aesEncryptionSchema,
  ...asymmetricEncryptionOfflineSchema,
  ...signMessageOfflineSchema,
  ...fetchDataForAddressProtocolSchema,
  ...fetchDataForMultipleAddressesProtocolSchema,
  ...getTokenBalancesSchema,
  ...transactionStatusCheckerSchema,
  ...walletConnectProtocolSchema
}

export const bscProtocolSchema: Schema<BSCProtocol> = {
  ...bscBaseProtocolSchema
}

export const bscERC20ProtocolSchema: Schema<ERC20Protocol<string>> = {
  ...bscBaseProtocolSchema,
  name: 'required',
  symbol: 'required',
  decimals: 'required'
}

export const bscERC20TokenSchema: Schema<ERC20Token> = {
  ...bscERC20ProtocolSchema,
  ...singleTokenSubProtocolSchema
}

// Implementation Checks

export function isAnyBSCProtocol(protocol: AirGapAnyProtocol): protocol is BSCBaseProtocol {
  return implementsInterface<BSCBaseProtocol>(protocol, bscBaseProtocolSchema)
}

export function isBSCProtocol(protocol: AirGapAnyProtocol): protocol is BSCProtocol {
  return implementsInterface<BSCProtocol>(protocol, bscProtocolSchema)
}

export function isBSCERC20Protocol(protocol: AirGapAnyProtocol): protocol is ERC20Protocol<string> {
  return implementsInterface<ERC20Protocol<string>>(protocol, bscERC20ProtocolSchema)
}

export function isBSCERC20Token(protocol: AirGapAnyProtocol): protocol is ERC20Token {
  return implementsInterface<ERC20Token>(protocol, bscERC20TokenSchema)
}
