/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/light");

var $root = ($protobuf.roots["default"] || ($protobuf.roots["default"] = new $protobuf.Root()))
.addJSON({
  Common: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/common"
    },
    nested: {
      RetType: {
        values: {
          RetType_Succeed: 0,
          RetType_Failed: -1,
          RetType_TimeOut: -100,
          RetType_DisConnect: -200,
          RetType_Unknown: -400,
          RetType_Invalid: -500
        }
      },
      PacketEncAlgo: {
        values: {
          PacketEncAlgo_FTAES_ECB: 0,
          PacketEncAlgo_None: -1,
          PacketEncAlgo_AES_ECB: 1,
          PacketEncAlgo_AES_CBC: 2
        }
      },
      PacketID: {
        fields: {
          connID: {
            rule: "required",
            type: "uint64",
            id: 1
          },
          serialNo: {
            rule: "required",
            type: "uint32",
            id: 2
          }
        }
      },
      ProtoFmt: {
        values: {
          ProtoFmt_Protobuf: 0,
          ProtoFmt_Json: 1
        }
      },
      UserAttribution: {
        values: {
          UserAttribution_Unknown: 0,
          UserAttribution_NN: 1,
          UserAttribution_MM: 2,
          UserAttribution_SG: 3,
          UserAttribution_AU: 4,
          UserAttribution_JP: 5,
          UserAttribution_HK: 6
        }
      },
      ProgramStatusType: {
        values: {
          ProgramStatusType_None: 0,
          ProgramStatusType_Loaded: 1,
          ProgramStatusType_Loging: 2,
          ProgramStatusType_NeedPicVerifyCode: 3,
          ProgramStatusType_NeedPhoneVerifyCode: 4,
          ProgramStatusType_LoginFailed: 5,
          ProgramStatusType_ForceUpdate: 6,
          ProgramStatusType_NessaryDataPreparing: 7,
          ProgramStatusType_NessaryDataMissing: 8,
          ProgramStatusType_UnAgreeDisclaimer: 9,
          ProgramStatusType_Ready: 10,
          ProgramStatusType_ForceLogout: 11,
          ProgramStatusType_DisclaimerPullFailed: 12
        }
      },
      ProgramStatus: {
        fields: {
          type: {
            rule: "required",
            type: "ProgramStatusType",
            id: 1
          },
          strExtDesc: {
            type: "string",
            id: 2
          }
        }
      },
      Session: {
        values: {
          Session_NONE: 0,
          Session_RTH: 1,
          Session_ETH: 2,
          Session_ALL: 3,
          Session_OVERNIGHT: 4
        }
      },
      PredSide: {
        values: {
          PredSide_Unknown: 0,
          PredSide_Yes: 1,
          PredSide_No: 2
        }
      }
    }
  },
  GetDelayStatistics: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/getdelaystatistics"
    },
    nested: {
      DelayStatisticsType: {
        values: {
          DelayStatisticsType_Unkonw: 0,
          DelayStatisticsType_QotPush: 1,
          DelayStatisticsType_ReqReply: 2,
          DelayStatisticsType_PlaceOrder: 3
        }
      },
      QotPushStage: {
        values: {
          QotPushStage_Unkonw: 0,
          QotPushStage_SR2SS: 1,
          QotPushStage_SS2CR: 2,
          QotPushStage_CR2CS: 3,
          QotPushStage_SS2CS: 4,
          QotPushStage_SR2CS: 5
        }
      },
      QotPushType: {
        values: {
          QotPushType_Unkonw: 0,
          QotPushType_Price: 1,
          QotPushType_Ticker: 2,
          QotPushType_OrderBook: 3,
          QotPushType_Broker: 4
        }
      },
      C2S: {
        fields: {
          typeList: {
            rule: "repeated",
            type: "int32",
            id: 1,
            options: {
              packed: false
            }
          },
          qotPushStage: {
            type: "int32",
            id: 2
          },
          segmentList: {
            rule: "repeated",
            type: "int32",
            id: 3,
            options: {
              packed: false
            }
          }
        }
      },
      DelayStatisticsItem: {
        fields: {
          begin: {
            rule: "required",
            type: "int32",
            id: 1
          },
          end: {
            rule: "required",
            type: "int32",
            id: 2
          },
          count: {
            rule: "required",
            type: "int32",
            id: 3
          },
          proportion: {
            rule: "required",
            type: "float",
            id: 4
          },
          cumulativeRatio: {
            rule: "required",
            type: "float",
            id: 5
          }
        }
      },
      DelayStatistics: {
        fields: {
          qotPushType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          itemList: {
            rule: "repeated",
            type: "DelayStatisticsItem",
            id: 2
          },
          delayAvg: {
            rule: "required",
            type: "float",
            id: 3
          },
          count: {
            rule: "required",
            type: "int32",
            id: 4
          }
        }
      },
      ReqReplyStatisticsItem: {
        fields: {
          protoID: {
            rule: "required",
            type: "int32",
            id: 1
          },
          count: {
            rule: "required",
            type: "int32",
            id: 2
          },
          totalCostAvg: {
            rule: "required",
            type: "float",
            id: 3
          },
          openDCostAvg: {
            rule: "required",
            type: "float",
            id: 4
          },
          netDelayAvg: {
            rule: "required",
            type: "float",
            id: 5
          },
          isLocalReply: {
            rule: "required",
            type: "bool",
            id: 6
          }
        }
      },
      PlaceOrderStatisticsItem: {
        fields: {
          orderID: {
            rule: "required",
            type: "string",
            id: 1
          },
          totalCost: {
            rule: "required",
            type: "float",
            id: 2
          },
          openDCost: {
            rule: "required",
            type: "float",
            id: 3
          },
          netDelay: {
            rule: "required",
            type: "float",
            id: 4
          },
          updateCost: {
            rule: "required",
            type: "float",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          qotPushStatisticsList: {
            rule: "repeated",
            type: "DelayStatistics",
            id: 1
          },
          reqReplyStatisticsList: {
            rule: "repeated",
            type: "ReqReplyStatisticsItem",
            id: 2
          },
          placeOrderStatisticsList: {
            rule: "repeated",
            type: "PlaceOrderStatisticsItem",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  GetGlobalState: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/getglobalstate"
    },
    nested: {
      C2S: {
        fields: {
          userID: {
            rule: "required",
            type: "uint64",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          marketHK: {
            rule: "required",
            type: "int32",
            id: 1
          },
          marketUS: {
            rule: "required",
            type: "int32",
            id: 2
          },
          marketSH: {
            rule: "required",
            type: "int32",
            id: 3
          },
          marketSZ: {
            rule: "required",
            type: "int32",
            id: 4
          },
          marketHKFuture: {
            rule: "required",
            type: "int32",
            id: 5
          },
          marketUSFuture: {
            type: "int32",
            id: 15
          },
          marketSGFuture: {
            type: "int32",
            id: 17
          },
          marketJPFuture: {
            type: "int32",
            id: 18
          },
          marketSG: {
            type: "int32",
            id: 19
          },
          marketMY: {
            type: "int32",
            id: 20
          },
          marketJP: {
            type: "int32",
            id: 21
          },
          qotLogined: {
            rule: "required",
            type: "bool",
            id: 6
          },
          trdLogined: {
            rule: "required",
            type: "bool",
            id: 7
          },
          serverVer: {
            rule: "required",
            type: "int32",
            id: 8
          },
          serverBuildNo: {
            rule: "required",
            type: "int32",
            id: 9
          },
          time: {
            rule: "required",
            type: "int64",
            id: 10
          },
          localTime: {
            type: "double",
            id: 11
          },
          programStatus: {
            type: "Common.ProgramStatus",
            id: 12
          },
          qotSvrIpAddr: {
            type: "string",
            id: 13
          },
          trdSvrIpAddr: {
            type: "string",
            id: 14
          },
          connID: {
            type: "uint64",
            id: 16
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_Common: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotcommon"
    },
    nested: {
      QotMarket: {
        values: {
          QotMarket_Unknown: 0,
          QotMarket_HK_Security: 1,
          QotMarket_HK_Future: 2,
          QotMarket_US_Security: 11,
          QotMarket_CNSH_Security: 21,
          QotMarket_CNSZ_Security: 22,
          QotMarket_SG_Security: 31,
          QotMarket_JP_Security: 41,
          QotMarket_AU_Security: 51,
          QotMarket_MY_Security: 61,
          QotMarket_CA_Security: 71,
          QotMarket_FX_Security: 81,
          QotMarket_CC_Security: 91,
          QotMarket_EventContract: 101
        }
      },
      SecurityType: {
        values: {
          SecurityType_Unknown: 0,
          SecurityType_Bond: 1,
          SecurityType_Bwrt: 2,
          SecurityType_Eqty: 3,
          SecurityType_Trust: 4,
          SecurityType_Warrant: 5,
          SecurityType_Index: 6,
          SecurityType_Plate: 7,
          SecurityType_Drvt: 8,
          SecurityType_PlateSet: 9,
          SecurityType_Future: 10,
          SecurityType_Forex: 11,
          SecurityType_Crypto: 12
        }
      },
      PlateSetType: {
        values: {
          PlateSetType_All: 0,
          PlateSetType_Industry: 1,
          PlateSetType_Region: 2,
          PlateSetType_Concept: 3,
          PlateSetType_Other: 4
        }
      },
      WarrantType: {
        values: {
          WarrantType_Unknown: 0,
          WarrantType_Buy: 1,
          WarrantType_Sell: 2,
          WarrantType_Bull: 3,
          WarrantType_Bear: 4,
          WarrantType_InLine: 5
        }
      },
      OptionType: {
        values: {
          OptionType_Unknown: 0,
          OptionType_Call: 1,
          OptionType_Put: 2
        }
      },
      IndexOptionType: {
        values: {
          IndexOptionType_Unknown: 0,
          IndexOptionType_Normal: 1,
          IndexOptionType_Small: 2
        }
      },
      OptionAreaType: {
        values: {
          OptionAreaType_Unknown: 0,
          OptionAreaType_American: 1,
          OptionAreaType_European: 2,
          OptionAreaType_Bermuda: 3
        }
      },
      QotMarketState: {
        options: {
          allow_alias: true
        },
        values: {
          QotMarketState_None: 0,
          QotMarketState_Auction: 1,
          QotMarketState_WaitingOpen: 2,
          QotMarketState_Morning: 3,
          QotMarketState_Rest: 4,
          QotMarketState_Afternoon: 5,
          QotMarketState_Closed: 6,
          QotMarketState_PreMarketBegin: 8,
          QotMarketState_PreMarketEnd: 9,
          QotMarketState_AfterHoursBegin: 10,
          QotMarketState_AfterHoursEnd: 11,
          QotMarketState_FUTU_SWITCH_DATE: 12,
          QotMarketState_NightOpen: 13,
          QotMarketState_NightEnd: 14,
          QotMarketState_FutureDayOpen: 15,
          QotMarketState_FutureDayBreak: 16,
          QotMarketState_FutureDayClose: 17,
          QotMarketState_FutureDayWaitForOpen: 18,
          QotMarketState_HkCas: 19,
          QotMarketState_FutureNightWait: 20,
          QotMarketState_FutureAfternoon: 21,
          QotMarketState_FutureSwitchDate: 22,
          QotMarketState_FutureOpen: 23,
          QotMarketState_FutureBreak: 24,
          QotMarketState_FutureBreakOver: 25,
          QotMarketState_FutureClose: 26,
          QotMarketState_StibAfterHoursWait: 27,
          QotMarketState_AShareAfterHoursWait: 27,
          QotMarketState_StibAfterHoursBegin: 28,
          QotMarketState_AShareAfterHoursBegin: 28,
          QotMarketState_StibAfterHoursEnd: 29,
          QotMarketState_AShareAfterHoursEnd: 29,
          QotMarketState_CLOSE_AUCTION: 30,
          QotMarketState_AFTERNOON_END: 31,
          QotMarketState_NIGHT: 32,
          QotMarketState_OVERNIGHT_BEGIN: 33,
          QotMarketState_OVERNIGHT_END: 34,
          QotMarketState_TRADE_AT_LAST: 35,
          QotMarketState_TRADE_AUCTION: 36,
          QotMarketState_OVERNIGHT: 37
        }
      },
      TradeDateMarket: {
        values: {
          TradeDateMarket_Unknown: 0,
          TradeDateMarket_HK: 1,
          TradeDateMarket_US: 2,
          TradeDateMarket_CN: 3,
          TradeDateMarket_NT: 4,
          TradeDateMarket_ST: 5,
          TradeDateMarket_JP_Future: 6,
          TradeDateMarket_SG_Future: 7,
          TradeDateMarket_SG: 8,
          TradeDateMarket_MY: 9,
          TradeDateMarket_JP: 10
        }
      },
      TradeDateType: {
        values: {
          TradeDateType_Whole: 0,
          TradeDateType_Morning: 1,
          TradeDateType_Afternoon: 2
        }
      },
      RehabType: {
        values: {
          RehabType_None: 0,
          RehabType_Forward: 1,
          RehabType_Backward: 2
        }
      },
      KLType: {
        values: {
          KLType_Unknown: 0,
          KLType_1Min: 1,
          KLType_Day: 2,
          KLType_Week: 3,
          KLType_Month: 4,
          KLType_Year: 5,
          KLType_5Min: 6,
          KLType_15Min: 7,
          KLType_30Min: 8,
          KLType_60Min: 9,
          KLType_3Min: 10,
          KLType_Quarter: 11,
          KLType_10Min: 12,
          KLType_120Min: 13,
          KLType_180Min: 14,
          KLType_240Min: 15
        }
      },
      KLFields: {
        values: {
          KLFields_None: 0,
          KLFields_High: 1,
          KLFields_Open: 2,
          KLFields_Low: 4,
          KLFields_Close: 8,
          KLFields_LastClose: 16,
          KLFields_Volume: 32,
          KLFields_Turnover: 64,
          KLFields_TurnoverRate: 128,
          KLFields_PE: 256,
          KLFields_ChangeRate: 512
        }
      },
      SubType: {
        values: {
          SubType_None: 0,
          SubType_Basic: 1,
          SubType_OrderBook: 2,
          SubType_Ticker: 4,
          SubType_RT: 5,
          SubType_KL_Day: 6,
          SubType_KL_5Min: 7,
          SubType_KL_15Min: 8,
          SubType_KL_30Min: 9,
          SubType_KL_60Min: 10,
          SubType_KL_1Min: 11,
          SubType_KL_Week: 12,
          SubType_KL_Month: 13,
          SubType_Broker: 14,
          SubType_KL_Qurater: 15,
          SubType_KL_Year: 16,
          SubType_KL_3Min: 17,
          SubType_KL_10Min: 18,
          SubType_KL_120Min: 19,
          SubType_KL_180Min: 20,
          SubType_KL_240Min: 21,
          SubType_OrderBook_Odd: 22
        }
      },
      OrderBookType: {
        values: {
          OrderBookType_Normal: 0,
          OrderBookType_Odd: 1
        }
      },
      TickerDirection: {
        values: {
          TickerDirection_Unknown: 0,
          TickerDirection_Bid: 1,
          TickerDirection_Ask: 2,
          TickerDirection_Neutral: 3
        }
      },
      TickerType: {
        values: {
          TickerType_Unknown: 0,
          TickerType_Automatch: 1,
          TickerType_Late: 2,
          TickerType_NoneAutomatch: 3,
          TickerType_InterAutomatch: 4,
          TickerType_InterNoneAutomatch: 5,
          TickerType_OddLot: 6,
          TickerType_Auction: 7,
          TickerType_Bulk: 8,
          TickerType_Crash: 9,
          TickerType_CrossMarket: 10,
          TickerType_BulkSold: 11,
          TickerType_FreeOnBoard: 12,
          TickerType_Rule127Or155: 13,
          TickerType_Delay: 14,
          TickerType_MarketCenterClosePrice: 15,
          TickerType_NextDay: 16,
          TickerType_MarketCenterOpening: 17,
          TickerType_PriorReferencePrice: 18,
          TickerType_MarketCenterOpenPrice: 19,
          TickerType_Seller: 20,
          TickerType_T: 21,
          TickerType_ExtendedTradingHours: 22,
          TickerType_Contingent: 23,
          TickerType_AvgPrice: 24,
          TickerType_OTCSold: 25,
          TickerType_OddLotCrossMarket: 26,
          TickerType_DerivativelyPriced: 27,
          TickerType_ReOpeningPriced: 28,
          TickerType_ClosingPriced: 29,
          TickerType_ComprehensiveDelayPrice: 30,
          TickerType_Overseas: 31
        }
      },
      DarkStatus: {
        values: {
          DarkStatus_None: 0,
          DarkStatus_Trading: 1,
          DarkStatus_End: 2
        }
      },
      SecurityStatus: {
        values: {
          SecurityStatus_Unknown: 0,
          SecurityStatus_Normal: 1,
          SecurityStatus_Listing: 2,
          SecurityStatus_Purchasing: 3,
          SecurityStatus_Subscribing: 4,
          SecurityStatus_BeforeDrakTradeOpening: 5,
          SecurityStatus_DrakTrading: 6,
          SecurityStatus_DrakTradeEnd: 7,
          SecurityStatus_ToBeOpen: 8,
          SecurityStatus_Suspended: 9,
          SecurityStatus_Called: 10,
          SecurityStatus_ExpiredLastTradingDate: 11,
          SecurityStatus_Expired: 12,
          SecurityStatus_Delisted: 13,
          SecurityStatus_ChangeToTemporaryCode: 14,
          SecurityStatus_TemporaryCodeTradeEnd: 15,
          SecurityStatus_ChangedPlateTradeEnd: 16,
          SecurityStatus_ChangedCodeTradeEnd: 17,
          SecurityStatus_RecoverableCircuitBreaker: 18,
          SecurityStatus_UnRecoverableCircuitBreaker: 19,
          SecurityStatus_AfterCombination: 20,
          SecurityStatus_AfterTransation: 21
        }
      },
      HolderCategory: {
        values: {
          HolderCategory_Unknow: 0,
          HolderCategory_Agency: 1,
          HolderCategory_Fund: 2,
          HolderCategory_SeniorManager: 3
        }
      },
      PushDataType: {
        values: {
          PushDataType_Unknow: 0,
          PushDataType_Realtime: 1,
          PushDataType_ByDisConn: 2,
          PushDataType_Cache: 3
        }
      },
      SortField: {
        values: {
          SortField_Unknow: 0,
          SortField_Code: 1,
          SortField_CurPrice: 2,
          SortField_PriceChangeVal: 3,
          SortField_ChangeRate: 4,
          SortField_Status: 5,
          SortField_BidPrice: 6,
          SortField_AskPrice: 7,
          SortField_BidVol: 8,
          SortField_AskVol: 9,
          SortField_Volume: 10,
          SortField_Turnover: 11,
          SortField_Amplitude: 30,
          SortField_Score: 12,
          SortField_Premium: 13,
          SortField_EffectiveLeverage: 14,
          SortField_Delta: 15,
          SortField_ImpliedVolatility: 16,
          SortField_Type: 17,
          SortField_StrikePrice: 18,
          SortField_BreakEvenPoint: 19,
          SortField_MaturityTime: 20,
          SortField_ListTime: 21,
          SortField_LastTradeTime: 22,
          SortField_Leverage: 23,
          SortField_InOutMoney: 24,
          SortField_RecoveryPrice: 25,
          SortField_ChangePrice: 26,
          SortField_Change: 27,
          SortField_StreetRate: 28,
          SortField_StreetVol: 29,
          SortField_WarrantName: 31,
          SortField_Issuer: 32,
          SortField_LotSize: 33,
          SortField_IssueSize: 34,
          SortField_UpperStrikePrice: 45,
          SortField_LowerStrikePrice: 46,
          SortField_InLinePriceStatus: 47,
          SortField_PreCurPrice: 35,
          SortField_AfterCurPrice: 36,
          SortField_PrePriceChangeVal: 37,
          SortField_AfterPriceChangeVal: 38,
          SortField_PreChangeRate: 39,
          SortField_AfterChangeRate: 40,
          SortField_PreAmplitude: 41,
          SortField_AfterAmplitude: 42,
          SortField_PreTurnover: 43,
          SortField_AfterTurnover: 44,
          SortField_LastSettlePrice: 48,
          SortField_Position: 49,
          SortField_PositionChange: 50,
          SortField_MarketCap: 51,
          SortField_Valuation: 52,
          SortField_ForwardValuation: 53,
          SortField_HistoricalPercentile: 54,
          SortField_HolderQuantity: 61,
          SortField_ShareChangeNum: 62,
          SortField_HoldingDate: 63,
          SortField_HolderPctChange: 64,
          SortField_HolderChangeAmount: 65,
          SortField_HolderPct: 66
        }
      },
      SortType: {
        values: {
          SortType_Unknown: 0,
          SortType_Desc: 1,
          SortType_Asc: 2
        }
      },
      Issuer: {
        values: {
          Issuer_Unknow: 0,
          Issuer_SG: 1,
          Issuer_BP: 2,
          Issuer_CS: 3,
          Issuer_CT: 4,
          Issuer_EA: 5,
          Issuer_GS: 6,
          Issuer_HS: 7,
          Issuer_JP: 8,
          Issuer_MB: 9,
          Issuer_SC: 10,
          Issuer_UB: 11,
          Issuer_BI: 12,
          Issuer_DB: 13,
          Issuer_DC: 14,
          Issuer_ML: 15,
          Issuer_NM: 16,
          Issuer_RB: 17,
          Issuer_RS: 18,
          Issuer_BC: 19,
          Issuer_HT: 20,
          Issuer_VT: 21,
          Issuer_KC: 22,
          Issuer_MS: 23,
          Issuer_GJ: 24,
          Issuer_XZ: 25,
          Issuer_HU: 26,
          Issuer_KS: 27,
          Issuer_CI: 28
        }
      },
      IpoPeriod: {
        values: {
          IpoPeriod_Unknow: 0,
          IpoPeriod_Today: 1,
          IpoPeriod_Tomorrow: 2,
          IpoPeriod_Nextweek: 3,
          IpoPeriod_Lastweek: 4,
          IpoPeriod_Lastmonth: 5
        }
      },
      PriceType: {
        values: {
          PriceType_Unknow: 0,
          PriceType_Outside: 1,
          PriceType_WithIn: 2
        }
      },
      WarrantStatus: {
        values: {
          WarrantStatus_Unknow: 0,
          WarrantStatus_Normal: 1,
          WarrantStatus_Suspend: 2,
          WarrantStatus_StopTrade: 3,
          WarrantStatus_PendingListing: 4
        }
      },
      CompanyAct: {
        values: {
          CompanyAct_None: 0,
          CompanyAct_Split: 1,
          CompanyAct_Join: 2,
          CompanyAct_Bonus: 4,
          CompanyAct_Transfer: 8,
          CompanyAct_Allot: 16,
          CompanyAct_Add: 32,
          CompanyAct_Dividend: 64,
          CompanyAct_SPDividend: 128,
          CompanyAct_SpinOff: 256
        }
      },
      QotRight: {
        values: {
          QotRight_Unknow: 0,
          QotRight_Bmp: 1,
          QotRight_Level1: 2,
          QotRight_Level2: 3,
          QotRight_SF: 4,
          QotRight_No: 5,
          QotRight_Level3: 6
        }
      },
      PriceReminderType: {
        values: {
          PriceReminderType_Unknown: 0,
          PriceReminderType_PriceUp: 1,
          PriceReminderType_PriceDown: 2,
          PriceReminderType_ChangeRateUp: 3,
          PriceReminderType_ChangeRateDown: 4,
          PriceReminderType_5MinChangeRateUp: 5,
          PriceReminderType_5MinChangeRateDown: 6,
          PriceReminderType_VolumeUp: 7,
          PriceReminderType_TurnoverUp: 8,
          PriceReminderType_TurnoverRateUp: 9,
          PriceReminderType_BidPriceUp: 10,
          PriceReminderType_AskPriceDown: 11,
          PriceReminderType_BidVolUp: 12,
          PriceReminderType_AskVolUp: 13,
          PriceReminderType_3MinChangeRateUp: 14,
          PriceReminderType_3MinChangeRateDown: 15
        }
      },
      PriceReminderFreq: {
        values: {
          PriceReminderFreq_Unknown: 0,
          PriceReminderFreq_Always: 1,
          PriceReminderFreq_OnceADay: 2,
          PriceReminderFreq_OnlyOnce: 3
        }
      },
      AssetClass: {
        values: {
          AssetClass_Unknow: 0,
          AssetClass_Stock: 1,
          AssetClass_Bond: 2,
          AssetClass_Commodity: 3,
          AssetClass_CurrencyMarket: 4,
          AssetClass_Future: 5,
          AssetClass_Swap: 6
        }
      },
      ExpirationCycle: {
        values: {
          ExpirationCycle_Unknown: 0,
          ExpirationCycle_Week: 1,
          ExpirationCycle_Month: 2,
          ExpirationCycle_MonthEnd: 3,
          ExpirationCycle_Quarter: 4,
          ExpirationCycle_WeekMon: 11,
          ExpirationCycle_WeekTue: 12,
          ExpirationCycle_WeekWed: 13,
          ExpirationCycle_WeekThu: 14,
          ExpirationCycle_WeekFri: 15
        }
      },
      OptionStandardType: {
        values: {
          OptionStandardType_Unknown: 0,
          OptionStandardType_Standard: 1,
          OptionStandardType_NonStandard: 2
        }
      },
      OptionSettlementMode: {
        values: {
          OptionSettlementMode_Unknown: 0,
          OptionSettlementMode_AM: 1,
          OptionSettlementMode_PM: 2
        }
      },
      ExchType: {
        values: {
          ExchType_Unknown: 0,
          ExchType_HK_MainBoard: 1,
          ExchType_HK_GEMBoard: 2,
          ExchType_HK_HKEX: 3,
          ExchType_US_NYSE: 4,
          ExchType_US_Nasdaq: 5,
          ExchType_US_Pink: 6,
          ExchType_US_AMEX: 7,
          ExchType_US_Option: 8,
          ExchType_US_NYMEX: 9,
          ExchType_US_COMEX: 10,
          ExchType_US_CBOT: 11,
          ExchType_US_CME: 12,
          ExchType_US_CBOE: 13,
          ExchType_CN_SH: 14,
          ExchType_CN_SZ: 15,
          ExchType_CN_STIB: 16,
          ExchType_SG_SGX: 17,
          ExchType_JP_OSE: 18,
          ExchType_CC_CRYPTO: 19,
          ExchType_MY_MYX: 20,
          ExchType_JP_TSE: 21,
          ExchType_JP_Nikkei: 22
        }
      },
      PeriodType: {
        values: {
          PeriodType_Unknown: 0,
          PeriodType_INTRADAY: 1,
          PeriodType_DAY: 2,
          PeriodType_WEEK: 3,
          PeriodType_MONTH: 4
        }
      },
      PriceReminderMarketStatus: {
        values: {
          PriceReminderMarketStatus_Unknow: 0,
          PriceReminderMarketStatus_Open: 1,
          PriceReminderMarketStatus_USPre: 2,
          PriceReminderMarketStatus_USAfter: 3,
          PriceReminderMarketStatus_USOverNight: 4
        }
      },
      OptionStrategyType: {
        values: {
          OptionStrategyType_Unknown: 0,
          OptionStrategyType_SingleOption: 1,
          OptionStrategyType_Covered: 2,
          OptionStrategyType_Spread: 4,
          OptionStrategyType_Straddle: 6,
          OptionStrategyType_Strangle: 7,
          OptionStrategyType_Collar: 8,
          OptionStrategyType_Butterfly: 9,
          OptionStrategyType_Condor: 11,
          OptionStrategyType_IronButterfly: 13,
          OptionStrategyType_IronCondor: 14,
          OptionStrategyType_CalendarSpread: 15,
          OptionStrategyType_DiagonalSpread: 16,
          OptionStrategyType_Customize: 100
        }
      },
      QotHeader: {
        fields: {
          securityFirm: {
            type: "int32",
            id: 1
          }
        }
      },
      F10Type: {
        values: {
          F10Type_Unknown: 0,
          F10Type_Q1: 1,
          F10Type_Q2: 2,
          F10Type_Q3: 3,
          F10Type_Q4: 4,
          F10Type_Q6: 5,
          F10Type_Q9: 6,
          F10Type_Annual: 7,
          F10Type_Quarterly: 9,
          F10Type_QuarterlyAnnual: 10,
          F10Type_MulQuarterly: 11
        }
      },
      EarningsPubTimeType: {
        values: {
          EarningsPubTimeType_Unknown: 0,
          EarningsPubTimeType_PreMarket: 1,
          EarningsPubTimeType_AfterMarket: 2,
          EarningsPubTimeType_DuringMarket: 3
        }
      },
      ValuationType: {
        values: {
          ValuationType_Unknown: 0,
          ValuationType_PE: 1,
          ValuationType_PB: 2,
          ValuationType_PS: 3
        }
      },
      FinancialStatementsType: {
        values: {
          FinancialStatementsType_Unknown: 0,
          FinancialStatementsType_Income: 1,
          FinancialStatementsType_BalanceSheet: 2,
          FinancialStatementsType_CashFlow: 3,
          FinancialStatementsType_MainIndex: 4
        }
      },
      RevenueBreakdownType: {
        values: {
          RevenueBreakdownType_Unknown: 0,
          RevenueBreakdownType_Product: 1,
          RevenueBreakdownType_Industry: 2,
          RevenueBreakdownType_Region: 4,
          RevenueBreakdownType_Business: 8
        }
      },
      ResearchRatingType: {
        values: {
          ResearchRatingType_Unknown: 0,
          ResearchRatingType_Sell: 1,
          ResearchRatingType_Underperform: 2,
          ResearchRatingType_Hold: 3,
          ResearchRatingType_Buy: 4,
          ResearchRatingType_StrongBuy: 5
        }
      },
      ResearchRatingDimensionType: {
        values: {
          ResearchRatingDimensionType_Unknown: 0,
          ResearchRatingDimensionType_Institution: 1,
          ResearchRatingDimensionType_Analyst: 2
        }
      },
      MorningstarRatingType: {
        values: {
          MorningstarRatingType_Unknown: 0,
          MorningstarRatingType_Quantitative: 1,
          MorningstarRatingType_Qualitative: 2
        }
      },
      ValuationIntervalType: {
        values: {
          ValuationIntervalType_Unknown: 0,
          ValuationIntervalType_Month3: 1,
          ValuationIntervalType_Month6: 2,
          ValuationIntervalType_Year1: 3,
          ValuationIntervalType_Year3: 4,
          ValuationIntervalType_Since2019: 5,
          ValuationIntervalType_Year5: 6,
          ValuationIntervalType_Year10: 7,
          ValuationIntervalType_Year2: 8,
          ValuationIntervalType_Year20: 9,
          ValuationIntervalType_Year30: 10
        }
      },
      HoldingChangesFilterType: {
        values: {
          HoldingChangesFilterType_Unknown: 0,
          HoldingChangesFilterType_Increase: 1,
          HoldingChangesFilterType_Decrease: 2,
          HoldingChangesFilterType_NewIn: 3,
          HoldingChangesFilterType_CloseOut: 4
        }
      },
      HolderDetailType: {
        values: {
          HolderDetailType_Default: 0,
          HolderDetailType_All: 1000,
          HolderDetailType_Unclassified: 1,
          HolderDetailType_TraditionalInvestmentManager: 2,
          HolderDetailType_HedgeFundManager: 3,
          HolderDetailType_VCOrPE: 4,
          HolderDetailType_CorporatePensionPlanSponsor: 5,
          HolderDetailType_FoundationFundSponsor: 6,
          HolderDetailType_InsuranceCompany: 7,
          HolderDetailType_BankOrInvestmentBank: 8,
          HolderDetailType_FamilyOfficesOrTrust: 9,
          HolderDetailType_SovereignWealthFund: 10,
          HolderDetailType_REIT: 11,
          HolderDetailType_StructuredFinancePoolManager: 12,
          HolderDetailType_UnionPensionPlanSponsor: 13,
          HolderDetailType_GovernmentPensionPlanSponsor: 14,
          HolderDetailType_EndowmentFundSponsor: 15,
          HolderDetailType_IndividualInsiders: 100,
          HolderDetailType_IssueSponsoredADR: 200,
          HolderDetailType_CorporationsPublic: 300,
          HolderDetailType_CorporationsPrivate: 400,
          HolderDetailType_StateOwnedShares: 500
        }
      },
      CompanyProfileFieldType: {
        values: {
          CompanyProfileFieldType_SourceText: 0,
          CompanyProfileFieldType_LinkType: 1,
          CompanyProfileFieldType_IndependentTitle: 2
        }
      },
      BuySellType: {
        values: {
          BuySellType_Unknown: 0,
          BuySellType_NetBuy: 1,
          BuySellType_NetSell: 2
        }
      },
      OptionVolatilityTimePeriodType: {
        values: {
          OptionVolatilityTimePeriodType_Unknown: 0,
          OptionVolatilityTimePeriodType_Week: 1,
          OptionVolatilityTimePeriodType_Month: 2,
          OptionVolatilityTimePeriodType_Quarter: 3,
          OptionVolatilityTimePeriodType_HalfYear: 4,
          OptionVolatilityTimePeriodType_Year: 5
        }
      },
      OptionImpvolStatusType: {
        values: {
          ImpvolFluctuating: 0,
          ImpvolOvervalued: 1,
          ImpvolUndervalued: 2
        }
      },
      IndicatorLangType: {
        values: {
          IndicatorLangType_Unknown: 0,
          IndicatorLangType_MyLang: 1,
          IndicatorLangType_Python: 2
        }
      },
      IndicatorSearchMode: {
        values: {
          IndicatorSearchMode_Partial: 0,
          IndicatorSearchMode_Exact: 1
        }
      },
      IndicatorParamValueType: {
        values: {
          IndicatorParamValueType_UNKNOWN: 0,
          IndicatorParamValueType_INT: 1,
          IndicatorParamValueType_FLOAT: 2,
          IndicatorParamValueType_STRING: 3,
          IndicatorParamValueType_COLOR: 4,
          IndicatorParamValueType_SHAPE: 5,
          IndicatorParamValueType_LINE: 6,
          IndicatorParamValueType_BOOL: 7
        }
      },
      IndicatorShape: {
        values: {
          IndicatorShape_UNKNOWN: 0,
          IndicatorShape_XCROSS: 1,
          IndicatorShape_CROSS: 2,
          IndicatorShape_CIRCLE: 3,
          IndicatorShape_TRIANGLE_UP: 4,
          IndicatorShape_TRIANGLE_DOWN: 5,
          IndicatorShape_FLAG: 6,
          IndicatorShape_ARROW_UP: 7,
          IndicatorShape_ARROW_DOWN: 8,
          IndicatorShape_SQUARE: 9,
          IndicatorShape_DIAMOND: 10,
          IndicatorShape_LABEL_UP: 11,
          IndicatorShape_LABEL_DOWN: 12
        }
      },
      IndicatorLineType: {
        values: {
          IndicatorLineType_UNKNOWN: 0,
          IndicatorLineType_SOLID: 1,
          IndicatorLineType_DASHED: 2,
          IndicatorLineType_DOT: 3,
          IndicatorLineType_CROSS: 4,
          IndicatorLineType_CIRCLE: 5,
          IndicatorLineType_HISTOGRAM: 6,
          IndicatorLineType_HISTOGRAM_LINE: 7,
          IndicatorLineType_STEP: 8,
          IndicatorLineType_STEP_DIAMONDS: 9
        }
      },
      Security: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          code: {
            rule: "required",
            type: "string",
            id: 2
          }
        }
      },
      KLine: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          isBlank: {
            rule: "required",
            type: "bool",
            id: 2
          },
          highPrice: {
            type: "double",
            id: 3
          },
          openPrice: {
            type: "double",
            id: 4
          },
          lowPrice: {
            type: "double",
            id: 5
          },
          closePrice: {
            type: "double",
            id: 6
          },
          lastClosePrice: {
            type: "double",
            id: 7
          },
          volume: {
            type: "int64",
            id: 8
          },
          turnover: {
            type: "double",
            id: 9
          },
          turnoverRate: {
            type: "double",
            id: 10
          },
          pe: {
            type: "double",
            id: 11
          },
          changeRate: {
            type: "double",
            id: 12
          },
          timestamp: {
            type: "double",
            id: 13
          },
          hpVolume: {
            type: "double",
            id: 14
          }
        }
      },
      OptionBasicQotExData: {
        fields: {
          strikePrice: {
            rule: "required",
            type: "double",
            id: 1
          },
          contractSize: {
            rule: "required",
            type: "int32",
            id: 2
          },
          contractSizeFloat: {
            type: "double",
            id: 17
          },
          openInterest: {
            rule: "required",
            type: "int32",
            id: 3
          },
          impliedVolatility: {
            rule: "required",
            type: "double",
            id: 4
          },
          premium: {
            rule: "required",
            type: "double",
            id: 5
          },
          delta: {
            rule: "required",
            type: "double",
            id: 6
          },
          gamma: {
            rule: "required",
            type: "double",
            id: 7
          },
          vega: {
            rule: "required",
            type: "double",
            id: 8
          },
          theta: {
            rule: "required",
            type: "double",
            id: 9
          },
          rho: {
            rule: "required",
            type: "double",
            id: 10
          },
          netOpenInterest: {
            type: "int32",
            id: 11
          },
          expiryDateDistance: {
            type: "int32",
            id: 12
          },
          contractNominalValue: {
            type: "double",
            id: 13
          },
          ownerLotMultiplier: {
            type: "double",
            id: 14
          },
          optionAreaType: {
            type: "int32",
            id: 15
          },
          contractMultiplier: {
            type: "double",
            id: 16
          },
          indexOptionType: {
            type: "int32",
            id: 18
          }
        }
      },
      PreAfterMarketData: {
        fields: {
          price: {
            type: "double",
            id: 1
          },
          highPrice: {
            type: "double",
            id: 2
          },
          lowPrice: {
            type: "double",
            id: 3
          },
          volume: {
            type: "int64",
            id: 4
          },
          turnover: {
            type: "double",
            id: 5
          },
          changeVal: {
            type: "double",
            id: 6
          },
          changeRate: {
            type: "double",
            id: 7
          },
          amplitude: {
            type: "double",
            id: 8
          }
        }
      },
      FutureBasicQotExData: {
        fields: {
          lastSettlePrice: {
            rule: "required",
            type: "double",
            id: 1
          },
          position: {
            rule: "required",
            type: "int32",
            id: 2
          },
          positionChange: {
            rule: "required",
            type: "int32",
            id: 3
          },
          expiryDateDistance: {
            type: "int32",
            id: 4
          }
        }
      },
      WarrantBasicQotExData: {
        fields: {
          delta: {
            type: "double",
            id: 1
          },
          impliedVolatility: {
            type: "double",
            id: 2
          },
          premium: {
            rule: "required",
            type: "double",
            id: 3
          }
        }
      },
      BasicQot: {
        fields: {
          security: {
            rule: "required",
            type: "Security",
            id: 1
          },
          name: {
            type: "string",
            id: 24
          },
          isSuspended: {
            rule: "required",
            type: "bool",
            id: 2
          },
          listTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          priceSpread: {
            rule: "required",
            type: "double",
            id: 4
          },
          updateTime: {
            rule: "required",
            type: "string",
            id: 5
          },
          highPrice: {
            rule: "required",
            type: "double",
            id: 6
          },
          openPrice: {
            rule: "required",
            type: "double",
            id: 7
          },
          lowPrice: {
            rule: "required",
            type: "double",
            id: 8
          },
          curPrice: {
            rule: "required",
            type: "double",
            id: 9
          },
          lastClosePrice: {
            rule: "required",
            type: "double",
            id: 10
          },
          volume: {
            rule: "required",
            type: "int64",
            id: 11
          },
          turnover: {
            rule: "required",
            type: "double",
            id: 12
          },
          turnoverRate: {
            rule: "required",
            type: "double",
            id: 13
          },
          amplitude: {
            rule: "required",
            type: "double",
            id: 14
          },
          darkStatus: {
            type: "int32",
            id: 15
          },
          optionExData: {
            type: "OptionBasicQotExData",
            id: 16
          },
          listTimestamp: {
            type: "double",
            id: 17
          },
          updateTimestamp: {
            type: "double",
            id: 18
          },
          preMarket: {
            type: "PreAfterMarketData",
            id: 19
          },
          afterMarket: {
            type: "PreAfterMarketData",
            id: 20
          },
          secStatus: {
            type: "int32",
            id: 21
          },
          futureExData: {
            type: "FutureBasicQotExData",
            id: 22
          },
          warrantExData: {
            type: "WarrantBasicQotExData",
            id: 23
          },
          overnight: {
            type: "PreAfterMarketData",
            id: 25
          },
          hpVolume: {
            type: "double",
            id: 26
          }
        }
      },
      TimeShare: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          minute: {
            rule: "required",
            type: "int32",
            id: 2
          },
          isBlank: {
            rule: "required",
            type: "bool",
            id: 3
          },
          price: {
            type: "double",
            id: 4
          },
          lastClosePrice: {
            type: "double",
            id: 5
          },
          avgPrice: {
            type: "double",
            id: 6
          },
          volume: {
            type: "int64",
            id: 7
          },
          turnover: {
            type: "double",
            id: 8
          },
          timestamp: {
            type: "double",
            id: 9
          },
          hpVolume: {
            type: "double",
            id: 10
          }
        }
      },
      SecurityStaticBasic: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          id: {
            rule: "required",
            type: "int64",
            id: 2
          },
          lotSize: {
            rule: "required",
            type: "int32",
            id: 3
          },
          secType: {
            rule: "required",
            type: "int32",
            id: 4
          },
          name: {
            rule: "required",
            type: "string",
            id: 5
          },
          listTime: {
            rule: "required",
            type: "string",
            id: 6
          },
          delisting: {
            type: "bool",
            id: 7
          },
          listTimestamp: {
            type: "double",
            id: 8
          },
          exchType: {
            type: "int32",
            id: 9
          }
        }
      },
      WarrantStaticExData: {
        fields: {
          type: {
            rule: "required",
            type: "int32",
            id: 1
          },
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 2
          }
        }
      },
      OptionStaticExData: {
        fields: {
          type: {
            rule: "required",
            type: "int32",
            id: 1
          },
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 2
          },
          strikeTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          strikePrice: {
            rule: "required",
            type: "double",
            id: 4
          },
          suspend: {
            rule: "required",
            type: "bool",
            id: 5
          },
          market: {
            rule: "required",
            type: "string",
            id: 6
          },
          strikeTimestamp: {
            type: "double",
            id: 7
          },
          indexOptionType: {
            type: "int32",
            id: 8
          },
          expirationCycle: {
            type: "int32",
            id: 9
          },
          optionStandardType: {
            type: "int32",
            id: 10
          },
          optionSettlementMode: {
            type: "int32",
            id: 11
          }
        }
      },
      FutureStaticExData: {
        fields: {
          lastTradeTime: {
            rule: "required",
            type: "string",
            id: 1
          },
          lastTradeTimestamp: {
            type: "double",
            id: 2
          },
          isMainContract: {
            rule: "required",
            type: "bool",
            id: 3
          }
        }
      },
      SecurityStaticInfo: {
        fields: {
          basic: {
            rule: "required",
            type: "SecurityStaticBasic",
            id: 1
          },
          warrantExData: {
            type: "WarrantStaticExData",
            id: 2
          },
          optionExData: {
            type: "OptionStaticExData",
            id: 3
          },
          futureExData: {
            type: "FutureStaticExData",
            id: 4
          }
        }
      },
      Broker: {
        fields: {
          id: {
            rule: "required",
            type: "int64",
            id: 1
          },
          name: {
            rule: "required",
            type: "string",
            id: 2
          },
          pos: {
            rule: "required",
            type: "int32",
            id: 3
          },
          orderID: {
            type: "int64",
            id: 4
          },
          volume: {
            type: "int64",
            id: 5
          }
        }
      },
      Ticker: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          sequence: {
            rule: "required",
            type: "int64",
            id: 2
          },
          dir: {
            rule: "required",
            type: "int32",
            id: 3
          },
          price: {
            rule: "required",
            type: "double",
            id: 4
          },
          volume: {
            rule: "required",
            type: "int64",
            id: 5
          },
          turnover: {
            rule: "required",
            type: "double",
            id: 6
          },
          recvTime: {
            type: "double",
            id: 7
          },
          type: {
            type: "int32",
            id: 8
          },
          typeSign: {
            type: "int32",
            id: 9
          },
          pushDataType: {
            type: "int32",
            id: 10
          },
          timestamp: {
            type: "double",
            id: 11
          },
          hpVolume: {
            type: "double",
            id: 12
          }
        }
      },
      OrderBookDetail: {
        fields: {
          orderID: {
            rule: "required",
            type: "int64",
            id: 1
          },
          volume: {
            rule: "required",
            type: "int64",
            id: 2
          }
        }
      },
      OrderBook: {
        fields: {
          price: {
            rule: "required",
            type: "double",
            id: 1
          },
          volume: {
            rule: "required",
            type: "int64",
            id: 2
          },
          orederCount: {
            rule: "required",
            type: "int32",
            id: 3
          },
          detailList: {
            rule: "repeated",
            type: "OrderBookDetail",
            id: 4
          },
          hpVolume: {
            type: "double",
            id: 5
          }
        }
      },
      ShareHoldingChange: {
        fields: {
          holderName: {
            rule: "required",
            type: "string",
            id: 1
          },
          holdingQty: {
            rule: "required",
            type: "double",
            id: 2
          },
          holdingRatio: {
            rule: "required",
            type: "double",
            id: 3
          },
          changeQty: {
            rule: "required",
            type: "double",
            id: 4
          },
          changeRatio: {
            rule: "required",
            type: "double",
            id: 5
          },
          time: {
            rule: "required",
            type: "string",
            id: 6
          },
          timestamp: {
            type: "double",
            id: 7
          }
        }
      },
      SubInfo: {
        fields: {
          subType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 2
          }
        }
      },
      ConnSubInfo: {
        fields: {
          subInfoList: {
            rule: "repeated",
            type: "SubInfo",
            id: 1
          },
          usedQuota: {
            rule: "required",
            type: "int32",
            id: 2
          },
          isOwnConnData: {
            rule: "required",
            type: "bool",
            id: 3
          },
          securityFirm: {
            type: "int32",
            id: 4
          },
          optionUsedQuota: {
            type: "int32",
            id: 5
          }
        }
      },
      PlateInfo: {
        fields: {
          plate: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            rule: "required",
            type: "string",
            id: 2
          },
          plateType: {
            type: "int32",
            id: 3
          }
        }
      },
      Rehab: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          companyActFlag: {
            rule: "required",
            type: "int64",
            id: 2
          },
          fwdFactorA: {
            rule: "required",
            type: "double",
            id: 3
          },
          fwdFactorB: {
            rule: "required",
            type: "double",
            id: 4
          },
          bwdFactorA: {
            rule: "required",
            type: "double",
            id: 5
          },
          bwdFactorB: {
            rule: "required",
            type: "double",
            id: 6
          },
          splitBase: {
            type: "int32",
            id: 7
          },
          splitErt: {
            type: "int32",
            id: 8
          },
          joinBase: {
            type: "int32",
            id: 9
          },
          joinErt: {
            type: "int32",
            id: 10
          },
          bonusBase: {
            type: "int32",
            id: 11
          },
          bonusErt: {
            type: "int32",
            id: 12
          },
          transferBase: {
            type: "int32",
            id: 13
          },
          transferErt: {
            type: "int32",
            id: 14
          },
          allotBase: {
            type: "int32",
            id: 15
          },
          allotErt: {
            type: "int32",
            id: 16
          },
          allotPrice: {
            type: "double",
            id: 17
          },
          addBase: {
            type: "int32",
            id: 18
          },
          addErt: {
            type: "int32",
            id: 19
          },
          addPrice: {
            type: "double",
            id: 20
          },
          dividend: {
            type: "double",
            id: 21
          },
          spDividend: {
            type: "double",
            id: 22
          },
          spinOffBase: {
            type: "double",
            id: 24
          },
          spinOffErt: {
            type: "double",
            id: 25
          },
          timestamp: {
            type: "double",
            id: 23
          }
        }
      },
      ComboLeg: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          side: {
            type: "int32",
            id: 2
          },
          qtyRatio: {
            type: "double",
            id: 3
          },
          positionID: {
            type: "uint64",
            id: 4
          },
          predSide: {
            type: "int32",
            id: 5
          }
        }
      },
      IndicatorParamValue: {
        fields: {
          type: {
            type: "IndicatorParamValueType",
            id: 1
          },
          intValue: {
            type: "int64",
            id: 2
          },
          floatValue: {
            type: "float",
            id: 3
          },
          stringValue: {
            type: "string",
            id: 4
          },
          boolValue: {
            type: "bool",
            id: 5
          },
          colorValue: {
            type: "string",
            id: 6
          },
          shapeValue: {
            type: "IndicatorShape",
            id: 7
          },
          lineValue: {
            type: "IndicatorLineType",
            id: 8
          }
        }
      },
      IndicatorInputParam: {
        fields: {
          index: {
            type: "int32",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          value: {
            type: "IndicatorParamValue",
            id: 3
          },
          varName: {
            type: "string",
            id: 4
          }
        }
      },
      IndicatorOutputParam: {
        fields: {
          index: {
            type: "int32",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          }
        }
      },
      EC_Status: {
        values: {
          EC_Status_Initialized: 0,
          EC_Status_Inactive: 1,
          EC_Status_Active: 2,
          EC_Status_Closed: 3,
          EC_Status_Halted: 4,
          EC_Status_Settled: 5,
          EC_Status_Canceled: 6,
          EC_Status_DeterminationPending: 7,
          EC_Status_Determined: 8,
          EC_Status_Finalized: 9,
          EC_Status_EventAbnormal: 100,
          EC_Status_EventInitialized: 101,
          EC_Status_EventActive: 102,
          EC_Status_EventClosed: 103,
          EC_Status_EventSettled: 104,
          EC_Status_EventCanceled: 105,
          EC_Status_EventFinalized: 106
        }
      },
      EC_ContractType: {
        values: {
          EC_ContractType_None: 0,
          EC_ContractType_Binary: 1,
          EC_ContractType_Scalar: 2
        }
      },
      EC_Frequency: {
        values: {
          EC_Frequency_Unknown: 0,
          EC_Frequency_Annual: 1,
          EC_Frequency_Monthly: 2,
          EC_Frequency_Weekly: 3,
          EC_Frequency_Daily: 4,
          EC_Frequency_Hourly: 5,
          EC_Frequency_Custom: 6,
          EC_Frequency_OneOff: 7
        }
      },
      EC_MilestoneType: {
        values: {
          EC_MilestoneType_Unknown: 0,
          EC_MilestoneType_FootballGame: 1,
          EC_MilestoneType_BasketballGame: 2,
          EC_MilestoneType_SoccerTournamentMultiLeg: 3,
          EC_MilestoneType_BaseballTournament: 4,
          EC_MilestoneType_BaseballGame: 5
        }
      },
      EC_KlineSource: {
        values: {
          EC_KlineSource_None: 0,
          EC_KlineSource_OrderBookYes: 1
        }
      }
    }
  },
  GetUserInfo: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/getuserinfo"
    },
    nested: {
      UpdateType: {
        values: {
          UpdateType_None: 0,
          UpdateType_Advice: 1,
          UpdateType_Force: 2
        }
      },
      UserInfoField: {
        values: {
          UserInfoField_Basic: 1,
          UserInfoField_API: 2,
          UserInfoField_QotRight: 4,
          UserInfoField_Disclaimer: 8,
          UserInfoField_Update: 16,
          UserInfoField_WebKey: 2048
        }
      },
      C2S: {
        fields: {
          flag: {
            type: "int32",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          nickName: {
            type: "string",
            id: 1
          },
          avatarUrl: {
            type: "string",
            id: 2
          },
          apiLevel: {
            type: "string",
            id: 3
          },
          hkQotRight: {
            type: "int32",
            id: 4
          },
          usQotRight: {
            type: "int32",
            id: 5
          },
          cnQotRight: {
            type: "int32",
            id: 6
          },
          isNeedAgreeDisclaimer: {
            type: "bool",
            id: 7
          },
          userID: {
            type: "int64",
            id: 8
          },
          updateType: {
            type: "int32",
            id: 9
          },
          webKey: {
            type: "string",
            id: 10
          },
          webJumpUrlHead: {
            type: "string",
            id: 18
          },
          hkOptionQotRight: {
            type: "int32",
            id: 11
          },
          hasUSOptionQotRight: {
            type: "bool",
            id: 12
          },
          hkFutureQotRight: {
            type: "int32",
            id: 13
          },
          subQuota: {
            type: "int32",
            id: 14
          },
          historyKLQuota: {
            type: "int32",
            id: 15
          },
          usFutureQotRight: {
            type: "int32",
            id: 16
          },
          usOptionQotRight: {
            type: "int32",
            id: 17
          },
          userAttribution: {
            type: "int32",
            id: 19
          },
          updateWhatsNew: {
            type: "string",
            id: 20
          },
          usIndexQotRight: {
            type: "int32",
            id: 21
          },
          usOtcQotRight: {
            type: "int32",
            id: 22
          },
          usCMEFutureQotRight: {
            type: "int32",
            id: 23
          },
          usCBOTFutureQotRight: {
            type: "int32",
            id: 24
          },
          usNYMEXFutureQotRight: {
            type: "int32",
            id: 25
          },
          usCOMEXFutureQotRight: {
            type: "int32",
            id: 26
          },
          usCBOEFutureQotRight: {
            type: "int32",
            id: 27
          },
          sgFutureQotRight: {
            type: "int32",
            id: 28
          },
          jpFutureQotRight: {
            type: "int32",
            id: 29
          },
          isAppNNOrMM: {
            type: "bool",
            id: 30
          },
          shQotRight: {
            type: "int32",
            id: 31
          },
          szQotRight: {
            type: "int32",
            id: 32
          },
          extra: {
            type: "int32",
            id: 33
          },
          ccQotRight: {
            type: "int32",
            id: 34
          },
          sgStockQotRight: {
            type: "int32",
            id: 35
          },
          myStockQotRight: {
            type: "int32",
            id: 36
          },
          jpStockQotRight: {
            type: "int32",
            id: 37
          },
          ecQotRight: {
            type: "int32",
            id: 38
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  InitConnect: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/initconnect"
    },
    nested: {
      C2S: {
        fields: {
          clientVer: {
            rule: "required",
            type: "int32",
            id: 1
          },
          clientID: {
            rule: "required",
            type: "string",
            id: 2
          },
          recvNotify: {
            type: "bool",
            id: 3
          },
          packetEncAlgo: {
            type: "int32",
            id: 4
          },
          pushProtoFmt: {
            type: "int32",
            id: 5
          },
          programmingLanguage: {
            type: "string",
            id: 6
          },
          aiType: {
            type: "int32",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          serverVer: {
            rule: "required",
            type: "int32",
            id: 1
          },
          loginUserID: {
            rule: "required",
            type: "uint64",
            id: 2
          },
          connID: {
            rule: "required",
            type: "uint64",
            id: 3
          },
          connAESKey: {
            rule: "required",
            type: "string",
            id: 4
          },
          keepAliveInterval: {
            rule: "required",
            type: "int32",
            id: 5
          },
          aesCBCiv: {
            type: "string",
            id: 6
          },
          userAttribution: {
            type: "int32",
            id: 7
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  InitWebSocket: {
    nested: {
      C2S: {
        fields: {
          IP: {
            type: "string",
            id: 1
          },
          Port: {
            type: "int32",
            id: 2
          },
          RSAPrivateKey: {
            type: "string",
            id: 3
          },
          websocketKey: {
            type: "string",
            id: 4
          },
          clientID: {
            type: "string",
            id: 5
          },
          programmingLanguage: {
            type: "string",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          serverTime: {
            type: "int64",
            id: 1
          },
          connID: {
            type: "uint64",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  KeepAlive: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/keepalive"
    },
    nested: {
      C2S: {
        fields: {
          time: {
            rule: "required",
            type: "int64",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          time: {
            rule: "required",
            type: "int64",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Notify: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/notify"
    },
    nested: {
      NotifyType: {
        values: {
          NotifyType_None: 0,
          NotifyType_GtwEvent: 1,
          NotifyType_ProgramStatus: 2,
          NotifyType_ConnStatus: 3,
          NotifyType_QotRight: 4,
          NotifyType_APILevel: 5,
          NotifyType_APIQuota: 6,
          NotifyType_UsedQuota: 7
        }
      },
      GtwEventType: {
        values: {
          GtwEventType_None: 0,
          GtwEventType_LocalCfgLoadFailed: 1,
          GtwEventType_APISvrRunFailed: 2,
          GtwEventType_ForceUpdate: 3,
          GtwEventType_LoginFailed: 4,
          GtwEventType_UnAgreeDisclaimer: 5,
          GtwEventType_NetCfgMissing: 6,
          GtwEventType_KickedOut: 7,
          GtwEventType_LoginPwdChanged: 8,
          GtwEventType_BanLogin: 9,
          GtwEventType_NeedPicVerifyCode: 10,
          GtwEventType_NeedPhoneVerifyCode: 11,
          GtwEventType_AppDataNotExist: 12,
          GtwEventType_NessaryDataMissing: 13,
          GtwEventType_TradePwdChanged: 14,
          GtwEventType_EnableDeviceLock: 15
        }
      },
      GtwEvent: {
        fields: {
          eventType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          desc: {
            rule: "required",
            type: "string",
            id: 2
          }
        }
      },
      ProgramStatus: {
        fields: {
          programStatus: {
            rule: "required",
            type: "Common.ProgramStatus",
            id: 1
          }
        }
      },
      ConnectStatus: {
        fields: {
          qotLogined: {
            rule: "required",
            type: "bool",
            id: 1
          },
          trdLogined: {
            rule: "required",
            type: "bool",
            id: 2
          }
        }
      },
      QotRight: {
        fields: {
          hkQotRight: {
            rule: "required",
            type: "int32",
            id: 4
          },
          usQotRight: {
            rule: "required",
            type: "int32",
            id: 5
          },
          cnQotRight: {
            rule: "required",
            type: "int32",
            id: 6
          },
          hkOptionQotRight: {
            type: "int32",
            id: 7
          },
          hasUSOptionQotRight: {
            type: "bool",
            id: 8
          },
          hkFutureQotRight: {
            type: "int32",
            id: 9
          },
          usFutureQotRight: {
            type: "int32",
            id: 10
          },
          usOptionQotRight: {
            type: "int32",
            id: 11
          },
          usIndexQotRight: {
            type: "int32",
            id: 12
          },
          usOtcQotRight: {
            type: "int32",
            id: 13
          },
          sgFutureQotRight: {
            type: "int32",
            id: 14
          },
          jpFutureQotRight: {
            type: "int32",
            id: 15
          },
          usCMEFutureQotRight: {
            type: "int32",
            id: 16
          },
          usCBOTFutureQotRight: {
            type: "int32",
            id: 17
          },
          usNYMEXFutureQotRight: {
            type: "int32",
            id: 18
          },
          usCOMEXFutureQotRight: {
            type: "int32",
            id: 19
          },
          usCBOEFutureQotRight: {
            type: "int32",
            id: 20
          },
          shQotRight: {
            type: "int32",
            id: 21
          },
          szQotRight: {
            type: "int32",
            id: 22
          },
          ccQotRight: {
            type: "int32",
            id: 23
          },
          sgStockQotRight: {
            type: "int32",
            id: 24
          },
          myStockQotRight: {
            type: "int32",
            id: 25
          },
          jpStockQotRight: {
            type: "int32",
            id: 26
          },
          ecQotRight: {
            type: "int32",
            id: 27
          }
        }
      },
      APILevel: {
        fields: {
          apiLevel: {
            rule: "required",
            type: "string",
            id: 3
          }
        }
      },
      APIQuota: {
        fields: {
          subQuota: {
            rule: "required",
            type: "int32",
            id: 1
          },
          historyKLQuota: {
            rule: "required",
            type: "int32",
            id: 2
          }
        }
      },
      UsedQuota: {
        fields: {
          usedSubQuota: {
            type: "int32",
            id: 1
          },
          usedKLineQuota: {
            type: "int32",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          type: {
            rule: "required",
            type: "int32",
            id: 1
          },
          event: {
            type: "GtwEvent",
            id: 2
          },
          programStatus: {
            type: "ProgramStatus",
            id: 3
          },
          connectStatus: {
            type: "ConnectStatus",
            id: 4
          },
          qotRight: {
            type: "QotRight",
            id: 5
          },
          apiLevel: {
            type: "APILevel",
            id: 6
          },
          apiQuota: {
            type: "APIQuota",
            id: 7
          },
          usedQuota: {
            type: "UsedQuota",
            id: 8
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_FilterCompetition: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotfiltercompetition"
    },
    nested: {
      TagFilterItem: {
        fields: {
          category: {
            type: "string",
            id: 1
          },
          tag: {
            rule: "required",
            type: "string",
            id: 2
          },
          competitionList: {
            rule: "repeated",
            type: "string",
            id: 3
          },
          scopeList: {
            rule: "repeated",
            type: "string",
            id: 4
          }
        }
      },
      C2S: {
        fields: {
          category: {
            type: "string",
            id: 1
          },
          tag: {
            type: "string",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          tagFilterList: {
            rule: "repeated",
            type: "TagFilterItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetArkActiveTransaction: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetarkactivetransaction"
    },
    nested: {
      HoldingType: {
        values: {
          HoldingType_Increase: 0,
          HoldingType_Decrease: 1,
          HoldingType_New: 2,
          HoldingType_SoldOut: 3
        }
      },
      CycleType: {
        values: {
          CycleType_1Day: 0,
          CycleType_5Day: 1,
          CycleType_10Day: 2,
          CycleType_30Day: 3,
          CycleType_60Day: 4
        }
      },
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_ChangeAmount: 1,
          SortField_ChangeShares: 2
        }
      },
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      C2S: {
        fields: {
          holdingType: {
            type: "int32",
            id: 1
          },
          cycleType: {
            type: "int32",
            id: 2
          },
          sortField: {
            type: "int32",
            id: 3
          },
          sortDir: {
            type: "int32",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          },
          page: {
            type: "string",
            id: 6
          }
        }
      },
      ArkActiveTransactionItem: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          changeAmount: {
            type: "double",
            id: 3
          },
          changeShares: {
            type: "int64",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "ArkActiveTransactionItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetArkFundHolding: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetarkfundholding"
    },
    nested: {
      ArkHoldingType: {
        values: {
          ArkHoldingType_Position: 0,
          ArkHoldingType_Increase: 1,
          ArkHoldingType_Decrease: 2,
          ArkHoldingType_New: 3,
          ArkHoldingType_SoldOut: 4
        }
      },
      CycleType: {
        values: {
          CycleType_1Day: 0,
          CycleType_5Day: 1,
          CycleType_10Day: 2,
          CycleType_30Day: 3,
          CycleType_60Day: 4
        }
      },
      SortField: {
        values: {
          SortField_Shares: 0,
          SortField_WeightChange: 1,
          SortField_SharesChange: 2,
          SortField_MarketValue: 3,
          SortField_Weight: 4
        }
      },
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      C2S: {
        fields: {
          holdingType: {
            type: "int32",
            id: 1
          },
          cycleType: {
            type: "int32",
            id: 2
          },
          sortField: {
            type: "int32",
            id: 3
          },
          sortDir: {
            type: "int32",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          },
          page: {
            type: "string",
            id: 6
          }
        }
      },
      ArkFundHoldingItem: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          shares: {
            type: "int64",
            id: 3
          },
          sharesChange: {
            type: "int64",
            id: 4
          },
          marketValue: {
            type: "double",
            id: 5
          },
          weight: {
            type: "double",
            id: 6
          },
          weightChange: {
            type: "double",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "ArkFundHoldingItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetArkStockDynamic: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetarkstockdynamic"
    },
    nested: {
      DynamicType: {
        values: {
          DynamicType_Unknown: 0,
          DynamicType_ConsecutiveSameDirection: 1,
          DynamicType_RecentTransaction: 2,
          DynamicType_LastTransaction: 3,
          DynamicType_NoDynamic: 4
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          dynamicType: {
            type: "int32",
            id: 1
          },
          transactionCount: {
            type: "int32",
            id: 2
          },
          netShares: {
            type: "int64",
            id: 3
          },
          lastTransactionTime: {
            type: "string",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetBasicQot: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetbasicqot"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          basicQotList: {
            rule: "repeated",
            type: "Qot_Common.BasicQot",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetBroker: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetbroker"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 4
          },
          brokerAskList: {
            rule: "repeated",
            type: "Qot_Common.Broker",
            id: 2
          },
          brokerBidList: {
            rule: "repeated",
            type: "Qot_Common.Broker",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCapitalDistribution: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcapitaldistribution"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          capitalInSuper: {
            type: "double",
            id: 9
          },
          capitalInBig: {
            rule: "required",
            type: "double",
            id: 1
          },
          capitalInMid: {
            rule: "required",
            type: "double",
            id: 2
          },
          capitalInSmall: {
            rule: "required",
            type: "double",
            id: 3
          },
          capitalOutSuper: {
            type: "double",
            id: 10
          },
          capitalOutBig: {
            rule: "required",
            type: "double",
            id: 4
          },
          capitalOutMid: {
            rule: "required",
            type: "double",
            id: 5
          },
          capitalOutSmall: {
            rule: "required",
            type: "double",
            id: 6
          },
          updateTime: {
            type: "string",
            id: 7
          },
          updateTimestamp: {
            type: "double",
            id: 8
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCapitalFlow: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcapitalflow"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          periodType: {
            type: "int32",
            id: 2
          },
          beginTime: {
            type: "string",
            id: 3
          },
          endTime: {
            type: "string",
            id: 4
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      CapitalFlowItem: {
        fields: {
          inFlow: {
            rule: "required",
            type: "double",
            id: 1
          },
          time: {
            type: "string",
            id: 2
          },
          timestamp: {
            type: "double",
            id: 3
          },
          mainInFlow: {
            type: "double",
            id: 4
          },
          superInFlow: {
            type: "double",
            id: 5
          },
          bigInFlow: {
            type: "double",
            id: 6
          },
          midInFlow: {
            type: "double",
            id: 7
          },
          smlInFlow: {
            type: "double",
            id: 8
          }
        }
      },
      S2C: {
        fields: {
          flowItemList: {
            rule: "repeated",
            type: "CapitalFlowItem",
            id: 1
          },
          lastValidTime: {
            type: "string",
            id: 2
          },
          lastValidTimestamp: {
            type: "double",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCodeChange: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcodechange"
    },
    nested: {
      CodeChangeType: {
        values: {
          CodeChangeType_Unkown: 0,
          CodeChangeType_GemToMain: 1,
          CodeChangeType_Unpaid: 2,
          CodeChangeType_ChangeLot: 3,
          CodeChangeType_Split: 4,
          CodeChangeType_Joint: 5,
          CodeChangeType_JointSplit: 6,
          CodeChangeType_SplitJoint: 7,
          CodeChangeType_Other: 8
        }
      },
      CodeChangeInfo: {
        fields: {
          type: {
            rule: "required",
            type: "int32",
            id: 1
          },
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 2
          },
          relatedSecurity: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 3
          },
          publicTime: {
            type: "string",
            id: 4
          },
          publicTimestamp: {
            type: "double",
            id: 5
          },
          effectiveTime: {
            type: "string",
            id: 6
          },
          effectiveTimestamp: {
            type: "double",
            id: 7
          },
          endTime: {
            type: "string",
            id: 8
          },
          endTimestamp: {
            type: "double",
            id: 9
          }
        }
      },
      TimeFilterType: {
        values: {
          TimeFilterType_Unknow: 0,
          TimeFilterType_Public: 1,
          TimeFilterType_Effective: 2,
          TimeFilterType_End: 3
        }
      },
      TimeFilter: {
        fields: {
          type: {
            rule: "required",
            type: "int32",
            id: 1
          },
          beginTime: {
            type: "string",
            id: 2
          },
          endTime: {
            type: "string",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          placeHolder: {
            type: "int32",
            id: 1
          },
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 2
          },
          timeFilterList: {
            rule: "repeated",
            type: "TimeFilter",
            id: 3
          },
          typeList: {
            rule: "repeated",
            type: "int32",
            id: 4,
            options: {
              packed: false
            }
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          codeChangeList: {
            rule: "repeated",
            type: "CodeChangeInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCompanyExecutiveBackground: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcompanyexecutivebackground"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          leaderName: {
            type: "string",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          briefBackground: {
            type: "string",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCompanyExecutives: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcompanyexecutives"
    },
    nested: {
      DirectorInfo: {
        fields: {
          displayLeaderName: {
            type: "string",
            id: 1
          },
          leaderName: {
            type: "string",
            id: 2
          },
          positionName: {
            type: "string",
            id: 3
          },
          beginDate: {
            type: "uint64",
            id: 4
          },
          beginDateStr: {
            type: "string",
            id: 5
          },
          leaderGender: {
            type: "string",
            id: 6
          },
          leaderAge: {
            type: "string",
            id: 7
          },
          highestEducation: {
            type: "string",
            id: 8
          },
          annualSalary: {
            type: "uint64",
            id: 9
          },
          issueDate: {
            type: "uint64",
            id: 10
          },
          issueDateStr: {
            type: "string",
            id: 11
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          directorList: {
            rule: "repeated",
            type: "DirectorInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCompanyOperationalEfficiency: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcompanyoperationalefficiency"
    },
    nested: {
      OperationalEfficiencyItem: {
        fields: {
          fiscalYear: {
            type: "int32",
            id: 1
          },
          financialType: {
            type: "Qot_Common.F10Type",
            id: 2
          },
          periodText: {
            type: "string",
            id: 3
          },
          endDate: {
            type: "int64",
            id: 4
          },
          endDateStr: {
            type: "string",
            id: 5
          },
          employeeNum: {
            type: "int64",
            id: 6
          },
          employeeNumYoy: {
            type: "double",
            id: 7
          },
          incomePerCapita: {
            type: "double",
            id: 8
          },
          incomePerCapitaYoy: {
            type: "double",
            id: 9
          },
          profitPerCapita: {
            type: "double",
            id: 10
          },
          profitPerCapitaYoy: {
            type: "double",
            id: 11
          },
          netProfitPerCapita: {
            type: "double",
            id: 12
          },
          netProfitPerCapitaYoy: {
            type: "double",
            id: 13
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          },
          currencyCode: {
            type: "string",
            id: 4
          },
          financialType: {
            type: "Qot_Common.F10Type",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "OperationalEfficiencyItem",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          currencyCode: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCompanyProfile: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcompanyprofile"
    },
    nested: {
      CompanyLabItem: {
        fields: {
          name: {
            type: "string",
            id: 1
          },
          value: {
            type: "string",
            id: 2
          },
          fieldType: {
            type: "Qot_Common.CompanyProfileFieldType",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "CompanyLabItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCorporateActionsBuybacks: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcorporateactionsbuybacks"
    },
    nested: {
      HKBuyBackItem: {
        fields: {
          publDate: {
            type: "uint64",
            id: 1
          },
          publDateStr: {
            type: "string",
            id: 2
          },
          endDate: {
            type: "uint64",
            id: 3
          },
          endDateStr: {
            type: "string",
            id: 4
          },
          buyBackMoney: {
            type: "double",
            id: 5
          },
          buyBackSum: {
            type: "int64",
            id: 6
          },
          percentage: {
            type: "double",
            id: 7
          },
          highPrice: {
            type: "double",
            id: 8
          },
          lowPrice: {
            type: "double",
            id: 9
          },
          cumulativeSum: {
            type: "int64",
            id: 10
          },
          cumulativePercentage: {
            type: "double",
            id: 11
          },
          shareType: {
            type: "string",
            id: 12
          }
        }
      },
      ABuyBackItem: {
        fields: {
          changeRegDate: {
            type: "uint64",
            id: 1
          },
          changeRegDateStr: {
            type: "string",
            id: 2
          },
          changeDate: {
            type: "uint64",
            id: 3
          },
          changeDateStr: {
            type: "string",
            id: 4
          },
          eventProceDesc: {
            type: "string",
            id: 5
          },
          advanceDate: {
            type: "uint64",
            id: 6
          },
          advanceDateStr: {
            type: "string",
            id: 7
          },
          meetPassDate: {
            type: "uint64",
            id: 8
          },
          meetPassDateStr: {
            type: "string",
            id: 9
          },
          startDate: {
            type: "uint64",
            id: 10
          },
          startDateStr: {
            type: "string",
            id: 11
          },
          endDate: {
            type: "uint64",
            id: 12
          },
          endDateStr: {
            type: "string",
            id: 13
          },
          payDate: {
            type: "uint64",
            id: 14
          },
          payDateStr: {
            type: "string",
            id: 15
          },
          seller: {
            type: "string",
            id: 16
          },
          buyBackMode: {
            type: "string",
            id: 17
          },
          shareType: {
            type: "string",
            id: 18
          },
          buyBackSum: {
            type: "int64",
            id: 19
          },
          buyBackMoney: {
            type: "double",
            id: 20
          },
          percentage: {
            type: "double",
            id: 21
          },
          valueFloor: {
            type: "double",
            id: 22
          },
          valueCeiling: {
            type: "double",
            id: 23
          },
          priceFloor: {
            type: "double",
            id: 24
          },
          priceCeiling: {
            type: "double",
            id: 25
          },
          volumeFloor: {
            type: "double",
            id: 26
          },
          volumeCeiling: {
            type: "double",
            id: 27
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          hkBuyBackList: {
            rule: "repeated",
            type: "HKBuyBackItem",
            id: 1
          },
          aBuyBackList: {
            rule: "repeated",
            type: "ABuyBackItem",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCorporateActionsDividends: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcorporateactionsdividends"
    },
    nested: {
      DividendItem: {
        fields: {
          pubDate: {
            type: "string",
            id: 1
          },
          statement: {
            type: "string",
            id: 2
          },
          process: {
            type: "string",
            id: 3
          },
          recordDate: {
            type: "string",
            id: 4
          },
          exDate: {
            type: "string",
            id: 5
          },
          dividendPayableDate: {
            type: "string",
            id: 6
          },
          fiscalYear: {
            type: "string",
            id: 7
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          dividendList: {
            rule: "repeated",
            type: "DividendItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetCorporateActionsStockSplits: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetcorporateactionsstocksplits"
    },
    nested: {
      StockSplitItem: {
        fields: {
          dirDeciPubDate: {
            type: "uint64",
            id: 1
          },
          dirDeciPubDateStr: {
            type: "string",
            id: 2
          },
          reformType: {
            type: "string",
            id: 3
          },
          rate: {
            type: "string",
            id: 4
          },
          exDate: {
            type: "uint64",
            id: 5
          },
          exDateStr: {
            type: "string",
            id: 6
          },
          smDeciDate: {
            type: "uint64",
            id: 7
          },
          smDeciDateStr: {
            type: "string",
            id: 8
          },
          tempTradeBeginDate: {
            type: "uint64",
            id: 9
          },
          tempTradeBeginDateStr: {
            type: "string",
            id: 10
          },
          simulTradeBeginDate: {
            type: "uint64",
            id: 11
          },
          simulTradeBeginDateStr: {
            type: "string",
            id: 12
          },
          simulTradeEndDate: {
            type: "uint64",
            id: 13
          },
          simulTradeEndDateStr: {
            type: "string",
            id: 14
          },
          eventStatus: {
            type: "string",
            id: 15
          },
          newParValue: {
            type: "double",
            id: 16
          },
          tempShareCode: {
            type: "string",
            id: 17
          },
          tempShareAbbrName: {
            type: "string",
            id: 18
          },
          newTradeUnit: {
            type: "int64",
            id: 19
          },
          sharesAfterEffect: {
            type: "double",
            id: 20
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          splitItemList: {
            rule: "repeated",
            type: "StockSplitItem",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetDailyShortVolume: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetdailyshortvolume"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          }
        }
      },
      UsDailyShortVolumeItem: {
        fields: {
          timestamp: {
            type: "int64",
            id: 1
          },
          timestampStr: {
            type: "string",
            id: 2
          },
          totalSharesShort: {
            type: "uint64",
            id: 3
          },
          nasdaqSharesShort: {
            type: "uint64",
            id: 4
          },
          nyseSharesShort: {
            type: "uint64",
            id: 5
          },
          shortPercent: {
            type: "double",
            id: 6
          },
          volume: {
            type: "uint64",
            id: 7
          },
          closePrice: {
            type: "double",
            id: 8
          },
          lastClosePrice: {
            type: "double",
            id: 9
          },
          dailyTradeAvgRatio: {
            type: "double",
            id: 10
          }
        }
      },
      HkDailyShortVolumeItem: {
        fields: {
          timestamp: {
            type: "int64",
            id: 1
          },
          timestampStr: {
            type: "string",
            id: 2
          },
          sharesTraded: {
            type: "uint64",
            id: 3
          },
          turnover: {
            type: "double",
            id: 4
          },
          shortSellSharesTraded: {
            type: "uint64",
            id: 5
          },
          shortSellTurnover: {
            type: "double",
            id: 6
          },
          openPrice: {
            type: "double",
            id: 7
          },
          closePrice: {
            type: "double",
            id: 8
          },
          lastClosePrice: {
            type: "double",
            id: 9
          },
          dailyTradeAvgRatio: {
            type: "double",
            id: 10
          }
        }
      },
      S2C: {
        fields: {
          usItemList: {
            rule: "repeated",
            type: "UsDailyShortVolumeItem",
            id: 1
          },
          hkItemList: {
            rule: "repeated",
            type: "HkDailyShortVolumeItem",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          aggregatedShort: {
            type: "int64",
            id: 4
          },
          aggregatedShortRatio: {
            type: "double",
            id: 5
          },
          newTimeStr: {
            type: "string",
            id: 6
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetDividendCalendar: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetdividendcalendar"
    },
    nested: {
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          date: {
            rule: "required",
            type: "string",
            id: 2
          },
          dataFrom: {
            type: "int32",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          }
        }
      },
      DividendCalendarItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          statement: {
            type: "string",
            id: 3
          },
          recordDate: {
            type: "string",
            id: 4
          },
          exDate: {
            type: "string",
            id: 5
          },
          dividendPayableDate: {
            type: "string",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "DividendCalendarItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetDividendRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetdividendrank"
    },
    nested: {
      DividendRankType: {
        values: {
          DividendRankType_Unknown: 0,
          DividendRankType_HighYield: 1,
          DividendRankType_DividendGrowth: 2
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_DividendYieldTTM: 1,
          IndicatorType_AvgDividendYield5Y: 2,
          IndicatorType_DistributionFrequency: 3,
          IndicatorType_DividendGrowYear: 4,
          IndicatorType_DividendsTTM: 5,
          IndicatorType_PayoutRatioLFY: 6,
          IndicatorType_NextPayableDate: 7,
          IndicatorType_Price: 8,
          IndicatorType_MarketCap: 9
        }
      },
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_DividendYieldTTM: 1,
          SortField_AvgDividendYield5Y: 2,
          SortField_DistributionFrequency: 3,
          SortField_DividendGrowYear: 4,
          SortField_DividendsTTM: 5,
          SortField_PayoutRatioLFY: 6,
          SortField_Price: 7,
          SortField_MarketCap: 8,
          SortField_ChangeRate: 9,
          SortField_ChangeAmount: 10
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.IndicatorValue",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          rankType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 4
          },
          sortField: {
            type: "int32",
            id: 5
          }
        }
      },
      DividendRankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          industry: {
            type: "string",
            id: 3
          },
          curPrice: {
            type: "double",
            id: 10
          },
          changeRate: {
            type: "double",
            id: 11
          },
          changeAmount: {
            type: "double",
            id: 12
          },
          marketCap: {
            type: "double",
            id: 13
          },
          dividendYieldTTM: {
            type: "double",
            id: 20
          },
          avgDividendYield5Y: {
            type: "double",
            id: 21
          },
          distributionFrequency: {
            type: "int32",
            id: 22
          },
          dividendGrowYear: {
            type: "int32",
            id: 23
          },
          dividendsTTM: {
            type: "double",
            id: 24
          },
          payoutRatioLFY: {
            type: "double",
            id: 25
          },
          nextPayableDate: {
            type: "string",
            id: 26
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "DividendRankItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_OptionCommon: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      OptionMarket: {
        values: {
          OptionMarket_Unknown: 0,
          OptionMarket_US_Security: 1,
          OptionMarket_US_Index: 2,
          OptionMarket_HK_Security: 3,
          OptionMarket_HK_Index: 4
        }
      },
      OptionStatisticDataType: {
        values: {
          OptionStatisticDataType_Unknown: -1,
          OptionStatisticDataType_Volume: 0,
          OptionStatisticDataType_OpenInterest: 1
        }
      },
      OptionHVTimeRange: {
        values: {
          OptionHVTimeRange_Unknown: 0,
          OptionHVTimeRange_30Day: 1,
          OptionHVTimeRange_60Day: 2,
          OptionHVTimeRange_90Day: 3,
          OptionHVTimeRange_120Day: 4,
          OptionHVTimeRange_365Day: 5
        }
      },
      OptionRankType: {
        values: {
          OptionRankType_Unknown: 0,
          OptionRankType_Volume: 1,
          OptionRankType_Turnover: 2,
          OptionRankType_OI: 3,
          OptionRankType_OIIncrement: 4,
          OptionRankType_OIDecrement: 5,
          OptionRankType_OIMarketCap: 6,
          OptionRankType_OIMarketCapIncrement: 7,
          OptionRankType_OIMarketCapDecrement: 8,
          OptionRankType_ChangeRate: 9,
          OptionRankType_IV: 10
        }
      },
      ZeroDteSortType: {
        values: {
          ZeroDteSortType_Unknown: 0,
          ZeroDteSortType_Volume: 1,
          ZeroDteSortType_IV: 2,
          ZeroDteSortType_ChangeRate: 3,
          ZeroDteSortType_OpenInterest: 4,
          ZeroDteSortType_MarketCap: 5
        }
      },
      ZeroDteIndicatorType: {
        values: {
          ZeroDteIndicatorType_Unknown: 0,
          ZeroDteIndicatorType_OwnerList: 1,
          ZeroDteIndicatorType_HasEarningsThisWeek: 2,
          ZeroDteIndicatorType_Volume: 3,
          ZeroDteIndicatorType_OpenInterest: 4,
          ZeroDteIndicatorType_IV: 5,
          ZeroDteIndicatorType_HV: 6,
          ZeroDteIndicatorType_IVRank: 7,
          ZeroDteIndicatorType_IVPercentile: 8,
          ZeroDteIndicatorType_Price: 9,
          ZeroDteIndicatorType_ChangeRate: 10
        }
      },
      ZeroDteIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          }
        }
      },
      ZeroDteContractSortType: {
        values: {
          ZeroDteContractSortType_Unknown: 0,
          ZeroDteContractSortType_Volume: 1,
          ZeroDteContractSortType_OpenInterest: 2,
          ZeroDteContractSortType_IV: 3,
          ZeroDteContractSortType_Delta: 4
        }
      },
      ZeroDteContractIndicatorType: {
        values: {
          ZeroDteContractIndicatorType_Unknown: 0,
          ZeroDteContractIndicatorType_OptionType: 1,
          ZeroDteContractIndicatorType_Volume: 2,
          ZeroDteContractIndicatorType_OpenInterest: 3,
          ZeroDteContractIndicatorType_IV: 4,
          ZeroDteContractIndicatorType_Delta: 5,
          ZeroDteContractIndicatorType_Gamma: 6,
          ZeroDteContractIndicatorType_Theta: 7,
          ZeroDteContractIndicatorType_Vega: 8,
          ZeroDteContractIndicatorType_Rho: 9,
          ZeroDteContractIndicatorType_Price: 10,
          ZeroDteContractIndicatorType_ChangeRate: 11,
          ZeroDteContractIndicatorType_BreakEvenPoint: 12,
          ZeroDteContractIndicatorType_ToBep: 13,
          ZeroDteContractIndicatorType_BuyProfitProbability: 14,
          ZeroDteContractIndicatorType_SellProfitProbability: 15
        }
      },
      ZeroDteContractIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          }
        }
      },
      EarningsSortType: {
        values: {
          EarningsSortType_Unknown: 0,
          EarningsSortType_EarningsDate: 1,
          EarningsSortType_Volume: 2,
          EarningsSortType_IV: 3,
          EarningsSortType_MarketCap: 4,
          EarningsSortType_ChangeRate: 5,
          EarningsSortType_Price: 6,
          EarningsSortType_IVRank: 7,
          EarningsSortType_IVPercentile: 8,
          EarningsSortType_HV: 9,
          EarningsSortType_OpenInterest: 10,
          EarningsSortType_LastReportIvCrush: 11,
          EarningsSortType_HistoryReportIvCrush: 12,
          EarningsSortType_LastReportChgRate: 13,
          EarningsSortType_HistoryReportChgRate: 14,
          EarningsSortType_EstimateEpsYoy: 15,
          EarningsSortType_EstimateRevenueYoy: 16,
          EarningsSortType_ExpectedMoveRatio: 17
        }
      },
      StockCategory: {
        values: {
          StockCategory_All: 0,
          StockCategory_Equity: 1,
          StockCategory_ETF: 2
        }
      },
      EarningsPubType: {
        values: {
          EarningsPubType_Unknown: 0,
          EarningsPubType_Before: 1,
          EarningsPubType_After: 2
        }
      },
      EarningsIndicatorType: {
        values: {
          EarningsIndicatorType_Unknown: 0,
          EarningsIndicatorType_OwnerList: 1,
          EarningsIndicatorType_IndexComponent: 2,
          EarningsIndicatorType_Plate: 3,
          EarningsIndicatorType_MarketCap: 4,
          EarningsIndicatorType_ExpirationType: 5,
          EarningsIndicatorType_IV: 6,
          EarningsIndicatorType_LastReportIvCrush: 7,
          EarningsIndicatorType_HistoryReportIvCrush: 8,
          EarningsIndicatorType_IVRank: 9,
          EarningsIndicatorType_IVPercentile: 10,
          EarningsIndicatorType_Volume: 11,
          EarningsIndicatorType_OpenInterest: 12,
          EarningsIndicatorType_Price: 13,
          EarningsIndicatorType_ChangeRate: 14,
          EarningsIndicatorType_ExpectedMoveRatio: 15,
          EarningsIndicatorType_LastReportChgRate: 16,
          EarningsIndicatorType_HistoryReportChgRate: 17,
          EarningsIndicatorType_EstimateRevenueYoy: 18,
          EarningsIndicatorType_EstimateEpsYoy: 19,
          EarningsIndicatorType_EarningsDayRange: 20
        }
      },
      EarningsIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          }
        }
      },
      SellerType: {
        values: {
          SellerType_Unknown: 0,
          SellerType_CoveredCall: 1,
          SellerType_CashSecuredPut: 2
        }
      },
      SellerSortType: {
        values: {
          SellerSortType_Unknown: 0,
          SellerSortType_AnnualizedReturn: 1,
          SellerSortType_IntervalReturn: 2,
          SellerSortType_ItmProbability: 3,
          SellerSortType_Premium: 4
        }
      },
      SellerIndicatorType: {
        values: {
          SellerIndicatorType_Unknown: 0,
          SellerIndicatorType_OwnerList: 1,
          SellerIndicatorType_StockCategory: 2,
          SellerIndicatorType_Volume: 3,
          SellerIndicatorType_OpenInterest: 4,
          SellerIndicatorType_IV: 5,
          SellerIndicatorType_HV: 6,
          SellerIndicatorType_IVRank: 7,
          SellerIndicatorType_IVPercentile: 8,
          SellerIndicatorType_MarketCap: 9,
          SellerIndicatorType_Price: 10,
          SellerIndicatorType_ChangeRate: 11,
          SellerIndicatorType_Plate: 12,
          SellerIndicatorType_ExpirationType: 13,
          SellerIndicatorType_LeftDays: 14,
          SellerIndicatorType_OptionExpirationType: 15,
          SellerIndicatorType_StrikeDateTimestamp: 16,
          SellerIndicatorType_Premium: 17,
          SellerIndicatorType_AnnualizedReturn: 18,
          SellerIndicatorType_IntervalReturn: 19,
          SellerIndicatorType_OtmDegree: 20,
          SellerIndicatorType_OtmProbability: 21,
          SellerIndicatorType_OptionIV: 22,
          SellerIndicatorType_BidPrice: 23,
          SellerIndicatorType_AskPrice: 24,
          SellerIndicatorType_OptionVolume: 25,
          SellerIndicatorType_OptionOpenInterest: 26
        }
      },
      SellerIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          }
        }
      },
      Boundary: {
        fields: {
          value: {
            rule: "required",
            type: "double",
            id: 1
          },
          includes: {
            rule: "required",
            type: "bool",
            id: 2
          }
        }
      },
      Interval: {
        fields: {
          filterMin: {
            type: "Boundary",
            id: 1
          },
          filterMax: {
            type: "Boundary",
            id: 2
          }
        }
      },
      IndicatorValue: {
        fields: {
          valueList: {
            rule: "repeated",
            type: "int64",
            id: 1,
            options: {
              packed: false
            }
          },
          valueInterval: {
            type: "Interval",
            id: 2
          },
          stringValueList: {
            rule: "repeated",
            type: "string",
            id: 3
          },
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 4
          }
        }
      },
      UnderlyingRankSortType: {
        values: {
          UnderlyingRankSortType_Unknown: 0,
          UnderlyingRankSortType_Volume: 1,
          UnderlyingRankSortType_VolumeRatio: 2,
          UnderlyingRankSortType_OpenInterest: 3,
          UnderlyingRankSortType_OpenInterestRatio: 4,
          UnderlyingRankSortType_Price: 5,
          UnderlyingRankSortType_PriceChange: 6,
          UnderlyingRankSortType_IV: 7,
          UnderlyingRankSortType_IVChange: 8,
          UnderlyingRankSortType_HV: 9,
          UnderlyingRankSortType_HVChange: 10,
          UnderlyingRankSortType_IVRank: 11,
          UnderlyingRankSortType_IVPercentile: 12,
          UnderlyingRankSortType_MarketCap: 13
        }
      },
      UnderlyingRankIndicatorType: {
        values: {
          UnderlyingRankIndicatorType_Unknown: 0,
          UnderlyingRankIndicatorType_OwnerList: 1,
          UnderlyingRankIndicatorType_StockCategory: 2,
          UnderlyingRankIndicatorType_Volume: 3,
          UnderlyingRankIndicatorType_OpenInterest: 4,
          UnderlyingRankIndicatorType_IV: 5,
          UnderlyingRankIndicatorType_HV: 6,
          UnderlyingRankIndicatorType_IVRank: 7,
          UnderlyingRankIndicatorType_IVPercentile: 8,
          UnderlyingRankIndicatorType_IVChange: 9,
          UnderlyingRankIndicatorType_HVChange: 10,
          UnderlyingRankIndicatorType_VolumeRatio: 11,
          UnderlyingRankIndicatorType_OIRatio: 12,
          UnderlyingRankIndicatorType_MarketCap: 13
        }
      },
      UnderlyingRankIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          }
        }
      },
      OptionRankIndicatorType: {
        values: {
          OptionRankIndicatorType_Unknown: 0,
          OptionRankIndicatorType_StockCategory: 1,
          OptionRankIndicatorType_MarketCap: 2,
          OptionRankIndicatorType_OwnerList: 3,
          OptionRankIndicatorType_UnderlyingIV: 4,
          OptionRankIndicatorType_UnderlyingHV: 5,
          OptionRankIndicatorType_IVRank: 6,
          OptionRankIndicatorType_IVPercentile: 7,
          OptionRankIndicatorType_IV: 8,
          OptionRankIndicatorType_OptionType: 9,
          OptionRankIndicatorType_LeftDays: 10,
          OptionRankIndicatorType_InTheMoney: 11,
          OptionRankIndicatorType_Volume: 12,
          OptionRankIndicatorType_OpenInterest: 13,
          OptionRankIndicatorType_Delta: 14,
          OptionRankIndicatorType_Gamma: 15,
          OptionRankIndicatorType_Theta: 16,
          OptionRankIndicatorType_Vega: 17,
          OptionRankIndicatorType_Rho: 18
        }
      },
      OptionRankIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          }
        }
      },
      ExpirationType: {
        values: {
          ExpirationType_Unknown: 0,
          ExpirationType_Monthly: 1,
          ExpirationType_Weekly: 2,
          ExpirationType_EndOfMonth: 3,
          ExpirationType_Quarterly: 4
        }
      },
      IndexComponentType: {
        values: {
          IndexComponentType_Unknown: 0,
          IndexComponentType_DJI: 1,
          IndexComponentType_IXIC: 2,
          IndexComponentType_NDX: 3,
          IndexComponentType_SPX: 4
        }
      }
    }
  },
  Qot_GetEarningsBeatRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetearningsbeatrank"
    },
    nested: {
      BeatType: {
        values: {
          BeatType_Unknown: 0,
          BeatType_EPS: 1,
          BeatType_REVENUE: 2,
          BeatType_EBIT: 3
        }
      },
      BeatTerm: {
        values: {
          BeatTerm_Latest: 0,
          BeatTerm_LatestQuarter: 1,
          BeatTerm_LatestHalf: 2,
          BeatTerm_LatestAnnual: 3,
          BeatTerm_All: 4
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_BeatRatio: 1,
          IndicatorType_ReleasedDate: 2,
          IndicatorType_MarketCap: 3,
          IndicatorType_Price: 4,
          IndicatorType_PeTTM: 5
        }
      },
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_BeatRatio: 1,
          SortField_EarningDayChg: 2,
          SortField_ReleasedDate: 3,
          SortField_Actual: 4,
          SortField_Estimate: 5,
          SortField_Yoy: 6,
          SortField_YoyGrowth: 7,
          SortField_PeTTM: 8,
          SortField_DividendsTTM: 9,
          SortField_Price: 10,
          SortField_ChangeRate: 11
        }
      },
      PostPeriodType: {
        values: {
          PostPeriodType_Regular: 0,
          PostPeriodType_Before: 1,
          PostPeriodType_After: 2,
          PostPeriodType_IntradayTrading: 3
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          beatType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          term: {
            type: "int32",
            id: 4
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 5
          },
          sortField: {
            type: "int32",
            id: 6
          }
        }
      },
      EarningsBeatItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          industry: {
            type: "string",
            id: 3
          },
          curPrice: {
            type: "double",
            id: 10
          },
          lastClosePrice: {
            type: "double",
            id: 11
          },
          changeRate: {
            type: "double",
            id: 12
          },
          marketCap: {
            type: "double",
            id: 13
          },
          peTTM: {
            type: "double",
            id: 14
          },
          dividendsTTM: {
            type: "double",
            id: 15
          },
          releasedDate: {
            type: "string",
            id: 20
          },
          beatRatio: {
            type: "double",
            id: 21
          },
          actual: {
            type: "double",
            id: 22
          },
          estimate: {
            type: "double",
            id: 23
          },
          yoy: {
            type: "double",
            id: 24
          },
          yoyGrowth: {
            type: "double",
            id: 25
          },
          earningDayChg: {
            type: "double",
            id: 26
          },
          term: {
            type: "string",
            id: 27
          },
          detailPostPeriod: {
            type: "int32",
            id: 28
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "EarningsBeatItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEarningsCalendar: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      EarningsCalendarSortType: {
        values: {
          EarningsCalendarSortType_Unknown: 0,
          EarningsCalendarSortType_Hot: 1,
          EarningsCalendarSortType_MarketCap: 2,
          EarningsCalendarSortType_OptionVolume: 3,
          EarningsCalendarSortType_IV: 4,
          EarningsCalendarSortType_IVRank: 5,
          EarningsCalendarSortType_IVPercentile: 6,
          EarningsCalendarSortType_RtMarketCap: 7
        }
      },
      EarningsCalendarPubType: {
        values: {
          EarningsCalendarPubType_Unknown: -1,
          EarningsCalendarPubType_Regular: 0,
          EarningsCalendarPubType_Before: 1,
          EarningsCalendarPubType_After: 2
        }
      },
      EarningsCalendarEstimateType: {
        values: {
          EarningsCalendarEstimateType_Unknown: 0,
          EarningsCalendarEstimateType_EPS: 1,
          EarningsCalendarEstimateType_Revenue: 2,
          EarningsCalendarEstimateType_EBIT: 3
        }
      },
      EarningsCalendarPeriodType: {
        values: {
          EarningsCalendarPeriodType_Unknown: 0,
          EarningsCalendarPeriodType_Quarterly: 1,
          EarningsCalendarPeriodType_SemiAnnual: 2,
          EarningsCalendarPeriodType_Annual: 3
        }
      },
      EarningsCalendarStockListType: {
        values: {
          EarningsCalendarStockListType_Unknown: 0,
          EarningsCalendarStockListType_Watchlist: 1,
          EarningsCalendarStockListType_Position: 2,
          EarningsCalendarStockListType_Special: 3
        }
      },
      EarningsCalendarIndicatorType: {
        values: {
          EarningsCalendarIndicatorType_Unknown: 0,
          EarningsCalendarIndicatorType_PubType: 1,
          EarningsCalendarIndicatorType_EstimateType: 2,
          EarningsCalendarIndicatorType_MarketCap: 3,
          EarningsCalendarIndicatorType_StockListType: 4,
          EarningsCalendarIndicatorType_OptionVolume: 5,
          EarningsCalendarIndicatorType_IV: 6,
          EarningsCalendarIndicatorType_IVRank: 7,
          EarningsCalendarIndicatorType_IVPercentile: 8,
          EarningsCalendarIndicatorType_RtMarketCap: 9
        }
      },
      EarningsCalendarIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.IndicatorValue",
            id: 2
          }
        }
      },
      EstimateData: {
        fields: {
          estimateType: {
            type: "int32",
            id: 1
          },
          actualValue: {
            type: "double",
            id: 2
          },
          predictValue: {
            type: "double",
            id: 3
          },
          currency: {
            type: "string",
            id: 4
          },
          periodType: {
            type: "int32",
            id: 5
          }
        }
      },
      EarningsCalendarItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          earningsDate: {
            type: "string",
            id: 3
          },
          earningsTimestamp: {
            type: "double",
            id: 4
          },
          pubType: {
            type: "int32",
            id: 5
          },
          periodText: {
            type: "string",
            id: 7
          },
          estimateList: {
            rule: "repeated",
            type: "EstimateData",
            id: 8
          },
          optionVolume: {
            type: "int64",
            id: 10
          },
          iv: {
            type: "double",
            id: 11
          },
          ivRank: {
            type: "double",
            id: 12
          },
          ivPercentile: {
            type: "double",
            id: 13
          },
          marketCap: {
            type: "double",
            id: 20
          },
          price: {
            type: "double",
            id: 21
          }
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortType: {
            type: "int32",
            id: 2
          },
          beginDate: {
            type: "string",
            id: 3
          },
          endDate: {
            type: "string",
            id: 4
          },
          filterList: {
            rule: "repeated",
            type: "EarningsCalendarIndicator",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "EarningsCalendarItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEconomicCalendar: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteconomiccalendar"
    },
    nested: {
      Importance: {
        values: {
          Importance_All: 0,
          Importance_Low: 1,
          Importance_Medium: 2,
          Importance_High: 3
        }
      },
      EconomicCalendarItem: {
        fields: {
          title: {
            type: "string",
            id: 1
          },
          timestamp: {
            type: "double",
            id: 2
          },
          country: {
            type: "string",
            id: 3
          },
          star: {
            type: "int32",
            id: 4
          },
          previous: {
            type: "string",
            id: 5
          },
          consensus: {
            type: "string",
            id: 6
          },
          actual: {
            type: "string",
            id: 7
          }
        }
      },
      C2S: {
        fields: {
          beginDate: {
            rule: "required",
            type: "string",
            id: 1
          },
          endDate: {
            type: "string",
            id: 2
          },
          marketList: {
            rule: "repeated",
            type: "int32",
            id: 3,
            options: {
              packed: false
            }
          },
          importance: {
            type: "int32",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          },
          nextPage: {
            type: "string",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "EconomicCalendarItem",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          },
          hasMore: {
            type: "bool",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContract: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontract"
    },
    nested: {
      ContractItem: {
        fields: {
          contractSecurity: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          eventSecurity: {
            type: "Qot_Common.Security",
            id: 2
          },
          seriesSecurity: {
            type: "Qot_Common.Security",
            id: 3
          },
          contractType: {
            type: "Qot_Common.EC_ContractType",
            id: 4
          },
          title: {
            type: "string",
            id: 5
          },
          yesSubTitle: {
            type: "string",
            id: 6
          },
          openTime: {
            type: "string",
            id: 7
          },
          closeTime: {
            type: "string",
            id: 8
          },
          determinationTime: {
            type: "string",
            id: 9
          },
          settledTime: {
            type: "string",
            id: 10
          },
          latestExpirationTime: {
            type: "string",
            id: 11
          },
          status: {
            type: "Qot_Common.EC_Status",
            id: 12
          },
          result: {
            type: "string",
            id: 13
          },
          settlementValue: {
            type: "string",
            id: 14
          },
          expirationValue: {
            type: "string",
            id: 15
          },
          volume: {
            type: "string",
            id: 16
          },
          canCloseEarly: {
            type: "bool",
            id: 17
          },
          tickSize: {
            type: "string",
            id: 18
          },
          category: {
            type: "string",
            id: 19
          },
          tag: {
            type: "string",
            id: 20
          }
        }
      },
      RecommendContract: {
        fields: {
          contractSecurity: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      C2S: {
        fields: {
          event: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          contractList: {
            rule: "repeated",
            type: "ContractItem",
            id: 1
          },
          recommendContracts: {
            rule: "repeated",
            type: "RecommendContract",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractCategory: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractcategory"
    },
    nested: {
      CategoryItem: {
        fields: {
          category: {
            rule: "required",
            type: "string",
            id: 1
          },
          categoryName: {
            type: "string",
            id: 2
          },
          tags: {
            rule: "repeated",
            type: "string",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          category: {
            type: "string",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          categoryList: {
            rule: "repeated",
            type: "CategoryItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractComboList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractcombolist"
    },
    nested: {
      ComboEvent: {
        fields: {
          eventSecurity: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          eventName: {
            type: "string",
            id: 2
          },
          comboContracts: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 3
          },
          seriesSecurity: {
            type: "Qot_Common.Security",
            id: 4
          },
          category: {
            type: "string",
            id: 5
          },
          competition: {
            type: "string",
            id: 6
          },
          competitionScope: {
            type: "string",
            id: 7
          }
        }
      },
      C2S: {
        fields: {
          category: {
            type: "string",
            id: 1
          },
          competition: {
            type: "string",
            id: 2
          },
          series: {
            type: "Qot_Common.Security",
            id: 3
          },
          nextPage: {
            type: "string",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          comboEventList: {
            rule: "repeated",
            type: "ComboEvent",
            id: 1
          },
          mvc: {
            type: "string",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractComboRfq: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractcomborfq"
    },
    nested: {
      C2S: {
        fields: {
          comboLegList: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 1
          },
          mvc: {
            rule: "required",
            type: "string",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          comboLegList: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 1
          },
          bidPrice: {
            type: "double",
            id: 2
          },
          askPrice: {
            type: "double",
            id: 3
          },
          quoteId: {
            type: "string",
            id: 4
          },
          shouldRetry: {
            type: "bool",
            id: 5
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractEventList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontracteventlist"
    },
    nested: {
      EventItem: {
        fields: {
          eventSecurity: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          eventName: {
            type: "string",
            id: 2
          },
          eventSubName: {
            type: "string",
            id: 3
          },
          status: {
            type: "Qot_Common.EC_Status",
            id: 4
          },
          seriesSecurity: {
            type: "Qot_Common.Security",
            id: 5
          },
          startDate: {
            type: "string",
            id: 6
          },
          endDate: {
            type: "string",
            id: 7
          },
          category: {
            type: "string",
            id: 8
          },
          tags: {
            rule: "repeated",
            type: "string",
            id: 9
          },
          mutuallyExclusive: {
            type: "bool",
            id: 10
          },
          competition: {
            type: "string",
            id: 11
          },
          competitionScope: {
            type: "string",
            id: 12
          }
        }
      },
      C2S: {
        fields: {
          series: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          status: {
            type: "Qot_Common.EC_Status",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          eventList: {
            rule: "repeated",
            type: "EventItem",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractKline: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractkline"
    },
    nested: {
      ECKLine: {
        fields: {
          timeKey: {
            rule: "required",
            type: "string",
            id: 1
          },
          open: {
            type: "double",
            id: 2
          },
          high: {
            type: "double",
            id: 3
          },
          low: {
            type: "double",
            id: 4
          },
          close: {
            type: "double",
            id: 5
          },
          volume: {
            type: "double",
            id: 6
          }
        }
      },
      KlineItem: {
        fields: {
          code: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          preSide: {
            type: "Common.PredSide",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          klineList: {
            rule: "repeated",
            type: "ECKLine",
            id: 4
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          klineSource: {
            type: "Qot_Common.EC_KlineSource",
            id: 2
          },
          preSide: {
            type: "Common.PredSide",
            id: 3
          },
          ktype: {
            type: "Qot_Common.KLType",
            id: 4
          },
          maxCount: {
            type: "int32",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          klineList: {
            rule: "repeated",
            type: "KlineItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractMilestoneList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractmilestonelist"
    },
    nested: {
      MilestoneItem: {
        fields: {
          milestoneSecurity: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          title: {
            type: "string",
            id: 2
          },
          category: {
            type: "string",
            id: 3
          },
          type: {
            type: "Qot_Common.EC_MilestoneType",
            id: 4
          },
          startDate: {
            type: "string",
            id: 5
          },
          endDate: {
            type: "string",
            id: 6
          },
          primaryEventSecurity: {
            type: "Qot_Common.Security",
            id: 7
          },
          relatedEventList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 8
          },
          notificationMessage: {
            type: "string",
            id: 9
          }
        }
      },
      C2S: {
        fields: {
          category: {
            type: "string",
            id: 1
          },
          competition: {
            type: "string",
            id: 2
          },
          relatedEvent: {
            type: "Qot_Common.Security",
            id: 3
          },
          nextPage: {
            type: "string",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          milestoneList: {
            rule: "repeated",
            type: "MilestoneItem",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractOrderBook: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractorderbook"
    },
    nested: {
      OrderBookLevel: {
        fields: {
          price: {
            rule: "required",
            type: "double",
            id: 1
          },
          size: {
            rule: "required",
            type: "double",
            id: 2
          }
        }
      },
      OrderBookItem: {
        fields: {
          code: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          yesBids: {
            rule: "repeated",
            type: "OrderBookLevel",
            id: 2
          },
          yesAsks: {
            rule: "repeated",
            type: "OrderBookLevel",
            id: 3
          },
          noBids: {
            rule: "repeated",
            type: "OrderBookLevel",
            id: 4
          },
          noAsks: {
            rule: "repeated",
            type: "OrderBookLevel",
            id: 5
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          num: {
            rule: "required",
            type: "int32",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          orderBookList: {
            rule: "repeated",
            type: "OrderBookItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractSeriesList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractserieslist"
    },
    nested: {
      SeriesItem: {
        fields: {
          seriesSecurity: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          seriesName: {
            type: "string",
            id: 2
          },
          category: {
            type: "string",
            id: 3
          },
          tags: {
            rule: "repeated",
            type: "string",
            id: 4
          },
          frequency: {
            type: "Qot_Common.EC_Frequency",
            id: 5
          }
        }
      },
      C2S: {
        fields: {
          category: {
            type: "string",
            id: 1
          },
          tag: {
            type: "string",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          seriesList: {
            rule: "repeated",
            type: "SeriesItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractSnapshot: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractsnapshot"
    },
    nested: {
      SnapshotItem: {
        fields: {
          code: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          eventCode: {
            type: "Qot_Common.Security",
            id: 3
          },
          yesSubTitle: {
            type: "string",
            id: 4
          },
          noSubTitle: {
            type: "string",
            id: 5
          },
          status: {
            type: "Qot_Common.EC_Status",
            id: 6
          },
          price: {
            type: "double",
            id: 7
          },
          cumulativeVolume: {
            type: "double",
            id: 8
          },
          yesBid: {
            type: "double",
            id: 9
          },
          yesBidSize: {
            type: "double",
            id: 10
          },
          yesAsk: {
            type: "double",
            id: 11
          },
          yesAskSize: {
            type: "double",
            id: 12
          },
          noBid: {
            type: "double",
            id: 13
          },
          noBidSize: {
            type: "double",
            id: 14
          },
          noAsk: {
            type: "double",
            id: 15
          },
          noAskSize: {
            type: "double",
            id: 16
          },
          lastTradeTime: {
            type: "string",
            id: 17
          },
          volume_24h: {
            type: "double",
            id: 18
          },
          openInterest: {
            type: "double",
            id: 19
          }
        }
      },
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          snapshotList: {
            rule: "repeated",
            type: "SnapshotItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetEventContractTicker: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgeteventcontractticker"
    },
    nested: {
      TickerPoint: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          yesPrice: {
            type: "double",
            id: 2
          },
          noPrice: {
            type: "double",
            id: 3
          },
          volume: {
            type: "double",
            id: 4
          },
          side: {
            type: "Common.PredSide",
            id: 5
          },
          sequence: {
            type: "string",
            id: 6
          }
        }
      },
      TickerItem: {
        fields: {
          code: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          tickerList: {
            rule: "repeated",
            type: "TickerPoint",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          count: {
            type: "int32",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          tickerList: {
            rule: "repeated",
            type: "TickerItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetFedWatchDotPlot: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetfedwatchdotplot"
    },
    nested: {
      DotGroup: {
        fields: {
          rate: {
            rule: "required",
            type: "double",
            id: 1
          },
          voteCount: {
            rule: "required",
            type: "int32",
            id: 2
          },
          isMedian: {
            type: "bool",
            id: 3
          }
        }
      },
      DotPlotYear: {
        fields: {
          year: {
            rule: "required",
            type: "int32",
            id: 1
          },
          dotList: {
            rule: "repeated",
            type: "DotGroup",
            id: 2
          },
          medianRate: {
            type: "double",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          yearList: {
            rule: "repeated",
            type: "DotPlotYear",
            id: 1
          },
          currentRate: {
            type: "double",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetFedWatchTargetRate: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetfedwatchtargetrate"
    },
    nested: {
      TargetRateItem: {
        fields: {
          targetRange: {
            rule: "required",
            type: "string",
            id: 1
          },
          probability: {
            rule: "required",
            type: "double",
            id: 2
          }
        }
      },
      FedMeetingTab: {
        fields: {
          meetingDate: {
            rule: "required",
            type: "string",
            id: 1
          },
          targetRateList: {
            rule: "repeated",
            type: "TargetRateItem",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          meetingList: {
            rule: "repeated",
            type: "FedMeetingTab",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetFinancialsEarningsPriceHistory: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetfinancialsearnpricehist"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      PriceInfo: {
        fields: {
          tradingDay: {
            type: "int64",
            id: 1
          },
          tradingDayStr: {
            type: "string",
            id: 2
          },
          closePrice: {
            type: "double",
            id: 3
          },
          openPrice: {
            type: "double",
            id: 4
          },
          highestPrice: {
            type: "double",
            id: 5
          },
          lowestPrice: {
            type: "double",
            id: 6
          },
          lastClosePrice: {
            type: "double",
            id: 7
          },
          volume: {
            type: "double",
            id: 8
          }
        }
      },
      FinScheduleInfo: {
        fields: {
          delta: {
            type: "int32",
            id: 1
          },
          closePrice: {
            type: "double",
            id: 2
          }
        }
      },
      PriceHistoryOnEarningsDays: {
        fields: {
          fiscalYear: {
            type: "int32",
            id: 1
          },
          financialType: {
            type: "int32",
            id: 2
          },
          periodText: {
            type: "string",
            id: 3
          },
          isCurrent: {
            type: "bool",
            id: 4
          },
          pubTradingDay: {
            type: "int64",
            id: 5
          },
          pubTradingDayStr: {
            type: "string",
            id: 6
          },
          pubTime: {
            type: "int64",
            id: 7
          },
          pubTimeStr: {
            type: "string",
            id: 8
          },
          pubType: {
            type: "Qot_Common.EarningsPubTimeType",
            id: 9
          },
          predictVolaRatioNewest: {
            type: "double",
            id: 10
          },
          predictVolaRatioHighest: {
            type: "double",
            id: 11
          },
          predictVolaValNewest: {
            type: "double",
            id: 12
          },
          predictVolaValHighest: {
            type: "double",
            id: 13
          },
          optionIVCrush: {
            type: "double",
            id: 14
          },
          optionStrikeDateIVCrush: {
            type: "double",
            id: 15
          },
          priceInfo: {
            type: "PriceInfo",
            id: 16
          },
          scheduleInfoList: {
            rule: "repeated",
            type: "FinScheduleInfo",
            id: 17
          }
        }
      },
      S2C: {
        fields: {
          detailList: {
            rule: "repeated",
            type: "PriceHistoryOnEarningsDays",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetFinancialsEarningsPriceMove: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetfinancialsearnpricemove"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          periodCount: {
            type: "int32",
            id: 2
          }
        }
      },
      PricePerformanceRow: {
        fields: {
          tradingDay: {
            type: "int64",
            id: 1
          },
          tradingDayStr: {
            type: "string",
            id: 2
          },
          closePrice: {
            type: "double",
            id: 3
          },
          openPrice: {
            type: "double",
            id: 4
          },
          highestPrice: {
            type: "double",
            id: 5
          },
          lowestPrice: {
            type: "double",
            id: 6
          },
          lastClosePrice: {
            type: "double",
            id: 7
          },
          optionIV: {
            type: "double",
            id: 8
          },
          optionHV: {
            type: "double",
            id: 9
          }
        }
      },
      ReportCycleQuote: {
        fields: {
          fiscalYear: {
            type: "int32",
            id: 1
          },
          financialType: {
            type: "int32",
            id: 2
          },
          periodText: {
            type: "string",
            id: 3
          },
          pubTradingDay: {
            type: "int64",
            id: 4
          },
          pubTradingDayStr: {
            type: "string",
            id: 5
          },
          pubType: {
            type: "Qot_Common.EarningsPubTimeType",
            id: 6
          },
          priceInfoIndex: {
            type: "int32",
            id: 7
          },
          itemList: {
            rule: "repeated",
            type: "PricePerformanceRow",
            id: 8
          }
        }
      },
      S2C: {
        fields: {
          detailList: {
            rule: "repeated",
            type: "ReportCycleQuote",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetFinancialsRevenueBreakdown: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetfinancialrevenuebreakdown"
    },
    nested: {
      MainIncomeItem: {
        fields: {
          name: {
            type: "string",
            id: 1
          },
          mainOperIncome: {
            type: "double",
            id: 2
          },
          ratio: {
            type: "double",
            id: 3
          }
        }
      },
      RevenueBreakdownGroup: {
        fields: {
          type: {
            type: "Qot_Common.RevenueBreakdownType",
            id: 1
          },
          itemList: {
            rule: "repeated",
            type: "MainIncomeItem",
            id: 2
          }
        }
      },
      ScreenDate: {
        fields: {
          date: {
            type: "uint32",
            id: 1
          },
          periodText: {
            type: "string",
            id: 2
          },
          financialType: {
            type: "Qot_Common.F10Type",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          date: {
            type: "uint32",
            id: 2
          },
          financialType: {
            type: "Qot_Common.F10Type",
            id: 3
          },
          currencyCode: {
            type: "string",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          period: {
            type: "string",
            id: 1
          },
          breakdownList: {
            rule: "repeated",
            type: "RevenueBreakdownGroup",
            id: 2
          },
          currencyCode: {
            type: "string",
            id: 3
          },
          screenDateList: {
            rule: "repeated",
            type: "ScreenDate",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetFinancialsStatements: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetfinancialsstatements"
    },
    nested: {
      FinancialFieldInfo: {
        fields: {
          fieldId: {
            type: "int64",
            id: 1
          },
          displayName: {
            type: "string",
            id: 2
          }
        }
      },
      FinancialItem: {
        fields: {
          fieldId: {
            type: "int64",
            id: 1
          },
          data: {
            type: "double",
            id: 2
          },
          yoy: {
            type: "double",
            id: 3
          },
          qoq: {
            type: "double",
            id: 4
          }
        }
      },
      FinancialReport: {
        fields: {
          dateTime: {
            type: "int64",
            id: 1
          },
          dateTimeStr: {
            type: "string",
            id: 2
          },
          fiscalYear: {
            type: "int32",
            id: 3
          },
          financialType: {
            type: "Qot_Common.F10Type",
            id: 4
          },
          periodText: {
            type: "string",
            id: 5
          },
          itemList: {
            rule: "repeated",
            type: "FinancialItem",
            id: 6
          },
          currencyInfo: {
            type: "string",
            id: 7
          },
          accountingStandards: {
            type: "string",
            id: 8
          },
          auditorReport: {
            type: "string",
            id: 9
          },
          currencyCode: {
            type: "string",
            id: 10
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          statementType: {
            type: "Qot_Common.FinancialStatementsType",
            id: 2
          },
          financialType: {
            type: "Qot_Common.F10Type",
            id: 3
          },
          currencyCode: {
            type: "string",
            id: 4
          },
          nextKey: {
            type: "string",
            id: 5
          },
          num: {
            type: "int32",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          structureList: {
            rule: "repeated",
            type: "FinancialFieldInfo",
            id: 1
          },
          reportList: {
            rule: "repeated",
            type: "FinancialReport",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetFutureInfo: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetfutureinfo"
    },
    nested: {
      TradeTime: {
        fields: {
          begin: {
            type: "double",
            id: 1
          },
          end: {
            type: "double",
            id: 2
          }
        }
      },
      FutureInfo: {
        fields: {
          name: {
            rule: "required",
            type: "string",
            id: 1
          },
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 2
          },
          lastTradeTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          lastTradeTimestamp: {
            type: "double",
            id: 4
          },
          owner: {
            type: "Qot_Common.Security",
            id: 5
          },
          ownerOther: {
            rule: "required",
            type: "string",
            id: 6
          },
          exchange: {
            rule: "required",
            type: "string",
            id: 7
          },
          contractType: {
            rule: "required",
            type: "string",
            id: 8
          },
          contractSize: {
            rule: "required",
            type: "double",
            id: 9
          },
          contractSizeUnit: {
            rule: "required",
            type: "string",
            id: 10
          },
          quoteCurrency: {
            rule: "required",
            type: "string",
            id: 11
          },
          minVar: {
            rule: "required",
            type: "double",
            id: 12
          },
          minVarUnit: {
            rule: "required",
            type: "string",
            id: 13
          },
          quoteUnit: {
            type: "string",
            id: 14
          },
          tradeTime: {
            rule: "repeated",
            type: "TradeTime",
            id: 15
          },
          timeZone: {
            rule: "required",
            type: "string",
            id: 16
          },
          exchangeFormatUrl: {
            rule: "required",
            type: "string",
            id: 17
          },
          origin: {
            type: "Qot_Common.Security",
            id: 18
          }
        }
      },
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          futureInfoList: {
            rule: "repeated",
            type: "FutureInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetHeatMapData: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetheatmapdata"
    },
    nested: {
      HeatMapPlateType: {
        values: {
          HeatMapPlateType_Industry: 0,
          HeatMapPlateType_Concept: 1,
          HeatMapPlateType_Theme: 2
        }
      },
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_ChangeRate: 1,
          SortField_MarketVal: 2,
          SortField_Turnover: 3,
          SortField_Hot: 4
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortField: {
            type: "int32",
            id: 2
          },
          ascend: {
            type: "bool",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          },
          page: {
            type: "string",
            id: 5
          },
          plateType: {
            type: "int32",
            id: 6
          }
        }
      },
      HeatMapPlateData: {
        fields: {
          plate: {
            type: "Qot_Common.Security",
            id: 1
          },
          plateName: {
            type: "string",
            id: 2
          },
          curPrice: {
            type: "double",
            id: 3
          },
          changeRate: {
            type: "double",
            id: 4
          },
          turnover: {
            type: "double",
            id: 5
          },
          volume: {
            type: "int64",
            id: 6
          },
          marketVal: {
            type: "double",
            id: 7
          },
          peAvg: {
            type: "double",
            id: 8
          },
          riseCount: {
            type: "int32",
            id: 9
          },
          fallCount: {
            type: "int32",
            id: 10
          },
          equalCount: {
            type: "int32",
            id: 11
          },
          leaderStock: {
            type: "Qot_Common.Security",
            id: 12
          },
          description: {
            type: "string",
            id: 13
          }
        }
      },
      S2C: {
        fields: {
          plateDataList: {
            rule: "repeated",
            type: "HeatMapPlateData",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetHighDividendSOERank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgethighdividendsoerank"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_DividendYieldTTM: 1,
          SortField_PB: 2,
          SortField_PeTTM: 3,
          SortField_Price: 4,
          SortField_ChangeRatio: 5,
          SortField_MarketCap: 6
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_Price: 1,
          IndicatorType_MarketCap: 2,
          IndicatorType_PE: 3,
          IndicatorType_DividendYieldTTM: 4,
          IndicatorType_ChangeRatio: 5
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          sortField: {
            type: "int32",
            id: 1
          },
          sortDir: {
            type: "int32",
            id: 2
          },
          offset: {
            type: "int32",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 5
          }
        }
      },
      HighDividendSOERankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          industry: {
            type: "string",
            id: 3
          },
          curPrice: {
            type: "double",
            id: 10
          },
          changeRatio: {
            type: "double",
            id: 11
          },
          turnover: {
            type: "double",
            id: 12
          },
          volume: {
            type: "int64",
            id: 13
          },
          marketCap: {
            type: "double",
            id: 14
          },
          peTTM: {
            type: "double",
            id: 20
          },
          pb: {
            type: "double",
            id: 21
          },
          dividendYieldTTM: {
            type: "double",
            id: 22
          },
          turnoverRatio: {
            type: "double",
            id: 23
          },
          changeRate5D: {
            type: "double",
            id: 30
          },
          changeRate10D: {
            type: "double",
            id: 31
          },
          changeRate20D: {
            type: "double",
            id: 32
          },
          changeRate60D: {
            type: "double",
            id: 33
          },
          changeRate120D: {
            type: "double",
            id: 34
          },
          changeRate250D: {
            type: "double",
            id: 35
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "HighDividendSOERankItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetHoldingChangeList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetholdingchangelist"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          holderCategory: {
            rule: "required",
            type: "int32",
            id: 2
          },
          beginTime: {
            type: "string",
            id: 3
          },
          endTime: {
            type: "string",
            id: 4
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          holdingChangeList: {
            rule: "repeated",
            type: "Qot_Common.ShareHoldingChange",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetHotList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgethotlist"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      HotListSortField: {
        values: {
          HotListSortField_Unknown: 0,
          HotListSortField_TradeHeat: 1,
          HotListSortField_SearchHeat: 2,
          HotListSortField_NewsHeat: 3,
          HotListSortField_AverageHeat: 4
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_MarketCap: 1
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortField: {
            type: "int32",
            id: 2
          },
          sortDir: {
            type: "int32",
            id: 3
          },
          offset: {
            type: "int32",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 6
          }
        }
      },
      HotNewsInfo: {
        fields: {
          newsType: {
            type: "int32",
            id: 1
          },
          title: {
            type: "string",
            id: 2
          },
          newsUrl: {
            type: "string",
            id: 3
          }
        }
      },
      HotListItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          tradeHeat: {
            type: "double",
            id: 12
          },
          tradeHeatChange: {
            type: "double",
            id: 13
          },
          searchHeat: {
            type: "double",
            id: 14
          },
          searchHeatChange: {
            type: "double",
            id: 15
          },
          newsHeat: {
            type: "double",
            id: 16
          },
          newsHeatChange: {
            type: "double",
            id: 17
          },
          averageHeat: {
            type: "double",
            id: 18
          },
          averageHeatChange: {
            type: "double",
            id: 19
          },
          newsInfo: {
            type: "HotNewsInfo",
            id: 20
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "HotListItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetIndicatorList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetindicatorlist"
    },
    nested: {
      IndicatorInfo: {
        fields: {
          shortName: {
            type: "string",
            id: 1
          },
          fullName: {
            type: "string",
            id: 2
          },
          inputs: {
            rule: "repeated",
            type: "Qot_Common.IndicatorInputParam",
            id: 3
          },
          outputs: {
            rule: "repeated",
            type: "Qot_Common.IndicatorOutputParam",
            id: 4
          },
          script: {
            type: "string",
            id: 5
          }
        }
      },
      IndicatorEntry: {
        fields: {
          myLang: {
            type: "IndicatorInfo",
            id: 1
          },
          python: {
            type: "IndicatorInfo",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          searchKey: {
            type: "string",
            id: 1
          },
          langType: {
            type: "int32",
            id: 2
          },
          searchMode: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          indicatorList: {
            rule: "repeated",
            type: "IndicatorEntry",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetIndustrialChainByPlate: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetindustrialchainbyplate"
    },
    nested: {
      C2S: {
        fields: {
          plateId: {
            rule: "required",
            type: "int64",
            id: 1
          }
        }
      },
      RelatedChainInfo: {
        fields: {
          chainId: {
            type: "int64",
            id: 1
          },
          chainType: {
            type: "int32",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          marketCap: {
            type: "double",
            id: 4
          },
          stocksNum: {
            type: "int64",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          relatedChainList: {
            rule: "repeated",
            type: "RelatedChainInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetIndustrialChainDetail: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetindustrialchaindetail"
    },
    nested: {
      C2S: {
        fields: {
          chainId: {
            rule: "required",
            type: "int64",
            id: 1
          }
        }
      },
      IndustrialChainNode: {
        fields: {
          nodeId: {
            type: "int64",
            id: 1
          },
          parentNodeId: {
            type: "int64",
            id: 2
          },
          layerSth: {
            type: "int64",
            id: 3
          },
          name: {
            type: "string",
            id: 4
          },
          plateId: {
            type: "int64",
            id: 5
          }
        }
      },
      InformationLink: {
        fields: {
          title: {
            type: "string",
            id: 1
          },
          url: {
            type: "string",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          chainId: {
            type: "int64",
            id: 1
          },
          chainType: {
            type: "int32",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          nodeList: {
            rule: "repeated",
            type: "IndustrialChainNode",
            id: 4
          },
          informationList: {
            rule: "repeated",
            type: "InformationLink",
            id: 5
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetIndustrialChainList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetindustrialchainlist"
    },
    nested: {
      IndustrialChainType: {
        values: {
          IndustrialChainType_Chain: 1,
          IndustrialChainType_Parallel: 2,
          IndustrialChainType_UpMidDown: 3
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          keyword: {
            type: "string",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          page: {
            type: "string",
            id: 4
          }
        }
      },
      IndustrialChainInfo: {
        fields: {
          chainId: {
            type: "int64",
            id: 1
          },
          chainType: {
            type: "int32",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          detail: {
            type: "string",
            id: 4
          },
          marketCap: {
            type: "double",
            id: 5
          },
          stocksNum: {
            type: "int64",
            id: 6
          },
          relationSecurityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "IndustrialChainInfo",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetIndustrialPlateInfo: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetindustrialplateinfo"
    },
    nested: {
      C2S: {
        fields: {
          plateId: {
            rule: "required",
            type: "int64",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          plateId: {
            type: "int64",
            id: 1
          },
          summary: {
            type: "string",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetIndustrialPlateStock: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetindustrialplatestock"
    },
    nested: {
      SortField: {
        values: {
          SortField_Code: 0,
          SortField_ChangeRate: 1,
          SortField_Turnover: 2,
          SortField_Volume: 3,
          SortField_MarketVal: 4
        }
      },
      StockInfo: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          chainId: {
            type: "int64",
            id: 1
          },
          plateId: {
            type: "int64",
            id: 2
          },
          marketList: {
            rule: "repeated",
            type: "int32",
            id: 3,
            options: {
              packed: false
            }
          },
          sortField: {
            type: "int32",
            id: 4
          },
          ascend: {
            type: "bool",
            id: 5
          },
          count: {
            type: "int32",
            id: 6
          },
          page: {
            type: "string",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          stockList: {
            rule: "repeated",
            type: "StockInfo",
            id: 1
          },
          page: {
            type: "string",
            id: 2
          },
          allCount: {
            type: "int32",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetInsiderHolderList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetinsiderholderlist"
    },
    nested: {
      OwnerInsiderHolderItem: {
        fields: {
          holderId: {
            type: "int64",
            id: 1
          },
          holderQuantity: {
            type: "int64",
            id: 2
          },
          holderPct: {
            type: "double",
            id: 3
          },
          name: {
            type: "string",
            id: 4
          },
          title: {
            type: "string",
            id: 5
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "OwnerInsiderHolderItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          insiderTotalCount: {
            type: "int32",
            id: 4
          },
          insiderBoughtCount: {
            type: "int32",
            id: 5
          },
          insiderSoldCount: {
            type: "int32",
            id: 6
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetInsiderTradeList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetinsidertradelist"
    },
    nested: {
      OwnerInsiderTradeItem: {
        fields: {
          tradeShares: {
            type: "int64",
            id: 1
          },
          minTradeDate: {
            type: "int64",
            id: 2
          },
          minTradeDateStr: {
            type: "string",
            id: 3
          },
          maxTradeDate: {
            type: "int64",
            id: 4
          },
          maxTradeDateStr: {
            type: "string",
            id: 5
          },
          minPrice: {
            type: "double",
            id: 6
          },
          maxPrice: {
            type: "double",
            id: 7
          },
          securityHolderQuantity: {
            type: "int64",
            id: 8
          },
          isProposedSaleOfSecurities: {
            type: "bool",
            id: 9
          },
          holderId: {
            type: "int64",
            id: 10
          },
          name: {
            type: "string",
            id: 11
          },
          title: {
            type: "string",
            id: 12
          },
          securityDescription: {
            type: "string",
            id: 13
          },
          transactionType: {
            type: "string",
            id: 14
          },
          sourceGroupName: {
            type: "string",
            id: 15
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          holderId: {
            type: "int64",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          num: {
            type: "int32",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "OwnerInsiderTradeItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetInstitutionDistribution: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetinstitutiondistribution"
    },
    nested: {
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          institutionId: {
            rule: "required",
            type: "int32",
            id: 2
          }
        }
      },
      IndustryDistributionItem: {
        fields: {
          industryId: {
            type: "uint64",
            id: 1
          },
          industryName: {
            type: "string",
            id: 2
          },
          positionValue: {
            type: "double",
            id: 3
          },
          portfolioPct: {
            type: "double",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "IndustryDistributionItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetInstitutionHoldingChange: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetinstitutionholdingchange"
    },
    nested: {
      HoldingChangeType: {
        values: {
          HoldingChangeType_Unknown: 0,
          HoldingChangeType_New: 1,
          HoldingChangeType_SoldOut: 2,
          HoldingChangeType_Increase: 3,
          HoldingChangeType_Decrease: 4
        }
      },
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_ChangePct: 1,
          SortField_ChangeShares: 2,
          SortField_HoldingDate: 3
        }
      },
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          institutionId: {
            rule: "required",
            type: "int32",
            id: 2
          },
          changeType: {
            type: "int32",
            id: 3
          },
          sortField: {
            type: "int32",
            id: 4
          },
          sortDir: {
            type: "int32",
            id: 5
          },
          count: {
            type: "int32",
            id: 6
          },
          page: {
            type: "string",
            id: 7
          }
        }
      },
      HoldingChangeItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          portfolioPct: {
            type: "double",
            id: 3
          },
          changeShares: {
            type: "int64",
            id: 4
          },
          changePct: {
            type: "double",
            id: 5
          },
          holdingDate: {
            type: "string",
            id: 6
          },
          source: {
            type: "string",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "HoldingChangeItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetInstitutionHoldingList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetinstitutionholdinglist"
    },
    nested: {
      HoldingChangeType: {
        values: {
          HoldingChangeType_Unknown: 0,
          HoldingChangeType_New: 1,
          HoldingChangeType_SoldOut: 2,
          HoldingChangeType_Increase: 3,
          HoldingChangeType_Decrease: 4
        }
      },
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_HoldingValue: 1,
          SortField_HoldingPct: 2,
          SortField_LastHoldingPct: 3,
          SortField_ChangeShares: 4,
          SortField_ChangePct: 5,
          SortField_PortfolioPct: 6,
          SortField_Industry: 7,
          SortField_HoldingDate: 8
        }
      },
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          institutionId: {
            rule: "required",
            type: "int32",
            id: 2
          },
          changeType: {
            type: "int32",
            id: 3
          },
          sortField: {
            type: "int32",
            id: 4
          },
          sortDir: {
            type: "int32",
            id: 5
          },
          count: {
            type: "int32",
            id: 6
          },
          page: {
            type: "string",
            id: 7
          },
          keyword: {
            type: "string",
            id: 8
          }
        }
      },
      HoldingListItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          industryName: {
            type: "string",
            id: 3
          },
          holdingValue: {
            type: "double",
            id: 4
          },
          holdingPct: {
            type: "double",
            id: 5
          },
          lastHoldingPct: {
            type: "double",
            id: 6
          },
          changeShares: {
            type: "int64",
            id: 7
          },
          portfolioPct: {
            type: "double",
            id: 8
          },
          changePct: {
            type: "double",
            id: 9
          },
          holdingDate: {
            type: "string",
            id: 10
          },
          source: {
            type: "string",
            id: 11
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "HoldingListItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          },
          currency: {
            type: "string",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetInstitutionList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetinstitutionlist"
    },
    nested: {
      SortField: {
        values: {
          SortField_Unknown: 0,
          SortField_PositionValue: 1,
          SortField_PositionValueChange: 2,
          SortField_PositionCount: 3,
          SortField_PositionCountChange: 4
        }
      },
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortField: {
            type: "int32",
            id: 2
          },
          sortDir: {
            type: "int32",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          },
          page: {
            type: "string",
            id: 5
          },
          namePart: {
            type: "string",
            id: 6
          }
        }
      },
      InstitutionListItem: {
        fields: {
          institutionId: {
            rule: "required",
            type: "int32",
            id: 1
          },
          institutionName: {
            type: "string",
            id: 2
          },
          positionValue: {
            type: "double",
            id: 3
          },
          positionValueChange: {
            type: "double",
            id: 4
          },
          positionCount: {
            type: "int32",
            id: 5
          },
          positionCountChange: {
            type: "int32",
            id: 6
          },
          disclosureDate: {
            type: "string",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "InstitutionListItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          },
          currency: {
            type: "string",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetInstitutionProfile: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetinstitutionprofile"
    },
    nested: {
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          institutionId: {
            rule: "required",
            type: "int32",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          institutionName: {
            type: "string",
            id: 1
          },
          description: {
            type: "string",
            id: 2
          },
          positionValue: {
            type: "double",
            id: 3
          },
          lastPositionValue: {
            type: "double",
            id: 4
          },
          positionValueChangePct: {
            type: "double",
            id: 5
          },
          totalHoldingCount: {
            type: "int64",
            id: 6
          },
          holdingChangeCount: {
            type: "int64",
            id: 7
          },
          newCount: {
            type: "int32",
            id: 8
          },
          soldOutCount: {
            type: "int32",
            id: 9
          },
          increaseCount: {
            type: "int32",
            id: 10
          },
          decreaseCount: {
            type: "int32",
            id: 11
          },
          top10Pct: {
            type: "double",
            id: 12
          },
          top10PctChange: {
            type: "double",
            id: 13
          },
          disclosureDate: {
            type: "string",
            id: 14
          },
          currency: {
            type: "string",
            id: 15
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetIpoList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetipolist"
    },
    nested: {
      BasicIpoData: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            rule: "required",
            type: "string",
            id: 2
          },
          listTime: {
            type: "string",
            id: 3
          },
          listTimestamp: {
            type: "double",
            id: 4
          }
        }
      },
      CNIpoExData: {
        fields: {
          applyCode: {
            rule: "required",
            type: "string",
            id: 1
          },
          issueSize: {
            rule: "required",
            type: "int64",
            id: 2
          },
          onlineIssueSize: {
            rule: "required",
            type: "int64",
            id: 3
          },
          applyUpperLimit: {
            rule: "required",
            type: "int64",
            id: 4
          },
          applyLimitMarketValue: {
            rule: "required",
            type: "int64",
            id: 5
          },
          isEstimateIpoPrice: {
            rule: "required",
            type: "bool",
            id: 6
          },
          ipoPrice: {
            rule: "required",
            type: "double",
            id: 7
          },
          industryPeRate: {
            rule: "required",
            type: "double",
            id: 8
          },
          isEstimateWinningRatio: {
            rule: "required",
            type: "bool",
            id: 9
          },
          winningRatio: {
            rule: "required",
            type: "double",
            id: 10
          },
          issuePeRate: {
            rule: "required",
            type: "double",
            id: 11
          },
          applyTime: {
            type: "string",
            id: 12
          },
          applyTimestamp: {
            type: "double",
            id: 13
          },
          winningTime: {
            type: "string",
            id: 14
          },
          winningTimestamp: {
            type: "double",
            id: 15
          },
          isHasWon: {
            rule: "required",
            type: "bool",
            id: 16
          },
          winningNumData: {
            rule: "repeated",
            type: "WinningNumData",
            id: 17
          }
        }
      },
      WinningNumData: {
        fields: {
          winningName: {
            rule: "required",
            type: "string",
            id: 1
          },
          winningInfo: {
            rule: "required",
            type: "string",
            id: 2
          }
        }
      },
      HKIpoExData: {
        fields: {
          ipoPriceMin: {
            rule: "required",
            type: "double",
            id: 1
          },
          ipoPriceMax: {
            rule: "required",
            type: "double",
            id: 2
          },
          listPrice: {
            rule: "required",
            type: "double",
            id: 3
          },
          lotSize: {
            rule: "required",
            type: "int32",
            id: 4
          },
          entrancePrice: {
            rule: "required",
            type: "double",
            id: 5
          },
          isSubscribeStatus: {
            rule: "required",
            type: "bool",
            id: 6
          },
          applyEndTime: {
            type: "string",
            id: 7
          },
          applyEndTimestamp: {
            type: "double",
            id: 8
          }
        }
      },
      USIpoExData: {
        fields: {
          ipoPriceMin: {
            rule: "required",
            type: "double",
            id: 1
          },
          ipoPriceMax: {
            rule: "required",
            type: "double",
            id: 2
          },
          issueSize: {
            rule: "required",
            type: "int64",
            id: 3
          }
        }
      },
      SGIpoExData: {
        fields: {
          ipoPriceMin: {
            rule: "required",
            type: "double",
            id: 1
          },
          ipoPriceMax: {
            rule: "required",
            type: "double",
            id: 2
          },
          issueSize: {
            rule: "required",
            type: "int64",
            id: 3
          },
          applyStartTime: {
            type: "string",
            id: 4
          },
          applyStartTimestamp: {
            type: "double",
            id: 5
          },
          applyEndTime: {
            type: "string",
            id: 6
          },
          applyEndTimestamp: {
            type: "double",
            id: 7
          },
          winningTime: {
            type: "string",
            id: 8
          },
          winningTimestamp: {
            type: "double",
            id: 9
          }
        }
      },
      MYIpoExData: {
        fields: {
          offerPrice: {
            rule: "required",
            type: "double",
            id: 1
          },
          issueSize: {
            rule: "required",
            type: "int64",
            id: 2
          },
          applyStartTime: {
            type: "string",
            id: 3
          },
          applyStartTimestamp: {
            type: "double",
            id: 4
          },
          applyEndTime: {
            type: "string",
            id: 5
          },
          applyEndTimestamp: {
            type: "double",
            id: 6
          },
          winningTime: {
            type: "string",
            id: 7
          },
          winningTimestamp: {
            type: "double",
            id: 8
          }
        }
      },
      JPETFBriefInfo: {
        fields: {
          managementFeeRates: {
            type: "int64",
            id: 1
          },
          dividendTimes: {
            type: "int64",
            id: 2
          },
          dividendFrequencyType: {
            type: "int32",
            id: 3
          },
          investingRiskType: {
            type: "int32",
            id: 4
          },
          indexName: {
            type: "string",
            id: 5
          },
          companyName: {
            type: "string",
            id: 6
          },
          companyIntroductionLink: {
            type: "string",
            id: 7
          },
          companyInterviewLink: {
            type: "string",
            id: 8
          },
          etfPamphletLink: {
            type: "string",
            id: 9
          },
          etfIntroductionLink: {
            type: "string",
            id: 10
          }
        }
      },
      JPIpoExData: {
        fields: {
          ipoPriceMin: {
            rule: "required",
            type: "double",
            id: 1
          },
          ipoPriceMax: {
            rule: "required",
            type: "double",
            id: 2
          },
          issueSize: {
            rule: "required",
            type: "int64",
            id: 3
          },
          lotSize: {
            type: "int32",
            id: 10
          },
          eqtyIssuedShares: {
            type: "int64",
            id: 11
          },
          isin: {
            type: "string",
            id: 12
          },
          issuedShares: {
            type: "int64",
            id: 13
          },
          industry: {
            type: "string",
            id: 14
          },
          marketSegment: {
            type: "string",
            id: 15
          },
          approvalTime: {
            type: "string",
            id: 20
          },
          approvalTimestamp: {
            type: "double",
            id: 21
          },
          issueConfirmTime: {
            type: "string",
            id: 22
          },
          issueConfirmTimestamp: {
            type: "double",
            id: 23
          },
          priceConfirmStartTime: {
            type: "string",
            id: 24
          },
          priceConfirmStartTimestamp: {
            type: "double",
            id: 25
          },
          priceConfirmEndTime: {
            type: "string",
            id: 26
          },
          priceConfirmEndTimestamp: {
            type: "double",
            id: 27
          },
          inquiryStartTime: {
            type: "string",
            id: 28
          },
          inquiryStartTimestamp: {
            type: "double",
            id: 29
          },
          inquiryEndTime: {
            type: "string",
            id: 30
          },
          inquiryEndTimestamp: {
            type: "double",
            id: 31
          },
          applyStartTime: {
            type: "string",
            id: 32
          },
          applyStartTimestamp: {
            type: "double",
            id: 33
          },
          applyEndTime: {
            type: "string",
            id: 34
          },
          applyEndTimestamp: {
            type: "double",
            id: 35
          },
          drawTime: {
            type: "string",
            id: 36
          },
          drawTimestamp: {
            type: "double",
            id: 37
          },
          winningTime: {
            type: "string",
            id: 38
          },
          winningTimestamp: {
            type: "double",
            id: 39
          },
          etfInfo: {
            type: "JPETFBriefInfo",
            id: 50
          }
        }
      },
      IpoData: {
        fields: {
          basic: {
            rule: "required",
            type: "BasicIpoData",
            id: 1
          },
          cnExData: {
            type: "CNIpoExData",
            id: 2
          },
          hkExData: {
            type: "HKIpoExData",
            id: 3
          },
          usExData: {
            type: "USIpoExData",
            id: 4
          },
          sgExData: {
            type: "SGIpoExData",
            id: 5
          },
          myExData: {
            type: "MYIpoExData",
            id: 6
          },
          jpExData: {
            type: "JPIpoExData",
            id: 7
          }
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          ipoList: {
            rule: "repeated",
            type: "IpoData",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetKL: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetkl"
    },
    nested: {
      C2S: {
        fields: {
          rehabType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          klType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 3
          },
          reqNum: {
            rule: "required",
            type: "int32",
            id: 4
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 3
          },
          klList: {
            rule: "repeated",
            type: "Qot_Common.KLine",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetMacroIndicatorHistory: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetmacroindicatorhistory"
    },
    nested: {
      MacroDataUnitType: {
        values: {
          MacroDataUnitType_Unknown: 0,
          MacroDataUnitType_Percent: 1,
          MacroDataUnitType_Value: 2,
          MacroDataUnitType_Index: 3
        }
      },
      MacroDataPoint: {
        fields: {
          dataTime: {
            type: "string",
            id: 1
          },
          releaseTime: {
            type: "string",
            id: 2
          },
          value: {
            type: "double",
            id: 3
          },
          predictValue: {
            type: "double",
            id: 4
          },
          previousValue: {
            type: "double",
            id: 5
          },
          unitType: {
            type: "int32",
            id: 6
          }
        }
      },
      C2S: {
        fields: {
          indicatorId: {
            rule: "required",
            type: "uint64",
            id: 1
          },
          time: {
            type: "string",
            id: 2
          },
          maxCount: {
            type: "int32",
            id: 3
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          indicatorId: {
            type: "uint64",
            id: 1
          },
          dataList: {
            rule: "repeated",
            type: "MacroDataPoint",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetMacroIndicatorList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetmacroindicatorlist"
    },
    nested: {
      MacroRegion: {
        values: {
          MacroRegion_Unknown: 0,
          MacroRegion_HK: 1,
          MacroRegion_US: 2,
          MacroRegion_JP: 3,
          MacroRegion_SG: 4,
          MacroRegion_AU: 5,
          MacroRegion_CA: 6,
          MacroRegion_MY: 7,
          MacroRegion_CN: 8
        }
      },
      MacroIndicatorInfo: {
        fields: {
          indicatorId: {
            rule: "required",
            type: "uint64",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          }
        }
      },
      MacroIndicatorCategory: {
        fields: {
          categoryName: {
            rule: "required",
            type: "string",
            id: 1
          },
          indicatorList: {
            rule: "repeated",
            type: "MacroIndicatorInfo",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          region: {
            rule: "required",
            type: "int32",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          indicatorList: {
            rule: "repeated",
            type: "MacroIndicatorCategory",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetMarketState: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetmarketstate"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      MarketInfo: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            rule: "required",
            type: "string",
            id: 2
          },
          marketState: {
            rule: "required",
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          marketInfoList: {
            rule: "repeated",
            type: "MarketInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionChain: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetoptionchain"
    },
    nested: {
      OptionCondType: {
        values: {
          OptionCondType_Unknow: 0,
          OptionCondType_WithIn: 1,
          OptionCondType_Outside: 2
        }
      },
      DataFilter: {
        fields: {
          impliedVolatilityMin: {
            type: "double",
            id: 1
          },
          impliedVolatilityMax: {
            type: "double",
            id: 2
          },
          deltaMin: {
            type: "double",
            id: 3
          },
          deltaMax: {
            type: "double",
            id: 4
          },
          gammaMin: {
            type: "double",
            id: 5
          },
          gammaMax: {
            type: "double",
            id: 6
          },
          vegaMin: {
            type: "double",
            id: 7
          },
          vegaMax: {
            type: "double",
            id: 8
          },
          thetaMin: {
            type: "double",
            id: 9
          },
          thetaMax: {
            type: "double",
            id: 10
          },
          rhoMin: {
            type: "double",
            id: 11
          },
          rhoMax: {
            type: "double",
            id: 12
          },
          netOpenInterestMin: {
            type: "double",
            id: 13
          },
          netOpenInterestMax: {
            type: "double",
            id: 14
          },
          openInterestMin: {
            type: "double",
            id: 15
          },
          openInterestMax: {
            type: "double",
            id: 16
          },
          volMin: {
            type: "double",
            id: 17
          },
          volMax: {
            type: "double",
            id: 18
          }
        }
      },
      C2S: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          indexOptionType: {
            type: "int32",
            id: 6
          },
          type: {
            type: "int32",
            id: 2
          },
          condition: {
            type: "int32",
            id: 3
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 5
          },
          dataFilter: {
            type: "DataFilter",
            id: 7
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      OptionItem: {
        fields: {
          call: {
            type: "Qot_Common.SecurityStaticInfo",
            id: 1
          },
          put: {
            type: "Qot_Common.SecurityStaticInfo",
            id: 2
          }
        }
      },
      OptionChain: {
        fields: {
          strikeTime: {
            rule: "required",
            type: "string",
            id: 1
          },
          option: {
            rule: "repeated",
            type: "OptionItem",
            id: 2
          },
          strikeTimestamp: {
            type: "double",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          optionChain: {
            rule: "repeated",
            type: "OptionChain",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionEarningsScreener: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      EarningsItem: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          price: {
            type: "double",
            id: 3
          },
          changeRate: {
            type: "double",
            id: 4
          },
          marketCap: {
            type: "double",
            id: 5
          },
          iv: {
            type: "double",
            id: 6
          },
          ivRank: {
            type: "double",
            id: 7
          },
          ivPercentile: {
            type: "double",
            id: 8
          },
          hv: {
            type: "double",
            id: 9
          },
          volume: {
            type: "int64",
            id: 10
          },
          openInterest: {
            type: "int64",
            id: 11
          },
          earningsTimestamp: {
            type: "double",
            id: 12
          },
          earningsTime: {
            type: "string",
            id: 13
          },
          earningsPubType: {
            type: "int32",
            id: 14
          },
          earningsQuarter: {
            type: "string",
            id: 15
          },
          lastReportIvCrush: {
            type: "double",
            id: 16
          },
          historyReportIvCrush: {
            type: "double",
            id: 17
          },
          lastReportChgRate: {
            type: "double",
            id: 18
          },
          historyReportChgRate: {
            type: "double",
            id: 19
          },
          estimateEpsYoy: {
            type: "double",
            id: 20
          },
          estimateRevenueYoy: {
            type: "double",
            id: 21
          },
          expectedMoveRatio: {
            type: "double",
            id: 22
          }
        }
      },
      C2S: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortType: {
            type: "int32",
            id: 2
          },
          isAsc: {
            type: "bool",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          },
          page: {
            type: "string",
            id: 5
          },
          filterList: {
            rule: "repeated",
            type: "Qot_OptionCommon.EarningsIndicator",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "EarningsItem",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          },
          updateTimestamp: {
            type: "double",
            id: 3
          },
          allCount: {
            type: "int32",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionEvent: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      EventIndicatorType: {
        values: {
          EventIndicatorType_Unknown: 0,
          EventIndicatorType_OwnerList: 101,
          EventIndicatorType_IndustryPlate: 102,
          EventIndicatorType_ConceptPlate: 103,
          EventIndicatorType_CorporateAction: 104,
          EventIndicatorType_MarketCap: 105,
          EventIndicatorType_OptionType: 201,
          EventIndicatorType_MoneyType: 202,
          EventIndicatorType_StrikePrice: 203,
          EventIndicatorType_ExpiryDays: 204,
          EventIndicatorType_OTM: 205,
          EventIndicatorType_TickerType: 301,
          EventIndicatorType_Volume: 302,
          EventIndicatorType_Turnover: 303,
          EventIndicatorType_Price: 304,
          EventIndicatorType_Time: 305,
          EventIndicatorType_MaxDayNum: 306,
          EventIndicatorType_OrderType: 401,
          EventIndicatorType_Strategy: 402,
          EventIndicatorType_Sentiment: 403,
          EventIndicatorType_TotalVolume: 501,
          EventIndicatorType_TotalOI: 502,
          EventIndicatorType_VoRatio: 503,
          EventIndicatorType_IV: 504,
          EventIndicatorType_Delta: 601,
          EventIndicatorType_Gamma: 602,
          EventIndicatorType_Vega: 603,
          EventIndicatorType_Theta: 604,
          EventIndicatorType_Rho: 605
        }
      },
      TickerType: {
        values: {
          TickerType_Unknown: 0,
          TickerType_Buy: 1,
          TickerType_Sell: 2,
          TickerType_Neutral: 3
        }
      },
      OptionOrderType: {
        values: {
          OptionOrderType_Normal: 0,
          OptionOrderType_Sweep: 1,
          OptionOrderType_Cross: 2,
          OptionOrderType_Floor: 4
        }
      },
      TickerStrategy: {
        values: {
          TickerStrategy_Unknown: 0,
          TickerStrategy_SingleLeg: 1,
          TickerStrategy_MultiLeg: 2
        }
      },
      MarketSentiment: {
        values: {
          MarketSentiment_Unknown: 0,
          MarketSentiment_Bearish: 1,
          MarketSentiment_Bullish: 2,
          MarketSentiment_Neutral: 3
        }
      },
      CorporateActionType: {
        values: {
          CorporateActionType_None: 0,
          CorporateActionType_Split: 1,
          CorporateActionType_Join: 2,
          CorporateActionType_BonusStock: 3,
          CorporateActionType_IntoShares: 4,
          CorporateActionType_Allot: 5,
          CorporateActionType_Add: 6,
          CorporateActionType_Dividend: 7,
          CorporateActionType_SpecialDividend: 8,
          CorporateActionType_SpinOff: 9
        }
      },
      InTheMoneyType: {
        values: {
          InTheMoneyType_Unknown: 0,
          InTheMoneyType_In: 1,
          InTheMoneyType_Out: 2
        }
      },
      EventIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.IndicatorValue",
            id: 2
          }
        }
      },
      EventSort: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          isAsc: {
            rule: "required",
            type: "bool",
            id: 2
          }
        }
      },
      CorporateAction: {
        fields: {
          actionType: {
            type: "int32",
            id: 1
          },
          actionTime: {
            type: "string",
            id: 2
          },
          actionTimestamp: {
            type: "double",
            id: 3
          }
        }
      },
      EventItem: {
        fields: {
          option: {
            type: "Qot_Common.Security",
            id: 1
          },
          owner: {
            type: "Qot_Common.Security",
            id: 2
          },
          symbol: {
            type: "string",
            id: 3
          },
          fillTime: {
            type: "string",
            id: 10
          },
          fillTimestamp: {
            type: "double",
            id: 11
          },
          tickerType: {
            type: "int32",
            id: 12
          },
          price: {
            type: "double",
            id: 13
          },
          volume: {
            type: "int64",
            id: 14
          },
          turnover: {
            type: "double",
            id: 15
          },
          optionType: {
            type: "int32",
            id: 20
          },
          strikePrice: {
            type: "double",
            id: 21
          },
          strikeTime: {
            type: "string",
            id: 22
          },
          strikeTimestamp: {
            type: "double",
            id: 23
          },
          dte: {
            type: "int32",
            id: 24
          },
          underlyingPrice: {
            type: "double",
            id: 30
          },
          otm: {
            type: "double",
            id: 31
          },
          bidPrice: {
            type: "double",
            id: 32
          },
          askPrice: {
            type: "double",
            id: 33
          },
          iv: {
            type: "double",
            id: 34
          },
          totalVolume: {
            type: "int64",
            id: 35
          },
          totalOpenInterest: {
            type: "int64",
            id: 36
          },
          voRatio: {
            type: "double",
            id: 37
          },
          delta: {
            type: "double",
            id: 40
          },
          gamma: {
            type: "double",
            id: 41
          },
          vega: {
            type: "double",
            id: 42
          },
          theta: {
            type: "double",
            id: 43
          },
          rho: {
            type: "double",
            id: 44
          },
          sentiment: {
            type: "int32",
            id: 50
          },
          orderTypeList: {
            rule: "repeated",
            type: "int32",
            id: 51,
            options: {
              packed: false
            }
          },
          strategyType: {
            type: "int32",
            id: 52
          },
          earningsTime: {
            type: "string",
            id: 60
          },
          earningsPubType: {
            type: "int32",
            id: 61
          },
          corporateActionList: {
            rule: "repeated",
            type: "CorporateAction",
            id: 63
          },
          industryPlateList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 64
          },
          conceptPlateList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 65
          }
        }
      },
      C2S: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          count: {
            type: "int32",
            id: 2
          },
          page: {
            type: "string",
            id: 3
          },
          filterList: {
            rule: "repeated",
            type: "EventIndicator",
            id: 4
          },
          sort: {
            type: "EventSort",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          eventList: {
            rule: "repeated",
            type: "EventItem",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          },
          allCount: {
            type: "int32",
            id: 3
          },
          updateTimestamp: {
            type: "double",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionEventAlert: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      EventAlertItem: {
        fields: {
          key: {
            type: "int64",
            id: 1
          },
          enable: {
            type: "bool",
            id: 2
          },
          optionMarket: {
            type: "int32",
            id: 10
          },
          watchlistGroupName: {
            type: "string",
            id: 11
          },
          underlying: {
            type: "Qot_Common.Security",
            id: 12
          },
          optionType: {
            type: "int32",
            id: 20
          },
          sideTypeList: {
            rule: "repeated",
            type: "int32",
            id: 21,
            options: {
              packed: false
            }
          },
          orderTypeList: {
            rule: "repeated",
            type: "int32",
            id: 22,
            options: {
              packed: false
            }
          },
          marketCapRange: {
            type: "Qot_OptionCommon.Interval",
            id: 30
          },
          expiryDaysRange: {
            type: "Qot_OptionCommon.Interval",
            id: 31
          },
          priceRange: {
            type: "Qot_OptionCommon.Interval",
            id: 32
          },
          sizeRange: {
            type: "Qot_OptionCommon.Interval",
            id: 33
          },
          premiumRange: {
            type: "Qot_OptionCommon.Interval",
            id: 34
          },
          ivRange: {
            type: "Qot_OptionCommon.Interval",
            id: 35
          },
          earningsDateBegin: {
            type: "string",
            id: 41
          },
          earningsDateEnd: {
            type: "string",
            id: 42
          },
          note: {
            type: "string",
            id: 50
          }
        }
      },
      C2S: {
        fields: {
          count: {
            type: "int32",
            id: 1
          },
          page: {
            type: "string",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          alertList: {
            rule: "repeated",
            type: "EventAlertItem",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          },
          allCount: {
            type: "int32",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionExerciseProbability: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetoptionexerciseprobability"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      StrikeProbabilityItem: {
        fields: {
          timestamp: {
            type: "int64",
            id: 1
          },
          timestampStr: {
            type: "string",
            id: 2
          },
          securityPrice: {
            type: "double",
            id: 3
          },
          strikeProbability: {
            type: "double",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "StrikeProbabilityItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionExpirationDate: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/getoptionexpirationdate"
    },
    nested: {
      C2S: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          indexOptionType: {
            type: "int32",
            id: 2
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      OptionExpirationDate: {
        fields: {
          strikeTime: {
            type: "string",
            id: 1
          },
          strikeTimestamp: {
            type: "double",
            id: 2
          },
          optionExpiryDateDistance: {
            rule: "required",
            type: "int32",
            id: 3
          },
          cycle: {
            type: "int32",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          dateList: {
            rule: "repeated",
            type: "OptionExpirationDate",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionMarketStatistic: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      StatisticItem: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          timestamp: {
            type: "double",
            id: 2
          },
          callValue: {
            rule: "required",
            type: "int64",
            id: 3
          },
          putValue: {
            rule: "required",
            type: "int64",
            id: 4
          },
          totalValue: {
            type: "int64",
            id: 5
          },
          ratio: {
            type: "double",
            id: 6
          }
        }
      },
      C2S: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          dataType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          nextPageKey: {
            type: "bytes",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          dataType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          statisticList: {
            rule: "repeated",
            type: "StatisticItem",
            id: 3
          },
          nextPageKey: {
            type: "bytes",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionQuote: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetoptionquote"
    },
    nested: {
      OptionQuote: {
        fields: {
          price: {
            type: "double",
            id: 1
          },
          chg: {
            type: "double",
            id: 2
          },
          chgRate: {
            type: "double",
            id: 3
          },
          vol: {
            type: "int64",
            id: 4
          },
          turnover: {
            type: "double",
            id: 5
          },
          high: {
            type: "double",
            id: 6
          },
          low: {
            type: "double",
            id: 7
          },
          mid: {
            type: "double",
            id: 8
          },
          open: {
            type: "double",
            id: 9
          },
          preClose: {
            type: "double",
            id: 10
          },
          openInterest: {
            type: "int32",
            id: 11
          },
          premium: {
            type: "double",
            id: 12
          },
          IV: {
            type: "double",
            id: 13
          },
          delta: {
            type: "double",
            id: 14
          },
          gamma: {
            type: "double",
            id: 15
          },
          vega: {
            type: "double",
            id: 16
          },
          theta: {
            type: "double",
            id: 17
          },
          rho: {
            type: "double",
            id: 18
          },
          optionType: {
            type: "int32",
            id: 19
          },
          expireTime: {
            type: "string",
            id: 20
          },
          strike: {
            type: "double",
            id: 21
          },
          contractSize: {
            type: "double",
            id: 22
          },
          contractMultiplier: {
            type: "double",
            id: 23
          },
          exerciseType: {
            type: "int32",
            id: 24
          },
          daysToExpiry: {
            type: "int32",
            id: 25
          },
          netOpenInterest: {
            type: "int32",
            id: 26
          },
          contractValue: {
            type: "double",
            id: 27
          },
          equalUnderlying: {
            type: "double",
            id: 28
          },
          indexOptionType: {
            type: "int32",
            id: 29
          },
          intrinsicValue: {
            type: "double",
            id: 30
          },
          timeValue: {
            type: "double",
            id: 31
          },
          breakevenPoint: {
            rule: "repeated",
            type: "double",
            id: 32,
            options: {
              packed: false
            }
          },
          distToBreakeven: {
            rule: "repeated",
            type: "double",
            id: 33,
            options: {
              packed: false
            }
          },
          probOfProfit: {
            type: "double",
            id: 34
          },
          sellerRoi: {
            type: "double",
            id: 35
          },
          markPrice: {
            type: "double",
            id: 36
          },
          leverageRatio: {
            type: "double",
            id: 37
          },
          effectiveGearing: {
            type: "double",
            id: 38
          }
        }
      },
      C2S: {
        fields: {
          multiLegs: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          optionQuoteList: {
            rule: "repeated",
            type: "OptionQuote",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionRank: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      OptionRankItem: {
        fields: {
          option: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          optionType: {
            type: "int32",
            id: 3
          },
          oiIncrement: {
            type: "int64",
            id: 4
          },
          oiDecrement: {
            type: "int64",
            id: 5
          },
          oiMarketCapIncrement: {
            type: "double",
            id: 6
          },
          oiMarketCapDecrement: {
            type: "double",
            id: 7
          },
          volume: {
            type: "int64",
            id: 8
          },
          turnover: {
            type: "double",
            id: 9
          },
          openInterest: {
            type: "int64",
            id: 10
          },
          openInterestMarketCap: {
            type: "double",
            id: 11
          },
          iv: {
            type: "double",
            id: 12
          },
          optionPrice: {
            type: "double",
            id: 13
          },
          changeRate: {
            type: "double",
            id: 14
          },
          midPrice: {
            type: "double",
            id: 15
          },
          bidPrice: {
            type: "double",
            id: 16
          },
          bidVolume: {
            type: "int64",
            id: 17
          },
          askPrice: {
            type: "double",
            id: 18
          },
          askVolume: {
            type: "int64",
            id: 19
          },
          delta: {
            type: "double",
            id: 20
          },
          gamma: {
            type: "double",
            id: 21
          },
          theta: {
            type: "double",
            id: 22
          },
          vega: {
            type: "double",
            id: 23
          },
          rho: {
            type: "double",
            id: 24
          }
        }
      },
      C2S: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          tradingDate: {
            type: "string",
            id: 4
          },
          isAsc: {
            type: "bool",
            id: 5
          },
          page: {
            type: "string",
            id: 6
          },
          filterList: {
            rule: "repeated",
            type: "Qot_OptionCommon.OptionRankIndicator",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          tradingDate: {
            type: "string",
            id: 3
          },
          tradingTimestamp: {
            type: "double",
            id: 4
          },
          rankList: {
            rule: "repeated",
            type: "OptionRankItem",
            id: 5
          },
          nextPage: {
            type: "string",
            id: 6
          },
          allCount: {
            type: "int32",
            id: 7
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionSellerScreener: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      SellerItem: {
        fields: {
          option: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          optionType: {
            type: "int32",
            id: 3
          },
          strikePrice: {
            type: "double",
            id: 4
          },
          strikeTime: {
            type: "string",
            id: 5
          },
          strikeTimestamp: {
            type: "double",
            id: 6
          },
          leftDays: {
            type: "int32",
            id: 7
          },
          optionPrice: {
            type: "double",
            id: 8
          },
          stockPrice: {
            type: "double",
            id: 9
          },
          premium: {
            type: "double",
            id: 10
          },
          otmDegree: {
            type: "double",
            id: 11
          },
          iv: {
            type: "double",
            id: 12
          },
          intervalReturn: {
            type: "double",
            id: 13
          },
          annualizedReturn: {
            type: "double",
            id: 14
          },
          itmProbability: {
            type: "double",
            id: 15
          },
          strikedIntervalReturn: {
            type: "double",
            id: 16
          },
          strikedAnnualizedReturn: {
            type: "double",
            id: 17
          },
          owner: {
            type: "Qot_Common.Security",
            id: 18
          }
        }
      },
      C2S: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sellerType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          sortType: {
            type: "int32",
            id: 3
          },
          isAsc: {
            type: "bool",
            id: 4
          },
          filterList: {
            rule: "repeated",
            type: "Qot_OptionCommon.SellerIndicator",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "SellerItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionStrategy: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetoptionstrategy"
    },
    nested: {
      OptionStrategyItem: {
        fields: {
          code: {
            rule: "required",
            type: "string",
            id: 1
          },
          name: {
            rule: "required",
            type: "string",
            id: 2
          },
          optionStrategy: {
            rule: "required",
            type: "int32",
            id: 3
          },
          stockOwner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 4
          },
          multiLegs: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 5
          }
        }
      },
      C2S: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          optionStrategy: {
            rule: "required",
            type: "int32",
            id: 2
          },
          expireTime: {
            type: "string",
            id: 3
          },
          farExpireTime: {
            type: "string",
            id: 4
          },
          spread: {
            type: "double",
            id: 5
          },
          optionType: {
            type: "int32",
            id: 6
          },
          strikePrice: {
            type: "double",
            id: 7
          },
          indexOptionType: {
            type: "int32",
            id: 8
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          strategyList: {
            rule: "repeated",
            type: "OptionStrategyItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionStrategyAnalysis: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetoptionstrategyanalysis"
    },
    nested: {
      C2S: {
        fields: {
          multiLegs: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          code: {
            rule: "required",
            type: "string",
            id: 1
          },
          name: {
            rule: "required",
            type: "string",
            id: 2
          },
          optionStrategy: {
            rule: "required",
            type: "int32",
            id: 3
          },
          bid1: {
            type: "double",
            id: 4
          },
          ask1: {
            type: "double",
            id: 5
          },
          maxProfit: {
            type: "double",
            id: 6
          },
          maxLoss: {
            type: "double",
            id: 7
          },
          breakevenPoints: {
            rule: "repeated",
            type: "double",
            id: 8,
            options: {
              packed: false
            }
          },
          probOfProfit: {
            type: "double",
            id: 9
          },
          delta: {
            type: "double",
            id: 10
          },
          theta: {
            type: "double",
            id: 11
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionStrategySpread: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetoptionstrategyspreads"
    },
    nested: {
      C2S: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          optionStrategy: {
            rule: "required",
            type: "int32",
            id: 2
          },
          expireTime: {
            type: "string",
            id: 3
          },
          farExpireTime: {
            type: "string",
            id: 4
          },
          indexOptionType: {
            type: "int32",
            id: 5
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          spreadList: {
            rule: "repeated",
            type: "double",
            id: 1,
            options: {
              packed: false
            }
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionUnderlyingHisStatistic: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      DailyStatistic: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          timestamp: {
            type: "double",
            id: 2
          },
          optionVolume: {
            type: "int64",
            id: 3
          },
          callVolume: {
            rule: "required",
            type: "int64",
            id: 4
          },
          putVolume: {
            rule: "required",
            type: "int64",
            id: 5
          },
          putCallVolumeRatio: {
            type: "double",
            id: 6
          },
          optionOpenInterest: {
            type: "int64",
            id: 7
          },
          callOpenInterest: {
            rule: "required",
            type: "int64",
            id: 8
          },
          putOpenInterest: {
            rule: "required",
            type: "int64",
            id: 9
          },
          putCallOpenInterestRatio: {
            type: "double",
            id: 10
          },
          underlyingPrice: {
            type: "double",
            id: 11
          }
        }
      },
      C2S: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          indexOptionType: {
            type: "int32",
            id: 2
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          nextPageKey: {
            type: "bytes",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          code: {
            type: "string",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          statisticList: {
            rule: "repeated",
            type: "DailyStatistic",
            id: 4
          },
          nextPageKey: {
            type: "bytes",
            id: 5
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionUnderlyingHisVolatility: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      VolatilityItem: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          timestamp: {
            type: "double",
            id: 2
          },
          iv: {
            type: "double",
            id: 3
          },
          hv: {
            type: "double",
            id: 4
          },
          underlyingPrice: {
            type: "double",
            id: 5
          }
        }
      },
      C2S: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          indexOptionType: {
            type: "int32",
            id: 2
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          nextPageKey: {
            type: "bytes",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          code: {
            type: "string",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          volatilityList: {
            rule: "repeated",
            type: "VolatilityItem",
            id: 4
          },
          nextPageKey: {
            type: "bytes",
            id: 5
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionUnderlyingOverview: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      HVItem: {
        fields: {
          timeRange: {
            rule: "required",
            type: "int32",
            id: 1
          },
          hv: {
            rule: "required",
            type: "double",
            id: 2
          },
          hvPercentile: {
            type: "double",
            id: 3
          }
        }
      },
      UnderlyingData: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          code: {
            type: "string",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          callVolume: {
            type: "int64",
            id: 4
          },
          putVolume: {
            type: "int64",
            id: 5
          },
          callOpenInterest: {
            type: "int64",
            id: 6
          },
          putOpenInterest: {
            type: "int64",
            id: 7
          },
          iv: {
            type: "double",
            id: 8
          },
          ivRank: {
            type: "double",
            id: 9
          },
          ivPercentile: {
            type: "double",
            id: 10
          },
          hvList: {
            rule: "repeated",
            type: "HVItem",
            id: 11
          },
          preIV: {
            type: "double",
            id: 12
          }
        }
      },
      C2S: {
        fields: {
          ownerList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          indexOptionType: {
            type: "int32",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          underlyingDataList: {
            rule: "repeated",
            type: "UnderlyingData",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionUnderlyingRank: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      UnderlyingRankItem: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          totalVolume: {
            type: "int64",
            id: 3
          },
          totalOpenInterest: {
            type: "int64",
            id: 4
          },
          volumeRatio: {
            type: "double",
            id: 5
          },
          openInterestRatio: {
            type: "double",
            id: 6
          },
          iv: {
            type: "double",
            id: 7
          },
          ivRank: {
            type: "double",
            id: 8
          },
          ivPercentile: {
            type: "double",
            id: 9
          },
          price: {
            type: "double",
            id: 10
          },
          changeRate: {
            type: "double",
            id: 11
          },
          ivChange: {
            type: "double",
            id: 12
          },
          hv: {
            type: "double",
            id: 13
          },
          hvChange: {
            type: "double",
            id: 14
          },
          marketCap: {
            type: "double",
            id: 15
          }
        }
      },
      C2S: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          isAsc: {
            type: "bool",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          },
          tradingDate: {
            type: "string",
            id: 5
          },
          filterList: {
            rule: "repeated",
            type: "Qot_OptionCommon.UnderlyingRankIndicator",
            id: 6
          },
          page: {
            type: "string",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          tradingDate: {
            type: "string",
            id: 3
          },
          tradingTimestamp: {
            type: "double",
            id: 4
          },
          rankList: {
            rule: "repeated",
            type: "UnderlyingRankItem",
            id: 5
          },
          nextPage: {
            type: "string",
            id: 6
          },
          allCount: {
            type: "int32",
            id: 7
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionVolatility: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetoptionvolatility"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          queryTimePeriod: {
            type: "Qot_Common.OptionVolatilityTimePeriodType",
            id: 2
          },
          hvTimePeriod: {
            type: "int32",
            id: 3
          }
        }
      },
      VolatilityItem: {
        fields: {
          timestamp: {
            type: "int64",
            id: 1
          },
          timestampStr: {
            type: "string",
            id: 2
          },
          impliedVolatility: {
            type: "double",
            id: 3
          },
          historyVolatility: {
            type: "double",
            id: 4
          },
          volatilityPremium: {
            type: "double",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "VolatilityItem",
            id: 1
          },
          averageImpvol: {
            type: "double",
            id: 2
          },
          impvolStatus: {
            type: "Qot_Common.OptionImpvolStatusType",
            id: 3
          },
          analysis: {
            type: "string",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionZeroDteContract: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      ZeroDteContractItem: {
        fields: {
          option: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          optionType: {
            type: "int32",
            id: 3
          },
          optionPrice: {
            type: "double",
            id: 4
          },
          changeRate: {
            type: "double",
            id: 5
          },
          volume: {
            type: "int64",
            id: 6
          },
          openInterest: {
            type: "int64",
            id: 7
          },
          iv: {
            type: "double",
            id: 8
          },
          delta: {
            type: "double",
            id: 9
          },
          gamma: {
            type: "double",
            id: 10
          },
          vega: {
            type: "double",
            id: 11
          },
          theta: {
            type: "double",
            id: 12
          },
          rho: {
            type: "double",
            id: 13
          },
          buyBreakEvenPoint: {
            type: "double",
            id: 14
          },
          buyToBep: {
            type: "double",
            id: 15
          },
          buyProfitProbability: {
            type: "double",
            id: 16
          },
          sellProfitProbability: {
            type: "double",
            id: 17
          }
        }
      },
      C2S: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          strikeDateTimestamp: {
            rule: "required",
            type: "int64",
            id: 2
          },
          chainInfo: {
            rule: "required",
            type: "Qot_GetOptionZeroDteScreener.OptionChainInfo",
            id: 3
          },
          sortType: {
            type: "int32",
            id: 4
          },
          isAsc: {
            type: "bool",
            id: 5
          },
          filterList: {
            rule: "repeated",
            type: "Qot_OptionCommon.ZeroDteContractIndicator",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "ZeroDteContractItem",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOptionZeroDteScreener: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      OptionChainInfo: {
        fields: {
          strikeDateTimestamp: {
            type: "int64",
            id: 1
          },
          productCode: {
            type: "string",
            id: 2
          },
          multiplier: {
            type: "double",
            id: 3
          },
          contractShareSize: {
            type: "double",
            id: 4
          },
          expirationType: {
            type: "int32",
            id: 5
          },
          underlying: {
            type: "Qot_Common.Security",
            id: 6
          }
        }
      },
      ZeroDteScreenerItem: {
        fields: {
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          price: {
            type: "double",
            id: 3
          },
          changeRate: {
            type: "double",
            id: 4
          },
          marketCap: {
            type: "double",
            id: 5
          },
          iv: {
            type: "double",
            id: 6
          },
          ivRank: {
            type: "double",
            id: 7
          },
          ivPercentile: {
            type: "double",
            id: 8
          },
          hv: {
            type: "double",
            id: 9
          },
          volume: {
            type: "int64",
            id: 10
          },
          openInterest: {
            type: "int64",
            id: 11
          },
          lastTradingTime: {
            type: "int64",
            id: 12
          },
          earningsTimestamp: {
            type: "int64",
            id: 13
          },
          earningsTime: {
            type: "string",
            id: 14
          },
          earningsPubType: {
            type: "int32",
            id: 15
          },
          chainInfo: {
            type: "OptionChainInfo",
            id: 16
          }
        }
      },
      C2S: {
        fields: {
          optionMarket: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortType: {
            type: "int32",
            id: 2
          },
          isAsc: {
            type: "bool",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          },
          page: {
            type: "string",
            id: 5
          },
          filterList: {
            rule: "repeated",
            type: "Qot_OptionCommon.ZeroDteIndicator",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "ZeroDteScreenerItem",
            id: 1
          },
          nextPage: {
            type: "string",
            id: 2
          },
          updateTimestamp: {
            type: "double",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOrderBook: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetorderbook"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          num: {
            rule: "required",
            type: "int32",
            id: 2
          },
          orderBookType: {
            type: "int32",
            id: 4
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 8
          },
          orderBookAskList: {
            rule: "repeated",
            type: "Qot_Common.OrderBook",
            id: 2
          },
          orderBookBidList: {
            rule: "repeated",
            type: "Qot_Common.OrderBook",
            id: 3
          },
          svrRecvTimeBid: {
            type: "string",
            id: 4
          },
          svrRecvTimeBidTimestamp: {
            type: "double",
            id: 5
          },
          svrRecvTimeAsk: {
            type: "string",
            id: 6
          },
          svrRecvTimeAskTimestamp: {
            type: "double",
            id: 7
          },
          orderBookType: {
            type: "int32",
            id: 9
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetOwnerPlate: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetownerplate"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      SecurityOwnerPlate: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 3
          },
          plateInfoList: {
            rule: "repeated",
            type: "Qot_Common.PlateInfo",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          ownerPlateList: {
            rule: "repeated",
            type: "SecurityOwnerPlate",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetPeriodChangeRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetperiodchangerank"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      PeriodType: {
        values: {
          PeriodType_Unknown: 0,
          PeriodType_5Min: 1,
          PeriodType_1Day: 2,
          PeriodType_5Day: 3,
          PeriodType_20Day: 4,
          PeriodType_60Day: 5,
          PeriodType_120Day: 6,
          PeriodType_250Day: 7,
          PeriodType_YTD: 8
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_Price: 1,
          IndicatorType_MarketCap: 2,
          IndicatorType_ChangeRatio: 3,
          IndicatorType_Volume: 4,
          IndicatorType_Turnover: 5,
          IndicatorType_PE: 6,
          IndicatorType_PB: 7,
          IndicatorType_TurnoverRatio: 8,
          IndicatorType_VolumeRatio: 9,
          IndicatorType_Amplitude: 10
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          periodType: {
            type: "int32",
            id: 2
          },
          sortDir: {
            type: "int32",
            id: 3
          },
          offset: {
            type: "int32",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 6
          }
        }
      },
      PeriodChangeRankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          curPrice: {
            type: "double",
            id: 10
          },
          changeRatio: {
            type: "double",
            id: 11
          },
          turnover: {
            type: "double",
            id: 12
          },
          volume: {
            type: "int64",
            id: 13
          },
          marketCap: {
            type: "double",
            id: 14
          },
          changeRate5Min: {
            type: "double",
            id: 20
          },
          changeRate5D: {
            type: "double",
            id: 21
          },
          changeRate10D: {
            type: "double",
            id: 22
          },
          changeRate20D: {
            type: "double",
            id: 23
          },
          changeRate60D: {
            type: "double",
            id: 24
          },
          changeRate120D: {
            type: "double",
            id: 25
          },
          changeRate250D: {
            type: "double",
            id: 26
          },
          changeRateYTD: {
            type: "double",
            id: 27
          },
          peTTM: {
            type: "double",
            id: 30
          },
          pb: {
            type: "double",
            id: 31
          },
          turnoverRatio: {
            type: "double",
            id: 32
          },
          volumeRatio: {
            type: "double",
            id: 33
          },
          amplitude: {
            type: "double",
            id: 34
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "PeriodChangeRankItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetPlateSecurity: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetplatesecurity"
    },
    nested: {
      C2S: {
        fields: {
          plate: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          sortField: {
            type: "int32",
            id: 2
          },
          ascend: {
            type: "bool",
            id: 3
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          staticInfoList: {
            rule: "repeated",
            type: "Qot_Common.SecurityStaticInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetPlateSet: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetplateset"
    },
    nested: {
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          plateSetType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          plateInfoList: {
            rule: "repeated",
            type: "Qot_Common.PlateInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetPriceReminder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetpricereminder"
    },
    nested: {
      PriceReminderItem: {
        fields: {
          key: {
            rule: "required",
            type: "int64",
            id: 1
          },
          type: {
            rule: "required",
            type: "int32",
            id: 2
          },
          value: {
            rule: "required",
            type: "double",
            id: 3
          },
          note: {
            rule: "required",
            type: "string",
            id: 4
          },
          freq: {
            rule: "required",
            type: "int32",
            id: 5
          },
          isEnable: {
            rule: "required",
            type: "bool",
            id: 6
          },
          reminderSessionList: {
            rule: "repeated",
            type: "int32",
            id: 7,
            options: {
              packed: false
            }
          }
        }
      },
      PriceReminder: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 3
          },
          itemList: {
            rule: "repeated",
            type: "PriceReminderItem",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          market: {
            type: "int32",
            id: 2
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          priceReminderList: {
            rule: "repeated",
            type: "PriceReminder",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetRT: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetrt"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 3
          },
          rtList: {
            rule: "repeated",
            type: "Qot_Common.TimeShare",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetRatingChange: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetratingchange"
    },
    nested: {
      RatingChangeType: {
        values: {
          RatingChangeType_Upgrade: 1,
          RatingChangeType_Downgrade: 2,
          RatingChangeType_NewRating: 3
        }
      },
      RatingLevel: {
        values: {
          RatingLevel_Unknown: 0,
          RatingLevel_Sell: 1,
          RatingLevel_Hold: 2,
          RatingLevel_Buy: 3
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          changeType: {
            type: "int32",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          page: {
            type: "string",
            id: 4
          }
        }
      },
      RatingChangeItem: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          rating: {
            type: "int32",
            id: 3
          },
          lastRating: {
            type: "int32",
            id: 4
          },
          targetPrice: {
            type: "double",
            id: 5
          },
          lastTargetPrice: {
            type: "double",
            id: 6
          },
          changeType: {
            type: "int32",
            id: 7
          },
          institutionName: {
            type: "string",
            id: 8
          },
          recommendationDate: {
            type: "string",
            id: 9
          },
          lastRecommendationDate: {
            type: "string",
            id: 10
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "RatingChangeItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          },
          nextPage: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetReference: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetreference"
    },
    nested: {
      ReferenceType: {
        values: {
          ReferenceType_Unknow: 0,
          ReferenceType_Warrant: 1,
          ReferenceType_Future: 2
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          referenceType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          staticInfoList: {
            rule: "repeated",
            type: "Qot_Common.SecurityStaticInfo",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetResearchAnalystConsensus: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetresearchanalystconsensus"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          highest: {
            type: "double",
            id: 1
          },
          average: {
            type: "double",
            id: 2
          },
          lowest: {
            type: "double",
            id: 3
          },
          rating: {
            type: "Qot_Common.ResearchRatingType",
            id: 4
          },
          total: {
            type: "int32",
            id: 5
          },
          updateTime: {
            type: "int64",
            id: 6
          },
          updateTimeStr: {
            type: "string",
            id: 7
          },
          buy: {
            type: "double",
            id: 8
          },
          hold: {
            type: "double",
            id: 9
          },
          sell: {
            type: "double",
            id: 10
          },
          strongBuy: {
            type: "double",
            id: 11
          },
          underperform: {
            type: "double",
            id: 12
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetResearchMorningstarReport: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetresearchmorningstarrpt"
    },
    nested: {
      StringWithUpdateTime: {
        fields: {
          context: {
            type: "string",
            id: 1
          },
          updateTime: {
            type: "int64",
            id: 2
          },
          updateTimeStr: {
            type: "string",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          }
        }
      },
      S2C: {
        fields: {
          ratingType: {
            type: "Qot_Common.MorningstarRatingType",
            id: 1
          },
          starRating: {
            type: "int32",
            id: 2
          },
          starUpdateTime: {
            type: "int64",
            id: 3
          },
          starUpdateTimeStr: {
            type: "string",
            id: 4
          },
          fairValue: {
            type: "double",
            id: 5
          },
          fairValueContent: {
            type: "StringWithUpdateTime",
            id: 6
          },
          economicMoatLabel: {
            type: "string",
            id: 7
          },
          economicMoatContent: {
            type: "StringWithUpdateTime",
            id: 8
          },
          uncertaintyLabel: {
            type: "string",
            id: 9
          },
          uncertaintyContent: {
            type: "StringWithUpdateTime",
            id: 10
          },
          financialHealthLabel: {
            type: "string",
            id: 11
          },
          financialHealthContent: {
            type: "StringWithUpdateTime",
            id: 12
          },
          analystReportByLine: {
            rule: "repeated",
            type: "string",
            id: 13
          },
          analystReportUpdateTime: {
            type: "int64",
            id: 14
          },
          analystReportUpdateTimeStr: {
            type: "string",
            id: 15
          },
          bullSay: {
            rule: "repeated",
            type: "StringWithUpdateTime",
            id: 16
          },
          bearSay: {
            rule: "repeated",
            type: "StringWithUpdateTime",
            id: 17
          },
          capitalAllocationLabel: {
            type: "string",
            id: 18
          },
          capitalAllocationContent: {
            type: "StringWithUpdateTime",
            id: 19
          },
          analystNoteTitle: {
            type: "StringWithUpdateTime",
            id: 20
          },
          analystNoteContent: {
            type: "StringWithUpdateTime",
            id: 21
          },
          investmentThesisContent: {
            type: "StringWithUpdateTime",
            id: 22
          },
          fundamentalsContent: {
            type: "StringWithUpdateTime",
            id: 23
          },
          valuationContent: {
            type: "StringWithUpdateTime",
            id: 24
          },
          pdfUrl: {
            type: "string",
            id: 25
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetResearchRatingSummary: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetresearchratingsummary"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          ratingDimensionType: {
            type: "Qot_Common.ResearchRatingDimensionType",
            id: 2
          },
          uid: {
            type: "string",
            id: 3
          },
          nextKey: {
            type: "string",
            id: 4
          },
          num: {
            type: "int32",
            id: 5
          }
        }
      },
      InstInfo: {
        fields: {
          institutionUid: {
            type: "string",
            id: 1
          },
          institutionPictureUrl: {
            type: "string",
            id: 2
          },
          institutionName: {
            type: "string",
            id: 3
          },
          updateTime: {
            type: "int64",
            id: 4
          },
          updateTimeStr: {
            type: "string",
            id: 5
          },
          institutionSourceName: {
            type: "string",
            id: 6
          },
          institutionEnName: {
            type: "string",
            id: 7
          }
        }
      },
      AnalystInfo: {
        fields: {
          analystUid: {
            type: "string",
            id: 1
          },
          analystName: {
            type: "string",
            id: 2
          },
          analystPictureUrl: {
            type: "string",
            id: 3
          },
          numOfStars: {
            type: "double",
            id: 4
          },
          successRate: {
            type: "double",
            id: 5
          },
          excessReturn: {
            type: "double",
            id: 6
          },
          stockSuccessRate: {
            type: "double",
            id: 7
          },
          stockAvgReturn: {
            type: "double",
            id: 8
          },
          institutionInfo: {
            type: "InstInfo",
            id: 9
          },
          updateTime: {
            type: "int64",
            id: 10
          },
          updateTimeStr: {
            type: "string",
            id: 11
          }
        }
      },
      RatingItem: {
        fields: {
          analystUid: {
            type: "string",
            id: 1
          },
          institutionUid: {
            type: "string",
            id: 2
          },
          rating: {
            type: "Qot_Common.ResearchRatingType",
            id: 3
          },
          targetPrice: {
            type: "double",
            id: 4
          },
          recommendationDate: {
            type: "int64",
            id: 5
          },
          recommendationDateStr: {
            type: "string",
            id: 6
          },
          ratingUrl: {
            type: "string",
            id: 7
          },
          updateTime: {
            type: "int64",
            id: 8
          },
          updateTimeStr: {
            type: "string",
            id: 9
          }
        }
      },
      InstRatingSummaryItem: {
        fields: {
          institutionInfo: {
            type: "InstInfo",
            id: 1
          },
          ratingItemList: {
            rule: "repeated",
            type: "RatingItem",
            id: 2
          }
        }
      },
      AnalystRatingSummaryItem: {
        fields: {
          analystInfo: {
            type: "AnalystInfo",
            id: 1
          },
          ratingItemList: {
            rule: "repeated",
            type: "RatingItem",
            id: 2
          }
        }
      },
      InstRatingDetail: {
        fields: {
          institutionInfo: {
            type: "InstInfo",
            id: 1
          },
          analystInfoList: {
            rule: "repeated",
            type: "AnalystInfo",
            id: 2
          },
          ratingItemList: {
            rule: "repeated",
            type: "RatingItem",
            id: 3
          }
        }
      },
      AnalystRatingDetail: {
        fields: {
          analystInfo: {
            type: "AnalystInfo",
            id: 1
          },
          ratingItemList: {
            rule: "repeated",
            type: "RatingItem",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          instRatingSummaryList: {
            rule: "repeated",
            type: "InstRatingSummaryItem",
            id: 1
          },
          analystRatingSummaryList: {
            rule: "repeated",
            type: "AnalystRatingSummaryItem",
            id: 2
          },
          instRatingDetail: {
            type: "InstRatingDetail",
            id: 3
          },
          analystRatingDetail: {
            type: "AnalystRatingDetail",
            id: 4
          },
          nextKey: {
            type: "string",
            id: 5
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetRiseFallDistribution: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetrisefalldistr"
    },
    nested: {
      DistributionType: {
        values: {
          DistributionType_Unknown: 0,
          DistributionType_RiseLimit: 1,
          DistributionType_PositiveInfinity: 2,
          DistributionType_NormalRange: 3,
          DistributionType_NegativeInfinity: 4,
          DistributionType_FallLimit: 5
        }
      },
      C2S: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          market: {
            type: "int32",
            id: 2
          }
        }
      },
      RiseFallRange: {
        fields: {
          type: {
            type: "int32",
            id: 1
          },
          leftBorder: {
            type: "int32",
            id: 2
          },
          rightBorder: {
            type: "int32",
            id: 3
          },
          stockCount: {
            type: "int32",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          plate: {
            type: "Qot_Common.Security",
            id: 1
          },
          rangeList: {
            rule: "repeated",
            type: "RiseFallRange",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetSearchNews: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetsearchnews"
    },
    nested: {
      NewsSubType: {
        values: {
          NewsSubType_ALL: 0,
          NewsSubType_NEWS: 1,
          NewsSubType_NOTICE: 2,
          NewsSubType_RATING: 3
        }
      },
      SearchNews: {
        fields: {
          title: {
            type: "string",
            id: 1
          },
          newsSubType: {
            type: "int32",
            id: 2
          },
          source: {
            type: "string",
            id: 3
          },
          publishTime: {
            type: "string",
            id: 4
          },
          viewCount: {
            type: "int64",
            id: 5
          },
          relatedSecurities: {
            rule: "repeated",
            type: "string",
            id: 6
          },
          url: {
            type: "string",
            id: 7
          }
        }
      },
      C2S: {
        fields: {
          keyword: {
            rule: "required",
            type: "string",
            id: 1
          },
          maxCount: {
            type: "int32",
            id: 2
          },
          newsSubType: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          searchNewsList: {
            rule: "repeated",
            type: "SearchNews",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetSearchQuote: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetsearchquote"
    },
    nested: {
      SearchQuote: {
        fields: {
          market: {
            type: "int32",
            id: 1
          },
          code: {
            type: "string",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          secType: {
            type: "int32",
            id: 4
          },
          isWatched: {
            type: "bool",
            id: 5
          }
        }
      },
      C2S: {
        fields: {
          keyword: {
            rule: "required",
            type: "string",
            id: 1
          },
          maxCount: {
            type: "int32",
            id: 2
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          searchQuoteList: {
            rule: "repeated",
            type: "SearchQuote",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetSecuritySnapshot: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetsecuritysnapshot"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      EquitySnapshotExData: {
        fields: {
          issuedShares: {
            rule: "required",
            type: "int64",
            id: 1
          },
          issuedMarketVal: {
            rule: "required",
            type: "double",
            id: 2
          },
          netAsset: {
            rule: "required",
            type: "double",
            id: 3
          },
          netProfit: {
            rule: "required",
            type: "double",
            id: 4
          },
          earningsPershare: {
            rule: "required",
            type: "double",
            id: 5
          },
          outstandingShares: {
            rule: "required",
            type: "int64",
            id: 6
          },
          outstandingMarketVal: {
            rule: "required",
            type: "double",
            id: 7
          },
          netAssetPershare: {
            rule: "required",
            type: "double",
            id: 8
          },
          eyRate: {
            rule: "required",
            type: "double",
            id: 9
          },
          peRate: {
            rule: "required",
            type: "double",
            id: 10
          },
          pbRate: {
            rule: "required",
            type: "double",
            id: 11
          },
          peTTMRate: {
            rule: "required",
            type: "double",
            id: 12
          },
          dividendTTM: {
            type: "double",
            id: 13
          },
          dividendRatioTTM: {
            type: "double",
            id: 14
          },
          dividendLFY: {
            type: "double",
            id: 15
          },
          dividendLFYRatio: {
            type: "double",
            id: 16
          }
        }
      },
      WarrantSnapshotExData: {
        fields: {
          conversionRate: {
            rule: "required",
            type: "double",
            id: 1
          },
          warrantType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          strikePrice: {
            rule: "required",
            type: "double",
            id: 3
          },
          maturityTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          endTradeTime: {
            rule: "required",
            type: "string",
            id: 5
          },
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 6
          },
          recoveryPrice: {
            rule: "required",
            type: "double",
            id: 7
          },
          streetVolumn: {
            rule: "required",
            type: "int64",
            id: 8
          },
          issueVolumn: {
            rule: "required",
            type: "int64",
            id: 9
          },
          streetRate: {
            rule: "required",
            type: "double",
            id: 10
          },
          delta: {
            rule: "required",
            type: "double",
            id: 11
          },
          impliedVolatility: {
            rule: "required",
            type: "double",
            id: 12
          },
          premium: {
            rule: "required",
            type: "double",
            id: 13
          },
          maturityTimestamp: {
            type: "double",
            id: 14
          },
          endTradeTimestamp: {
            type: "double",
            id: 15
          },
          leverage: {
            type: "double",
            id: 16
          },
          ipop: {
            type: "double",
            id: 17
          },
          breakEvenPoint: {
            type: "double",
            id: 18
          },
          conversionPrice: {
            type: "double",
            id: 19
          },
          priceRecoveryRatio: {
            type: "double",
            id: 20
          },
          score: {
            type: "double",
            id: 21
          },
          upperStrikePrice: {
            type: "double",
            id: 22
          },
          lowerStrikePrice: {
            type: "double",
            id: 23
          },
          inLinePriceStatus: {
            type: "int32",
            id: 24
          },
          issuerCode: {
            type: "string",
            id: 25
          }
        }
      },
      OptionSnapshotExData: {
        fields: {
          type: {
            rule: "required",
            type: "int32",
            id: 1
          },
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 2
          },
          strikeTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          strikePrice: {
            rule: "required",
            type: "double",
            id: 4
          },
          contractSize: {
            rule: "required",
            type: "int32",
            id: 5
          },
          contractSizeFloat: {
            type: "double",
            id: 22
          },
          openInterest: {
            rule: "required",
            type: "int32",
            id: 6
          },
          impliedVolatility: {
            rule: "required",
            type: "double",
            id: 7
          },
          premium: {
            rule: "required",
            type: "double",
            id: 8
          },
          delta: {
            rule: "required",
            type: "double",
            id: 9
          },
          gamma: {
            rule: "required",
            type: "double",
            id: 10
          },
          vega: {
            rule: "required",
            type: "double",
            id: 11
          },
          theta: {
            rule: "required",
            type: "double",
            id: 12
          },
          rho: {
            rule: "required",
            type: "double",
            id: 13
          },
          strikeTimestamp: {
            type: "double",
            id: 14
          },
          indexOptionType: {
            type: "int32",
            id: 15
          },
          netOpenInterest: {
            type: "int32",
            id: 16
          },
          expiryDateDistance: {
            type: "int32",
            id: 17
          },
          contractNominalValue: {
            type: "double",
            id: 18
          },
          ownerLotMultiplier: {
            type: "double",
            id: 19
          },
          optionAreaType: {
            type: "int32",
            id: 20
          },
          contractMultiplier: {
            type: "double",
            id: 21
          }
        }
      },
      IndexSnapshotExData: {
        fields: {
          raiseCount: {
            rule: "required",
            type: "int32",
            id: 1
          },
          fallCount: {
            rule: "required",
            type: "int32",
            id: 2
          },
          equalCount: {
            rule: "required",
            type: "int32",
            id: 3
          }
        }
      },
      PlateSnapshotExData: {
        fields: {
          raiseCount: {
            rule: "required",
            type: "int32",
            id: 1
          },
          fallCount: {
            rule: "required",
            type: "int32",
            id: 2
          },
          equalCount: {
            rule: "required",
            type: "int32",
            id: 3
          }
        }
      },
      FutureSnapshotExData: {
        fields: {
          lastSettlePrice: {
            rule: "required",
            type: "double",
            id: 1
          },
          position: {
            rule: "required",
            type: "int32",
            id: 2
          },
          positionChange: {
            rule: "required",
            type: "int32",
            id: 3
          },
          lastTradeTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          lastTradeTimestamp: {
            type: "double",
            id: 5
          },
          isMainContract: {
            rule: "required",
            type: "bool",
            id: 6
          }
        }
      },
      TrustSnapshotExData: {
        fields: {
          dividendYield: {
            rule: "required",
            type: "double",
            id: 1
          },
          aum: {
            rule: "required",
            type: "double",
            id: 2
          },
          outstandingUnits: {
            rule: "required",
            type: "int64",
            id: 3
          },
          netAssetValue: {
            rule: "required",
            type: "double",
            id: 4
          },
          premium: {
            rule: "required",
            type: "double",
            id: 5
          },
          assetClass: {
            rule: "required",
            type: "int32",
            id: 6
          }
        }
      },
      SnapshotBasicData: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 41
          },
          type: {
            rule: "required",
            type: "int32",
            id: 2
          },
          isSuspend: {
            rule: "required",
            type: "bool",
            id: 3
          },
          listTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          lotSize: {
            rule: "required",
            type: "int32",
            id: 5
          },
          priceSpread: {
            rule: "required",
            type: "double",
            id: 6
          },
          updateTime: {
            rule: "required",
            type: "string",
            id: 7
          },
          highPrice: {
            rule: "required",
            type: "double",
            id: 8
          },
          openPrice: {
            rule: "required",
            type: "double",
            id: 9
          },
          lowPrice: {
            rule: "required",
            type: "double",
            id: 10
          },
          lastClosePrice: {
            rule: "required",
            type: "double",
            id: 11
          },
          curPrice: {
            rule: "required",
            type: "double",
            id: 12
          },
          volume: {
            rule: "required",
            type: "int64",
            id: 13
          },
          turnover: {
            rule: "required",
            type: "double",
            id: 14
          },
          turnoverRate: {
            rule: "required",
            type: "double",
            id: 15
          },
          listTimestamp: {
            type: "double",
            id: 16
          },
          updateTimestamp: {
            type: "double",
            id: 17
          },
          askPrice: {
            type: "double",
            id: 18
          },
          bidPrice: {
            type: "double",
            id: 19
          },
          askVol: {
            type: "int64",
            id: 20
          },
          bidVol: {
            type: "int64",
            id: 21
          },
          enableMargin: {
            type: "bool",
            id: 22
          },
          mortgageRatio: {
            type: "double",
            id: 23
          },
          longMarginInitialRatio: {
            type: "double",
            id: 24
          },
          enableShortSell: {
            type: "bool",
            id: 25
          },
          shortSellRate: {
            type: "double",
            id: 26
          },
          shortAvailableVolume: {
            type: "int64",
            id: 27
          },
          shortMarginInitialRatio: {
            type: "double",
            id: 28
          },
          amplitude: {
            type: "double",
            id: 29
          },
          avgPrice: {
            type: "double",
            id: 30
          },
          bidAskRatio: {
            type: "double",
            id: 31
          },
          volumeRatio: {
            type: "double",
            id: 32
          },
          highest52WeeksPrice: {
            type: "double",
            id: 33
          },
          lowest52WeeksPrice: {
            type: "double",
            id: 34
          },
          highestHistoryPrice: {
            type: "double",
            id: 35
          },
          lowestHistoryPrice: {
            type: "double",
            id: 36
          },
          preMarket: {
            type: "Qot_Common.PreAfterMarketData",
            id: 37
          },
          afterMarket: {
            type: "Qot_Common.PreAfterMarketData",
            id: 38
          },
          secStatus: {
            type: "int32",
            id: 39
          },
          closePrice5Minute: {
            type: "double",
            id: 40
          },
          overnight: {
            type: "Qot_Common.PreAfterMarketData",
            id: 42
          },
          hpVolume: {
            type: "double",
            id: 43
          },
          hpAskVol: {
            type: "double",
            id: 44
          },
          hpBidVol: {
            type: "double",
            id: 45
          }
        }
      },
      Snapshot: {
        fields: {
          basic: {
            rule: "required",
            type: "SnapshotBasicData",
            id: 1
          },
          equityExData: {
            type: "EquitySnapshotExData",
            id: 2
          },
          warrantExData: {
            type: "WarrantSnapshotExData",
            id: 3
          },
          optionExData: {
            type: "OptionSnapshotExData",
            id: 4
          },
          indexExData: {
            type: "IndexSnapshotExData",
            id: 5
          },
          plateExData: {
            type: "PlateSnapshotExData",
            id: 6
          },
          futureExData: {
            type: "FutureSnapshotExData",
            id: 7
          },
          trustExData: {
            type: "TrustSnapshotExData",
            id: 8
          }
        }
      },
      S2C: {
        fields: {
          snapshotList: {
            rule: "repeated",
            type: "Snapshot",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetShareholdersHolderDetail: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetshareholdersholderdetail"
    },
    nested: {
      OwnershipDetailItem: {
        fields: {
          periodText: {
            type: "string",
            id: 1
          },
          holderId: {
            type: "uint64",
            id: 2
          },
          name: {
            type: "string",
            id: 3
          },
          holderQuantity: {
            type: "int64",
            id: 4
          },
          holderQuantityChange: {
            type: "int64",
            id: 5
          },
          holderPct: {
            type: "double",
            id: 6
          },
          holderPctChange: {
            type: "double",
            id: 7
          },
          holdingDate: {
            type: "uint64",
            id: 8
          },
          holdingDateStr: {
            type: "string",
            id: 9
          },
          closePrice: {
            type: "double",
            id: 10
          },
          priceChangePct: {
            type: "double",
            id: 11
          },
          sourceGroupName: {
            type: "string",
            id: 12
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          requestType: {
            type: "Qot_Common.HolderDetailType",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          num: {
            type: "int32",
            id: 4
          },
          sortColumn: {
            type: "Qot_Common.SortField",
            id: 5
          },
          sortType: {
            type: "Qot_Common.SortType",
            id: 6
          },
          periodId: {
            type: "int32",
            id: 7
          },
          holderId: {
            type: "int32",
            id: 8
          }
        }
      },
      S2C: {
        fields: {
          updateTime: {
            type: "uint64",
            id: 1
          },
          updateTimeStr: {
            type: "string",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          itemList: {
            rule: "repeated",
            type: "OwnershipDetailItem",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetShareholdersHoldingChanges: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetshareholdersholdingchanges"
    },
    nested: {
      OwnerListItem: {
        fields: {
          periodText: {
            type: "string",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          holderId: {
            type: "int32",
            id: 3
          },
          shareChangeNum: {
            type: "int64",
            id: 4
          },
          sharesChangePrice: {
            type: "int64",
            id: 5
          },
          holderPct: {
            type: "double",
            id: 6
          },
          holderType: {
            type: "string",
            id: 7
          },
          holderTypeId: {
            type: "int32",
            id: 8
          },
          holdingDate: {
            type: "uint64",
            id: 9
          },
          holdingDateStr: {
            type: "string",
            id: 10
          },
          holderPctChange: {
            type: "double",
            id: 11
          },
          holderQuantity: {
            type: "int64",
            id: 12
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          },
          sortType: {
            type: "Qot_Common.SortType",
            id: 4
          },
          sortColumn: {
            type: "Qot_Common.SortField",
            id: 5
          },
          filterType: {
            type: "Qot_Common.HoldingChangesFilterType",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          itemList: {
            rule: "repeated",
            type: "OwnerListItem",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetShareholdersInstitutional: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetshareholdersinstitutional"
    },
    nested: {
      InstitutionHolderItem: {
        fields: {
          periodText: {
            type: "string",
            id: 1
          },
          institutionQuantity: {
            type: "int64",
            id: 2
          },
          institutionQuantityChange: {
            type: "int64",
            id: 3
          },
          holderQuantity: {
            type: "int64",
            id: 4
          },
          holderQuantityChange: {
            type: "int64",
            id: 5
          },
          holderPct: {
            type: "double",
            id: 6
          },
          holderPctChange: {
            type: "double",
            id: 7
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          updateTime: {
            type: "uint64",
            id: 1
          },
          updateTimeStr: {
            type: "string",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          itemList: {
            rule: "repeated",
            type: "InstitutionHolderItem",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetShareholdersOverview: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetshareholdersoverview"
    },
    nested: {
      OwnershipStaticItem: {
        fields: {
          name: {
            type: "string",
            id: 1
          },
          holderPct: {
            type: "double",
            id: 2
          },
          holderId: {
            type: "int32",
            id: 3
          }
        }
      },
      OwnershipStaticInfo: {
        fields: {
          staticDate: {
            type: "uint64",
            id: 1
          },
          staticDateStr: {
            type: "string",
            id: 2
          },
          itemList: {
            rule: "repeated",
            type: "OwnershipStaticItem",
            id: 4
          }
        }
      },
      HoldingPeriodItem: {
        fields: {
          periodText: {
            type: "string",
            id: 1
          },
          periodId: {
            type: "int32",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          periodId: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          mainHolderInfoList: {
            rule: "repeated",
            type: "OwnershipStaticInfo",
            id: 1
          },
          holderTypeInfoList: {
            rule: "repeated",
            type: "OwnershipStaticInfo",
            id: 2
          },
          holdingPeriodList: {
            rule: "repeated",
            type: "HoldingPeriodItem",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetShortInterest: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetshortinterest"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          nextKey: {
            type: "string",
            id: 2
          },
          num: {
            type: "int32",
            id: 3
          }
        }
      },
      UsShortInterestItem: {
        fields: {
          timestamp: {
            type: "int64",
            id: 1
          },
          timestampStr: {
            type: "string",
            id: 2
          },
          sharesShort: {
            type: "uint64",
            id: 3
          },
          shortPercent: {
            type: "double",
            id: 4
          },
          avgDailyShareVolume: {
            type: "uint64",
            id: 5
          },
          daysToCover: {
            type: "double",
            id: 6
          },
          closePrice: {
            type: "double",
            id: 7
          },
          lastClosePrice: {
            type: "double",
            id: 8
          }
        }
      },
      HkShortInterestItem: {
        fields: {
          timestamp: {
            type: "int64",
            id: 1
          },
          timestampStr: {
            type: "string",
            id: 2
          },
          closePrice: {
            type: "double",
            id: 3
          },
          lastClosePrice: {
            type: "double",
            id: 4
          },
          aggregatedShort: {
            type: "uint64",
            id: 5
          },
          aggregatedShortRatio: {
            type: "double",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          usItemList: {
            rule: "repeated",
            type: "UsShortInterestItem",
            id: 1
          },
          hkItemList: {
            rule: "repeated",
            type: "HkShortInterestItem",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetShortSellingRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetshortsellingrank"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      ShortSellingSortField: {
        values: {
          ShortSellingSortField_Unknown: 0,
          ShortSellingSortField_ShortNumberChange: 1,
          ShortSellingSortField_ShortRatioChange: 2,
          ShortSellingSortField_ShortNumber: 3,
          ShortSellingSortField_ShortRatio: 4,
          ShortSellingSortField_Volume: 5,
          ShortSellingSortField_PositionVolume: 6,
          ShortSellingSortField_PositionRatio: 7,
          ShortSellingSortField_DaysToCover: 8,
          ShortSellingSortField_WeekAvgVolume: 9,
          ShortSellingSortField_WeekAvgShortNumber: 10,
          ShortSellingSortField_WeekAvgShortRatio: 11,
          ShortSellingSortField_MonthAvgVolume: 12,
          ShortSellingSortField_MonthAvgShortNumber: 13,
          ShortSellingSortField_MonthAvgShortRatio: 14
        }
      },
      C2S: {
        fields: {
          market: {
            type: "int32",
            id: 1
          },
          sortField: {
            type: "int32",
            id: 2
          },
          sortDir: {
            type: "int32",
            id: 3
          },
          offset: {
            type: "int32",
            id: 4
          },
          count: {
            type: "int32",
            id: 5
          },
          plateList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 6
          }
        }
      },
      ShortSellingRankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          closePrice: {
            type: "double",
            id: 10
          },
          changeRatio: {
            type: "double",
            id: 11
          },
          changeRatio5D: {
            type: "double",
            id: 12
          },
          changeRatio10D: {
            type: "double",
            id: 13
          },
          volume: {
            type: "int64",
            id: 14
          },
          shortNumber: {
            type: "int64",
            id: 20
          },
          shortNumberChange: {
            type: "int64",
            id: 21
          },
          shortRatio: {
            type: "double",
            id: 22
          },
          shortRatioChange: {
            type: "double",
            id: 23
          },
          shortPositionVolume: {
            type: "int64",
            id: 24
          },
          shortPositionRatio: {
            type: "double",
            id: 25
          },
          daysToCover: {
            type: "double",
            id: 26
          },
          weekAvgShortNumber: {
            type: "int64",
            id: 27
          },
          weekAvgShortRatio: {
            type: "double",
            id: 28
          },
          monthAvgShortNumber: {
            type: "int64",
            id: 29
          },
          monthAvgShortRatio: {
            type: "double",
            id: 30
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "ShortSellingRankItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetStaticInfo: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetstaticinfo"
    },
    nested: {
      C2S: {
        fields: {
          market: {
            type: "int32",
            id: 1
          },
          secType: {
            type: "int32",
            id: 2
          },
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 3
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          staticInfoList: {
            rule: "repeated",
            type: "Qot_Common.SecurityStaticInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetSubInfo: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetsubinfo"
    },
    nested: {
      C2S: {
        fields: {
          isReqAllConn: {
            type: "bool",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          connSubInfoList: {
            rule: "repeated",
            type: "Qot_Common.ConnSubInfo",
            id: 1
          },
          totalUsedQuota: {
            rule: "required",
            type: "int32",
            id: 2
          },
          remainQuota: {
            rule: "required",
            type: "int32",
            id: 3
          },
          optionUsedQuota: {
            type: "int32",
            id: 4
          },
          optionRemainQuota: {
            type: "int32",
            id: 5
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetSuspend: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetsuspend"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 2
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      Suspend: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          timestamp: {
            type: "double",
            id: 2
          }
        }
      },
      SecuritySuspend: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          suspendList: {
            rule: "repeated",
            type: "Suspend",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          SecuritySuspendList: {
            rule: "repeated",
            type: "SecuritySuspend",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetTicker: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetticker"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          maxRetNum: {
            rule: "required",
            type: "int32",
            id: 2
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 3
          },
          tickerList: {
            rule: "repeated",
            type: "Qot_Common.Ticker",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetTopMoversRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgettopmoverrank"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_Price: 1,
          IndicatorType_MarketCap: 2,
          IndicatorType_PE: 3
        }
      },
      PriceFilter: {
        values: {
          PriceFilter_All: 0,
          PriceFilter_LessThan1: 1,
          PriceFilter_Between1And10: 2,
          PriceFilter_Between10And100: 3,
          PriceFilter_GreaterThan100: 4,
          PriceFilter_Near52WeekHigh: 5,
          PriceFilter_Near52WeekLow: 6
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          },
          priceFilter: {
            type: "int32",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          sortDir: {
            type: "int32",
            id: 2
          },
          offset: {
            type: "int32",
            id: 3
          },
          count: {
            type: "int32",
            id: 4
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 5
          }
        }
      },
      TopMoversRankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          curPrice: {
            type: "double",
            id: 10
          },
          changeRatio: {
            type: "double",
            id: 11
          },
          changeAmount: {
            type: "double",
            id: 12
          },
          turnover: {
            type: "double",
            id: 13
          },
          volume: {
            type: "int64",
            id: 14
          },
          turnoverRatio: {
            type: "double",
            id: 15
          },
          peTTM: {
            type: "double",
            id: 16
          },
          amplitude: {
            type: "double",
            id: 17
          },
          marketCap: {
            type: "double",
            id: 18
          },
          volumeRatio: {
            type: "double",
            id: 19
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "TopMoversRankItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetTopTenBuySellBrokers: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgettoptenbuysellbrokers"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          daysBefore: {
            type: "int32",
            id: 2
          }
        }
      },
      BrokerItem: {
        fields: {
          netVol: {
            type: "int64",
            id: 1
          },
          brokerName: {
            type: "string",
            id: 2
          },
          buySellType: {
            type: "Qot_Common.BuySellType",
            id: 3
          },
          avgPrice: {
            type: "double",
            id: 4
          },
          totalVol: {
            type: "double",
            id: 5
          },
          totalTurnover: {
            type: "double",
            id: 6
          }
        }
      },
      S2C: {
        fields: {
          isRealTime: {
            type: "bool",
            id: 1
          },
          dataTime: {
            type: "int64",
            id: 2
          },
          dataTimeStr: {
            type: "string",
            id: 3
          },
          brokerList: {
            rule: "repeated",
            type: "BrokerItem",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetUSAfterHoursRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetusafterhoursrank"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_Price: 1,
          IndicatorType_MarketCap: 2,
          IndicatorType_PE: 3
        }
      },
      PriceFilter: {
        values: {
          PriceFilter_All: 0,
          PriceFilter_LessThan1: 1,
          PriceFilter_Between1And10: 2,
          PriceFilter_Between10And100: 3,
          PriceFilter_GreaterThan100: 4,
          PriceFilter_Near52WeekHigh: 5,
          PriceFilter_Near52WeekLow: 6
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          },
          priceFilter: {
            type: "int32",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          sortDir: {
            type: "int32",
            id: 1
          },
          offset: {
            type: "int32",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 4
          }
        }
      },
      AfterHoursRankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          afterHoursPrice: {
            type: "double",
            id: 10
          },
          afterHoursChangeRatio: {
            type: "double",
            id: 11
          },
          afterHoursChangeAmount: {
            type: "double",
            id: 12
          },
          afterHoursTurnover: {
            type: "double",
            id: 13
          },
          afterHoursVolume: {
            type: "int64",
            id: 14
          },
          closePrice: {
            type: "double",
            id: 15
          },
          changeRatio: {
            type: "double",
            id: 16
          },
          changeAmount: {
            type: "double",
            id: 17
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "AfterHoursRankItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetUSOvernightRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetusovernightrank"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_Price: 1,
          IndicatorType_MarketCap: 2,
          IndicatorType_PE: 3
        }
      },
      PriceFilter: {
        values: {
          PriceFilter_All: 0,
          PriceFilter_LessThan1: 1,
          PriceFilter_Between1And10: 2,
          PriceFilter_Between10And100: 3,
          PriceFilter_GreaterThan100: 4,
          PriceFilter_Near52WeekHigh: 5,
          PriceFilter_Near52WeekLow: 6
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          },
          priceFilter: {
            type: "int32",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          sortDir: {
            type: "int32",
            id: 1
          },
          offset: {
            type: "int32",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 4
          }
        }
      },
      OvernightRankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          overnightPrice: {
            type: "double",
            id: 10
          },
          overnightChangeRatio: {
            type: "double",
            id: 11
          },
          overnightChangeAmount: {
            type: "double",
            id: 12
          },
          overnightTurnover: {
            type: "double",
            id: 13
          },
          overnightVolume: {
            type: "int64",
            id: 14
          },
          closePrice: {
            type: "double",
            id: 15
          },
          changeRatio: {
            type: "double",
            id: 16
          },
          changeAmount: {
            type: "double",
            id: 17
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "OvernightRankItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetUSPreMarketRank: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetuspremarketrank"
    },
    nested: {
      SortDir: {
        values: {
          SortDir_Descending: 0,
          SortDir_Ascending: 1
        }
      },
      IndicatorType: {
        values: {
          IndicatorType_Unknown: 0,
          IndicatorType_Price: 1,
          IndicatorType_MarketCap: 2,
          IndicatorType_PE: 3
        }
      },
      PriceFilter: {
        values: {
          PriceFilter_All: 0,
          PriceFilter_LessThan1: 1,
          PriceFilter_Between1And10: 2,
          PriceFilter_Between10And100: 3,
          PriceFilter_GreaterThan100: 4,
          PriceFilter_Near52WeekHigh: 5,
          PriceFilter_Near52WeekLow: 6
        }
      },
      Indicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "Qot_OptionCommon.Interval",
            id: 2
          },
          priceFilter: {
            type: "int32",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          sortDir: {
            type: "int32",
            id: 1
          },
          offset: {
            type: "int32",
            id: 2
          },
          count: {
            type: "int32",
            id: 3
          },
          filterList: {
            rule: "repeated",
            type: "Indicator",
            id: 4
          }
        }
      },
      PreMarketRankItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          },
          preMarketPrice: {
            type: "double",
            id: 10
          },
          preMarketChangeRatio: {
            type: "double",
            id: 11
          },
          preMarketChangeAmount: {
            type: "double",
            id: 12
          },
          preMarketTurnover: {
            type: "double",
            id: 13
          },
          preMarketVolume: {
            type: "int64",
            id: 14
          },
          closePrice: {
            type: "double",
            id: 15
          },
          changeRatio: {
            type: "double",
            id: 16
          },
          changeAmount: {
            type: "double",
            id: 17
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "PreMarketRankItem",
            id: 1
          },
          allCount: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetUserSecurity: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetusersecurity"
    },
    nested: {
      C2S: {
        fields: {
          groupName: {
            rule: "required",
            type: "string",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          staticInfoList: {
            rule: "repeated",
            type: "Qot_Common.SecurityStaticInfo",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetUserSecurityGroup: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetusersecuritygroup"
    },
    nested: {
      GroupType: {
        values: {
          GroupType_Unknown: 0,
          GroupType_Custom: 1,
          GroupType_System: 2,
          GroupType_All: 3
        }
      },
      C2S: {
        fields: {
          groupType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      GroupData: {
        fields: {
          groupName: {
            rule: "required",
            type: "string",
            id: 1
          },
          groupType: {
            rule: "required",
            type: "int32",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          groupList: {
            rule: "repeated",
            type: "GroupData",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetValuationDetail: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetvaluationdetail"
    },
    nested: {
      ValuationTrend: {
        fields: {
          currentValue: {
            type: "double",
            id: 1
          },
          averageValue: {
            type: "double",
            id: 2
          },
          avgMinus1Stddev: {
            type: "double",
            id: 3
          },
          avgPlus1Stddev: {
            type: "double",
            id: 4
          },
          valuationPercentile: {
            type: "double",
            id: 5
          },
          forwardValue: {
            type: "double",
            id: 6
          },
          historicalItems: {
            rule: "repeated",
            type: "ValuationHistoricalItem",
            id: 7
          }
        },
        nested: {
          ValuationHistoricalItem: {
            fields: {
              value: {
                type: "double",
                id: 1
              },
              time: {
                type: "uint64",
                id: 2
              },
              timeStr: {
                type: "string",
                id: 3
              },
              plateValue: {
                type: "double",
                id: 4
              }
            }
          }
        }
      },
      MarketDistribution: {
        fields: {
          sections: {
            rule: "repeated",
            type: "DistributionSection",
            id: 1
          },
          total: {
            type: "int32",
            id: 2
          },
          ranking: {
            type: "int32",
            id: 3
          },
          averageValue: {
            type: "double",
            id: 4
          },
          medianValue: {
            type: "double",
            id: 5
          }
        },
        nested: {
          DistributionSection: {
            fields: {
              start: {
                type: "double",
                id: 1
              },
              end: {
                type: "double",
                id: 2
              },
              number: {
                type: "int32",
                id: 3
              }
            }
          }
        }
      },
      PlateDistribution: {
        fields: {
          plate: {
            type: "Qot_Common.Security",
            id: 1
          },
          plateName: {
            type: "string",
            id: 2
          },
          plateAverageValue: {
            type: "double",
            id: 3
          },
          plateRanking: {
            type: "int32",
            id: 4
          },
          plateStockItemCount: {
            type: "int32",
            id: 5
          },
          stockItems: {
            rule: "repeated",
            type: "PlateStockItem",
            id: 6
          }
        },
        nested: {
          PlateStockItem: {
            fields: {
              security: {
                type: "Qot_Common.Security",
                id: 1
              },
              name: {
                type: "string",
                id: 2
              },
              value: {
                type: "double",
                id: 3
              },
              marketCap: {
                type: "double",
                id: 4
              }
            }
          }
        }
      },
      ProfitGrowthRate: {
        fields: {
          financialTtmMultiple: {
            type: "double",
            id: 1
          },
          marketCapMultiple: {
            type: "double",
            id: 2
          },
          yearCount: {
            type: "int32",
            id: 3
          },
          profitData: {
            rule: "repeated",
            type: "ProfitGrowthItem",
            id: 4
          },
          conclusionDetailed: {
            type: "string",
            id: 5
          }
        },
        nested: {
          ProfitGrowthItem: {
            fields: {
              financialYear: {
                type: "uint32",
                id: 1
              },
              financialQuarter: {
                type: "uint32",
                id: 2
              },
              periodStr: {
                type: "string",
                id: 3
              },
              reportDate: {
                type: "int64",
                id: 4
              },
              reportDateStr: {
                type: "string",
                id: 5
              },
              marketCapMultiple: {
                type: "double",
                id: 6
              },
              financeDataMultiple: {
                type: "double",
                id: 7
              }
            }
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          valuationType: {
            type: "Qot_Common.ValuationType",
            id: 2
          },
          intervalType: {
            type: "Qot_Common.ValuationIntervalType",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          valuationType: {
            type: "Qot_Common.ValuationType",
            id: 1
          },
          lastUpdateTime: {
            type: "uint64",
            id: 2
          },
          lastUpdateTimeStr: {
            type: "string",
            id: 3
          },
          trend: {
            type: "ValuationTrend",
            id: 4
          },
          marketDistribution: {
            type: "MarketDistribution",
            id: 5
          },
          plateDistribution: {
            type: "PlateDistribution",
            id: 6
          },
          profitGrowthRate: {
            type: "ProfitGrowthRate",
            id: 7
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetValuationPlateStockList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetvaluationplatestocklist"
    },
    nested: {
      PlateItem: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 2
          }
        }
      },
      StockItem: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 6
          },
          valuationVal: {
            type: "double",
            id: 2
          },
          forwardValue: {
            type: "double",
            id: 3
          },
          valuationPercentile: {
            type: "double",
            id: 4
          },
          marketCap: {
            type: "double",
            id: 5
          }
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          valuationType: {
            type: "Qot_Common.ValuationType",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          num: {
            type: "int32",
            id: 4
          },
          sortType: {
            type: "Qot_Common.SortType",
            id: 5
          },
          sortId: {
            type: "Qot_Common.SortField",
            id: 6
          },
          filterSecurity: {
            type: "Qot_Common.Security",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          count: {
            type: "int32",
            id: 1
          },
          stockList: {
            rule: "repeated",
            type: "StockItem",
            id: 2
          },
          nextKey: {
            type: "string",
            id: 3
          },
          plateList: {
            rule: "repeated",
            type: "PlateItem",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_GetWarrant: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotgetwarrant"
    },
    nested: {
      C2S: {
        fields: {
          begin: {
            rule: "required",
            type: "int32",
            id: 1
          },
          num: {
            rule: "required",
            type: "int32",
            id: 2
          },
          sortField: {
            rule: "required",
            type: "int32",
            id: 3
          },
          ascend: {
            rule: "required",
            type: "bool",
            id: 4
          },
          owner: {
            type: "Qot_Common.Security",
            id: 5
          },
          typeList: {
            rule: "repeated",
            type: "int32",
            id: 6,
            options: {
              packed: false
            }
          },
          issuerList: {
            rule: "repeated",
            type: "int32",
            id: 7,
            options: {
              packed: false
            }
          },
          maturityTimeMin: {
            type: "string",
            id: 8
          },
          maturityTimeMax: {
            type: "string",
            id: 9
          },
          ipoPeriod: {
            type: "int32",
            id: 10
          },
          priceType: {
            type: "int32",
            id: 11
          },
          status: {
            type: "int32",
            id: 12
          },
          curPriceMin: {
            type: "double",
            id: 13
          },
          curPriceMax: {
            type: "double",
            id: 14
          },
          strikePriceMin: {
            type: "double",
            id: 15
          },
          strikePriceMax: {
            type: "double",
            id: 16
          },
          streetMin: {
            type: "double",
            id: 17
          },
          streetMax: {
            type: "double",
            id: 18
          },
          conversionMin: {
            type: "double",
            id: 19
          },
          conversionMax: {
            type: "double",
            id: 20
          },
          volMin: {
            type: "uint64",
            id: 21
          },
          volMax: {
            type: "uint64",
            id: 22
          },
          premiumMin: {
            type: "double",
            id: 23
          },
          premiumMax: {
            type: "double",
            id: 24
          },
          leverageRatioMin: {
            type: "double",
            id: 25
          },
          leverageRatioMax: {
            type: "double",
            id: 26
          },
          deltaMin: {
            type: "double",
            id: 27
          },
          deltaMax: {
            type: "double",
            id: 28
          },
          impliedMin: {
            type: "double",
            id: 29
          },
          impliedMax: {
            type: "double",
            id: 30
          },
          recoveryPriceMin: {
            type: "double",
            id: 31
          },
          recoveryPriceMax: {
            type: "double",
            id: 32
          },
          priceRecoveryRatioMin: {
            type: "double",
            id: 33
          },
          priceRecoveryRatioMax: {
            type: "double",
            id: 34
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      WarrantData: {
        fields: {
          stock: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          owner: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 2
          },
          type: {
            rule: "required",
            type: "int32",
            id: 3
          },
          issuer: {
            rule: "required",
            type: "int32",
            id: 4
          },
          maturityTime: {
            rule: "required",
            type: "string",
            id: 5
          },
          maturityTimestamp: {
            type: "double",
            id: 6
          },
          listTime: {
            rule: "required",
            type: "string",
            id: 7
          },
          listTimestamp: {
            type: "double",
            id: 8
          },
          lastTradeTime: {
            rule: "required",
            type: "string",
            id: 9
          },
          lastTradeTimestamp: {
            type: "double",
            id: 10
          },
          recoveryPrice: {
            type: "double",
            id: 11
          },
          conversionRatio: {
            rule: "required",
            type: "double",
            id: 12
          },
          lotSize: {
            rule: "required",
            type: "int32",
            id: 13
          },
          strikePrice: {
            rule: "required",
            type: "double",
            id: 14
          },
          lastClosePrice: {
            rule: "required",
            type: "double",
            id: 15
          },
          name: {
            rule: "required",
            type: "string",
            id: 16
          },
          curPrice: {
            rule: "required",
            type: "double",
            id: 17
          },
          priceChangeVal: {
            rule: "required",
            type: "double",
            id: 18
          },
          changeRate: {
            rule: "required",
            type: "double",
            id: 19
          },
          status: {
            rule: "required",
            type: "int32",
            id: 20
          },
          bidPrice: {
            rule: "required",
            type: "double",
            id: 21
          },
          askPrice: {
            rule: "required",
            type: "double",
            id: 22
          },
          bidVol: {
            rule: "required",
            type: "int64",
            id: 23
          },
          askVol: {
            rule: "required",
            type: "int64",
            id: 24
          },
          volume: {
            rule: "required",
            type: "int64",
            id: 25
          },
          turnover: {
            rule: "required",
            type: "double",
            id: 26
          },
          score: {
            rule: "required",
            type: "double",
            id: 27
          },
          premium: {
            rule: "required",
            type: "double",
            id: 28
          },
          breakEvenPoint: {
            rule: "required",
            type: "double",
            id: 29
          },
          leverage: {
            rule: "required",
            type: "double",
            id: 30
          },
          ipop: {
            rule: "required",
            type: "double",
            id: 31
          },
          priceRecoveryRatio: {
            type: "double",
            id: 32
          },
          conversionPrice: {
            rule: "required",
            type: "double",
            id: 33
          },
          streetRate: {
            rule: "required",
            type: "double",
            id: 34
          },
          streetVol: {
            rule: "required",
            type: "int64",
            id: 35
          },
          amplitude: {
            rule: "required",
            type: "double",
            id: 36
          },
          issueSize: {
            rule: "required",
            type: "int64",
            id: 37
          },
          highPrice: {
            rule: "required",
            type: "double",
            id: 39
          },
          lowPrice: {
            rule: "required",
            type: "double",
            id: 40
          },
          impliedVolatility: {
            type: "double",
            id: 41
          },
          delta: {
            type: "double",
            id: 42
          },
          effectiveLeverage: {
            rule: "required",
            type: "double",
            id: 43
          },
          upperStrikePrice: {
            type: "double",
            id: 44
          },
          lowerStrikePrice: {
            type: "double",
            id: 45
          },
          inLinePriceStatus: {
            type: "int32",
            id: 46
          }
        }
      },
      S2C: {
        fields: {
          lastPage: {
            rule: "required",
            type: "bool",
            id: 1
          },
          allCount: {
            rule: "required",
            type: "int32",
            id: 2
          },
          warrantDataList: {
            rule: "repeated",
            type: "WarrantData",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_ModifyUserSecurity: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotmodifyusersecurity"
    },
    nested: {
      ModifyUserSecurityOp: {
        values: {
          ModifyUserSecurityOp_Unknown: 0,
          ModifyUserSecurityOp_Add: 1,
          ModifyUserSecurityOp_Del: 2,
          ModifyUserSecurityOp_MoveOut: 3
        }
      },
      C2S: {
        fields: {
          groupName: {
            rule: "required",
            type: "string",
            id: 1
          },
          op: {
            rule: "required",
            type: "int32",
            id: 2
          },
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 3
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_OptionScreen: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotoptionscreen"
    },
    nested: {
      MarketCategory: {
        values: {
          MarketCategory_US_Stock: 0,
          MarketCategory_US_Index: 1,
          MarketCategory_US_Future: 2,
          MarketCategory_HK_Stock: 3,
          MarketCategory_HK_Index: 4,
          MarketCategory_JP_Stock: 5,
          MarketCategory_JP_Index: 6
        }
      },
      UnderlyingIndicatorType: {
        values: {
          UnderlyingIndicatorType_Unknown: 0,
          UnderlyingIndicatorType_StockList: 101,
          UnderlyingIndicatorType_Plate: 103,
          UnderlyingIndicatorType_IndexList: 106,
          UnderlyingIndicatorType_Volume: 201,
          UnderlyingIndicatorType_OpenInterest: 202,
          UnderlyingIndicatorType_IV: 203,
          UnderlyingIndicatorType_HV: 204,
          UnderlyingIndicatorType_IVRank: 205,
          UnderlyingIndicatorType_IVPercentile: 206,
          UnderlyingIndicatorType_IVChange: 207,
          UnderlyingIndicatorType_IVChangeRatio: 208,
          UnderlyingIndicatorType_IVHVRatio: 209,
          UnderlyingIndicatorType_IVHVSpread: 210,
          UnderlyingIndicatorType_MarketCap: 401,
          UnderlyingIndicatorType_StockPrice: 402,
          UnderlyingIndicatorType_ChangeRate: 403
        }
      },
      OptionIndicatorType: {
        values: {
          OptionIndicatorType_Unknown: 0,
          OptionIndicatorType_StrikePrice: 1001,
          OptionIndicatorType_LeftDay: 1002,
          OptionIndicatorType_OptionType: 1003,
          OptionIndicatorType_ExerciseType: 1004,
          OptionIndicatorType_ExpirationType: 1005,
          OptionIndicatorType_StrikeDateTimestamp: 1007,
          OptionIndicatorType_InTheMoney: 2001,
          OptionIndicatorType_Price: 2002,
          OptionIndicatorType_MidPrice: 2003,
          OptionIndicatorType_BidPrice: 2004,
          OptionIndicatorType_AskPrice: 2005,
          OptionIndicatorType_BidAskSpread: 2006,
          OptionIndicatorType_BidVolume: 2007,
          OptionIndicatorType_AskVolume: 2008,
          OptionIndicatorType_BidAskVolumeRatio: 2009,
          OptionIndicatorType_ChangeRate: 2010,
          OptionIndicatorType_Volume: 2011,
          OptionIndicatorType_Turnover: 2012,
          OptionIndicatorType_OpenInterest: 2013,
          OptionIndicatorType_OpenInterestMarketCap: 2014,
          OptionIndicatorType_VolOIRatio: 2018,
          OptionIndicatorType_Premium: 2021,
          OptionIndicatorType_ImpliedVolatility: 3001,
          OptionIndicatorType_HistoryVolatility: 3002,
          OptionIndicatorType_IVHVRatio: 3003,
          OptionIndicatorType_Delta: 3004,
          OptionIndicatorType_Gamma: 3005,
          OptionIndicatorType_Vega: 3006,
          OptionIndicatorType_Theta: 3007,
          OptionIndicatorType_Rho: 3008,
          OptionIndicatorType_LeverageRatio: 3009,
          OptionIndicatorType_EffectiveGearing: 3010,
          OptionIndicatorType_BuyToBep: 3011,
          OptionIndicatorType_SellToBep: 3012,
          OptionIndicatorType_BuyProfitProbability: 3013,
          OptionIndicatorType_SellProfitProbability: 3014,
          OptionIndicatorType_IntrinsicValuePer: 3015,
          OptionIndicatorType_TimeValuePer: 3016,
          OptionIndicatorType_ITMDegree: 3017,
          OptionIndicatorType_OTMDegree: 3018,
          OptionIndicatorType_ITMProbability: 3019,
          OptionIndicatorType_OTMProbability: 3020,
          OptionIndicatorType_SellAnnualizedReturn: 3021,
          OptionIndicatorType_IntervalReturn: 3022,
          OptionIndicatorType_BuyBreakEvenPoint: 3023
        }
      },
      Boundary: {
        fields: {
          value: {
            rule: "required",
            type: "double",
            id: 1
          },
          includes: {
            rule: "required",
            type: "bool",
            id: 2
          }
        }
      },
      Interval: {
        fields: {
          filterMin: {
            type: "Boundary",
            id: 1
          },
          filterMax: {
            type: "Boundary",
            id: 2
          }
        }
      },
      IndicatorValue: {
        fields: {
          valueList: {
            rule: "repeated",
            type: "int64",
            id: 1,
            options: {
              packed: false
            }
          },
          valueInterval: {
            type: "Interval",
            id: 2
          },
          strValueList: {
            rule: "repeated",
            type: "string",
            id: 3
          }
        }
      },
      UnderlyingIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          },
          plateList: {
            rule: "repeated",
            type: "OptionPlate",
            id: 4
          }
        }
      },
      OptionIndicator: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          indicatorValue: {
            type: "IndicatorValue",
            id: 2
          }
        }
      },
      FilterGroup: {
        fields: {
          underlyingList: {
            rule: "repeated",
            type: "UnderlyingIndicator",
            id: 1
          },
          optionList: {
            rule: "repeated",
            type: "OptionIndicator",
            id: 2
          }
        }
      },
      OptionPlate: {
        fields: {
          parentPlateId: {
            type: "string",
            id: 1
          },
          plateIdList: {
            rule: "repeated",
            type: "string",
            id: 2
          }
        }
      },
      Sort: {
        fields: {
          indicatorType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          direction: {
            rule: "required",
            type: "int32",
            id: 2
          }
        }
      },
      UnderlyingInfo: {
        fields: {
          stockID: {
            type: "uint64",
            id: 1
          },
          iv: {
            type: "double",
            id: 2
          },
          hv: {
            type: "double",
            id: 3
          },
          ivRank: {
            type: "double",
            id: 4
          },
          ivPercentile: {
            type: "double",
            id: 5
          },
          marketCap: {
            type: "double",
            id: 6
          },
          price: {
            type: "double",
            id: 7
          },
          changeRate: {
            type: "double",
            id: 8
          }
        }
      },
      OptionScreenItem: {
        fields: {
          security: {
            type: "Qot_Common.Security",
            id: 1
          },
          optionName: {
            type: "string",
            id: 2
          },
          strikePrice: {
            type: "double",
            id: 3
          },
          strikeDate: {
            type: "int64",
            id: 4
          },
          optionType: {
            type: "int32",
            id: 5
          },
          exerciseType: {
            type: "int32",
            id: 6
          },
          expirationType: {
            type: "int32",
            id: 7
          },
          inTheMoney: {
            type: "int32",
            id: 8
          },
          leftDay: {
            type: "int32",
            id: 9
          },
          price: {
            type: "double",
            id: 20
          },
          midPrice: {
            type: "double",
            id: 21
          },
          bidPrice: {
            type: "double",
            id: 22
          },
          askPrice: {
            type: "double",
            id: 23
          },
          bidAskSpread: {
            type: "double",
            id: 24
          },
          bidVolume: {
            type: "int64",
            id: 25
          },
          askVolume: {
            type: "int64",
            id: 26
          },
          changeRate: {
            type: "double",
            id: 27
          },
          volume: {
            type: "int64",
            id: 28
          },
          turnover: {
            type: "double",
            id: 29
          },
          openInterest: {
            type: "int64",
            id: 30
          },
          bidAskVolumeRatio: {
            type: "double",
            id: 31
          },
          openInterestMarketCap: {
            type: "double",
            id: 32
          },
          volOIRatio: {
            type: "double",
            id: 33
          },
          premium: {
            type: "double",
            id: 34
          },
          impliedVolatility: {
            type: "double",
            id: 40
          },
          delta: {
            type: "double",
            id: 41
          },
          gamma: {
            type: "double",
            id: 42
          },
          vega: {
            type: "double",
            id: 43
          },
          theta: {
            type: "double",
            id: 44
          },
          rho: {
            type: "double",
            id: 45
          },
          leverageRatio: {
            type: "double",
            id: 46
          },
          effectiveGearing: {
            type: "double",
            id: 47
          },
          itmProbability: {
            type: "double",
            id: 48
          },
          buyBreakEvenPoint: {
            type: "double",
            id: 49
          },
          underlyingInfo: {
            type: "UnderlyingInfo",
            id: 50
          },
          historyVolatility: {
            type: "double",
            id: 51
          },
          ivHvRatio: {
            type: "double",
            id: 52
          },
          buyToBep: {
            type: "double",
            id: 53
          },
          sellToBep: {
            type: "double",
            id: 54
          },
          buyProfitProbability: {
            type: "double",
            id: 55
          },
          sellProfitProbability: {
            type: "double",
            id: 56
          },
          intrinsicValuePer: {
            type: "double",
            id: 57
          },
          timeValuePer: {
            type: "double",
            id: 58
          },
          itmDegree: {
            type: "double",
            id: 59
          },
          otmDegree: {
            type: "double",
            id: 60
          },
          otmProbability: {
            type: "double",
            id: 61
          },
          sellAnnualizedReturn: {
            type: "double",
            id: 62
          },
          intervalReturn: {
            type: "double",
            id: 63
          }
        }
      },
      C2S: {
        fields: {
          marketCategoryList: {
            rule: "repeated",
            type: "int32",
            id: 1,
            options: {
              packed: false
            }
          },
          filterList: {
            rule: "repeated",
            type: "FilterGroup",
            id: 2
          },
          sortList: {
            rule: "repeated",
            type: "Sort",
            id: 3
          },
          pageFrom: {
            type: "int32",
            id: 4
          },
          pageCount: {
            type: "int32",
            id: 5
          },
          optionRetrieveList: {
            rule: "repeated",
            type: "int32",
            id: 6,
            options: {
              packed: false
            }
          },
          underlyingRetrieveList: {
            rule: "repeated",
            type: "int32",
            id: 7,
            options: {
              packed: false
            }
          }
        }
      },
      S2C: {
        fields: {
          lastPage: {
            rule: "required",
            type: "bool",
            id: 1
          },
          allCount: {
            rule: "required",
            type: "int32",
            id: 2
          },
          dataList: {
            rule: "repeated",
            type: "OptionScreenItem",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_PushIndicatorCalc: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotpushindicatorcalc"
    },
    nested: {
      IndicatorOutputRow: {
        fields: {
          time: {
            type: "string",
            id: 1
          },
          values: {
            rule: "repeated",
            type: "double",
            id: 2,
            options: {
              packed: false
            }
          }
        }
      },
      S2C: {
        fields: {
          calcId: {
            rule: "required",
            type: "string",
            id: 1
          },
          outputs: {
            rule: "repeated",
            type: "Qot_Common.IndicatorOutputParam",
            id: 2
          },
          outputRows: {
            rule: "repeated",
            type: "IndicatorOutputRow",
            id: 3
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_RegQotPush: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotregqotpush"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          subTypeList: {
            rule: "repeated",
            type: "int32",
            id: 2,
            options: {
              packed: false
            }
          },
          rehabTypeList: {
            rule: "repeated",
            type: "int32",
            id: 3,
            options: {
              packed: false
            }
          },
          isRegOrUnReg: {
            rule: "required",
            type: "bool",
            id: 4
          },
          isFirstPush: {
            type: "bool",
            id: 5
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_RequestHistoryEventContractKL: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotrequesthistoryeventcontractkl"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          klineSource: {
            type: "Qot_Common.EC_KlineSource",
            id: 2
          },
          preSide: {
            type: "Common.PredSide",
            id: 3
          },
          klType: {
            rule: "required",
            type: "Qot_Common.KLType",
            id: 4
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 5
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 6
          },
          maxAckKLNum: {
            type: "int32",
            id: 7
          },
          nextReqKey: {
            type: "bytes",
            id: 8
          }
        }
      },
      S2C: {
        fields: {
          klineList: {
            rule: "repeated",
            type: "Qot_GetEventContractKline.KlineItem",
            id: 1
          },
          nextReqKey: {
            type: "bytes",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_RequestHistoryKL: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotrequesthistorykl"
    },
    nested: {
      C2S: {
        fields: {
          rehabType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          klType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 3
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 4
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 5
          },
          maxAckKLNum: {
            type: "int32",
            id: 6
          },
          needKLFieldsFlag: {
            type: "int64",
            id: 7
          },
          nextReqKey: {
            type: "bytes",
            id: 8
          },
          extendedTime: {
            type: "bool",
            id: 9
          },
          session: {
            type: "int32",
            id: 10
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 4
          },
          klList: {
            rule: "repeated",
            type: "Qot_Common.KLine",
            id: 2
          },
          nextReqKey: {
            type: "bytes",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_RequestHistoryKLQuota: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotrequesthistoryklquota"
    },
    nested: {
      DetailItem: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 4
          },
          requestTime: {
            rule: "required",
            type: "string",
            id: 2
          },
          requestTimeStamp: {
            type: "int64",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          bGetDetail: {
            type: "bool",
            id: 2
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          usedQuota: {
            rule: "required",
            type: "int32",
            id: 1
          },
          remainQuota: {
            rule: "required",
            type: "int32",
            id: 2
          },
          detailList: {
            rule: "repeated",
            type: "DetailItem",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_RequestIndicatorCalc: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotrequestindicatorcalc"
    },
    nested: {
      IndicatorInputItem: {
        fields: {
          index: {
            rule: "required",
            type: "int32",
            id: 1
          },
          value: {
            type: "string",
            id: 2
          }
        }
      },
      IndicatorCalcData: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          klType: {
            rule: "required",
            type: "Qot_Common.KLType",
            id: 2
          },
          kLine: {
            rule: "repeated",
            type: "Qot_Common.KLine",
            id: 3
          }
        }
      },
      C2S: {
        fields: {
          shortName: {
            rule: "required",
            type: "string",
            id: 1
          },
          langType: {
            rule: "required",
            type: "Qot_Common.IndicatorLangType",
            id: 2
          },
          data: {
            rule: "required",
            type: "IndicatorCalcData",
            id: 3
          },
          num: {
            type: "int32",
            id: 4
          },
          inputs: {
            rule: "repeated",
            type: "IndicatorInputItem",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          calcId: {
            rule: "required",
            type: "string",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_RequestRehab: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotrequestrehab"
    },
    nested: {
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          rehabList: {
            rule: "repeated",
            type: "Qot_Common.Rehab",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_RequestTradeDate: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotrequesttradedate"
    },
    nested: {
      C2S: {
        fields: {
          market: {
            rule: "required",
            type: "int32",
            id: 1
          },
          beginTime: {
            rule: "required",
            type: "string",
            id: 2
          },
          endTime: {
            rule: "required",
            type: "string",
            id: 3
          },
          security: {
            type: "Qot_Common.Security",
            id: 4
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      TradeDate: {
        fields: {
          time: {
            rule: "required",
            type: "string",
            id: 1
          },
          timestamp: {
            type: "double",
            id: 2
          },
          tradeDateType: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          tradeDateList: {
            rule: "repeated",
            type: "TradeDate",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_SetOptionEventAlert: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      AlertOpType: {
        values: {
          AlertOpType_Unknown: 0,
          AlertOpType_Add: 1,
          AlertOpType_Delete: 2,
          AlertOpType_Modify: 3,
          AlertOpType_Enable: 4,
          AlertOpType_Disable: 5,
          AlertOpType_DeleteAll: 6
        }
      },
      C2S: {
        fields: {
          operType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          alertList: {
            rule: "repeated",
            type: "Qot_GetOptionEventAlert.EventAlertItem",
            id: 2
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_SetPriceReminder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotsetpricereminder"
    },
    nested: {
      SetPriceReminderOp: {
        values: {
          SetPriceReminderOp_Unknown: 0,
          SetPriceReminderOp_Add: 1,
          SetPriceReminderOp_Del: 2,
          SetPriceReminderOp_Enable: 3,
          SetPriceReminderOp_Disable: 4,
          SetPriceReminderOp_Modify: 5,
          SetPriceReminderOp_DelAll: 6
        }
      },
      C2S: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          op: {
            rule: "required",
            type: "int32",
            id: 2
          },
          key: {
            type: "int64",
            id: 3
          },
          type: {
            type: "int32",
            id: 4
          },
          freq: {
            type: "int32",
            id: 7
          },
          value: {
            type: "double",
            id: 5
          },
          note: {
            type: "string",
            id: 6
          },
          reminderSessionList: {
            rule: "repeated",
            type: "int32",
            id: 8,
            options: {
              packed: false
            }
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          key: {
            rule: "required",
            type: "int64",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_StockFilter: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotstockfilter"
    },
    nested: {
      StockField: {
        values: {
          StockField_Unknown: 0,
          StockField_StockCode: 1,
          StockField_StockName: 2,
          StockField_CurPrice: 3,
          StockField_CurPriceToHighest52WeeksRatio: 4,
          StockField_CurPriceToLowest52WeeksRatio: 5,
          StockField_HighPriceToHighest52WeeksRatio: 6,
          StockField_LowPriceToLowest52WeeksRatio: 7,
          StockField_VolumeRatio: 8,
          StockField_BidAskRatio: 9,
          StockField_LotPrice: 10,
          StockField_MarketVal: 11,
          StockField_PeAnnual: 12,
          StockField_PeTTM: 13,
          StockField_PbRate: 14,
          StockField_ChangeRate5min: 15,
          StockField_ChangeRateBeginYear: 16,
          StockField_PSTTM: 17,
          StockField_PCFTTM: 18,
          StockField_TotalShare: 19,
          StockField_FloatShare: 20,
          StockField_FloatMarketVal: 21
        }
      },
      AccumulateField: {
        values: {
          AccumulateField_Unknown: 0,
          AccumulateField_ChangeRate: 1,
          AccumulateField_Amplitude: 2,
          AccumulateField_Volume: 3,
          AccumulateField_Turnover: 4,
          AccumulateField_TurnoverRate: 5
        }
      },
      FinancialField: {
        values: {
          FinancialField_Unknown: 0,
          FinancialField_NetProfit: 1,
          FinancialField_NetProfitGrowth: 2,
          FinancialField_SumOfBusiness: 3,
          FinancialField_SumOfBusinessGrowth: 4,
          FinancialField_NetProfitRate: 5,
          FinancialField_GrossProfitRate: 6,
          FinancialField_DebtAssetsRate: 7,
          FinancialField_ReturnOnEquityRate: 8,
          FinancialField_ROIC: 9,
          FinancialField_ROATTM: 10,
          FinancialField_EBITTTM: 11,
          FinancialField_EBITDA: 12,
          FinancialField_OperatingMarginTTM: 13,
          FinancialField_EBITMargin: 14,
          FinancialField_EBITDAMargin: 15,
          FinancialField_FinancialCostRate: 16,
          FinancialField_OperatingProfitTTM: 17,
          FinancialField_ShareholderNetProfitTTM: 18,
          FinancialField_NetProfitCashCoverTTM: 19,
          FinancialField_CurrentRatio: 20,
          FinancialField_QuickRatio: 21,
          FinancialField_CurrentAssetRatio: 22,
          FinancialField_CurrentDebtRatio: 23,
          FinancialField_EquityMultiplier: 24,
          FinancialField_PropertyRatio: 25,
          FinancialField_CashAndCashEquivalents: 26,
          FinancialField_TotalAssetTurnover: 27,
          FinancialField_FixedAssetTurnover: 28,
          FinancialField_InventoryTurnover: 29,
          FinancialField_OperatingCashFlowTTM: 30,
          FinancialField_AccountsReceivable: 31,
          FinancialField_EBITGrowthRate: 32,
          FinancialField_OperatingProfitGrowthRate: 33,
          FinancialField_TotalAssetsGrowthRate: 34,
          FinancialField_ProfitToShareholdersGrowthRate: 35,
          FinancialField_ProfitBeforeTaxGrowthRate: 36,
          FinancialField_EPSGrowthRate: 37,
          FinancialField_ROEGrowthRate: 38,
          FinancialField_ROICGrowthRate: 39,
          FinancialField_NOCFGrowthRate: 40,
          FinancialField_NOCFPerShareGrowthRate: 41,
          FinancialField_OperatingRevenueCashCover: 42,
          FinancialField_OperatingProfitToTotalProfit: 43,
          FinancialField_BasicEPS: 44,
          FinancialField_DilutedEPS: 45,
          FinancialField_NOCFPerShare: 46
        }
      },
      CustomIndicatorField: {
        values: {
          CustomIndicatorField_Unknown: 0,
          CustomIndicatorField_Price: 1,
          CustomIndicatorField_MA5: 2,
          CustomIndicatorField_MA10: 3,
          CustomIndicatorField_MA20: 4,
          CustomIndicatorField_MA30: 5,
          CustomIndicatorField_MA60: 6,
          CustomIndicatorField_MA120: 7,
          CustomIndicatorField_MA250: 8,
          CustomIndicatorField_RSI: 9,
          CustomIndicatorField_EMA5: 10,
          CustomIndicatorField_EMA10: 11,
          CustomIndicatorField_EMA20: 12,
          CustomIndicatorField_EMA30: 13,
          CustomIndicatorField_EMA60: 14,
          CustomIndicatorField_EMA120: 15,
          CustomIndicatorField_EMA250: 16,
          CustomIndicatorField_Value: 17,
          CustomIndicatorField_MA: 30,
          CustomIndicatorField_EMA: 40,
          CustomIndicatorField_KDJ_K: 50,
          CustomIndicatorField_KDJ_D: 51,
          CustomIndicatorField_KDJ_J: 52,
          CustomIndicatorField_MACD_DIFF: 60,
          CustomIndicatorField_MACD_DEA: 61,
          CustomIndicatorField_MACD: 62,
          CustomIndicatorField_BOLL_UPPER: 70,
          CustomIndicatorField_BOLL_MIDDLER: 71,
          CustomIndicatorField_BOLL_LOWER: 72
        }
      },
      PatternField: {
        values: {
          PatternField_Unknown: 0,
          PatternField_MAAlignmentLong: 1,
          PatternField_MAAlignmentShort: 2,
          PatternField_EMAAlignmentLong: 3,
          PatternField_EMAAlignmentShort: 4,
          PatternField_RSIGoldCrossLow: 5,
          PatternField_RSIDeathCrossHigh: 6,
          PatternField_RSITopDivergence: 7,
          PatternField_RSIBottomDivergence: 8,
          PatternField_KDJGoldCrossLow: 9,
          PatternField_KDJDeathCrossHigh: 10,
          PatternField_KDJTopDivergence: 11,
          PatternField_KDJBottomDivergence: 12,
          PatternField_MACDGoldCrossLow: 13,
          PatternField_MACDDeathCrossHigh: 14,
          PatternField_MACDTopDivergence: 15,
          PatternField_MACDBottomDivergence: 16,
          PatternField_BOLLBreakUpper: 17,
          PatternField_BOLLLower: 18,
          PatternField_BOLLCrossMiddleUp: 19,
          PatternField_BOLLCrossMiddleDown: 20
        }
      },
      FinancialQuarter: {
        values: {
          FinancialQuarter_Unknown: 0,
          FinancialQuarter_Annual: 1,
          FinancialQuarter_FirstQuarter: 2,
          FinancialQuarter_Interim: 3,
          FinancialQuarter_ThirdQuarter: 4,
          FinancialQuarter_MostRecentQuarter: 5
        }
      },
      RelativePosition: {
        values: {
          RelativePosition_Unknown: 0,
          RelativePosition_More: 1,
          RelativePosition_Less: 2,
          RelativePosition_CrossUp: 3,
          RelativePosition_CrossDown: 4
        }
      },
      SortDir: {
        values: {
          SortDir_No: 0,
          SortDir_Ascend: 1,
          SortDir_Descend: 2
        }
      },
      BaseFilter: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          filterMin: {
            type: "double",
            id: 2
          },
          filterMax: {
            type: "double",
            id: 3
          },
          isNoFilter: {
            type: "bool",
            id: 4
          },
          sortDir: {
            type: "int32",
            id: 5
          }
        }
      },
      AccumulateFilter: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          filterMin: {
            type: "double",
            id: 2
          },
          filterMax: {
            type: "double",
            id: 3
          },
          isNoFilter: {
            type: "bool",
            id: 4
          },
          sortDir: {
            type: "int32",
            id: 5
          },
          days: {
            rule: "required",
            type: "int32",
            id: 6
          }
        }
      },
      FinancialFilter: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          filterMin: {
            type: "double",
            id: 2
          },
          filterMax: {
            type: "double",
            id: 3
          },
          isNoFilter: {
            type: "bool",
            id: 4
          },
          sortDir: {
            type: "int32",
            id: 5
          },
          quarter: {
            rule: "required",
            type: "int32",
            id: 6
          }
        }
      },
      PatternFilter: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          klType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          isNoFilter: {
            type: "bool",
            id: 3
          },
          consecutivePeriod: {
            type: "int32",
            id: 4
          }
        }
      },
      CustomIndicatorFilter: {
        fields: {
          firstFieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          secondFieldName: {
            rule: "required",
            type: "int32",
            id: 2
          },
          relativePosition: {
            rule: "required",
            type: "int32",
            id: 3
          },
          fieldValue: {
            type: "double",
            id: 4
          },
          klType: {
            rule: "required",
            type: "int32",
            id: 5
          },
          isNoFilter: {
            type: "bool",
            id: 6
          },
          firstFieldParaList: {
            rule: "repeated",
            type: "int32",
            id: 7,
            options: {
              packed: false
            }
          },
          secondFieldParaList: {
            rule: "repeated",
            type: "int32",
            id: 8,
            options: {
              packed: false
            }
          },
          consecutivePeriod: {
            type: "int32",
            id: 9
          }
        }
      },
      BaseData: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          value: {
            rule: "required",
            type: "double",
            id: 2
          }
        }
      },
      AccumulateData: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          value: {
            rule: "required",
            type: "double",
            id: 2
          },
          days: {
            rule: "required",
            type: "int32",
            id: 3
          }
        }
      },
      FinancialData: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          value: {
            rule: "required",
            type: "double",
            id: 2
          },
          quarter: {
            rule: "required",
            type: "int32",
            id: 3
          }
        }
      },
      CustomIndicatorData: {
        fields: {
          fieldName: {
            rule: "required",
            type: "int32",
            id: 1
          },
          value: {
            rule: "required",
            type: "double",
            id: 2
          },
          klType: {
            rule: "required",
            type: "int32",
            id: 3
          },
          fieldParaList: {
            rule: "repeated",
            type: "int32",
            id: 4,
            options: {
              packed: false
            }
          }
        }
      },
      StockData: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            rule: "required",
            type: "string",
            id: 2
          },
          baseDataList: {
            rule: "repeated",
            type: "BaseData",
            id: 3
          },
          accumulateDataList: {
            rule: "repeated",
            type: "AccumulateData",
            id: 4
          },
          financialDataList: {
            rule: "repeated",
            type: "FinancialData",
            id: 5
          },
          customIndicatorDataList: {
            rule: "repeated",
            type: "CustomIndicatorData",
            id: 6
          }
        }
      },
      C2S: {
        fields: {
          begin: {
            rule: "required",
            type: "int32",
            id: 1
          },
          num: {
            rule: "required",
            type: "int32",
            id: 2
          },
          market: {
            rule: "required",
            type: "int32",
            id: 3
          },
          plate: {
            type: "Qot_Common.Security",
            id: 4
          },
          baseFilterList: {
            rule: "repeated",
            type: "BaseFilter",
            id: 5
          },
          accumulateFilterList: {
            rule: "repeated",
            type: "AccumulateFilter",
            id: 6
          },
          financialFilterList: {
            rule: "repeated",
            type: "FinancialFilter",
            id: 7
          },
          patternFilterList: {
            rule: "repeated",
            type: "PatternFilter",
            id: 8
          },
          customIndicatorFilterList: {
            rule: "repeated",
            type: "CustomIndicatorFilter",
            id: 9
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {
          lastPage: {
            rule: "required",
            type: "bool",
            id: 1
          },
          allCount: {
            rule: "required",
            type: "int32",
            id: 2
          },
          dataList: {
            rule: "repeated",
            type: "StockData",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_StockScreen: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotstockscreen"
    },
    nested: {
      Boundary: {
        fields: {
          value: {
            rule: "required",
            type: "double",
            id: 1
          },
          includes: {
            rule: "required",
            type: "bool",
            id: 2
          }
        }
      },
      Interval: {
        fields: {
          filterMin: {
            type: "Boundary",
            id: 1
          },
          filterMax: {
            type: "Boundary",
            id: 2
          },
          unit: {
            type: "int32",
            id: 3
          }
        }
      },
      Param: {
        fields: {
          type: {
            type: "int32",
            id: 1
          },
          sval: {
            type: "string",
            id: 2
          },
          ival: {
            type: "int64",
            id: 3
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 4,
            options: {
              packed: false
            }
          }
        }
      },
      PropertyBasic: {
        fields: {
          name: {
            type: "int32",
            id: 1
          }
        }
      },
      PropertySimple: {
        fields: {
          name: {
            type: "int32",
            id: 1
          }
        }
      },
      PropertyCumulative: {
        fields: {
          name: {
            type: "int32",
            id: 1
          },
          days: {
            type: "uint32",
            id: 2
          },
          periodAverage: {
            type: "int32",
            id: 3
          }
        }
      },
      PropertyFinancial: {
        fields: {
          name: {
            type: "int32",
            id: 1
          },
          term: {
            type: "int32",
            id: 2
          },
          duration: {
            type: "int64",
            id: 3
          },
          year: {
            type: "int32",
            id: 4
          },
          periodAverage: {
            type: "int32",
            id: 5
          },
          futureDuration: {
            type: "int32",
            id: 6
          }
        }
      },
      PropertyIndicator: {
        fields: {
          name: {
            type: "int32",
            id: 1
          },
          period: {
            type: "int32",
            id: 2
          },
          indicatorParams: {
            rule: "repeated",
            type: "int64",
            id: 3,
            options: {
              packed: false
            }
          }
        }
      },
      PropertyFeatured: {
        fields: {
          name: {
            type: "int32",
            id: 1
          },
          period: {
            type: "int32",
            id: 2
          },
          rangePeriod: {
            type: "int32",
            id: 3
          },
          firstCustomParam: {
            type: "int64",
            id: 4
          }
        }
      },
      PropertyBroker: {
        fields: {
          name: {
            type: "int32",
            id: 1
          },
          days: {
            type: "int32",
            id: 2
          },
          param: {
            type: "string",
            id: 3
          }
        }
      },
      PropertyOption: {
        fields: {
          name: {
            type: "int32",
            id: 1
          },
          param: {
            type: "Param",
            id: 2
          },
          period: {
            type: "int32",
            id: 3
          }
        }
      },
      PropertyKlineShape: {
        fields: {
          name: {
            type: "int32",
            id: 1
          },
          period: {
            type: "int32",
            id: 2
          }
        }
      },
      QuerySimpleField: {
        fields: {
          simpleField: {
            type: "int32",
            id: 1
          },
          screenValueList: {
            rule: "repeated",
            type: "int64",
            id: 2,
            options: {
              packed: false
            }
          }
        }
      },
      Plate: {
        fields: {
          parentPlateId: {
            type: "string",
            id: 1
          },
          plateIdList: {
            rule: "repeated",
            type: "string",
            id: 2
          }
        }
      },
      QueryPlate: {
        fields: {
          plateList: {
            rule: "repeated",
            type: "Plate",
            id: 1
          }
        }
      },
      QueryPropertySimple: {
        fields: {
          property: {
            rule: "required",
            type: "PropertySimple",
            id: 1
          },
          filterMin: {
            type: "Boundary",
            id: 2
          },
          filterMax: {
            type: "Boundary",
            id: 3
          },
          unit: {
            type: "int32",
            id: 4
          }
        }
      },
      QueryPropertyCumulative: {
        fields: {
          property: {
            rule: "required",
            type: "PropertyCumulative",
            id: 1
          },
          filterMin: {
            type: "Boundary",
            id: 2
          },
          filterMax: {
            type: "Boundary",
            id: 3
          },
          continuousPeriod: {
            type: "int32",
            id: 4
          },
          unit: {
            type: "int32",
            id: 5
          }
        }
      },
      QueryPropertyFinancial: {
        fields: {
          property: {
            rule: "required",
            type: "PropertyFinancial",
            id: 1
          },
          filterMin: {
            type: "Boundary",
            id: 2
          },
          filterMax: {
            type: "Boundary",
            id: 3
          },
          continuousPeriod: {
            type: "int32",
            id: 4
          },
          unit: {
            type: "int32",
            id: 7
          }
        }
      },
      QueryIndicatorPositional: {
        fields: {
          position: {
            rule: "required",
            type: "int32",
            id: 1
          },
          period: {
            rule: "required",
            type: "int32",
            id: 2
          },
          firstIndicator: {
            rule: "required",
            type: "int32",
            id: 3
          },
          secondIndicator: {
            type: "int32",
            id: 4
          },
          secondValue: {
            type: "int64",
            id: 5
          },
          firstIndicatorParams: {
            rule: "repeated",
            type: "int64",
            id: 6,
            options: {
              packed: false
            }
          },
          secondIndicatorParams: {
            rule: "repeated",
            type: "int64",
            id: 7,
            options: {
              packed: false
            }
          },
          continuousPeriod: {
            type: "int32",
            id: 8
          },
          intervals: {
            rule: "repeated",
            type: "Interval",
            id: 10
          },
          firstIndicatorName: {
            type: "int32",
            id: 11
          },
          periodType: {
            type: "int32",
            id: 12
          }
        }
      },
      QueryIndicatorPattern: {
        fields: {
          pattern: {
            type: "int32",
            id: 1
          },
          period: {
            rule: "required",
            type: "int32",
            id: 2
          },
          continuousPeriod: {
            type: "int32",
            id: 3
          },
          name: {
            type: "int32",
            id: 4
          },
          isMatching: {
            type: "bool",
            id: 5
          },
          subPatterns: {
            rule: "repeated",
            type: "int32",
            id: 6,
            options: {
              packed: false
            }
          },
          periodType: {
            type: "int32",
            id: 7
          }
        }
      },
      QueryPropertyFeatured: {
        fields: {
          property: {
            type: "PropertyFeatured",
            id: 1
          },
          filterMin: {
            type: "Boundary",
            id: 2
          },
          filterMax: {
            type: "Boundary",
            id: 3
          },
          intervals: {
            rule: "repeated",
            type: "Interval",
            id: 4
          },
          valueSet: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          }
        }
      },
      QueryPropertyBroker: {
        fields: {
          property: {
            type: "PropertyBroker",
            id: 1
          },
          intervals: {
            rule: "repeated",
            type: "Interval",
            id: 2
          }
        }
      },
      QueryPropertyOption: {
        fields: {
          property: {
            type: "PropertyOption",
            id: 1
          },
          intervals: {
            rule: "repeated",
            type: "Interval",
            id: 2
          }
        }
      },
      QueryKlineShape: {
        fields: {
          property: {
            type: "PropertyKlineShape",
            id: 1
          },
          valueSet: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          }
        }
      },
      ScreenQuery: {
        fields: {
          simpleFieldQuery: {
            type: "QuerySimpleField",
            id: 1
          },
          plateQuery: {
            type: "QueryPlate",
            id: 2
          },
          simplePropertyQuery: {
            type: "QueryPropertySimple",
            id: 3
          },
          cumulativePropertyQuery: {
            type: "QueryPropertyCumulative",
            id: 4
          },
          financialPropertyQuery: {
            type: "QueryPropertyFinancial",
            id: 5
          },
          indicatorPositionalQuery: {
            type: "QueryIndicatorPositional",
            id: 6
          },
          indicatorPatternQuery: {
            type: "QueryIndicatorPattern",
            id: 7
          },
          featuredPropertyQuery: {
            type: "QueryPropertyFeatured",
            id: 8
          },
          brokerHoldingsQuery: {
            type: "QueryPropertyBroker",
            id: 9
          },
          klineShapeQuery: {
            type: "QueryKlineShape",
            id: 10
          },
          optionQuery: {
            type: "QueryPropertyOption",
            id: 11
          }
        }
      },
      RetrieveQuery: {
        fields: {
          basicProperty: {
            type: "PropertyBasic",
            id: 1
          },
          simpleProperty: {
            type: "PropertySimple",
            id: 2
          },
          cumulativeProperty: {
            type: "PropertyCumulative",
            id: 3
          },
          financialProperty: {
            type: "PropertyFinancial",
            id: 4
          },
          indicatorProperty: {
            type: "PropertyIndicator",
            id: 5
          },
          featuredProperty: {
            type: "PropertyFeatured",
            id: 6
          },
          brokerProperty: {
            type: "PropertyBroker",
            id: 7
          },
          optionProperty: {
            type: "PropertyOption",
            id: 8
          },
          klineShapeProperty: {
            type: "PropertyKlineShape",
            id: 9
          }
        }
      },
      Sort: {
        fields: {
          direction: {
            rule: "required",
            type: "int32",
            id: 1
          },
          basicProperty: {
            type: "PropertyBasic",
            id: 2
          },
          simpleProperty: {
            type: "PropertySimple",
            id: 3
          },
          cumulativeProperty: {
            type: "PropertyCumulative",
            id: 4
          },
          financialProperty: {
            type: "PropertyFinancial",
            id: 5
          },
          indicatorProperty: {
            type: "PropertyIndicator",
            id: 6
          },
          featuredProperty: {
            type: "PropertyFeatured",
            id: 7
          },
          brokerProperty: {
            type: "PropertyBroker",
            id: 8
          },
          optionProperty: {
            type: "PropertyOption",
            id: 9
          },
          klineShapeProperty: {
            type: "PropertyKlineShape",
            id: 10
          }
        }
      },
      ResultPropertyBasic: {
        fields: {
          property: {
            type: "PropertyBasic",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      ResultPropertySimple: {
        fields: {
          property: {
            type: "PropertySimple",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      ResultPropertyCumulative: {
        fields: {
          property: {
            type: "PropertyCumulative",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      ResultPropertyFinancial: {
        fields: {
          property: {
            type: "PropertyFinancial",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          endTime: {
            type: "uint32",
            id: 7
          },
          enumTypeName: {
            type: "string",
            id: 8
          },
          enumName: {
            type: "string",
            id: 9
          }
        }
      },
      ResultPropertyIndicator: {
        fields: {
          property: {
            type: "PropertyIndicator",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      ResultPropertyFeatured: {
        fields: {
          property: {
            type: "PropertyFeatured",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      ResultPropertyKlineShape: {
        fields: {
          property: {
            type: "PropertyKlineShape",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      ResultPropertyBroker: {
        fields: {
          property: {
            type: "PropertyBroker",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      ResultPropertyOption: {
        fields: {
          property: {
            type: "PropertyOption",
            id: 1
          },
          valueType: {
            type: "int32",
            id: 2
          },
          sval: {
            type: "string",
            id: 3
          },
          ival: {
            type: "int64",
            id: 4
          },
          aval: {
            rule: "repeated",
            type: "int64",
            id: 5,
            options: {
              packed: false
            }
          },
          dval: {
            type: "double",
            id: 6
          },
          enumTypeName: {
            type: "string",
            id: 7
          },
          enumName: {
            type: "string",
            id: 8
          }
        }
      },
      RspItemResult: {
        fields: {
          basicPropertyResult: {
            type: "ResultPropertyBasic",
            id: 1
          },
          simplePropertyResult: {
            type: "ResultPropertySimple",
            id: 2
          },
          cumulativePropertyResult: {
            type: "ResultPropertyCumulative",
            id: 3
          },
          financialPropertyResult: {
            type: "ResultPropertyFinancial",
            id: 4
          },
          indicatorPropertyResult: {
            type: "ResultPropertyIndicator",
            id: 5
          },
          featuredPropertyResult: {
            type: "ResultPropertyFeatured",
            id: 6
          },
          brokerPropertyResult: {
            type: "ResultPropertyBroker",
            id: 7
          },
          optionPropertyResult: {
            type: "ResultPropertyOption",
            id: 8
          },
          klineShapePropertyResult: {
            type: "ResultPropertyKlineShape",
            id: 9
          }
        }
      },
      StockScreenItem: {
        fields: {
          stockId: {
            type: "uint64",
            id: 1
          },
          results: {
            rule: "repeated",
            type: "RspItemResult",
            id: 2
          }
        }
      },
      C2S: {
        fields: {
          filterList: {
            rule: "repeated",
            type: "ScreenQuery",
            id: 1
          },
          retrieveList: {
            rule: "repeated",
            type: "RetrieveQuery",
            id: 2
          },
          watchlistStockIds: {
            rule: "repeated",
            type: "uint64",
            id: 3,
            options: {
              packed: false
            }
          },
          sort: {
            type: "Sort",
            id: 4
          },
          pageFrom: {
            type: "int32",
            id: 5
          },
          pageCount: {
            type: "int32",
            id: 6
          },
          sortList: {
            rule: "repeated",
            type: "Sort",
            id: 9
          }
        }
      },
      S2C: {
        fields: {
          dataList: {
            rule: "repeated",
            type: "StockScreenItem",
            id: 2
          },
          lastPage: {
            type: "int32",
            id: 3
          },
          allCount: {
            type: "int32",
            id: 4
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_Sub: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotsub"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          subTypeList: {
            rule: "repeated",
            type: "int32",
            id: 2,
            options: {
              packed: false
            }
          },
          isSubOrUnSub: {
            rule: "required",
            type: "bool",
            id: 3
          },
          isRegOrUnRegPush: {
            type: "bool",
            id: 4
          },
          regPushRehabTypeList: {
            rule: "repeated",
            type: "int32",
            id: 5,
            options: {
              packed: false
            }
          },
          isFirstPush: {
            type: "bool",
            id: 6
          },
          isUnsubAll: {
            type: "bool",
            id: 7
          },
          isSubOrderBookDetail: {
            type: "bool",
            id: 8
          },
          extendedTime: {
            type: "bool",
            id: 9
          },
          session: {
            type: "int32",
            id: 10
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_SubEventContract: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotsubeventcontract"
    },
    nested: {
      C2S: {
        fields: {
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 1
          },
          subTypeList: {
            rule: "repeated",
            type: "int32",
            id: 2,
            options: {
              packed: false
            }
          },
          isSubOrUnSub: {
            rule: "required",
            type: "bool",
            id: 3
          },
          isRegOrUnRegPush: {
            type: "bool",
            id: 4
          },
          isFirstPush: {
            type: "bool",
            id: 5
          },
          isUnsubAll: {
            type: "bool",
            id: 6
          },
          klineSource: {
            rule: "repeated",
            type: "Qot_Common.EC_KlineSource",
            id: 7,
            options: {
              packed: false
            }
          },
          header: {
            type: "Qot_Common.QotHeader",
            id: 100
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateBasicQot: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdatebasicqot"
    },
    nested: {
      S2C: {
        fields: {
          basicQotList: {
            rule: "repeated",
            type: "Qot_Common.BasicQot",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateBroker: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdatebroker"
    },
    nested: {
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 4
          },
          brokerAskList: {
            rule: "repeated",
            type: "Qot_Common.Broker",
            id: 2
          },
          brokerBidList: {
            rule: "repeated",
            type: "Qot_Common.Broker",
            id: 3
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateEventContractKline: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdateeventcontractkline"
    },
    nested: {
      S2C: {
        fields: {
          klineList: {
            rule: "repeated",
            type: "Qot_GetEventContractKline.KlineItem",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateEventContractOrderBook: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdateeventcontractorderbook"
    },
    nested: {
      S2C: {
        fields: {
          orderBookList: {
            rule: "repeated",
            type: "Qot_GetEventContractOrderBook.OrderBookItem",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateEventContractTicker: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdateeventcontractticker"
    },
    nested: {
      S2C: {
        fields: {
          tickerList: {
            rule: "repeated",
            type: "Qot_GetEventContractTicker.TickerItem",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateKL: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdatekl"
    },
    nested: {
      S2C: {
        fields: {
          rehabType: {
            rule: "required",
            type: "int32",
            id: 1
          },
          klType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 3
          },
          name: {
            type: "string",
            id: 5
          },
          klList: {
            rule: "repeated",
            type: "Qot_Common.KLine",
            id: 4
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateOptionEvent: {
    options: {
      java_package: "com.futu.openapi.pb"
    },
    nested: {
      S2C: {
        fields: {
          owner: {
            type: "Qot_Common.Security",
            id: 1
          },
          option: {
            type: "Qot_Common.Security",
            id: 2
          },
          message: {
            type: "string",
            id: 3
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateOrderBook: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdateorderbook"
    },
    nested: {
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 8
          },
          orderBookAskList: {
            rule: "repeated",
            type: "Qot_Common.OrderBook",
            id: 2
          },
          orderBookBidList: {
            rule: "repeated",
            type: "Qot_Common.OrderBook",
            id: 3
          },
          svrRecvTimeBid: {
            type: "string",
            id: 4
          },
          svrRecvTimeBidTimestamp: {
            type: "double",
            id: 5
          },
          svrRecvTimeAsk: {
            type: "string",
            id: 6
          },
          svrRecvTimeAskTimestamp: {
            type: "double",
            id: 7
          },
          orderBookType: {
            type: "int32",
            id: 9
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdatePriceReminder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdatepricereminder"
    },
    nested: {
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 11
          },
          price: {
            rule: "required",
            type: "double",
            id: 2
          },
          changeRate: {
            rule: "required",
            type: "double",
            id: 3
          },
          marketStatus: {
            rule: "required",
            type: "int32",
            id: 4
          },
          content: {
            rule: "required",
            type: "string",
            id: 5
          },
          note: {
            rule: "required",
            type: "string",
            id: 6
          },
          key: {
            type: "int64",
            id: 7
          },
          type: {
            type: "int32",
            id: 8
          },
          setValue: {
            type: "double",
            id: 9
          },
          curValue: {
            type: "double",
            id: 10
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateRT: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdatert"
    },
    nested: {
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 3
          },
          rtList: {
            rule: "repeated",
            type: "Qot_Common.TimeShare",
            id: 2
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_UpdateTicker: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotupdateticker"
    },
    nested: {
      S2C: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          name: {
            type: "string",
            id: 3
          },
          tickerList: {
            rule: "repeated",
            type: "Qot_Common.Ticker",
            id: 2
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Qot_WarrantScreen: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/qotwarrantscreen"
    },
    nested: {
      Boundary: {
        fields: {
          value: {
            type: "double",
            id: 1
          },
          includes: {
            type: "bool",
            id: 2
          }
        }
      },
      Interval: {
        fields: {
          filterMin: {
            type: "Boundary",
            id: 1
          },
          filterMax: {
            type: "Boundary",
            id: 2
          },
          unit: {
            type: "int32",
            id: 3
          }
        }
      },
      Choice: {
        fields: {
          contentType: {
            type: "int32",
            id: 1
          },
          text: {
            type: "string",
            id: 2
          },
          value: {
            type: "int64",
            id: 3
          }
        }
      },
      ScreenGroup: {
        fields: {
          fieldId: {
            type: "int32",
            id: 1
          },
          interval: {
            type: "Interval",
            id: 2
          },
          choices: {
            rule: "repeated",
            type: "Choice",
            id: 3
          }
        }
      },
      Sort: {
        fields: {
          sortFieldId: {
            type: "int32",
            id: 1
          },
          direction: {
            type: "int32",
            id: 2
          }
        }
      },
      WarrantItem: {
        fields: {
          stockId: {
            type: "uint64",
            id: 1
          },
          stockOwner: {
            type: "uint64",
            id: 2
          },
          issuerId: {
            type: "uint32",
            id: 3
          },
          warrantType: {
            type: "int32",
            id: 4
          },
          strikePrice: {
            type: "double",
            id: 5
          },
          maturityDate: {
            type: "uint64",
            id: 6
          },
          lastTradeDate: {
            type: "uint64",
            id: 7
          },
          conversionRatio: {
            type: "double",
            id: 8
          },
          lastclosePrice: {
            type: "double",
            id: 9
          },
          recoveryPrice: {
            type: "double",
            id: 10
          },
          stockOwnerPrice: {
            type: "double",
            id: 20
          },
          currentPrice: {
            type: "double",
            id: 21
          },
          volume: {
            type: "uint64",
            id: 22
          },
          turnover: {
            type: "double",
            id: 23
          },
          sellVol: {
            type: "uint64",
            id: 24
          },
          buyVol: {
            type: "uint64",
            id: 25
          },
          sellPrice: {
            type: "double",
            id: 26
          },
          buyPrice: {
            type: "double",
            id: 27
          },
          streetRate: {
            type: "double",
            id: 28
          },
          highPrice: {
            type: "double",
            id: 29
          },
          lowPrice: {
            type: "double",
            id: 30
          },
          impliedVolatility: {
            type: "double",
            id: 31
          },
          delta: {
            type: "double",
            id: 32
          },
          status: {
            type: "int32",
            id: 33
          },
          streetRateNew: {
            type: "double",
            id: 34
          },
          score: {
            type: "double",
            id: 35
          },
          premium: {
            type: "double",
            id: 36
          },
          leverage: {
            type: "double",
            id: 37
          },
          effectiveLeverage: {
            type: "double",
            id: 38
          },
          breakEvenPoint: {
            type: "double",
            id: 39
          },
          ipop: {
            type: "double",
            id: 40
          },
          amplitude: {
            type: "double",
            id: 41
          },
          fxScore: {
            type: "double",
            id: 42
          },
          ipoTime: {
            type: "uint64",
            id: 43
          },
          streetVol: {
            type: "uint64",
            id: 44
          },
          lotSize: {
            type: "uint32",
            id: 45
          },
          issueSize: {
            type: "uint64",
            id: 46
          },
          ipoPrice: {
            type: "double",
            id: 47
          },
          upperStrikePrice: {
            type: "double",
            id: 48
          },
          lowerStrikePrice: {
            type: "double",
            id: 49
          },
          iwPriceStatus: {
            type: "uint32",
            id: 50
          },
          sensitivity: {
            type: "double",
            id: 51
          },
          priceRecoveryRatio: {
            type: "double",
            id: 52
          },
          security: {
            type: "Qot_Common.Security",
            id: 100
          },
          ownerSecurity: {
            type: "Qot_Common.Security",
            id: 101
          },
          name: {
            type: "string",
            id: 102
          },
          ownerName: {
            type: "string",
            id: 103
          }
        }
      },
      C2S: {
        fields: {
          marketType: {
            type: "int32",
            id: 1
          },
          isDelay: {
            type: "bool",
            id: 2
          },
          filterList: {
            rule: "repeated",
            type: "ScreenGroup",
            id: 3
          },
          sortList: {
            rule: "repeated",
            type: "Sort",
            id: 4
          },
          onlyCount: {
            type: "bool",
            id: 5
          },
          pageFrom: {
            type: "int32",
            id: 6
          },
          pageCount: {
            type: "int32",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          warrants: {
            rule: "repeated",
            type: "WarrantItem",
            id: 3
          },
          lastPage: {
            type: "bool",
            id: 4
          },
          allCount: {
            type: "int32",
            id: 5
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  SkillWrapAPI: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/skillwrapapi",
      py_generic_services: true
    },
    nested: {
      TechnicalUnusualReq: {
        fields: {
          stockSymbol: {
            type: "string",
            id: 1
          },
          timeRange: {
            type: "int32",
            id: 2
          },
          indicatorFilters: {
            rule: "repeated",
            type: "string",
            id: 3
          },
          languageId: {
            type: "int32",
            id: 4
          }
        }
      },
      TechnicalUnusualRsp: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          timeRange: {
            type: "string",
            id: 4
          },
          content: {
            type: "string",
            id: 5
          }
        }
      },
      FinancialUnusualReq: {
        fields: {
          stockSymbol: {
            type: "string",
            id: 1
          },
          timeRange: {
            type: "int32",
            id: 2
          },
          analysisDimensions: {
            rule: "repeated",
            type: "string",
            id: 3
          },
          languageId: {
            type: "int32",
            id: 4
          }
        }
      },
      FinancialUnusualRsp: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          timeRange: {
            type: "string",
            id: 4
          },
          content: {
            type: "string",
            id: 5
          }
        }
      },
      DerivativeUnusualReq: {
        fields: {
          stockSymbol: {
            type: "string",
            id: 1
          },
          timeRange: {
            type: "int32",
            id: 2
          },
          analysisDimensions: {
            rule: "repeated",
            type: "string",
            id: 3
          },
          languageId: {
            type: "int32",
            id: 4
          }
        }
      },
      DerivativeUnusualRsp: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          timeRange: {
            type: "string",
            id: 4
          },
          content: {
            type: "string",
            id: 5
          }
        }
      }
    }
  },
  TestCmd: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/testcmd"
    },
    nested: {
      C2S: {
        fields: {
          cmd: {
            rule: "required",
            type: "string",
            id: 1
          },
          paramStr: {
            type: "string",
            id: 2
          },
          paramBytes: {
            type: "bytes",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          cmd: {
            rule: "required",
            type: "string",
            id: 1
          },
          resultStr: {
            type: "string",
            id: 2
          },
          resultBytes: {
            type: "bytes",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_Common: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdcommon"
    },
    nested: {
      TrdEnv: {
        values: {
          TrdEnv_Simulate: 0,
          TrdEnv_Real: 1
        }
      },
      TrdCategory: {
        values: {
          TrdCategory_Unknown: 0,
          TrdCategory_Security: 1,
          TrdCategory_Future: 2,
          TrdCategory_Crypto: 3
        }
      },
      TrdMarket: {
        values: {
          TrdMarket_Unknown: 0,
          TrdMarket_HK: 1,
          TrdMarket_US: 2,
          TrdMarket_CN: 3,
          TrdMarket_HKCC: 4,
          TrdMarket_Futures: 5,
          TrdMarket_SG: 6,
          TrdMarket_Crypto: 7,
          TrdMarket_AU: 8,
          TrdMarket_Futures_Simulate_HK: 10,
          TrdMarket_Futures_Simulate_US: 11,
          TrdMarket_Futures_Simulate_SG: 12,
          TrdMarket_Futures_Simulate_JP: 13,
          TrdMarket_JP: 15,
          TrdMarket_Prediction: 17,
          TrdMarket_MY: 111,
          TrdMarket_CA: 112,
          TrdMarket_HK_Fund: 113,
          TrdMarket_US_Fund: 123,
          TrdMarket_SG_Fund: 124,
          TrdMarket_MY_Fund: 125,
          TrdMarket_JP_Fund: 126
        }
      },
      TrdSecMarket: {
        values: {
          TrdSecMarket_Unknown: 0,
          TrdSecMarket_HK: 1,
          TrdSecMarket_US: 2,
          TrdSecMarket_CN_SH: 31,
          TrdSecMarket_CN_SZ: 32,
          TrdSecMarket_SG: 41,
          TrdSecMarket_JP: 51,
          TrdSecMarket_AU: 61,
          TrdSecMarket_MY: 71,
          TrdSecMarket_CA: 81,
          TrdSecMarket_FX: 91,
          TrdSecMarket_CC: 101,
          TrdSecMarket_EC: 111
        }
      },
      TrdSide: {
        values: {
          TrdSide_Unknown: 0,
          TrdSide_Buy: 1,
          TrdSide_Sell: 2,
          TrdSide_SellShort: 3,
          TrdSide_BuyBack: 4
        }
      },
      OrderType: {
        values: {
          OrderType_Unknown: 0,
          OrderType_Normal: 1,
          OrderType_Market: 2,
          OrderType_AbsoluteLimit: 5,
          OrderType_Auction: 6,
          OrderType_AuctionLimit: 7,
          OrderType_SpecialLimit: 8,
          OrderType_SpecialLimit_All: 9,
          OrderType_Stop: 10,
          OrderType_StopLimit: 11,
          OrderType_MarketifTouched: 12,
          OrderType_LimitifTouched: 13,
          OrderType_TrailingStop: 14,
          OrderType_TrailingStopLimit: 15,
          OrderType_TWAP_MARKET: 16,
          OrderType_TWAP_LIMIT: 17,
          OrderType_VWAP_MARKET: 18,
          OrderType_VWAP_LIMIT: 19
        }
      },
      TrailType: {
        values: {
          TrailType_Unknown: 0,
          TrailType_Ratio: 1,
          TrailType_Amount: 2
        }
      },
      OrderStatus: {
        values: {
          OrderStatus_Unsubmitted: 0,
          OrderStatus_Unknown: -1,
          OrderStatus_WaitingSubmit: 1,
          OrderStatus_Submitting: 2,
          OrderStatus_SubmitFailed: 3,
          OrderStatus_TimeOut: 4,
          OrderStatus_Submitted: 5,
          OrderStatus_Filled_Part: 10,
          OrderStatus_Filled_All: 11,
          OrderStatus_Cancelling_Part: 12,
          OrderStatus_Cancelling_All: 13,
          OrderStatus_Cancelled_Part: 14,
          OrderStatus_Cancelled_All: 15,
          OrderStatus_Failed: 21,
          OrderStatus_Disabled: 22,
          OrderStatus_Deleted: 23,
          OrderStatus_FillCancelled: 24
        }
      },
      OrderFillStatus: {
        values: {
          OrderFillStatus_OK: 0,
          OrderFillStatus_Cancelled: 1,
          OrderFillStatus_Changed: 2,
          OrderFillStatus_Payout: 3
        }
      },
      PositionSide: {
        values: {
          PositionSide_Long: 0,
          PositionSide_Unknown: -1,
          PositionSide_Short: 1
        }
      },
      ModifyOrderOp: {
        values: {
          ModifyOrderOp_Unknown: 0,
          ModifyOrderOp_Normal: 1,
          ModifyOrderOp_Cancel: 2,
          ModifyOrderOp_Disable: 3,
          ModifyOrderOp_Enable: 4,
          ModifyOrderOp_Delete: 5
        }
      },
      TrdAccType: {
        values: {
          TrdAccType_Unknown: 0,
          TrdAccType_Cash: 1,
          TrdAccType_Margin: 2,
          TrdAccType_TFSA: 3,
          TrdAccType_RRSP: 4,
          TrdAccType_SRRSP: 5,
          TrdAccType_Derivatives: 6
        }
      },
      TrdAccStatus: {
        values: {
          TrdAccStatus_Active: 0,
          TrdAccStatus_Disabled: 1
        }
      },
      TrdAccRole: {
        values: {
          TrdAccRole_Unknown: 0,
          TrdAccRole_Normal: 1,
          TrdAccRole_Master: 2,
          TrdAccRole_IPO: 3
        }
      },
      Currency: {
        values: {
          Currency_Unknown: 0,
          Currency_HKD: 1,
          Currency_USD: 2,
          Currency_CNH: 3,
          Currency_JPY: 4,
          Currency_SGD: 5,
          Currency_AUD: 6,
          Currency_CAD: 7,
          Currency_MYR: 8,
          Currency_NZD: 9
        }
      },
      CltRiskLevel: {
        values: {
          CltRiskLevel_Unknown: -1,
          CltRiskLevel_Safe: 0,
          CltRiskLevel_Warning: 1,
          CltRiskLevel_Danger: 2,
          CltRiskLevel_AbsoluteSafe: 3,
          CltRiskLevel_OptDanger: 4
        }
      },
      TimeInForce: {
        values: {
          TimeInForce_DAY: 0,
          TimeInForce_GTC: 1,
          TimeInForce_IOC: 2,
          TimeInForce_GTD: 3
        }
      },
      SimAccType: {
        values: {
          SimAccType_Unknown: 0,
          SimAccType_Stock: 1,
          SimAccType_Option: 2,
          SimAccType_Futures: 3,
          SimAccType_StockAndOption: 4,
          SimAccType_Competition: 5
        }
      },
      CltRiskStatus: {
        values: {
          CltRiskStatus_Unknown: 0,
          CltRiskStatus_Level1: 1,
          CltRiskStatus_Level2: 2,
          CltRiskStatus_Level3: 3,
          CltRiskStatus_Level4: 4,
          CltRiskStatus_Level5: 5,
          CltRiskStatus_Level6: 6,
          CltRiskStatus_Level7: 7,
          CltRiskStatus_Level8: 8,
          CltRiskStatus_Level9: 9
        }
      },
      DTStatus: {
        values: {
          DTStatus_Unknown: 0,
          DTStatus_Unlimited: 1,
          DTStatus_EMCall: 2,
          DTStatus_DTCall: 3
        }
      },
      TrdSubAccType: {
        values: {
          TrdSubAccType_None: 0,
          TrdSubAccType_JP_GENERAL: 1,
          TrdSubAccType_JP_TOKUTEI: 2,
          TrdSubAccType_JP_NISA_GENERAL: 3,
          TrdSubAccType_JP_NISA_TSUMITATE: 4,
          TrdSubAccType_JP_GENERAL_SHORT: 5,
          TrdSubAccType_JP_TOKUTEI_SHORT: 6,
          TrdSubAccType_JP_HONPO_GENERAL: 7,
          TrdSubAccType_JP_GAIKOKU_GENERAL: 8,
          TrdSubAccType_JP_HONPO_TOKUTEI: 9,
          TrdSubAccType_JP_GAIKOKU_TOKUTEI: 10,
          TrdSubAccType_JP_DERIVATIVE_LONG: 11,
          TrdSubAccType_JP_DERIVATIVE_SHORT: 12,
          TrdSubAccType_JP_HONPO_DERIVATIVE_GENERAL: 13,
          TrdSubAccType_JP_GAIKOKU_DERIVATIVE_GENERAL: 14,
          TrdSubAccType_JP_HONPO_DERIVATIVE_TOKUTEI: 15,
          TrdSubAccType_JP_GAIKOKU_DERIVATIVE_TOKUTEI: 16
        }
      },
      TrdAssetCategory: {
        values: {
          TrdAssetCategory_Unknown: 0,
          TrdAssetCategory_JP: 1,
          TrdAssetCategory_US: 2
        }
      },
      ExposureLevel: {
        values: {
          ExposureLevel_Unknown: 0,
          ExposureLevel_Normal: 1,
          ExposureLevel_NearLimit: 2,
          ExposureLevel_Restricted: 3,
          ExposureLevel_Safe: 4,
          ExposureLevel_Moderate: 5,
          ExposureLevel_Warning: 6,
          ExposureLevel_MarginCall: 7
        }
      },
      PositionType: {
        values: {
          PositionType_Unknown: 0,
          PositionType_Combined: 1,
          PositionType_Leg: 2
        }
      },
      AccCashInfo: {
        fields: {
          currency: {
            type: "int32",
            id: 1
          },
          cash: {
            type: "double",
            id: 2
          },
          availableBalance: {
            type: "double",
            id: 3
          },
          netCashPower: {
            type: "double",
            id: 4
          }
        }
      },
      AccMarketInfo: {
        fields: {
          trdMarket: {
            type: "int32",
            id: 1
          },
          assets: {
            type: "double",
            id: 2
          }
        }
      },
      TrdHeader: {
        fields: {
          trdEnv: {
            rule: "required",
            type: "int32",
            id: 1
          },
          accID: {
            rule: "required",
            type: "uint64",
            id: 2
          },
          trdMarket: {
            rule: "required",
            type: "int32",
            id: 3
          },
          jpAccType: {
            type: "int32",
            id: 4
          }
        }
      },
      TrdAcc: {
        fields: {
          trdEnv: {
            rule: "required",
            type: "int32",
            id: 1
          },
          accID: {
            rule: "required",
            type: "uint64",
            id: 2
          },
          trdMarketAuthList: {
            rule: "repeated",
            type: "int32",
            id: 3,
            options: {
              packed: false
            }
          },
          accType: {
            type: "int32",
            id: 4
          },
          cardNum: {
            type: "string",
            id: 5
          },
          securityFirm: {
            type: "int32",
            id: 6
          },
          simAccType: {
            type: "int32",
            id: 7
          },
          uniCardNum: {
            type: "string",
            id: 8
          },
          accStatus: {
            type: "int32",
            id: 9
          },
          accRole: {
            type: "int32",
            id: 10
          },
          jpAccType: {
            rule: "repeated",
            type: "int32",
            id: 11,
            options: {
              packed: false
            }
          },
          competitionAccName: {
            type: "string",
            id: 12
          }
        }
      },
      Funds: {
        fields: {
          power: {
            rule: "required",
            type: "double",
            id: 1
          },
          totalAssets: {
            rule: "required",
            type: "double",
            id: 2
          },
          cash: {
            rule: "required",
            type: "double",
            id: 3
          },
          marketVal: {
            rule: "required",
            type: "double",
            id: 4
          },
          frozenCash: {
            rule: "required",
            type: "double",
            id: 5
          },
          debtCash: {
            rule: "required",
            type: "double",
            id: 6
          },
          avlWithdrawalCash: {
            rule: "required",
            type: "double",
            id: 7
          },
          currency: {
            type: "int32",
            id: 8
          },
          availableFunds: {
            type: "double",
            id: 9
          },
          unrealizedPL: {
            type: "double",
            id: 10
          },
          realizedPL: {
            type: "double",
            id: 11
          },
          riskLevel: {
            type: "int32",
            id: 12
          },
          initialMargin: {
            type: "double",
            id: 13
          },
          maintenanceMargin: {
            type: "double",
            id: 14
          },
          cashInfoList: {
            rule: "repeated",
            type: "AccCashInfo",
            id: 15
          },
          maxPowerShort: {
            type: "double",
            id: 16
          },
          netCashPower: {
            type: "double",
            id: 17
          },
          longMv: {
            type: "double",
            id: 18
          },
          shortMv: {
            type: "double",
            id: 19
          },
          pendingAsset: {
            type: "double",
            id: 20
          },
          maxWithdrawal: {
            type: "double",
            id: 21
          },
          riskStatus: {
            type: "int32",
            id: 22
          },
          marginCallMargin: {
            type: "double",
            id: 23
          },
          isPdt: {
            type: "bool",
            id: 24
          },
          pdtSeq: {
            type: "string",
            id: 25
          },
          beginningDTBP: {
            type: "double",
            id: 26
          },
          remainingDTBP: {
            type: "double",
            id: 27
          },
          dtCallAmount: {
            type: "double",
            id: 28
          },
          dtStatus: {
            type: "int32",
            id: 29
          },
          securitiesAssets: {
            type: "double",
            id: 30
          },
          fundAssets: {
            type: "double",
            id: 31
          },
          bondAssets: {
            type: "double",
            id: 32
          },
          marketInfoList: {
            rule: "repeated",
            type: "AccMarketInfo",
            id: 33
          },
          cryptoMv: {
            type: "double",
            id: 34
          },
          exposureLevel: {
            type: "int32",
            id: 35
          },
          exposureLimit: {
            type: "double",
            id: 36
          },
          usedLimit: {
            type: "double",
            id: 37
          },
          remainingLimit: {
            type: "double",
            id: 38
          }
        }
      },
      Position: {
        fields: {
          positionID: {
            rule: "required",
            type: "uint64",
            id: 1
          },
          positionSide: {
            rule: "required",
            type: "int32",
            id: 2
          },
          code: {
            rule: "required",
            type: "string",
            id: 3
          },
          name: {
            rule: "required",
            type: "string",
            id: 4
          },
          qty: {
            rule: "required",
            type: "double",
            id: 5
          },
          canSellQty: {
            rule: "required",
            type: "double",
            id: 6
          },
          price: {
            rule: "required",
            type: "double",
            id: 7
          },
          costPrice: {
            type: "double",
            id: 8
          },
          val: {
            rule: "required",
            type: "double",
            id: 9
          },
          plVal: {
            rule: "required",
            type: "double",
            id: 10
          },
          plRatio: {
            type: "double",
            id: 11
          },
          secMarket: {
            type: "int32",
            id: 12
          },
          tdPlVal: {
            type: "double",
            id: 21
          },
          tdTrdVal: {
            type: "double",
            id: 22
          },
          tdBuyVal: {
            type: "double",
            id: 23
          },
          tdBuyQty: {
            type: "double",
            id: 24
          },
          tdSellVal: {
            type: "double",
            id: 25
          },
          tdSellQty: {
            type: "double",
            id: 26
          },
          unrealizedPL: {
            type: "double",
            id: 28
          },
          realizedPL: {
            type: "double",
            id: 29
          },
          currency: {
            type: "int32",
            id: 30
          },
          trdMarket: {
            type: "int32",
            id: 31
          },
          dilutedCostPrice: {
            type: "double",
            id: 32
          },
          averageCostPrice: {
            type: "double",
            id: 33
          },
          averagePlRatio: {
            type: "double",
            id: 34
          },
          comboID: {
            type: "uint64",
            id: 35
          },
          strategyType: {
            type: "int32",
            id: 36
          },
          positionType: {
            type: "int32",
            id: 37
          },
          accID: {
            type: "uint64",
            id: 38
          },
          jpAccType: {
            type: "int32",
            id: 39
          },
          payoutIfWin: {
            type: "double",
            id: 40
          }
        }
      },
      Order: {
        fields: {
          trdSide: {
            rule: "required",
            type: "int32",
            id: 1
          },
          orderType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          orderStatus: {
            rule: "required",
            type: "int32",
            id: 3
          },
          orderID: {
            rule: "required",
            type: "uint64",
            id: 4
          },
          orderIDEx: {
            rule: "required",
            type: "string",
            id: 5
          },
          code: {
            rule: "required",
            type: "string",
            id: 6
          },
          name: {
            rule: "required",
            type: "string",
            id: 7
          },
          qty: {
            rule: "required",
            type: "double",
            id: 8
          },
          price: {
            type: "double",
            id: 9
          },
          createTime: {
            rule: "required",
            type: "string",
            id: 10
          },
          updateTime: {
            rule: "required",
            type: "string",
            id: 11
          },
          fillQty: {
            type: "double",
            id: 12
          },
          fillAvgPrice: {
            type: "double",
            id: 13
          },
          lastErrMsg: {
            type: "string",
            id: 14
          },
          secMarket: {
            type: "int32",
            id: 15
          },
          createTimestamp: {
            type: "double",
            id: 16
          },
          updateTimestamp: {
            type: "double",
            id: 17
          },
          remark: {
            type: "string",
            id: 18
          },
          timeInForce: {
            type: "int32",
            id: 19
          },
          fillOutsideRTH: {
            type: "bool",
            id: 20
          },
          auxPrice: {
            type: "double",
            id: 21
          },
          trailType: {
            type: "int32",
            id: 22
          },
          trailValue: {
            type: "double",
            id: 23
          },
          trailSpread: {
            type: "double",
            id: 24
          },
          currency: {
            type: "int32",
            id: 25
          },
          trdMarket: {
            type: "int32",
            id: 26
          },
          session: {
            type: "int32",
            id: 27
          },
          jpAccType: {
            type: "int32",
            id: 28
          },
          expireTime: {
            type: "string",
            id: 29
          },
          orderAmount: {
            type: "double",
            id: 30
          },
          strategyType: {
            type: "int32",
            id: 31
          },
          comboLegs: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 32
          }
        }
      },
      OrderFeeItem: {
        fields: {
          title: {
            type: "string",
            id: 1
          },
          value: {
            type: "double",
            id: 2
          }
        }
      },
      OrderFee: {
        fields: {
          orderIDEx: {
            rule: "required",
            type: "string",
            id: 1
          },
          feeAmount: {
            type: "double",
            id: 2
          },
          feeList: {
            rule: "repeated",
            type: "OrderFeeItem",
            id: 3
          }
        }
      },
      OrderFill: {
        fields: {
          trdSide: {
            rule: "required",
            type: "int32",
            id: 1
          },
          fillID: {
            rule: "required",
            type: "uint64",
            id: 2
          },
          fillIDEx: {
            rule: "required",
            type: "string",
            id: 3
          },
          orderID: {
            type: "uint64",
            id: 4
          },
          orderIDEx: {
            type: "string",
            id: 5
          },
          code: {
            rule: "required",
            type: "string",
            id: 6
          },
          name: {
            rule: "required",
            type: "string",
            id: 7
          },
          qty: {
            rule: "required",
            type: "double",
            id: 8
          },
          price: {
            rule: "required",
            type: "double",
            id: 9
          },
          createTime: {
            rule: "required",
            type: "string",
            id: 10
          },
          counterBrokerID: {
            type: "int32",
            id: 11
          },
          counterBrokerName: {
            type: "string",
            id: 12
          },
          secMarket: {
            type: "int32",
            id: 13
          },
          createTimestamp: {
            type: "double",
            id: 14
          },
          updateTimestamp: {
            type: "double",
            id: 15
          },
          status: {
            type: "int32",
            id: 16
          },
          trdMarket: {
            type: "int32",
            id: 17
          },
          jpAccType: {
            type: "int32",
            id: 18
          }
        }
      },
      MaxTrdQtys: {
        fields: {
          maxCashBuy: {
            rule: "required",
            type: "double",
            id: 1
          },
          maxCashAndMarginBuy: {
            type: "double",
            id: 2
          },
          maxPositionSell: {
            rule: "required",
            type: "double",
            id: 3
          },
          maxSellShort: {
            type: "double",
            id: 4
          },
          maxBuyBack: {
            type: "double",
            id: 5
          },
          longRequiredIM: {
            type: "double",
            id: 6
          },
          shortRequiredIM: {
            type: "double",
            id: 7
          },
          session: {
            type: "int32",
            id: 8
          }
        }
      },
      ComboMaxTrdQtys: {
        fields: {
          nlvChange: {
            type: "double",
            id: 1
          },
          initialMarginChange: {
            type: "double",
            id: 2
          },
          maintenanceMarginChange: {
            type: "double",
            id: 3
          },
          optionBuyPower: {
            type: "double",
            id: 4
          },
          maxWithDrawChange: {
            type: "double",
            id: 5
          },
          buyPowerDecrease: {
            type: "double",
            id: 6
          }
        }
      },
      TrdFilterConditions: {
        fields: {
          codeList: {
            rule: "repeated",
            type: "string",
            id: 1
          },
          idList: {
            rule: "repeated",
            type: "uint64",
            id: 2,
            options: {
              packed: false
            }
          },
          beginTime: {
            type: "string",
            id: 3
          },
          endTime: {
            type: "string",
            id: 4
          },
          orderIDExList: {
            rule: "repeated",
            type: "string",
            id: 5
          },
          filterMarket: {
            type: "int32",
            id: 6
          }
        }
      },
      SecurityFirm: {
        values: {
          SecurityFirm_Unknown: 0,
          SecurityFirm_FutuSecurities: 1,
          SecurityFirm_FutuInc: 2,
          SecurityFirm_FutuSG: 3,
          SecurityFirm_FutuAU: 4,
          SecurityFirm_FutuCA: 5,
          SecurityFirm_FutuMY: 6,
          SecurityFirm_FutuJP: 7
        }
      }
    }
  },
  Trd_FlowSummary: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdflowsummary"
    },
    nested: {
      TrdCashFlowDirection: {
        values: {
          TrdCashFlowDirection_Unknown: 0,
          TrdCashFlowDirection_In: 1,
          TrdCashFlowDirection_Out: 2
        }
      },
      FlowSummaryInfo: {
        fields: {
          clearingDate: {
            type: "string",
            id: 1
          },
          settlementDate: {
            type: "string",
            id: 2
          },
          currency: {
            type: "int32",
            id: 3
          },
          cashFlowType: {
            type: "string",
            id: 4
          },
          cashFlowDirection: {
            type: "int32",
            id: 5
          },
          cashFlowAmount: {
            type: "double",
            id: 6
          },
          cashFlowRemark: {
            type: "string",
            id: 7
          },
          cashFlowID: {
            type: "uint64",
            id: 8
          },
          createTime: {
            type: "string",
            id: 9
          }
        }
      },
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          clearingDate: {
            rule: "required",
            type: "string",
            id: 2
          },
          cashFlowDirection: {
            type: "int32",
            id: 3
          },
          startCreateDate: {
            type: "string",
            id: 4
          },
          endCreateDate: {
            type: "string",
            id: 5
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          flowSummaryInfoList: {
            rule: "repeated",
            type: "FlowSummaryInfo",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetAccList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetacclist"
    },
    nested: {
      C2S: {
        fields: {
          userID: {
            rule: "required",
            type: "uint64",
            id: 1
          },
          trdCategory: {
            type: "int32",
            id: 2
          },
          needGeneralSecAccount: {
            type: "bool",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          accList: {
            rule: "repeated",
            type: "Trd_Common.TrdAcc",
            id: 1
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetComboMaxTrdQtys: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetmaxtrdqtys"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          comboLegs: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 2
          },
          qty: {
            rule: "required",
            type: "double",
            id: 4
          },
          price: {
            type: "double",
            id: 5
          },
          orderType: {
            rule: "required",
            type: "int32",
            id: 6
          },
          orderIDEx: {
            type: "string",
            id: 7
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          maxTrdQtys: {
            type: "Trd_Common.ComboMaxTrdQtys",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetFunds: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetfunds"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          refreshCache: {
            type: "bool",
            id: 2
          },
          currency: {
            type: "int32",
            id: 3
          },
          assetCategory: {
            type: "int32",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          funds: {
            type: "Trd_Common.Funds",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetHistoryOrderFillList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgethistoryorderfilllist"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          filterConditions: {
            rule: "required",
            type: "Trd_Common.TrdFilterConditions",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderFillList: {
            rule: "repeated",
            type: "Trd_Common.OrderFill",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetHistoryOrderList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgethistoryorderlist"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          filterConditions: {
            rule: "required",
            type: "Trd_Common.TrdFilterConditions",
            id: 2
          },
          filterStatusList: {
            rule: "repeated",
            type: "int32",
            id: 3,
            options: {
              packed: false
            }
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderList: {
            rule: "repeated",
            type: "Trd_Common.Order",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetMarginRatio: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetmarginratio"
    },
    nested: {
      MarginRatioInfo: {
        fields: {
          security: {
            rule: "required",
            type: "Qot_Common.Security",
            id: 1
          },
          isLongPermit: {
            type: "bool",
            id: 2
          },
          isShortPermit: {
            type: "bool",
            id: 3
          },
          shortPoolRemain: {
            type: "double",
            id: 4
          },
          shortFeeRate: {
            type: "double",
            id: 5
          },
          alertLongRatio: {
            type: "double",
            id: 6
          },
          alertShortRatio: {
            type: "double",
            id: 7
          },
          imLongRatio: {
            type: "double",
            id: 8
          },
          imShortRatio: {
            type: "double",
            id: 9
          },
          mcmLongRatio: {
            type: "double",
            id: 10
          },
          mcmShortRatio: {
            type: "double",
            id: 11
          },
          mmLongRatio: {
            type: "double",
            id: 12
          },
          mmShortRatio: {
            type: "double",
            id: 13
          }
        }
      },
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          securityList: {
            rule: "repeated",
            type: "Qot_Common.Security",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          marginRatioInfoList: {
            rule: "repeated",
            type: "MarginRatioInfo",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetMaxTrdQtys: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetmaxtrdqtys"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderType: {
            rule: "required",
            type: "int32",
            id: 2
          },
          code: {
            rule: "required",
            type: "string",
            id: 3
          },
          price: {
            rule: "required",
            type: "double",
            id: 4
          },
          orderID: {
            type: "uint64",
            id: 5
          },
          adjustPrice: {
            type: "bool",
            id: 6
          },
          adjustSideAndLimit: {
            type: "double",
            id: 7
          },
          secMarket: {
            type: "int32",
            id: 8
          },
          orderIDEx: {
            type: "string",
            id: 9
          },
          session: {
            type: "int32",
            id: 10
          },
          positionID: {
            type: "uint64",
            id: 11
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          maxTrdQtys: {
            type: "Trd_Common.MaxTrdQtys",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetOrderFee: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetorderfee"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderIdExList: {
            rule: "repeated",
            type: "string",
            id: 2
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderFeeList: {
            rule: "repeated",
            type: "Trd_Common.OrderFee",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetOrderFillList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetorderfilllist"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          filterConditions: {
            type: "Trd_Common.TrdFilterConditions",
            id: 2
          },
          refreshCache: {
            type: "bool",
            id: 3
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderFillList: {
            rule: "repeated",
            type: "Trd_Common.OrderFill",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetOrderList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetorderlist"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          filterConditions: {
            type: "Trd_Common.TrdFilterConditions",
            id: 2
          },
          filterStatusList: {
            rule: "repeated",
            type: "int32",
            id: 3,
            options: {
              packed: false
            }
          },
          refreshCache: {
            type: "bool",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderList: {
            rule: "repeated",
            type: "Trd_Common.Order",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_GetPositionList: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdgetpositionlist"
    },
    nested: {
      C2S: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          filterConditions: {
            type: "Trd_Common.TrdFilterConditions",
            id: 2
          },
          filterPLRatioMin: {
            type: "double",
            id: 3
          },
          filterPLRatioMax: {
            type: "double",
            id: 4
          },
          refreshCache: {
            type: "bool",
            id: 5
          },
          assetCategory: {
            type: "int32",
            id: 6
          },
          currency: {
            type: "int32",
            id: 7
          },
          optionStrategyView: {
            type: "bool",
            id: 8
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          positionList: {
            rule: "repeated",
            type: "Trd_Common.Position",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_ModifyOrder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdmodifyorder"
    },
    nested: {
      C2S: {
        fields: {
          packetID: {
            rule: "required",
            type: "Common.PacketID",
            id: 1
          },
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 2
          },
          orderID: {
            rule: "required",
            type: "uint64",
            id: 3
          },
          modifyOrderOp: {
            rule: "required",
            type: "int32",
            id: 4
          },
          forAll: {
            type: "bool",
            id: 5
          },
          trdMarket: {
            type: "int32",
            id: 6
          },
          qty: {
            type: "double",
            id: 8
          },
          price: {
            type: "double",
            id: 9
          },
          adjustPrice: {
            type: "bool",
            id: 10
          },
          adjustSideAndLimit: {
            type: "double",
            id: 11
          },
          auxPrice: {
            type: "double",
            id: 12
          },
          trailType: {
            type: "int32",
            id: 13
          },
          trailValue: {
            type: "double",
            id: 14
          },
          trailSpread: {
            type: "double",
            id: 15
          },
          orderIDEx: {
            type: "string",
            id: 16
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderID: {
            rule: "required",
            type: "uint64",
            id: 2
          },
          orderIDEx: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_Notify: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdnotify"
    },
    nested: {
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          type: {
            rule: "required",
            type: "int32",
            id: 2
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_PlaceComboOrder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdplaceorder"
    },
    nested: {
      C2S: {
        fields: {
          packetID: {
            rule: "required",
            type: "Common.PacketID",
            id: 1
          },
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 2
          },
          comboLegs: {
            rule: "repeated",
            type: "Qot_Common.ComboLeg",
            id: 3
          },
          qty: {
            rule: "required",
            type: "double",
            id: 4
          },
          price: {
            type: "double",
            id: 5
          },
          orderType: {
            rule: "required",
            type: "int32",
            id: 6
          },
          timeInForce: {
            type: "int32",
            id: 7
          },
          expireTime: {
            type: "string",
            id: 8
          },
          remark: {
            type: "string",
            id: 9
          },
          quoteID: {
            type: "string",
            id: 10
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderIDEx: {
            type: "string",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_PlaceOrder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdplaceorder"
    },
    nested: {
      C2S: {
        fields: {
          packetID: {
            rule: "required",
            type: "Common.PacketID",
            id: 1
          },
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 2
          },
          trdSide: {
            rule: "required",
            type: "int32",
            id: 3
          },
          orderType: {
            rule: "required",
            type: "int32",
            id: 4
          },
          code: {
            rule: "required",
            type: "string",
            id: 5
          },
          qty: {
            rule: "required",
            type: "double",
            id: 6
          },
          price: {
            type: "double",
            id: 7
          },
          adjustPrice: {
            type: "bool",
            id: 8
          },
          adjustSideAndLimit: {
            type: "double",
            id: 9
          },
          secMarket: {
            type: "int32",
            id: 10
          },
          remark: {
            type: "string",
            id: 11
          },
          timeInForce: {
            type: "int32",
            id: 12
          },
          fillOutsideRTH: {
            type: "bool",
            id: 13
          },
          auxPrice: {
            type: "double",
            id: 14
          },
          trailType: {
            type: "int32",
            id: 15
          },
          trailValue: {
            type: "double",
            id: 16
          },
          trailSpread: {
            type: "double",
            id: 17
          },
          session: {
            type: "int32",
            id: 18
          },
          positionID: {
            type: "uint64",
            id: 19
          },
          expireTime: {
            type: "string",
            id: 20
          },
          amount: {
            type: "double",
            id: 21
          },
          predSide: {
            type: "int32",
            id: 22
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderID: {
            type: "uint64",
            id: 2
          },
          orderIDEx: {
            type: "string",
            id: 3
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_ReconfirmOrder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdreconfirmorder"
    },
    nested: {
      C2S: {
        fields: {
          packetID: {
            rule: "required",
            type: "Common.PacketID",
            id: 1
          },
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 2
          },
          orderID: {
            rule: "required",
            type: "uint64",
            id: 3
          },
          reconfirmReason: {
            rule: "required",
            type: "int32",
            id: 4
          }
        }
      },
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderID: {
            rule: "required",
            type: "uint64",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_SubAccPush: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdsubaccpush"
    },
    nested: {
      C2S: {
        fields: {
          accIDList: {
            rule: "repeated",
            type: "uint64",
            id: 1,
            options: {
              packed: false
            }
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_UnlockTrade: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdunlocktrade"
    },
    nested: {
      C2S: {
        fields: {
          unlock: {
            rule: "required",
            type: "bool",
            id: 1
          },
          pwdMD5: {
            type: "string",
            id: 2
          },
          securityFirm: {
            type: "int32",
            id: 3
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_UpdateOrder: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdupdateorder"
    },
    nested: {
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          order: {
            rule: "required",
            type: "Trd_Common.Order",
            id: 2
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Trd_UpdateOrderFill: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/trdupdateorderfill"
    },
    nested: {
      S2C: {
        fields: {
          header: {
            rule: "required",
            type: "Trd_Common.TrdHeader",
            id: 1
          },
          orderFill: {
            rule: "required",
            type: "Trd_Common.OrderFill",
            id: 2
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  UsedQuota: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/usedquota"
    },
    nested: {
      C2S: {
        fields: {}
      },
      S2C: {
        fields: {
          usedSubQuota: {
            type: "int32",
            id: 1
          },
          usedKLineQuota: {
            type: "int32",
            id: 2
          }
        }
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  },
  Verification: {
    options: {
      java_package: "com.futu.openapi.pb",
      go_package: "github.com/futuopen/ftapi4go/pb/verification"
    },
    nested: {
      VerificationType: {
        values: {
          VerificationType_Unknow: 0,
          VerificationType_Picture: 1,
          VerificationType_Phone: 2
        }
      },
      VerificationOp: {
        values: {
          VerificationOp_Unknow: 0,
          VerificationOp_Request: 1,
          VerificationOp_InputAndLogin: 2
        }
      },
      C2S: {
        fields: {
          type: {
            rule: "required",
            type: "int32",
            id: 1
          },
          op: {
            rule: "required",
            type: "int32",
            id: 2
          },
          code: {
            type: "string",
            id: 3
          }
        }
      },
      S2C: {
        fields: {}
      },
      Request: {
        fields: {
          c2s: {
            rule: "required",
            type: "C2S",
            id: 1
          }
        }
      },
      Response: {
        fields: {
          retType: {
            rule: "required",
            type: "int32",
            id: 1,
            options: {
              "default": -400
            }
          },
          retMsg: {
            type: "string",
            id: 2
          },
          errCode: {
            type: "int32",
            id: 3
          },
          s2c: {
            type: "S2C",
            id: 4
          }
        }
      }
    }
  }
});

module.exports = $root;
