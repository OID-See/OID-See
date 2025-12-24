/**
 * vis-util
 * https://github.com/visjs/vis-util
 *
 * utilitie collection for visjs
 *
 * @version 6.0.0
 * @date    2025-07-12T18:02:43.836Z
 *
 * @copyright (c) 2011-2017 Almende B.V, http://almende.com
 * @copyright (c) 2017-2019 visjs contributors, https://github.com/visjs
 *
 * @license
 * vis.js is dual licensed under both
 *
 *   1. The Apache 2.0 License
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *   and
 *
 *   2. The MIT License
 *      http://opensource.org/licenses/MIT
 *
 * vis.js may be distributed under either license.
 */

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var es_array_concat = {};

var globalThis_1;
var hasRequiredGlobalThis;

function requireGlobalThis () {
	if (hasRequiredGlobalThis) return globalThis_1;
	hasRequiredGlobalThis = 1;
	var check = function (it) {
	  return it && it.Math === Math && it;
	};

	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
	globalThis_1 =
	  // eslint-disable-next-line es/no-global-this -- safe
	  check(typeof globalThis == 'object' && globalThis) ||
	  check(typeof window == 'object' && window) ||
	  // eslint-disable-next-line no-restricted-globals -- safe
	  check(typeof self == 'object' && self) ||
	  check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
	  check(typeof globalThis_1 == 'object' && globalThis_1) ||
	  // eslint-disable-next-line no-new-func -- fallback
	  (function () { return this; })() || Function('return this')();
	return globalThis_1;
}

var fails;
var hasRequiredFails;

function requireFails () {
	if (hasRequiredFails) return fails;
	hasRequiredFails = 1;
	fails = function (exec) {
	  try {
	    return !!exec();
	  } catch (error) {
	    return true;
	  }
	};
	return fails;
}

var functionBindNative;
var hasRequiredFunctionBindNative;

function requireFunctionBindNative () {
	if (hasRequiredFunctionBindNative) return functionBindNative;
	hasRequiredFunctionBindNative = 1;
	var fails = /*@__PURE__*/ requireFails();

	functionBindNative = !fails(function () {
	  // eslint-disable-next-line es/no-function-prototype-bind -- safe
	  var test = (function () { /* empty */ }).bind();
	  // eslint-disable-next-line no-prototype-builtins -- safe
	  return typeof test != 'function' || test.hasOwnProperty('prototype');
	});
	return functionBindNative;
}

var functionApply;
var hasRequiredFunctionApply;

function requireFunctionApply () {
	if (hasRequiredFunctionApply) return functionApply;
	hasRequiredFunctionApply = 1;
	var NATIVE_BIND = /*@__PURE__*/ requireFunctionBindNative();

	var FunctionPrototype = Function.prototype;
	var apply = FunctionPrototype.apply;
	var call = FunctionPrototype.call;

	// eslint-disable-next-line es/no-function-prototype-bind, es/no-reflect -- safe
	functionApply = typeof Reflect == 'object' && Reflect.apply || (NATIVE_BIND ? call.bind(apply) : function () {
	  return call.apply(apply, arguments);
	});
	return functionApply;
}

var functionUncurryThis;
var hasRequiredFunctionUncurryThis;

function requireFunctionUncurryThis () {
	if (hasRequiredFunctionUncurryThis) return functionUncurryThis;
	hasRequiredFunctionUncurryThis = 1;
	var NATIVE_BIND = /*@__PURE__*/ requireFunctionBindNative();

	var FunctionPrototype = Function.prototype;
	var call = FunctionPrototype.call;
	// eslint-disable-next-line es/no-function-prototype-bind -- safe
	var uncurryThisWithBind = NATIVE_BIND && FunctionPrototype.bind.bind(call, call);

	functionUncurryThis = NATIVE_BIND ? uncurryThisWithBind : function (fn) {
	  return function () {
	    return call.apply(fn, arguments);
	  };
	};
	return functionUncurryThis;
}

var classofRaw;
var hasRequiredClassofRaw;

function requireClassofRaw () {
	if (hasRequiredClassofRaw) return classofRaw;
	hasRequiredClassofRaw = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();

	var toString = uncurryThis({}.toString);
	var stringSlice = uncurryThis(''.slice);

	classofRaw = function (it) {
	  return stringSlice(toString(it), 8, -1);
	};
	return classofRaw;
}

var functionUncurryThisClause;
var hasRequiredFunctionUncurryThisClause;

function requireFunctionUncurryThisClause () {
	if (hasRequiredFunctionUncurryThisClause) return functionUncurryThisClause;
	hasRequiredFunctionUncurryThisClause = 1;
	var classofRaw = /*@__PURE__*/ requireClassofRaw();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();

	functionUncurryThisClause = function (fn) {
	  // Nashorn bug:
	  //   https://github.com/zloirock/core-js/issues/1128
	  //   https://github.com/zloirock/core-js/issues/1130
	  if (classofRaw(fn) === 'Function') return uncurryThis(fn);
	};
	return functionUncurryThisClause;
}

var isCallable;
var hasRequiredIsCallable;

function requireIsCallable () {
	if (hasRequiredIsCallable) return isCallable;
	hasRequiredIsCallable = 1;
	// https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
	var documentAll = typeof document == 'object' && document.all;

	// `IsCallable` abstract operation
	// https://tc39.es/ecma262/#sec-iscallable
	// eslint-disable-next-line unicorn/no-typeof-undefined -- required for testing
	isCallable = typeof documentAll == 'undefined' && documentAll !== undefined ? function (argument) {
	  return typeof argument == 'function' || argument === documentAll;
	} : function (argument) {
	  return typeof argument == 'function';
	};
	return isCallable;
}

var objectGetOwnPropertyDescriptor = {};

var descriptors;
var hasRequiredDescriptors;

function requireDescriptors () {
	if (hasRequiredDescriptors) return descriptors;
	hasRequiredDescriptors = 1;
	var fails = /*@__PURE__*/ requireFails();

	// Detect IE8's incomplete defineProperty implementation
	descriptors = !fails(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] !== 7;
	});
	return descriptors;
}

var functionCall;
var hasRequiredFunctionCall;

function requireFunctionCall () {
	if (hasRequiredFunctionCall) return functionCall;
	hasRequiredFunctionCall = 1;
	var NATIVE_BIND = /*@__PURE__*/ requireFunctionBindNative();

	var call = Function.prototype.call;
	// eslint-disable-next-line es/no-function-prototype-bind -- safe
	functionCall = NATIVE_BIND ? call.bind(call) : function () {
	  return call.apply(call, arguments);
	};
	return functionCall;
}

var objectPropertyIsEnumerable = {};

var hasRequiredObjectPropertyIsEnumerable;

function requireObjectPropertyIsEnumerable () {
	if (hasRequiredObjectPropertyIsEnumerable) return objectPropertyIsEnumerable;
	hasRequiredObjectPropertyIsEnumerable = 1;
	var $propertyIsEnumerable = {}.propertyIsEnumerable;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

	// Nashorn ~ JDK8 bug
	var NASHORN_BUG = getOwnPropertyDescriptor && !$propertyIsEnumerable.call({ 1: 2 }, 1);

	// `Object.prototype.propertyIsEnumerable` method implementation
	// https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
	objectPropertyIsEnumerable.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
	  var descriptor = getOwnPropertyDescriptor(this, V);
	  return !!descriptor && descriptor.enumerable;
	} : $propertyIsEnumerable;
	return objectPropertyIsEnumerable;
}

var createPropertyDescriptor;
var hasRequiredCreatePropertyDescriptor;

function requireCreatePropertyDescriptor () {
	if (hasRequiredCreatePropertyDescriptor) return createPropertyDescriptor;
	hasRequiredCreatePropertyDescriptor = 1;
	createPropertyDescriptor = function (bitmap, value) {
	  return {
	    enumerable: !(bitmap & 1),
	    configurable: !(bitmap & 2),
	    writable: !(bitmap & 4),
	    value: value
	  };
	};
	return createPropertyDescriptor;
}

var indexedObject;
var hasRequiredIndexedObject;

function requireIndexedObject () {
	if (hasRequiredIndexedObject) return indexedObject;
	hasRequiredIndexedObject = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var fails = /*@__PURE__*/ requireFails();
	var classof = /*@__PURE__*/ requireClassofRaw();

	var $Object = Object;
	var split = uncurryThis(''.split);

	// fallback for non-array-like ES3 and non-enumerable old V8 strings
	indexedObject = fails(function () {
	  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
	  // eslint-disable-next-line no-prototype-builtins -- safe
	  return !$Object('z').propertyIsEnumerable(0);
	}) ? function (it) {
	  return classof(it) === 'String' ? split(it, '') : $Object(it);
	} : $Object;
	return indexedObject;
}

var isNullOrUndefined;
var hasRequiredIsNullOrUndefined;

function requireIsNullOrUndefined () {
	if (hasRequiredIsNullOrUndefined) return isNullOrUndefined;
	hasRequiredIsNullOrUndefined = 1;
	// we can't use just `it == null` since of `document.all` special case
	// https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot-aec
	isNullOrUndefined = function (it) {
	  return it === null || it === undefined;
	};
	return isNullOrUndefined;
}

var requireObjectCoercible;
var hasRequiredRequireObjectCoercible;

function requireRequireObjectCoercible () {
	if (hasRequiredRequireObjectCoercible) return requireObjectCoercible;
	hasRequiredRequireObjectCoercible = 1;
	var isNullOrUndefined = /*@__PURE__*/ requireIsNullOrUndefined();

	var $TypeError = TypeError;

	// `RequireObjectCoercible` abstract operation
	// https://tc39.es/ecma262/#sec-requireobjectcoercible
	requireObjectCoercible = function (it) {
	  if (isNullOrUndefined(it)) throw new $TypeError("Can't call method on " + it);
	  return it;
	};
	return requireObjectCoercible;
}

var toIndexedObject;
var hasRequiredToIndexedObject;

function requireToIndexedObject () {
	if (hasRequiredToIndexedObject) return toIndexedObject;
	hasRequiredToIndexedObject = 1;
	// toObject with fallback for non-array-like ES3 strings
	var IndexedObject = /*@__PURE__*/ requireIndexedObject();
	var requireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();

	toIndexedObject = function (it) {
	  return IndexedObject(requireObjectCoercible(it));
	};
	return toIndexedObject;
}

var isObject$1;
var hasRequiredIsObject;

function requireIsObject () {
	if (hasRequiredIsObject) return isObject$1;
	hasRequiredIsObject = 1;
	var isCallable = /*@__PURE__*/ requireIsCallable();

	isObject$1 = function (it) {
	  return typeof it == 'object' ? it !== null : isCallable(it);
	};
	return isObject$1;
}

var path;
var hasRequiredPath;

function requirePath () {
	if (hasRequiredPath) return path;
	hasRequiredPath = 1;
	path = {};
	return path;
}

var getBuiltIn;
var hasRequiredGetBuiltIn;

function requireGetBuiltIn () {
	if (hasRequiredGetBuiltIn) return getBuiltIn;
	hasRequiredGetBuiltIn = 1;
	var path = /*@__PURE__*/ requirePath();
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var isCallable = /*@__PURE__*/ requireIsCallable();

	var aFunction = function (variable) {
	  return isCallable(variable) ? variable : undefined;
	};

	getBuiltIn = function (namespace, method) {
	  return arguments.length < 2 ? aFunction(path[namespace]) || aFunction(globalThis[namespace])
	    : path[namespace] && path[namespace][method] || globalThis[namespace] && globalThis[namespace][method];
	};
	return getBuiltIn;
}

var objectIsPrototypeOf;
var hasRequiredObjectIsPrototypeOf;

function requireObjectIsPrototypeOf () {
	if (hasRequiredObjectIsPrototypeOf) return objectIsPrototypeOf;
	hasRequiredObjectIsPrototypeOf = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();

	objectIsPrototypeOf = uncurryThis({}.isPrototypeOf);
	return objectIsPrototypeOf;
}

var environmentUserAgent;
var hasRequiredEnvironmentUserAgent;

function requireEnvironmentUserAgent () {
	if (hasRequiredEnvironmentUserAgent) return environmentUserAgent;
	hasRequiredEnvironmentUserAgent = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();

	var navigator = globalThis.navigator;
	var userAgent = navigator && navigator.userAgent;

	environmentUserAgent = userAgent ? String(userAgent) : '';
	return environmentUserAgent;
}

var environmentV8Version;
var hasRequiredEnvironmentV8Version;

function requireEnvironmentV8Version () {
	if (hasRequiredEnvironmentV8Version) return environmentV8Version;
	hasRequiredEnvironmentV8Version = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var userAgent = /*@__PURE__*/ requireEnvironmentUserAgent();

	var process = globalThis.process;
	var Deno = globalThis.Deno;
	var versions = process && process.versions || Deno && Deno.version;
	var v8 = versions && versions.v8;
	var match, version;

	if (v8) {
	  match = v8.split('.');
	  // in old Chrome, versions of V8 isn't V8 = Chrome / 10
	  // but their correct versions are not interesting for us
	  version = match[0] > 0 && match[0] < 4 ? 1 : +(match[0] + match[1]);
	}

	// BrowserFS NodeJS `process` polyfill incorrectly set `.v8` to `0.0`
	// so check `userAgent` even if `.v8` exists, but 0
	if (!version && userAgent) {
	  match = userAgent.match(/Edge\/(\d+)/);
	  if (!match || match[1] >= 74) {
	    match = userAgent.match(/Chrome\/(\d+)/);
	    if (match) version = +match[1];
	  }
	}

	environmentV8Version = version;
	return environmentV8Version;
}

var symbolConstructorDetection;
var hasRequiredSymbolConstructorDetection;

function requireSymbolConstructorDetection () {
	if (hasRequiredSymbolConstructorDetection) return symbolConstructorDetection;
	hasRequiredSymbolConstructorDetection = 1;
	/* eslint-disable es/no-symbol -- required for testing */
	var V8_VERSION = /*@__PURE__*/ requireEnvironmentV8Version();
	var fails = /*@__PURE__*/ requireFails();
	var globalThis = /*@__PURE__*/ requireGlobalThis();

	var $String = globalThis.String;

	// eslint-disable-next-line es/no-object-getownpropertysymbols -- required for testing
	symbolConstructorDetection = !!Object.getOwnPropertySymbols && !fails(function () {
	  var symbol = Symbol('symbol detection');
	  // Chrome 38 Symbol has incorrect toString conversion
	  // `get-own-property-symbols` polyfill symbols converted to object are not Symbol instances
	  // nb: Do not call `String` directly to avoid this being optimized out to `symbol+''` which will,
	  // of course, fail.
	  return !$String(symbol) || !(Object(symbol) instanceof Symbol) ||
	    // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
	    !Symbol.sham && V8_VERSION && V8_VERSION < 41;
	});
	return symbolConstructorDetection;
}

var useSymbolAsUid;
var hasRequiredUseSymbolAsUid;

function requireUseSymbolAsUid () {
	if (hasRequiredUseSymbolAsUid) return useSymbolAsUid;
	hasRequiredUseSymbolAsUid = 1;
	/* eslint-disable es/no-symbol -- required for testing */
	var NATIVE_SYMBOL = /*@__PURE__*/ requireSymbolConstructorDetection();

	useSymbolAsUid = NATIVE_SYMBOL &&
	  !Symbol.sham &&
	  typeof Symbol.iterator == 'symbol';
	return useSymbolAsUid;
}

var isSymbol;
var hasRequiredIsSymbol;

function requireIsSymbol () {
	if (hasRequiredIsSymbol) return isSymbol;
	hasRequiredIsSymbol = 1;
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var USE_SYMBOL_AS_UID = /*@__PURE__*/ requireUseSymbolAsUid();

	var $Object = Object;

	isSymbol = USE_SYMBOL_AS_UID ? function (it) {
	  return typeof it == 'symbol';
	} : function (it) {
	  var $Symbol = getBuiltIn('Symbol');
	  return isCallable($Symbol) && isPrototypeOf($Symbol.prototype, $Object(it));
	};
	return isSymbol;
}

var tryToString;
var hasRequiredTryToString;

function requireTryToString () {
	if (hasRequiredTryToString) return tryToString;
	hasRequiredTryToString = 1;
	var $String = String;

	tryToString = function (argument) {
	  try {
	    return $String(argument);
	  } catch (error) {
	    return 'Object';
	  }
	};
	return tryToString;
}

var aCallable;
var hasRequiredACallable;

function requireACallable () {
	if (hasRequiredACallable) return aCallable;
	hasRequiredACallable = 1;
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var tryToString = /*@__PURE__*/ requireTryToString();

	var $TypeError = TypeError;

	// `Assert: IsCallable(argument) is true`
	aCallable = function (argument) {
	  if (isCallable(argument)) return argument;
	  throw new $TypeError(tryToString(argument) + ' is not a function');
	};
	return aCallable;
}

var getMethod;
var hasRequiredGetMethod;

function requireGetMethod () {
	if (hasRequiredGetMethod) return getMethod;
	hasRequiredGetMethod = 1;
	var aCallable = /*@__PURE__*/ requireACallable();
	var isNullOrUndefined = /*@__PURE__*/ requireIsNullOrUndefined();

	// `GetMethod` abstract operation
	// https://tc39.es/ecma262/#sec-getmethod
	getMethod = function (V, P) {
	  var func = V[P];
	  return isNullOrUndefined(func) ? undefined : aCallable(func);
	};
	return getMethod;
}

var ordinaryToPrimitive;
var hasRequiredOrdinaryToPrimitive;

function requireOrdinaryToPrimitive () {
	if (hasRequiredOrdinaryToPrimitive) return ordinaryToPrimitive;
	hasRequiredOrdinaryToPrimitive = 1;
	var call = /*@__PURE__*/ requireFunctionCall();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var isObject = /*@__PURE__*/ requireIsObject();

	var $TypeError = TypeError;

	// `OrdinaryToPrimitive` abstract operation
	// https://tc39.es/ecma262/#sec-ordinarytoprimitive
	ordinaryToPrimitive = function (input, pref) {
	  var fn, val;
	  if (pref === 'string' && isCallable(fn = input.toString) && !isObject(val = call(fn, input))) return val;
	  if (isCallable(fn = input.valueOf) && !isObject(val = call(fn, input))) return val;
	  if (pref !== 'string' && isCallable(fn = input.toString) && !isObject(val = call(fn, input))) return val;
	  throw new $TypeError("Can't convert object to primitive value");
	};
	return ordinaryToPrimitive;
}

var sharedStore = {exports: {}};

var isPure;
var hasRequiredIsPure;

function requireIsPure () {
	if (hasRequiredIsPure) return isPure;
	hasRequiredIsPure = 1;
	isPure = true;
	return isPure;
}

var defineGlobalProperty;
var hasRequiredDefineGlobalProperty;

function requireDefineGlobalProperty () {
	if (hasRequiredDefineGlobalProperty) return defineGlobalProperty;
	hasRequiredDefineGlobalProperty = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();

	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var defineProperty = Object.defineProperty;

	defineGlobalProperty = function (key, value) {
	  try {
	    defineProperty(globalThis, key, { value: value, configurable: true, writable: true });
	  } catch (error) {
	    globalThis[key] = value;
	  } return value;
	};
	return defineGlobalProperty;
}

var hasRequiredSharedStore;

function requireSharedStore () {
	if (hasRequiredSharedStore) return sharedStore.exports;
	hasRequiredSharedStore = 1;
	var IS_PURE = /*@__PURE__*/ requireIsPure();
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var defineGlobalProperty = /*@__PURE__*/ requireDefineGlobalProperty();

	var SHARED = '__core-js_shared__';
	var store = sharedStore.exports = globalThis[SHARED] || defineGlobalProperty(SHARED, {});

	(store.versions || (store.versions = [])).push({
	  version: '3.44.0',
	  mode: IS_PURE ? 'pure' : 'global',
	  copyright: '© 2014-2025 Denis Pushkarev (zloirock.ru)',
	  license: 'https://github.com/zloirock/core-js/blob/v3.44.0/LICENSE',
	  source: 'https://github.com/zloirock/core-js'
	});
	return sharedStore.exports;
}

var shared;
var hasRequiredShared;

function requireShared () {
	if (hasRequiredShared) return shared;
	hasRequiredShared = 1;
	var store = /*@__PURE__*/ requireSharedStore();

	shared = function (key, value) {
	  return store[key] || (store[key] = value || {});
	};
	return shared;
}

var toObject;
var hasRequiredToObject;

function requireToObject () {
	if (hasRequiredToObject) return toObject;
	hasRequiredToObject = 1;
	var requireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();

	var $Object = Object;

	// `ToObject` abstract operation
	// https://tc39.es/ecma262/#sec-toobject
	toObject = function (argument) {
	  return $Object(requireObjectCoercible(argument));
	};
	return toObject;
}

var hasOwnProperty_1;
var hasRequiredHasOwnProperty;

function requireHasOwnProperty () {
	if (hasRequiredHasOwnProperty) return hasOwnProperty_1;
	hasRequiredHasOwnProperty = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var toObject = /*@__PURE__*/ requireToObject();

	var hasOwnProperty = uncurryThis({}.hasOwnProperty);

	// `HasOwnProperty` abstract operation
	// https://tc39.es/ecma262/#sec-hasownproperty
	// eslint-disable-next-line es/no-object-hasown -- safe
	hasOwnProperty_1 = Object.hasOwn || function hasOwn(it, key) {
	  return hasOwnProperty(toObject(it), key);
	};
	return hasOwnProperty_1;
}

var uid;
var hasRequiredUid;

function requireUid () {
	if (hasRequiredUid) return uid;
	hasRequiredUid = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();

	var id = 0;
	var postfix = Math.random();
	var toString = uncurryThis(1.1.toString);

	uid = function (key) {
	  return 'Symbol(' + (key === undefined ? '' : key) + ')_' + toString(++id + postfix, 36);
	};
	return uid;
}

var wellKnownSymbol;
var hasRequiredWellKnownSymbol;

function requireWellKnownSymbol () {
	if (hasRequiredWellKnownSymbol) return wellKnownSymbol;
	hasRequiredWellKnownSymbol = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var shared = /*@__PURE__*/ requireShared();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var uid = /*@__PURE__*/ requireUid();
	var NATIVE_SYMBOL = /*@__PURE__*/ requireSymbolConstructorDetection();
	var USE_SYMBOL_AS_UID = /*@__PURE__*/ requireUseSymbolAsUid();

	var Symbol = globalThis.Symbol;
	var WellKnownSymbolsStore = shared('wks');
	var createWellKnownSymbol = USE_SYMBOL_AS_UID ? Symbol['for'] || Symbol : Symbol && Symbol.withoutSetter || uid;

	wellKnownSymbol = function (name) {
	  if (!hasOwn(WellKnownSymbolsStore, name)) {
	    WellKnownSymbolsStore[name] = NATIVE_SYMBOL && hasOwn(Symbol, name)
	      ? Symbol[name]
	      : createWellKnownSymbol('Symbol.' + name);
	  } return WellKnownSymbolsStore[name];
	};
	return wellKnownSymbol;
}

var toPrimitive;
var hasRequiredToPrimitive;

function requireToPrimitive () {
	if (hasRequiredToPrimitive) return toPrimitive;
	hasRequiredToPrimitive = 1;
	var call = /*@__PURE__*/ requireFunctionCall();
	var isObject = /*@__PURE__*/ requireIsObject();
	var isSymbol = /*@__PURE__*/ requireIsSymbol();
	var getMethod = /*@__PURE__*/ requireGetMethod();
	var ordinaryToPrimitive = /*@__PURE__*/ requireOrdinaryToPrimitive();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	var $TypeError = TypeError;
	var TO_PRIMITIVE = wellKnownSymbol('toPrimitive');

	// `ToPrimitive` abstract operation
	// https://tc39.es/ecma262/#sec-toprimitive
	toPrimitive = function (input, pref) {
	  if (!isObject(input) || isSymbol(input)) return input;
	  var exoticToPrim = getMethod(input, TO_PRIMITIVE);
	  var result;
	  if (exoticToPrim) {
	    if (pref === undefined) pref = 'default';
	    result = call(exoticToPrim, input, pref);
	    if (!isObject(result) || isSymbol(result)) return result;
	    throw new $TypeError("Can't convert object to primitive value");
	  }
	  if (pref === undefined) pref = 'number';
	  return ordinaryToPrimitive(input, pref);
	};
	return toPrimitive;
}

var toPropertyKey;
var hasRequiredToPropertyKey;

function requireToPropertyKey () {
	if (hasRequiredToPropertyKey) return toPropertyKey;
	hasRequiredToPropertyKey = 1;
	var toPrimitive = /*@__PURE__*/ requireToPrimitive();
	var isSymbol = /*@__PURE__*/ requireIsSymbol();

	// `ToPropertyKey` abstract operation
	// https://tc39.es/ecma262/#sec-topropertykey
	toPropertyKey = function (argument) {
	  var key = toPrimitive(argument, 'string');
	  return isSymbol(key) ? key : key + '';
	};
	return toPropertyKey;
}

var documentCreateElement;
var hasRequiredDocumentCreateElement;

function requireDocumentCreateElement () {
	if (hasRequiredDocumentCreateElement) return documentCreateElement;
	hasRequiredDocumentCreateElement = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var isObject = /*@__PURE__*/ requireIsObject();

	var document = globalThis.document;
	// typeof document.createElement is 'object' in old IE
	var EXISTS = isObject(document) && isObject(document.createElement);

	documentCreateElement = function (it) {
	  return EXISTS ? document.createElement(it) : {};
	};
	return documentCreateElement;
}

var ie8DomDefine;
var hasRequiredIe8DomDefine;

function requireIe8DomDefine () {
	if (hasRequiredIe8DomDefine) return ie8DomDefine;
	hasRequiredIe8DomDefine = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var fails = /*@__PURE__*/ requireFails();
	var createElement = /*@__PURE__*/ requireDocumentCreateElement();

	// Thanks to IE8 for its funny defineProperty
	ie8DomDefine = !DESCRIPTORS && !fails(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty(createElement('div'), 'a', {
	    get: function () { return 7; }
	  }).a !== 7;
	});
	return ie8DomDefine;
}

var hasRequiredObjectGetOwnPropertyDescriptor;

function requireObjectGetOwnPropertyDescriptor () {
	if (hasRequiredObjectGetOwnPropertyDescriptor) return objectGetOwnPropertyDescriptor;
	hasRequiredObjectGetOwnPropertyDescriptor = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var call = /*@__PURE__*/ requireFunctionCall();
	var propertyIsEnumerableModule = /*@__PURE__*/ requireObjectPropertyIsEnumerable();
	var createPropertyDescriptor = /*@__PURE__*/ requireCreatePropertyDescriptor();
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var toPropertyKey = /*@__PURE__*/ requireToPropertyKey();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var IE8_DOM_DEFINE = /*@__PURE__*/ requireIe8DomDefine();

	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var $getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

	// `Object.getOwnPropertyDescriptor` method
	// https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
	objectGetOwnPropertyDescriptor.f = DESCRIPTORS ? $getOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
	  O = toIndexedObject(O);
	  P = toPropertyKey(P);
	  if (IE8_DOM_DEFINE) try {
	    return $getOwnPropertyDescriptor(O, P);
	  } catch (error) { /* empty */ }
	  if (hasOwn(O, P)) return createPropertyDescriptor(!call(propertyIsEnumerableModule.f, O, P), O[P]);
	};
	return objectGetOwnPropertyDescriptor;
}

var isForced_1;
var hasRequiredIsForced;

function requireIsForced () {
	if (hasRequiredIsForced) return isForced_1;
	hasRequiredIsForced = 1;
	var fails = /*@__PURE__*/ requireFails();
	var isCallable = /*@__PURE__*/ requireIsCallable();

	var replacement = /#|\.prototype\./;

	var isForced = function (feature, detection) {
	  var value = data[normalize(feature)];
	  return value === POLYFILL ? true
	    : value === NATIVE ? false
	    : isCallable(detection) ? fails(detection)
	    : !!detection;
	};

	var normalize = isForced.normalize = function (string) {
	  return String(string).replace(replacement, '.').toLowerCase();
	};

	var data = isForced.data = {};
	var NATIVE = isForced.NATIVE = 'N';
	var POLYFILL = isForced.POLYFILL = 'P';

	isForced_1 = isForced;
	return isForced_1;
}

var functionBindContext;
var hasRequiredFunctionBindContext;

function requireFunctionBindContext () {
	if (hasRequiredFunctionBindContext) return functionBindContext;
	hasRequiredFunctionBindContext = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThisClause();
	var aCallable = /*@__PURE__*/ requireACallable();
	var NATIVE_BIND = /*@__PURE__*/ requireFunctionBindNative();

	var bind = uncurryThis(uncurryThis.bind);

	// optional / simple context binding
	functionBindContext = function (fn, that) {
	  aCallable(fn);
	  return that === undefined ? fn : NATIVE_BIND ? bind(fn, that) : function (/* ...args */) {
	    return fn.apply(that, arguments);
	  };
	};
	return functionBindContext;
}

var objectDefineProperty = {};

var v8PrototypeDefineBug;
var hasRequiredV8PrototypeDefineBug;

function requireV8PrototypeDefineBug () {
	if (hasRequiredV8PrototypeDefineBug) return v8PrototypeDefineBug;
	hasRequiredV8PrototypeDefineBug = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var fails = /*@__PURE__*/ requireFails();

	// V8 ~ Chrome 36-
	// https://bugs.chromium.org/p/v8/issues/detail?id=3334
	v8PrototypeDefineBug = DESCRIPTORS && fails(function () {
	  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
	  return Object.defineProperty(function () { /* empty */ }, 'prototype', {
	    value: 42,
	    writable: false
	  }).prototype !== 42;
	});
	return v8PrototypeDefineBug;
}

var anObject;
var hasRequiredAnObject;

function requireAnObject () {
	if (hasRequiredAnObject) return anObject;
	hasRequiredAnObject = 1;
	var isObject = /*@__PURE__*/ requireIsObject();

	var $String = String;
	var $TypeError = TypeError;

	// `Assert: Type(argument) is Object`
	anObject = function (argument) {
	  if (isObject(argument)) return argument;
	  throw new $TypeError($String(argument) + ' is not an object');
	};
	return anObject;
}

var hasRequiredObjectDefineProperty;

function requireObjectDefineProperty () {
	if (hasRequiredObjectDefineProperty) return objectDefineProperty;
	hasRequiredObjectDefineProperty = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var IE8_DOM_DEFINE = /*@__PURE__*/ requireIe8DomDefine();
	var V8_PROTOTYPE_DEFINE_BUG = /*@__PURE__*/ requireV8PrototypeDefineBug();
	var anObject = /*@__PURE__*/ requireAnObject();
	var toPropertyKey = /*@__PURE__*/ requireToPropertyKey();

	var $TypeError = TypeError;
	// eslint-disable-next-line es/no-object-defineproperty -- safe
	var $defineProperty = Object.defineProperty;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var $getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
	var ENUMERABLE = 'enumerable';
	var CONFIGURABLE = 'configurable';
	var WRITABLE = 'writable';

	// `Object.defineProperty` method
	// https://tc39.es/ecma262/#sec-object.defineproperty
	objectDefineProperty.f = DESCRIPTORS ? V8_PROTOTYPE_DEFINE_BUG ? function defineProperty(O, P, Attributes) {
	  anObject(O);
	  P = toPropertyKey(P);
	  anObject(Attributes);
	  if (typeof O === 'function' && P === 'prototype' && 'value' in Attributes && WRITABLE in Attributes && !Attributes[WRITABLE]) {
	    var current = $getOwnPropertyDescriptor(O, P);
	    if (current && current[WRITABLE]) {
	      O[P] = Attributes.value;
	      Attributes = {
	        configurable: CONFIGURABLE in Attributes ? Attributes[CONFIGURABLE] : current[CONFIGURABLE],
	        enumerable: ENUMERABLE in Attributes ? Attributes[ENUMERABLE] : current[ENUMERABLE],
	        writable: false
	      };
	    }
	  } return $defineProperty(O, P, Attributes);
	} : $defineProperty : function defineProperty(O, P, Attributes) {
	  anObject(O);
	  P = toPropertyKey(P);
	  anObject(Attributes);
	  if (IE8_DOM_DEFINE) try {
	    return $defineProperty(O, P, Attributes);
	  } catch (error) { /* empty */ }
	  if ('get' in Attributes || 'set' in Attributes) throw new $TypeError('Accessors not supported');
	  if ('value' in Attributes) O[P] = Attributes.value;
	  return O;
	};
	return objectDefineProperty;
}

var createNonEnumerableProperty;
var hasRequiredCreateNonEnumerableProperty;

function requireCreateNonEnumerableProperty () {
	if (hasRequiredCreateNonEnumerableProperty) return createNonEnumerableProperty;
	hasRequiredCreateNonEnumerableProperty = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var definePropertyModule = /*@__PURE__*/ requireObjectDefineProperty();
	var createPropertyDescriptor = /*@__PURE__*/ requireCreatePropertyDescriptor();

	createNonEnumerableProperty = DESCRIPTORS ? function (object, key, value) {
	  return definePropertyModule.f(object, key, createPropertyDescriptor(1, value));
	} : function (object, key, value) {
	  object[key] = value;
	  return object;
	};
	return createNonEnumerableProperty;
}

var _export;
var hasRequired_export;

function require_export () {
	if (hasRequired_export) return _export;
	hasRequired_export = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var apply = /*@__PURE__*/ requireFunctionApply();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThisClause();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var getOwnPropertyDescriptor = /*@__PURE__*/ requireObjectGetOwnPropertyDescriptor().f;
	var isForced = /*@__PURE__*/ requireIsForced();
	var path = /*@__PURE__*/ requirePath();
	var bind = /*@__PURE__*/ requireFunctionBindContext();
	var createNonEnumerableProperty = /*@__PURE__*/ requireCreateNonEnumerableProperty();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();

	var wrapConstructor = function (NativeConstructor) {
	  var Wrapper = function (a, b, c) {
	    if (this instanceof Wrapper) {
	      switch (arguments.length) {
	        case 0: return new NativeConstructor();
	        case 1: return new NativeConstructor(a);
	        case 2: return new NativeConstructor(a, b);
	      } return new NativeConstructor(a, b, c);
	    } return apply(NativeConstructor, this, arguments);
	  };
	  Wrapper.prototype = NativeConstructor.prototype;
	  return Wrapper;
	};

	/*
	  options.target         - name of the target object
	  options.global         - target is the global object
	  options.stat           - export as static methods of target
	  options.proto          - export as prototype methods of target
	  options.real           - real prototype method for the `pure` version
	  options.forced         - export even if the native feature is available
	  options.bind           - bind methods to the target, required for the `pure` version
	  options.wrap           - wrap constructors to preventing global pollution, required for the `pure` version
	  options.unsafe         - use the simple assignment of property instead of delete + defineProperty
	  options.sham           - add a flag to not completely full polyfills
	  options.enumerable     - export as enumerable property
	  options.dontCallGetSet - prevent calling a getter on target
	  options.name           - the .name of the function if it does not match the key
	*/
	_export = function (options, source) {
	  var TARGET = options.target;
	  var GLOBAL = options.global;
	  var STATIC = options.stat;
	  var PROTO = options.proto;

	  var nativeSource = GLOBAL ? globalThis : STATIC ? globalThis[TARGET] : globalThis[TARGET] && globalThis[TARGET].prototype;

	  var target = GLOBAL ? path : path[TARGET] || createNonEnumerableProperty(path, TARGET, {})[TARGET];
	  var targetPrototype = target.prototype;

	  var FORCED, USE_NATIVE, VIRTUAL_PROTOTYPE;
	  var key, sourceProperty, targetProperty, nativeProperty, resultProperty, descriptor;

	  for (key in source) {
	    FORCED = isForced(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
	    // contains in native
	    USE_NATIVE = !FORCED && nativeSource && hasOwn(nativeSource, key);

	    targetProperty = target[key];

	    if (USE_NATIVE) if (options.dontCallGetSet) {
	      descriptor = getOwnPropertyDescriptor(nativeSource, key);
	      nativeProperty = descriptor && descriptor.value;
	    } else nativeProperty = nativeSource[key];

	    // export native or implementation
	    sourceProperty = (USE_NATIVE && nativeProperty) ? nativeProperty : source[key];

	    if (!FORCED && !PROTO && typeof targetProperty == typeof sourceProperty) continue;

	    // bind methods to global for calling from export context
	    if (options.bind && USE_NATIVE) resultProperty = bind(sourceProperty, globalThis);
	    // wrap global constructors for prevent changes in this version
	    else if (options.wrap && USE_NATIVE) resultProperty = wrapConstructor(sourceProperty);
	    // make static versions for prototype methods
	    else if (PROTO && isCallable(sourceProperty)) resultProperty = uncurryThis(sourceProperty);
	    // default case
	    else resultProperty = sourceProperty;

	    // add a flag to not completely full polyfills
	    if (options.sham || (sourceProperty && sourceProperty.sham) || (targetProperty && targetProperty.sham)) {
	      createNonEnumerableProperty(resultProperty, 'sham', true);
	    }

	    createNonEnumerableProperty(target, key, resultProperty);

	    if (PROTO) {
	      VIRTUAL_PROTOTYPE = TARGET + 'Prototype';
	      if (!hasOwn(path, VIRTUAL_PROTOTYPE)) {
	        createNonEnumerableProperty(path, VIRTUAL_PROTOTYPE, {});
	      }
	      // export virtual prototype methods
	      createNonEnumerableProperty(path[VIRTUAL_PROTOTYPE], key, sourceProperty);
	      // export real prototype methods
	      if (options.real && targetPrototype && (FORCED || !targetPrototype[key])) {
	        createNonEnumerableProperty(targetPrototype, key, sourceProperty);
	      }
	    }
	  }
	};
	return _export;
}

var isArray$3;
var hasRequiredIsArray$3;

function requireIsArray$3 () {
	if (hasRequiredIsArray$3) return isArray$3;
	hasRequiredIsArray$3 = 1;
	var classof = /*@__PURE__*/ requireClassofRaw();

	// `IsArray` abstract operation
	// https://tc39.es/ecma262/#sec-isarray
	// eslint-disable-next-line es/no-array-isarray -- safe
	isArray$3 = Array.isArray || function isArray(argument) {
	  return classof(argument) === 'Array';
	};
	return isArray$3;
}

var mathTrunc;
var hasRequiredMathTrunc;

function requireMathTrunc () {
	if (hasRequiredMathTrunc) return mathTrunc;
	hasRequiredMathTrunc = 1;
	var ceil = Math.ceil;
	var floor = Math.floor;

	// `Math.trunc` method
	// https://tc39.es/ecma262/#sec-math.trunc
	// eslint-disable-next-line es/no-math-trunc -- safe
	mathTrunc = Math.trunc || function trunc(x) {
	  var n = +x;
	  return (n > 0 ? floor : ceil)(n);
	};
	return mathTrunc;
}

var toIntegerOrInfinity;
var hasRequiredToIntegerOrInfinity;

function requireToIntegerOrInfinity () {
	if (hasRequiredToIntegerOrInfinity) return toIntegerOrInfinity;
	hasRequiredToIntegerOrInfinity = 1;
	var trunc = /*@__PURE__*/ requireMathTrunc();

	// `ToIntegerOrInfinity` abstract operation
	// https://tc39.es/ecma262/#sec-tointegerorinfinity
	toIntegerOrInfinity = function (argument) {
	  var number = +argument;
	  // eslint-disable-next-line no-self-compare -- NaN check
	  return number !== number || number === 0 ? 0 : trunc(number);
	};
	return toIntegerOrInfinity;
}

var toLength;
var hasRequiredToLength;

function requireToLength () {
	if (hasRequiredToLength) return toLength;
	hasRequiredToLength = 1;
	var toIntegerOrInfinity = /*@__PURE__*/ requireToIntegerOrInfinity();

	var min = Math.min;

	// `ToLength` abstract operation
	// https://tc39.es/ecma262/#sec-tolength
	toLength = function (argument) {
	  var len = toIntegerOrInfinity(argument);
	  return len > 0 ? min(len, 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
	};
	return toLength;
}

var lengthOfArrayLike;
var hasRequiredLengthOfArrayLike;

function requireLengthOfArrayLike () {
	if (hasRequiredLengthOfArrayLike) return lengthOfArrayLike;
	hasRequiredLengthOfArrayLike = 1;
	var toLength = /*@__PURE__*/ requireToLength();

	// `LengthOfArrayLike` abstract operation
	// https://tc39.es/ecma262/#sec-lengthofarraylike
	lengthOfArrayLike = function (obj) {
	  return toLength(obj.length);
	};
	return lengthOfArrayLike;
}

var doesNotExceedSafeInteger;
var hasRequiredDoesNotExceedSafeInteger;

function requireDoesNotExceedSafeInteger () {
	if (hasRequiredDoesNotExceedSafeInteger) return doesNotExceedSafeInteger;
	hasRequiredDoesNotExceedSafeInteger = 1;
	var $TypeError = TypeError;
	var MAX_SAFE_INTEGER = 0x1FFFFFFFFFFFFF; // 2 ** 53 - 1 == 9007199254740991

	doesNotExceedSafeInteger = function (it) {
	  if (it > MAX_SAFE_INTEGER) throw $TypeError('Maximum allowed index exceeded');
	  return it;
	};
	return doesNotExceedSafeInteger;
}

var createProperty;
var hasRequiredCreateProperty;

function requireCreateProperty () {
	if (hasRequiredCreateProperty) return createProperty;
	hasRequiredCreateProperty = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var definePropertyModule = /*@__PURE__*/ requireObjectDefineProperty();
	var createPropertyDescriptor = /*@__PURE__*/ requireCreatePropertyDescriptor();

	createProperty = function (object, key, value) {
	  if (DESCRIPTORS) definePropertyModule.f(object, key, createPropertyDescriptor(0, value));
	  else object[key] = value;
	};
	return createProperty;
}

var toStringTagSupport;
var hasRequiredToStringTagSupport;

function requireToStringTagSupport () {
	if (hasRequiredToStringTagSupport) return toStringTagSupport;
	hasRequiredToStringTagSupport = 1;
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	var TO_STRING_TAG = wellKnownSymbol('toStringTag');
	var test = {};

	test[TO_STRING_TAG] = 'z';

	toStringTagSupport = String(test) === '[object z]';
	return toStringTagSupport;
}

var classof;
var hasRequiredClassof;

function requireClassof () {
	if (hasRequiredClassof) return classof;
	hasRequiredClassof = 1;
	var TO_STRING_TAG_SUPPORT = /*@__PURE__*/ requireToStringTagSupport();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var classofRaw = /*@__PURE__*/ requireClassofRaw();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	var TO_STRING_TAG = wellKnownSymbol('toStringTag');
	var $Object = Object;

	// ES3 wrong here
	var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) === 'Arguments';

	// fallback for IE11 Script Access Denied error
	var tryGet = function (it, key) {
	  try {
	    return it[key];
	  } catch (error) { /* empty */ }
	};

	// getting tag from ES6+ `Object.prototype.toString`
	classof = TO_STRING_TAG_SUPPORT ? classofRaw : function (it) {
	  var O, tag, result;
	  return it === undefined ? 'Undefined' : it === null ? 'Null'
	    // @@toStringTag case
	    : typeof (tag = tryGet(O = $Object(it), TO_STRING_TAG)) == 'string' ? tag
	    // builtinTag case
	    : CORRECT_ARGUMENTS ? classofRaw(O)
	    // ES3 arguments fallback
	    : (result = classofRaw(O)) === 'Object' && isCallable(O.callee) ? 'Arguments' : result;
	};
	return classof;
}

var inspectSource;
var hasRequiredInspectSource;

function requireInspectSource () {
	if (hasRequiredInspectSource) return inspectSource;
	hasRequiredInspectSource = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var store = /*@__PURE__*/ requireSharedStore();

	var functionToString = uncurryThis(Function.toString);

	// this helper broken in `core-js@3.4.1-3.4.4`, so we can't use `shared` helper
	if (!isCallable(store.inspectSource)) {
	  store.inspectSource = function (it) {
	    return functionToString(it);
	  };
	}

	inspectSource = store.inspectSource;
	return inspectSource;
}

var isConstructor;
var hasRequiredIsConstructor;

function requireIsConstructor () {
	if (hasRequiredIsConstructor) return isConstructor;
	hasRequiredIsConstructor = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var fails = /*@__PURE__*/ requireFails();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var classof = /*@__PURE__*/ requireClassof();
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();
	var inspectSource = /*@__PURE__*/ requireInspectSource();

	var noop = function () { /* empty */ };
	var construct = getBuiltIn('Reflect', 'construct');
	var constructorRegExp = /^\s*(?:class|function)\b/;
	var exec = uncurryThis(constructorRegExp.exec);
	var INCORRECT_TO_STRING = !constructorRegExp.test(noop);

	var isConstructorModern = function isConstructor(argument) {
	  if (!isCallable(argument)) return false;
	  try {
	    construct(noop, [], argument);
	    return true;
	  } catch (error) {
	    return false;
	  }
	};

	var isConstructorLegacy = function isConstructor(argument) {
	  if (!isCallable(argument)) return false;
	  switch (classof(argument)) {
	    case 'AsyncFunction':
	    case 'GeneratorFunction':
	    case 'AsyncGeneratorFunction': return false;
	  }
	  try {
	    // we can't check .prototype since constructors produced by .bind haven't it
	    // `Function#toString` throws on some built-it function in some legacy engines
	    // (for example, `DOMQuad` and similar in FF41-)
	    return INCORRECT_TO_STRING || !!exec(constructorRegExp, inspectSource(argument));
	  } catch (error) {
	    return true;
	  }
	};

	isConstructorLegacy.sham = true;

	// `IsConstructor` abstract operation
	// https://tc39.es/ecma262/#sec-isconstructor
	isConstructor = !construct || fails(function () {
	  var called;
	  return isConstructorModern(isConstructorModern.call)
	    || !isConstructorModern(Object)
	    || !isConstructorModern(function () { called = true; })
	    || called;
	}) ? isConstructorLegacy : isConstructorModern;
	return isConstructor;
}

var arraySpeciesConstructor;
var hasRequiredArraySpeciesConstructor;

function requireArraySpeciesConstructor () {
	if (hasRequiredArraySpeciesConstructor) return arraySpeciesConstructor;
	hasRequiredArraySpeciesConstructor = 1;
	var isArray = /*@__PURE__*/ requireIsArray$3();
	var isConstructor = /*@__PURE__*/ requireIsConstructor();
	var isObject = /*@__PURE__*/ requireIsObject();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	var SPECIES = wellKnownSymbol('species');
	var $Array = Array;

	// a part of `ArraySpeciesCreate` abstract operation
	// https://tc39.es/ecma262/#sec-arrayspeciescreate
	arraySpeciesConstructor = function (originalArray) {
	  var C;
	  if (isArray(originalArray)) {
	    C = originalArray.constructor;
	    // cross-realm fallback
	    if (isConstructor(C) && (C === $Array || isArray(C.prototype))) C = undefined;
	    else if (isObject(C)) {
	      C = C[SPECIES];
	      if (C === null) C = undefined;
	    }
	  } return C === undefined ? $Array : C;
	};
	return arraySpeciesConstructor;
}

var arraySpeciesCreate;
var hasRequiredArraySpeciesCreate;

function requireArraySpeciesCreate () {
	if (hasRequiredArraySpeciesCreate) return arraySpeciesCreate;
	hasRequiredArraySpeciesCreate = 1;
	var arraySpeciesConstructor = /*@__PURE__*/ requireArraySpeciesConstructor();

	// `ArraySpeciesCreate` abstract operation
	// https://tc39.es/ecma262/#sec-arrayspeciescreate
	arraySpeciesCreate = function (originalArray, length) {
	  return new (arraySpeciesConstructor(originalArray))(length === 0 ? 0 : length);
	};
	return arraySpeciesCreate;
}

var arrayMethodHasSpeciesSupport;
var hasRequiredArrayMethodHasSpeciesSupport;

function requireArrayMethodHasSpeciesSupport () {
	if (hasRequiredArrayMethodHasSpeciesSupport) return arrayMethodHasSpeciesSupport;
	hasRequiredArrayMethodHasSpeciesSupport = 1;
	var fails = /*@__PURE__*/ requireFails();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();
	var V8_VERSION = /*@__PURE__*/ requireEnvironmentV8Version();

	var SPECIES = wellKnownSymbol('species');

	arrayMethodHasSpeciesSupport = function (METHOD_NAME) {
	  // We can't use this feature detection in V8 since it causes
	  // deoptimization and serious performance degradation
	  // https://github.com/zloirock/core-js/issues/677
	  return V8_VERSION >= 51 || !fails(function () {
	    var array = [];
	    var constructor = array.constructor = {};
	    constructor[SPECIES] = function () {
	      return { foo: 1 };
	    };
	    return array[METHOD_NAME](Boolean).foo !== 1;
	  });
	};
	return arrayMethodHasSpeciesSupport;
}

var hasRequiredEs_array_concat;

function requireEs_array_concat () {
	if (hasRequiredEs_array_concat) return es_array_concat;
	hasRequiredEs_array_concat = 1;
	var $ = /*@__PURE__*/ require_export();
	var fails = /*@__PURE__*/ requireFails();
	var isArray = /*@__PURE__*/ requireIsArray$3();
	var isObject = /*@__PURE__*/ requireIsObject();
	var toObject = /*@__PURE__*/ requireToObject();
	var lengthOfArrayLike = /*@__PURE__*/ requireLengthOfArrayLike();
	var doesNotExceedSafeInteger = /*@__PURE__*/ requireDoesNotExceedSafeInteger();
	var createProperty = /*@__PURE__*/ requireCreateProperty();
	var arraySpeciesCreate = /*@__PURE__*/ requireArraySpeciesCreate();
	var arrayMethodHasSpeciesSupport = /*@__PURE__*/ requireArrayMethodHasSpeciesSupport();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();
	var V8_VERSION = /*@__PURE__*/ requireEnvironmentV8Version();

	var IS_CONCAT_SPREADABLE = wellKnownSymbol('isConcatSpreadable');

	// We can't use this feature detection in V8 since it causes
	// deoptimization and serious performance degradation
	// https://github.com/zloirock/core-js/issues/679
	var IS_CONCAT_SPREADABLE_SUPPORT = V8_VERSION >= 51 || !fails(function () {
	  var array = [];
	  array[IS_CONCAT_SPREADABLE] = false;
	  return array.concat()[0] !== array;
	});

	var isConcatSpreadable = function (O) {
	  if (!isObject(O)) return false;
	  var spreadable = O[IS_CONCAT_SPREADABLE];
	  return spreadable !== undefined ? !!spreadable : isArray(O);
	};

	var FORCED = !IS_CONCAT_SPREADABLE_SUPPORT || !arrayMethodHasSpeciesSupport('concat');

	// `Array.prototype.concat` method
	// https://tc39.es/ecma262/#sec-array.prototype.concat
	// with adding support of @@isConcatSpreadable and @@species
	$({ target: 'Array', proto: true, arity: 1, forced: FORCED }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  concat: function concat(arg) {
	    var O = toObject(this);
	    var A = arraySpeciesCreate(O, 0);
	    var n = 0;
	    var i, k, length, len, E;
	    for (i = -1, length = arguments.length; i < length; i++) {
	      E = i === -1 ? O : arguments[i];
	      if (isConcatSpreadable(E)) {
	        len = lengthOfArrayLike(E);
	        doesNotExceedSafeInteger(n + len);
	        for (k = 0; k < len; k++, n++) if (k in E) createProperty(A, n, E[k]);
	      } else {
	        doesNotExceedSafeInteger(n + 1);
	        createProperty(A, n++, E);
	      }
	    }
	    A.length = n;
	    return A;
	  }
	});
	return es_array_concat;
}

var es_symbol = {};

var es_symbol_constructor = {};

var toString;
var hasRequiredToString;

function requireToString () {
	if (hasRequiredToString) return toString;
	hasRequiredToString = 1;
	var classof = /*@__PURE__*/ requireClassof();

	var $String = String;

	toString = function (argument) {
	  if (classof(argument) === 'Symbol') throw new TypeError('Cannot convert a Symbol value to a string');
	  return $String(argument);
	};
	return toString;
}

var objectDefineProperties = {};

var toAbsoluteIndex;
var hasRequiredToAbsoluteIndex;

function requireToAbsoluteIndex () {
	if (hasRequiredToAbsoluteIndex) return toAbsoluteIndex;
	hasRequiredToAbsoluteIndex = 1;
	var toIntegerOrInfinity = /*@__PURE__*/ requireToIntegerOrInfinity();

	var max = Math.max;
	var min = Math.min;

	// Helper for a popular repeating case of the spec:
	// Let integer be ? ToInteger(index).
	// If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
	toAbsoluteIndex = function (index, length) {
	  var integer = toIntegerOrInfinity(index);
	  return integer < 0 ? max(integer + length, 0) : min(integer, length);
	};
	return toAbsoluteIndex;
}

var arrayIncludes;
var hasRequiredArrayIncludes;

function requireArrayIncludes () {
	if (hasRequiredArrayIncludes) return arrayIncludes;
	hasRequiredArrayIncludes = 1;
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var toAbsoluteIndex = /*@__PURE__*/ requireToAbsoluteIndex();
	var lengthOfArrayLike = /*@__PURE__*/ requireLengthOfArrayLike();

	// `Array.prototype.{ indexOf, includes }` methods implementation
	var createMethod = function (IS_INCLUDES) {
	  return function ($this, el, fromIndex) {
	    var O = toIndexedObject($this);
	    var length = lengthOfArrayLike(O);
	    if (length === 0) return !IS_INCLUDES && -1;
	    var index = toAbsoluteIndex(fromIndex, length);
	    var value;
	    // Array#includes uses SameValueZero equality algorithm
	    // eslint-disable-next-line no-self-compare -- NaN check
	    if (IS_INCLUDES && el !== el) while (length > index) {
	      value = O[index++];
	      // eslint-disable-next-line no-self-compare -- NaN check
	      if (value !== value) return true;
	    // Array#indexOf ignores holes, Array#includes - not
	    } else for (;length > index; index++) {
	      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
	    } return !IS_INCLUDES && -1;
	  };
	};

	arrayIncludes = {
	  // `Array.prototype.includes` method
	  // https://tc39.es/ecma262/#sec-array.prototype.includes
	  includes: createMethod(true),
	  // `Array.prototype.indexOf` method
	  // https://tc39.es/ecma262/#sec-array.prototype.indexof
	  indexOf: createMethod(false)
	};
	return arrayIncludes;
}

var hiddenKeys;
var hasRequiredHiddenKeys;

function requireHiddenKeys () {
	if (hasRequiredHiddenKeys) return hiddenKeys;
	hasRequiredHiddenKeys = 1;
	hiddenKeys = {};
	return hiddenKeys;
}

var objectKeysInternal;
var hasRequiredObjectKeysInternal;

function requireObjectKeysInternal () {
	if (hasRequiredObjectKeysInternal) return objectKeysInternal;
	hasRequiredObjectKeysInternal = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var indexOf = /*@__PURE__*/ requireArrayIncludes().indexOf;
	var hiddenKeys = /*@__PURE__*/ requireHiddenKeys();

	var push = uncurryThis([].push);

	objectKeysInternal = function (object, names) {
	  var O = toIndexedObject(object);
	  var i = 0;
	  var result = [];
	  var key;
	  for (key in O) !hasOwn(hiddenKeys, key) && hasOwn(O, key) && push(result, key);
	  // Don't enum bug & hidden keys
	  while (names.length > i) if (hasOwn(O, key = names[i++])) {
	    ~indexOf(result, key) || push(result, key);
	  }
	  return result;
	};
	return objectKeysInternal;
}

var enumBugKeys;
var hasRequiredEnumBugKeys;

function requireEnumBugKeys () {
	if (hasRequiredEnumBugKeys) return enumBugKeys;
	hasRequiredEnumBugKeys = 1;
	// IE8- don't enum bug keys
	enumBugKeys = [
	  'constructor',
	  'hasOwnProperty',
	  'isPrototypeOf',
	  'propertyIsEnumerable',
	  'toLocaleString',
	  'toString',
	  'valueOf'
	];
	return enumBugKeys;
}

var objectKeys;
var hasRequiredObjectKeys;

function requireObjectKeys () {
	if (hasRequiredObjectKeys) return objectKeys;
	hasRequiredObjectKeys = 1;
	var internalObjectKeys = /*@__PURE__*/ requireObjectKeysInternal();
	var enumBugKeys = /*@__PURE__*/ requireEnumBugKeys();

	// `Object.keys` method
	// https://tc39.es/ecma262/#sec-object.keys
	// eslint-disable-next-line es/no-object-keys -- safe
	objectKeys = Object.keys || function keys(O) {
	  return internalObjectKeys(O, enumBugKeys);
	};
	return objectKeys;
}

var hasRequiredObjectDefineProperties;

function requireObjectDefineProperties () {
	if (hasRequiredObjectDefineProperties) return objectDefineProperties;
	hasRequiredObjectDefineProperties = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var V8_PROTOTYPE_DEFINE_BUG = /*@__PURE__*/ requireV8PrototypeDefineBug();
	var definePropertyModule = /*@__PURE__*/ requireObjectDefineProperty();
	var anObject = /*@__PURE__*/ requireAnObject();
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var objectKeys = /*@__PURE__*/ requireObjectKeys();

	// `Object.defineProperties` method
	// https://tc39.es/ecma262/#sec-object.defineproperties
	// eslint-disable-next-line es/no-object-defineproperties -- safe
	objectDefineProperties.f = DESCRIPTORS && !V8_PROTOTYPE_DEFINE_BUG ? Object.defineProperties : function defineProperties(O, Properties) {
	  anObject(O);
	  var props = toIndexedObject(Properties);
	  var keys = objectKeys(Properties);
	  var length = keys.length;
	  var index = 0;
	  var key;
	  while (length > index) definePropertyModule.f(O, key = keys[index++], props[key]);
	  return O;
	};
	return objectDefineProperties;
}

var html;
var hasRequiredHtml;

function requireHtml () {
	if (hasRequiredHtml) return html;
	hasRequiredHtml = 1;
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();

	html = getBuiltIn('document', 'documentElement');
	return html;
}

var sharedKey;
var hasRequiredSharedKey;

function requireSharedKey () {
	if (hasRequiredSharedKey) return sharedKey;
	hasRequiredSharedKey = 1;
	var shared = /*@__PURE__*/ requireShared();
	var uid = /*@__PURE__*/ requireUid();

	var keys = shared('keys');

	sharedKey = function (key) {
	  return keys[key] || (keys[key] = uid(key));
	};
	return sharedKey;
}

var objectCreate;
var hasRequiredObjectCreate;

function requireObjectCreate () {
	if (hasRequiredObjectCreate) return objectCreate;
	hasRequiredObjectCreate = 1;
	/* global ActiveXObject -- old IE, WSH */
	var anObject = /*@__PURE__*/ requireAnObject();
	var definePropertiesModule = /*@__PURE__*/ requireObjectDefineProperties();
	var enumBugKeys = /*@__PURE__*/ requireEnumBugKeys();
	var hiddenKeys = /*@__PURE__*/ requireHiddenKeys();
	var html = /*@__PURE__*/ requireHtml();
	var documentCreateElement = /*@__PURE__*/ requireDocumentCreateElement();
	var sharedKey = /*@__PURE__*/ requireSharedKey();

	var GT = '>';
	var LT = '<';
	var PROTOTYPE = 'prototype';
	var SCRIPT = 'script';
	var IE_PROTO = sharedKey('IE_PROTO');

	var EmptyConstructor = function () { /* empty */ };

	var scriptTag = function (content) {
	  return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
	};

	// Create object with fake `null` prototype: use ActiveX Object with cleared prototype
	var NullProtoObjectViaActiveX = function (activeXDocument) {
	  activeXDocument.write(scriptTag(''));
	  activeXDocument.close();
	  var temp = activeXDocument.parentWindow.Object;
	  // eslint-disable-next-line no-useless-assignment -- avoid memory leak
	  activeXDocument = null;
	  return temp;
	};

	// Create object with fake `null` prototype: use iframe Object with cleared prototype
	var NullProtoObjectViaIFrame = function () {
	  // Thrash, waste and sodomy: IE GC bug
	  var iframe = documentCreateElement('iframe');
	  var JS = 'java' + SCRIPT + ':';
	  var iframeDocument;
	  iframe.style.display = 'none';
	  html.appendChild(iframe);
	  // https://github.com/zloirock/core-js/issues/475
	  iframe.src = String(JS);
	  iframeDocument = iframe.contentWindow.document;
	  iframeDocument.open();
	  iframeDocument.write(scriptTag('document.F=Object'));
	  iframeDocument.close();
	  return iframeDocument.F;
	};

	// Check for document.domain and active x support
	// No need to use active x approach when document.domain is not set
	// see https://github.com/es-shims/es5-shim/issues/150
	// variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
	// avoid IE GC bug
	var activeXDocument;
	var NullProtoObject = function () {
	  try {
	    activeXDocument = new ActiveXObject('htmlfile');
	  } catch (error) { /* ignore */ }
	  NullProtoObject = typeof document != 'undefined'
	    ? document.domain && activeXDocument
	      ? NullProtoObjectViaActiveX(activeXDocument) // old IE
	      : NullProtoObjectViaIFrame()
	    : NullProtoObjectViaActiveX(activeXDocument); // WSH
	  var length = enumBugKeys.length;
	  while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];
	  return NullProtoObject();
	};

	hiddenKeys[IE_PROTO] = true;

	// `Object.create` method
	// https://tc39.es/ecma262/#sec-object.create
	// eslint-disable-next-line es/no-object-create -- safe
	objectCreate = Object.create || function create(O, Properties) {
	  var result;
	  if (O !== null) {
	    EmptyConstructor[PROTOTYPE] = anObject(O);
	    result = new EmptyConstructor();
	    EmptyConstructor[PROTOTYPE] = null;
	    // add "__proto__" for Object.getPrototypeOf polyfill
	    result[IE_PROTO] = O;
	  } else result = NullProtoObject();
	  return Properties === undefined ? result : definePropertiesModule.f(result, Properties);
	};
	return objectCreate;
}

var objectGetOwnPropertyNames = {};

var hasRequiredObjectGetOwnPropertyNames;

function requireObjectGetOwnPropertyNames () {
	if (hasRequiredObjectGetOwnPropertyNames) return objectGetOwnPropertyNames;
	hasRequiredObjectGetOwnPropertyNames = 1;
	var internalObjectKeys = /*@__PURE__*/ requireObjectKeysInternal();
	var enumBugKeys = /*@__PURE__*/ requireEnumBugKeys();

	var hiddenKeys = enumBugKeys.concat('length', 'prototype');

	// `Object.getOwnPropertyNames` method
	// https://tc39.es/ecma262/#sec-object.getownpropertynames
	// eslint-disable-next-line es/no-object-getownpropertynames -- safe
	objectGetOwnPropertyNames.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
	  return internalObjectKeys(O, hiddenKeys);
	};
	return objectGetOwnPropertyNames;
}

var objectGetOwnPropertyNamesExternal = {};

var arraySlice;
var hasRequiredArraySlice;

function requireArraySlice () {
	if (hasRequiredArraySlice) return arraySlice;
	hasRequiredArraySlice = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();

	arraySlice = uncurryThis([].slice);
	return arraySlice;
}

var hasRequiredObjectGetOwnPropertyNamesExternal;

function requireObjectGetOwnPropertyNamesExternal () {
	if (hasRequiredObjectGetOwnPropertyNamesExternal) return objectGetOwnPropertyNamesExternal;
	hasRequiredObjectGetOwnPropertyNamesExternal = 1;
	/* eslint-disable es/no-object-getownpropertynames -- safe */
	var classof = /*@__PURE__*/ requireClassofRaw();
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var $getOwnPropertyNames = /*@__PURE__*/ requireObjectGetOwnPropertyNames().f;
	var arraySlice = /*@__PURE__*/ requireArraySlice();

	var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
	  ? Object.getOwnPropertyNames(window) : [];

	var getWindowNames = function (it) {
	  try {
	    return $getOwnPropertyNames(it);
	  } catch (error) {
	    return arraySlice(windowNames);
	  }
	};

	// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
	objectGetOwnPropertyNamesExternal.f = function getOwnPropertyNames(it) {
	  return windowNames && classof(it) === 'Window'
	    ? getWindowNames(it)
	    : $getOwnPropertyNames(toIndexedObject(it));
	};
	return objectGetOwnPropertyNamesExternal;
}

var objectGetOwnPropertySymbols = {};

var hasRequiredObjectGetOwnPropertySymbols;

function requireObjectGetOwnPropertySymbols () {
	if (hasRequiredObjectGetOwnPropertySymbols) return objectGetOwnPropertySymbols;
	hasRequiredObjectGetOwnPropertySymbols = 1;
	// eslint-disable-next-line es/no-object-getownpropertysymbols -- safe
	objectGetOwnPropertySymbols.f = Object.getOwnPropertySymbols;
	return objectGetOwnPropertySymbols;
}

var defineBuiltIn;
var hasRequiredDefineBuiltIn;

function requireDefineBuiltIn () {
	if (hasRequiredDefineBuiltIn) return defineBuiltIn;
	hasRequiredDefineBuiltIn = 1;
	var createNonEnumerableProperty = /*@__PURE__*/ requireCreateNonEnumerableProperty();

	defineBuiltIn = function (target, key, value, options) {
	  if (options && options.enumerable) target[key] = value;
	  else createNonEnumerableProperty(target, key, value);
	  return target;
	};
	return defineBuiltIn;
}

var defineBuiltInAccessor;
var hasRequiredDefineBuiltInAccessor;

function requireDefineBuiltInAccessor () {
	if (hasRequiredDefineBuiltInAccessor) return defineBuiltInAccessor;
	hasRequiredDefineBuiltInAccessor = 1;
	var defineProperty = /*@__PURE__*/ requireObjectDefineProperty();

	defineBuiltInAccessor = function (target, name, descriptor) {
	  return defineProperty.f(target, name, descriptor);
	};
	return defineBuiltInAccessor;
}

var wellKnownSymbolWrapped = {};

var hasRequiredWellKnownSymbolWrapped;

function requireWellKnownSymbolWrapped () {
	if (hasRequiredWellKnownSymbolWrapped) return wellKnownSymbolWrapped;
	hasRequiredWellKnownSymbolWrapped = 1;
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	wellKnownSymbolWrapped.f = wellKnownSymbol;
	return wellKnownSymbolWrapped;
}

var wellKnownSymbolDefine;
var hasRequiredWellKnownSymbolDefine;

function requireWellKnownSymbolDefine () {
	if (hasRequiredWellKnownSymbolDefine) return wellKnownSymbolDefine;
	hasRequiredWellKnownSymbolDefine = 1;
	var path = /*@__PURE__*/ requirePath();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var wrappedWellKnownSymbolModule = /*@__PURE__*/ requireWellKnownSymbolWrapped();
	var defineProperty = /*@__PURE__*/ requireObjectDefineProperty().f;

	wellKnownSymbolDefine = function (NAME) {
	  var Symbol = path.Symbol || (path.Symbol = {});
	  if (!hasOwn(Symbol, NAME)) defineProperty(Symbol, NAME, {
	    value: wrappedWellKnownSymbolModule.f(NAME)
	  });
	};
	return wellKnownSymbolDefine;
}

var symbolDefineToPrimitive;
var hasRequiredSymbolDefineToPrimitive;

function requireSymbolDefineToPrimitive () {
	if (hasRequiredSymbolDefineToPrimitive) return symbolDefineToPrimitive;
	hasRequiredSymbolDefineToPrimitive = 1;
	var call = /*@__PURE__*/ requireFunctionCall();
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();
	var defineBuiltIn = /*@__PURE__*/ requireDefineBuiltIn();

	symbolDefineToPrimitive = function () {
	  var Symbol = getBuiltIn('Symbol');
	  var SymbolPrototype = Symbol && Symbol.prototype;
	  var valueOf = SymbolPrototype && SymbolPrototype.valueOf;
	  var TO_PRIMITIVE = wellKnownSymbol('toPrimitive');

	  if (SymbolPrototype && !SymbolPrototype[TO_PRIMITIVE]) {
	    // `Symbol.prototype[@@toPrimitive]` method
	    // https://tc39.es/ecma262/#sec-symbol.prototype-@@toprimitive
	    // eslint-disable-next-line no-unused-vars -- required for .length
	    defineBuiltIn(SymbolPrototype, TO_PRIMITIVE, function (hint) {
	      return call(valueOf, this);
	    }, { arity: 1 });
	  }
	};
	return symbolDefineToPrimitive;
}

var objectToString;
var hasRequiredObjectToString;

function requireObjectToString () {
	if (hasRequiredObjectToString) return objectToString;
	hasRequiredObjectToString = 1;
	var TO_STRING_TAG_SUPPORT = /*@__PURE__*/ requireToStringTagSupport();
	var classof = /*@__PURE__*/ requireClassof();

	// `Object.prototype.toString` method implementation
	// https://tc39.es/ecma262/#sec-object.prototype.tostring
	objectToString = TO_STRING_TAG_SUPPORT ? {}.toString : function toString() {
	  return '[object ' + classof(this) + ']';
	};
	return objectToString;
}

var setToStringTag;
var hasRequiredSetToStringTag;

function requireSetToStringTag () {
	if (hasRequiredSetToStringTag) return setToStringTag;
	hasRequiredSetToStringTag = 1;
	var TO_STRING_TAG_SUPPORT = /*@__PURE__*/ requireToStringTagSupport();
	var defineProperty = /*@__PURE__*/ requireObjectDefineProperty().f;
	var createNonEnumerableProperty = /*@__PURE__*/ requireCreateNonEnumerableProperty();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var toString = /*@__PURE__*/ requireObjectToString();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	var TO_STRING_TAG = wellKnownSymbol('toStringTag');

	setToStringTag = function (it, TAG, STATIC, SET_METHOD) {
	  var target = STATIC ? it : it && it.prototype;
	  if (target) {
	    if (!hasOwn(target, TO_STRING_TAG)) {
	      defineProperty(target, TO_STRING_TAG, { configurable: true, value: TAG });
	    }
	    if (SET_METHOD && !TO_STRING_TAG_SUPPORT) {
	      createNonEnumerableProperty(target, 'toString', toString);
	    }
	  }
	};
	return setToStringTag;
}

var weakMapBasicDetection;
var hasRequiredWeakMapBasicDetection;

function requireWeakMapBasicDetection () {
	if (hasRequiredWeakMapBasicDetection) return weakMapBasicDetection;
	hasRequiredWeakMapBasicDetection = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var isCallable = /*@__PURE__*/ requireIsCallable();

	var WeakMap = globalThis.WeakMap;

	weakMapBasicDetection = isCallable(WeakMap) && /native code/.test(String(WeakMap));
	return weakMapBasicDetection;
}

var internalState;
var hasRequiredInternalState;

function requireInternalState () {
	if (hasRequiredInternalState) return internalState;
	hasRequiredInternalState = 1;
	var NATIVE_WEAK_MAP = /*@__PURE__*/ requireWeakMapBasicDetection();
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var isObject = /*@__PURE__*/ requireIsObject();
	var createNonEnumerableProperty = /*@__PURE__*/ requireCreateNonEnumerableProperty();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var shared = /*@__PURE__*/ requireSharedStore();
	var sharedKey = /*@__PURE__*/ requireSharedKey();
	var hiddenKeys = /*@__PURE__*/ requireHiddenKeys();

	var OBJECT_ALREADY_INITIALIZED = 'Object already initialized';
	var TypeError = globalThis.TypeError;
	var WeakMap = globalThis.WeakMap;
	var set, get, has;

	var enforce = function (it) {
	  return has(it) ? get(it) : set(it, {});
	};

	var getterFor = function (TYPE) {
	  return function (it) {
	    var state;
	    if (!isObject(it) || (state = get(it)).type !== TYPE) {
	      throw new TypeError('Incompatible receiver, ' + TYPE + ' required');
	    } return state;
	  };
	};

	if (NATIVE_WEAK_MAP || shared.state) {
	  var store = shared.state || (shared.state = new WeakMap());
	  /* eslint-disable no-self-assign -- prototype methods protection */
	  store.get = store.get;
	  store.has = store.has;
	  store.set = store.set;
	  /* eslint-enable no-self-assign -- prototype methods protection */
	  set = function (it, metadata) {
	    if (store.has(it)) throw new TypeError(OBJECT_ALREADY_INITIALIZED);
	    metadata.facade = it;
	    store.set(it, metadata);
	    return metadata;
	  };
	  get = function (it) {
	    return store.get(it) || {};
	  };
	  has = function (it) {
	    return store.has(it);
	  };
	} else {
	  var STATE = sharedKey('state');
	  hiddenKeys[STATE] = true;
	  set = function (it, metadata) {
	    if (hasOwn(it, STATE)) throw new TypeError(OBJECT_ALREADY_INITIALIZED);
	    metadata.facade = it;
	    createNonEnumerableProperty(it, STATE, metadata);
	    return metadata;
	  };
	  get = function (it) {
	    return hasOwn(it, STATE) ? it[STATE] : {};
	  };
	  has = function (it) {
	    return hasOwn(it, STATE);
	  };
	}

	internalState = {
	  set: set,
	  get: get,
	  has: has,
	  enforce: enforce,
	  getterFor: getterFor
	};
	return internalState;
}

var arrayIteration;
var hasRequiredArrayIteration;

function requireArrayIteration () {
	if (hasRequiredArrayIteration) return arrayIteration;
	hasRequiredArrayIteration = 1;
	var bind = /*@__PURE__*/ requireFunctionBindContext();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var IndexedObject = /*@__PURE__*/ requireIndexedObject();
	var toObject = /*@__PURE__*/ requireToObject();
	var lengthOfArrayLike = /*@__PURE__*/ requireLengthOfArrayLike();
	var arraySpeciesCreate = /*@__PURE__*/ requireArraySpeciesCreate();

	var push = uncurryThis([].push);

	// `Array.prototype.{ forEach, map, filter, some, every, find, findIndex, filterReject }` methods implementation
	var createMethod = function (TYPE) {
	  var IS_MAP = TYPE === 1;
	  var IS_FILTER = TYPE === 2;
	  var IS_SOME = TYPE === 3;
	  var IS_EVERY = TYPE === 4;
	  var IS_FIND_INDEX = TYPE === 6;
	  var IS_FILTER_REJECT = TYPE === 7;
	  var NO_HOLES = TYPE === 5 || IS_FIND_INDEX;
	  return function ($this, callbackfn, that, specificCreate) {
	    var O = toObject($this);
	    var self = IndexedObject(O);
	    var length = lengthOfArrayLike(self);
	    var boundFunction = bind(callbackfn, that);
	    var index = 0;
	    var create = specificCreate || arraySpeciesCreate;
	    var target = IS_MAP ? create($this, length) : IS_FILTER || IS_FILTER_REJECT ? create($this, 0) : undefined;
	    var value, result;
	    for (;length > index; index++) if (NO_HOLES || index in self) {
	      value = self[index];
	      result = boundFunction(value, index, O);
	      if (TYPE) {
	        if (IS_MAP) target[index] = result; // map
	        else if (result) switch (TYPE) {
	          case 3: return true;              // some
	          case 5: return value;             // find
	          case 6: return index;             // findIndex
	          case 2: push(target, value);      // filter
	        } else switch (TYPE) {
	          case 4: return false;             // every
	          case 7: push(target, value);      // filterReject
	        }
	      }
	    }
	    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
	  };
	};

	arrayIteration = {
	  // `Array.prototype.forEach` method
	  // https://tc39.es/ecma262/#sec-array.prototype.foreach
	  forEach: createMethod(0),
	  // `Array.prototype.map` method
	  // https://tc39.es/ecma262/#sec-array.prototype.map
	  map: createMethod(1),
	  // `Array.prototype.filter` method
	  // https://tc39.es/ecma262/#sec-array.prototype.filter
	  filter: createMethod(2),
	  // `Array.prototype.some` method
	  // https://tc39.es/ecma262/#sec-array.prototype.some
	  some: createMethod(3),
	  // `Array.prototype.every` method
	  // https://tc39.es/ecma262/#sec-array.prototype.every
	  every: createMethod(4),
	  // `Array.prototype.find` method
	  // https://tc39.es/ecma262/#sec-array.prototype.find
	  find: createMethod(5),
	  // `Array.prototype.findIndex` method
	  // https://tc39.es/ecma262/#sec-array.prototype.findIndex
	  findIndex: createMethod(6),
	  // `Array.prototype.filterReject` method
	  // https://github.com/tc39/proposal-array-filtering
	  filterReject: createMethod(7)
	};
	return arrayIteration;
}

var hasRequiredEs_symbol_constructor;

function requireEs_symbol_constructor () {
	if (hasRequiredEs_symbol_constructor) return es_symbol_constructor;
	hasRequiredEs_symbol_constructor = 1;
	var $ = /*@__PURE__*/ require_export();
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var call = /*@__PURE__*/ requireFunctionCall();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var IS_PURE = /*@__PURE__*/ requireIsPure();
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var NATIVE_SYMBOL = /*@__PURE__*/ requireSymbolConstructorDetection();
	var fails = /*@__PURE__*/ requireFails();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var anObject = /*@__PURE__*/ requireAnObject();
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var toPropertyKey = /*@__PURE__*/ requireToPropertyKey();
	var $toString = /*@__PURE__*/ requireToString();
	var createPropertyDescriptor = /*@__PURE__*/ requireCreatePropertyDescriptor();
	var nativeObjectCreate = /*@__PURE__*/ requireObjectCreate();
	var objectKeys = /*@__PURE__*/ requireObjectKeys();
	var getOwnPropertyNamesModule = /*@__PURE__*/ requireObjectGetOwnPropertyNames();
	var getOwnPropertyNamesExternal = /*@__PURE__*/ requireObjectGetOwnPropertyNamesExternal();
	var getOwnPropertySymbolsModule = /*@__PURE__*/ requireObjectGetOwnPropertySymbols();
	var getOwnPropertyDescriptorModule = /*@__PURE__*/ requireObjectGetOwnPropertyDescriptor();
	var definePropertyModule = /*@__PURE__*/ requireObjectDefineProperty();
	var definePropertiesModule = /*@__PURE__*/ requireObjectDefineProperties();
	var propertyIsEnumerableModule = /*@__PURE__*/ requireObjectPropertyIsEnumerable();
	var defineBuiltIn = /*@__PURE__*/ requireDefineBuiltIn();
	var defineBuiltInAccessor = /*@__PURE__*/ requireDefineBuiltInAccessor();
	var shared = /*@__PURE__*/ requireShared();
	var sharedKey = /*@__PURE__*/ requireSharedKey();
	var hiddenKeys = /*@__PURE__*/ requireHiddenKeys();
	var uid = /*@__PURE__*/ requireUid();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();
	var wrappedWellKnownSymbolModule = /*@__PURE__*/ requireWellKnownSymbolWrapped();
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();
	var defineSymbolToPrimitive = /*@__PURE__*/ requireSymbolDefineToPrimitive();
	var setToStringTag = /*@__PURE__*/ requireSetToStringTag();
	var InternalStateModule = /*@__PURE__*/ requireInternalState();
	var $forEach = /*@__PURE__*/ requireArrayIteration().forEach;

	var HIDDEN = sharedKey('hidden');
	var SYMBOL = 'Symbol';
	var PROTOTYPE = 'prototype';

	var setInternalState = InternalStateModule.set;
	var getInternalState = InternalStateModule.getterFor(SYMBOL);

	var ObjectPrototype = Object[PROTOTYPE];
	var $Symbol = globalThis.Symbol;
	var SymbolPrototype = $Symbol && $Symbol[PROTOTYPE];
	var RangeError = globalThis.RangeError;
	var TypeError = globalThis.TypeError;
	var QObject = globalThis.QObject;
	var nativeGetOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
	var nativeDefineProperty = definePropertyModule.f;
	var nativeGetOwnPropertyNames = getOwnPropertyNamesExternal.f;
	var nativePropertyIsEnumerable = propertyIsEnumerableModule.f;
	var push = uncurryThis([].push);

	var AllSymbols = shared('symbols');
	var ObjectPrototypeSymbols = shared('op-symbols');
	var WellKnownSymbolsStore = shared('wks');

	// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
	var USE_SETTER = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

	// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
	var fallbackDefineProperty = function (O, P, Attributes) {
	  var ObjectPrototypeDescriptor = nativeGetOwnPropertyDescriptor(ObjectPrototype, P);
	  if (ObjectPrototypeDescriptor) delete ObjectPrototype[P];
	  nativeDefineProperty(O, P, Attributes);
	  if (ObjectPrototypeDescriptor && O !== ObjectPrototype) {
	    nativeDefineProperty(ObjectPrototype, P, ObjectPrototypeDescriptor);
	  }
	};

	var setSymbolDescriptor = DESCRIPTORS && fails(function () {
	  return nativeObjectCreate(nativeDefineProperty({}, 'a', {
	    get: function () { return nativeDefineProperty(this, 'a', { value: 7 }).a; }
	  })).a !== 7;
	}) ? fallbackDefineProperty : nativeDefineProperty;

	var wrap = function (tag, description) {
	  var symbol = AllSymbols[tag] = nativeObjectCreate(SymbolPrototype);
	  setInternalState(symbol, {
	    type: SYMBOL,
	    tag: tag,
	    description: description
	  });
	  if (!DESCRIPTORS) symbol.description = description;
	  return symbol;
	};

	var $defineProperty = function defineProperty(O, P, Attributes) {
	  if (O === ObjectPrototype) $defineProperty(ObjectPrototypeSymbols, P, Attributes);
	  anObject(O);
	  var key = toPropertyKey(P);
	  anObject(Attributes);
	  if (hasOwn(AllSymbols, key)) {
	    if (!Attributes.enumerable) {
	      if (!hasOwn(O, HIDDEN)) nativeDefineProperty(O, HIDDEN, createPropertyDescriptor(1, nativeObjectCreate(null)));
	      O[HIDDEN][key] = true;
	    } else {
	      if (hasOwn(O, HIDDEN) && O[HIDDEN][key]) O[HIDDEN][key] = false;
	      Attributes = nativeObjectCreate(Attributes, { enumerable: createPropertyDescriptor(0, false) });
	    } return setSymbolDescriptor(O, key, Attributes);
	  } return nativeDefineProperty(O, key, Attributes);
	};

	var $defineProperties = function defineProperties(O, Properties) {
	  anObject(O);
	  var properties = toIndexedObject(Properties);
	  var keys = objectKeys(properties).concat($getOwnPropertySymbols(properties));
	  $forEach(keys, function (key) {
	    if (!DESCRIPTORS || call($propertyIsEnumerable, properties, key)) $defineProperty(O, key, properties[key]);
	  });
	  return O;
	};

	var $create = function create(O, Properties) {
	  return Properties === undefined ? nativeObjectCreate(O) : $defineProperties(nativeObjectCreate(O), Properties);
	};

	var $propertyIsEnumerable = function propertyIsEnumerable(V) {
	  var P = toPropertyKey(V);
	  var enumerable = call(nativePropertyIsEnumerable, this, P);
	  if (this === ObjectPrototype && hasOwn(AllSymbols, P) && !hasOwn(ObjectPrototypeSymbols, P)) return false;
	  return enumerable || !hasOwn(this, P) || !hasOwn(AllSymbols, P) || hasOwn(this, HIDDEN) && this[HIDDEN][P]
	    ? enumerable : true;
	};

	var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(O, P) {
	  var it = toIndexedObject(O);
	  var key = toPropertyKey(P);
	  if (it === ObjectPrototype && hasOwn(AllSymbols, key) && !hasOwn(ObjectPrototypeSymbols, key)) return;
	  var descriptor = nativeGetOwnPropertyDescriptor(it, key);
	  if (descriptor && hasOwn(AllSymbols, key) && !(hasOwn(it, HIDDEN) && it[HIDDEN][key])) {
	    descriptor.enumerable = true;
	  }
	  return descriptor;
	};

	var $getOwnPropertyNames = function getOwnPropertyNames(O) {
	  var names = nativeGetOwnPropertyNames(toIndexedObject(O));
	  var result = [];
	  $forEach(names, function (key) {
	    if (!hasOwn(AllSymbols, key) && !hasOwn(hiddenKeys, key)) push(result, key);
	  });
	  return result;
	};

	var $getOwnPropertySymbols = function (O) {
	  var IS_OBJECT_PROTOTYPE = O === ObjectPrototype;
	  var names = nativeGetOwnPropertyNames(IS_OBJECT_PROTOTYPE ? ObjectPrototypeSymbols : toIndexedObject(O));
	  var result = [];
	  $forEach(names, function (key) {
	    if (hasOwn(AllSymbols, key) && (!IS_OBJECT_PROTOTYPE || hasOwn(ObjectPrototype, key))) {
	      push(result, AllSymbols[key]);
	    }
	  });
	  return result;
	};

	// `Symbol` constructor
	// https://tc39.es/ecma262/#sec-symbol-constructor
	if (!NATIVE_SYMBOL) {
	  $Symbol = function Symbol() {
	    if (isPrototypeOf(SymbolPrototype, this)) throw new TypeError('Symbol is not a constructor');
	    var description = !arguments.length || arguments[0] === undefined ? undefined : $toString(arguments[0]);
	    var tag = uid(description);
	    var setter = function (value) {
	      var $this = this === undefined ? globalThis : this;
	      if ($this === ObjectPrototype) call(setter, ObjectPrototypeSymbols, value);
	      if (hasOwn($this, HIDDEN) && hasOwn($this[HIDDEN], tag)) $this[HIDDEN][tag] = false;
	      var descriptor = createPropertyDescriptor(1, value);
	      try {
	        setSymbolDescriptor($this, tag, descriptor);
	      } catch (error) {
	        if (!(error instanceof RangeError)) throw error;
	        fallbackDefineProperty($this, tag, descriptor);
	      }
	    };
	    if (DESCRIPTORS && USE_SETTER) setSymbolDescriptor(ObjectPrototype, tag, { configurable: true, set: setter });
	    return wrap(tag, description);
	  };

	  SymbolPrototype = $Symbol[PROTOTYPE];

	  defineBuiltIn(SymbolPrototype, 'toString', function toString() {
	    return getInternalState(this).tag;
	  });

	  defineBuiltIn($Symbol, 'withoutSetter', function (description) {
	    return wrap(uid(description), description);
	  });

	  propertyIsEnumerableModule.f = $propertyIsEnumerable;
	  definePropertyModule.f = $defineProperty;
	  definePropertiesModule.f = $defineProperties;
	  getOwnPropertyDescriptorModule.f = $getOwnPropertyDescriptor;
	  getOwnPropertyNamesModule.f = getOwnPropertyNamesExternal.f = $getOwnPropertyNames;
	  getOwnPropertySymbolsModule.f = $getOwnPropertySymbols;

	  wrappedWellKnownSymbolModule.f = function (name) {
	    return wrap(wellKnownSymbol(name), name);
	  };

	  if (DESCRIPTORS) {
	    // https://tc39.es/ecma262/#sec-symbol.prototype.description
	    defineBuiltInAccessor(SymbolPrototype, 'description', {
	      configurable: true,
	      get: function description() {
	        return getInternalState(this).description;
	      }
	    });
	    if (!IS_PURE) {
	      defineBuiltIn(ObjectPrototype, 'propertyIsEnumerable', $propertyIsEnumerable, { unsafe: true });
	    }
	  }
	}

	$({ global: true, constructor: true, wrap: true, forced: !NATIVE_SYMBOL, sham: !NATIVE_SYMBOL }, {
	  Symbol: $Symbol
	});

	$forEach(objectKeys(WellKnownSymbolsStore), function (name) {
	  defineWellKnownSymbol(name);
	});

	$({ target: SYMBOL, stat: true, forced: !NATIVE_SYMBOL }, {
	  useSetter: function () { USE_SETTER = true; },
	  useSimple: function () { USE_SETTER = false; }
	});

	$({ target: 'Object', stat: true, forced: !NATIVE_SYMBOL, sham: !DESCRIPTORS }, {
	  // `Object.create` method
	  // https://tc39.es/ecma262/#sec-object.create
	  create: $create,
	  // `Object.defineProperty` method
	  // https://tc39.es/ecma262/#sec-object.defineproperty
	  defineProperty: $defineProperty,
	  // `Object.defineProperties` method
	  // https://tc39.es/ecma262/#sec-object.defineproperties
	  defineProperties: $defineProperties,
	  // `Object.getOwnPropertyDescriptor` method
	  // https://tc39.es/ecma262/#sec-object.getownpropertydescriptors
	  getOwnPropertyDescriptor: $getOwnPropertyDescriptor
	});

	$({ target: 'Object', stat: true, forced: !NATIVE_SYMBOL }, {
	  // `Object.getOwnPropertyNames` method
	  // https://tc39.es/ecma262/#sec-object.getownpropertynames
	  getOwnPropertyNames: $getOwnPropertyNames
	});

	// `Symbol.prototype[@@toPrimitive]` method
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@toprimitive
	defineSymbolToPrimitive();

	// `Symbol.prototype[@@toStringTag]` property
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@tostringtag
	setToStringTag($Symbol, SYMBOL);

	hiddenKeys[HIDDEN] = true;
	return es_symbol_constructor;
}

var es_symbol_for = {};

var symbolRegistryDetection;
var hasRequiredSymbolRegistryDetection;

function requireSymbolRegistryDetection () {
	if (hasRequiredSymbolRegistryDetection) return symbolRegistryDetection;
	hasRequiredSymbolRegistryDetection = 1;
	var NATIVE_SYMBOL = /*@__PURE__*/ requireSymbolConstructorDetection();

	/* eslint-disable es/no-symbol -- safe */
	symbolRegistryDetection = NATIVE_SYMBOL && !!Symbol['for'] && !!Symbol.keyFor;
	return symbolRegistryDetection;
}

var hasRequiredEs_symbol_for;

function requireEs_symbol_for () {
	if (hasRequiredEs_symbol_for) return es_symbol_for;
	hasRequiredEs_symbol_for = 1;
	var $ = /*@__PURE__*/ require_export();
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var toString = /*@__PURE__*/ requireToString();
	var shared = /*@__PURE__*/ requireShared();
	var NATIVE_SYMBOL_REGISTRY = /*@__PURE__*/ requireSymbolRegistryDetection();

	var StringToSymbolRegistry = shared('string-to-symbol-registry');
	var SymbolToStringRegistry = shared('symbol-to-string-registry');

	// `Symbol.for` method
	// https://tc39.es/ecma262/#sec-symbol.for
	$({ target: 'Symbol', stat: true, forced: !NATIVE_SYMBOL_REGISTRY }, {
	  'for': function (key) {
	    var string = toString(key);
	    if (hasOwn(StringToSymbolRegistry, string)) return StringToSymbolRegistry[string];
	    var symbol = getBuiltIn('Symbol')(string);
	    StringToSymbolRegistry[string] = symbol;
	    SymbolToStringRegistry[symbol] = string;
	    return symbol;
	  }
	});
	return es_symbol_for;
}

var es_symbol_keyFor = {};

var hasRequiredEs_symbol_keyFor;

function requireEs_symbol_keyFor () {
	if (hasRequiredEs_symbol_keyFor) return es_symbol_keyFor;
	hasRequiredEs_symbol_keyFor = 1;
	var $ = /*@__PURE__*/ require_export();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var isSymbol = /*@__PURE__*/ requireIsSymbol();
	var tryToString = /*@__PURE__*/ requireTryToString();
	var shared = /*@__PURE__*/ requireShared();
	var NATIVE_SYMBOL_REGISTRY = /*@__PURE__*/ requireSymbolRegistryDetection();

	var SymbolToStringRegistry = shared('symbol-to-string-registry');

	// `Symbol.keyFor` method
	// https://tc39.es/ecma262/#sec-symbol.keyfor
	$({ target: 'Symbol', stat: true, forced: !NATIVE_SYMBOL_REGISTRY }, {
	  keyFor: function keyFor(sym) {
	    if (!isSymbol(sym)) throw new TypeError(tryToString(sym) + ' is not a symbol');
	    if (hasOwn(SymbolToStringRegistry, sym)) return SymbolToStringRegistry[sym];
	  }
	});
	return es_symbol_keyFor;
}

var es_json_stringify = {};

var getJsonReplacerFunction;
var hasRequiredGetJsonReplacerFunction;

function requireGetJsonReplacerFunction () {
	if (hasRequiredGetJsonReplacerFunction) return getJsonReplacerFunction;
	hasRequiredGetJsonReplacerFunction = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var isArray = /*@__PURE__*/ requireIsArray$3();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var classof = /*@__PURE__*/ requireClassofRaw();
	var toString = /*@__PURE__*/ requireToString();

	var push = uncurryThis([].push);

	getJsonReplacerFunction = function (replacer) {
	  if (isCallable(replacer)) return replacer;
	  if (!isArray(replacer)) return;
	  var rawLength = replacer.length;
	  var keys = [];
	  for (var i = 0; i < rawLength; i++) {
	    var element = replacer[i];
	    if (typeof element == 'string') push(keys, element);
	    else if (typeof element == 'number' || classof(element) === 'Number' || classof(element) === 'String') push(keys, toString(element));
	  }
	  var keysLength = keys.length;
	  var root = true;
	  return function (key, value) {
	    if (root) {
	      root = false;
	      return value;
	    }
	    if (isArray(this)) return value;
	    for (var j = 0; j < keysLength; j++) if (keys[j] === key) return value;
	  };
	};
	return getJsonReplacerFunction;
}

var hasRequiredEs_json_stringify;

function requireEs_json_stringify () {
	if (hasRequiredEs_json_stringify) return es_json_stringify;
	hasRequiredEs_json_stringify = 1;
	var $ = /*@__PURE__*/ require_export();
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();
	var apply = /*@__PURE__*/ requireFunctionApply();
	var call = /*@__PURE__*/ requireFunctionCall();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var fails = /*@__PURE__*/ requireFails();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var isSymbol = /*@__PURE__*/ requireIsSymbol();
	var arraySlice = /*@__PURE__*/ requireArraySlice();
	var getReplacerFunction = /*@__PURE__*/ requireGetJsonReplacerFunction();
	var NATIVE_SYMBOL = /*@__PURE__*/ requireSymbolConstructorDetection();

	var $String = String;
	var $stringify = getBuiltIn('JSON', 'stringify');
	var exec = uncurryThis(/./.exec);
	var charAt = uncurryThis(''.charAt);
	var charCodeAt = uncurryThis(''.charCodeAt);
	var replace = uncurryThis(''.replace);
	var numberToString = uncurryThis(1.1.toString);

	var tester = /[\uD800-\uDFFF]/g;
	var low = /^[\uD800-\uDBFF]$/;
	var hi = /^[\uDC00-\uDFFF]$/;

	var WRONG_SYMBOLS_CONVERSION = !NATIVE_SYMBOL || fails(function () {
	  var symbol = getBuiltIn('Symbol')('stringify detection');
	  // MS Edge converts symbol values to JSON as {}
	  return $stringify([symbol]) !== '[null]'
	    // WebKit converts symbol values to JSON as null
	    || $stringify({ a: symbol }) !== '{}'
	    // V8 throws on boxed symbols
	    || $stringify(Object(symbol)) !== '{}';
	});

	// https://github.com/tc39/proposal-well-formed-stringify
	var ILL_FORMED_UNICODE = fails(function () {
	  return $stringify('\uDF06\uD834') !== '"\\udf06\\ud834"'
	    || $stringify('\uDEAD') !== '"\\udead"';
	});

	var stringifyWithSymbolsFix = function (it, replacer) {
	  var args = arraySlice(arguments);
	  var $replacer = getReplacerFunction(replacer);
	  if (!isCallable($replacer) && (it === undefined || isSymbol(it))) return; // IE8 returns string on undefined
	  args[1] = function (key, value) {
	    // some old implementations (like WebKit) could pass numbers as keys
	    if (isCallable($replacer)) value = call($replacer, this, $String(key), value);
	    if (!isSymbol(value)) return value;
	  };
	  return apply($stringify, null, args);
	};

	var fixIllFormed = function (match, offset, string) {
	  var prev = charAt(string, offset - 1);
	  var next = charAt(string, offset + 1);
	  if ((exec(low, match) && !exec(hi, next)) || (exec(hi, match) && !exec(low, prev))) {
	    return '\\u' + numberToString(charCodeAt(match, 0), 16);
	  } return match;
	};

	if ($stringify) {
	  // `JSON.stringify` method
	  // https://tc39.es/ecma262/#sec-json.stringify
	  $({ target: 'JSON', stat: true, arity: 3, forced: WRONG_SYMBOLS_CONVERSION || ILL_FORMED_UNICODE }, {
	    // eslint-disable-next-line no-unused-vars -- required for `.length`
	    stringify: function stringify(it, replacer, space) {
	      var args = arraySlice(arguments);
	      var result = apply(WRONG_SYMBOLS_CONVERSION ? stringifyWithSymbolsFix : $stringify, null, args);
	      return ILL_FORMED_UNICODE && typeof result == 'string' ? replace(result, tester, fixIllFormed) : result;
	    }
	  });
	}
	return es_json_stringify;
}

var es_object_getOwnPropertySymbols = {};

var hasRequiredEs_object_getOwnPropertySymbols;

function requireEs_object_getOwnPropertySymbols () {
	if (hasRequiredEs_object_getOwnPropertySymbols) return es_object_getOwnPropertySymbols;
	hasRequiredEs_object_getOwnPropertySymbols = 1;
	var $ = /*@__PURE__*/ require_export();
	var NATIVE_SYMBOL = /*@__PURE__*/ requireSymbolConstructorDetection();
	var fails = /*@__PURE__*/ requireFails();
	var getOwnPropertySymbolsModule = /*@__PURE__*/ requireObjectGetOwnPropertySymbols();
	var toObject = /*@__PURE__*/ requireToObject();

	// V8 ~ Chrome 38 and 39 `Object.getOwnPropertySymbols` fails on primitives
	// https://bugs.chromium.org/p/v8/issues/detail?id=3443
	var FORCED = !NATIVE_SYMBOL || fails(function () { getOwnPropertySymbolsModule.f(1); });

	// `Object.getOwnPropertySymbols` method
	// https://tc39.es/ecma262/#sec-object.getownpropertysymbols
	$({ target: 'Object', stat: true, forced: FORCED }, {
	  getOwnPropertySymbols: function getOwnPropertySymbols(it) {
	    var $getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
	    return $getOwnPropertySymbols ? $getOwnPropertySymbols(toObject(it)) : [];
	  }
	});
	return es_object_getOwnPropertySymbols;
}

var hasRequiredEs_symbol;

function requireEs_symbol () {
	if (hasRequiredEs_symbol) return es_symbol;
	hasRequiredEs_symbol = 1;
	// TODO: Remove this module from `core-js@4` since it's split to modules listed below
	requireEs_symbol_constructor();
	requireEs_symbol_for();
	requireEs_symbol_keyFor();
	requireEs_json_stringify();
	requireEs_object_getOwnPropertySymbols();
	return es_symbol;
}

var es_symbol_asyncDispose = {};

var hasRequiredEs_symbol_asyncDispose;

function requireEs_symbol_asyncDispose () {
	if (hasRequiredEs_symbol_asyncDispose) return es_symbol_asyncDispose;
	hasRequiredEs_symbol_asyncDispose = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.asyncDispose` well-known symbol
	// https://github.com/tc39/proposal-async-explicit-resource-management
	defineWellKnownSymbol('asyncDispose');
	return es_symbol_asyncDispose;
}

var es_symbol_asyncIterator = {};

var hasRequiredEs_symbol_asyncIterator;

function requireEs_symbol_asyncIterator () {
	if (hasRequiredEs_symbol_asyncIterator) return es_symbol_asyncIterator;
	hasRequiredEs_symbol_asyncIterator = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.asyncIterator` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.asynciterator
	defineWellKnownSymbol('asyncIterator');
	return es_symbol_asyncIterator;
}

var es_symbol_dispose = {};

var hasRequiredEs_symbol_dispose;

function requireEs_symbol_dispose () {
	if (hasRequiredEs_symbol_dispose) return es_symbol_dispose;
	hasRequiredEs_symbol_dispose = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.dispose` well-known symbol
	// https://github.com/tc39/proposal-explicit-resource-management
	defineWellKnownSymbol('dispose');
	return es_symbol_dispose;
}

var es_symbol_hasInstance = {};

var hasRequiredEs_symbol_hasInstance;

function requireEs_symbol_hasInstance () {
	if (hasRequiredEs_symbol_hasInstance) return es_symbol_hasInstance;
	hasRequiredEs_symbol_hasInstance = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.hasInstance` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.hasinstance
	defineWellKnownSymbol('hasInstance');
	return es_symbol_hasInstance;
}

var es_symbol_isConcatSpreadable = {};

var hasRequiredEs_symbol_isConcatSpreadable;

function requireEs_symbol_isConcatSpreadable () {
	if (hasRequiredEs_symbol_isConcatSpreadable) return es_symbol_isConcatSpreadable;
	hasRequiredEs_symbol_isConcatSpreadable = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.isConcatSpreadable` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.isconcatspreadable
	defineWellKnownSymbol('isConcatSpreadable');
	return es_symbol_isConcatSpreadable;
}

var es_symbol_iterator = {};

var hasRequiredEs_symbol_iterator;

function requireEs_symbol_iterator () {
	if (hasRequiredEs_symbol_iterator) return es_symbol_iterator;
	hasRequiredEs_symbol_iterator = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.iterator` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.iterator
	defineWellKnownSymbol('iterator');
	return es_symbol_iterator;
}

var es_symbol_match = {};

var hasRequiredEs_symbol_match;

function requireEs_symbol_match () {
	if (hasRequiredEs_symbol_match) return es_symbol_match;
	hasRequiredEs_symbol_match = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.match` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.match
	defineWellKnownSymbol('match');
	return es_symbol_match;
}

var es_symbol_matchAll = {};

var hasRequiredEs_symbol_matchAll;

function requireEs_symbol_matchAll () {
	if (hasRequiredEs_symbol_matchAll) return es_symbol_matchAll;
	hasRequiredEs_symbol_matchAll = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.matchAll` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.matchall
	defineWellKnownSymbol('matchAll');
	return es_symbol_matchAll;
}

var es_symbol_replace = {};

var hasRequiredEs_symbol_replace;

function requireEs_symbol_replace () {
	if (hasRequiredEs_symbol_replace) return es_symbol_replace;
	hasRequiredEs_symbol_replace = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.replace` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.replace
	defineWellKnownSymbol('replace');
	return es_symbol_replace;
}

var es_symbol_search = {};

var hasRequiredEs_symbol_search;

function requireEs_symbol_search () {
	if (hasRequiredEs_symbol_search) return es_symbol_search;
	hasRequiredEs_symbol_search = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.search` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.search
	defineWellKnownSymbol('search');
	return es_symbol_search;
}

var es_symbol_species = {};

var hasRequiredEs_symbol_species;

function requireEs_symbol_species () {
	if (hasRequiredEs_symbol_species) return es_symbol_species;
	hasRequiredEs_symbol_species = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.species` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.species
	defineWellKnownSymbol('species');
	return es_symbol_species;
}

var es_symbol_split = {};

var hasRequiredEs_symbol_split;

function requireEs_symbol_split () {
	if (hasRequiredEs_symbol_split) return es_symbol_split;
	hasRequiredEs_symbol_split = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.split` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.split
	defineWellKnownSymbol('split');
	return es_symbol_split;
}

var es_symbol_toPrimitive = {};

var hasRequiredEs_symbol_toPrimitive;

function requireEs_symbol_toPrimitive () {
	if (hasRequiredEs_symbol_toPrimitive) return es_symbol_toPrimitive;
	hasRequiredEs_symbol_toPrimitive = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();
	var defineSymbolToPrimitive = /*@__PURE__*/ requireSymbolDefineToPrimitive();

	// `Symbol.toPrimitive` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.toprimitive
	defineWellKnownSymbol('toPrimitive');

	// `Symbol.prototype[@@toPrimitive]` method
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@toprimitive
	defineSymbolToPrimitive();
	return es_symbol_toPrimitive;
}

var es_symbol_toStringTag = {};

var hasRequiredEs_symbol_toStringTag;

function requireEs_symbol_toStringTag () {
	if (hasRequiredEs_symbol_toStringTag) return es_symbol_toStringTag;
	hasRequiredEs_symbol_toStringTag = 1;
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();
	var setToStringTag = /*@__PURE__*/ requireSetToStringTag();

	// `Symbol.toStringTag` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.tostringtag
	defineWellKnownSymbol('toStringTag');

	// `Symbol.prototype[@@toStringTag]` property
	// https://tc39.es/ecma262/#sec-symbol.prototype-@@tostringtag
	setToStringTag(getBuiltIn('Symbol'), 'Symbol');
	return es_symbol_toStringTag;
}

var es_symbol_unscopables = {};

var hasRequiredEs_symbol_unscopables;

function requireEs_symbol_unscopables () {
	if (hasRequiredEs_symbol_unscopables) return es_symbol_unscopables;
	hasRequiredEs_symbol_unscopables = 1;
	var defineWellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbolDefine();

	// `Symbol.unscopables` well-known symbol
	// https://tc39.es/ecma262/#sec-symbol.unscopables
	defineWellKnownSymbol('unscopables');
	return es_symbol_unscopables;
}

var es_json_toStringTag = {};

var hasRequiredEs_json_toStringTag;

function requireEs_json_toStringTag () {
	if (hasRequiredEs_json_toStringTag) return es_json_toStringTag;
	hasRequiredEs_json_toStringTag = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var setToStringTag = /*@__PURE__*/ requireSetToStringTag();

	// JSON[@@toStringTag] property
	// https://tc39.es/ecma262/#sec-json-@@tostringtag
	setToStringTag(globalThis.JSON, 'JSON', true);
	return es_json_toStringTag;
}

var symbol$2;
var hasRequiredSymbol$2;

function requireSymbol$2 () {
	if (hasRequiredSymbol$2) return symbol$2;
	hasRequiredSymbol$2 = 1;
	requireEs_array_concat();
	requireEs_symbol();
	requireEs_symbol_asyncDispose();
	requireEs_symbol_asyncIterator();
	requireEs_symbol_dispose();
	requireEs_symbol_hasInstance();
	requireEs_symbol_isConcatSpreadable();
	requireEs_symbol_iterator();
	requireEs_symbol_match();
	requireEs_symbol_matchAll();
	requireEs_symbol_replace();
	requireEs_symbol_search();
	requireEs_symbol_species();
	requireEs_symbol_split();
	requireEs_symbol_toPrimitive();
	requireEs_symbol_toStringTag();
	requireEs_symbol_unscopables();
	requireEs_json_toStringTag();
	var path = /*@__PURE__*/ requirePath();

	symbol$2 = path.Symbol;
	return symbol$2;
}

var web_domCollections_iterator = {};

var addToUnscopables;
var hasRequiredAddToUnscopables;

function requireAddToUnscopables () {
	if (hasRequiredAddToUnscopables) return addToUnscopables;
	hasRequiredAddToUnscopables = 1;
	addToUnscopables = function () { /* empty */ };
	return addToUnscopables;
}

var iterators;
var hasRequiredIterators;

function requireIterators () {
	if (hasRequiredIterators) return iterators;
	hasRequiredIterators = 1;
	iterators = {};
	return iterators;
}

var functionName;
var hasRequiredFunctionName;

function requireFunctionName () {
	if (hasRequiredFunctionName) return functionName;
	hasRequiredFunctionName = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();

	var FunctionPrototype = Function.prototype;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getDescriptor = DESCRIPTORS && Object.getOwnPropertyDescriptor;

	var EXISTS = hasOwn(FunctionPrototype, 'name');
	// additional protection from minified / mangled / dropped function names
	var PROPER = EXISTS && (function something() { /* empty */ }).name === 'something';
	var CONFIGURABLE = EXISTS && (!DESCRIPTORS || (DESCRIPTORS && getDescriptor(FunctionPrototype, 'name').configurable));

	functionName = {
	  EXISTS: EXISTS,
	  PROPER: PROPER,
	  CONFIGURABLE: CONFIGURABLE
	};
	return functionName;
}

var correctPrototypeGetter;
var hasRequiredCorrectPrototypeGetter;

function requireCorrectPrototypeGetter () {
	if (hasRequiredCorrectPrototypeGetter) return correctPrototypeGetter;
	hasRequiredCorrectPrototypeGetter = 1;
	var fails = /*@__PURE__*/ requireFails();

	correctPrototypeGetter = !fails(function () {
	  function F() { /* empty */ }
	  F.prototype.constructor = null;
	  // eslint-disable-next-line es/no-object-getprototypeof -- required for testing
	  return Object.getPrototypeOf(new F()) !== F.prototype;
	});
	return correctPrototypeGetter;
}

var objectGetPrototypeOf;
var hasRequiredObjectGetPrototypeOf;

function requireObjectGetPrototypeOf () {
	if (hasRequiredObjectGetPrototypeOf) return objectGetPrototypeOf;
	hasRequiredObjectGetPrototypeOf = 1;
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var toObject = /*@__PURE__*/ requireToObject();
	var sharedKey = /*@__PURE__*/ requireSharedKey();
	var CORRECT_PROTOTYPE_GETTER = /*@__PURE__*/ requireCorrectPrototypeGetter();

	var IE_PROTO = sharedKey('IE_PROTO');
	var $Object = Object;
	var ObjectPrototype = $Object.prototype;

	// `Object.getPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.getprototypeof
	// eslint-disable-next-line es/no-object-getprototypeof -- safe
	objectGetPrototypeOf = CORRECT_PROTOTYPE_GETTER ? $Object.getPrototypeOf : function (O) {
	  var object = toObject(O);
	  if (hasOwn(object, IE_PROTO)) return object[IE_PROTO];
	  var constructor = object.constructor;
	  if (isCallable(constructor) && object instanceof constructor) {
	    return constructor.prototype;
	  } return object instanceof $Object ? ObjectPrototype : null;
	};
	return objectGetPrototypeOf;
}

var iteratorsCore;
var hasRequiredIteratorsCore;

function requireIteratorsCore () {
	if (hasRequiredIteratorsCore) return iteratorsCore;
	hasRequiredIteratorsCore = 1;
	var fails = /*@__PURE__*/ requireFails();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var isObject = /*@__PURE__*/ requireIsObject();
	var create = /*@__PURE__*/ requireObjectCreate();
	var getPrototypeOf = /*@__PURE__*/ requireObjectGetPrototypeOf();
	var defineBuiltIn = /*@__PURE__*/ requireDefineBuiltIn();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();
	var IS_PURE = /*@__PURE__*/ requireIsPure();

	var ITERATOR = wellKnownSymbol('iterator');
	var BUGGY_SAFARI_ITERATORS = false;

	// `%IteratorPrototype%` object
	// https://tc39.es/ecma262/#sec-%iteratorprototype%-object
	var IteratorPrototype, PrototypeOfArrayIteratorPrototype, arrayIterator;

	/* eslint-disable es/no-array-prototype-keys -- safe */
	if ([].keys) {
	  arrayIterator = [].keys();
	  // Safari 8 has buggy iterators w/o `next`
	  if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS = true;
	  else {
	    PrototypeOfArrayIteratorPrototype = getPrototypeOf(getPrototypeOf(arrayIterator));
	    if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype = PrototypeOfArrayIteratorPrototype;
	  }
	}

	var NEW_ITERATOR_PROTOTYPE = !isObject(IteratorPrototype) || fails(function () {
	  var test = {};
	  // FF44- legacy iterators case
	  return IteratorPrototype[ITERATOR].call(test) !== test;
	});

	if (NEW_ITERATOR_PROTOTYPE) IteratorPrototype = {};
	else if (IS_PURE) IteratorPrototype = create(IteratorPrototype);

	// `%IteratorPrototype%[@@iterator]()` method
	// https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
	if (!isCallable(IteratorPrototype[ITERATOR])) {
	  defineBuiltIn(IteratorPrototype, ITERATOR, function () {
	    return this;
	  });
	}

	iteratorsCore = {
	  IteratorPrototype: IteratorPrototype,
	  BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS
	};
	return iteratorsCore;
}

var iteratorCreateConstructor;
var hasRequiredIteratorCreateConstructor;

function requireIteratorCreateConstructor () {
	if (hasRequiredIteratorCreateConstructor) return iteratorCreateConstructor;
	hasRequiredIteratorCreateConstructor = 1;
	var IteratorPrototype = /*@__PURE__*/ requireIteratorsCore().IteratorPrototype;
	var create = /*@__PURE__*/ requireObjectCreate();
	var createPropertyDescriptor = /*@__PURE__*/ requireCreatePropertyDescriptor();
	var setToStringTag = /*@__PURE__*/ requireSetToStringTag();
	var Iterators = /*@__PURE__*/ requireIterators();

	var returnThis = function () { return this; };

	iteratorCreateConstructor = function (IteratorConstructor, NAME, next, ENUMERABLE_NEXT) {
	  var TO_STRING_TAG = NAME + ' Iterator';
	  IteratorConstructor.prototype = create(IteratorPrototype, { next: createPropertyDescriptor(+!ENUMERABLE_NEXT, next) });
	  setToStringTag(IteratorConstructor, TO_STRING_TAG, false, true);
	  Iterators[TO_STRING_TAG] = returnThis;
	  return IteratorConstructor;
	};
	return iteratorCreateConstructor;
}

var functionUncurryThisAccessor;
var hasRequiredFunctionUncurryThisAccessor;

function requireFunctionUncurryThisAccessor () {
	if (hasRequiredFunctionUncurryThisAccessor) return functionUncurryThisAccessor;
	hasRequiredFunctionUncurryThisAccessor = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var aCallable = /*@__PURE__*/ requireACallable();

	functionUncurryThisAccessor = function (object, key, method) {
	  try {
	    // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	    return uncurryThis(aCallable(Object.getOwnPropertyDescriptor(object, key)[method]));
	  } catch (error) { /* empty */ }
	};
	return functionUncurryThisAccessor;
}

var isPossiblePrototype;
var hasRequiredIsPossiblePrototype;

function requireIsPossiblePrototype () {
	if (hasRequiredIsPossiblePrototype) return isPossiblePrototype;
	hasRequiredIsPossiblePrototype = 1;
	var isObject = /*@__PURE__*/ requireIsObject();

	isPossiblePrototype = function (argument) {
	  return isObject(argument) || argument === null;
	};
	return isPossiblePrototype;
}

var aPossiblePrototype;
var hasRequiredAPossiblePrototype;

function requireAPossiblePrototype () {
	if (hasRequiredAPossiblePrototype) return aPossiblePrototype;
	hasRequiredAPossiblePrototype = 1;
	var isPossiblePrototype = /*@__PURE__*/ requireIsPossiblePrototype();

	var $String = String;
	var $TypeError = TypeError;

	aPossiblePrototype = function (argument) {
	  if (isPossiblePrototype(argument)) return argument;
	  throw new $TypeError("Can't set " + $String(argument) + ' as a prototype');
	};
	return aPossiblePrototype;
}

var objectSetPrototypeOf;
var hasRequiredObjectSetPrototypeOf;

function requireObjectSetPrototypeOf () {
	if (hasRequiredObjectSetPrototypeOf) return objectSetPrototypeOf;
	hasRequiredObjectSetPrototypeOf = 1;
	/* eslint-disable no-proto -- safe */
	var uncurryThisAccessor = /*@__PURE__*/ requireFunctionUncurryThisAccessor();
	var isObject = /*@__PURE__*/ requireIsObject();
	var requireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();
	var aPossiblePrototype = /*@__PURE__*/ requireAPossiblePrototype();

	// `Object.setPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.setprototypeof
	// Works with __proto__ only. Old v8 can't work with null proto objects.
	// eslint-disable-next-line es/no-object-setprototypeof -- safe
	objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
	  var CORRECT_SETTER = false;
	  var test = {};
	  var setter;
	  try {
	    setter = uncurryThisAccessor(Object.prototype, '__proto__', 'set');
	    setter(test, []);
	    CORRECT_SETTER = test instanceof Array;
	  } catch (error) { /* empty */ }
	  return function setPrototypeOf(O, proto) {
	    requireObjectCoercible(O);
	    aPossiblePrototype(proto);
	    if (!isObject(O)) return O;
	    if (CORRECT_SETTER) setter(O, proto);
	    else O.__proto__ = proto;
	    return O;
	  };
	}() : undefined);
	return objectSetPrototypeOf;
}

var iteratorDefine;
var hasRequiredIteratorDefine;

function requireIteratorDefine () {
	if (hasRequiredIteratorDefine) return iteratorDefine;
	hasRequiredIteratorDefine = 1;
	var $ = /*@__PURE__*/ require_export();
	var call = /*@__PURE__*/ requireFunctionCall();
	var IS_PURE = /*@__PURE__*/ requireIsPure();
	var FunctionName = /*@__PURE__*/ requireFunctionName();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var createIteratorConstructor = /*@__PURE__*/ requireIteratorCreateConstructor();
	var getPrototypeOf = /*@__PURE__*/ requireObjectGetPrototypeOf();
	var setPrototypeOf = /*@__PURE__*/ requireObjectSetPrototypeOf();
	var setToStringTag = /*@__PURE__*/ requireSetToStringTag();
	var createNonEnumerableProperty = /*@__PURE__*/ requireCreateNonEnumerableProperty();
	var defineBuiltIn = /*@__PURE__*/ requireDefineBuiltIn();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();
	var Iterators = /*@__PURE__*/ requireIterators();
	var IteratorsCore = /*@__PURE__*/ requireIteratorsCore();

	var PROPER_FUNCTION_NAME = FunctionName.PROPER;
	var CONFIGURABLE_FUNCTION_NAME = FunctionName.CONFIGURABLE;
	var IteratorPrototype = IteratorsCore.IteratorPrototype;
	var BUGGY_SAFARI_ITERATORS = IteratorsCore.BUGGY_SAFARI_ITERATORS;
	var ITERATOR = wellKnownSymbol('iterator');
	var KEYS = 'keys';
	var VALUES = 'values';
	var ENTRIES = 'entries';

	var returnThis = function () { return this; };

	iteratorDefine = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
	  createIteratorConstructor(IteratorConstructor, NAME, next);

	  var getIterationMethod = function (KIND) {
	    if (KIND === DEFAULT && defaultIterator) return defaultIterator;
	    if (!BUGGY_SAFARI_ITERATORS && KIND && KIND in IterablePrototype) return IterablePrototype[KIND];

	    switch (KIND) {
	      case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
	      case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
	      case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
	    }

	    return function () { return new IteratorConstructor(this); };
	  };

	  var TO_STRING_TAG = NAME + ' Iterator';
	  var INCORRECT_VALUES_NAME = false;
	  var IterablePrototype = Iterable.prototype;
	  var nativeIterator = IterablePrototype[ITERATOR]
	    || IterablePrototype['@@iterator']
	    || DEFAULT && IterablePrototype[DEFAULT];
	  var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
	  var anyNativeIterator = NAME === 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
	  var CurrentIteratorPrototype, methods, KEY;

	  // fix native
	  if (anyNativeIterator) {
	    CurrentIteratorPrototype = getPrototypeOf(anyNativeIterator.call(new Iterable()));
	    if (CurrentIteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
	      if (!IS_PURE && getPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype) {
	        if (setPrototypeOf) {
	          setPrototypeOf(CurrentIteratorPrototype, IteratorPrototype);
	        } else if (!isCallable(CurrentIteratorPrototype[ITERATOR])) {
	          defineBuiltIn(CurrentIteratorPrototype, ITERATOR, returnThis);
	        }
	      }
	      // Set @@toStringTag to native iterators
	      setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true, true);
	      if (IS_PURE) Iterators[TO_STRING_TAG] = returnThis;
	    }
	  }

	  // fix Array.prototype.{ values, @@iterator }.name in V8 / FF
	  if (PROPER_FUNCTION_NAME && DEFAULT === VALUES && nativeIterator && nativeIterator.name !== VALUES) {
	    if (!IS_PURE && CONFIGURABLE_FUNCTION_NAME) {
	      createNonEnumerableProperty(IterablePrototype, 'name', VALUES);
	    } else {
	      INCORRECT_VALUES_NAME = true;
	      defaultIterator = function values() { return call(nativeIterator, this); };
	    }
	  }

	  // export additional methods
	  if (DEFAULT) {
	    methods = {
	      values: getIterationMethod(VALUES),
	      keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
	      entries: getIterationMethod(ENTRIES)
	    };
	    if (FORCED) for (KEY in methods) {
	      if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
	        defineBuiltIn(IterablePrototype, KEY, methods[KEY]);
	      }
	    } else $({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME }, methods);
	  }

	  // define iterator
	  if ((!IS_PURE || FORCED) && IterablePrototype[ITERATOR] !== defaultIterator) {
	    defineBuiltIn(IterablePrototype, ITERATOR, defaultIterator, { name: DEFAULT });
	  }
	  Iterators[NAME] = defaultIterator;

	  return methods;
	};
	return iteratorDefine;
}

var createIterResultObject;
var hasRequiredCreateIterResultObject;

function requireCreateIterResultObject () {
	if (hasRequiredCreateIterResultObject) return createIterResultObject;
	hasRequiredCreateIterResultObject = 1;
	// `CreateIterResultObject` abstract operation
	// https://tc39.es/ecma262/#sec-createiterresultobject
	createIterResultObject = function (value, done) {
	  return { value: value, done: done };
	};
	return createIterResultObject;
}

var es_array_iterator;
var hasRequiredEs_array_iterator;

function requireEs_array_iterator () {
	if (hasRequiredEs_array_iterator) return es_array_iterator;
	hasRequiredEs_array_iterator = 1;
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var addToUnscopables = /*@__PURE__*/ requireAddToUnscopables();
	var Iterators = /*@__PURE__*/ requireIterators();
	var InternalStateModule = /*@__PURE__*/ requireInternalState();
	var defineProperty = /*@__PURE__*/ requireObjectDefineProperty().f;
	var defineIterator = /*@__PURE__*/ requireIteratorDefine();
	var createIterResultObject = /*@__PURE__*/ requireCreateIterResultObject();
	var IS_PURE = /*@__PURE__*/ requireIsPure();
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();

	var ARRAY_ITERATOR = 'Array Iterator';
	var setInternalState = InternalStateModule.set;
	var getInternalState = InternalStateModule.getterFor(ARRAY_ITERATOR);

	// `Array.prototype.entries` method
	// https://tc39.es/ecma262/#sec-array.prototype.entries
	// `Array.prototype.keys` method
	// https://tc39.es/ecma262/#sec-array.prototype.keys
	// `Array.prototype.values` method
	// https://tc39.es/ecma262/#sec-array.prototype.values
	// `Array.prototype[@@iterator]` method
	// https://tc39.es/ecma262/#sec-array.prototype-@@iterator
	// `CreateArrayIterator` internal method
	// https://tc39.es/ecma262/#sec-createarrayiterator
	es_array_iterator = defineIterator(Array, 'Array', function (iterated, kind) {
	  setInternalState(this, {
	    type: ARRAY_ITERATOR,
	    target: toIndexedObject(iterated), // target
	    index: 0,                          // next index
	    kind: kind                         // kind
	  });
	// `%ArrayIteratorPrototype%.next` method
	// https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next
	}, function () {
	  var state = getInternalState(this);
	  var target = state.target;
	  var index = state.index++;
	  if (!target || index >= target.length) {
	    state.target = null;
	    return createIterResultObject(undefined, true);
	  }
	  switch (state.kind) {
	    case 'keys': return createIterResultObject(index, false);
	    case 'values': return createIterResultObject(target[index], false);
	  } return createIterResultObject([index, target[index]], false);
	}, 'values');

	// argumentsList[@@iterator] is %ArrayProto_values%
	// https://tc39.es/ecma262/#sec-createunmappedargumentsobject
	// https://tc39.es/ecma262/#sec-createmappedargumentsobject
	var values = Iterators.Arguments = Iterators.Array;

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables('keys');
	addToUnscopables('values');
	addToUnscopables('entries');

	// V8 ~ Chrome 45- bug
	if (!IS_PURE && DESCRIPTORS && values.name !== 'values') try {
	  defineProperty(values, 'name', { value: 'values' });
	} catch (error) { /* empty */ }
	return es_array_iterator;
}

var domIterables;
var hasRequiredDomIterables;

function requireDomIterables () {
	if (hasRequiredDomIterables) return domIterables;
	hasRequiredDomIterables = 1;
	// iterable DOM collections
	// flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
	domIterables = {
	  CSSRuleList: 0,
	  CSSStyleDeclaration: 0,
	  CSSValueList: 0,
	  ClientRectList: 0,
	  DOMRectList: 0,
	  DOMStringList: 0,
	  DOMTokenList: 1,
	  DataTransferItemList: 0,
	  FileList: 0,
	  HTMLAllCollection: 0,
	  HTMLCollection: 0,
	  HTMLFormElement: 0,
	  HTMLSelectElement: 0,
	  MediaList: 0,
	  MimeTypeArray: 0,
	  NamedNodeMap: 0,
	  NodeList: 1,
	  PaintRequestList: 0,
	  Plugin: 0,
	  PluginArray: 0,
	  SVGLengthList: 0,
	  SVGNumberList: 0,
	  SVGPathSegList: 0,
	  SVGPointList: 0,
	  SVGStringList: 0,
	  SVGTransformList: 0,
	  SourceBufferList: 0,
	  StyleSheetList: 0,
	  TextTrackCueList: 0,
	  TextTrackList: 0,
	  TouchList: 0
	};
	return domIterables;
}

var hasRequiredWeb_domCollections_iterator;

function requireWeb_domCollections_iterator () {
	if (hasRequiredWeb_domCollections_iterator) return web_domCollections_iterator;
	hasRequiredWeb_domCollections_iterator = 1;
	requireEs_array_iterator();
	var DOMIterables = /*@__PURE__*/ requireDomIterables();
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var setToStringTag = /*@__PURE__*/ requireSetToStringTag();
	var Iterators = /*@__PURE__*/ requireIterators();

	for (var COLLECTION_NAME in DOMIterables) {
	  setToStringTag(globalThis[COLLECTION_NAME], COLLECTION_NAME);
	  Iterators[COLLECTION_NAME] = Iterators.Array;
	}
	return web_domCollections_iterator;
}

var symbol$1;
var hasRequiredSymbol$1;

function requireSymbol$1 () {
	if (hasRequiredSymbol$1) return symbol$1;
	hasRequiredSymbol$1 = 1;
	var parent = /*@__PURE__*/ requireSymbol$2();
	requireWeb_domCollections_iterator();

	symbol$1 = parent;
	return symbol$1;
}

var symbol;
var hasRequiredSymbol;

function requireSymbol () {
	if (hasRequiredSymbol) return symbol;
	hasRequiredSymbol = 1;
	symbol = /*@__PURE__*/ requireSymbol$1();
	return symbol;
}

var symbolExports = requireSymbol();
var _Symbol = /*@__PURE__*/getDefaultExportFromCjs(symbolExports);

var es_array_slice = {};

var hasRequiredEs_array_slice;

function requireEs_array_slice () {
	if (hasRequiredEs_array_slice) return es_array_slice;
	hasRequiredEs_array_slice = 1;
	var $ = /*@__PURE__*/ require_export();
	var isArray = /*@__PURE__*/ requireIsArray$3();
	var isConstructor = /*@__PURE__*/ requireIsConstructor();
	var isObject = /*@__PURE__*/ requireIsObject();
	var toAbsoluteIndex = /*@__PURE__*/ requireToAbsoluteIndex();
	var lengthOfArrayLike = /*@__PURE__*/ requireLengthOfArrayLike();
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var createProperty = /*@__PURE__*/ requireCreateProperty();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();
	var arrayMethodHasSpeciesSupport = /*@__PURE__*/ requireArrayMethodHasSpeciesSupport();
	var nativeSlice = /*@__PURE__*/ requireArraySlice();

	var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('slice');

	var SPECIES = wellKnownSymbol('species');
	var $Array = Array;
	var max = Math.max;

	// `Array.prototype.slice` method
	// https://tc39.es/ecma262/#sec-array.prototype.slice
	// fallback for not array-like ES3 strings and DOM objects
	$({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
	  slice: function slice(start, end) {
	    var O = toIndexedObject(this);
	    var length = lengthOfArrayLike(O);
	    var k = toAbsoluteIndex(start, length);
	    var fin = toAbsoluteIndex(end === undefined ? length : end, length);
	    // inline `ArraySpeciesCreate` for usage native `Array#slice` where it's possible
	    var Constructor, result, n;
	    if (isArray(O)) {
	      Constructor = O.constructor;
	      // cross-realm fallback
	      if (isConstructor(Constructor) && (Constructor === $Array || isArray(Constructor.prototype))) {
	        Constructor = undefined;
	      } else if (isObject(Constructor)) {
	        Constructor = Constructor[SPECIES];
	        if (Constructor === null) Constructor = undefined;
	      }
	      if (Constructor === $Array || Constructor === undefined) {
	        return nativeSlice(O, k, fin);
	      }
	    }
	    result = new (Constructor === undefined ? $Array : Constructor)(max(fin - k, 0));
	    for (n = 0; k < fin; k++, n++) if (k in O) createProperty(result, n, O[k]);
	    result.length = n;
	    return result;
	  }
	});
	return es_array_slice;
}

var getBuiltInPrototypeMethod;
var hasRequiredGetBuiltInPrototypeMethod;

function requireGetBuiltInPrototypeMethod () {
	if (hasRequiredGetBuiltInPrototypeMethod) return getBuiltInPrototypeMethod;
	hasRequiredGetBuiltInPrototypeMethod = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var path = /*@__PURE__*/ requirePath();

	getBuiltInPrototypeMethod = function (CONSTRUCTOR, METHOD) {
	  var Namespace = path[CONSTRUCTOR + 'Prototype'];
	  var pureMethod = Namespace && Namespace[METHOD];
	  if (pureMethod) return pureMethod;
	  var NativeConstructor = globalThis[CONSTRUCTOR];
	  var NativePrototype = NativeConstructor && NativeConstructor.prototype;
	  return NativePrototype && NativePrototype[METHOD];
	};
	return getBuiltInPrototypeMethod;
}

var slice$3;
var hasRequiredSlice$3;

function requireSlice$3 () {
	if (hasRequiredSlice$3) return slice$3;
	hasRequiredSlice$3 = 1;
	requireEs_array_slice();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	slice$3 = getBuiltInPrototypeMethod('Array', 'slice');
	return slice$3;
}

var slice$2;
var hasRequiredSlice$2;

function requireSlice$2 () {
	if (hasRequiredSlice$2) return slice$2;
	hasRequiredSlice$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireSlice$3();

	var ArrayPrototype = Array.prototype;

	slice$2 = function (it) {
	  var own = it.slice;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.slice) ? method : own;
	};
	return slice$2;
}

var slice$1;
var hasRequiredSlice$1;

function requireSlice$1 () {
	if (hasRequiredSlice$1) return slice$1;
	hasRequiredSlice$1 = 1;
	var parent = /*@__PURE__*/ requireSlice$2();

	slice$1 = parent;
	return slice$1;
}

var slice;
var hasRequiredSlice;

function requireSlice () {
	if (hasRequiredSlice) return slice;
	hasRequiredSlice = 1;
	slice = /*@__PURE__*/ requireSlice$1();
	return slice;
}

var sliceExports = requireSlice();
var _sliceInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(sliceExports);

var es_reflect_ownKeys = {};

var ownKeys$3;
var hasRequiredOwnKeys$3;

function requireOwnKeys$3 () {
	if (hasRequiredOwnKeys$3) return ownKeys$3;
	hasRequiredOwnKeys$3 = 1;
	var getBuiltIn = /*@__PURE__*/ requireGetBuiltIn();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var getOwnPropertyNamesModule = /*@__PURE__*/ requireObjectGetOwnPropertyNames();
	var getOwnPropertySymbolsModule = /*@__PURE__*/ requireObjectGetOwnPropertySymbols();
	var anObject = /*@__PURE__*/ requireAnObject();

	var concat = uncurryThis([].concat);

	// all object keys, includes non-enumerable and symbols
	ownKeys$3 = getBuiltIn('Reflect', 'ownKeys') || function ownKeys(it) {
	  var keys = getOwnPropertyNamesModule.f(anObject(it));
	  var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
	  return getOwnPropertySymbols ? concat(keys, getOwnPropertySymbols(it)) : keys;
	};
	return ownKeys$3;
}

var hasRequiredEs_reflect_ownKeys;

function requireEs_reflect_ownKeys () {
	if (hasRequiredEs_reflect_ownKeys) return es_reflect_ownKeys;
	hasRequiredEs_reflect_ownKeys = 1;
	var $ = /*@__PURE__*/ require_export();
	var ownKeys = /*@__PURE__*/ requireOwnKeys$3();

	// `Reflect.ownKeys` method
	// https://tc39.es/ecma262/#sec-reflect.ownkeys
	$({ target: 'Reflect', stat: true }, {
	  ownKeys: ownKeys
	});
	return es_reflect_ownKeys;
}

var ownKeys$2;
var hasRequiredOwnKeys$2;

function requireOwnKeys$2 () {
	if (hasRequiredOwnKeys$2) return ownKeys$2;
	hasRequiredOwnKeys$2 = 1;
	requireEs_reflect_ownKeys();
	var path = /*@__PURE__*/ requirePath();

	ownKeys$2 = path.Reflect.ownKeys;
	return ownKeys$2;
}

var ownKeys$1;
var hasRequiredOwnKeys$1;

function requireOwnKeys$1 () {
	if (hasRequiredOwnKeys$1) return ownKeys$1;
	hasRequiredOwnKeys$1 = 1;
	var parent = /*@__PURE__*/ requireOwnKeys$2();

	ownKeys$1 = parent;
	return ownKeys$1;
}

var ownKeys;
var hasRequiredOwnKeys;

function requireOwnKeys () {
	if (hasRequiredOwnKeys) return ownKeys;
	hasRequiredOwnKeys = 1;
	ownKeys = /*@__PURE__*/ requireOwnKeys$1();
	return ownKeys;
}

var ownKeysExports = requireOwnKeys();
var _Reflect$ownKeys = /*@__PURE__*/getDefaultExportFromCjs(ownKeysExports);

var es_array_isArray = {};

var hasRequiredEs_array_isArray;

function requireEs_array_isArray () {
	if (hasRequiredEs_array_isArray) return es_array_isArray;
	hasRequiredEs_array_isArray = 1;
	var $ = /*@__PURE__*/ require_export();
	var isArray = /*@__PURE__*/ requireIsArray$3();

	// `Array.isArray` method
	// https://tc39.es/ecma262/#sec-array.isarray
	$({ target: 'Array', stat: true }, {
	  isArray: isArray
	});
	return es_array_isArray;
}

var isArray$2;
var hasRequiredIsArray$2;

function requireIsArray$2 () {
	if (hasRequiredIsArray$2) return isArray$2;
	hasRequiredIsArray$2 = 1;
	requireEs_array_isArray();
	var path = /*@__PURE__*/ requirePath();

	isArray$2 = path.Array.isArray;
	return isArray$2;
}

var isArray$1;
var hasRequiredIsArray$1;

function requireIsArray$1 () {
	if (hasRequiredIsArray$1) return isArray$1;
	hasRequiredIsArray$1 = 1;
	var parent = /*@__PURE__*/ requireIsArray$2();

	isArray$1 = parent;
	return isArray$1;
}

var isArray;
var hasRequiredIsArray;

function requireIsArray () {
	if (hasRequiredIsArray) return isArray;
	hasRequiredIsArray = 1;
	isArray = /*@__PURE__*/ requireIsArray$1();
	return isArray;
}

var isArrayExports = requireIsArray();
var _Array$isArray = /*@__PURE__*/getDefaultExportFromCjs(isArrayExports);

var es_array_map = {};

var hasRequiredEs_array_map;

function requireEs_array_map () {
	if (hasRequiredEs_array_map) return es_array_map;
	hasRequiredEs_array_map = 1;
	var $ = /*@__PURE__*/ require_export();
	var $map = /*@__PURE__*/ requireArrayIteration().map;
	var arrayMethodHasSpeciesSupport = /*@__PURE__*/ requireArrayMethodHasSpeciesSupport();

	var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('map');

	// `Array.prototype.map` method
	// https://tc39.es/ecma262/#sec-array.prototype.map
	// with adding support of @@species
	$({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
	  map: function map(callbackfn /* , thisArg */) {
	    return $map(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});
	return es_array_map;
}

var map$3;
var hasRequiredMap$3;

function requireMap$3 () {
	if (hasRequiredMap$3) return map$3;
	hasRequiredMap$3 = 1;
	requireEs_array_map();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	map$3 = getBuiltInPrototypeMethod('Array', 'map');
	return map$3;
}

var map$2;
var hasRequiredMap$2;

function requireMap$2 () {
	if (hasRequiredMap$2) return map$2;
	hasRequiredMap$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireMap$3();

	var ArrayPrototype = Array.prototype;

	map$2 = function (it) {
	  var own = it.map;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.map) ? method : own;
	};
	return map$2;
}

var map$1;
var hasRequiredMap$1;

function requireMap$1 () {
	if (hasRequiredMap$1) return map$1;
	hasRequiredMap$1 = 1;
	var parent = /*@__PURE__*/ requireMap$2();

	map$1 = parent;
	return map$1;
}

var map;
var hasRequiredMap;

function requireMap () {
	if (hasRequiredMap) return map;
	hasRequiredMap = 1;
	map = /*@__PURE__*/ requireMap$1();
	return map;
}

var mapExports = requireMap();
var _mapInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(mapExports);

var es_object_keys = {};

var hasRequiredEs_object_keys;

function requireEs_object_keys () {
	if (hasRequiredEs_object_keys) return es_object_keys;
	hasRequiredEs_object_keys = 1;
	var $ = /*@__PURE__*/ require_export();
	var toObject = /*@__PURE__*/ requireToObject();
	var nativeKeys = /*@__PURE__*/ requireObjectKeys();
	var fails = /*@__PURE__*/ requireFails();

	var FAILS_ON_PRIMITIVES = fails(function () { nativeKeys(1); });

	// `Object.keys` method
	// https://tc39.es/ecma262/#sec-object.keys
	$({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES }, {
	  keys: function keys(it) {
	    return nativeKeys(toObject(it));
	  }
	});
	return es_object_keys;
}

var keys$2;
var hasRequiredKeys$2;

function requireKeys$2 () {
	if (hasRequiredKeys$2) return keys$2;
	hasRequiredKeys$2 = 1;
	requireEs_object_keys();
	var path = /*@__PURE__*/ requirePath();

	keys$2 = path.Object.keys;
	return keys$2;
}

var keys$1;
var hasRequiredKeys$1;

function requireKeys$1 () {
	if (hasRequiredKeys$1) return keys$1;
	hasRequiredKeys$1 = 1;
	var parent = /*@__PURE__*/ requireKeys$2();

	keys$1 = parent;
	return keys$1;
}

var keys;
var hasRequiredKeys;

function requireKeys () {
	if (hasRequiredKeys) return keys;
	hasRequiredKeys = 1;
	keys = /*@__PURE__*/ requireKeys$1();
	return keys;
}

var keysExports = requireKeys();
var _Object$keys = /*@__PURE__*/getDefaultExportFromCjs(keysExports);

/**
 * Use this symbol to delete properies in deepObjectAssign.
 */
const DELETE = _Symbol("DELETE");
/**
 * Pure version of deepObjectAssign, it doesn't modify any of it's arguments.
 * @param base - The base object that fullfils the whole interface T.
 * @param updates - Updates that may change or delete props.
 * @returns A brand new instance with all the supplied objects deeply merged.
 */
function pureDeepObjectAssign(base) {
  for (var _len = arguments.length, updates = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    updates[_key - 1] = arguments[_key];
  }
  return deepObjectAssign({}, base, ...updates);
}
/**
 * Deep version of object assign with additional deleting by the DELETE symbol.
 * @param values - Objects to be deeply merged.
 * @returns The first object from values.
 */
function deepObjectAssign() {
  const merged = deepObjectAssignNonentry(...arguments);
  stripDelete(merged);
  return merged;
}
/**
 * Deep version of object assign with additional deleting by the DELETE symbol.
 * @remarks
 * This doesn't strip the DELETE symbols so they may end up in the final object.
 * @param values - Objects to be deeply merged.
 * @returns The first object from values.
 */
function deepObjectAssignNonentry() {
  for (var _len2 = arguments.length, values = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    values[_key2] = arguments[_key2];
  }
  if (values.length < 2) {
    return values[0];
  } else if (values.length > 2) {
    return deepObjectAssignNonentry(deepObjectAssign(values[0], values[1]), ..._sliceInstanceProperty(values).call(values, 2));
  }
  const a = values[0];
  const b = values[1];
  if (a instanceof Date && b instanceof Date) {
    a.setTime(b.getTime());
    return a;
  }
  for (const prop of _Reflect$ownKeys(b)) {
    if (!Object.prototype.propertyIsEnumerable.call(b, prop)) ; else if (b[prop] === DELETE) {
      delete a[prop];
    } else if (a[prop] !== null && b[prop] !== null && typeof a[prop] === "object" && typeof b[prop] === "object" && !_Array$isArray(a[prop]) && !_Array$isArray(b[prop])) {
      a[prop] = deepObjectAssignNonentry(a[prop], b[prop]);
    } else {
      a[prop] = clone(b[prop]);
    }
  }
  return a;
}
/**
 * Deep clone given object or array. In case of primitive simply return.
 * @param a - Anything.
 * @returns Deep cloned object/array or unchanged a.
 */
function clone(a) {
  if (_Array$isArray(a)) {
    return _mapInstanceProperty(a).call(a, value => clone(value));
  } else if (typeof a === "object" && a !== null) {
    if (a instanceof Date) {
      return new Date(a.getTime());
    }
    return deepObjectAssignNonentry({}, a);
  } else {
    return a;
  }
}
/**
 * Strip DELETE from given object.
 * @param a - Object which may contain DELETE but won't after this is executed.
 */
function stripDelete(a) {
  for (const prop of _Object$keys(a)) {
    if (a[prop] === DELETE) {
      delete a[prop];
    } else if (typeof a[prop] === "object" && a[prop] !== null) {
      stripDelete(a[prop]);
    }
  }
}

var es_date_now = {};

var hasRequiredEs_date_now;

function requireEs_date_now () {
	if (hasRequiredEs_date_now) return es_date_now;
	hasRequiredEs_date_now = 1;
	// TODO: Remove from `core-js@4`
	var $ = /*@__PURE__*/ require_export();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();

	var $Date = Date;
	var thisTimeValue = uncurryThis($Date.prototype.getTime);

	// `Date.now` method
	// https://tc39.es/ecma262/#sec-date.now
	$({ target: 'Date', stat: true }, {
	  now: function now() {
	    return thisTimeValue(new $Date());
	  }
	});
	return es_date_now;
}

var now$3;
var hasRequiredNow$2;

function requireNow$2 () {
	if (hasRequiredNow$2) return now$3;
	hasRequiredNow$2 = 1;
	requireEs_date_now();
	var path = /*@__PURE__*/ requirePath();

	now$3 = path.Date.now;
	return now$3;
}

var now$2;
var hasRequiredNow$1;

function requireNow$1 () {
	if (hasRequiredNow$1) return now$2;
	hasRequiredNow$1 = 1;
	var parent = /*@__PURE__*/ requireNow$2();

	now$2 = parent;
	return now$2;
}

var now$1;
var hasRequiredNow;

function requireNow () {
	if (hasRequiredNow) return now$1;
	hasRequiredNow = 1;
	now$1 = /*@__PURE__*/ requireNow$1();
	return now$1;
}

var nowExports = requireNow();
var _Date$now = /*@__PURE__*/getDefaultExportFromCjs(nowExports);

/**
 * Seedable, fast and reasonably good (not crypto but more than okay for our
 * needs) random number generator.
 * @remarks
 * Adapted from {@link https://web.archive.org/web/20110429100736/http://baagoe.com:80/en/RandomMusings/javascript}.
 * Original algorithm created by Johannes Baagøe \<baagoe\@baagoe.com\> in 2010.
 */
/**
 * Create a seeded pseudo random generator based on Alea by Johannes Baagøe.
 * @param seed - All supplied arguments will be used as a seed. In case nothing
 * is supplied the current time will be used to seed the generator.
 * @returns A ready to use seeded generator.
 */
function Alea() {
  for (var _len = arguments.length, seed = new Array(_len), _key = 0; _key < _len; _key++) {
    seed[_key] = arguments[_key];
  }
  return AleaImplementation(seed.length ? seed : [_Date$now()]);
}
/**
 * An implementation of [[Alea]] without user input validation.
 * @param seed - The data that will be used to seed the generator.
 * @returns A ready to use seeded generator.
 */
function AleaImplementation(seed) {
  let [s0, s1, s2] = mashSeed(seed);
  let c = 1;
  const random = () => {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
    s0 = s1;
    s1 = s2;
    return s2 = t - (c = t | 0);
  };
  random.uint32 = () => random() * 0x100000000; // 2^32
  random.fract53 = () => random() + (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
  random.algorithm = "Alea";
  random.seed = seed;
  random.version = "0.9";
  return random;
}
/**
 * Turn arbitrary data into values [[AleaImplementation]] can use to generate
 * random numbers.
 * @param seed - Arbitrary data that will be used as the seed.
 * @returns Three numbers to use as initial values for [[AleaImplementation]].
 */
function mashSeed() {
  const mash = Mash();
  let s0 = mash(" ");
  let s1 = mash(" ");
  let s2 = mash(" ");
  for (let i = 0; i < arguments.length; i++) {
    s0 -= mash(i < 0 || arguments.length <= i ? undefined : arguments[i]);
    if (s0 < 0) {
      s0 += 1;
    }
    s1 -= mash(i < 0 || arguments.length <= i ? undefined : arguments[i]);
    if (s1 < 0) {
      s1 += 1;
    }
    s2 -= mash(i < 0 || arguments.length <= i ? undefined : arguments[i]);
    if (s2 < 0) {
      s2 += 1;
    }
  }
  return [s0, s1, s2];
}
/**
 * Create a new mash function.
 * @returns A nonpure function that takes arbitrary [[Mashable]] data and turns
 * them into numbers.
 */
function Mash() {
  let n = 0xefc8249d;
  return function (data) {
    const string = data.toString();
    for (let i = 0; i < string.length; i++) {
      n += string.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };
}

var es_function_bind = {};

var functionBind;
var hasRequiredFunctionBind;

function requireFunctionBind () {
	if (hasRequiredFunctionBind) return functionBind;
	hasRequiredFunctionBind = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var aCallable = /*@__PURE__*/ requireACallable();
	var isObject = /*@__PURE__*/ requireIsObject();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var arraySlice = /*@__PURE__*/ requireArraySlice();
	var NATIVE_BIND = /*@__PURE__*/ requireFunctionBindNative();

	var $Function = Function;
	var concat = uncurryThis([].concat);
	var join = uncurryThis([].join);
	var factories = {};

	var construct = function (C, argsLength, args) {
	  if (!hasOwn(factories, argsLength)) {
	    var list = [];
	    var i = 0;
	    for (; i < argsLength; i++) list[i] = 'a[' + i + ']';
	    factories[argsLength] = $Function('C,a', 'return new C(' + join(list, ',') + ')');
	  } return factories[argsLength](C, args);
	};

	// `Function.prototype.bind` method implementation
	// https://tc39.es/ecma262/#sec-function.prototype.bind
	// eslint-disable-next-line es/no-function-prototype-bind -- detection
	functionBind = NATIVE_BIND ? $Function.bind : function bind(that /* , ...args */) {
	  var F = aCallable(this);
	  var Prototype = F.prototype;
	  var partArgs = arraySlice(arguments, 1);
	  var boundFunction = function bound(/* args... */) {
	    var args = concat(partArgs, arraySlice(arguments));
	    return this instanceof boundFunction ? construct(F, args.length, args) : F.apply(that, args);
	  };
	  if (isObject(Prototype)) boundFunction.prototype = Prototype;
	  return boundFunction;
	};
	return functionBind;
}

var hasRequiredEs_function_bind;

function requireEs_function_bind () {
	if (hasRequiredEs_function_bind) return es_function_bind;
	hasRequiredEs_function_bind = 1;
	// TODO: Remove from `core-js@4`
	var $ = /*@__PURE__*/ require_export();
	var bind = /*@__PURE__*/ requireFunctionBind();

	// `Function.prototype.bind` method
	// https://tc39.es/ecma262/#sec-function.prototype.bind
	// eslint-disable-next-line es/no-function-prototype-bind -- detection
	$({ target: 'Function', proto: true, forced: Function.bind !== bind }, {
	  bind: bind
	});
	return es_function_bind;
}

var bind$3;
var hasRequiredBind$3;

function requireBind$3 () {
	if (hasRequiredBind$3) return bind$3;
	hasRequiredBind$3 = 1;
	requireEs_function_bind();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	bind$3 = getBuiltInPrototypeMethod('Function', 'bind');
	return bind$3;
}

var bind$2;
var hasRequiredBind$2;

function requireBind$2 () {
	if (hasRequiredBind$2) return bind$2;
	hasRequiredBind$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireBind$3();

	var FunctionPrototype = Function.prototype;

	bind$2 = function (it) {
	  var own = it.bind;
	  return it === FunctionPrototype || (isPrototypeOf(FunctionPrototype, it) && own === FunctionPrototype.bind) ? method : own;
	};
	return bind$2;
}

var bind$1;
var hasRequiredBind$1;

function requireBind$1 () {
	if (hasRequiredBind$1) return bind$1;
	hasRequiredBind$1 = 1;
	var parent = /*@__PURE__*/ requireBind$2();

	bind$1 = parent;
	return bind$1;
}

var bind;
var hasRequiredBind;

function requireBind () {
	if (hasRequiredBind) return bind;
	hasRequiredBind = 1;
	bind = /*@__PURE__*/ requireBind$1();
	return bind;
}

var bindExports = requireBind();
var _bindInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(bindExports);

var es_array_forEach = {};

var arrayMethodIsStrict;
var hasRequiredArrayMethodIsStrict;

function requireArrayMethodIsStrict () {
	if (hasRequiredArrayMethodIsStrict) return arrayMethodIsStrict;
	hasRequiredArrayMethodIsStrict = 1;
	var fails = /*@__PURE__*/ requireFails();

	arrayMethodIsStrict = function (METHOD_NAME, argument) {
	  var method = [][METHOD_NAME];
	  return !!method && fails(function () {
	    // eslint-disable-next-line no-useless-call -- required for testing
	    method.call(null, argument || function () { return 1; }, 1);
	  });
	};
	return arrayMethodIsStrict;
}

var arrayForEach;
var hasRequiredArrayForEach;

function requireArrayForEach () {
	if (hasRequiredArrayForEach) return arrayForEach;
	hasRequiredArrayForEach = 1;
	var $forEach = /*@__PURE__*/ requireArrayIteration().forEach;
	var arrayMethodIsStrict = /*@__PURE__*/ requireArrayMethodIsStrict();

	var STRICT_METHOD = arrayMethodIsStrict('forEach');

	// `Array.prototype.forEach` method implementation
	// https://tc39.es/ecma262/#sec-array.prototype.foreach
	arrayForEach = !STRICT_METHOD ? function forEach(callbackfn /* , thisArg */) {
	  return $forEach(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	// eslint-disable-next-line es/no-array-prototype-foreach -- safe
	} : [].forEach;
	return arrayForEach;
}

var hasRequiredEs_array_forEach;

function requireEs_array_forEach () {
	if (hasRequiredEs_array_forEach) return es_array_forEach;
	hasRequiredEs_array_forEach = 1;
	var $ = /*@__PURE__*/ require_export();
	var forEach = /*@__PURE__*/ requireArrayForEach();

	// `Array.prototype.forEach` method
	// https://tc39.es/ecma262/#sec-array.prototype.foreach
	// eslint-disable-next-line es/no-array-prototype-foreach -- safe
	$({ target: 'Array', proto: true, forced: [].forEach !== forEach }, {
	  forEach: forEach
	});
	return es_array_forEach;
}

var forEach$4;
var hasRequiredForEach$3;

function requireForEach$3 () {
	if (hasRequiredForEach$3) return forEach$4;
	hasRequiredForEach$3 = 1;
	requireEs_array_forEach();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	forEach$4 = getBuiltInPrototypeMethod('Array', 'forEach');
	return forEach$4;
}

var forEach$3;
var hasRequiredForEach$2;

function requireForEach$2 () {
	if (hasRequiredForEach$2) return forEach$3;
	hasRequiredForEach$2 = 1;
	var parent = /*@__PURE__*/ requireForEach$3();

	forEach$3 = parent;
	return forEach$3;
}

var forEach$2;
var hasRequiredForEach$1;

function requireForEach$1 () {
	if (hasRequiredForEach$1) return forEach$2;
	hasRequiredForEach$1 = 1;
	var classof = /*@__PURE__*/ requireClassof();
	var hasOwn = /*@__PURE__*/ requireHasOwnProperty();
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireForEach$2();

	var ArrayPrototype = Array.prototype;

	var DOMIterables = {
	  DOMTokenList: true,
	  NodeList: true
	};

	forEach$2 = function (it) {
	  var own = it.forEach;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.forEach)
	    || hasOwn(DOMIterables, classof(it)) ? method : own;
	};
	return forEach$2;
}

var forEach$1;
var hasRequiredForEach;

function requireForEach () {
	if (hasRequiredForEach) return forEach$1;
	hasRequiredForEach = 1;
	forEach$1 = /*@__PURE__*/ requireForEach$1();
	return forEach$1;
}

var forEachExports = requireForEach();
var _forEachInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(forEachExports);

var es_array_reverse = {};

var hasRequiredEs_array_reverse;

function requireEs_array_reverse () {
	if (hasRequiredEs_array_reverse) return es_array_reverse;
	hasRequiredEs_array_reverse = 1;
	var $ = /*@__PURE__*/ require_export();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var isArray = /*@__PURE__*/ requireIsArray$3();

	var nativeReverse = uncurryThis([].reverse);
	var test = [1, 2];

	// `Array.prototype.reverse` method
	// https://tc39.es/ecma262/#sec-array.prototype.reverse
	// fix for Safari 12.0 bug
	// https://bugs.webkit.org/show_bug.cgi?id=188794
	$({ target: 'Array', proto: true, forced: String(test) === String(test.reverse()) }, {
	  reverse: function reverse() {
	    // eslint-disable-next-line no-self-assign -- dirty hack
	    if (isArray(this)) this.length = this.length;
	    return nativeReverse(this);
	  }
	});
	return es_array_reverse;
}

var reverse$3;
var hasRequiredReverse$3;

function requireReverse$3 () {
	if (hasRequiredReverse$3) return reverse$3;
	hasRequiredReverse$3 = 1;
	requireEs_array_reverse();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	reverse$3 = getBuiltInPrototypeMethod('Array', 'reverse');
	return reverse$3;
}

var reverse$2;
var hasRequiredReverse$2;

function requireReverse$2 () {
	if (hasRequiredReverse$2) return reverse$2;
	hasRequiredReverse$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireReverse$3();

	var ArrayPrototype = Array.prototype;

	reverse$2 = function (it) {
	  var own = it.reverse;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.reverse) ? method : own;
	};
	return reverse$2;
}

var reverse$1;
var hasRequiredReverse$1;

function requireReverse$1 () {
	if (hasRequiredReverse$1) return reverse$1;
	hasRequiredReverse$1 = 1;
	var parent = /*@__PURE__*/ requireReverse$2();

	reverse$1 = parent;
	return reverse$1;
}

var reverse;
var hasRequiredReverse;

function requireReverse () {
	if (hasRequiredReverse) return reverse;
	hasRequiredReverse = 1;
	reverse = /*@__PURE__*/ requireReverse$1();
	return reverse;
}

var reverseExports = requireReverse();
var _reverseInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(reverseExports);

var es_array_splice = {};

var arraySetLength;
var hasRequiredArraySetLength;

function requireArraySetLength () {
	if (hasRequiredArraySetLength) return arraySetLength;
	hasRequiredArraySetLength = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var isArray = /*@__PURE__*/ requireIsArray$3();

	var $TypeError = TypeError;
	// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
	var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

	// Safari < 13 does not throw an error in this case
	var SILENT_ON_NON_WRITABLE_LENGTH_SET = DESCRIPTORS && !function () {
	  // makes no sense without proper strict mode support
	  if (this !== undefined) return true;
	  try {
	    // eslint-disable-next-line es/no-object-defineproperty -- safe
	    Object.defineProperty([], 'length', { writable: false }).length = 1;
	  } catch (error) {
	    return error instanceof TypeError;
	  }
	}();

	arraySetLength = SILENT_ON_NON_WRITABLE_LENGTH_SET ? function (O, length) {
	  if (isArray(O) && !getOwnPropertyDescriptor(O, 'length').writable) {
	    throw new $TypeError('Cannot set read only .length');
	  } return O.length = length;
	} : function (O, length) {
	  return O.length = length;
	};
	return arraySetLength;
}

var deletePropertyOrThrow;
var hasRequiredDeletePropertyOrThrow;

function requireDeletePropertyOrThrow () {
	if (hasRequiredDeletePropertyOrThrow) return deletePropertyOrThrow;
	hasRequiredDeletePropertyOrThrow = 1;
	var tryToString = /*@__PURE__*/ requireTryToString();

	var $TypeError = TypeError;

	deletePropertyOrThrow = function (O, P) {
	  if (!delete O[P]) throw new $TypeError('Cannot delete property ' + tryToString(P) + ' of ' + tryToString(O));
	};
	return deletePropertyOrThrow;
}

var hasRequiredEs_array_splice;

function requireEs_array_splice () {
	if (hasRequiredEs_array_splice) return es_array_splice;
	hasRequiredEs_array_splice = 1;
	var $ = /*@__PURE__*/ require_export();
	var toObject = /*@__PURE__*/ requireToObject();
	var toAbsoluteIndex = /*@__PURE__*/ requireToAbsoluteIndex();
	var toIntegerOrInfinity = /*@__PURE__*/ requireToIntegerOrInfinity();
	var lengthOfArrayLike = /*@__PURE__*/ requireLengthOfArrayLike();
	var setArrayLength = /*@__PURE__*/ requireArraySetLength();
	var doesNotExceedSafeInteger = /*@__PURE__*/ requireDoesNotExceedSafeInteger();
	var arraySpeciesCreate = /*@__PURE__*/ requireArraySpeciesCreate();
	var createProperty = /*@__PURE__*/ requireCreateProperty();
	var deletePropertyOrThrow = /*@__PURE__*/ requireDeletePropertyOrThrow();
	var arrayMethodHasSpeciesSupport = /*@__PURE__*/ requireArrayMethodHasSpeciesSupport();

	var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('splice');

	var max = Math.max;
	var min = Math.min;

	// `Array.prototype.splice` method
	// https://tc39.es/ecma262/#sec-array.prototype.splice
	// with adding support of @@species
	$({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
	  splice: function splice(start, deleteCount /* , ...items */) {
	    var O = toObject(this);
	    var len = lengthOfArrayLike(O);
	    var actualStart = toAbsoluteIndex(start, len);
	    var argumentsLength = arguments.length;
	    var insertCount, actualDeleteCount, A, k, from, to;
	    if (argumentsLength === 0) {
	      insertCount = actualDeleteCount = 0;
	    } else if (argumentsLength === 1) {
	      insertCount = 0;
	      actualDeleteCount = len - actualStart;
	    } else {
	      insertCount = argumentsLength - 2;
	      actualDeleteCount = min(max(toIntegerOrInfinity(deleteCount), 0), len - actualStart);
	    }
	    doesNotExceedSafeInteger(len + insertCount - actualDeleteCount);
	    A = arraySpeciesCreate(O, actualDeleteCount);
	    for (k = 0; k < actualDeleteCount; k++) {
	      from = actualStart + k;
	      if (from in O) createProperty(A, k, O[from]);
	    }
	    A.length = actualDeleteCount;
	    if (insertCount < actualDeleteCount) {
	      for (k = actualStart; k < len - actualDeleteCount; k++) {
	        from = k + actualDeleteCount;
	        to = k + insertCount;
	        if (from in O) O[to] = O[from];
	        else deletePropertyOrThrow(O, to);
	      }
	      for (k = len; k > len - actualDeleteCount + insertCount; k--) deletePropertyOrThrow(O, k - 1);
	    } else if (insertCount > actualDeleteCount) {
	      for (k = len - actualDeleteCount; k > actualStart; k--) {
	        from = k + actualDeleteCount - 1;
	        to = k + insertCount - 1;
	        if (from in O) O[to] = O[from];
	        else deletePropertyOrThrow(O, to);
	      }
	    }
	    for (k = 0; k < insertCount; k++) {
	      O[k + actualStart] = arguments[k + 2];
	    }
	    setArrayLength(O, len - actualDeleteCount + insertCount);
	    return A;
	  }
	});
	return es_array_splice;
}

var splice$3;
var hasRequiredSplice$3;

function requireSplice$3 () {
	if (hasRequiredSplice$3) return splice$3;
	hasRequiredSplice$3 = 1;
	requireEs_array_splice();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	splice$3 = getBuiltInPrototypeMethod('Array', 'splice');
	return splice$3;
}

var splice$2;
var hasRequiredSplice$2;

function requireSplice$2 () {
	if (hasRequiredSplice$2) return splice$2;
	hasRequiredSplice$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireSplice$3();

	var ArrayPrototype = Array.prototype;

	splice$2 = function (it) {
	  var own = it.splice;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.splice) ? method : own;
	};
	return splice$2;
}

var splice$1;
var hasRequiredSplice$1;

function requireSplice$1 () {
	if (hasRequiredSplice$1) return splice$1;
	hasRequiredSplice$1 = 1;
	var parent = /*@__PURE__*/ requireSplice$2();

	splice$1 = parent;
	return splice$1;
}

var splice;
var hasRequiredSplice;

function requireSplice () {
	if (hasRequiredSplice) return splice;
	hasRequiredSplice = 1;
	splice = /*@__PURE__*/ requireSplice$1();
	return splice;
}

var spliceExports = requireSplice();
var _spliceInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(spliceExports);

var componentEmitter = {exports: {}};

var hasRequiredComponentEmitter;

function requireComponentEmitter () {
	if (hasRequiredComponentEmitter) return componentEmitter.exports;
	hasRequiredComponentEmitter = 1;
	(function (module) {
		function Emitter(object) {
			if (object) {
				return mixin(object);
			}

			this._callbacks = new Map();
		}

		function mixin(object) {
			Object.assign(object, Emitter.prototype);
			object._callbacks = new Map();
			return object;
		}

		Emitter.prototype.on = function (event, listener) {
			const callbacks = this._callbacks.get(event) ?? [];
			callbacks.push(listener);
			this._callbacks.set(event, callbacks);
			return this;
		};

		Emitter.prototype.once = function (event, listener) {
			const on = (...arguments_) => {
				this.off(event, on);
				listener.apply(this, arguments_);
			};

			on.fn = listener;
			this.on(event, on);
			return this;
		};

		Emitter.prototype.off = function (event, listener) {
			if (event === undefined && listener === undefined) {
				this._callbacks.clear();
				return this;
			}

			if (listener === undefined) {
				this._callbacks.delete(event);
				return this;
			}

			const callbacks = this._callbacks.get(event);
			if (callbacks) {
				for (const [index, callback] of callbacks.entries()) {
					if (callback === listener || callback.fn === listener) {
						callbacks.splice(index, 1);
						break;
					}
				}

				if (callbacks.length === 0) {
					this._callbacks.delete(event);
				} else {
					this._callbacks.set(event, callbacks);
				}
			}

			return this;
		};

		Emitter.prototype.emit = function (event, ...arguments_) {
			const callbacks = this._callbacks.get(event);
			if (callbacks) {
				// Create a copy of the callbacks array to avoid issues if it's modified during iteration
				const callbacksCopy = [...callbacks];

				for (const callback of callbacksCopy) {
					callback.apply(this, arguments_);
				}
			}

			return this;
		};

		Emitter.prototype.listeners = function (event) {
			return this._callbacks.get(event) ?? [];
		};

		Emitter.prototype.listenerCount = function (event) {
			if (event) {
				return this.listeners(event).length;
			}

			let totalCount = 0;
			for (const callbacks of this._callbacks.values()) {
				totalCount += callbacks.length;
			}

			return totalCount;
		};

		Emitter.prototype.hasListeners = function (event) {
			return this.listenerCount(event) > 0;
		};

		// Aliases
		Emitter.prototype.addEventListener = Emitter.prototype.on;
		Emitter.prototype.removeListener = Emitter.prototype.off;
		Emitter.prototype.removeEventListener = Emitter.prototype.off;
		Emitter.prototype.removeAllListeners = Emitter.prototype.off;

		{
			module.exports = Emitter;
		} 
	} (componentEmitter));
	return componentEmitter.exports;
}

var componentEmitterExports = /*@__PURE__*/ requireComponentEmitter();
var Emitter = /*@__PURE__*/getDefaultExportFromCjs(componentEmitterExports);

/*! Hammer.JS - v2.0.17-rc - 2019-12-16
 * http://naver.github.io/egjs
 *
 * Forked By Naver egjs
 * Copyright (c) hammerjs
 * Licensed under the MIT license */
function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

/**
 * @private
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} target
 * @param {...Object} objects_to_assign
 * @returns {Object} target
 */
var assign$3;

if (typeof Object.assign !== 'function') {
  assign$3 = function assign(target) {
    if (target === undefined || target === null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var output = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];

      if (source !== undefined && source !== null) {
        for (var nextKey in source) {
          if (source.hasOwnProperty(nextKey)) {
            output[nextKey] = source[nextKey];
          }
        }
      }
    }

    return output;
  };
} else {
  assign$3 = Object.assign;
}

var assign$1$1 = assign$3;

var VENDOR_PREFIXES = ['', 'webkit', 'Moz', 'MS', 'ms', 'o'];
var TEST_ELEMENT = typeof document === "undefined" ? {
  style: {}
} : document.createElement('div');
var TYPE_FUNCTION = 'function';
var round = Math.round,
    abs = Math.abs;
var now = Date.now;

/**
 * @private
 * get the prefixed property
 * @param {Object} obj
 * @param {String} property
 * @returns {String|Undefined} prefixed
 */

function prefixed(obj, property) {
  var prefix;
  var prop;
  var camelProp = property[0].toUpperCase() + property.slice(1);
  var i = 0;

  while (i < VENDOR_PREFIXES.length) {
    prefix = VENDOR_PREFIXES[i];
    prop = prefix ? prefix + camelProp : property;

    if (prop in obj) {
      return prop;
    }

    i++;
  }

  return undefined;
}

/* eslint-disable no-new-func, no-nested-ternary */
var win;

if (typeof window === "undefined") {
  // window is undefined in node.js
  win = {};
} else {
  win = window;
}

var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;
function getTouchActionProps() {
  if (!NATIVE_TOUCH_ACTION) {
    return false;
  }

  var touchMap = {};
  var cssSupports = win.CSS && win.CSS.supports;
  ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach(function (val) {
    // If css.supports is not supported but there is native touch-action assume it supports
    // all values. This is the case for IE 10 and 11.
    return touchMap[val] = cssSupports ? win.CSS.supports('touch-action', val) : true;
  });
  return touchMap;
}

var TOUCH_ACTION_COMPUTE = 'compute';
var TOUCH_ACTION_AUTO = 'auto';
var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented

var TOUCH_ACTION_NONE = 'none';
var TOUCH_ACTION_PAN_X = 'pan-x';
var TOUCH_ACTION_PAN_Y = 'pan-y';
var TOUCH_ACTION_MAP = getTouchActionProps();

var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;
var SUPPORT_TOUCH = 'ontouchstart' in win;
var SUPPORT_POINTER_EVENTS = prefixed(win, 'PointerEvent') !== undefined;
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);
var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_PEN = 'pen';
var INPUT_TYPE_MOUSE = 'mouse';
var INPUT_TYPE_KINECT = 'kinect';
var COMPUTE_INTERVAL = 25;
var INPUT_START = 1;
var INPUT_MOVE = 2;
var INPUT_END = 4;
var INPUT_CANCEL = 8;
var DIRECTION_NONE = 1;
var DIRECTION_LEFT = 2;
var DIRECTION_RIGHT = 4;
var DIRECTION_UP = 8;
var DIRECTION_DOWN = 16;
var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;
var PROPS_XY = ['x', 'y'];
var PROPS_CLIENT_XY = ['clientX', 'clientY'];

/**
 * @private
 * walk objects and arrays
 * @param {Object} obj
 * @param {Function} iterator
 * @param {Object} context
 */
function each(obj, iterator, context) {
  var i;

  if (!obj) {
    return;
  }

  if (obj.forEach) {
    obj.forEach(iterator, context);
  } else if (obj.length !== undefined) {
    i = 0;

    while (i < obj.length) {
      iterator.call(context, obj[i], i, obj);
      i++;
    }
  } else {
    for (i in obj) {
      obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
    }
  }
}

/**
 * @private
 * let a boolean value also be a function that must return a boolean
 * this first item in args will be used as the context
 * @param {Boolean|Function} val
 * @param {Array} [args]
 * @returns {Boolean}
 */

function boolOrFn(val, args) {
  if (typeof val === TYPE_FUNCTION) {
    return val.apply(args ? args[0] || undefined : undefined, args);
  }

  return val;
}

/**
 * @private
 * small indexOf wrapper
 * @param {String} str
 * @param {String} find
 * @returns {Boolean} found
 */
function inStr(str, find) {
  return str.indexOf(find) > -1;
}

/**
 * @private
 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
 * @param {String} actions
 * @returns {*}
 */

function cleanTouchActions(actions) {
  // none
  if (inStr(actions, TOUCH_ACTION_NONE)) {
    return TOUCH_ACTION_NONE;
  }

  var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
  var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y); // if both pan-x and pan-y are set (different recognizers
  // for different directions, e.g. horizontal pan but vertical swipe?)
  // we need none (as otherwise with pan-x pan-y combined none of these
  // recognizers will work, since the browser would handle all panning

  if (hasPanX && hasPanY) {
    return TOUCH_ACTION_NONE;
  } // pan-x OR pan-y


  if (hasPanX || hasPanY) {
    return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
  } // manipulation


  if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
    return TOUCH_ACTION_MANIPULATION;
  }

  return TOUCH_ACTION_AUTO;
}

/**
 * @private
 * Touch Action
 * sets the touchAction property or uses the js alternative
 * @param {Manager} manager
 * @param {String} value
 * @constructor
 */

var TouchAction =
/*#__PURE__*/
function () {
  function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
  }
  /**
   * @private
   * set the touchAction value on the element or enable the polyfill
   * @param {String} value
   */


  var _proto = TouchAction.prototype;

  _proto.set = function set(value) {
    // find out the touch-action by the event handlers
    if (value === TOUCH_ACTION_COMPUTE) {
      value = this.compute();
    }

    if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
      this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
    }

    this.actions = value.toLowerCase().trim();
  };
  /**
   * @private
   * just re-set the touchAction value
   */


  _proto.update = function update() {
    this.set(this.manager.options.touchAction);
  };
  /**
   * @private
   * compute the value for the touchAction property based on the recognizer's settings
   * @returns {String} value
   */


  _proto.compute = function compute() {
    var actions = [];
    each(this.manager.recognizers, function (recognizer) {
      if (boolOrFn(recognizer.options.enable, [recognizer])) {
        actions = actions.concat(recognizer.getTouchAction());
      }
    });
    return cleanTouchActions(actions.join(' '));
  };
  /**
   * @private
   * this method is called on each input cycle and provides the preventing of the browser behavior
   * @param {Object} input
   */


  _proto.preventDefaults = function preventDefaults(input) {
    var srcEvent = input.srcEvent;
    var direction = input.offsetDirection; // if the touch action did prevented once this session

    if (this.manager.session.prevented) {
      srcEvent.preventDefault();
      return;
    }

    var actions = this.actions;
    var hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
    var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
    var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];

    if (hasNone) {
      // do not prevent defaults if this is a tap gesture
      var isTapPointer = input.pointers.length === 1;
      var isTapMovement = input.distance < 2;
      var isTapTouchTime = input.deltaTime < 250;

      if (isTapPointer && isTapMovement && isTapTouchTime) {
        return;
      }
    }

    if (hasPanX && hasPanY) {
      // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
      return;
    }

    if (hasNone || hasPanY && direction & DIRECTION_HORIZONTAL || hasPanX && direction & DIRECTION_VERTICAL) {
      return this.preventSrc(srcEvent);
    }
  };
  /**
   * @private
   * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
   * @param {Object} srcEvent
   */


  _proto.preventSrc = function preventSrc(srcEvent) {
    this.manager.session.prevented = true;
    srcEvent.preventDefault();
  };

  return TouchAction;
}();

/**
 * @private
 * find if a node is in the given parent
 * @method hasParent
 * @param {HTMLElement} node
 * @param {HTMLElement} parent
 * @return {Boolean} found
 */
function hasParent$1(node, parent) {
  while (node) {
    if (node === parent) {
      return true;
    }

    node = node.parentNode;
  }

  return false;
}

/**
 * @private
 * get the center of all the pointers
 * @param {Array} pointers
 * @return {Object} center contains `x` and `y` properties
 */

function getCenter(pointers) {
  var pointersLength = pointers.length; // no need to loop when only one touch

  if (pointersLength === 1) {
    return {
      x: round(pointers[0].clientX),
      y: round(pointers[0].clientY)
    };
  }

  var x = 0;
  var y = 0;
  var i = 0;

  while (i < pointersLength) {
    x += pointers[i].clientX;
    y += pointers[i].clientY;
    i++;
  }

  return {
    x: round(x / pointersLength),
    y: round(y / pointersLength)
  };
}

/**
 * @private
 * create a simple clone from the input used for storage of firstInput and firstMultiple
 * @param {Object} input
 * @returns {Object} clonedInputData
 */

function simpleCloneInputData(input) {
  // make a simple copy of the pointers because we will get a reference if we don't
  // we only need clientXY for the calculations
  var pointers = [];
  var i = 0;

  while (i < input.pointers.length) {
    pointers[i] = {
      clientX: round(input.pointers[i].clientX),
      clientY: round(input.pointers[i].clientY)
    };
    i++;
  }

  return {
    timeStamp: now(),
    pointers: pointers,
    center: getCenter(pointers),
    deltaX: input.deltaX,
    deltaY: input.deltaY
  };
}

/**
 * @private
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */

function getDistance(p1, p2, props) {
  if (!props) {
    props = PROPS_XY;
  }

  var x = p2[props[0]] - p1[props[0]];
  var y = p2[props[1]] - p1[props[1]];
  return Math.sqrt(x * x + y * y);
}

/**
 * @private
 * calculate the angle between two coordinates
 * @param {Object} p1
 * @param {Object} p2
 * @param {Array} [props] containing x and y keys
 * @return {Number} angle
 */

function getAngle(p1, p2, props) {
  if (!props) {
    props = PROPS_XY;
  }

  var x = p2[props[0]] - p1[props[0]];
  var y = p2[props[1]] - p1[props[1]];
  return Math.atan2(y, x) * 180 / Math.PI;
}

/**
 * @private
 * get the direction between two points
 * @param {Number} x
 * @param {Number} y
 * @return {Number} direction
 */

function getDirection(x, y) {
  if (x === y) {
    return DIRECTION_NONE;
  }

  if (abs(x) >= abs(y)) {
    return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
  }

  return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

function computeDeltaXY(session, input) {
  var center = input.center; // let { offsetDelta:offset = {}, prevDelta = {}, prevInput = {} } = session;
  // jscs throwing error on defalut destructured values and without defaults tests fail

  var offset = session.offsetDelta || {};
  var prevDelta = session.prevDelta || {};
  var prevInput = session.prevInput || {};

  if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
    prevDelta = session.prevDelta = {
      x: prevInput.deltaX || 0,
      y: prevInput.deltaY || 0
    };
    offset = session.offsetDelta = {
      x: center.x,
      y: center.y
    };
  }

  input.deltaX = prevDelta.x + (center.x - offset.x);
  input.deltaY = prevDelta.y + (center.y - offset.y);
}

/**
 * @private
 * calculate the velocity between two points. unit is in px per ms.
 * @param {Number} deltaTime
 * @param {Number} x
 * @param {Number} y
 * @return {Object} velocity `x` and `y`
 */
function getVelocity(deltaTime, x, y) {
  return {
    x: x / deltaTime || 0,
    y: y / deltaTime || 0
  };
}

/**
 * @private
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */

function getScale(start, end) {
  return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
}

/**
 * @private
 * calculate the rotation degrees between two pointersets
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */

function getRotation(start, end) {
  return getAngle(end[1], end[0], PROPS_CLIENT_XY) + getAngle(start[1], start[0], PROPS_CLIENT_XY);
}

/**
 * @private
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */

function computeIntervalInputData(session, input) {
  var last = session.lastInterval || input;
  var deltaTime = input.timeStamp - last.timeStamp;
  var velocity;
  var velocityX;
  var velocityY;
  var direction;

  if (input.eventType !== INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined)) {
    var deltaX = input.deltaX - last.deltaX;
    var deltaY = input.deltaY - last.deltaY;
    var v = getVelocity(deltaTime, deltaX, deltaY);
    velocityX = v.x;
    velocityY = v.y;
    velocity = abs(v.x) > abs(v.y) ? v.x : v.y;
    direction = getDirection(deltaX, deltaY);
    session.lastInterval = input;
  } else {
    // use latest velocity info if it doesn't overtake a minimum period
    velocity = last.velocity;
    velocityX = last.velocityX;
    velocityY = last.velocityY;
    direction = last.direction;
  }

  input.velocity = velocity;
  input.velocityX = velocityX;
  input.velocityY = velocityY;
  input.direction = direction;
}

/**
* @private
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} manager
 * @param {Object} input
 */

function computeInputData(manager, input) {
  var session = manager.session;
  var pointers = input.pointers;
  var pointersLength = pointers.length; // store the first input to calculate the distance and direction

  if (!session.firstInput) {
    session.firstInput = simpleCloneInputData(input);
  } // to compute scale and rotation we need to store the multiple touches


  if (pointersLength > 1 && !session.firstMultiple) {
    session.firstMultiple = simpleCloneInputData(input);
  } else if (pointersLength === 1) {
    session.firstMultiple = false;
  }

  var firstInput = session.firstInput,
      firstMultiple = session.firstMultiple;
  var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;
  var center = input.center = getCenter(pointers);
  input.timeStamp = now();
  input.deltaTime = input.timeStamp - firstInput.timeStamp;
  input.angle = getAngle(offsetCenter, center);
  input.distance = getDistance(offsetCenter, center);
  computeDeltaXY(session, input);
  input.offsetDirection = getDirection(input.deltaX, input.deltaY);
  var overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
  input.overallVelocityX = overallVelocity.x;
  input.overallVelocityY = overallVelocity.y;
  input.overallVelocity = abs(overallVelocity.x) > abs(overallVelocity.y) ? overallVelocity.x : overallVelocity.y;
  input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
  input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;
  input.maxPointers = !session.prevInput ? input.pointers.length : input.pointers.length > session.prevInput.maxPointers ? input.pointers.length : session.prevInput.maxPointers;
  computeIntervalInputData(session, input); // find the correct target

  var target = manager.element;
  var srcEvent = input.srcEvent;
  var srcEventTarget;

  if (srcEvent.composedPath) {
    srcEventTarget = srcEvent.composedPath()[0];
  } else if (srcEvent.path) {
    srcEventTarget = srcEvent.path[0];
  } else {
    srcEventTarget = srcEvent.target;
  }

  if (hasParent$1(srcEventTarget, target)) {
    target = srcEventTarget;
  }

  input.target = target;
}

/**
 * @private
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */

function inputHandler(manager, eventType, input) {
  var pointersLen = input.pointers.length;
  var changedPointersLen = input.changedPointers.length;
  var isFirst = eventType & INPUT_START && pointersLen - changedPointersLen === 0;
  var isFinal = eventType & (INPUT_END | INPUT_CANCEL) && pointersLen - changedPointersLen === 0;
  input.isFirst = !!isFirst;
  input.isFinal = !!isFinal;

  if (isFirst) {
    manager.session = {};
  } // source event is the normalized value of the domEvents
  // like 'touchstart, mouseup, pointerdown'


  input.eventType = eventType; // compute scale, rotation etc

  computeInputData(manager, input); // emit secret event

  manager.emit('hammer.input', input);
  manager.recognize(input);
  manager.session.prevInput = input;
}

/**
 * @private
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */
function splitStr(str) {
  return str.trim().split(/\s+/g);
}

/**
 * @private
 * addEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */

function addEventListeners(target, types, handler) {
  each(splitStr(types), function (type) {
    target.addEventListener(type, handler, false);
  });
}

/**
 * @private
 * removeEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */

function removeEventListeners(target, types, handler) {
  each(splitStr(types), function (type) {
    target.removeEventListener(type, handler, false);
  });
}

/**
 * @private
 * get the window object of an element
 * @param {HTMLElement} element
 * @returns {DocumentView|Window}
 */
function getWindowForElement(element) {
  var doc = element.ownerDocument || element;
  return doc.defaultView || doc.parentWindow || window;
}

/**
 * @private
 * create new input type manager
 * @param {Manager} manager
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */

var Input =
/*#__PURE__*/
function () {
  function Input(manager, callback) {
    var self = this;
    this.manager = manager;
    this.callback = callback;
    this.element = manager.element;
    this.target = manager.options.inputTarget; // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.

    this.domHandler = function (ev) {
      if (boolOrFn(manager.options.enable, [manager])) {
        self.handler(ev);
      }
    };

    this.init();
  }
  /**
   * @private
   * should handle the inputEvent data and trigger the callback
   * @virtual
   */


  var _proto = Input.prototype;

  _proto.handler = function handler() {};
  /**
   * @private
   * bind the events
   */


  _proto.init = function init() {
    this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
    this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
    this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
  };
  /**
   * @private
   * unbind the events
   */


  _proto.destroy = function destroy() {
    this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
    this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
    this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
  };

  return Input;
}();

/**
 * @private
 * find if a array contains the object using indexOf or a simple polyFill
 * @param {Array} src
 * @param {String} find
 * @param {String} [findByKey]
 * @return {Boolean|Number} false when not found, or the index
 */
function inArray(src, find, findByKey) {
  if (src.indexOf && !findByKey) {
    return src.indexOf(find);
  } else {
    var i = 0;

    while (i < src.length) {
      if (findByKey && src[i][findByKey] == find || !findByKey && src[i] === find) {
        // do not use === here, test fails
        return i;
      }

      i++;
    }

    return -1;
  }
}

var POINTER_INPUT_MAP = {
  pointerdown: INPUT_START,
  pointermove: INPUT_MOVE,
  pointerup: INPUT_END,
  pointercancel: INPUT_CANCEL,
  pointerout: INPUT_CANCEL
}; // in IE10 the pointer types is defined as an enum

var IE10_POINTER_TYPE_ENUM = {
  2: INPUT_TYPE_TOUCH,
  3: INPUT_TYPE_PEN,
  4: INPUT_TYPE_MOUSE,
  5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816

};
var POINTER_ELEMENT_EVENTS = 'pointerdown';
var POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel'; // IE10 has prefixed support, and case-sensitive

if (win.MSPointerEvent && !win.PointerEvent) {
  POINTER_ELEMENT_EVENTS = 'MSPointerDown';
  POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
}
/**
 * @private
 * Pointer events input
 * @constructor
 * @extends Input
 */


var PointerEventInput =
/*#__PURE__*/
function (_Input) {
  _inheritsLoose(PointerEventInput, _Input);

  function PointerEventInput() {
    var _this;

    var proto = PointerEventInput.prototype;
    proto.evEl = POINTER_ELEMENT_EVENTS;
    proto.evWin = POINTER_WINDOW_EVENTS;
    _this = _Input.apply(this, arguments) || this;
    _this.store = _this.manager.session.pointerEvents = [];
    return _this;
  }
  /**
   * @private
   * handle mouse events
   * @param {Object} ev
   */


  var _proto = PointerEventInput.prototype;

  _proto.handler = function handler(ev) {
    var store = this.store;
    var removePointer = false;
    var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
    var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
    var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;
    var isTouch = pointerType === INPUT_TYPE_TOUCH; // get index of the event in the store

    var storeIndex = inArray(store, ev.pointerId, 'pointerId'); // start and mouse must be down

    if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
      if (storeIndex < 0) {
        store.push(ev);
        storeIndex = store.length - 1;
      }
    } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
      removePointer = true;
    } // it not found, so the pointer hasn't been down (so it's probably a hover)


    if (storeIndex < 0) {
      return;
    } // update the event in the store


    store[storeIndex] = ev;
    this.callback(this.manager, eventType, {
      pointers: store,
      changedPointers: [ev],
      pointerType: pointerType,
      srcEvent: ev
    });

    if (removePointer) {
      // remove from the store
      store.splice(storeIndex, 1);
    }
  };

  return PointerEventInput;
}(Input);

/**
 * @private
 * convert array-like objects to real arrays
 * @param {Object} obj
 * @returns {Array}
 */
function toArray$1(obj) {
  return Array.prototype.slice.call(obj, 0);
}

/**
 * @private
 * unique array with objects based on a key (like 'id') or just by the array's value
 * @param {Array} src [{id:1},{id:2},{id:1}]
 * @param {String} [key]
 * @param {Boolean} [sort=False]
 * @returns {Array} [{id:1},{id:2}]
 */

function uniqueArray(src, key, sort) {
  var results = [];
  var values = [];
  var i = 0;

  while (i < src.length) {
    var val = key ? src[i][key] : src[i];

    if (inArray(values, val) < 0) {
      results.push(src[i]);
    }

    values[i] = val;
    i++;
  }

  if (sort) {
    if (!key) {
      results = results.sort();
    } else {
      results = results.sort(function (a, b) {
        return a[key] > b[key];
      });
    }
  }

  return results;
}

var TOUCH_INPUT_MAP = {
  touchstart: INPUT_START,
  touchmove: INPUT_MOVE,
  touchend: INPUT_END,
  touchcancel: INPUT_CANCEL
};
var TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';
/**
 * @private
 * Multi-user touch events input
 * @constructor
 * @extends Input
 */

var TouchInput =
/*#__PURE__*/
function (_Input) {
  _inheritsLoose(TouchInput, _Input);

  function TouchInput() {
    var _this;

    TouchInput.prototype.evTarget = TOUCH_TARGET_EVENTS;
    _this = _Input.apply(this, arguments) || this;
    _this.targetIds = {}; // this.evTarget = TOUCH_TARGET_EVENTS;

    return _this;
  }

  var _proto = TouchInput.prototype;

  _proto.handler = function handler(ev) {
    var type = TOUCH_INPUT_MAP[ev.type];
    var touches = getTouches.call(this, ev, type);

    if (!touches) {
      return;
    }

    this.callback(this.manager, type, {
      pointers: touches[0],
      changedPointers: touches[1],
      pointerType: INPUT_TYPE_TOUCH,
      srcEvent: ev
    });
  };

  return TouchInput;
}(Input);

function getTouches(ev, type) {
  var allTouches = toArray$1(ev.touches);
  var targetIds = this.targetIds; // when there is only one touch, the process can be simplified

  if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
    targetIds[allTouches[0].identifier] = true;
    return [allTouches, allTouches];
  }

  var i;
  var targetTouches;
  var changedTouches = toArray$1(ev.changedTouches);
  var changedTargetTouches = [];
  var target = this.target; // get target touches from touches

  targetTouches = allTouches.filter(function (touch) {
    return hasParent$1(touch.target, target);
  }); // collect touches

  if (type === INPUT_START) {
    i = 0;

    while (i < targetTouches.length) {
      targetIds[targetTouches[i].identifier] = true;
      i++;
    }
  } // filter changed touches to only contain touches that exist in the collected target ids


  i = 0;

  while (i < changedTouches.length) {
    if (targetIds[changedTouches[i].identifier]) {
      changedTargetTouches.push(changedTouches[i]);
    } // cleanup removed touches


    if (type & (INPUT_END | INPUT_CANCEL)) {
      delete targetIds[changedTouches[i].identifier];
    }

    i++;
  }

  if (!changedTargetTouches.length) {
    return;
  }

  return [// merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
  uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true), changedTargetTouches];
}

var MOUSE_INPUT_MAP = {
  mousedown: INPUT_START,
  mousemove: INPUT_MOVE,
  mouseup: INPUT_END
};
var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';
/**
 * @private
 * Mouse events input
 * @constructor
 * @extends Input
 */

var MouseInput =
/*#__PURE__*/
function (_Input) {
  _inheritsLoose(MouseInput, _Input);

  function MouseInput() {
    var _this;

    var proto = MouseInput.prototype;
    proto.evEl = MOUSE_ELEMENT_EVENTS;
    proto.evWin = MOUSE_WINDOW_EVENTS;
    _this = _Input.apply(this, arguments) || this;
    _this.pressed = false; // mousedown state

    return _this;
  }
  /**
   * @private
   * handle mouse events
   * @param {Object} ev
   */


  var _proto = MouseInput.prototype;

  _proto.handler = function handler(ev) {
    var eventType = MOUSE_INPUT_MAP[ev.type]; // on start we want to have the left mouse button down

    if (eventType & INPUT_START && ev.button === 0) {
      this.pressed = true;
    }

    if (eventType & INPUT_MOVE && ev.which !== 1) {
      eventType = INPUT_END;
    } // mouse must be down


    if (!this.pressed) {
      return;
    }

    if (eventType & INPUT_END) {
      this.pressed = false;
    }

    this.callback(this.manager, eventType, {
      pointers: [ev],
      changedPointers: [ev],
      pointerType: INPUT_TYPE_MOUSE,
      srcEvent: ev
    });
  };

  return MouseInput;
}(Input);

/**
 * @private
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 * @extends Input
 */

var DEDUP_TIMEOUT = 2500;
var DEDUP_DISTANCE = 25;

function setLastTouch(eventData) {
  var _eventData$changedPoi = eventData.changedPointers,
      touch = _eventData$changedPoi[0];

  if (touch.identifier === this.primaryTouch) {
    var lastTouch = {
      x: touch.clientX,
      y: touch.clientY
    };
    var lts = this.lastTouches;
    this.lastTouches.push(lastTouch);

    var removeLastTouch = function removeLastTouch() {
      var i = lts.indexOf(lastTouch);

      if (i > -1) {
        lts.splice(i, 1);
      }
    };

    setTimeout(removeLastTouch, DEDUP_TIMEOUT);
  }
}

function recordTouches(eventType, eventData) {
  if (eventType & INPUT_START) {
    this.primaryTouch = eventData.changedPointers[0].identifier;
    setLastTouch.call(this, eventData);
  } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
    setLastTouch.call(this, eventData);
  }
}

function isSyntheticEvent(eventData) {
  var x = eventData.srcEvent.clientX;
  var y = eventData.srcEvent.clientY;

  for (var i = 0; i < this.lastTouches.length; i++) {
    var t = this.lastTouches[i];
    var dx = Math.abs(x - t.x);
    var dy = Math.abs(y - t.y);

    if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
      return true;
    }
  }

  return false;
}

var TouchMouseInput =
/*#__PURE__*/
function () {
  var TouchMouseInput =
  /*#__PURE__*/
  function (_Input) {
    _inheritsLoose(TouchMouseInput, _Input);

    function TouchMouseInput(_manager, callback) {
      var _this;

      _this = _Input.call(this, _manager, callback) || this;

      _this.handler = function (manager, inputEvent, inputData) {
        var isTouch = inputData.pointerType === INPUT_TYPE_TOUCH;
        var isMouse = inputData.pointerType === INPUT_TYPE_MOUSE;

        if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
          return;
        } // when we're in a touch event, record touches to  de-dupe synthetic mouse event


        if (isTouch) {
          recordTouches.call(_assertThisInitialized(_assertThisInitialized(_this)), inputEvent, inputData);
        } else if (isMouse && isSyntheticEvent.call(_assertThisInitialized(_assertThisInitialized(_this)), inputData)) {
          return;
        }

        _this.callback(manager, inputEvent, inputData);
      };

      _this.touch = new TouchInput(_this.manager, _this.handler);
      _this.mouse = new MouseInput(_this.manager, _this.handler);
      _this.primaryTouch = null;
      _this.lastTouches = [];
      return _this;
    }
    /**
     * @private
     * handle mouse and touch events
     * @param {Hammer} manager
     * @param {String} inputEvent
     * @param {Object} inputData
     */


    var _proto = TouchMouseInput.prototype;

    /**
     * @private
     * remove the event listeners
     */
    _proto.destroy = function destroy() {
      this.touch.destroy();
      this.mouse.destroy();
    };

    return TouchMouseInput;
  }(Input);

  return TouchMouseInput;
}();

/**
 * @private
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */

function createInputInstance(manager) {
  var Type; // let inputClass = manager.options.inputClass;

  var inputClass = manager.options.inputClass;

  if (inputClass) {
    Type = inputClass;
  } else if (SUPPORT_POINTER_EVENTS) {
    Type = PointerEventInput;
  } else if (SUPPORT_ONLY_TOUCH) {
    Type = TouchInput;
  } else if (!SUPPORT_TOUCH) {
    Type = MouseInput;
  } else {
    Type = TouchMouseInput;
  }

  return new Type(manager, inputHandler);
}

/**
 * @private
 * if the argument is an array, we want to execute the fn on each entry
 * if it aint an array we don't want to do a thing.
 * this is used by all the methods that accept a single and array argument.
 * @param {*|Array} arg
 * @param {String} fn
 * @param {Object} [context]
 * @returns {Boolean}
 */

function invokeArrayArg(arg, fn, context) {
  if (Array.isArray(arg)) {
    each(arg, context[fn], context);
    return true;
  }

  return false;
}

var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

/**
 * @private
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
function uniqueId() {
  return _uniqueId++;
}

/**
 * @private
 * get a recognizer by name if it is bound to a manager
 * @param {Recognizer|String} otherRecognizer
 * @param {Recognizer} recognizer
 * @returns {Recognizer}
 */
function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
  var manager = recognizer.manager;

  if (manager) {
    return manager.get(otherRecognizer);
  }

  return otherRecognizer;
}

/**
 * @private
 * get a usable string, used as event postfix
 * @param {constant} state
 * @returns {String} state
 */

function stateStr(state) {
  if (state & STATE_CANCELLED) {
    return 'cancel';
  } else if (state & STATE_ENDED) {
    return 'end';
  } else if (state & STATE_CHANGED) {
    return 'move';
  } else if (state & STATE_BEGAN) {
    return 'start';
  }

  return '';
}

/**
 * @private
 * Recognizer flow explained; *
 * All recognizers have the initial state of POSSIBLE when a input session starts.
 * The definition of a input session is from the first input until the last input, with all it's movement in it. *
 * Example session for mouse-input: mousedown -> mousemove -> mouseup
 *
 * On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
 * which determines with state it should be.
 *
 * If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
 * POSSIBLE to give it another change on the next cycle.
 *
 *               Possible
 *                  |
 *            +-----+---------------+
 *            |                     |
 *      +-----+-----+               |
 *      |           |               |
 *   Failed      Cancelled          |
 *                          +-------+------+
 *                          |              |
 *                      Recognized       Began
 *                                         |
 *                                      Changed
 *                                         |
 *                                  Ended/Recognized
 */

/**
 * @private
 * Recognizer
 * Every recognizer needs to extend from this class.
 * @constructor
 * @param {Object} options
 */

var Recognizer =
/*#__PURE__*/
function () {
  function Recognizer(options) {
    if (options === void 0) {
      options = {};
    }

    this.options = _extends({
      enable: true
    }, options);
    this.id = uniqueId();
    this.manager = null; // default is enable true

    this.state = STATE_POSSIBLE;
    this.simultaneous = {};
    this.requireFail = [];
  }
  /**
   * @private
   * set options
   * @param {Object} options
   * @return {Recognizer}
   */


  var _proto = Recognizer.prototype;

  _proto.set = function set(options) {
    assign$1$1(this.options, options); // also update the touchAction, in case something changed about the directions/enabled state

    this.manager && this.manager.touchAction.update();
    return this;
  };
  /**
   * @private
   * recognize simultaneous with an other recognizer.
   * @param {Recognizer} otherRecognizer
   * @returns {Recognizer} this
   */


  _proto.recognizeWith = function recognizeWith(otherRecognizer) {
    if (invokeArrayArg(otherRecognizer, 'recognizeWith', this)) {
      return this;
    }

    var simultaneous = this.simultaneous;
    otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);

    if (!simultaneous[otherRecognizer.id]) {
      simultaneous[otherRecognizer.id] = otherRecognizer;
      otherRecognizer.recognizeWith(this);
    }

    return this;
  };
  /**
   * @private
   * drop the simultaneous link. it doesnt remove the link on the other recognizer.
   * @param {Recognizer} otherRecognizer
   * @returns {Recognizer} this
   */


  _proto.dropRecognizeWith = function dropRecognizeWith(otherRecognizer) {
    if (invokeArrayArg(otherRecognizer, 'dropRecognizeWith', this)) {
      return this;
    }

    otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
    delete this.simultaneous[otherRecognizer.id];
    return this;
  };
  /**
   * @private
   * recognizer can only run when an other is failing
   * @param {Recognizer} otherRecognizer
   * @returns {Recognizer} this
   */


  _proto.requireFailure = function requireFailure(otherRecognizer) {
    if (invokeArrayArg(otherRecognizer, 'requireFailure', this)) {
      return this;
    }

    var requireFail = this.requireFail;
    otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);

    if (inArray(requireFail, otherRecognizer) === -1) {
      requireFail.push(otherRecognizer);
      otherRecognizer.requireFailure(this);
    }

    return this;
  };
  /**
   * @private
   * drop the requireFailure link. it does not remove the link on the other recognizer.
   * @param {Recognizer} otherRecognizer
   * @returns {Recognizer} this
   */


  _proto.dropRequireFailure = function dropRequireFailure(otherRecognizer) {
    if (invokeArrayArg(otherRecognizer, 'dropRequireFailure', this)) {
      return this;
    }

    otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
    var index = inArray(this.requireFail, otherRecognizer);

    if (index > -1) {
      this.requireFail.splice(index, 1);
    }

    return this;
  };
  /**
   * @private
   * has require failures boolean
   * @returns {boolean}
   */


  _proto.hasRequireFailures = function hasRequireFailures() {
    return this.requireFail.length > 0;
  };
  /**
   * @private
   * if the recognizer can recognize simultaneous with an other recognizer
   * @param {Recognizer} otherRecognizer
   * @returns {Boolean}
   */


  _proto.canRecognizeWith = function canRecognizeWith(otherRecognizer) {
    return !!this.simultaneous[otherRecognizer.id];
  };
  /**
   * @private
   * You should use `tryEmit` instead of `emit` directly to check
   * that all the needed recognizers has failed before emitting.
   * @param {Object} input
   */


  _proto.emit = function emit(input) {
    var self = this;
    var state = this.state;

    function emit(event) {
      self.manager.emit(event, input);
    } // 'panstart' and 'panmove'


    if (state < STATE_ENDED) {
      emit(self.options.event + stateStr(state));
    }

    emit(self.options.event); // simple 'eventName' events

    if (input.additionalEvent) {
      // additional event(panleft, panright, pinchin, pinchout...)
      emit(input.additionalEvent);
    } // panend and pancancel


    if (state >= STATE_ENDED) {
      emit(self.options.event + stateStr(state));
    }
  };
  /**
   * @private
   * Check that all the require failure recognizers has failed,
   * if true, it emits a gesture event,
   * otherwise, setup the state to FAILED.
   * @param {Object} input
   */


  _proto.tryEmit = function tryEmit(input) {
    if (this.canEmit()) {
      return this.emit(input);
    } // it's failing anyway


    this.state = STATE_FAILED;
  };
  /**
   * @private
   * can we emit?
   * @returns {boolean}
   */


  _proto.canEmit = function canEmit() {
    var i = 0;

    while (i < this.requireFail.length) {
      if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
        return false;
      }

      i++;
    }

    return true;
  };
  /**
   * @private
   * update the recognizer
   * @param {Object} inputData
   */


  _proto.recognize = function recognize(inputData) {
    // make a new copy of the inputData
    // so we can change the inputData without messing up the other recognizers
    var inputDataClone = assign$1$1({}, inputData); // is is enabled and allow recognizing?

    if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
      this.reset();
      this.state = STATE_FAILED;
      return;
    } // reset when we've reached the end


    if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
      this.state = STATE_POSSIBLE;
    }

    this.state = this.process(inputDataClone); // the recognizer has recognized a gesture
    // so trigger an event

    if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
      this.tryEmit(inputDataClone);
    }
  };
  /**
   * @private
   * return the state of the recognizer
   * the actual recognizing happens in this method
   * @virtual
   * @param {Object} inputData
   * @returns {constant} STATE
   */

  /* jshint ignore:start */


  _proto.process = function process(inputData) {};
  /* jshint ignore:end */

  /**
   * @private
   * return the preferred touch-action
   * @virtual
   * @returns {Array}
   */


  _proto.getTouchAction = function getTouchAction() {};
  /**
   * @private
   * called when the gesture isn't allowed to recognize
   * like when another is being recognized or it is disabled
   * @virtual
   */


  _proto.reset = function reset() {};

  return Recognizer;
}();

/**
 * @private
 * A tap is recognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
 * between the given interval and position. The delay option can be used to recognize multi-taps without firing
 * a single tap.
 *
 * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
 * multi-taps being recognized.
 * @constructor
 * @extends Recognizer
 */

var TapRecognizer =
/*#__PURE__*/
function (_Recognizer) {
  _inheritsLoose(TapRecognizer, _Recognizer);

  function TapRecognizer(options) {
    var _this;

    if (options === void 0) {
      options = {};
    }

    _this = _Recognizer.call(this, _extends({
      event: 'tap',
      pointers: 1,
      taps: 1,
      interval: 300,
      // max time between the multi-tap taps
      time: 250,
      // max time of the pointer to be down (like finger on the screen)
      threshold: 9,
      // a minimal movement is ok, but keep it low
      posThreshold: 10
    }, options)) || this; // previous time and center,
    // used for tap counting

    _this.pTime = false;
    _this.pCenter = false;
    _this._timer = null;
    _this._input = null;
    _this.count = 0;
    return _this;
  }

  var _proto = TapRecognizer.prototype;

  _proto.getTouchAction = function getTouchAction() {
    return [TOUCH_ACTION_MANIPULATION];
  };

  _proto.process = function process(input) {
    var _this2 = this;

    var options = this.options;
    var validPointers = input.pointers.length === options.pointers;
    var validMovement = input.distance < options.threshold;
    var validTouchTime = input.deltaTime < options.time;
    this.reset();

    if (input.eventType & INPUT_START && this.count === 0) {
      return this.failTimeout();
    } // we only allow little movement
    // and we've reached an end event, so a tap is possible


    if (validMovement && validTouchTime && validPointers) {
      if (input.eventType !== INPUT_END) {
        return this.failTimeout();
      }

      var validInterval = this.pTime ? input.timeStamp - this.pTime < options.interval : true;
      var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;
      this.pTime = input.timeStamp;
      this.pCenter = input.center;

      if (!validMultiTap || !validInterval) {
        this.count = 1;
      } else {
        this.count += 1;
      }

      this._input = input; // if tap count matches we have recognized it,
      // else it has began recognizing...

      var tapCount = this.count % options.taps;

      if (tapCount === 0) {
        // no failing requirements, immediately trigger the tap event
        // or wait as long as the multitap interval to trigger
        if (!this.hasRequireFailures()) {
          return STATE_RECOGNIZED;
        } else {
          this._timer = setTimeout(function () {
            _this2.state = STATE_RECOGNIZED;

            _this2.tryEmit();
          }, options.interval);
          return STATE_BEGAN;
        }
      }
    }

    return STATE_FAILED;
  };

  _proto.failTimeout = function failTimeout() {
    var _this3 = this;

    this._timer = setTimeout(function () {
      _this3.state = STATE_FAILED;
    }, this.options.interval);
    return STATE_FAILED;
  };

  _proto.reset = function reset() {
    clearTimeout(this._timer);
  };

  _proto.emit = function emit() {
    if (this.state === STATE_RECOGNIZED) {
      this._input.tapCount = this.count;
      this.manager.emit(this.options.event, this._input);
    }
  };

  return TapRecognizer;
}(Recognizer);

/**
 * @private
 * This recognizer is just used as a base for the simple attribute recognizers.
 * @constructor
 * @extends Recognizer
 */

var AttrRecognizer =
/*#__PURE__*/
function (_Recognizer) {
  _inheritsLoose(AttrRecognizer, _Recognizer);

  function AttrRecognizer(options) {
    if (options === void 0) {
      options = {};
    }

    return _Recognizer.call(this, _extends({
      pointers: 1
    }, options)) || this;
  }
  /**
   * @private
   * Used to check if it the recognizer receives valid input, like input.distance > 10.
   * @memberof AttrRecognizer
   * @param {Object} input
   * @returns {Boolean} recognized
   */


  var _proto = AttrRecognizer.prototype;

  _proto.attrTest = function attrTest(input) {
    var optionPointers = this.options.pointers;
    return optionPointers === 0 || input.pointers.length === optionPointers;
  };
  /**
   * @private
   * Process the input and return the state for the recognizer
   * @memberof AttrRecognizer
   * @param {Object} input
   * @returns {*} State
   */


  _proto.process = function process(input) {
    var state = this.state;
    var eventType = input.eventType;
    var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
    var isValid = this.attrTest(input); // on cancel input and we've recognized before, return STATE_CANCELLED

    if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
      return state | STATE_CANCELLED;
    } else if (isRecognized || isValid) {
      if (eventType & INPUT_END) {
        return state | STATE_ENDED;
      } else if (!(state & STATE_BEGAN)) {
        return STATE_BEGAN;
      }

      return state | STATE_CHANGED;
    }

    return STATE_FAILED;
  };

  return AttrRecognizer;
}(Recognizer);

/**
 * @private
 * direction cons to string
 * @param {constant} direction
 * @returns {String}
 */

function directionStr(direction) {
  if (direction === DIRECTION_DOWN) {
    return 'down';
  } else if (direction === DIRECTION_UP) {
    return 'up';
  } else if (direction === DIRECTION_LEFT) {
    return 'left';
  } else if (direction === DIRECTION_RIGHT) {
    return 'right';
  }

  return '';
}

/**
 * @private
 * Pan
 * Recognized when the pointer is down and moved in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */

var PanRecognizer =
/*#__PURE__*/
function (_AttrRecognizer) {
  _inheritsLoose(PanRecognizer, _AttrRecognizer);

  function PanRecognizer(options) {
    var _this;

    if (options === void 0) {
      options = {};
    }

    _this = _AttrRecognizer.call(this, _extends({
      event: 'pan',
      threshold: 10,
      pointers: 1,
      direction: DIRECTION_ALL
    }, options)) || this;
    _this.pX = null;
    _this.pY = null;
    return _this;
  }

  var _proto = PanRecognizer.prototype;

  _proto.getTouchAction = function getTouchAction() {
    var direction = this.options.direction;
    var actions = [];

    if (direction & DIRECTION_HORIZONTAL) {
      actions.push(TOUCH_ACTION_PAN_Y);
    }

    if (direction & DIRECTION_VERTICAL) {
      actions.push(TOUCH_ACTION_PAN_X);
    }

    return actions;
  };

  _proto.directionTest = function directionTest(input) {
    var options = this.options;
    var hasMoved = true;
    var distance = input.distance;
    var direction = input.direction;
    var x = input.deltaX;
    var y = input.deltaY; // lock to axis?

    if (!(direction & options.direction)) {
      if (options.direction & DIRECTION_HORIZONTAL) {
        direction = x === 0 ? DIRECTION_NONE : x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
        hasMoved = x !== this.pX;
        distance = Math.abs(input.deltaX);
      } else {
        direction = y === 0 ? DIRECTION_NONE : y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
        hasMoved = y !== this.pY;
        distance = Math.abs(input.deltaY);
      }
    }

    input.direction = direction;
    return hasMoved && distance > options.threshold && direction & options.direction;
  };

  _proto.attrTest = function attrTest(input) {
    return AttrRecognizer.prototype.attrTest.call(this, input) && ( // replace with a super call
    this.state & STATE_BEGAN || !(this.state & STATE_BEGAN) && this.directionTest(input));
  };

  _proto.emit = function emit(input) {
    this.pX = input.deltaX;
    this.pY = input.deltaY;
    var direction = directionStr(input.direction);

    if (direction) {
      input.additionalEvent = this.options.event + direction;
    }

    _AttrRecognizer.prototype.emit.call(this, input);
  };

  return PanRecognizer;
}(AttrRecognizer);

/**
 * @private
 * Swipe
 * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */

var SwipeRecognizer =
/*#__PURE__*/
function (_AttrRecognizer) {
  _inheritsLoose(SwipeRecognizer, _AttrRecognizer);

  function SwipeRecognizer(options) {
    if (options === void 0) {
      options = {};
    }

    return _AttrRecognizer.call(this, _extends({
      event: 'swipe',
      threshold: 10,
      velocity: 0.3,
      direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
      pointers: 1
    }, options)) || this;
  }

  var _proto = SwipeRecognizer.prototype;

  _proto.getTouchAction = function getTouchAction() {
    return PanRecognizer.prototype.getTouchAction.call(this);
  };

  _proto.attrTest = function attrTest(input) {
    var direction = this.options.direction;
    var velocity;

    if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
      velocity = input.overallVelocity;
    } else if (direction & DIRECTION_HORIZONTAL) {
      velocity = input.overallVelocityX;
    } else if (direction & DIRECTION_VERTICAL) {
      velocity = input.overallVelocityY;
    }

    return _AttrRecognizer.prototype.attrTest.call(this, input) && direction & input.offsetDirection && input.distance > this.options.threshold && input.maxPointers === this.options.pointers && abs(velocity) > this.options.velocity && input.eventType & INPUT_END;
  };

  _proto.emit = function emit(input) {
    var direction = directionStr(input.offsetDirection);

    if (direction) {
      this.manager.emit(this.options.event + direction, input);
    }

    this.manager.emit(this.options.event, input);
  };

  return SwipeRecognizer;
}(AttrRecognizer);

/**
 * @private
 * Pinch
 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
 * @constructor
 * @extends AttrRecognizer
 */

var PinchRecognizer =
/*#__PURE__*/
function (_AttrRecognizer) {
  _inheritsLoose(PinchRecognizer, _AttrRecognizer);

  function PinchRecognizer(options) {
    if (options === void 0) {
      options = {};
    }

    return _AttrRecognizer.call(this, _extends({
      event: 'pinch',
      threshold: 0,
      pointers: 2
    }, options)) || this;
  }

  var _proto = PinchRecognizer.prototype;

  _proto.getTouchAction = function getTouchAction() {
    return [TOUCH_ACTION_NONE];
  };

  _proto.attrTest = function attrTest(input) {
    return _AttrRecognizer.prototype.attrTest.call(this, input) && (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
  };

  _proto.emit = function emit(input) {
    if (input.scale !== 1) {
      var inOut = input.scale < 1 ? 'in' : 'out';
      input.additionalEvent = this.options.event + inOut;
    }

    _AttrRecognizer.prototype.emit.call(this, input);
  };

  return PinchRecognizer;
}(AttrRecognizer);

/**
 * @private
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */

var RotateRecognizer =
/*#__PURE__*/
function (_AttrRecognizer) {
  _inheritsLoose(RotateRecognizer, _AttrRecognizer);

  function RotateRecognizer(options) {
    if (options === void 0) {
      options = {};
    }

    return _AttrRecognizer.call(this, _extends({
      event: 'rotate',
      threshold: 0,
      pointers: 2
    }, options)) || this;
  }

  var _proto = RotateRecognizer.prototype;

  _proto.getTouchAction = function getTouchAction() {
    return [TOUCH_ACTION_NONE];
  };

  _proto.attrTest = function attrTest(input) {
    return _AttrRecognizer.prototype.attrTest.call(this, input) && (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
  };

  return RotateRecognizer;
}(AttrRecognizer);

/**
 * @private
 * Press
 * Recognized when the pointer is down for x ms without any movement.
 * @constructor
 * @extends Recognizer
 */

var PressRecognizer =
/*#__PURE__*/
function (_Recognizer) {
  _inheritsLoose(PressRecognizer, _Recognizer);

  function PressRecognizer(options) {
    var _this;

    if (options === void 0) {
      options = {};
    }

    _this = _Recognizer.call(this, _extends({
      event: 'press',
      pointers: 1,
      time: 251,
      // minimal time of the pointer to be pressed
      threshold: 9
    }, options)) || this;
    _this._timer = null;
    _this._input = null;
    return _this;
  }

  var _proto = PressRecognizer.prototype;

  _proto.getTouchAction = function getTouchAction() {
    return [TOUCH_ACTION_AUTO];
  };

  _proto.process = function process(input) {
    var _this2 = this;

    var options = this.options;
    var validPointers = input.pointers.length === options.pointers;
    var validMovement = input.distance < options.threshold;
    var validTime = input.deltaTime > options.time;
    this._input = input; // we only allow little movement
    // and we've reached an end event, so a tap is possible

    if (!validMovement || !validPointers || input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime) {
      this.reset();
    } else if (input.eventType & INPUT_START) {
      this.reset();
      this._timer = setTimeout(function () {
        _this2.state = STATE_RECOGNIZED;

        _this2.tryEmit();
      }, options.time);
    } else if (input.eventType & INPUT_END) {
      return STATE_RECOGNIZED;
    }

    return STATE_FAILED;
  };

  _proto.reset = function reset() {
    clearTimeout(this._timer);
  };

  _proto.emit = function emit(input) {
    if (this.state !== STATE_RECOGNIZED) {
      return;
    }

    if (input && input.eventType & INPUT_END) {
      this.manager.emit(this.options.event + "up", input);
    } else {
      this._input.timeStamp = now();
      this.manager.emit(this.options.event, this._input);
    }
  };

  return PressRecognizer;
}(Recognizer);

var defaults = {
  /**
   * @private
   * set if DOM events are being triggered.
   * But this is slower and unused by simple implementations, so disabled by default.
   * @type {Boolean}
   * @default false
   */
  domEvents: false,

  /**
   * @private
   * The value for the touchAction property/fallback.
   * When set to `compute` it will magically set the correct value based on the added recognizers.
   * @type {String}
   * @default compute
   */
  touchAction: TOUCH_ACTION_COMPUTE,

  /**
   * @private
   * @type {Boolean}
   * @default true
   */
  enable: true,

  /**
   * @private
   * EXPERIMENTAL FEATURE -- can be removed/changed
   * Change the parent input target element.
   * If Null, then it is being set the to main element.
   * @type {Null|EventTarget}
   * @default null
   */
  inputTarget: null,

  /**
   * @private
   * force an input class
   * @type {Null|Function}
   * @default null
   */
  inputClass: null,

  /**
   * @private
   * Some CSS properties can be used to improve the working of Hammer.
   * Add them to this method and they will be set when creating a new Manager.
   * @namespace
   */
  cssProps: {
    /**
     * @private
     * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
     * @type {String}
     * @default 'none'
     */
    userSelect: "none",

    /**
     * @private
     * Disable the Windows Phone grippers when pressing an element.
     * @type {String}
     * @default 'none'
     */
    touchSelect: "none",

    /**
     * @private
     * Disables the default callout shown when you touch and hold a touch target.
     * On iOS, when you touch and hold a touch target such as a link, Safari displays
     * a callout containing information about the link. This property allows you to disable that callout.
     * @type {String}
     * @default 'none'
     */
    touchCallout: "none",

    /**
     * @private
     * Specifies whether zooming is enabled. Used by IE10>
     * @type {String}
     * @default 'none'
     */
    contentZooming: "none",

    /**
     * @private
     * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
     * @type {String}
     * @default 'none'
     */
    userDrag: "none",

    /**
     * @private
     * Overrides the highlight color shown when the user taps a link or a JavaScript
     * clickable element in iOS. This property obeys the alpha value, if specified.
     * @type {String}
     * @default 'rgba(0,0,0,0)'
     */
    tapHighlightColor: "rgba(0,0,0,0)"
  }
};
/**
 * @private
 * Default recognizer setup when calling `Hammer()`
 * When creating a new Manager these will be skipped.
 * This is separated with other defaults because of tree-shaking.
 * @type {Array}
 */

var preset = [[RotateRecognizer, {
  enable: false
}], [PinchRecognizer, {
  enable: false
}, ['rotate']], [SwipeRecognizer, {
  direction: DIRECTION_HORIZONTAL
}], [PanRecognizer, {
  direction: DIRECTION_HORIZONTAL
}, ['swipe']], [TapRecognizer], [TapRecognizer, {
  event: 'doubletap',
  taps: 2
}, ['tap']], [PressRecognizer]];

var STOP = 1;
var FORCED_STOP = 2;
/**
 * @private
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */

function toggleCssProps(manager, add) {
  var element = manager.element;

  if (!element.style) {
    return;
  }

  var prop;
  each(manager.options.cssProps, function (value, name) {
    prop = prefixed(element.style, name);

    if (add) {
      manager.oldCssProps[prop] = element.style[prop];
      element.style[prop] = value;
    } else {
      element.style[prop] = manager.oldCssProps[prop] || "";
    }
  });

  if (!add) {
    manager.oldCssProps = {};
  }
}
/**
 * @private
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */


function triggerDomEvent(event, data) {
  var gestureEvent = document.createEvent("Event");
  gestureEvent.initEvent(event, true, true);
  gestureEvent.gesture = data;
  data.target.dispatchEvent(gestureEvent);
}
/**
* @private
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */


var Manager =
/*#__PURE__*/
function () {
  function Manager(element, options) {
    var _this = this;

    this.options = assign$1$1({}, defaults, options || {});
    this.options.inputTarget = this.options.inputTarget || element;
    this.handlers = {};
    this.session = {};
    this.recognizers = [];
    this.oldCssProps = {};
    this.element = element;
    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);
    toggleCssProps(this, true);
    each(this.options.recognizers, function (item) {
      var recognizer = _this.add(new item[0](item[1]));

      item[2] && recognizer.recognizeWith(item[2]);
      item[3] && recognizer.requireFailure(item[3]);
    }, this);
  }
  /**
   * @private
   * set options
   * @param {Object} options
   * @returns {Manager}
   */


  var _proto = Manager.prototype;

  _proto.set = function set(options) {
    assign$1$1(this.options, options); // Options that need a little more setup

    if (options.touchAction) {
      this.touchAction.update();
    }

    if (options.inputTarget) {
      // Clean up existing event listeners and reinitialize
      this.input.destroy();
      this.input.target = options.inputTarget;
      this.input.init();
    }

    return this;
  };
  /**
   * @private
   * stop recognizing for this session.
   * This session will be discarded, when a new [input]start event is fired.
   * When forced, the recognizer cycle is stopped immediately.
   * @param {Boolean} [force]
   */


  _proto.stop = function stop(force) {
    this.session.stopped = force ? FORCED_STOP : STOP;
  };
  /**
   * @private
   * run the recognizers!
   * called by the inputHandler function on every movement of the pointers (touches)
   * it walks through all the recognizers and tries to detect the gesture that is being made
   * @param {Object} inputData
   */


  _proto.recognize = function recognize(inputData) {
    var session = this.session;

    if (session.stopped) {
      return;
    } // run the touch-action polyfill


    this.touchAction.preventDefaults(inputData);
    var recognizer;
    var recognizers = this.recognizers; // this holds the recognizer that is being recognized.
    // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
    // if no recognizer is detecting a thing, it is set to `null`

    var curRecognizer = session.curRecognizer; // reset when the last recognizer is recognized
    // or when we're in a new session

    if (!curRecognizer || curRecognizer && curRecognizer.state & STATE_RECOGNIZED) {
      session.curRecognizer = null;
      curRecognizer = null;
    }

    var i = 0;

    while (i < recognizers.length) {
      recognizer = recognizers[i]; // find out if we are allowed try to recognize the input for this one.
      // 1.   allow if the session is NOT forced stopped (see the .stop() method)
      // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
      //      that is being recognized.
      // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
      //      this can be setup with the `recognizeWith()` method on the recognizer.

      if (session.stopped !== FORCED_STOP && ( // 1
      !curRecognizer || recognizer === curRecognizer || // 2
      recognizer.canRecognizeWith(curRecognizer))) {
        // 3
        recognizer.recognize(inputData);
      } else {
        recognizer.reset();
      } // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
      // current active recognizer. but only if we don't already have an active recognizer


      if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
        session.curRecognizer = recognizer;
        curRecognizer = recognizer;
      }

      i++;
    }
  };
  /**
   * @private
   * get a recognizer by its event name.
   * @param {Recognizer|String} recognizer
   * @returns {Recognizer|Null}
   */


  _proto.get = function get(recognizer) {
    if (recognizer instanceof Recognizer) {
      return recognizer;
    }

    var recognizers = this.recognizers;

    for (var i = 0; i < recognizers.length; i++) {
      if (recognizers[i].options.event === recognizer) {
        return recognizers[i];
      }
    }

    return null;
  };
  /**
   * @private add a recognizer to the manager
   * existing recognizers with the same event name will be removed
   * @param {Recognizer} recognizer
   * @returns {Recognizer|Manager}
   */


  _proto.add = function add(recognizer) {
    if (invokeArrayArg(recognizer, "add", this)) {
      return this;
    } // remove existing


    var existing = this.get(recognizer.options.event);

    if (existing) {
      this.remove(existing);
    }

    this.recognizers.push(recognizer);
    recognizer.manager = this;
    this.touchAction.update();
    return recognizer;
  };
  /**
   * @private
   * remove a recognizer by name or instance
   * @param {Recognizer|String} recognizer
   * @returns {Manager}
   */


  _proto.remove = function remove(recognizer) {
    if (invokeArrayArg(recognizer, "remove", this)) {
      return this;
    }

    var targetRecognizer = this.get(recognizer); // let's make sure this recognizer exists

    if (recognizer) {
      var recognizers = this.recognizers;
      var index = inArray(recognizers, targetRecognizer);

      if (index !== -1) {
        recognizers.splice(index, 1);
        this.touchAction.update();
      }
    }

    return this;
  };
  /**
   * @private
   * bind event
   * @param {String} events
   * @param {Function} handler
   * @returns {EventEmitter} this
   */


  _proto.on = function on(events, handler) {
    if (events === undefined || handler === undefined) {
      return this;
    }

    var handlers = this.handlers;
    each(splitStr(events), function (event) {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });
    return this;
  };
  /**
   * @private unbind event, leave emit blank to remove all handlers
   * @param {String} events
   * @param {Function} [handler]
   * @returns {EventEmitter} this
   */


  _proto.off = function off(events, handler) {
    if (events === undefined) {
      return this;
    }

    var handlers = this.handlers;
    each(splitStr(events), function (event) {
      if (!handler) {
        delete handlers[event];
      } else {
        handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
      }
    });
    return this;
  };
  /**
   * @private emit event to the listeners
   * @param {String} event
   * @param {Object} data
   */


  _proto.emit = function emit(event, data) {
    // we also want to trigger dom events
    if (this.options.domEvents) {
      triggerDomEvent(event, data);
    } // no handlers, so skip it all


    var handlers = this.handlers[event] && this.handlers[event].slice();

    if (!handlers || !handlers.length) {
      return;
    }

    data.type = event;

    data.preventDefault = function () {
      data.srcEvent.preventDefault();
    };

    var i = 0;

    while (i < handlers.length) {
      handlers[i](data);
      i++;
    }
  };
  /**
   * @private
   * destroy the manager and unbinds all events
   * it doesn't unbind dom events, that is the user own responsibility
   */


  _proto.destroy = function destroy() {
    this.element && toggleCssProps(this, false);
    this.handlers = {};
    this.session = {};
    this.input.destroy();
    this.element = null;
  };

  return Manager;
}();

var SINGLE_TOUCH_INPUT_MAP = {
  touchstart: INPUT_START,
  touchmove: INPUT_MOVE,
  touchend: INPUT_END,
  touchcancel: INPUT_CANCEL
};
var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';
/**
 * @private
 * Touch events input
 * @constructor
 * @extends Input
 */

var SingleTouchInput =
/*#__PURE__*/
function (_Input) {
  _inheritsLoose(SingleTouchInput, _Input);

  function SingleTouchInput() {
    var _this;

    var proto = SingleTouchInput.prototype;
    proto.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
    proto.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
    _this = _Input.apply(this, arguments) || this;
    _this.started = false;
    return _this;
  }

  var _proto = SingleTouchInput.prototype;

  _proto.handler = function handler(ev) {
    var type = SINGLE_TOUCH_INPUT_MAP[ev.type]; // should we handle the touch events?

    if (type === INPUT_START) {
      this.started = true;
    }

    if (!this.started) {
      return;
    }

    var touches = normalizeSingleTouches.call(this, ev, type); // when done, reset the started state

    if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
      this.started = false;
    }

    this.callback(this.manager, type, {
      pointers: touches[0],
      changedPointers: touches[1],
      pointerType: INPUT_TYPE_TOUCH,
      srcEvent: ev
    });
  };

  return SingleTouchInput;
}(Input);

function normalizeSingleTouches(ev, type) {
  var all = toArray$1(ev.touches);
  var changed = toArray$1(ev.changedTouches);

  if (type & (INPUT_END | INPUT_CANCEL)) {
    all = uniqueArray(all.concat(changed), 'identifier', true);
  }

  return [all, changed];
}

/**
 * @private
 * wrap a method with a deprecation warning and stack trace
 * @param {Function} method
 * @param {String} name
 * @param {String} message
 * @returns {Function} A new function wrapping the supplied method.
 */
function deprecate(method, name, message) {
  var deprecationMessage = "DEPRECATED METHOD: " + name + "\n" + message + " AT \n";
  return function () {
    var e = new Error('get-stack-trace');
    var stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, '').replace(/^\s+at\s+/gm, '').replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') : 'Unknown Stack Trace';
    var log = window.console && (window.console.warn || window.console.log);

    if (log) {
      log.call(window.console, deprecationMessage, stack);
    }

    return method.apply(this, arguments);
  };
}

/**
 * @private
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @param {Boolean} [merge=false]
 * @returns {Object} dest
 */

var extend$1 = deprecate(function (dest, src, merge) {
  var keys = Object.keys(src);
  var i = 0;

  while (i < keys.length) {
    if (!merge || merge && dest[keys[i]] === undefined) {
      dest[keys[i]] = src[keys[i]];
    }

    i++;
  }

  return dest;
}, 'extend', 'Use `assign`.');

/**
 * @private
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */

var merge = deprecate(function (dest, src) {
  return extend$1(dest, src, true);
}, 'merge', 'Use `assign`.');

/**
 * @private
 * simple class inheritance
 * @param {Function} child
 * @param {Function} base
 * @param {Object} [properties]
 */

function inherit(child, base, properties) {
  var baseP = base.prototype;
  var childP;
  childP = child.prototype = Object.create(baseP);
  childP.constructor = child;
  childP._super = baseP;

  if (properties) {
    assign$1$1(childP, properties);
  }
}

/**
 * @private
 * simple function bind
 * @param {Function} fn
 * @param {Object} context
 * @returns {Function}
 */
function bindFn(fn, context) {
  return function boundFn() {
    return fn.apply(context, arguments);
  };
}

/**
 * @private
 * Simple way to create a manager with a default set of recognizers.
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */

var Hammer$2 =
/*#__PURE__*/
function () {
  var Hammer =
  /**
    * @private
    * @const {string}
    */
  function Hammer(element, options) {
    if (options === void 0) {
      options = {};
    }

    return new Manager(element, _extends({
      recognizers: preset.concat()
    }, options));
  };

  Hammer.VERSION = "2.0.17-rc";
  Hammer.DIRECTION_ALL = DIRECTION_ALL;
  Hammer.DIRECTION_DOWN = DIRECTION_DOWN;
  Hammer.DIRECTION_LEFT = DIRECTION_LEFT;
  Hammer.DIRECTION_RIGHT = DIRECTION_RIGHT;
  Hammer.DIRECTION_UP = DIRECTION_UP;
  Hammer.DIRECTION_HORIZONTAL = DIRECTION_HORIZONTAL;
  Hammer.DIRECTION_VERTICAL = DIRECTION_VERTICAL;
  Hammer.DIRECTION_NONE = DIRECTION_NONE;
  Hammer.DIRECTION_DOWN = DIRECTION_DOWN;
  Hammer.INPUT_START = INPUT_START;
  Hammer.INPUT_MOVE = INPUT_MOVE;
  Hammer.INPUT_END = INPUT_END;
  Hammer.INPUT_CANCEL = INPUT_CANCEL;
  Hammer.STATE_POSSIBLE = STATE_POSSIBLE;
  Hammer.STATE_BEGAN = STATE_BEGAN;
  Hammer.STATE_CHANGED = STATE_CHANGED;
  Hammer.STATE_ENDED = STATE_ENDED;
  Hammer.STATE_RECOGNIZED = STATE_RECOGNIZED;
  Hammer.STATE_CANCELLED = STATE_CANCELLED;
  Hammer.STATE_FAILED = STATE_FAILED;
  Hammer.Manager = Manager;
  Hammer.Input = Input;
  Hammer.TouchAction = TouchAction;
  Hammer.TouchInput = TouchInput;
  Hammer.MouseInput = MouseInput;
  Hammer.PointerEventInput = PointerEventInput;
  Hammer.TouchMouseInput = TouchMouseInput;
  Hammer.SingleTouchInput = SingleTouchInput;
  Hammer.Recognizer = Recognizer;
  Hammer.AttrRecognizer = AttrRecognizer;
  Hammer.Tap = TapRecognizer;
  Hammer.Pan = PanRecognizer;
  Hammer.Swipe = SwipeRecognizer;
  Hammer.Pinch = PinchRecognizer;
  Hammer.Rotate = RotateRecognizer;
  Hammer.Press = PressRecognizer;
  Hammer.on = addEventListeners;
  Hammer.off = removeEventListeners;
  Hammer.each = each;
  Hammer.merge = merge;
  Hammer.extend = extend$1;
  Hammer.bindFn = bindFn;
  Hammer.assign = assign$1$1;
  Hammer.inherit = inherit;
  Hammer.bindFn = bindFn;
  Hammer.prefixed = prefixed;
  Hammer.toArray = toArray$1;
  Hammer.inArray = inArray;
  Hammer.uniqueArray = uniqueArray;
  Hammer.splitStr = splitStr;
  Hammer.boolOrFn = boolOrFn;
  Hammer.hasParent = hasParent$1;
  Hammer.addEventListeners = addEventListeners;
  Hammer.removeEventListeners = removeEventListeners;
  Hammer.defaults = assign$1$1({}, defaults, {
    preset: preset
  });
  return Hammer;
}();

//  style loader but by script tag, not by the loader.

Hammer$2.defaults;

/**
 * Setup a mock hammer.js object, for unit testing.
 *
 * Inspiration: https://github.com/uber/deck.gl/pull/658
 * @returns {{on: noop, off: noop, destroy: noop, emit: noop, get: get}}
 */
function hammerMock() {
  const noop = () => {};
  return {
    on: noop,
    off: noop,
    destroy: noop,
    emit: noop,
    get() {
      return {
        set: noop
      };
    }
  };
}
const Hammer$1 = typeof window !== "undefined" ? window.Hammer || Hammer$2 : function () {
  // hammer.js is only available in a browser, not in node.js. Replacing it with a mock object.
  return hammerMock();
};

/**
 * Turn an element into an clickToUse element.
 * When not active, the element has a transparent overlay. When the overlay is
 * clicked, the mode is changed to active.
 * When active, the element is displayed with a blue border around it, and
 * the interactive contents of the element can be used. When clicked outside
 * the element, the elements mode is changed to inactive.
 * @param {Element} container
 * @class Activator
 */
function Activator$1(container) {
  var _context;
  this._cleanupQueue = [];
  this.active = false;
  this._dom = {
    container,
    overlay: document.createElement("div")
  };
  this._dom.overlay.classList.add("vis-overlay");
  this._dom.container.appendChild(this._dom.overlay);
  this._cleanupQueue.push(() => {
    this._dom.overlay.parentNode.removeChild(this._dom.overlay);
  });
  const hammer = Hammer$1(this._dom.overlay);
  hammer.on("tap", _bindInstanceProperty(_context = this._onTapOverlay).call(_context, this));
  this._cleanupQueue.push(() => {
    hammer.destroy();
    // FIXME: cleaning up hammer instances doesn't work (Timeline not removed
    // from memory)
  });

  // block all touch events (except tap)
  const events = ["tap", "doubletap", "press", "pinch", "pan", "panstart", "panmove", "panend"];
  _forEachInstanceProperty(events).call(events, event => {
    hammer.on(event, event => {
      event.srcEvent.stopPropagation();
    });
  });

  // attach a click event to the window, in order to deactivate when clicking outside the timeline
  if (document && document.body) {
    this._onClick = event => {
      if (!_hasParent(event.target, container)) {
        this.deactivate();
      }
    };
    document.body.addEventListener("click", this._onClick);
    this._cleanupQueue.push(() => {
      document.body.removeEventListener("click", this._onClick);
    });
  }

  // prepare escape key listener for deactivating when active
  this._escListener = event => {
    if ("key" in event ? event.key === "Escape" : event.keyCode === 27 /* the keyCode is for IE11 */) {
      this.deactivate();
    }
  };
}

// turn into an event emitter
Emitter(Activator$1.prototype);

// The currently active activator
Activator$1.current = null;

/**
 * Destroy the activator. Cleans up all created DOM and event listeners
 */
Activator$1.prototype.destroy = function () {
  this.deactivate();
  for (const callback of _reverseInstanceProperty(_context2 = _spliceInstanceProperty(_context3 = this._cleanupQueue).call(_context3, 0)).call(_context2)) {
    var _context2, _context3;
    callback();
  }
};

/**
 * Activate the element
 * Overlay is hidden, element is decorated with a blue shadow border
 */
Activator$1.prototype.activate = function () {
  // we allow only one active activator at a time
  if (Activator$1.current) {
    Activator$1.current.deactivate();
  }
  Activator$1.current = this;
  this.active = true;
  this._dom.overlay.style.display = "none";
  this._dom.container.classList.add("vis-active");
  this.emit("change");
  this.emit("activate");

  // ugly hack: bind ESC after emitting the events, as the Network rebinds all
  // keyboard events on a 'change' event
  document.body.addEventListener("keydown", this._escListener);
};

/**
 * Deactivate the element
 * Overlay is displayed on top of the element
 */
Activator$1.prototype.deactivate = function () {
  this.active = false;
  this._dom.overlay.style.display = "block";
  this._dom.container.classList.remove("vis-active");
  document.body.removeEventListener("keydown", this._escListener);
  this.emit("change");
  this.emit("deactivate");
};

/**
 * Handle a tap event: activate the container
 * @param {Event}  event   The event
 * @private
 */
Activator$1.prototype._onTapOverlay = function (event) {
  // activate the container
  this.activate();
  event.srcEvent.stopPropagation();
};

/**
 * Test whether the element has the requested parent element somewhere in
 * its chain of parent nodes.
 * @param {HTMLElement} element
 * @param {HTMLElement} parent
 * @returns {boolean} Returns true when the parent is found somewhere in the
 *                    chain of parent nodes.
 * @private
 */
function _hasParent(element, parent) {
  while (element) {
    if (element === parent) {
      return true;
    }
    element = element.parentNode;
  }
  return false;
}

var es_date_toJson = {};

var stringRepeat;
var hasRequiredStringRepeat;

function requireStringRepeat () {
	if (hasRequiredStringRepeat) return stringRepeat;
	hasRequiredStringRepeat = 1;
	var toIntegerOrInfinity = /*@__PURE__*/ requireToIntegerOrInfinity();
	var toString = /*@__PURE__*/ requireToString();
	var requireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();

	var $RangeError = RangeError;

	// `String.prototype.repeat` method implementation
	// https://tc39.es/ecma262/#sec-string.prototype.repeat
	stringRepeat = function repeat(count) {
	  var str = toString(requireObjectCoercible(this));
	  var result = '';
	  var n = toIntegerOrInfinity(count);
	  if (n < 0 || n === Infinity) throw new $RangeError('Wrong number of repetitions');
	  for (;n > 0; (n >>>= 1) && (str += str)) if (n & 1) result += str;
	  return result;
	};
	return stringRepeat;
}

var stringPad;
var hasRequiredStringPad;

function requireStringPad () {
	if (hasRequiredStringPad) return stringPad;
	hasRequiredStringPad = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var toLength = /*@__PURE__*/ requireToLength();
	var toString = /*@__PURE__*/ requireToString();
	var $repeat = /*@__PURE__*/ requireStringRepeat();
	var requireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();

	var repeat = uncurryThis($repeat);
	var stringSlice = uncurryThis(''.slice);
	var ceil = Math.ceil;

	// `String.prototype.{ padStart, padEnd }` methods implementation
	var createMethod = function (IS_END) {
	  return function ($this, maxLength, fillString) {
	    var S = toString(requireObjectCoercible($this));
	    var intMaxLength = toLength(maxLength);
	    var stringLength = S.length;
	    var fillStr = fillString === undefined ? ' ' : toString(fillString);
	    var fillLen, stringFiller;
	    if (intMaxLength <= stringLength || fillStr === '') return S;
	    fillLen = intMaxLength - stringLength;
	    stringFiller = repeat(fillStr, ceil(fillLen / fillStr.length));
	    if (stringFiller.length > fillLen) stringFiller = stringSlice(stringFiller, 0, fillLen);
	    return IS_END ? S + stringFiller : stringFiller + S;
	  };
	};

	stringPad = {
	  // `String.prototype.padStart` method
	  // https://tc39.es/ecma262/#sec-string.prototype.padstart
	  start: createMethod(false),
	  // `String.prototype.padEnd` method
	  // https://tc39.es/ecma262/#sec-string.prototype.padend
	  end: createMethod(true)
	};
	return stringPad;
}

var dateToIsoString;
var hasRequiredDateToIsoString;

function requireDateToIsoString () {
	if (hasRequiredDateToIsoString) return dateToIsoString;
	hasRequiredDateToIsoString = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var fails = /*@__PURE__*/ requireFails();
	var padStart = /*@__PURE__*/ requireStringPad().start;

	var $RangeError = RangeError;
	var $isFinite = isFinite;
	var abs = Math.abs;
	var DatePrototype = Date.prototype;
	var nativeDateToISOString = DatePrototype.toISOString;
	var thisTimeValue = uncurryThis(DatePrototype.getTime);
	var getUTCDate = uncurryThis(DatePrototype.getUTCDate);
	var getUTCFullYear = uncurryThis(DatePrototype.getUTCFullYear);
	var getUTCHours = uncurryThis(DatePrototype.getUTCHours);
	var getUTCMilliseconds = uncurryThis(DatePrototype.getUTCMilliseconds);
	var getUTCMinutes = uncurryThis(DatePrototype.getUTCMinutes);
	var getUTCMonth = uncurryThis(DatePrototype.getUTCMonth);
	var getUTCSeconds = uncurryThis(DatePrototype.getUTCSeconds);

	// `Date.prototype.toISOString` method implementation
	// https://tc39.es/ecma262/#sec-date.prototype.toisostring
	// PhantomJS / old WebKit fails here:
	dateToIsoString = (fails(function () {
	  return nativeDateToISOString.call(new Date(-5e13 - 1)) !== '0385-07-25T07:06:39.999Z';
	}) || !fails(function () {
	  nativeDateToISOString.call(new Date(NaN));
	})) ? function toISOString() {
	  if (!$isFinite(thisTimeValue(this))) throw new $RangeError('Invalid time value');
	  var date = this;
	  var year = getUTCFullYear(date);
	  var milliseconds = getUTCMilliseconds(date);
	  var sign = year < 0 ? '-' : year > 9999 ? '+' : '';
	  return sign + padStart(abs(year), sign ? 6 : 4, 0) +
	    '-' + padStart(getUTCMonth(date) + 1, 2, 0) +
	    '-' + padStart(getUTCDate(date), 2, 0) +
	    'T' + padStart(getUTCHours(date), 2, 0) +
	    ':' + padStart(getUTCMinutes(date), 2, 0) +
	    ':' + padStart(getUTCSeconds(date), 2, 0) +
	    '.' + padStart(milliseconds, 3, 0) +
	    'Z';
	} : nativeDateToISOString;
	return dateToIsoString;
}

var hasRequiredEs_date_toJson;

function requireEs_date_toJson () {
	if (hasRequiredEs_date_toJson) return es_date_toJson;
	hasRequiredEs_date_toJson = 1;
	var $ = /*@__PURE__*/ require_export();
	var call = /*@__PURE__*/ requireFunctionCall();
	var toObject = /*@__PURE__*/ requireToObject();
	var toPrimitive = /*@__PURE__*/ requireToPrimitive();
	var toISOString = /*@__PURE__*/ requireDateToIsoString();
	var classof = /*@__PURE__*/ requireClassofRaw();
	var fails = /*@__PURE__*/ requireFails();

	var FORCED = fails(function () {
	  return new Date(NaN).toJSON() !== null
	    || call(Date.prototype.toJSON, { toISOString: function () { return 1; } }) !== 1;
	});

	// `Date.prototype.toJSON` method
	// https://tc39.es/ecma262/#sec-date.prototype.tojson
	$({ target: 'Date', proto: true, forced: FORCED }, {
	  // eslint-disable-next-line no-unused-vars -- required for `.length`
	  toJSON: function toJSON(key) {
	    var O = toObject(this);
	    var pv = toPrimitive(O, 'number');
	    return typeof pv == 'number' && !isFinite(pv) ? null :
	      (!('toISOString' in O) && classof(O) === 'Date') ? call(toISOString, O) : O.toISOString();
	  }
	});
	return es_date_toJson;
}

var stringify$2;
var hasRequiredStringify$2;

function requireStringify$2 () {
	if (hasRequiredStringify$2) return stringify$2;
	hasRequiredStringify$2 = 1;
	requireEs_date_toJson();
	requireEs_json_stringify();
	var path = /*@__PURE__*/ requirePath();
	var apply = /*@__PURE__*/ requireFunctionApply();

	// eslint-disable-next-line es/no-json -- safe
	if (!path.JSON) path.JSON = { stringify: JSON.stringify };

	// eslint-disable-next-line no-unused-vars -- required for `.length`
	stringify$2 = function stringify(it, replacer, space) {
	  return apply(path.JSON.stringify, null, arguments);
	};
	return stringify$2;
}

var stringify$1;
var hasRequiredStringify$1;

function requireStringify$1 () {
	if (hasRequiredStringify$1) return stringify$1;
	hasRequiredStringify$1 = 1;
	var parent = /*@__PURE__*/ requireStringify$2();

	stringify$1 = parent;
	return stringify$1;
}

var stringify;
var hasRequiredStringify;

function requireStringify () {
	if (hasRequiredStringify) return stringify;
	hasRequiredStringify = 1;
	stringify = /*@__PURE__*/ requireStringify$1();
	return stringify;
}

var stringifyExports = requireStringify();
var _JSON$stringify = /*@__PURE__*/getDefaultExportFromCjs(stringifyExports);

var es_object_assign = {};

var objectAssign;
var hasRequiredObjectAssign;

function requireObjectAssign () {
	if (hasRequiredObjectAssign) return objectAssign;
	hasRequiredObjectAssign = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var call = /*@__PURE__*/ requireFunctionCall();
	var fails = /*@__PURE__*/ requireFails();
	var objectKeys = /*@__PURE__*/ requireObjectKeys();
	var getOwnPropertySymbolsModule = /*@__PURE__*/ requireObjectGetOwnPropertySymbols();
	var propertyIsEnumerableModule = /*@__PURE__*/ requireObjectPropertyIsEnumerable();
	var toObject = /*@__PURE__*/ requireToObject();
	var IndexedObject = /*@__PURE__*/ requireIndexedObject();

	// eslint-disable-next-line es/no-object-assign -- safe
	var $assign = Object.assign;
	// eslint-disable-next-line es/no-object-defineproperty -- required for testing
	var defineProperty = Object.defineProperty;
	var concat = uncurryThis([].concat);

	// `Object.assign` method
	// https://tc39.es/ecma262/#sec-object.assign
	objectAssign = !$assign || fails(function () {
	  // should have correct order of operations (Edge bug)
	  if (DESCRIPTORS && $assign({ b: 1 }, $assign(defineProperty({}, 'a', {
	    enumerable: true,
	    get: function () {
	      defineProperty(this, 'b', {
	        value: 3,
	        enumerable: false
	      });
	    }
	  }), { b: 2 })).b !== 1) return true;
	  // should work with symbols and should have deterministic property order (V8 bug)
	  var A = {};
	  var B = {};
	  // eslint-disable-next-line es/no-symbol -- safe
	  var symbol = Symbol('assign detection');
	  var alphabet = 'abcdefghijklmnopqrst';
	  A[symbol] = 7;
	  // eslint-disable-next-line es/no-array-prototype-foreach -- safe
	  alphabet.split('').forEach(function (chr) { B[chr] = chr; });
	  return $assign({}, A)[symbol] !== 7 || objectKeys($assign({}, B)).join('') !== alphabet;
	}) ? function assign(target, source) { // eslint-disable-line no-unused-vars -- required for `.length`
	  var T = toObject(target);
	  var argumentsLength = arguments.length;
	  var index = 1;
	  var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
	  var propertyIsEnumerable = propertyIsEnumerableModule.f;
	  while (argumentsLength > index) {
	    var S = IndexedObject(arguments[index++]);
	    var keys = getOwnPropertySymbols ? concat(objectKeys(S), getOwnPropertySymbols(S)) : objectKeys(S);
	    var length = keys.length;
	    var j = 0;
	    var key;
	    while (length > j) {
	      key = keys[j++];
	      if (!DESCRIPTORS || call(propertyIsEnumerable, S, key)) T[key] = S[key];
	    }
	  } return T;
	} : $assign;
	return objectAssign;
}

var hasRequiredEs_object_assign;

function requireEs_object_assign () {
	if (hasRequiredEs_object_assign) return es_object_assign;
	hasRequiredEs_object_assign = 1;
	var $ = /*@__PURE__*/ require_export();
	var assign = /*@__PURE__*/ requireObjectAssign();

	// `Object.assign` method
	// https://tc39.es/ecma262/#sec-object.assign
	// eslint-disable-next-line es/no-object-assign -- required for testing
	$({ target: 'Object', stat: true, arity: 2, forced: Object.assign !== assign }, {
	  assign: assign
	});
	return es_object_assign;
}

var assign$2;
var hasRequiredAssign$2;

function requireAssign$2 () {
	if (hasRequiredAssign$2) return assign$2;
	hasRequiredAssign$2 = 1;
	requireEs_object_assign();
	var path = /*@__PURE__*/ requirePath();

	assign$2 = path.Object.assign;
	return assign$2;
}

var assign$1;
var hasRequiredAssign$1;

function requireAssign$1 () {
	if (hasRequiredAssign$1) return assign$1;
	hasRequiredAssign$1 = 1;
	var parent = /*@__PURE__*/ requireAssign$2();

	assign$1 = parent;
	return assign$1;
}

var assign;
var hasRequiredAssign;

function requireAssign () {
	if (hasRequiredAssign) return assign;
	hasRequiredAssign = 1;
	assign = /*@__PURE__*/ requireAssign$1();
	return assign;
}

var assignExports = requireAssign();
var _Object$assign = /*@__PURE__*/getDefaultExportFromCjs(assignExports);

var web_timers = {};

var web_setInterval = {};

var environment;
var hasRequiredEnvironment;

function requireEnvironment () {
	if (hasRequiredEnvironment) return environment;
	hasRequiredEnvironment = 1;
	/* global Bun, Deno -- detection */
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var userAgent = /*@__PURE__*/ requireEnvironmentUserAgent();
	var classof = /*@__PURE__*/ requireClassofRaw();

	var userAgentStartsWith = function (string) {
	  return userAgent.slice(0, string.length) === string;
	};

	environment = (function () {
	  if (userAgentStartsWith('Bun/')) return 'BUN';
	  if (userAgentStartsWith('Cloudflare-Workers')) return 'CLOUDFLARE';
	  if (userAgentStartsWith('Deno/')) return 'DENO';
	  if (userAgentStartsWith('Node.js/')) return 'NODE';
	  if (globalThis.Bun && typeof Bun.version == 'string') return 'BUN';
	  if (globalThis.Deno && typeof Deno.version == 'object') return 'DENO';
	  if (classof(globalThis.process) === 'process') return 'NODE';
	  if (globalThis.window && globalThis.document) return 'BROWSER';
	  return 'REST';
	})();
	return environment;
}

var validateArgumentsLength;
var hasRequiredValidateArgumentsLength;

function requireValidateArgumentsLength () {
	if (hasRequiredValidateArgumentsLength) return validateArgumentsLength;
	hasRequiredValidateArgumentsLength = 1;
	var $TypeError = TypeError;

	validateArgumentsLength = function (passed, required) {
	  if (passed < required) throw new $TypeError('Not enough arguments');
	  return passed;
	};
	return validateArgumentsLength;
}

var schedulersFix;
var hasRequiredSchedulersFix;

function requireSchedulersFix () {
	if (hasRequiredSchedulersFix) return schedulersFix;
	hasRequiredSchedulersFix = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var apply = /*@__PURE__*/ requireFunctionApply();
	var isCallable = /*@__PURE__*/ requireIsCallable();
	var ENVIRONMENT = /*@__PURE__*/ requireEnvironment();
	var USER_AGENT = /*@__PURE__*/ requireEnvironmentUserAgent();
	var arraySlice = /*@__PURE__*/ requireArraySlice();
	var validateArgumentsLength = /*@__PURE__*/ requireValidateArgumentsLength();

	var Function = globalThis.Function;
	// dirty IE9- and Bun 0.3.0- checks
	var WRAP = /MSIE .\./.test(USER_AGENT) || ENVIRONMENT === 'BUN' && (function () {
	  var version = globalThis.Bun.version.split('.');
	  return version.length < 3 || version[0] === '0' && (version[1] < 3 || version[1] === '3' && version[2] === '0');
	})();

	// IE9- / Bun 0.3.0- setTimeout / setInterval / setImmediate additional parameters fix
	// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers
	// https://github.com/oven-sh/bun/issues/1633
	schedulersFix = function (scheduler, hasTimeArg) {
	  var firstParamIndex = hasTimeArg ? 2 : 1;
	  return WRAP ? function (handler, timeout /* , ...arguments */) {
	    var boundArgs = validateArgumentsLength(arguments.length, 1) > firstParamIndex;
	    var fn = isCallable(handler) ? handler : Function(handler);
	    var params = boundArgs ? arraySlice(arguments, firstParamIndex) : [];
	    var callback = boundArgs ? function () {
	      apply(fn, this, params);
	    } : fn;
	    return hasTimeArg ? scheduler(callback, timeout) : scheduler(callback);
	  } : scheduler;
	};
	return schedulersFix;
}

var hasRequiredWeb_setInterval;

function requireWeb_setInterval () {
	if (hasRequiredWeb_setInterval) return web_setInterval;
	hasRequiredWeb_setInterval = 1;
	var $ = /*@__PURE__*/ require_export();
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var schedulersFix = /*@__PURE__*/ requireSchedulersFix();

	var setInterval = schedulersFix(globalThis.setInterval, true);

	// Bun / IE9- setInterval additional parameters fix
	// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-setinterval
	$({ global: true, bind: true, forced: globalThis.setInterval !== setInterval }, {
	  setInterval: setInterval
	});
	return web_setInterval;
}

var web_setTimeout = {};

var hasRequiredWeb_setTimeout;

function requireWeb_setTimeout () {
	if (hasRequiredWeb_setTimeout) return web_setTimeout;
	hasRequiredWeb_setTimeout = 1;
	var $ = /*@__PURE__*/ require_export();
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var schedulersFix = /*@__PURE__*/ requireSchedulersFix();

	var setTimeout = schedulersFix(globalThis.setTimeout, true);

	// Bun / IE9- setTimeout additional parameters fix
	// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-settimeout
	$({ global: true, bind: true, forced: globalThis.setTimeout !== setTimeout }, {
	  setTimeout: setTimeout
	});
	return web_setTimeout;
}

var hasRequiredWeb_timers;

function requireWeb_timers () {
	if (hasRequiredWeb_timers) return web_timers;
	hasRequiredWeb_timers = 1;
	// TODO: Remove this module from `core-js@4` since it's split to modules listed below
	requireWeb_setInterval();
	requireWeb_setTimeout();
	return web_timers;
}

var setTimeout$2;
var hasRequiredSetTimeout$1;

function requireSetTimeout$1 () {
	if (hasRequiredSetTimeout$1) return setTimeout$2;
	hasRequiredSetTimeout$1 = 1;
	requireWeb_timers();
	var path = /*@__PURE__*/ requirePath();

	setTimeout$2 = path.setTimeout;
	return setTimeout$2;
}

var setTimeout$1;
var hasRequiredSetTimeout;

function requireSetTimeout () {
	if (hasRequiredSetTimeout) return setTimeout$1;
	hasRequiredSetTimeout = 1;
	setTimeout$1 = /*@__PURE__*/ requireSetTimeout$1();
	return setTimeout$1;
}

var setTimeoutExports = requireSetTimeout();
var _setTimeout = /*@__PURE__*/getDefaultExportFromCjs(setTimeoutExports);

var es_array_fill = {};

var arrayFill;
var hasRequiredArrayFill;

function requireArrayFill () {
	if (hasRequiredArrayFill) return arrayFill;
	hasRequiredArrayFill = 1;
	var toObject = /*@__PURE__*/ requireToObject();
	var toAbsoluteIndex = /*@__PURE__*/ requireToAbsoluteIndex();
	var lengthOfArrayLike = /*@__PURE__*/ requireLengthOfArrayLike();

	// `Array.prototype.fill` method implementation
	// https://tc39.es/ecma262/#sec-array.prototype.fill
	arrayFill = function fill(value /* , start = 0, end = @length */) {
	  var O = toObject(this);
	  var length = lengthOfArrayLike(O);
	  var argumentsLength = arguments.length;
	  var index = toAbsoluteIndex(argumentsLength > 1 ? arguments[1] : undefined, length);
	  var end = argumentsLength > 2 ? arguments[2] : undefined;
	  var endPos = end === undefined ? length : toAbsoluteIndex(end, length);
	  while (endPos > index) O[index++] = value;
	  return O;
	};
	return arrayFill;
}

var hasRequiredEs_array_fill;

function requireEs_array_fill () {
	if (hasRequiredEs_array_fill) return es_array_fill;
	hasRequiredEs_array_fill = 1;
	var $ = /*@__PURE__*/ require_export();
	var fill = /*@__PURE__*/ requireArrayFill();
	var addToUnscopables = /*@__PURE__*/ requireAddToUnscopables();

	// `Array.prototype.fill` method
	// https://tc39.es/ecma262/#sec-array.prototype.fill
	$({ target: 'Array', proto: true }, {
	  fill: fill
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables('fill');
	return es_array_fill;
}

var fill$3;
var hasRequiredFill$3;

function requireFill$3 () {
	if (hasRequiredFill$3) return fill$3;
	hasRequiredFill$3 = 1;
	requireEs_array_fill();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	fill$3 = getBuiltInPrototypeMethod('Array', 'fill');
	return fill$3;
}

var fill$2;
var hasRequiredFill$2;

function requireFill$2 () {
	if (hasRequiredFill$2) return fill$2;
	hasRequiredFill$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireFill$3();

	var ArrayPrototype = Array.prototype;

	fill$2 = function (it) {
	  var own = it.fill;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.fill) ? method : own;
	};
	return fill$2;
}

var fill$1;
var hasRequiredFill$1;

function requireFill$1 () {
	if (hasRequiredFill$1) return fill$1;
	hasRequiredFill$1 = 1;
	var parent = /*@__PURE__*/ requireFill$2();

	fill$1 = parent;
	return fill$1;
}

var fill;
var hasRequiredFill;

function requireFill () {
	if (hasRequiredFill) return fill;
	hasRequiredFill = 1;
	fill = /*@__PURE__*/ requireFill$1();
	return fill;
}

var fillExports = requireFill();
var _fillInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(fillExports);

var es_array_includes = {};

var hasRequiredEs_array_includes;

function requireEs_array_includes () {
	if (hasRequiredEs_array_includes) return es_array_includes;
	hasRequiredEs_array_includes = 1;
	var $ = /*@__PURE__*/ require_export();
	var $includes = /*@__PURE__*/ requireArrayIncludes().includes;
	var fails = /*@__PURE__*/ requireFails();
	var addToUnscopables = /*@__PURE__*/ requireAddToUnscopables();

	// FF99+ bug
	var BROKEN_ON_SPARSE = fails(function () {
	  // eslint-disable-next-line es/no-array-prototype-includes -- detection
	  return !Array(1).includes();
	});

	// `Array.prototype.includes` method
	// https://tc39.es/ecma262/#sec-array.prototype.includes
	$({ target: 'Array', proto: true, forced: BROKEN_ON_SPARSE }, {
	  includes: function includes(el /* , fromIndex = 0 */) {
	    return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});

	// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
	addToUnscopables('includes');
	return es_array_includes;
}

var includes$4;
var hasRequiredIncludes$4;

function requireIncludes$4 () {
	if (hasRequiredIncludes$4) return includes$4;
	hasRequiredIncludes$4 = 1;
	requireEs_array_includes();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	includes$4 = getBuiltInPrototypeMethod('Array', 'includes');
	return includes$4;
}

var es_string_includes = {};

var isRegexp;
var hasRequiredIsRegexp;

function requireIsRegexp () {
	if (hasRequiredIsRegexp) return isRegexp;
	hasRequiredIsRegexp = 1;
	var isObject = /*@__PURE__*/ requireIsObject();
	var classof = /*@__PURE__*/ requireClassofRaw();
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	var MATCH = wellKnownSymbol('match');

	// `IsRegExp` abstract operation
	// https://tc39.es/ecma262/#sec-isregexp
	isRegexp = function (it) {
	  var isRegExp;
	  return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : classof(it) === 'RegExp');
	};
	return isRegexp;
}

var notARegexp;
var hasRequiredNotARegexp;

function requireNotARegexp () {
	if (hasRequiredNotARegexp) return notARegexp;
	hasRequiredNotARegexp = 1;
	var isRegExp = /*@__PURE__*/ requireIsRegexp();

	var $TypeError = TypeError;

	notARegexp = function (it) {
	  if (isRegExp(it)) {
	    throw new $TypeError("The method doesn't accept regular expressions");
	  } return it;
	};
	return notARegexp;
}

var correctIsRegexpLogic;
var hasRequiredCorrectIsRegexpLogic;

function requireCorrectIsRegexpLogic () {
	if (hasRequiredCorrectIsRegexpLogic) return correctIsRegexpLogic;
	hasRequiredCorrectIsRegexpLogic = 1;
	var wellKnownSymbol = /*@__PURE__*/ requireWellKnownSymbol();

	var MATCH = wellKnownSymbol('match');

	correctIsRegexpLogic = function (METHOD_NAME) {
	  var regexp = /./;
	  try {
	    '/./'[METHOD_NAME](regexp);
	  } catch (error1) {
	    try {
	      regexp[MATCH] = false;
	      return '/./'[METHOD_NAME](regexp);
	    } catch (error2) { /* empty */ }
	  } return false;
	};
	return correctIsRegexpLogic;
}

var hasRequiredEs_string_includes;

function requireEs_string_includes () {
	if (hasRequiredEs_string_includes) return es_string_includes;
	hasRequiredEs_string_includes = 1;
	var $ = /*@__PURE__*/ require_export();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var notARegExp = /*@__PURE__*/ requireNotARegexp();
	var requireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();
	var toString = /*@__PURE__*/ requireToString();
	var correctIsRegExpLogic = /*@__PURE__*/ requireCorrectIsRegexpLogic();

	var stringIndexOf = uncurryThis(''.indexOf);

	// `String.prototype.includes` method
	// https://tc39.es/ecma262/#sec-string.prototype.includes
	$({ target: 'String', proto: true, forced: !correctIsRegExpLogic('includes') }, {
	  includes: function includes(searchString /* , position = 0 */) {
	    return !!~stringIndexOf(
	      toString(requireObjectCoercible(this)),
	      toString(notARegExp(searchString)),
	      arguments.length > 1 ? arguments[1] : undefined
	    );
	  }
	});
	return es_string_includes;
}

var includes$3;
var hasRequiredIncludes$3;

function requireIncludes$3 () {
	if (hasRequiredIncludes$3) return includes$3;
	hasRequiredIncludes$3 = 1;
	requireEs_string_includes();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	includes$3 = getBuiltInPrototypeMethod('String', 'includes');
	return includes$3;
}

var includes$2;
var hasRequiredIncludes$2;

function requireIncludes$2 () {
	if (hasRequiredIncludes$2) return includes$2;
	hasRequiredIncludes$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var arrayMethod = /*@__PURE__*/ requireIncludes$4();
	var stringMethod = /*@__PURE__*/ requireIncludes$3();

	var ArrayPrototype = Array.prototype;
	var StringPrototype = String.prototype;

	includes$2 = function (it) {
	  var own = it.includes;
	  if (it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.includes)) return arrayMethod;
	  if (typeof it == 'string' || it === StringPrototype || (isPrototypeOf(StringPrototype, it) && own === StringPrototype.includes)) {
	    return stringMethod;
	  } return own;
	};
	return includes$2;
}

var includes$1;
var hasRequiredIncludes$1;

function requireIncludes$1 () {
	if (hasRequiredIncludes$1) return includes$1;
	hasRequiredIncludes$1 = 1;
	var parent = /*@__PURE__*/ requireIncludes$2();

	includes$1 = parent;
	return includes$1;
}

var includes;
var hasRequiredIncludes;

function requireIncludes () {
	if (hasRequiredIncludes) return includes;
	hasRequiredIncludes = 1;
	includes = /*@__PURE__*/ requireIncludes$1();
	return includes;
}

var includesExports = requireIncludes();
var _includesInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(includesExports);

var es_object_getPrototypeOf = {};

var hasRequiredEs_object_getPrototypeOf;

function requireEs_object_getPrototypeOf () {
	if (hasRequiredEs_object_getPrototypeOf) return es_object_getPrototypeOf;
	hasRequiredEs_object_getPrototypeOf = 1;
	var $ = /*@__PURE__*/ require_export();
	var fails = /*@__PURE__*/ requireFails();
	var toObject = /*@__PURE__*/ requireToObject();
	var nativeGetPrototypeOf = /*@__PURE__*/ requireObjectGetPrototypeOf();
	var CORRECT_PROTOTYPE_GETTER = /*@__PURE__*/ requireCorrectPrototypeGetter();

	var FAILS_ON_PRIMITIVES = fails(function () { nativeGetPrototypeOf(1); });

	// `Object.getPrototypeOf` method
	// https://tc39.es/ecma262/#sec-object.getprototypeof
	$({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES, sham: !CORRECT_PROTOTYPE_GETTER }, {
	  getPrototypeOf: function getPrototypeOf(it) {
	    return nativeGetPrototypeOf(toObject(it));
	  }
	});
	return es_object_getPrototypeOf;
}

var getPrototypeOf$2;
var hasRequiredGetPrototypeOf$2;

function requireGetPrototypeOf$2 () {
	if (hasRequiredGetPrototypeOf$2) return getPrototypeOf$2;
	hasRequiredGetPrototypeOf$2 = 1;
	requireEs_object_getPrototypeOf();
	var path = /*@__PURE__*/ requirePath();

	getPrototypeOf$2 = path.Object.getPrototypeOf;
	return getPrototypeOf$2;
}

var getPrototypeOf$1;
var hasRequiredGetPrototypeOf$1;

function requireGetPrototypeOf$1 () {
	if (hasRequiredGetPrototypeOf$1) return getPrototypeOf$1;
	hasRequiredGetPrototypeOf$1 = 1;
	var parent = /*@__PURE__*/ requireGetPrototypeOf$2();

	getPrototypeOf$1 = parent;
	return getPrototypeOf$1;
}

var getPrototypeOf;
var hasRequiredGetPrototypeOf;

function requireGetPrototypeOf () {
	if (hasRequiredGetPrototypeOf) return getPrototypeOf;
	hasRequiredGetPrototypeOf = 1;
	getPrototypeOf = /*@__PURE__*/ requireGetPrototypeOf$1();
	return getPrototypeOf;
}

var getPrototypeOfExports = requireGetPrototypeOf();
var _Object$getPrototypeOf = /*@__PURE__*/getDefaultExportFromCjs(getPrototypeOfExports);

var concat$3;
var hasRequiredConcat$3;

function requireConcat$3 () {
	if (hasRequiredConcat$3) return concat$3;
	hasRequiredConcat$3 = 1;
	requireEs_array_concat();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	concat$3 = getBuiltInPrototypeMethod('Array', 'concat');
	return concat$3;
}

var concat$2;
var hasRequiredConcat$2;

function requireConcat$2 () {
	if (hasRequiredConcat$2) return concat$2;
	hasRequiredConcat$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireConcat$3();

	var ArrayPrototype = Array.prototype;

	concat$2 = function (it) {
	  var own = it.concat;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.concat) ? method : own;
	};
	return concat$2;
}

var concat$1;
var hasRequiredConcat$1;

function requireConcat$1 () {
	if (hasRequiredConcat$1) return concat$1;
	hasRequiredConcat$1 = 1;
	var parent = /*@__PURE__*/ requireConcat$2();

	concat$1 = parent;
	return concat$1;
}

var concat;
var hasRequiredConcat;

function requireConcat () {
	if (hasRequiredConcat) return concat;
	hasRequiredConcat = 1;
	concat = /*@__PURE__*/ requireConcat$1();
	return concat;
}

var concatExports = requireConcat();
var _concatInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(concatExports);

var es_array_filter = {};

var hasRequiredEs_array_filter;

function requireEs_array_filter () {
	if (hasRequiredEs_array_filter) return es_array_filter;
	hasRequiredEs_array_filter = 1;
	var $ = /*@__PURE__*/ require_export();
	var $filter = /*@__PURE__*/ requireArrayIteration().filter;
	var arrayMethodHasSpeciesSupport = /*@__PURE__*/ requireArrayMethodHasSpeciesSupport();

	var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('filter');

	// `Array.prototype.filter` method
	// https://tc39.es/ecma262/#sec-array.prototype.filter
	// with adding support of @@species
	$({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
	  filter: function filter(callbackfn /* , thisArg */) {
	    return $filter(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
	  }
	});
	return es_array_filter;
}

var filter$3;
var hasRequiredFilter$3;

function requireFilter$3 () {
	if (hasRequiredFilter$3) return filter$3;
	hasRequiredFilter$3 = 1;
	requireEs_array_filter();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	filter$3 = getBuiltInPrototypeMethod('Array', 'filter');
	return filter$3;
}

var filter$2;
var hasRequiredFilter$2;

function requireFilter$2 () {
	if (hasRequiredFilter$2) return filter$2;
	hasRequiredFilter$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireFilter$3();

	var ArrayPrototype = Array.prototype;

	filter$2 = function (it) {
	  var own = it.filter;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.filter) ? method : own;
	};
	return filter$2;
}

var filter$1;
var hasRequiredFilter$1;

function requireFilter$1 () {
	if (hasRequiredFilter$1) return filter$1;
	hasRequiredFilter$1 = 1;
	var parent = /*@__PURE__*/ requireFilter$2();

	filter$1 = parent;
	return filter$1;
}

var filter;
var hasRequiredFilter;

function requireFilter () {
	if (hasRequiredFilter) return filter;
	hasRequiredFilter = 1;
	filter = /*@__PURE__*/ requireFilter$1();
	return filter;
}

var filterExports = requireFilter();
var _filterInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(filterExports);

var es_object_values = {};

var objectToArray;
var hasRequiredObjectToArray;

function requireObjectToArray () {
	if (hasRequiredObjectToArray) return objectToArray;
	hasRequiredObjectToArray = 1;
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var fails = /*@__PURE__*/ requireFails();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var objectGetPrototypeOf = /*@__PURE__*/ requireObjectGetPrototypeOf();
	var objectKeys = /*@__PURE__*/ requireObjectKeys();
	var toIndexedObject = /*@__PURE__*/ requireToIndexedObject();
	var $propertyIsEnumerable = /*@__PURE__*/ requireObjectPropertyIsEnumerable().f;

	var propertyIsEnumerable = uncurryThis($propertyIsEnumerable);
	var push = uncurryThis([].push);

	// in some IE versions, `propertyIsEnumerable` returns incorrect result on integer keys
	// of `null` prototype objects
	var IE_BUG = DESCRIPTORS && fails(function () {
	  // eslint-disable-next-line es/no-object-create -- safe
	  var O = Object.create(null);
	  O[2] = 2;
	  return !propertyIsEnumerable(O, 2);
	});

	// `Object.{ entries, values }` methods implementation
	var createMethod = function (TO_ENTRIES) {
	  return function (it) {
	    var O = toIndexedObject(it);
	    var keys = objectKeys(O);
	    var IE_WORKAROUND = IE_BUG && objectGetPrototypeOf(O) === null;
	    var length = keys.length;
	    var i = 0;
	    var result = [];
	    var key;
	    while (length > i) {
	      key = keys[i++];
	      if (!DESCRIPTORS || (IE_WORKAROUND ? key in O : propertyIsEnumerable(O, key))) {
	        push(result, TO_ENTRIES ? [key, O[key]] : O[key]);
	      }
	    }
	    return result;
	  };
	};

	objectToArray = {
	  // `Object.entries` method
	  // https://tc39.es/ecma262/#sec-object.entries
	  entries: createMethod(true),
	  // `Object.values` method
	  // https://tc39.es/ecma262/#sec-object.values
	  values: createMethod(false)
	};
	return objectToArray;
}

var hasRequiredEs_object_values;

function requireEs_object_values () {
	if (hasRequiredEs_object_values) return es_object_values;
	hasRequiredEs_object_values = 1;
	var $ = /*@__PURE__*/ require_export();
	var $values = /*@__PURE__*/ requireObjectToArray().values;

	// `Object.values` method
	// https://tc39.es/ecma262/#sec-object.values
	$({ target: 'Object', stat: true }, {
	  values: function values(O) {
	    return $values(O);
	  }
	});
	return es_object_values;
}

var values$2;
var hasRequiredValues$2;

function requireValues$2 () {
	if (hasRequiredValues$2) return values$2;
	hasRequiredValues$2 = 1;
	requireEs_object_values();
	var path = /*@__PURE__*/ requirePath();

	values$2 = path.Object.values;
	return values$2;
}

var values$1;
var hasRequiredValues$1;

function requireValues$1 () {
	if (hasRequiredValues$1) return values$1;
	hasRequiredValues$1 = 1;
	var parent = /*@__PURE__*/ requireValues$2();

	values$1 = parent;
	return values$1;
}

var values;
var hasRequiredValues;

function requireValues () {
	if (hasRequiredValues) return values;
	hasRequiredValues = 1;
	values = /*@__PURE__*/ requireValues$1();
	return values;
}

var valuesExports = requireValues();
var _Object$values = /*@__PURE__*/getDefaultExportFromCjs(valuesExports);

var es_parseInt = {};

var whitespaces;
var hasRequiredWhitespaces;

function requireWhitespaces () {
	if (hasRequiredWhitespaces) return whitespaces;
	hasRequiredWhitespaces = 1;
	// a string of all valid unicode whitespaces
	whitespaces = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002' +
	  '\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';
	return whitespaces;
}

var stringTrim;
var hasRequiredStringTrim;

function requireStringTrim () {
	if (hasRequiredStringTrim) return stringTrim;
	hasRequiredStringTrim = 1;
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var requireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();
	var toString = /*@__PURE__*/ requireToString();
	var whitespaces = /*@__PURE__*/ requireWhitespaces();

	var replace = uncurryThis(''.replace);
	var ltrim = RegExp('^[' + whitespaces + ']+');
	var rtrim = RegExp('(^|[^' + whitespaces + '])[' + whitespaces + ']+$');

	// `String.prototype.{ trim, trimStart, trimEnd, trimLeft, trimRight }` methods implementation
	var createMethod = function (TYPE) {
	  return function ($this) {
	    var string = toString(requireObjectCoercible($this));
	    if (TYPE & 1) string = replace(string, ltrim, '');
	    if (TYPE & 2) string = replace(string, rtrim, '$1');
	    return string;
	  };
	};

	stringTrim = {
	  // `String.prototype.{ trimLeft, trimStart }` methods
	  // https://tc39.es/ecma262/#sec-string.prototype.trimstart
	  start: createMethod(1),
	  // `String.prototype.{ trimRight, trimEnd }` methods
	  // https://tc39.es/ecma262/#sec-string.prototype.trimend
	  end: createMethod(2),
	  // `String.prototype.trim` method
	  // https://tc39.es/ecma262/#sec-string.prototype.trim
	  trim: createMethod(3)
	};
	return stringTrim;
}

var numberParseInt;
var hasRequiredNumberParseInt;

function requireNumberParseInt () {
	if (hasRequiredNumberParseInt) return numberParseInt;
	hasRequiredNumberParseInt = 1;
	var globalThis = /*@__PURE__*/ requireGlobalThis();
	var fails = /*@__PURE__*/ requireFails();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThis();
	var toString = /*@__PURE__*/ requireToString();
	var trim = /*@__PURE__*/ requireStringTrim().trim;
	var whitespaces = /*@__PURE__*/ requireWhitespaces();

	var $parseInt = globalThis.parseInt;
	var Symbol = globalThis.Symbol;
	var ITERATOR = Symbol && Symbol.iterator;
	var hex = /^[+-]?0x/i;
	var exec = uncurryThis(hex.exec);
	var FORCED = $parseInt(whitespaces + '08') !== 8 || $parseInt(whitespaces + '0x16') !== 22
	  // MS Edge 18- broken with boxed symbols
	  || (ITERATOR && !fails(function () { $parseInt(Object(ITERATOR)); }));

	// `parseInt` method
	// https://tc39.es/ecma262/#sec-parseint-string-radix
	numberParseInt = FORCED ? function parseInt(string, radix) {
	  var S = trim(toString(string));
	  return $parseInt(S, (radix >>> 0) || (exec(hex, S) ? 16 : 10));
	} : $parseInt;
	return numberParseInt;
}

var hasRequiredEs_parseInt;

function requireEs_parseInt () {
	if (hasRequiredEs_parseInt) return es_parseInt;
	hasRequiredEs_parseInt = 1;
	var $ = /*@__PURE__*/ require_export();
	var $parseInt = /*@__PURE__*/ requireNumberParseInt();

	// `parseInt` method
	// https://tc39.es/ecma262/#sec-parseint-string-radix
	$({ global: true, forced: parseInt !== $parseInt }, {
	  parseInt: $parseInt
	});
	return es_parseInt;
}

var _parseInt$3;
var hasRequired_parseInt$2;

function require_parseInt$2 () {
	if (hasRequired_parseInt$2) return _parseInt$3;
	hasRequired_parseInt$2 = 1;
	requireEs_parseInt();
	var path = /*@__PURE__*/ requirePath();

	_parseInt$3 = path.parseInt;
	return _parseInt$3;
}

var _parseInt$2;
var hasRequired_parseInt$1;

function require_parseInt$1 () {
	if (hasRequired_parseInt$1) return _parseInt$2;
	hasRequired_parseInt$1 = 1;
	var parent = /*@__PURE__*/ require_parseInt$2();

	_parseInt$2 = parent;
	return _parseInt$2;
}

var _parseInt$1;
var hasRequired_parseInt;

function require_parseInt () {
	if (hasRequired_parseInt) return _parseInt$1;
	hasRequired_parseInt = 1;
	_parseInt$1 = /*@__PURE__*/ require_parseInt$1();
	return _parseInt$1;
}

var _parseIntExports = require_parseInt();
var _parseInt = /*@__PURE__*/getDefaultExportFromCjs(_parseIntExports);

var es_array_indexOf = {};

var hasRequiredEs_array_indexOf;

function requireEs_array_indexOf () {
	if (hasRequiredEs_array_indexOf) return es_array_indexOf;
	hasRequiredEs_array_indexOf = 1;
	/* eslint-disable es/no-array-prototype-indexof -- required for testing */
	var $ = /*@__PURE__*/ require_export();
	var uncurryThis = /*@__PURE__*/ requireFunctionUncurryThisClause();
	var $indexOf = /*@__PURE__*/ requireArrayIncludes().indexOf;
	var arrayMethodIsStrict = /*@__PURE__*/ requireArrayMethodIsStrict();

	var nativeIndexOf = uncurryThis([].indexOf);

	var NEGATIVE_ZERO = !!nativeIndexOf && 1 / nativeIndexOf([1], 1, -0) < 0;
	var FORCED = NEGATIVE_ZERO || !arrayMethodIsStrict('indexOf');

	// `Array.prototype.indexOf` method
	// https://tc39.es/ecma262/#sec-array.prototype.indexof
	$({ target: 'Array', proto: true, forced: FORCED }, {
	  indexOf: function indexOf(searchElement /* , fromIndex = 0 */) {
	    var fromIndex = arguments.length > 1 ? arguments[1] : undefined;
	    return NEGATIVE_ZERO
	      // convert -0 to +0
	      ? nativeIndexOf(this, searchElement, fromIndex) || 0
	      : $indexOf(this, searchElement, fromIndex);
	  }
	});
	return es_array_indexOf;
}

var indexOf$3;
var hasRequiredIndexOf$3;

function requireIndexOf$3 () {
	if (hasRequiredIndexOf$3) return indexOf$3;
	hasRequiredIndexOf$3 = 1;
	requireEs_array_indexOf();
	var getBuiltInPrototypeMethod = /*@__PURE__*/ requireGetBuiltInPrototypeMethod();

	indexOf$3 = getBuiltInPrototypeMethod('Array', 'indexOf');
	return indexOf$3;
}

var indexOf$2;
var hasRequiredIndexOf$2;

function requireIndexOf$2 () {
	if (hasRequiredIndexOf$2) return indexOf$2;
	hasRequiredIndexOf$2 = 1;
	var isPrototypeOf = /*@__PURE__*/ requireObjectIsPrototypeOf();
	var method = /*@__PURE__*/ requireIndexOf$3();

	var ArrayPrototype = Array.prototype;

	indexOf$2 = function (it) {
	  var own = it.indexOf;
	  return it === ArrayPrototype || (isPrototypeOf(ArrayPrototype, it) && own === ArrayPrototype.indexOf) ? method : own;
	};
	return indexOf$2;
}

var indexOf$1;
var hasRequiredIndexOf$1;

function requireIndexOf$1 () {
	if (hasRequiredIndexOf$1) return indexOf$1;
	hasRequiredIndexOf$1 = 1;
	var parent = /*@__PURE__*/ requireIndexOf$2();

	indexOf$1 = parent;
	return indexOf$1;
}

var indexOf;
var hasRequiredIndexOf;

function requireIndexOf () {
	if (hasRequiredIndexOf) return indexOf;
	hasRequiredIndexOf = 1;
	indexOf = /*@__PURE__*/ requireIndexOf$1();
	return indexOf;
}

var indexOfExports = requireIndexOf();
var _indexOfInstanceProperty = /*@__PURE__*/getDefaultExportFromCjs(indexOfExports);

var es_object_entries = {};

var hasRequiredEs_object_entries;

function requireEs_object_entries () {
	if (hasRequiredEs_object_entries) return es_object_entries;
	hasRequiredEs_object_entries = 1;
	var $ = /*@__PURE__*/ require_export();
	var $entries = /*@__PURE__*/ requireObjectToArray().entries;

	// `Object.entries` method
	// https://tc39.es/ecma262/#sec-object.entries
	$({ target: 'Object', stat: true }, {
	  entries: function entries(O) {
	    return $entries(O);
	  }
	});
	return es_object_entries;
}

var entries$2;
var hasRequiredEntries$2;

function requireEntries$2 () {
	if (hasRequiredEntries$2) return entries$2;
	hasRequiredEntries$2 = 1;
	requireEs_object_entries();
	var path = /*@__PURE__*/ requirePath();

	entries$2 = path.Object.entries;
	return entries$2;
}

var entries$1;
var hasRequiredEntries$1;

function requireEntries$1 () {
	if (hasRequiredEntries$1) return entries$1;
	hasRequiredEntries$1 = 1;
	var parent = /*@__PURE__*/ requireEntries$2();

	entries$1 = parent;
	return entries$1;
}

var entries;
var hasRequiredEntries;

function requireEntries () {
	if (hasRequiredEntries) return entries;
	hasRequiredEntries = 1;
	entries = /*@__PURE__*/ requireEntries$1();
	return entries;
}

var entriesExports = requireEntries();
var _Object$entries = /*@__PURE__*/getDefaultExportFromCjs(entriesExports);

var es_object_create = {};

var hasRequiredEs_object_create;

function requireEs_object_create () {
	if (hasRequiredEs_object_create) return es_object_create;
	hasRequiredEs_object_create = 1;
	// TODO: Remove from `core-js@4`
	var $ = /*@__PURE__*/ require_export();
	var DESCRIPTORS = /*@__PURE__*/ requireDescriptors();
	var create = /*@__PURE__*/ requireObjectCreate();

	// `Object.create` method
	// https://tc39.es/ecma262/#sec-object.create
	$({ target: 'Object', stat: true, sham: !DESCRIPTORS }, {
	  create: create
	});
	return es_object_create;
}

var create$2;
var hasRequiredCreate$2;

function requireCreate$2 () {
	if (hasRequiredCreate$2) return create$2;
	hasRequiredCreate$2 = 1;
	requireEs_object_create();
	var path = /*@__PURE__*/ requirePath();

	var Object = path.Object;

	create$2 = function create(P, D) {
	  return Object.create(P, D);
	};
	return create$2;
}

var create$1;
var hasRequiredCreate$1;

function requireCreate$1 () {
	if (hasRequiredCreate$1) return create$1;
	hasRequiredCreate$1 = 1;
	var parent = /*@__PURE__*/ requireCreate$2();

	create$1 = parent;
	return create$1;
}

var create;
var hasRequiredCreate;

function requireCreate () {
	if (hasRequiredCreate) return create;
	hasRequiredCreate = 1;
	create = /*@__PURE__*/ requireCreate$1();
	return create;
}

var createExports = requireCreate();
var _Object$create = /*@__PURE__*/getDefaultExportFromCjs(createExports);

// utility functions
// parse ASP.Net Date pattern,
// for example '/Date(1198908717056)/' or '/Date(1198908717056-0700)/'
// code from http://momentjs.com/
const ASPDateRegex = /^\/?Date\((-?\d+)/i;
// Color REs
const fullHexRE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const shortHexRE = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
const rgbRE = /^rgb\( *(1?\d{1,2}|2[0-4]\d|25[0-5]) *, *(1?\d{1,2}|2[0-4]\d|25[0-5]) *, *(1?\d{1,2}|2[0-4]\d|25[0-5]) *\)$/i;
const rgbaRE = /^rgba\( *(1?\d{1,2}|2[0-4]\d|25[0-5]) *, *(1?\d{1,2}|2[0-4]\d|25[0-5]) *, *(1?\d{1,2}|2[0-4]\d|25[0-5]) *, *([01]|0?\.\d+) *\)$/i;
/**
 * Test whether given object is a number.
 * @param value - Input value of unknown type.
 * @returns True if number, false otherwise.
 */
function isNumber(value) {
  return value instanceof Number || typeof value === "number";
}
/**
 * Remove everything in the DOM object.
 * @param DOMobject - Node whose child nodes will be recursively deleted.
 */
function recursiveDOMDelete(DOMobject) {
  if (DOMobject) {
    while (DOMobject.hasChildNodes() === true) {
      const child = DOMobject.firstChild;
      if (child) {
        recursiveDOMDelete(child);
        DOMobject.removeChild(child);
      }
    }
  }
}
/**
 * Test whether given object is a string.
 * @param value - Input value of unknown type.
 * @returns True if string, false otherwise.
 */
function isString(value) {
  return value instanceof String || typeof value === "string";
}
/**
 * Test whether given object is a object (not primitive or null).
 * @param value - Input value of unknown type.
 * @returns True if not null object, false otherwise.
 */
function isObject(value) {
  return typeof value === "object" && value !== null;
}
/**
 * Test whether given object is a Date, or a String containing a Date.
 * @param value - Input value of unknown type.
 * @returns True if Date instance or string date representation, false otherwise.
 */
function isDate(value) {
  if (value instanceof Date) {
    return true;
  } else if (isString(value)) {
    // test whether this string contains a date
    const match = ASPDateRegex.exec(value);
    if (match) {
      return true;
    } else if (!isNaN(Date.parse(value))) {
      return true;
    }
  }
  return false;
}
/**
 * Copy property from b to a if property present in a.
 * If property in b explicitly set to null, delete it if `allowDeletion` set.
 *
 * Internal helper routine, should not be exported. Not added to `exports` for that reason.
 * @param a - Target object.
 * @param b - Source object.
 * @param prop - Name of property to copy from b to a.
 * @param allowDeletion - If true, delete property in a if explicitly set to null in b.
 */
function copyOrDelete(a, b, prop, allowDeletion) {
  let doDeletion = false;
  if (allowDeletion === true) {
    doDeletion = b[prop] === null && a[prop] !== undefined;
  }
  if (doDeletion) {
    delete a[prop];
  } else {
    a[prop] = b[prop]; // Remember, this is a reference copy!
  }
}
/**
 * Fill an object with a possibly partially defined other object.
 *
 * Only copies values for the properties already present in a.
 * That means an object is not created on a property if only the b object has it.
 * @param a - The object that will have it's properties updated.
 * @param b - The object with property updates.
 * @param allowDeletion - If true, delete properties in a that are explicitly set to null in b.
 */
function fillIfDefined(a, b) {
  let allowDeletion = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  // NOTE: iteration of properties of a
  // NOTE: prototype properties iterated over as well
  for (const prop in a) {
    if (b[prop] !== undefined) {
      if (b[prop] === null || typeof b[prop] !== "object") {
        // Note: typeof null === 'object'
        copyOrDelete(a, b, prop, allowDeletion);
      } else {
        const aProp = a[prop];
        const bProp = b[prop];
        if (isObject(aProp) && isObject(bProp)) {
          fillIfDefined(aProp, bProp, allowDeletion);
        }
      }
    }
  }
}
/**
 * Copy the values of all of the enumerable own properties from one or more source objects to a
 * target object. Returns the target object.
 * @param target - The target object to copy to.
 * @param source - The source object from which to copy properties.
 * @returns The target object.
 */
const extend = _Object$assign;
/**
 * Extend object a with selected properties of object b or a series of objects.
 * @remarks
 * Only properties with defined values are copied.
 * @param props - Properties to be copied to a.
 * @param a - The target.
 * @param others - The sources.
 * @returns Argument a.
 */
function selectiveExtend(props, a) {
  if (!_Array$isArray(props)) {
    throw new Error("Array with property names expected as first argument");
  }
  for (var _len = arguments.length, others = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    others[_key - 2] = arguments[_key];
  }
  for (const other of others) {
    for (let p = 0; p < props.length; p++) {
      const prop = props[p];
      if (other && Object.prototype.hasOwnProperty.call(other, prop)) {
        a[prop] = other[prop];
      }
    }
  }
  return a;
}
/**
 * Extend object a with selected properties of object b.
 * Only properties with defined values are copied.
 * @remarks
 * Previous version of this routine implied that multiple source objects could
 * be used; however, the implementation was **wrong**. Since multiple (\>1)
 * sources weren't used anywhere in the `vis.js` code, this has been removed
 * @param props - Names of first-level properties to copy over.
 * @param a - Target object.
 * @param b - Source object.
 * @param allowDeletion - If true, delete property in a if explicitly set to null in b.
 * @returns Argument a.
 */
function selectiveDeepExtend(props, a, b) {
  let allowDeletion = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  // TODO: add support for Arrays to deepExtend
  if (_Array$isArray(b)) {
    throw new TypeError("Arrays are not supported by deepExtend");
  }
  for (let p = 0; p < props.length; p++) {
    const prop = props[p];
    if (Object.prototype.hasOwnProperty.call(b, prop)) {
      if (b[prop] && b[prop].constructor === Object) {
        if (a[prop] === undefined) {
          a[prop] = {};
        }
        if (a[prop].constructor === Object) {
          deepExtend(a[prop], b[prop], false, allowDeletion);
        } else {
          copyOrDelete(a, b, prop, allowDeletion);
        }
      } else if (_Array$isArray(b[prop])) {
        throw new TypeError("Arrays are not supported by deepExtend");
      } else {
        copyOrDelete(a, b, prop, allowDeletion);
      }
    }
  }
  return a;
}
/**
 * Extend object `a` with properties of object `b`, ignoring properties which
 * are explicitly specified to be excluded.
 * @remarks
 * The properties of `b` are considered for copying. Properties which are
 * themselves objects are are also extended. Only properties with defined
 * values are copied.
 * @param propsToExclude - Names of properties which should *not* be copied.
 * @param a - Object to extend.
 * @param b - Object to take properties from for extension.
 * @param allowDeletion - If true, delete properties in a that are explicitly
 * set to null in b.
 * @returns Argument a.
 */
function selectiveNotDeepExtend(propsToExclude, a, b) {
  let allowDeletion = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  // TODO: add support for Arrays to deepExtend
  // NOTE: array properties have an else-below; apparently, there is a problem here.
  if (_Array$isArray(b)) {
    throw new TypeError("Arrays are not supported by deepExtend");
  }
  for (const prop in b) {
    if (!Object.prototype.hasOwnProperty.call(b, prop)) {
      continue;
    } // Handle local properties only
    if (_includesInstanceProperty(propsToExclude).call(propsToExclude, prop)) {
      continue;
    } // In exclusion list, skip
    if (b[prop] && b[prop].constructor === Object) {
      if (a[prop] === undefined) {
        a[prop] = {};
      }
      if (a[prop].constructor === Object) {
        deepExtend(a[prop], b[prop]); // NOTE: allowDeletion not propagated!
      } else {
        copyOrDelete(a, b, prop, allowDeletion);
      }
    } else if (_Array$isArray(b[prop])) {
      a[prop] = [];
      for (let i = 0; i < b[prop].length; i++) {
        a[prop].push(b[prop][i]);
      }
    } else {
      copyOrDelete(a, b, prop, allowDeletion);
    }
  }
  return a;
}
/**
 * Deep extend an object a with the properties of object b.
 * @param a - Target object.
 * @param b - Source object.
 * @param protoExtend - If true, the prototype values will also be extended.
 * (That is the options objects that inherit from others will also get the
 * inherited options).
 * @param allowDeletion - If true, the values of fields that are null will be deleted.
 * @returns Argument a.
 */
function deepExtend(a, b) {
  let protoExtend = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  let allowDeletion = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  for (const prop in b) {
    if (Object.prototype.hasOwnProperty.call(b, prop) || protoExtend === true) {
      if (typeof b[prop] === "object" && b[prop] !== null && _Object$getPrototypeOf(b[prop]) === Object.prototype) {
        if (a[prop] === undefined) {
          a[prop] = deepExtend({}, b[prop], protoExtend); // NOTE: allowDeletion not propagated!
        } else if (typeof a[prop] === "object" && a[prop] !== null && _Object$getPrototypeOf(a[prop]) === Object.prototype) {
          deepExtend(a[prop], b[prop], protoExtend); // NOTE: allowDeletion not propagated!
        } else {
          copyOrDelete(a, b, prop, allowDeletion);
        }
      } else if (_Array$isArray(b[prop])) {
        var _context;
        a[prop] = _sliceInstanceProperty(_context = b[prop]).call(_context);
      } else {
        copyOrDelete(a, b, prop, allowDeletion);
      }
    }
  }
  return a;
}
/**
 * Test whether all elements in two arrays are equal.
 * @param a - First array.
 * @param b - Second array.
 * @returns True if both arrays have the same length and same elements (1 = '1').
 */
function equalArray(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0, len = a.length; i < len; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}
/**
 * Get the type of an object, for example exports.getType([]) returns 'Array'.
 * @param object - Input value of unknown type.
 * @returns Detected type.
 */
function getType(object) {
  const type = typeof object;
  if (type === "object") {
    if (object === null) {
      return "null";
    }
    if (object instanceof Boolean) {
      return "Boolean";
    }
    if (object instanceof Number) {
      return "Number";
    }
    if (object instanceof String) {
      return "String";
    }
    if (_Array$isArray(object)) {
      return "Array";
    }
    if (object instanceof Date) {
      return "Date";
    }
    return "Object";
  }
  if (type === "number") {
    return "Number";
  }
  if (type === "boolean") {
    return "Boolean";
  }
  if (type === "string") {
    return "String";
  }
  if (type === undefined) {
    return "undefined";
  }
  return type;
}
/**
 * Used to extend an array and copy it. This is used to propagate paths recursively.
 * @param arr - First part.
 * @param newValue - The value to be aadded into the array.
 * @returns A new array with all items from arr and newValue (which is last).
 */
function copyAndExtendArray(arr, newValue) {
  return [...arr, newValue];
}
/**
 * Used to extend an array and copy it. This is used to propagate paths recursively.
 * @param arr - The array to be copied.
 * @returns Shallow copy of arr.
 */
function copyArray(arr) {
  return _sliceInstanceProperty(arr).call(arr);
}
/**
 * Retrieve the absolute left value of a DOM element.
 * @param elem - A dom element, for example a div.
 * @returns The absolute left position of this element in the browser page.
 */
function getAbsoluteLeft(elem) {
  return elem.getBoundingClientRect().left;
}
/**
 * Retrieve the absolute right value of a DOM element.
 * @param elem - A dom element, for example a div.
 * @returns The absolute right position of this element in the browser page.
 */
function getAbsoluteRight(elem) {
  return elem.getBoundingClientRect().right;
}
/**
 * Retrieve the absolute top value of a DOM element.
 * @param elem - A dom element, for example a div.
 * @returns The absolute top position of this element in the browser page.
 */
function getAbsoluteTop(elem) {
  return elem.getBoundingClientRect().top;
}
/**
 * Add a className to the given elements style.
 * @param elem - The element to which the classes will be added.
 * @param classNames - Space separated list of classes.
 */
function addClassName(elem, classNames) {
  let classes = elem.className.split(" ");
  const newClasses = classNames.split(" ");
  classes = _concatInstanceProperty(classes).call(classes, _filterInstanceProperty(newClasses).call(newClasses, function (className) {
    return !_includesInstanceProperty(classes).call(classes, className);
  }));
  elem.className = classes.join(" ");
}
/**
 * Remove a className from the given elements style.
 * @param elem - The element from which the classes will be removed.
 * @param classNames - Space separated list of classes.
 */
function removeClassName(elem, classNames) {
  let classes = elem.className.split(" ");
  const oldClasses = classNames.split(" ");
  classes = _filterInstanceProperty(classes).call(classes, function (className) {
    return !_includesInstanceProperty(oldClasses).call(oldClasses, className);
  });
  elem.className = classes.join(" ");
}
/**
 * For each method for both arrays and objects.
 * In case of an array, the built-in Array.forEach() is applied (**No, it's not!**).
 * In case of an Object, the method loops over all properties of the object.
 * @param object - An Object or Array to be iterated over.
 * @param callback - Array.forEach-like callback.
 */
function forEach(object, callback) {
  if (_Array$isArray(object)) {
    // array
    const len = object.length;
    for (let i = 0; i < len; i++) {
      callback(object[i], i, object);
    }
  } else {
    // object
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }
}
/**
 * Convert an object into an array: all objects properties are put into the array. The resulting array is unordered.
 * @param o - Object that contains the properties and methods.
 * @returns An array of unordered values.
 */
const toArray = _Object$values;
/**
 * Update a property in an object.
 * @param object - The object whose property will be updated.
 * @param key - Name of the property to be updated.
 * @param value - The new value to be assigned.
 * @returns Whether the value was updated (true) or already strictly the same in the original object (false).
 */
function updateProperty(object, key, value) {
  if (object[key] !== value) {
    object[key] = value;
    return true;
  } else {
    return false;
  }
}
/**
 * Throttle the given function to be only executed once per animation frame.
 * @param fn - The original function.
 * @returns The throttled function.
 */
function throttle(fn) {
  let scheduled = false;
  return () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn();
      });
    }
  };
}
/**
 * Cancels the event's default action if it is cancelable, without stopping further propagation of the event.
 * @param event - The event whose default action should be prevented.
 */
function preventDefault(event) {
  if (!event) {
    event = window.event;
  }
  if (!event) ; else if (event.preventDefault) {
    event.preventDefault(); // non-IE browsers
  } else {
    // @TODO: IE types? Does anyone care?
    event.returnValue = false; // IE browsers
  }
}
/**
 * Get HTML element which is the target of the event.
 * @param event - The event.
 * @returns The element or null if not obtainable.
 */
function getTarget() {
  let event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.event;
  // code from http://www.quirksmode.org/js/events_properties.html
  // @TODO: EventTarget can be almost anything, is it okay to return only Elements?
  let target = null;
  if (!event) ; else if (event.target) {
    target = event.target;
  } else if (event.srcElement) {
    target = event.srcElement;
  }
  if (!(target instanceof Element)) {
    return null;
  }
  if (target.nodeType != null && target.nodeType == 3) {
    // defeat Safari bug
    target = target.parentNode;
    if (!(target instanceof Element)) {
      return null;
    }
  }
  return target;
}
/**
 * Check if given element contains given parent somewhere in the DOM tree.
 * @param element - The element to be tested.
 * @param parent - The ancestor (not necessarily parent) of the element.
 * @returns True if parent is an ancestor of the element, false otherwise.
 */
function hasParent(element, parent) {
  let elem = element;
  while (elem) {
    if (elem === parent) {
      return true;
    } else if (elem.parentNode) {
      elem = elem.parentNode;
    } else {
      return false;
    }
  }
  return false;
}
const option = {
  /**
   * Convert a value into a boolean.
   * @param value - Value to be converted intoboolean, a function will be executed as `(() => unknown)`.
   * @param defaultValue - If the value or the return value of the function == null then this will be returned.
   * @returns Corresponding boolean value, if none then the default value, if none then null.
   */
  asBoolean(value, defaultValue) {
    if (typeof value == "function") {
      value = value();
    }
    if (value != null) {
      return value != false;
    }
    return defaultValue || null;
  },
  /**
   * Convert a value into a number.
   * @param value - Value to be converted intonumber, a function will be executed as `(() => unknown)`.
   * @param defaultValue - If the value or the return value of the function == null then this will be returned.
   * @returns Corresponding **boxed** number value, if none then the default value, if none then null.
   */
  asNumber(value, defaultValue) {
    if (typeof value == "function") {
      value = value();
    }
    if (value != null) {
      return Number(value) || defaultValue || null;
    }
    return defaultValue || null;
  },
  /**
   * Convert a value into a string.
   * @param value - Value to be converted intostring, a function will be executed as `(() => unknown)`.
   * @param defaultValue - If the value or the return value of the function == null then this will be returned.
   * @returns Corresponding **boxed** string value, if none then the default value, if none then null.
   */
  asString(value, defaultValue) {
    if (typeof value == "function") {
      value = value();
    }
    if (value != null) {
      return String(value);
    }
    return defaultValue || null;
  },
  /**
   * Convert a value into a size.
   * @param value - Value to be converted intosize, a function will be executed as `(() => unknown)`.
   * @param defaultValue - If the value or the return value of the function == null then this will be returned.
   * @returns Corresponding string value (number + 'px'), if none then the default value, if none then null.
   */
  asSize(value, defaultValue) {
    if (typeof value == "function") {
      value = value();
    }
    if (isString(value)) {
      return value;
    } else if (isNumber(value)) {
      return value + "px";
    } else {
      return defaultValue || null;
    }
  },
  /**
   * Convert a value into a DOM Element.
   * @param value - Value to be converted into DOM Element, a function will be executed as `(() => unknown)`.
   * @param defaultValue - If the value or the return value of the function == null then this will be returned.
   * @returns The DOM Element, if none then the default value, if none then null.
   */
  asElement(value, defaultValue) {
    if (typeof value == "function") {
      value = value();
    }
    return value || defaultValue || null;
  }
};
/**
 * Convert hex color string into RGB color object.
 * @remarks
 * {@link http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb}
 * @param hex - Hex color string (3 or 6 digits, with or without #).
 * @returns RGB color object.
 */
function hexToRGB(hex) {
  let result;
  switch (hex.length) {
    case 3:
    case 4:
      result = shortHexRE.exec(hex);
      return result ? {
        r: _parseInt(result[1] + result[1], 16),
        g: _parseInt(result[2] + result[2], 16),
        b: _parseInt(result[3] + result[3], 16)
      } : null;
    case 6:
    case 7:
      result = fullHexRE.exec(hex);
      return result ? {
        r: _parseInt(result[1], 16),
        g: _parseInt(result[2], 16),
        b: _parseInt(result[3], 16)
      } : null;
    default:
      return null;
  }
}
/**
 * This function takes string color in hex or RGB format and adds the opacity, RGBA is passed through unchanged.
 * @param color - The color string (hex, RGB, RGBA).
 * @param opacity - The new opacity.
 * @returns RGBA string, for example 'rgba(255, 0, 127, 0.3)'.
 */
function overrideOpacity(color, opacity) {
  if (_includesInstanceProperty(color).call(color, "rgba")) {
    return color;
  } else if (_includesInstanceProperty(color).call(color, "rgb")) {
    const rgb = color.substr(_indexOfInstanceProperty(color).call(color, "(") + 1).replace(")", "").split(",");
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + opacity + ")";
  } else {
    const rgb = hexToRGB(color);
    if (rgb == null) {
      return color;
    } else {
      return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + opacity + ")";
    }
  }
}
/**
 * Convert RGB \<0, 255\> into hex color string.
 * @param red - Red channel.
 * @param green - Green channel.
 * @param blue - Blue channel.
 * @returns Hex color string (for example: '#0acdc0').
 */
function RGBToHex(red, green, blue) {
  var _context2;
  return "#" + _sliceInstanceProperty(_context2 = ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16)).call(_context2, 1);
}
/**
 * Parse a color property into an object with border, background, and highlight colors.
 * @param inputColor - Shorthand color string or input color object.
 * @param defaultColor - Full color object to fill in missing values in inputColor.
 * @returns Color object.
 */
function parseColor(inputColor, defaultColor) {
  if (isString(inputColor)) {
    let colorStr = inputColor;
    if (isValidRGB(colorStr)) {
      var _context3;
      const rgb = _mapInstanceProperty(_context3 = colorStr.substr(4).substr(0, colorStr.length - 5).split(",")).call(_context3, function (value) {
        return _parseInt(value);
      });
      colorStr = RGBToHex(rgb[0], rgb[1], rgb[2]);
    }
    if (isValidHex(colorStr) === true) {
      const hsv = hexToHSV(colorStr);
      const lighterColorHSV = {
        h: hsv.h,
        s: hsv.s * 0.8,
        v: Math.min(1, hsv.v * 1.02)
      };
      const darkerColorHSV = {
        h: hsv.h,
        s: Math.min(1, hsv.s * 1.25),
        v: hsv.v * 0.8
      };
      const darkerColorHex = HSVToHex(darkerColorHSV.h, darkerColorHSV.s, darkerColorHSV.v);
      const lighterColorHex = HSVToHex(lighterColorHSV.h, lighterColorHSV.s, lighterColorHSV.v);
      return {
        background: colorStr,
        border: darkerColorHex,
        highlight: {
          background: lighterColorHex,
          border: darkerColorHex
        },
        hover: {
          background: lighterColorHex,
          border: darkerColorHex
        }
      };
    } else {
      return {
        background: colorStr,
        border: colorStr,
        highlight: {
          background: colorStr,
          border: colorStr
        },
        hover: {
          background: colorStr,
          border: colorStr
        }
      };
    }
  } else {
    if (defaultColor) {
      const color = {
        background: inputColor.background || defaultColor.background,
        border: inputColor.border || defaultColor.border,
        highlight: isString(inputColor.highlight) ? {
          border: inputColor.highlight,
          background: inputColor.highlight
        } : {
          background: inputColor.highlight && inputColor.highlight.background || defaultColor.highlight.background,
          border: inputColor.highlight && inputColor.highlight.border || defaultColor.highlight.border
        },
        hover: isString(inputColor.hover) ? {
          border: inputColor.hover,
          background: inputColor.hover
        } : {
          border: inputColor.hover && inputColor.hover.border || defaultColor.hover.border,
          background: inputColor.hover && inputColor.hover.background || defaultColor.hover.background
        }
      };
      return color;
    } else {
      const color = {
        background: inputColor.background || undefined,
        border: inputColor.border || undefined,
        highlight: isString(inputColor.highlight) ? {
          border: inputColor.highlight,
          background: inputColor.highlight
        } : {
          background: inputColor.highlight && inputColor.highlight.background || undefined,
          border: inputColor.highlight && inputColor.highlight.border || undefined
        },
        hover: isString(inputColor.hover) ? {
          border: inputColor.hover,
          background: inputColor.hover
        } : {
          border: inputColor.hover && inputColor.hover.border || undefined,
          background: inputColor.hover && inputColor.hover.background || undefined
        }
      };
      return color;
    }
  }
}
/**
 * Convert RGB \<0, 255\> into HSV object.
 * @remarks
 * {@link http://www.javascripter.net/faq/rgb2hsv.htm}
 * @param red - Red channel.
 * @param green - Green channel.
 * @param blue - Blue channel.
 * @returns HSV color object.
 */
function RGBToHSV(red, green, blue) {
  red = red / 255;
  green = green / 255;
  blue = blue / 255;
  const minRGB = Math.min(red, Math.min(green, blue));
  const maxRGB = Math.max(red, Math.max(green, blue));
  // Black-gray-white
  if (minRGB === maxRGB) {
    return {
      h: 0,
      s: 0,
      v: minRGB
    };
  }
  // Colors other than black-gray-white:
  const d = red === minRGB ? green - blue : blue === minRGB ? red - green : blue - red;
  const h = red === minRGB ? 3 : blue === minRGB ? 1 : 5;
  const hue = 60 * (h - d / (maxRGB - minRGB)) / 360;
  const saturation = (maxRGB - minRGB) / maxRGB;
  const value = maxRGB;
  return {
    h: hue,
    s: saturation,
    v: value
  };
}
/**
 * Split a string with css styles into an object with key/values.
 * @param cssText - CSS source code to split into key/value object.
 * @returns Key/value object corresponding to {@link cssText}.
 */
function splitCSSText(cssText) {
  const tmpEllement = document.createElement("div");
  const styles = {};
  tmpEllement.style.cssText = cssText;
  for (let i = 0; i < tmpEllement.style.length; ++i) {
    styles[tmpEllement.style[i]] = tmpEllement.style.getPropertyValue(tmpEllement.style[i]);
  }
  return styles;
}
/**
 * Append a string with css styles to an element.
 * @param element - The element that will receive new styles.
 * @param cssText - The styles to be appended.
 */
function addCssText(element, cssText) {
  const cssStyle = splitCSSText(cssText);
  for (const [key, value] of _Object$entries(cssStyle)) {
    element.style.setProperty(key, value);
  }
}
/**
 * Remove a string with css styles from an element.
 * @param element - The element from which styles should be removed.
 * @param cssText - The styles to be removed.
 */
function removeCssText(element, cssText) {
  const cssStyle = splitCSSText(cssText);
  for (const key of _Object$keys(cssStyle)) {
    element.style.removeProperty(key);
  }
}
/**
 * Convert HSV \<0, 1\> into RGB color object.
 * @remarks
 * {@link https://gist.github.com/mjijackson/5311256}
 * @param h - Hue.
 * @param s - Saturation.
 * @param v - Value.
 * @returns RGB color object.
 */
function HSVToRGB(h, s, v) {
  let r;
  let g;
  let b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v, g = t, b = p;
      break;
    case 1:
      r = q, g = v, b = p;
      break;
    case 2:
      r = p, g = v, b = t;
      break;
    case 3:
      r = p, g = q, b = v;
      break;
    case 4:
      r = t, g = p, b = v;
      break;
    case 5:
      r = v, g = p, b = q;
      break;
  }
  return {
    r: Math.floor(r * 255),
    g: Math.floor(g * 255),
    b: Math.floor(b * 255)
  };
}
/**
 * Convert HSV \<0, 1\> into hex color string.
 * @param h - Hue.
 * @param s - Saturation.
 * @param v - Value.
 * @returns Hex color string.
 */
function HSVToHex(h, s, v) {
  const rgb = HSVToRGB(h, s, v);
  return RGBToHex(rgb.r, rgb.g, rgb.b);
}
/**
 * Convert hex color string into HSV \<0, 1\>.
 * @param hex - Hex color string.
 * @returns HSV color object.
 */
function hexToHSV(hex) {
  const rgb = hexToRGB(hex);
  if (!rgb) {
    throw new TypeError("'".concat(hex, "' is not a valid color."));
  }
  return RGBToHSV(rgb.r, rgb.g, rgb.b);
}
/**
 * Validate hex color string.
 * @param hex - Unknown string that may contain a color.
 * @returns True if the string is valid, false otherwise.
 */
function isValidHex(hex) {
  const isOk = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex);
  return isOk;
}
/**
 * Validate RGB color string.
 * @param rgb - Unknown string that may contain a color.
 * @returns True if the string is valid, false otherwise.
 */
function isValidRGB(rgb) {
  return rgbRE.test(rgb);
}
/**
 * Validate RGBA color string.
 * @param rgba - Unknown string that may contain a color.
 * @returns True if the string is valid, false otherwise.
 */
function isValidRGBA(rgba) {
  return rgbaRE.test(rgba);
}
/**
 * This recursively redirects the prototype of JSON objects to the referenceObject.
 * This is used for default options.
 * @param fields - Names of properties to be bridged.
 * @param referenceObject - The original object.
 * @returns A new object inheriting from the referenceObject.
 */
function selectiveBridgeObject(fields, referenceObject) {
  if (referenceObject !== null && typeof referenceObject === "object") {
    // !!! typeof null === 'object'
    const objectTo = _Object$create(referenceObject);
    for (let i = 0; i < fields.length; i++) {
      if (Object.prototype.hasOwnProperty.call(referenceObject, fields[i])) {
        if (typeof referenceObject[fields[i]] == "object") {
          objectTo[fields[i]] = bridgeObject(referenceObject[fields[i]]);
        }
      }
    }
    return objectTo;
  } else {
    return null;
  }
}
/**
 * This recursively redirects the prototype of JSON objects to the referenceObject.
 * This is used for default options.
 * @param referenceObject - The original object.
 * @returns The Element if the referenceObject is an Element, or a new object inheriting from the referenceObject.
 */
function bridgeObject(referenceObject) {
  if (referenceObject === null || typeof referenceObject !== "object") {
    return null;
  }
  if (referenceObject instanceof Element) {
    // Avoid bridging DOM objects
    return referenceObject;
  }
  const objectTo = _Object$create(referenceObject);
  for (const i in referenceObject) {
    if (Object.prototype.hasOwnProperty.call(referenceObject, i)) {
      if (typeof referenceObject[i] == "object") {
        objectTo[i] = bridgeObject(referenceObject[i]);
      }
    }
  }
  return objectTo;
}
/**
 * This method provides a stable sort implementation, very fast for presorted data.
 * @param a - The array to be sorted (in-place).
 * @param compare - An order comparator.
 * @returns The argument a.
 */
function insertSort(a, compare) {
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    let j;
    for (j = i; j > 0 && compare(k, a[j - 1]) < 0; j--) {
      a[j] = a[j - 1];
    }
    a[j] = k;
  }
  return a;
}
/**
 * This is used to set the options of subobjects in the options object.
 *
 * A requirement of these subobjects is that they have an 'enabled' element
 * which is optional for the user but mandatory for the program.
 *
 * The added value here of the merge is that option 'enabled' is set as required.
 * @param mergeTarget - Either this.options or the options used for the groups.
 * @param options - Options.
 * @param option - Option key in the options argument.
 * @param globalOptions - Global options, passed in to determine value of option 'enabled'.
 */
function mergeOptions(mergeTarget, options, option) {
  let globalOptions = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  // Local helpers
  const isPresent = function (obj) {
    return obj !== null && obj !== undefined;
  };
  const isObject = function (obj) {
    return obj !== null && typeof obj === "object";
  };
  // https://stackoverflow.com/a/34491287/1223531
  const isEmpty = function (obj) {
    for (const x in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, x)) {
        return false;
      }
    }
    return true;
  };
  // Guards
  if (!isObject(mergeTarget)) {
    throw new Error("Parameter mergeTarget must be an object");
  }
  if (!isObject(options)) {
    throw new Error("Parameter options must be an object");
  }
  if (!isPresent(option)) {
    throw new Error("Parameter option must have a value");
  }
  if (!isObject(globalOptions)) {
    throw new Error("Parameter globalOptions must be an object");
  }
  //
  // Actual merge routine, separated from main logic
  // Only a single level of options is merged. Deeper levels are ref'd. This may actually be an issue.
  //
  const doMerge = function (target, options, option) {
    if (!isObject(target[option])) {
      target[option] = {};
    }
    const src = options[option];
    const dst = target[option];
    for (const prop in src) {
      if (Object.prototype.hasOwnProperty.call(src, prop)) {
        dst[prop] = src[prop];
      }
    }
  };
  // Local initialization
  const srcOption = options[option];
  const globalPassed = isObject(globalOptions) && !isEmpty(globalOptions);
  const globalOption = globalPassed ? globalOptions[option] : undefined;
  const globalEnabled = globalOption ? globalOption.enabled : undefined;
  /////////////////////////////////////////
  // Main routine
  /////////////////////////////////////////
  if (srcOption === undefined) {
    return; // Nothing to do
  }
  if (typeof srcOption === "boolean") {
    if (!isObject(mergeTarget[option])) {
      mergeTarget[option] = {};
    }
    mergeTarget[option].enabled = srcOption;
    return;
  }
  if (srcOption === null && !isObject(mergeTarget[option])) {
    // If possible, explicit copy from globals
    if (isPresent(globalOption)) {
      mergeTarget[option] = _Object$create(globalOption);
    } else {
      return; // Nothing to do
    }
  }
  if (!isObject(srcOption)) {
    return;
  }
  //
  // Ensure that 'enabled' is properly set. It is required internally
  // Note that the value from options will always overwrite the existing value
  //
  let enabled = true; // default value
  if (srcOption.enabled !== undefined) {
    enabled = srcOption.enabled;
  } else {
    // Take from globals, if present
    if (globalEnabled !== undefined) {
      enabled = globalOption.enabled;
    }
  }
  doMerge(mergeTarget, options, option);
  mergeTarget[option].enabled = enabled;
}
/**
 * This function does a binary search for a visible item in a sorted list. If we find a visible item, the code that uses
 * this function will then iterate in both directions over this sorted list to find all visible items.
 * @param orderedItems - Items ordered by start.
 * @param comparator - -1 is lower, 0 is equal, 1 is higher.
 * @param field - Property name on an item (That is item[field]).
 * @param field2 - Second property name on an item (That is item[field][field2]).
 * @returns Index of the found item or -1 if nothing was found.
 */
function binarySearchCustom(orderedItems, comparator, field, field2) {
  const maxIterations = 10000;
  let iteration = 0;
  let low = 0;
  let high = orderedItems.length - 1;
  while (low <= high && iteration < maxIterations) {
    const middle = Math.floor((low + high) / 2);
    const item = orderedItems[middle];
    const value = field2 === undefined ? item[field] : item[field][field2];
    const searchResult = comparator(value);
    if (searchResult == 0) {
      // jihaa, found a visible item!
      return middle;
    } else if (searchResult == -1) {
      // it is too small --> increase low
      low = middle + 1;
    } else {
      // it is too big --> decrease high
      high = middle - 1;
    }
    iteration++;
  }
  return -1;
}
/**
 * This function does a binary search for a specific value in a sorted array.
 * If it does not exist but is in between of two values, we return either the
 * one before or the one after, depending on user input If it is found, we
 * return the index, else -1.
 * @param orderedItems - Sorted array.
 * @param target - The searched value.
 * @param field - Name of the property in items to be searched.
 * @param sidePreference - If the target is between two values, should the index of the before or the after be returned?
 * @param comparator - An optional comparator, returning -1, 0, 1 for \<, ===, \>.
 * @returns The index of found value or -1 if nothing was found.
 */
function binarySearchValue(orderedItems, target, field, sidePreference, comparator) {
  const maxIterations = 10000;
  let iteration = 0;
  let low = 0;
  let high = orderedItems.length - 1;
  let prevValue;
  let value;
  let nextValue;
  let middle;
  comparator = comparator != undefined ? comparator : function (a, b) {
    return a == b ? 0 : a < b ? -1 : 1;
  };
  while (low <= high && iteration < maxIterations) {
    // get a new guess
    middle = Math.floor(0.5 * (high + low));
    prevValue = orderedItems[Math.max(0, middle - 1)][field];
    value = orderedItems[middle][field];
    nextValue = orderedItems[Math.min(orderedItems.length - 1, middle + 1)][field];
    if (comparator(value, target) == 0) {
      // we found the target
      return middle;
    } else if (comparator(prevValue, target) < 0 && comparator(value, target) > 0) {
      // target is in between of the previous and the current
      return sidePreference == "before" ? Math.max(0, middle - 1) : middle;
    } else if (comparator(value, target) < 0 && comparator(nextValue, target) > 0) {
      // target is in between of the current and the next
      return sidePreference == "before" ? middle : Math.min(orderedItems.length - 1, middle + 1);
    } else {
      // didnt find the target, we need to change our boundaries.
      if (comparator(value, target) < 0) {
        // it is too small --> increase low
        low = middle + 1;
      } else {
        // it is too big --> decrease high
        high = middle - 1;
      }
    }
    iteration++;
  }
  // didnt find anything. Return -1.
  return -1;
}
/*
 * Easing Functions.
 * Only considering the t value for the range [0, 1] => [0, 1].
 *
 * Inspiration: from http://gizma.com/easing/
 * https://gist.github.com/gre/1650294
 */
const easingFunctions = {
  /**
   * Provides no easing and no acceleration.
   * @param t - Time.
   * @returns Value at time t.
   */
  linear(t) {
    return t;
  },
  /**
   * Accelerate from zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInQuad(t) {
    return t * t;
  },
  /**
   * Decelerate to zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeOutQuad(t) {
    return t * (2 - t);
  },
  /**
   * Accelerate until halfway, then decelerate.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },
  /**
   * Accelerate from zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInCubic(t) {
    return t * t * t;
  },
  /**
   * Decelerate to zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeOutCubic(t) {
    return --t * t * t + 1;
  },
  /**
   * Accelerate until halfway, then decelerate.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },
  /**
   * Accelerate from zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInQuart(t) {
    return t * t * t * t;
  },
  /**
   * Decelerate to zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeOutQuart(t) {
    return 1 - --t * t * t * t;
  },
  /**
   * Accelerate until halfway, then decelerate.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
  },
  /**
   * Accelerate from zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInQuint(t) {
    return t * t * t * t * t;
  },
  /**
   * Decelerate to zero velocity.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeOutQuint(t) {
    return 1 + --t * t * t * t * t;
  },
  /**
   * Accelerate until halfway, then decelerate.
   * @param t - Time.
   * @returns Value at time t.
   */
  easeInOutQuint(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
  }
};
/**
 * Experimentaly compute the width of the scrollbar for this browser.
 * @returns The width in pixels.
 */
function getScrollBarWidth() {
  const inner = document.createElement("p");
  inner.style.width = "100%";
  inner.style.height = "200px";
  const outer = document.createElement("div");
  outer.style.position = "absolute";
  outer.style.top = "0px";
  outer.style.left = "0px";
  outer.style.visibility = "hidden";
  outer.style.width = "200px";
  outer.style.height = "150px";
  outer.style.overflow = "hidden";
  outer.appendChild(inner);
  document.body.appendChild(outer);
  const w1 = inner.offsetWidth;
  outer.style.overflow = "scroll";
  let w2 = inner.offsetWidth;
  if (w1 == w2) {
    w2 = outer.clientWidth;
  }
  document.body.removeChild(outer);
  return w1 - w2;
}
// @TODO: This doesn't work properly.
// It works only for single property objects,
// otherwise it combines all of the types in a union.
// export function topMost<K1 extends string, V1> (
//   pile: Record<K1, undefined | V1>[],
//   accessors: K1 | [K1]
// ): undefined | V1
// export function topMost<K1 extends string, K2 extends string, V1, V2> (
//   pile: Record<K1, undefined | V1 | Record<K2, undefined | V2>>[],
//   accessors: [K1, K2]
// ): undefined | V1 | V2
// export function topMost<K1 extends string, K2 extends string, K3 extends string, V1, V2, V3> (
//   pile: Record<K1, undefined | V1 | Record<K2, undefined | V2 | Record<K3, undefined | V3>>>[],
//   accessors: [K1, K2, K3]
// ): undefined | V1 | V2 | V3
/**
 * Get the top most property value from a pile of objects.
 * @param pile - Array of objects, no required format.
 * @param accessors - Array of property names.
 * For example `object['foo']['bar']` → `['foo', 'bar']`.
 * @returns Value of the property with given accessors path from the first pile item where it's not undefined.
 */
function topMost(pile, accessors) {
  let candidate;
  if (!_Array$isArray(accessors)) {
    accessors = [accessors];
  }
  for (const member of pile) {
    if (member) {
      candidate = member[accessors[0]];
      for (let i = 1; i < accessors.length; i++) {
        if (candidate) {
          candidate = candidate[accessors[i]];
        }
      }
      if (typeof candidate !== "undefined") {
        break;
      }
    }
  }
  return candidate;
}

const htmlColors = {
  black: "#000000",
  navy: "#000080",
  darkblue: "#00008B",
  mediumblue: "#0000CD",
  blue: "#0000FF",
  darkgreen: "#006400",
  green: "#008000",
  teal: "#008080",
  darkcyan: "#008B8B",
  deepskyblue: "#00BFFF",
  darkturquoise: "#00CED1",
  mediumspringgreen: "#00FA9A",
  lime: "#00FF00",
  springgreen: "#00FF7F",
  aqua: "#00FFFF",
  cyan: "#00FFFF",
  midnightblue: "#191970",
  dodgerblue: "#1E90FF",
  lightseagreen: "#20B2AA",
  forestgreen: "#228B22",
  seagreen: "#2E8B57",
  darkslategray: "#2F4F4F",
  limegreen: "#32CD32",
  mediumseagreen: "#3CB371",
  turquoise: "#40E0D0",
  royalblue: "#4169E1",
  steelblue: "#4682B4",
  darkslateblue: "#483D8B",
  mediumturquoise: "#48D1CC",
  indigo: "#4B0082",
  darkolivegreen: "#556B2F",
  cadetblue: "#5F9EA0",
  cornflowerblue: "#6495ED",
  mediumaquamarine: "#66CDAA",
  dimgray: "#696969",
  slateblue: "#6A5ACD",
  olivedrab: "#6B8E23",
  slategray: "#708090",
  lightslategray: "#778899",
  mediumslateblue: "#7B68EE",
  lawngreen: "#7CFC00",
  chartreuse: "#7FFF00",
  aquamarine: "#7FFFD4",
  maroon: "#800000",
  purple: "#800080",
  olive: "#808000",
  gray: "#808080",
  skyblue: "#87CEEB",
  lightskyblue: "#87CEFA",
  blueviolet: "#8A2BE2",
  darkred: "#8B0000",
  darkmagenta: "#8B008B",
  saddlebrown: "#8B4513",
  darkseagreen: "#8FBC8F",
  lightgreen: "#90EE90",
  mediumpurple: "#9370D8",
  darkviolet: "#9400D3",
  palegreen: "#98FB98",
  darkorchid: "#9932CC",
  yellowgreen: "#9ACD32",
  sienna: "#A0522D",
  brown: "#A52A2A",
  darkgray: "#A9A9A9",
  lightblue: "#ADD8E6",
  greenyellow: "#ADFF2F",
  paleturquoise: "#AFEEEE",
  lightsteelblue: "#B0C4DE",
  powderblue: "#B0E0E6",
  firebrick: "#B22222",
  darkgoldenrod: "#B8860B",
  mediumorchid: "#BA55D3",
  rosybrown: "#BC8F8F",
  darkkhaki: "#BDB76B",
  silver: "#C0C0C0",
  mediumvioletred: "#C71585",
  indianred: "#CD5C5C",
  peru: "#CD853F",
  chocolate: "#D2691E",
  tan: "#D2B48C",
  lightgrey: "#D3D3D3",
  palevioletred: "#D87093",
  thistle: "#D8BFD8",
  orchid: "#DA70D6",
  goldenrod: "#DAA520",
  crimson: "#DC143C",
  gainsboro: "#DCDCDC",
  plum: "#DDA0DD",
  burlywood: "#DEB887",
  lightcyan: "#E0FFFF",
  lavender: "#E6E6FA",
  darksalmon: "#E9967A",
  violet: "#EE82EE",
  palegoldenrod: "#EEE8AA",
  lightcoral: "#F08080",
  khaki: "#F0E68C",
  aliceblue: "#F0F8FF",
  honeydew: "#F0FFF0",
  azure: "#F0FFFF",
  sandybrown: "#F4A460",
  wheat: "#F5DEB3",
  beige: "#F5F5DC",
  whitesmoke: "#F5F5F5",
  mintcream: "#F5FFFA",
  ghostwhite: "#F8F8FF",
  salmon: "#FA8072",
  antiquewhite: "#FAEBD7",
  linen: "#FAF0E6",
  lightgoldenrodyellow: "#FAFAD2",
  oldlace: "#FDF5E6",
  red: "#FF0000",
  fuchsia: "#FF00FF",
  magenta: "#FF00FF",
  deeppink: "#FF1493",
  orangered: "#FF4500",
  tomato: "#FF6347",
  hotpink: "#FF69B4",
  coral: "#FF7F50",
  darkorange: "#FF8C00",
  lightsalmon: "#FFA07A",
  orange: "#FFA500",
  lightpink: "#FFB6C1",
  pink: "#FFC0CB",
  gold: "#FFD700",
  peachpuff: "#FFDAB9",
  navajowhite: "#FFDEAD",
  moccasin: "#FFE4B5",
  bisque: "#FFE4C4",
  mistyrose: "#FFE4E1",
  blanchedalmond: "#FFEBCD",
  papayawhip: "#FFEFD5",
  lavenderblush: "#FFF0F5",
  seashell: "#FFF5EE",
  cornsilk: "#FFF8DC",
  lemonchiffon: "#FFFACD",
  floralwhite: "#FFFAF0",
  snow: "#FFFAFA",
  yellow: "#FFFF00",
  lightyellow: "#FFFFE0",
  ivory: "#FFFFF0",
  white: "#FFFFFF"
};

/**
 * @param {number} [pixelRatio=1]
 */
let ColorPicker$1 = class ColorPicker {
  /**
   * @param {number} [pixelRatio]
   */
  constructor() {
    let pixelRatio = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    this.pixelRatio = pixelRatio;
    this.generated = false;
    this.centerCoordinates = {
      x: 289 / 2,
      y: 289 / 2
    };
    this.r = 289 * 0.49;
    this.color = {
      r: 255,
      g: 255,
      b: 255,
      a: 1.0
    };
    this.hueCircle = undefined;
    this.initialColor = {
      r: 255,
      g: 255,
      b: 255,
      a: 1.0
    };
    this.previousColor = undefined;
    this.applied = false;

    // bound by
    this.updateCallback = () => {};
    this.closeCallback = () => {};

    // create all DOM elements
    this._create();
  }

  /**
   * this inserts the colorPicker into a div from the DOM
   * @param {Element} container
   */
  insertTo(container) {
    if (this.hammer !== undefined) {
      this.hammer.destroy();
      this.hammer = undefined;
    }
    this.container = container;
    this.container.appendChild(this.frame);
    this._bindHammer();
    this._setSize();
  }

  /**
   * the callback is executed on apply and save. Bind it to the application
   * @param {Function} callback
   */
  setUpdateCallback(callback) {
    if (typeof callback === "function") {
      this.updateCallback = callback;
    } else {
      throw new Error("Function attempted to set as colorPicker update callback is not a function.");
    }
  }

  /**
   * the callback is executed on apply and save. Bind it to the application
   * @param {Function} callback
   */
  setCloseCallback(callback) {
    if (typeof callback === "function") {
      this.closeCallback = callback;
    } else {
      throw new Error("Function attempted to set as colorPicker closing callback is not a function.");
    }
  }

  /**
   *
   * @param {string} color
   * @returns {string}
   * @private
   */
  _isColorString(color) {
    if (typeof color === "string") {
      return htmlColors[color];
    }
  }

  /**
   * Set the color of the colorPicker
   * Supported formats:
   * 'red'                   --> HTML color string
   * '#ffffff'               --> hex string
   * 'rgb(255,255,255)'      --> rgb string
   * 'rgba(255,255,255,1.0)' --> rgba string
   * {r:255,g:255,b:255}     --> rgb object
   * {r:255,g:255,b:255,a:1.0} --> rgba object
   * @param {string | object} color
   * @param {boolean} [setInitial]
   */
  setColor(color) {
    let setInitial = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (color === "none") {
      return;
    }
    let rgba;

    // if a html color shorthand is used, convert to hex
    const htmlColor = this._isColorString(color);
    if (htmlColor !== undefined) {
      color = htmlColor;
    }

    // check format
    if (isString(color) === true) {
      if (isValidRGB(color) === true) {
        const rgbaArray = color.substr(4).substr(0, color.length - 5).split(",");
        rgba = {
          r: rgbaArray[0],
          g: rgbaArray[1],
          b: rgbaArray[2],
          a: 1.0
        };
      } else if (isValidRGBA(color) === true) {
        const rgbaArray = color.substr(5).substr(0, color.length - 6).split(",");
        rgba = {
          r: rgbaArray[0],
          g: rgbaArray[1],
          b: rgbaArray[2],
          a: rgbaArray[3]
        };
      } else if (isValidHex(color) === true) {
        const rgbObj = hexToRGB(color);
        rgba = {
          r: rgbObj.r,
          g: rgbObj.g,
          b: rgbObj.b,
          a: 1.0
        };
      }
    } else {
      if (color instanceof Object) {
        if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
          const alpha = color.a !== undefined ? color.a : "1.0";
          rgba = {
            r: color.r,
            g: color.g,
            b: color.b,
            a: alpha
          };
        }
      }
    }

    // set color
    if (rgba === undefined) {
      throw new Error("Unknown color passed to the colorPicker. Supported are strings: rgb, hex, rgba. Object: rgb ({r:r,g:g,b:b,[a:a]}). Supplied: " + _JSON$stringify(color));
    } else {
      this._setColor(rgba, setInitial);
    }
  }

  /**
   * this shows the color picker.
   * The hue circle is constructed once and stored.
   */
  show() {
    if (this.closeCallback !== undefined) {
      this.closeCallback();
      this.closeCallback = undefined;
    }
    this.applied = false;
    this.frame.style.display = "block";
    this._generateHueCircle();
  }

  // ------------------------------------------ PRIVATE ----------------------------- //

  /**
   * Hide the picker. Is called by the cancel button.
   * Optional boolean to store the previous color for easy access later on.
   * @param {boolean} [storePrevious]
   * @private
   */
  _hide() {
    let storePrevious = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    // store the previous color for next time;
    if (storePrevious === true) {
      this.previousColor = _Object$assign({}, this.color);
    }
    if (this.applied === true) {
      this.updateCallback(this.initialColor);
    }
    this.frame.style.display = "none";

    // call the closing callback, restoring the onclick method.
    // this is in a setTimeout because it will trigger the show again before the click is done.
    _setTimeout(() => {
      if (this.closeCallback !== undefined) {
        this.closeCallback();
        this.closeCallback = undefined;
      }
    }, 0);
  }

  /**
   * bound to the save button. Saves and hides.
   * @private
   */
  _save() {
    this.updateCallback(this.color);
    this.applied = false;
    this._hide();
  }

  /**
   * Bound to apply button. Saves but does not close. Is undone by the cancel button.
   * @private
   */
  _apply() {
    this.applied = true;
    this.updateCallback(this.color);
    this._updatePicker(this.color);
  }

  /**
   * load the color from the previous session.
   * @private
   */
  _loadLast() {
    if (this.previousColor !== undefined) {
      this.setColor(this.previousColor, false);
    } else {
      alert("There is no last color to load...");
    }
  }

  /**
   * set the color, place the picker
   * @param {object} rgba
   * @param {boolean} [setInitial]
   * @private
   */
  _setColor(rgba) {
    let setInitial = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    // store the initial color
    if (setInitial === true) {
      this.initialColor = _Object$assign({}, rgba);
    }
    this.color = rgba;
    const hsv = RGBToHSV(rgba.r, rgba.g, rgba.b);
    const angleConvert = 2 * Math.PI;
    const radius = this.r * hsv.s;
    const x = this.centerCoordinates.x + radius * Math.sin(angleConvert * hsv.h);
    const y = this.centerCoordinates.y + radius * Math.cos(angleConvert * hsv.h);
    this.colorPickerSelector.style.left = x - 0.5 * this.colorPickerSelector.clientWidth + "px";
    this.colorPickerSelector.style.top = y - 0.5 * this.colorPickerSelector.clientHeight + "px";
    this._updatePicker(rgba);
  }

  /**
   * bound to opacity control
   * @param {number} value
   * @private
   */
  _setOpacity(value) {
    this.color.a = value / 100;
    this._updatePicker(this.color);
  }

  /**
   * bound to brightness control
   * @param {number} value
   * @private
   */
  _setBrightness(value) {
    const hsv = RGBToHSV(this.color.r, this.color.g, this.color.b);
    hsv.v = value / 100;
    const rgba = HSVToRGB(hsv.h, hsv.s, hsv.v);
    rgba["a"] = this.color.a;
    this.color = rgba;
    this._updatePicker();
  }

  /**
   * update the color picker. A black circle overlays the hue circle to mimic the brightness decreasing.
   * @param {object} rgba
   * @private
   */
  _updatePicker() {
    let rgba = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.color;
    const hsv = RGBToHSV(rgba.r, rgba.g, rgba.b);
    const ctx = this.colorPickerCanvas.getContext("2d");
    if (this.pixelRation === undefined) {
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1);
    }
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    // clear the canvas
    const w = this.colorPickerCanvas.clientWidth;
    const h = this.colorPickerCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(this.hueCircle, 0, 0);
    ctx.fillStyle = "rgba(0,0,0," + (1 - hsv.v) + ")";
    ctx.circle(this.centerCoordinates.x, this.centerCoordinates.y, this.r);
    _fillInstanceProperty(ctx).call(ctx);
    this.brightnessRange.value = 100 * hsv.v;
    this.opacityRange.value = 100 * rgba.a;
    this.initialColorDiv.style.backgroundColor = "rgba(" + this.initialColor.r + "," + this.initialColor.g + "," + this.initialColor.b + "," + this.initialColor.a + ")";
    this.newColorDiv.style.backgroundColor = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + "," + this.color.a + ")";
  }

  /**
   * used by create to set the size of the canvas.
   * @private
   */
  _setSize() {
    this.colorPickerCanvas.style.width = "100%";
    this.colorPickerCanvas.style.height = "100%";
    this.colorPickerCanvas.width = 289 * this.pixelRatio;
    this.colorPickerCanvas.height = 289 * this.pixelRatio;
  }

  /**
   * create all dom elements
   * TODO: cleanup, lots of similar dom elements
   * @private
   */
  _create() {
    var _context, _context2, _context3, _context4;
    this.frame = document.createElement("div");
    this.frame.className = "vis-color-picker";
    this.colorPickerDiv = document.createElement("div");
    this.colorPickerSelector = document.createElement("div");
    this.colorPickerSelector.className = "vis-selector";
    this.colorPickerDiv.appendChild(this.colorPickerSelector);
    this.colorPickerCanvas = document.createElement("canvas");
    this.colorPickerDiv.appendChild(this.colorPickerCanvas);
    if (!this.colorPickerCanvas.getContext) {
      const noCanvas = document.createElement("DIV");
      noCanvas.style.color = "red";
      noCanvas.style.fontWeight = "bold";
      noCanvas.style.padding = "10px";
      noCanvas.innerText = "Error: your browser does not support HTML canvas";
      this.colorPickerCanvas.appendChild(noCanvas);
    } else {
      const ctx = this.colorPickerCanvas.getContext("2d");
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1);
      this.colorPickerCanvas.getContext("2d").setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }
    this.colorPickerDiv.className = "vis-color";
    this.opacityDiv = document.createElement("div");
    this.opacityDiv.className = "vis-opacity";
    this.brightnessDiv = document.createElement("div");
    this.brightnessDiv.className = "vis-brightness";
    this.arrowDiv = document.createElement("div");
    this.arrowDiv.className = "vis-arrow";
    this.opacityRange = document.createElement("input");
    try {
      this.opacityRange.type = "range"; // Not supported on IE9
      this.opacityRange.min = "0";
      this.opacityRange.max = "100";
    } catch (err) {
      // TODO: Add some error handling.
    }
    this.opacityRange.value = "100";
    this.opacityRange.className = "vis-range";
    this.brightnessRange = document.createElement("input");
    try {
      this.brightnessRange.type = "range"; // Not supported on IE9
      this.brightnessRange.min = "0";
      this.brightnessRange.max = "100";
    } catch (err) {
      // TODO: Add some error handling.
    }
    this.brightnessRange.value = "100";
    this.brightnessRange.className = "vis-range";
    this.opacityDiv.appendChild(this.opacityRange);
    this.brightnessDiv.appendChild(this.brightnessRange);
    const me = this;
    this.opacityRange.onchange = function () {
      me._setOpacity(this.value);
    };
    this.opacityRange.oninput = function () {
      me._setOpacity(this.value);
    };
    this.brightnessRange.onchange = function () {
      me._setBrightness(this.value);
    };
    this.brightnessRange.oninput = function () {
      me._setBrightness(this.value);
    };
    this.brightnessLabel = document.createElement("div");
    this.brightnessLabel.className = "vis-label vis-brightness";
    this.brightnessLabel.innerText = "brightness:";
    this.opacityLabel = document.createElement("div");
    this.opacityLabel.className = "vis-label vis-opacity";
    this.opacityLabel.innerText = "opacity:";
    this.newColorDiv = document.createElement("div");
    this.newColorDiv.className = "vis-new-color";
    this.newColorDiv.innerText = "new";
    this.initialColorDiv = document.createElement("div");
    this.initialColorDiv.className = "vis-initial-color";
    this.initialColorDiv.innerText = "initial";
    this.cancelButton = document.createElement("div");
    this.cancelButton.className = "vis-button vis-cancel";
    this.cancelButton.innerText = "cancel";
    this.cancelButton.onclick = _bindInstanceProperty(_context = this._hide).call(_context, this, false);
    this.applyButton = document.createElement("div");
    this.applyButton.className = "vis-button vis-apply";
    this.applyButton.innerText = "apply";
    this.applyButton.onclick = _bindInstanceProperty(_context2 = this._apply).call(_context2, this);
    this.saveButton = document.createElement("div");
    this.saveButton.className = "vis-button vis-save";
    this.saveButton.innerText = "save";
    this.saveButton.onclick = _bindInstanceProperty(_context3 = this._save).call(_context3, this);
    this.loadButton = document.createElement("div");
    this.loadButton.className = "vis-button vis-load";
    this.loadButton.innerText = "load last";
    this.loadButton.onclick = _bindInstanceProperty(_context4 = this._loadLast).call(_context4, this);
    this.frame.appendChild(this.colorPickerDiv);
    this.frame.appendChild(this.arrowDiv);
    this.frame.appendChild(this.brightnessLabel);
    this.frame.appendChild(this.brightnessDiv);
    this.frame.appendChild(this.opacityLabel);
    this.frame.appendChild(this.opacityDiv);
    this.frame.appendChild(this.newColorDiv);
    this.frame.appendChild(this.initialColorDiv);
    this.frame.appendChild(this.cancelButton);
    this.frame.appendChild(this.applyButton);
    this.frame.appendChild(this.saveButton);
    this.frame.appendChild(this.loadButton);
  }

  /**
   * bind hammer to the color picker
   * @private
   */
  _bindHammer() {
    this.drag = {};
    this.pinch = {};
    this.hammer = new Hammer$1(this.colorPickerCanvas);
    this.hammer.get("pinch").set({
      enable: true
    });
    this.hammer.on("hammer.input", event => {
      if (event.isFirst) {
        this._moveSelector(event);
      }
    });
    this.hammer.on("tap", event => {
      this._moveSelector(event);
    });
    this.hammer.on("panstart", event => {
      this._moveSelector(event);
    });
    this.hammer.on("panmove", event => {
      this._moveSelector(event);
    });
    this.hammer.on("panend", event => {
      this._moveSelector(event);
    });
  }

  /**
   * generate the hue circle. This is relatively heavy (200ms) and is done only once on the first time it is shown.
   * @private
   */
  _generateHueCircle() {
    if (this.generated === false) {
      const ctx = this.colorPickerCanvas.getContext("2d");
      if (this.pixelRation === undefined) {
        this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1);
      }
      ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

      // clear the canvas
      const w = this.colorPickerCanvas.clientWidth;
      const h = this.colorPickerCanvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // draw hue circle
      let x, y, hue, sat;
      this.centerCoordinates = {
        x: w * 0.5,
        y: h * 0.5
      };
      this.r = 0.49 * w;
      const angleConvert = 2 * Math.PI / 360;
      const hfac = 1 / 360;
      const sfac = 1 / this.r;
      let rgb;
      for (hue = 0; hue < 360; hue++) {
        for (sat = 0; sat < this.r; sat++) {
          x = this.centerCoordinates.x + sat * Math.sin(angleConvert * hue);
          y = this.centerCoordinates.y + sat * Math.cos(angleConvert * hue);
          rgb = HSVToRGB(hue * hfac, sat * sfac, 1);
          ctx.fillStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
          ctx.fillRect(x - 0.5, y - 0.5, 2, 2);
        }
      }
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.circle(this.centerCoordinates.x, this.centerCoordinates.y, this.r);
      ctx.stroke();
      this.hueCircle = ctx.getImageData(0, 0, w, h);
    }
    this.generated = true;
  }

  /**
   * move the selector. This is called by hammer functions.
   * @param {Event}  event   The event
   * @private
   */
  _moveSelector(event) {
    const rect = this.colorPickerDiv.getBoundingClientRect();
    const left = event.center.x - rect.left;
    const top = event.center.y - rect.top;
    const centerY = 0.5 * this.colorPickerDiv.clientHeight;
    const centerX = 0.5 * this.colorPickerDiv.clientWidth;
    const x = left - centerX;
    const y = top - centerY;
    const angle = Math.atan2(x, y);
    const radius = 0.98 * Math.min(Math.sqrt(x * x + y * y), centerX);
    const newTop = Math.cos(angle) * radius + centerY;
    const newLeft = Math.sin(angle) * radius + centerX;
    this.colorPickerSelector.style.top = newTop - 0.5 * this.colorPickerSelector.clientHeight + "px";
    this.colorPickerSelector.style.left = newLeft - 0.5 * this.colorPickerSelector.clientWidth + "px";

    // set color
    let h = angle / (2 * Math.PI);
    h = h < 0 ? h + 1 : h;
    const s = radius / this.r;
    const hsv = RGBToHSV(this.color.r, this.color.g, this.color.b);
    hsv.h = h;
    hsv.s = s;
    const rgba = HSVToRGB(hsv.h, hsv.s, hsv.v);
    rgba["a"] = this.color.a;
    this.color = rgba;

    // update previews
    this.initialColorDiv.style.backgroundColor = "rgba(" + this.initialColor.r + "," + this.initialColor.g + "," + this.initialColor.b + "," + this.initialColor.a + ")";
    this.newColorDiv.style.backgroundColor = "rgba(" + this.color.r + "," + this.color.g + "," + this.color.b + "," + this.color.a + ")";
  }
};

/**
 * Wrap given text (last argument) in HTML elements (all preceding arguments).
 * @param {...any} rest - List of tag names followed by inner text.
 * @returns An element or a text node.
 */
function wrapInTag() {
  for (var _len = arguments.length, rest = new Array(_len), _key = 0; _key < _len; _key++) {
    rest[_key] = arguments[_key];
  }
  if (rest.length < 1) {
    throw new TypeError("Invalid arguments.");
  } else if (rest.length === 1) {
    return document.createTextNode(rest[0]);
  } else {
    const element = document.createElement(rest[0]);
    element.appendChild(wrapInTag(..._sliceInstanceProperty(rest).call(rest, 1)));
    return element;
  }
}

/**
 * The way this works is for all properties of this.possible options, you can supply the property name in any form to list the options.
 * Boolean options are recognised as Boolean
 * Number options should be written as array: [default value, min value, max value, stepsize]
 * Colors should be written as array: ['color', '#ffffff']
 * Strings with should be written as array: [option1, option2, option3, ..]
 *
 * The options are matched with their counterparts in each of the modules and the values used in the configuration are
 */
let Configurator$1 = class Configurator {
  /**
   * @param {object} parentModule        | the location where parentModule.setOptions() can be called
   * @param {object} defaultContainer    | the default container of the module
   * @param {object} configureOptions    | the fully configured and predefined options set found in allOptions.js
   * @param {number} pixelRatio          | canvas pixel ratio
   * @param {Function} hideOption        | custom logic to dynamically hide options
   */
  constructor(parentModule, defaultContainer, configureOptions) {
    let pixelRatio = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
    let hideOption = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : () => false;
    this.parent = parentModule;
    this.changedOptions = [];
    this.container = defaultContainer;
    this.allowCreation = false;
    this.hideOption = hideOption;
    this.options = {};
    this.initialized = false;
    this.popupCounter = 0;
    this.defaultOptions = {
      enabled: false,
      filter: true,
      container: undefined,
      showButton: true
    };
    _Object$assign(this.options, this.defaultOptions);
    this.configureOptions = configureOptions;
    this.moduleOptions = {};
    this.domElements = [];
    this.popupDiv = {};
    this.popupLimit = 5;
    this.popupHistory = {};
    this.colorPicker = new ColorPicker$1(pixelRatio);
    this.wrapper = undefined;
  }

  /**
   * refresh all options.
   * Because all modules parse their options by themselves, we just use their options. We copy them here.
   * @param {object} options
   */
  setOptions(options) {
    if (options !== undefined) {
      // reset the popup history because the indices may have been changed.
      this.popupHistory = {};
      this._removePopup();
      let enabled = true;
      if (typeof options === "string") {
        this.options.filter = options;
      } else if (_Array$isArray(options)) {
        this.options.filter = options.join();
      } else if (typeof options === "object") {
        if (options == null) {
          throw new TypeError("options cannot be null");
        }
        if (options.container !== undefined) {
          this.options.container = options.container;
        }
        if (_filterInstanceProperty(options) !== undefined) {
          this.options.filter = _filterInstanceProperty(options);
        }
        if (options.showButton !== undefined) {
          this.options.showButton = options.showButton;
        }
        if (options.enabled !== undefined) {
          enabled = options.enabled;
        }
      } else if (typeof options === "boolean") {
        this.options.filter = true;
        enabled = options;
      } else if (typeof options === "function") {
        this.options.filter = options;
        enabled = true;
      }
      if (_filterInstanceProperty(this.options) === false) {
        enabled = false;
      }
      this.options.enabled = enabled;
    }
    this._clean();
  }

  /**
   *
   * @param {object} moduleOptions
   */
  setModuleOptions(moduleOptions) {
    this.moduleOptions = moduleOptions;
    if (this.options.enabled === true) {
      this._clean();
      if (this.options.container !== undefined) {
        this.container = this.options.container;
      }
      this._create();
    }
  }

  /**
   * Create all DOM elements
   * @private
   */
  _create() {
    this._clean();
    this.changedOptions = [];
    const filter = _filterInstanceProperty(this.options);
    let counter = 0;
    let show = false;
    for (const option in this.configureOptions) {
      if (Object.prototype.hasOwnProperty.call(this.configureOptions, option)) {
        this.allowCreation = false;
        show = false;
        if (typeof filter === "function") {
          show = filter(option, []);
          show = show || this._handleObject(this.configureOptions[option], [option], true);
        } else if (filter === true || _indexOfInstanceProperty(filter).call(filter, option) !== -1) {
          show = true;
        }
        if (show !== false) {
          this.allowCreation = true;

          // linebreak between categories
          if (counter > 0) {
            this._makeItem([]);
          }
          // a header for the category
          this._makeHeader(option);

          // get the sub options
          this._handleObject(this.configureOptions[option], [option]);
        }
        counter++;
      }
    }
    this._makeButton();
    this._push();
    //~ this.colorPicker.insertTo(this.container);
  }

  /**
   * draw all DOM elements on the screen
   * @private
   */
  _push() {
    this.wrapper = document.createElement("div");
    this.wrapper.className = "vis-configuration-wrapper";
    this.container.appendChild(this.wrapper);
    for (let i = 0; i < this.domElements.length; i++) {
      this.wrapper.appendChild(this.domElements[i]);
    }
    this._showPopupIfNeeded();
  }

  /**
   * delete all DOM elements
   * @private
   */
  _clean() {
    for (let i = 0; i < this.domElements.length; i++) {
      this.wrapper.removeChild(this.domElements[i]);
    }
    if (this.wrapper !== undefined) {
      this.container.removeChild(this.wrapper);
      this.wrapper = undefined;
    }
    this.domElements = [];
    this._removePopup();
  }

  /**
   * get the value from the actualOptions if it exists
   * @param {Array} path    | where to look for the actual option
   * @returns {*}
   * @private
   */
  _getValue(path) {
    let base = this.moduleOptions;
    for (let i = 0; i < path.length; i++) {
      if (base[path[i]] !== undefined) {
        base = base[path[i]];
      } else {
        base = undefined;
        break;
      }
    }
    return base;
  }

  /**
   * all option elements are wrapped in an item
   * @param {Array} path    | where to look for the actual option
   * @param {Array.<Element>} domElements
   * @returns {number}
   * @private
   */
  _makeItem(path) {
    if (this.allowCreation === true) {
      const item = document.createElement("div");
      item.className = "vis-configuration vis-config-item vis-config-s" + path.length;
      for (var _len2 = arguments.length, domElements = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        domElements[_key2 - 1] = arguments[_key2];
      }
      _forEachInstanceProperty(domElements).call(domElements, element => {
        item.appendChild(element);
      });
      this.domElements.push(item);
      return this.domElements.length;
    }
    return 0;
  }

  /**
   * header for major subjects
   * @param {string} name
   * @private
   */
  _makeHeader(name) {
    const div = document.createElement("div");
    div.className = "vis-configuration vis-config-header";
    div.innerText = name;
    this._makeItem([], div);
  }

  /**
   * make a label, if it is an object label, it gets different styling.
   * @param {string} name
   * @param {Array} path    | where to look for the actual option
   * @param {string} objectLabel
   * @returns {HTMLElement}
   * @private
   */
  _makeLabel(name, path) {
    let objectLabel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    const div = document.createElement("div");
    div.className = "vis-configuration vis-config-label vis-config-s" + path.length;
    if (objectLabel === true) {
      while (div.firstChild) {
        div.removeChild(div.firstChild);
      }
      div.appendChild(wrapInTag("i", "b", name));
    } else {
      div.innerText = name + ":";
    }
    return div;
  }

  /**
   * make a dropdown list for multiple possible string optoins
   * @param {Array.<number>} arr
   * @param {number} value
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _makeDropdown(arr, value, path) {
    const select = document.createElement("select");
    select.className = "vis-configuration vis-config-select";
    let selectedValue = 0;
    if (value !== undefined) {
      if (_indexOfInstanceProperty(arr).call(arr, value) !== -1) {
        selectedValue = _indexOfInstanceProperty(arr).call(arr, value);
      }
    }
    for (let i = 0; i < arr.length; i++) {
      const option = document.createElement("option");
      option.value = arr[i];
      if (i === selectedValue) {
        option.selected = "selected";
      }
      option.innerText = arr[i];
      select.appendChild(option);
    }
    const me = this;
    select.onchange = function () {
      me._update(this.value, path);
    };
    const label = this._makeLabel(path[path.length - 1], path);
    this._makeItem(path, label, select);
  }

  /**
   * make a range object for numeric options
   * @param {Array.<number>} arr
   * @param {number} value
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _makeRange(arr, value, path) {
    const defaultValue = arr[0];
    const min = arr[1];
    const max = arr[2];
    const step = arr[3];
    const range = document.createElement("input");
    range.className = "vis-configuration vis-config-range";
    try {
      range.type = "range"; // not supported on IE9
      range.min = min;
      range.max = max;
    } catch (err) {
      // TODO: Add some error handling.
    }
    range.step = step;

    // set up the popup settings in case they are needed.
    let popupString = "";
    let popupValue = 0;
    if (value !== undefined) {
      const factor = 1.2;
      if (value < 0 && value * factor < min) {
        range.min = Math.ceil(value * factor);
        popupValue = range.min;
        popupString = "range increased";
      } else if (value / factor < min) {
        range.min = Math.ceil(value / factor);
        popupValue = range.min;
        popupString = "range increased";
      }
      if (value * factor > max && max !== 1) {
        range.max = Math.ceil(value * factor);
        popupValue = range.max;
        popupString = "range increased";
      }
      range.value = value;
    } else {
      range.value = defaultValue;
    }
    const input = document.createElement("input");
    input.className = "vis-configuration vis-config-rangeinput";
    input.value = range.value;
    const me = this;
    range.onchange = function () {
      input.value = this.value;
      me._update(Number(this.value), path);
    };
    range.oninput = function () {
      input.value = this.value;
    };
    const label = this._makeLabel(path[path.length - 1], path);
    const itemIndex = this._makeItem(path, label, range, input);

    // if a popup is needed AND it has not been shown for this value, show it.
    if (popupString !== "" && this.popupHistory[itemIndex] !== popupValue) {
      this.popupHistory[itemIndex] = popupValue;
      this._setupPopup(popupString, itemIndex);
    }
  }

  /**
   * make a button object
   * @private
   */
  _makeButton() {
    if (this.options.showButton === true) {
      const generateButton = document.createElement("div");
      generateButton.className = "vis-configuration vis-config-button";
      generateButton.innerText = "generate options";
      generateButton.onclick = () => {
        this._printOptions();
      };
      generateButton.onmouseover = () => {
        generateButton.className = "vis-configuration vis-config-button hover";
      };
      generateButton.onmouseout = () => {
        generateButton.className = "vis-configuration vis-config-button";
      };
      this.optionsContainer = document.createElement("div");
      this.optionsContainer.className = "vis-configuration vis-config-option-container";
      this.domElements.push(this.optionsContainer);
      this.domElements.push(generateButton);
    }
  }

  /**
   * prepare the popup
   * @param {string} string
   * @param {number} index
   * @private
   */
  _setupPopup(string, index) {
    if (this.initialized === true && this.allowCreation === true && this.popupCounter < this.popupLimit) {
      const div = document.createElement("div");
      div.id = "vis-configuration-popup";
      div.className = "vis-configuration-popup";
      div.innerText = string;
      div.onclick = () => {
        this._removePopup();
      };
      this.popupCounter += 1;
      this.popupDiv = {
        html: div,
        index: index
      };
    }
  }

  /**
   * remove the popup from the dom
   * @private
   */
  _removePopup() {
    if (this.popupDiv.html !== undefined) {
      this.popupDiv.html.parentNode.removeChild(this.popupDiv.html);
      clearTimeout(this.popupDiv.hideTimeout);
      clearTimeout(this.popupDiv.deleteTimeout);
      this.popupDiv = {};
    }
  }

  /**
   * Show the popup if it is needed.
   * @private
   */
  _showPopupIfNeeded() {
    if (this.popupDiv.html !== undefined) {
      const correspondingElement = this.domElements[this.popupDiv.index];
      const rect = correspondingElement.getBoundingClientRect();
      this.popupDiv.html.style.left = rect.left + "px";
      this.popupDiv.html.style.top = rect.top - 30 + "px"; // 30 is the height;
      document.body.appendChild(this.popupDiv.html);
      this.popupDiv.hideTimeout = _setTimeout(() => {
        this.popupDiv.html.style.opacity = 0;
      }, 1500);
      this.popupDiv.deleteTimeout = _setTimeout(() => {
        this._removePopup();
      }, 1800);
    }
  }

  /**
   * make a checkbox for boolean options.
   * @param {number} defaultValue
   * @param {number} value
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _makeCheckbox(defaultValue, value, path) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "vis-configuration vis-config-checkbox";
    checkbox.checked = defaultValue;
    if (value !== undefined) {
      checkbox.checked = value;
      if (value !== defaultValue) {
        if (typeof defaultValue === "object") {
          if (value !== defaultValue.enabled) {
            this.changedOptions.push({
              path: path,
              value: value
            });
          }
        } else {
          this.changedOptions.push({
            path: path,
            value: value
          });
        }
      }
    }
    const me = this;
    checkbox.onchange = function () {
      me._update(this.checked, path);
    };
    const label = this._makeLabel(path[path.length - 1], path);
    this._makeItem(path, label, checkbox);
  }

  /**
   * make a text input field for string options.
   * @param {number} defaultValue
   * @param {number} value
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _makeTextInput(defaultValue, value, path) {
    const checkbox = document.createElement("input");
    checkbox.type = "text";
    checkbox.className = "vis-configuration vis-config-text";
    checkbox.value = value;
    if (value !== defaultValue) {
      this.changedOptions.push({
        path: path,
        value: value
      });
    }
    const me = this;
    checkbox.onchange = function () {
      me._update(this.value, path);
    };
    const label = this._makeLabel(path[path.length - 1], path);
    this._makeItem(path, label, checkbox);
  }

  /**
   * make a color field with a color picker for color fields
   * @param {Array.<number>} arr
   * @param {number} value
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _makeColorField(arr, value, path) {
    const defaultColor = arr[1];
    const div = document.createElement("div");
    value = value === undefined ? defaultColor : value;
    if (value !== "none") {
      div.className = "vis-configuration vis-config-colorBlock";
      div.style.backgroundColor = value;
    } else {
      div.className = "vis-configuration vis-config-colorBlock none";
    }
    value = value === undefined ? defaultColor : value;
    div.onclick = () => {
      this._showColorPicker(value, div, path);
    };
    const label = this._makeLabel(path[path.length - 1], path);
    this._makeItem(path, label, div);
  }

  /**
   * used by the color buttons to call the color picker.
   * @param {number} value
   * @param {HTMLElement} div
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _showColorPicker(value, div, path) {
    // clear the callback from this div
    div.onclick = function () {};
    this.colorPicker.insertTo(div);
    this.colorPicker.show();
    this.colorPicker.setColor(value);
    this.colorPicker.setUpdateCallback(color => {
      const colorString = "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")";
      div.style.backgroundColor = colorString;
      this._update(colorString, path);
    });

    // on close of the colorpicker, restore the callback.
    this.colorPicker.setCloseCallback(() => {
      div.onclick = () => {
        this._showColorPicker(value, div, path);
      };
    });
  }

  /**
   * parse an object and draw the correct items
   * @param {object} obj
   * @param {Array} [path]    | where to look for the actual option
   * @param {boolean} [checkOnly]
   * @returns {boolean}
   * @private
   */
  _handleObject(obj) {
    let path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    let checkOnly = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    let show = false;
    const filter = _filterInstanceProperty(this.options);
    let visibleInSet = false;
    for (const subObj in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, subObj)) {
        show = true;
        const item = obj[subObj];
        const newPath = copyAndExtendArray(path, subObj);
        if (typeof filter === "function") {
          show = filter(subObj, path);

          // if needed we must go deeper into the object.
          if (show === false) {
            if (!_Array$isArray(item) && typeof item !== "string" && typeof item !== "boolean" && item instanceof Object) {
              this.allowCreation = false;
              show = this._handleObject(item, newPath, true);
              this.allowCreation = checkOnly === false;
            }
          }
        }
        if (show !== false) {
          visibleInSet = true;
          const value = this._getValue(newPath);
          if (_Array$isArray(item)) {
            this._handleArray(item, value, newPath);
          } else if (typeof item === "string") {
            this._makeTextInput(item, value, newPath);
          } else if (typeof item === "boolean") {
            this._makeCheckbox(item, value, newPath);
          } else if (item instanceof Object) {
            // skip the options that are not enabled
            if (!this.hideOption(path, subObj, this.moduleOptions)) {
              // initially collapse options with an disabled enabled option.
              if (item.enabled !== undefined) {
                const enabledPath = copyAndExtendArray(newPath, "enabled");
                const enabledValue = this._getValue(enabledPath);
                if (enabledValue === true) {
                  const label = this._makeLabel(subObj, newPath, true);
                  this._makeItem(newPath, label);
                  visibleInSet = this._handleObject(item, newPath) || visibleInSet;
                } else {
                  this._makeCheckbox(item, enabledValue, newPath);
                }
              } else {
                const label = this._makeLabel(subObj, newPath, true);
                this._makeItem(newPath, label);
                visibleInSet = this._handleObject(item, newPath) || visibleInSet;
              }
            }
          } else {
            console.error("dont know how to handle", item, subObj, newPath);
          }
        }
      }
    }
    return visibleInSet;
  }

  /**
   * handle the array type of option
   * @param {Array.<number>} arr
   * @param {number} value
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _handleArray(arr, value, path) {
    if (typeof arr[0] === "string" && arr[0] === "color") {
      this._makeColorField(arr, value, path);
      if (arr[1] !== value) {
        this.changedOptions.push({
          path: path,
          value: value
        });
      }
    } else if (typeof arr[0] === "string") {
      this._makeDropdown(arr, value, path);
      if (arr[0] !== value) {
        this.changedOptions.push({
          path: path,
          value: value
        });
      }
    } else if (typeof arr[0] === "number") {
      this._makeRange(arr, value, path);
      if (arr[0] !== value) {
        this.changedOptions.push({
          path: path,
          value: Number(value)
        });
      }
    }
  }

  /**
   * called to update the network with the new settings.
   * @param {number} value
   * @param {Array} path    | where to look for the actual option
   * @private
   */
  _update(value, path) {
    const options = this._constructOptions(value, path);
    if (this.parent.body && this.parent.body.emitter && this.parent.body.emitter.emit) {
      this.parent.body.emitter.emit("configChange", options);
    }
    this.initialized = true;
    this.parent.setOptions(options);
  }

  /**
   *
   * @param {string | boolean} value
   * @param {Array.<string>} path
   * @param {{}} optionsObj
   * @returns {{}}
   * @private
   */
  _constructOptions(value, path) {
    let optionsObj = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    let pointer = optionsObj;

    // when dropdown boxes can be string or boolean, we typecast it into correct types
    value = value === "true" ? true : value;
    value = value === "false" ? false : value;
    for (let i = 0; i < path.length; i++) {
      if (path[i] !== "global") {
        if (pointer[path[i]] === undefined) {
          pointer[path[i]] = {};
        }
        if (i !== path.length - 1) {
          pointer = pointer[path[i]];
        } else {
          pointer[path[i]] = value;
        }
      }
    }
    return optionsObj;
  }

  /**
   * @private
   */
  _printOptions() {
    const options = this.getOptions();
    while (this.optionsContainer.firstChild) {
      this.optionsContainer.removeChild(this.optionsContainer.firstChild);
    }
    this.optionsContainer.appendChild(wrapInTag("pre", "const options = " + _JSON$stringify(options, null, 2)));
  }

  /**
   *
   * @returns {{}} options
   */
  getOptions() {
    const options = {};
    for (let i = 0; i < this.changedOptions.length; i++) {
      this._constructOptions(this.changedOptions[i].value, this.changedOptions[i].path, options);
    }
    return options;
  }
};

/**
 * Popup is a class to create a popup window with some text
 */
let Popup$1 = class Popup {
  /**
   * @param {Element} container       The container object.
   * @param {string}  overflowMethod  How the popup should act to overflowing ('flip' or 'cap')
   */
  constructor(container, overflowMethod) {
    this.container = container;
    this.overflowMethod = overflowMethod || "cap";
    this.x = 0;
    this.y = 0;
    this.padding = 5;
    this.hidden = false;

    // create the frame
    this.frame = document.createElement("div");
    this.frame.className = "vis-tooltip";
    this.container.appendChild(this.frame);
  }

  /**
   * @param {number} x   Horizontal position of the popup window
   * @param {number} y   Vertical position of the popup window
   */
  setPosition(x, y) {
    this.x = _parseInt(x);
    this.y = _parseInt(y);
  }

  /**
   * Set the content for the popup window. This can be HTML code or text.
   * @param {string | Element} content
   */
  setText(content) {
    if (content instanceof Element) {
      while (this.frame.firstChild) {
        this.frame.removeChild(this.frame.firstChild);
      }
      this.frame.appendChild(content);
    } else {
      // String containing literal text, element has to be used for HTML due to
      // XSS risks associated with innerHTML (i.e. prevent XSS by accident).
      this.frame.innerText = content;
    }
  }

  /**
   * Show the popup window
   * @param {boolean} [doShow]    Show or hide the window
   */
  show(doShow) {
    if (doShow === undefined) {
      doShow = true;
    }
    if (doShow === true) {
      const height = this.frame.clientHeight;
      const width = this.frame.clientWidth;
      const maxHeight = this.frame.parentNode.clientHeight;
      const maxWidth = this.frame.parentNode.clientWidth;
      let left = 0,
        top = 0;
      if (this.overflowMethod == "flip") {
        let isLeft = false,
          isTop = true; // Where around the position it's located

        if (this.y - height < this.padding) {
          isTop = false;
        }
        if (this.x + width > maxWidth - this.padding) {
          isLeft = true;
        }
        if (isLeft) {
          left = this.x - width;
        } else {
          left = this.x;
        }
        if (isTop) {
          top = this.y - height;
        } else {
          top = this.y;
        }
      } else {
        top = this.y - height;
        if (top + height + this.padding > maxHeight) {
          top = maxHeight - height - this.padding;
        }
        if (top < this.padding) {
          top = this.padding;
        }
        left = this.x;
        if (left + width + this.padding > maxWidth) {
          left = maxWidth - width - this.padding;
        }
        if (left < this.padding) {
          left = this.padding;
        }
      }
      this.frame.style.left = left + "px";
      this.frame.style.top = top + "px";
      this.frame.style.visibility = "visible";
      this.hidden = false;
    } else {
      this.hide();
    }
  }

  /**
   * Hide the popup window
   */
  hide() {
    this.hidden = true;
    this.frame.style.left = "0";
    this.frame.style.top = "0";
    this.frame.style.visibility = "hidden";
  }

  /**
   * Remove the popup window
   */
  destroy() {
    this.frame.parentNode.removeChild(this.frame); // Remove element from DOM
  }
};

let errorFound = false;
let allOptions;
const VALIDATOR_PRINT_STYLE$1 = "background: #FFeeee; color: #dd0000";

/**
 *  Used to validate options.
 */
let Validator$1 = class Validator {
  /**
   * Main function to be called
   * @param {object} options
   * @param {object} referenceOptions
   * @param {object} subObject
   * @returns {boolean}
   * @static
   */
  static validate(options, referenceOptions, subObject) {
    errorFound = false;
    allOptions = referenceOptions;
    let usedOptions = referenceOptions;
    if (subObject !== undefined) {
      usedOptions = referenceOptions[subObject];
    }
    Validator.parse(options, usedOptions, []);
    return errorFound;
  }

  /**
   * Will traverse an object recursively and check every value
   * @param {object} options
   * @param {object} referenceOptions
   * @param {Array} path    | where to look for the actual option
   * @static
   */
  static parse(options, referenceOptions, path) {
    for (const option in options) {
      if (Object.prototype.hasOwnProperty.call(options, option)) {
        Validator.check(option, options, referenceOptions, path);
      }
    }
  }

  /**
   * Check every value. If the value is an object, call the parse function on that object.
   * @param {string} option
   * @param {object} options
   * @param {object} referenceOptions
   * @param {Array} path    | where to look for the actual option
   * @static
   */
  static check(option, options, referenceOptions, path) {
    if (referenceOptions[option] === undefined && referenceOptions.__any__ === undefined) {
      Validator.getSuggestion(option, referenceOptions, path);
      return;
    }
    let referenceOption = option;
    let is_object = true;
    if (referenceOptions[option] === undefined && referenceOptions.__any__ !== undefined) {
      // NOTE: This only triggers if the __any__ is in the top level of the options object.
      //       THAT'S A REALLY BAD PLACE TO ALLOW IT!!!!
      // TODO: Examine if needed, remove if possible

      // __any__ is a wildcard. Any value is accepted and will be further analysed by reference.
      referenceOption = "__any__";

      // if the any-subgroup is not a predefined object in the configurator,
      // we do not look deeper into the object.
      is_object = Validator.getType(options[option]) === "object";
    }
    let refOptionObj = referenceOptions[referenceOption];
    if (is_object && refOptionObj.__type__ !== undefined) {
      refOptionObj = refOptionObj.__type__;
    }
    Validator.checkFields(option, options, referenceOptions, referenceOption, refOptionObj, path);
  }

  /**
   *
   * @param {string}  option           | the option property
   * @param {object}  options          | The supplied options object
   * @param {object}  referenceOptions | The reference options containing all options and their allowed formats
   * @param {string}  referenceOption  | Usually this is the same as option, except when handling an __any__ tag.
   * @param {string}  refOptionObj     | This is the type object from the reference options
   * @param {Array}   path             | where in the object is the option
   * @static
   */
  static checkFields(option, options, referenceOptions, referenceOption, refOptionObj, path) {
    const log = function (message) {
      console.error("%c" + message + Validator.printLocation(path, option), VALIDATOR_PRINT_STYLE$1);
    };
    const optionType = Validator.getType(options[option]);
    const refOptionType = refOptionObj[optionType];
    if (refOptionType !== undefined) {
      // if the type is correct, we check if it is supposed to be one of a few select values
      if (Validator.getType(refOptionType) === "array" && _indexOfInstanceProperty(refOptionType).call(refOptionType, options[option]) === -1) {
        log('Invalid option detected in "' + option + '".' + " Allowed values are:" + Validator.print(refOptionType) + ' not "' + options[option] + '". ');
        errorFound = true;
      } else if (optionType === "object" && referenceOption !== "__any__") {
        path = copyAndExtendArray(path, option);
        Validator.parse(options[option], referenceOptions[referenceOption], path);
      }
    } else if (refOptionObj["any"] === undefined) {
      // type of the field is incorrect and the field cannot be any
      log('Invalid type received for "' + option + '". Expected: ' + Validator.print(_Object$keys(refOptionObj)) + ". Received [" + optionType + '] "' + options[option] + '"');
      errorFound = true;
    }
  }

  /**
   *
   * @param {object | boolean | number | string | Array.<number> | Date | Node | Moment | undefined | null} object
   * @returns {string}
   * @static
   */
  static getType(object) {
    const type = typeof object;
    if (type === "object") {
      if (object === null) {
        return "null";
      }
      if (object instanceof Boolean) {
        return "boolean";
      }
      if (object instanceof Number) {
        return "number";
      }
      if (object instanceof String) {
        return "string";
      }
      if (_Array$isArray(object)) {
        return "array";
      }
      if (object instanceof Date) {
        return "date";
      }
      if (object.nodeType !== undefined) {
        return "dom";
      }
      if (object._isAMomentObject === true) {
        return "moment";
      }
      return "object";
    } else if (type === "number") {
      return "number";
    } else if (type === "boolean") {
      return "boolean";
    } else if (type === "string") {
      return "string";
    } else if (type === undefined) {
      return "undefined";
    }
    return type;
  }

  /**
   * @param {string} option
   * @param {object} options
   * @param {Array.<string>} path
   * @static
   */
  static getSuggestion(option, options, path) {
    const localSearch = Validator.findInOptions(option, options, path, false);
    const globalSearch = Validator.findInOptions(option, allOptions, [], true);
    const localSearchThreshold = 8;
    const globalSearchThreshold = 4;
    let msg;
    if (localSearch.indexMatch !== undefined) {
      msg = " in " + Validator.printLocation(localSearch.path, option, "") + 'Perhaps it was incomplete? Did you mean: "' + localSearch.indexMatch + '"?\n\n';
    } else if (globalSearch.distance <= globalSearchThreshold && localSearch.distance > globalSearch.distance) {
      msg = " in " + Validator.printLocation(localSearch.path, option, "") + "Perhaps it was misplaced? Matching option found at: " + Validator.printLocation(globalSearch.path, globalSearch.closestMatch, "");
    } else if (localSearch.distance <= localSearchThreshold) {
      msg = '. Did you mean "' + localSearch.closestMatch + '"?' + Validator.printLocation(localSearch.path, option);
    } else {
      msg = ". Did you mean one of these: " + Validator.print(_Object$keys(options)) + Validator.printLocation(path, option);
    }
    console.error('%cUnknown option detected: "' + option + '"' + msg, VALIDATOR_PRINT_STYLE$1);
    errorFound = true;
  }

  /**
   * traverse the options in search for a match.
   * @param {string} option
   * @param {object} options
   * @param {Array} path    | where to look for the actual option
   * @param {boolean} [recursive]
   * @returns {{closestMatch: string, path: Array, distance: number}}
   * @static
   */
  static findInOptions(option, options, path) {
    let recursive = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    let min = 1e9;
    let closestMatch = "";
    let closestMatchPath = [];
    const lowerCaseOption = option.toLowerCase();
    let indexMatch = undefined;
    for (const op in options) {
      let distance;
      if (options[op].__type__ !== undefined && recursive === true) {
        const result = Validator.findInOptions(option, options[op], copyAndExtendArray(path, op));
        if (min > result.distance) {
          closestMatch = result.closestMatch;
          closestMatchPath = result.path;
          min = result.distance;
          indexMatch = result.indexMatch;
        }
      } else {
        var _context;
        if (_indexOfInstanceProperty(_context = op.toLowerCase()).call(_context, lowerCaseOption) !== -1) {
          indexMatch = op;
        }
        distance = Validator.levenshteinDistance(option, op);
        if (min > distance) {
          closestMatch = op;
          closestMatchPath = copyArray(path);
          min = distance;
        }
      }
    }
    return {
      closestMatch: closestMatch,
      path: closestMatchPath,
      distance: min,
      indexMatch: indexMatch
    };
  }

  /**
   * @param {Array.<string>} path
   * @param {object} option
   * @param {string} prefix
   * @returns {string}
   * @static
   */
  static printLocation(path, option) {
    let prefix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "Problem value found at: \n";
    let str = "\n\n" + prefix + "options = {\n";
    for (let i = 0; i < path.length; i++) {
      for (let j = 0; j < i + 1; j++) {
        str += "  ";
      }
      str += path[i] + ": {\n";
    }
    for (let j = 0; j < path.length + 1; j++) {
      str += "  ";
    }
    str += option + "\n";
    for (let i = 0; i < path.length + 1; i++) {
      for (let j = 0; j < path.length - i; j++) {
        str += "  ";
      }
      str += "}\n";
    }
    return str + "\n\n";
  }

  /**
   * @param {object} options
   * @returns {string}
   * @static
   */
  static print(options) {
    return _JSON$stringify(options).replace(/(")|(\[)|(\])|(,"__type__")/g, "").replace(/(,)/g, ", ");
  }

  /**
   *  Compute the edit distance between the two given strings
   *  http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#JavaScript
   *
   *  Copyright (c) 2011 Andrei Mackenzie
   *
   *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
   *
   *  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
   *
   *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
   * @param {string} a
   * @param {string} b
   * @returns {Array.<Array.<number>>}}
   * @static
   */
  static levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];

    // increment along the first column of each row
    let i;
    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // increment each column in the first row
    let j;
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1,
          // substitution
          Math.min(matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j] + 1)); // deletion
        }
      }
    }
    return matrix[b.length][a.length];
  }
};

const Activator = Activator$1;
const ColorPicker = ColorPicker$1;
const Configurator = Configurator$1;
const Hammer = Hammer$1;
const Popup = Popup$1;
const VALIDATOR_PRINT_STYLE = VALIDATOR_PRINT_STYLE$1;
const Validator = Validator$1;

export { Activator, Alea, ColorPicker, Configurator, DELETE, HSVToHex, HSVToRGB, Hammer, Popup, RGBToHSV, RGBToHex, VALIDATOR_PRINT_STYLE, Validator, addClassName, addCssText, binarySearchCustom, binarySearchValue, bridgeObject, copyAndExtendArray, copyArray, deepExtend, deepObjectAssign, easingFunctions, equalArray, extend, fillIfDefined, forEach, getAbsoluteLeft, getAbsoluteRight, getAbsoluteTop, getScrollBarWidth, getTarget, getType, hasParent, hexToHSV, hexToRGB, insertSort, isDate, isNumber, isObject, isString, isValidHex, isValidRGB, isValidRGBA, mergeOptions, option, overrideOpacity, parseColor, preventDefault, pureDeepObjectAssign, recursiveDOMDelete, removeClassName, removeCssText, selectiveBridgeObject, selectiveDeepExtend, selectiveExtend, selectiveNotDeepExtend, throttle, toArray, topMost, updateProperty };
//# sourceMappingURL=vis-util.js.map
