var TypedError = require('error/typed');
var util = require('util');

var InvalidProperty = TypedError({
    type: 'invalid.property',
    message: "Expected property '{itemName}' of {object} to be " +
        "{expectedStr}, but instead got {valueStr}"
});

var InvalidElement = TypedError({
    type: 'invalid.element',
    message: "Expected item {itemName} of {object} to be " +
        "{expectedStr}, but instead got {valueStr}"
});


var ValidationError = TypedError({
    type: 'validation',
    message: "Expected {itemName} to be {expectedStr}, but instead got " +
        "{valueStr}"
});

function betterTypeof(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value && value.constructor === RegExp) return 'regexp';
    if (Buffer.isBuffer(value)) return 'buffer';

    return typeof value;
}

// Comes up with a human readable form for value, usually with type in
// parens
function describeValue(value) {
    var type = betterTypeof(value);

    if (type === 'object' || type === 'array') {
        return util.inspect(value) + ' (' + type + ')';
    }

    if (type === 'null' || type === 'undefined') return type;

    if (type === 'string') {
        return "'" + value + "' (string)";
    }

    return value + ' (' + type + ')';
}

function validateSingle(item, key, name, checkFn, errorConstructor) {
    var res = checkFn(item, key, false, name);
    if (res) {
        res.object = name;
        res.valueStr = describeValue(res.value);

        throw new errorConstructor(res);
    }
}

var vld = {};

function makeValidator(expectedStr, checkFn) {
    validator.expected = expectedStr;

    return validator;

    function validator(item, name, errorConstructor) {
        var ret;
        if (errorConstructor !== false) {
            errorConstructor = errorConstructor || ValidationError;
        }

        if (!checkFn(item) && typeof item !== 'undefined') {
            ret = {
                value: item,
                valueStr: describeValue(item),
                valueType: typeof item,
                expected: expectedStr,
                expectedStr: expectedStr,
                itemName: name
            };
        }

        if (ret && errorConstructor) {
            throw new errorConstructor(ret);
        } else {
            return ret;
        }
    }
}


function typeOfCheck(type) {
    return makeValidator(type, function (item) {
        return typeof item === type;
    });
}

vld.string = vld.str = typeOfCheck('string');
vld.number = vld.num = typeOfCheck('number');
vld.function = vld.fn = vld.cb = vld.callback =typeOfCheck('function');
vld.undefined = vld.undef = typeOfCheck('undefined');
vld.object = vld.obj = typeOfCheck('object');
vld.boolean = vld.bool = typeOfCheck('boolean');

vld.array = vld.arr = vld.ary = makeValidator('array', function (item) {
    return Array.isArray(item);
});

vld.buff = vld.buffer = makeValidator('buffer', function (item) {
    return Buffer.isBuffer(item);
});

vld.null = makeValidator('null', function (item) {
    return item === null;
});

vld.nan = vld.NaN = makeValidator('NaN', function (item) {
    return item !== item;
});

vld.int = vld.integer = makeValidator('integer', function (item) {
    return (typeof item === 'number') && (item % 1 === 0);
});

vld.properties = function makeValidateProperties(spec) {
    validateProperties.expected = 'object';

    return validateProperties;
    
    function validateProperties(obj, name, errorConstructor, parentKey) {
        // If we're checking properties then it should definitely be an object
        var res = vld.object(obj, name, errorConstructor);
        if (res) {
            return res;
        }

        errorConstructor = errorConstructor || InvalidProperty;
        Object.keys(spec).forEach(function (key) {
            var item = obj[key];
            var rule = spec[key];

            var fullName = name;

            // If we were passed a parentKey add it to the name, this allows
            // us to make nice error messages when vld.properties is nested
            if (parentKey) {
                if (typeof fullName === 'number') {
                    fullName = parentKey + '[' + fullName + ']';
                } else {
                    fullName = parentKey + '.' + fullName;
                }
            }

            validateSingle(item, key, fullName, rule, errorConstructor);
        });
    }
};

