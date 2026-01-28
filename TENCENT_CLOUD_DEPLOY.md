# 腾讯云部署指南 (Tencent Cloud Deployment Guide)

本指南将帮助你将婚礼邀请函项目部署到腾讯云。由于本项目是一个静态网站（React + Vite），推荐使用 **Webify (云开发)** 或 **COS (对象存储)** 进行部署，既简单又省钱。

## 方案一：Webify (推荐)

腾讯云 Webify 支持从 GitHub 自动构建和部署，类似于 Vercel。

1.  **准备代码**：确保你已经将代码推送到 GitHub（如前一步所示）。
2.  **登录控制台**：访问 [腾讯云 Webify 控制台](https://console.cloud.tencent.com/webify)。
3.  **新建应用**：
    *   点击 **"新建应用"**。
    *   选择 **"从 Git 仓库导入"**。
    *   授权并选择你的 GitHub 仓库 (`wedding-invitation`)。
4.  **配置构建**：
    *   Webify 通常会自动识别 Vite 框架。
    *   **构建命令**：`npm run build`
    *   **输出目录**：`dist`
5.  **部署**：点击部署，等待几分钟即可获得一个访问域名。

## 方案二：COS 对象存储 + CDN (最经济)

如果你不想绑定 GitHub，或者想手动上传。

1.  **本地构建**：
    在 Trae 终端中运行：
    ```bash
    npm run build
    ```
    这将生成一个 `dist` 文件夹。

2.  **创建存储桶**：
    *   访问 [腾讯云 COS 控制台](https://console.cloud.tencent.com/cos)。
    *   创建存储桶（Bucket），访问权限选择 **"公有读私有写"**。

3.  **开启静态网站**：
    *   进入存储桶 -> **基础配置** -> **静态网站**。
    *   开启状态，索引文档填 `index.html`，错误文档填 `index.html` (这是为了支持 React 路由)。

4.  **上传文件**：
    *   进入 **文件列表**，将本地 `dist` 文件夹内的**所有文件**（index.html, assets文件夹等）直接拖拽上传到根目录。

5.  **访问**：使用 COS 提供的访问域名即可预览。

## 方案三：CVM 云服务器 (Nginx)

如果你已经有一台腾讯云服务器 (CVM) 或轻量应用服务器。

1.  **本地构建**：运行 `npm run build`。
2.  **上传文件**：将 `dist` 文件夹上传到服务器的 `/usr/share/nginx/html/wedding` (举例)。
3.  **配置 Nginx**：
    使用项目根目录下的 `nginx.conf` 参考配置，或者在现有配置中添加：

    ```nginx
    server {
        listen 80;
        server_name your-domain.com; # 替换为你的域名

        location / {
            root /usr/share/nginx/html/wedding; # 替换为你的实际路径
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
    ```
4.  **重启 Nginx**：`sudo nginx -s reload`。

---

## 常见问题

*   **页面空白**：请检查浏览器控制台 (F12) 是否有 404 错误，通常是 `base` 路径配置问题。本项目默认配置为 `/`，适合部署在根域名。如果部署在子路径（如 `example.com/wedding/`），请在 `vite.config.js` 中添加 `base: '/wedding/',` 并重新构建。
*   **路由刷新 404**：这是单页应用 (SPA) 的常见问题。请确保在 COS 或 Nginx 中配置了重写规则（如上文方案二和方案三所示），将所有未找到的请求指向 `index.html`。
