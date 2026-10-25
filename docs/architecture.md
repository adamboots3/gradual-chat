# 架构与消息流

下面的图对应当前代码中的消息流程、前后端组件和数据库结构。支持发送、引用回复、@提及和未读消息计数。保留密码登录，后续请求直接传入用户 ID；没有消息编辑、消息删除或输入状态事件。

## 1. 发送消息与标记已读

```mermaid
sequenceDiagram
  participant A as 发送者页面
  participant API as GraphQL resolver 与业务服务
  participant DB as MongoDB
  participant RT as Socket.IO 网关
  participant B as 接收者页面
  Note over A,B: 连接时传入 userId，加入个人房间和所属频道房间
  A->>API: ① GraphQL / HTTP：sendMessage
  API->>DB: ② 保存消息，增加其他成员未读数，清零发送者未读数
  DB-->>API: 写入完成
  API->>RT: ③ 调用 messageCreated
  RT-->>A: ④ message:new（频道房间，包含发送者）
  RT-->>B: ④ message:new（频道房间）
  RT->>DB: 查询频道成员各自的未读消息数
  DB-->>RT: 返回未读状态
  RT-->>A: channel:unread（发送者个人房间）
  RT-->>B: channel:unread（接收者个人房间）
  API-->>A: ⑤ HTTP 返回保存的消息
  Note over A,B: 更新 Apollo 缓存；发送者按消息 ID 去重
  opt 接收者当前选中此频道
    B->>API: GraphQL / HTTP：markChannelRead
    API->>DB: 将该用户在此频道的 unreadCount 设为 0
    API-->>B: 返回最新频道数据，更新本窗口徽标
  end
```

`message:new` 和 `channel:unread` 是两个独立事件；消息发给频道房间，未读数发给每个用户的个人房间。发送者也会收到这两类事件。HTTP 响应和实时事件的到达顺序不固定，因此发送者用消息 ID 去重。

“当前选中频道”指 `ChatPage` 的 `activeId`，没有额外判断窗口焦点或消息是否进入可视区域。`markChannelRead` 通过 GraphQL 返回新的频道数据，不会额外广播“已读清零”事件。

## 2. 前端数据流

```mermaid
flowchart TD
  subgraph Browser[浏览器前端]
    UI[React 界面：输入框、消息列表、频道列表]
    Page[ChatPage：发送、引用、切换频道、标记已读]
    Apollo[Apollo Client：GraphQL 请求]
    Cache[Apollo 缓存：用户、频道、消息]
    Socket[Socket.IO 客户端]
    Active{他人的新消息是否属于当前选中频道？}
    UI -->|用户操作| Page
    Page -->|查询、发送消息、标记已读| Apollo
    Apollo -->|HTTP 响应写入| Cache
    Page -->|建立连接，传入 userId| Socket
    Socket -->|message:new| Page
    Socket -->|channel:unread| Page
    Page -->|追加新消息并按 ID 去重；更新未读数| Cache
    Page -->|收到他人的新消息| Active
    Active -->|是：调用 markChannelRead| Apollo
    Active -->|否：保留事件给出的未读数| Cache
    Socket -->|连接或重连后重新查询| Apollo
    Cache -->|数据变化，重新渲染| UI
  end
  API[后端 GraphQL 接口]
  RT[后端 Socket.IO 网关]
  Apollo -->|GraphQL / HTTP| API
  API -->|HTTP 响应| Apollo
  Socket <-->|实时连接| RT
```

未读徽标使用 `channel:unread` 给出的数值，前端不根据 `message:new` 自行累加。进入有未读消息的频道时，也会调用 `markChannelRead`。引用回复随 `sendMessage` 的 `replyToId` 提交，@提及随正文提交。

## 3. 后端组件与调用关系

