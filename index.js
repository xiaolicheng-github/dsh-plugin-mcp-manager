/**
 * MCP manager — Host half.
 *
 * Reads and writes a mainstream `mcpServers` JSON document (the shape used by
 * Claude Desktop, Cursor, and VS Code) at `$DSH_HOME/mcp.json`, then instantiates
 * one `@deepseek-ai/dsh-mcp-client` plugin per enabled server inside this Host.
 * Instances are ordinary Cordis child fibers, so adding, changing, disabling, or
 * removing a server takes effect without editing the profile patch or restarting.
 */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFile, writeFile, rename, mkdir, stat, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'mcp-manager'
/** The authenticated Fetch routes need `connection`; server tools register on `tools`. */
export const inject = ['connection', 'tools']

const CLIENT_PACKAGE = '@deepseek-ai/dsh-mcp-client'
const STATE_PATH = '/api/mcp-manager.state'
const SAVE_PATH = '/api/mcp-manager.save'
const ACTION_PATH = '/api/mcp-manager.action'
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
const VARIABLE = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g

/** A user-facing failure that maps to an HTTP status and a panel message. */
class ManagerError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeError(error) {
  if (error === undefined || error === null) return '未知错误'
  const seen = new Set()
  const parts = []
  const visit = (value) => {
    if (value === undefined || value === null || seen.has(value)) return
    if (typeof value === 'object') {
      seen.add(value)
      if (typeof value.message === 'string' && value.message.length > 0) {
        parts.push(value.message)
      } else {
        parts.push(String(value))
      }
      if (value.cause !== undefined) visit(value.cause)
      if (Array.isArray(value.errors)) for (const item of value.errors) visit(item)
    } else {
      parts.push(String(value))
    }
  }
  visit(error)
  const text = parts.filter((part, index) => parts.indexOf(part) === index).join(': ')
  return text.length > 600 ? `${text.slice(0, 600)}…` : text
}

function configPath() {
  const home = process.env.DSH_HOME
  return join(home && home.length > 0 ? home : join(homedir(), '.dsh'), 'mcp.json')
}

/** Expand `${VAR}` / `${VAR:-fallback}` the way mainstream MCP JSON files do. */
function expand(value) {
  if (typeof value !== 'string') return value
  return value.replace(VARIABLE, (match, key, fallback) => {
    const current = process.env[key]
    if (current !== undefined && current.length > 0) return current
    return fallback !== undefined ? fallback : match
  })
}

function expandAll(texts) {
  const result = {}
  for (const [key, value] of Object.entries(texts)) result[key] = expand(String(value))
  return result
}

function sanitizeServerName(raw, taken) {
  let base = String(raw).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32)
  if (base.length === 0) base = 'server'
  const first = base
  let candidate = first
  let index = 2
  while (taken.has(candidate)) {
    const suffix = `_${index}`
    index += 1
    candidate = `${first.slice(0, 32 - suffix.length)}${suffix}`
  }
  taken.add(candidate)
  return candidate
}

/**
 * Validate one `mcpServers` entry and normalize the values the bridge accepts.
 * Unknown keys stay on disk but are not forwarded.
 */
