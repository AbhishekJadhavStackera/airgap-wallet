import { assertNever, Domain } from '@airgap/coinlib-core'
import BigNumber from '@airgap/coinlib-core/dependencies/src/bignumber.js-9.0.0/bignumber'
// @ts-ignore
import * as ethUtil from '@airgap/coinlib-core/dependencies/src/ethereumjs-util-5.2.0'
import { BalanceError, ConditionViolationError, UnsupportedError } from '@airgap/coinlib-core/errors'
import { isHex } from '@airgap/coinlib-core/utils/hex'
import {
  AirGapTransaction,
  AirGapTransactionsWithCursor,
  Amount,
  Balance,
  ExtendedPublicKey,
  FeeDefaults,
  isAmount,
  newAmount,
  newUnsignedTransaction,
  PublicKey,
  SecretKey,
  TransactionDetails,
  TransactionFullConfiguration
} from '@airgap/module-kit'
import { FeeMarketEIP1559Transaction, TransactionFactory } from '@ethereumjs/tx'

import { BSCInfoClient, BSCInfoClientTransactionsResult } from '../../clients/info/BSCInfoClient'
import { BSCNodeClient } from '../../clients/node/BSCNodeClient'
import { BSCRPCDataTransfer } from '../../clients/node/HttpBSCNodeClient'
import { BSCProtocolNetwork, BSCUnits, ERC20ProtocolOptions } from '../../types/protocol'
import {
  BSCRawUnsignedTransaction,
  BSCSignedTransaction,
  BSCTransactionCursor,
  BSCUnsignedTransaction
} from '../../types/transaction'
import { BSCUtils } from '../../utils/BSCUtils'
import { BSCBaseProtocol, BSCBaseProtocolImpl } from '../BSCBaseProtocol'

const EthereumTransaction = require('@airgap/coinlib-core/dependencies/src/ethereumjs-tx-1.3.7/index')

// Interface

export interface ERC20Protocol<_Units extends string, _ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork>
  extends BSCBaseProtocol<_Units, _ProtocolNetwork> {
  name(): Promise<string | undefined>
  symbol(): Promise<string | undefined>
  decimals(): Promise<number | undefined>
}

// Implementation