```mermaid
flowchart TD
  Browser[浏览器前端]
  subgraph Node[Node.js 后端：Express 与 Socket.IO 共用 HTTP server]
    Express[Express：HTTP 请求与前端静态资源]
    Apollo[Apollo Server：处理 GraphQL]
    Resolver[Resolvers：查询与 mutation 处理函数]
    Services[业务服务：消息、频道、引用、提及、密码]
    ReadState[已读状态服务：增加未读消息数、清零]
    Emitter[messageCreated：广播消息并推送未读数]
    IO[Socket.IO：连接与频道、个人房间]
    Models[Mongoose 模型：用户、频道、消息、已读状态]
    Express --> Apollo --> Resolver
    Resolver -->|调用业务服务| Services
    Services -->|读写数据| Models
    Services -->|发送消息时维护未读数| ReadState
    Resolver -->|markChannelRead 直接调用| ReadState
    ReadState --> Models
    Resolver -->|sendMessage 保存完成后调用| Emitter
    Emitter -->|查询各成员未读数| Models
    Emitter -->|按频道和个人房间发送| IO
    IO -->|连接时查询所属频道| Models
  end
  DB[(MongoDB：独立数据库进程)]
  Browser -->|GraphQL / HTTP| Express
  Apollo -->|HTTP 响应| Browser
  Browser <-->|实时连接与事件| IO
  Models <-->|数据库读写| DB
```

Socket.IO 挂载在共享的 HTTP server 上，连接建立不经过 Apollo Server 或 resolver。Resolver 在消息保存完成后调用广播函数；广播函数使用已有房间发送事件。标记已读时，resolver 直接调用已读状态服务。

代码入口：

- 组装 HTTP server、Express 和 Socket.IO：[index.ts](../apps/server/src/index.ts)
- GraphQL 处理函数：[resolvers.ts](../apps/server/src/graphql/resolvers.ts)
- 消息保存与引用校验：[messages.ts](../apps/server/src/services/messages.ts)
- 未读计数：[readState.ts](../apps/server/src/services/readState.ts)
- 房间与事件广播：[realtime/index.ts](../apps/server/src/realtime/index.ts)
- 前端实时事件与缓存更新：[ChatPage.tsx](../apps/web/src/pages/ChatPage.tsx)

## 4. 数据库集合与关系

MongoDB 中有四个业务集合，名称由 Mongoose 模型名自动转为小写复数：

| 模型        | 实际集合名   | 一条文档表示什么                                 |
| ----------- | ------------ | ------------------------------------------------ |
| `User`      | `users`      | 一位用户及其登录、展示信息                       |
| `Channel`   | `channels`   | 一个频道或私聊会话及其成员                       |
| `Message`   | `messages`   | 一条已发送的消息，可引用另一条消息、提及多位用户 |
| `ReadState` | `readstates` | 一位用户在一个频道的未读数和已读位置             |

```mermaid
erDiagram
  users {
    ObjectId _id PK "用户 ID"
    string name "显示姓名"
    string username UK "用户名，用于 @提及"
    string email UK "登录邮箱"
    string passwordHash "bcrypt 密码哈希"
    string avatarColor "头像颜色"
    string title "个人介绍或职务"
    Date createdAt "创建时间"
    Date updatedAt "更新时间"
  }
  channels {
    ObjectId _id PK "频道 ID"
    string name "频道或私聊名称"
    string slug UK "唯一频道标识"
    string type "channel 或 dm"
    ObjectIdArray memberIds FK "成员 ID 数组，关联 users"
    number order "侧栏排序，默认 0"
    Date createdAt "创建时间"
    Date updatedAt "更新时间"
  }
  messages {
    ObjectId _id PK "消息 ID"
    ObjectId channelId FK "所属频道"
    ObjectId authorId FK "发言用户"
    string body "正文，最多 4000 字符"
    ObjectId replyToId FK "被引用消息 ID，可为空"
    ObjectIdArray mentionIds FK "被提及用户 ID 数组"
    Date createdAt "发送时间"
    Date updatedAt "更新时间"
  }
  readstates {
    ObjectId _id PK "已读状态记录 ID"
    ObjectId channelId FK "所属频道"
    ObjectId userId FK "所属用户"
    Date lastReadAt "最近标记已读时间"
    ObjectId lastReadMessageId FK "最近已读消息 ID，可为空"
    number unreadCount "未读消息数，默认 0"
    Date createdAt "创建时间"
    Date updatedAt "更新时间"
  }
  users }o--o{ channels : "成员关系，保存在 memberIds"
  users ||--o{ messages : "发送，authorId"
  channels ||--o{ messages : "包含，channelId"
  users }o--o{ messages : "被提及，mentionIds"
  messages |o--o{ messages : "被引用，replyToId"
  users ||--o{ readstates : "拥有，userId"
  channels ||--o{ readstates : "拥有，channelId"
  messages |o--o{ readstates : "最近已读，lastReadMessageId"
```