function normalizeEntry(name, raw) {
  if (!isRecord(raw)) throw new ManagerError(400, `服务器 "${name}" 的配置必须是 JSON 对象`)
  const entry = { ...raw }
  const command = typeof entry.command === 'string' ? entry.command.trim() : ''
  const url = typeof entry.url === 'string' ? entry.url.trim() : ''
  if (url.length === 0 && command.length === 0) {
    throw new ManagerError(400, `服务器 "${name}" 需要 "command"（本地进程）或 "url"（远程服务）`)
  }
  if (entry.args !== undefined) {
    if (!Array.isArray(entry.args)) throw new ManagerError(400, `服务器 "${name}" 的 "args" 必须是字符串数组`)
    entry.args = entry.args.map((value) => String(value))
  } else {
    entry.args = []
  }
  if (entry.env !== undefined) {
    if (!isRecord(entry.env)) throw new ManagerError(400, `服务器 "${name}" 的 "env" 必须是对象`)
    const env = {}
    for (const [key, value] of Object.entries(entry.env)) env[key] = String(value)
    entry.env = env
  } else {
    entry.env = {}
  }
  if (entry.headers !== undefined) {
    if (!isRecord(entry.headers)) throw new ManagerError(400, `服务器 "${name}" 的 "headers" 必须是对象`)
    const headers = {}
    for (const [key, value] of Object.entries(entry.headers)) headers[key] = String(value)
    entry.headers = headers
  } else {
    entry.headers = {}
  }
  if (entry.command !== undefined && typeof entry.command !== 'string') throw new ManagerError(400, `服务器 "${name}" 的 "command" 必须是字符串`)
  if (entry.url !== undefined && typeof entry.url !== 'string') throw new ManagerError(400, `服务器 "${name}" 的 "url" 必须是字符串`)
  if (entry.cwd !== undefined && typeof entry.cwd !== 'string') throw new ManagerError(400, `服务器 "${name}" 的 "cwd" 必须是字符串`)
  if (entry.disabled !== undefined && typeof entry.disabled !== 'boolean') throw new ManagerError(400, `服务器 "${name}" 的 "disabled" 必须是布尔值`)
  if (entry.timeoutMs !== undefined && (typeof entry.timeoutMs !== 'number' || !Number.isFinite(entry.timeoutMs) || entry.timeoutMs <= 0)) {
    throw new ManagerError(400, `服务器 "${name}" 的 "timeoutMs" 必须是正数`)
  }
  if (command.length > 0) {
    entry.command = command
    entry.url = undefined
    delete entry.url
    if (entry.cwd !== undefined && entry.cwd.length > 0) entry.cwd = entry.cwd
    else delete entry.cwd
  } else {
    entry.url = url
    delete entry.command
    delete entry.args
    delete entry.env
    delete entry.cwd
  }
  entry.type = command.length > 0 ? 'stdio' : 'http'
  return entry
}

/** The transport the bridge should open for one entry. */
function transportOf(entry) {
  return entry.command !== undefined && entry.command.length > 0 ? 'stdio' : 'streamable-http'
}

function toClientConfig(entry, serverName) {
  const common = { serverName, failOnStartupError: true }
  if (entry.timeoutMs !== undefined) common.toolCallTimeoutMs = entry.timeoutMs
  if (transportOf(entry) === 'stdio') {
    return {
      ...common,
      transport: 'stdio',
      command: expand(entry.command),
      args: (entry.args ?? []).map((value) => expand(value)),
      env: expandAll(entry.env ?? {}),
      ...(typeof entry.cwd === 'string' && entry.cwd.length > 0 ? { cwd: expand(entry.cwd) } : {}),
    }
  }
  return {
    ...common,
    transport: 'streamable-http',
    url: expand(entry.url),
    headers: expandAll(entry.headers ?? {}),
  }
}

