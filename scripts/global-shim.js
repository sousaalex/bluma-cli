// scripts/global-shim.js
// Polyfill para 'self' em ambiente Node.js
if (typeof self === 'undefined') {
    global.self = global;
  }