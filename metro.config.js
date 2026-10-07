const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const zustandRoot = path.dirname(require.resolve('zustand/package.json'));

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Compatibility guard for Zustand 5's `import.meta` in development web
  // bundles. Route only this entry to its equivalent CommonJS
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
