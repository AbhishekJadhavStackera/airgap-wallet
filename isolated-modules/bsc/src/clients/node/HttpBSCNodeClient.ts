// tslint:disable: max-classes-per-file
import { assertNever } from '@airgap/coinlib-core'
import { RPCBody } from '@airgap/coinlib-core/data/RPCBody'
import axios, { AxiosError } from '@airgap/coinlib-core/dependencies/src/axios-0.19.0'
import { BigNumber } from '@airgap/coinlib-core/dependencies/src/bignumber.js-9.0.0/bignumber'
import { InvalidValueError, NetworkError, UnsupportedError } from '@airgap/coinlib-core/errors'
import { Domain } from '@airgap/coinlib-core/errors/coinlib-error'
import { RPCConvertible } from '@airgap/coinlib-core/interfaces/RPCConvertible'
import { AirGapTransactionStatus } from '@airgap/module-kit'

import { BSCUtils } from '../../utils/BSCUtils'

import { BSCNodeClient } from './BSCNodeClient'

export class BSCRPCBody extends RPCBody implements RPCConvertible {
  public static blockEarliest: string = 'earliest'
  public static blockLatest: string = 'latest'
  public static blockPending: string = 'pending'

  public toRPCBody(): string {
    return JSON.stringify(this.toJSON())
  }

  public toJSON(): any {
    return {
      jsonrpc: this.jsonrpc,
      method: this.method,
      params: this.params,
      id: this.id
    }
  }
}

export interface BSCRPCResponse {
  id: number
  jsonrpc: string
  result?: any
  error?: {
    code: number
    message: string
  }
}

export class BSCRPCData {
  // 2 chars = 1 byte hence to get to 32 bytes we need 64 chars
  protected static parametersLength: number = 64
  public methodSignature: string

  constructor(methodSignature: string) {
    this.methodSignature = methodSignature
  }

  public abiEncoded(): string {
    const hash = BSCUtils.sha3(this.methodSignature)
    if (hash === null) {
      return ''
    }

    return `0x${hash.slice(2, 10)}`
  }

  public static addLeadingZeroPadding(value: string, targetLength: number = BSCRPCData.parametersLength): string {
    let result = value
    while (result.length < targetLength || result.length % 2 !== 0) {
      result = '0' + result
    }

    return result
  }

  public static removeLeadingZeroPadding(value: string): string {
    let result = value
    while (result.startsWith('0')) {
      result = result.slice(1) // this can probably be done much more efficiently with a regex
    }

    return result
  }

  public static abiDecoded(value: string, encodedType: 'bytes'): string {
    switch (encodedType) {
      case 'bytes':
        if (value.startsWith('0x')) {
          value = value.slice(2)
        }

        const buffer = Buffer.from(value, 'hex')
        const offset = new BigNumber(buffer.slice(0, 32).toString('hex'), 16).toNumber()
        const length = new BigNumber(buffer.slice(offset, offset + 32).toString('hex'), 16).toNumber()

        return buffer.slice(offset + 32, offset + 32 + length).toString('hex')
      default:
        assertNever(encodedType)
        throw new UnsupportedError(Domain.ETHEREUM, 'Unsupported ABI encoded type')
    }
  }
}

export class BSCRPCDataBalanceOf extends BSCRPCData {
  public static methodName: string = 'balanceOf'
  public address: string

  constructor(address: string) {
    super(`${BSCRPCDataBalanceOf.methodName}(address)`)
    this.address = address
  }

  public abiEncoded(): string {
    let srcAddress = this.address
    if (srcAddress.startsWith('0x')) {
      srcAddress = srcAddress.slice(2)
    }

    return super.abiEncoded() + BSCRPCData.addLeadingZeroPadding(srcAddress)
  }
}

export class BSCRPCDataTransfer extends BSCRPCData {
  public static methodName: string = 'transfer'
  public recipient: string
  public amount: string

  constructor(toAddressOrData: string, amount?: string) {
    super(`${BSCRPCDataTransfer.methodName}(address,uint256)`)
    if (amount) {
      const toAddress = toAddressOrData
      this.recipient = toAddress
      this.amount = amount
    } else {
      const data = toAddressOrData
      const methodID = super.abiEncoded()
      if (!data.startsWith(methodID)) {
        throw new InvalidValueError(Domain.ETHEREUM, 'unexpected method ID')
      }
      const params = data.slice(methodID.length)
      const recipient = BSCRPCData.removeLeadingZeroPadding(params.slice(0, BSCRPCData.parametersLength))
      const parsedAmount = BSCRPCData.removeLeadingZeroPadding(params.slice(BSCRPCData.parametersLength))
      this.recipient = `0x${recipient}`
      this.amount = `0x${parsedAmount}`
    }
  }

  public abiEncoded(): string {
    let dstAddress = this.recipient
    if (dstAddress.startsWith('0x')) {
      dstAddress = dstAddress.slice(2)
    }
    let transferAmount = this.amount
    if (transferAmount.startsWith('0x')) {
      transferAmount = transferAmount.slice(2)
    }

    return (
      super.abiEncoded() +
      BSCRPCData.addLeadingZeroPadding(dstAddress.toLowerCase()) +
      BSCRPCData.addLeadingZeroPadding(transferAmount.toLowerCase())
    )
  }
}

