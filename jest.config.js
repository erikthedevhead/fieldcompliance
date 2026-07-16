module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  // The calculator module is the most critical for compliance defensibility
  coverageThreshold: {
    './src/emissions/calculator/': {
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
}
