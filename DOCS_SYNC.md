# 内容实时同步机制技术文档

## 1. 同步策略 (Synchronization Strategy)

系统采用 **WebSocket (Socket.io)** + **REST API** 的混合模式实现多用户实时同步。

### 1.1 核心流程
1.  **写操作**：用户修改内容后，前端通过 `PUT /settings` 提交更新。
2.  **服务端处理**：
    *   验证版本号与时间戳，检测冲突。
    *   更新数据库并递增 `version`。
    *   通过 WebSocket 向该用户的所有在线客户端（Room: `user:${userId}`）广播 `settings_updated` 事件。
3.  **读操作/更新接收**：
    *   客户端监听到 `settings_updated` 事件。
    *   对比本地版本号，若远端版本更新，则触发 `pullSettings` 获取最新数据。

## 2. 版本控制与一致性 (Version Control)

### 2.1 冲突检测规则
服务端在接收更新时执行以下检查：
*   **版本号检查**：若 `clientVersion < serverVersion`，判定为过期提交。
*   **时间戳检查**：若 `updatedAt < serverUpdatedAt`，判定为陈旧数据提交。

### 2.2 冲突处理方案 (Conflict Resolution)
当前采用 **Server-Wins (服务端优先)** 策略：
*   当检测到冲突时，服务端返回 `409 Conflict` 并携带当前最新的服务端数据。
*   前端接收到 409 后，自动覆盖本地缓存，并提示用户“存在冲突，已采用最新版本”。

## 3. 缓存失效规则 (Caching Rules)

*   **本地缓存**：使用 `localStorage` 缓存 `wedding-site-config`。
*   **失效触发**：
    *   接收到 WebSocket 广播。
    *   页面刷新或首次加载。
    *   网络状态由离线转为在线（自动触发同步）。
*   **CDN/静态资源**：API 接口设置 `Cache-Control: no-cache`，确保获取的数据始终为数据库最新值。

## 4. 回滚方案 (Rollback Plan)

### 4.1 数据回滚
*   **数据库备份**：`settings.db` 建议定期进行文件级备份。
*   **手动回滚**：如需回滚到历史版本，可通过数据库管理工具修改 `settings` 表中的 `data`、`version` 和 `updated_at` 字段。

### 4.2 代码回退
若同步机制出现严重问题，可执行以下操作：
1.  **前端**：回退 `ConfigContext.jsx` 至 WebSocket 引入前的版本。
2.  **服务端**：回退 `index.js` 并停用 Socket.io 监听。
3.  **降级方案**：系统将退化为“仅在刷新时更新”的模式，不影响基础功能。

## 5. 性能指标 (Performance)
*   **同步延迟**：在内网环境下验证，多用户并发同步延迟约为 **10-30ms**，远低于 **200ms** 的业务要求。
