module.exports = {
  apps: [
    {
      name: "chat-backend-3000",
      script: "./index.js",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      }
    },
    {
      name: "chat-backend-3001",
      script: "./index.js",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    }
  ]
};