图中的 `ObjectIdArray` 表示 ObjectId 数组。`PK` 标记文档主键，`UK` 标记唯一索引，`FK` 仅表示应用中的 ID 引用关系，MongoDB 不会像关系型数据库一样自动检查外键，也没有额外的成员或提及关联表。

四个模型都启用了 `timestamps`，由 Mongoose 维护 `createdAt` 和 `updatedAt`；`updatedAt` 是通用时间字段，不代表提供了消息编辑功能。Mongoose 还可能保存内部版本字段 `__v`，图中省略了这个非业务字段。

### 关键字段与约束

- **用户**：`name`、`username`、`email`、`passwordHash`、`avatarColor` 为必填。用户名和邮箱保存为小写且各自唯一；`title` 默认空字符串。密码只保存哈希，不保存明文。
- **频道**：`name`、`slug` 为必填；`type` 只允许 `channel`、`dm`，默认 `channel`。`memberIds` 直接保存成员 ID。一个用户可以加入多个频道，一个频道也可以有多位用户。
- **消息**：`channelId`、`authorId`、`body` 为必填。`replyToId` 默认 `null`，普通消息不需要引用目标；引用回复仍然作为一条新消息保存，服务端校验目标属于同一频道。`mentionIds` 保存正文中解析出的用户 ID，不维护单独的未读提及数。
- **已读状态**：`channelId`、`userId` 为必填；二者组合唯一，因此每位用户在每个频道最多一条记录。`unreadCount` 最小值为 0；`lastReadMessageId` 默认 `null`，`lastReadAt` 默认 Unix 纪元时间，初始化数据可以设置初始已读位置。

例如，Devon 在两个频道各有一条 `readstates` 记录，其中一个频道的未读数可以是 3，另一个可以是 0。Jenny 在第一个频道发消息时，Devon 对应记录的 `unreadCount` 加 1；Devon 打开该频道时，这条记录的计数清零，不影响其他频道。

### 索引

除 MongoDB 默认的 `_id` 唯一索引外，当前模型声明了以下索引：

| 集合         | 索引                               | 作用                       |
| ------------ | ---------------------------------- | -------------------------- |
| `users`      | `username` 唯一；`email` 唯一      | 用户名查找和邮箱登录       |
| `channels`   | `slug` 唯一；`memberIds`           | 频道标识与查询用户所属频道 |
| `messages`   | `channelId`；`authorId`            | 按频道、发言人查找         |
| `messages`   | `{ channelId: 1, _id: -1 }`        | 按频道进行消息游标分页     |
| `messages`   | `{ channelId: 1, createdAt: -1 }`  | 按频道和时间查找           |
| `readstates` | `{ channelId: 1, userId: 1 }` 唯一 | 每个用户和频道一条已读状态 |
| `readstates` | `userId`                           | 查询用户的各频道未读状态   |

模型定义：[User.ts](../apps/server/src/models/User.ts)、[Channel.ts](../apps/server/src/models/Channel.ts)、[Message.ts](../apps/server/src/models/Message.ts)、[ReadState.ts](../apps/server/src/models/ReadState.ts)。
