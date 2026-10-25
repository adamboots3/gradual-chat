# Demo video script (60–120 s, Chinese)

Target length **110 seconds**. Record at 1920×1080 with a clear microphone and keep unrelated browser tabs out of view.

## Before recording

1. `npm run dev` (temporary MongoDB works without a local installation), or `docker compose up --build`; confirm the app opens.
2. To reset temporary MongoDB, restart the app. For a persistent database, set the same `MONGODB_URI` and run `npm run seed -- --force`; for Docker, use `docker compose exec app node apps/server/dist/seed/cli.js --force`. This deletes the demo collections. Sign in again after resetting.
3. Sign in as **Jenny White** in window A and **Devon Lane** in window B (two browsers or one normal + one
   incognito so the two sessions do not share `localStorage`).
4. Arrange the windows side by side at the same zoom level.
5. Close notifications, disable the screen saver, hide the taskbar clock if it looks noisy.

## Beat sheet

| Time      | Screen                        | What to do                                                                                                                                           | Narration (要点)                                                                                                                                                            |
| --------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:08 | Window A, chat open           | Do nothing for a second so the viewer reads the layout                                                                                               | 这是一个实时聊天应用，前端 React + TypeScript，后端 Node + TypeScript，GraphQL 接口，Socket.IO 实时通信，数据存在 MongoDB。                                                 |
| 0:08–0:30 | A and B side by side          | A types a message and presses Enter; B receives it instantly. B replies; A receives.                                                                 | 两边登录不同账号，消息通过 socket.io 房间广播实时到达；写入走 GraphQL mutation，推送走 WebSocket，避免维护两套订阅逻辑。                                                    |
| 0:30–0:50 | B's window                    | B clicks another channel, then A sends a message into _Share your story_. Point at the red unread message badge; B clicks back and the badge clears. | 未读数按人按频道存一个计数器和已读位点，发消息时对其他成员增加一次未读数；点进频道即清零。@提及不单独计数。                                                                 |
| 0:50–1:05 | A's window                    | Hover a message → click the quote icon → the quote bar appears in the composer → send. Show the quoted block in the new bubble.                      | 引用回复是自引用模型：消息里存 `replyToId`，查询时只取被引用消息的摘要；服务端会校验被引用的消息必须属于同一个频道。                                                        |
| 1:05–1:20 | A's window                    | Type `@` → the picker opens → pick someone with the arrow keys and Enter → send; show the highlight.                                                 | @提及在客户端做补全，服务端再用正则二次解析并落库，不存在的用户名不会被算成提及，避免脏数据。                                                                               |
| 1:20–1:40 | Terminal + README             | Show `npm test` finishing (42 backend + 56 frontend), then the README quick-start block                                                              | 前后端都有测试：后端用临时 MongoDB 跑真实的 Mongoose 查询，前端用 Testing Library 覆盖消息渲染和输入框交互。npm 可以启动临时数据库演示，Docker Compose 可以启动持久化演示。 |
| 1:40–1:50 | Architecture diagram (README) | Scroll to the mermaid diagram                                                                                                                        | 架构上是前后端分离、部署同源：生产环境由 Node 同时托管 API 和前端静态资源，所以没有跨域配置。                                                                               |

## Delivery notes

- 语速平稳，**不要逐字念 README**，每段只讲一个决策点。
- 提前把要用的消息文本准备好，打字速度宁快勿慢；必要时先粘贴再讲解。
- 如果某一拍出错，继续往下录，最后重录整段——剪辑痕迹比小失误更扣分。
- 视频上传到 B 站/YouTube 后，把链接放在 README 顶部。
- 当前范围：保留密码登录，后续请求无鉴权；只维护未读消息数，不提供已发送消息的编辑或删除、提及未读数、输入状态、顶部搜索或静态时区。左侧其他模块和通知、帮助图标仅为设计占位。

## Recording and verification

`npm run verify:realtime` verifies browser interactions but does not record a video. Use a screen recorder and
add Chinese narration for a 1–2 minute project walkthrough. Diagram sources for explaining the data flow are
available in [architecture.md](architecture.md).
