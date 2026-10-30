const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  resolver: {
    platforms: [...defaultConfig.resolver.platforms, 'native', 'macos'],
  },
});
