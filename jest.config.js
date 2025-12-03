module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@create-figma-plugin/utilities$': '<rootDir>/__tests__/mocks/utilities.ts'
  }
};
