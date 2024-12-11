require('dotenv').config();

// 기본 키와 솔트 (개발 환경용)
const DEFAULT_ENCRYPTION_KEY = 'a'.repeat(64); // 32바이트를 hex로 표현
const DEFAULT_PASSWORD_SALT = 'b'.repeat(32); // 16바이트를 hex로 표현

module.exports = {
  // MongoDB
  mongoURI: process.env.MONGO_URI,

  // JWT
  jwtSecret: process.env.JWT_SECRET,

  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY,
  passwordSalt: process.env.PASSWORD_SALT || DEFAULT_PASSWORD_SALT,

  // Redis Cluster
  redisNodes: process.env.REDIS_NODES, // Redis nodes for cluster
  redisPassword: process.env.REDIS_PASSWORD, // Redis password

  // Other keys
  openaiApiKey: process.env.OPENAI_API_KEY,
  vectorDbEndpoint: process.env.VECTOR_DB_ENDPOINT,
};
