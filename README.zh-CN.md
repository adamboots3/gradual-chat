# Gradual Community — 实时聊天应用

[English](README.md) | [简体中文](README.zh-CN.md)

一个实时聊天应用。前端使用 React + TypeScript，后端使用 Node.js + TypeScript、Apollo GraphQL 和 MongoDB，通过 Socket.IO 实现实时消息推送。

支持频道会话、未读消息计数、引用回复和 @提及，并包含前后端测试。

https://github.com/user-attachments/assets/71c3699d-d0cb-43e6-b57b-1e6cbfcd651f

## 目录

- [快速启动](#快速启动)
- [演示账号](#演示账号)
- [功能清单](#功能清单)
- [架构与数据流](#架构与数据流)
- [数据模型](#数据模型)
- [GraphQL API](#graphql-api)
- [实时事件](#实时事件)
- [项目结构](#项目结构)
- [测试与验证](#测试与验证)
- [环境配置](#环境配置)
- [界面设计](#界面设计)

## 快速启动

### 使用 npm

需要 Node.js 20 或以上版本，CI 和 Docker 使用 Node.js 22。

```bash
npm install
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。首次启动会自动初始化演示账号、频道和消息，无需手动配置环境变量。

后端默认尝试连接 `mongodb://127.0.0.1:27017/gradual_chat`。本地 MongoDB 不可用时，会启动临时 MongoDB 实例并打印提示；该实例的数据在服务停止后不保留。首次使用可能需要下载 MongoDB 二进制文件，因此需要网络访问。

### 使用 Docker Compose（持久化演示）

需要安装 Docker 和 Compose 插件。

```bash
docker compose up --build
```

打开 [http://localhost:4000](http://localhost:4000)。Compose 启动独立的 MongoDB 7 容器并通过数据卷持久化；应用容器在同一端口提供 API 和构建后的前端。

### 连接已有 MongoDB

复制 `.env.example` 为项目根目录的 `.env`，设置连接串后启动：

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/gradual_chat
```

```bash
npm run dev
```

也可以连接远程 MongoDB。显式设置 `MONGODB_URI` 后，如果连接失败，服务会报错退出，不会切换到临时数据库。Docker Compose 内部使用 `mongodb://mongo:27017/gradual_chat`，不会向宿主机映射 MongoDB 端口。

### 重置演示数据

临时数据库：停止并重新启动应用，即可重新初始化数据。

已有持久化数据库：确认 `.env` 中的 `MONGODB_URI` 与应用一致后执行：

```bash
npm run seed -- --force
```

Docker Compose：执行 `docker compose exec app node apps/server/dist/seed/cli.js --force`。

**强制重置会清空并重建演示集合，请先确认连接目标。** 重置后用户 ID 会变化，需要重新登录。单独运行 seed 命令不能重置另一个应用进程的临时数据库，因此在回退到临时实例时会报错并提示重启应用。

## 演示账号

所有种子账号的密码均为 **`password123`**。种子包含 12 位用户；登录页列出 3 个常用账号，点击可预填表单，再按 Sign in 登录。

| 姓名        | 邮箱                | 推荐用途                       |
| ----------- | ------------------- | ------------------------------ |
| Jenny White | `jenny@gradual.com` | 默认演示账号                   |
| Devon Lane  | `devon@gradual.com` | 第二个浏览器会话，验证实时聊天 |
| Jerry White | `jerry@gradual.com` | 查看公告相关演示数据           |

使用两个独立浏览器或无痕窗口，分别登录 Jenny 和 Devon。在共同频道发送消息，可验证实时送达和引用回复；让接收方切到其他频道，可观察未读消息徽标，再打开原频道验证清零。

## 功能清单

| 功能或技术            | 实现方式                                | 主要代码位置                             |
| --------------------- | --------------------------------------- | ---------------------------------------- |
| 聊天界面              | 会话、消息操作、引用回复、@候选列表     | `apps/web/src/components`                |
| 实时聊天              | Socket.IO、频道房间、个人未读数推送     | `apps/server/src/realtime`               |
| React.js + TypeScript | React 18、Vite、Apollo Client、Tailwind | `apps/web`                               |
| Node.js + TypeScript  | Express、Apollo Server、严格类型检查    | `apps/server`                            |
| MongoDB               | Mongoose 模型、复合索引、未读计数       | `apps/server/src/models`                 |
| GraphQL               | 使用 SDL 定义查询与变更接口             | `apps/server/src/graphql/schema.graphql` |
| 未读消息数            | 频道未读消息徽标、已读状态              | `apps/server/src/services/readState.ts`  |
| 引用回复              | 消息自引用、同频道校验、引用预览        | `apps/server/src/services/messages.ts`   |
| @提及                 | 解析、自动补全、高亮                    | `apps/server/src/services/mentions.ts`   |
| 前后端测试            | 98 个测试，后端 42 个、前端 56 个       | `apps/server/test`、`apps/web/test`      |

此外还提供消息分页、列表搜索过滤、健康检查、Docker 配置和 GitHub Actions CI。

## 架构与数据流

```mermaid
sequenceDiagram
  participant A as 发送者：React + Apollo Client
  participant API as 后端：Apollo Server / 业务服务层
  participant DB as MongoDB
  participant RT as Socket.IO 网关
  participant B as 接收者：React + Apollo Client
  Note over A,B: 登录后建立 Socket.IO 连接，网关按频道成员身份加入房间
  A->>API: ① GraphQL / HTTP：发送消息 mutation
  API->>API: 校验消息内容和引用目标
  API->>DB: ② 通过 Mongoose 保存消息并更新未读数
  DB-->>API: 写入成功
  API->>RT: ③ 调用事件广播
  RT-->>A: ④ 推送 message:new（频道房间，包含发送者）
  RT-->>B: ④ 推送 message:new（频道房间）
  RT-->>A: 推送 channel:unread（发送者个人房间）
  RT-->>B: 推送 channel:unread（用户个人房间）
  API-->>A: ⑤ GraphQL / HTTP：返回保存的消息
  Note over A,B: 更新 Apollo 缓存，React 显示新消息；发送方按消息 ID 去重
  opt 接收者当前选中此频道
    B->>API: GraphQL / HTTP：markChannelRead
    API->>DB: 将该用户的未读消息数清零
    API-->>B: 返回 unreadCount 为 0 的频道数据
  end
```

HTTP 响应与 Socket.IO 事件使用不同传输通道，浏览器收到它们的先后顺序不固定。完整的前后端流程图见[架构说明](docs/architecture.md)。

**GraphQL 负责读写，Socket.IO 负责实时通知。** 消息写入通过 mutation 完成，服务端保存后向频道成员广播。发送方也从 mutation 响应中获得消息，前端按消息 ID 去重。

**开发和部署均使用同源访问。** 开发时由 Vite 代理 `/graphql` 和 `/socket.io`；构建后由 Express 托管前端静态资源和 API。

发送消息的主要流程：

1. 请求携带当前用户 ID，校验正文长度和引用目标所属频道。
2. 解析正文中的 `@username`，查询对应用户。
3. 保存消息，为其他频道成员增加一次未读消息数，是否被提及不影响计数。
4. 更新发送者的已读状态。
5. 向频道房间广播消息，向各用户的个人房间推送其未读计数。
6. 前端更新 Apollo 缓存，同步消息列表、频道预览和徽标；Socket.IO 重连时重新查询以恢复状态。

## 数据模型

完整的四个集合、字段类型、关联关系和索引见[数据库结构图](docs/architecture.md#4-数据库集合与关系)。

```text
User      { id, name, username, email, passwordHash, avatarColor, title }
Channel   { id, name, slug, type: 'channel'|'dm', memberIds[], order }
Message   { id, channelId, authorId, body, replyToId?, mentionIds[] }
ReadState { channelId, userId, lastReadAt, lastReadMessageId, unreadCount }
```

| 集合        | 索引                                   | 用途                               |
| ----------- | -------------------------------------- | ---------------------------------- |
| `Message`   | `{ channelId: 1, _id: -1 }`            | 频道消息游标分页                   |
| `Message`   | `{ channelId: 1, createdAt: -1 }`      | 按频道和时间查询                   |
| `ReadState` | `{ channelId: 1, userId: 1 }` 唯一索引 | 每位成员在每个频道保留一份已读状态 |
| `ReadState` | `{ userId: 1 }`                        | 查询用户的频道未读状态             |
| `Channel`   | `{ memberIds: 1 }`                     | 查询用户加入的频道                 |
| `User`      | `username`、`email` 唯一索引           | 登录和提及用户解析                 |

未读消息数采用增量计数，减少侧栏查询时逐频道统计消息的开销。发送消息时为其他成员增加未读数，读取频道时清零。@提及保留解析、自动补全和正文高亮，不单独维护未读计数或显示提及徽标。

引用回复通过 `replyToId` 自引用实现。API 返回引用消息的精简预览，无需递归加载整个历史。

## GraphQL API

完整定义见 [schema.graphql](apps/server/src/graphql/schema.graphql)。开发服务启动后，可访问 [GraphQL 入口](http://localhost:4000/graphql)。

```graphql
type Query {
  user(id: ID!): User
  users(query: String!): [User!]!
  channels(userId: ID!): [Channel!]!
  messages(channelId: ID!, cursor: String, limit: Int): MessagePage!
}

type Mutation {
  login(email: String!, password: String!): User!
  sendMessage(input: SendMessageInput!, userId: ID!): Message!
  markChannelRead(channelId: ID!, userId: ID!, lastMessageId: ID): Channel!
}
```

先执行登录 mutation。服务端校验密码后返回用户信息，密码使用 bcrypt 哈希存储：

```graphql
mutation {
  login(email: "jenny@gradual.com", password: "password123") {
    id
    name
    username
  }
}
```

后续请求直接传入返回的用户 ID，不需要 Authorization 请求头。例如查询频道（将变量设为登录返回的 ID）：

```graphql
query Channels($userId: ID!) {
  channels(userId: $userId) {
    id
    name
    unreadCount
    lastMessage {
      body
    }
  }
}
```

本版本保留账号密码登录，不维护 JWT 或服务端会话，也不做频道成员权限校验。用户 ID 仅用于选择演示数据、记录发言人和未读数，不作为身份凭证。浏览器只保存用户 ID，不保存密码。

错误通过 `extensions.code` 区分，包括 `BAD_USER_INPUT` 和 `NOT_FOUND`。

## 实时事件

| 方向            | 事件             | 载荷                         |
| --------------- | ---------------- | ---------------------------- |
| 服务端 → 客户端 | `message:new`    | `{ message }`                |
| 服务端 → 客户端 | `channel:unread` | `{ channelId, unreadCount }` |

Socket.IO 连接时通过 `query.userId` 传入用户 ID，不执行鉴权。网关根据该 ID 加入 `user:<id>` 个人房间和用户所属的 `channel:<id>` 频道房间，分别用于未读计数推送和频道消息广播。

## 项目结构

```text
apps/
├─ server/
│  ├─ src/
│  │  ├─ db/         MongoDB 连接及临时实例回退
│  │  ├─ graphql/    SDL、resolver 和 DTO
│  │  ├─ models/     用户、频道、消息、已读状态模型
│  │  ├─ realtime/   Socket.IO 网关与事件接口
│  │  ├─ seed/       演示数据
│  │  └─ services/   消息、频道、提及、已读状态业务逻辑
│  └─ test/          后端单元与集成测试
└─ web/
   ├─ src/
   │  ├─ components/ 界面组件
   │  ├─ graphql/    GraphQL 操作与 fragment
   │  ├─ lib/        Apollo、Socket.IO、缓存与格式化工具
   │  └─ pages/      聊天页面
   └─ test/          前端组件与缓存测试
scripts/             实时冒烟测试、构建辅助脚本
docs/                架构图与数据库结构
Dockerfile           多阶段镜像构建
docker-compose.yml   应用与 MongoDB 服务
```

## 测试与验证

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

当前共 **98 个测试：后端 42 个，前端 56 个**。

后端测试使用独立的临时 MongoDB 实例，覆盖账号密码登录、用户查询、消息分页、引用校验、未读消息计数、提及解析、无鉴权的频道访问及消息发送、HTTP 与 GraphQL 接口，以及真实 Socket.IO 客户端通信。

前端使用 Vitest 和 Testing Library，覆盖登录、消息渲染、频道徽标、输入框、引用回复、格式化、错误边界和 Apollo 缓存。回归测试包括中文输入法防误发送、发送失败保留草稿并重试、可见提及候选的键盘导航和消息分页缓存。

生成当前覆盖率报告（保存在 `apps/server/coverage` 和 `apps/web/coverage`，不在文档中固定百分比）：

```bash
npm run test:coverage
```

开发服务运行后，可执行双浏览器实时冒烟测试：

```bash
npm run verify:realtime
```

该脚本使用 Chrome 或 Edge 的两个独立会话，验证消息送达、未读徽标出现及打开频道后清零、刷新保留当前用户和退出后切换账号，并向当前开发数据库写入测试消息。

推送到 `main` 或创建、更新 Pull Request 时，GitHub Actions 自动执行依赖安装、格式检查、lint、类型检查、测试和构建；通过后再进行 Docker Compose 启动与 API 检查。工作流定义见 [.github/workflows/ci.yml](.github/workflows/ci.yml)。CI 不负责自动部署，双浏览器测试仍需本地运行。

## 环境配置

环境变量均有开发默认值，示例见 [.env.example](.env.example)。

| 变量            | 默认值                             | 说明                                     |
| --------------- | ---------------------------------- | ---------------------------------------- |
| `PORT`          | `4000`                             | API 与构建后前端的服务端口               |
| `MONGODB_URI`   | 本地 MongoDB，不可用时回退临时实例 | 显式设置后连接失败即退出                 |
| `SEED_ON_START` | `true`                             | 用户集合为空时初始化演示数据             |
| `LOG_LEVEL`     | `info`                             | pino 日志等级                            |
| `WEB_ORIGIN`    | `http://localhost:5173`            | 前后端不同源时的 Socket.IO CORS 来源配置 |

开发工具还支持 `API_PROXY_TARGET`（Vite 的 API 代理目标，默认 `http://localhost:4000`）、`BASE_URL`（浏览器脚本访问地址，默认 `http://localhost:5173`）及 `CHROME_PATH`（Chrome/Edge 可执行文件路径）。

## 界面设计

- 采用设计参考中的深色面板、薄荷绿色消息气泡及红色未读徽标。
- Inter 可变字体随项目提供，避免依赖外部字体 CDN。
  字体的版权声明和许可证见 [OFL.txt](apps/web/public/fonts/OFL.txt)。
- 头像使用姓名缩写和用户配色，便于离线运行。
- 在设计基础上增加发送按钮、键盘提示和日期分隔线；所有消息均提供引用入口。
- 支持粗体、斜体、删除线、行内代码和列表。消息以 React 元素渲染，不注入原始 HTML。