function summaryOf(entry) {
  if (transportOf(entry) === 'stdio') {
    return [entry.command, ...(entry.args ?? [])].join(' ')
  }
  return entry.url
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export function apply(ctx) {
  const path = configPath()
  /** Parsed document, including keys this plugin does not manage. */
  let document = { mcpServers: {} }
  /** Servers currently owned: name -> slot. */
  const slots = new Map()
  let fileError
  let moduleError
  let lastMtime
  let modulePromise
  let disposed = false
  let queue = Promise.resolve()

  const enqueue = (task) => {
    const run = queue.then(task, task)
    queue = run.catch(() => {})
    return run
  }

  async function loadClientModule() {
    if (modulePromise !== undefined) return modulePromise
    modulePromise = (async () => {
      const attempts = []
      const entry = process.argv[1]
      const loader = ctx.get('loader')
      if (loader?.internal !== undefined && typeof entry === 'string' && entry.length > 0) {
        try {
          const namespace = await loader.internal.import(CLIENT_PACKAGE, pathToFileURL(entry).href, {})
          if (namespace?.apply !== undefined) return namespace
          attempts.push('loader import 未返回 apply')
        } catch (error) {
          attempts.push(`loader import: ${describeError(error)}`)
        }
      }
      if (typeof entry === 'string' && entry.length > 0) {
        try {
          const resolved = createRequire(entry).resolve(CLIENT_PACKAGE)
          const namespace = await import(pathToFileURL(resolved).href)
          if (namespace?.apply !== undefined) return namespace
          attempts.push(`${resolved} 未返回 apply`)
        } catch (error) {
          attempts.push(`require.resolve: ${describeError(error)}`)
        }
      }
      const resources = process.resourcesPath
      if (typeof resources === 'string' && resources.length > 0) {
        const candidate = join(resources, 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-mcp-client', 'lib', 'index.js')
        try {
          const namespace = await import(pathToFileURL(candidate).href)
          if (namespace?.apply !== undefined) return namespace
        } catch (error) {
          attempts.push(`app.asar: ${describeError(error)}`)
        }
      }
      throw new Error(`无法加载 ${CLIENT_PACKAGE}：${attempts.join('；') || '未找到该包'}`)
    })().catch((error) => {
      modulePromise = undefined
      moduleError = describeError(error)
      throw error
    })
    moduleError = undefined
    return modulePromise
  }

  function collectTools(serverName) {
    try {
      const schemas = ctx.tools.schemas()
      const prefix = `mcp__${serverName}__`
      return schemas
        .filter((schema) => typeof schema?.name === 'string' && schema.name.startsWith(prefix))
        .map((schema) => ({
          name: schema.name,
          description: typeof schema.description === 'string' ? schema.description.slice(0, 240) : '',
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
    } catch {
      return []
    }
  }

  async function disposeSlot(slot) {
    if (slot === undefined) return
    slot.disposed = true
    const fiber = slot.fiber
    slot.fiber = undefined
    if (fiber !== undefined) {
      try {
        await fiber.dispose()
      } catch (error) {
        ctx.logger.warn(`mcp-manager: 关闭 ${slot.name} 失败：${describeError(error)}`)
      }
    }
  }

  async function startSlot(slot) {
    slot.status = 'connecting'
    slot.error = undefined
    let fiber
    try {
      const namespace = await loadClientModule()
      if (slot.disposed) return
      fiber = ctx.plugin(namespace, toClientConfig(slot.entry, slot.serverName))
      slot.fiber = fiber
      if (slot.disposed) {
        await fiber.dispose()
        return
      }
      await fiber
      if (slot.disposed) {
        await fiber.dispose()
        return
      }
      slot.status = 'connected'
      slot.startedAt = Date.now()
      slot.tools = collectTools(slot.serverName)
      ctx.logger.info(`mcp-manager: ${slot.name} 已连接（${slot.tools.length} 个工具）`)
    } catch (error) {
      if (slot.disposed) return
      slot.status = 'error'
      slot.error = describeError(error)
      slot.tools = []
      ctx.logger.warn(`mcp-manager: ${slot.name} 连接失败：${slot.error}`)
    }
  }

  /** Reconcile the live fibers with the current `mcpServers` document. */
  async function applyServers() {
    const servers = isRecord(document.mcpServers) ? document.mcpServers : {}
    const taken = new Set()
    const desired = new Map()
    for (const rawName of Object.keys(servers)) {
      const raw = servers[rawName]
      if (!isRecord(raw)) continue
      let entry
      try {
        entry = normalizeEntry(rawName, raw)
      } catch (error) {
        entry = { ...raw, invalid: describeError(error) }
      }
      desired.set(rawName, {
        name: rawName,
        serverName: sanitizeServerName(rawName, taken),
        entry,
        fingerprint: JSON.stringify([rawName, entry]),
      })
    }
    for (const [name, slot] of [...slots]) {
      const next = desired.get(name)
      if (next === undefined || next.fingerprint !== slot.fingerprint) {
        slots.delete(name)
        await disposeSlot(slot)
      }
    }
    for (const [name, next] of desired) {
      if (slots.has(name)) continue
      if (next.entry.invalid !== undefined) {
        slots.set(name, {
          name,
          serverName: next.serverName,
          entry: next.entry,
          fingerprint: next.fingerprint,
          status: 'error',
          error: next.entry.invalid,
          tools: [],
          disabled: false,
        })
        continue
      }
      const slot = {
        name,
        serverName: next.serverName,
        entry: next.entry,
        fingerprint: next.fingerprint,
        status: next.entry.disabled === true ? 'disabled' : 'connecting',
        disabled: next.entry.disabled === true,
        tools: [],
        error: undefined,
      }
      slots.set(name, slot)
      if (!slot.disabled) void startSlot(slot)
    }
  }

  async function readDocument() {
    try {
      const text = await readFile(path, 'utf8')
      const parsed = text.trim().length === 0 ? {} : JSON.parse(text)
      if (!isRecord(parsed)) throw new Error('配置文件顶层必须是 JSON 对象')
      if (parsed.mcpServers !== undefined && !isRecord(parsed.mcpServers)) throw new Error('"mcpServers" 必须是对象')
      document = parsed
      if (document.mcpServers === undefined) document.mcpServers = {}
      fileError = undefined
    } catch (error) {
      if (error?.code === 'ENOENT') {
        document = { mcpServers: {} }
        fileError = undefined
      } else {
        fileError = describeError(error)
      }
    }
    try {
      lastMtime = (await stat(path)).mtimeMs
    } catch {
      lastMtime = undefined
    }
  }

  async function writeDocument(next) {
    await mkdir(dirname(path), { recursive: true })
    const temp = `${path}.${Date.now()}.tmp`
    const body = `${JSON.stringify(next, undefined, 2)}\n`
    await writeFile(temp, body, 'utf8')
    try {
      await rename(temp, path)
    } catch {
      await writeFile(path, body, 'utf8')
      try {
        await unlink(temp)
      } catch {}
    }
    document = next
    fileError = undefined
    try {
      lastMtime = (await stat(path)).mtimeMs
    } catch {
      lastMtime = undefined
    }
  }

  function snapshot() {
    const servers = []
    for (const slot of slots.values()) {
      if (slot.status === 'connected') slot.tools = collectTools(slot.serverName)
      if (slot.status !== 'error' && slot.status !== 'disabled' && slot.fiber !== undefined && slot.fiber.uid === null) {
        slot.status = 'stopped'
        slot.tools = []
      }
      servers.push({
        name: slot.name,
        serverName: slot.serverName,
        transport: slot.entry.invalid === undefined ? transportOf(slot.entry) : 'invalid',
        disabled: slot.disabled === true,
        status: slot.status,
        error: slot.error,
        tools: slot.tools ?? [],
        startedAt: slot.startedAt,
        entry: slot.entry,
        summary: slot.entry.invalid === undefined ? summaryOf(slot.entry) : '',
        warnings: slot.serverName !== slot.name ? [`工具前缀使用 "${slot.serverName}"`] : [],
      })
    }
    servers.sort((left, right) => left.name.localeCompare(right.name))
    return {
      ok: true,
      path,
      exists: lastMtime !== undefined,
      fileError,
      moduleError,
      mcpServers: isRecord(document.mcpServers) ? document.mcpServers : {},
      servers,
    }
  }

  async function saveServers(input) {
    if (!isRecord(input)) throw new ManagerError(400, 'mcpServers 必须是对象')
    const next = {}
    for (const [rawName, raw] of Object.entries(input)) {
      if (rawName.trim().length === 0) throw new ManagerError(400, '服务器名称不能为空')
      next[rawName] = normalizeEntry(rawName, raw)
      if (raw.disabled === true) next[rawName].disabled = true
    }
    const nextDocument = { ...(isRecord(document) ? document : {}), mcpServers: next }
    await writeDocument(nextDocument)
    await applyServers()
    return snapshot()
  }

  async function updateEntry(name, mutate) {
    const servers = isRecord(document.mcpServers) ? document.mcpServers : {}
    if (!Object.hasOwn(servers, name)) throw new ManagerError(404, `找不到服务器 "${name}"`)
    const next = { ...servers }
    const changed = mutate({ ...next[name] })
    if (changed === undefined) delete next[name]
    else next[name] = changed
    await saveServers(next)
    return snapshot()
  }

  async function action(body) {
    if (!isRecord(body) || typeof body.action !== 'string') throw new ManagerError(400, '缺少 action')
    switch (body.action) {
      case 'reload':
        await enqueue(async () => {
          await readDocument()
          await applyServers()
        })
        return snapshot()
      case 'restart': {
        if (typeof body.name !== 'string') throw new ManagerError(400, '缺少服务器名称')
        await enqueue(async () => {
          const slot = slots.get(body.name)
          if (slot === undefined) throw new ManagerError(404, `找不到服务器 "${body.name}"`)
          if (slot.entry.invalid !== undefined) throw new ManagerError(400, slot.entry.invalid)
          slots.delete(body.name)
          await disposeSlot(slot)
          const next = {
            name: slot.name,
            serverName: slot.serverName,
            entry: normalizeEntry(slot.name, slot.entry),
            fingerprint: slot.fingerprint,
            status: 'connecting',
            disabled: slot.entry.disabled === true,
            tools: [],
          }
          slots.set(next.name, next)
          if (next.entry.disabled !== true) void startSlot(next)
          else next.status = 'disabled'
        })
        return snapshot()
      }
      case 'setEnabled': {
        if (typeof body.name !== 'string') throw new ManagerError(400, '缺少服务器名称')
        return enqueue(() => updateEntry(body.name, (entry) => {
          if (body.enabled === true) delete entry.disabled
          else entry.disabled = true
          return entry
        }))
      }
      case 'delete': {
        if (typeof body.name !== 'string') throw new ManagerError(400, '缺少服务器名称')
        return enqueue(() => updateEntry(body.name, () => undefined))
      }
      default:
        throw new ManagerError(400, `未知操作 "${body.action}"`)
    }
  }

  const respond = (task) => async (request) => {
    try {
      const result = await task(request)
      return jsonResponse(result)
    } catch (error) {
      const status = error instanceof ManagerError ? error.status : 500
      return jsonResponse({ ok: false, error: describeError(error) }, status)
    }
  }

  const registerRoute = (route) => {
    ctx.effect(() => ctx.connection.fetch.register({
      path: route.path,
      methods: route.methods,
      requestBody: 'buffered',
      fetch: route.fetch,
    }), `mcp-manager route ${route.path}`)
  }

  registerRoute({
    path: STATE_PATH,
    methods: ['GET'],
    fetch: respond(async () => snapshot()),
  })
  registerRoute({
    path: SAVE_PATH,
    methods: ['POST'],
    fetch: respond(async (request) => {
      let body
      try {
        body = await request.json()
      } catch {
        throw new ManagerError(400, '请求体不是合法 JSON')
      }
      const servers = isRecord(body) && isRecord(body.mcpServers) ? body.mcpServers : body
      return enqueue(() => saveServers(servers))
    }),
  })
  registerRoute({
    path: ACTION_PATH,
    methods: ['POST'],
    fetch: respond(async (request) => {
      let body
      try {
        body = await request.json()
      } catch {
        throw new ManagerError(400, '请求体不是合法 JSON')
      }
      return action(body)
    }),
  })

  // Pick up edits made to mcp.json outside the panel.
  ctx.effect(() => {
    const timer = setInterval(() => {
      if (disposed) return
      void (async () => {
        try {
          const info = await stat(path)
          if (lastMtime !== undefined && info.mtimeMs === lastMtime) return
          lastMtime = info.mtimeMs
          await enqueue(async () => {
            await readDocument()
            await applyServers()
          })
        } catch (error) {
          if (error?.code === 'ENOENT' && lastMtime !== undefined) {
            lastMtime = undefined
            await enqueue(async () => {
              document = { mcpServers: {} }
              await applyServers()
            })
          }
        }
      })()
    }, 2500)
    timer.unref?.()
    return async () => {
      disposed = true
      clearInterval(timer)
      await queue.catch(() => {})
      for (const slot of slots.values()) await disposeSlot(slot)
      slots.clear()
    }
  }, 'mcp-manager lifecycle')

  void enqueue(async () => {
    await readDocument()
    await applyServers()
  }).catch((error) => {
    ctx.logger.error(`mcp-manager: 初始化失败：${describeError(error)}`)
  })
}
