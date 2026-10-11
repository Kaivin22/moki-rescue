const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      '.tmp/**',
      '.expo/**',
      '.credentials/**',
      '.claude/**',
      'backend/.m2repo/**',
      'backend/.maven-home/**',
      'routing/**',
      'SoDo_DuAn/**',
      'android/**',
      'ios/**',
      'dist/**',
      'web-build/**',
      'coverage/**',
      'backend/target/**',
      'specs/**',
    ],
  },
];
