import { subDays } from 'date-fns';

import { BaseSoltIO } from '@toolset/SoltIO/BaseSoltIO';

import { envLoader } from '@common/EnvLoader';
import { TokenPriceProvider } from '@common/providers/token/TokenPriceProvider';
import { PriceEvent, TokenOHLCResponse } from '@common/types/token/TokenPrice';


export class TestTokenPriceProvider extends BaseSoltIO {
  private testTokenPriceProvider: TokenPriceProvider;
  constructor() { 
    super(); 
    this.testTokenPriceProvider = new TokenPriceProvider(envLoader.BIRDEYE_API_KEY, 'solana');
  }

  async runTest(): Promise<boolean> {
    // this.testSocket();
    const resp = await this.testGetOHLC();

    this.zLog.debug(`resp: ${JSON.stringify(resp, null, 2)}`);
    return true;
  }

  private async testGetOHLC(): Promise<TokenOHLCResponse> {
    const now = new Date();
    const dayAgo = subDays(now, 1);

    return this.testTokenPriceProvider.getOHLC({
      address: envLoader.TOKEN_ADDRESS,
      type: '15m',
      time_from: dayAgo,
      time_to: now
    });
  }

  private async testSocket() { 
    const event: PriceEvent = 'price_data';
    const tpProvider = new TokenPriceProvider(envLoader.BIRDEYE_API_KEY, 'solana');
    
    tpProvider.startPriceListener(event, {
      type: 'SUBSCRIBE_PRICE',
      data: {
        queryType: 'simple',
        chartType: '5m',
        address: envLoader.TOKEN_ADDRESS,
        currency: 'usd'
      }
    });

    tpProvider.onPriceData('price_data', priceData => this.zLog.info(`price data: ${JSON.stringify(priceData)}`) );
  }
}

new TestTokenPriceProvider().start().then(res => {
  console.log('res:', res);
  process.exit(0);
}).catch(err => {
  console.log('err:', err);
  process.exit(1);
});