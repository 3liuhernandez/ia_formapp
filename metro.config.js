// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Permitir que Metro trate los archivos .wasm como assets
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Asegurar que las exportaciones condicionales estén habilitadas
config.resolver.unstable_enablePackageExports = true;

module.exports = config;