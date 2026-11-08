import ftWebsocketBase from './base.js'
import protoRoot from "./proto.cjs"; // local CJS descriptor, patched runtime dependency
import protobuf from "protobufjs";
import crypto from "crypto";
import long from "long"
protobuf.util.Long = long;
protobuf.configure();

export const ftCmdID = {
    // 全局协议
    InitConnect: { cmd: 1001, name: 'GetGlobalState', description: '初始化连接' }, /**< 初始化连接 */
    GetGlobalState: { cmd: 1002, name: 'GetGlobalState', description: '获取全局状态' }, /**< 获取全局状态 */
    Notify: { cmd: 1003, name: 'Notify', description: '推送通知' }, /**< 推送通知 */
    KeepAlive: { cmd: 1004, name: 'KeepAlive', description: '心跳' },  /**< 心跳 */
    GetUserInfo: { cmd: 1005, name: 'GetUserInfo', description: '获取用户信息' }, /**< 获取用户信息 */
    GetDelayStatistics: { cmd: 1007, name: 'GetDelayStatistics', description: '获取延迟统计' }, /**< 获取延迟统计 */
    // 行情-实时数据协议
    QotSub: { cmd: 3001, name: 'Qot_Sub', description: '订阅或者反订阅' }, /**< 订阅或者反订阅 */
    QotRegQotPush: { cmd: 3002, name: 'Qot_RegQotPush', description: '注册推送' }, /**< 注册推送 */
    QotGetSubInfo: { cmd: 3003, name: 'Qot_GetSubInfo', description: '获取订阅信息' }, /**< 获取订阅信息 */
    QotGetBasicQot: { cmd: 3004, name: 'Qot_GetBasicQot', description: '获取基本行情' }, /**< 获取基本行情 */
    QotUpdateBasicQot: { cmd: 3005, name: 'Qot_UpdateBasicQot', description: '推送基本行情' }, /**< 推送基本行情 */
    QotGetKL: { cmd: 3006, name: 'Qot_GetKL', description: '获取K线' }, /**< 获取K线 */
    QotUpdateKL: { cmd: 3007, name: 'Qot_UpdateKL', description: '推送K线' }, /**< 推送K线 */
    QotGetRT: { cmd: 3008, name: 'Qot_GetRT', description: '获取分时' }, /**< 获取分时 */
    QotUpdateRT: { cmd: 3009, name: 'Qot_UpdateRT', description: '获取分时' }, /**< 获取分时 */
    QotGetTicker: { cmd: 3010, name: 'Qot_GetTicker', description: '获取逐笔' }, /**< 获取逐笔 */
    QotUpdateTicker: { cmd: 3011, name: 'Qot_UpdateTicker', description: '推送逐笔' }, /**< 推送逐笔 */
    QotGetOrderBook: { cmd: 3012, name: 'Qot_GetOrderBook', description: '获取买卖盘' }, /**< 获取买卖盘 */
    QotUpdateOrderBook: { cmd: 3013, name: 'Qot_UpdateOrderBook', description: '推送买卖盘' }, /**< 推送买卖盘 */
    QotGetBroker: { cmd: 3014, name: 'Qot_GetBroker', description: '获取经纪队列' }, /**< 获取经纪队列 */
    QotUpdateBroker: { cmd: 3015, name: 'Qot_UpdateBroker', description: '推送经纪队列' }, /**< 推送经纪队列 */
    QotUpdatePriceReminder: { cmd: 3019, name: 'Qot_UpdatePriceReminder', description: '推送到价提醒' }, /**< 推送到价提醒 */

    //	行情-历史数据协议
    QotRequestHistoryKL: { cmd: 3103, name: 'Qot_RequestHistoryKL', description: '拉取历史K线，不读本地历史数据DB' }, /**< 拉取历史K线，不读本地历史数据DB */
    QotRequestHistoryKLQuota: { cmd: 3104, name: 'Qot_RequestHistoryKLQuota', description: '拉取历史K线已经用掉的额度' }, /**< 拉取历史K线已经用掉的额度 */
    QotRequestRehab: { cmd: 3105, name: 'Qot_RequestRehab', description: '拉取复权信息，不读本地历史数据DB' }, /**< 拉取复权信息，不读本地历史数据DB */

    // 行情-其他数据协议
    QotGetTradeDate: { cmd: 3200, name: 'Qot_GetTradeDate', description: '获取市场交易日' }, /**< 获取市场交易日 */
    QotGetSuspend: { cmd: 3201, name: 'Qot_GetSuspend', description: '获取股票停牌信息' }, /**< 获取股票停牌信息 */
    QotGetStaticInfo: { cmd: 3202, name: 'Qot_GetStaticInfo', description: '获取股票静态信息' }, /**< 获取股票静态信息 */
    QotGetSecuritySnapshot: { cmd: 3203, name: 'Qot_GetSecuritySnapshot', description: '获取股票快照' }, /**< 获取股票快照 */
    QotGetPlateSet: { cmd: 3204, name: 'Qot_GetPlateSet', description: '获取板块集合下的板块' }, /**< 获取板块集合下的板块 */
    QotGetPlateSecurity: { cmd: 3205, name: 'Qot_GetPlateSecurity', description: '获取板块下的股票' }, /**< 获取板块下的股票 */
    QotGetReference: { cmd: 3206, name: 'Qot_GetReference', description: '获取正股相关股票，暂时只有窝轮' }, /**< 获取正股相关股票，暂时只有窝轮 */
    QotGetOwnerPlate: { cmd: 3207, name: 'Qot_GetOwnerPlate', description: '获取股票所属板块' }, /**< 获取股票所属板块 */
    QotGetHoldingChangeList: { cmd: 3208, name: 'Qot_GetHoldingChangeList', description: '获取大股东持股变化列表' }, /**< 获取大股东持股变化列表 */
    QotGetOptionChain: { cmd: 3209, name: 'Qot_GetOptionChain', description: '获取期权链' }, /**< 获取期权链 */
    QotGetWarrant: { cmd: 3210, name: 'Qot_GetWarrant', description: '获取涡轮' }, /**< 获取涡轮 */
    QotGetCapitalFlow: { cmd: 3211, name: 'Qot_GetCapitalFlow', description: '获取资金流向' }, /**< 获取资金流向 */
    QotGetCapitalDistribution: { cmd: 3212, name: 'Qot_GetCapitalDistribution', description: '获取资金分布' }, /**< 获取资金分布 */
    QotGetUserSecurity: { cmd: 3213, name: 'Qot_GetUserSecurity', description: '获取自选股分组下的股票' }, /**< 获取自选股分组下的股票 */
    QotModifyUserSecurity: { cmd: 3214, name: 'Qot_ModifyUserSecurity', description: '修改自选股分组下的股票' }, /**< 修改自选股分组下的股票 */
    QotStockFilter: { cmd: 3215, name: 'Qot_StockFilter', description: '条件选股' }, /**< 条件选股 */
    QotStockScreen: { cmd: 3252, name: 'Qot_StockScreen', description: '条件选股V2' }, /**< 条件选股V2 */
    QotOptionScreen: { cmd: 3253, name: 'Qot_OptionScreen', description: '期权选股' }, /**< 期权选股 */
    QotWarrantScreen: { cmd: 3254, name: 'Qot_WarrantScreen', description: '窝轮筛选V2' }, /**< 窝轮筛选V2 */
    QotGetCodeChange: { cmd: 3216, name: 'Qot_GetCodeChange', description: '获取股票代码变化信息' }, /**< 获取股票代码变化信息*/
    QotGetIpoList: { cmd: 3217, name: 'Qot_GetIpoList', description: '获取新股IPO' }, /**< 获取新股IPO */
    QotGetFutureInfo: { cmd: 3218, name: 'Qot_GetFutureInfo', description: '获取期货合约资料' }, /**< 获取期货合约资料 */
    QotRequestTradeDate: { cmd: 3219, name: 'Qot_RequestTradeDate', description: '获取市场交易日' }, /**< 获取市场交易日 */
    QotSetPriceReminder: { cmd: 3220, name: 'Qot_SetPriceReminder', description: '设置到价提醒' }, /**< 设置到价提醒 */
    QotGetPriceReminder: { cmd: 3221, name: 'Qot_GetPriceReminder', description: '获取到价提醒' }, /**< 获取到价提醒 */
    QotGetUserSecurityGroup: { cmd: 3222, name: 'Qot_GetUserSecurityGroup', description: '获取自选股分组列表' }, /**< 获取自选股分组列表 */
    QotGetMarketState: { cmd: 3223, name: 'Qot_GetMarketState', description: '获取股票对应市场状态' }, /**< 获取股票对应市场状态 */
    QotGetOptionExpirationDate: { cmd: 3224, name: 'Qot_GetOptionExpirationDate', description: '获取期权链到期日' }, /**< 获取期权链到期日 */
    QotGetOptionQuote: { cmd: 3255, name: 'Qot_GetOptionQuote', description: '获取期权行情' }, /**< 获取期权行情 */
    QotGetOptionStrategy: { cmd: 3256, name: 'Qot_GetOptionStrategy', description: '获取期权策略' }, /**< 获取期权策略 */
    QotGetOptionStrategyAnalysis: { cmd: 3257, name: 'Qot_GetOptionStrategyAnalysis', description: '获取期权策略分析' }, /**< 获取期权策略分析 */
    QotGetOptionStrategySpread: { cmd: 3258, name: 'Qot_GetOptionStrategySpread', description: '获取期权策略价差' }, /**< 获取期权策略价差 */

    // 行情-期权/榜单/机构/产业链/宏观等扩展协议
    QotGetIndicatorList: { cmd: 3259, name: 'Qot_GetIndicatorList', description: '获取指标列表' }, /**< 获取指标列表 */
    QotRequestIndicatorCalc: { cmd: 3260, name: 'Qot_RequestIndicatorCalc', description: '异步发起指标计算' }, /**< 异步发起指标计算 */
    QotPushIndicatorCalc: { cmd: 3261, name: 'Qot_PushIndicatorCalc', description: '指标异步计算结果推送' }, /**< 指标异步计算结果推送 */
    QotGetSearchQuote: { cmd: 3262, name: 'Qot_GetSearchQuote', description: '搜索行情' }, /**< 搜索行情 */
    QotGetSearchNews: { cmd: 3263, name: 'Qot_GetSearchNews', description: '搜索资讯' }, /**< 搜索资讯 */
    QotGetOptionMarketStatistic: { cmd: 3301, name: 'Qot_GetOptionMarketStatistic', description: '获取期权市场统计' }, /**< 获取期权市场统计 */
    QotGetOptionUnderlyingHisStatistic: { cmd: 3302, name: 'Qot_GetOptionUnderlyingHisStatistic', description: '获取期权标的历史统计' }, /**< 获取期权标的历史统计 */
    QotGetOptionUnderlyingOverview: { cmd: 3303, name: 'Qot_GetOptionUnderlyingOverview', description: '获取批量标的最新数据' }, /**< 获取批量标的最新数据 */
    QotGetOptionUnderlyingHisVolatility: { cmd: 3304, name: 'Qot_GetOptionUnderlyingHisVolatility', description: '获取历史波动率' }, /**< 获取历史波动率 */
    QotGetOptionUnderlyingRank: { cmd: 3305, name: 'Qot_GetOptionUnderlyingRank', description: '获取标的排行' }, /**< 获取标的排行 */
    QotGetOptionRank: { cmd: 3306, name: 'Qot_GetOptionRank', description: '获取期权合约排行' }, /**< 获取期权合约排行 */
    QotGetOptionEvent: { cmd: 3307, name: 'Qot_GetOptionEvent', description: '获取期权异动列表' }, /**< 获取期权异动列表 */
    QotGetOptionEventAlert: { cmd: 3308, name: 'Qot_GetOptionEventAlert', description: '获取期权异动告警设置' }, /**< 获取期权异动告警设置 */
    QotSetOptionEventAlert: { cmd: 3309, name: 'Qot_SetOptionEventAlert', description: '修改期权异动告警条件' }, /**< 修改期权异动告警条件 */
    QotUpdateOptionEvent: { cmd: 3310, name: 'Qot_UpdateOptionEvent', description: '期权异动推送' }, /**< 期权异动推送 */
    QotGetOptionZeroDteScreener: { cmd: 3311, name: 'Qot_GetOptionZeroDteScreener', description: '获取末日期权标的列表' }, /**< 获取末日期权标的列表 */
    QotGetOptionZeroDteContract: { cmd: 3312, name: 'Qot_GetOptionZeroDteContract', description: '获取末日期权合约列表' }, /**< 获取末日期权合约列表 */
    QotGetOptionEarningsScreener: { cmd: 3313, name: 'Qot_GetOptionEarningsScreener', description: '获取财报期权标的列表' }, /**< 获取财报期权标的列表 */
    QotGetOptionSellerScreener: { cmd: 3314, name: 'Qot_GetOptionSellerScreener', description: '获取期权卖方策略列表' }, /**< 获取期权卖方策略列表 */
    QotGetEarningsCalendar: { cmd: 3401, name: 'Qot_GetEarningsCalendar', description: '获取财报日历' }, /**< 获取财报日历 */
    QotGetMacroIndicatorList: { cmd: 3402, name: 'Qot_GetMacroIndicatorList', description: '获取宏观指标列表' }, /**< 获取宏观指标列表 */
    QotGetMacroIndicatorHistory: { cmd: 3403, name: 'Qot_GetMacroIndicatorHistory', description: '获取宏观指标历史数据' }, /**< 获取宏观指标历史数据 */
    QotGetFedWatchTargetRate: { cmd: 3404, name: 'Qot_GetFedWatchTargetRate', description: '获取美联储利率预测(FedWatch概率)' }, /**< 获取美联储利率预测(FedWatch概率) */
    QotGetFedWatchDotPlot: { cmd: 3405, name: 'Qot_GetFedWatchDotPlot', description: '获取CME利率点阵图' }, /**< 获取CME利率点阵图 */
    QotGetEarningsBeatRank: { cmd: 3406, name: 'Qot_GetEarningsBeatRank', description: '获取盈利超预期排行' }, /**< 获取盈利超预期排行 */
    QotGetDividendRank: { cmd: 3407, name: 'Qot_GetDividendRank', description: '获取股息排行' }, /**< 获取股息排行 */
    QotGetDividendCalendar: { cmd: 3408, name: 'Qot_GetDividendCalendar', description: '获取派息日历' }, /**< 获取派息日历 */
    QotGetEconomicCalendar: { cmd: 3409, name: 'Qot_GetEconomicCalendar', description: '获取财经日历(经济数据事件)' }, /**< 获取财经日历(经济数据事件) */
    QotGetUSPreMarketRank: { cmd: 3410, name: 'Qot_GetUSPreMarketRank', description: '获取盘前榜(美股)' }, /**< 获取盘前榜(美股) */
    QotGetUSAfterHoursRank: { cmd: 3411, name: 'Qot_GetUSAfterHoursRank', description: '获取盘后榜(美股)' }, /**< 获取盘后榜(美股) */
    QotGetUSOvernightRank: { cmd: 3412, name: 'Qot_GetUSOvernightRank', description: '获取夜盘榜(美股)' }, /**< 获取夜盘榜(美股) */
    QotGetTopMoversRank: { cmd: 3413, name: 'Qot_GetTopMoversRank', description: '获取领涨/领跌榜(盘中)' }, /**< 获取领涨/领跌榜(盘中) */
    QotGetHotList: { cmd: 3414, name: 'Qot_GetHotList', description: '获取热议榜' }, /**< 获取热议榜 */
    QotGetShortSellingRank: { cmd: 3415, name: 'Qot_GetShortSellingRank', description: '获取卖空异动榜(美股)' }, /**< 获取卖空异动榜(美股) */
    QotGetPeriodChangeRank: { cmd: 3416, name: 'Qot_GetPeriodChangeRank', description: '获取区间涨跌幅' }, /**< 获取区间涨跌幅 */
    QotGetHighDividendSOERank: { cmd: 3417, name: 'Qot_GetHighDividendSOERank', description: '获取破净高股息国央企(港股)' }, /**< 获取破净高股息国央企(港股) */
    QotGetInstitutionList: { cmd: 3418, name: 'Qot_GetInstitutionList', description: '获取机构持仓列表' }, /**< 获取机构持仓列表 */
    QotGetInstitutionProfile: { cmd: 3419, name: 'Qot_GetInstitutionProfile', description: '获取机构概况' }, /**< 获取机构概况 */
    QotGetInstitutionDistribution: { cmd: 3420, name: 'Qot_GetInstitutionDistribution', description: '获取机构持仓行业分布' }, /**< 获取机构持仓行业分布 */
    QotGetInstitutionHoldingChange: { cmd: 3421, name: 'Qot_GetInstitutionHoldingChange', description: '获取机构持仓变动' }, /**< 获取机构持仓变动 */
    QotGetInstitutionHoldingList: { cmd: 3422, name: 'Qot_GetInstitutionHoldingList', description: '获取机构持股列表' }, /**< 获取机构持股列表 */
    QotGetArkFundHolding: { cmd: 3423, name: 'Qot_GetArkFundHolding', description: '获取ARK基金持仓' }, /**< 获取ARK基金持仓 */
    QotGetArkStockDynamic: { cmd: 3424, name: 'Qot_GetArkStockDynamic', description: '获取ARK个股交易动态' }, /**< 获取ARK个股交易动态 */
    QotGetArkActiveTransaction: { cmd: 3425, name: 'Qot_GetArkActiveTransaction', description: '获取ARK主动交易聚合' }, /**< 获取ARK主动交易聚合 */
    QotGetRatingChange: { cmd: 3426, name: 'Qot_GetRatingChange', description: '获取评级变动' }, /**< 获取评级变动 */
    QotGetIndustrialChainList: { cmd: 3427, name: 'Qot_GetIndustrialChainList', description: '获取产业链列表' }, /**< 获取产业链列表 */
    QotGetIndustrialChainDetail: { cmd: 3428, name: 'Qot_GetIndustrialChainDetail', description: '获取产业链详情' }, /**< 获取产业链详情 */
    QotGetIndustrialChainByPlate: { cmd: 3429, name: 'Qot_GetIndustrialChainByPlate', description: '获取板块关联产业链' }, /**< 获取板块关联产业链 */
    QotGetIndustrialPlateInfo: { cmd: 3430, name: 'Qot_GetIndustrialPlateInfo', description: '获取产业板块信息' }, /**< 获取产业板块信息 */
    QotGetIndustrialPlateStock: { cmd: 3431, name: 'Qot_GetIndustrialPlateStock', description: '获取产业板块成分股' }, /**< 获取产业板块成分股 */
    QotGetHeatMapData: { cmd: 3432, name: 'Qot_GetHeatMapData', description: '获取热力图数据' }, /**< 获取热力图数据 */
    QotGetRiseFallDistribution: { cmd: 3433, name: 'Qot_GetRiseFallDistribution', description: '获取涨跌分布' }, /**< 获取涨跌分布 */

    // 行情-事件合约(预测市场)协议
    QotGetEventContractCategory: { cmd: 3434, name: 'Qot_GetEventContractCategory', description: '获取事件合约分类' }, /**< 获取事件合约分类 */
    QotFilterCompetition: { cmd: 3435, name: 'Qot_FilterCompetition', description: '获取赛事筛选选项' }, /**< 获取赛事筛选选项 */
    QotGetEventContractSeriesList: { cmd: 3436, name: 'Qot_GetEventContractSeriesList', description: '获取事件合约Series列表' }, /**< 获取事件合约Series列表 */
    QotGetEventContractEventList: { cmd: 3437, name: 'Qot_GetEventContractEventList', description: '获取事件合约Event列表' }, /**< 获取事件合约Event列表 */
    QotGetEventContract: { cmd: 3438, name: 'Qot_GetEventContract', description: '获取事件合约(合约列表)' }, /**< 获取事件合约(合约列表) */
    QotGetEventContractMilestoneList: { cmd: 3439, name: 'Qot_GetEventContractMilestoneList', description: '获取事件合约里程碑列表' }, /**< 获取事件合约里程碑列表 */
    QotGetEventContractSnapshot: { cmd: 3445, name: 'Qot_GetEventContractSnapshot', description: '获取事件合约快照' }, /**< 获取事件合约快照 */
    QotGetEventContractOrderBook: { cmd: 3446, name: 'Qot_GetEventContractOrderBook', description: '获取事件合约摆盘' }, /**< 获取事件合约摆盘 */
    QotGetEventContractKline: { cmd: 3447, name: 'Qot_GetEventContractKline', description: '获取事件合约K线' }, /**< 获取事件合约K线 */
    QotGetEventContractTicker: { cmd: 3448, name: 'Qot_GetEventContractTicker', description: '获取事件合约逐笔' }, /**< 获取事件合约逐笔 */
    QotUpdateEventContractOrderBook: { cmd: 3450, name: 'Qot_UpdateEventContractOrderBook', description: '事件合约摆盘推送' }, /**< 事件合约摆盘推送 */
    QotUpdateEventContractKline: { cmd: 3451, name: 'Qot_UpdateEventContractKline', description: '事件合约K线推送' }, /**< 事件合约K线推送 */
    QotUpdateEventContractTicker: { cmd: 3452, name: 'Qot_UpdateEventContractTicker', description: '事件合约逐笔推送' }, /**< 事件合约逐笔推送 */
    QotGetEventContractComboList: { cmd: 3453, name: 'Qot_GetEventContractComboList', description: '获取事件合约可Combo列表' }, /**< 获取事件合约可Combo列表 */
    QotGetEventContractComboRfq: { cmd: 3454, name: 'Qot_GetEventContractComboRfq', description: '事件合约Combo询价' }, /**< 事件合约Combo询价 */
    QotSubEventContract: { cmd: 3455, name: 'Qot_SubEventContract', description: '事件合约订阅/反订阅' }, /**< 事件合约订阅/反订阅 */
    QotRequestHistoryEventContractKL: { cmd: 3456, name: 'Qot_RequestHistoryEventContractKL', description: '拉取事件合约历史K线' }, /**< 拉取事件合约历史K线 */

    // 交易协议
    TrdGetAccList: { cmd: 2001, name: 'Trd_GetAccList', description: '获取交易账户列表' }, /**< 获取交易账户列表 */
    TrdUnlockTrade: { cmd: 2005, name: 'Trd_UnlockTrade', description: '解锁或锁定交易' }, /**< 解锁或锁定交易 */
    TrdSubAccPush: { cmd: 2008, name: 'Trd_SubAccPush', description: '订阅接收推送数据的交易账户' }, /**< 订阅接收推送数据的交易账户 */
    TrdGetFunds: { cmd: 2101, name: 'Trd_GetFunds', description: '获取账户资金' }, /**< 获取账户资金 */
    TrdGetPositionList: { cmd: 2102, name: 'Trd_GetPositionList', description: '获取账户持仓' }, /**< 获取账户持仓 */
    TrdGetMaxTrdQtys: { cmd: 2111, name: 'Trd_GetMaxTrdQtys', description: '获取最大交易数量' }, /**< 获取最大交易数量 */
    TrdGetComboMaxTrdQtys: { cmd: 2112, name: 'Trd_GetComboMaxTrdQtys', description: '获取组合的可买卖信息' }, /**< 获取组合的可买卖信息 */
    TrdGetOrderList: { cmd: 2201, name: 'Trd_GetOrderList', description: '获取订单列表' }, /**< 获取订单列表 */
    TrdPlaceOrder: { cmd: 2202, name: 'Trd_PlaceOrder', description: '下单' }, /**< 下单 */
    TrdModifyOrder: { cmd: 2205, name: 'Trd_ModifyOrder', description: '修改订单' }, /**< 修改订单 */
    TrdUpdateOrder: { cmd: 2208, name: 'Trd_UpdateOrder', description: '订单状态变动通知(推送)' }, /**< 订单状态变动通知(推送) */
    TrdGetOrderFillList: { cmd: 2211, name: 'Trd_GetOrderFillList', description: '获取成交列表' }, /**< 获取成交列表 */
    TrdUpdateOrderFill: { cmd: 2218, name: 'Trd_UpdateOrderFill', description: '成交通知(推送)' }, /**< 成交通知(推送) */
    TrdGetHistoryOrderList: { cmd: 2221, name: 'Trd_GetHistoryOrderList', description: '获取历史订单列表' }, /**< 获取历史订单列表 */
    TrdGetHistoryOrderFillList: { cmd: 2222, name: 'Trd_GetHistoryOrderFillList', description: '获取历史成交列表' }, /**< 获取历史成交列表 */
	TrdGetMarginRatio: { cmd: 2223, name: 'Trd_GetMarginRatio', description: '获取融资融券数据' }, /**< 获取融资融券数据 */
	TrdGetOrderFee: { cmd: 2225, name: 'Trd_GetOrderFee', description: '获取订单收费明细数据' }, /**< 获取订单收费明细数据 */
	TrdFlowSummary: { cmd: 2226, name: 'Trd_FlowSummary', description: '获取资金流水' }, /**< 获取资金流水 */
	TrdPlaceComboOrder: { cmd: 2227, name: 'Trd_PlaceComboOrder', description: '组合期权下单' }, /**< 组合期权下单 */
}