export class HttpBSCNodeClient implements BSCNodeClient {
  constructor(protected readonly baseURL: string, protected readonly headers?: any) { }

  public async fetchBalance(address: string): Promise<BigNumber> {
    const body = new BSCRPCBody('eth_getBalance', [address, BSCRPCBody.blockLatest])

    const response = await this.send(body)

    return new BigNumber(response.result)
  }

  public async fetchTransactionCount(address: string): Promise<number> {
    const body = new BSCRPCBody('eth_getTransactionCount', [address, BSCRPCBody.blockLatest])

    const response = await this.send(body)

    return new BigNumber(response.result).toNumber()
  }

  public async sendSignedTransaction(transaction: string): Promise<string> {
    const body = new BSCRPCBody('eth_sendRawTransaction', [transaction])

    return (await this.send(body)).result
  }

  public async getTransactionStatus(transactionHash: string): Promise<AirGapTransactionStatus> {
    const body = new BSCRPCBody('eth_getTransactionReceipt', [transactionHash])

    const response = await this.send(body)

    return response.result.status === '0x1' ? { type: 'applied' } : { type: 'failed' }
  }

  public async callBalanceOf(contractAddress: string, address: string): Promise<BigNumber> {
    const body = this.balanceOfBody(contractAddress, address)
    const response = await this.send(body)

    return new BigNumber(response.result)
  }

  public async callBalanceOfOnContracts(contractAddresses: string[], address: string): Promise<{ [contractAddress: string]: BigNumber }> {
    const bodies = contractAddresses.map((contractAddress, index) => this.balanceOfBody(contractAddress, address, index))
    const responses = await this.batchSend(bodies)
    const result: { [contractAddress: string]: BigNumber } = {}
    responses.forEach((response) => {
      result[contractAddresses[response.id]] = new BigNumber(response.result ?? 0)
    })

    return result
  }

  private balanceOfBody(contractAddress: string, address: string, id: number = 0): BSCRPCBody {
    const data = new BSCRPCDataBalanceOf(address)

    return this.contractCallBody(contractAddress, data, [BSCRPCBody.blockLatest], id)
  }

  public async estimateTransactionGas(
    fromAddress: string,
    toAddress: string,
    amount?: string,
    data?: string,
    gas?: string
  ): Promise<BigNumber> {
    const body = new BSCRPCBody('eth_estimateGas', [{ from: fromAddress, to: toAddress, gas, value: amount, data }])

    const response = await this.send(body)

    return new BigNumber(response.result)
  }

  public async estimateTransferGas(contractAddress: string, fromAddress: string, toAddress: string, hexAmount: string): Promise<BigNumber> {
    const data = new BSCRPCDataTransfer(toAddress, hexAmount)
    const result = this.estimateTransactionGas(fromAddress, contractAddress, undefined, data.abiEncoded())

    return result
  }

  public async getGasPrice(): Promise<BigNumber> {
    const body = new BSCRPCBody('eth_gasPrice', [])

    const response = await this.send(body)

    return new BigNumber(response.result)
  }

  public async getContractName(contractAddress: string): Promise<string | undefined> {
    const data = new BSCRPCData('name()')
    const body = this.contractCallBody(contractAddress, data, [BSCRPCBody.blockLatest])

    const response = await this.send(body)
    if (!response.result) {
      return undefined
    }

    const result = BSCRPCData.abiDecoded(response.result, 'bytes')

    return BSCUtils.hexToUtf8(result)
  }

  public async getContractSymbol(contractAddress: string): Promise<string | undefined> {
    const data = new BSCRPCData('symbol()')
    const body = this.contractCallBody(contractAddress, data, [BSCRPCBody.blockLatest])

    const response = await this.send(body)
    if (!response.result) {
      return undefined
    }

    const result = BSCRPCData.abiDecoded(response.result, 'bytes')

    return BSCUtils.hexToUtf8(result)
  }

  public async getContractDecimals(contractAddress: string): Promise<number | undefined> {
    const data = new BSCRPCData('decimals()')
    const body = this.contractCallBody(contractAddress, data, [BSCRPCBody.blockLatest])

    const response = await this.send(body)
    if (!response.result) {
      return undefined
    }

    return BSCUtils.hexToNumber(response.result).toNumber()
  }

  protected contractCallBody(
    contractAddress: string,
    data: BSCRPCData,
    extraParams: any[] = [],
    id?: number,
    jsonrpc?: string
  ): BSCRPCBody {
    return new BSCRPCBody('eth_call', [{ to: contractAddress, data: data.abiEncoded() }, ...extraParams], id, jsonrpc)
  }

  protected async send(body: BSCRPCBody): Promise<BSCRPCResponse> {
    const response = await axios.post(this.baseURL, body.toRPCBody(), { headers: this.headers }).catch((error) => {
      throw new NetworkError(Domain.ETHEREUM, error as AxiosError)
    })

    return response.data
  }

  protected async batchSend(bodies: BSCRPCBody[]): Promise<BSCRPCResponse[]> {
    const response = await axios
      .post(this.baseURL, JSON.stringify(bodies.map((body) => body.toJSON())), { headers: this.headers })
      .catch((error) => {
        throw new NetworkError(Domain.ETHEREUM, error as AxiosError)
      })

    return response.data
  }
}
