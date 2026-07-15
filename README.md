# AI Chart Analyst

AI K线分析助手 MVP。当前已完成 Phase 2：图片上传、预览、删除/重新上传、可选市场信息、Mock AI 分析 API 与结构化分析结果页。

## 运行

```powershell
npm.cmd install
npm.cmd run dev
```

打开 `http://localhost:3000`。

## 测试 Phase 2

1. 上传 PNG、JPG 或 WEBP K线截图，确认能预览。
2. 点击“删除”或“重新上传”，确认可更换图片。
3. 尝试上传非图片或超过 10MB 的图片，确认有提示。
4. 填写或留空股票代码、市场和周期，点击“开始分析”，确认跳转至分析报告页。
5. 在报告页确认趋势、形态、支撑/压力、成交量、风险与摘要均能展示。

## API

`POST /api/analyze` 接收 `multipart/form-data`：`image`、`stockCode`、`market`、`period`。

## 配置 OpenAI Vision

复制 `.env.local.example` 为 `.env.local`，在其中填入自己的 OpenAI API Key：

```text
OPENAI_API_KEY=你的API_KEY
```

重启开发服务后，`POST /api/analyze` 会将上传图片发送给 OpenAI Vision，并返回受 JSON Schema 约束的结构化技术分析结果。
