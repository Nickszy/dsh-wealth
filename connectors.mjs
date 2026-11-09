// Native adapter catalogue. No credentials, network, or storage here.
// 快照校验核心在 snapshot-schema.mjs（叶子模块）：此前本文件被 ths-client 依赖、
// 又依赖 connector-registry，而注册表又依赖 ths-client，形成导入环；适配器现在
// 直接引用 schema，这里只保留再导出与连接器目录。
import { CONNECTORS } from './connector-registry.mjs'
export { normalizeSnapshot } from './snapshot-schema.mjs'
// 目录由连接器注册表生成；custom（http / 宿主 MCP 桥接）不是注册表来源，单列一项。
export function getConnectorStatus(ctx) {
  return [
    ...Object.values(CONNECTORS).map(entry => ({ id:entry.id, label:entry.label, available:true, transport:entry.defaultTransport, description:entry.description })),
    { id:'custom',label:'通用 API / MCP',available:true,transport:'bridge',description:'高级选项：标准持仓快照 API 或已配置的 MCP 读工具。' },
  ]
}
