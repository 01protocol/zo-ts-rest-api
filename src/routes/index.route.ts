import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import { Commitment, Connection, Keypair } from '@solana/web3.js';
import { Cluster, createProgram, Margin, State, ZO_DEVNET_STATE_KEY, ZO_MAINNET_STATE_KEY } from '@zero_one/client';
import { COMMITMENT, DEPLOY_MODE, RPC_URL, SECRET_KEY, SKIP_PREFLIGHT } from '@config';
import { Provider } from '@project-serum/anchor';
import { Wallet } from '@project-serum/anchor/src/provider';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

export enum DeployMode {
  Devnet = 'devnet',
  Prod = 'prod',
}

export function getCluster() {
  if (DEPLOY_MODE !== DeployMode.Devnet) {
    return Cluster.Mainnet;
  }
  return Cluster.Devnet;
}

export const STATE_KEY = DEPLOY_MODE == DeployMode.Devnet ? ZO_DEVNET_STATE_KEY : ZO_MAINNET_STATE_KEY;

function getSecretKey() {
  try {
    return Keypair.fromSecretKey(Uint8Array.from(SECRET_KEY.split(',').map(el => parseInt(el))));
  } catch (_) {
    return Keypair.fromSecretKey(bs58.decode(SECRET_KEY));
  }
}