class ftWebsocket {
    constructor() {
        this.websock = null;
        this.onlogin = null;
        this.onPush = null;
    }

    static findCmdObj(cmd) {
        for (let key in ftCmdID) {
            if (ftCmdID[key].cmd == cmd) {
                return ftCmdID[key];
            }
        }
        return null;
    }

    start(ip, port, ssl, key) {
        if (this.websock == null || this.websock == undefined) {
            this.websock = new ftWebsocketBase()
            this.websock.regPushCallback(this, this._onPush.bind(this));
        }
        else {
            this.websock.close();
        }
        this.websock.setWsConfig(ip, port, ssl);

        let message = null;
        let keyMD5 = "";
        if (key) {
            keyMD5 = crypto.createHash("md5").update(key).digest("hex");
        }
        const InitWebSocketPBMessageRequest = protoRoot.lookup("InitWebSocket.Request"); // 请求体message
        let initWebSocketReq = {
            c2s: {
                websocketKey: keyMD5,
                programmingLanguage: "JavaScript"
            }
        };
        message = InitWebSocketPBMessageRequest.encode(
            InitWebSocketPBMessageRequest.create(initWebSocketReq)
        ).finish();
        this.websock.initWebSocket(message);

        this.websock.onlogin = (ret, msg) => {
            if (this.onlogin && typeof this.onlogin == 'function') {
                this.onlogin(ret, msg)
            }
        };
    }

