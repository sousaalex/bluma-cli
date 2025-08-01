module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\.(t|j)sx?$': ['babel-jest', { rootMode: 'upward' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/tests/**/*.spec.(ts|js)'],
  roots: ['<rootDir>'],
  verbose: true,
  collectCoverage: false,
};