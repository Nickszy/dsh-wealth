#!/usr/bin/env node
// workbuddy:// 协议回调助手：由系统协议处理器拉起（参数 %1 = 完整回调地址），
// 把地址落盘后立即退出；插件设置页轮询该文件并换取 token。不联网、不弹窗。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DATA_DIR } from './store.mjs'

const url = String(process.argv[2] || '')
if (url.startsWith('workbuddy://')) {
  const target = join(DATA_DIR, 'cache', 'westock-callback.json')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, JSON.stringify({ url, receivedAt: Date.now() }), 'utf8')
}
