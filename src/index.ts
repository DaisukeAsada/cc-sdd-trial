// Library Inventory System - Entry Point
import express from 'express';
import { securityHeadersMiddleware, sanitizeInputMiddleware } from './shared/index.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

// セキュリティミドルウェア（CSPヘッダー設定等）
app.use(securityHeadersMiddleware);

// JSON パース
app.use(express.json());

// 入力サニタイズミドルウェア
app.use(sanitizeInputMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${String(PORT)}`);
});

export default app;
