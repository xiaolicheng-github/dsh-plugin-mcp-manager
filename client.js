/**
 * MCP manager — Client half.
 *
 * Adds an "MCP 管理" control to the window header (immediately right of the
 * Desktop caption menus) and opens a management dialog over the frame. The
 * dialog reads and writes the mainstream `mcpServers` JSON document through the
 * Host's authenticated Fetch routes; the Host owns connections and server
 * processes.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-mcp-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'mcp-manager'
    const STATE_PATH = '/api/mcp-manager.state'
    const SAVE_PATH = '/api/mcp-manager.save'
    const ACTION_PATH = '/api/mcp-manager.action'

    const zh = {
      'chip.label': 'MCP 管理',
      'chip.open': '打开 MCP 管理面板',
      'title': 'MCP 管理',
      'subtitle': '管理本机 MCP 服务器，配置写入 mcp.json',
      'path.unknown': '尚未创建配置文件',
      'toolbar.add': '添加服务器',
      'toolbar.import': '导入 JSON',
      'toolbar.json': 'JSON 编辑',
      'toolbar.refresh': '刷新',
      'summary.empty': '还没有配置 MCP 服务器',
      'summary.count': '{count} 个服务器 · {connected} 个已连接 · {tools} 个工具',
      'list.empty.title': '还没有 MCP 服务器',
      'list.empty.body': '使用主流的 mcpServers 配置格式添加本地进程或远程 HTTP 服务。',
      'list.empty.example': '示例：\n{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\\\work"]\n    },\n    "remote": {\n      "url": "https://example.com/mcp",\n      "headers": { "Authorization": "Bearer ..." }\n    }\n  }\n}',
      'status.connected': '已连接',
      'status.connecting': '连接中',
      'status.error': '连接失败',
      'status.disabled': '已停用',
      'status.stopped': '已断开',
      'status.invalid': '配置无效',
      'transport.stdio': '本地进程',
      'transport.http': '远程 HTTP',
      'transport.invalid': '无效',
      'badge.disabled': '已停用',
      'badge.tools': '{count} 个工具',
      'action.tools': '工具',
      'action.edit': '编辑',
      'action.restart': '重启',
      'action.enable': '启用',
      'action.disable': '停用',
      'action.delete': '删除',
      'action.close': '关闭',
      'action.save': '保存',
      'action.cancel': '取消',
      'action.back': '返回',
      'action.confirm': '确认删除',
      'action.retry': '重试',
      'action.copy': '复制',
      'action.copied': '已复制',
      'tools.empty': '该服务器当前没有注册工具',
      'tools.hint': '模型可用名称：{name}',
      'error.title': '操作失败',
      'error.dismiss': '关闭提示',
      'error.file': '配置文件读取失败：{message}',
      'error.module': '无法加载 MCP 客户端：{message}',
      'error.load': '无法读取 MCP 配置：{message}',
      'form.add.title': '添加 MCP 服务器',
      'form.edit.title': '编辑 {name}',
      'form.name': '名称',
      'form.name.hint': '显示名称，可含空格；工具前缀会自动规范化',
      'form.type': '连接方式',
      'form.type.stdio': '本地进程（stdio）',
      'form.type.http': '远程服务（Streamable HTTP）',
      'form.command': '启动命令',
      'form.command.hint': '例如 npx、uvx 或可执行文件的绝对路径',
      'form.args': '参数',
      'form.args.hint': '每行一个参数',
      'form.env': '环境变量',
      'form.env.hint': '每行一个 KEY=VALUE；支持 ${VAR} 与 ${VAR:-默认值}',
      'form.cwd': '工作目录',
      'form.cwd.hint': '可选，留空使用 Host 的工作目录',
      'form.url': '服务地址',
      'form.url.hint': '例如 https://example.com/mcp',
      'form.headers': '请求头',
      'form.headers.hint': '每行一个 Name: value',
      'form.timeout': '调用超时（毫秒）',
      'form.timeout.hint': '可选，默认 60000',
      'form.disabled': '保存后暂不启用',
      'form.required.name': '请填写名称',
      'form.required.target': '请填写启动命令或服务地址',
      'form.duplicate': '已存在同名服务器',
      'json.title': 'JSON 编辑',
      'json.hint': '完整的 mcpServers 文档。保存后立即应用。',
      'json.invalid': 'JSON 无效：{message}',
      'json.shape': '文档必须包含对象形式的 mcpServers',
      'import.title': '导入 MCP 配置',
      'import.hint': '粘贴 Claude Desktop、Cursor 或 VS Code 的 mcp.json（含 mcpServers 对象）。',
      'import.merge': '合并同名覆盖',
      'import.replace': '替换全部',
      'import.empty': '请先粘贴配置内容',
      'import.invalid': '无法解析配置：{message}',
      'delete.hint': '删除 {name}？该服务器注册的工具会立即移除。',
      'save.ok': '已保存并应用',
      'loading': '正在读取配置…',
    }

    const en = {
      'chip.label': 'MCP',
      'chip.open': 'Open the MCP manager',
      'title': 'MCP manager',
      'subtitle': 'Manage local MCP servers; configuration lives in mcp.json',
      'path.unknown': 'Configuration file not created yet',
      'toolbar.add': 'Add server',
      'toolbar.import': 'Import JSON',
      'toolbar.json': 'Edit JSON',
      'toolbar.refresh': 'Refresh',
      'summary.empty': 'No MCP servers configured',
      'summary.count': '{count} servers · {connected} connected · {tools} tools',
      'list.empty.title': 'No MCP servers yet',
      'list.empty.body': 'Add a local process or a remote HTTP service using the mainstream mcpServers format.',
      'list.empty.example': 'Example:\n{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\\\work"]\n    },\n    "remote": {\n      "url": "https://example.com/mcp",\n      "headers": { "Authorization": "Bearer ..." }\n    }\n  }\n}',
      'status.connected': 'Connected',
      'status.connecting': 'Connecting',
      'status.error': 'Connection failed',
      'status.disabled': 'Disabled',
      'status.stopped': 'Disconnected',
      'status.invalid': 'Invalid configuration',
      'transport.stdio': 'Local process',
      'transport.http': 'Remote HTTP',
      'transport.invalid': 'Invalid',
      'badge.disabled': 'Disabled',
      'badge.tools': '{count} tools',
      'action.tools': 'Tools',
      'action.edit': 'Edit',
      'action.restart': 'Restart',
      'action.enable': 'Enable',
      'action.disable': 'Disable',
      'action.delete': 'Delete',
      'action.close': 'Close',
      'action.save': 'Save',
      'action.cancel': 'Cancel',
      'action.back': 'Back',
      'action.confirm': 'Delete',
      'action.retry': 'Retry',
      'action.copy': 'Copy',
      'action.copied': 'Copied',
      'tools.empty': 'This server registered no tools',
      'tools.hint': 'Model-facing names use the {name} prefix',
      'error.title': 'Operation failed',
      'error.dismiss': 'Dismiss',
      'error.file': 'Could not read the configuration file: {message}',
      'error.module': 'Could not load the MCP client: {message}',
      'error.load': 'Could not read the MCP configuration: {message}',
      'form.add.title': 'Add MCP server',
      'form.edit.title': 'Edit {name}',
      'form.name': 'Name',
      'form.name.hint': 'Display name; the tool prefix is normalized automatically',
      'form.type': 'Transport',
      'form.type.stdio': 'Local process (stdio)',
      'form.type.http': 'Remote service (Streamable HTTP)',
      'form.command': 'Command',
      'form.command.hint': 'For example npx, uvx, or an absolute executable path',
      'form.args': 'Arguments',
      'form.args.hint': 'One argument per line',
      'form.env': 'Environment',
      'form.env.hint': 'One KEY=VALUE per line; supports ${VAR} and ${VAR:-fallback}',
      'form.cwd': 'Working directory',
      'form.cwd.hint': 'Optional; empty uses the Host working directory',
      'form.url': 'Endpoint URL',
      'form.url.hint': 'For example https://example.com/mcp',
      'form.headers': 'Headers',
      'form.headers.hint': 'One Name: value per line',
      'form.timeout': 'Call timeout (ms)',
      'form.timeout.hint': 'Optional; defaults to 60000',
      'form.disabled': 'Save without starting it',
      'form.required.name': 'A name is required',
      'form.required.target': 'A command or URL is required',
      'form.duplicate': 'A server with this name already exists',
      'json.title': 'Edit JSON',
      'json.hint': 'The complete mcpServers document. Saving applies it immediately.',
      'json.invalid': 'Invalid JSON: {message}',
      'json.shape': 'The document must contain an object named mcpServers',
      'import.title': 'Import MCP configuration',
      'import.hint': 'Paste an mcp.json from Claude Desktop, Cursor, or VS Code (with an mcpServers object).',
      'import.merge': 'Merge (incoming wins)',
      'import.replace': 'Replace all',
      'import.empty': 'Paste some configuration first',
      'import.invalid': 'Could not parse the configuration: {message}',
      'delete.hint': 'Delete {name}? Tools it registered are removed immediately.',
      'save.ok': 'Saved and applied',
      'loading': 'Reading configuration…',
    }

    const openState = { open: false, listeners: new Set() }
    const setOpen = (value) => {
      if (openState.open === value) return
      openState.open = value
      for (const listener of openState.listeners) listener()
    }
    const subscribeOpen = (listener) => {
      openState.listeners.add(listener)
      return () => openState.listeners.delete(listener)
    }
    const useOpen = () => React.useSyncExternalStore(subscribeOpen, () => openState.open, () => false)

    function useTitlebar() {
      const [value, setValue] = React.useState(() => document.documentElement.hasAttribute('data-windows-titlebar'))
      React.useEffect(() => {
        const root = document.documentElement
        const update = () => setValue(root.hasAttribute('data-windows-titlebar'))
        update()
        const observer = new MutationObserver(update)
        observer.observe(root, { attributes: true, attributeFilter: ['data-windows-titlebar', 'data-platform'] })
        return () => observer.disconnect()
      }, [])
      return value
    }

    /** Place the header chip directly after the Desktop caption menu bar. */
    function useCaptionPlacement(enabled) {
      const [placement, setPlacement] = React.useState({ left: 206, top: 6 })
      React.useEffect(() => {
        if (!enabled) return undefined
        let frame = 0
        let attempts = 0
        let timer
        const measure = () => {
          const menu = document.querySelector('[data-windows-menu]')
          const rect = menu === null ? undefined : menu.getBoundingClientRect()
          const style = getComputedStyle(document.documentElement)
          const height = parseFloat(style.getPropertyValue('--dsh-windows-titlebar-height')) || 40
          const start = parseFloat(style.getPropertyValue('--dsh-windows-menu-start')) || 48
          const left = rect !== undefined && rect.width > 0 ? Math.round(rect.right + 8) : Math.round(start + 158)
          const top = Math.max(2, Math.round((height - 28) / 2))
          setPlacement((current) => current.left === left && current.top === top ? current : { left, top })
        }
        const schedule = () => {
          cancelAnimationFrame(frame)
          frame = requestAnimationFrame(measure)
        }
        const poll = () => {
          attempts += 1
          schedule()
          if (cursor() === undefined && attempts < 40) timer = setTimeout(poll, 150)
        }
        const cursor = () => document.querySelector('[data-windows-menu]')
        poll()
        const onLocale = () => schedule()
        const observer = new MutationObserver(schedule)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
        const bodyObserver = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node instanceof Element && (node.matches?.('[data-windows-menu]') || node.querySelector?.('[data-windows-menu]') !== null)) {
                schedule()
                return
              }
            }
          }
        })
        bodyObserver.observe(document.body, { childList: true })
        window.addEventListener('resize', onLocale)
        return () => {
          cancelAnimationFrame(frame)
          clearTimeout(timer)
          observer.disconnect()
          bodyObserver.disconnect()
          window.removeEventListener('resize', onLocale)
        }
      }, [enabled])
      return placement
    }

    async function request(path, body) {
      const init = body === undefined
        ? { cache: 'no-store', headers: { accept: 'application/json' } }
        : { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) }
      const response = await fetch(path, init)
      let data
      try {
        data = await response.json()
      } catch {
        data = undefined
      }
      if (!response.ok || data === undefined || data.ok !== true) {
        throw new Error(data?.error ?? `HTTP ${response.status}`)
      }
      return data
    }

    const STATUS_TONE = {
      connected: 'var(--dsw-alias-state-success-primary)',
      connecting: 'var(--dsw-alias-state-warn-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
      disabled: 'var(--dsw-alias-state-idle-primary)',
      invalid: 'var(--dsw-alias-state-error-primary)',
      stopped: 'var(--dsw-alias-state-idle-primary)',
    }

    function Dot({ status }) {
      return h('span', {
        className: 'mcp-mgr-dot',
        style: { background: STATUS_TONE[status] ?? 'var(--dsw-alias-state-idle-primary)' },
        'aria-hidden': true,
      })
    }

    function PlugIcon({ size = 15 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M9 3v5M15 3v5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
        h('path', { d: 'M6.5 8h11v3.2a5.5 5.5 0 0 1-11 0V8Z', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' }),
        h('path', { d: 'M12 16.7V21', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }))
    }

    function PlusIcon() {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M12 5v14M5 12h14', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }))
    }

    function CloseIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'm6 6 12 12M18 6 6 18', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }))
    }

    function RefreshIcon() {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    const CSS = `
      .mcp-mgr-root { pointer-events: none; }
      .mcp-mgr-chip {
        position: fixed; display: inline-flex; align-items: center; gap: 6px; height: 28px;
        padding: 0 10px; border: 0; border-radius: 6px; background: transparent;
        color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; line-height: 1;
        pointer-events: auto; cursor: pointer; -webkit-app-region: no-drag; z-index: 1090;
      }
      .mcp-mgr-chip:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); color: var(--dsw-alias-label-primary); }
      .mcp-mgr-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
      .mcp-mgr-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); flex: none; }
      .mcp-mgr-backdrop {
        position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center;
        padding: 24px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
        pointer-events: auto;
      }
      .mcp-mgr-dialog {
        display: flex; flex-direction: column; width: min(880px, 100%); max-height: min(760px, calc(100vh - 48px));
        background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary);
        border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; overflow: hidden;
        font: inherit; font-size: 13px;
      }
      .mcp-mgr-head { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .mcp-mgr-headmain { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
      .mcp-mgr-title { font-size: 15px; font-weight: 600; }
      .mcp-mgr-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--dsw-alias-label-secondary); font-size: 12px; }
      .mcp-mgr-path { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
      .mcp-mgr-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; flex: none; }
      .mcp-mgr-iconbtn:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); color: var(--dsw-alias-label-primary); }
      .mcp-mgr-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .mcp-mgr-toolbar .mcp-mgr-spacer { flex: 1; }
      .mcp-mgr-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
      .mcp-mgr-btn:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); border-color: var(--dsw-alias-border-l2); }
      .mcp-mgr-btn:disabled { opacity: .5; cursor: default; }
      .mcp-mgr-btn.primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
      .mcp-mgr-btn.danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
      .mcp-mgr-btn.small { height: 24px; padding: 0 8px; font-size: 12px; }
      .mcp-mgr-body { flex: 1; min-height: 0; overflow: auto; padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
      .mcp-mgr-row { display: flex; gap: 12px; padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
      .mcp-mgr-row[data-status="error"] { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, var(--dsw-alias-border-l1)); }
      .mcp-mgr-rowmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
      .mcp-mgr-nameline { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .mcp-mgr-name { font-weight: 600; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .mcp-mgr-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 999px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent); white-space: nowrap; }
      .mcp-mgr-badge.warn { color: var(--dsw-alias-state-warn-primary); }
      .mcp-mgr-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
      .mcp-mgr-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .mcp-mgr-summary { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11.5px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .mcp-mgr-err { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 1.45; word-break: break-word; }
      .mcp-mgr-warn { color: var(--dsw-alias-state-warn-primary); font-size: 12px; line-height: 1.45; }
      .mcp-mgr-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; justify-content: flex-end; flex: none; max-width: 300px; }
      .mcp-mgr-tools { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); }
      .mcp-mgr-toolrow { display: flex; flex-direction: column; gap: 1px; }
      .mcp-mgr-toolname { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11.5px; color: var(--dsw-alias-label-primary); word-break: break-all; }
      .mcp-mgr-toolrow p { margin: 0; font-size: 11.5px; color: var(--dsw-alias-label-secondary); line-height: 1.45; }
      .mcp-mgr-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 18px; text-align: center; }
      .mcp-mgr-empty h3 { margin: 0; font-size: 14px; }
      .mcp-mgr-empty p { margin: 0; color: var(--dsw-alias-label-secondary); max-width: 520px; line-height: 1.55; }
      .mcp-mgr-empty pre { margin: 0; text-align: left; max-width: 100%; max-height: 220px; overflow: auto; padding: 10px 12px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11.5px; line-height: 1.5; }
      .mcp-mgr-banner { display: flex; gap: 10px; align-items: flex-start; padding: 9px 11px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l1)); color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); font-size: 12px; line-height: 1.5; }
      .mcp-mgr-banner button { margin-left: auto; }
      .mcp-mgr-form { display: flex; flex-direction: column; gap: 12px; }
      .mcp-mgr-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .mcp-mgr-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .mcp-mgr-field.full { grid-column: 1 / -1; }
      .mcp-mgr-label { font-size: 12px; font-weight: 600; }
      .mcp-mgr-hint { font-size: 11.5px; color: var(--dsw-alias-label-secondary); line-height: 1.4; }
      .mcp-mgr-input, .mcp-mgr-textarea { width: 100%; box-sizing: border-box; padding: 7px 9px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; }
      .mcp-mgr-input:focus, .mcp-mgr-textarea:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
      .mcp-mgr-textarea { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; line-height: 1.5; resize: vertical; min-height: 84px; }
      .mcp-mgr-textarea.code { min-height: 300px; }
      .mcp-mgr-seg { display: inline-flex; padding: 2px; border-radius: 7px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); }
      .mcp-mgr-segitem { height: 26px; padding: 0 10px; border: 0; border-radius: 5px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
      .mcp-mgr-segitem[data-active] { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); }
      .mcp-mgr-check { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
      .mcp-mgr-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
      .mcp-mgr-loading { padding: 40px 18px; text-align: center; color: var(--dsw-alias-label-secondary); }
      @media (max-width: 720px) {
        .mcp-mgr-grid { grid-template-columns: minmax(0, 1fr); }
        .mcp-mgr-actions { max-width: none; }
        .mcp-mgr-row { flex-direction: column; }
      }
    `

    function useStyles() {
      React.useEffect(() => {
        if (document.querySelector('style[data-plugin-css="mcp-manager/panel.css"]') !== null) return undefined
        const tag = document.createElement('style')
        tag.dataset.plugin = '@local/dsh-mcp-manager'
        tag.dataset.pluginCss = 'mcp-manager/panel.css'
        tag.textContent = CSS
        document.head.append(tag)
        return () => {
          tag.remove()
        }
      }, [])
    }

    const EMPTY_DRAFT = {
      name: '',
      type: 'stdio',
      command: '',
      argsText: '',
      envText: '',
      cwd: '',
      url: '',
      headersText: '',
      timeout: '',
      disabled: false,
    }

    function draftFromEntry(name, entry) {
      const stdio = typeof entry.command === 'string' && entry.command.length > 0
      return {
        name,
        type: stdio ? 'stdio' : 'http',
        command: stdio ? entry.command : '',
        argsText: Array.isArray(entry.args) ? entry.args.join('\n') : '',
        envText: Object.entries(entry.env ?? {}).map(([key, value]) => `${key}=${value}`).join('\n'),
        cwd: typeof entry.cwd === 'string' ? entry.cwd : '',
        url: typeof entry.url === 'string' ? entry.url : '',
        headersText: Object.entries(entry.headers ?? {}).map(([key, value]) => `${key}: ${value}`).join('\n'),
        timeout: typeof entry.timeoutMs === 'number' ? String(entry.timeoutMs) : '',
        disabled: entry.disabled === true,
      }
    }

    function parsePairs(text, separator) {
      const result = {}
      for (const line of String(text).split(/\r?\n/)) {
        const trimmed = line.trim()
        if (trimmed.length === 0) continue
        const index = trimmed.indexOf(separator)
        if (index <= 0) continue
        const key = trimmed.slice(0, index).trim()
        const value = trimmed.slice(index + 1).trim()
        if (key.length > 0) result[key] = value
      }
      return result
    }

    function entryFromDraft(draft) {
      const entry = {}
      if (draft.type === 'stdio') {
        entry.type = 'stdio'
        entry.command = draft.command.trim()
        entry.args = draft.argsText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)
        const env = parsePairs(draft.envText, '=')
        if (Object.keys(env).length > 0) entry.env = env
        if (draft.cwd.trim().length > 0) entry.cwd = draft.cwd.trim()
      } else {
        entry.type = 'http'
        entry.url = draft.url.trim()
        const headers = parsePairs(draft.headersText, ':')
        if (Object.keys(headers).length > 0) entry.headers = headers
      }
      if (draft.disabled) entry.disabled = true
      const timeout = Number(draft.timeout)
      if (Number.isFinite(timeout) && timeout > 0) entry.timeoutMs = timeout
      return entry
    }

    function Field({ label, hint, full, children }) {
      return h('div', { className: `mcp-mgr-field${full ? ' full' : ''}` },
        h('span', { className: 'mcp-mgr-label' }, label),
        children,
        hint === undefined ? null : h('span', { className: 'mcp-mgr-hint' }, hint))
    }

    function ServerRow({ server, t, busy, onEdit, onRestart, onToggle, onDelete }) {
      const [expanded, setExpanded] = React.useState(false)
      const toolCount = server.tools.length
      const statusKey = `status.${server.status}`
      return h('div', { className: 'mcp-mgr-row', 'data-status': server.status },
        h('div', { className: 'mcp-mgr-rowmain' },
          h('div', { className: 'mcp-mgr-nameline' },
            h(Dot, { status: server.status }),
            h('span', { className: 'mcp-mgr-name', title: server.name }, server.name),
            h('span', { className: 'mcp-mgr-badge' }, t(`transport.${server.transport === 'streamable-http' ? 'http' : server.transport}`)),
            server.serverName !== server.name ? h('span', { className: 'mcp-mgr-badge warn', title: t('tools.hint', { name: server.serverName }) }, server.serverName) : null,
            server.disabled ? h('span', { className: 'mcp-mgr-badge' }, t('badge.disabled')) : null,
            toolCount > 0 ? h('button', {
              className: 'mcp-mgr-badge',
              style: { border: 0, cursor: 'pointer', font: 'inherit', fontSize: '11.5px' },
              type: 'button',
              onClick: () => setExpanded((value) => !value),
              'aria-expanded': expanded,
            }, t('badge.tools', { count: toolCount })) : null),
          server.summary ? h('div', { className: 'mcp-mgr-summary', title: server.summary }, server.summary) : null,
          h('div', { className: 'mcp-mgr-status' },
            h(Dot, { status: server.status }),
            h('span', null, t(statusKey))),
          server.error ? h('div', { className: 'mcp-mgr-err' }, server.error) : null,
          (server.warnings ?? []).map((warning) => h('div', { key: warning, className: 'mcp-mgr-warn' }, warning)),
          expanded ? h('div', { className: 'mcp-mgr-tools' },
            toolCount === 0
              ? h('span', { className: 'mcp-mgr-hint' }, t('tools.empty'))
              : server.tools.map((tool) => h('div', { key: tool.name, className: 'mcp-mgr-toolrow' },
                h('span', { className: 'mcp-mgr-toolname' }, tool.name),
                tool.description ? h('p', null, tool.description) : null))) : null),
        h('div', { className: 'mcp-mgr-actions' },
          toolCount > 0 ? h('button', { type: 'button', className: 'mcp-mgr-btn small', disabled: busy, onClick: () => setExpanded((value) => !value) }, t('action.tools')) : null,
          h('button', { type: 'button', className: 'mcp-mgr-btn small', disabled: busy || server.status === 'invalid', onClick: () => onEdit(server) }, t('action.edit')),
          h('button', { type: 'button', className: 'mcp-mgr-btn small', disabled: busy || server.status === 'invalid', onClick: () => onRestart(server.name) }, t('action.restart')),
          h('button', {
            type: 'button',
            className: 'mcp-mgr-btn small',
            disabled: busy || server.status === 'invalid',
            onClick: () => onToggle(server),
          }, server.disabled ? t('action.enable') : t('action.disable')),
          h('button', { type: 'button', className: 'mcp-mgr-btn small danger', disabled: busy, onClick: () => onDelete(server) }, t('action.delete'))))
    }

    function Editor({ t, mode, draft, setDraft, existing, onSave, onCancel, busy, error }) {
      const isNew = mode === 'add'
      const submit = () => {
        const name = draft.name.trim()
        if (name.length === 0) return onSave({ error: t('form.required.name') })
        if (draft.type === 'stdio' ? draft.command.trim().length === 0 : draft.url.trim().length === 0) {
          return onSave({ error: t('form.required.target') })
        }
        onSave({ name, entry: entryFromDraft(draft) })
      }
      return h('div', { className: 'mcp-mgr-form' },
        error ? h('div', { className: 'mcp-mgr-banner' }, error) : null,
        h('div', { className: 'mcp-mgr-grid' },
          h(Field, { label: t('form.name'), hint: t('form.name.hint') },
            h('input', {
              className: 'mcp-mgr-input',
              value: draft.name,
              autoFocus: isNew,
              spellCheck: false,
              onChange: (event) => setDraft({ ...draft, name: event.target.value }),
            })),
          h(Field, { label: t('form.type') },
            h('div', { className: 'mcp-mgr-seg', role: 'tablist' },
              h('button', {
                type: 'button',
                role: 'tab',
                className: 'mcp-mgr-segitem',
                'data-active': draft.type === 'stdio' ? '' : undefined,
                'aria-selected': draft.type === 'stdio',
                onClick: () => setDraft({ ...draft, type: 'stdio' }),
              }, t('form.type.stdio')),
              h('button', {
                type: 'button',
                role: 'tab',
                className: 'mcp-mgr-segitem',
                'data-active': draft.type === 'http' ? '' : undefined,
                'aria-selected': draft.type === 'http',
                onClick: () => setDraft({ ...draft, type: 'http' }),
              }, t('form.type.http')))),
          draft.type === 'stdio'
            ? h(React.Fragment, null,
              h(Field, { label: t('form.command'), hint: t('form.command.hint') },
                h('input', {
                  className: 'mcp-mgr-input',
                  value: draft.command,
                  spellCheck: false,
                  placeholder: 'npx',
                  onChange: (event) => setDraft({ ...draft, command: event.target.value }),
                })),
              h(Field, { label: t('form.cwd'), hint: t('form.cwd.hint') },
                h('input', {
                  className: 'mcp-mgr-input',
                  value: draft.cwd,
                  spellCheck: false,
                  onChange: (event) => setDraft({ ...draft, cwd: event.target.value }),
                })),
              h(Field, { label: t('form.args'), hint: t('form.args.hint'), full: true },
                h('textarea', {
                  className: 'mcp-mgr-textarea',
                  value: draft.argsText,
                  spellCheck: false,
                  onChange: (event) => setDraft({ ...draft, argsText: event.target.value }),
                })),
              h(Field, { label: t('form.env'), hint: t('form.env.hint'), full: true },
                h('textarea', {
                  className: 'mcp-mgr-textarea',
                  value: draft.envText,
                  spellCheck: false,
                  onChange: (event) => setDraft({ ...draft, envText: event.target.value }),
                })))
            : h(React.Fragment, null,
              h(Field, { label: t('form.url'), hint: t('form.url.hint'), full: true },
                h('input', {
                  className: 'mcp-mgr-input',
                  value: draft.url,
                  spellCheck: false,
                  placeholder: 'https://example.com/mcp',
                  onChange: (event) => setDraft({ ...draft, url: event.target.value }),
                })),
              h(Field, { label: t('form.headers'), hint: t('form.headers.hint'), full: true },
                h('textarea', {
                  className: 'mcp-mgr-textarea',
                  value: draft.headersText,
                  spellCheck: false,
                  placeholder: 'Authorization: Bearer …',
                  onChange: (event) => setDraft({ ...draft, headersText: event.target.value }),
                }))),
          h(Field, { label: t('form.timeout'), hint: t('form.timeout.hint') },
            h('input', {
              className: 'mcp-mgr-input',
              value: draft.timeout,
              inputMode: 'numeric',
              spellCheck: false,
              onChange: (event) => setDraft({ ...draft, timeout: event.target.value }),
            })),
          h('label', { className: 'mcp-mgr-check', style: { alignSelf: 'end', paddingBottom: '4px' } },
            h('input', {
              type: 'checkbox',
              checked: draft.disabled,
              onChange: (event) => setDraft({ ...draft, disabled: event.target.checked }),
            }),
            t('form.disabled'))),
        h('div', { className: 'mcp-mgr-footer' },
          h('button', { type: 'button', className: 'mcp-mgr-btn', disabled: busy, onClick: onCancel }, t('action.cancel')),
          h('button', { type: 'button', className: 'mcp-mgr-btn primary', disabled: busy, onClick: submit }, t('action.save'))))
    }

    function JsonEditor({ t, initial, onSave, onCancel, busy }) {
      const [text, setText] = React.useState(initial)
      const [error, setError] = React.useState(undefined)
      const submit = () => {
        try {
          const parsed = JSON.parse(text)
          if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.mcpServers === null || typeof parsed.mcpServers !== 'object' || Array.isArray(parsed.mcpServers)) {
            setError(t('json.shape'))
            return
          }
          onSave(parsed.mcpServers)
        } catch (problem) {
          setError(t('json.invalid', { message: String(problem?.message ?? problem) }))
        }
      }
      return h('div', { className: 'mcp-mgr-form' },
        h('span', { className: 'mcp-mgr-hint' }, t('json.hint')),
        error ? h('div', { className: 'mcp-mgr-banner' }, error) : null,
        h('textarea', {
          className: 'mcp-mgr-textarea code',
          value: text,
          spellCheck: false,
          onChange: (event) => setText(event.target.value),
        }),
        h('div', { className: 'mcp-mgr-footer' },
          h('button', { type: 'button', className: 'mcp-mgr-btn', disabled: busy, onClick: onCancel }, t('action.cancel')),
          h('button', { type: 'button', className: 'mcp-mgr-btn primary', disabled: busy, onClick: submit }, t('action.save'))))
    }

    function ImportPanel({ t, onImport, onCancel, busy }) {
      const [text, setText] = React.useState('')
      const [mode, setMode] = React.useState('merge')
      const [error, setError] = React.useState(undefined)
      const submit = () => {
        if (text.trim().length === 0) {
          setError(t('import.empty'))
          return
        }
        try {
          const parsed = JSON.parse(text)
          const incoming = parsed !== null && typeof parsed === 'object' && parsed.mcpServers !== undefined ? parsed.mcpServers : parsed
          if (incoming === null || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('mcpServers')
          onImport(incoming, mode)
        } catch (problem) {
          setError(t('import.invalid', { message: String(problem?.message ?? problem) }))
        }
      }
      return h('div', { className: 'mcp-mgr-form' },
        h('span', { className: 'mcp-mgr-hint' }, t('import.hint')),
        error ? h('div', { className: 'mcp-mgr-banner' }, error) : null,
        h('textarea', {
          className: 'mcp-mgr-textarea code',
          value: text,
          spellCheck: false,
          placeholder: '{\n  "mcpServers": {}\n}',
          onChange: (event) => setText(event.target.value),
        }),
        h('div', { className: 'mcp-mgr-seg' },
          h('button', { type: 'button', className: 'mcp-mgr-segitem', 'data-active': mode === 'merge' ? '' : undefined, onClick: () => setMode('merge') }, t('import.merge')),
          h('button', { type: 'button', className: 'mcp-mgr-segitem', 'data-active': mode === 'replace' ? '' : undefined, onClick: () => setMode('replace') }, t('import.replace'))),
        h('div', { className: 'mcp-mgr-footer' },
          h('button', { type: 'button', className: 'mcp-mgr-btn', disabled: busy, onClick: onCancel }, t('action.cancel')),
          h('button', { type: 'button', className: 'mcp-mgr-btn primary', disabled: busy, onClick: submit }, t('action.save'))))
    }

    function Panel({ t }) {
      const titlebar = useTitlebar()
      const placement = useCaptionPlacement(titlebar)
      useStyles()
      const open = useOpen()
      const [state, setState] = React.useState(undefined)
      const [loadError, setLoadError] = React.useState(undefined)
      const [actionError, setActionError] = React.useState(undefined)
      const [busy, setBusy] = React.useState(false)
      const [view, setView] = React.useState({ kind: 'list' })
      const [draft, setDraft] = React.useState(EMPTY_DRAFT)
      const [formError, setFormError] = React.useState(undefined)
      const [pendingDelete, setPendingDelete] = React.useState(undefined)
      const closeRef = React.useRef(undefined)

      React.useEffect(() => {
        if (!open) return undefined
        let alive = true
        const load = async () => {
          try {
            const data = await request(STATE_PATH)
            if (alive) {
              setState(data)
              setLoadError(undefined)
            }
          } catch (problem) {
            if (alive) setLoadError(t('error.load', { message: String(problem?.message ?? problem) }))
          }
        }
        void load()
        const timer = setInterval(load, 2000)
        return () => {
          alive = false
          clearInterval(timer)
        }
      }, [open, t])

      React.useEffect(() => {
        if (!open) {
          setView({ kind: 'list' })
          setFormError(undefined)
          setPendingDelete(undefined)
          return undefined
        }
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            if (view.kind === 'list') setOpen(false)
            else setView({ kind: 'list' })
          }
        }
        document.addEventListener('keydown', onKey, true)
        const timer = setTimeout(() => closeRef.current?.focus?.(), 30)
        return () => {
          document.removeEventListener('keydown', onKey, true)
          clearTimeout(timer)
        }
      }, [open, view.kind])

      const run = React.useCallback(async (operation) => {
        setBusy(true)
        try {
          const data = await operation()
          if (data !== undefined) setState(data)
          setActionError(undefined)
          return true
        } catch (problem) {
          setActionError(String(problem?.message ?? problem))
          return false
        } finally {
          setBusy(false)
        }
      }, [])

      const saveServers = React.useCallback((servers) => run(async () => {
        const data = await request(SAVE_PATH, { mcpServers: servers })
        setView({ kind: 'list' })
        setPendingDelete(undefined)
        setFormError(undefined)
        return data
      }), [run])

      const restart = React.useCallback((name) => run(async () => request(ACTION_PATH, { action: 'restart', name })), [run])
      const reload = React.useCallback(() => run(async () => request(ACTION_PATH, { action: 'reload' })), [run])

      const servers = state?.servers ?? []
      const connected = servers.filter((server) => server.status === 'connected').length
      const toolCount = servers.reduce((total, server) => total + server.tools.length, 0)
      const summary = servers.length === 0
        ? t('summary.empty')
        : t('summary.count', { count: servers.length, connected, tools: toolCount })
      const chipTone = actionError !== undefined || loadError !== undefined
        ? 'var(--dsw-alias-state-error-primary)'
        : servers.some((server) => server.status === 'error')
          ? 'var(--dsw-alias-state-error-primary)'
          : servers.some((server) => server.status === 'connecting')
            ? 'var(--dsw-alias-state-warn-primary)'
            : connected > 0
              ? 'var(--dsw-alias-state-success-primary)'
              : 'var(--dsw-alias-state-idle-primary)'

      const beginAdd = () => {
        setDraft(EMPTY_DRAFT)
        setFormError(undefined)
        setView({ kind: 'form', mode: 'add', original: undefined })
      }

      const beginEdit = (server) => {
        setDraft(draftFromEntry(server.name, server.entry ?? {}))
        setFormError(undefined)
        setView({ kind: 'form', mode: 'edit', original: server.name })
      }

      const submitForm = ({ name, entry, error: validation }) => {
        if (validation !== undefined) {
          setFormError(validation)
          return
        }
        const existing = state?.mcpServers ?? {}
        const next = { ...existing }
        if (view.kind === 'form' && view.original !== undefined && view.original !== name) delete next[view.original]
        if (Object.hasOwn(existing, name) && (view.kind !== 'form' || view.original !== name)) {
          setFormError(t('form.duplicate'))
          return
        }
        next[name] = entry
        void saveServers(next)
      }

      const toggle = (server) => {
        void run(async () => request(ACTION_PATH, { action: 'setEnabled', name: server.name, enabled: server.disabled === true }))
      }

      const remove = (server) => {
        void run(async () => request(ACTION_PATH, { action: 'delete', name: server.name }))
        setPendingDelete(undefined)
      }

      const chip = titlebar
        ? h('button', {
          type: 'button',
          className: 'mcp-mgr-chip',
          style: { left: `${placement.left}px`, top: `${placement.top}px` },
          title: t('chip.open'),
          'aria-label': t('chip.open'),
          onClick: () => setOpen(true),
        },
        h('span', { className: 'mcp-mgr-chip-dot', style: { background: chipTone } }),
        h(PlugIcon, { size: 14 }),
        h('span', null, t('chip.label')))
        : null

      if (!open) return h('div', { className: 'mcp-mgr-root' }, chip)

      const title = view.kind === 'form'
        ? (view.mode === 'add' ? t('form.add.title') : t('form.edit.title', { name: view.original }))
        : view.kind === 'json'
          ? t('json.title')
          : view.kind === 'import'
            ? t('import.title')
            : t('title')

      const body = view.kind === 'form'
        ? h(Editor, {
          t,
          mode: view.mode,
          draft,
          setDraft,
          existing: view.original,
          busy,
          error: formError,
          onCancel: () => setView({ kind: 'list' }),
          onSave: submitForm,
        })
        : view.kind === 'json'
          ? h(JsonEditor, {
            t,
            initial: `${JSON.stringify({ mcpServers: state?.mcpServers ?? {} }, undefined, 2)}\n`,
            busy,
            onCancel: () => setView({ kind: 'list' }),
            onSave: (next) => void saveServers(next),
          })
          : view.kind === 'import'
            ? h(ImportPanel, {
              t,
              busy,
              onCancel: () => setView({ kind: 'list' }),
              onImport: (incoming, mode) => {
                const existing = state?.mcpServers ?? {}
                void saveServers(mode === 'replace' ? incoming : { ...existing, ...incoming })
              },
            })
            : h('div', { className: 'mcp-mgr-body' },
              state?.fileError === undefined ? null : h('div', { className: 'mcp-mgr-banner' }, t('error.file', { message: state.fileError })),
              state?.moduleError === undefined ? null : h('div', { className: 'mcp-mgr-banner' }, t('error.module', { message: state.moduleError })),
              state === undefined && loadError === undefined
                ? h('div', { className: 'mcp-mgr-loading' }, t('loading'))
                : servers.length === 0
                  ? h('div', { className: 'mcp-mgr-empty' },
                    h(PlugIcon, { size: 28 }),
                    h('h3', null, t('list.empty.title')),
                    h('p', null, t('list.empty.body')),
                    h('pre', null, t('list.empty.example')),
                    h('div', { style: { display: 'flex', gap: '8px' } },
                      h('button', { type: 'button', className: 'mcp-mgr-btn primary', onClick: beginAdd }, t('toolbar.add')),
                      h('button', { type: 'button', className: 'mcp-mgr-btn', onClick: () => setView({ kind: 'import' }) }, t('toolbar.import'))))
                  : servers.map((server) => h(ServerRow, {
                    key: server.name,
                    server,
                    t,
                    busy,
                    onEdit: beginEdit,
                    onRestart: (name) => void restart(name),
                    onToggle: toggle,
                    onDelete: (item) => setPendingDelete(item.name),
                  })),
              pendingDelete === undefined ? null : h('div', { className: 'mcp-mgr-banner', style: { borderColor: 'var(--dsw-alias-state-error-primary)' } },
                h('span', null, t('delete.hint', { name: pendingDelete })),
                h('button', { type: 'button', className: 'mcp-mgr-btn small danger', disabled: busy, onClick: () => {
                  const server = servers.find((item) => item.name === pendingDelete)
                  if (server !== undefined) remove(server)
                } }, t('action.confirm')),
                h('button', { type: 'button', className: 'mcp-mgr-btn small', onClick: () => setPendingDelete(undefined) }, t('action.cancel'))))

      return h('div', { className: 'mcp-mgr-root' },
        chip,
        h('div', {
          className: 'mcp-mgr-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) setOpen(false)
          },
        },
        h('div', { className: 'mcp-mgr-dialog', role: 'dialog', 'aria-modal': true, 'aria-label': t('title') },
          h('div', { className: 'mcp-mgr-head' },
            h('div', { className: 'mcp-mgr-headmain' },
              h('div', { className: 'mcp-mgr-title' }, title),
              h('div', { className: 'mcp-mgr-meta' },
                h('span', null, summary),
                h('span', null, '·'),
                h('span', { className: 'mcp-mgr-path', title: state?.path ?? '' }, state?.path ?? t('path.unknown')))),
            h('button', { ref: closeRef, type: 'button', className: 'mcp-mgr-iconbtn', onClick: () => setOpen(false), 'aria-label': t('action.close') }, h(CloseIcon))),
          view.kind !== 'list'
            ? null
            : h('div', { className: 'mcp-mgr-toolbar' },
              h('button', { type: 'button', className: 'mcp-mgr-btn primary', disabled: busy, onClick: beginAdd }, h(PlusIcon), t('toolbar.add')),
              h('button', { type: 'button', className: 'mcp-mgr-btn', disabled: busy, onClick: () => setView({ kind: 'import' }) }, t('toolbar.import')),
              h('button', { type: 'button', className: 'mcp-mgr-btn', disabled: busy || state === undefined, onClick: () => setView({ kind: 'json' }) }, t('toolbar.json')),
              h('span', { className: 'mcp-mgr-spacer' }),
              h('button', { type: 'button', className: 'mcp-mgr-btn', disabled: busy, onClick: () => void reload(), title: t('toolbar.refresh'), 'aria-label': t('toolbar.refresh') }, h(RefreshIcon))),
          actionError === undefined
            ? null
            : h('div', { className: 'mcp-mgr-banner', style: { margin: '10px 18px 0' } },
              h('span', null, actionError),
              h('button', { type: 'button', className: 'mcp-mgr-btn small', onClick: () => setActionError(undefined) }, t('error.dismiss'))),
          loadError === undefined
            ? null
            : h('div', { className: 'mcp-mgr-banner', style: { margin: '10px 18px 0' } }, loadError),
          view.kind === 'list'
            ? body
            : h('div', { className: 'mcp-mgr-body' }, body))))
    }

    /** Fallback for browser pages without the Desktop caption bar. */
    function HeaderEntry({ t }) {
      const titlebar = useTitlebar()
      const open = useOpen()
      if (titlebar) return null
      return h('button', {
        type: 'button',
        className: 'mcp-mgr-btn',
        style: { marginRight: '4px' },
        title: t('chip.open'),
        onClick: () => setOpen(!open),
      }, h(PlugIcon, { size: 14 }), h('span', null, t('chip.label')))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'mcp-manager dictionaries')
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'mcp-manager',
          order: 40,
          locale: NS,
        }, Panel))
        ctx.slots.inject('conversation.header.leading', () => ctx.slots.register({
          name: 'conversation.header.leading',
          locale: NS,
        }, HeaderEntry))
      },
    }
  },
})
