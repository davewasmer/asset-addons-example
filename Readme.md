# Ember Addons: Namespace Cascade

This repo is an example of one implementation for a "namespace cascade" for handling ember addons via the [ember-cli](https://github.com/stefanpenner/ember-cli). For some background, check out the [pull request (312)](https://github.com/stefanpenner/ember-cli/issues/312).

There are two main components to this approach: the modified `Brocfile.js` and the modified `ember-resolver`.


## Changes to the Brocfile.js

The Brocfile now finds any bower packages installed that have the `ember-addons` keyword. Those packages are then included as trees, using the package name as a namespace. The trees are merged with the normal `app` tree and undergo all the regular processing (templates, JS/CSS preprocessing).

## Changes to the Resolver

The Resolver now attempts to lookup modules down the cascade if they aren't found in the app itself. It runs in the order specified in the `config/environemnt.js` `cascade` property.