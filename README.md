# 树洞

一个私密的个人日记应用，包含 Next.js Web/PWA 和 Expo 移动端。数据通过 Supabase Auth、RLS 和私有 Storage 隔离，并提供本机应用锁。

## 已有功能

- 邮箱注册、登录、密码找回和重置
- Web 本机 PIN 锁；移动端生物识别与 PIN 备用解锁
- 日记新增、编辑、删除、全文搜索、日期与心情筛选
- 心情、天气、Markdown、图片附件
- 本机草稿、字数统计、阅读时间、月度概览
- 深色主题、卡片/列表视图、JSON 数据导出
- 响应式 Web、PWA 和 Expo App

## 快速开始

1. 在 Supabase 新建项目，在 SQL Editor 执行 `supabase/schema.sql`。
2. 在 Authentication 中启用 Email 登录。
3. 将 `.env.example` 中的配置分别写入 `web/.env.local` 和 `mobile/.env`，保留对应平台的变量前缀。
4. 在仓库根目录运行 `npm run install:all`。
5. Web 运行 `npm run web`，打开 `http://localhost:3000`；移动端运行 `npm run mobile`。

生产构建：`npm --prefix web run build`。移动端可在安装 EAS CLI 后，于 `mobile` 目录运行 `eas build --platform all`。

密码重置邮件需要回跳到 `/reset-password`。本地开发时，请在 Supabase 的 Authentication > URL Configuration 中加入 `http://localhost:3000/reset-password`，部署后再加入生产域名。

## 安全说明

- 客户端只能使用 publishable/anon key，绝不能放入 service role key。
- RLS 是最终数据边界；Storage 桶保持私有，图片路径按用户 ID 隔离。
- Web PIN 通过 WebCrypto PBKDF2 派生后保存在本机；移动 PIN 使用 SecureStore；生物特征由系统验证。
- JSON 导出包含私人日记正文和图片路径，请妥善保存导出文件。
- 当前方案属于云端私密存储，不是端到端加密。若需要让服务端管理员也无法读取，应先在客户端加密正文和图片。
- 建议生产环境启用 Supabase 备份，并为管理账户配置 MFA。

## 常用检查

```sh
npm run typecheck
npm --prefix web run build
```
