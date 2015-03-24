var TypedError = require('error/typed');

var InvalidProperty = TypedError({
    type: 'invalid.property',
    message: "Expected property '{itemName}' of `{object}` to be " +
        "{expectedStr}, but instead got {value} ({valueType})"
});

var ValidationError = TypedError({
    type: 'validation',
    message: "Expected {itemName} to be {expectedStr}, but instead got " +
        "{value} ({valueType})"
});

function validateSingle(item, key, name, checkFn, errorConstructor) {
    var res = checkFn(item, key, false);
    if (res) {
        res.object = name;
        throw new errorConstructor(res);
    }
}

var vld = {};

function typeOfCheck(type) {
    typeOfCheckInline.expected = type;

    return typeOfCheckInline;

    function typeOfCheckInline(item, name, errorConstructor) {
        var ret;
        if (errorConstructor !== false) {
            errorConstructor = errorConstructor || ValidationError;
        }

        if (typeof item !== type && typeof item !== 'undefined') {
            ret = {
                value: item,
                valueType: typeof item,
                expected: type,
                expectedStr: type,
                itemName: name
            };
        }

        if (ret && errorConstructor) {
            throw new errorConstructor(ret);
        } else {
            return ret;
        }
    }

    typeOfCheckInline.internalInterface = function typeofInternal(options) {
        var res = typeOfCheckInline(options.value);
    };
}

vld.string = typeOfCheck('string');
vld.number = typeOfCheck('number');
vld.function = typeOfCheck('function');
vld.undefined = typeOfCheck('undefined');
vld.object = typeOfCheck('object');

vld.properties = 
function makeValidateProperties(spec) {
    return validateProperties;
    
    function validateProperties(obj, name, errorConstructor) {
        // If we're checking properties then it should definitely be an object
        var res = vld.object(obj, name, errorConstructor);
        if (res) {
            return res;
        }

        errorConstructor = errorConstructor || InvalidProperty;
        Object.keys(spec).forEach(function (key) {
            console.log("checking item " + key);
            var item = obj[key];
            var rules = spec[key];
            if (Array.isArray(rules)) {
                rules.forEach(function (rule) {
                    validateSingle(item, key, name, rule, errorConstructor);
                });
            } else {
                validateSingle(item, key, name, rules, errorConstructor);
            }
        });
    }
};

vld.required = function validateRequired(checkFn) {
    validateRequiredInline.expected = checkFn.expected + ' (required)';

    return validateRequiredInline;

    function validateRequiredInline(item, name, errorConstructor) {
        if (typeof item === "undefined") {
            return {
                value: item,
                valueType: typeof item,
                itemName: name,
                required: true,
                expected: checkFn.expected,
                expectedStr: validateRequiredInline.expected
            };
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
            console.log("or running check " + checkFn.expected);
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
    validateEqualsInline.expected = expectedValue;

    return validateEqualsInline;

    function validateEqualsInline(item, name, errorConstructor) {
        if (errorConstructor !== false) {
            errorConstructor = errorConstructor || ValidationError;
        }

        if (item !== expectedValue) {
            return {
                value: item,
                valueType: typeof item,
                itemName: name,
                required: true,
                expected: expectedValue,
                expectedStr: expectedValue
            };
        }
    }
};

vld.enum = function makeValidateEnum(choices, name) {
    if (name) {
        validateEnumInline.expected = "a " + name;
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
