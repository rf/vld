var test = require('tape');

var vld = require('./index');

test('basic properties validation', function (assert) {
    var options = {
        type: 'thing',
        message: 'this is a string',
        callback: function () { }
    };

    vld.object(options);
    vld.properties({
      type: vld.required(vld.string),
      message: vld.string,
      callback: vld.required(vld.function)
    })(options, 'options');

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
    vld.properties({
        foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
    })({foo: 38}, 'options');

    vld.properties({
        foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
    })({foo: 'hi'}, 'options');

    vld.properties({
        foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
    })({foo: function () {}}, 'options');

    assert.throws(function () {
        vld.properties({
            foo: vld.required(vld.or(vld.function, vld.string, vld.equals(38)))
        })({foo: 93}, 'options');
    }, /Expected property 'foo' of options to be function or string or 38 \(number\), but instead got 93 \(number\)/);

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
        newState, 'argument 0 (newState) to `transition`'
    );
}

test('enum happy', function (assert) {
    transition(states.DISABLED);
    assert.end();
});

test('enum sad', function (assert) {
    assert.throws(function () {
        transition('DISARBLED');
    }, /Expected argument 0 \(newState\) to `transition` to be one of DISABLED ENABLED PROCESSING SHUTDOWN, but instead got 'DISARBLED' \(string\)/);
    assert.end();
});

test('nested options props check', function (assert) {
    var options = {
        foo: 83,
        length: 11,
        name: 'hi',
        enabled: true,
        callback: function () {},
        subconfig: {
            name: 'bob',
            state: states.DISABLED,
            logger: {
                enabled: false
            }
        }
    };

    vld.properties({
        foo: vld.number,
        callback: vld.function,
        subconfig: vld.properties({
            name: vld.string,
            state: vld.enum(Object.keys(states)),
            logger: vld.properties({
                enabled: vld.bool
            })
        })
    })(options, 'options');

    assert.throws(function () {
        vld.properties({
            foo: vld.number,
            callback: vld.function,
            subconfig: vld.properties({
                name: vld.string,
                state: vld.enum(Object.keys(states)),
                logger: vld.properties({
                    enabled: vld.bool,
                    filename: vld.required(vld.string)
                })
            })
        })(options, 'options');
    }, /InvalidPropertyError: Expected property 'filename' of options.subconfig.logger to be string \(required\), but instead got undefined/);

    assert.end();
});

test('array elements simple', function (assert) {
    vld.elements(vld.string)(['hi', 'bye', 'foo'], 'ary');

    assert.throws(function () {
        vld.elements(vld.string)(['hi', 'bye', false, 'foo'], 'ary');
    }, /InvalidElementError: Expected item 2 of ary to be string, but instead got false \(boolean\)/);

    assert.end();
});

test('array elements objects', function (assert) {
    var ary1 = [
        {type: 'foo', size: 8},
        {type: 'bar', size: 10},
        {type: 'baz', size: 33}
    ];

    vld.elements(vld.properties({
        type: vld.string,
        size: vld.number
    }))(ary1, 'ary1');

    var ary2 = [
        {type: 'foo', size: 8},
        {type: true, size: 10},
        {type: 'baz', size: 33}
    ];

    assert.throws(function () {
        vld.elements(vld.properties({
            type: vld.string,
            size: vld.number
        }))(ary2, 'ary2');
    }, /InvalidPropertyError: Expected property 'type' of ary2\[1\] to be string, but instead got true \(boolean\)/);

    assert.end();
});

test('array elements nested', function (assert) {
    var ary = [
        ['hi', 'there', 'friend'],
        ['foo', 'bar', 'baz']
    ];

    vld.elements(vld.elements(vld.string))(ary, 'ary');

    var ary2 = [
        ['hi', 'there', 'friend'],
        ['foo', true, 'baz']
    ];

    assert.throws(function () {
        vld.elements(vld.elements(vld.string))(ary2, 'ary2');
    }, /InvalidElementError: Expected item 1 of ary2\[1\] to be string, but instead got true \(boolean\)/);

    assert.end();
});

test('array check', function (assert) {
    vld.array(['hi'], 'array');

    assert.throws(function () {
        vld.array(true, '`array`');
    }, /ValidationError: Expected `array` to be array, but instead got true \(boolean\)/);

    assert.end();
});

test('buffer check', function (assert) {
    vld.buffer(new Buffer('hi'), '`buffer`');

    assert.throws(function () {
        vld.buffer([], '`buffer`');
    }, /ValidationError: Expected `buffer` to be buffer, but instead got \[\] \(array\)/);

    assert.end();
});

test('null check', function (assert) {
    vld.null(null, 'nullvar');

    assert.throws(function () {
        vld.null('asfd', 'nullvar');
    }, /ValidationError: Expected nullvar to be null, but instead got 'asfd' \(string\)/);

    assert.end();
});

test('nan check', function (assert) {
    vld.nan(NaN, 'nullvar');

    assert.throws(function () {
        vld.nan('asfd', 'nullvar');
    }, /ValidationError: Expected nullvar to be NaN, but instead got 'asfd' \(string\)/);

    assert.end();
});

test('int check', function (assert) {
    vld.int(380, 'intvar');

    assert.throws(function () {
        vld.int('asfd', 'intvar');
    }, /ValidationError: Expected intvar to be integer, but instead got 'asfd' \(string\)/);

    assert.end();
});

test('properties on non object', function (assert) {
    var obj = 'hi';

    assert.throws(function () {
        vld.properties({foo: vld.string})(obj, 'obj');
    }, /ValidationError: Expected obj to be object, but instead got 'hi' \(string\)/);

    assert.end();
});

test('equals check', function (assert) {
    var thing = 100;
    vld.equals(100)(thing, 'thing');

    assert.throws(function () {
        var baz = 101;
        vld.equals(100)(baz, 'baz');
    }, /ValidationError: Expected baz to be 100 \(number\), but instead got 101 \(number\)/);

    assert.end();
});

test('better typeof regex', function (assert) {
    vld.int(380, 'intvar');

    assert.throws(function () {
        vld.int(/hi/, 'intvar');
    }, /ValidationError: Expected intvar to be integer, but instead got \/hi\/ \(regexp\)/);

    assert.end();
});

test('better typeof null', function (assert) {
    vld.int(380, 'intvar');

    assert.throws(function () {
        vld.int(null, 'intvar');
    }, /ValidationError: Expected intvar to be integer, but instead got null/);

    assert.end();
});

