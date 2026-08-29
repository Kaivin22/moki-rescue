const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const zustandRoot = path.dirname(require.resolve('zustand/package.json'));

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Zustand 5's ESM middleware currently leaves `import.meta` in the SDK 54
  // development web bundle. Route only this entry to its equivalent CommonJS
  // build; keep Metro's package-exports resolution intact everywhere else.
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return {
      filePath: path.join(zustandRoot, 'middleware.js'),
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
