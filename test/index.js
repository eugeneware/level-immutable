var expect = require('expect.js'),
    level = require('level'),
    bytewise = require('bytewise'),
    path = require('path'),
    range = require('range'),
    rimraf = require('rimraf'),
    immutable = require('..');

describe('level-immutable', function() {
  var db;

  beforeEach(function(done) {
    var dbPath = path.join(__dirname, '..', 'data', 'test');
    rimraf.sync(dbPath);
    db = immutable(level(dbPath, { keyEncoding: bytewise, valueEncoding: 'json' }));
    done();
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should be able to store some data in the database', function(done) {
    db.immutable.put('eugene', { name: 'Eugene', color: 'blue' }, get);

    function get(err) {
      if (err) return done(err);
      db.immutable.get('eugene', check);
    }

    function check(err, data) {
      if (err) return done(err);
      expect(data).to.eql({ name: 'Eugene', color: 'blue' });
      done();
    }
  });

  it('should be able to store some data and change it', function(done) {
    db.immutable.put('eugene', { name: 'Eugene', color: 'blue' }, delay);

    function delay(err) {
      if (err) return done(err);
      setTimeout(put, 5);
    }

    function put() {
      db.immutable.put('eugene', { name: 'Eugene', color: 'black' }, get);
    }

    function get(err) {
      if (err) return done(err);
      db.immutable.get('eugene', check);
    }

    function check(err, data) {
      if (err) return done(err);
      expect(data).to.eql({ name: 'Eugene', color: 'black' });
      done();
    }
  });

  it('should be able to delete some data', function(done) {
    db.immutable.put('eugene', { name: 'Eugene', color: 'blue' }, delay);

    function delay(err) {
      if (err) return done(err);
      setTimeout(del, 5);
    }

    function del() {
      db.immutable.del('eugene', get);
    }

    function get(err) {
      if (err) return done(err);
      db.immutable.get('eugene', check);
    }

    function check(err, data) {
      expect(err.name).to.equal('NotFoundError');
      expect(data).to.equal(undefined);
      done();
    }
  });

  it('should be able to batch data', function(done) {
    var data = range(0, 10).map(function (i) {
      return {
        type: 'put',
        key:  'name ' + i,
        value: { number: 10*i }
      };
    });
    db.immutable.batch(data, get);

    function get(err) {
      if (err) return done(err);
      db.immutable.get('name 3', check);
    }

    function check(err, data) {
      if (err) return done(err);
      expect(data).to.eql({ number: 30 });
      done();
    }
  });

  it('should be able to access a data snapshot in the past', function(done) {
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
        if (err) return done(err);
        times[i++] = Date.now();
        setTimeout(next, 5);
      });
    })();

    function get() {
      db.immutable.get('eugene', { toTime: times[1] }, check);
    }

    function check(err, data) {
      if (err) return done(err);
      expect(data).to.eql({ name: 'Eugene', color: 'black' });
      done();
    }
  });
});
