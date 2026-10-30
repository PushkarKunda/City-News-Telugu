module.exports = function(api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Remove console.log/info/debug from production bundles only (warn/error
      // are kept for crash diagnostics). Dev builds retain logging.
      ...(isProd
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@components': './components',
            '@constants': './constants',
            '@hooks': './hooks',
            '@services': './services',
            '@store': './store',
            '@types': './types',
            '@utils': './utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
