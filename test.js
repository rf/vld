var vld = require('./index');
var test = require('tape');

test('basic properties validation', function (assert) {
    var options = {
        type: 'thing',
        message: 'this is a string',
        callback: function () { }
    };

    vld.object(options);
    vld.properties(options, 'options', {
      type: vld.required(vld.string),
      message: vld.string,
      callback: vld.required(vld.function)
    });

    assert.end();
});

test('standalone or', function (assert) {
    var something = 'string';
    vld.or(vld.string, vld.number)(something, 'argument 0 (something)');
    assert.end();
});

function testIt(type, name, callback) {
    vld.required(vld.string)(type, 'argument 0 (type)');
    vld.required(vld.or(vld.function, vld.string))(name, 'argument 1 (name or callback)');
    vld.function(callback, 'argument 2 (callback');
}

test('arguments validation, happy', function (assert) {
    testIt('string lol', function () {});
    assert.end();
});

test('arguments validation, happy2', function (assert) {
    testIt('sting', 'also string', function () {});
    assert.end();
});

test('arguments validation, or throws', function (assert) {
    assert.throws(function () {
        testIt('string', true);
    }, /Expected argument 1 \(name or callback\) to be function or string, but instead got true \(boolean\)/);
    assert.end();
});

test('arguments validation, string throws', function (assert) {
    assert.throws(function () {
        testIt(23084);
    }, /Expected argument 0 \(type\) to be string, but instead got 23084 \(number\)/);
    assert.end();
});

test('properties with required or', function (assert) {
    vld.properties({foo: 38}, 'options', {
        foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
    });

    vld.properties({foo: 'hi'}, 'options', {
        foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
    });

    vld.properties({foo: function () {}}, 'options', {
        foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
    });

    assert.throws(function () {
        vld.properties({foo: 93}, 'options', {
            foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
        });
    }, /Expected property 'foo' of `options` to be function or string or 38, but instead got 93 \(number\)/);

    assert.end();
});

var states = {
    DISABLED: 'DISABLED',
    ENABLED: 'ENABLED',
    PROCESSING: 'PROCESSING',
    SHUTDOWN: 'SHUTDOWN'
};

function transition (newState) {
    vld.enum(Object.keys(states))(
        newState, 'argument 0 (newState) to transition'
    );
}

test('enum happy', function (assert) {
    transition(states.DISABLED);
    assert.end();
});

test('enum sad', function (assert) {
    assert.throws(function () {
        transition('DISARBLED');
    }, /Expected argument 0 \(newState\) to transition to be one of DISABLED ENABLED PROCESSING SHUTDOWN, but instead got DISARBLED \(string\)/);
    assert.end();
});

