import { WebSocketServer, WebSocket } from 'ws';
import { websocketLogger } from './logger.js';

const wss = new WebSocketServer({ port: parseInt(process.env.WS_PORT ?? "8080", 10) });

wss.on('connection', (ws) => {
  websocketLogger.info('Client connected');
  ws.send(JSON.stringify({ type: 'welcome', message: 'Stellar Indexer Real-time Stream' }));
});

wss.on('error', (err) => {
  websocketLogger.error({ error: err.message }, 'WebSocket server error');
});

export function broadcastRealtimeUpdate(message: any): void {
  const data = JSON.stringify(message);
  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
      sent++;
    }
  });
  websocketLogger.debug({ clientCount: sent, ledger: message?.ledger }, 'Broadcasted realtime update');
}
