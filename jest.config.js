/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/.tmp/', '<rootDir>/backend/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
