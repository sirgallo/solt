import lodash from 'lodash';
const { first, transform } = lodash;

import { ETCDProvider } from '@core/providers/EtcdProvider';
import { LogProvider } from '@core/providers/LogProvider';
import { InferType } from '@core/types/Infer';
import { ETCDDataProcessingOpts, GetAllResponse } from '@core/types/Etcd';
import { ISODateString } from '@core/types/ISODate';
import { TokenStatsModel } from '@common/models/TokenStats';
import { TokenSymbol } from '@common/types/token/Token';
import { Timeframe } from '@core/utils/Math';


export class TokenStatsProvider {
  constructor(
    private etcdProvider: ETCDProvider, 
    private zLog: LogProvider = new LogProvider(TokenStatsProvider.name)
  ) {}

  async insertTokenStatsEntry(payload: InferType<TokenStatsModel['ValueType'], 'OPTIONAL', 'timestamp'>
  ): Promise<{ key: TokenStatsModel['KeyType'], value: TokenStatsModel['ValueType'] }> {
    const formattedDateFrom = ((): ISODateString => {
      if (payload.timestamp) return payload.timestamp;
      return new Date().toISOString() as ISODateString;
    })();

    const key: TokenStatsModel['KeyType'] = `tokenStats/${payload.tokenSymbol}/${payload.timeframe}/${formattedDateFrom}`;
    const formattedPayload: TokenStatsModel['ValueType'] = { timestamp: formattedDateFrom, ...payload }
    await this.etcdProvider.put<TokenStatsModel['ValueType'], TokenStatsModel['KeyType']>({ key, value: formattedPayload });

    return { key, value: formattedPayload };
  }

  async getByKey(key: TokenStatsModel['KeyType']): Promise<TokenStatsModel['ValueType']> {
    return this.etcdProvider.get<TokenStatsModel['ValueType'], TokenStatsModel['KeyType']>(key);
  }

  async getLatest(opts: { token: TokenSymbol, timeframe: Timeframe }): Promise<TokenStatsModel['ValueType']> {
    const getAllResp: GetAllResponse<TokenStatsModel['ValueType'], TokenStatsModel['KeyType'], TokenStatsModel['Prefix']> = await this.etcdProvider.getAll({ 
      prefix: `tokenStats/${opts.token}/${opts.timeframe}`, sort: { on: 'Key', direction: 'Descend' }, limit: 1 
    });

    const latestEntry: TokenStatsModel['ValueType'] = getAllResp[first(Object.keys(getAllResp))];
    return latestEntry;
  }

  async iterateFromLatest(opts: InferType<TokenStatsProcessingOpts, 'OPTIONAL', 'sort' | 'limit'>): Promise<TokenStatsModel['ValueType'][]> {
    const getAllResp: GetAllResponse<TokenStatsModel['ValueType'], TokenStatsModel['KeyType'], TokenStatsModel['Prefix']> = await this.etcdProvider.getAll({ 
      prefix: opts.prefix, sort: opts?.sort ? opts.sort : { on: 'Key', direction: 'Descend' }, limit: opts.limit > 1 ? opts.limit : 1
    });

    return transform(Object.keys(getAllResp), (acc, curr) => acc.push(getAllResp[curr]), []);
  }

  async range(opts: TokenStatsProcessingOpts<'range'>): Promise<TokenStatsModel['ValueType'][]> {
    const getAllResp: GetAllResponse<TokenStatsModel['ValueType'], TokenStatsModel['KeyType'], TokenStatsModel['Prefix']> = await this.etcdProvider.getAll({ 
      range: opts.range, sort: opts?.sort ? opts.sort : { on: 'Key', direction: 'Descend' }, ...(opts?.limit ? { limit: opts.limit > 1 ? opts.limit : 1 } : null)
    });

    return transform(Object.keys(getAllResp), (acc, curr) => acc.push(getAllResp[curr]), []);
  }
}


type TokenStatsProcessingOpts<TYP = undefined> = ETCDDataProcessingOpts<
    TokenStatsModel['ValueType'], 
    TokenStatsModel['KeyType'], 
    TokenStatsModel['Prefix'], 
    (
      TYP extends 'iterate' ? 'iterate' 
      : TYP extends 'range' ? 'range' 
      : TYP extends undefined ? 'iterate' 
      : never
    )>;