    getConnID() {
        return this.websock.connID;
    }

	/**
	* @brief 订阅，反订阅
	* @param [in] stReq 请求包，具体字段请参考Qot_Sub.proto协议
	*/
    Sub(req) {
        return this._sendCmd(ftCmdID.QotSub.cmd, req, ftCmdID.QotSub.name);
    }
    /**
     * @brief 获取交易帐号列表
     * @param [in] stReq 请求包，具体字段请参考Trd_GetAccList.proto协议
     */
    GetAccList(req) {
        return this._sendCmd(ftCmdID.TrdGetAccList.cmd, req, ftCmdID.TrdGetAccList.name);
    }
	/**
	* @brief 解锁，针对OpenD解锁一次即可
	* @param [in] stReq 请求包，具体字段请参考Trd_UnlockTrade.proto协议
	*/
    UnlockTrade(req) {
        return this._sendCmd(ftCmdID.TrdUnlockTrade.cmd, req, ftCmdID.TrdUnlockTrade.name);
    }
	/**
	* @brief 订阅接收推送数据的交易账户
	* @param [in] stReq 请求包，具体字段请参考Trd_SubAccPush.proto协议
	*/
    SubAccPush(req) {
        return this._sendCmd(ftCmdID.TrdSubAccPush.cmd, req, ftCmdID.TrdSubAccPush.name);
    }
	/**
	* @brief 获取账户资金
	* @param [in] stReq 请求包，具体字段请参考Trd_GetFunds.proto协议
	*/
    GetFunds(req) {
        return this._sendCmd(ftCmdID.TrdGetFunds.cmd, req, ftCmdID.TrdGetFunds.name);
    }
	/**
	* @brief 获取账户持仓
	* @param [in] stReq 请求包，具体字段请参考Trd_GetPositionList.proto协议
	*/
    GetPositionList(req) {
        return this._sendCmd(ftCmdID.TrdGetPositionList.cmd, req, ftCmdID.TrdGetPositionList.name);
    }
	/**
	* @brief 获取最大交易数量
	* @param [in] stReq 请求包，具体字段请参考Trd_GetMaxTrdQtys.proto协议
	*/
    GetMaxTrdQtys(req) {
        return this._sendCmd(ftCmdID.TrdGetMaxTrdQtys.cmd, req, ftCmdID.TrdGetMaxTrdQtys.name);
    }
	/**
	* @brief 获取当日订单列表
	* @param [in] stReq 请求包，具体字段请参考Trd_GetOrderList.proto协议
	*/
    GetOrderList(req) {
        return this._sendCmd(ftCmdID.TrdGetOrderList.cmd, req, ftCmdID.TrdGetOrderList.name);
    }
	/**
	* @brief 下单
	* @param [in] stReq 请求包，具体字段请参考Trd_PlaceOrder.proto协议，PacketID不需填写，发送时接口会填
	*/
    PlaceOrder(req) {
        return this._sendCmd(ftCmdID.TrdPlaceOrder.cmd, req, ftCmdID.TrdPlaceOrder.name);
    }
	/**
	* @brief 修改订单
	* @param [in] stReq 请求包，具体字段请参考Trd_ModifyOrder.proto协议，PacketID不需填写，发送时接口会填
	*/
    ModifyOrder(req) {
        return this._sendCmd(ftCmdID.TrdModifyOrder.cmd, req, ftCmdID.TrdModifyOrder.name);
    }
	/**
	* @brief 获取当日成交列表
	* @param [in] stReq 请求包，具体字段请参考Trd_GetOrderFillList.proto协议
	*/
    GetOrderFillList(req) {
        return this._sendCmd(ftCmdID.TrdGetOrderFillList.cmd, req, ftCmdID.TrdGetOrderFillList.name);
    }
	/**
	* @brief 获取历史订单列表
	* @param [in] stReq 请求包，具体字段请参考Trd_GetHistoryOrderList.proto协议
	*/
    GetHistoryOrderList(req) {
        return this._sendCmd(ftCmdID.TrdGetHistoryOrderList.cmd, req, ftCmdID.TrdGetHistoryOrderList.name);
    }
	/**
	* @brief 获取历史成交列表
	* @param [in] stReq 请求包，具体字段请参考Trd_GetHistoryOrderFillList.proto协议
	*/
    GetHistoryOrderFillList(req) {
        return this._sendCmd(ftCmdID.TrdGetHistoryOrderFillList.cmd, req, ftCmdID.TrdGetHistoryOrderFillList.name);
    }
	/**
	* @brief 获取融资融券数据
	* @param [in] stReq 请求包，具体字段请参考Trd_GetMarginRatio.proto协议
	*/
    GetMarginRatio(req) {
        return this._sendCmd(ftCmdID.TrdGetMarginRatio.cmd, req, ftCmdID.TrdGetMarginRatio.name);
    }

