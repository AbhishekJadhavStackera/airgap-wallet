import { AirGapTransaction } from '@airgap/module-kit'

import { BSCTransactionCursor } from '../../types/transaction'

export type BSCInfoClientTransaction = Omit<AirGapTransaction, 'network'>
export interface BSCInfoClientTransactionsResult {
  transactions: BSCInfoClientTransaction[]
  cursor: {
    page: number
  }
}

export abstract class BSCInfoClient {
  public baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  public abstract fetchTransactions(
    address: string,
    limit: number,
    cursor?: BSCTransactionCursor
  ): Promise<BSCInfoClientTransactionsResult>
  public abstract fetchContractTransactions(
    contractAddress: string,
    address: string,
    limit: number,
    cursor?: BSCTransactionCursor
  ): Promise<BSCInfoClientTransactionsResult>
}
