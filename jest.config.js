const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/utils/jest-setup.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/' }),
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json', diagnostics: false }],
  },
  collectCoverageFrom: [
    'src/modules/**/presenters/**/*.ts',
    'src/shared/pipes/zod-validation.pipe.ts',
    'src/shared/utils/cpf.utils.ts',
    'src/shared/utils/role.utils.ts',
    'src/shared/validators/cpf.validator.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/dist-test/'],
  reporters: ['default'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 70,
      lines: 70,
    },
  },
};
