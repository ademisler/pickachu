export default {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};