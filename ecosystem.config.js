const path = require('path');

const APP_DIR = process.env.APP_DIR || path.resolve(__dirname);
const APP_PORT = process.env.PORT || 3000;

module.exports = {
  apps: [{
    name: "ai-wedding",
    script: "node_modules/.bin/next",
    args: "start",
    cwd: APP_DIR,
    env: {
      PORT: APP_PORT,
      NODE_ENV: "production",
    },
    instances: process.env.PM2_INSTANCES || 1,
    exec_mode: process.env.PM2_INSTANCES > 1 ? "cluster" : "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: process.env.PM2_MAX_MEMORY || "1G",
    error_file: path.join(APP_DIR, "logs/pm2-error.log"),
    out_file: path.join(APP_DIR, "logs/pm2-out.log"),
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
    exp_backoff_restart_delay: 100,
  }]
};
