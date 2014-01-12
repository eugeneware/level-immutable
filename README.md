# level-immutable

LevelDB/Levelup immutable history and database snapshotting based on ideas in
[datomic](http://www.datomic.com).

[![build status](https://secure.travis-ci.org/eugeneware/level-immutable.png)](http://travis-ci.org/eugeneware/level-immutable)

## Installation

This module is installed via npm:

``` bash
$ npm install level-immutable
```

## Background

The datomic database simplifies database by making all it's data mutable, and
by storing facts and data changes with the timestamp that they happened, so
you can interrogate the database at a particular point in the past with a
consistent "snapshot" of the data at that time.

This module emulates this behaviour, allowing you to pass in `fromTime` and
`toTime` values into the levelup `options` object in order to get the answers
at that particular time.

## Example Usage

``` js
var immutable = require('level-immutable'),
    bytewise = require('bytewise'),
    level = require('level');

// create the database and make it immutable
var db = immutable(level('/path/to/my/db',
  { keyEncoding: bytewise, valueEncoding: 'json' }));

// these commands will be execute with a slight delay
var cmds = [ put, update, del ];

function put(cb) {
  db.immutable.put('eugene', { name: 'Eugene', color: 'blue' }, cb);
}

function update(cb) {
  db.immutable.put('eugene', { name: 'Eugene', color: 'black' }, cb);
}

function del(cb) {
  db.immutable.del('eugene', cb);
}

// times will store the timestamps when the operations were each completed
var times = [], i = 0;
(function next() {
  if (cmds.length === 0) return get();
  var cmd = cmds.shift();
  cmd(function (err) {
    if (err) return done(err);
    // store the timestamp away
    times[i++] = Date.now();
    setTimeout(next, 5);
  });
})();

// get the value of 'eugene' at the time just before it was deleted
// effectively this uses a snapshot of the database at that time
function get() {
  db.immutable.get('eugene', { toTime: times[1] }, check);
}

function check(err, data) {
  if (err) return done(err);
  // the data was fetched even though it was 'deleted'
  // a db.get('eugene'), would throw a 'NotFoundError'
  expect(data).to.eql({ name: 'Eugene', color: 'black' });
}
```