export abstract class ERC20ProtocolImpl<_Units extends string, _ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork>
  extends BSCBaseProtocolImpl<_Units, _ProtocolNetwork>
  implements ERC20Protocol<_Units, _ProtocolNetwork> {
  protected readonly contractAddress: string

  public constructor(
    nodeClient: BSCNodeClient,
    infoClient: BSCInfoClient,
    options: ERC20ProtocolOptions<_Units, _ProtocolNetwork>
  ) {
    super(nodeClient, infoClient, {
      network: options.network,

      name: options.name,
      identifier: options.identifier,

      units: options.units,
      mainUnit: options.mainUnit
    })
    this.contractAddress = options.contractAddress
  }

  // Common

  public async getDetailsFromTransaction(
    transaction: BSCSignedTransaction | BSCUnsignedTransaction,
    publicKey: PublicKey | ExtendedPublicKey
  ): Promise<AirGapTransaction<_Units, BSCUnits>[]> {
    const ethTransactionDetails: AirGapTransaction<string, BSCUnits>[] = await super.getDetailsFromTransaction(transaction, publicKey)

    switch (transaction.type) {
      case 'signed':
        return this.getDetailsFromSignedContractTransaction(transaction, ethTransactionDetails)
      case 'unsigned':
        return this.getDetailsFromUnsignedContractTransaction(transaction, ethTransactionDetails)
      default:
        assertNever(transaction)
        throw new UnsupportedError(Domain.ETHEREUM, 'Unsupported transaction type.')
    }
  }

  private async getDetailsFromSignedContractTransaction(
    transaction: BSCSignedTransaction,
    ethTransactionDetails: AirGapTransaction<string, BSCUnits>[]
  ): Promise<AirGapTransaction<_Units, BSCUnits>[]> {
    if (ethTransactionDetails.length !== 1) {
      throw new ConditionViolationError(Domain.ERC20, 'More than one ETH transaction detected.')
    }

    const extractedTx = new EthereumTransaction(transaction.serialized)
    const tokenTransferDetails = new BSCRPCDataTransfer(`0x${extractedTx.data.toString('hex')}`)

    return [
      {
        ...ethTransactionDetails[0],
        to: [ethUtil.toChecksumAddress(tokenTransferDetails.recipient)],
        amount: newAmount(tokenTransferDetails.amount, 'blockchain')
      }
    ]
  }

  private async getDetailsFromUnsignedContractTransaction(
    transaction: BSCUnsignedTransaction,
    ethTransactionDetails: AirGapTransaction<string, BSCUnits>[]
  ): Promise<AirGapTransaction<_Units, BSCUnits>[]> {
    if (ethTransactionDetails.length !== 1) {
      throw new ConditionViolationError(Domain.ERC20, 'More than one ETH transaction detected.')
    }

    let data: string
    if (transaction.bscType === 'raw') {
      data = transaction.data
    } else {
      const typedTransaction: FeeMarketEIP1559Transaction = TransactionFactory.fromSerializedData(
        Buffer.from(transaction.serialized, 'hex')
      ) as FeeMarketEIP1559Transaction

      data = typedTransaction.data.toString('hex')
    }

    const tokenTransferDetails = new BSCRPCDataTransfer(data)

    return [
      {
        ...ethTransactionDetails[0],
        to: [ethUtil.toChecksumAddress(tokenTransferDetails.recipient)],
        amount: newAmount(tokenTransferDetails.amount, 'blockchain')
      }
    ]
  }

  // Offline

  public async signTransactionWithSecretKey(
    transaction: BSCUnsignedTransaction,
    secretKey: SecretKey
  ): Promise<BSCSignedTransaction> {
    if (transaction.bscType !== 'raw') {
      // no v0 implementation
      throw new ConditionViolationError(Domain.ERC20, 'Unsupported unsigned transaction type.')
    }

    const rawTransaction: BSCRawUnsignedTransaction = {
      ...transaction,
      data:
        !transaction.data || transaction.data === '0x'
          ? new BSCRPCDataTransfer(transaction.to, transaction.value).abiEncoded()
          : transaction.data
    }

    return super.signTransactionWithSecretKey(rawTransaction, secretKey)
  }

  // Online

  public async getTransactionsForPublicKey(
    publicKey: PublicKey | ExtendedPublicKey,
    limit: number,
    cursor?: BSCTransactionCursor
  ): Promise<AirGapTransactionsWithCursor<BSCTransactionCursor, _Units, BSCUnits>> {
    const address: string = await this.getAddressFromPublicKey(publicKey)

    return this.getTransactionsForAddress(address, limit, cursor)
  }

  public async getTransactionsForAddress(
    address: string,
    limit: number,
    cursor?: BSCTransactionCursor
  ): Promise<AirGapTransactionsWithCursor<BSCTransactionCursor, _Units, BSCUnits>> {
    return this.getTransactionsForAddresses([address], limit, cursor)
  }

  public async getTransactionsForAddresses(
    addresses: string[],
    limit: number,
    cursor?: BSCTransactionCursor
  ): Promise<AirGapTransactionsWithCursor<BSCTransactionCursor, _Units, BSCUnits>> {
    return new Promise((overallResolve, overallReject) => {
      const promises: Promise<BSCInfoClientTransactionsResult>[] = []
      for (const address of addresses) {
        promises.push(this.infoClient.fetchContractTransactions(this.contractAddress, address, limit, cursor))
      }

      Promise.all(promises)
        .then((values) => {
          const page = Math.max(...values.map((txResult) => txResult.cursor.page))
          const transactions: AirGapTransaction<_Units, BSCUnits>[] = values.reduce((acc, current) => {
            return acc.concat(
              current.transactions.map((tx) => ({
                ...tx,
                amount: newAmount(tx.amount.value, 'blockchain'),
                fee: newAmount<BSCUnits>(tx.fee.value, 'blockchain'),
                network: this.options.network
              }))
            )
          }, [] as AirGapTransaction<_Units, BSCUnits>[])

          const hasNext: boolean = transactions.length >= limit

          overallResolve({
            transactions,
            cursor: {
              hasNext,
              page: hasNext ? page : undefined
            }
          })
        })
        .catch(overallReject)
    })
  }

  public async getBalanceOfPublicKey(publicKey: PublicKey | ExtendedPublicKey): Promise<Balance<_Units>> {
    const address: string = await this.getAddressFromPublicKey(publicKey)

    return this.getBalanceOfAddress(address)
  }

  public async getBalanceOfAddress(address: string): Promise<Balance<_Units>> {
    return this.getBalanceOfAddresses([address])
  }

  public async getBalanceOfAddresses(addresses: string[]): Promise<Balance<_Units>> {
    const balances: BigNumber[] = await Promise.all(
      addresses.map((address: string) => {
        return this.nodeClient.callBalanceOf(this.contractAddress, address)
      })
    )

    const totalBalance: BigNumber = balances.reduce((a: BigNumber, b: BigNumber) => a.plus(b))

    return { total: newAmount(totalBalance, 'blockchain') }
  }

  public async getTransactionMaxAmountWithPublicKey(
    publicKey: PublicKey | ExtendedPublicKey,
    to: string[],
    configuration?: TransactionFullConfiguration<BSCUnits>
  ): Promise<Amount<_Units>> {
    const balance: Balance<_Units> = await this.getBalanceOfPublicKey(publicKey)

    return balance.transferable ?? balance.total
  }

  public async prepareTransactionWithPublicKey(
    publicKey: PublicKey | ExtendedPublicKey,
    details: TransactionDetails<_Units>[],
    configuration?: TransactionFullConfiguration<BSCUnits>
  ): Promise<BSCUnsignedTransaction> {
    if (details.length !== 1) {
      throw new ConditionViolationError(Domain.ETHEREUM, 'you cannot have 0 transaction details')
    }

    let fee: Amount<BSCUnits>
    if (configuration?.fee !== undefined) {
      fee = configuration.fee
    } else {
      const estimatedFee: FeeDefaults<BSCUnits> = await this.getTransactionFeeWithPublicKey(publicKey, details)
      fee = estimatedFee.medium
    }

    const wrappedFee: BigNumber = new BigNumber(newAmount(fee).blockchain(this.feeUnits).value)
    const wrappedAmount: BigNumber = new BigNumber(newAmount(details[0].amount).blockchain(this.units).value)

    const balance: Balance = await this.getBalanceOfPublicKey(publicKey)
    const wrappedBalance: BigNumber = new BigNumber(newAmount(balance.transferable ?? balance.total).blockchain(this.units).value)

    if (wrappedBalance.isGreaterThanOrEqualTo(wrappedAmount)) {
      const address: string = await this.getAddressFromPublicKey(publicKey)
      const ethBalance: Balance = await super.getBalanceOfAddresses([address])
      const wrappedEthBalance: BigNumber = new BigNumber(newAmount(ethBalance.total).blockchain(this.units).value)

      const estimatedGas: BigNumber = await this.estimateGas(address, details[0].to, wrappedAmount)

      if (wrappedEthBalance.isGreaterThanOrEqualTo(wrappedFee)) {
        const txCount: number = await this.nodeClient.fetchTransactionCount(address)
        const gasPrice: BigNumber = wrappedFee.isEqualTo(0)
          ? new BigNumber(0)
          : wrappedFee.div(estimatedGas).integerValue(BigNumber.ROUND_CEIL)
        const transaction: BSCRawUnsignedTransaction = newUnsignedTransaction({
          bscType: 'raw',
          nonce: BSCUtils.toHex(txCount),
          gasLimit: BSCUtils.toHex(estimatedGas.toFixed()),
          gasPrice: BSCUtils.toHex(gasPrice.toFixed()),
          to: this.contractAddress,
          value: BSCUtils.toHex(new BigNumber(0).toFixed()),
          chainId: this.options.network.chainId,
          data: new BSCRPCDataTransfer(details[0].to, BSCUtils.toHex(wrappedAmount.toFixed())).abiEncoded()
        })

        return transaction
      } else {
        throw new BalanceError(Domain.ERC20, 'not enough ETH balance')
      }
    } else {
      throw new BalanceError(Domain.ERC20, 'not enough token balance')
    }
  }

  // Custom

  public async name(): Promise<string | undefined> {
    return this.nodeClient.getContractName(this.contractAddress)
  }

  public async symbol(): Promise<string | undefined> {
    return this.nodeClient.getContractSymbol(this.contractAddress)
  }

  public async decimals(): Promise<number | undefined> {
    return this.nodeClient.getContractDecimals(this.contractAddress)
  }

  protected async estimateGas(
    fromAddress: string,
    toAddress: string,
    amount: string | number | BigNumber | Amount,
    _data?: string
  ): Promise<BigNumber> {
    let hexAmount: string
    if (typeof amount === 'string' && isHex(amount)) {
      hexAmount = amount
    } else {
      const blockchainAmount: Amount = isAmount(amount) ? newAmount(amount).blockchain(this.units) : newAmount(amount, 'blockchain')

      hexAmount = BSCUtils.toHex(blockchainAmount.value)
    }

    return this.nodeClient.estimateTransferGas(this.contractAddress, fromAddress, toAddress, hexAmount)
  }
}
