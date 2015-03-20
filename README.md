# vld

Simple validator. Useful for function arguments and functions that take an
object for options. Looks like this:

```javascript
var vld = require('vld');

function doThing(options) {
    vld.object(options);
    vld.properties(options, 'options', {
        foo: vld.string,
        bar: vld.required(vld.string),
        success: vld.required(vld.function),
        failure: vld.required(vld.function),
        type: vld.required(vld.or(vld.string, vld.number)),

        baz: vld.or(vld.equals(34), vld.equals(true), vld.string)
    });
}


// throws InvalidPropertyError: Expected property 'foo' of `options` to be 
// string, but instead got 39 (number)
doThing({foo: 39});


// throws InvalidPropertyError: Expected property 'bar' of `options` to be 
// string (required), but instead got  (undefined)
doThing({
    foo: 'hello',
    success: function () {},
    failure: function () {},
    type: 1000,
    baz: true
})


// throws InvalidPropertyError: Expected property 'baz' of `options` to be 34 
// or true or string, but instead got 1000 (number)
doThing({
    foo: 'hello',
    bar: 'hi',
    success: function () {},
    failure: function () {},
    type: 1000,
    baz: 1000
});

```

Can also be used to validate individual things or arguments.

```javascript
var vld = require('vld');

function stuff(type, name, callback) {
    vld.required(vld.string)(type, 'argument 0 (type)');
    vld.required(vld.or(vld.function, vld.string))(
        name, 
        'argument 1 (name or callback)'
    );
    vld.function(callback, 'argument 2 (callback');
}


// does not throw
stuff('string!', 'the name');

// also does not throw
testIt('sting', 'also string', function () {});


// throws ValidationError: Expected argument 1 (name or callback) to be 
// function or string, but instead got true (boolean)
testIt('string', true);
```


