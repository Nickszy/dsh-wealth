import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBillCsv, billPreview, guessCategory } from './bills-import.mjs'

const wechat = `微信支付账单明细,,,,,,,,
微信昵称：[测试用户],,,,,,,,
起始时间：[2026-10-01 00:00:00] 终止时间：[2026-11-07 23:59:59],,,,,,,,
导出类型：[全部],,,,,,,,
导出时间：[2026-11-08],,,,,,,,
,,,,,,,,
----------------------微信支付账单明细列表--------------------,,,,,,,,
交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
2026-11-03 12:30:00,商户消费,美团,外卖订单,支出,¥86.00,零钱,支付成功,4200001,M001,/
2026-11-04 09:00:00,转账,张三,/,收入,¥200.00,零钱,已收钱,4200002,M002,还款
2026-11-05 20:00:00,商户消费,滴滴出行,快车,支出,¥45.50,零钱通,支付成功,4200003,M003,/
2026-11-06 10:00:00,商户消费,京东,耳机,支出,¥399.00,招商银行(1234),交易关闭,4200004,M004,/
2026-11-06 11:00:00,零钱提现,招商银行,/,不计收支,¥1000.00,零钱,提现已到账,4200005,M005,/
`

const alipay = `支付宝交易记录明细查询
账号:[test@example.com]
起始日期:[2026-10-01 00:00:00]    终止日期:[2026-11-07 23:59:59]
---------------------------------交易记录明细列表------------------------------------
交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
2026-11-03 08:00:00,餐饮美食,肯德基,xxx,早餐套餐,支出,23.50,余额宝,交易成功,202611031,SH001,
2026-11-03 19:00:00,日用百货,天猫超市,xxx,纸巾,支出,58.00,花呗,交易成功,202611032,SH002,
2026-11-04 09:00:00,转账红包,李四,xxx,/,收入,100.00,余额,交易成功,202611033,SH003,红包
`

test('parses WeChat bill CSV with directions, categories and skipped rows', () => {
  const parsed = parseBillCsv(wechat)
  assert.equal(parsed.provider, 'wechat')
  assert.equal(parsed.rows.length, 4)
  assert.equal(parsed.skipped, 1) // 交易关闭
  const [food, transfer, ride, withdraw] = parsed.rows
  assert.deepEqual([food.date, food.time, food.direction, food.amount], ['2026-11-03', '12:30:00', 'out', 86])
  assert.equal(food.category, 'food')
  assert.equal(food.externalId, 'wechat:4200001')
  assert.equal(food.note, '美团 · 外卖订单')
  assert.equal(transfer.direction, 'in')
  assert.equal(transfer.category, null)
  assert.equal(ride.category, 'transport')
  assert.equal(withdraw.direction, 'none')
})

test('parses Alipay bill CSV and suggests categories from type and merchant', () => {
  const parsed = parseBillCsv(alipay)
  assert.equal(parsed.provider, 'alipay')
  assert.equal(parsed.rows.length, 3)
  assert.equal(parsed.skipped, 0)
  assert.deepEqual(parsed.rows.map((r) => [r.date, r.direction, r.amount, r.category]), [
    ['2026-11-03', 'out', 23.5, 'food'],
    ['2026-11-03', 'out', 58, 'shopping'],
    ['2026-11-04', 'in', 100, 'social'],
  ])
})

test('preview totals reconcile and unknown files are reported, never guessed', () => {
  const preview = billPreview(parseBillCsv(wechat))
  assert.deepEqual(preview.counts, { total: 4, out: 2, in: 1, none: 1, categorized: 2, skipped: 1 })
  assert.deepEqual(preview.totals, { out: 131.5, in: 200 })
  assert.deepEqual(preview.months, ['2026-11'])
  const empty = parseBillCsv('这不是账单')
  assert.deepEqual(empty.rows, [])
  assert.deepEqual(empty.warnings, ['BILLS_HEADER_NOT_FOUND'])
})

test('guessCategory is conservative and keyword driven', () => {
  assert.equal(guessCategory('商户消费', '美团', '午餐'), 'food')
  assert.equal(guessCategory('', '物业费'), 'housing')
  assert.equal(guessCategory('', '中国移动'), 'telecom')
  assert.equal(guessCategory('', '未知商户'), null)
  assert.equal(guessCategory('', ''), null)
})
