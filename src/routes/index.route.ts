import {Router} from 'express'
import {Routes} from '@interfaces/routes.interface'
import {Transaction} from '@solana/web3.js'
import {
    AssetInfo,
    DepositLogData,
    EventNames,
    getConfirmedTransaction,
    OrderType,
    PnlLogData,
    processTransactionLogs,
    USD_DECIMALS,
    WithdrawLogData,
    ZoUser
} from '@zero_one/client'
import {BN} from '@project-serum/anchor'
import axios from 'axios'


class IndexRoute implements Routes {
    public path = ''
    public router = Router()

    private get margin() {
        if (this.user) return this.user.margin
        return null
    }

    private get state() {
        if (this.user)
            return this.user.state
        return null
    }

    constructor(private user: ZoUser) {
        this.initializeRoutes()
    }

    private static async errorWrapper(req, res, next, func) {
        try {
            await func(req, res, next)
        } catch (e) {
            console.log(e)
            next(e)
        }
    }

    private initializeRoutes() {
        this.router.get(
            `${this.path}/markets`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = []

                    this.state.indexToMarketKey.forEach((marketKey) => {
                        if (marketKey != 'LUNA-PERP') {
                            const market = this.state.markets[marketKey]
                            result.push({
                                name: marketKey,
                                type: 'future',
                                underlying: marketKey.split('-')[0],
                                enabled: true,
                                ask: this.state.getBestAsk(marketKey),
                                bid: this.state.getBestBid(marketKey),
                                price: market.markPrice.number
                            })
                        }
                    })
                    res.send({
                        success: true,
                        result: result
                    })
                })
        )
        this.router.get(
            `${this.path}/markets/:market_name`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const marketKey = req.params.market_name
                    const market = this.state.markets[marketKey]
                    const result = {
                        success: true,
                        result: {
                            name: marketKey,
                            type: 'future',
                            underlying: marketKey.split('-')[0],
                            enabled: true,
                            ask: this.state.getBestAsk(marketKey),
                            bid: this.state.getBestBid(marketKey),
                            price: market.markPrice.number
                        }
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/markets/:market_name/orderbook`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const marketKey = req.params.market_name
                    const result = {
                        success: true,
                        result: {
                            asks: this.state.zoMarketAccounts[marketKey].asks
                                .getL2(1000000)
                                .map((el) => [el[0], el[1]]),
                            bids: this.state.zoMarketAccounts[marketKey].bids
                                .getL2(1000000)
                                .map((el) => [el[0], el[1]])
                        }
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/markets/:market_name/trades`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const page = Number(req.query.page)
                    const marketKey = req.params.market_name
                    const trades =
                        await this.user.realm.functions.getTradeHistory({
                            page: page,
                            market: marketKey
                        })
                    const result = {
                        success: true,
                        result: trades.map((trade) => ({
                            createdAt: trade.date,
                            future: trade.marketKey,
                            market: trade.marketKey,
                            price: trade.price,
                            side: trade.isLong ? 'buy' : 'sell',
                            size: trade.size,
                            status: 'filled',
                            type: trade.isMaker ? 'limit' : 'market',
                            liquidation: false,
                            time: trade.date
                        }))
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/markets/:market_name/candles`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const startTime = req.query.start_time
                    const endTime = req.query.end_time
                    const resolution = req.query.resolution
                    const market_name = req.params.market_name
                    const url = `https://tradingview.01.xyz/history?symbol=${market_name}&resolution=${resolution}&from=${startTime}&to=${endTime}&countback=300`
                    const data = (await axios.get(url)).data
                    const result = {
                        success: true,
                        result: data.t.map((unix, i) => ({
                            close: data.c[i],
                            high: data.h[i],
                            low: data.l[i],
                            open: data.o[i],
                            startTime: new Date(unix * 1000)
                        }))
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/wallet/coins`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: Object.values(this.state.assets).map(
                            (asset: AssetInfo) => ({
                                canConvert: asset.isSwappable,
                                canDeposit: true,
                                canWithdraw: true,
                                collateral: true,
                                collateralWeight: asset.weight,
                                id: asset.symbol,
                                mint: asset.mint.toString()
                            })
                        )
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/funding_rates`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const page = Number(req.query.page)
                    const market = req.query.market_name
                    const result = {
                        success: true,
                        result: await this.user.getFundingByPage(market, page)
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/account`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: {
                            backstopProvider: false,
                            collateral:
                                this.user.unweightedCollateralValue.toNumber(),
                            freeCollateral:
                                this.user.freeCollateralValue.toNumber(),
                            initialMarginRequirement: this.margin
                                .initialMarginFraction()
                                .toNumber(),
                            liquidating: false,
                            maintenanceMarginRequirement:
                                this.user.maintenanceMarginFraction.toNumber(),
                            makerFee: 0.0,
                            marginFraction:
                                this.user.marginFraction.toNumber(),
                            openMarginFraction:
                                this.user.openMarginFraction.toNumber(),
                            takerFee: 0.001,
                            totalAccountValue:
                                this.user.unweightedAccountValue.toNumber(),
                            totalPositionSize:
                                this.user.totalPositionNotional.toNumber(),
                            username: this.margin.pubkey.toString(),
                            positions: this.user.positionsArr
                                .filter((pos) => pos.coins.number != 0)
                                .map((pos) => ({
                                    cost:
                                        pos.pCoins.number *
                                        (pos.isLong ? 1 : -1),
                                    entryPrice:
                                        pos.pCoins.number / pos.coins.number,
                                    future: pos.marketKey,
                                    initialMarginRequirement:
                                        this.state.getMarketImf(pos.marketKey),
                                    maintenanceMarginRequirement:
                                        this.state.getMarketMmf(pos.marketKey),
                                    netSize:
                                        pos.coins.number *
                                        (pos.isLong ? 1 : -1),
                                    openSize: this.margin
                                        .openSize(pos.marketKey)
                                        .toNumber(),
                                    longOrderSize: this.margin
                                        .longOrderSize(pos.marketKey)
                                        .toNumber(),
                                    shortOrderSize: this.margin
                                        .shortOrderSize(pos.marketKey)
                                        .toNumber(),
                                    side: pos.isLong ? 'buy' : 'sell',
                                    size: pos.coins.number,
                                    unrealizedPnl: this.margin
                                        .positionPnL(pos)
                                        .toNumber()
                                }))
                        }
                    }

                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/positions`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: this.user.positionsArr
                            .filter((pos) => pos.coins.number != 0)
                            .map((pos) => ({
                                cost: pos.pCoins.number * (pos.isLong ? 1 : -1),
                                entryPrice:
                                    pos.pCoins.number / pos.coins.number,
                                future: pos.marketKey,
                                initialMarginRequirement: this.state
                                    .getMarketImf(pos.marketKey)
                                    .toNumber(),
                                maintenanceMarginRequirement: this.state
                                    .getMarketMmf(pos.marketKey)
                                    .toNumber(),
                                netSize:
                                    pos.coins.number * (pos.isLong ? 1 : -1),
                                openSize: this.margin
                                    .openSize(pos.marketKey)
                                    .toNumber(),
                                longOrderSize: this.margin
                                    .longOrderSize(pos.marketKey)
                                    .toNumber(),
                                shortOrderSize: this.margin
                                    .shortOrderSize(pos.marketKey)
                                    .toNumber(),
                                side: pos.isLong ? 'buy' : 'sell',
                                size: pos.coins.number,
                                unrealizedPnl: this.margin
                                    .positionPnL(pos)
                                    .toNumber(),
                                collateralUsed: this.margin
                                    .openSize(pos.marketKey)
                                    .mul(this.state.getMarketImf(pos.marketKey))
                                    .toNumber()
                            }))
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/wallet/balances`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: Object.values(this.state.assets)
                            .filter(
                                (asset: AssetInfo) =>
                                    this.user.balances[asset.symbol].number !=
                                    0
                            )
                            .map((asset: AssetInfo) => ({
                                coin: asset.symbol,
                                free: this.user.collateralWithdrawableWithBorrow(
                                    asset.symbol
                                ),
                                spotBorrow:
                                    this.user.balances[asset.symbol].number >=
                                    0.0
                                        ? 0.0
                                        : this.user.balances[asset.symbol]
                                            .number,
                                total: this.user.balances[asset.symbol]
                                    .number,
                                usdValue:
                                    this.user.balances[asset.symbol].number *
                                    asset.indexPrice.number,
                                availableWithoutBorrow:
                                    this.user.collateralWithdrawable(
                                        asset.symbol
                                    )
                            }))
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/wallet/transfers`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const page = Number(req.query.page)
                    const transfers = await this.user.getTransferHistory(
                        page,
                        this.state.assets
                    )
                    const result = {
                        success: true,
                        result: transfers.map((transfer) => ({
                            coin: transfer.assetSymbol,
                            size: transfer.amount,
                            type: transfer.deposit ? 'deposit' : 'withdrawal',
                            status: 'processed',
                            time: transfer.date
                        }))
                    }
                    res.send(result)
                })
        )
        /*
            {
              "coin": "USDTBEAR",
              "size": 20.2,
            }
         */
        this.router.post(
            `${this.path}/wallet/withdrawals`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const symbol = req.body.coin
                    const size = req.body.size
                    const assetInfo = this.state.assets[symbol]
                    console.log(symbol, size, true)
                    const txId = await this.margin.withdraw(symbol, size, true)
                    const tx = await getConfirmedTransaction(
                        this.user.program.provider.connection,
                        txId,
                        'confirmed'
                    )
                    const logEvents = processTransactionLogs({
                        tx,
                        extraInfo: {
                            symbol,
                            decimals: assetInfo.decimals
                        }
                    })
                    let withdrawAmount
                    for (const logEvent of logEvents) {
                        if (logEvent.eventName == EventNames.WithdrawLog) {
                            const data = logEvent.data as WithdrawLogData
                            withdrawAmount = data.withdrawAmount
                            break
                        }
                    }

                    const result = {
                        success: true,
                        result: {
                            coin: symbol,
                            size: withdrawAmount,
                            status: 'processed',
                            time: new Date(),
                            txid: txId
                        }
                    }
                    res.send(result)
                })
        )
        /*
          {
            "coin": "USDTBEAR",
            "size": 20.2,
          }
       */
        this.router.post(
            `${this.path}/wallet/deposits`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const symbol = req.body.coin
                    const size = req.body.size
                    const assetInfo = this.state.assets[symbol]
                    const txId = await this.margin.deposit(symbol, size, false)
                    const tx = await getConfirmedTransaction(
                        this.user.program.provider.connection,
                        txId,
                        'confirmed'
                    )
                    const logEvents = processTransactionLogs({
                        tx,
                        extraInfo: {
                            symbol,
                            decimals: assetInfo.decimals
                        }
                    })
                    let depositAmount
                    for (const logEvent of logEvents) {
                        if (logEvent.eventName == EventNames.WithdrawLog) {
                            const data = logEvent.data as DepositLogData
                            depositAmount = data.depositAmount
                            break
                        }
                    }

                    const result = {
                        success: true,
                        result: {
                            coin: symbol,
                            size: depositAmount,
                            status: 'processed',
                            time: new Date(),
                            txid: txId
                        }
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/orders`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: this.user.orders.map((order) => ({
                            future: order.marketKey,
                            id: order.orderId.toString(),
                            market: order.marketKey,
                            price: order.price.number,
                            side: order.long ? 'buy' : 'sell',
                            size: order.coins.number,
                            status: 'open',
                            type: 'limit'
                        }))
                    }
                    res.send(result)
                })
        )
        /*
                                                              {
                                                                "size": 31431,
                                                                "price": 0.326525,
                                                              }
                                                            */
        this.router.post(
            `${this.path}/orders/:order_id/modify`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const price = req.body.price
                    const size = req.body.size
                    const txToSend = new Transaction()
                    const orderId = new BN(req.params.order_id)
                    const orderToCancel = this.user.getOrderByOrderId(orderId)
                    const cancelIx = await this.margin.makeCancelPerpOrderIx({
                        symbol: orderToCancel.symbol,
                        isLong: orderToCancel.long,
                        orderId: orderToCancel.orderId
                    })
                    const placeIx = await this.margin.makePlacePerpOrderIx({
                        symbol: orderToCancel.symbol,
                        orderType: {postOnly: {}},
                        isLong: orderToCancel.long,
                        price: price,
                        size: size
                    })
                    txToSend.add(cancelIx)
                    txToSend.add(placeIx)
                    const txId = await this.user.program.provider.send(
                        txToSend
                    )
                    const tx = await getConfirmedTransaction(
                        this.user.program.provider.connection,
                        txId,
                        'confirmed'
                    )
                    const symbol = orderToCancel.symbol
                    const marketInfo = this.state.markets[symbol]
                    const position = this.user.position(symbol)
                    const logEvents = processTransactionLogs({
                        tx,
                        extraInfo: {
                            accountLeverage: 1,
                            collateralDecimals: marketInfo.assetDecimals,
                            contractDecimals: USD_DECIMALS,
                            entryPrice:
                                position.pCoins.number / position.coins.number,
                            long: position.isLong,
                            symbol: marketInfo.symbol
                        }
                    })
                    let sizeFilled
                    for (const logEvent of logEvents) {
                        if (logEvent.eventName == EventNames.RealizedPnlLog) {
                            const data = logEvent.data as PnlLogData
                            sizeFilled = data.sizeFilled
                            break
                        }
                    }
                    const remainingSize = size - sizeFilled
                    const result = {
                        success: true,
                        result: {
                            createdAt: new Date(),
                            filledSize: sizeFilled,
                            future: symbol,
                            market: symbol,
                            price: price,
                            remainingSize: remainingSize,
                            side: orderToCancel.long ? 'buy' : 'sell',
                            size: size,
                            status: remainingSize == 0 ? 'closed' : 'open',
                            type: {limit: {}},
                            reduceOnly: false,
                            ioc: false,
                            postOnly: false,
                            clientId: null
                        }
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/orders/:order_id`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const order = this.user.getOrderByOrderId(
                        req.params.order_id
                    )
                    const result = {
                        success: true,
                        result: {
                            future: order.marketKey,
                            id: order.orderId.toString(),
                            market: order.marketKey,
                            price: order.price.number,
                            side: order.long ? 'buy' : 'sell',
                            size: order.coins.number,
                            status: 'open',
                            type: 'limit'
                        }
                    }
                    res.send(result)
                })
        )
        this.router.delete(
            `${this.path}/orders/:order_id`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: 'Order queued for cancellation'
                    }
                    const orderId = new BN(req.params.order_id)
                    const order = this.user.getOrderByOrderId(orderId)

                    await this.margin.cancelPerpOrder({
                        orderId: orderId,
                        isLong: order.long,
                        symbol: order.symbol
                    })
                    res.send(result)
                })
        )
        this.router.delete(
            `${this.path}/orders/by_client_id/:market_name/:client_order_id`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: 'Order queued for cancellation'
                    }
                    const clientId = new BN(req.params.client_order_id)
                    const symbol = req.params.market_name

                    await this.margin.cancelPerpOrder({
                        clientId: clientId,
                        symbol: symbol
                    })
                    res.send(result)
                })
        )
        this.router.delete(
            `${this.path}/orders`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const result = {
                        success: true,
                        result: 'Orders queued for cancellation'
                    }
                    await Promise.all(
                        this.user.orders.map(
                            (order) =>
                                new Promise(async (res) => {
                                    await this.margin.cancelPerpOrder({
                                        orderId: order.orderId,
                                        isLong: order.long,
                                        symbol: order.marketKey
                                    })
                                    res(true)
                                })
                        )
                    )
                    res.send(result)
                })
        )
        /*
          {
            "market": "XRP-PERP",
            "side": "sell",
            "price": 0.306525,
            "size": 31431.0,
            "reduceOnly": false,
            "ioc": false,
            "postOnly": false,
            "clientId": null
          }
        */
        this.router.post(
            `${this.path}/orders`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const symbol: string = req.body.market
                    const isLong: boolean = req.body.side == 'buy'
                    const price: number = req.body.price
                    const size: number = req.body.size
                    const reduceOnly: boolean = req.body.reduceOnly == 'true'
                    const ioc: boolean = req.body.ioc == 'true'
                    const postOnly: boolean = req.body.postOnly == 'true'
                    const clientId: number = req.body.clientId

                    let orderType: OrderType = {limit: {}}
                    if (ioc) {
                        if (reduceOnly) {
                            orderType = {reduceOnlyIoc: {}}
                        } else {
                            orderType = {immediateOrCancel: {}}
                        }
                    } else if (postOnly) {
                        orderType = {postOnly: {}}
                    } else if (reduceOnly) {
                        orderType = {reduceOnlyLimit: {}}
                    }
                    const marketInfo = this.state.markets[symbol]
                    const position = this.user.position(symbol)
                    console.log({
                        symbol,
                        orderType,
                        isLong,
                        price,
                        size,
                        clientId
                    })
                    const txId = await this.margin.placePerpOrder({
                        symbol,
                        orderType,
                        isLong,
                        price,
                        size,
                        clientId
                    })
                    const tx = await getConfirmedTransaction(
                        this.user.program.provider.connection,
                        txId,
                        'confirmed'
                    )
                    const logEvents = processTransactionLogs({
                        tx,
                        extraInfo: {
                            accountLeverage: 1,
                            collateralDecimals: marketInfo.assetDecimals,
                            contractDecimals: USD_DECIMALS,
                            entryPrice:
                                position.pCoins.number / position.coins.number,
                            long: position.isLong,
                            symbol: marketInfo.symbol
                        }
                    })
                    let sizeFilled
                    for (const logEvent of logEvents) {
                        if (logEvent.eventName == EventNames.RealizedPnlLog) {
                            const data = logEvent.data as PnlLogData
                            sizeFilled = data.sizeFilled
                            break
                        }
                    }
                    const remainingSize = size - sizeFilled
                    const result = {
                        success: true,
                        result: {
                            createdAt: new Date(),
                            filledSize: sizeFilled,
                            future: symbol,
                            market: symbol,
                            price: price,
                            remainingSize: remainingSize,
                            side: isLong ? 'buy' : 'sell',
                            size: size,
                            status: remainingSize == 0 ? 'closed' : 'open',
                            reduceOnly: reduceOnly,
                            ioc: ioc,
                            postOnly: postOnly,
                            clientId: clientId
                        }
                    }
                    res.send(result)
                })
        )
        this.router.delete(
            `${this.path}/positions/:market_name`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const symbol: string = req.params.market_name
                    const txId = await this.user.margin.closePosition(symbol)
                    const result = {
                        success: true,
                        result: {
                            txId: txId
                        }
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/trades/history`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const market: string = req.query.market
                        ? req.query.market
                        : 'SOL-PERP'
                    const allTrades = req.query.market ? false : true
                    const page = Number(req.query.page)
                    const trades = await this.user.getTradesAndFunding(
                        page,
                        market,
                        false,
                        allTrades
                    )
                    const result = {
                        success: true,
                        result: trades.map((trade) => ({
                            future: trade.marketKey,
                            liquidity: trade.isMaker ? 'maker' : 'taker',
                            market: trade.marketKey,
                            price: trade.price,
                            side: trade.isLong ? 'buy' : 'sell',
                            size: trade.size,
                            time: trade.date
                        }))
                    }
                    res.send(result)
                })
        )
        this.router.get(
            `${this.path}/funding_payments`,
            (req, res, next) =>
                IndexRoute.errorWrapper(req, res, next, async (req, res) => {
                    const market: string = req.query.market
                    const page = Number(req.query.page)
                    const trades = await this.user.getTradesAndFunding(
                        page,
                        market,
                        true,
                        false
                    )
                    const result = {
                        success: true,
                        result: trades.map((trade) => ({
                            future: trade.marketKey,
                            payment: trade.price * trade.size,
                            rate: trade.price,
                            date: trade.date
                        }))
                    }
                    res.send(result)
                })
        )
    }
}

export default IndexRoute

/*  future requests for conditional orders:

   this.router.get(`${this.path}/conditional_orders`, IndexRoute.auth, (req, res, next) =>
     IndexRoute.errorWrapper(req, res, next, async (req, res) => {
       const result = {
         success: true,
         result: [
           {
             createdAt: '2019-03-05T09:56:55.728933+00:00',
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

       throw new Error('Unimplemented');
       res.send(result);
     }),
   );
   this.router.get(`${this.path}/conditional_orders/:conditional_order_id/triggers`, IndexRoute.auth, (req, res, next) =>
     IndexRoute.errorWrapper(req, res, next, async (req, res) => {
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

       throw new Error('Unimplemented');
       res.send(result);
     }),
   );
   this.router.get(`${this.path}/conditional_orders/history`, IndexRoute.auth, (req, res, next) =>
     IndexRoute.errorWrapper(req, res, next, async (req, res) => {
       const startTime = req.query.start_time;
       const end_time = req.query.end_time;
       const result = {
         success: true,
         result: [
           {
             createdAt: '2019-03-05T09:56:55.728933+00:00',
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

       throw new Error('Unimplemented');
     }),
   );
   /
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
                           /
     this.router.post(`${this.path}/conditional_orders`, IndexRoute.auth, (req, res, next) =>
         IndexRoute.errorWrapper(req, res, next, async (req, res) => {
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

             throw new Error('Unimplemented');
             res.send(result);
         }),
     );
   /
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
                           /
     this.router.post(`${this.path}/conditional_orders/:order_id/modify`, IndexRoute.auth, (req, res, next) =>
         IndexRoute.errorWrapper(req, res, next, async (req, res) => {
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

             throw new Error('Unimplemented');
             res.send(result);
         }),
     );

   this.router.delete(`${this.path}/conditional_orders/:id`, IndexRoute.auth, (req, res, next) =>
     IndexRoute.errorWrapper(req, res, next, async (req, res) => {
       const result = {
         success: true,
         result: 'Order queued for cancelation',
       };

       throw new Error('Unimplemented');
       res.send(result);
     }),
   );

     * */
