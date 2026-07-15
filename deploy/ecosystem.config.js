/**
 * FieldCompliance API — PM2 process definition
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart fc-api
 *   pm2 logs fc-api
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'fc-api',
      script: 'dist/main.js',
      cwd: '/home/fc/fieldcompliance',
      instances: 1,                    // bump to 'max' once you outgrow 1 vCPU
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/home/fc/.pm2/logs/fc-api-error.log',
      out_file: '/home/fc/.pm2/logs/fc-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
}
