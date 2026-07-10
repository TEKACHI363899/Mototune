const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Dạy cho hệ thống biết .glb là tài nguyên, không phải là file code
config.resolver.assetExts.push('glb', 'gltf', 'obj', 'mtl');

module.exports = config;