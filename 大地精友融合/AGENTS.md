# 大地融合精友定损 - 项目上下文文档

## 项目概述

本项目是一个油猴用户脚本，用于增强大地保险定损系统的功能，集成精友定损平台的配件查询和图片预览功能。

**技术栈：**
- 构建工具：Vite 7.1.3
- 插件：vite-plugin-monkey 7.1.1（油猴脚本构建）
- 包管理器：pnpm
- 语言：JavaScript (ES modules)

**版本：** 0.3.3

**目标网站：**
- claim.ccic-net.com.cn（大地保险定损系统）
- ccic-claim.jingyougroup.com（精友定损平台）

## 项目结构

```
src/
├── main.js                     # 入口文件，初始化 iframe 监控
├── core/
│   ├── IframeMonitor.js        # iframe 监控器类
│   └── JingYou.js              # 精友定损功能核心类
├── common/
│   └── Modal.js                # 悬浮窗组件
├── utils/
│   ├── index.js                # 工具函数导出（$, $$, hoverTip, httpRequest）
│   ├── httpRequest.js          # HTTP 请求工具（带缓存）
│   ├── hoverTip.js             # 悬停提示工具
│   └── elmGetter.js            # 元素获取工具
├── modules/                    # 预留模块目录（当前为空）
└── tools/                      # 预留工具目录（当前为空）
```

## 核心功能

### 1. Iframe 监控器（IframeMonitor.js）
- 使用 MutationObserver 监控页面中 iframe 的动态生成和移除
- 监听 iframe 的 load 事件
- 支持添加多个处理函数，按顺序异步执行
- 自动处理页面初始加载时已存在的 iframe
- 可检测 iframe 内的 jQuery 等库

### 2. 精友定损功能（JingYou.js）
**初始化方式：**
- 自动初始化：当 iframe src 包含 `from=TaskToDo` 时自动初始化
- 手动初始化：按 `Alt+J` 快捷键手动初始化

**主要功能：**
- 创建"精友平台"按钮，可直接打开定损平台
- 配件查询：支持普通查询和扩展查询
- 配件图片预览：支持拖拽移动、滚轮缩放
- 结果表格展示：显示配件名称、零件号、价格等信息
- 信息标签：显示"替"（替换件）、"精准"（精准点选）、"高"（高价值）、"图"（零件图）

**快捷键：**
- `Alt+J`：初始化精友功能
- `Alt+Q`：将选中的文本插入到当前单元格

### 3. 悬浮窗组件（Modal.js）
- 可拖拽的悬浮窗
- 支持最小化/最大化（迷你图标切换）
- 可绑定到现有元素（双击或单击触发）
- 支持自定义内容、位置和样式

### 4. HTTP 请求工具（httpRequest.js）
- 统一的 fetch 封装
- 支持表单数据和 JSON 数据
- 内置缓存机制（默认缓存 5 分钟）
- 自动清理过期缓存
- 支持 GET 和 POST 请求

## 构建和运行

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
pnpm run dev
```
开发模式下，Vite 会启动开发服务器，自动监听文件变化并重新构建。

### 构建生产版本
```bash
pnpm run build
```
构建输出到 `dist` 目录，生成可直接安装的油猴脚本。

**构建配置：**
- 不压缩代码（`minify: false`）
- 不生成 sourcemap（`sourcemap: false`）
- 输出目录：`dist/`

### 预览构建结果
```bash
pnpm run preview
```

## 开发约定

### 代码风格
- 使用 ES6+ 语法
- 使用类（Class）组织代码
- 导出使用 ES modules（`export default`）
- 使用模板字符串和箭头函数
- 代码注释使用中文

### 命名规范
- 类名：大驼峰命名（PascalCase），如 `IframeMonitor`
- 变量/函数：小驼峰命名（camelCase），如 `injectJY`
- 常量：全大写下划线分隔（SNAKE_CASE），如 `HEADER_ZH`
- 私有方法：以下划线开头，如 `_partQuery`

### 文件组织
- 每个类/模块一个文件
- 相关功能放在同一目录下
- 工具函数统一放在 `utils/` 目录
- 通用组件放在 `common/` 目录
- 核心业务逻辑放在 `core/` 目录

### 调试建议
- 使用 `console.debug()` 输出调试信息
- 重要操作使用 `console.log()` 输出
- 错误使用 `console.error()` 输出
- 警告使用 `console.warn()` 输出

## 依赖项

### 开发依赖
- `vite@^7.1.3` - 构建工具
- `vite-plugin-monkey@^7.1.1` - 油猴脚本构建插件

### 运行时依赖
- 无外部依赖，使用浏览器原生 API 和油猴 API

## 油猴脚本配置

### 权限（Grant）
- `GM_setValue` - 存储数据
- `GM_getValue` - 读取数据
- `GM_xmlhttpRequest` - 跨域请求
- `GM_notification` - 显示通知

### 允许连接的域名
- 10.1.174.79
- ccic-claim.jingyougroup.com
- claim.ccic-net.com.cn

### 特殊配置
- `noframes: true` - 不在 iframe 中运行
- `run-at: document-end` - 在页面加载完成后运行
- `unsafeWindow: true` - 访问页面全局对象

## 重要提示

1. **跨域访问**：由于 iframe 跨域限制，某些操作可能无法直接访问 iframe 内容
2. **缓存机制**：httpRequest 默认缓存 5 分钟，可通过 `CachexpiryMs` 参数调整
3. **安全限制**：油猴脚本的 GM_xmlhttpRequest 用于跨域请求，需要在配置中声明 `connect` 权限
4. **开发调试**：建议在浏览器控制台中查看调试信息，了解脚本运行状态

## 待扩展功能

`modules/` 和 `tools/` 目录预留用于未来功能扩展，可根据需要添加新的模块或工具。

## 常见问题

**Q: 为什么 iframe 监控不工作？**
A: 检查 iframe 是否在允许的域名下，以及是否跨域。跨域 iframe 无法访问其内容。

**Q: 如何调试油猴脚本？**
A: 在浏览器控制台中查看 console 输出，使用 `console.debug()` 输出调试信息。

**Q: 如何添加新的功能模块？**
A: 在 `modules/` 目录下创建新的模块文件，然后在 `main.js` 中导入和使用。

**Q: 如何修改缓存时间？**
A: 在调用 `httpRequest` 时，传入 `CachexpiryMs` 参数（单位为分钟）。