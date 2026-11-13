// dsh-wealth-preview — client half（左侧插件栏里的「资产预览」图标）。
// 点开后在主区渲染 /portfolio-preview 的演示页：真实的 client.js + 演示账本 +
// 只读 mock API。与正式的 dsh-wealth 完全隔离——不读生产账本、不占同一个面板 id。
window.__ModuleLoader__.load({
  id: 'dsh-wealth-preview',
  factory(require) {
    const React = require('react')
    const PANEL = 'dsh-wealth-preview'
    const PAGE_URL = '/portfolio-preview/'
    // `main.conversation` 是 single slot：同一 priority 只能有一个注册。正式的
    // dsh-wealth 面板占了 -10，所以预览用 -20（数值越低越优先渲染）叠在上面，
    // 而不是抢同一个槽位报 "already has a registration"。
    const OVERLAY_PRIORITY = -20
    let ctx = null
    let shellDispose = null
    let panelSession = null

    function closePanel() {
      const d = shellDispose; shellDispose = null; panelSession = null
      if (d) { try { d() } catch (_) {} }
    }
    function openPanel() {
      const layout = ctx && ctx.get && ctx.get('layout')
      if (!layout || typeof layout.selectPanel !== 'function') throw new Error('布局服务不可用，无法打开预览页。')
      if (!shellDispose) {
        const sidebar = ctx.get('sidebarRight')
        panelSession = (sidebar && sidebar.mounted && sidebar.mounted.getSnapshot && sidebar.mounted.getSnapshot()) || null
        shellDispose = ctx.slots.register({ name: 'main.conversation', priority: OVERLAY_PRIORITY }, PreviewFrame)
      }
      try { layout.selectPanel(null) } catch (e) { closePanel(); throw e }
    }

    // 左侧栏图标：账本横线 + 右上角的「预览」小点。
    function PreviewIcon({ size = 20 }) {
      return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        React.createElement('rect', { x: 3.5, y: 5.6, width: 8.5, height: 3.2, rx: 1.6, fill: 'currentColor', opacity: 0.5 }),
        React.createElement('rect', { x: 3.5, y: 10.7, width: 13, height: 3.2, rx: 1.6, fill: 'currentColor', opacity: 0.75 }),
        React.createElement('rect', { x: 3.5, y: 15.8, width: 17, height: 3.2, rx: 1.6, fill: 'currentColor' }),
        React.createElement('circle', { cx: 17.4, cy: 7.2, r: 3.4, stroke: 'currentColor', strokeWidth: 1.6, strokeDasharray: '2.2 1.8', opacity: 0.9 }))
    }

    function PreviewFrame({ sessionId }) {
      const mounted = React.useRef(false)
      React.useEffect(() => {
        mounted.current = true
        const owned = shellDispose
        return () => {
          mounted.current = false
          queueMicrotask(() => { if (!mounted.current && shellDispose === owned) closePanel() })
        }
      }, [])
      React.useEffect(() => { if (panelSession && sessionId !== panelSession) closePanel() }, [sessionId])
      return React.createElement('div', { style: { position: 'relative', height: '100%', minHeight: 'calc(100vh - 96px)' } },
        React.createElement('iframe', {
          title: '资产账本 · 预览版',
          src: PAGE_URL,
          style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: 14, background: 'transparent' },
        }))
    }

    function PreviewEntry() {
      const [error, setError] = React.useState('')
      React.useEffect(() => { try { openPanel() } catch (e) { setError(e.message || '打开失败') } }, [])
      return React.createElement('div', { role: 'status', style: { padding: 24 } }, error || '正在打开预览…')
    }

    return {
      inject: ['slots'],
      apply(c) {
        ctx = c
        c.effect(() => c.slots.inject('sidebar.panellist', () => c.slots.register({
          name: 'sidebar.panellist', id: PANEL, order: 31, label: '资产预览',
        }, PreviewIcon)), 'dsh-wealth-preview: nav')
        c.effect(() => c.slots.inject('main', () => c.slots.register({
          name: 'main', key: PANEL,
        }, PreviewEntry)), 'dsh-wealth-preview: panel entry')
        // 叠在别人上面时，用户点别的插件图标（包括「资产」）要把自己让出来：
        // activePanelId 一旦切到别处就撤销本插件的占位，让原来的面板接着渲染。
        c.effect(() => {
          const layout = c.get && c.get('layout')
          const info = layout && layout.panelInfo
          if (!info || typeof info.subscribe !== 'function' || typeof info.getSnapshot !== 'function') return undefined
          const sub = info.subscribe(() => {
            const active = info.getSnapshot().activePanelId
            if (active !== null && active !== undefined && active !== PANEL) closePanel()
          })
          return () => { try { sub() } catch (_) {} }
        }, 'dsh-wealth-preview: yield on panel switch')
        c.effect(() => () => closePanel(), 'dsh-wealth-preview: restore shell')
      },
    }
  },
})
