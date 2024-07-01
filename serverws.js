const https = require('https');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Sertifikat SSL/TLS
const privateKey = fs.readFileSync('src/privkey.pem', 'utf8');
const certificate = fs.readFileSync('src/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const logDirectory = path.join(__dirname, 'logs');
const logFilePath = path.join(logDirectory, 'server.log');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
    format.printf(({ timestamp, message }) => `(${timestamp}) = (${message})`)
  ),
  transports: [
    new DailyRotateFile({
      filename: `${logDirectory}/%DATE%-server.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '5d',
      maxSize: '20m'
    })
  ]
});

const server = https.createServer(credentials, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

const wsServer = new WebSocket.Server({ server });

const wsport = 3000;

wsServer.on('connection', (connection) => {
  logger.info('Websocket Connected!!');

  connection.on('message', (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'panggil':
        wsServer.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'panggil', perkara_id: data.perkara_id, ruang_sidang: data.ruang_sidang, userid: data.userid }));
          }
        });
        break;
      case 'selesai':
        wsServer.clients.forEach((client) => {
          logger.info(data.userid);
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'selesai', userid: data.userid }));
          }
        });
        break;
      case 'update':
        wsServer.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'update' }));
          }
        });
        break;
      default:
    }
  });

  connection.on('close', () => {
    logger.info('Websocket Disconnected!!');
  });
});

if (require.main === module) {
  server.listen(wsport, () => {
    logger.info(`WSServer berjalan di https://sw.pn-banyumas.go.id/`);
  });
}
