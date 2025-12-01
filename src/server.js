require('dotenv').config();
require('module-alias/register');
const app = require('./app');
const log = require('@config/log-messages');
const MSG = require('@constants/server-messages');

const PORT = process.env.PORT;

function printStartupMessages() {
  console.clear();
  console.log(`\n${MSG.STARTUP.TITLE}`);
  console.log(MSG.STARTUP.SEPARATOR);
  console.log(MSG.STARTUP.PORT);
  console.log(MSG.STARTUP.API_URL);
  console.log(MSG.STARTUP.SWAGGER_URL);
  console.log(MSG.STARTUP.MODE);
  console.log(MSG.STARTUP.SEPARATOR);
  console.log(`${MSG.STARTUP.STOP_HINT}\n`);
  log.info('SERVER.STARTED');
}

const server = app.listen(PORT, printStartupMessages);

process.on('unhandledRejection', (err) => {
  console.log(`\n${MSG.ERRORS.UNHANDLED_REJECTION}`);
  console.log(MSG.ERRORS.SHUTTING_DOWN);
  log.error('SERVER.ERROR', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.log(`\n${MSG.ERRORS.UNCAUGHT_EXCEPTION}`);
  console.log(MSG.ERRORS.SHUTTING_DOWN);
  log.error('SERVER.ERROR', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(`\n${MSG.SIGNALS.SIGTERM_RECEIVED}`);
  console.log(MSG.SIGNALS.SHUTTING_DOWN);
  server.close(() => {
    console.log(MSG.SIGNALS.SHUTDOWN_SUCCESS);
    process.exit(0);
  });
});