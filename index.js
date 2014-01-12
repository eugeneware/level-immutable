var bytewise = require('bytewise'),
    clone = require('clone'),
    util = require('util');

module.exports = immutable;
function immutable(db) {
  if (typeof db.immutable === 'undefined') {
    db.immutable = {
      put: put.bind(null, db),
      get: get.bind(null, db),
      del: del.bind(null, db),
      batch: batch.bind(null, db)
    };
  }
  return db;
}

function put(db, key, value, options, cb) {
  cb      = getCallback(options, cb);
  options = getOptions(options);

  var _key = [key, -Date.now(), true];
  db.put(_key, value, options, cb);
}

function get(db, key, options, cb) {
  cb      = getCallback(options, cb);
  options = getOptions(options);

  options.fromTime = -options.fromTime || +Infinity;
  options.toTime   = -options.toTime   || -Infinity;

  var found = false;
  db.createReadStream({
    start: [key, options.toTime, false],
    end:   [key, options.fromTime, true]
  })
  .once('data', function (data) {
    found = true;
    if (data.key[2] === false) {
      cb(notFoundError(key));
    } else {
      cb(null, data.value);
    }
  })
  .once('end', function () {
    if (!found) cb(notFoundError(key));
  });
}

function del(db, key, options, cb) {
  cb      = getCallback(options, cb);
  options = getOptions(options);

  var _key = [key, -Date.now(), false];
  db.put(_key, '', options, cb);
}

function batch(db, cmds, options, cb) {
  cb      = getCallback(options, cb);
  options = getOptions(options);

  var now = -Date.now();
  var _cmds = cmds.map(function (cmd) {
    var _cmd = clone(cmd);
    _cmd.key = [_cmd.key, now, _cmd.type === 'put'];
    return _cmd;
  });
  db.batch(_cmds, options, cb);
}

function NotFoundError(key) {
  Error.call(this);
  this.name = 'NotFoundError';
  this.message = 'Key not found in database [' + JSON.stringify(key) + ']';
}
util.inherits(NotFoundError, Error);

function notFoundError(key) {
  return new NotFoundError(key);
}

function getCallback (options, callback) {
  return typeof options == 'function' ? options : callback;
}

function getOptions (options) {
  return typeof options == 'function' ? { } : options;
}
