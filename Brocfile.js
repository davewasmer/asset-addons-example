/* global require, module */

var uglifyJavaScript = require('broccoli-uglify-js');
var replace = require('broccoli-replace');
var compileES6 = require('broccoli-es6-concatenator');
var pickFiles = require('broccoli-static-compiler');
var mergeTrees = require('broccoli-merge-trees');

var env = require('broccoli-env').getEnv();
var getEnvJSON = require('./config/environment');

var p = require('ember-cli/lib/preprocessors');
var preprocessCss = p.preprocessCss;
var preprocessTemplates = p.preprocessTemplates;
var preprocessJs = p.preprocessJs;

var bowerConfig = require('bower-config')
var fs = require('fs')
var path = require('path')

function findAddons() {

  // Get the bower directory (vendor usually)
  var bowerDir = bowerConfig.read().directory // note: this relies on cwd
  if (bowerDir == null) throw new Error('Bower did not return a directory')

  // Get only the directories
  return fs.readdirSync(bowerDir).filter(function bowerDirectoriesOnly(entry) {
    return fs.statSync(path.join(bowerDir, entry)).isDirectory()
  })

  // Grab all the bower configs
  .map(function parseBowerConfig(dir){
    try {
      return JSON.parse(fs.readFileSync(path.join(bowerDir, dir, '.bower.json'), 'utf-8'))
    } catch (e) {
      return JSON.parse(fs.readFileSync(path.join(bowerDir, dir, 'bower.json'), 'utf-8'))
    }
  })

  // Find only ember-addon tagged packages
  .filter(function selectOnlyAddons(config) {
    return Array.isArray(config.keywords) && 
           (config.keywords.indexOf('ember-addon') !== -1)
  })

  // Build addon objects with some useful info
  .map(function buildAddonObjects(config) {
    return {
      dir: path.join(bowerDir, config.name),
      prefix: config.name
    }
  });

}

module.exports = function (broccoli) {

  var prefix = 'asset-addons-example';
  var rootURL = '/';

  // index.html

  var indexHTML = pickFiles('app', {
    srcDir: '/',
    files: ['index.html'],
    destDir: '/'
  });

  indexHTML = replace(indexHTML, {
    files: ['index.html'],
    patterns: [{ match: /\{\{ENV\}\}/g, replacement: getEnvJSON.bind(null, env)}]
  });

  // sourceTrees, appAndDependencies for CSS and JavaScript

  var app = pickFiles('app', {
    srcDir: '/',
    destDir: prefix
  });

  var addons = findAddons();
  var addonTrees = [];
  addons.map(function(addon) {
    addonTrees.push(pickFiles(addon.dir, {
      srcDir: '/',
      destDir: addon.prefix
    }));
  });

  var appAndAddons = mergeTrees([ app ].concat(addonTrees));

  appAndAddons = preprocessTemplates(appAndAddons);

  var config = pickFiles('config', { // Don't pick anything, just watch config folder
    srcDir: '/',
    files: [],
    destDir: '/'
  });

  var sourceTrees = [appAndAddons, config, 'vendor'].concat(broccoli.bowerTrees());
  var appAndDependencies = mergeTrees(sourceTrees, { overwrite: true });

  // JavaScript

  var legacyFilesToAppend = [
    'jquery.js',
    'handlebars.js',
    'ember.js',
    'ic-ajax/dist/named-amd/main.js',
    'ember-data.js',
    'ember-resolver.js',
    'ember-shim.js'
  ];

  var applicationJs = preprocessJs(appAndDependencies, '/', prefix);

  var inputFiles = [prefix + '/**/*.js'];
  addons.map(function(addon) {
    inputFiles.push(addon.prefix + '/**/*.js');
  });

  applicationJs = compileES6(applicationJs, {
    loaderFile: 'loader/loader.js',
    ignoredModules: [
      'ember/resolver',
      'ic-ajax'
    ],
    inputFiles: inputFiles,
    legacyFilesToAppend: legacyFilesToAppend,
    wrapInEval: env !== 'production',
    outputFile: '/assets/app.js'
  });

  if (env === 'production') {
    applicationJs = uglifyJavaScript(applicationJs, {
      mangle: false,
      compress: false
    });
  }

  // Styles

  var styles = preprocessCss(appAndDependencies, prefix + '/styles', '/assets');

  // Ouput

  var outputTrees = [
    indexHTML,
    applicationJs,
    'public',
    styles
  ];

  // Testing

  if (env !== 'production') {

    var tests = pickFiles('tests', {
      srcDir: '/',
      destDir: prefix + '/tests'
    });

    var testsIndexHTML = pickFiles('tests', {
      srcDir: '/',
      files: ['index.html'],
      destDir: '/tests'
    });

    var qunitStyles = pickFiles('vendor', {
      srcDir: '/qunit/qunit',
      files: ['qunit.css'],
      destDir: '/assets/'
    });

    testsIndexHTML = replace(testsIndexHTML, {
      files: ['tests/index.html'],
      patterns: [{ match: /\{\{ENV\}\}/g, replacement: getEnvJSON.bind(null, env)}]
    });

    tests = preprocessTemplates(tests);

    sourceTrees = [tests, 'vendor'].concat(broccoli.bowerTrees());
    appAndDependencies = mergeTrees(sourceTrees, { overwrite: true });

    var testsJs = preprocessJs(appAndDependencies, '/', prefix);

    var legacyTestFiles = [
      'qunit/qunit/qunit.js',
      'qunit-shim.js',
      'ember-qunit/dist/named-amd/main.js'
    ];

    legacyFilesToAppend = legacyFilesToAppend.concat(legacyTestFiles);

    testsJs = compileES6(testsJs, {
      // Temporary workaround for
      // https://github.com/joliss/broccoli-es6-concatenator/issues/9
      loaderFile: '_loader.js',
      ignoredModules: [
        'ember/resolver',
        'ember-qunit'
      ],
      inputFiles: [
        prefix + '/**/*.js'
      ],
      legacyFilesToAppend: legacyFilesToAppend,

      wrapInEval: true,
      outputFile: '/assets/tests.js'
    });

    var testsTrees = [qunitStyles, testsIndexHTML, testsJs];
    outputTrees = outputTrees.concat(testsTrees);
  }

  return mergeTrees(outputTrees, { overwrite: true });
};
