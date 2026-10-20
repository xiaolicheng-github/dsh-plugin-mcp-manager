# MCP 管理（MCP Manager）

在 DeepSeek Harness 桌面窗口头部「应用 / 编辑」菜单右侧增加一个 **MCP 管理** 入口，点击后打开 MCP 服务器管理面板。面板以市面上最常用的 `mcpServers` JSON 格式管理服务器，并直接复用 Harness 自带的 [`@deepseek-ai/dsh-mcp-client`](https://www.npmjs.com/package/@deepseek-ai/dsh-mcp-client) 建立连接。

## 配置方式

配置文件：`$DSH_HOME/mcp.json`（Windows 默认 `C:\Users\<用户名>\.dsh\mcp.json`）。在面板中新增、导入或保存后立即生效，无需修改 `cordis.patch.yml`，也无需重启 Host。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\work"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "remote": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    }
  }
}
```

字段说明：

| 字段 | 适用 | 说明 |
|---|---|---|
| `command` | stdio | 启动命令，例如 `npx`、`uvx` 或可执行文件绝对路径 |
| `args` | stdio | 参数数组 |
| `env` | stdio | 额外环境变量；支持 `${VAR}`、`${VAR:-默认值}` |
| `cwd` | stdio | 工作目录（可选） |
| `url` | 远程 | Streamable HTTP 端点 |
| `headers` | 远程 | 请求头；支持变量展开 |
| `type` | 可选 | `stdio` / `http`（`sse` 会按 Streamable HTTP 尝试） |
| `disabled` | 可选 | `true` 时保留配置但不启动 |
| `timeoutMs` | 可选 | 单次工具调用超时，默认 60000 |

面板还支持「导入 JSON」，可直接粘贴 Claude Desktop、Cursor 或 VS Code 的 `mcp.json` 内容（合并或整体替换），以及「JSON 编辑」直接修改完整文档。

## 行为

- 每个启用的服务器在 Host 中以一个独立的 `dsh-mcp-client` 实例运行；停用、修改、删除会立即断开或重连对应实例。
- 工具按 `mcp__<服务器前缀>__<工具名>` 注册；名称含非法字符时会自动规范化并在面板中提示。
- 启动失败（命令不存在、端口不通、鉴权失败等）会保留服务器条目并在面板中显示错误，可随时「重启」重试。
- 直接编辑 `mcp.json` 也会被监听并在数秒内应用。
- 「启用 MCP 服务器」会向模型授予新的工具能力，因此该操作仅通过面板由用户完成，不提供模型工具入口。

## 已知限制

- `dsh-mcp-client` 仅支持 stdio 与 Streamable HTTP；旧式 SSE 服务器无法连接。
- 面板通过 Harness 已认证的 `/api` Fetch 路由读写配置，权限与页面本身一致。
- 未在浏览器版 Harness 中验证：无桌面标题栏时入口退回到会话头部左侧。
