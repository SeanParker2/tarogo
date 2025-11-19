module.exports = {
  apps: [{
    name: "ai-tarot-api",
    script: "./dist/server.js",
    instances: "max",
    exec_mode: "cluster",
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    },
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    max_memory_restart: "1G"
  }]
}