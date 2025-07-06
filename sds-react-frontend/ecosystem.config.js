module.exports = {
  apps: [
    {
      name: 'sds-react-frontend',
      script: 'npm',
      args: 'start',
      cwd: './',
      env: {
        PORT: 6442,
        NODE_ENV: 'development',
        BROWSER: 'none'
      },
      env_production: {
        PORT: 6442,
        NODE_ENV: 'production',
        BROWSER: 'none'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'express-backend',
      script: 'node',
      args: 'index.js',
      cwd: './express-backend',
      env: {
        PORT: 6443,
        NODE_ENV: 'development'
      },
      env_production: {
        PORT: 6443,
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/express-backend-err.log',
      out_file: './logs/express-backend-out.log',
      log_file: './logs/express-backend-combined.log',
      time: true
    }
  ]
}; 