/* global requirejs, require */

export default function bootApp(prefix, attributes) {
  var App                = require(prefix + '/app')['default'];
  var initializersRegExp = new RegExp(prefix + '/initializers');

  Ember.keys(requirejs._eak_seen).filter(function(key) {
    var prefixes = [prefix].concat(ENV.cascade)
    for (var i=0; i < prefixes.length; i++) {
      var cascadePrefix = prefixes[i]
      if (new RegExp(cascadePrefix + '/initializers').test(key)) {
        return true;
      }
    }
  }).forEach(function(moduleName) {
    var module = require(moduleName, null, null, true);
    if (!module) { throw new Error(moduleName + ' must export an initializer.'); }
    App.initializer(module['default']);
  });

  return App.create(attributes || {});
}
