import 'dotenv/config';
import { createServer } from 'node:http';
import app, { allowedOrigins } from './app.js';
import { initRealtime } from './lib/realtime.js';

const PORT = process.env.PORT ?? 4000;

const httpServer = createServer(app);
initRealtime(httpServer, allowedOrigins);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