	/**
	* @brief 获取订单收费明细数据
	* @param [in] stReq 请求包，具体字段请参考Trd_GetOrderFee.proto协议
	*/
    GetOrderFee(req) {
        return this._sendCmd(ftCmdID.TrdGetOrderFee.cmd, req, ftCmdID.TrdGetOrderFee.name);
    }
	
	/**
	* @brief 获取资金流水
	* @param [in] stReq 请求包，具体字段请参考Trd_FlowSummary.proto协议
	*/
    GetFlowSummary(req) {
        return this._sendCmd(ftCmdID.TrdFlowSummary.cmd, req, ftCmdID.TrdFlowSummary.name);
    }

    /**
	* @brief 请求全局状态
	* @praram 具体字段请参考GetGlobalState.proto协议
	*/
    GetGlobalState(req) {
        return this._sendCmd(ftCmdID.GetGlobalState.cmd, req, ftCmdID.GetGlobalState.name);
    }
	/**
	* @brief 注册推送
	* @param 具体字段请参考Qot_RegQotPush.proto协议
	*/
    RegQotPush(req) {
        return this._sendCmd(ftCmdID.QotRegQotPush.cmd, req, ftCmdID.QotRegQotPush.name);
    }
	/**
	* @brief 获取订阅信息
	* @praram 具体字段请参考Qot_GetSubInfo.proto协议
	*/
    GetSubInfo(req) {
        return this._sendCmd(ftCmdID.QotGetSubInfo.cmd, req, ftCmdID.QotGetSubInfo.name);
    }
	/**
	* @brief 获取逐笔
	* @praram 具体字段请参考Qot_GetTicker.proto协议
	*/
    GetTicker(req) {
        return this._sendCmd(ftCmdID.QotGetTicker.cmd, req, ftCmdID.QotGetTicker.name);
    }
	/**
	* @brief 获取报价
	* @praram 具体字段请参考Qot_GetBasicQot.proto协议
	*/
    GetBasicQot(req) {
        return this._sendCmd(ftCmdID.QotGetBasicQot.cmd, req, ftCmdID.QotGetBasicQot.name);
    }
	/**
	* @brief 获取摆盘
	* @praram 具体字段请参考Qot_GetOrderBook.proto协议
	*/
    GetOrderBook(req) {
        return this._sendCmd(ftCmdID.QotGetOrderBook.cmd, req, ftCmdID.QotGetOrderBook.name);
    }
	/**
	* @brief 获取K线
	* @praram 具体字段请参考Qot_GetKL.proto协议
	*/
    GetKL(req) {
        return this._sendCmd(ftCmdID.QotGetKL.cmd, req, ftCmdID.QotGetKL.name);
    }
	/**
	* @brief 获取分时
	* @praram 具体字段请参考Qot_GetRT.proto协议
	*/
    GetRT(req) {
        return this._sendCmd(ftCmdID.QotGetRT.cmd, req, ftCmdID.QotGetRT.name);
    }
	/**
	* @brief 获取经纪队列
	* @praram 具体字段请参考Qot_GetBroker.proto协议
	*/
    GetBroker(req) {
        return this._sendCmd(ftCmdID.QotGetBroker.cmd, req, ftCmdID.QotGetBroker.name);
    }
	/**
	* @brief 在线请求历史复权信息，不读本地历史数据DB
	* @praram 具体字段请参考Qot_RequestRehab.proto协议
	*/
    RequestRehab(req) {
        return this._sendCmd(ftCmdID.QotRequestRehab.cmd, req, ftCmdID.QotRequestRehab.name);
    }
	/**
	* @brief 在线请求历史K线，不读本地历史数据DB
	* @praram 具体字段请参考Qot_RequestHistoryKL.proto协议
	*/
    RequestHistoryKL(req) {
        return this._sendCmd(ftCmdID.QotRequestHistoryKL.cmd, req, ftCmdID.QotRequestHistoryKL.name);
    }
	/**
	* @brief 获取历史K线已经用掉的额度 
	* @praram 具体字段请参考Qot_RequestHistoryKLQuota.proto协议
	*/
    RequestHistoryKLQuota(req) {
        return this._sendCmd(ftCmdID.QotRequestHistoryKLQuota.cmd, req, ftCmdID.QotRequestHistoryKLQuota.name);
    }
	/**
	* @brief 获取交易日
	* @praram 具体字段请参考Qot_GetTradeDate.proto协议
	*/
    GetTradeDate(req) {
        return this._sendCmd(ftCmdID.QotGetTradeDate.cmd, req, ftCmdID.QotGetTradeDate.name);
    }
	/**
	* @brief 获取静态信息
	* @praram 具体字段请参考Qot_GetStaticInfo.proto协议
	*/
    GetStaticInfo(req) {
        return this._sendCmd(ftCmdID.QotGetStaticInfo.cmd, req, ftCmdID.QotGetStaticInfo.name);
    }
	/**
	* @brief 获取股票快照
	* @praram 具体字段请参考Qot_GetSecuritySnapshot.proto协议
	*/
    GetSecuritySnapshot(req) {
        return this._sendCmd(ftCmdID.QotGetSecuritySnapshot.cmd, req, ftCmdID.QotGetSecuritySnapshot.name);
    }
	/**
	* @brief 获取板块集合下的板块
	* @praram 具体字段请参考Qot_GetPlateSet.proto协议
	*/
    GetPlateSet(req) {
        return this._sendCmd(ftCmdID.QotGetPlateSet.cmd, req, ftCmdID.QotGetPlateSet.name);
    }
	/**
	* @brief 获取板块下的股票
	* @praram 具体字段请参考Qot_GetPlateSecurity.proto协议
	*/
    GetPlateSecurity(req) {
        return this._sendCmd(ftCmdID.QotGetPlateSecurity.cmd, req, ftCmdID.QotGetPlateSecurity.name);
    }
	/**
	* @brief 获取相关股票
	* @praram 具体字段请参考Qot_GetReference.proto协议
	*/
    GetReference(req) {
        return this._sendCmd(ftCmdID.QotGetReference.cmd, req, ftCmdID.QotGetReference.name);
    }
	/**
	* @brief 获取股票所属的板块
	* @praram 具体字段请参考Qot_GetOwnerPlate.proto协议
	*/
    GetOwnerPlate(req) {
        return this._sendCmd(ftCmdID.QotGetOwnerPlate.cmd, req, ftCmdID.QotGetOwnerPlate.name);
    }
	/**
	* @brief 获取大股东持股变化列表
	* @praram 具体字段请参考Qot_GetHoldingChangeList.proto协议
	*/
    GetHoldingChangeList(req) {
        return this._sendCmd(ftCmdID.QotGetHoldingChangeList.cmd, req, ftCmdID.QotGetHoldingChangeList.name);
    }
	/**
	* @brief 筛选期权
	* @praram 具体字段请参考Qot_GetOptionChain.proto协议
	*/
    GetOptionChain(req) {
        return this._sendCmd(ftCmdID.QotGetOptionChain.cmd, req, ftCmdID.QotGetOptionChain.name);
    }
	/**
	* @brief 筛选窝轮
	* @praram 具体字段请参考Qot_GetWarrant.proto协议
	*/
    GetWarrant(req) {
        return this._sendCmd(ftCmdID.QotGetWarrant.cmd, req, ftCmdID.QotGetWarrant.name);
    }
	/**
	* @brief 获取资金流向
	* @praram 具体字段请参考Qot_GetCapitalFlow.proto协议
	*/
    GetCapitalFlow(req) {
        return this._sendCmd(ftCmdID.QotGetCapitalFlow.cmd, req, ftCmdID.QotGetCapitalFlow.name);
    }
	/**
	* @brief 获取资金分布
	* @praram 具体字段请参考Qot_GetCapitalDistribution.proto协议
	*/
    GetCapitalDistribution(req) {
        return this._sendCmd(ftCmdID.QotGetCapitalDistribution.cmd, req, ftCmdID.QotGetCapitalDistribution.name);
    }
	/**
	* @brief 获取自选股分组下的股票
	* @praram 具体字段请参考Qot_GetUserSecurity.proto协议
	*/
    GetUserSecurity(req) {
        return this._sendCmd(ftCmdID.QotGetUserSecurity.cmd, req, ftCmdID.QotGetUserSecurity.name);
    }
	/**
	* @brief 修改自选股分组下的股票
	* @praram 具体字段请参考Qot_ModifyUserSecurity.proto协议
	*/
    ModifyUserSecurity(req) {
        return this._sendCmd(ftCmdID.QotModifyUserSecurity.cmd, req, ftCmdID.QotModifyUserSecurity.name);
    }
	/**
	* @brief 条件选股
	* @praram 具体字段请参考Qot_StockFilter.proto协议
	*/
    StockFilter(req) {
        return this._sendCmd(ftCmdID.QotStockFilter.cmd, req, ftCmdID.QotStockFilter.name);
    }
	/**
	* @brief 条件选股V2
	* @praram 具体字段请参考Qot_StockScreen.proto协议
	*/
    GetStockScreen(req) {
        return this._sendCmd(ftCmdID.QotStockScreen.cmd, req, ftCmdID.QotStockScreen.name);
    }
	/**
	* @brief 期权选股
	* @praram 具体字段请参考Qot_OptionScreen.proto协议
	*/
    GetOptionScreen(req) {
        return this._sendCmd(ftCmdID.QotOptionScreen.cmd, req, ftCmdID.QotOptionScreen.name);
    }
	/**
	* @brief 窝轮筛选V2
	* @praram 具体字段请参考Qot_WarrantScreen.proto协议
	*/
    GetWarrantScreen(req) {
        return this._sendCmd(ftCmdID.QotWarrantScreen.cmd, req, ftCmdID.QotWarrantScreen.name);
    }
	/**
	* @brief 获取股票代码变化信息
	* @praram 具体字段请参考Qot_GetCodeChange.proto协议
	*/
    GetCodeChange(req) {
        return this._sendCmd(ftCmdID.QotGetCodeChange.cmd, req, ftCmdID.QotGetCodeChange.name);
    }
	/**
	* @brief 新股IPO
	* @praram 具体字段请参考Qot_GetIpoList.proto协议
	*/
    GetIpoList(req) {
        return this._sendCmd(ftCmdID.QotGetIpoList.cmd, req, ftCmdID.QotGetIpoList.name);
    }
    /**
	* @brief 期货合约资料
	* @praram 具体字段请参考Qot_GetFutureInfo.proto协议
	*/
    GetFutureInfo(req) {
        return this._sendCmd(ftCmdID.QotGetFutureInfo.cmd, req, ftCmdID.QotGetFutureInfo.name);
    }
    /**
	* @brief 获取市场交易日
	* @praram 具体字段请参考QotRequestTradeDate.proto协议
	*/
    RequestTradeDate(req) {
        return this._sendCmd(ftCmdID.QotRequestTradeDate.cmd, req, ftCmdID.QotRequestTradeDate.name);
    }
	/**
	* @brief 设置到价提醒
	* @praram 具体字段请参考QotSetPriceReminder.proto协议
	*/
    SetPriceReminder(req) {
        return this._sendCmd(ftCmdID.QotSetPriceReminder.cmd, req, ftCmdID.QotSetPriceReminder.name);
    }
	/**
	* @brief 获取到价提醒
	* @praram 具体字段请参考QotGetPriceReminder.proto协议
	*/
    GetPriceReminder(req) {
        return this._sendCmd(ftCmdID.QotGetPriceReminder.cmd, req, ftCmdID.QotGetPriceReminder.name);
    }
	/**
	* @brief 获取自选股分组列表
	* @praram 具体字段请参考QotGetUserSecurityGroup.proto协议
	*/
    GetUserSecurityGroup(req) {
        return this._sendCmd(ftCmdID.QotGetUserSecurityGroup.cmd, req, ftCmdID.QotGetUserSecurityGroup.name);
    }
    /**
	* @brief 获取股票对应市场状态
	* @praram 具体字段请参考QotGetMarketState.proto协议
	*/
    GetMarketState(req) {
        return this._sendCmd(ftCmdID.QotGetMarketState.cmd, req, ftCmdID.QotGetMarketState.name);
    }
    /**
	* @brief 获取期权链到期日
	* @praram 具体字段请参考QotGetOptionExpirationDate.proto协议
	*/
    GetOptionExpirationDate(req) {
        return this._sendCmd(ftCmdID.QotGetOptionExpirationDate.cmd, req, ftCmdID.QotGetOptionExpirationDate.name);
    }
    /**
	* @brief 获取期权行情
	* @praram 具体字段请参考Qot_GetOptionQuote.proto协议
	*/
    GetOptionQuote(req) {
        return this._sendCmd(ftCmdID.QotGetOptionQuote.cmd, req, ftCmdID.QotGetOptionQuote.name);
    }
    /**
	* @brief 获取期权策略
	* @praram 具体字段请参考Qot_GetOptionStrategy.proto协议
	*/
    GetOptionStrategy(req) {
        return this._sendCmd(ftCmdID.QotGetOptionStrategy.cmd, req, ftCmdID.QotGetOptionStrategy.name);
    }
    /**
	* @brief 获取期权策略分析
	* @praram 具体字段请参考Qot_GetOptionStrategyAnalysis.proto协议
	*/
    GetOptionStrategyAnalysis(req) {
        return this._sendCmd(ftCmdID.QotGetOptionStrategyAnalysis.cmd, req, ftCmdID.QotGetOptionStrategyAnalysis.name);
    }
    /**
	* @brief 获取期权策略价差
	* @praram 具体字段请参考Qot_GetOptionStrategySpread.proto协议
	*/
    GetOptionStrategySpread(req) {
        return this._sendCmd(ftCmdID.QotGetOptionStrategySpread.cmd, req, ftCmdID.QotGetOptionStrategySpread.name);
    }
    /**
	* @brief 获取组合的可买卖信息
	* @praram 具体字段请参考Trd_GetComboMaxTrdQtys.proto协议
	*/
    GetComboMaxTrdQtys(req) {
        return this._sendCmd(ftCmdID.TrdGetComboMaxTrdQtys.cmd, req, ftCmdID.TrdGetComboMaxTrdQtys.name);
    }
    /**
	* @brief 组合期权下单
	* @praram 具体字段请参考Trd_PlaceComboOrder.proto协议
	*/
    PlaceComboOrder(req) {
        return this._sendCmd(ftCmdID.TrdPlaceComboOrder.cmd, req, ftCmdID.TrdPlaceComboOrder.name);
    }
    /**
     * @brief 获取指标列表
     * @param [in] req 请求包，具体字段请参考Qot_GetIndicatorList.proto协议
     */
    GetIndicatorList(req) {
        return this._sendCmd(ftCmdID.QotGetIndicatorList.cmd, req, ftCmdID.QotGetIndicatorList.name);
    }
    /**
     * @brief 异步发起指标计算
     * @param [in] req 请求包，具体字段请参考Qot_RequestIndicatorCalc.proto协议
     */
    RequestIndicatorCalc(req) {
        return this._sendCmd(ftCmdID.QotRequestIndicatorCalc.cmd, req, ftCmdID.QotRequestIndicatorCalc.name);
    }
    /**
     * @brief 搜索行情
     * @param [in] req 请求包，具体字段请参考Qot_GetSearchQuote.proto协议
     */
    GetSearchQuote(req) {
        return this._sendCmd(ftCmdID.QotGetSearchQuote.cmd, req, ftCmdID.QotGetSearchQuote.name);
    }
    /**
     * @brief 搜索资讯
     * @param [in] req 请求包，具体字段请参考Qot_GetSearchNews.proto协议
     */
    GetSearchNews(req) {
        return this._sendCmd(ftCmdID.QotGetSearchNews.cmd, req, ftCmdID.QotGetSearchNews.name);
    }
    /**
     * @brief 获取期权市场统计
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionMarketStatistic.proto协议
     */
    GetOptionMarketStatistic(req) {
        return this._sendCmd(ftCmdID.QotGetOptionMarketStatistic.cmd, req, ftCmdID.QotGetOptionMarketStatistic.name);
    }
    /**
     * @brief 获取期权标的历史统计
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionUnderlyingHisStatistic.proto协议
     */
    GetOptionUnderlyingHisStatistic(req) {
        return this._sendCmd(ftCmdID.QotGetOptionUnderlyingHisStatistic.cmd, req, ftCmdID.QotGetOptionUnderlyingHisStatistic.name);
    }
    /**
     * @brief 获取批量标的最新数据
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionUnderlyingOverview.proto协议
     */
    GetOptionUnderlyingOverview(req) {
        return this._sendCmd(ftCmdID.QotGetOptionUnderlyingOverview.cmd, req, ftCmdID.QotGetOptionUnderlyingOverview.name);
    }
    /**
     * @brief 获取历史波动率
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionUnderlyingHisVolatility.proto协议
     */
    GetOptionUnderlyingHisVolatility(req) {
        return this._sendCmd(ftCmdID.QotGetOptionUnderlyingHisVolatility.cmd, req, ftCmdID.QotGetOptionUnderlyingHisVolatility.name);
    }
    /**
     * @brief 获取标的排行
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionUnderlyingRank.proto协议
     */
    GetOptionUnderlyingRank(req) {
        return this._sendCmd(ftCmdID.QotGetOptionUnderlyingRank.cmd, req, ftCmdID.QotGetOptionUnderlyingRank.name);
    }
    /**
     * @brief 获取期权合约排行
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionRank.proto协议
     */
    GetOptionRank(req) {
        return this._sendCmd(ftCmdID.QotGetOptionRank.cmd, req, ftCmdID.QotGetOptionRank.name);
    }
    /**
     * @brief 获取期权异动列表
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionEvent.proto协议
     */
    GetOptionEvent(req) {
        return this._sendCmd(ftCmdID.QotGetOptionEvent.cmd, req, ftCmdID.QotGetOptionEvent.name);
    }
    /**
     * @brief 获取期权异动告警设置
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionEventAlert.proto协议
     */
    GetOptionEventAlert(req) {
        return this._sendCmd(ftCmdID.QotGetOptionEventAlert.cmd, req, ftCmdID.QotGetOptionEventAlert.name);
    }
    /**
     * @brief 修改期权异动告警条件
     * @param [in] req 请求包，具体字段请参考Qot_SetOptionEventAlert.proto协议
     */
    SetOptionEventAlert(req) {
        return this._sendCmd(ftCmdID.QotSetOptionEventAlert.cmd, req, ftCmdID.QotSetOptionEventAlert.name);
    }
    /**
     * @brief 获取末日期权标的列表
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionZeroDteScreener.proto协议
     */
    GetOptionZeroDteScreener(req) {
        return this._sendCmd(ftCmdID.QotGetOptionZeroDteScreener.cmd, req, ftCmdID.QotGetOptionZeroDteScreener.name);
    }
    /**
     * @brief 获取末日期权合约列表
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionZeroDteContract.proto协议
     */
    GetOptionZeroDteContract(req) {
        return this._sendCmd(ftCmdID.QotGetOptionZeroDteContract.cmd, req, ftCmdID.QotGetOptionZeroDteContract.name);
    }
    /**
     * @brief 获取财报期权标的列表
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionEarningsScreener.proto协议
     */
    GetOptionEarningsScreener(req) {
        return this._sendCmd(ftCmdID.QotGetOptionEarningsScreener.cmd, req, ftCmdID.QotGetOptionEarningsScreener.name);
    }
    /**
     * @brief 获取期权卖方策略列表
     * @param [in] req 请求包，具体字段请参考Qot_GetOptionSellerScreener.proto协议
     */
    GetOptionSellerScreener(req) {
        return this._sendCmd(ftCmdID.QotGetOptionSellerScreener.cmd, req, ftCmdID.QotGetOptionSellerScreener.name);
    }
    /**
     * @brief 获取财报日历
     * @param [in] req 请求包，具体字段请参考Qot_GetEarningsCalendar.proto协议
     */
    GetEarningsCalendar(req) {
        return this._sendCmd(ftCmdID.QotGetEarningsCalendar.cmd, req, ftCmdID.QotGetEarningsCalendar.name);
    }
    /**
     * @brief 获取宏观指标列表
     * @param [in] req 请求包，具体字段请参考Qot_GetMacroIndicatorList.proto协议
     */
    GetMacroIndicatorList(req) {
        return this._sendCmd(ftCmdID.QotGetMacroIndicatorList.cmd, req, ftCmdID.QotGetMacroIndicatorList.name);
    }
    /**
     * @brief 获取宏观指标历史数据
     * @param [in] req 请求包，具体字段请参考Qot_GetMacroIndicatorHistory.proto协议
     */
    GetMacroIndicatorHistory(req) {
        return this._sendCmd(ftCmdID.QotGetMacroIndicatorHistory.cmd, req, ftCmdID.QotGetMacroIndicatorHistory.name);
    }
    /**
     * @brief 获取美联储利率预测(FedWatch概率)
     * @param [in] req 请求包，具体字段请参考Qot_GetFedWatchTargetRate.proto协议
     */
    GetFedWatchTargetRate(req) {
        return this._sendCmd(ftCmdID.QotGetFedWatchTargetRate.cmd, req, ftCmdID.QotGetFedWatchTargetRate.name);
    }
    /**
     * @brief 获取CME利率点阵图
     * @param [in] req 请求包，具体字段请参考Qot_GetFedWatchDotPlot.proto协议
     */
    GetFedWatchDotPlot(req) {
        return this._sendCmd(ftCmdID.QotGetFedWatchDotPlot.cmd, req, ftCmdID.QotGetFedWatchDotPlot.name);
    }
    /**
     * @brief 获取盈利超预期排行
     * @param [in] req 请求包，具体字段请参考Qot_GetEarningsBeatRank.proto协议
     */
    GetEarningsBeatRank(req) {
        return this._sendCmd(ftCmdID.QotGetEarningsBeatRank.cmd, req, ftCmdID.QotGetEarningsBeatRank.name);
    }
    /**
     * @brief 获取股息排行
     * @param [in] req 请求包，具体字段请参考Qot_GetDividendRank.proto协议
     */
    GetDividendRank(req) {
        return this._sendCmd(ftCmdID.QotGetDividendRank.cmd, req, ftCmdID.QotGetDividendRank.name);
    }
    /**
     * @brief 获取派息日历
     * @param [in] req 请求包，具体字段请参考Qot_GetDividendCalendar.proto协议
     */
    GetDividendCalendar(req) {
        return this._sendCmd(ftCmdID.QotGetDividendCalendar.cmd, req, ftCmdID.QotGetDividendCalendar.name);
    }
    /**
     * @brief 获取财经日历(经济数据事件)
     * @param [in] req 请求包，具体字段请参考Qot_GetEconomicCalendar.proto协议
     */
    GetEconomicCalendar(req) {
        return this._sendCmd(ftCmdID.QotGetEconomicCalendar.cmd, req, ftCmdID.QotGetEconomicCalendar.name);
    }
    /**
     * @brief 获取盘前榜(美股)
     * @param [in] req 请求包，具体字段请参考Qot_GetUSPreMarketRank.proto协议
     */
    GetUSPreMarketRank(req) {
        return this._sendCmd(ftCmdID.QotGetUSPreMarketRank.cmd, req, ftCmdID.QotGetUSPreMarketRank.name);
    }
    /**
     * @brief 获取盘后榜(美股)
     * @param [in] req 请求包，具体字段请参考Qot_GetUSAfterHoursRank.proto协议
     */
    GetUSAfterHoursRank(req) {
        return this._sendCmd(ftCmdID.QotGetUSAfterHoursRank.cmd, req, ftCmdID.QotGetUSAfterHoursRank.name);
    }
    /**
     * @brief 获取夜盘榜(美股)
     * @param [in] req 请求包，具体字段请参考Qot_GetUSOvernightRank.proto协议
     */
    GetUSOvernightRank(req) {
        return this._sendCmd(ftCmdID.QotGetUSOvernightRank.cmd, req, ftCmdID.QotGetUSOvernightRank.name);
    }
    /**
     * @brief 获取领涨/领跌榜(盘中)
     * @param [in] req 请求包，具体字段请参考Qot_GetTopMoversRank.proto协议
     */
    GetTopMoversRank(req) {
        return this._sendCmd(ftCmdID.QotGetTopMoversRank.cmd, req, ftCmdID.QotGetTopMoversRank.name);
    }
    /**
     * @brief 获取热议榜
     * @param [in] req 请求包，具体字段请参考Qot_GetHotList.proto协议
     */
    GetHotList(req) {
        return this._sendCmd(ftCmdID.QotGetHotList.cmd, req, ftCmdID.QotGetHotList.name);
    }
    /**
     * @brief 获取卖空异动榜(美股)
     * @param [in] req 请求包，具体字段请参考Qot_GetShortSellingRank.proto协议
     */
    GetShortSellingRank(req) {
        return this._sendCmd(ftCmdID.QotGetShortSellingRank.cmd, req, ftCmdID.QotGetShortSellingRank.name);
    }
    /**
     * @brief 获取区间涨跌幅
     * @param [in] req 请求包，具体字段请参考Qot_GetPeriodChangeRank.proto协议
     */
    GetPeriodChangeRank(req) {
        return this._sendCmd(ftCmdID.QotGetPeriodChangeRank.cmd, req, ftCmdID.QotGetPeriodChangeRank.name);
    }
    /**
     * @brief 获取破净高股息国央企(港股)
     * @param [in] req 请求包，具体字段请参考Qot_GetHighDividendSOERank.proto协议
     */
    GetHighDividendSOERank(req) {
        return this._sendCmd(ftCmdID.QotGetHighDividendSOERank.cmd, req, ftCmdID.QotGetHighDividendSOERank.name);
    }
    /**
     * @brief 获取机构持仓列表
     * @param [in] req 请求包，具体字段请参考Qot_GetInstitutionList.proto协议
     */
    GetInstitutionList(req) {
        return this._sendCmd(ftCmdID.QotGetInstitutionList.cmd, req, ftCmdID.QotGetInstitutionList.name);
    }
    /**
     * @brief 获取机构概况
     * @param [in] req 请求包，具体字段请参考Qot_GetInstitutionProfile.proto协议
     */
    GetInstitutionProfile(req) {
        return this._sendCmd(ftCmdID.QotGetInstitutionProfile.cmd, req, ftCmdID.QotGetInstitutionProfile.name);
    }
    /**
     * @brief 获取机构持仓行业分布
     * @param [in] req 请求包，具体字段请参考Qot_GetInstitutionDistribution.proto协议
     */
    GetInstitutionDistribution(req) {
        return this._sendCmd(ftCmdID.QotGetInstitutionDistribution.cmd, req, ftCmdID.QotGetInstitutionDistribution.name);
    }
    /**
     * @brief 获取机构持仓变动
     * @param [in] req 请求包，具体字段请参考Qot_GetInstitutionHoldingChange.proto协议
     */
    GetInstitutionHoldingChange(req) {
        return this._sendCmd(ftCmdID.QotGetInstitutionHoldingChange.cmd, req, ftCmdID.QotGetInstitutionHoldingChange.name);
    }
    /**
     * @brief 获取机构持股列表
     * @param [in] req 请求包，具体字段请参考Qot_GetInstitutionHoldingList.proto协议
     */
    GetInstitutionHoldingList(req) {
        return this._sendCmd(ftCmdID.QotGetInstitutionHoldingList.cmd, req, ftCmdID.QotGetInstitutionHoldingList.name);
    }
    /**
     * @brief 获取ARK基金持仓
     * @param [in] req 请求包，具体字段请参考Qot_GetArkFundHolding.proto协议
     */
    GetArkFundHolding(req) {
        return this._sendCmd(ftCmdID.QotGetArkFundHolding.cmd, req, ftCmdID.QotGetArkFundHolding.name);
    }
    /**
     * @brief 获取ARK个股交易动态
     * @param [in] req 请求包，具体字段请参考Qot_GetArkStockDynamic.proto协议
     */
    GetArkStockDynamic(req) {
        return this._sendCmd(ftCmdID.QotGetArkStockDynamic.cmd, req, ftCmdID.QotGetArkStockDynamic.name);
    }
    /**
     * @brief 获取ARK主动交易聚合
     * @param [in] req 请求包，具体字段请参考Qot_GetArkActiveTransaction.proto协议
     */
    GetArkActiveTransaction(req) {
        return this._sendCmd(ftCmdID.QotGetArkActiveTransaction.cmd, req, ftCmdID.QotGetArkActiveTransaction.name);
    }
    /**
     * @brief 获取评级变动
     * @param [in] req 请求包，具体字段请参考Qot_GetRatingChange.proto协议
     */
    GetRatingChange(req) {
        return this._sendCmd(ftCmdID.QotGetRatingChange.cmd, req, ftCmdID.QotGetRatingChange.name);
    }
    /**
     * @brief 获取产业链列表
     * @param [in] req 请求包，具体字段请参考Qot_GetIndustrialChainList.proto协议
     */
    GetIndustrialChainList(req) {
        return this._sendCmd(ftCmdID.QotGetIndustrialChainList.cmd, req, ftCmdID.QotGetIndustrialChainList.name);
    }
    /**
     * @brief 获取产业链详情
     * @param [in] req 请求包，具体字段请参考Qot_GetIndustrialChainDetail.proto协议
     */
    GetIndustrialChainDetail(req) {
        return this._sendCmd(ftCmdID.QotGetIndustrialChainDetail.cmd, req, ftCmdID.QotGetIndustrialChainDetail.name);
    }
    /**
     * @brief 获取板块关联产业链
     * @param [in] req 请求包，具体字段请参考Qot_GetIndustrialChainByPlate.proto协议
     */
    GetIndustrialChainByPlate(req) {
        return this._sendCmd(ftCmdID.QotGetIndustrialChainByPlate.cmd, req, ftCmdID.QotGetIndustrialChainByPlate.name);
    }
    /**
     * @brief 获取产业板块信息
     * @param [in] req 请求包，具体字段请参考Qot_GetIndustrialPlateInfo.proto协议
     */
    GetIndustrialPlateInfo(req) {
        return this._sendCmd(ftCmdID.QotGetIndustrialPlateInfo.cmd, req, ftCmdID.QotGetIndustrialPlateInfo.name);
    }
    /**
     * @brief 获取产业板块成分股
     * @param [in] req 请求包，具体字段请参考Qot_GetIndustrialPlateStock.proto协议
     */
    GetIndustrialPlateStock(req) {
        return this._sendCmd(ftCmdID.QotGetIndustrialPlateStock.cmd, req, ftCmdID.QotGetIndustrialPlateStock.name);
    }
    /**
     * @brief 获取热力图数据
     * @param [in] req 请求包，具体字段请参考Qot_GetHeatMapData.proto协议
     */
    GetHeatMapData(req) {
        return this._sendCmd(ftCmdID.QotGetHeatMapData.cmd, req, ftCmdID.QotGetHeatMapData.name);
    }
    /**
     * @brief 获取涨跌分布
     * @param [in] req 请求包，具体字段请参考Qot_GetRiseFallDistribution.proto协议
     */
    GetRiseFallDistribution(req) {
        return this._sendCmd(ftCmdID.QotGetRiseFallDistribution.cmd, req, ftCmdID.QotGetRiseFallDistribution.name);
    }
    /**
     * @brief 获取事件合约分类
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractCategory.proto协议
     */
    GetEventContractCategory(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractCategory.cmd, req, ftCmdID.QotGetEventContractCategory.name);
    }
    /**
     * @brief 获取赛事筛选选项
     * @param [in] req 请求包，具体字段请参考Qot_FilterCompetition.proto协议
     */
    FilterCompetition(req) {
        return this._sendCmd(ftCmdID.QotFilterCompetition.cmd, req, ftCmdID.QotFilterCompetition.name);
    }
    /**
     * @brief 获取事件合约Series列表
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractSeriesList.proto协议
     */
    GetEventContractSeriesList(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractSeriesList.cmd, req, ftCmdID.QotGetEventContractSeriesList.name);
    }
    /**
     * @brief 获取事件合约Event列表
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractEventList.proto协议
     */
    GetEventContractEventList(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractEventList.cmd, req, ftCmdID.QotGetEventContractEventList.name);
    }
    /**
     * @brief 获取事件合约(合约列表)
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContract.proto协议
     */
    GetEventContract(req) {
        return this._sendCmd(ftCmdID.QotGetEventContract.cmd, req, ftCmdID.QotGetEventContract.name);
    }
    /**
     * @brief 获取事件合约里程碑列表
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractMilestoneList.proto协议
     */
    GetEventContractMilestoneList(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractMilestoneList.cmd, req, ftCmdID.QotGetEventContractMilestoneList.name);
    }
    /**
     * @brief 获取事件合约快照
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractSnapshot.proto协议
     */
    GetEventContractSnapshot(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractSnapshot.cmd, req, ftCmdID.QotGetEventContractSnapshot.name);
    }
    /**
     * @brief 获取事件合约摆盘
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractOrderBook.proto协议
     */
    GetEventContractOrderBook(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractOrderBook.cmd, req, ftCmdID.QotGetEventContractOrderBook.name);
    }
    /**
     * @brief 获取事件合约K线
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractKline.proto协议
     */
    GetEventContractKline(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractKline.cmd, req, ftCmdID.QotGetEventContractKline.name);
    }
    /**
     * @brief 获取事件合约逐笔
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractTicker.proto协议
     */
    GetEventContractTicker(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractTicker.cmd, req, ftCmdID.QotGetEventContractTicker.name);
    }
    /**
     * @brief 获取事件合约可Combo列表
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractComboList.proto协议
     */
    GetEventContractComboList(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractComboList.cmd, req, ftCmdID.QotGetEventContractComboList.name);
    }
    /**
     * @brief 事件合约Combo询价
     * @param [in] req 请求包，具体字段请参考Qot_GetEventContractComboRfq.proto协议
     */
    GetEventContractComboRfq(req) {
        return this._sendCmd(ftCmdID.QotGetEventContractComboRfq.cmd, req, ftCmdID.QotGetEventContractComboRfq.name);
    }
    /**
     * @brief 事件合约订阅/反订阅
     * @param [in] req 请求包，具体字段请参考Qot_SubEventContract.proto协议
     */
    SubEventContract(req) {
        return this._sendCmd(ftCmdID.QotSubEventContract.cmd, req, ftCmdID.QotSubEventContract.name);
    }
    /**
     * @brief 拉取事件合约历史K线
     * @param [in] req 请求包，具体字段请参考Qot_RequestHistoryEventContractKL.proto协议
     */
    RequestHistoryEventContractKL(req) {
        return this._sendCmd(ftCmdID.QotRequestHistoryEventContractKL.cmd, req, ftCmdID.QotRequestHistoryEventContractKL.name);
    }
    //=============================================
    /**
	* @brief 发送数据
	*/
    _sendCmd(cmd, buff, name) {
        return new Promise((resolve, reject) => {
            if (cmd == null || name == null || name == undefined) {
                reject('error parameter');
                return;
            }
            if (this.websock == null || this.websock == undefined) {
                reject('websock is null');
                return
            }
            const PBMessageRequest = protoRoot.lookup(name + ".Request"); // 请求体message
            let message = PBMessageRequest.encode(PBMessageRequest.create(buff)).finish();
            this.websock.sendBuff(cmd, message)
                .then(response => {
                    if (response.buff) {
                        const PBMessageResponse = protoRoot.lookup(
                            name + ".Response"
                        ); // 回包message
                        const buf = protobuf.util.newBuffer(response.buff);
                        const ResponseObj = PBMessageResponse.decode(buf);
                        if (ResponseObj.retType != null && ResponseObj.retType != undefined && ResponseObj.retType === 0) {
                            resolve(ResponseObj)
                        }
                        else {
                            reject(ResponseObj);
                        }
                    }
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    stop() {
        if (this.websock != null && this.websock != undefined) {
            this.websock.unregPushCallback(this);
        }
    }

    _onPush(response) {
        if (response && response.cmd) {
            if (this.onPush && typeof this.onPush == 'function') {
                if (response.error == 0 && response.buff) {  //成功的推送
                    let obj = ftWebsocket.findCmdObj(response.cmd)
                    if (obj != null && obj.name) {
                        const NotifyPBMessageResponse = protoRoot.lookup(obj.name + ".Response");
                        const buf = protobuf.util.newBuffer(response.buff);
                        const notifyObj = NotifyPBMessageResponse.decode(buf);
                        this.onPush(response.cmd, notifyObj);
                    }
                }
            }
        }
    }

}

export default ftWebsocket