vld.elements = function makeValidateElements(spec) {
    return validateElements;

    function validateElements(array, name, errorConstructor, parentKey) {
        // If we're checking elements then it should definitely be an array
        // TODO: this check
        var res = vld.array(array, name, errorConstructor);
        if (res) {
            return res;
        }

        var fullName = name;

        // If we were passed a parentKey add it to the name, this allows
        // us to make nice error messages when vld.properties is nested
        if (parentKey) {
            if (typeof fullName === 'number') {
                fullName = parentKey + '[' + fullName + ']';
            } else {
                fullName = parentKey + '.' + fullName;
            }
        }

        errorConstructor = errorConstructor || InvalidElement;

        array.forEach(function (item, index) {
            validateSingle(item, index, fullName, spec, errorConstructor);
        });

    }
};

vld.required = function validateRequired(checkFn) {
    validateRequiredInline.expected = checkFn.expected + ' (required)';

    return validateRequiredInline;

    function validateRequiredInline(item, name, errorConstructor) {
        if (errorConstructor !== false) {
            errorConstructor = errorConstructor || ValidationError;
        }
        var ret;

        if (typeof item === "undefined") {
            ret = {
                value: item,
                valueStr: describeValue(item),
                valueType: typeof item,
                itemName: name,
                required: true,
                expected: checkFn.expected,
                expectedStr: validateRequiredInline.expected
            };
        }

        if (ret) {
            if (errorConstructor) {
                throw new errorConstructor(ret);
            }

            return ret;
        }

        return checkFn(item, name, errorConstructor);
    }
};

vld.or = function validateOr() {
    var checkFns = Array.prototype.slice.call(arguments);
    validateOrInline.expected = checkFns
        .map(function (item) { return item.expected; })
        .join(' or ');

    return validateOrInline;

    function validateOrInline(item, name, errorConstructor) {
        var res = true;
        checkFns.forEach(function (checkFn) {
            // at least one checkFn passes
            if (!checkFn(item, name, false)) {
                res = false;
            }
        });

        if (errorConstructor !== false) {
            errorConstructor = errorConstructor || ValidationError;
        }

        if (res) {
            var resInfo = {
                value: item,
                valueStr: describeValue(item),
                valueType: typeof item,
                itemName: name,
                expectedStr: validateOrInline.expected,
                expected: validateOrInline.expected
            };

            if (errorConstructor) {
                throw new errorConstructor(resInfo);
            }

            return resInfo;
        }
    }
};

vld.equals = function makeValidateEquals(expectedValue) {
    validateEqualsInline.expected = describeValue(expectedValue);

    return validateEqualsInline;

    function validateEqualsInline(item, name, errorConstructor) {
        if (errorConstructor !== false) {
            errorConstructor = errorConstructor || ValidationError;
        }
        var res;

        if (item !== expectedValue) {
            res = {
                value: item,
                valueStr: describeValue(item),
                valueType: typeof item,
                itemName: name,
                required: true,
                expected: expectedValue,
                expectedStr: validateEqualsInline.expected
            };
        }

        if (res && errorConstructor) {
            throw new errorConstructor(res);
        }

        return res;
    }
};

vld.enum = function makeValidateEnum(choices, name) {
    if (name) {
        validateEnumInline.expected = name;
    } else {
        validateEnumInline.expected = "one of " + choices.join(' ');
    }

    return validateEnumInline;

    function validateEnumInline(item, name, errorConstructor) {
        if (errorConstructor !== false) {
            errorConstructor = errorConstructor || ValidationError;
        }

        var res;

        if (choices.indexOf(item) === -1) {
            res = {
                value: item,
                valueStr: describeValue(item),
                valueType: typeof item,
                itemName: name,
                expected: validateEnumInline.expected,
                expectedStr: validateEnumInline.expected
            };
        }

        if (res && errorConstructor) {
            throw new errorConstructor(res);
        }

        return res;

    }
};

module.exports = vld;
