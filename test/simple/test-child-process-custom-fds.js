require("../common");

var assert = require('assert');
var spawn  = require('child_process').spawn;
var path   = require('path');
var fs     = require('fs');
var sys    = require('sys');

function fixtPath(p) {
  return path.join(fixturesDir, p);
}

var expected = "hello world";

// Test the equivalent of:
// $ /bin/echo "hello world" > hello.txt
var helloPath = fixtPath("hello.txt");

function test1(next) {
  puts("Test 1...");
  fs.open(helloPath, 'w', 400, function (err, fd) {
    if (err) throw err;
    var child = spawn('/bin/echo', [expected], undefined, [-1, fd] );

    assert.notEqual(child.stdin, null);
    assert.equal(child.stdout, null);
    assert.notEqual(child.stderr, null);

    child.addListener('exit', function (err) {
      if (err) throw err;
      fs.close(fd, function (error) {
        if (error) throw error;

        fs.readFile(helloPath, function (err, data) {
          if (err) throw err;
          assert.equal(data.toString(), expected + "\n");
          puts('  File was written.');
          next(test3);
        });
      });
    });
  });
}

// Test the equivalent of:
// $ node ../fixture/stdio-filter.js < hello.txt
function test2(next) {
  puts("Test 2...");
  fs.open(helloPath, 'r', undefined, function (err, fd) {
    var child = spawn(process.argv[0]
                     , [fixtPath('stdio-filter.js'), 'o', 'a']
                     , undefined, [fd, -1, -1]);

    assert.equal(child.stdin, null);
    var actualData = '';
    child.stdout.addListener('data', function (data) {
      actualData += data.toString();
    });
    child.addListener('exit', function (code) {
      if (err) throw err;
      assert.equal(actualData, "hella warld\n");
      puts("  File was filtered successfully");
      fs.close(fd, function () {
        next(test3);
      });
    });
  });
}

// Test the equivalent of:
// $ /bin/echo "hello world" | ../stdio-filter.js a o
function test3(next) {
  puts("Test 3...");
  var filter = spawn(process.argv[0]
                   , [fixtPath('stdio-filter.js'), 'o', 'a']);
  var echo = spawn('/bin/echo', [expected], undefined, [-1, filter.fds[0]]);
  var actualData = '';
  filter.stdout.addListener('data', function(data) {
    puts("  Got data --> " + data);
    actualData += data;
  });
  filter.addListener('exit', function(code) {
    if (code) throw "Return code was " + code;
    assert.equal(actualData, "hella warld\n");
    puts("  Talked to another process successfully");
  });
  echo.addListener('exit', function(code) {
    if (code) throw "Return code was " + code;
    filter.stdin.end();
  });
}

test1(test2);
