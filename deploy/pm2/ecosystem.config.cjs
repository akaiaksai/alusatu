module.exports = {
  apps: [
    {
      name: "alusatu-api",
      cwd: "/var/www/alusatu/server",
      script: "index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