class IndexRoute implements Routes {
  public path = '';
  public router = Router();
  private margin: Margin;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    //GET
    this.router.post(`${this.path}/login`, async (req, res) => {
      try {
        console.log(DEPLOY_MODE == DeployMode.Devnet);
        if (this.margin) {
          await this.margin.unsubscribe();
        }
        const commitment = req.body.commitment ? (req.body.commitment as Commitment) : (COMMITMENT as Commitment);
        const rpcUrl = req.body.rpcUrl ? req.body.rpcUrl : RPC_URL;
        const skipPreflight = req.body.skipPreflight ? (req.body.skipPreflight as boolean) : SKIP_PREFLIGHT == 'true';
        const keypair = getSecretKey();
        console.log(keypair.publicKey.toString());
        const wallet: Wallet = {
          publicKey: keypair.publicKey,
          signTransaction: async tx => {
            await tx.sign(keypair);
            return tx;
          },
          signAllTransactions: async txs => {
            for (const tx of txs) {
              await tx.sign(keypair);
            }
            return txs;
          },
        };
        const connection = new Connection(rpcUrl);
        const provider = new Provider(connection, wallet, {
          commitment: commitment,
          skipPreflight: skipPreflight,
        });
        const program = createProgram(provider, getCluster());
        console.log(' no bueno');
        const state = await State.load(program, STATE_KEY, commitment);
        console.log('bueno');
        const margin = await Margin.load(program, state, null, keypair.publicKey, commitment);
        await margin.subscribe();
        const result = {
          success: true,
          marginInfo: margin.toString(),
        };
        this.margin = margin;
        res.send(result);
      } catch (e) {
        console.log(e);
        res.status(400);
        res.send({ success: false });
      }
    });
    this.router.get(`${this.path}/markets`, async (req, res) => {
      const result = {
        success: true,
        result: [
          {
            name: 'BTC-PERP',
            baseCurrency: null,
            quoteCurrency: null,
            quoteVolume24h: 28914.76,
            change1h: 0.012,
            change24h: 0.0299,
            changeBod: 0.0156,
            highLeverageFeeExempt: false,
            minProvideSize: 0.001,
            type: 'future',
            underlying: 'BTC',
            enabled: true,
            ask: 3949.25,
            bid: 3949,
            last: 10579.52,
            postOnly: false,
            price: 10579.52,
            priceIncrement: 0.25,
            sizeIncrement: 0.0001,
            restricted: false,
            volumeUsd24h: 28914.76,
            largeOrderThreshold: 5000.0,
            isEtfMarket: false,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/markets/:market_name`, async (req, res) => {
      //fixme: check if array
      const result = {
        success: true,
        result: [
          {
            name: 'BTC-PERP',
            baseCurrency: null,
            quoteCurrency: null,
            quoteVolume24h: 28914.76,
            change1h: 0.012,
            change24h: 0.0299,
            changeBod: 0.0156,
            highLeverageFeeExempt: false,
            minProvideSize: 0.001,
            type: 'future',
            underlying: 'BTC',
            enabled: true,
            ask: 3949.25,
            bid: 3949,
            last: 10579.52,
            postOnly: false,
            price: 10579.52,
            priceIncrement: 0.25,
            sizeIncrement: 0.0001,
            restricted: false,
            volumeUsd24h: 28914.76,
            largeOrderThreshold: 5000.0,
            isEtfMarket: false,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/markets/:market_name/orderbook`, async (req, res) => {
      const result = {
        success: true,
        result: {
          asks: [[4114.25, 6.263]],
          bids: [[4112.25, 49.29]],
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/markets/:market_name/trades`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const result = {
        success: true,
        result: [
          {
            id: 3855995,
            liquidation: false,
            price: 3857.75,
            side: 'buy',
            size: 0.111,
            time: '2019-03-20T18:16:23.397991+00:00',
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/markets/:market_name/candles`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const result = {
        success: true,
        result: [
          {
            close: 11055.25,
            high: 11089.0,
            low: 11043.5,
            open: 11059.25,
            startTime: '2019-06-24T17:15:00+00:00',
            volume: 464193.95725,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/funding_rates`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const result = {
        success: true,
        result: [
          {
            future: 'BTC-PERP',
            rate: 0.0025,
            time: '2019-06-02T08:00:00+00:00',
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/account`, async (req, res) => {
      const result = {
        success: true,
        result: {
          backstopProvider: true,
          collateral: 3568181.02691129,
          freeCollateral: 1786071.456884368,
          initialMarginRequirement: 0.12222384240257728,
          leverage: 10,
          liquidating: false,
          maintenanceMarginRequirement: 0.07177992558058484,
          makerFee: 0.0002,
          marginFraction: 0.5588433331419503,
          openMarginFraction: 0.2447194090423075,
          takerFee: 0.0005,
          totalAccountValue: 3568180.98341129,
          totalPositionSize: 6384939.6992,
          username: 'user@domain.com',
          positions: [
            {
              cost: -31.7906,
              entryPrice: 138.22,
              future: 'ETH-PERP',
              initialMarginRequirement: 0.1,
              longOrderSize: 1744.55,
              maintenanceMarginRequirement: 0.04,
              netSize: -0.23,
              openSize: 1744.32,
              realizedPnl: 3.39441714,
              shortOrderSize: 1732.09,
              side: 'sell',
              size: 0.23,
              unrealizedPnl: 0,
            },
          ],
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/positions`, async (req, res) => {
      const result = {
        success: true,
        result: [
          {
            cost: -31.7906,
            cumulativeBuySize: 1.2,
            cumulativeSellSize: 0.0,
            entryPrice: 138.22,
            estimatedLiquidationPrice: 152.1,
            future: 'ETH-PERP',
            initialMarginRequirement: 0.1,
            longOrderSize: 1744.55,
            maintenanceMarginRequirement: 0.04,
            netSize: -0.23,
            openSize: 1744.32,
            realizedPnl: 3.39441714,
            recentAverageOpenPrice: 135.31,
            recentBreakEvenPrice: 135.31,
            recentPnl: 3.1134,
            shortOrderSize: 1732.09,
            side: 'sell',
            size: 0.23,
            unrealizedPnl: 0,
            collateralUsed: 3.17906,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    //POST
    /*
                                            {
                                              "leverage": 10,
                                            }
                                             */
    this.router.post(`${this.path}/account/leverage`, async (req, res) => {
      throw new Error('Unimplemented');
    });
    //GET
    this.router.get(`${this.path}/wallet/coins`, async (req, res) => {
      const result = {
        success: true,
        result: [
          {
            bep2Asset: null,
            canConvert: true,
            canDeposit: true,
            canWithdraw: true,
            collateral: true,
            collateralWeight: 0.975,
            creditTo: null,
            erc20Contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            fiat: false,
            hasTag: false,
            id: 'USDT',
            isToken: false,
            methods: ['omni', 'erc20', 'trx', 'sol'],
            name: 'USD Tether',
            splMint: 'BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3iBBBDiq4',
            trc20Contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            usdFungible: false,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/wallet/balances`, async (req, res) => {
      const result = {
        success: true,
        result: [
          {
            coin: 'USDTBEAR',
            free: 2320.2,
            spotBorrow: 0.0,
            total: 2340.2,
            usdValue: 2340.2,
            availableWithoutBorrow: 2320.2,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/wallet/deposits`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const result = {
        success: true,
        result: [
          {
            coin: 'TUSD',
            confirmations: 64,
            confirmedTime: '2019-03-05T09:56:55.728933+00:00',
            fee: 0,
            id: 1,
            sentTime: '2019-03-05T09:56:55.735929+00:00',
            size: 99.0,
            status: 'confirmed',
            time: '2019-03-05T09:56:55.728933+00:00',
            txid: '0x8078356ae4b06a036d64747546c274af19581f1c78c510b60505798a7ffcaf1',
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/wallet/withdrawals`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const result = {
        success: true,
        result: [
          {
            coin: 'TUSD',
            address: '0x83a127952d266A6eA306c40Ac62A4a70668FE3BE',
            tag: null,
            fee: 0,
            id: 1,
            size: 99.0,
            status: 'complete',
            time: '2019-03-05T09:56:55.728933+00:00',
            method: 'erc20',
            txid: '0x8078356ae4b06a036d64747546c274af19581f1c78c510b60505798a7ffcaf1',
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    //POST
    /*
                                            {
                                              "coin": "USDTBEAR",
                                              "size": 20.2,
                                              "address": "0x83a127952d266A6eA306c40Ac62A4a70668FE3BE",
                                              "tag": null,
                                              "password": "my_withdrawal_password",
                                              "code": 152823
                                            }
                                             */
    this.router.post(`${this.path}/wallet/withdrawals`, async (req, res) => {
      throw new Error('Unimplemented');
    });
    /*
                                            {
                                              "coin": "USDTBEAR",
                                              "size": 20.2,
                                              "address": "0x83a127952d266A6eA306c40Ac62A4a70668FE3BE",
                                              "tag": null,
                                              "password": "my_withdrawal_password",
                                              "code": 152823
                                            }
                                             */
    this.router.post(`${this.path}/wallet/deposits`, async (req, res) => {
      throw new Error('Unimplemented');
    });
    //GET
    this.router.get(`${this.path}/orders`, async (req, res) => {
      const result = {
        success: true,
        result: [
          {
            createdAt: '2019-03-05T09:56:55.728933+00:00',
            filledSize: 10,
            future: 'XRP-PERP',
            id: 9596912,
            market: 'XRP-PERP',
            price: 0.306525,
            avgFillPrice: 0.306526,
            remainingSize: 31421,
            side: 'sell',
            size: 31431,
            status: 'open',
            type: 'limit',
            reduceOnly: false,
            ioc: false,
            postOnly: false,
            clientId: null,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/orders/history`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const result = {
        success: true,
        result: [
          {
            avgFillPrice: 10135.25,
            clientId: null,
            createdAt: '2019-06-27T15:24:03.101197+00:00',
            filledSize: 0.001,
            future: 'BTC-PERP',
            id: 257132591,
            ioc: false,
            market: 'BTC-PERP',
            postOnly: false,
            price: 10135.25,
            reduceOnly: false,
            remainingSize: 0.0,
            side: 'buy',
            size: 0.001,
            status: 'closed',
            type: 'limit',
          },
        ],
        hasMoreData: false,
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/conditional_orders`, async (req, res) => {
      const result = {
        success: true,
        result: [
          {
            createdAt: '2019-03-05T09:56:55.728933+00:00',
            error: null,
            future: 'XRP-PERP',
            id: 50001,
            market: 'XRP-PERP',
            orderId: null,
            orderPrice: null,
            reduceOnly: false,
            side: 'buy',
            size: 0.003,
            status: 'open',
            trailStart: null,
            trailValue: null,
            triggerPrice: 0.49,
            triggeredAt: null,
            type: 'stop',
            orderType: 'market',
            filledSize: 0,
            avgFillPrice: null,
            retryUntilFilled: false,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/conditional_orders/:conditional_order_id/triggers`, async (req, res) => {
      const result = {
        success: true,
        result: [
          {
            error: null,
            filledSize: 4.0,
            orderSize: 10.0,
            orderId: 38066650,
            time: '2020-01-19T09:23:36.570904+00:00',
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/conditional_orders/history`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const result = {
        success: true,
        result: [
          {
            createdAt: '2019-03-05T09:56:55.728933+00:00',
            error: null,
            future: 'XRP-PERP',
            id: 50000,
            market: 'XRP-PERP',
            orderId: 2800000,
            orderPrice: null,
            reduceOnly: false,
            side: 'buy',
            size: 31431,
            status: 'triggered',
            trailStart: null,
            trailValue: null,
            triggerPrice: 0.37,
            triggeredAt: '2019-03-06T03:26:53.268723+00:00',
            type: 'stop',
            orderType: 'market',
            filledSize: 31431,
            avgFillPrice: 0.3701,
            orderStatus: 'closed',
            retryUntilFilled: false,
          },
        ],
        hasMoreData: false,
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    //POST
    /*
                                            {
                                              "market": "XRP-PERP",
                                              "side": "sell",
                                              "price": 0.306525,
                                              "type": "limit",
                                              "size": 31431.0,
                                              "reduceOnly": false,
                                              "ioc": false,
                                              "postOnly": false,
                                              "clientId": null
                                            }
                                             */
    this.router.post(`${this.path}/orders`, async (req, res) => {
      const result = {
        success: true,
        result: {
          createdAt: '2019-03-05T09:56:55.728933+00:00',
          filledSize: 0,
          future: 'XRP-PERP',
          id: 9596912,
          market: 'XRP-PERP',
          price: 0.306525,
          remainingSize: 31431,
          side: 'sell',
          size: 31431,
          status: 'open',
          type: 'limit',
          reduceOnly: false,
          ioc: false,
          postOnly: false,
          clientId: null,
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    /*
                                            Stop
                                            {
                                              "market": "XRP-PERP",
                                              "side": "sell",
                                              "triggerPrice": 0.306525,
                                              "size": 31431.0,
                                              "type": "stop",
                                              "reduceOnly": false,
                                            }
                                            Trailing stop
                                            {
                                              "market": "XRP-PERP",
                                              "side": "sell",
                                              "trailValue": -0.05,
                                              "size": 31431.0,
                                              "type": "trailingStop",
                                              "reduceOnly": false,
                                            }
                                            Take profit
                                            {
                                              "market": "XRP-PERP",
                                              "side": "buy",
                                              "triggerPrice": 0.367895,
                                              "size": 31431.0,
                                              "type": "takeProfit",
                                              "reduceOnly": false,
                                            }
                                             */
    this.router.post(`${this.path}/conditional_orders`, async (req, res) => {
      const result = {
        success: true,
        result: {
          createdAt: '2019-03-05T09:56:55.728933+00:00',
          future: 'XRP-PERP',
          id: 9596912,
          market: 'XRP-PERP',
          triggerPrice: 0.306525,
          orderId: null,
          side: 'sell',
          size: 31431,
          status: 'open',
          type: 'stop',
          orderPrice: null,
          error: null,
          triggeredAt: null,
          reduceOnly: false,
          orderType: 'market',
          retryUntilFilled: false,
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    /*
                                            {
                                              "size": 31431,
                                              "price": 0.326525,
                                            }
                                             */
    this.router.post(`${this.path}/orders/:order_id/modify`, async (req, res) => {
      const result = {
        success: true,
        result: {
          createdAt: '2019-03-05T11:56:55.728933+00:00',
          filledSize: 0,
          future: 'XRP-PERP',
          id: 9596932,
          market: 'XRP-PERP',
          price: 0.326525,
          remainingSize: 31431,
          side: 'sell',
          size: 31431,
          status: 'open',
          type: 'limit',
          reduceOnly: false,
          ioc: false,
          postOnly: false,
          clientId: null,
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    /*
                                            {
                                              "size": 31431,
                                              "price": 0.326525,
                                            }
                                             */
    this.router.post(`${this.path}/orders/by_client_id/:client_order_id/modify`, async (req, res) => {
      const result = {
        success: true,
        result: {
          createdAt: '2019-03-05T11:56:55.728933+00:00',
          filledSize: 0,
          future: 'XRP-PERP',
          id: 9596932,
          market: 'XRP-PERP',
          price: 0.326525,
          remainingSize: 31431,
          side: 'sell',
          size: 31431,
          status: 'open',
          type: 'limit',
          reduceOnly: false,
          ioc: false,
          postOnly: false,
          clientId: null,
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    /*
                                            Stop
                                            {
                                              "triggerPrice": 0.306225,
                                              "size": 31431.0,
                                            }
                                            Trailing stop
                                            {
                                              "trailValue": -0.06,
                                              "size": 31432.0,
                                            }
                                            Take profit
                                            {
                                              "triggerPrice": 0.367885,
                                              "size": 31433.0,

                                            }
                                             */
    this.router.post(`${this.path}/conditional_orders/:order_id/modify`, async (req, res) => {
      const result = {
        success: true,
        result: {
          createdAt: '2019-03-05T09:56:55.728933+00:00',
          future: 'XRP-PERP',
          id: 9596912,
          market: 'XRP-PERP',
          triggerPrice: 0.306225,
          orderId: null,
          side: 'sell',
          size: 31431,
          status: 'open',
          type: 'stop',
          orderPrice: null,
          error: null,
          triggeredAt: null,
          reduceOnly: false,
          orderType: 'market',
          filledSize: 0,
          avgFillPrice: null,
          retryUntilFilled: false,
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    //GET
    this.router.get(`${this.path}/orders/:order_id`, async (req, res) => {
      const result = {
        success: true,
        result: {
          createdAt: '2019-03-05T09:56:55.728933+00:00',
          filledSize: 10,
          future: 'XRP-PERP',
          id: 9596912,
          market: 'XRP-PERP',
          price: 0.306525,
          avgFillPrice: 0.306526,
          remainingSize: 31421,
          side: 'sell',
          size: 31431,
          status: 'open',
          type: 'limit',
          reduceOnly: false,
          ioc: false,
          postOnly: false,
          clientId: null,
          liquidation: false,
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/orders/by_client_id/:client_order_id`, async (req, res) => {
      const result = {
        success: true,
        result: {
          createdAt: '2019-03-05T09:56:55.728933+00:00',
          filledSize: 10,
          future: 'XRP-PERP',
          id: 9596912,
          market: 'XRP-PERP',
          price: 0.306525,
          avgFillPrice: 0.306526,
          remainingSize: 31421,
          side: 'sell',
          size: 31431,
          status: 'open',
          type: 'limit',
          reduceOnly: false,
          ioc: false,
          postOnly: false,
          clientId: 'your_client_order_id',
        },
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    //DELETE
    this.router.delete(`${this.path}/orders/{order_id}`, async (req, res) => {
      const result = {
        success: true,
        result: 'Order queued for cancelation',
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.delete(`${this.path}/orders/by_client_id/:client_order_id`, async (req, res) => {
      const result = {
        success: true,
        result: 'Order queued for cancelation',
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.delete(`${this.path}/conditional_orders/{id}`, async (req, res) => {
      const result = {
        success: true,
        result: 'Order queued for cancelation',
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.delete(`${this.path}/orders`, async (req, res) => {
      const result = {
        success: true,
        result: 'Order queued for cancelation',
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    //GET
    this.router.get(`${this.path}/fills`, async (req, res) => {
      const market = req.query.market;
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const order = req.query.order;
      const orderId = req.query.orderId;
      const result = {
        success: true,
        result: [
          {
            fee: 20.1374935,
            feeCurrency: 'USD',
            feeRate: 0.0005,
            future: 'EOS-0329',
            id: 11215,
            liquidity: 'taker',
            market: 'EOS-0329',
            baseCurrency: null,
            quoteCurrency: null,
            orderId: 8436981,
            tradeId: 1013912,
            price: 4.201,
            side: 'buy',
            size: 9587,
            time: '2019-03-27T19:15:10.204619+00:00',
            type: 'order',
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
    this.router.get(`${this.path}/funding_payments`, async (req, res) => {
      const startTime = req.query.start_time;
      const end_time = req.query.end_time;
      const future = req.query.future;
      const result = {
        success: true,
        result: [
          {
            future: 'ETH-PERP',
            id: 33830,
            payment: 0.0441342,
            time: '2019-05-15T18:00:00+00:00',
            rate: 0.0001,
          },
        ],
      };
      res.send(result);
      throw new Error('Unimplemented');
    });
  }
}

export default IndexRoute;
