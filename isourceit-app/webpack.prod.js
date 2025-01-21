/* eslint-disable import/no-extraneous-dependencies */
const path = require('path'); // module node de manipulation de chemins de fichiers
const fs = require('fs'); // module node d'accès au SGF
const webpack = require('webpack'); // webpack
// const CopyWebpackPlugin = require('copy-webpack-plugin'); // Plugin de copie directe de fichiers
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Plugin de création HTML
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const packageInfo = require('./package.json'); // info générale de l'app
const babelConfig = require('./babel.config'); // Info de config de babel

const PUBLIC_PATH = '/isourceit'; // url de base de l'appli
const RESOURCES_PATH = '/isourceit/app/'; // url des fichiers
const API_BASE_URL = '/isourceit/api/rest';
const WEBSOCKET_BASE_URL = '/';
const WEBSOCKET_PATH_URL = '/isourceit/socket.io/';

module.exports = {
  mode: 'production',
  // Environnement cible du déploiement
  target: 'web',
  // Point d'entrée de l'application
  entry: './src/index.jsx',
  // Sortie
  output: {
    path: path.join(__dirname, 'build'), // chemin obligatoirement absolu
    filename: '[name].[contenthash].bundle.js', // Ajout un hash pour s'assurer le telechargement du nouveau code produit par le navigateur
    publicPath: RESOURCES_PATH,
    clean: true, // efface le contenu du dossier de sortie avant regénération
  },
  // plugins de construction
  plugins: [
    // Définition de variables d'environnement injectable dans le code-source
    new webpack.DefinePlugin({
      APP_ENV_APP_PUBLIC_PATH: JSON.stringify(PUBLIC_PATH),
      APP_ENV_APP_TITLE: JSON.stringify(packageInfo.appTitle),
      APP_ENV_API_BASE_URL: JSON.stringify(API_BASE_URL),
      APP_ENV_WEBSOCKET_BASE_URL: JSON.stringify(WEBSOCKET_BASE_URL),
      APP_ENV_WEBSOCKET_PATH_URL: JSON.stringify(WEBSOCKET_PATH_URL),
      APP_ENV_NO_NET: JSON.stringify(false),
      APP_ENV_NET_DEBUG: JSON.stringify(false),
    }),
    // Copie directe de fichiers
    // new CopyWebpackPlugin({
    //   patterns: []
    // }),
    // Génération du fichier index.html à partir d'un template
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
      title: packageInfo.appTitle,
      favicon: './src/favicon.ico',
      meta: {
        description: packageInfo?.description ?? 'no description',
        keywords: packageInfo?.keywords?.join(', ') ?? '',
        author: packageInfo?.author ?? 'unknown',
      },
    }),
    // Séparation des CSS du code JS dans des fichiers séparés
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    // Injections des licences
    new webpack.BannerPlugin(fs.readFileSync('./LICENSE', 'utf8')),
    // Creation de rapports statistiques sur la taille des bundles
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: '../build_stats/buildInfos/report.html',
      generateStatsFile: true,
      statsFilename: '../build_stats/buildInfos/stats.json',
    }),
  ],
  // définit comment les modules vont être chargés
  // //ajoute les extensions .jsx et .scss aux extensions gérées
  resolve: {
    extensions: ['.js', '.json', '.jsx', '.scss', '.wasm'],
    modules: ['node_modules', 'custom_modules'],
  },
  // modules de configuration selon le type de fichier rencontré
  module: {
    rules: [{
      // Gestion des fichiers css
      test: /\.css$/i,
      use: [
        // Injection du CSS dans un fichier séparé
        MiniCssExtractPlugin.loader,
        // Interprête le CSS en CommonJS et autorise les modules
        // les fichiers sont générés en mode dev. (car devtool activté)
        { loader: 'css-loader', options: { modules: true } },
      ],
    }, {
      // Gestion des fichiers sass de l'appli (modules css par défaut)
      test: /\.s[ac]ss$/i,
      exclude: /bootstrap-config\.s[ac]ss$/i,
      use: [
        MiniCssExtractPlugin.loader,
        { loader: 'css-loader', options: { modules: true } },
        // Compile les instruction sass en css
        'sass-loader',
      ],
    }, {
      // Gestion du fichier sass de chargement de chargement / custome de boostrap
      test: /bootstrap-config\.s[ac]ss$/i,
      use: [
        MiniCssExtractPlugin.loader,
        { loader: 'css-loader', options: { modules: false } },
        'sass-loader',
      ],
    }, {
      // Gestion des fichiers images
      test: /\.(png|svg|jpg|jpeg|gif)$/i,
      type: 'asset/resource', // le module asset émet un fichier séparé du bundle et exporte son url
    }, {
      // Gestion des polices d'écriture
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource', // le module asset émet un fichier séparé du bundle et exporte son url
    }, {
      // Gestion du code-source js et jsx en utilisant babel pour
      // la transpilation
      // Exclut les fichiers js de node_modules du passage par babel
      test: /\.jsx?$/,
      exclude: /(node_modules)/,
      use: {
        loader: 'babel-loader',
        options: babelConfig, // configuration séparé car ré-utilisé avec eslint
      },
    }],
  },
  optimization: {
    moduleIds: 'deterministic', // les ids de modules sont calculés de manière à ne pas changer sur le module ne change pas
    runtimeChunk: 'single', // Créer un seul runtime code pour l'ensemble des chunks
    splitChunks: { // Met à part les codes des biblio tierces
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
    minimizer: [
      '...', // utilise les paramètres par défaut des minimzer (TerserPlugin pour minifier et minimiser JS)
      new CssMinimizerPlugin(), // minimise CSS
    ],
  },
  devtool: 'source-map', // genere des source map pour la prod
};
