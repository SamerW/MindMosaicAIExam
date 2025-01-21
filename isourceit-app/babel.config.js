module.exports = {
  // present-env : transformation du code pour ES2015+,
  // support par défault (> 0.5%, last 2 versions, Firefox ESR, not dead)
  // present-react : transformation du JSX
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react',
  ],
  plugins: [
    '@babel/plugin-transform-runtime', // re-utilisation des helpers injectés pour éviter de les injecter dans chaque chunk (gain de place)
    ['@babel/plugin-proposal-class-properties'], // permet l'utilisation de propriété de classe en utilisation un assignement // { loose: true }
    // 'react-hot-loader/babel',
  ],
};
