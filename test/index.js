var level = require('level'),
    bytewise = require('bytewise'),
    path = require('path'),
    range = require('range'),
    rimraf = require('rimraf'),
    redtape = require('redtape'),
    immutable = require('..');

function beforeEach(done) {
  var dbPath = path.join(__dirname, '..', 'data', 'test');
  rimraf.sync(dbPath);
  var db = immutable(level(dbPath, { keyEncoding: bytewise, valueEncoding: 'json' }));
  done(null, db);
}

function afterEach(db, done) {
  db.close(done);
}

var it = redtape(beforeEach, afterEach);

it('should be able to store some data in the database', function(t, db) {
  t.plan(3);

  db.immutable.put('eugene', { name: 'Eugene', color: 'blue' }, get);

  function get(err) {
    t.error(err);
    db.immutable.get('eugene', check);
  }

  function check(err, data) {
    t.error(err);
    t.deepEqual(data, { name: 'Eugene', color: 'blue' });
  }
});

it('should be able to store some data and change it', function(t, db) {
  t.plan(4);

  db.immutable.put('eugene', { name: 'Eugene', color: 'blue' }, delay);

  function delay(err) {
    t.error(err);
    setTimeout(put, 5);
  }

  function put() {
    db.immutable.put('eugene', { name: 'Eugene', color: 'black' }, get);
  }

  function get(err) {
    t.error(err);
    db.immutable.get('eugene', check);
  }

  function check(err, data) {
    t.error(err);
    t.deepEqual(data, { name: 'Eugene', color: 'black' });
  }
});

it('should be able to delete some data', function(t, db) {
  t.plan(4);

  db.immutable.put('eugene', { name: 'Eugene', color: 'blue' }, delay);

  function delay(err) {
    t.error(err);
    setTimeout(del, 5);
  }

  function del() {
    db.immutable.del('eugene', get);
  }

  function get(err) {
    t.error(err);
    db.immutable.get('eugene', check);
  }

  function check(err, data) {
    t.equal(err.name, 'NotFoundError');
    t.equal(data, undefined);
  }
});

it('should be able to batch data', function(t, db) {
  t.plan(3);

  var data = range(0, 10).map(function (i) {
    return {
      type: 'put',
      key:  'name ' + i,
      value: { number: 10*i }
    };
  });
  db.immutable.batch(data, get);

  function get(err) {
    t.error(err);
    db.immutable.get('name 3', check);
  }

  function check(err, data) {
    t.error(err);
    t.deepEqual(data, { number: 30 });
  }
});

it('should be able to access a data snapshot in the past', function(t, db) {
  t.plan(5);

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

  var times = [], i = 0;
  (function next() {
    if (cmds.length === 0) return get();
    var cmd = cmds.shift();
    cmd(function (err) {
      t.error(err);
      times[i++] = Date.now();
      setTimeout(next, 5);
    });
  })();

  function get() {
    db.immutable.get('eugene', { toTime: times[1] }, check);
  }

  function check(err, data) {
    t.error(err);
    t.deepEqual(data, { name: 'Eugene', color: 'black' });
  }
});
