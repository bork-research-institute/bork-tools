var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all3) => {
  for (var name in all3)
    __defProp(target, name, { get: all3[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../node_modules/pg/node_modules/pg-types/node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "../node_modules/pg/node_modules/pg-types/node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character2 = this.source[this.position++];
        if (character2 === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character2,
          escaped: false
        };
      }
      record(character2) {
        this.recorded.push(character2);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character2, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character2 = this.nextCharacter();
          if (character2.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character2.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character2.value === '"' && !character2.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character2.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character2.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// ../node_modules/pg/node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "../node_modules/pg/node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    var array = require_postgres_array();
    module.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// ../node_modules/pg/node_modules/pg-types/node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "../node_modules/pg/node_modules/pg-types/node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// ../node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "../node_modules/xtend/mutable.js"(exports, module) {
    module.exports = extend2;
    var hasOwnProperty2 = Object.prototype.hasOwnProperty;
    function extend2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty2.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// ../node_modules/pg/node_modules/pg-types/node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "../node_modules/pg/node_modules/pg-types/node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    var extend2 = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend2(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// ../node_modules/pg/node_modules/pg-types/node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "../node_modules/pg/node_modules/pg-types/node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    module.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return new Buffer(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return new Buffer(output, "binary");
    };
  }
});

// ../node_modules/pg/node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "../node_modules/pg/node_modules/pg-types/lib/textParsers.js"(exports, module) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module.exports = {
      init
    };
  }
});

// ../node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "../node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t5;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t5 = 4294967296 * carry + low;
        low = t5 / BASE >>> 0;
        digits = "" + (t5 - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t5 = 4294967296 * carry + low;
        low = t5 / BASE >>> 0;
        digits = "" + (t5 - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t5 = 4294967296 * carry + low;
        low = t5 / BASE >>> 0;
        digits = "" + (t5 - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t5 = 4294967296 * carry + low;
        digits = "" + t5 % BASE;
        return sign + digits + result;
      }
    }
    module.exports = readInt8;
  }
});

// ../node_modules/pg/node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "../node_modules/pg/node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module.exports = {
      init
    };
  }
});

// ../node_modules/pg/node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "../node_modules/pg/node_modules/pg-types/lib/builtins.js"(exports, module) {
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// ../node_modules/pg/node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "../node_modules/pg/node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// ../node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "../node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user: process.platform === "win32" ? process.env.USERNAME : process.env.USER,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// ../node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "../node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    var defaults2 = require_defaults();
    function escapeElement(elementRepresentation) {
      var escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      var result = "{";
      for (var i = 0; i < val.length; i++) {
        if (i > 0) {
          result = result + ",";
        }
        if (val[i] === null || typeof val[i] === "undefined") {
          result = result + "NULL";
        } else if (Array.isArray(val[i])) {
          result = result + arrayString(val[i]);
        } else if (ArrayBuffer.isView(val[i])) {
          var item = val[i];
          if (!(item instanceof Buffer)) {
            var buf = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
            if (buf.length === item.byteLength) {
              item = buf;
            } else {
              item = buf.slice(item.byteOffset, item.byteOffset + item.byteLength);
            }
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(val[i]));
        }
      }
      result = result + "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (val instanceof Buffer) {
        return val;
      }
      if (ArrayBuffer.isView(val)) {
        var buf = Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        if (buf.length === val.byteLength) {
          return buf;
        }
        return buf.slice(val.byteOffset, val.byteOffset + val.byteLength);
      }
      if (val instanceof Date) {
        if (defaults2.parseInputDatesAsUTC) {
          return dateToStringUTC(val);
        } else {
          return dateToString(val);
        }
      }
      if (Array.isArray(val)) {
        return arrayString(val);
      }
      if (typeof val === "object") {
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function pad(number, digits) {
      number = "" + number;
      while (number.length < digits) {
        number = "0" + number;
      }
      return number;
    }
    function dateToString(date) {
      var offset = -date.getTimezoneOffset();
      var year = date.getFullYear();
      var isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      var ret = pad(year, 4) + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2) + "T" + pad(date.getHours(), 2) + ":" + pad(date.getMinutes(), 2) + ":" + pad(date.getSeconds(), 2) + "." + pad(date.getMilliseconds(), 3);
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += pad(Math.floor(offset / 60), 2) + ":" + pad(offset % 60, 2);
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      var year = date.getUTCFullYear();
      var isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      var ret = pad(year, 4) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2) + "T" + pad(date.getUTCHours(), 2) + ":" + pad(date.getUTCMinutes(), 2) + ":" + pad(date.getUTCSeconds(), 2) + "." + pad(date.getUTCMilliseconds(), 3);
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : config;
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    var escapeIdentifier = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral = function(str) {
      var hasBackslash = false;
      var escaped = "'";
      for (var i = 0; i < str.length; i++) {
        var c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier,
      escapeLiteral
    };
  }
});

// ../node_modules/pg/lib/crypto/utils-legacy.js
var require_utils_legacy = __commonJS({
  "../node_modules/pg/lib/crypto/utils-legacy.js"(exports, module) {
    "use strict";
    var nodeCrypto = __require("crypto");
    function md5(string) {
      return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
    }
    function postgresMd5PasswordHash(user, password, salt) {
      var inner = md5(password + user);
      var outer = md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    function sha256(text) {
      return nodeCrypto.createHash("sha256").update(text).digest();
    }
    function hmacSha256(key, msg) {
      return nodeCrypto.createHmac("sha256", key).update(msg).digest();
    }
    async function deriveKey(password, salt, iterations) {
      return nodeCrypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    }
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes: nodeCrypto.randomBytes,
      deriveKey,
      sha256,
      hmacSha256,
      md5
    };
  }
});

// ../node_modules/pg/lib/crypto/utils-webcrypto.js
var require_utils_webcrypto = __commonJS({
  "../node_modules/pg/lib/crypto/utils-webcrypto.js"(exports, module) {
    var nodeCrypto = __require("crypto");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder2 = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder2.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      var inner = await md5(password + user);
      var outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder2.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder2.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// ../node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "../node_modules/pg/lib/crypto/utils.js"(exports, module) {
    "use strict";
    var useLegacyCrypto = parseInt(process.versions && process.versions.node && process.versions.node.split(".")[0]) < 15;
    if (useLegacyCrypto) {
      module.exports = require_utils_legacy();
    } else {
      module.exports = require_utils_webcrypto();
    }
  }
});

// ../node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "../node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    var crypto2 = require_utils2();
    function startSession(mechanisms) {
      if (mechanisms.indexOf("SCRAM-SHA-256") === -1) {
        throw new Error("SASL: Only mechanism SCRAM-SHA-256 is currently supported");
      }
      const clientNonce = crypto2.randomBytes(18).toString("base64");
      return {
        mechanism: "SCRAM-SHA-256",
        clientNonce,
        response: "n,,n=*,r=" + clientNonce,
        message: "SASLInitialResponse"
      };
    }
    async function continueSession(session, password, serverData) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      var clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      var serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      var clientFinalMessageWithoutProof = "c=biws,r=" + sv.nonce;
      var authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      var saltBytes = Buffer.from(sv.salt, "base64");
      var saltedPassword = await crypto2.deriveKey(password, saltBytes, sv.iteration);
      var clientKey = await crypto2.hmacSha256(saltedPassword, "Client Key");
      var storedKey = await crypto2.sha256(clientKey);
      var clientSignature = await crypto2.hmacSha256(storedKey, authMessage);
      var clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      var serverKey = await crypto2.hmacSha256(saltedPassword, "Server Key");
      var serverSignatureBytes = await crypto2.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const serverSignature = attrPairs.get("v");
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module.exports = {
      startSession,
      continueSession,
      finalizeSession
    };
  }
});

// ../node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "../node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    var types = require_pg_types();
    function TypeOverrides(userTypes) {
      this._types = userTypes || types;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module.exports = TypeOverrides;
  }
});

// ../node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "../node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    function parse(str) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = {};
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/\%25(\d\d)/g, "%$1");
      }
      try {
        result = new URL(str, "postgres://base");
      } catch (e) {
        result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
        dummyHost = true;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      const fs3 = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs3.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs3.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs3.readFileSync(config.sslrootcert).toString();
      }
      switch (config.sslmode) {
        case "disable": {
          config.ssl = false;
          break;
        }
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full": {
          break;
        }
        case "no-verify": {
          config.ssl.rejectUnauthorized = false;
          break;
        }
      }
      return config;
    }
    module.exports = parse;
    parse.parse = parse;
  }
});

// ../node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "../node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    var dns = __require("dns");
    var defaults2 = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return config[key] || envVar || defaults2[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      var value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        var params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        var ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});

// ../node_modules/pg/lib/result.js
var require_result = __commonJS({
  "../node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    var types = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result = class {
      constructor(rowMode, types2) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types2;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        var match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        var row = new Array(rowData.length);
        for (var i = 0, len = rowData.length; i < len; i++) {
          var rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        var row = { ...this._prebuiltEmptyResultObject };
        for (var i = 0, len = rowData.length; i < len; i++) {
          var rawValue = rowData[i];
          var field = this.fields[i].name;
          if (rawValue !== null) {
            row[field] = this._parsers[i](rawValue);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        var row = {};
        for (var i = 0; i < fieldDescriptions.length; i++) {
          var desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result;
  }
});

// ../node_modules/pg/lib/query.js
var require_query = __commonJS({
  "../node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    var { EventEmitter: EventEmitter2 } = __require("events");
    var Result = require_result();
    var utils = require_utils();
    var Query = class extends EventEmitter2 {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the intial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          this.prepare(connection);
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && connection.parsedStatements[this.name];
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      // eslint-disable-next-line no-unused-vars
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query;
  }
});

// ../node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "../node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// ../node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "../node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        var remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          var oldBuffer = this.buffer;
          var newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          var len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        var len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        var result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
    };
    exports.Writer = Writer;
  }
});

// ../node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "../node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      var bodyBuffer = writer.addCString("").flush();
      var length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32(Buffer.byteLength(initialResponse)).addString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types = query2.types || emptyArray;
      var len = types.length;
      var buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (var i = 0; i < len; i++) {
        buffer.addInt32(types[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* ParamType.BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(Buffer.byteLength(mappedVal));
          paramWriter.addString(mappedVal);
        }
      }
    };
    var bind2 = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      writeValues(values, config.valueMapper);
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind: bind2,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// ../node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "../node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = emptyBuffer;
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++] !== 0) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// ../node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "../node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        switch (code) {
          case 50:
            return messages_1.bindComplete;
          case 49:
            return messages_1.parseComplete;
          case 51:
            return messages_1.closeComplete;
          case 110:
            return messages_1.noData;
          case 115:
            return messages_1.portalSuspended;
          case 99:
            return messages_1.copyDone;
          case 87:
            return messages_1.replicationStart;
          case 73:
            return messages_1.emptyQuery;
          case 68:
            return this.parseDataRowMessage(offset, length, bytes);
          case 67:
            return this.parseCommandCompleteMessage(offset, length, bytes);
          case 90:
            return this.parseReadyForQueryMessage(offset, length, bytes);
          case 65:
            return this.parseNotificationMessage(offset, length, bytes);
          case 82:
            return this.parseAuthenticationResponse(offset, length, bytes);
          case 83:
            return this.parseParameterStatusMessage(offset, length, bytes);
          case 75:
            return this.parseBackendKeyData(offset, length, bytes);
          case 69:
            return this.parseErrorMessage(offset, length, bytes, "error");
          case 78:
            return this.parseErrorMessage(offset, length, bytes, "notice");
          case 84:
            return this.parseRowDescriptionMessage(offset, length, bytes);
          case 116:
            return this.parseParameterDescriptionMessage(offset, length, bytes);
          case 71:
            return this.parseCopyInMessage(offset, length, bytes);
          case 72:
            return this.parseCopyOutMessage(offset, length, bytes);
          case 100:
            return this.parseCopyData(offset, length, bytes);
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
      }
      parseReadyForQueryMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const status = this.reader.string(1);
        return new messages_1.ReadyForQueryMessage(length, status);
      }
      parseCommandCompleteMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const text = this.reader.cstring();
        return new messages_1.CommandCompleteMessage(length, text);
      }
      parseCopyData(offset, length, bytes) {
        const chunk = bytes.slice(offset, offset + (length - 4));
        return new messages_1.CopyDataMessage(length, chunk);
      }
      parseCopyInMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, "copyInResponse");
      }
      parseCopyOutMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, "copyOutResponse");
      }
      parseCopyMessage(offset, length, bytes, messageName) {
        this.reader.setBuffer(offset, bytes);
        const isBinary = this.reader.byte() !== 0;
        const columnCount = this.reader.int16();
        const message = new messages_1.CopyResponse(length, messageName, isBinary, columnCount);
        for (let i = 0; i < columnCount; i++) {
          message.columnTypes[i] = this.reader.int16();
        }
        return message;
      }
      parseNotificationMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processId = this.reader.int32();
        const channel = this.reader.cstring();
        const payload = this.reader.cstring();
        return new messages_1.NotificationResponseMessage(length, processId, channel, payload);
      }
      parseRowDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const message = new messages_1.RowDescriptionMessage(length, fieldCount);
        for (let i = 0; i < fieldCount; i++) {
          message.fields[i] = this.parseField();
        }
        return message;
      }
      parseField() {
        const name = this.reader.cstring();
        const tableID = this.reader.uint32();
        const columnID = this.reader.int16();
        const dataTypeID = this.reader.uint32();
        const dataTypeSize = this.reader.int16();
        const dataTypeModifier = this.reader.int32();
        const mode = this.reader.int16() === 0 ? "text" : "binary";
        return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
      }
      parseParameterDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const parameterCount = this.reader.int16();
        const message = new messages_1.ParameterDescriptionMessage(length, parameterCount);
        for (let i = 0; i < parameterCount; i++) {
          message.dataTypeIDs[i] = this.reader.int32();
        }
        return message;
      }
      parseDataRowMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const fields = new Array(fieldCount);
        for (let i = 0; i < fieldCount; i++) {
          const len = this.reader.int32();
          fields[i] = len === -1 ? null : this.reader.string(len);
        }
        return new messages_1.DataRowMessage(length, fields);
      }
      parseParameterStatusMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const name = this.reader.cstring();
        const value = this.reader.cstring();
        return new messages_1.ParameterStatusMessage(length, name, value);
      }
      parseBackendKeyData(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processID = this.reader.int32();
        const secretKey = this.reader.int32();
        return new messages_1.BackendKeyDataMessage(length, processID, secretKey);
      }
      parseAuthenticationResponse(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const code = this.reader.int32();
        const message = {
          name: "authenticationOk",
          length
        };
        switch (code) {
          case 0:
            break;
          case 3:
            if (message.length === 8) {
              message.name = "authenticationCleartextPassword";
            }
            break;
          case 5:
            if (message.length === 12) {
              message.name = "authenticationMD5Password";
              const salt = this.reader.bytes(4);
              return new messages_1.AuthenticationMD5Password(length, salt);
            }
            break;
          case 10:
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = this.reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
            break;
          case 11:
            message.name = "authenticationSASLContinue";
            message.data = this.reader.string(length - 8);
            break;
          case 12:
            message.name = "authenticationSASLFinal";
            message.data = this.reader.string(length - 8);
            break;
          default:
            throw new Error("Unknown authenticationOk message type " + code);
        }
        return message;
      }
      parseErrorMessage(offset, length, bytes, name) {
        this.reader.setBuffer(offset, bytes);
        const fields = {};
        let fieldType = this.reader.string(1);
        while (fieldType !== "\0") {
          fields[fieldType] = this.reader.cstring();
          fieldType = this.reader.string(1);
        }
        const messageValue = fields.M;
        const message = name === "notice" ? new messages_1.NoticeMessage(length, messageValue) : new messages_1.DatabaseError(messageValue, length, name);
        message.severity = fields.S;
        message.code = fields.C;
        message.detail = fields.D;
        message.hint = fields.H;
        message.position = fields.P;
        message.internalPosition = fields.p;
        message.internalQuery = fields.q;
        message.where = fields.W;
        message.schema = fields.s;
        message.table = fields.t;
        message.column = fields.c;
        message.dataType = fields.d;
        message.constraint = fields.n;
        message.file = fields.F;
        message.line = fields.L;
        message.routine = fields.R;
        return message;
      }
    };
    exports.Parser = Parser;
  }
});

// ../node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "../node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = exports.parse = void 0;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream4, callback) {
      const parser = new parser_1.Parser();
      stream4.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream4.on("end", () => resolve()));
    }
    exports.parse = parse;
  }
});

// ../node_modules/pg-cloudflare/dist/empty.js
var empty_exports = {};
__export(empty_exports, {
  default: () => empty_default
});
var empty_default;
var init_empty = __esm({
  "../node_modules/pg-cloudflare/dist/empty.js"() {
    empty_default = {};
  }
});

// ../node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "../node_modules/pg/lib/stream.js"(exports, module) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = __require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        var tls = __require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = (init_empty(), __toCommonJS(empty_exports));
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// ../node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "../node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    var EventEmitter2 = __require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var { getStream, getSecureStream } = require_stream();
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection = class extends EventEmitter2 {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.lastBuffer = false;
        this.parsedStatements = {};
        this.ssl = config.ssl || false;
        this._ending = false;
        this._emitMessage = false;
        var self2 = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self2._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        var self2 = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self2._keepAlive) {
            self2.stream.setKeepAlive(true, self2._keepAliveInitialDelayMillis);
          }
          self2.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self2._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self2.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self2.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        this.stream.once("data", function(buffer) {
          var responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self2.stream.end();
              return self2.emit("error", new Error("The server does not support SSL connections"));
            default:
              self2.stream.end();
              return self2.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          const options = {
            socket: self2.stream
          };
          if (self2.ssl !== true) {
            Object.assign(options, self2.ssl);
            if ("key" in self2.ssl) {
              options.key = self2.ssl.key;
            }
          }
          var net = __require("net");
          if (net.isIP && net.isIP(host) === 0) {
            options.servername = host;
          }
          try {
            self2.stream = getSecureStream(options);
          } catch (err) {
            return self2.emit("error", err);
          }
          self2.attachListeners(self2.stream);
          self2.stream.on("error", reportStreamError);
          self2.emit("sslconnect");
        });
      }
      attachListeners(stream4) {
        parse(stream4, (msg) => {
          var eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection;
  }
});

// ../node_modules/split2/index.js
var require_split2 = __commonJS({
  "../node_modules/split2/index.js"(exports, module) {
    "use strict";
    var { Transform } = __require("stream");
    var { StringDecoder } = __require("string_decoder");
    var kLast = Symbol("last");
    var kDecoder = Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self2, val) {
      if (val !== void 0) {
        self2.push(val);
      }
    }
    function noop2(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop2;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop2;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream4 = new Transform(options);
      stream4[kLast] = "";
      stream4[kDecoder] = new StringDecoder("utf8");
      stream4.matcher = matcher;
      stream4.mapper = mapper;
      stream4.maxLength = options.maxLength;
      stream4.skipOverflow = options.skipOverflow || false;
      stream4.overflow = false;
      stream4._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream4;
    }
    module.exports = split;
  }
});

// ../node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "../node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    var path3 = __require("path");
    var Stream = __require("stream").Stream;
    var split = require_split2();
    var util3 = __require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util3.format.apply(util3, args));
      }
    }
    Object.defineProperty(module.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module.exports.warnTo = function(stream4) {
      var old = warnStream;
      warnStream = stream4;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path3.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path3.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream4, cb) {
      var pass;
      var lineStream = stream4.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream4.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream4.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream4.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// ../node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "../node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    var path3 = __require("path");
    var fs3 = __require("fs");
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs3.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs3.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});

// ../node_modules/pg/lib/client.js
var require_client = __commonJS({
  "../node_modules/pg/lib/client.js"(exports, module) {
    "use strict";
    var EventEmitter2 = __require("events").EventEmitter;
    var utils = require_utils();
    var sasl = require_sasl();
    var TypeOverrides = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query = require_query();
    var defaults2 = require_defaults();
    var Connection = require_connection();
    var crypto2 = require_utils2();
    var Client = class extends EventEmitter2 {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        var c = config || {};
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this.connection = c.connection || new Connection({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this.queryQueue = [];
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        if (this.activeQuery) {
          enqueueError(this.activeQuery);
          this.activeQuery = null;
        }
        this.queryQueue.forEach(enqueueError);
        this.queryQueue.length = 0;
      }
      _connect(callback) {
        var self2 = this;
        var con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self2.ssl) {
            con.requestSsl();
          } else {
            con.startup(self2.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self2.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      // TODO(bmc): deprecate pgpass "built in" integration since this.password can be a function
      // it can be supplied by the user if required - this is a breaking change!
      _checkPgPass(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password()).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._checkPgPass(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._checkPgPass(async () => {
          try {
            const hashedPassword = await crypto2.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._checkPgPass(() => {
          try {
            this.saslSession = sasl.startSession(msg.mechanisms);
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(this.saslSession, this.password, msg.data);
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const { activeQuery } = this;
        this.activeQuery = null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receieve an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this.activeQuery;
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this.activeQuery = null;
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        this.activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        this.activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        this.activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        this.activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        if (this.activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        this.activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        if (this.activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (this.activeQuery.name) {
          this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text;
        }
      }
      _handleCopyInResponse(msg) {
        this.activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        this.activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        var params = this.connectionParameters;
        var data = {
          user: params.user,
          database: params.database
        };
        var appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          var con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client.queryQueue.indexOf(query) !== -1) {
          client.queryQueue.splice(client.queryQueue.indexOf(query), 1);
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.readyForQuery === true) {
          this.activeQuery = this.queryQueue.shift();
          if (this.activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = this.activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                this.activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this.activeQuery = null;
            this.emit("drain");
          }
        }
      }
      query(config, values, callback) {
        var query;
        var result;
        var readTimeout;
        var readTimeoutTimer;
        var queryCallback;
        if (config === null || config === void 0) {
          throw new TypeError("Client was passed a null or undefined query");
        } else if (typeof config.submit === "function") {
          readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
          result = query = config;
          if (typeof values === "function") {
            query.callback = query.callback || values;
          }
        } else {
          readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
          query = new Query(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          }
        }
        if (readTimeout) {
          queryCallback = query.callback;
          readTimeoutTimer = setTimeout(() => {
            var error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            var index = this.queryQueue.indexOf(query);
            if (index > -1) {
              this.queryQueue.splice(index, 1);
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        this.queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
          } else {
            return this._Promise.resolve();
          }
        }
        if (this.activeQuery || !this._queryable) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
    };
    Client.Query = Query;
    module.exports = Client;
  }
});

// ../node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "../node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    var EventEmitter2 = __require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool2 = class extends EventEmitter2 {
      constructor(options, Client) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        client.end();
        this.emit("remove", client);
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            this.log("ending client due to timeout");
            timeoutHit = true;
            client.connection ? client.connection.stream.destroy() : client.end();
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.maxLifetimeSeconds !== 0) {
              const maxLifetimeTimeout = setTimeout(() => {
                this.log("ending client due to expired lifetime");
                this._expired.add(client);
                const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
                if (idleIndex !== -1) {
                  this._acquireClient(
                    client,
                    new PendingItem((err2, client2, clientRelease) => clientRelease()),
                    idleListener,
                    false
                  );
                }
              }, this.options.maxLifetimeSeconds * 1e3);
              maxLifetimeTimeout.unref();
              client.once("end", () => clearTimeout(maxLifetimeTimeout));
            }
            return this._acquireClient(client, pendingItem, idleListener, true);
          }
        });
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          this._remove(client);
          this._pulseQueue();
          return;
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          this._remove(client);
          this._pulseQueue();
          return;
        }
        let tid;
        if (this.options.idleTimeoutMillis) {
          tid = setTimeout(() => {
            this.log("remove idle client");
            this._remove(client);
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool2;
  }
});

// ../node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "../node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    var EventEmitter2 = __require("events").EventEmitter;
    var util3 = __require("util");
    var utils = require_utils();
    var NativeQuery = module.exports = function(config, values, callback) {
      EventEmitter2.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util3.inherits(NativeQuery, EventEmitter2);
    var errorFieldMap = {
      /* eslint-disable quote-props */
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      var fields = this.native.pq.resultErrorFields();
      if (fields) {
        for (var key in fields) {
          var normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      var self2 = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      var after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self2.emit("_done");
        });
        if (err) {
          return self2.handleError(err);
        }
        if (self2._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self2.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self2.emit("row", row, results);
            });
          }
        }
        self2.state = "end";
        self2.emit("end", results);
        if (self2.callback) {
          self2.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        var values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name]) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self2.name] = self2.text;
          return self2.native.execute(self2.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        var vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// ../node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "../node_modules/pg/lib/native/client.js"(exports, module) {
    "use strict";
    var Native;
    try {
      Native = __require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides = require_type_overrides();
    var EventEmitter2 = __require("events").EventEmitter;
    var util3 = __require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var Client = module.exports = function(config) {
      EventEmitter2.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      var cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client.Query = NativeQuery;
    util3.inherits(Client, EventEmitter2);
    Client.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client.prototype._connect = function(cb) {
      var self2 = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self2.connectionParameters.nativeConnectionString) conString = self2.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self2.native.connect(conString, function(err2) {
          if (err2) {
            self2.native.end();
            return cb(err2);
          }
          self2._connected = true;
          self2.native.on("error", function(err3) {
            self2._queryable = false;
            self2._errorAllQueries(err3);
            self2.emit("error", err3);
          });
          self2.native.on("notification", function(msg) {
            self2.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self2.emit("connect");
          self2._pulseQueryQueue(true);
          cb();
        });
      });
    };
    Client.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    };
    Client.prototype.query = function(config, values, callback) {
      var query;
      var result;
      var readTimeout;
      var readTimeoutTimer;
      var queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback;
        readTimeoutTimer = setTimeout(() => {
          var error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          var index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client.prototype.end = function(cb) {
      var self2 = this;
      this._ending = true;
      if (!this._connected) {
        this.once("connect", this.end.bind(this, cb));
      }
      var result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      this.native.end(function() {
        self2._errorAllQueries(new Error("Connection terminated"));
        process.nextTick(() => {
          self2.emit("end");
          if (cb) cb();
        });
      });
      return result;
    };
    Client.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this._hasActiveQuery()) {
        return;
      }
      var query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      var self2 = this;
      query.once("_done", function() {
        self2._pulseQueryQueue();
      });
    };
    Client.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client.prototype.ref = function() {
    };
    Client.prototype.unref = function() {
    };
    Client.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
  }
});

// ../node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "../node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    module.exports = require_client2();
  }
});

// ../node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "../node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    var Client = require_client();
    var defaults2 = require_defaults();
    var Connection = require_connection();
    var Pool2 = require_pg_pool();
    var { DatabaseError } = require_dist();
    var { escapeIdentifier, escapeLiteral } = require_utils();
    var poolFactory = (Client2) => {
      return class BoundPool extends Pool2 {
        constructor(options) {
          super(options, Client2);
        }
      };
    };
    var PG = function(clientConstructor) {
      this.defaults = defaults2;
      this.Client = clientConstructor;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError;
      this.escapeIdentifier = escapeIdentifier;
      this.escapeLiteral = escapeLiteral;
    };
    if (typeof process.env.NODE_PG_FORCE_NATIVE !== "undefined") {
      module.exports = new PG(require_native());
    } else {
      module.exports = new PG(Client);
      Object.defineProperty(module.exports, "native", {
        configurable: true,
        enumerable: false,
        get() {
          var native = null;
          try {
            native = new PG(require_native());
          } catch (err) {
            if (err.code !== "MODULE_NOT_FOUND") {
              throw err;
            }
          }
          Object.defineProperty(module.exports, "native", {
            value: native
          });
          return native;
        }
      });
    }
  }
});

// ../node_modules/delayed-stream/lib/delayed_stream.js
var require_delayed_stream = __commonJS({
  "../node_modules/delayed-stream/lib/delayed_stream.js"(exports, module) {
    var Stream = __require("stream").Stream;
    var util3 = __require("util");
    module.exports = DelayedStream;
    function DelayedStream() {
      this.source = null;
      this.dataSize = 0;
      this.maxDataSize = 1024 * 1024;
      this.pauseStream = true;
      this._maxDataSizeExceeded = false;
      this._released = false;
      this._bufferedEvents = [];
    }
    util3.inherits(DelayedStream, Stream);
    DelayedStream.create = function(source, options) {
      var delayedStream = new this();
      options = options || {};
      for (var option in options) {
        delayedStream[option] = options[option];
      }
      delayedStream.source = source;
      var realEmit = source.emit;
      source.emit = function() {
        delayedStream._handleEmit(arguments);
        return realEmit.apply(source, arguments);
      };
      source.on("error", function() {
      });
      if (delayedStream.pauseStream) {
        source.pause();
      }
      return delayedStream;
    };
    Object.defineProperty(DelayedStream.prototype, "readable", {
      configurable: true,
      enumerable: true,
      get: function() {
        return this.source.readable;
      }
    });
    DelayedStream.prototype.setEncoding = function() {
      return this.source.setEncoding.apply(this.source, arguments);
    };
    DelayedStream.prototype.resume = function() {
      if (!this._released) {
        this.release();
      }
      this.source.resume();
    };
    DelayedStream.prototype.pause = function() {
      this.source.pause();
    };
    DelayedStream.prototype.release = function() {
      this._released = true;
      this._bufferedEvents.forEach(function(args) {
        this.emit.apply(this, args);
      }.bind(this));
      this._bufferedEvents = [];
    };
    DelayedStream.prototype.pipe = function() {
      var r = Stream.prototype.pipe.apply(this, arguments);
      this.resume();
      return r;
    };
    DelayedStream.prototype._handleEmit = function(args) {
      if (this._released) {
        this.emit.apply(this, args);
        return;
      }
      if (args[0] === "data") {
        this.dataSize += args[1].length;
        this._checkIfMaxDataSizeExceeded();
      }
      this._bufferedEvents.push(args);
    };
    DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
      if (this._maxDataSizeExceeded) {
        return;
      }
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      this._maxDataSizeExceeded = true;
      var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this.emit("error", new Error(message));
    };
  }
});

// ../node_modules/combined-stream/lib/combined_stream.js
var require_combined_stream = __commonJS({
  "../node_modules/combined-stream/lib/combined_stream.js"(exports, module) {
    var util3 = __require("util");
    var Stream = __require("stream").Stream;
    var DelayedStream = require_delayed_stream();
    module.exports = CombinedStream;
    function CombinedStream() {
      this.writable = false;
      this.readable = true;
      this.dataSize = 0;
      this.maxDataSize = 2 * 1024 * 1024;
      this.pauseStreams = true;
      this._released = false;
      this._streams = [];
      this._currentStream = null;
      this._insideLoop = false;
      this._pendingNext = false;
    }
    util3.inherits(CombinedStream, Stream);
    CombinedStream.create = function(options) {
      var combinedStream = new this();
      options = options || {};
      for (var option in options) {
        combinedStream[option] = options[option];
      }
      return combinedStream;
    };
    CombinedStream.isStreamLike = function(stream4) {
      return typeof stream4 !== "function" && typeof stream4 !== "string" && typeof stream4 !== "boolean" && typeof stream4 !== "number" && !Buffer.isBuffer(stream4);
    };
    CombinedStream.prototype.append = function(stream4) {
      var isStreamLike = CombinedStream.isStreamLike(stream4);
      if (isStreamLike) {
        if (!(stream4 instanceof DelayedStream)) {
          var newStream = DelayedStream.create(stream4, {
            maxDataSize: Infinity,
            pauseStream: this.pauseStreams
          });
          stream4.on("data", this._checkDataSize.bind(this));
          stream4 = newStream;
        }
        this._handleErrors(stream4);
        if (this.pauseStreams) {
          stream4.pause();
        }
      }
      this._streams.push(stream4);
      return this;
    };
    CombinedStream.prototype.pipe = function(dest, options) {
      Stream.prototype.pipe.call(this, dest, options);
      this.resume();
      return dest;
    };
    CombinedStream.prototype._getNext = function() {
      this._currentStream = null;
      if (this._insideLoop) {
        this._pendingNext = true;
        return;
      }
      this._insideLoop = true;
      try {
        do {
          this._pendingNext = false;
          this._realGetNext();
        } while (this._pendingNext);
      } finally {
        this._insideLoop = false;
      }
    };
    CombinedStream.prototype._realGetNext = function() {
      var stream4 = this._streams.shift();
      if (typeof stream4 == "undefined") {
        this.end();
        return;
      }
      if (typeof stream4 !== "function") {
        this._pipeNext(stream4);
        return;
      }
      var getStream = stream4;
      getStream(function(stream5) {
        var isStreamLike = CombinedStream.isStreamLike(stream5);
        if (isStreamLike) {
          stream5.on("data", this._checkDataSize.bind(this));
          this._handleErrors(stream5);
        }
        this._pipeNext(stream5);
      }.bind(this));
    };
    CombinedStream.prototype._pipeNext = function(stream4) {
      this._currentStream = stream4;
      var isStreamLike = CombinedStream.isStreamLike(stream4);
      if (isStreamLike) {
        stream4.on("end", this._getNext.bind(this));
        stream4.pipe(this, { end: false });
        return;
      }
      var value = stream4;
      this.write(value);
      this._getNext();
    };
    CombinedStream.prototype._handleErrors = function(stream4) {
      var self2 = this;
      stream4.on("error", function(err) {
        self2._emitError(err);
      });
    };
    CombinedStream.prototype.write = function(data) {
      this.emit("data", data);
    };
    CombinedStream.prototype.pause = function() {
      if (!this.pauseStreams) {
        return;
      }
      if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function") this._currentStream.pause();
      this.emit("pause");
    };
    CombinedStream.prototype.resume = function() {
      if (!this._released) {
        this._released = true;
        this.writable = true;
        this._getNext();
      }
      if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function") this._currentStream.resume();
      this.emit("resume");
    };
    CombinedStream.prototype.end = function() {
      this._reset();
      this.emit("end");
    };
    CombinedStream.prototype.destroy = function() {
      this._reset();
      this.emit("close");
    };
    CombinedStream.prototype._reset = function() {
      this.writable = false;
      this._streams = [];
      this._currentStream = null;
    };
    CombinedStream.prototype._checkDataSize = function() {
      this._updateDataSize();
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this._emitError(new Error(message));
    };
    CombinedStream.prototype._updateDataSize = function() {
      this.dataSize = 0;
      var self2 = this;
      this._streams.forEach(function(stream4) {
        if (!stream4.dataSize) {
          return;
        }
        self2.dataSize += stream4.dataSize;
      });
      if (this._currentStream && this._currentStream.dataSize) {
        this.dataSize += this._currentStream.dataSize;
      }
    };
    CombinedStream.prototype._emitError = function(err) {
      this._reset();
      this.emit("error", err);
    };
  }
});

// ../node_modules/mime-db/db.json
var require_db = __commonJS({
  "../node_modules/mime-db/db.json"(exports, module) {
    module.exports = {
      "application/1d-interleaved-parityfec": {
        source: "iana"
      },
      "application/3gpdash-qoe-report+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/3gpp-ims+xml": {
        source: "iana",
        compressible: true
      },
      "application/3gpphal+json": {
        source: "iana",
        compressible: true
      },
      "application/3gpphalforms+json": {
        source: "iana",
        compressible: true
      },
      "application/a2l": {
        source: "iana"
      },
      "application/ace+cbor": {
        source: "iana"
      },
      "application/activemessage": {
        source: "iana"
      },
      "application/activity+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-directory+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcost+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcostparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointprop+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointpropparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-error+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamcontrol+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamparams+json": {
        source: "iana",
        compressible: true
      },
      "application/aml": {
        source: "iana"
      },
      "application/andrew-inset": {
        source: "iana",
        extensions: ["ez"]
      },
      "application/applefile": {
        source: "iana"
      },
      "application/applixware": {
        source: "apache",
        extensions: ["aw"]
      },
      "application/at+jwt": {
        source: "iana"
      },
      "application/atf": {
        source: "iana"
      },
      "application/atfx": {
        source: "iana"
      },
      "application/atom+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atom"]
      },
      "application/atomcat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomcat"]
      },
      "application/atomdeleted+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomdeleted"]
      },
      "application/atomicmail": {
        source: "iana"
      },
      "application/atomsvc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomsvc"]
      },
      "application/atsc-dwd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dwd"]
      },
      "application/atsc-dynamic-event-message": {
        source: "iana"
      },
      "application/atsc-held+xml": {
        source: "iana",
        compressible: true,
        extensions: ["held"]
      },
      "application/atsc-rdt+json": {
        source: "iana",
        compressible: true
      },
      "application/atsc-rsat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsat"]
      },
      "application/atxml": {
        source: "iana"
      },
      "application/auth-policy+xml": {
        source: "iana",
        compressible: true
      },
      "application/bacnet-xdd+zip": {
        source: "iana",
        compressible: false
      },
      "application/batch-smtp": {
        source: "iana"
      },
      "application/bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/beep+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/calendar+json": {
        source: "iana",
        compressible: true
      },
      "application/calendar+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xcs"]
      },
      "application/call-completion": {
        source: "iana"
      },
      "application/cals-1840": {
        source: "iana"
      },
      "application/captive+json": {
        source: "iana",
        compressible: true
      },
      "application/cbor": {
        source: "iana"
      },
      "application/cbor-seq": {
        source: "iana"
      },
      "application/cccex": {
        source: "iana"
      },
      "application/ccmp+xml": {
        source: "iana",
        compressible: true
      },
      "application/ccxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ccxml"]
      },
      "application/cdfx+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdfx"]
      },
      "application/cdmi-capability": {
        source: "iana",
        extensions: ["cdmia"]
      },
      "application/cdmi-container": {
        source: "iana",
        extensions: ["cdmic"]
      },
      "application/cdmi-domain": {
        source: "iana",
        extensions: ["cdmid"]
      },
      "application/cdmi-object": {
        source: "iana",
        extensions: ["cdmio"]
      },
      "application/cdmi-queue": {
        source: "iana",
        extensions: ["cdmiq"]
      },
      "application/cdni": {
        source: "iana"
      },
      "application/cea": {
        source: "iana"
      },
      "application/cea-2018+xml": {
        source: "iana",
        compressible: true
      },
      "application/cellml+xml": {
        source: "iana",
        compressible: true
      },
      "application/cfw": {
        source: "iana"
      },
      "application/city+json": {
        source: "iana",
        compressible: true
      },
      "application/clr": {
        source: "iana"
      },
      "application/clue+xml": {
        source: "iana",
        compressible: true
      },
      "application/clue_info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cms": {
        source: "iana"
      },
      "application/cnrp+xml": {
        source: "iana",
        compressible: true
      },
      "application/coap-group+json": {
        source: "iana",
        compressible: true
      },
      "application/coap-payload": {
        source: "iana"
      },
      "application/commonground": {
        source: "iana"
      },
      "application/conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cose": {
        source: "iana"
      },
      "application/cose-key": {
        source: "iana"
      },
      "application/cose-key-set": {
        source: "iana"
      },
      "application/cpl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cpl"]
      },
      "application/csrattrs": {
        source: "iana"
      },
      "application/csta+xml": {
        source: "iana",
        compressible: true
      },
      "application/cstadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/csvm+json": {
        source: "iana",
        compressible: true
      },
      "application/cu-seeme": {
        source: "apache",
        extensions: ["cu"]
      },
      "application/cwt": {
        source: "iana"
      },
      "application/cybercash": {
        source: "iana"
      },
      "application/dart": {
        compressible: true
      },
      "application/dash+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpd"]
      },
      "application/dash-patch+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpp"]
      },
      "application/dashdelta": {
        source: "iana"
      },
      "application/davmount+xml": {
        source: "iana",
        compressible: true,
        extensions: ["davmount"]
      },
      "application/dca-rft": {
        source: "iana"
      },
      "application/dcd": {
        source: "iana"
      },
      "application/dec-dx": {
        source: "iana"
      },
      "application/dialog-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/dicom": {
        source: "iana"
      },
      "application/dicom+json": {
        source: "iana",
        compressible: true
      },
      "application/dicom+xml": {
        source: "iana",
        compressible: true
      },
      "application/dii": {
        source: "iana"
      },
      "application/dit": {
        source: "iana"
      },
      "application/dns": {
        source: "iana"
      },
      "application/dns+json": {
        source: "iana",
        compressible: true
      },
      "application/dns-message": {
        source: "iana"
      },
      "application/docbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dbk"]
      },
      "application/dots+cbor": {
        source: "iana"
      },
      "application/dskpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/dssc+der": {
        source: "iana",
        extensions: ["dssc"]
      },
      "application/dssc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdssc"]
      },
      "application/dvcs": {
        source: "iana"
      },
      "application/ecmascript": {
        source: "iana",
        compressible: true,
        extensions: ["es", "ecma"]
      },
      "application/edi-consent": {
        source: "iana"
      },
      "application/edi-x12": {
        source: "iana",
        compressible: false
      },
      "application/edifact": {
        source: "iana",
        compressible: false
      },
      "application/efi": {
        source: "iana"
      },
      "application/elm+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/elm+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.cap+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/emergencycalldata.comment+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.control+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.deviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.ecall.msd": {
        source: "iana"
      },
      "application/emergencycalldata.providerinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.serviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.subscriberinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.veds+xml": {
        source: "iana",
        compressible: true
      },
      "application/emma+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emma"]
      },
      "application/emotionml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emotionml"]
      },
      "application/encaprtp": {
        source: "iana"
      },
      "application/epp+xml": {
        source: "iana",
        compressible: true
      },
      "application/epub+zip": {
        source: "iana",
        compressible: false,
        extensions: ["epub"]
      },
      "application/eshop": {
        source: "iana"
      },
      "application/exi": {
        source: "iana",
        extensions: ["exi"]
      },
      "application/expect-ct-report+json": {
        source: "iana",
        compressible: true
      },
      "application/express": {
        source: "iana",
        extensions: ["exp"]
      },
      "application/fastinfoset": {
        source: "iana"
      },
      "application/fastsoap": {
        source: "iana"
      },
      "application/fdt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fdt"]
      },
      "application/fhir+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fhir+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fido.trusted-apps+json": {
        compressible: true
      },
      "application/fits": {
        source: "iana"
      },
      "application/flexfec": {
        source: "iana"
      },
      "application/font-sfnt": {
        source: "iana"
      },
      "application/font-tdpfr": {
        source: "iana",
        extensions: ["pfr"]
      },
      "application/font-woff": {
        source: "iana",
        compressible: false
      },
      "application/framework-attributes+xml": {
        source: "iana",
        compressible: true
      },
      "application/geo+json": {
        source: "iana",
        compressible: true,
        extensions: ["geojson"]
      },
      "application/geo+json-seq": {
        source: "iana"
      },
      "application/geopackage+sqlite3": {
        source: "iana"
      },
      "application/geoxacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/gltf-buffer": {
        source: "iana"
      },
      "application/gml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["gml"]
      },
      "application/gpx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["gpx"]
      },
      "application/gxf": {
        source: "apache",
        extensions: ["gxf"]
      },
      "application/gzip": {
        source: "iana",
        compressible: false,
        extensions: ["gz"]
      },
      "application/h224": {
        source: "iana"
      },
      "application/held+xml": {
        source: "iana",
        compressible: true
      },
      "application/hjson": {
        extensions: ["hjson"]
      },
      "application/http": {
        source: "iana"
      },
      "application/hyperstudio": {
        source: "iana",
        extensions: ["stk"]
      },
      "application/ibe-key-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pkg-reply+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pp-data": {
        source: "iana"
      },
      "application/iges": {
        source: "iana"
      },
      "application/im-iscomposing+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/index": {
        source: "iana"
      },
      "application/index.cmd": {
        source: "iana"
      },
      "application/index.obj": {
        source: "iana"
      },
      "application/index.response": {
        source: "iana"
      },
      "application/index.vnd": {
        source: "iana"
      },
      "application/inkml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ink", "inkml"]
      },
      "application/iotp": {
        source: "iana"
      },
      "application/ipfix": {
        source: "iana",
        extensions: ["ipfix"]
      },
      "application/ipp": {
        source: "iana"
      },
      "application/isup": {
        source: "iana"
      },
      "application/its+xml": {
        source: "iana",
        compressible: true,
        extensions: ["its"]
      },
      "application/java-archive": {
        source: "apache",
        compressible: false,
        extensions: ["jar", "war", "ear"]
      },
      "application/java-serialized-object": {
        source: "apache",
        compressible: false,
        extensions: ["ser"]
      },
      "application/java-vm": {
        source: "apache",
        compressible: false,
        extensions: ["class"]
      },
      "application/javascript": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["js", "mjs"]
      },
      "application/jf2feed+json": {
        source: "iana",
        compressible: true
      },
      "application/jose": {
        source: "iana"
      },
      "application/jose+json": {
        source: "iana",
        compressible: true
      },
      "application/jrd+json": {
        source: "iana",
        compressible: true
      },
      "application/jscalendar+json": {
        source: "iana",
        compressible: true
      },
      "application/json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["json", "map"]
      },
      "application/json-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/json-seq": {
        source: "iana"
      },
      "application/json5": {
        extensions: ["json5"]
      },
      "application/jsonml+json": {
        source: "apache",
        compressible: true,
        extensions: ["jsonml"]
      },
      "application/jwk+json": {
        source: "iana",
        compressible: true
      },
      "application/jwk-set+json": {
        source: "iana",
        compressible: true
      },
      "application/jwt": {
        source: "iana"
      },
      "application/kpml-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/kpml-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/ld+json": {
        source: "iana",
        compressible: true,
        extensions: ["jsonld"]
      },
      "application/lgr+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lgr"]
      },
      "application/link-format": {
        source: "iana"
      },
      "application/load-control+xml": {
        source: "iana",
        compressible: true
      },
      "application/lost+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lostxml"]
      },
      "application/lostsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/lpf+zip": {
        source: "iana",
        compressible: false
      },
      "application/lxf": {
        source: "iana"
      },
      "application/mac-binhex40": {
        source: "iana",
        extensions: ["hqx"]
      },
      "application/mac-compactpro": {
        source: "apache",
        extensions: ["cpt"]
      },
      "application/macwriteii": {
        source: "iana"
      },
      "application/mads+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mads"]
      },
      "application/manifest+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["webmanifest"]
      },
      "application/marc": {
        source: "iana",
        extensions: ["mrc"]
      },
      "application/marcxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mrcx"]
      },
      "application/mathematica": {
        source: "iana",
        extensions: ["ma", "nb", "mb"]
      },
      "application/mathml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mathml"]
      },
      "application/mathml-content+xml": {
        source: "iana",
        compressible: true
      },
      "application/mathml-presentation+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-associated-procedure-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-deregister+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-envelope+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-protection-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-reception-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-schedule+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-user-service-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbox": {
        source: "iana",
        extensions: ["mbox"]
      },
      "application/media-policy-dataset+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpf"]
      },
      "application/media_control+xml": {
        source: "iana",
        compressible: true
      },
      "application/mediaservercontrol+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mscml"]
      },
      "application/merge-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/metalink+xml": {
        source: "apache",
        compressible: true,
        extensions: ["metalink"]
      },
      "application/metalink4+xml": {
        source: "iana",
        compressible: true,
        extensions: ["meta4"]
      },
      "application/mets+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mets"]
      },
      "application/mf4": {
        source: "iana"
      },
      "application/mikey": {
        source: "iana"
      },
      "application/mipc": {
        source: "iana"
      },
      "application/missing-blocks+cbor-seq": {
        source: "iana"
      },
      "application/mmt-aei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["maei"]
      },
      "application/mmt-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musd"]
      },
      "application/mods+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mods"]
      },
      "application/moss-keys": {
        source: "iana"
      },
      "application/moss-signature": {
        source: "iana"
      },
      "application/mosskey-data": {
        source: "iana"
      },
      "application/mosskey-request": {
        source: "iana"
      },
      "application/mp21": {
        source: "iana",
        extensions: ["m21", "mp21"]
      },
      "application/mp4": {
        source: "iana",
        extensions: ["mp4s", "m4p"]
      },
      "application/mpeg4-generic": {
        source: "iana"
      },
      "application/mpeg4-iod": {
        source: "iana"
      },
      "application/mpeg4-iod-xmt": {
        source: "iana"
      },
      "application/mrb-consumer+xml": {
        source: "iana",
        compressible: true
      },
      "application/mrb-publish+xml": {
        source: "iana",
        compressible: true
      },
      "application/msc-ivr+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msc-mixer+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msword": {
        source: "iana",
        compressible: false,
        extensions: ["doc", "dot"]
      },
      "application/mud+json": {
        source: "iana",
        compressible: true
      },
      "application/multipart-core": {
        source: "iana"
      },
      "application/mxf": {
        source: "iana",
        extensions: ["mxf"]
      },
      "application/n-quads": {
        source: "iana",
        extensions: ["nq"]
      },
      "application/n-triples": {
        source: "iana",
        extensions: ["nt"]
      },
      "application/nasdata": {
        source: "iana"
      },
      "application/news-checkgroups": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-groupinfo": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-transmission": {
        source: "iana"
      },
      "application/nlsml+xml": {
        source: "iana",
        compressible: true
      },
      "application/node": {
        source: "iana",
        extensions: ["cjs"]
      },
      "application/nss": {
        source: "iana"
      },
      "application/oauth-authz-req+jwt": {
        source: "iana"
      },
      "application/oblivious-dns-message": {
        source: "iana"
      },
      "application/ocsp-request": {
        source: "iana"
      },
      "application/ocsp-response": {
        source: "iana"
      },
      "application/octet-stream": {
        source: "iana",
        compressible: false,
        extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
      },
      "application/oda": {
        source: "iana",
        extensions: ["oda"]
      },
      "application/odm+xml": {
        source: "iana",
        compressible: true
      },
      "application/odx": {
        source: "iana"
      },
      "application/oebps-package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["opf"]
      },
      "application/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogx"]
      },
      "application/omdoc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["omdoc"]
      },
      "application/onenote": {
        source: "apache",
        extensions: ["onetoc", "onetoc2", "onetmp", "onepkg"]
      },
      "application/opc-nodeset+xml": {
        source: "iana",
        compressible: true
      },
      "application/oscore": {
        source: "iana"
      },
      "application/oxps": {
        source: "iana",
        extensions: ["oxps"]
      },
      "application/p21": {
        source: "iana"
      },
      "application/p21+zip": {
        source: "iana",
        compressible: false
      },
      "application/p2p-overlay+xml": {
        source: "iana",
        compressible: true,
        extensions: ["relo"]
      },
      "application/parityfec": {
        source: "iana"
      },
      "application/passport": {
        source: "iana"
      },
      "application/patch-ops-error+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xer"]
      },
      "application/pdf": {
        source: "iana",
        compressible: false,
        extensions: ["pdf"]
      },
      "application/pdx": {
        source: "iana"
      },
      "application/pem-certificate-chain": {
        source: "iana"
      },
      "application/pgp-encrypted": {
        source: "iana",
        compressible: false,
        extensions: ["pgp"]
      },
      "application/pgp-keys": {
        source: "iana",
        extensions: ["asc"]
      },
      "application/pgp-signature": {
        source: "iana",
        extensions: ["asc", "sig"]
      },
      "application/pics-rules": {
        source: "apache",
        extensions: ["prf"]
      },
      "application/pidf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pidf-diff+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pkcs10": {
        source: "iana",
        extensions: ["p10"]
      },
      "application/pkcs12": {
        source: "iana"
      },
      "application/pkcs7-mime": {
        source: "iana",
        extensions: ["p7m", "p7c"]
      },
      "application/pkcs7-signature": {
        source: "iana",
        extensions: ["p7s"]
      },
      "application/pkcs8": {
        source: "iana",
        extensions: ["p8"]
      },
      "application/pkcs8-encrypted": {
        source: "iana"
      },
      "application/pkix-attr-cert": {
        source: "iana",
        extensions: ["ac"]
      },
      "application/pkix-cert": {
        source: "iana",
        extensions: ["cer"]
      },
      "application/pkix-crl": {
        source: "iana",
        extensions: ["crl"]
      },
      "application/pkix-pkipath": {
        source: "iana",
        extensions: ["pkipath"]
      },
      "application/pkixcmp": {
        source: "iana",
        extensions: ["pki"]
      },
      "application/pls+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pls"]
      },
      "application/poc-settings+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/postscript": {
        source: "iana",
        compressible: true,
        extensions: ["ai", "eps", "ps"]
      },
      "application/ppsp-tracker+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+xml": {
        source: "iana",
        compressible: true
      },
      "application/provenance+xml": {
        source: "iana",
        compressible: true,
        extensions: ["provx"]
      },
      "application/prs.alvestrand.titrax-sheet": {
        source: "iana"
      },
      "application/prs.cww": {
        source: "iana",
        extensions: ["cww"]
      },
      "application/prs.cyn": {
        source: "iana",
        charset: "7-BIT"
      },
      "application/prs.hpub+zip": {
        source: "iana",
        compressible: false
      },
      "application/prs.nprend": {
        source: "iana"
      },
      "application/prs.plucker": {
        source: "iana"
      },
      "application/prs.rdf-xml-crypt": {
        source: "iana"
      },
      "application/prs.xsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/pskc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pskcxml"]
      },
      "application/pvd+json": {
        source: "iana",
        compressible: true
      },
      "application/qsig": {
        source: "iana"
      },
      "application/raml+yaml": {
        compressible: true,
        extensions: ["raml"]
      },
      "application/raptorfec": {
        source: "iana"
      },
      "application/rdap+json": {
        source: "iana",
        compressible: true
      },
      "application/rdf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rdf", "owl"]
      },
      "application/reginfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rif"]
      },
      "application/relax-ng-compact-syntax": {
        source: "iana",
        extensions: ["rnc"]
      },
      "application/remote-printing": {
        source: "iana"
      },
      "application/reputon+json": {
        source: "iana",
        compressible: true
      },
      "application/resource-lists+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rl"]
      },
      "application/resource-lists-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rld"]
      },
      "application/rfc+xml": {
        source: "iana",
        compressible: true
      },
      "application/riscos": {
        source: "iana"
      },
      "application/rlmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/rls-services+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rs"]
      },
      "application/route-apd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rapd"]
      },
      "application/route-s-tsid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sls"]
      },
      "application/route-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rusd"]
      },
      "application/rpki-ghostbusters": {
        source: "iana",
        extensions: ["gbr"]
      },
      "application/rpki-manifest": {
        source: "iana",
        extensions: ["mft"]
      },
      "application/rpki-publication": {
        source: "iana"
      },
      "application/rpki-roa": {
        source: "iana",
        extensions: ["roa"]
      },
      "application/rpki-updown": {
        source: "iana"
      },
      "application/rsd+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rsd"]
      },
      "application/rss+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rss"]
      },
      "application/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "application/rtploopback": {
        source: "iana"
      },
      "application/rtx": {
        source: "iana"
      },
      "application/samlassertion+xml": {
        source: "iana",
        compressible: true
      },
      "application/samlmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/sarif+json": {
        source: "iana",
        compressible: true
      },
      "application/sarif-external-properties+json": {
        source: "iana",
        compressible: true
      },
      "application/sbe": {
        source: "iana"
      },
      "application/sbml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sbml"]
      },
      "application/scaip+xml": {
        source: "iana",
        compressible: true
      },
      "application/scim+json": {
        source: "iana",
        compressible: true
      },
      "application/scvp-cv-request": {
        source: "iana",
        extensions: ["scq"]
      },
      "application/scvp-cv-response": {
        source: "iana",
        extensions: ["scs"]
      },
      "application/scvp-vp-request": {
        source: "iana",
        extensions: ["spq"]
      },
      "application/scvp-vp-response": {
        source: "iana",
        extensions: ["spp"]
      },
      "application/sdp": {
        source: "iana",
        extensions: ["sdp"]
      },
      "application/secevent+jwt": {
        source: "iana"
      },
      "application/senml+cbor": {
        source: "iana"
      },
      "application/senml+json": {
        source: "iana",
        compressible: true
      },
      "application/senml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["senmlx"]
      },
      "application/senml-etch+cbor": {
        source: "iana"
      },
      "application/senml-etch+json": {
        source: "iana",
        compressible: true
      },
      "application/senml-exi": {
        source: "iana"
      },
      "application/sensml+cbor": {
        source: "iana"
      },
      "application/sensml+json": {
        source: "iana",
        compressible: true
      },
      "application/sensml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sensmlx"]
      },
      "application/sensml-exi": {
        source: "iana"
      },
      "application/sep+xml": {
        source: "iana",
        compressible: true
      },
      "application/sep-exi": {
        source: "iana"
      },
      "application/session-info": {
        source: "iana"
      },
      "application/set-payment": {
        source: "iana"
      },
      "application/set-payment-initiation": {
        source: "iana",
        extensions: ["setpay"]
      },
      "application/set-registration": {
        source: "iana"
      },
      "application/set-registration-initiation": {
        source: "iana",
        extensions: ["setreg"]
      },
      "application/sgml": {
        source: "iana"
      },
      "application/sgml-open-catalog": {
        source: "iana"
      },
      "application/shf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["shf"]
      },
      "application/sieve": {
        source: "iana",
        extensions: ["siv", "sieve"]
      },
      "application/simple-filter+xml": {
        source: "iana",
        compressible: true
      },
      "application/simple-message-summary": {
        source: "iana"
      },
      "application/simplesymbolcontainer": {
        source: "iana"
      },
      "application/sipc": {
        source: "iana"
      },
      "application/slate": {
        source: "iana"
      },
      "application/smil": {
        source: "iana"
      },
      "application/smil+xml": {
        source: "iana",
        compressible: true,
        extensions: ["smi", "smil"]
      },
      "application/smpte336m": {
        source: "iana"
      },
      "application/soap+fastinfoset": {
        source: "iana"
      },
      "application/soap+xml": {
        source: "iana",
        compressible: true
      },
      "application/sparql-query": {
        source: "iana",
        extensions: ["rq"]
      },
      "application/sparql-results+xml": {
        source: "iana",
        compressible: true,
        extensions: ["srx"]
      },
      "application/spdx+json": {
        source: "iana",
        compressible: true
      },
      "application/spirits-event+xml": {
        source: "iana",
        compressible: true
      },
      "application/sql": {
        source: "iana"
      },
      "application/srgs": {
        source: "iana",
        extensions: ["gram"]
      },
      "application/srgs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["grxml"]
      },
      "application/sru+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sru"]
      },
      "application/ssdl+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ssdl"]
      },
      "application/ssml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ssml"]
      },
      "application/stix+json": {
        source: "iana",
        compressible: true
      },
      "application/swid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["swidtag"]
      },
      "application/tamp-apex-update": {
        source: "iana"
      },
      "application/tamp-apex-update-confirm": {
        source: "iana"
      },
      "application/tamp-community-update": {
        source: "iana"
      },
      "application/tamp-community-update-confirm": {
        source: "iana"
      },
      "application/tamp-error": {
        source: "iana"
      },
      "application/tamp-sequence-adjust": {
        source: "iana"
      },
      "application/tamp-sequence-adjust-confirm": {
        source: "iana"
      },
      "application/tamp-status-query": {
        source: "iana"
      },
      "application/tamp-status-response": {
        source: "iana"
      },
      "application/tamp-update": {
        source: "iana"
      },
      "application/tamp-update-confirm": {
        source: "iana"
      },
      "application/tar": {
        compressible: true
      },
      "application/taxii+json": {
        source: "iana",
        compressible: true
      },
      "application/td+json": {
        source: "iana",
        compressible: true
      },
      "application/tei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tei", "teicorpus"]
      },
      "application/tetra_isi": {
        source: "iana"
      },
      "application/thraud+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tfi"]
      },
      "application/timestamp-query": {
        source: "iana"
      },
      "application/timestamp-reply": {
        source: "iana"
      },
      "application/timestamped-data": {
        source: "iana",
        extensions: ["tsd"]
      },
      "application/tlsrpt+gzip": {
        source: "iana"
      },
      "application/tlsrpt+json": {
        source: "iana",
        compressible: true
      },
      "application/tnauthlist": {
        source: "iana"
      },
      "application/token-introspection+jwt": {
        source: "iana"
      },
      "application/toml": {
        compressible: true,
        extensions: ["toml"]
      },
      "application/trickle-ice-sdpfrag": {
        source: "iana"
      },
      "application/trig": {
        source: "iana",
        extensions: ["trig"]
      },
      "application/ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ttml"]
      },
      "application/tve-trigger": {
        source: "iana"
      },
      "application/tzif": {
        source: "iana"
      },
      "application/tzif-leap": {
        source: "iana"
      },
      "application/ubjson": {
        compressible: false,
        extensions: ["ubj"]
      },
      "application/ulpfec": {
        source: "iana"
      },
      "application/urc-grpsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/urc-ressheet+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsheet"]
      },
      "application/urc-targetdesc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["td"]
      },
      "application/urc-uisocketdesc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vcard+json": {
        source: "iana",
        compressible: true
      },
      "application/vcard+xml": {
        source: "iana",
        compressible: true
      },
      "application/vemmi": {
        source: "iana"
      },
      "application/vividence.scriptfile": {
        source: "apache"
      },
      "application/vnd.1000minds.decision-model+xml": {
        source: "iana",
        compressible: true,
        extensions: ["1km"]
      },
      "application/vnd.3gpp-prose+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc3ch+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-v2x-local-service-information": {
        source: "iana"
      },
      "application/vnd.3gpp.5gnas": {
        source: "iana"
      },
      "application/vnd.3gpp.access-transfer-events+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.bsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gmop+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gtpc": {
        source: "iana"
      },
      "application/vnd.3gpp.interworking-data": {
        source: "iana"
      },
      "application/vnd.3gpp.lpp": {
        source: "iana"
      },
      "application/vnd.3gpp.mc-signalling-ear": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-payload": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-signalling": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-floor-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-signed+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-init-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-transmission-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mid-call+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ngap": {
        source: "iana"
      },
      "application/vnd.3gpp.pfcp": {
        source: "iana"
      },
      "application/vnd.3gpp.pic-bw-large": {
        source: "iana",
        extensions: ["plb"]
      },
      "application/vnd.3gpp.pic-bw-small": {
        source: "iana",
        extensions: ["psb"]
      },
      "application/vnd.3gpp.pic-bw-var": {
        source: "iana",
        extensions: ["pvb"]
      },
      "application/vnd.3gpp.s1ap": {
        source: "iana"
      },
      "application/vnd.3gpp.sms": {
        source: "iana"
      },
      "application/vnd.3gpp.sms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-ext+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.state-and-event-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ussd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.bcmcsinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.sms": {
        source: "iana"
      },
      "application/vnd.3gpp2.tcap": {
        source: "iana",
        extensions: ["tcap"]
      },
      "application/vnd.3lightssoftware.imagescal": {
        source: "iana"
      },
      "application/vnd.3m.post-it-notes": {
        source: "iana",
        extensions: ["pwn"]
      },
      "application/vnd.accpac.simply.aso": {
        source: "iana",
        extensions: ["aso"]
      },
      "application/vnd.accpac.simply.imp": {
        source: "iana",
        extensions: ["imp"]
      },
      "application/vnd.acucobol": {
        source: "iana",
        extensions: ["acu"]
      },
      "application/vnd.acucorp": {
        source: "iana",
        extensions: ["atc", "acutc"]
      },
      "application/vnd.adobe.air-application-installer-package+zip": {
        source: "apache",
        compressible: false,
        extensions: ["air"]
      },
      "application/vnd.adobe.flash.movie": {
        source: "iana"
      },
      "application/vnd.adobe.formscentral.fcdt": {
        source: "iana",
        extensions: ["fcdt"]
      },
      "application/vnd.adobe.fxp": {
        source: "iana",
        extensions: ["fxp", "fxpl"]
      },
      "application/vnd.adobe.partial-upload": {
        source: "iana"
      },
      "application/vnd.adobe.xdp+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdp"]
      },
      "application/vnd.adobe.xfdf": {
        source: "iana",
        extensions: ["xfdf"]
      },
      "application/vnd.aether.imp": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata-pagedef": {
        source: "iana"
      },
      "application/vnd.afpc.cmoca-cmresource": {
        source: "iana"
      },
      "application/vnd.afpc.foca-charset": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codedfont": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codepage": {
        source: "iana"
      },
      "application/vnd.afpc.modca": {
        source: "iana"
      },
      "application/vnd.afpc.modca-cmtable": {
        source: "iana"
      },
      "application/vnd.afpc.modca-formdef": {
        source: "iana"
      },
      "application/vnd.afpc.modca-mediummap": {
        source: "iana"
      },
      "application/vnd.afpc.modca-objectcontainer": {
        source: "iana"
      },
      "application/vnd.afpc.modca-overlay": {
        source: "iana"
      },
      "application/vnd.afpc.modca-pagesegment": {
        source: "iana"
      },
      "application/vnd.age": {
        source: "iana",
        extensions: ["age"]
      },
      "application/vnd.ah-barcode": {
        source: "iana"
      },
      "application/vnd.ahead.space": {
        source: "iana",
        extensions: ["ahead"]
      },
      "application/vnd.airzip.filesecure.azf": {
        source: "iana",
        extensions: ["azf"]
      },
      "application/vnd.airzip.filesecure.azs": {
        source: "iana",
        extensions: ["azs"]
      },
      "application/vnd.amadeus+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.amazon.ebook": {
        source: "apache",
        extensions: ["azw"]
      },
      "application/vnd.amazon.mobi8-ebook": {
        source: "iana"
      },
      "application/vnd.americandynamics.acc": {
        source: "iana",
        extensions: ["acc"]
      },
      "application/vnd.amiga.ami": {
        source: "iana",
        extensions: ["ami"]
      },
      "application/vnd.amundsen.maze+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.android.ota": {
        source: "iana"
      },
      "application/vnd.android.package-archive": {
        source: "apache",
        compressible: false,
        extensions: ["apk"]
      },
      "application/vnd.anki": {
        source: "iana"
      },
      "application/vnd.anser-web-certificate-issue-initiation": {
        source: "iana",
        extensions: ["cii"]
      },
      "application/vnd.anser-web-funds-transfer-initiation": {
        source: "apache",
        extensions: ["fti"]
      },
      "application/vnd.antix.game-component": {
        source: "iana",
        extensions: ["atx"]
      },
      "application/vnd.apache.arrow.file": {
        source: "iana"
      },
      "application/vnd.apache.arrow.stream": {
        source: "iana"
      },
      "application/vnd.apache.thrift.binary": {
        source: "iana"
      },
      "application/vnd.apache.thrift.compact": {
        source: "iana"
      },
      "application/vnd.apache.thrift.json": {
        source: "iana"
      },
      "application/vnd.api+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.aplextor.warrp+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apothekende.reservation+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apple.installer+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpkg"]
      },
      "application/vnd.apple.keynote": {
        source: "iana",
        extensions: ["key"]
      },
      "application/vnd.apple.mpegurl": {
        source: "iana",
        extensions: ["m3u8"]
      },
      "application/vnd.apple.numbers": {
        source: "iana",
        extensions: ["numbers"]
      },
      "application/vnd.apple.pages": {
        source: "iana",
        extensions: ["pages"]
      },
      "application/vnd.apple.pkpass": {
        compressible: false,
        extensions: ["pkpass"]
      },
      "application/vnd.arastra.swi": {
        source: "iana"
      },
      "application/vnd.aristanetworks.swi": {
        source: "iana",
        extensions: ["swi"]
      },
      "application/vnd.artisan+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.artsquare": {
        source: "iana"
      },
      "application/vnd.astraea-software.iota": {
        source: "iana",
        extensions: ["iota"]
      },
      "application/vnd.audiograph": {
        source: "iana",
        extensions: ["aep"]
      },
      "application/vnd.autopackage": {
        source: "iana"
      },
      "application/vnd.avalon+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.avistar+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.balsamiq.bmml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["bmml"]
      },
      "application/vnd.balsamiq.bmpr": {
        source: "iana"
      },
      "application/vnd.banana-accounting": {
        source: "iana"
      },
      "application/vnd.bbf.usp.error": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bekitzur-stech+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bint.med-content": {
        source: "iana"
      },
      "application/vnd.biopax.rdf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.blink-idb-value-wrapper": {
        source: "iana"
      },
      "application/vnd.blueice.multipass": {
        source: "iana",
        extensions: ["mpm"]
      },
      "application/vnd.bluetooth.ep.oob": {
        source: "iana"
      },
      "application/vnd.bluetooth.le.oob": {
        source: "iana"
      },
      "application/vnd.bmi": {
        source: "iana",
        extensions: ["bmi"]
      },
      "application/vnd.bpf": {
        source: "iana"
      },
      "application/vnd.bpf3": {
        source: "iana"
      },
      "application/vnd.businessobjects": {
        source: "iana",
        extensions: ["rep"]
      },
      "application/vnd.byu.uapi+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cab-jscript": {
        source: "iana"
      },
      "application/vnd.canon-cpdl": {
        source: "iana"
      },
      "application/vnd.canon-lips": {
        source: "iana"
      },
      "application/vnd.capasystems-pg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cendio.thinlinc.clientconf": {
        source: "iana"
      },
      "application/vnd.century-systems.tcp_stream": {
        source: "iana"
      },
      "application/vnd.chemdraw+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdxml"]
      },
      "application/vnd.chess-pgn": {
        source: "iana"
      },
      "application/vnd.chipnuts.karaoke-mmd": {
        source: "iana",
        extensions: ["mmd"]
      },
      "application/vnd.ciedi": {
        source: "iana"
      },
      "application/vnd.cinderella": {
        source: "iana",
        extensions: ["cdy"]
      },
      "application/vnd.cirpack.isdn-ext": {
        source: "iana"
      },
      "application/vnd.citationstyles.style+xml": {
        source: "iana",
        compressible: true,
        extensions: ["csl"]
      },
      "application/vnd.claymore": {
        source: "iana",
        extensions: ["cla"]
      },
      "application/vnd.cloanto.rp9": {
        source: "iana",
        extensions: ["rp9"]
      },
      "application/vnd.clonk.c4group": {
        source: "iana",
        extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"]
      },
      "application/vnd.cluetrust.cartomobile-config": {
        source: "iana",
        extensions: ["c11amc"]
      },
      "application/vnd.cluetrust.cartomobile-config-pkg": {
        source: "iana",
        extensions: ["c11amz"]
      },
      "application/vnd.coffeescript": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet-template": {
        source: "iana"
      },
      "application/vnd.collection+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.doc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.next+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.comicbook+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.comicbook-rar": {
        source: "iana"
      },
      "application/vnd.commerce-battelle": {
        source: "iana"
      },
      "application/vnd.commonspace": {
        source: "iana",
        extensions: ["csp"]
      },
      "application/vnd.contact.cmsg": {
        source: "iana",
        extensions: ["cdbcmsg"]
      },
      "application/vnd.coreos.ignition+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cosmocaller": {
        source: "iana",
        extensions: ["cmc"]
      },
      "application/vnd.crick.clicker": {
        source: "iana",
        extensions: ["clkx"]
      },
      "application/vnd.crick.clicker.keyboard": {
        source: "iana",
        extensions: ["clkk"]
      },
      "application/vnd.crick.clicker.palette": {
        source: "iana",
        extensions: ["clkp"]
      },
      "application/vnd.crick.clicker.template": {
        source: "iana",
        extensions: ["clkt"]
      },
      "application/vnd.crick.clicker.wordbank": {
        source: "iana",
        extensions: ["clkw"]
      },
      "application/vnd.criticaltools.wbs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wbs"]
      },
      "application/vnd.cryptii.pipe+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.crypto-shade-file": {
        source: "iana"
      },
      "application/vnd.cryptomator.encrypted": {
        source: "iana"
      },
      "application/vnd.cryptomator.vault": {
        source: "iana"
      },
      "application/vnd.ctc-posml": {
        source: "iana",
        extensions: ["pml"]
      },
      "application/vnd.ctct.ws+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cups-pdf": {
        source: "iana"
      },
      "application/vnd.cups-postscript": {
        source: "iana"
      },
      "application/vnd.cups-ppd": {
        source: "iana",
        extensions: ["ppd"]
      },
      "application/vnd.cups-raster": {
        source: "iana"
      },
      "application/vnd.cups-raw": {
        source: "iana"
      },
      "application/vnd.curl": {
        source: "iana"
      },
      "application/vnd.curl.car": {
        source: "apache",
        extensions: ["car"]
      },
      "application/vnd.curl.pcurl": {
        source: "apache",
        extensions: ["pcurl"]
      },
      "application/vnd.cyan.dean.root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cybank": {
        source: "iana"
      },
      "application/vnd.cyclonedx+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cyclonedx+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.d2l.coursepackage1p0+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.d3m-dataset": {
        source: "iana"
      },
      "application/vnd.d3m-problem": {
        source: "iana"
      },
      "application/vnd.dart": {
        source: "iana",
        compressible: true,
        extensions: ["dart"]
      },
      "application/vnd.data-vision.rdz": {
        source: "iana",
        extensions: ["rdz"]
      },
      "application/vnd.datapackage+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dataresource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dbf": {
        source: "iana",
        extensions: ["dbf"]
      },
      "application/vnd.debian.binary-package": {
        source: "iana"
      },
      "application/vnd.dece.data": {
        source: "iana",
        extensions: ["uvf", "uvvf", "uvd", "uvvd"]
      },
      "application/vnd.dece.ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uvt", "uvvt"]
      },
      "application/vnd.dece.unspecified": {
        source: "iana",
        extensions: ["uvx", "uvvx"]
      },
      "application/vnd.dece.zip": {
        source: "iana",
        extensions: ["uvz", "uvvz"]
      },
      "application/vnd.denovo.fcselayout-link": {
        source: "iana",
        extensions: ["fe_launch"]
      },
      "application/vnd.desmume.movie": {
        source: "iana"
      },
      "application/vnd.dir-bi.plate-dl-nosuffix": {
        source: "iana"
      },
      "application/vnd.dm.delegation+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dna": {
        source: "iana",
        extensions: ["dna"]
      },
      "application/vnd.document+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dolby.mlp": {
        source: "apache",
        extensions: ["mlp"]
      },
      "application/vnd.dolby.mobile.1": {
        source: "iana"
      },
      "application/vnd.dolby.mobile.2": {
        source: "iana"
      },
      "application/vnd.doremir.scorecloud-binary-document": {
        source: "iana"
      },
      "application/vnd.dpgraph": {
        source: "iana",
        extensions: ["dpg"]
      },
      "application/vnd.dreamfactory": {
        source: "iana",
        extensions: ["dfac"]
      },
      "application/vnd.drive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ds-keypoint": {
        source: "apache",
        extensions: ["kpxx"]
      },
      "application/vnd.dtg.local": {
        source: "iana"
      },
      "application/vnd.dtg.local.flash": {
        source: "iana"
      },
      "application/vnd.dtg.local.html": {
        source: "iana"
      },
      "application/vnd.dvb.ait": {
        source: "iana",
        extensions: ["ait"]
      },
      "application/vnd.dvb.dvbisl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.dvbj": {
        source: "iana"
      },
      "application/vnd.dvb.esgcontainer": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcdftnotifaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess2": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgpdd": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcroaming": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-base": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-enhancement": {
        source: "iana"
      },
      "application/vnd.dvb.notif-aggregate-root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-container+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-generic+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-msglist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-init+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.pfr": {
        source: "iana"
      },
      "application/vnd.dvb.service": {
        source: "iana",
        extensions: ["svc"]
      },
      "application/vnd.dxr": {
        source: "iana"
      },
      "application/vnd.dynageo": {
        source: "iana",
        extensions: ["geo"]
      },
      "application/vnd.dzr": {
        source: "iana"
      },
      "application/vnd.easykaraoke.cdgdownload": {
        source: "iana"
      },
      "application/vnd.ecdis-update": {
        source: "iana"
      },
      "application/vnd.ecip.rlp": {
        source: "iana"
      },
      "application/vnd.eclipse.ditto+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ecowin.chart": {
        source: "iana",
        extensions: ["mag"]
      },
      "application/vnd.ecowin.filerequest": {
        source: "iana"
      },
      "application/vnd.ecowin.fileupdate": {
        source: "iana"
      },
      "application/vnd.ecowin.series": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesrequest": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesupdate": {
        source: "iana"
      },
      "application/vnd.efi.img": {
        source: "iana"
      },
      "application/vnd.efi.iso": {
        source: "iana"
      },
      "application/vnd.emclient.accessrequest+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.enliven": {
        source: "iana",
        extensions: ["nml"]
      },
      "application/vnd.enphase.envoy": {
        source: "iana"
      },
      "application/vnd.eprints.data+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.epson.esf": {
        source: "iana",
        extensions: ["esf"]
      },
      "application/vnd.epson.msf": {
        source: "iana",
        extensions: ["msf"]
      },
      "application/vnd.epson.quickanime": {
        source: "iana",
        extensions: ["qam"]
      },
      "application/vnd.epson.salt": {
        source: "iana",
        extensions: ["slt"]
      },
      "application/vnd.epson.ssf": {
        source: "iana",
        extensions: ["ssf"]
      },
      "application/vnd.ericsson.quickcall": {
        source: "iana"
      },
      "application/vnd.espass-espass+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.eszigno3+xml": {
        source: "iana",
        compressible: true,
        extensions: ["es3", "et3"]
      },
      "application/vnd.etsi.aoc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.asic-e+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.asic-s+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.cug+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvcommand+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-bc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-cod+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-npvr+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvservice+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mcid+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mheg5": {
        source: "iana"
      },
      "application/vnd.etsi.overload-control-policy-dataset+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.pstn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.sci+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.simservs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.timestamp-token": {
        source: "iana"
      },
      "application/vnd.etsi.tsl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.tsl.der": {
        source: "iana"
      },
      "application/vnd.eu.kasparian.car+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.eudora.data": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.profile": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.settings": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.theme": {
        source: "iana"
      },
      "application/vnd.exstream-empower+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.exstream-package": {
        source: "iana"
      },
      "application/vnd.ezpix-album": {
        source: "iana",
        extensions: ["ez2"]
      },
      "application/vnd.ezpix-package": {
        source: "iana",
        extensions: ["ez3"]
      },
      "application/vnd.f-secure.mobile": {
        source: "iana"
      },
      "application/vnd.familysearch.gedcom+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.fastcopy-disk-image": {
        source: "iana"
      },
      "application/vnd.fdf": {
        source: "iana",
        extensions: ["fdf"]
      },
      "application/vnd.fdsn.mseed": {
        source: "iana",
        extensions: ["mseed"]
      },
      "application/vnd.fdsn.seed": {
        source: "iana",
        extensions: ["seed", "dataless"]
      },
      "application/vnd.ffsns": {
        source: "iana"
      },
      "application/vnd.ficlab.flb+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.filmit.zfc": {
        source: "iana"
      },
      "application/vnd.fints": {
        source: "iana"
      },
      "application/vnd.firemonkeys.cloudcell": {
        source: "iana"
      },
      "application/vnd.flographit": {
        source: "iana",
        extensions: ["gph"]
      },
      "application/vnd.fluxtime.clip": {
        source: "iana",
        extensions: ["ftc"]
      },
      "application/vnd.font-fontforge-sfd": {
        source: "iana"
      },
      "application/vnd.framemaker": {
        source: "iana",
        extensions: ["fm", "frame", "maker", "book"]
      },
      "application/vnd.frogans.fnc": {
        source: "iana",
        extensions: ["fnc"]
      },
      "application/vnd.frogans.ltf": {
        source: "iana",
        extensions: ["ltf"]
      },
      "application/vnd.fsc.weblaunch": {
        source: "iana",
        extensions: ["fsc"]
      },
      "application/vnd.fujifilm.fb.docuworks": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.binder": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.jfi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fujitsu.oasys": {
        source: "iana",
        extensions: ["oas"]
      },
      "application/vnd.fujitsu.oasys2": {
        source: "iana",
        extensions: ["oa2"]
      },
      "application/vnd.fujitsu.oasys3": {
        source: "iana",
        extensions: ["oa3"]
      },
      "application/vnd.fujitsu.oasysgp": {
        source: "iana",
        extensions: ["fg5"]
      },
      "application/vnd.fujitsu.oasysprs": {
        source: "iana",
        extensions: ["bh2"]
      },
      "application/vnd.fujixerox.art-ex": {
        source: "iana"
      },
      "application/vnd.fujixerox.art4": {
        source: "iana"
      },
      "application/vnd.fujixerox.ddd": {
        source: "iana",
        extensions: ["ddd"]
      },
      "application/vnd.fujixerox.docuworks": {
        source: "iana",
        extensions: ["xdw"]
      },
      "application/vnd.fujixerox.docuworks.binder": {
        source: "iana",
        extensions: ["xbd"]
      },
      "application/vnd.fujixerox.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujixerox.hbpl": {
        source: "iana"
      },
      "application/vnd.fut-misnet": {
        source: "iana"
      },
      "application/vnd.futoin+cbor": {
        source: "iana"
      },
      "application/vnd.futoin+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fuzzysheet": {
        source: "iana",
        extensions: ["fzs"]
      },
      "application/vnd.genomatix.tuxedo": {
        source: "iana",
        extensions: ["txd"]
      },
      "application/vnd.gentics.grd+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geo+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geocube+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geogebra.file": {
        source: "iana",
        extensions: ["ggb"]
      },
      "application/vnd.geogebra.slides": {
        source: "iana"
      },
      "application/vnd.geogebra.tool": {
        source: "iana",
        extensions: ["ggt"]
      },
      "application/vnd.geometry-explorer": {
        source: "iana",
        extensions: ["gex", "gre"]
      },
      "application/vnd.geonext": {
        source: "iana",
        extensions: ["gxt"]
      },
      "application/vnd.geoplan": {
        source: "iana",
        extensions: ["g2w"]
      },
      "application/vnd.geospace": {
        source: "iana",
        extensions: ["g3w"]
      },
      "application/vnd.gerber": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt-response": {
        source: "iana"
      },
      "application/vnd.gmx": {
        source: "iana",
        extensions: ["gmx"]
      },
      "application/vnd.google-apps.document": {
        compressible: false,
        extensions: ["gdoc"]
      },
      "application/vnd.google-apps.presentation": {
        compressible: false,
        extensions: ["gslides"]
      },
      "application/vnd.google-apps.spreadsheet": {
        compressible: false,
        extensions: ["gsheet"]
      },
      "application/vnd.google-earth.kml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["kml"]
      },
      "application/vnd.google-earth.kmz": {
        source: "iana",
        compressible: false,
        extensions: ["kmz"]
      },
      "application/vnd.gov.sk.e-form+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gov.sk.e-form+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.gov.sk.xmldatacontainer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.grafeq": {
        source: "iana",
        extensions: ["gqf", "gqs"]
      },
      "application/vnd.gridmp": {
        source: "iana"
      },
      "application/vnd.groove-account": {
        source: "iana",
        extensions: ["gac"]
      },
      "application/vnd.groove-help": {
        source: "iana",
        extensions: ["ghf"]
      },
      "application/vnd.groove-identity-message": {
        source: "iana",
        extensions: ["gim"]
      },
      "application/vnd.groove-injector": {
        source: "iana",
        extensions: ["grv"]
      },
      "application/vnd.groove-tool-message": {
        source: "iana",
        extensions: ["gtm"]
      },
      "application/vnd.groove-tool-template": {
        source: "iana",
        extensions: ["tpl"]
      },
      "application/vnd.groove-vcard": {
        source: "iana",
        extensions: ["vcg"]
      },
      "application/vnd.hal+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hal+xml": {
        source: "iana",
        compressible: true,
        extensions: ["hal"]
      },
      "application/vnd.handheld-entertainment+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zmm"]
      },
      "application/vnd.hbci": {
        source: "iana",
        extensions: ["hbci"]
      },
      "application/vnd.hc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hcl-bireports": {
        source: "iana"
      },
      "application/vnd.hdt": {
        source: "iana"
      },
      "application/vnd.heroku+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hhe.lesson-player": {
        source: "iana",
        extensions: ["les"]
      },
      "application/vnd.hl7cda+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.hl7v2+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.hp-hpgl": {
        source: "iana",
        extensions: ["hpgl"]
      },
      "application/vnd.hp-hpid": {
        source: "iana",
        extensions: ["hpid"]
      },
      "application/vnd.hp-hps": {
        source: "iana",
        extensions: ["hps"]
      },
      "application/vnd.hp-jlyt": {
        source: "iana",
        extensions: ["jlt"]
      },
      "application/vnd.hp-pcl": {
        source: "iana",
        extensions: ["pcl"]
      },
      "application/vnd.hp-pclxl": {
        source: "iana",
        extensions: ["pclxl"]
      },
      "application/vnd.httphone": {
        source: "iana"
      },
      "application/vnd.hydrostatix.sof-data": {
        source: "iana",
        extensions: ["sfd-hdstx"]
      },
      "application/vnd.hyper+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyper-item+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyperdrive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hzn-3d-crossword": {
        source: "iana"
      },
      "application/vnd.ibm.afplinedata": {
        source: "iana"
      },
      "application/vnd.ibm.electronic-media": {
        source: "iana"
      },
      "application/vnd.ibm.minipay": {
        source: "iana",
        extensions: ["mpy"]
      },
      "application/vnd.ibm.modcap": {
        source: "iana",
        extensions: ["afp", "listafp", "list3820"]
      },
      "application/vnd.ibm.rights-management": {
        source: "iana",
        extensions: ["irm"]
      },
      "application/vnd.ibm.secure-container": {
        source: "iana",
        extensions: ["sc"]
      },
      "application/vnd.iccprofile": {
        source: "iana",
        extensions: ["icc", "icm"]
      },
      "application/vnd.ieee.1905": {
        source: "iana"
      },
      "application/vnd.igloader": {
        source: "iana",
        extensions: ["igl"]
      },
      "application/vnd.imagemeter.folder+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.imagemeter.image+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.immervision-ivp": {
        source: "iana",
        extensions: ["ivp"]
      },
      "application/vnd.immervision-ivu": {
        source: "iana",
        extensions: ["ivu"]
      },
      "application/vnd.ims.imsccv1p1": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p2": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p3": {
        source: "iana"
      },
      "application/vnd.ims.lis.v2.result+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy.id+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings.simple+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informedcontrol.rms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informix-visionary": {
        source: "iana"
      },
      "application/vnd.infotech.project": {
        source: "iana"
      },
      "application/vnd.infotech.project+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.innopath.wamp.notification": {
        source: "iana"
      },
      "application/vnd.insors.igm": {
        source: "iana",
        extensions: ["igm"]
      },
      "application/vnd.intercon.formnet": {
        source: "iana",
        extensions: ["xpw", "xpx"]
      },
      "application/vnd.intergeo": {
        source: "iana",
        extensions: ["i2g"]
      },
      "application/vnd.intertrust.digibox": {
        source: "iana"
      },
      "application/vnd.intertrust.nncp": {
        source: "iana"
      },
      "application/vnd.intu.qbo": {
        source: "iana",
        extensions: ["qbo"]
      },
      "application/vnd.intu.qfx": {
        source: "iana",
        extensions: ["qfx"]
      },
      "application/vnd.iptc.g2.catalogitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.conceptitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.knowledgeitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.packageitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.planningitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ipunplugged.rcprofile": {
        source: "iana",
        extensions: ["rcprofile"]
      },
      "application/vnd.irepository.package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["irp"]
      },
      "application/vnd.is-xpr": {
        source: "iana",
        extensions: ["xpr"]
      },
      "application/vnd.isac.fcs": {
        source: "iana",
        extensions: ["fcs"]
      },
      "application/vnd.iso11783-10+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.jam": {
        source: "iana",
        extensions: ["jam"]
      },
      "application/vnd.japannet-directory-service": {
        source: "iana"
      },
      "application/vnd.japannet-jpnstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-payment-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-registration": {
        source: "iana"
      },
      "application/vnd.japannet-registration-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-setstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-verification": {
        source: "iana"
      },
      "application/vnd.japannet-verification-wakeup": {
        source: "iana"
      },
      "application/vnd.jcp.javame.midlet-rms": {
        source: "iana",
        extensions: ["rms"]
      },
      "application/vnd.jisp": {
        source: "iana",
        extensions: ["jisp"]
      },
      "application/vnd.joost.joda-archive": {
        source: "iana",
        extensions: ["joda"]
      },
      "application/vnd.jsk.isdn-ngn": {
        source: "iana"
      },
      "application/vnd.kahootz": {
        source: "iana",
        extensions: ["ktz", "ktr"]
      },
      "application/vnd.kde.karbon": {
        source: "iana",
        extensions: ["karbon"]
      },
      "application/vnd.kde.kchart": {
        source: "iana",
        extensions: ["chrt"]
      },
      "application/vnd.kde.kformula": {
        source: "iana",
        extensions: ["kfo"]
      },
      "application/vnd.kde.kivio": {
        source: "iana",
        extensions: ["flw"]
      },
      "application/vnd.kde.kontour": {
        source: "iana",
        extensions: ["kon"]
      },
      "application/vnd.kde.kpresenter": {
        source: "iana",
        extensions: ["kpr", "kpt"]
      },
      "application/vnd.kde.kspread": {
        source: "iana",
        extensions: ["ksp"]
      },
      "application/vnd.kde.kword": {
        source: "iana",
        extensions: ["kwd", "kwt"]
      },
      "application/vnd.kenameaapp": {
        source: "iana",
        extensions: ["htke"]
      },
      "application/vnd.kidspiration": {
        source: "iana",
        extensions: ["kia"]
      },
      "application/vnd.kinar": {
        source: "iana",
        extensions: ["kne", "knp"]
      },
      "application/vnd.koan": {
        source: "iana",
        extensions: ["skp", "skd", "skt", "skm"]
      },
      "application/vnd.kodak-descriptor": {
        source: "iana",
        extensions: ["sse"]
      },
      "application/vnd.las": {
        source: "iana"
      },
      "application/vnd.las.las+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.las.las+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lasxml"]
      },
      "application/vnd.laszip": {
        source: "iana"
      },
      "application/vnd.leap+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.liberty-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.llamagraphics.life-balance.desktop": {
        source: "iana",
        extensions: ["lbd"]
      },
      "application/vnd.llamagraphics.life-balance.exchange+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lbe"]
      },
      "application/vnd.logipipe.circuit+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.loom": {
        source: "iana"
      },
      "application/vnd.lotus-1-2-3": {
        source: "iana",
        extensions: ["123"]
      },
      "application/vnd.lotus-approach": {
        source: "iana",
        extensions: ["apr"]
      },
      "application/vnd.lotus-freelance": {
        source: "iana",
        extensions: ["pre"]
      },
      "application/vnd.lotus-notes": {
        source: "iana",
        extensions: ["nsf"]
      },
      "application/vnd.lotus-organizer": {
        source: "iana",
        extensions: ["org"]
      },
      "application/vnd.lotus-screencam": {
        source: "iana",
        extensions: ["scm"]
      },
      "application/vnd.lotus-wordpro": {
        source: "iana",
        extensions: ["lwp"]
      },
      "application/vnd.macports.portpkg": {
        source: "iana",
        extensions: ["portpkg"]
      },
      "application/vnd.mapbox-vector-tile": {
        source: "iana",
        extensions: ["mvt"]
      },
      "application/vnd.marlin.drm.actiontoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.conftoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.license+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.mdcf": {
        source: "iana"
      },
      "application/vnd.mason+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.maxar.archive.3tz+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.maxmind.maxmind-db": {
        source: "iana"
      },
      "application/vnd.mcd": {
        source: "iana",
        extensions: ["mcd"]
      },
      "application/vnd.medcalcdata": {
        source: "iana",
        extensions: ["mc1"]
      },
      "application/vnd.mediastation.cdkey": {
        source: "iana",
        extensions: ["cdkey"]
      },
      "application/vnd.meridian-slingshot": {
        source: "iana"
      },
      "application/vnd.mfer": {
        source: "iana",
        extensions: ["mwf"]
      },
      "application/vnd.mfmp": {
        source: "iana",
        extensions: ["mfm"]
      },
      "application/vnd.micro+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.micrografx.flo": {
        source: "iana",
        extensions: ["flo"]
      },
      "application/vnd.micrografx.igx": {
        source: "iana",
        extensions: ["igx"]
      },
      "application/vnd.microsoft.portable-executable": {
        source: "iana"
      },
      "application/vnd.microsoft.windows.thumbnail-cache": {
        source: "iana"
      },
      "application/vnd.miele+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.mif": {
        source: "iana",
        extensions: ["mif"]
      },
      "application/vnd.minisoft-hp3000-save": {
        source: "iana"
      },
      "application/vnd.mitsubishi.misty-guard.trustweb": {
        source: "iana"
      },
      "application/vnd.mobius.daf": {
        source: "iana",
        extensions: ["daf"]
      },
      "application/vnd.mobius.dis": {
        source: "iana",
        extensions: ["dis"]
      },
      "application/vnd.mobius.mbk": {
        source: "iana",
        extensions: ["mbk"]
      },
      "application/vnd.mobius.mqy": {
        source: "iana",
        extensions: ["mqy"]
      },
      "application/vnd.mobius.msl": {
        source: "iana",
        extensions: ["msl"]
      },
      "application/vnd.mobius.plc": {
        source: "iana",
        extensions: ["plc"]
      },
      "application/vnd.mobius.txf": {
        source: "iana",
        extensions: ["txf"]
      },
      "application/vnd.mophun.application": {
        source: "iana",
        extensions: ["mpn"]
      },
      "application/vnd.mophun.certificate": {
        source: "iana",
        extensions: ["mpc"]
      },
      "application/vnd.motorola.flexsuite": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.adsi": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.fis": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.gotap": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.kmr": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.ttc": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.wem": {
        source: "iana"
      },
      "application/vnd.motorola.iprm": {
        source: "iana"
      },
      "application/vnd.mozilla.xul+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xul"]
      },
      "application/vnd.ms-3mfdocument": {
        source: "iana"
      },
      "application/vnd.ms-artgalry": {
        source: "iana",
        extensions: ["cil"]
      },
      "application/vnd.ms-asf": {
        source: "iana"
      },
      "application/vnd.ms-cab-compressed": {
        source: "iana",
        extensions: ["cab"]
      },
      "application/vnd.ms-color.iccprofile": {
        source: "apache"
      },
      "application/vnd.ms-excel": {
        source: "iana",
        compressible: false,
        extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"]
      },
      "application/vnd.ms-excel.addin.macroenabled.12": {
        source: "iana",
        extensions: ["xlam"]
      },
      "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
        source: "iana",
        extensions: ["xlsb"]
      },
      "application/vnd.ms-excel.sheet.macroenabled.12": {
        source: "iana",
        extensions: ["xlsm"]
      },
      "application/vnd.ms-excel.template.macroenabled.12": {
        source: "iana",
        extensions: ["xltm"]
      },
      "application/vnd.ms-fontobject": {
        source: "iana",
        compressible: true,
        extensions: ["eot"]
      },
      "application/vnd.ms-htmlhelp": {
        source: "iana",
        extensions: ["chm"]
      },
      "application/vnd.ms-ims": {
        source: "iana",
        extensions: ["ims"]
      },
      "application/vnd.ms-lrm": {
        source: "iana",
        extensions: ["lrm"]
      },
      "application/vnd.ms-office.activex+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-officetheme": {
        source: "iana",
        extensions: ["thmx"]
      },
      "application/vnd.ms-opentype": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-outlook": {
        compressible: false,
        extensions: ["msg"]
      },
      "application/vnd.ms-package.obfuscated-opentype": {
        source: "apache"
      },
      "application/vnd.ms-pki.seccat": {
        source: "apache",
        extensions: ["cat"]
      },
      "application/vnd.ms-pki.stl": {
        source: "apache",
        extensions: ["stl"]
      },
      "application/vnd.ms-playready.initiator+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-powerpoint": {
        source: "iana",
        compressible: false,
        extensions: ["ppt", "pps", "pot"]
      },
      "application/vnd.ms-powerpoint.addin.macroenabled.12": {
        source: "iana",
        extensions: ["ppam"]
      },
      "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
        source: "iana",
        extensions: ["pptm"]
      },
      "application/vnd.ms-powerpoint.slide.macroenabled.12": {
        source: "iana",
        extensions: ["sldm"]
      },
      "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
        source: "iana",
        extensions: ["ppsm"]
      },
      "application/vnd.ms-powerpoint.template.macroenabled.12": {
        source: "iana",
        extensions: ["potm"]
      },
      "application/vnd.ms-printdevicecapabilities+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-printing.printticket+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-printschematicket+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-project": {
        source: "iana",
        extensions: ["mpp", "mpt"]
      },
      "application/vnd.ms-tnef": {
        source: "iana"
      },
      "application/vnd.ms-windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.nwprinting.oob": {
        source: "iana"
      },
      "application/vnd.ms-windows.printerpairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.wsd.oob": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-resp": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-resp": {
        source: "iana"
      },
      "application/vnd.ms-word.document.macroenabled.12": {
        source: "iana",
        extensions: ["docm"]
      },
      "application/vnd.ms-word.template.macroenabled.12": {
        source: "iana",
        extensions: ["dotm"]
      },
      "application/vnd.ms-works": {
        source: "iana",
        extensions: ["wps", "wks", "wcm", "wdb"]
      },
      "application/vnd.ms-wpl": {
        source: "iana",
        extensions: ["wpl"]
      },
      "application/vnd.ms-xpsdocument": {
        source: "iana",
        compressible: false,
        extensions: ["xps"]
      },
      "application/vnd.msa-disk-image": {
        source: "iana"
      },
      "application/vnd.mseq": {
        source: "iana",
        extensions: ["mseq"]
      },
      "application/vnd.msign": {
        source: "iana"
      },
      "application/vnd.multiad.creator": {
        source: "iana"
      },
      "application/vnd.multiad.creator.cif": {
        source: "iana"
      },
      "application/vnd.music-niff": {
        source: "iana"
      },
      "application/vnd.musician": {
        source: "iana",
        extensions: ["mus"]
      },
      "application/vnd.muvee.style": {
        source: "iana",
        extensions: ["msty"]
      },
      "application/vnd.mynfc": {
        source: "iana",
        extensions: ["taglet"]
      },
      "application/vnd.nacamar.ybrid+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ncd.control": {
        source: "iana"
      },
      "application/vnd.ncd.reference": {
        source: "iana"
      },
      "application/vnd.nearst.inv+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nebumind.line": {
        source: "iana"
      },
      "application/vnd.nervana": {
        source: "iana"
      },
      "application/vnd.netfpx": {
        source: "iana"
      },
      "application/vnd.neurolanguage.nlu": {
        source: "iana",
        extensions: ["nlu"]
      },
      "application/vnd.nimn": {
        source: "iana"
      },
      "application/vnd.nintendo.nitro.rom": {
        source: "iana"
      },
      "application/vnd.nintendo.snes.rom": {
        source: "iana"
      },
      "application/vnd.nitf": {
        source: "iana",
        extensions: ["ntf", "nitf"]
      },
      "application/vnd.noblenet-directory": {
        source: "iana",
        extensions: ["nnd"]
      },
      "application/vnd.noblenet-sealer": {
        source: "iana",
        extensions: ["nns"]
      },
      "application/vnd.noblenet-web": {
        source: "iana",
        extensions: ["nnw"]
      },
      "application/vnd.nokia.catalogs": {
        source: "iana"
      },
      "application/vnd.nokia.conml+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.conml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.iptv.config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.isds-radio-presets": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.landmarkcollection+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.n-gage.ac+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ac"]
      },
      "application/vnd.nokia.n-gage.data": {
        source: "iana",
        extensions: ["ngdat"]
      },
      "application/vnd.nokia.n-gage.symbian.install": {
        source: "iana",
        extensions: ["n-gage"]
      },
      "application/vnd.nokia.ncd": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.radio-preset": {
        source: "iana",
        extensions: ["rpst"]
      },
      "application/vnd.nokia.radio-presets": {
        source: "iana",
        extensions: ["rpss"]
      },
      "application/vnd.novadigm.edm": {
        source: "iana",
        extensions: ["edm"]
      },
      "application/vnd.novadigm.edx": {
        source: "iana",
        extensions: ["edx"]
      },
      "application/vnd.novadigm.ext": {
        source: "iana",
        extensions: ["ext"]
      },
      "application/vnd.ntt-local.content-share": {
        source: "iana"
      },
      "application/vnd.ntt-local.file-transfer": {
        source: "iana"
      },
      "application/vnd.ntt-local.ogw_remote-access": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_remote": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_tcp_stream": {
        source: "iana"
      },
      "application/vnd.oasis.opendocument.chart": {
        source: "iana",
        extensions: ["odc"]
      },
      "application/vnd.oasis.opendocument.chart-template": {
        source: "iana",
        extensions: ["otc"]
      },
      "application/vnd.oasis.opendocument.database": {
        source: "iana",
        extensions: ["odb"]
      },
      "application/vnd.oasis.opendocument.formula": {
        source: "iana",
        extensions: ["odf"]
      },
      "application/vnd.oasis.opendocument.formula-template": {
        source: "iana",
        extensions: ["odft"]
      },
      "application/vnd.oasis.opendocument.graphics": {
        source: "iana",
        compressible: false,
        extensions: ["odg"]
      },
      "application/vnd.oasis.opendocument.graphics-template": {
        source: "iana",
        extensions: ["otg"]
      },
      "application/vnd.oasis.opendocument.image": {
        source: "iana",
        extensions: ["odi"]
      },
      "application/vnd.oasis.opendocument.image-template": {
        source: "iana",
        extensions: ["oti"]
      },
      "application/vnd.oasis.opendocument.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["odp"]
      },
      "application/vnd.oasis.opendocument.presentation-template": {
        source: "iana",
        extensions: ["otp"]
      },
      "application/vnd.oasis.opendocument.spreadsheet": {
        source: "iana",
        compressible: false,
        extensions: ["ods"]
      },
      "application/vnd.oasis.opendocument.spreadsheet-template": {
        source: "iana",
        extensions: ["ots"]
      },
      "application/vnd.oasis.opendocument.text": {
        source: "iana",
        compressible: false,
        extensions: ["odt"]
      },
      "application/vnd.oasis.opendocument.text-master": {
        source: "iana",
        extensions: ["odm"]
      },
      "application/vnd.oasis.opendocument.text-template": {
        source: "iana",
        extensions: ["ott"]
      },
      "application/vnd.oasis.opendocument.text-web": {
        source: "iana",
        extensions: ["oth"]
      },
      "application/vnd.obn": {
        source: "iana"
      },
      "application/vnd.ocf+cbor": {
        source: "iana"
      },
      "application/vnd.oci.image.manifest.v1+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oftn.l10n+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessdownload+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessstreaming+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.cspg-hexbinary": {
        source: "iana"
      },
      "application/vnd.oipf.dae.svg+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.dae.xhtml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.mippvcontrolmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.pae.gem": {
        source: "iana"
      },
      "application/vnd.oipf.spdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.spdlist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.ueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.userprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.olpc-sugar": {
        source: "iana",
        extensions: ["xo"]
      },
      "application/vnd.oma-scws-config": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-request": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-response": {
        source: "iana"
      },
      "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.drm-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.imd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.ltkm": {
        source: "iana"
      },
      "application/vnd.oma.bcast.notification+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.provisioningtrigger": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgboot": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgdd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sgdu": {
        source: "iana"
      },
      "application/vnd.oma.bcast.simple-symbol-container": {
        source: "iana"
      },
      "application/vnd.oma.bcast.smartcard-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sprov+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.stkm": {
        source: "iana"
      },
      "application/vnd.oma.cab-address-book+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-feature-handler+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-pcc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-subs-invite+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-user-prefs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.dcd": {
        source: "iana"
      },
      "application/vnd.oma.dcdc": {
        source: "iana"
      },
      "application/vnd.oma.dd2+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dd2"]
      },
      "application/vnd.oma.drm.risd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.group-usage-list+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+cbor": {
        source: "iana"
      },
      "application/vnd.oma.lwm2m+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+tlv": {
        source: "iana"
      },
      "application/vnd.oma.pal+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.detailed-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.final-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.groups+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.invocation-descriptor+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.optimized-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.push": {
        source: "iana"
      },
      "application/vnd.oma.scidm.messages+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.xcap-directory+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.omads-email+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-file+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-folder+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omaloc-supl-init": {
        source: "iana"
      },
      "application/vnd.onepager": {
        source: "iana"
      },
      "application/vnd.onepagertamp": {
        source: "iana"
      },
      "application/vnd.onepagertamx": {
        source: "iana"
      },
      "application/vnd.onepagertat": {
        source: "iana"
      },
      "application/vnd.onepagertatp": {
        source: "iana"
      },
      "application/vnd.onepagertatx": {
        source: "iana"
      },
      "application/vnd.openblox.game+xml": {
        source: "iana",
        compressible: true,
        extensions: ["obgx"]
      },
      "application/vnd.openblox.game-binary": {
        source: "iana"
      },
      "application/vnd.openeye.oeb": {
        source: "iana"
      },
      "application/vnd.openofficeorg.extension": {
        source: "apache",
        extensions: ["oxt"]
      },
      "application/vnd.openstreetmap.data+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osm"]
      },
      "application/vnd.opentimestamps.ots": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawing+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["pptx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide": {
        source: "iana",
        extensions: ["sldx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
        source: "iana",
        extensions: ["ppsx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template": {
        source: "iana",
        extensions: ["potx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        source: "iana",
        compressible: false,
        extensions: ["xlsx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
        source: "iana",
        extensions: ["xltx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.theme+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.vmldrawing": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        source: "iana",
        compressible: false,
        extensions: ["docx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
        source: "iana",
        extensions: ["dotx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.core-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.relationships+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oracle.resource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.orange.indata": {
        source: "iana"
      },
      "application/vnd.osa.netdeploy": {
        source: "iana"
      },
      "application/vnd.osgeo.mapguide.package": {
        source: "iana",
        extensions: ["mgp"]
      },
      "application/vnd.osgi.bundle": {
        source: "iana"
      },
      "application/vnd.osgi.dp": {
        source: "iana",
        extensions: ["dp"]
      },
      "application/vnd.osgi.subsystem": {
        source: "iana",
        extensions: ["esa"]
      },
      "application/vnd.otps.ct-kip+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oxli.countgraph": {
        source: "iana"
      },
      "application/vnd.pagerduty+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.palm": {
        source: "iana",
        extensions: ["pdb", "pqa", "oprc"]
      },
      "application/vnd.panoply": {
        source: "iana"
      },
      "application/vnd.paos.xml": {
        source: "iana"
      },
      "application/vnd.patentdive": {
        source: "iana"
      },
      "application/vnd.patientecommsdoc": {
        source: "iana"
      },
      "application/vnd.pawaafile": {
        source: "iana",
        extensions: ["paw"]
      },
      "application/vnd.pcos": {
        source: "iana"
      },
      "application/vnd.pg.format": {
        source: "iana",
        extensions: ["str"]
      },
      "application/vnd.pg.osasli": {
        source: "iana",
        extensions: ["ei6"]
      },
      "application/vnd.piaccess.application-licence": {
        source: "iana"
      },
      "application/vnd.picsel": {
        source: "iana",
        extensions: ["efif"]
      },
      "application/vnd.pmi.widget": {
        source: "iana",
        extensions: ["wg"]
      },
      "application/vnd.poc.group-advertisement+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.pocketlearn": {
        source: "iana",
        extensions: ["plf"]
      },
      "application/vnd.powerbuilder6": {
        source: "iana",
        extensions: ["pbd"]
      },
      "application/vnd.powerbuilder6-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder7": {
        source: "iana"
      },
      "application/vnd.powerbuilder7-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder75": {
        source: "iana"
      },
      "application/vnd.powerbuilder75-s": {
        source: "iana"
      },
      "application/vnd.preminet": {
        source: "iana"
      },
      "application/vnd.previewsystems.box": {
        source: "iana",
        extensions: ["box"]
      },
      "application/vnd.proteus.magazine": {
        source: "iana",
        extensions: ["mgz"]
      },
      "application/vnd.psfs": {
        source: "iana"
      },
      "application/vnd.publishare-delta-tree": {
        source: "iana",
        extensions: ["qps"]
      },
      "application/vnd.pvi.ptid1": {
        source: "iana",
        extensions: ["ptid"]
      },
      "application/vnd.pwg-multiplexed": {
        source: "iana"
      },
      "application/vnd.pwg-xhtml-print+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.qualcomm.brew-app-res": {
        source: "iana"
      },
      "application/vnd.quarantainenet": {
        source: "iana"
      },
      "application/vnd.quark.quarkxpress": {
        source: "iana",
        extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"]
      },
      "application/vnd.quobject-quoxdocument": {
        source: "iana"
      },
      "application/vnd.radisys.moml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-stream+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-base+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-detect+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-group+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-speech+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-transform+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rainstor.data": {
        source: "iana"
      },
      "application/vnd.rapid": {
        source: "iana"
      },
      "application/vnd.rar": {
        source: "iana",
        extensions: ["rar"]
      },
      "application/vnd.realvnc.bed": {
        source: "iana",
        extensions: ["bed"]
      },
      "application/vnd.recordare.musicxml": {
        source: "iana",
        extensions: ["mxl"]
      },
      "application/vnd.recordare.musicxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musicxml"]
      },
      "application/vnd.renlearn.rlprint": {
        source: "iana"
      },
      "application/vnd.resilient.logic": {
        source: "iana"
      },
      "application/vnd.restful+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rig.cryptonote": {
        source: "iana",
        extensions: ["cryptonote"]
      },
      "application/vnd.rim.cod": {
        source: "apache",
        extensions: ["cod"]
      },
      "application/vnd.rn-realmedia": {
        source: "apache",
        extensions: ["rm"]
      },
      "application/vnd.rn-realmedia-vbr": {
        source: "apache",
        extensions: ["rmvb"]
      },
      "application/vnd.route66.link66+xml": {
        source: "iana",
        compressible: true,
        extensions: ["link66"]
      },
      "application/vnd.rs-274x": {
        source: "iana"
      },
      "application/vnd.ruckus.download": {
        source: "iana"
      },
      "application/vnd.s3sms": {
        source: "iana"
      },
      "application/vnd.sailingtracker.track": {
        source: "iana",
        extensions: ["st"]
      },
      "application/vnd.sar": {
        source: "iana"
      },
      "application/vnd.sbm.cid": {
        source: "iana"
      },
      "application/vnd.sbm.mid2": {
        source: "iana"
      },
      "application/vnd.scribus": {
        source: "iana"
      },
      "application/vnd.sealed.3df": {
        source: "iana"
      },
      "application/vnd.sealed.csf": {
        source: "iana"
      },
      "application/vnd.sealed.doc": {
        source: "iana"
      },
      "application/vnd.sealed.eml": {
        source: "iana"
      },
      "application/vnd.sealed.mht": {
        source: "iana"
      },
      "application/vnd.sealed.net": {
        source: "iana"
      },
      "application/vnd.sealed.ppt": {
        source: "iana"
      },
      "application/vnd.sealed.tiff": {
        source: "iana"
      },
      "application/vnd.sealed.xls": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.html": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.pdf": {
        source: "iana"
      },
      "application/vnd.seemail": {
        source: "iana",
        extensions: ["see"]
      },
      "application/vnd.seis+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.sema": {
        source: "iana",
        extensions: ["sema"]
      },
      "application/vnd.semd": {
        source: "iana",
        extensions: ["semd"]
      },
      "application/vnd.semf": {
        source: "iana",
        extensions: ["semf"]
      },
      "application/vnd.shade-save-file": {
        source: "iana"
      },
      "application/vnd.shana.informed.formdata": {
        source: "iana",
        extensions: ["ifm"]
      },
      "application/vnd.shana.informed.formtemplate": {
        source: "iana",
        extensions: ["itp"]
      },
      "application/vnd.shana.informed.interchange": {
        source: "iana",
        extensions: ["iif"]
      },
      "application/vnd.shana.informed.package": {
        source: "iana",
        extensions: ["ipk"]
      },
      "application/vnd.shootproof+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shopkick+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shp": {
        source: "iana"
      },
      "application/vnd.shx": {
        source: "iana"
      },
      "application/vnd.sigrok.session": {
        source: "iana"
      },
      "application/vnd.simtech-mindmapper": {
        source: "iana",
        extensions: ["twd", "twds"]
      },
      "application/vnd.siren+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.smaf": {
        source: "iana",
        extensions: ["mmf"]
      },
      "application/vnd.smart.notebook": {
        source: "iana"
      },
      "application/vnd.smart.teacher": {
        source: "iana",
        extensions: ["teacher"]
      },
      "application/vnd.snesdev-page-table": {
        source: "iana"
      },
      "application/vnd.software602.filler.form+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fo"]
      },
      "application/vnd.software602.filler.form-xml-zip": {
        source: "iana"
      },
      "application/vnd.solent.sdkm+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sdkm", "sdkd"]
      },
      "application/vnd.spotfire.dxp": {
        source: "iana",
        extensions: ["dxp"]
      },
      "application/vnd.spotfire.sfs": {
        source: "iana",
        extensions: ["sfs"]
      },
      "application/vnd.sqlite3": {
        source: "iana"
      },
      "application/vnd.sss-cod": {
        source: "iana"
      },
      "application/vnd.sss-dtf": {
        source: "iana"
      },
      "application/vnd.sss-ntf": {
        source: "iana"
      },
      "application/vnd.stardivision.calc": {
        source: "apache",
        extensions: ["sdc"]
      },
      "application/vnd.stardivision.draw": {
        source: "apache",
        extensions: ["sda"]
      },
      "application/vnd.stardivision.impress": {
        source: "apache",
        extensions: ["sdd"]
      },
      "application/vnd.stardivision.math": {
        source: "apache",
        extensions: ["smf"]
      },
      "application/vnd.stardivision.writer": {
        source: "apache",
        extensions: ["sdw", "vor"]
      },
      "application/vnd.stardivision.writer-global": {
        source: "apache",
        extensions: ["sgl"]
      },
      "application/vnd.stepmania.package": {
        source: "iana",
        extensions: ["smzip"]
      },
      "application/vnd.stepmania.stepchart": {
        source: "iana",
        extensions: ["sm"]
      },
      "application/vnd.street-stream": {
        source: "iana"
      },
      "application/vnd.sun.wadl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wadl"]
      },
      "application/vnd.sun.xml.calc": {
        source: "apache",
        extensions: ["sxc"]
      },
      "application/vnd.sun.xml.calc.template": {
        source: "apache",
        extensions: ["stc"]
      },
      "application/vnd.sun.xml.draw": {
        source: "apache",
        extensions: ["sxd"]
      },
      "application/vnd.sun.xml.draw.template": {
        source: "apache",
        extensions: ["std"]
      },
      "application/vnd.sun.xml.impress": {
        source: "apache",
        extensions: ["sxi"]
      },
      "application/vnd.sun.xml.impress.template": {
        source: "apache",
        extensions: ["sti"]
      },
      "application/vnd.sun.xml.math": {
        source: "apache",
        extensions: ["sxm"]
      },
      "application/vnd.sun.xml.writer": {
        source: "apache",
        extensions: ["sxw"]
      },
      "application/vnd.sun.xml.writer.global": {
        source: "apache",
        extensions: ["sxg"]
      },
      "application/vnd.sun.xml.writer.template": {
        source: "apache",
        extensions: ["stw"]
      },
      "application/vnd.sus-calendar": {
        source: "iana",
        extensions: ["sus", "susp"]
      },
      "application/vnd.svd": {
        source: "iana",
        extensions: ["svd"]
      },
      "application/vnd.swiftview-ics": {
        source: "iana"
      },
      "application/vnd.sycle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.syft+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.symbian.install": {
        source: "apache",
        extensions: ["sis", "sisx"]
      },
      "application/vnd.syncml+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xsm"]
      },
      "application/vnd.syncml.dm+wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["bdm"]
      },
      "application/vnd.syncml.dm+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xdm"]
      },
      "application/vnd.syncml.dm.notification": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["ddf"]
      },
      "application/vnd.syncml.dmtnds+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmtnds+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.syncml.ds.notification": {
        source: "iana"
      },
      "application/vnd.tableschema+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tao.intent-module-archive": {
        source: "iana",
        extensions: ["tao"]
      },
      "application/vnd.tcpdump.pcap": {
        source: "iana",
        extensions: ["pcap", "cap", "dmp"]
      },
      "application/vnd.think-cell.ppttc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tmd.mediaflex.api+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tml": {
        source: "iana"
      },
      "application/vnd.tmobile-livetv": {
        source: "iana",
        extensions: ["tmo"]
      },
      "application/vnd.tri.onesource": {
        source: "iana"
      },
      "application/vnd.trid.tpt": {
        source: "iana",
        extensions: ["tpt"]
      },
      "application/vnd.triscape.mxs": {
        source: "iana",
        extensions: ["mxs"]
      },
      "application/vnd.trueapp": {
        source: "iana",
        extensions: ["tra"]
      },
      "application/vnd.truedoc": {
        source: "iana"
      },
      "application/vnd.ubisoft.webplayer": {
        source: "iana"
      },
      "application/vnd.ufdl": {
        source: "iana",
        extensions: ["ufd", "ufdl"]
      },
      "application/vnd.uiq.theme": {
        source: "iana",
        extensions: ["utz"]
      },
      "application/vnd.umajin": {
        source: "iana",
        extensions: ["umj"]
      },
      "application/vnd.unity": {
        source: "iana",
        extensions: ["unityweb"]
      },
      "application/vnd.uoml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uoml"]
      },
      "application/vnd.uplanet.alert": {
        source: "iana"
      },
      "application/vnd.uplanet.alert-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.channel": {
        source: "iana"
      },
      "application/vnd.uplanet.channel-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.list": {
        source: "iana"
      },
      "application/vnd.uplanet.list-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.signal": {
        source: "iana"
      },
      "application/vnd.uri-map": {
        source: "iana"
      },
      "application/vnd.valve.source.material": {
        source: "iana"
      },
      "application/vnd.vcx": {
        source: "iana",
        extensions: ["vcx"]
      },
      "application/vnd.vd-study": {
        source: "iana"
      },
      "application/vnd.vectorworks": {
        source: "iana"
      },
      "application/vnd.vel+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.verimatrix.vcas": {
        source: "iana"
      },
      "application/vnd.veritone.aion+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.veryant.thin": {
        source: "iana"
      },
      "application/vnd.ves.encrypted": {
        source: "iana"
      },
      "application/vnd.vidsoft.vidconference": {
        source: "iana"
      },
      "application/vnd.visio": {
        source: "iana",
        extensions: ["vsd", "vst", "vss", "vsw"]
      },
      "application/vnd.visionary": {
        source: "iana",
        extensions: ["vis"]
      },
      "application/vnd.vividence.scriptfile": {
        source: "iana"
      },
      "application/vnd.vsf": {
        source: "iana",
        extensions: ["vsf"]
      },
      "application/vnd.wap.sic": {
        source: "iana"
      },
      "application/vnd.wap.slc": {
        source: "iana"
      },
      "application/vnd.wap.wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["wbxml"]
      },
      "application/vnd.wap.wmlc": {
        source: "iana",
        extensions: ["wmlc"]
      },
      "application/vnd.wap.wmlscriptc": {
        source: "iana",
        extensions: ["wmlsc"]
      },
      "application/vnd.webturbo": {
        source: "iana",
        extensions: ["wtb"]
      },
      "application/vnd.wfa.dpp": {
        source: "iana"
      },
      "application/vnd.wfa.p2p": {
        source: "iana"
      },
      "application/vnd.wfa.wsc": {
        source: "iana"
      },
      "application/vnd.windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.wmc": {
        source: "iana"
      },
      "application/vnd.wmf.bootstrap": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica.package": {
        source: "iana"
      },
      "application/vnd.wolfram.player": {
        source: "iana",
        extensions: ["nbp"]
      },
      "application/vnd.wordperfect": {
        source: "iana",
        extensions: ["wpd"]
      },
      "application/vnd.wqd": {
        source: "iana",
        extensions: ["wqd"]
      },
      "application/vnd.wrq-hp3000-labelled": {
        source: "iana"
      },
      "application/vnd.wt.stf": {
        source: "iana",
        extensions: ["stf"]
      },
      "application/vnd.wv.csp+wbxml": {
        source: "iana"
      },
      "application/vnd.wv.csp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.wv.ssp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xacml+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xara": {
        source: "iana",
        extensions: ["xar"]
      },
      "application/vnd.xfdl": {
        source: "iana",
        extensions: ["xfdl"]
      },
      "application/vnd.xfdl.webform": {
        source: "iana"
      },
      "application/vnd.xmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xmpie.cpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.dpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.plan": {
        source: "iana"
      },
      "application/vnd.xmpie.ppkg": {
        source: "iana"
      },
      "application/vnd.xmpie.xlim": {
        source: "iana"
      },
      "application/vnd.yamaha.hv-dic": {
        source: "iana",
        extensions: ["hvd"]
      },
      "application/vnd.yamaha.hv-script": {
        source: "iana",
        extensions: ["hvs"]
      },
      "application/vnd.yamaha.hv-voice": {
        source: "iana",
        extensions: ["hvp"]
      },
      "application/vnd.yamaha.openscoreformat": {
        source: "iana",
        extensions: ["osf"]
      },
      "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osfpvg"]
      },
      "application/vnd.yamaha.remote-setup": {
        source: "iana"
      },
      "application/vnd.yamaha.smaf-audio": {
        source: "iana",
        extensions: ["saf"]
      },
      "application/vnd.yamaha.smaf-phrase": {
        source: "iana",
        extensions: ["spf"]
      },
      "application/vnd.yamaha.through-ngn": {
        source: "iana"
      },
      "application/vnd.yamaha.tunnel-udpencap": {
        source: "iana"
      },
      "application/vnd.yaoweme": {
        source: "iana"
      },
      "application/vnd.yellowriver-custom-menu": {
        source: "iana",
        extensions: ["cmp"]
      },
      "application/vnd.youtube.yt": {
        source: "iana"
      },
      "application/vnd.zul": {
        source: "iana",
        extensions: ["zir", "zirz"]
      },
      "application/vnd.zzazz.deck+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zaz"]
      },
      "application/voicexml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["vxml"]
      },
      "application/voucher-cms+json": {
        source: "iana",
        compressible: true
      },
      "application/vq-rtcpxr": {
        source: "iana"
      },
      "application/wasm": {
        source: "iana",
        compressible: true,
        extensions: ["wasm"]
      },
      "application/watcherinfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wif"]
      },
      "application/webpush-options+json": {
        source: "iana",
        compressible: true
      },
      "application/whoispp-query": {
        source: "iana"
      },
      "application/whoispp-response": {
        source: "iana"
      },
      "application/widget": {
        source: "iana",
        extensions: ["wgt"]
      },
      "application/winhlp": {
        source: "apache",
        extensions: ["hlp"]
      },
      "application/wita": {
        source: "iana"
      },
      "application/wordperfect5.1": {
        source: "iana"
      },
      "application/wsdl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wsdl"]
      },
      "application/wspolicy+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wspolicy"]
      },
      "application/x-7z-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["7z"]
      },
      "application/x-abiword": {
        source: "apache",
        extensions: ["abw"]
      },
      "application/x-ace-compressed": {
        source: "apache",
        extensions: ["ace"]
      },
      "application/x-amf": {
        source: "apache"
      },
      "application/x-apple-diskimage": {
        source: "apache",
        extensions: ["dmg"]
      },
      "application/x-arj": {
        compressible: false,
        extensions: ["arj"]
      },
      "application/x-authorware-bin": {
        source: "apache",
        extensions: ["aab", "x32", "u32", "vox"]
      },
      "application/x-authorware-map": {
        source: "apache",
        extensions: ["aam"]
      },
      "application/x-authorware-seg": {
        source: "apache",
        extensions: ["aas"]
      },
      "application/x-bcpio": {
        source: "apache",
        extensions: ["bcpio"]
      },
      "application/x-bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/x-bittorrent": {
        source: "apache",
        extensions: ["torrent"]
      },
      "application/x-blorb": {
        source: "apache",
        extensions: ["blb", "blorb"]
      },
      "application/x-bzip": {
        source: "apache",
        compressible: false,
        extensions: ["bz"]
      },
      "application/x-bzip2": {
        source: "apache",
        compressible: false,
        extensions: ["bz2", "boz"]
      },
      "application/x-cbr": {
        source: "apache",
        extensions: ["cbr", "cba", "cbt", "cbz", "cb7"]
      },
      "application/x-cdlink": {
        source: "apache",
        extensions: ["vcd"]
      },
      "application/x-cfs-compressed": {
        source: "apache",
        extensions: ["cfs"]
      },
      "application/x-chat": {
        source: "apache",
        extensions: ["chat"]
      },
      "application/x-chess-pgn": {
        source: "apache",
        extensions: ["pgn"]
      },
      "application/x-chrome-extension": {
        extensions: ["crx"]
      },
      "application/x-cocoa": {
        source: "nginx",
        extensions: ["cco"]
      },
      "application/x-compress": {
        source: "apache"
      },
      "application/x-conference": {
        source: "apache",
        extensions: ["nsc"]
      },
      "application/x-cpio": {
        source: "apache",
        extensions: ["cpio"]
      },
      "application/x-csh": {
        source: "apache",
        extensions: ["csh"]
      },
      "application/x-deb": {
        compressible: false
      },
      "application/x-debian-package": {
        source: "apache",
        extensions: ["deb", "udeb"]
      },
      "application/x-dgc-compressed": {
        source: "apache",
        extensions: ["dgc"]
      },
      "application/x-director": {
        source: "apache",
        extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"]
      },
      "application/x-doom": {
        source: "apache",
        extensions: ["wad"]
      },
      "application/x-dtbncx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ncx"]
      },
      "application/x-dtbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dtb"]
      },
      "application/x-dtbresource+xml": {
        source: "apache",
        compressible: true,
        extensions: ["res"]
      },
      "application/x-dvi": {
        source: "apache",
        compressible: false,
        extensions: ["dvi"]
      },
      "application/x-envoy": {
        source: "apache",
        extensions: ["evy"]
      },
      "application/x-eva": {
        source: "apache",
        extensions: ["eva"]
      },
      "application/x-font-bdf": {
        source: "apache",
        extensions: ["bdf"]
      },
      "application/x-font-dos": {
        source: "apache"
      },
      "application/x-font-framemaker": {
        source: "apache"
      },
      "application/x-font-ghostscript": {
        source: "apache",
        extensions: ["gsf"]
      },
      "application/x-font-libgrx": {
        source: "apache"
      },
      "application/x-font-linux-psf": {
        source: "apache",
        extensions: ["psf"]
      },
      "application/x-font-pcf": {
        source: "apache",
        extensions: ["pcf"]
      },
      "application/x-font-snf": {
        source: "apache",
        extensions: ["snf"]
      },
      "application/x-font-speedo": {
        source: "apache"
      },
      "application/x-font-sunos-news": {
        source: "apache"
      },
      "application/x-font-type1": {
        source: "apache",
        extensions: ["pfa", "pfb", "pfm", "afm"]
      },
      "application/x-font-vfont": {
        source: "apache"
      },
      "application/x-freearc": {
        source: "apache",
        extensions: ["arc"]
      },
      "application/x-futuresplash": {
        source: "apache",
        extensions: ["spl"]
      },
      "application/x-gca-compressed": {
        source: "apache",
        extensions: ["gca"]
      },
      "application/x-glulx": {
        source: "apache",
        extensions: ["ulx"]
      },
      "application/x-gnumeric": {
        source: "apache",
        extensions: ["gnumeric"]
      },
      "application/x-gramps-xml": {
        source: "apache",
        extensions: ["gramps"]
      },
      "application/x-gtar": {
        source: "apache",
        extensions: ["gtar"]
      },
      "application/x-gzip": {
        source: "apache"
      },
      "application/x-hdf": {
        source: "apache",
        extensions: ["hdf"]
      },
      "application/x-httpd-php": {
        compressible: true,
        extensions: ["php"]
      },
      "application/x-install-instructions": {
        source: "apache",
        extensions: ["install"]
      },
      "application/x-iso9660-image": {
        source: "apache",
        extensions: ["iso"]
      },
      "application/x-iwork-keynote-sffkey": {
        extensions: ["key"]
      },
      "application/x-iwork-numbers-sffnumbers": {
        extensions: ["numbers"]
      },
      "application/x-iwork-pages-sffpages": {
        extensions: ["pages"]
      },
      "application/x-java-archive-diff": {
        source: "nginx",
        extensions: ["jardiff"]
      },
      "application/x-java-jnlp-file": {
        source: "apache",
        compressible: false,
        extensions: ["jnlp"]
      },
      "application/x-javascript": {
        compressible: true
      },
      "application/x-keepass2": {
        extensions: ["kdbx"]
      },
      "application/x-latex": {
        source: "apache",
        compressible: false,
        extensions: ["latex"]
      },
      "application/x-lua-bytecode": {
        extensions: ["luac"]
      },
      "application/x-lzh-compressed": {
        source: "apache",
        extensions: ["lzh", "lha"]
      },
      "application/x-makeself": {
        source: "nginx",
        extensions: ["run"]
      },
      "application/x-mie": {
        source: "apache",
        extensions: ["mie"]
      },
      "application/x-mobipocket-ebook": {
        source: "apache",
        extensions: ["prc", "mobi"]
      },
      "application/x-mpegurl": {
        compressible: false
      },
      "application/x-ms-application": {
        source: "apache",
        extensions: ["application"]
      },
      "application/x-ms-shortcut": {
        source: "apache",
        extensions: ["lnk"]
      },
      "application/x-ms-wmd": {
        source: "apache",
        extensions: ["wmd"]
      },
      "application/x-ms-wmz": {
        source: "apache",
        extensions: ["wmz"]
      },
      "application/x-ms-xbap": {
        source: "apache",
        extensions: ["xbap"]
      },
      "application/x-msaccess": {
        source: "apache",
        extensions: ["mdb"]
      },
      "application/x-msbinder": {
        source: "apache",
        extensions: ["obd"]
      },
      "application/x-mscardfile": {
        source: "apache",
        extensions: ["crd"]
      },
      "application/x-msclip": {
        source: "apache",
        extensions: ["clp"]
      },
      "application/x-msdos-program": {
        extensions: ["exe"]
      },
      "application/x-msdownload": {
        source: "apache",
        extensions: ["exe", "dll", "com", "bat", "msi"]
      },
      "application/x-msmediaview": {
        source: "apache",
        extensions: ["mvb", "m13", "m14"]
      },
      "application/x-msmetafile": {
        source: "apache",
        extensions: ["wmf", "wmz", "emf", "emz"]
      },
      "application/x-msmoney": {
        source: "apache",
        extensions: ["mny"]
      },
      "application/x-mspublisher": {
        source: "apache",
        extensions: ["pub"]
      },
      "application/x-msschedule": {
        source: "apache",
        extensions: ["scd"]
      },
      "application/x-msterminal": {
        source: "apache",
        extensions: ["trm"]
      },
      "application/x-mswrite": {
        source: "apache",
        extensions: ["wri"]
      },
      "application/x-netcdf": {
        source: "apache",
        extensions: ["nc", "cdf"]
      },
      "application/x-ns-proxy-autoconfig": {
        compressible: true,
        extensions: ["pac"]
      },
      "application/x-nzb": {
        source: "apache",
        extensions: ["nzb"]
      },
      "application/x-perl": {
        source: "nginx",
        extensions: ["pl", "pm"]
      },
      "application/x-pilot": {
        source: "nginx",
        extensions: ["prc", "pdb"]
      },
      "application/x-pkcs12": {
        source: "apache",
        compressible: false,
        extensions: ["p12", "pfx"]
      },
      "application/x-pkcs7-certificates": {
        source: "apache",
        extensions: ["p7b", "spc"]
      },
      "application/x-pkcs7-certreqresp": {
        source: "apache",
        extensions: ["p7r"]
      },
      "application/x-pki-message": {
        source: "iana"
      },
      "application/x-rar-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["rar"]
      },
      "application/x-redhat-package-manager": {
        source: "nginx",
        extensions: ["rpm"]
      },
      "application/x-research-info-systems": {
        source: "apache",
        extensions: ["ris"]
      },
      "application/x-sea": {
        source: "nginx",
        extensions: ["sea"]
      },
      "application/x-sh": {
        source: "apache",
        compressible: true,
        extensions: ["sh"]
      },
      "application/x-shar": {
        source: "apache",
        extensions: ["shar"]
      },
      "application/x-shockwave-flash": {
        source: "apache",
        compressible: false,
        extensions: ["swf"]
      },
      "application/x-silverlight-app": {
        source: "apache",
        extensions: ["xap"]
      },
      "application/x-sql": {
        source: "apache",
        extensions: ["sql"]
      },
      "application/x-stuffit": {
        source: "apache",
        compressible: false,
        extensions: ["sit"]
      },
      "application/x-stuffitx": {
        source: "apache",
        extensions: ["sitx"]
      },
      "application/x-subrip": {
        source: "apache",
        extensions: ["srt"]
      },
      "application/x-sv4cpio": {
        source: "apache",
        extensions: ["sv4cpio"]
      },
      "application/x-sv4crc": {
        source: "apache",
        extensions: ["sv4crc"]
      },
      "application/x-t3vm-image": {
        source: "apache",
        extensions: ["t3"]
      },
      "application/x-tads": {
        source: "apache",
        extensions: ["gam"]
      },
      "application/x-tar": {
        source: "apache",
        compressible: true,
        extensions: ["tar"]
      },
      "application/x-tcl": {
        source: "apache",
        extensions: ["tcl", "tk"]
      },
      "application/x-tex": {
        source: "apache",
        extensions: ["tex"]
      },
      "application/x-tex-tfm": {
        source: "apache",
        extensions: ["tfm"]
      },
      "application/x-texinfo": {
        source: "apache",
        extensions: ["texinfo", "texi"]
      },
      "application/x-tgif": {
        source: "apache",
        extensions: ["obj"]
      },
      "application/x-ustar": {
        source: "apache",
        extensions: ["ustar"]
      },
      "application/x-virtualbox-hdd": {
        compressible: true,
        extensions: ["hdd"]
      },
      "application/x-virtualbox-ova": {
        compressible: true,
        extensions: ["ova"]
      },
      "application/x-virtualbox-ovf": {
        compressible: true,
        extensions: ["ovf"]
      },
      "application/x-virtualbox-vbox": {
        compressible: true,
        extensions: ["vbox"]
      },
      "application/x-virtualbox-vbox-extpack": {
        compressible: false,
        extensions: ["vbox-extpack"]
      },
      "application/x-virtualbox-vdi": {
        compressible: true,
        extensions: ["vdi"]
      },
      "application/x-virtualbox-vhd": {
        compressible: true,
        extensions: ["vhd"]
      },
      "application/x-virtualbox-vmdk": {
        compressible: true,
        extensions: ["vmdk"]
      },
      "application/x-wais-source": {
        source: "apache",
        extensions: ["src"]
      },
      "application/x-web-app-manifest+json": {
        compressible: true,
        extensions: ["webapp"]
      },
      "application/x-www-form-urlencoded": {
        source: "iana",
        compressible: true
      },
      "application/x-x509-ca-cert": {
        source: "iana",
        extensions: ["der", "crt", "pem"]
      },
      "application/x-x509-ca-ra-cert": {
        source: "iana"
      },
      "application/x-x509-next-ca-cert": {
        source: "iana"
      },
      "application/x-xfig": {
        source: "apache",
        extensions: ["fig"]
      },
      "application/x-xliff+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/x-xpinstall": {
        source: "apache",
        compressible: false,
        extensions: ["xpi"]
      },
      "application/x-xz": {
        source: "apache",
        extensions: ["xz"]
      },
      "application/x-zmachine": {
        source: "apache",
        extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"]
      },
      "application/x400-bp": {
        source: "iana"
      },
      "application/xacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/xaml+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xaml"]
      },
      "application/xcap-att+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xav"]
      },
      "application/xcap-caps+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xca"]
      },
      "application/xcap-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdf"]
      },
      "application/xcap-el+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xel"]
      },
      "application/xcap-error+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcap-ns+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xns"]
      },
      "application/xcon-conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcon-conference-info-diff+xml": {
        source: "iana",
        compressible: true
      },
      "application/xenc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xenc"]
      },
      "application/xhtml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xhtml", "xht"]
      },
      "application/xhtml-voice+xml": {
        source: "apache",
        compressible: true
      },
      "application/xliff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml", "xsl", "xsd", "rng"]
      },
      "application/xml-dtd": {
        source: "iana",
        compressible: true,
        extensions: ["dtd"]
      },
      "application/xml-external-parsed-entity": {
        source: "iana"
      },
      "application/xml-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/xmpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/xop+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xop"]
      },
      "application/xproc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xpl"]
      },
      "application/xslt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xsl", "xslt"]
      },
      "application/xspf+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xspf"]
      },
      "application/xv+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mxml", "xhvml", "xvml", "xvm"]
      },
      "application/yang": {
        source: "iana",
        extensions: ["yang"]
      },
      "application/yang-data+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-data+xml": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/yin+xml": {
        source: "iana",
        compressible: true,
        extensions: ["yin"]
      },
      "application/zip": {
        source: "iana",
        compressible: false,
        extensions: ["zip"]
      },
      "application/zlib": {
        source: "iana"
      },
      "application/zstd": {
        source: "iana"
      },
      "audio/1d-interleaved-parityfec": {
        source: "iana"
      },
      "audio/32kadpcm": {
        source: "iana"
      },
      "audio/3gpp": {
        source: "iana",
        compressible: false,
        extensions: ["3gpp"]
      },
      "audio/3gpp2": {
        source: "iana"
      },
      "audio/aac": {
        source: "iana"
      },
      "audio/ac3": {
        source: "iana"
      },
      "audio/adpcm": {
        source: "apache",
        extensions: ["adp"]
      },
      "audio/amr": {
        source: "iana",
        extensions: ["amr"]
      },
      "audio/amr-wb": {
        source: "iana"
      },
      "audio/amr-wb+": {
        source: "iana"
      },
      "audio/aptx": {
        source: "iana"
      },
      "audio/asc": {
        source: "iana"
      },
      "audio/atrac-advanced-lossless": {
        source: "iana"
      },
      "audio/atrac-x": {
        source: "iana"
      },
      "audio/atrac3": {
        source: "iana"
      },
      "audio/basic": {
        source: "iana",
        compressible: false,
        extensions: ["au", "snd"]
      },
      "audio/bv16": {
        source: "iana"
      },
      "audio/bv32": {
        source: "iana"
      },
      "audio/clearmode": {
        source: "iana"
      },
      "audio/cn": {
        source: "iana"
      },
      "audio/dat12": {
        source: "iana"
      },
      "audio/dls": {
        source: "iana"
      },
      "audio/dsr-es201108": {
        source: "iana"
      },
      "audio/dsr-es202050": {
        source: "iana"
      },
      "audio/dsr-es202211": {
        source: "iana"
      },
      "audio/dsr-es202212": {
        source: "iana"
      },
      "audio/dv": {
        source: "iana"
      },
      "audio/dvi4": {
        source: "iana"
      },
      "audio/eac3": {
        source: "iana"
      },
      "audio/encaprtp": {
        source: "iana"
      },
      "audio/evrc": {
        source: "iana"
      },
      "audio/evrc-qcp": {
        source: "iana"
      },
      "audio/evrc0": {
        source: "iana"
      },
      "audio/evrc1": {
        source: "iana"
      },
      "audio/evrcb": {
        source: "iana"
      },
      "audio/evrcb0": {
        source: "iana"
      },
      "audio/evrcb1": {
        source: "iana"
      },
      "audio/evrcnw": {
        source: "iana"
      },
      "audio/evrcnw0": {
        source: "iana"
      },
      "audio/evrcnw1": {
        source: "iana"
      },
      "audio/evrcwb": {
        source: "iana"
      },
      "audio/evrcwb0": {
        source: "iana"
      },
      "audio/evrcwb1": {
        source: "iana"
      },
      "audio/evs": {
        source: "iana"
      },
      "audio/flexfec": {
        source: "iana"
      },
      "audio/fwdred": {
        source: "iana"
      },
      "audio/g711-0": {
        source: "iana"
      },
      "audio/g719": {
        source: "iana"
      },
      "audio/g722": {
        source: "iana"
      },
      "audio/g7221": {
        source: "iana"
      },
      "audio/g723": {
        source: "iana"
      },
      "audio/g726-16": {
        source: "iana"
      },
      "audio/g726-24": {
        source: "iana"
      },
      "audio/g726-32": {
        source: "iana"
      },
      "audio/g726-40": {
        source: "iana"
      },
      "audio/g728": {
        source: "iana"
      },
      "audio/g729": {
        source: "iana"
      },
      "audio/g7291": {
        source: "iana"
      },
      "audio/g729d": {
        source: "iana"
      },
      "audio/g729e": {
        source: "iana"
      },
      "audio/gsm": {
        source: "iana"
      },
      "audio/gsm-efr": {
        source: "iana"
      },
      "audio/gsm-hr-08": {
        source: "iana"
      },
      "audio/ilbc": {
        source: "iana"
      },
      "audio/ip-mr_v2.5": {
        source: "iana"
      },
      "audio/isac": {
        source: "apache"
      },
      "audio/l16": {
        source: "iana"
      },
      "audio/l20": {
        source: "iana"
      },
      "audio/l24": {
        source: "iana",
        compressible: false
      },
      "audio/l8": {
        source: "iana"
      },
      "audio/lpc": {
        source: "iana"
      },
      "audio/melp": {
        source: "iana"
      },
      "audio/melp1200": {
        source: "iana"
      },
      "audio/melp2400": {
        source: "iana"
      },
      "audio/melp600": {
        source: "iana"
      },
      "audio/mhas": {
        source: "iana"
      },
      "audio/midi": {
        source: "apache",
        extensions: ["mid", "midi", "kar", "rmi"]
      },
      "audio/mobile-xmf": {
        source: "iana",
        extensions: ["mxmf"]
      },
      "audio/mp3": {
        compressible: false,
        extensions: ["mp3"]
      },
      "audio/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["m4a", "mp4a"]
      },
      "audio/mp4a-latm": {
        source: "iana"
      },
      "audio/mpa": {
        source: "iana"
      },
      "audio/mpa-robust": {
        source: "iana"
      },
      "audio/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
      },
      "audio/mpeg4-generic": {
        source: "iana"
      },
      "audio/musepack": {
        source: "apache"
      },
      "audio/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["oga", "ogg", "spx", "opus"]
      },
      "audio/opus": {
        source: "iana"
      },
      "audio/parityfec": {
        source: "iana"
      },
      "audio/pcma": {
        source: "iana"
      },
      "audio/pcma-wb": {
        source: "iana"
      },
      "audio/pcmu": {
        source: "iana"
      },
      "audio/pcmu-wb": {
        source: "iana"
      },
      "audio/prs.sid": {
        source: "iana"
      },
      "audio/qcelp": {
        source: "iana"
      },
      "audio/raptorfec": {
        source: "iana"
      },
      "audio/red": {
        source: "iana"
      },
      "audio/rtp-enc-aescm128": {
        source: "iana"
      },
      "audio/rtp-midi": {
        source: "iana"
      },
      "audio/rtploopback": {
        source: "iana"
      },
      "audio/rtx": {
        source: "iana"
      },
      "audio/s3m": {
        source: "apache",
        extensions: ["s3m"]
      },
      "audio/scip": {
        source: "iana"
      },
      "audio/silk": {
        source: "apache",
        extensions: ["sil"]
      },
      "audio/smv": {
        source: "iana"
      },
      "audio/smv-qcp": {
        source: "iana"
      },
      "audio/smv0": {
        source: "iana"
      },
      "audio/sofa": {
        source: "iana"
      },
      "audio/sp-midi": {
        source: "iana"
      },
      "audio/speex": {
        source: "iana"
      },
      "audio/t140c": {
        source: "iana"
      },
      "audio/t38": {
        source: "iana"
      },
      "audio/telephone-event": {
        source: "iana"
      },
      "audio/tetra_acelp": {
        source: "iana"
      },
      "audio/tetra_acelp_bb": {
        source: "iana"
      },
      "audio/tone": {
        source: "iana"
      },
      "audio/tsvcis": {
        source: "iana"
      },
      "audio/uemclip": {
        source: "iana"
      },
      "audio/ulpfec": {
        source: "iana"
      },
      "audio/usac": {
        source: "iana"
      },
      "audio/vdvi": {
        source: "iana"
      },
      "audio/vmr-wb": {
        source: "iana"
      },
      "audio/vnd.3gpp.iufp": {
        source: "iana"
      },
      "audio/vnd.4sb": {
        source: "iana"
      },
      "audio/vnd.audiokoz": {
        source: "iana"
      },
      "audio/vnd.celp": {
        source: "iana"
      },
      "audio/vnd.cisco.nse": {
        source: "iana"
      },
      "audio/vnd.cmles.radio-events": {
        source: "iana"
      },
      "audio/vnd.cns.anp1": {
        source: "iana"
      },
      "audio/vnd.cns.inf1": {
        source: "iana"
      },
      "audio/vnd.dece.audio": {
        source: "iana",
        extensions: ["uva", "uvva"]
      },
      "audio/vnd.digital-winds": {
        source: "iana",
        extensions: ["eol"]
      },
      "audio/vnd.dlna.adts": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.1": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.2": {
        source: "iana"
      },
      "audio/vnd.dolby.mlp": {
        source: "iana"
      },
      "audio/vnd.dolby.mps": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2x": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2z": {
        source: "iana"
      },
      "audio/vnd.dolby.pulse.1": {
        source: "iana"
      },
      "audio/vnd.dra": {
        source: "iana",
        extensions: ["dra"]
      },
      "audio/vnd.dts": {
        source: "iana",
        extensions: ["dts"]
      },
      "audio/vnd.dts.hd": {
        source: "iana",
        extensions: ["dtshd"]
      },
      "audio/vnd.dts.uhd": {
        source: "iana"
      },
      "audio/vnd.dvb.file": {
        source: "iana"
      },
      "audio/vnd.everad.plj": {
        source: "iana"
      },
      "audio/vnd.hns.audio": {
        source: "iana"
      },
      "audio/vnd.lucent.voice": {
        source: "iana",
        extensions: ["lvp"]
      },
      "audio/vnd.ms-playready.media.pya": {
        source: "iana",
        extensions: ["pya"]
      },
      "audio/vnd.nokia.mobile-xmf": {
        source: "iana"
      },
      "audio/vnd.nortel.vbk": {
        source: "iana"
      },
      "audio/vnd.nuera.ecelp4800": {
        source: "iana",
        extensions: ["ecelp4800"]
      },
      "audio/vnd.nuera.ecelp7470": {
        source: "iana",
        extensions: ["ecelp7470"]
      },
      "audio/vnd.nuera.ecelp9600": {
        source: "iana",
        extensions: ["ecelp9600"]
      },
      "audio/vnd.octel.sbc": {
        source: "iana"
      },
      "audio/vnd.presonus.multitrack": {
        source: "iana"
      },
      "audio/vnd.qcelp": {
        source: "iana"
      },
      "audio/vnd.rhetorex.32kadpcm": {
        source: "iana"
      },
      "audio/vnd.rip": {
        source: "iana",
        extensions: ["rip"]
      },
      "audio/vnd.rn-realaudio": {
        compressible: false
      },
      "audio/vnd.sealedmedia.softseal.mpeg": {
        source: "iana"
      },
      "audio/vnd.vmx.cvsd": {
        source: "iana"
      },
      "audio/vnd.wave": {
        compressible: false
      },
      "audio/vorbis": {
        source: "iana",
        compressible: false
      },
      "audio/vorbis-config": {
        source: "iana"
      },
      "audio/wav": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/wave": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/webm": {
        source: "apache",
        compressible: false,
        extensions: ["weba"]
      },
      "audio/x-aac": {
        source: "apache",
        compressible: false,
        extensions: ["aac"]
      },
      "audio/x-aiff": {
        source: "apache",
        extensions: ["aif", "aiff", "aifc"]
      },
      "audio/x-caf": {
        source: "apache",
        compressible: false,
        extensions: ["caf"]
      },
      "audio/x-flac": {
        source: "apache",
        extensions: ["flac"]
      },
      "audio/x-m4a": {
        source: "nginx",
        extensions: ["m4a"]
      },
      "audio/x-matroska": {
        source: "apache",
        extensions: ["mka"]
      },
      "audio/x-mpegurl": {
        source: "apache",
        extensions: ["m3u"]
      },
      "audio/x-ms-wax": {
        source: "apache",
        extensions: ["wax"]
      },
      "audio/x-ms-wma": {
        source: "apache",
        extensions: ["wma"]
      },
      "audio/x-pn-realaudio": {
        source: "apache",
        extensions: ["ram", "ra"]
      },
      "audio/x-pn-realaudio-plugin": {
        source: "apache",
        extensions: ["rmp"]
      },
      "audio/x-realaudio": {
        source: "nginx",
        extensions: ["ra"]
      },
      "audio/x-tta": {
        source: "apache"
      },
      "audio/x-wav": {
        source: "apache",
        extensions: ["wav"]
      },
      "audio/xm": {
        source: "apache",
        extensions: ["xm"]
      },
      "chemical/x-cdx": {
        source: "apache",
        extensions: ["cdx"]
      },
      "chemical/x-cif": {
        source: "apache",
        extensions: ["cif"]
      },
      "chemical/x-cmdf": {
        source: "apache",
        extensions: ["cmdf"]
      },
      "chemical/x-cml": {
        source: "apache",
        extensions: ["cml"]
      },
      "chemical/x-csml": {
        source: "apache",
        extensions: ["csml"]
      },
      "chemical/x-pdb": {
        source: "apache"
      },
      "chemical/x-xyz": {
        source: "apache",
        extensions: ["xyz"]
      },
      "font/collection": {
        source: "iana",
        extensions: ["ttc"]
      },
      "font/otf": {
        source: "iana",
        compressible: true,
        extensions: ["otf"]
      },
      "font/sfnt": {
        source: "iana"
      },
      "font/ttf": {
        source: "iana",
        compressible: true,
        extensions: ["ttf"]
      },
      "font/woff": {
        source: "iana",
        extensions: ["woff"]
      },
      "font/woff2": {
        source: "iana",
        extensions: ["woff2"]
      },
      "image/aces": {
        source: "iana",
        extensions: ["exr"]
      },
      "image/apng": {
        compressible: false,
        extensions: ["apng"]
      },
      "image/avci": {
        source: "iana",
        extensions: ["avci"]
      },
      "image/avcs": {
        source: "iana",
        extensions: ["avcs"]
      },
      "image/avif": {
        source: "iana",
        compressible: false,
        extensions: ["avif"]
      },
      "image/bmp": {
        source: "iana",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/cgm": {
        source: "iana",
        extensions: ["cgm"]
      },
      "image/dicom-rle": {
        source: "iana",
        extensions: ["drle"]
      },
      "image/emf": {
        source: "iana",
        extensions: ["emf"]
      },
      "image/fits": {
        source: "iana",
        extensions: ["fits"]
      },
      "image/g3fax": {
        source: "iana",
        extensions: ["g3"]
      },
      "image/gif": {
        source: "iana",
        compressible: false,
        extensions: ["gif"]
      },
      "image/heic": {
        source: "iana",
        extensions: ["heic"]
      },
      "image/heic-sequence": {
        source: "iana",
        extensions: ["heics"]
      },
      "image/heif": {
        source: "iana",
        extensions: ["heif"]
      },
      "image/heif-sequence": {
        source: "iana",
        extensions: ["heifs"]
      },
      "image/hej2k": {
        source: "iana",
        extensions: ["hej2"]
      },
      "image/hsj2": {
        source: "iana",
        extensions: ["hsj2"]
      },
      "image/ief": {
        source: "iana",
        extensions: ["ief"]
      },
      "image/jls": {
        source: "iana",
        extensions: ["jls"]
      },
      "image/jp2": {
        source: "iana",
        compressible: false,
        extensions: ["jp2", "jpg2"]
      },
      "image/jpeg": {
        source: "iana",
        compressible: false,
        extensions: ["jpeg", "jpg", "jpe"]
      },
      "image/jph": {
        source: "iana",
        extensions: ["jph"]
      },
      "image/jphc": {
        source: "iana",
        extensions: ["jhc"]
      },
      "image/jpm": {
        source: "iana",
        compressible: false,
        extensions: ["jpm"]
      },
      "image/jpx": {
        source: "iana",
        compressible: false,
        extensions: ["jpx", "jpf"]
      },
      "image/jxr": {
        source: "iana",
        extensions: ["jxr"]
      },
      "image/jxra": {
        source: "iana",
        extensions: ["jxra"]
      },
      "image/jxrs": {
        source: "iana",
        extensions: ["jxrs"]
      },
      "image/jxs": {
        source: "iana",
        extensions: ["jxs"]
      },
      "image/jxsc": {
        source: "iana",
        extensions: ["jxsc"]
      },
      "image/jxsi": {
        source: "iana",
        extensions: ["jxsi"]
      },
      "image/jxss": {
        source: "iana",
        extensions: ["jxss"]
      },
      "image/ktx": {
        source: "iana",
        extensions: ["ktx"]
      },
      "image/ktx2": {
        source: "iana",
        extensions: ["ktx2"]
      },
      "image/naplps": {
        source: "iana"
      },
      "image/pjpeg": {
        compressible: false
      },
      "image/png": {
        source: "iana",
        compressible: false,
        extensions: ["png"]
      },
      "image/prs.btif": {
        source: "iana",
        extensions: ["btif"]
      },
      "image/prs.pti": {
        source: "iana",
        extensions: ["pti"]
      },
      "image/pwg-raster": {
        source: "iana"
      },
      "image/sgi": {
        source: "apache",
        extensions: ["sgi"]
      },
      "image/svg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["svg", "svgz"]
      },
      "image/t38": {
        source: "iana",
        extensions: ["t38"]
      },
      "image/tiff": {
        source: "iana",
        compressible: false,
        extensions: ["tif", "tiff"]
      },
      "image/tiff-fx": {
        source: "iana",
        extensions: ["tfx"]
      },
      "image/vnd.adobe.photoshop": {
        source: "iana",
        compressible: true,
        extensions: ["psd"]
      },
      "image/vnd.airzip.accelerator.azv": {
        source: "iana",
        extensions: ["azv"]
      },
      "image/vnd.cns.inf2": {
        source: "iana"
      },
      "image/vnd.dece.graphic": {
        source: "iana",
        extensions: ["uvi", "uvvi", "uvg", "uvvg"]
      },
      "image/vnd.djvu": {
        source: "iana",
        extensions: ["djvu", "djv"]
      },
      "image/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "image/vnd.dwg": {
        source: "iana",
        extensions: ["dwg"]
      },
      "image/vnd.dxf": {
        source: "iana",
        extensions: ["dxf"]
      },
      "image/vnd.fastbidsheet": {
        source: "iana",
        extensions: ["fbs"]
      },
      "image/vnd.fpx": {
        source: "iana",
        extensions: ["fpx"]
      },
      "image/vnd.fst": {
        source: "iana",
        extensions: ["fst"]
      },
      "image/vnd.fujixerox.edmics-mmr": {
        source: "iana",
        extensions: ["mmr"]
      },
      "image/vnd.fujixerox.edmics-rlc": {
        source: "iana",
        extensions: ["rlc"]
      },
      "image/vnd.globalgraphics.pgb": {
        source: "iana"
      },
      "image/vnd.microsoft.icon": {
        source: "iana",
        compressible: true,
        extensions: ["ico"]
      },
      "image/vnd.mix": {
        source: "iana"
      },
      "image/vnd.mozilla.apng": {
        source: "iana"
      },
      "image/vnd.ms-dds": {
        compressible: true,
        extensions: ["dds"]
      },
      "image/vnd.ms-modi": {
        source: "iana",
        extensions: ["mdi"]
      },
      "image/vnd.ms-photo": {
        source: "apache",
        extensions: ["wdp"]
      },
      "image/vnd.net-fpx": {
        source: "iana",
        extensions: ["npx"]
      },
      "image/vnd.pco.b16": {
        source: "iana",
        extensions: ["b16"]
      },
      "image/vnd.radiance": {
        source: "iana"
      },
      "image/vnd.sealed.png": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.gif": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.jpg": {
        source: "iana"
      },
      "image/vnd.svf": {
        source: "iana"
      },
      "image/vnd.tencent.tap": {
        source: "iana",
        extensions: ["tap"]
      },
      "image/vnd.valve.source.texture": {
        source: "iana",
        extensions: ["vtf"]
      },
      "image/vnd.wap.wbmp": {
        source: "iana",
        extensions: ["wbmp"]
      },
      "image/vnd.xiff": {
        source: "iana",
        extensions: ["xif"]
      },
      "image/vnd.zbrush.pcx": {
        source: "iana",
        extensions: ["pcx"]
      },
      "image/webp": {
        source: "apache",
        extensions: ["webp"]
      },
      "image/wmf": {
        source: "iana",
        extensions: ["wmf"]
      },
      "image/x-3ds": {
        source: "apache",
        extensions: ["3ds"]
      },
      "image/x-cmu-raster": {
        source: "apache",
        extensions: ["ras"]
      },
      "image/x-cmx": {
        source: "apache",
        extensions: ["cmx"]
      },
      "image/x-freehand": {
        source: "apache",
        extensions: ["fh", "fhc", "fh4", "fh5", "fh7"]
      },
      "image/x-icon": {
        source: "apache",
        compressible: true,
        extensions: ["ico"]
      },
      "image/x-jng": {
        source: "nginx",
        extensions: ["jng"]
      },
      "image/x-mrsid-image": {
        source: "apache",
        extensions: ["sid"]
      },
      "image/x-ms-bmp": {
        source: "nginx",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/x-pcx": {
        source: "apache",
        extensions: ["pcx"]
      },
      "image/x-pict": {
        source: "apache",
        extensions: ["pic", "pct"]
      },
      "image/x-portable-anymap": {
        source: "apache",
        extensions: ["pnm"]
      },
      "image/x-portable-bitmap": {
        source: "apache",
        extensions: ["pbm"]
      },
      "image/x-portable-graymap": {
        source: "apache",
        extensions: ["pgm"]
      },
      "image/x-portable-pixmap": {
        source: "apache",
        extensions: ["ppm"]
      },
      "image/x-rgb": {
        source: "apache",
        extensions: ["rgb"]
      },
      "image/x-tga": {
        source: "apache",
        extensions: ["tga"]
      },
      "image/x-xbitmap": {
        source: "apache",
        extensions: ["xbm"]
      },
      "image/x-xcf": {
        compressible: false
      },
      "image/x-xpixmap": {
        source: "apache",
        extensions: ["xpm"]
      },
      "image/x-xwindowdump": {
        source: "apache",
        extensions: ["xwd"]
      },
      "message/cpim": {
        source: "iana"
      },
      "message/delivery-status": {
        source: "iana"
      },
      "message/disposition-notification": {
        source: "iana",
        extensions: [
          "disposition-notification"
        ]
      },
      "message/external-body": {
        source: "iana"
      },
      "message/feedback-report": {
        source: "iana"
      },
      "message/global": {
        source: "iana",
        extensions: ["u8msg"]
      },
      "message/global-delivery-status": {
        source: "iana",
        extensions: ["u8dsn"]
      },
      "message/global-disposition-notification": {
        source: "iana",
        extensions: ["u8mdn"]
      },
      "message/global-headers": {
        source: "iana",
        extensions: ["u8hdr"]
      },
      "message/http": {
        source: "iana",
        compressible: false
      },
      "message/imdn+xml": {
        source: "iana",
        compressible: true
      },
      "message/news": {
        source: "iana"
      },
      "message/partial": {
        source: "iana",
        compressible: false
      },
      "message/rfc822": {
        source: "iana",
        compressible: true,
        extensions: ["eml", "mime"]
      },
      "message/s-http": {
        source: "iana"
      },
      "message/sip": {
        source: "iana"
      },
      "message/sipfrag": {
        source: "iana"
      },
      "message/tracking-status": {
        source: "iana"
      },
      "message/vnd.si.simp": {
        source: "iana"
      },
      "message/vnd.wfa.wsc": {
        source: "iana",
        extensions: ["wsc"]
      },
      "model/3mf": {
        source: "iana",
        extensions: ["3mf"]
      },
      "model/e57": {
        source: "iana"
      },
      "model/gltf+json": {
        source: "iana",
        compressible: true,
        extensions: ["gltf"]
      },
      "model/gltf-binary": {
        source: "iana",
        compressible: true,
        extensions: ["glb"]
      },
      "model/iges": {
        source: "iana",
        compressible: false,
        extensions: ["igs", "iges"]
      },
      "model/mesh": {
        source: "iana",
        compressible: false,
        extensions: ["msh", "mesh", "silo"]
      },
      "model/mtl": {
        source: "iana",
        extensions: ["mtl"]
      },
      "model/obj": {
        source: "iana",
        extensions: ["obj"]
      },
      "model/step": {
        source: "iana"
      },
      "model/step+xml": {
        source: "iana",
        compressible: true,
        extensions: ["stpx"]
      },
      "model/step+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpz"]
      },
      "model/step-xml+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpxz"]
      },
      "model/stl": {
        source: "iana",
        extensions: ["stl"]
      },
      "model/vnd.collada+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dae"]
      },
      "model/vnd.dwf": {
        source: "iana",
        extensions: ["dwf"]
      },
      "model/vnd.flatland.3dml": {
        source: "iana"
      },
      "model/vnd.gdl": {
        source: "iana",
        extensions: ["gdl"]
      },
      "model/vnd.gs-gdl": {
        source: "apache"
      },
      "model/vnd.gs.gdl": {
        source: "iana"
      },
      "model/vnd.gtw": {
        source: "iana",
        extensions: ["gtw"]
      },
      "model/vnd.moml+xml": {
        source: "iana",
        compressible: true
      },
      "model/vnd.mts": {
        source: "iana",
        extensions: ["mts"]
      },
      "model/vnd.opengex": {
        source: "iana",
        extensions: ["ogex"]
      },
      "model/vnd.parasolid.transmit.binary": {
        source: "iana",
        extensions: ["x_b"]
      },
      "model/vnd.parasolid.transmit.text": {
        source: "iana",
        extensions: ["x_t"]
      },
      "model/vnd.pytha.pyox": {
        source: "iana"
      },
      "model/vnd.rosette.annotated-data-model": {
        source: "iana"
      },
      "model/vnd.sap.vds": {
        source: "iana",
        extensions: ["vds"]
      },
      "model/vnd.usdz+zip": {
        source: "iana",
        compressible: false,
        extensions: ["usdz"]
      },
      "model/vnd.valve.source.compiled-map": {
        source: "iana",
        extensions: ["bsp"]
      },
      "model/vnd.vtu": {
        source: "iana",
        extensions: ["vtu"]
      },
      "model/vrml": {
        source: "iana",
        compressible: false,
        extensions: ["wrl", "vrml"]
      },
      "model/x3d+binary": {
        source: "apache",
        compressible: false,
        extensions: ["x3db", "x3dbz"]
      },
      "model/x3d+fastinfoset": {
        source: "iana",
        extensions: ["x3db"]
      },
      "model/x3d+vrml": {
        source: "apache",
        compressible: false,
        extensions: ["x3dv", "x3dvz"]
      },
      "model/x3d+xml": {
        source: "iana",
        compressible: true,
        extensions: ["x3d", "x3dz"]
      },
      "model/x3d-vrml": {
        source: "iana",
        extensions: ["x3dv"]
      },
      "multipart/alternative": {
        source: "iana",
        compressible: false
      },
      "multipart/appledouble": {
        source: "iana"
      },
      "multipart/byteranges": {
        source: "iana"
      },
      "multipart/digest": {
        source: "iana"
      },
      "multipart/encrypted": {
        source: "iana",
        compressible: false
      },
      "multipart/form-data": {
        source: "iana",
        compressible: false
      },
      "multipart/header-set": {
        source: "iana"
      },
      "multipart/mixed": {
        source: "iana"
      },
      "multipart/multilingual": {
        source: "iana"
      },
      "multipart/parallel": {
        source: "iana"
      },
      "multipart/related": {
        source: "iana",
        compressible: false
      },
      "multipart/report": {
        source: "iana"
      },
      "multipart/signed": {
        source: "iana",
        compressible: false
      },
      "multipart/vnd.bint.med-plus": {
        source: "iana"
      },
      "multipart/voice-message": {
        source: "iana"
      },
      "multipart/x-mixed-replace": {
        source: "iana"
      },
      "text/1d-interleaved-parityfec": {
        source: "iana"
      },
      "text/cache-manifest": {
        source: "iana",
        compressible: true,
        extensions: ["appcache", "manifest"]
      },
      "text/calendar": {
        source: "iana",
        extensions: ["ics", "ifb"]
      },
      "text/calender": {
        compressible: true
      },
      "text/cmd": {
        compressible: true
      },
      "text/coffeescript": {
        extensions: ["coffee", "litcoffee"]
      },
      "text/cql": {
        source: "iana"
      },
      "text/cql-expression": {
        source: "iana"
      },
      "text/cql-identifier": {
        source: "iana"
      },
      "text/css": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["css"]
      },
      "text/csv": {
        source: "iana",
        compressible: true,
        extensions: ["csv"]
      },
      "text/csv-schema": {
        source: "iana"
      },
      "text/directory": {
        source: "iana"
      },
      "text/dns": {
        source: "iana"
      },
      "text/ecmascript": {
        source: "iana"
      },
      "text/encaprtp": {
        source: "iana"
      },
      "text/enriched": {
        source: "iana"
      },
      "text/fhirpath": {
        source: "iana"
      },
      "text/flexfec": {
        source: "iana"
      },
      "text/fwdred": {
        source: "iana"
      },
      "text/gff3": {
        source: "iana"
      },
      "text/grammar-ref-list": {
        source: "iana"
      },
      "text/html": {
        source: "iana",
        compressible: true,
        extensions: ["html", "htm", "shtml"]
      },
      "text/jade": {
        extensions: ["jade"]
      },
      "text/javascript": {
        source: "iana",
        compressible: true
      },
      "text/jcr-cnd": {
        source: "iana"
      },
      "text/jsx": {
        compressible: true,
        extensions: ["jsx"]
      },
      "text/less": {
        compressible: true,
        extensions: ["less"]
      },
      "text/markdown": {
        source: "iana",
        compressible: true,
        extensions: ["markdown", "md"]
      },
      "text/mathml": {
        source: "nginx",
        extensions: ["mml"]
      },
      "text/mdx": {
        compressible: true,
        extensions: ["mdx"]
      },
      "text/mizar": {
        source: "iana"
      },
      "text/n3": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["n3"]
      },
      "text/parameters": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/parityfec": {
        source: "iana"
      },
      "text/plain": {
        source: "iana",
        compressible: true,
        extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
      },
      "text/provenance-notation": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/prs.fallenstein.rst": {
        source: "iana"
      },
      "text/prs.lines.tag": {
        source: "iana",
        extensions: ["dsc"]
      },
      "text/prs.prop.logic": {
        source: "iana"
      },
      "text/raptorfec": {
        source: "iana"
      },
      "text/red": {
        source: "iana"
      },
      "text/rfc822-headers": {
        source: "iana"
      },
      "text/richtext": {
        source: "iana",
        compressible: true,
        extensions: ["rtx"]
      },
      "text/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "text/rtp-enc-aescm128": {
        source: "iana"
      },
      "text/rtploopback": {
        source: "iana"
      },
      "text/rtx": {
        source: "iana"
      },
      "text/sgml": {
        source: "iana",
        extensions: ["sgml", "sgm"]
      },
      "text/shaclc": {
        source: "iana"
      },
      "text/shex": {
        source: "iana",
        extensions: ["shex"]
      },
      "text/slim": {
        extensions: ["slim", "slm"]
      },
      "text/spdx": {
        source: "iana",
        extensions: ["spdx"]
      },
      "text/strings": {
        source: "iana"
      },
      "text/stylus": {
        extensions: ["stylus", "styl"]
      },
      "text/t140": {
        source: "iana"
      },
      "text/tab-separated-values": {
        source: "iana",
        compressible: true,
        extensions: ["tsv"]
      },
      "text/troff": {
        source: "iana",
        extensions: ["t", "tr", "roff", "man", "me", "ms"]
      },
      "text/turtle": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["ttl"]
      },
      "text/ulpfec": {
        source: "iana"
      },
      "text/uri-list": {
        source: "iana",
        compressible: true,
        extensions: ["uri", "uris", "urls"]
      },
      "text/vcard": {
        source: "iana",
        compressible: true,
        extensions: ["vcard"]
      },
      "text/vnd.a": {
        source: "iana"
      },
      "text/vnd.abc": {
        source: "iana"
      },
      "text/vnd.ascii-art": {
        source: "iana"
      },
      "text/vnd.curl": {
        source: "iana",
        extensions: ["curl"]
      },
      "text/vnd.curl.dcurl": {
        source: "apache",
        extensions: ["dcurl"]
      },
      "text/vnd.curl.mcurl": {
        source: "apache",
        extensions: ["mcurl"]
      },
      "text/vnd.curl.scurl": {
        source: "apache",
        extensions: ["scurl"]
      },
      "text/vnd.debian.copyright": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.dmclientscript": {
        source: "iana"
      },
      "text/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "text/vnd.esmertec.theme-descriptor": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.familysearch.gedcom": {
        source: "iana",
        extensions: ["ged"]
      },
      "text/vnd.ficlab.flt": {
        source: "iana"
      },
      "text/vnd.fly": {
        source: "iana",
        extensions: ["fly"]
      },
      "text/vnd.fmi.flexstor": {
        source: "iana",
        extensions: ["flx"]
      },
      "text/vnd.gml": {
        source: "iana"
      },
      "text/vnd.graphviz": {
        source: "iana",
        extensions: ["gv"]
      },
      "text/vnd.hans": {
        source: "iana"
      },
      "text/vnd.hgl": {
        source: "iana"
      },
      "text/vnd.in3d.3dml": {
        source: "iana",
        extensions: ["3dml"]
      },
      "text/vnd.in3d.spot": {
        source: "iana",
        extensions: ["spot"]
      },
      "text/vnd.iptc.newsml": {
        source: "iana"
      },
      "text/vnd.iptc.nitf": {
        source: "iana"
      },
      "text/vnd.latex-z": {
        source: "iana"
      },
      "text/vnd.motorola.reflex": {
        source: "iana"
      },
      "text/vnd.ms-mediapackage": {
        source: "iana"
      },
      "text/vnd.net2phone.commcenter.command": {
        source: "iana"
      },
      "text/vnd.radisys.msml-basic-layout": {
        source: "iana"
      },
      "text/vnd.senx.warpscript": {
        source: "iana"
      },
      "text/vnd.si.uricatalogue": {
        source: "iana"
      },
      "text/vnd.sosi": {
        source: "iana"
      },
      "text/vnd.sun.j2me.app-descriptor": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["jad"]
      },
      "text/vnd.trolltech.linguist": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.wap.si": {
        source: "iana"
      },
      "text/vnd.wap.sl": {
        source: "iana"
      },
      "text/vnd.wap.wml": {
        source: "iana",
        extensions: ["wml"]
      },
      "text/vnd.wap.wmlscript": {
        source: "iana",
        extensions: ["wmls"]
      },
      "text/vtt": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["vtt"]
      },
      "text/x-asm": {
        source: "apache",
        extensions: ["s", "asm"]
      },
      "text/x-c": {
        source: "apache",
        extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"]
      },
      "text/x-component": {
        source: "nginx",
        extensions: ["htc"]
      },
      "text/x-fortran": {
        source: "apache",
        extensions: ["f", "for", "f77", "f90"]
      },
      "text/x-gwt-rpc": {
        compressible: true
      },
      "text/x-handlebars-template": {
        extensions: ["hbs"]
      },
      "text/x-java-source": {
        source: "apache",
        extensions: ["java"]
      },
      "text/x-jquery-tmpl": {
        compressible: true
      },
      "text/x-lua": {
        extensions: ["lua"]
      },
      "text/x-markdown": {
        compressible: true,
        extensions: ["mkd"]
      },
      "text/x-nfo": {
        source: "apache",
        extensions: ["nfo"]
      },
      "text/x-opml": {
        source: "apache",
        extensions: ["opml"]
      },
      "text/x-org": {
        compressible: true,
        extensions: ["org"]
      },
      "text/x-pascal": {
        source: "apache",
        extensions: ["p", "pas"]
      },
      "text/x-processing": {
        compressible: true,
        extensions: ["pde"]
      },
      "text/x-sass": {
        extensions: ["sass"]
      },
      "text/x-scss": {
        extensions: ["scss"]
      },
      "text/x-setext": {
        source: "apache",
        extensions: ["etx"]
      },
      "text/x-sfv": {
        source: "apache",
        extensions: ["sfv"]
      },
      "text/x-suse-ymp": {
        compressible: true,
        extensions: ["ymp"]
      },
      "text/x-uuencode": {
        source: "apache",
        extensions: ["uu"]
      },
      "text/x-vcalendar": {
        source: "apache",
        extensions: ["vcs"]
      },
      "text/x-vcard": {
        source: "apache",
        extensions: ["vcf"]
      },
      "text/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml"]
      },
      "text/xml-external-parsed-entity": {
        source: "iana"
      },
      "text/yaml": {
        compressible: true,
        extensions: ["yaml", "yml"]
      },
      "video/1d-interleaved-parityfec": {
        source: "iana"
      },
      "video/3gpp": {
        source: "iana",
        extensions: ["3gp", "3gpp"]
      },
      "video/3gpp-tt": {
        source: "iana"
      },
      "video/3gpp2": {
        source: "iana",
        extensions: ["3g2"]
      },
      "video/av1": {
        source: "iana"
      },
      "video/bmpeg": {
        source: "iana"
      },
      "video/bt656": {
        source: "iana"
      },
      "video/celb": {
        source: "iana"
      },
      "video/dv": {
        source: "iana"
      },
      "video/encaprtp": {
        source: "iana"
      },
      "video/ffv1": {
        source: "iana"
      },
      "video/flexfec": {
        source: "iana"
      },
      "video/h261": {
        source: "iana",
        extensions: ["h261"]
      },
      "video/h263": {
        source: "iana",
        extensions: ["h263"]
      },
      "video/h263-1998": {
        source: "iana"
      },
      "video/h263-2000": {
        source: "iana"
      },
      "video/h264": {
        source: "iana",
        extensions: ["h264"]
      },
      "video/h264-rcdo": {
        source: "iana"
      },
      "video/h264-svc": {
        source: "iana"
      },
      "video/h265": {
        source: "iana"
      },
      "video/iso.segment": {
        source: "iana",
        extensions: ["m4s"]
      },
      "video/jpeg": {
        source: "iana",
        extensions: ["jpgv"]
      },
      "video/jpeg2000": {
        source: "iana"
      },
      "video/jpm": {
        source: "apache",
        extensions: ["jpm", "jpgm"]
      },
      "video/jxsv": {
        source: "iana"
      },
      "video/mj2": {
        source: "iana",
        extensions: ["mj2", "mjp2"]
      },
      "video/mp1s": {
        source: "iana"
      },
      "video/mp2p": {
        source: "iana"
      },
      "video/mp2t": {
        source: "iana",
        extensions: ["ts"]
      },
      "video/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["mp4", "mp4v", "mpg4"]
      },
      "video/mp4v-es": {
        source: "iana"
      },
      "video/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
      },
      "video/mpeg4-generic": {
        source: "iana"
      },
      "video/mpv": {
        source: "iana"
      },
      "video/nv": {
        source: "iana"
      },
      "video/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogv"]
      },
      "video/parityfec": {
        source: "iana"
      },
      "video/pointer": {
        source: "iana"
      },
      "video/quicktime": {
        source: "iana",
        compressible: false,
        extensions: ["qt", "mov"]
      },
      "video/raptorfec": {
        source: "iana"
      },
      "video/raw": {
        source: "iana"
      },
      "video/rtp-enc-aescm128": {
        source: "iana"
      },
      "video/rtploopback": {
        source: "iana"
      },
      "video/rtx": {
        source: "iana"
      },
      "video/scip": {
        source: "iana"
      },
      "video/smpte291": {
        source: "iana"
      },
      "video/smpte292m": {
        source: "iana"
      },
      "video/ulpfec": {
        source: "iana"
      },
      "video/vc1": {
        source: "iana"
      },
      "video/vc2": {
        source: "iana"
      },
      "video/vnd.cctv": {
        source: "iana"
      },
      "video/vnd.dece.hd": {
        source: "iana",
        extensions: ["uvh", "uvvh"]
      },
      "video/vnd.dece.mobile": {
        source: "iana",
        extensions: ["uvm", "uvvm"]
      },
      "video/vnd.dece.mp4": {
        source: "iana"
      },
      "video/vnd.dece.pd": {
        source: "iana",
        extensions: ["uvp", "uvvp"]
      },
      "video/vnd.dece.sd": {
        source: "iana",
        extensions: ["uvs", "uvvs"]
      },
      "video/vnd.dece.video": {
        source: "iana",
        extensions: ["uvv", "uvvv"]
      },
      "video/vnd.directv.mpeg": {
        source: "iana"
      },
      "video/vnd.directv.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dlna.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dvb.file": {
        source: "iana",
        extensions: ["dvb"]
      },
      "video/vnd.fvt": {
        source: "iana",
        extensions: ["fvt"]
      },
      "video/vnd.hns.video": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsavc": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsmpeg2": {
        source: "iana"
      },
      "video/vnd.motorola.video": {
        source: "iana"
      },
      "video/vnd.motorola.videop": {
        source: "iana"
      },
      "video/vnd.mpegurl": {
        source: "iana",
        extensions: ["mxu", "m4u"]
      },
      "video/vnd.ms-playready.media.pyv": {
        source: "iana",
        extensions: ["pyv"]
      },
      "video/vnd.nokia.interleaved-multimedia": {
        source: "iana"
      },
      "video/vnd.nokia.mp4vr": {
        source: "iana"
      },
      "video/vnd.nokia.videovoip": {
        source: "iana"
      },
      "video/vnd.objectvideo": {
        source: "iana"
      },
      "video/vnd.radgamettools.bink": {
        source: "iana"
      },
      "video/vnd.radgamettools.smacker": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg1": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg4": {
        source: "iana"
      },
      "video/vnd.sealed.swf": {
        source: "iana"
      },
      "video/vnd.sealedmedia.softseal.mov": {
        source: "iana"
      },
      "video/vnd.uvvu.mp4": {
        source: "iana",
        extensions: ["uvu", "uvvu"]
      },
      "video/vnd.vivo": {
        source: "iana",
        extensions: ["viv"]
      },
      "video/vnd.youtube.yt": {
        source: "iana"
      },
      "video/vp8": {
        source: "iana"
      },
      "video/vp9": {
        source: "iana"
      },
      "video/webm": {
        source: "apache",
        compressible: false,
        extensions: ["webm"]
      },
      "video/x-f4v": {
        source: "apache",
        extensions: ["f4v"]
      },
      "video/x-fli": {
        source: "apache",
        extensions: ["fli"]
      },
      "video/x-flv": {
        source: "apache",
        compressible: false,
        extensions: ["flv"]
      },
      "video/x-m4v": {
        source: "apache",
        extensions: ["m4v"]
      },
      "video/x-matroska": {
        source: "apache",
        compressible: false,
        extensions: ["mkv", "mk3d", "mks"]
      },
      "video/x-mng": {
        source: "apache",
        extensions: ["mng"]
      },
      "video/x-ms-asf": {
        source: "apache",
        extensions: ["asf", "asx"]
      },
      "video/x-ms-vob": {
        source: "apache",
        extensions: ["vob"]
      },
      "video/x-ms-wm": {
        source: "apache",
        extensions: ["wm"]
      },
      "video/x-ms-wmv": {
        source: "apache",
        compressible: false,
        extensions: ["wmv"]
      },
      "video/x-ms-wmx": {
        source: "apache",
        extensions: ["wmx"]
      },
      "video/x-ms-wvx": {
        source: "apache",
        extensions: ["wvx"]
      },
      "video/x-msvideo": {
        source: "apache",
        extensions: ["avi"]
      },
      "video/x-sgi-movie": {
        source: "apache",
        extensions: ["movie"]
      },
      "video/x-smv": {
        source: "apache",
        extensions: ["smv"]
      },
      "x-conference/x-cooltalk": {
        source: "apache",
        extensions: ["ice"]
      },
      "x-shader/x-fragment": {
        compressible: true
      },
      "x-shader/x-vertex": {
        compressible: true
      }
    };
  }
});

// ../node_modules/mime-db/index.js
var require_mime_db = __commonJS({
  "../node_modules/mime-db/index.js"(exports, module) {
    module.exports = require_db();
  }
});

// ../node_modules/mime-types/index.js
var require_mime_types = __commonJS({
  "../node_modules/mime-types/index.js"(exports) {
    "use strict";
    var db2 = require_mime_db();
    var extname = __require("path").extname;
    var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
    var TEXT_TYPE_REGEXP = /^text\//i;
    exports.charset = charset;
    exports.charsets = { lookup: charset };
    exports.contentType = contentType;
    exports.extension = extension;
    exports.extensions = /* @__PURE__ */ Object.create(null);
    exports.lookup = lookup;
    exports.types = /* @__PURE__ */ Object.create(null);
    populateMaps(exports.extensions, exports.types);
    function charset(type) {
      if (!type || typeof type !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type);
      var mime = match && db2[match[1].toLowerCase()];
      if (mime && mime.charset) {
        return mime.charset;
      }
      if (match && TEXT_TYPE_REGEXP.test(match[1])) {
        return "UTF-8";
      }
      return false;
    }
    function contentType(str) {
      if (!str || typeof str !== "string") {
        return false;
      }
      var mime = str.indexOf("/") === -1 ? exports.lookup(str) : str;
      if (!mime) {
        return false;
      }
      if (mime.indexOf("charset") === -1) {
        var charset2 = exports.charset(mime);
        if (charset2) mime += "; charset=" + charset2.toLowerCase();
      }
      return mime;
    }
    function extension(type) {
      if (!type || typeof type !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type);
      var exts = match && exports.extensions[match[1].toLowerCase()];
      if (!exts || !exts.length) {
        return false;
      }
      return exts[0];
    }
    function lookup(path3) {
      if (!path3 || typeof path3 !== "string") {
        return false;
      }
      var extension2 = extname("x." + path3).toLowerCase().substr(1);
      if (!extension2) {
        return false;
      }
      return exports.types[extension2] || false;
    }
    function populateMaps(extensions, types) {
      var preference = ["nginx", "apache", void 0, "iana"];
      Object.keys(db2).forEach(function forEachMimeType(type) {
        var mime = db2[type];
        var exts = mime.extensions;
        if (!exts || !exts.length) {
          return;
        }
        extensions[type] = exts;
        for (var i = 0; i < exts.length; i++) {
          var extension2 = exts[i];
          if (types[extension2]) {
            var from = preference.indexOf(db2[types[extension2]].source);
            var to = preference.indexOf(mime.source);
            if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
              continue;
            }
          }
          types[extension2] = type;
        }
      });
    }
  }
});

// ../node_modules/asynckit/lib/defer.js
var require_defer = __commonJS({
  "../node_modules/asynckit/lib/defer.js"(exports, module) {
    module.exports = defer;
    function defer(fn) {
      var nextTick = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
      if (nextTick) {
        nextTick(fn);
      } else {
        setTimeout(fn, 0);
      }
    }
  }
});

// ../node_modules/asynckit/lib/async.js
var require_async = __commonJS({
  "../node_modules/asynckit/lib/async.js"(exports, module) {
    var defer = require_defer();
    module.exports = async;
    function async(callback) {
      var isAsync = false;
      defer(function() {
        isAsync = true;
      });
      return function async_callback(err, result) {
        if (isAsync) {
          callback(err, result);
        } else {
          defer(function nextTick_callback() {
            callback(err, result);
          });
        }
      };
    }
  }
});

// ../node_modules/asynckit/lib/abort.js
var require_abort = __commonJS({
  "../node_modules/asynckit/lib/abort.js"(exports, module) {
    module.exports = abort;
    function abort(state) {
      Object.keys(state.jobs).forEach(clean.bind(state));
      state.jobs = {};
    }
    function clean(key) {
      if (typeof this.jobs[key] == "function") {
        this.jobs[key]();
      }
    }
  }
});

// ../node_modules/asynckit/lib/iterate.js
var require_iterate = __commonJS({
  "../node_modules/asynckit/lib/iterate.js"(exports, module) {
    var async = require_async();
    var abort = require_abort();
    module.exports = iterate;
    function iterate(list, iterator, state, callback) {
      var key = state["keyedList"] ? state["keyedList"][state.index] : state.index;
      state.jobs[key] = runJob(iterator, key, list[key], function(error, output) {
        if (!(key in state.jobs)) {
          return;
        }
        delete state.jobs[key];
        if (error) {
          abort(state);
        } else {
          state.results[key] = output;
        }
        callback(error, state.results);
      });
    }
    function runJob(iterator, key, item, callback) {
      var aborter;
      if (iterator.length == 2) {
        aborter = iterator(item, async(callback));
      } else {
        aborter = iterator(item, key, async(callback));
      }
      return aborter;
    }
  }
});

// ../node_modules/asynckit/lib/state.js
var require_state = __commonJS({
  "../node_modules/asynckit/lib/state.js"(exports, module) {
    module.exports = state;
    function state(list, sortMethod) {
      var isNamedList = !Array.isArray(list), initState = {
        index: 0,
        keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
        jobs: {},
        results: isNamedList ? {} : [],
        size: isNamedList ? Object.keys(list).length : list.length
      };
      if (sortMethod) {
        initState.keyedList.sort(isNamedList ? sortMethod : function(a, b) {
          return sortMethod(list[a], list[b]);
        });
      }
      return initState;
    }
  }
});

// ../node_modules/asynckit/lib/terminator.js
var require_terminator = __commonJS({
  "../node_modules/asynckit/lib/terminator.js"(exports, module) {
    var abort = require_abort();
    var async = require_async();
    module.exports = terminator;
    function terminator(callback) {
      if (!Object.keys(this.jobs).length) {
        return;
      }
      this.index = this.size;
      abort(this);
      async(callback)(null, this.results);
    }
  }
});

// ../node_modules/asynckit/parallel.js
var require_parallel = __commonJS({
  "../node_modules/asynckit/parallel.js"(exports, module) {
    var iterate = require_iterate();
    var initState = require_state();
    var terminator = require_terminator();
    module.exports = parallel;
    function parallel(list, iterator, callback) {
      var state = initState(list);
      while (state.index < (state["keyedList"] || list).length) {
        iterate(list, iterator, state, function(error, result) {
          if (error) {
            callback(error, result);
            return;
          }
          if (Object.keys(state.jobs).length === 0) {
            callback(null, state.results);
            return;
          }
        });
        state.index++;
      }
      return terminator.bind(state, callback);
    }
  }
});

// ../node_modules/asynckit/serialOrdered.js
var require_serialOrdered = __commonJS({
  "../node_modules/asynckit/serialOrdered.js"(exports, module) {
    var iterate = require_iterate();
    var initState = require_state();
    var terminator = require_terminator();
    module.exports = serialOrdered;
    module.exports.ascending = ascending;
    module.exports.descending = descending;
    function serialOrdered(list, iterator, sortMethod, callback) {
      var state = initState(list, sortMethod);
      iterate(list, iterator, state, function iteratorHandler(error, result) {
        if (error) {
          callback(error, result);
          return;
        }
        state.index++;
        if (state.index < (state["keyedList"] || list).length) {
          iterate(list, iterator, state, iteratorHandler);
          return;
        }
        callback(null, state.results);
      });
      return terminator.bind(state, callback);
    }
    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    function descending(a, b) {
      return -1 * ascending(a, b);
    }
  }
});

// ../node_modules/asynckit/serial.js
var require_serial = __commonJS({
  "../node_modules/asynckit/serial.js"(exports, module) {
    var serialOrdered = require_serialOrdered();
    module.exports = serial;
    function serial(list, iterator, callback) {
      return serialOrdered(list, iterator, null, callback);
    }
  }
});

// ../node_modules/asynckit/index.js
var require_asynckit = __commonJS({
  "../node_modules/asynckit/index.js"(exports, module) {
    module.exports = {
      parallel: require_parallel(),
      serial: require_serial(),
      serialOrdered: require_serialOrdered()
    };
  }
});

// ../node_modules/es-object-atoms/index.js
var require_es_object_atoms = __commonJS({
  "../node_modules/es-object-atoms/index.js"(exports, module) {
    "use strict";
    module.exports = Object;
  }
});

// ../node_modules/es-errors/index.js
var require_es_errors = __commonJS({
  "../node_modules/es-errors/index.js"(exports, module) {
    "use strict";
    module.exports = Error;
  }
});

// ../node_modules/es-errors/eval.js
var require_eval = __commonJS({
  "../node_modules/es-errors/eval.js"(exports, module) {
    "use strict";
    module.exports = EvalError;
  }
});

// ../node_modules/es-errors/range.js
var require_range = __commonJS({
  "../node_modules/es-errors/range.js"(exports, module) {
    "use strict";
    module.exports = RangeError;
  }
});

// ../node_modules/es-errors/ref.js
var require_ref = __commonJS({
  "../node_modules/es-errors/ref.js"(exports, module) {
    "use strict";
    module.exports = ReferenceError;
  }
});

// ../node_modules/es-errors/syntax.js
var require_syntax = __commonJS({
  "../node_modules/es-errors/syntax.js"(exports, module) {
    "use strict";
    module.exports = SyntaxError;
  }
});

// ../node_modules/es-errors/type.js
var require_type = __commonJS({
  "../node_modules/es-errors/type.js"(exports, module) {
    "use strict";
    module.exports = TypeError;
  }
});

// ../node_modules/es-errors/uri.js
var require_uri = __commonJS({
  "../node_modules/es-errors/uri.js"(exports, module) {
    "use strict";
    module.exports = URIError;
  }
});

// ../node_modules/math-intrinsics/abs.js
var require_abs = __commonJS({
  "../node_modules/math-intrinsics/abs.js"(exports, module) {
    "use strict";
    module.exports = Math.abs;
  }
});

// ../node_modules/math-intrinsics/floor.js
var require_floor = __commonJS({
  "../node_modules/math-intrinsics/floor.js"(exports, module) {
    "use strict";
    module.exports = Math.floor;
  }
});

// ../node_modules/math-intrinsics/max.js
var require_max = __commonJS({
  "../node_modules/math-intrinsics/max.js"(exports, module) {
    "use strict";
    module.exports = Math.max;
  }
});

// ../node_modules/math-intrinsics/min.js
var require_min = __commonJS({
  "../node_modules/math-intrinsics/min.js"(exports, module) {
    "use strict";
    module.exports = Math.min;
  }
});

// ../node_modules/math-intrinsics/pow.js
var require_pow = __commonJS({
  "../node_modules/math-intrinsics/pow.js"(exports, module) {
    "use strict";
    module.exports = Math.pow;
  }
});

// ../node_modules/math-intrinsics/round.js
var require_round = __commonJS({
  "../node_modules/math-intrinsics/round.js"(exports, module) {
    "use strict";
    module.exports = Math.round;
  }
});

// ../node_modules/math-intrinsics/isNaN.js
var require_isNaN = __commonJS({
  "../node_modules/math-intrinsics/isNaN.js"(exports, module) {
    "use strict";
    module.exports = Number.isNaN || function isNaN2(a) {
      return a !== a;
    };
  }
});

// ../node_modules/math-intrinsics/sign.js
var require_sign = __commonJS({
  "../node_modules/math-intrinsics/sign.js"(exports, module) {
    "use strict";
    var $isNaN = require_isNaN();
    module.exports = function sign(number) {
      if ($isNaN(number) || number === 0) {
        return number;
      }
      return number < 0 ? -1 : 1;
    };
  }
});

// ../node_modules/gopd/gOPD.js
var require_gOPD = __commonJS({
  "../node_modules/gopd/gOPD.js"(exports, module) {
    "use strict";
    module.exports = Object.getOwnPropertyDescriptor;
  }
});

// ../node_modules/gopd/index.js
var require_gopd = __commonJS({
  "../node_modules/gopd/index.js"(exports, module) {
    "use strict";
    var $gOPD = require_gOPD();
    if ($gOPD) {
      try {
        $gOPD([], "length");
      } catch (e) {
        $gOPD = null;
      }
    }
    module.exports = $gOPD;
  }
});

// ../node_modules/es-define-property/index.js
var require_es_define_property = __commonJS({
  "../node_modules/es-define-property/index.js"(exports, module) {
    "use strict";
    var $defineProperty = Object.defineProperty || false;
    if ($defineProperty) {
      try {
        $defineProperty({}, "a", { value: 1 });
      } catch (e) {
        $defineProperty = false;
      }
    }
    module.exports = $defineProperty;
  }
});

// ../node_modules/has-symbols/shams.js
var require_shams = __commonJS({
  "../node_modules/has-symbols/shams.js"(exports, module) {
    "use strict";
    module.exports = function hasSymbols() {
      if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
        return false;
      }
      if (typeof Symbol.iterator === "symbol") {
        return true;
      }
      var obj = {};
      var sym = Symbol("test");
      var symObj = Object(sym);
      if (typeof sym === "string") {
        return false;
      }
      if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
        return false;
      }
      if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
        return false;
      }
      var symVal = 42;
      obj[sym] = symVal;
      for (var _ in obj) {
        return false;
      }
      if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
        return false;
      }
      if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
        return false;
      }
      var syms = Object.getOwnPropertySymbols(obj);
      if (syms.length !== 1 || syms[0] !== sym) {
        return false;
      }
      if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
        return false;
      }
      if (typeof Object.getOwnPropertyDescriptor === "function") {
        var descriptor = (
          /** @type {PropertyDescriptor} */
          Object.getOwnPropertyDescriptor(obj, sym)
        );
        if (descriptor.value !== symVal || descriptor.enumerable !== true) {
          return false;
        }
      }
      return true;
    };
  }
});

// ../node_modules/has-symbols/index.js
var require_has_symbols = __commonJS({
  "../node_modules/has-symbols/index.js"(exports, module) {
    "use strict";
    var origSymbol = typeof Symbol !== "undefined" && Symbol;
    var hasSymbolSham = require_shams();
    module.exports = function hasNativeSymbols() {
      if (typeof origSymbol !== "function") {
        return false;
      }
      if (typeof Symbol !== "function") {
        return false;
      }
      if (typeof origSymbol("foo") !== "symbol") {
        return false;
      }
      if (typeof Symbol("bar") !== "symbol") {
        return false;
      }
      return hasSymbolSham();
    };
  }
});

// ../node_modules/get-proto/Reflect.getPrototypeOf.js
var require_Reflect_getPrototypeOf = __commonJS({
  "../node_modules/get-proto/Reflect.getPrototypeOf.js"(exports, module) {
    "use strict";
    module.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
  }
});

// ../node_modules/get-proto/Object.getPrototypeOf.js
var require_Object_getPrototypeOf = __commonJS({
  "../node_modules/get-proto/Object.getPrototypeOf.js"(exports, module) {
    "use strict";
    var $Object = require_es_object_atoms();
    module.exports = $Object.getPrototypeOf || null;
  }
});

// ../node_modules/function-bind/implementation.js
var require_implementation = __commonJS({
  "../node_modules/function-bind/implementation.js"(exports, module) {
    "use strict";
    var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
    var toStr = Object.prototype.toString;
    var max = Math.max;
    var funcType = "[object Function]";
    var concatty = function concatty2(a, b) {
      var arr = [];
      for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
      }
      for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
      }
      return arr;
    };
    var slicy = function slicy2(arrLike, offset) {
      var arr = [];
      for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
      }
      return arr;
    };
    var joiny = function(arr, joiner) {
      var str = "";
      for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
          str += joiner;
        }
      }
      return str;
    };
    module.exports = function bind2(that) {
      var target = this;
      if (typeof target !== "function" || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
      }
      var args = slicy(arguments, 1);
      var bound;
      var binder = function() {
        if (this instanceof bound) {
          var result = target.apply(
            this,
            concatty(args, arguments)
          );
          if (Object(result) === result) {
            return result;
          }
          return this;
        }
        return target.apply(
          that,
          concatty(args, arguments)
        );
      };
      var boundLength = max(0, target.length - args.length);
      var boundArgs = [];
      for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = "$" + i;
      }
      bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
      if (target.prototype) {
        var Empty = function Empty2() {
        };
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
      }
      return bound;
    };
  }
});

// ../node_modules/function-bind/index.js
var require_function_bind = __commonJS({
  "../node_modules/function-bind/index.js"(exports, module) {
    "use strict";
    var implementation = require_implementation();
    module.exports = Function.prototype.bind || implementation;
  }
});

// ../node_modules/call-bind-apply-helpers/functionCall.js
var require_functionCall = __commonJS({
  "../node_modules/call-bind-apply-helpers/functionCall.js"(exports, module) {
    "use strict";
    module.exports = Function.prototype.call;
  }
});

// ../node_modules/call-bind-apply-helpers/functionApply.js
var require_functionApply = __commonJS({
  "../node_modules/call-bind-apply-helpers/functionApply.js"(exports, module) {
    "use strict";
    module.exports = Function.prototype.apply;
  }
});

// ../node_modules/call-bind-apply-helpers/reflectApply.js
var require_reflectApply = __commonJS({
  "../node_modules/call-bind-apply-helpers/reflectApply.js"(exports, module) {
    "use strict";
    module.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
  }
});

// ../node_modules/call-bind-apply-helpers/actualApply.js
var require_actualApply = __commonJS({
  "../node_modules/call-bind-apply-helpers/actualApply.js"(exports, module) {
    "use strict";
    var bind2 = require_function_bind();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var $reflectApply = require_reflectApply();
    module.exports = $reflectApply || bind2.call($call, $apply);
  }
});

// ../node_modules/call-bind-apply-helpers/index.js
var require_call_bind_apply_helpers = __commonJS({
  "../node_modules/call-bind-apply-helpers/index.js"(exports, module) {
    "use strict";
    var bind2 = require_function_bind();
    var $TypeError = require_type();
    var $call = require_functionCall();
    var $actualApply = require_actualApply();
    module.exports = function callBindBasic(args) {
      if (args.length < 1 || typeof args[0] !== "function") {
        throw new $TypeError("a function is required");
      }
      return $actualApply(bind2, $call, args);
    };
  }
});

// ../node_modules/dunder-proto/get.js
var require_get = __commonJS({
  "../node_modules/dunder-proto/get.js"(exports, module) {
    "use strict";
    var callBind = require_call_bind_apply_helpers();
    var gOPD = require_gopd();
    var hasProtoAccessor;
    try {
      hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
      [].__proto__ === Array.prototype;
    } catch (e) {
      if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
        throw e;
      }
    }
    var desc = !!hasProtoAccessor && gOPD && gOPD(
      Object.prototype,
      /** @type {keyof typeof Object.prototype} */
      "__proto__"
    );
    var $Object = Object;
    var $getPrototypeOf = $Object.getPrototypeOf;
    module.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? (
      /** @type {import('./get')} */
      function getDunder(value) {
        return $getPrototypeOf(value == null ? value : $Object(value));
      }
    ) : false;
  }
});

// ../node_modules/get-proto/index.js
var require_get_proto = __commonJS({
  "../node_modules/get-proto/index.js"(exports, module) {
    "use strict";
    var reflectGetProto = require_Reflect_getPrototypeOf();
    var originalGetProto = require_Object_getPrototypeOf();
    var getDunderProto = require_get();
    module.exports = reflectGetProto ? function getProto(O) {
      return reflectGetProto(O);
    } : originalGetProto ? function getProto(O) {
      if (!O || typeof O !== "object" && typeof O !== "function") {
        throw new TypeError("getProto: not an object");
      }
      return originalGetProto(O);
    } : getDunderProto ? function getProto(O) {
      return getDunderProto(O);
    } : null;
  }
});

// ../node_modules/hasown/index.js
var require_hasown = __commonJS({
  "../node_modules/hasown/index.js"(exports, module) {
    "use strict";
    var call = Function.prototype.call;
    var $hasOwn = Object.prototype.hasOwnProperty;
    var bind2 = require_function_bind();
    module.exports = bind2.call(call, $hasOwn);
  }
});

// ../node_modules/get-intrinsic/index.js
var require_get_intrinsic = __commonJS({
  "../node_modules/get-intrinsic/index.js"(exports, module) {
    "use strict";
    var undefined2;
    var $Object = require_es_object_atoms();
    var $Error = require_es_errors();
    var $EvalError = require_eval();
    var $RangeError = require_range();
    var $ReferenceError = require_ref();
    var $SyntaxError = require_syntax();
    var $TypeError = require_type();
    var $URIError = require_uri();
    var abs = require_abs();
    var floor = require_floor();
    var max = require_max();
    var min = require_min();
    var pow = require_pow();
    var round = require_round();
    var sign = require_sign();
    var $Function = Function;
    var getEvalledConstructor = function(expressionSyntax) {
      try {
        return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
      } catch (e) {
      }
    };
    var $gOPD = require_gopd();
    var $defineProperty = require_es_define_property();
    var throwTypeError = function() {
      throw new $TypeError();
    };
    var ThrowTypeError = $gOPD ? function() {
      try {
        arguments.callee;
        return throwTypeError;
      } catch (calleeThrows) {
        try {
          return $gOPD(arguments, "callee").get;
        } catch (gOPDthrows) {
          return throwTypeError;
        }
      }
    }() : throwTypeError;
    var hasSymbols = require_has_symbols()();
    var getProto = require_get_proto();
    var $ObjectGPO = require_Object_getPrototypeOf();
    var $ReflectGPO = require_Reflect_getPrototypeOf();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var needsEval = {};
    var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
    var INTRINSICS = {
      __proto__: null,
      "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
      "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
      "%AsyncFromSyncIteratorPrototype%": undefined2,
      "%AsyncFunction%": needsEval,
      "%AsyncGenerator%": needsEval,
      "%AsyncGeneratorFunction%": needsEval,
      "%AsyncIteratorPrototype%": needsEval,
      "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
      "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
      "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
      "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": $Error,
      "%eval%": eval,
      // eslint-disable-line no-eval
      "%EvalError%": $EvalError,
      "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
      "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
      "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
      "%Function%": $Function,
      "%GeneratorFunction%": needsEval,
      "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
      "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
      "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
      "%JSON%": typeof JSON === "object" ? JSON : undefined2,
      "%Map%": typeof Map === "undefined" ? undefined2 : Map,
      "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": $Object,
      "%Object.getOwnPropertyDescriptor%": $gOPD,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
      "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
      "%RangeError%": $RangeError,
      "%ReferenceError%": $ReferenceError,
      "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set === "undefined" ? undefined2 : Set,
      "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
      "%Symbol%": hasSymbols ? Symbol : undefined2,
      "%SyntaxError%": $SyntaxError,
      "%ThrowTypeError%": ThrowTypeError,
      "%TypedArray%": TypedArray,
      "%TypeError%": $TypeError,
      "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
      "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
      "%URIError%": $URIError,
      "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
      "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
      "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
      "%Function.prototype.call%": $call,
      "%Function.prototype.apply%": $apply,
      "%Object.defineProperty%": $defineProperty,
      "%Object.getPrototypeOf%": $ObjectGPO,
      "%Math.abs%": abs,
      "%Math.floor%": floor,
      "%Math.max%": max,
      "%Math.min%": min,
      "%Math.pow%": pow,
      "%Math.round%": round,
      "%Math.sign%": sign,
      "%Reflect.getPrototypeOf%": $ReflectGPO
    };
    if (getProto) {
      try {
        null.error;
      } catch (e) {
        errorProto = getProto(getProto(e));
        INTRINSICS["%Error.prototype%"] = errorProto;
      }
    }
    var errorProto;
    var doEval = function doEval2(name) {
      var value;
      if (name === "%AsyncFunction%") {
        value = getEvalledConstructor("async function () {}");
      } else if (name === "%GeneratorFunction%") {
        value = getEvalledConstructor("function* () {}");
      } else if (name === "%AsyncGeneratorFunction%") {
        value = getEvalledConstructor("async function* () {}");
      } else if (name === "%AsyncGenerator%") {
        var fn = doEval2("%AsyncGeneratorFunction%");
        if (fn) {
          value = fn.prototype;
        }
      } else if (name === "%AsyncIteratorPrototype%") {
        var gen = doEval2("%AsyncGenerator%");
        if (gen && getProto) {
          value = getProto(gen.prototype);
        }
      }
      INTRINSICS[name] = value;
      return value;
    };
    var LEGACY_ALIASES = {
      __proto__: null,
      "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
      "%ArrayPrototype%": ["Array", "prototype"],
      "%ArrayProto_entries%": ["Array", "prototype", "entries"],
      "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
      "%ArrayProto_keys%": ["Array", "prototype", "keys"],
      "%ArrayProto_values%": ["Array", "prototype", "values"],
      "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
      "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
      "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
      "%BooleanPrototype%": ["Boolean", "prototype"],
      "%DataViewPrototype%": ["DataView", "prototype"],
      "%DatePrototype%": ["Date", "prototype"],
      "%ErrorPrototype%": ["Error", "prototype"],
      "%EvalErrorPrototype%": ["EvalError", "prototype"],
      "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
      "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
      "%FunctionPrototype%": ["Function", "prototype"],
      "%Generator%": ["GeneratorFunction", "prototype"],
      "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
      "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
      "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
      "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
      "%JSONParse%": ["JSON", "parse"],
      "%JSONStringify%": ["JSON", "stringify"],
      "%MapPrototype%": ["Map", "prototype"],
      "%NumberPrototype%": ["Number", "prototype"],
      "%ObjectPrototype%": ["Object", "prototype"],
      "%ObjProto_toString%": ["Object", "prototype", "toString"],
      "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
      "%PromisePrototype%": ["Promise", "prototype"],
      "%PromiseProto_then%": ["Promise", "prototype", "then"],
      "%Promise_all%": ["Promise", "all"],
      "%Promise_reject%": ["Promise", "reject"],
      "%Promise_resolve%": ["Promise", "resolve"],
      "%RangeErrorPrototype%": ["RangeError", "prototype"],
      "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
      "%RegExpPrototype%": ["RegExp", "prototype"],
      "%SetPrototype%": ["Set", "prototype"],
      "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
      "%StringPrototype%": ["String", "prototype"],
      "%SymbolPrototype%": ["Symbol", "prototype"],
      "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
      "%TypedArrayPrototype%": ["TypedArray", "prototype"],
      "%TypeErrorPrototype%": ["TypeError", "prototype"],
      "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
      "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
      "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
      "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
      "%URIErrorPrototype%": ["URIError", "prototype"],
      "%WeakMapPrototype%": ["WeakMap", "prototype"],
      "%WeakSetPrototype%": ["WeakSet", "prototype"]
    };
    var bind2 = require_function_bind();
    var hasOwn = require_hasown();
    var $concat = bind2.call($call, Array.prototype.concat);
    var $spliceApply = bind2.call($apply, Array.prototype.splice);
    var $replace = bind2.call($call, String.prototype.replace);
    var $strSlice = bind2.call($call, String.prototype.slice);
    var $exec = bind2.call($call, RegExp.prototype.exec);
    var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
    var reEscapeChar = /\\(\\)?/g;
    var stringToPath = function stringToPath2(string) {
      var first = $strSlice(string, 0, 1);
      var last = $strSlice(string, -1);
      if (first === "%" && last !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
      } else if (last === "%" && first !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
      }
      var result = [];
      $replace(string, rePropName, function(match, number, quote, subString) {
        result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
      });
      return result;
    };
    var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
      var intrinsicName = name;
      var alias;
      if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
        alias = LEGACY_ALIASES[intrinsicName];
        intrinsicName = "%" + alias[0] + "%";
      }
      if (hasOwn(INTRINSICS, intrinsicName)) {
        var value = INTRINSICS[intrinsicName];
        if (value === needsEval) {
          value = doEval(intrinsicName);
        }
        if (typeof value === "undefined" && !allowMissing) {
          throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
        }
        return {
          alias,
          name: intrinsicName,
          value
        };
      }
      throw new $SyntaxError("intrinsic " + name + " does not exist!");
    };
    module.exports = function GetIntrinsic(name, allowMissing) {
      if (typeof name !== "string" || name.length === 0) {
        throw new $TypeError("intrinsic name must be a non-empty string");
      }
      if (arguments.length > 1 && typeof allowMissing !== "boolean") {
        throw new $TypeError('"allowMissing" argument must be a boolean');
      }
      if ($exec(/^%?[^%]*%?$/, name) === null) {
        throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      }
      var parts = stringToPath(name);
      var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
      var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
      var intrinsicRealName = intrinsic.name;
      var value = intrinsic.value;
      var skipFurtherCaching = false;
      var alias = intrinsic.alias;
      if (alias) {
        intrinsicBaseName = alias[0];
        $spliceApply(parts, $concat([0, 1], alias));
      }
      for (var i = 1, isOwn = true; i < parts.length; i += 1) {
        var part = parts[i];
        var first = $strSlice(part, 0, 1);
        var last = $strSlice(part, -1);
        if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
          throw new $SyntaxError("property names with quotes must have matching quotes");
        }
        if (part === "constructor" || !isOwn) {
          skipFurtherCaching = true;
        }
        intrinsicBaseName += "." + part;
        intrinsicRealName = "%" + intrinsicBaseName + "%";
        if (hasOwn(INTRINSICS, intrinsicRealName)) {
          value = INTRINSICS[intrinsicRealName];
        } else if (value != null) {
          if (!(part in value)) {
            if (!allowMissing) {
              throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
            }
            return void undefined2;
          }
          if ($gOPD && i + 1 >= parts.length) {
            var desc = $gOPD(value, part);
            isOwn = !!desc;
            if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
              value = desc.get;
            } else {
              value = value[part];
            }
          } else {
            isOwn = hasOwn(value, part);
            value = value[part];
          }
          if (isOwn && !skipFurtherCaching) {
            INTRINSICS[intrinsicRealName] = value;
          }
        }
      }
      return value;
    };
  }
});

// ../node_modules/has-tostringtag/shams.js
var require_shams2 = __commonJS({
  "../node_modules/has-tostringtag/shams.js"(exports, module) {
    "use strict";
    var hasSymbols = require_shams();
    module.exports = function hasToStringTagShams() {
      return hasSymbols() && !!Symbol.toStringTag;
    };
  }
});

// ../node_modules/es-set-tostringtag/index.js
var require_es_set_tostringtag = __commonJS({
  "../node_modules/es-set-tostringtag/index.js"(exports, module) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic();
    var $defineProperty = GetIntrinsic("%Object.defineProperty%", true);
    var hasToStringTag = require_shams2()();
    var hasOwn = require_hasown();
    var $TypeError = require_type();
    var toStringTag = hasToStringTag ? Symbol.toStringTag : null;
    module.exports = function setToStringTag(object, value) {
      var overrideIfSet = arguments.length > 2 && !!arguments[2] && arguments[2].force;
      var nonConfigurable = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
      if (typeof overrideIfSet !== "undefined" && typeof overrideIfSet !== "boolean" || typeof nonConfigurable !== "undefined" && typeof nonConfigurable !== "boolean") {
        throw new $TypeError("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
      }
      if (toStringTag && (overrideIfSet || !hasOwn(object, toStringTag))) {
        if ($defineProperty) {
          $defineProperty(object, toStringTag, {
            configurable: !nonConfigurable,
            enumerable: false,
            value,
            writable: false
          });
        } else {
          object[toStringTag] = value;
        }
      }
    };
  }
});

// ../node_modules/form-data/lib/populate.js
var require_populate = __commonJS({
  "../node_modules/form-data/lib/populate.js"(exports, module) {
    module.exports = function(dst, src) {
      Object.keys(src).forEach(function(prop) {
        dst[prop] = dst[prop] || src[prop];
      });
      return dst;
    };
  }
});

// ../node_modules/form-data/lib/form_data.js
var require_form_data = __commonJS({
  "../node_modules/form-data/lib/form_data.js"(exports, module) {
    var CombinedStream = require_combined_stream();
    var util3 = __require("util");
    var path3 = __require("path");
    var http2 = __require("http");
    var https2 = __require("https");
    var parseUrl = __require("url").parse;
    var fs3 = __require("fs");
    var Stream = __require("stream").Stream;
    var mime = require_mime_types();
    var asynckit = require_asynckit();
    var setToStringTag = require_es_set_tostringtag();
    var populate = require_populate();
    module.exports = FormData3;
    util3.inherits(FormData3, CombinedStream);
    function FormData3(options) {
      if (!(this instanceof FormData3)) {
        return new FormData3(options);
      }
      this._overheadLength = 0;
      this._valueLength = 0;
      this._valuesToMeasure = [];
      CombinedStream.call(this);
      options = options || {};
      for (var option in options) {
        this[option] = options[option];
      }
    }
    FormData3.LINE_BREAK = "\r\n";
    FormData3.DEFAULT_CONTENT_TYPE = "application/octet-stream";
    FormData3.prototype.append = function(field, value, options) {
      options = options || {};
      if (typeof options == "string") {
        options = { filename: options };
      }
      var append2 = CombinedStream.prototype.append.bind(this);
      if (typeof value == "number") {
        value = "" + value;
      }
      if (Array.isArray(value)) {
        this._error(new Error("Arrays are not supported."));
        return;
      }
      var header = this._multiPartHeader(field, value, options);
      var footer = this._multiPartFooter();
      append2(header);
      append2(value);
      append2(footer);
      this._trackLength(header, value, options);
    };
    FormData3.prototype._trackLength = function(header, value, options) {
      var valueLength = 0;
      if (options.knownLength != null) {
        valueLength += +options.knownLength;
      } else if (Buffer.isBuffer(value)) {
        valueLength = value.length;
      } else if (typeof value === "string") {
        valueLength = Buffer.byteLength(value);
      }
      this._valueLength += valueLength;
      this._overheadLength += Buffer.byteLength(header) + FormData3.LINE_BREAK.length;
      if (!value || !value.path && !(value.readable && Object.prototype.hasOwnProperty.call(value, "httpVersion")) && !(value instanceof Stream)) {
        return;
      }
      if (!options.knownLength) {
        this._valuesToMeasure.push(value);
      }
    };
    FormData3.prototype._lengthRetriever = function(value, callback) {
      if (Object.prototype.hasOwnProperty.call(value, "fd")) {
        if (value.end != void 0 && value.end != Infinity && value.start != void 0) {
          callback(null, value.end + 1 - (value.start ? value.start : 0));
        } else {
          fs3.stat(value.path, function(err, stat) {
            var fileSize;
            if (err) {
              callback(err);
              return;
            }
            fileSize = stat.size - (value.start ? value.start : 0);
            callback(null, fileSize);
          });
        }
      } else if (Object.prototype.hasOwnProperty.call(value, "httpVersion")) {
        callback(null, +value.headers["content-length"]);
      } else if (Object.prototype.hasOwnProperty.call(value, "httpModule")) {
        value.on("response", function(response) {
          value.pause();
          callback(null, +response.headers["content-length"]);
        });
        value.resume();
      } else {
        callback("Unknown stream");
      }
    };
    FormData3.prototype._multiPartHeader = function(field, value, options) {
      if (typeof options.header == "string") {
        return options.header;
      }
      var contentDisposition = this._getContentDisposition(value, options);
      var contentType = this._getContentType(value, options);
      var contents = "";
      var headers = {
        // add custom disposition as third element or keep it two elements if not
        "Content-Disposition": ["form-data", 'name="' + field + '"'].concat(contentDisposition || []),
        // if no content type. allow it to be empty array
        "Content-Type": [].concat(contentType || [])
      };
      if (typeof options.header == "object") {
        populate(headers, options.header);
      }
      var header;
      for (var prop in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, prop)) {
          header = headers[prop];
          if (header == null) {
            continue;
          }
          if (!Array.isArray(header)) {
            header = [header];
          }
          if (header.length) {
            contents += prop + ": " + header.join("; ") + FormData3.LINE_BREAK;
          }
        }
      }
      return "--" + this.getBoundary() + FormData3.LINE_BREAK + contents + FormData3.LINE_BREAK;
    };
    FormData3.prototype._getContentDisposition = function(value, options) {
      var filename, contentDisposition;
      if (typeof options.filepath === "string") {
        filename = path3.normalize(options.filepath).replace(/\\/g, "/");
      } else if (options.filename || value.name || value.path) {
        filename = path3.basename(options.filename || value.name || value.path);
      } else if (value.readable && Object.prototype.hasOwnProperty.call(value, "httpVersion")) {
        filename = path3.basename(value.client._httpMessage.path || "");
      }
      if (filename) {
        contentDisposition = 'filename="' + filename + '"';
      }
      return contentDisposition;
    };
    FormData3.prototype._getContentType = function(value, options) {
      var contentType = options.contentType;
      if (!contentType && value.name) {
        contentType = mime.lookup(value.name);
      }
      if (!contentType && value.path) {
        contentType = mime.lookup(value.path);
      }
      if (!contentType && value.readable && Object.prototype.hasOwnProperty.call(value, "httpVersion")) {
        contentType = value.headers["content-type"];
      }
      if (!contentType && (options.filepath || options.filename)) {
        contentType = mime.lookup(options.filepath || options.filename);
      }
      if (!contentType && typeof value == "object") {
        contentType = FormData3.DEFAULT_CONTENT_TYPE;
      }
      return contentType;
    };
    FormData3.prototype._multiPartFooter = function() {
      return function(next) {
        var footer = FormData3.LINE_BREAK;
        var lastPart = this._streams.length === 0;
        if (lastPart) {
          footer += this._lastBoundary();
        }
        next(footer);
      }.bind(this);
    };
    FormData3.prototype._lastBoundary = function() {
      return "--" + this.getBoundary() + "--" + FormData3.LINE_BREAK;
    };
    FormData3.prototype.getHeaders = function(userHeaders) {
      var header;
      var formHeaders = {
        "content-type": "multipart/form-data; boundary=" + this.getBoundary()
      };
      for (header in userHeaders) {
        if (Object.prototype.hasOwnProperty.call(userHeaders, header)) {
          formHeaders[header.toLowerCase()] = userHeaders[header];
        }
      }
      return formHeaders;
    };
    FormData3.prototype.setBoundary = function(boundary) {
      this._boundary = boundary;
    };
    FormData3.prototype.getBoundary = function() {
      if (!this._boundary) {
        this._generateBoundary();
      }
      return this._boundary;
    };
    FormData3.prototype.getBuffer = function() {
      var dataBuffer = new Buffer.alloc(0);
      var boundary = this.getBoundary();
      for (var i = 0, len = this._streams.length; i < len; i++) {
        if (typeof this._streams[i] !== "function") {
          if (Buffer.isBuffer(this._streams[i])) {
            dataBuffer = Buffer.concat([dataBuffer, this._streams[i]]);
          } else {
            dataBuffer = Buffer.concat([dataBuffer, Buffer.from(this._streams[i])]);
          }
          if (typeof this._streams[i] !== "string" || this._streams[i].substring(2, boundary.length + 2) !== boundary) {
            dataBuffer = Buffer.concat([dataBuffer, Buffer.from(FormData3.LINE_BREAK)]);
          }
        }
      }
      return Buffer.concat([dataBuffer, Buffer.from(this._lastBoundary())]);
    };
    FormData3.prototype._generateBoundary = function() {
      var boundary = "--------------------------";
      for (var i = 0; i < 24; i++) {
        boundary += Math.floor(Math.random() * 10).toString(16);
      }
      this._boundary = boundary;
    };
    FormData3.prototype.getLengthSync = function() {
      var knownLength = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
      if (!this.hasKnownLength()) {
        this._error(new Error("Cannot calculate proper length in synchronous way."));
      }
      return knownLength;
    };
    FormData3.prototype.hasKnownLength = function() {
      var hasKnownLength = true;
      if (this._valuesToMeasure.length) {
        hasKnownLength = false;
      }
      return hasKnownLength;
    };
    FormData3.prototype.getLength = function(cb) {
      var knownLength = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
      if (!this._valuesToMeasure.length) {
        process.nextTick(cb.bind(this, null, knownLength));
        return;
      }
      asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
        if (err) {
          cb(err);
          return;
        }
        values.forEach(function(length) {
          knownLength += length;
        });
        cb(null, knownLength);
      });
    };
    FormData3.prototype.submit = function(params, cb) {
      var request, options, defaults2 = { method: "post" };
      if (typeof params == "string") {
        params = parseUrl(params);
        options = populate({
          port: params.port,
          path: params.pathname,
          host: params.hostname,
          protocol: params.protocol
        }, defaults2);
      } else {
        options = populate(params, defaults2);
        if (!options.port) {
          options.port = options.protocol == "https:" ? 443 : 80;
        }
      }
      options.headers = this.getHeaders(params.headers);
      if (options.protocol == "https:") {
        request = https2.request(options);
      } else {
        request = http2.request(options);
      }
      this.getLength(function(err, length) {
        if (err && err !== "Unknown stream") {
          this._error(err);
          return;
        }
        if (length) {
          request.setHeader("Content-Length", length);
        }
        this.pipe(request);
        if (cb) {
          var onResponse;
          var callback = function(error, responce) {
            request.removeListener("error", callback);
            request.removeListener("response", onResponse);
            return cb.call(this, error, responce);
          };
          onResponse = callback.bind(this, null);
          request.on("error", callback);
          request.on("response", onResponse);
        }
      }.bind(this));
      return request;
    };
    FormData3.prototype._error = function(err) {
      if (!this.error) {
        this.error = err;
        this.pause();
        this.emit("error", err);
      }
    };
    FormData3.prototype.toString = function() {
      return "[object FormData]";
    };
    setToStringTag(FormData3, "FormData");
  }
});

// ../node_modules/proxy-from-env/index.js
var require_proxy_from_env = __commonJS({
  "../node_modules/proxy-from-env/index.js"(exports) {
    "use strict";
    var parseUrl = __require("url").parse;
    var DEFAULT_PORTS = {
      ftp: 21,
      gopher: 70,
      http: 80,
      https: 443,
      ws: 80,
      wss: 443
    };
    var stringEndsWith = String.prototype.endsWith || function(s) {
      return s.length <= this.length && this.indexOf(s, this.length - s.length) !== -1;
    };
    function getProxyForUrl(url2) {
      var parsedUrl = typeof url2 === "string" ? parseUrl(url2) : url2 || {};
      var proto = parsedUrl.protocol;
      var hostname = parsedUrl.host;
      var port = parsedUrl.port;
      if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
        return "";
      }
      proto = proto.split(":", 1)[0];
      hostname = hostname.replace(/:\d*$/, "");
      port = parseInt(port) || DEFAULT_PORTS[proto] || 0;
      if (!shouldProxy(hostname, port)) {
        return "";
      }
      var proxy = getEnv2("npm_config_" + proto + "_proxy") || getEnv2(proto + "_proxy") || getEnv2("npm_config_proxy") || getEnv2("all_proxy");
      if (proxy && proxy.indexOf("://") === -1) {
        proxy = proto + "://" + proxy;
      }
      return proxy;
    }
    function shouldProxy(hostname, port) {
      var NO_PROXY = (getEnv2("npm_config_no_proxy") || getEnv2("no_proxy")).toLowerCase();
      if (!NO_PROXY) {
        return true;
      }
      if (NO_PROXY === "*") {
        return false;
      }
      return NO_PROXY.split(/[,\s]/).every(function(proxy) {
        if (!proxy) {
          return true;
        }
        var parsedProxy = proxy.match(/^(.+):(\d+)$/);
        var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
        var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
        if (parsedProxyPort && parsedProxyPort !== port) {
          return true;
        }
        if (!/^[.*]/.test(parsedProxyHostname)) {
          return hostname !== parsedProxyHostname;
        }
        if (parsedProxyHostname.charAt(0) === "*") {
          parsedProxyHostname = parsedProxyHostname.slice(1);
        }
        return !stringEndsWith.call(hostname, parsedProxyHostname);
      });
    }
    function getEnv2(key) {
      return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || "";
    }
    exports.getProxyForUrl = getProxyForUrl;
  }
});

// ../node_modules/ms/index.js
var require_ms = __commonJS({
  "../node_modules/ms/index.js"(exports, module) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// ../node_modules/debug/src/common.js
var require_common = __commonJS({
  "../node_modules/debug/src/common.js"(exports, module) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self2 = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend2;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend2(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(" ", ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module.exports = setup;
  }
});

// ../node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../node_modules/debug/src/browser.js"(exports, module) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "../node_modules/has-flag/index.js"(exports, module) {
    "use strict";
    module.exports = (flag, argv = process.argv) => {
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const position = argv.indexOf(prefix + flag);
      const terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// ../node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "../node_modules/supports-color/index.js"(exports, module) {
    "use strict";
    var os = __require("os");
    var tty = __require("tty");
    var hasFlag = require_has_flag();
    var { env } = process;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      forceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = 1;
    }
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        forceColor = 1;
      } else if (env.FORCE_COLOR === "false") {
        forceColor = 0;
      } else {
        forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
      }
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(haveStream, streamIsTTY) {
      if (forceColor === 0) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (haveStream && !streamIsTTY && forceColor === void 0) {
        return 0;
      }
      const min = forceColor || 0;
      if (env.TERM === "dumb") {
        return min;
      }
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      return min;
    }
    function getSupportLevel(stream4) {
      const level = supportsColor(stream4, stream4 && stream4.isTTY);
      return translateLevel(level);
    }
    module.exports = {
      supportsColor: getSupportLevel,
      stdout: translateLevel(supportsColor(true, tty.isatty(1))),
      stderr: translateLevel(supportsColor(true, tty.isatty(2)))
    };
  }
});

// ../node_modules/debug/src/node.js
var require_node = __commonJS({
  "../node_modules/debug/src/node.js"(exports, module) {
    var tty = __require("tty");
    var util3 = __require("util");
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util3.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util3.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util3.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util3.inspect(v, this.inspectOpts);
    };
  }
});

// ../node_modules/debug/src/index.js
var require_src = __commonJS({
  "../node_modules/debug/src/index.js"(exports, module) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module.exports = require_browser();
    } else {
      module.exports = require_node();
    }
  }
});

// ../node_modules/follow-redirects/debug.js
var require_debug = __commonJS({
  "../node_modules/follow-redirects/debug.js"(exports, module) {
    var debug;
    module.exports = function() {
      if (!debug) {
        try {
          debug = require_src()("follow-redirects");
        } catch (error) {
        }
        if (typeof debug !== "function") {
          debug = function() {
          };
        }
      }
      debug.apply(null, arguments);
    };
  }
});

// ../node_modules/follow-redirects/index.js
var require_follow_redirects = __commonJS({
  "../node_modules/follow-redirects/index.js"(exports, module) {
    var url2 = __require("url");
    var URL2 = url2.URL;
    var http2 = __require("http");
    var https2 = __require("https");
    var Writable = __require("stream").Writable;
    var assert = __require("assert");
    var debug = require_debug();
    (function detectUnsupportedEnvironment() {
      var looksLikeNode = typeof process !== "undefined";
      var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
      var looksLikeV8 = isFunction2(Error.captureStackTrace);
      if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
        console.warn("The follow-redirects package should be excluded from browser builds.");
      }
    })();
    var useNativeURL = false;
    try {
      assert(new URL2(""));
    } catch (error) {
      useNativeURL = error.code === "ERR_INVALID_URL";
    }
    var preservedUrlFields = [
      "auth",
      "host",
      "hostname",
      "href",
      "path",
      "pathname",
      "port",
      "protocol",
      "query",
      "search",
      "hash"
    ];
    var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
    var eventHandlers = /* @__PURE__ */ Object.create(null);
    events.forEach(function(event) {
      eventHandlers[event] = function(arg1, arg2, arg3) {
        this._redirectable.emit(event, arg1, arg2, arg3);
      };
    });
    var InvalidUrlError = createErrorType(
      "ERR_INVALID_URL",
      "Invalid URL",
      TypeError
    );
    var RedirectionError = createErrorType(
      "ERR_FR_REDIRECTION_FAILURE",
      "Redirected request failed"
    );
    var TooManyRedirectsError = createErrorType(
      "ERR_FR_TOO_MANY_REDIRECTS",
      "Maximum number of redirects exceeded",
      RedirectionError
    );
    var MaxBodyLengthExceededError = createErrorType(
      "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
      "Request body larger than maxBodyLength limit"
    );
    var WriteAfterEndError = createErrorType(
      "ERR_STREAM_WRITE_AFTER_END",
      "write after end"
    );
    var destroy = Writable.prototype.destroy || noop2;
    function RedirectableRequest(options, responseCallback) {
      Writable.call(this);
      this._sanitizeOptions(options);
      this._options = options;
      this._ended = false;
      this._ending = false;
      this._redirectCount = 0;
      this._redirects = [];
      this._requestBodyLength = 0;
      this._requestBodyBuffers = [];
      if (responseCallback) {
        this.on("response", responseCallback);
      }
      var self2 = this;
      this._onNativeResponse = function(response) {
        try {
          self2._processResponse(response);
        } catch (cause) {
          self2.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
        }
      };
      this._performRequest();
    }
    RedirectableRequest.prototype = Object.create(Writable.prototype);
    RedirectableRequest.prototype.abort = function() {
      destroyRequest(this._currentRequest);
      this._currentRequest.abort();
      this.emit("abort");
    };
    RedirectableRequest.prototype.destroy = function(error) {
      destroyRequest(this._currentRequest, error);
      destroy.call(this, error);
      return this;
    };
    RedirectableRequest.prototype.write = function(data, encoding, callback) {
      if (this._ending) {
        throw new WriteAfterEndError();
      }
      if (!isString2(data) && !isBuffer2(data)) {
        throw new TypeError("data should be a string, Buffer or Uint8Array");
      }
      if (isFunction2(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (data.length === 0) {
        if (callback) {
          callback();
        }
        return;
      }
      if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
        this._requestBodyLength += data.length;
        this._requestBodyBuffers.push({ data, encoding });
        this._currentRequest.write(data, encoding, callback);
      } else {
        this.emit("error", new MaxBodyLengthExceededError());
        this.abort();
      }
    };
    RedirectableRequest.prototype.end = function(data, encoding, callback) {
      if (isFunction2(data)) {
        callback = data;
        data = encoding = null;
      } else if (isFunction2(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (!data) {
        this._ended = this._ending = true;
        this._currentRequest.end(null, null, callback);
      } else {
        var self2 = this;
        var currentRequest = this._currentRequest;
        this.write(data, encoding, function() {
          self2._ended = true;
          currentRequest.end(null, null, callback);
        });
        this._ending = true;
      }
    };
    RedirectableRequest.prototype.setHeader = function(name, value) {
      this._options.headers[name] = value;
      this._currentRequest.setHeader(name, value);
    };
    RedirectableRequest.prototype.removeHeader = function(name) {
      delete this._options.headers[name];
      this._currentRequest.removeHeader(name);
    };
    RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
      var self2 = this;
      function destroyOnTimeout(socket) {
        socket.setTimeout(msecs);
        socket.removeListener("timeout", socket.destroy);
        socket.addListener("timeout", socket.destroy);
      }
      function startTimer(socket) {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
        }
        self2._timeout = setTimeout(function() {
          self2.emit("timeout");
          clearTimer();
        }, msecs);
        destroyOnTimeout(socket);
      }
      function clearTimer() {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
          self2._timeout = null;
        }
        self2.removeListener("abort", clearTimer);
        self2.removeListener("error", clearTimer);
        self2.removeListener("response", clearTimer);
        self2.removeListener("close", clearTimer);
        if (callback) {
          self2.removeListener("timeout", callback);
        }
        if (!self2.socket) {
          self2._currentRequest.removeListener("socket", startTimer);
        }
      }
      if (callback) {
        this.on("timeout", callback);
      }
      if (this.socket) {
        startTimer(this.socket);
      } else {
        this._currentRequest.once("socket", startTimer);
      }
      this.on("socket", destroyOnTimeout);
      this.on("abort", clearTimer);
      this.on("error", clearTimer);
      this.on("response", clearTimer);
      this.on("close", clearTimer);
      return this;
    };
    [
      "flushHeaders",
      "getHeader",
      "setNoDelay",
      "setSocketKeepAlive"
    ].forEach(function(method) {
      RedirectableRequest.prototype[method] = function(a, b) {
        return this._currentRequest[method](a, b);
      };
    });
    ["aborted", "connection", "socket"].forEach(function(property) {
      Object.defineProperty(RedirectableRequest.prototype, property, {
        get: function() {
          return this._currentRequest[property];
        }
      });
    });
    RedirectableRequest.prototype._sanitizeOptions = function(options) {
      if (!options.headers) {
        options.headers = {};
      }
      if (options.host) {
        if (!options.hostname) {
          options.hostname = options.host;
        }
        delete options.host;
      }
      if (!options.pathname && options.path) {
        var searchPos = options.path.indexOf("?");
        if (searchPos < 0) {
          options.pathname = options.path;
        } else {
          options.pathname = options.path.substring(0, searchPos);
          options.search = options.path.substring(searchPos);
        }
      }
    };
    RedirectableRequest.prototype._performRequest = function() {
      var protocol = this._options.protocol;
      var nativeProtocol = this._options.nativeProtocols[protocol];
      if (!nativeProtocol) {
        throw new TypeError("Unsupported protocol " + protocol);
      }
      if (this._options.agents) {
        var scheme = protocol.slice(0, -1);
        this._options.agent = this._options.agents[scheme];
      }
      var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
      request._redirectable = this;
      for (var event of events) {
        request.on(event, eventHandlers[event]);
      }
      this._currentUrl = /^\//.test(this._options.path) ? url2.format(this._options) : (
        // When making a request to a proxy, […]
        // a client MUST send the target URI in absolute-form […].
        this._options.path
      );
      if (this._isRedirect) {
        var i = 0;
        var self2 = this;
        var buffers = this._requestBodyBuffers;
        (function writeNext(error) {
          if (request === self2._currentRequest) {
            if (error) {
              self2.emit("error", error);
            } else if (i < buffers.length) {
              var buffer = buffers[i++];
              if (!request.finished) {
                request.write(buffer.data, buffer.encoding, writeNext);
              }
            } else if (self2._ended) {
              request.end();
            }
          }
        })();
      }
    };
    RedirectableRequest.prototype._processResponse = function(response) {
      var statusCode = response.statusCode;
      if (this._options.trackRedirects) {
        this._redirects.push({
          url: this._currentUrl,
          headers: response.headers,
          statusCode
        });
      }
      var location = response.headers.location;
      if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
        response.responseUrl = this._currentUrl;
        response.redirects = this._redirects;
        this.emit("response", response);
        this._requestBodyBuffers = [];
        return;
      }
      destroyRequest(this._currentRequest);
      response.destroy();
      if (++this._redirectCount > this._options.maxRedirects) {
        throw new TooManyRedirectsError();
      }
      var requestHeaders;
      var beforeRedirect = this._options.beforeRedirect;
      if (beforeRedirect) {
        requestHeaders = Object.assign({
          // The Host header was set by nativeProtocol.request
          Host: response.req.getHeader("host")
        }, this._options.headers);
      }
      var method = this._options.method;
      if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
      // the server is redirecting the user agent to a different resource […]
      // A user agent can perform a retrieval request targeting that URI
      // (a GET or HEAD request if using HTTP) […]
      statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
        this._options.method = "GET";
        this._requestBodyBuffers = [];
        removeMatchingHeaders(/^content-/i, this._options.headers);
      }
      var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
      var currentUrlParts = parseUrl(this._currentUrl);
      var currentHost = currentHostHeader || currentUrlParts.host;
      var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url2.format(Object.assign(currentUrlParts, { host: currentHost }));
      var redirectUrl = resolveUrl(location, currentUrl);
      debug("redirecting to", redirectUrl.href);
      this._isRedirect = true;
      spreadUrlObject(redirectUrl, this._options);
      if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
        removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers);
      }
      if (isFunction2(beforeRedirect)) {
        var responseDetails = {
          headers: response.headers,
          statusCode
        };
        var requestDetails = {
          url: currentUrl,
          method,
          headers: requestHeaders
        };
        beforeRedirect(this._options, responseDetails, requestDetails);
        this._sanitizeOptions(this._options);
      }
      this._performRequest();
    };
    function wrap(protocols) {
      var exports2 = {
        maxRedirects: 21,
        maxBodyLength: 10 * 1024 * 1024
      };
      var nativeProtocols = {};
      Object.keys(protocols).forEach(function(scheme) {
        var protocol = scheme + ":";
        var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
        var wrappedProtocol = exports2[scheme] = Object.create(nativeProtocol);
        function request(input, options, callback) {
          if (isURL(input)) {
            input = spreadUrlObject(input);
          } else if (isString2(input)) {
            input = spreadUrlObject(parseUrl(input));
          } else {
            callback = options;
            options = validateUrl(input);
            input = { protocol };
          }
          if (isFunction2(options)) {
            callback = options;
            options = null;
          }
          options = Object.assign({
            maxRedirects: exports2.maxRedirects,
            maxBodyLength: exports2.maxBodyLength
          }, input, options);
          options.nativeProtocols = nativeProtocols;
          if (!isString2(options.host) && !isString2(options.hostname)) {
            options.hostname = "::1";
          }
          assert.equal(options.protocol, protocol, "protocol mismatch");
          debug("options", options);
          return new RedirectableRequest(options, callback);
        }
        function get(input, options, callback) {
          var wrappedRequest = wrappedProtocol.request(input, options, callback);
          wrappedRequest.end();
          return wrappedRequest;
        }
        Object.defineProperties(wrappedProtocol, {
          request: { value: request, configurable: true, enumerable: true, writable: true },
          get: { value: get, configurable: true, enumerable: true, writable: true }
        });
      });
      return exports2;
    }
    function noop2() {
    }
    function parseUrl(input) {
      var parsed;
      if (useNativeURL) {
        parsed = new URL2(input);
      } else {
        parsed = validateUrl(url2.parse(input));
        if (!isString2(parsed.protocol)) {
          throw new InvalidUrlError({ input });
        }
      }
      return parsed;
    }
    function resolveUrl(relative, base) {
      return useNativeURL ? new URL2(relative, base) : parseUrl(url2.resolve(base, relative));
    }
    function validateUrl(input) {
      if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      return input;
    }
    function spreadUrlObject(urlObject, target) {
      var spread3 = target || {};
      for (var key of preservedUrlFields) {
        spread3[key] = urlObject[key];
      }
      if (spread3.hostname.startsWith("[")) {
        spread3.hostname = spread3.hostname.slice(1, -1);
      }
      if (spread3.port !== "") {
        spread3.port = Number(spread3.port);
      }
      spread3.path = spread3.search ? spread3.pathname + spread3.search : spread3.pathname;
      return spread3;
    }
    function removeMatchingHeaders(regex, headers) {
      var lastValue;
      for (var header in headers) {
        if (regex.test(header)) {
          lastValue = headers[header];
          delete headers[header];
        }
      }
      return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
    }
    function createErrorType(code, message, baseClass) {
      function CustomError(properties) {
        if (isFunction2(Error.captureStackTrace)) {
          Error.captureStackTrace(this, this.constructor);
        }
        Object.assign(this, properties || {});
        this.code = code;
        this.message = this.cause ? message + ": " + this.cause.message : message;
      }
      CustomError.prototype = new (baseClass || Error)();
      Object.defineProperties(CustomError.prototype, {
        constructor: {
          value: CustomError,
          enumerable: false
        },
        name: {
          value: "Error [" + code + "]",
          enumerable: false
        }
      });
      return CustomError;
    }
    function destroyRequest(request, error) {
      for (var event of events) {
        request.removeListener(event, eventHandlers[event]);
      }
      request.on("error", noop2);
      request.destroy(error);
    }
    function isSubdomain(subdomain, domain) {
      assert(isString2(subdomain) && isString2(domain));
      var dot = subdomain.length - domain.length - 1;
      return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
    }
    function isString2(value) {
      return typeof value === "string" || value instanceof String;
    }
    function isFunction2(value) {
      return typeof value === "function";
    }
    function isBuffer2(value) {
      return typeof value === "object" && "length" in value;
    }
    function isURL(value) {
      return URL2 && value instanceof URL2;
    }
    module.exports = wrap({ http: http2, https: https2 });
    module.exports.wrap = wrap;
  }
});

// src/index.ts
import { elizaLogger as elizaLogger42 } from "@elizaos/core";

// src/config/env.ts
import { z } from "zod";
var envSchema = z.object({
  POSTGRES_URL: z.string().url(),
  TWITTER_USERNAME: z.string().min(1),
  TWITTER_PASSWORD: z.string().min(1),
  TWITTER_EMAIL: z.string().email(),
  TWITTER_DRY_RUN: z.string().min(1),
  TWITTER_TARGET_USERS: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  TWITTER_POLL_INTERVAL: z.string().transform((val) => Number.parseInt(val)),
  SEARCH_TIMEFRAME_HOURS: z.string().transform((val) => Number.parseInt(val)).default("24"),
  SEARCH_PREFERRED_TOPIC: z.string().min(1).default("crypto"),
  INJECTIVE_ENABLED: z.string().transform((val) => val === "true")
});
function getEnv() {
  const envParse = envSchema.safeParse({
    POSTGRES_URL: process.env.POSTGRES_URL,
    TWITTER_USERNAME: process.env.TWITTER_USERNAME,
    TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
    TWITTER_EMAIL: process.env.TWITTER_EMAIL,
    TWITTER_DRY_RUN: process.env.TWITTER_DRY_RUN,
    TWITTER_TARGET_USERS: process.env.TWITTER_TARGET_USERS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TWITTER_POLL_INTERVAL: process.env.TWITTER_POLL_INTERVAL,
    SEARCH_TIMEFRAME_HOURS: process.env.SEARCH_TIMEFRAME_HOURS,
    SEARCH_PREFERRED_TOPIC: process.env.SEARCH_PREFERRED_TOPIC,
    INJECTIVE_ENABLED: process.env.INJECTIVE_ENABLED
  });
  if (!envParse.success) {
    console.error(
      "\u274C Invalid environment variables:",
      envParse.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment variables");
  }
  return envParse.data;
}

// src/eliza/index.ts
import {
  AgentRuntime,
  elizaLogger as elizaLogger41,
  settings as settings2,
  stringToUuid as stringToUuid7
} from "@elizaos/core";

// src/bork-protocol/extensions/src/db/index.ts
var import_pg = __toESM(require_lib2(), 1);
import { elizaLogger as elizaLogger2 } from "@elizaos/core";

// src/bork-protocol/extensions/src/db/queries.ts
import { elizaLogger, stringToUuid } from "@elizaos/core";

// ../node_modules/uuid/dist/esm/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// ../node_modules/uuid/dist/esm/rng.js
import { randomFillSync } from "crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// ../node_modules/uuid/dist/esm/native.js
import { randomUUID } from "crypto";
var native_default = { randomUUID };

// ../node_modules/uuid/dist/esm/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// src/bork-protocol/extensions/src/db/queries.ts
async function withTransaction(fn) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function withClient(clientOrNull, fn) {
  if (clientOrNull) {
    return fn(clientOrNull);
  }
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
var yapsQueries = {
  async upsertYapsData(data) {
    const query = `
      INSERT INTO yaps (
        user_id,
        username,
        yaps_all,
        yaps_l24h,
        yaps_l48h,
        yaps_l7d,
        yaps_l30d,
        yaps_l3m,
        yaps_l6m,
        yaps_l12m,
        last_updated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        yaps_all = EXCLUDED.yaps_all,
        yaps_l24h = EXCLUDED.yaps_l24h,
        yaps_l48h = EXCLUDED.yaps_l48h,
        yaps_l7d = EXCLUDED.yaps_l7d,
        yaps_l30d = EXCLUDED.yaps_l30d,
        yaps_l3m = EXCLUDED.yaps_l3m,
        yaps_l6m = EXCLUDED.yaps_l6m,
        yaps_l12m = EXCLUDED.yaps_l12m,
        last_updated = EXCLUDED.last_updated
    `;
    await db.query(query, [
      data.userId,
      data.username,
      data.yapsAll,
      data.yapsL24h,
      data.yapsL48h,
      data.yapsL7d,
      data.yapsL30d,
      data.yapsL3m,
      data.yapsL6m,
      data.yapsL12m,
      data.lastUpdated
    ]);
  },
  async getYapsData(userId) {
    const query = `
      SELECT *
      FROM yaps
      WHERE user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  },
  async getYapsForAccounts(userIds) {
    const query = `
      SELECT *
      FROM yaps
      WHERE user_id = ANY($1)
    `;
    const result = await db.query(query, [userIds]);
    return result.rows;
  }
};
var tweetQueries = {
  getPendingTweets: async (client) => {
    try {
      return withClient(client || null, async (c) => {
        const { rows } = await c.query(
          "SELECT * FROM tweets WHERE status = $1 ORDER BY created_at DESC",
          ["pending"]
        );
        return rows;
      });
    } catch (error) {
      elizaLogger.error("Error fetching pending tweets:", error);
      throw error;
    }
  },
  getSentTweets: async (agentId, limit, client) => {
    return withClient(client || null, async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM tweets WHERE agent_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3",
        [agentId, "sent", limit]
      );
      return rows;
    });
  },
  getTweets: async (limit, offset, client) => {
    return withClient(client || null, async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM tweets ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      );
      return rows;
    });
  },
  updateTweetStatus: async (tweet_id, status, error, client) => {
    try {
      return withClient(client || null, async (c) => {
        await c.query(
          "UPDATE tweets SET status = $1, error = $2 WHERE tweet_id = $3",
          [status, error, tweet_id]
        );
      });
    } catch (error2) {
      elizaLogger.error("Error updating tweet status:", error2);
      throw error2;
    }
  },
  saveTweetObject: async (tweet, client) => {
    const query = `
      INSERT INTO tweets (
        id, tweet_id, agent_id, text, user_id, username, name, timestamp, time_parsed,
        likes, retweets, replies, views, bookmark_count,
        conversation_id, permanent_url, html,
        in_reply_to_status, in_reply_to_status_id,
        quoted_status, quoted_status_id,
        retweeted_status, retweeted_status_id,
        thread,
        is_quoted, is_pin, is_reply, is_retweet, is_self_thread, sensitive_content,
        is_thread_merged, thread_size, original_text,
        media_type, media_url,
        hashtags, mentions, photos, urls, videos,
        place, poll,
        home_timeline,
        status, created_at, scheduled_for, sent_at,
        error, prompt, new_tweet_content
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19,
        $20, $21,
        $22, $23,
        $24,
        $25, $26, $27, $28, $29, $30,
        $31, $32, $33,
        $34, $35,
        $36, $37, $38, $39, $40,
        $41, $42,
        $43,
        $44, $45, $46, $47,
        $48, $49, $50
      )
      ON CONFLICT (tweet_id) DO UPDATE SET
        text = EXCLUDED.text,
        user_id = EXCLUDED.user_id,
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        timestamp = EXCLUDED.timestamp,
        time_parsed = EXCLUDED.time_parsed,
        likes = EXCLUDED.likes,
        retweets = EXCLUDED.retweets,
        replies = EXCLUDED.replies,
        views = EXCLUDED.views,
        bookmark_count = EXCLUDED.bookmark_count,
        conversation_id = EXCLUDED.conversation_id,
        permanent_url = EXCLUDED.permanent_url,
        html = EXCLUDED.html,
        in_reply_to_status = EXCLUDED.in_reply_to_status,
        in_reply_to_status_id = EXCLUDED.in_reply_to_status_id,
        quoted_status = EXCLUDED.quoted_status,
        quoted_status_id = EXCLUDED.quoted_status_id,
        retweeted_status = EXCLUDED.retweeted_status,
        retweeted_status_id = EXCLUDED.retweeted_status_id,
        thread = EXCLUDED.thread,
        is_quoted = EXCLUDED.is_quoted,
        is_pin = EXCLUDED.is_pin,
        is_reply = EXCLUDED.is_reply,
        is_retweet = EXCLUDED.is_retweet,
        is_self_thread = EXCLUDED.is_self_thread,
        sensitive_content = EXCLUDED.sensitive_content,
        is_thread_merged = EXCLUDED.is_thread_merged,
        thread_size = EXCLUDED.thread_size,
        original_text = EXCLUDED.original_text,
        media_type = EXCLUDED.media_type,
        media_url = EXCLUDED.media_url,
        hashtags = EXCLUDED.hashtags,
        mentions = EXCLUDED.mentions,
        photos = EXCLUDED.photos,
        urls = EXCLUDED.urls,
        videos = EXCLUDED.videos,
        place = EXCLUDED.place,
        poll = EXCLUDED.poll,
        home_timeline = EXCLUDED.home_timeline,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at,
        scheduled_for = EXCLUDED.scheduled_for,
        sent_at = EXCLUDED.sent_at,
        error = EXCLUDED.error,
        prompt = EXCLUDED.prompt,
        new_tweet_content = EXCLUDED.new_tweet_content
    `;
    const values = [
      tweet.id || v4_default(),
      tweet.tweet_id,
      tweet.agentId,
      tweet.text,
      tweet.userId,
      tweet.username,
      tweet.name,
      tweet.timestamp,
      tweet.timeParsed,
      tweet.likes || 0,
      tweet.retweets || 0,
      tweet.replies || 0,
      tweet.views,
      tweet.bookmarkCount,
      tweet.conversationId,
      tweet.permanentUrl,
      tweet.html,
      tweet.inReplyToStatus ? JSON.stringify(tweet.inReplyToStatus) : null,
      tweet.inReplyToStatusId,
      tweet.quotedStatus ? JSON.stringify(tweet.quotedStatus) : null,
      tweet.quotedStatusId,
      tweet.retweetedStatus ? JSON.stringify(tweet.retweetedStatus) : null,
      tweet.retweetedStatusId,
      JSON.stringify(tweet.thread || []),
      tweet.isQuoted || false,
      tweet.isPin || false,
      tweet.isReply || false,
      tweet.isRetweet || false,
      tweet.isSelfThread || false,
      tweet.sensitiveContent || false,
      tweet.isThreadMerged || false,
      tweet.threadSize || 0,
      tweet.originalText,
      tweet.mediaType,
      tweet.mediaUrl,
      tweet.hashtags || [],
      JSON.stringify(tweet.mentions || []),
      JSON.stringify(tweet.photos || []),
      tweet.urls || [],
      JSON.stringify(tweet.videos || []),
      tweet.place ? JSON.stringify(tweet.place) : null,
      tweet.poll ? JSON.stringify(tweet.poll) : null,
      JSON.stringify(tweet.homeTimeline || { publicMetrics: {}, entities: {} }),
      tweet.status || "pending",
      tweet.createdAt || /* @__PURE__ */ new Date(),
      tweet.scheduledFor,
      tweet.sentAt,
      tweet.error,
      tweet.prompt,
      tweet.newTweetContent
    ];
    try {
      return withClient(client || null, async (c) => {
        await c.query(query, values);
      });
    } catch (error) {
      elizaLogger.error("Error saving tweet:", {
        error: error instanceof Error ? error.message : String(error),
        tweetId: tweet.tweet_id,
        userId: tweet.userId
      });
      throw error;
    }
  },
  saveTweet: async (text, agentId, scheduledFor, newTweetContent, client) => {
    const id = v4_default();
    const twitterId = v4_default();
    const tweet = {
      // Our primary key
      id,
      // AgentTweet fields
      tweet_id: twitterId,
      text,
      hashtags: [],
      mentions: [],
      photos: [],
      urls: [],
      likes: 0,
      replies: 0,
      retweets: 0,
      isQuoted: false,
      isPin: false,
      isReply: false,
      isRetweet: false,
      isSelfThread: false,
      sensitiveContent: false,
      timestamp: Math.floor(Date.now() / 1e3),
      thread: [],
      // Required by AgentTweet
      videos: [],
      // Required by AgentTweet
      userId: agentId,
      // Use agentId as userId for now
      username: "",
      // Will be updated later
      name: "",
      // Will be updated later
      conversationId: twitterId,
      // Same as tweet_id for new tweets
      permanentUrl: `https://twitter.com/unknown/status/${twitterId}`,
      // Will be updated later
      // Our additional fields
      status: "pending",
      createdAt: /* @__PURE__ */ new Date(),
      agentId,
      mediaType: "text",
      scheduledFor,
      newTweetContent,
      isThreadMerged: false,
      threadSize: 0,
      originalText: text,
      homeTimeline: {
        publicMetrics: {
          likes: 0,
          retweets: 0,
          replies: 0
        },
        entities: {
          hashtags: [],
          mentions: [],
          urls: []
        }
      }
    };
    try {
      await tweetQueries.saveTweetObject(tweet, client);
      return tweet;
    } catch (error) {
      elizaLogger.error("Error saving tweet:", error);
      throw error;
    }
  },
  getApprovedTweets: async (client) => {
    try {
      return withClient(client || null, async (c) => {
        const { rows } = await c.query(
          "SELECT * FROM tweets WHERE status = $1 AND (scheduled_for IS NULL OR scheduled_for <= NOW()) ORDER BY created_at DESC",
          ["approved"]
        );
        return rows;
      });
    } catch (error) {
      elizaLogger.error("Error fetching approved tweets:", error);
      throw error;
    }
  },
  markTweetAsSent: async (id, client) => {
    try {
      return withClient(client || null, async (c) => {
        await c.query(
          "UPDATE tweets SET status = $1, sent_at = NOW() WHERE id = $2",
          ["sent", id]
        );
      });
    } catch (error) {
      elizaLogger.error("Error marking tweet as sent:", error);
      throw error;
    }
  },
  markTweetAsError: async (id, error, client) => {
    try {
      return withClient(client || null, async (c) => {
        await c.query(
          "UPDATE tweets SET status = $1, error = $2 WHERE id = $3",
          ["error", error, id]
        );
      });
    } catch (error2) {
      elizaLogger.error("Error marking tweet as error:", error2);
      throw error2;
    }
  },
  getSentTweetById: async (id, client) => {
    try {
      return withClient(client || null, async (c) => {
        const { rows } = await c.query(
          "SELECT * FROM tweets WHERE id = $1 AND status = $2",
          [id, "sent"]
        );
        return rows;
      });
    } catch (error) {
      elizaLogger.error("Error fetching sent tweet:", error);
      throw error;
    }
  },
  updateTweetsAsSending: async (ids, client) => {
    return withClient(client || null, async (c) => {
      await c.query("UPDATE tweets SET status = $1 WHERE id = ANY($2)", [
        "sending",
        ids
      ]);
    });
  },
  insertTweetAnalysis: async (id, tweet_id, type, sentiment, confidence, metrics, entities, topics, impact_score, created_at, author_id, tweet_text, public_metrics, raw_entities, spam_analysis, content_metrics, format, marketing_insights, client) => {
    try {
      const query = `
        INSERT INTO tweet_analysis (
          id,
          tweet_id,
          type,
          format,
          sentiment,
          confidence,
          metrics,
          entities,
          topics,
          impact_score,
          created_at,
          author_id,
          tweet_text,
          public_metrics,
          raw_entities,
          spam_score,
          spam_reasons,
          is_spam,
          linguistic_risk,
          topic_mismatch,
          engagement_anomaly,
          promotional_intent,
          account_trust_signals,
          content_relevance,
          content_quality,
          content_engagement,
          content_authenticity,
          content_value_add,
          call_to_action_effectiveness,
          trend_alignment_score,
          marketing_insights
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        )
        ON CONFLICT (tweet_id) DO UPDATE SET
          type = EXCLUDED.type,
          format = EXCLUDED.format,
          sentiment = EXCLUDED.sentiment,
          confidence = EXCLUDED.confidence,
          metrics = EXCLUDED.metrics,
          entities = EXCLUDED.entities,
          topics = EXCLUDED.topics,
          impact_score = EXCLUDED.impact_score,
          created_at = EXCLUDED.created_at,
          author_id = EXCLUDED.author_id,
          tweet_text = EXCLUDED.tweet_text,
          public_metrics = EXCLUDED.public_metrics,
          raw_entities = EXCLUDED.raw_entities,
          spam_score = EXCLUDED.spam_score,
          spam_reasons = EXCLUDED.spam_reasons,
          is_spam = EXCLUDED.is_spam,
          linguistic_risk = EXCLUDED.linguistic_risk,
          topic_mismatch = EXCLUDED.topic_mismatch,
          engagement_anomaly = EXCLUDED.engagement_anomaly,
          promotional_intent = EXCLUDED.promotional_intent,
          account_trust_signals = EXCLUDED.account_trust_signals,
          content_relevance = EXCLUDED.content_relevance,
          content_quality = EXCLUDED.content_quality,
          content_engagement = EXCLUDED.content_engagement,
          content_authenticity = EXCLUDED.content_authenticity,
          content_value_add = EXCLUDED.content_value_add,
          call_to_action_effectiveness = EXCLUDED.call_to_action_effectiveness,
          trend_alignment_score = EXCLUDED.trend_alignment_score,
          marketing_insights = EXCLUDED.marketing_insights`;
      const values = [
        id,
        tweet_id,
        type,
        format,
        sentiment,
        confidence,
        JSON.stringify(metrics),
        JSON.stringify(entities),
        JSON.stringify(topics),
        impact_score,
        created_at,
        author_id,
        tweet_text,
        JSON.stringify(public_metrics),
        JSON.stringify(raw_entities),
        spam_analysis.spamScore,
        JSON.stringify(spam_analysis.reasons),
        spam_analysis.isSpam,
        spam_analysis.confidenceMetrics.linguisticRisk,
        spam_analysis.confidenceMetrics.topicMismatch,
        spam_analysis.confidenceMetrics.engagementAnomaly,
        spam_analysis.confidenceMetrics.promotionalIntent,
        spam_analysis.confidenceMetrics.accountTrustSignals,
        content_metrics.relevance,
        content_metrics.quality,
        content_metrics.engagement,
        content_metrics.authenticity,
        content_metrics.valueAdd,
        content_metrics.callToActionEffectiveness || 0,
        content_metrics.trendAlignmentScore || 0,
        marketing_insights ? JSON.stringify(marketing_insights) : null
      ];
      return withClient(client || null, async (c) => {
        await c.query(query, values);
      });
    } catch (error) {
      elizaLogger.error("[DB Queries] Error inserting tweet analysis:", {
        error: error instanceof Error ? error.message : String(error),
        id: id.toString(),
        tweet_id,
        author_id
      });
      throw error;
    }
  },
  insertMarketMetrics: async (metrics) => {
    try {
      await db.query(
        "INSERT INTO market_metrics (metrics, timestamp) VALUES ($1, NOW())",
        [JSON.stringify(metrics)]
      );
    } catch (error) {
      elizaLogger.error("Error inserting market metrics:", error);
      throw error;
    }
  },
  getSpamUser: async (userId) => {
    try {
      const { rows } = await db.query(
        "SELECT * FROM spam_users WHERE user_id = $1",
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      elizaLogger.error("Error fetching spam user:", error);
      throw error;
    }
  },
  updateSpamUser: async (userId, spamScore, violations) => {
    try {
      const now = /* @__PURE__ */ new Date();
      await db.query(
        `INSERT INTO spam_users (
          user_id, spam_score, last_tweet_date, tweet_count, violations, updated_at
        ) VALUES ($1, $2, $3, 1, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          spam_score = $2,
          last_tweet_date = $3,
          tweet_count = spam_users.tweet_count + 1,
          violations = spam_users.violations || $4,
          updated_at = $5`,
        [userId, spamScore, now, JSON.stringify(violations), now]
      );
    } catch (error) {
      elizaLogger.error("Error updating spam user:", error);
      throw error;
    }
  },
  getTopicWeights: async () => {
    const result = await db.query(
      "SELECT * FROM topic_weights ORDER BY weight DESC"
    );
    return result.rows;
  },
  updateTopicWeight: async (topic, weight, impactScore, seedWeight) => {
    await db.query(
      `INSERT INTO topic_weights (topic, weight, impact_score, last_updated, seed_weight)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
       ON CONFLICT (topic) 
       DO UPDATE SET 
         weight = $2,
         impact_score = $3,
         last_updated = CURRENT_TIMESTAMP`,
      [topic, weight, impactScore, seedWeight]
    );
  },
  initializeTopicWeights: async (topics) => {
    const seedWeights = topics.map((topic) => ({
      topic,
      weight: 0.5,
      impactScore: 0.5,
      seedWeight: 0.5
    }));
    await Promise.all(
      seedWeights.map(
        ({ topic, weight, impactScore, seedWeight }) => tweetQueries.updateTopicWeight(topic, weight, impactScore, seedWeight)
      )
    );
  },
  async getTargetAccounts() {
    const query = `
      SELECT * FROM target_accounts 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    return result.rows.map((row) => ({
      username: row.username,
      userId: row.user_id,
      displayName: row.display_name,
      description: row.description,
      followersCount: row.followers_count,
      followingCount: row.following_count,
      friendsCount: row.friends_count,
      mediaCount: row.media_count,
      statusesCount: row.statuses_count,
      likesCount: row.likes_count,
      listedCount: row.listed_count,
      tweetsCount: row.tweets_count,
      isPrivate: row.is_private,
      isVerified: row.is_verified,
      isBlueVerified: row.is_blue_verified,
      joinedAt: row.joined_at,
      location: row.location || "",
      avatarUrl: row.avatar_url,
      bannerUrl: row.banner_url,
      websiteUrl: row.website_url,
      canDm: row.can_dm,
      createdAt: row.created_at,
      lastUpdated: row.last_updated,
      isActive: row.is_active,
      source: row.source,
      avgLikes50: row.avg_likes_50 || 0,
      avgRetweets50: row.avg_retweets_50 || 0,
      avgReplies50: row.avg_replies_50 || 0,
      avgViews50: row.avg_views_50 || 0,
      engagementRate50: row.engagement_rate_50 || 0,
      influenceScore: row.influence_score || 0,
      last50TweetsUpdatedAt: row.last_50_tweets_updated_at || null
    }));
  },
  async insertTargetAccount(account) {
    const query = `
      INSERT INTO target_accounts (
        username,
        user_id,
        display_name,
        description,
        followers_count,
        following_count,
        friends_count,
        media_count,
        statuses_count,
        likes_count,
        listed_count,
        tweets_count,
        is_private,
        is_verified,
        is_blue_verified,
        joined_at,
        location,
        avatar_url,
        banner_url,
        website_url,
        can_dm,
        created_at,
        last_updated,
        is_active,
        source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (username) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        followers_count = EXCLUDED.followers_count,
        following_count = EXCLUDED.following_count,
        friends_count = EXCLUDED.friends_count,
        media_count = EXCLUDED.media_count,
        statuses_count = EXCLUDED.statuses_count,
        likes_count = EXCLUDED.likes_count,
        listed_count = EXCLUDED.listed_count,
        tweets_count = EXCLUDED.tweets_count,
        is_private = EXCLUDED.is_private,
        is_verified = EXCLUDED.is_verified,
        is_blue_verified = EXCLUDED.is_blue_verified,
        joined_at = EXCLUDED.joined_at,
        location = EXCLUDED.location,
        avatar_url = EXCLUDED.avatar_url,
        banner_url = EXCLUDED.banner_url,
        website_url = EXCLUDED.website_url,
        can_dm = EXCLUDED.can_dm,
        created_at = EXCLUDED.created_at,
        last_updated = EXCLUDED.last_updated,
        is_active = EXCLUDED.is_active,
        source = EXCLUDED.source
    `;
    await db.query(query, [
      account.username,
      account.userId,
      account.displayName,
      account.description,
      account.followersCount,
      account.followingCount,
      account.friendsCount,
      account.mediaCount,
      account.statusesCount,
      account.likesCount,
      account.listedCount,
      account.tweetsCount,
      account.isPrivate,
      account.isVerified,
      account.isBlueVerified,
      account.joinedAt,
      account.location,
      account.avatarUrl,
      account.bannerUrl,
      account.websiteUrl,
      account.canDm,
      account.createdAt,
      account.lastUpdated,
      account.isActive,
      account.source
    ]);
  },
  findTweetByTweetId: async (tweet_id, client) => {
    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(
          "SELECT * FROM tweets WHERE tweet_id = $1 LIMIT 1",
          [tweet_id]
        );
        return result.rows[0] || null;
      });
    } catch (error) {
      elizaLogger.error(
        `[Tweet Queries] Error finding tweet by tweet ID: ${error}`
      );
      throw error;
    }
  },
  findTweetById: async (id, client) => {
    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(
          "SELECT * FROM tweets WHERE id = $1 LIMIT 1",
          [id]
        );
        return result.rows[0] || null;
      });
    } catch (error) {
      elizaLogger.error(`[Tweet Queries] Error finding tweet by ID: ${error}`);
      throw error;
    }
  },
  updateTargetAccountMetrics: async (username, metrics) => {
    const query = `
      UPDATE target_accounts
      SET 
        avg_likes_50 = $1,
        avg_retweets_50 = $2,
        avg_replies_50 = $3,
        avg_views_50 = $4,
        last_50_tweets_updated_at = $5,
        influence_score = $6
      WHERE username = $7
    `;
    try {
      await db.query(query, [
        metrics.avgLikes50,
        metrics.avgRetweets50,
        metrics.avgReplies50,
        metrics.avgViews50,
        metrics.last50TweetsUpdatedAt,
        metrics.influenceScore,
        username
      ]);
    } catch (error) {
      elizaLogger.error("Error updating target account metrics:", {
        error: error instanceof Error ? error.message : String(error),
        username
      });
      throw error;
    }
  },
  processTweetsInTransaction: async (operations) => {
    return withTransaction(operations);
  },
  ...yapsQueries,
  /**
   * Get tweets by username
   */
  async getTweetsByUsername(username, limit = 50) {
    const query = `
      SELECT *
      FROM tweets
      WHERE username = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    try {
      elizaLogger.debug(`[DB] Getting tweets for username ${username}`);
      const result = await db.query(query, [username, limit]);
      return result.rows;
    } catch (error) {
      elizaLogger.error(`[DB] Error getting tweets for username ${username}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  },
  /**
   * Creates a new topic weight entry
   */
  async createTopicWeight(topicWeight) {
    const query = `
      INSERT INTO topic_weights (
        id,
        topic,
        weight,
        impact_score,
        created_at,
        engagement_metrics,
        sentiment,
        confidence,
        tweet_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await db.query(query, [
      topicWeight.id,
      topicWeight.topic,
      topicWeight.weight,
      topicWeight.impact_score,
      topicWeight.created_at || /* @__PURE__ */ new Date(),
      JSON.stringify(topicWeight.engagement_metrics),
      topicWeight.sentiment,
      topicWeight.confidence,
      topicWeight.tweet_id
    ]);
  },
  /**
   * Gets recent topic weights within a specified timeframe
   */
  async getRecentTopicWeights(timeframeHours = 24) {
    const query = `
      SELECT *
      FROM topic_weights
      WHERE created_at >= NOW() - INTERVAL '${timeframeHours} hours'
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    return result.rows.map((row) => ({
      ...row,
      engagement_metrics: (
        // TODO Validate this, I believe the logic is wrong here
        typeof row.engagement_metrics === "string" ? JSON.parse(row.engagement_metrics) : row.engagement_metrics
      )
    }));
  },
  /**
   * Gets topic weight trends over time
   */
  async getTopicTrends(timeframeHours = 168, interval = "1 hour") {
    const query = `
      WITH time_buckets AS (
        SELECT
          topic,
          time_bucket('${interval}', created_at) as bucket,
          AVG(weight) as avg_weight,
          SUM(
            (engagement_metrics->>'likes')::numeric +
            (engagement_metrics->>'retweets')::numeric +
            (engagement_metrics->>'replies')::numeric
          ) as total_engagement,
          COUNT(*) as mention_count
        FROM topic_weights
        WHERE created_at >= NOW() - INTERVAL '${timeframeHours} hours'
        GROUP BY topic, bucket
        ORDER BY bucket DESC
      )
      SELECT
        topic,
        bucket as timestamp,
        avg_weight,
        total_engagement,
        mention_count
      FROM time_buckets
      ORDER BY bucket DESC, avg_weight DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },
  /**
   * Gets the top trending topics based on recent engagement and weight
   */
  async getTopTrendingTopics(timeframeHours = 24, limit = 10) {
    const query = `
      WITH recent_metrics AS (
        SELECT
          topic,
          AVG(weight) as avg_weight,
          SUM(
            (engagement_metrics->>'likes')::numeric +
            (engagement_metrics->>'retweets')::numeric +
            (engagement_metrics->>'replies')::numeric
          ) as total_engagement,
          COUNT(*) as mention_count,
          -- Calculate momentum (weight trend over time)
          COALESCE(
            REGR_SLOPE(
              weight,
              EXTRACT(EPOCH FROM created_at)
            ),
            0
          ) as momentum
        FROM topic_weights
        WHERE created_at >= NOW() - INTERVAL '${timeframeHours} hours'
        GROUP BY topic
      )
      SELECT *
      FROM recent_metrics
      ORDER BY (avg_weight * 0.4 + total_engagement * 0.3 + mention_count * 0.1 + momentum * 0.2) DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }
};
var userMentionQueries = {
  upsertMentionRelationship: async (sourceUsername, targetUsername, tweetId, timestamp) => {
    try {
      await db.query(
        `INSERT INTO user_mentions_relationship 
         (source_username, target_username, first_mention_at, last_mention_at, tweet_ids)
         VALUES ($1, $2, $3, $3, ARRAY[$4])
         ON CONFLICT (source_username, target_username) 
         DO UPDATE SET
           mention_count = user_mentions_relationship.mention_count + 1,
           last_mention_at = $3,
           tweet_ids = array_append(user_mentions_relationship.tweet_ids, $4),
           relationship_strength = LEAST(1.0, user_mentions_relationship.relationship_strength + 0.1)`,
        [sourceUsername, targetUsername, timestamp, tweetId]
      );
      const reverseResult = await db.query(
        `SELECT id FROM user_mentions_relationship 
         WHERE source_username = $1 AND target_username = $2`,
        [targetUsername, sourceUsername]
      );
      if (reverseResult.rows.length > 0) {
        await db.query(
          `UPDATE user_mentions_relationship 
           SET is_mutual = true 
           WHERE (source_username = $1 AND target_username = $2)
           OR (source_username = $2 AND target_username = $1)`,
          [sourceUsername, targetUsername]
        );
      }
    } catch (error) {
      elizaLogger.error("Error upserting mention relationship:", error);
      throw error;
    }
  },
  getMutualMentions: async (username) => {
    try {
      const result = await db.query(
        `SELECT target_username as username, relationship_strength as strength
         FROM user_mentions_relationship
         WHERE source_username = $1 AND is_mutual = true
         ORDER BY relationship_strength DESC`,
        [username]
      );
      return result.rows;
    } catch (error) {
      elizaLogger.error("Error getting mutual mentions:", error);
      throw error;
    }
  },
  getStrongRelationships: async (minStrength = 0.5) => {
    try {
      const result = await db.query(
        `SELECT source_username, target_username, relationship_strength as strength
         FROM user_mentions_relationship
         WHERE relationship_strength >= $1
         ORDER BY relationship_strength DESC`,
        [minStrength]
      );
      return result.rows;
    } catch (error) {
      elizaLogger.error("Error getting strong relationships:", error);
      throw error;
    }
  },
  decayRelationships: async () => {
    try {
      await db.query(
        `UPDATE user_mentions_relationship
         SET relationship_strength = GREATEST(0.1, relationship_strength * 0.9)
         WHERE last_mention_at < NOW() - INTERVAL '30 days'`
      );
    } catch (error) {
      elizaLogger.error("Error decaying relationships:", error);
      throw error;
    }
  }
};
var twitterConfigQueries = {
  async getConfig(username) {
    try {
      const result = await db.query(
        "SELECT * FROM twitter_configs WHERE username = $1",
        [username]
      );
      if (result.rows.length === 0) {
        const defaultResult = await db.query(
          "SELECT * FROM twitter_configs WHERE username = $1",
          ["default"]
        );
        if (defaultResult.rows.length === 0) {
          return null;
        }
        const row2 = defaultResult.rows[0];
        return twitterConfigQueries.mapRowToConfig(row2);
      }
      const row = result.rows[0];
      return twitterConfigQueries.mapRowToConfig(row);
    } catch (error) {
      elizaLogger.error(
        "[TwitterConfigQueries] Error fetching config:",
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  },
  async updateConfig(username, config) {
    try {
      const setClauses = [];
      const values = [username];
      let paramCount = 1;
      if (config.targetAccounts) {
        setClauses.push(`target_accounts = $${++paramCount}`);
        values.push(config.targetAccounts);
      }
      if (config.search) {
        if (config.search.maxRetries !== void 0) {
          setClauses.push(`max_retries = $${++paramCount}`);
          values.push(config.search.maxRetries);
        }
        if (config.search.retryDelay !== void 0) {
          setClauses.push(`retry_delay = $${++paramCount}`);
          values.push(config.search.retryDelay);
        }
        if (config.search.searchInterval) {
          if (config.search.searchInterval.min !== void 0) {
            setClauses.push(`search_interval_min = $${++paramCount}`);
            values.push(config.search.searchInterval.min);
          }
          if (config.search.searchInterval.max !== void 0) {
            setClauses.push(`search_interval_max = $${++paramCount}`);
            values.push(config.search.searchInterval.max);
          }
        }
        if (config.search.tweetLimits) {
          if (config.search.tweetLimits.targetAccounts !== void 0) {
            setClauses.push(`tweet_limit_target_accounts = $${++paramCount}`);
            values.push(config.search.tweetLimits.targetAccounts);
          }
          if (config.search.tweetLimits.qualityTweetsPerAccount !== void 0) {
            setClauses.push(
              `tweet_limit_quality_per_account = $${++paramCount}`
            );
            values.push(config.search.tweetLimits.qualityTweetsPerAccount);
          }
          if (config.search.tweetLimits.accountsToProcess !== void 0) {
            setClauses.push(
              `tweet_limit_accounts_to_process = $${++paramCount}`
            );
            values.push(config.search.tweetLimits.accountsToProcess);
          }
          if (config.search.tweetLimits.searchResults !== void 0) {
            setClauses.push(`tweet_limit_search_results = $${++paramCount}`);
            values.push(config.search.tweetLimits.searchResults);
          }
        }
        if (config.search.engagementThresholds) {
          if (config.search.engagementThresholds.minLikes !== void 0) {
            setClauses.push(`min_likes = $${++paramCount}`);
            values.push(config.search.engagementThresholds.minLikes);
          }
          if (config.search.engagementThresholds.minRetweets !== void 0) {
            setClauses.push(`min_retweets = $${++paramCount}`);
            values.push(config.search.engagementThresholds.minRetweets);
          }
          if (config.search.engagementThresholds.minReplies !== void 0) {
            setClauses.push(`min_replies = $${++paramCount}`);
            values.push(config.search.engagementThresholds.minReplies);
          }
        }
        if (config.search.parameters) {
          if (config.search.parameters.excludeReplies !== void 0) {
            setClauses.push(`exclude_replies = $${++paramCount}`);
            values.push(config.search.parameters.excludeReplies);
          }
          if (config.search.parameters.excludeRetweets !== void 0) {
            setClauses.push(`exclude_retweets = $${++paramCount}`);
            values.push(config.search.parameters.excludeRetweets);
          }
          if (config.search.parameters.filterLevel !== void 0) {
            setClauses.push(`filter_level = $${++paramCount}`);
            values.push(config.search.parameters.filterLevel);
          }
        }
      }
      if (setClauses.length === 0) {
        return;
      }
      const query = `
        INSERT INTO twitter_configs (username, ${setClauses.map((_, i) => Object.keys(config)[i]).join(", ")})
        VALUES ($1, ${setClauses.map((_, i) => `$${i + 2}`).join(", ")})
        ON CONFLICT (username) 
        DO UPDATE SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
      `;
      await db.query(query, values);
    } catch (error) {
      elizaLogger.error(
        "[TwitterConfigQueries] Error updating config:",
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  },
  mapRowToConfig(row) {
    return {
      targetAccounts: row.target_accounts,
      search: {
        maxRetries: row.max_retries,
        retryDelay: row.retry_delay,
        searchInterval: {
          min: row.search_interval_min,
          max: row.search_interval_max
        },
        tweetLimits: {
          targetAccounts: row.tweet_limit_target_accounts,
          qualityTweetsPerAccount: row.tweet_limit_quality_per_account,
          accountsToProcess: row.tweet_limit_accounts_to_process,
          searchResults: row.tweet_limit_search_results
        },
        engagementThresholds: {
          minLikes: row.min_likes,
          minRetweets: row.min_retweets,
          minReplies: row.min_replies
        },
        parameters: {
          excludeReplies: Boolean(row.exclude_replies),
          excludeRetweets: Boolean(row.exclude_retweets),
          filterLevel: row.filter_level
        }
      }
    };
  }
};
var accountTopicQueries = {
  /**
   * Upserts a relationship between an account and a topic, incrementing the mention count
   */
  async upsertAccountTopic(username, topic, client) {
    const query = `
      INSERT INTO account_topics (
        username,
        topic,
        mention_count,
        first_seen_at,
        last_seen_at
      ) VALUES ($1, $2, 1, NOW(), NOW())
      ON CONFLICT (username, topic) 
      DO UPDATE SET
        mention_count = account_topics.mention_count + 1,
        last_seen_at = NOW()
    `;
    try {
      return withClient(client || null, async (c) => {
        await c.query(query, [username, topic]);
      });
    } catch (error) {
      elizaLogger.error("Error upserting account topic:", {
        error: error instanceof Error ? error.message : String(error),
        username,
        topic
      });
      throw error;
    }
  },
  /**
   * Gets all topics associated with an account
   */
  async getAccountTopics(username) {
    const query = `
      SELECT 
        topic,
        mention_count as "mentionCount",
        first_seen_at as "firstSeenAt",
        last_seen_at as "lastSeenAt"
      FROM account_topics
      WHERE username = $1
      ORDER BY mention_count DESC
    `;
    try {
      const result = await db.query(query, [username]);
      return result.rows;
    } catch (error) {
      elizaLogger.error("Error getting account topics:", {
        error: error instanceof Error ? error.message : String(error),
        username
      });
      return [];
    }
  },
  /**
   * Gets all accounts associated with a topic
   */
  async getTopicAccounts(topic) {
    const query = `
      SELECT 
        username,
        mention_count as "mentionCount",
        first_seen_at as "firstSeenAt",
        last_seen_at as "lastSeenAt"
      FROM account_topics
      WHERE topic = $1
      ORDER BY mention_count DESC
    `;
    try {
      const result = await db.query(query, [topic]);
      return result.rows;
    } catch (error) {
      elizaLogger.error("Error getting topic accounts:", {
        error: error instanceof Error ? error.message : String(error),
        topic
      });
      return [];
    }
  }
};

// src/bork-protocol/extensions/src/db/index.ts
var DatabaseManager = class _DatabaseManager {
  static instance;
  pool;
  isClosing;
  closePromise;
  closeResolver;
  constructor() {
    this.pool = null;
    this.isClosing = false;
    this.closePromise = null;
    this.closeResolver = null;
    this.initPool();
    this.setupShutdownHandlers();
  }
  /**
   * Get the singleton instance
   */
  static getInstance() {
    if (!_DatabaseManager.instance) {
      _DatabaseManager.instance = new _DatabaseManager();
    }
    return _DatabaseManager.instance;
  }
  /**
   * Initialize the database pool
   */
  initPool() {
    if (!this.pool && !this.isClosing) {
      this.pool = new import_pg.Pool({
        connectionString: getEnv().POSTGRES_URL,
        max: 20,
        idleTimeoutMillis: 3e4,
        connectionTimeoutMillis: 5e3
      });
      this.pool.on("error", (err) => {
        elizaLogger2.error("[DatabaseManager] Unexpected pool error:", err);
      });
      elizaLogger2.info("[DatabaseManager] Database pool initialized");
    }
  }
  /**
   * Set up shutdown handlers
   */
  setupShutdownHandlers() {
    const shutdownHandler = () => {
      this.cleanup().catch((err) => {
        elizaLogger2.error(
          "[DatabaseManager] Unhandled error during pool cleanup:",
          err
        );
      });
    };
    process.once("SIGINT", shutdownHandler);
    process.once("SIGTERM", shutdownHandler);
    process.once("beforeExit", shutdownHandler);
  }
  /**
   * Get the database pool
   */
  getPool() {
    if (!this.pool) {
      this.initPool();
    }
    if (!this.pool) {
      throw new Error("Failed to initialize database pool");
    }
    return this.pool;
  }
  /**
   * Clean up the database pool
   */
  async cleanup() {
    if (this.isClosing && this.closePromise) {
      return this.closePromise;
    }
    if (!this.pool) {
      return Promise.resolve();
    }
    this.isClosing = true;
    this.closePromise = new Promise((resolve) => {
      this.closeResolver = resolve;
    });
    try {
      elizaLogger2.info("[DatabaseManager] Closing database pool...");
      const timeoutId = setTimeout(() => {
        elizaLogger2.error(
          "[DatabaseManager] Pool end timeout - forcing cleanup"
        );
        this.pool = null;
        if (this.closeResolver) {
          this.closeResolver();
        }
      }, 3e3);
      await this.pool.end();
      clearTimeout(timeoutId);
      elizaLogger2.info("[DatabaseManager] Database pool closed successfully");
      this.pool = null;
      if (this.closeResolver) {
        this.closeResolver();
      }
    } catch (error) {
      elizaLogger2.error(
        "[DatabaseManager] Error closing database pool:",
        error
      );
      this.pool = null;
      if (this.closeResolver) {
        this.closeResolver();
      }
    }
    return this.closePromise;
  }
};
var dbManager = DatabaseManager.getInstance();
var db = dbManager.getPool();
var cleanupPool = () => dbManager.cleanup();

// src/bork-protocol/services/injective/database-service.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";
var DatabaseService = class {
  runtime;
  constructor(runtime) {
    this.runtime = runtime;
  }
  async storeMarketAnalysis(analyses) {
    try {
      elizaLogger3.info("[DatabaseService] Storing market analysis data");
      for (const analysis of analyses) {
        await db.query(
          `INSERT INTO market_analysis (
            market_id,
            ticker,
            technical_analysis,
            order_book,
            liquidity,
            created_at,
            timeframe
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            analysis.marketId,
            analysis.ticker,
            JSON.stringify(analysis.technicalAnalysis),
            JSON.stringify(analysis.orderBook),
            JSON.stringify(analysis.liquidity),
            (/* @__PURE__ */ new Date()).toISOString(),
            analysis.timeframe
          ]
        );
      }
      elizaLogger3.info(
        "[DatabaseService] Market analysis data stored successfully"
      );
    } catch (error) {
      elizaLogger3.error(
        "[DatabaseService] Error storing market analysis:",
        error
      );
      throw error;
    }
  }
};

// src/bork-protocol/types/injective/market-history.ts
import { z as z2 } from "zod";
var MarketHistoryItemSchema = z2.object({
  timestamp: z2.number(),
  open: z2.string(),
  high: z2.string(),
  low: z2.string(),
  close: z2.string(),
  volume: z2.string()
});
var MarketHistoryResponseSchema = z2.object({
  marketId: z2.string(),
  history: z2.array(MarketHistoryItemSchema)
});
var TimeResolution = {
  Minute: "1",
  FiveMinutes: "5",
  FifteenMinutes: "15",
  Hour: "60",
  Day: "1440",
  // 24 * 60 minutes
  Week: "10080"
  // 7 * 24 * 60 minutes
};

// src/bork-protocol/services/injective/injective-service.ts
import { Network, getNetworkEndpoints } from "@injectivelabs/networks";
import {
  IndexerGrpcSpotApi,
  IndexerRestMarketChronosApi
} from "@injectivelabs/sdk-ts";
var InjectiveService = class {
  marketChronosApi;
  spotApi;
  constructor(network = Network.Mainnet) {
    const endpoints = getNetworkEndpoints(network);
    this.marketChronosApi = new IndexerRestMarketChronosApi(
      `${endpoints.chronos}/api/chronos/v1/market`
    );
    this.spotApi = new IndexerGrpcSpotApi(endpoints.indexer);
  }
  /**
   * Fetches all available spot markets
   * @returns Promise containing market data
   */
  async getMarkets() {
    try {
      const markets = await this.spotApi.fetchMarkets();
      return markets;
    } catch (error) {
      console.error("Failed to fetch markets:", error);
      throw new Error("Failed to fetch markets");
    }
  }
  /**
   * Fetches market history for specified markets
   * @param marketIds Array of market IDs to fetch history for
   * @param resolution Time resolution for the history data
   * @param countback Number of historical data points to fetch (in hours)
   * @returns Promise containing market history data
   */
  async getMarketsHistory(marketIds, resolution = TimeResolution.Hour, countback = 24) {
    try {
      const marketsHistory = await this.marketChronosApi.fetchMarketsHistory({
        marketIds,
        resolution,
        countback
      });
      return marketIds.map((marketId) => {
        const marketHistory = marketsHistory.find((item) => item.marketID === marketId);
        if (!marketHistory) {
          return { marketId, history: [] };
        }
        const history = marketHistory.t.map(
          (timestamp, index) => ({
            timestamp,
            open: marketHistory.o[index].toString(),
            high: marketHistory.h[index].toString(),
            low: marketHistory.l[index].toString(),
            close: marketHistory.c[index].toString(),
            volume: marketHistory.v[index].toString()
          })
        );
        return { marketId, history };
      });
    } catch (error) {
      console.error("Failed to fetch markets history:", error);
      throw error;
    }
  }
};
var injectiveService = new InjectiveService();

// src/bork-protocol/services/injective/market-analysis-service.ts
import { Network as Network2, getNetworkEndpoints as getNetworkEndpoints2 } from "@injectivelabs/networks";
import {
  IndexerGrpcDerivativesApi,
  IndexerGrpcSpotApi as IndexerGrpcSpotApi2,
  IndexerRestMarketChronosApi as IndexerRestMarketChronosApi2,
  IndexerRestSpotChronosApi
} from "@injectivelabs/sdk-ts";
var MarketAnalysisService = class {
  spotApi;
  derivativesApi;
  marketChronosApi;
  spotChronosApi;
  constructor(network = Network2.Mainnet) {
    const endpoints = getNetworkEndpoints2(network);
    this.spotApi = new IndexerGrpcSpotApi2(endpoints.indexer);
    this.derivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer);
    this.marketChronosApi = new IndexerRestMarketChronosApi2(
      `${endpoints.chronos}/api/chronos/v1/market`
    );
    this.spotChronosApi = new IndexerRestSpotChronosApi(
      `${endpoints.chronos}/api/chronos/v1/spot`
    );
  }
  /**
   * Fetch order book data for a spot market
   * Useful for: Market depth analysis, liquidity analysis, order book imbalance
   */
  async getSpotOrderbook(marketId) {
    const response = await this.spotApi.fetchOrderbookV2(marketId);
    return {
      sequence: response.sequence,
      buys: response.buys,
      sells: response.sells
    };
  }
  /**
   * Fetch order book data for a derivatives market
   * Useful for: Futures market depth, derivatives liquidity analysis
   */
  async getDerivativesOrderbook(marketId) {
    const response = await this.derivativesApi.fetchOrderbookV2(marketId);
    return {
      sequence: response.sequence,
      buys: response.buys,
      sells: response.sells
    };
  }
  /**
   * Fetch recent trades for a spot market
   * Useful for: Volume analysis, price action study, trade flow
   */
  async getSpotTrades(marketId, limit = 100) {
    const response = await this.spotApi.fetchTrades({
      marketId,
      pagination: { limit }
    });
    return response.trades;
  }
  /**
   * Fetch recent trades for a derivatives market
   * Useful for: Futures volume analysis, derivatives trade flow
   */
  async getDerivativesTrades(marketId, limit = 100) {
    const response = await this.derivativesApi.fetchTrades({
      marketId,
      pagination: { limit }
    });
    return response.trades;
  }
  /**
   * Fetch order history for a spot market
   * Useful for: Historical order flow analysis, market participant behavior
   */
  async getSpotOrderHistory(marketId, subaccountId, orderTypes) {
    const response = await this.spotApi.fetchOrderHistory({
      marketId,
      subaccountId,
      orderTypes
    });
    return response.orderHistory;
  }
  /**
   * Fetch order history for a derivatives market
   * Useful for: Futures order flow analysis, derivatives trading patterns
   */
  async getDerivativesOrderHistory(marketId, subaccountId, orderTypes) {
    const response = await this.derivativesApi.fetchOrderHistory({
      marketId,
      subaccountId,
      orderTypes
    });
    return response.orderHistory;
  }
  /**
   * Fetch aggregated market data
   * Useful for: OHLCV data, candlestick analysis, technical indicators
   */
  async getMarketsHistory(marketIds, resolution, countback) {
    const response = await this.marketChronosApi.fetchMarketsHistory({
      marketIds,
      resolution,
      countback
    });
    return marketIds.map((marketId) => {
      const marketHistory = response.find((item) => item.marketID === marketId);
      if (!marketHistory) {
        return { marketId, history: [] };
      }
      const history = marketHistory.t.map((timestamp, index) => ({
        timestamp,
        open: marketHistory.o[index].toString(),
        high: marketHistory.h[index].toString(),
        low: marketHistory.l[index].toString(),
        close: marketHistory.c[index].toString(),
        volume: marketHistory.v[index].toString()
      }));
      return { marketId, history };
    });
  }
  /**
   * Get order book snapshot
   * Useful for: Real-time market depth analysis, liquidity monitoring
   */
  async getOrderbookSnapshot(marketId, type = "spot") {
    const api = type === "spot" ? this.spotApi : this.derivativesApi;
    const response = await api.fetchOrderbookV2(marketId);
    return {
      buys: response.buys,
      sells: response.sells,
      sequence: response.sequence
    };
  }
  /**
   * Fetch funding rates (derivatives only)
   * Useful for: Funding rate analysis, carry trade opportunities
   */
  async getFundingRates(marketId) {
    return await this.derivativesApi.fetchFundingRates({ marketId });
  }
  /**
   * Fetch positions for a derivatives market
   * Useful for: Open interest analysis, market sentiment
   */
  async getPositions(marketId, subaccountId) {
    return await this.derivativesApi.fetchPositions({ marketId, subaccountId });
  }
  // Technical Analysis Helper Functions
  calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }
  calculateRSI(prices, period = 14) {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map((change) => {
      if (change > 0) {
        return change;
      }
      return 0;
    });
    const losses = changes.map((change) => {
      if (change < 0) {
        return -change;
      }
      return 0;
    });
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    if (avgLoss === 0) {
      return 100;
    }
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }
  calculateATR(highs, lows, closes, period = 14) {
    const trs = highs.map((high, i) => {
      if (i === 0) {
        return high - lows[i];
      }
      const prevClose = closes[i - 1];
      const tr1 = high - lows[i];
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(lows[i] - prevClose);
      return Math.max(tr1, tr2, tr3);
    });
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  }
  calculateStochastic(closes, highs, lows, kPeriod = 14, dPeriod = 3) {
    const lowestLow = Math.min(...lows.slice(-kPeriod));
    const highestHigh = Math.max(...highs.slice(-kPeriod));
    const currentClose = closes[closes.length - 1];
    const k = (currentClose - lowestLow) / (highestHigh - lowestLow) * 100;
    const d = this.calculateSMA(
      closes.slice(-dPeriod).map(
        (close) => (close - lowestLow) / (highestHigh - lowestLow) * 100
      ),
      dPeriod
    );
    return { k, d };
  }
  calculateADX(highs, lows, closes, period = 14) {
    const plusDM = highs.slice(1).map((high, i) => {
      const diff = high - highs[i];
      return diff > 0 && diff > lows[i + 1] - lows[i] ? diff : 0;
    });
    const minusDM = lows.slice(1).map((low, i) => {
      const diff = lows[i] - low;
      return diff > 0 && diff > highs[i + 1] - highs[i] ? diff : 0;
    });
    const tr = highs.slice(1).map((high, i) => {
      const prevClose = closes[i];
      return Math.max(
        high - lows[i + 1],
        Math.abs(high - prevClose),
        Math.abs(lows[i + 1] - prevClose)
      );
    });
    const smoothedTR = this.calculateEMA(tr, period);
    const smoothedPlusDM = this.calculateEMA(plusDM, period);
    const smoothedMinusDM = this.calculateEMA(minusDM, period);
    const plusDI = smoothedPlusDM / smoothedTR * 100;
    const minusDI = smoothedMinusDM / smoothedTR * 100;
    const dx = Math.abs((plusDI - minusDI) / (plusDI + minusDI)) * 100;
    return this.calculateEMA([...Array(period - 1).fill(dx), dx], period);
  }
  calculateSMA(prices, period) {
    return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  }
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
    const squaredDiffs = prices.slice(-period).map((price) => (price - sma) ** 2);
    const standardDeviation = Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / period
    );
    return {
      upper: sma + standardDeviation * stdDev,
      middle: sma,
      lower: sma - standardDeviation * stdDev
    };
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA - slowEMA;
    const signalLine = this.calculateEMA(
      [...Array(signalPeriod - 1).fill(macdLine), macdLine],
      signalPeriod
    );
    const histogram = macdLine - signalLine;
    return {
      macdLine,
      signalLine,
      histogram
    };
  }
  calculateTechnicalAnalysis(marketHistory, config) {
    if (!marketHistory?.history?.length) {
      return null;
    }
    const lastCandle = marketHistory.history[marketHistory.history.length - 1];
    const closes = marketHistory.history.map((candle) => Number(candle.close));
    const highs = marketHistory.history.map((candle) => Number(candle.high));
    const lows = marketHistory.history.map((candle) => Number(candle.low));
    const volumes = marketHistory.history.map(
      (candle) => Number(candle.volume)
    );
    const sma = this.calculateSMA(closes, config.sma);
    const ema = this.calculateEMA(closes, config.ema);
    const vwap = marketHistory.history.reduce((acc, candle) => {
      return acc + Number(candle.close) * Number(candle.volume);
    }, 0) / volumes.reduce((a, b) => a + b, 0);
    const rsi = this.calculateRSI(closes, config.rsi);
    const bollingerBands = this.calculateBollingerBands(
      closes,
      config.bollinger.period,
      config.bollinger.stdDev
    );
    const macd = this.calculateMACD(
      closes,
      config.macd.fast,
      config.macd.slow,
      config.macd.signal
    );
    const atr = this.calculateATR(highs, lows, closes, config.atr);
    const stochastic = this.calculateStochastic(
      closes,
      highs,
      lows,
      config.stochastic.k,
      config.stochastic.d
    );
    const adx = this.calculateADX(highs, lows, closes, config.adx);
    return {
      latestCandle: {
        timestamp: lastCandle.timestamp * 1e3,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        volume: lastCandle.volume
      },
      indicators: {
        sma24h: Number(sma.toFixed(4)),
        ema24h: Number(ema.toFixed(4)),
        vwap24h: Number(vwap.toFixed(4)),
        rsi14: Number(rsi.toFixed(4)),
        bollingerBands: {
          upper: Number(bollingerBands.upper.toFixed(4)),
          middle: Number(bollingerBands.middle.toFixed(4)),
          lower: Number(bollingerBands.lower.toFixed(4))
        },
        macd: {
          macdLine: Number(macd.macdLine.toFixed(4)),
          signalLine: Number(macd.signalLine.toFixed(4)),
          histogram: Number(macd.histogram.toFixed(4))
        },
        atr14: Number(atr.toFixed(4)),
        stochastic: {
          k: Number(stochastic.k.toFixed(4)),
          d: Number(stochastic.d.toFixed(4))
        },
        adx14: Number(adx.toFixed(4))
      }
    };
  }
  /**
   * Analyze order book depth and liquidity
   * Useful for: Market depth analysis, liquidity analysis, order book imbalance
   */
  async analyzeOrderBook(marketId, type = "spot", depth = 20) {
    const orderbook = await this.getOrderbookSnapshot(marketId, type);
    const bids = orderbook.buys.slice(0, depth);
    const asks = orderbook.sells.slice(0, depth);
    const markets = await (type === "spot" ? this.spotApi.fetchMarkets() : this.derivativesApi.fetchMarkets());
    const market = markets.find((m) => m.marketId === marketId);
    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }
    const baseDecimals = type === "spot" && "baseToken" in market ? market.baseToken.decimals : 18;
    const convertToHumanReadable = (quantity) => {
      return Number(quantity) / 10 ** baseDecimals;
    };
    const bestBid = Number(bids[0]?.price || 0);
    const bestAsk = Number(asks[0]?.price || 0);
    const spread3 = bestAsk - bestBid;
    const spreadPercentage = spread3 / bestBid * 100;
    const bidDepth = bids.reduce(
      (sum, bid) => sum + convertToHumanReadable(bid.quantity),
      0
    );
    const askDepth = asks.reduce(
      (sum, ask) => sum + convertToHumanReadable(ask.quantity),
      0
    );
    const bidDensity = bids.length / (bestBid - Number(bids[bids.length - 1]?.price || bestBid));
    const askDensity = asks.length / (Number(asks[asks.length - 1]?.price || bestAsk) - bestAsk);
    return {
      spread: spread3,
      spreadPercentage,
      bidDepth,
      askDepth,
      bidDensity,
      askDensity,
      topBids: bids.map((bid) => ({
        price: bid.price,
        quantity: convertToHumanReadable(bid.quantity).toString()
      })),
      topAsks: asks.map((ask) => ({
        price: ask.price,
        quantity: convertToHumanReadable(ask.quantity).toString()
      }))
    };
  }
  /**
   * Analyze liquidity pool metrics (for AMMs)
   * Useful for: TVL analysis, pool composition, slippage analysis
   */
  async analyzeLiquidityPool(marketId) {
    try {
      const markets = await this.spotApi.fetchMarkets();
      const market = markets.find((m) => m.marketId === marketId);
      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }
      const marketSummary = await this.spotChronosApi.fetchMarketSummary(marketId);
      console.log(
        "Market Summary Response:",
        JSON.stringify(marketSummary, null, 2)
      );
      const tvl = Number(marketSummary.volume);
      const price = Number(marketSummary.price);
      const volume = Number(marketSummary.volume);
      const token1Amount = volume / 2;
      const token2Amount = volume / 2 * price;
      const poolComposition = {
        token1: {
          symbol: market.baseToken.symbol,
          amount: token1Amount,
          percentage: 50
        },
        token2: {
          symbol: market.quoteToken.symbol,
          amount: token2Amount,
          percentage: 50
        }
      };
      const currentPrice = Number(marketSummary.price);
      const slippage = [0.1, 0.5, 1, 2, 5].map((percentage) => {
        const slippagePrice = currentPrice * (1 + percentage / 100);
        return {
          price: slippagePrice,
          slippagePercentage: percentage
        };
      });
      return {
        tvl,
        poolComposition,
        slippage
      };
    } catch (error) {
      console.error("Failed to fetch liquidity pool data:", error);
      throw error;
    }
  }
  /**
   * Analyze top N markets by volume
   * @param config Analysis configuration
   * @returns Promise containing market analysis results
   */
  async analyzeTopMarkets(config) {
    try {
      console.log(`Fetching available ${config.type} markets...`);
      const markets = await (config.type === "spot" ? this.spotApi.fetchMarkets() : this.derivativesApi.fetchMarkets());
      const marketSummaries = await Promise.all(
        markets.map(async (market) => {
          try {
            let volume = 0;
            if (config.type === "spot") {
              const summary = await this.spotChronosApi.fetchMarketSummary(
                market.marketId
              );
              volume = Number(summary.volume || 0);
            } else {
              const trades = await this.getDerivativesTrades(
                market.marketId,
                100
              );
              volume = trades.length > 0 ? 1e6 : 0;
            }
            return {
              market,
              volume
            };
          } catch (error) {
            console.log(`Failed to fetch summary for ${market.ticker}:`, error);
            return {
              market,
              volume: 0
            };
          }
        })
      );
      const selectedMarkets = marketSummaries.sort((a, b) => b.volume - a.volume).slice(0, config.limit).map(({ market }) => market);
      console.log(`Selected top ${config.limit} markets by volume:`);
      for (const market of selectedMarkets) {
        console.log(
          `  ${market.ticker}: ${marketSummaries.find((m) => m.market.marketId === market.marketId)?.volume || 0} volume`
        );
      }
      return this.analyzeMarkets(
        config,
        selectedMarkets.map((m) => m.marketId)
      );
    } catch (error) {
      console.error("Error analyzing top markets:", error);
      throw error;
    }
  }
  /**
   * Analyze specific markets by their IDs
   * @param config Analysis configuration
   * @param marketIds Array of market IDs to analyze
   * @returns Promise containing market analysis results
   */
  async analyzeMarkets(config, marketIds) {
    try {
      const markets = await (config.type === "spot" ? this.spotApi.fetchMarkets() : this.derivativesApi.fetchMarkets());
      const selectedMarkets = markets.filter(
        (m) => marketIds.includes(m.marketId)
      );
      if (selectedMarkets.length === 0) {
        throw new Error("No valid markets found for the provided market IDs");
      }
      const analysisResults = [];
      for (const market of selectedMarkets) {
        console.log(
          `
Analyzing ${config.type} market: ${market.ticker} (${market.marketId})`
        );
        console.log("\nAnalyzing order book...");
        const orderBookAnalysis = await this.analyzeOrderBook(
          market.marketId,
          config.type
        );
        let liquidityAnalysis = null;
        let derivativesMetrics = null;
        if (config.type === "spot") {
          try {
            console.log("\nAnalyzing liquidity pool...");
            liquidityAnalysis = await this.analyzeLiquidityPool(
              market.marketId
            );
          } catch (error) {
            if (error instanceof Error) {
              console.log(
                `Liquidity pool analysis not available: ${error.message}`
              );
            } else {
              console.log(
                "Liquidity pool analysis not available for this market"
              );
            }
          }
        } else {
          console.log("\nAnalyzing derivatives metrics...");
          derivativesMetrics = await this.analyzeDerivativesMetrics(
            market.marketId
          );
        }
        console.log("Fetching recent trades...");
        const trades = await (config.type === "spot" ? this.getSpotTrades(market.marketId, 10) : this.getDerivativesTrades(market.marketId, 10));
        console.log("Fetching historical data...");
        const marketHistories = await this.getMarketsHistory(
          [market.marketId],
          config.resolution,
          config.countback
        );
        const marketHistory = marketHistories[0];
        const technicalAnalysis = this.calculateTechnicalAnalysis(
          marketHistory,
          config
        );
        analysisResults.push({
          marketId: market.marketId,
          ticker: market.ticker,
          orderBook: orderBookAnalysis,
          liquidity: liquidityAnalysis,
          derivativesMetrics,
          recentTrades: trades.map((trade) => ({
            price: trade.price,
            quantity: trade.quantity,
            direction: trade.tradeDirection
          })),
          technicalAnalysis,
          timeframe: config.resolution
        });
      }
      return analysisResults;
    } catch (error) {
      console.error("Error running market analysis:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }
  /**
   * Analyze markets based on configuration
   * @param config Analysis configuration
   * @returns Promise containing market analysis results
   */
  async analyzeMarketsByConfig(config) {
    return this.analyzeTopMarkets(config);
  }
  /**
   * Analyze derivatives market metrics
   * Useful for: Funding rates, open interest, and position analysis
   */
  async analyzeDerivativesMetrics(marketId) {
    try {
      const fundingRates = await this.getFundingRates(marketId);
      const latestRate = fundingRates.fundingRates[0];
      const positions = await this.getPositions(marketId);
      const longPositions = positions.positions.filter(
        (p) => p.direction === "long"
      );
      const shortPositions = positions.positions.filter(
        (p) => p.direction === "short"
      );
      const totalOpenInterest = positions.positions.reduce(
        (sum, pos) => sum + Number(pos.quantity),
        0
      );
      const longOpenInterest = longPositions.reduce(
        (sum, pos) => sum + Number(pos.quantity),
        0
      );
      const shortOpenInterest = shortPositions.reduce(
        (sum, pos) => sum + Number(pos.quantity),
        0
      );
      return {
        fundingRate: {
          current: Number(latestRate?.rate || 0),
          timestamp: latestRate?.timestamp || 0
        },
        openInterest: {
          total: totalOpenInterest,
          long: longOpenInterest,
          short: shortOpenInterest,
          longShortRatio: longOpenInterest / (shortOpenInterest || 1)
        }
      };
    } catch (error) {
      console.error("Failed to fetch derivatives metrics:", error);
      return null;
    }
  }
};
var marketAnalysisService = new MarketAnalysisService();

// src/bork-protocol/clients/injective-client/index.ts
import {
  elizaLogger as elizaLogger4
} from "@elizaos/core";
import { Network as Network3 } from "@injectivelabs/networks";

// src/config/injective.ts
var MARKET_ANALYSIS_INTERVALS = {
  MINUTE: 6e4,
  FIVE_MINUTES: 3e5,
  FIFTEEN_MINUTES: 9e5,
  THIRTY_MINUTES: 18e5,
  HOUR: 36e5,
  FOUR_HOURS: 144e5,
  DAY: 864e5
};
var DEFAULT_MARKET_ANALYSIS_CONFIG = {
  type: "spot",
  resolution: TimeResolution.Hour,
  countback: 24,
  // Number of historical data points to fetch
  limit: 10,
  // Number of top markets to analyze
  // Technical indicator periods
  sma: 24,
  // Simple Moving Average period
  ema: 24,
  // Exponential Moving Average period
  rsi: 14,
  // Relative Strength Index period
  bollinger: {
    period: 20,
    stdDev: 2
    // Standard deviation multiplier
  },
  macd: {
    fast: 12,
    // Fast EMA period
    slow: 26,
    // Slow EMA period
    signal: 9
    // Signal line period
  },
  atr: 14,
  // Average True Range period
  stochastic: {
    k: 14,
    // %K period
    d: 3
    // %D period
  },
  adx: 14
  // Average Directional Index period
};
var DEFAULT_MARKET_ANALYSIS_INTERVAL = MARKET_ANALYSIS_INTERVALS.HOUR;

// src/bork-protocol/clients/injective-client/index.ts
var RETRY_DELAY_MS = 15 * 60 * 1e3;
var ANALYSIS_TIMEFRAMES = {
  FIVE_MINUTES: {
    resolution: TimeResolution.FiveMinutes,
    interval: MARKET_ANALYSIS_INTERVALS.FIVE_MINUTES,
    countback: 12
    // 1 hour worth of 5-min data
  },
  HOUR: {
    resolution: TimeResolution.Hour,
    interval: MARKET_ANALYSIS_INTERVALS.HOUR,
    countback: 24
    // 24 hours worth of hourly data
  }
};
var InjectiveClient = class {
  runtime;
  injectiveService = null;
  marketAnalysisService = null;
  databaseService = null;
  analysisIntervals = {};
  isAnalyzing = {};
  retryTimeouts = {};
  constructor(runtime) {
    this.runtime = runtime;
  }
  scheduleRetry(timeframe) {
    if (this.retryTimeouts[timeframe]) {
      clearTimeout(this.retryTimeouts[timeframe]);
    }
    this.retryTimeouts[timeframe] = setTimeout(() => {
      elizaLogger4.info(
        `[InjectiveClient] Retrying analysis for timeframe ${timeframe} after delay`
      );
      this.runMarketAnalysis(timeframe).catch((error) => {
        elizaLogger4.error(
          `[InjectiveClient] Retry attempt failed for timeframe ${timeframe}:`,
          error
        );
      });
    }, RETRY_DELAY_MS);
  }
  async runMarketAnalysis(timeframe) {
    if (this.isAnalyzing[timeframe]) {
      elizaLogger4.warn(
        `[InjectiveClient] Analysis for timeframe ${timeframe} already in progress, skipping`
      );
      return;
    }
    this.isAnalyzing[timeframe] = true;
    try {
      const timeframeConfig = ANALYSIS_TIMEFRAMES[timeframe];
      elizaLogger4.info(
        `[InjectiveClient] Running market analysis for timeframe ${timeframeConfig.resolution}`
      );
      const config = {
        ...DEFAULT_MARKET_ANALYSIS_CONFIG,
        resolution: timeframeConfig.resolution,
        countback: timeframeConfig.countback
      };
      const analysis = await this.marketAnalysisService?.analyzeMarketsByConfig(config);
      if (analysis) {
        await this.databaseService?.storeMarketAnalysis(analysis);
        elizaLogger4.info(
          `[InjectiveClient] Market analysis completed and stored for timeframe ${timeframeConfig.resolution}`
        );
      }
      if (this.retryTimeouts[timeframe]) {
        clearTimeout(this.retryTimeouts[timeframe]);
        delete this.retryTimeouts[timeframe];
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          elizaLogger4.warn(
            `[InjectiveClient] Timeout during market analysis for timeframe ${timeframe}, scheduling retry in 15 minutes`
          );
          this.scheduleRetry(timeframe);
        } else {
          elizaLogger4.error(
            `[InjectiveClient] Error in market analysis for timeframe ${timeframe}: ${error.message}`
          );
          this.scheduleRetry(timeframe);
        }
      } else {
        elizaLogger4.error(
          `[InjectiveClient] Unknown error in market analysis for timeframe ${timeframe}:`,
          error
        );
        this.scheduleRetry(timeframe);
      }
    } finally {
      this.isAnalyzing[timeframe] = false;
    }
  }
  async start() {
    elizaLogger4.info("[InjectiveClient] Starting Injective client");
    try {
      const network = Network3.Mainnet;
      this.injectiveService = new InjectiveService(network);
      this.marketAnalysisService = new MarketAnalysisService(network);
      this.databaseService = new DatabaseService(this.runtime);
      for (const timeframe of Object.keys(ANALYSIS_TIMEFRAMES)) {
        this.isAnalyzing[timeframe] = false;
      }
      for (const [timeframe] of Object.entries(ANALYSIS_TIMEFRAMES)) {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await this.runMarketAnalysis(
          timeframe
        ).catch((error) => {
          elizaLogger4.error(
            `[InjectiveClient] Initial analysis failed for timeframe ${timeframe}:`,
            error
          );
        });
      }
      let index = 0;
      for (const [timeframe, config] of Object.entries(ANALYSIS_TIMEFRAMES)) {
        const offsetMs = index * 3e4;
        setTimeout(() => {
          this.analysisIntervals[timeframe] = setInterval(
            () => this.runMarketAnalysis(
              timeframe
            ).catch((error) => {
              elizaLogger4.error(
                `[InjectiveClient] Scheduled analysis failed for timeframe ${timeframe}:`,
                error
              );
            }),
            config.interval
          );
        }, offsetMs);
        index++;
      }
      elizaLogger4.info(
        "[InjectiveClient] Injective client started successfully"
      );
    } catch (error) {
      elizaLogger4.error(
        "[InjectiveClient] Error starting Injective client:",
        error
      );
      throw error;
    }
  }
  async stop() {
    elizaLogger4.info("[InjectiveClient] Stopping Injective client");
    try {
      for (const interval of Object.values(this.analysisIntervals)) {
        clearInterval(interval);
      }
      for (const timeout of Object.values(this.retryTimeouts)) {
        clearTimeout(timeout);
      }
      this.analysisIntervals = {};
      this.retryTimeouts = {};
      this.isAnalyzing = {};
      this.injectiveService = null;
      this.marketAnalysisService = null;
      this.databaseService = null;
      elizaLogger4.info(
        "[InjectiveClient] Injective client stopped successfully"
      );
    } catch (error) {
      elizaLogger4.error(
        "[InjectiveClient] Error stopping Injective client:",
        error
      );
      throw error;
    }
  }
  /**
   * Get the current market analysis service instance
   * @returns The market analysis service instance or null if not initialized
   */
  getMarketAnalysisService() {
    return this.marketAnalysisService;
  }
  /**
   * Get the current injective service instance
   * @returns The injective service instance or null if not initialized
   */
  getInjectiveService() {
    return this.injectiveService;
  }
  /**
   * Get the current database service instance
   * @returns The database service instance or null if not initialized
   */
  getDatabaseService() {
    return this.databaseService;
  }
};
async function startInjectiveClient(runtime) {
  const client = new InjectiveClient(runtime);
  await client.start();
  return client;
}

// src/bork-protocol/helpers/tweet-merging-helper.ts
import { elizaLogger as elizaLogger5 } from "@elizaos/core";
async function fetchRelatedTweets(twitterService, tweetId, runtime, processedIds = /* @__PURE__ */ new Set(), client = null) {
  if (processedIds.has(tweetId)) {
    return [];
  }
  try {
    const existingTweet = await tweetQueries.findTweetByTweetId(
      tweetId,
      client
    );
    if (existingTweet) {
      processedIds.add(tweetId);
      return [existingTweet];
    }
    const tweet = await twitterService.getTweet(tweetId);
    if (!tweet) {
      return [];
    }
    const dbTweet = {
      id: v4_default(),
      tweet_id: tweet.id,
      agentId: runtime.agentId,
      text: tweet.text || "",
      userId: tweet.userId?.toString() || "",
      username: tweet.username || "",
      name: tweet.name || "",
      timestamp: tweet.timestamp || Math.floor(Date.now() / 1e3),
      timeParsed: /* @__PURE__ */ new Date(),
      likes: tweet.likes || 0,
      retweets: tweet.retweets || 0,
      replies: tweet.replies || 0,
      views: tweet.views || 0,
      bookmarkCount: tweet.bookmarkCount || 0,
      conversationId: tweet.conversationId || "",
      permanentUrl: tweet.permanentUrl || "",
      html: tweet.html || "",
      inReplyToStatus: null,
      // Don't store full tweet objects to avoid cycles
      inReplyToStatusId: tweet.inReplyToStatusId,
      quotedStatus: null,
      // Don't store full tweet objects to avoid cycles
      quotedStatusId: tweet.quotedStatusId,
      retweetedStatus: null,
      // Don't store full tweet objects to avoid cycles
      retweetedStatusId: tweet.retweetedStatusId,
      thread: [],
      // Will be updated after merging
      isQuoted: tweet.isQuoted || false,
      isPin: tweet.isPin || false,
      isReply: tweet.isReply || false,
      isRetweet: tweet.isRetweet || false,
      isSelfThread: tweet.isSelfThread || false,
      sensitiveContent: tweet.sensitiveContent || false,
      status: "pending",
      createdAt: /* @__PURE__ */ new Date(),
      isThreadMerged: false,
      threadSize: 1,
      originalText: tweet.text || "",
      hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
      mentions: Array.isArray(tweet.mentions) ? tweet.mentions.map((mention) => ({
        username: mention.username || "",
        id: mention.id || ""
      })) : [],
      photos: Array.isArray(tweet.photos) ? tweet.photos : [],
      urls: Array.isArray(tweet.urls) ? tweet.urls : [],
      videos: Array.isArray(tweet.videos) ? tweet.videos : [],
      place: tweet.place,
      poll: tweet.poll,
      homeTimeline: {
        publicMetrics: {
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0
        },
        entities: {
          hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
          mentions: Array.isArray(tweet.mentions) ? tweet.mentions.map((mention) => ({
            username: mention.username || "",
            id: mention.id || ""
          })) : [],
          urls: Array.isArray(tweet.urls) ? tweet.urls : []
        }
      }
    };
    await tweetQueries.saveTweetObject(dbTweet, client);
    processedIds.add(tweetId);
    const relatedTweets = [];
    const mergedTweet = {
      ...tweet,
      id: v4_default(),
      // Internal UUID
      tweet_id: tweet.id,
      // Twitter's numeric ID
      originalText: tweet.text || "",
      isThreadMerged: false,
      threadSize: 1,
      thread: [],
      // Don't include full tweet objects in thread to avoid cycles
      hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
      mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
      photos: Array.isArray(tweet.photos) ? tweet.photos : [],
      urls: Array.isArray(tweet.urls) ? tweet.urls : [],
      videos: Array.isArray(tweet.videos) ? tweet.videos : []
    };
    relatedTweets.push(mergedTweet);
    if (tweet.inReplyToStatusId) {
      try {
        const replyChain = await fetchRelatedTweets(
          twitterService,
          tweet.inReplyToStatusId,
          runtime,
          processedIds,
          client
        );
        relatedTweets.push(...replyChain);
      } catch (replyError) {
        elizaLogger5.warn(
          "[Tweet Fetching] Error fetching reply to status:",
          replyError
        );
      }
    }
    if (tweet.quotedStatusId) {
      try {
        const quotedTweets = await fetchRelatedTweets(
          twitterService,
          tweet.quotedStatusId,
          runtime,
          processedIds,
          client
        );
        relatedTweets.push(...quotedTweets);
      } catch (quotedError) {
        elizaLogger5.warn(
          "[Tweet Fetching] Error fetching quoted status:",
          quotedError
        );
      }
    }
    if (tweet.retweetedStatusId) {
      try {
        const retweetedTweets = await fetchRelatedTweets(
          twitterService,
          tweet.retweetedStatusId,
          runtime,
          processedIds,
          client
        );
        relatedTweets.push(...retweetedTweets);
      } catch (retweetedError) {
        elizaLogger5.warn(
          "[Tweet Fetching] Error fetching retweeted status:",
          retweetedError
        );
      }
    }
    return relatedTweets;
  } catch (error) {
    elizaLogger5.error("[Tweet Fetching] Error fetching related tweets:", {
      error: error instanceof Error ? error.message : String(error),
      tweetId
    });
    return [];
  }
}
async function mergeTweetContent(twitterService, runtime, tweets) {
  return tweetQueries.processTweetsInTransaction(async (client) => {
    const processedTweets = [];
    const processedIds = /* @__PURE__ */ new Set();
    for (const tweet of tweets) {
      try {
        if (!tweet.tweet_id) {
          elizaLogger5.error("[Tweet Processing] Tweet missing Twitter ID:", {
            userId: tweet.userId,
            username: tweet.username,
            text: tweet.text?.substring(0, 100)
          });
          continue;
        }
        if (processedIds.has(tweet.tweet_id)) {
          continue;
        }
        const dbTweet = {
          id: v4_default(),
          tweet_id: tweet.tweet_id,
          agentId: runtime.agentId,
          text: tweet.text || "",
          userId: tweet.userId?.toString() || "",
          username: tweet.username || "",
          name: tweet.name || "",
          timestamp: tweet.timestamp || Math.floor(Date.now() / 1e3),
          timeParsed: /* @__PURE__ */ new Date(),
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
          views: tweet.views || 0,
          bookmarkCount: tweet.bookmarkCount || 0,
          conversationId: tweet.conversationId || "",
          permanentUrl: tweet.permanentUrl || "",
          html: tweet.html || "",
          inReplyToStatus: null,
          // Don't store full tweet objects to avoid cycles
          inReplyToStatusId: tweet.inReplyToStatusId,
          quotedStatus: null,
          // Don't store full tweet objects to avoid cycles
          quotedStatusId: tweet.quotedStatusId,
          retweetedStatus: null,
          // Don't store full tweet objects to avoid cycles
          retweetedStatusId: tweet.retweetedStatusId,
          thread: [],
          // Will be updated after merging
          isQuoted: tweet.isQuoted || false,
          isPin: tweet.isPin || false,
          isReply: tweet.isReply || false,
          isRetweet: tweet.isRetweet || false,
          isSelfThread: tweet.isSelfThread || false,
          sensitiveContent: tweet.sensitiveContent || false,
          status: "pending",
          createdAt: /* @__PURE__ */ new Date(),
          isThreadMerged: false,
          threadSize: 1,
          originalText: tweet.text || "",
          mediaType: tweet.mediaType || "text",
          mediaUrl: tweet.mediaUrl || "",
          hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
          mentions: Array.isArray(tweet.mentions) ? tweet.mentions.map((mention) => ({
            username: mention.username || "",
            id: mention.id || ""
          })) : [],
          photos: Array.isArray(tweet.photos) ? tweet.photos : [],
          urls: Array.isArray(tweet.urls) ? tweet.urls : [],
          videos: Array.isArray(tweet.videos) ? tweet.videos : [],
          place: tweet.place,
          poll: tweet.poll,
          homeTimeline: {
            publicMetrics: {
              likes: tweet.likes || 0,
              retweets: tweet.retweets || 0,
              replies: tweet.replies || 0
            },
            entities: {
              hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
              mentions: Array.isArray(tweet.mentions) ? tweet.mentions.map((mention) => ({
                username: mention.username || "",
                id: mention.id || ""
              })) : [],
              urls: Array.isArray(tweet.urls) ? tweet.urls : []
            }
          }
        };
        await tweetQueries.saveTweetObject(dbTweet, client);
        elizaLogger5.debug(
          "[Tweet Processing] Saved original tweet to database:",
          {
            tweetId: tweet.tweet_id,
            userId: tweet.userId,
            username: tweet.username
          }
        );
        const relatedTweets = await fetchRelatedTweets(
          twitterService,
          tweet.tweet_id,
          runtime,
          processedIds,
          client
        );
        const sortedTweets = relatedTweets.sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
        );
        let mergedText = "";
        for (const relatedTweet of sortedTweets) {
          if (relatedTweet.text) {
            if (mergedText) {
              mergedText += "\n\n";
            }
            mergedText += relatedTweet.text;
          }
        }
        const processedTweet = {
          ...dbTweet,
          text: mergedText || tweet.text || "",
          thread: sortedTweets,
          isThreadMerged: sortedTweets.length > 1,
          threadSize: sortedTweets.length
        };
        processedTweets.push(processedTweet);
        processedIds.add(tweet.tweet_id);
        elizaLogger5.debug(
          "[Tweet Merging] Successfully merged tweet with related content:",
          {
            tweetId: tweet.tweet_id,
            relatedTweetsCount: sortedTweets.length,
            mergedTextLength: mergedText.length,
            originalTextLength: tweet.text?.length || 0
          }
        );
      } catch (error) {
        elizaLogger5.error("[Tweet Merging] Error processing tweet:", {
          error: error instanceof Error ? error.message : String(error),
          tweetId: tweet.tweet_id
        });
      }
    }
    return processedTweets;
  });
}

// src/bork-protocol/helpers/tweet-validation-helper.ts
import { elizaLogger as elizaLogger6 } from "@elizaos/core";
function validateTweets(tweets) {
  const validTweets = tweets.filter((tweet) => {
    const tweetId = tweet.tweet_id || tweet.id;
    if (!tweetId) {
      elizaLogger6.warn(
        "[Tweet Processing] Skipping tweet with missing Twitter ID:",
        {
          userId: tweet.userId,
          username: tweet.username,
          text: tweet.text?.substring(0, 100)
        }
      );
      return false;
    }
    if (!tweet.tweet_id && tweet.id) {
      tweet.tweet_id = tweet.id;
      elizaLogger6.debug("[Tweet Processing] Copied id to tweet_id field", {
        tweet_id: tweet.tweet_id,
        username: tweet.username
      });
    }
    return true;
  });
  if (validTweets.length === 0) {
    elizaLogger6.error("[Tweet Processing] No valid tweets to process");
  }
  return validTweets;
}
function prepareTweetsForMerging(tweets) {
  return tweets.map((tweet) => ({
    ...tweet,
    id: tweet.id || v4_default(),
    // Internal UUID
    tweet_id: tweet.tweet_id || tweet.id,
    // Twitter's numeric ID (ensure it's set)
    originalText: tweet.text || "",
    isThreadMerged: false,
    threadSize: 1,
    thread: [],
    hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
    mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
    photos: Array.isArray(tweet.photos) ? tweet.photos : [],
    urls: Array.isArray(tweet.urls) ? tweet.urls : [],
    videos: Array.isArray(tweet.videos) ? tweet.videos : []
  }));
}

// src/bork-protocol/utils/tweet-analysis/process-tweets.ts
import { elizaLogger as elizaLogger14 } from "@elizaos/core";

// src/bork-protocol/utils/account-metrics/update-influence-score.ts
import { elizaLogger as elizaLogger7 } from "@elizaos/core";
async function updateAccountEngagementMetrics(account, context = "[TwitterAccounts]", skipSearch = false, providedTweets) {
  try {
    const lastUpdated = account.last50TweetsUpdatedAt;
    const now = /* @__PURE__ */ new Date();
    const hoursSinceLastUpdate = lastUpdated ? (now.getTime() - lastUpdated.getTime()) / (1e3 * 60 * 60) : 999;
    if (hoursSinceLastUpdate < 24 && !skipSearch && !providedTweets) {
      elizaLogger7.info(
        `${context} Skipping engagement metrics update for ${account.username} - updated ${hoursSinceLastUpdate.toFixed(1)} hours ago`
      );
      return;
    }
    elizaLogger7.info(
      `${context} Updating engagement metrics for ${account.username}`
    );
    const tweets = providedTweets || await tweetQueries.getTweetsByUsername(account.username, 50);
    elizaLogger7.info(
      `${context} Found ${tweets.length} tweets in database for ${account.username}`
    );
    if (tweets.length > 0) {
      const sumLikes = tweets.reduce((sum, t5) => sum + (t5.likes || 0), 0);
      const sumRetweets = tweets.reduce((sum, t5) => sum + (t5.retweets || 0), 0);
      const sumReplies = tweets.reduce((sum, t5) => sum + (t5.replies || 0), 0);
      const sumViews = tweets.reduce((sum, t5) => sum + (t5.views || 0), 0);
      const avgLikes = tweets.length ? sumLikes / tweets.length : 0;
      const avgRetweets = tweets.length ? sumRetweets / tweets.length : 0;
      const avgReplies = tweets.length ? sumReplies / tweets.length : 0;
      const avgViews = tweets.length ? sumViews / tweets.length : 0;
      const totalFollowers = account.followersCount || 1;
      const engagementRate = (avgLikes * 3 + avgRetweets * 5 + avgReplies * 2) / totalFollowers * 100;
      const followerWeight = Math.log10(totalFollowers + 1) / 8;
      const engagementWeight = engagementRate / 100;
      const reachMultiplier = avgViews > 0 ? Math.log10(avgViews + 1) / 6 : 0.5;
      const influenceScore = Math.min(
        1,
        (followerWeight * 0.3 + engagementWeight * 0.5) * (1 + reachMultiplier)
      );
      await tweetQueries.updateTargetAccountMetrics(account.username, {
        avgLikes50: avgLikes,
        avgRetweets50: avgRetweets,
        avgReplies50: avgReplies,
        avgViews50: avgViews,
        last50TweetsUpdatedAt: /* @__PURE__ */ new Date(),
        influenceScore
      });
      elizaLogger7.info(
        `${context} Updated engagement metrics for ${account.username}:`
      );
      elizaLogger7.debug({
        avgLikes: avgLikes.toFixed(2),
        avgRetweets: avgRetweets.toFixed(2),
        avgReplies: avgReplies.toFixed(2),
        avgViews: avgViews > 0 ? avgViews.toFixed(2) : "n/a",
        engagementRate: `${engagementRate.toFixed(4)}%`,
        influenceScore: influenceScore.toFixed(4),
        tweetsAnalyzed: tweets.length
      });
    } else {
      elizaLogger7.warn(
        `${context} No tweets found in database for ${account.username}`
      );
    }
  } catch (error) {
    elizaLogger7.error(
      `${context} Error updating engagement metrics for ${account.username}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}
async function updateMetricsForAuthors(tweets, context = "[TwitterAccounts]") {
  try {
    elizaLogger7.info(
      `${context} Starting metrics update for ${tweets.length} tweets`
    );
    const tweetsByAuthor = /* @__PURE__ */ new Map();
    for (const tweet of tweets) {
      const authorTweets = tweetsByAuthor.get(tweet.username) || [];
      authorTweets.push(tweet);
      tweetsByAuthor.set(tweet.username, authorTweets);
    }
    elizaLogger7.info(
      `${context} Grouped tweets by ${tweetsByAuthor.size} unique authors`
    );
    elizaLogger7.debug({
      authorCounts: Array.from(tweetsByAuthor.entries()).map(
        ([username, tweets2]) => ({
          username,
          tweetCount: tweets2.length
        })
      )
    });
    const accounts = await tweetQueries.getTargetAccounts();
    elizaLogger7.info(
      `${context} Retrieved ${accounts.length} target accounts from database`
    );
    let processedAuthors = 0;
    let skippedAuthors = 0;
    for (const [username, authorTweets] of tweetsByAuthor) {
      elizaLogger7.debug(
        `${context} Processing author ${username} with ${authorTweets.length} tweets`
      );
      const account = accounts.find((acc) => acc.username === username);
      if (account) {
        elizaLogger7.debug(
          `${context} Found matching target account for ${username}`,
          {
            followersCount: account.followersCount,
            tweetsCount: account.tweetsCount,
            isVerified: account.isVerified
          }
        );
        await updateAccountEngagementMetrics(
          account,
          context,
          true,
          // Skip search since we're providing tweets
          authorTweets
        );
        processedAuthors++;
      } else {
        elizaLogger7.debug(
          `${context} No matching target account found for ${username}, skipping metrics update`
        );
        skippedAuthors++;
      }
    }
    elizaLogger7.info(`${context} Completed metrics update processing`);
    elizaLogger7.debug({
      totalAuthors: tweetsByAuthor.size,
      processedAuthors,
      skippedAuthors,
      processingRate: `${(processedAuthors / tweetsByAuthor.size * 100).toFixed(1)}%`
    });
  } catch (error) {
    elizaLogger7.error(
      `${context} Error updating metrics for authors:`,
      error instanceof Error ? error.message : String(error),
      {
        stack: error instanceof Error ? error.stack : void 0
      }
    );
  }
}

// src/bork-protocol/helpers/repair-tweet-analysis-helper.ts
import { elizaLogger as elizaLogger8 } from "@elizaos/core";
function createDefaultAnalysis() {
  return {
    contentAnalysis: {
      type: "other",
      format: "statement",
      sentiment: "neutral",
      confidence: 0.5,
      primaryTopics: [],
      secondaryTopics: [],
      entities: {
        people: [],
        organizations: [],
        products: [],
        locations: [],
        events: []
      },
      hashtagsUsed: [],
      qualityMetrics: {
        relevance: 0.5,
        originality: 0.5,
        clarity: 0.5,
        authenticity: 0.5,
        valueAdd: 0.5
      },
      engagementAnalysis: {
        overallScore: 0.5,
        virality: 0.5,
        conversionPotential: 0.5,
        communityBuilding: 0.5,
        thoughtLeadership: 0.5
      }
    },
    spamAnalysis: {
      isSpam: false,
      spamScore: 0.1,
      reasons: [],
      confidenceMetrics: {
        linguisticRisk: 0.1,
        topicMismatch: 0.1,
        engagementAnomaly: 0.1,
        promotionalIntent: 0.1,
        accountTrustSignals: 0.1
      }
    },
    marketingInsights: {
      targetAudience: [],
      keyTakeaways: [],
      contentStrategies: {
        whatWorked: [],
        improvement: []
      },
      trendAlignment: {
        currentTrends: [],
        emergingOpportunities: [],
        relevanceScore: 0.5
      },
      copywriting: {
        effectiveElements: [],
        hooks: [],
        callToAction: {
          present: false,
          type: "none",
          effectiveness: 0.5
        }
      }
    },
    actionableRecommendations: {
      engagementStrategies: [
        {
          action: "Monitor engagement",
          rationale: "Initial analysis required",
          priority: "medium",
          expectedOutcome: "Baseline metrics established"
        }
      ],
      contentCreation: [
        {
          contentType: "general",
          focus: "content quality",
          keyElements: ["clarity", "value"]
        }
      ],
      networkBuilding: [
        {
          targetType: "community",
          target: "general audience",
          approach: "organic growth",
          value: "establish presence"
        }
      ]
    }
  };
}
function repairAnalysisResponse(partialAnalysis) {
  const defaultAnalysis = createDefaultAnalysis();
  const result = { ...defaultAnalysis };
  if ("contentAnalysis" in partialAnalysis && partialAnalysis.contentAnalysis) {
    const partialContent = partialAnalysis.contentAnalysis;
    result.contentAnalysis = {
      type: partialContent.type || defaultAnalysis.contentAnalysis.type,
      format: partialContent.format || defaultAnalysis.contentAnalysis.format,
      sentiment: partialContent.sentiment || defaultAnalysis.contentAnalysis.sentiment,
      confidence: partialContent.confidence || defaultAnalysis.contentAnalysis.confidence,
      primaryTopics: Array.isArray(partialContent.primaryTopics) ? partialContent.primaryTopics : defaultAnalysis.contentAnalysis.primaryTopics,
      secondaryTopics: Array.isArray(partialContent.secondaryTopics) ? partialContent.secondaryTopics : defaultAnalysis.contentAnalysis.secondaryTopics,
      entities: {
        people: Array.isArray(
          partialContent.entities?.people
        ) ? partialContent.entities?.people : defaultAnalysis.contentAnalysis.entities.people,
        organizations: Array.isArray(
          partialContent.entities?.organizations
        ) ? partialContent.entities?.organizations : defaultAnalysis.contentAnalysis.entities.organizations,
        products: Array.isArray(
          partialContent.entities?.products
        ) ? partialContent.entities?.products : defaultAnalysis.contentAnalysis.entities.products,
        locations: Array.isArray(
          partialContent.entities?.locations
        ) ? partialContent.entities?.locations : defaultAnalysis.contentAnalysis.entities.locations,
        events: Array.isArray(
          partialContent.entities?.events
        ) ? partialContent.entities?.events : defaultAnalysis.contentAnalysis.entities.events
      },
      hashtagsUsed: Array.isArray(partialContent.hashtagsUsed) ? partialContent.hashtagsUsed : defaultAnalysis.contentAnalysis.hashtagsUsed,
      qualityMetrics: {
        relevance: partialContent.qualityMetrics?.relevance || defaultAnalysis.contentAnalysis.qualityMetrics.relevance,
        originality: partialContent.qualityMetrics?.originality || defaultAnalysis.contentAnalysis.qualityMetrics.originality,
        clarity: partialContent.qualityMetrics?.clarity || defaultAnalysis.contentAnalysis.qualityMetrics.clarity,
        authenticity: partialContent.qualityMetrics?.authenticity || defaultAnalysis.contentAnalysis.qualityMetrics.authenticity,
        valueAdd: partialContent.qualityMetrics?.valueAdd || defaultAnalysis.contentAnalysis.qualityMetrics.valueAdd
      },
      engagementAnalysis: {
        overallScore: partialContent.engagementAnalysis?.overallScore || defaultAnalysis.contentAnalysis.engagementAnalysis.overallScore,
        virality: partialContent.engagementAnalysis?.virality || defaultAnalysis.contentAnalysis.engagementAnalysis.virality,
        conversionPotential: partialContent.engagementAnalysis?.conversionPotential || defaultAnalysis.contentAnalysis.engagementAnalysis.conversionPotential,
        communityBuilding: partialContent.engagementAnalysis?.communityBuilding || defaultAnalysis.contentAnalysis.engagementAnalysis.communityBuilding,
        thoughtLeadership: partialContent.engagementAnalysis?.thoughtLeadership || defaultAnalysis.contentAnalysis.engagementAnalysis.thoughtLeadership
      }
    };
  }
  if ("spamAnalysis" in partialAnalysis && partialAnalysis.spamAnalysis) {
    const partialSpam = partialAnalysis.spamAnalysis;
    result.spamAnalysis = {
      isSpam: typeof partialSpam.isSpam === "boolean" ? partialSpam.isSpam : defaultAnalysis.spamAnalysis.isSpam,
      spamScore: partialSpam.spamScore || defaultAnalysis.spamAnalysis.spamScore,
      reasons: Array.isArray(partialSpam.reasons) ? partialSpam.reasons : defaultAnalysis.spamAnalysis.reasons,
      confidenceMetrics: {
        linguisticRisk: partialSpam.confidenceMetrics?.linguisticRisk || defaultAnalysis.spamAnalysis.confidenceMetrics.linguisticRisk,
        topicMismatch: partialSpam.confidenceMetrics?.topicMismatch || defaultAnalysis.spamAnalysis.confidenceMetrics.topicMismatch,
        engagementAnomaly: partialSpam.confidenceMetrics?.engagementAnomaly || defaultAnalysis.spamAnalysis.confidenceMetrics.engagementAnomaly,
        promotionalIntent: partialSpam.confidenceMetrics?.promotionalIntent || defaultAnalysis.spamAnalysis.confidenceMetrics.promotionalIntent,
        accountTrustSignals: partialSpam.confidenceMetrics?.accountTrustSignals || defaultAnalysis.spamAnalysis.confidenceMetrics.accountTrustSignals
      }
    };
  }
  if ("marketingInsights" in partialAnalysis && partialAnalysis.marketingInsights && typeof partialAnalysis.marketingInsights === "object") {
    const partialMarketing = partialAnalysis.marketingInsights;
    result.marketingInsights = {
      targetAudience: Array.isArray(partialMarketing.targetAudience) ? partialMarketing.targetAudience : defaultAnalysis.marketingInsights.targetAudience,
      keyTakeaways: Array.isArray(partialMarketing.keyTakeaways) ? partialMarketing.keyTakeaways : defaultAnalysis.marketingInsights.keyTakeaways,
      contentStrategies: {
        whatWorked: Array.isArray(
          partialMarketing.contentStrategies?.whatWorked
        ) ? partialMarketing.contentStrategies?.whatWorked : defaultAnalysis.marketingInsights.contentStrategies.whatWorked,
        improvement: Array.isArray(
          partialMarketing.contentStrategies?.improvement
        ) ? partialMarketing.contentStrategies?.improvement : defaultAnalysis.marketingInsights.contentStrategies.improvement
      },
      trendAlignment: {
        currentTrends: Array.isArray(
          partialMarketing.trendAlignment?.currentTrends
        ) ? partialMarketing.trendAlignment?.currentTrends : defaultAnalysis.marketingInsights.trendAlignment.currentTrends,
        emergingOpportunities: Array.isArray(
          partialMarketing.trendAlignment?.emergingOpportunities
        ) ? partialMarketing.trendAlignment?.emergingOpportunities : defaultAnalysis.marketingInsights.trendAlignment.emergingOpportunities,
        relevanceScore: typeof partialMarketing.trendAlignment?.relevanceScore === "number" ? partialMarketing.trendAlignment?.relevanceScore : defaultAnalysis.marketingInsights.trendAlignment.relevanceScore
      },
      copywriting: {
        effectiveElements: Array.isArray(
          partialMarketing.copywriting?.effectiveElements
        ) ? partialMarketing.copywriting?.effectiveElements : defaultAnalysis.marketingInsights.copywriting.effectiveElements,
        hooks: Array.isArray(
          partialMarketing.copywriting?.hooks
        ) ? partialMarketing.copywriting?.hooks : defaultAnalysis.marketingInsights.copywriting.hooks,
        callToAction: {
          present: typeof partialMarketing.copywriting?.callToAction?.present === "boolean" ? partialMarketing.copywriting?.callToAction?.present : defaultAnalysis.marketingInsights.copywriting.callToAction.present,
          type: partialMarketing.copywriting?.callToAction?.type || defaultAnalysis.marketingInsights.copywriting.callToAction.type,
          effectiveness: typeof partialMarketing.copywriting?.callToAction?.effectiveness === "number" ? partialMarketing.copywriting?.callToAction?.effectiveness : defaultAnalysis.marketingInsights.copywriting.callToAction.effectiveness
        }
      }
    };
  } else {
    elizaLogger8.warn(
      "[Tweet Analysis] Marketing insights missing or invalid, using defaults",
      {
        hadMarketingInsights: "marketingInsights" in partialAnalysis,
        marketingInsightsType: typeof partialAnalysis.marketingInsights
      }
    );
  }
  if ("actionableRecommendations" in partialAnalysis && partialAnalysis.actionableRecommendations) {
    const partialRecs = partialAnalysis.actionableRecommendations;
    result.actionableRecommendations = {
      engagementStrategies: Array.isArray(partialRecs.engagementStrategies) ? partialRecs.engagementStrategies : defaultAnalysis.actionableRecommendations.engagementStrategies,
      contentCreation: Array.isArray(partialRecs.contentCreation) ? partialRecs.contentCreation : defaultAnalysis.actionableRecommendations.contentCreation,
      networkBuilding: Array.isArray(partialRecs.networkBuilding) ? partialRecs.networkBuilding : defaultAnalysis.actionableRecommendations.networkBuilding
    };
  }
  elizaLogger8.info("[Tweet Processing] Repaired analysis response");
  elizaLogger8.debug({
    wasRepaired: true,
    hadContentAnalysis: "contentAnalysis" in partialAnalysis,
    hadSpamAnalysis: "spamAnalysis" in partialAnalysis,
    hadMarketingInsights: "marketingInsights" in partialAnalysis,
    hadActionableRecommendations: "actionableRecommendations" in partialAnalysis
  });
  return result;
}
function extractAndRepairAnalysis(analysis) {
  let parsedAnalysis;
  if (typeof analysis === "string") {
    try {
      let cleanedJson = analysis.trim();
      if (cleanedJson.includes("{")) {
        const firstBrace = cleanedJson.indexOf("{");
        const lastBrace = cleanedJson.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
        }
      }
      cleanedJson = cleanedJson.replace(/[^\x20-\x7E]+/g, "").replace(/\\+"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
      const parsed = JSON.parse(cleanedJson);
      if (parsed && typeof parsed === "object" && "contentAnalysis" in parsed) {
        elizaLogger8.info("[Tweet Analysis] Successfully parsed JSON string", {
          jsonLength: cleanedJson.length,
          hasContentAnalysis: Boolean(parsed.contentAnalysis),
          hasMarketingInsights: Boolean(parsed.marketingInsights),
          hasSpamAnalysis: Boolean(parsed.spamAnalysis)
        });
        parsedAnalysis = repairAnalysisResponse(parsed);
      } else {
        elizaLogger8.warn(
          "[Tweet Analysis] Parsed JSON missing required fields",
          {
            parsedKeys: Object.keys(parsed || {})
          }
        );
        parsedAnalysis = repairAnalysisResponse(parsed || {});
      }
    } catch (jsonError) {
      elizaLogger8.error("[Tweet Analysis] Failed to parse JSON string", {
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        errorStack: jsonError instanceof Error ? jsonError.stack : void 0,
        inputType: typeof analysis,
        inputLength: typeof analysis === "string" ? analysis.length : 0,
        inputSample: typeof analysis === "string" ? `${analysis.substring(0, 100)}...` : ""
      });
      try {
        const stringAnalysis = analysis;
        const jsonMatch = stringAnalysis.match(/{[\s\S]*}/);
        if (jsonMatch?.[0]) {
          const extractedJson = jsonMatch[0];
          const extracted = JSON.parse(extractedJson);
          elizaLogger8.info("[Tweet Analysis] Recovered JSON using regex", {
            recoveredLength: extractedJson.length
          });
          parsedAnalysis = repairAnalysisResponse(extracted);
        } else {
          throw new Error("No JSON object found in string");
        }
      } catch (fallbackError) {
        elizaLogger8.error("[Tweet Analysis] Failed fallback JSON extraction", {
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        parsedAnalysis = createDefaultAnalysis();
      }
    }
  } else if (typeof analysis === "object" && analysis !== null && "contentAnalysis" in analysis) {
    parsedAnalysis = repairAnalysisResponse(
      analysis
    );
    elizaLogger8.info(
      "[Tweet Analysis] Using direct structured analysis object"
    );
    elizaLogger8.debug({
      hasContentAnalysis: "contentAnalysis" in analysis,
      hasMarketingInsights: "marketingInsights" in analysis,
      hasSpamAnalysis: "spamAnalysis" in analysis,
      hasActionableRecommendations: "actionableRecommendations" in analysis
    });
  } else {
    elizaLogger8.warn("[Tweet Analysis] Response in unexpected format", {
      responseType: typeof analysis,
      keys: typeof analysis === "object" && analysis !== null ? Object.keys(analysis) : []
    });
    parsedAnalysis = createDefaultAnalysis();
  }
  if (!parsedAnalysis.contentAnalysis || !parsedAnalysis.marketingInsights) {
    elizaLogger8.warn(
      "[Tweet Analysis] Analysis incomplete after parsing, repairing",
      {
        hasContentAnalysis: Boolean(parsedAnalysis.contentAnalysis),
        hasMarketingInsights: Boolean(parsedAnalysis.marketingInsights),
        hasSpamAnalysis: Boolean(parsedAnalysis.spamAnalysis),
        hasActionableRecommendations: Boolean(
          parsedAnalysis.actionableRecommendations
        )
      }
    );
    parsedAnalysis = repairAnalysisResponse(
      parsedAnalysis
    );
  }
  return parsedAnalysis;
}

// src/bork-protocol/helpers/spam-helper.ts
import { elizaLogger as elizaLogger9 } from "@elizaos/core";
async function getUserSpamData(userId) {
  try {
    return await tweetQueries.getSpamUser(userId);
  } catch (error) {
    elizaLogger9.error("[Spam Processing] Error getting spam data:", {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    return null;
  }
}
async function updateUserSpamData(userId, spamScore, reasons, context) {
  try {
    await tweetQueries.updateSpamUser(userId, spamScore, reasons);
    elizaLogger9.info(`${context} Updated spam data for user ${userId}`);
    elizaLogger9.debug({
      spamScore,
      reasons
    });
  } catch (error) {
    elizaLogger9.error(`${context} Error updating spam data:`, {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}

// src/bork-protocol/templates/analysis.ts
import { ModelClass, messageCompletionFooter } from "@elizaos/core";
function tweetAnalysisTemplate(input) {
  const {
    text,
    public_metrics,
    topicWeights,
    isThreadMerged,
    threadSize,
    originalText
  } = input;
  return {
    context: `# Task: Analyze Tweet Content
You are a PhD-level expert in social media marketing and AI prompt engineering with a deep understanding of Twitter engagement patterns and content effectiveness.

# Content to Analyze
Tweet${isThreadMerged ? " Thread" : ""}:
${text}

${isThreadMerged ? `
Thread Context: This is a merged thread of ${threadSize} tweets. Original first tweet was: "${originalText}"` : ""}

# Metrics
Public Engagement:
- Likes: ${public_metrics.like_count}
- Retweets: ${public_metrics.retweet_count}
- Replies: ${public_metrics.reply_count}

Topics of Interest (with weights):
${topicWeights.map((tw) => `- ${tw.topic} (${tw.weight})`).join("\n")}

# Scoring Guidelines
All numeric scores should be between 0 and 1, interpreted as follows:

Content Analysis Scores:
- confidence: 0 = very uncertain, 1 = highly confident in analysis
- qualityMetrics.relevance: 0 = irrelevant to topics, 1 = perfectly aligned with topics
- qualityMetrics.originality: 0 = entirely derivative, 1 = highly original content
- qualityMetrics.clarity: 0 = confusing/unclear, 1 = crystal clear message
- qualityMetrics.authenticity: 0 = clearly inauthentic, 1 = genuinely authentic
- qualityMetrics.valueAdd: 0 = no value to readers, 1 = exceptional value

Engagement Scores:
- engagementAnalysis.overallScore: 0 = poor engagement, 1 = excellent engagement
- engagementAnalysis.virality: 0 = unlikely to spread, 1 = highly viral potential
- engagementAnalysis.conversionPotential: 0 = unlikely to convert, 1 = high conversion probability
- engagementAnalysis.communityBuilding: 0 = isolating content, 1 = strong community building
- engagementAnalysis.thoughtLeadership: 0 = follower content, 1 = industry-leading insight

Marketing Scores:
- trendAlignment.relevanceScore: 0 = disconnected from trends, 1 = perfectly aligned with trends
- copywriting.callToAction.effectiveness: 0 = ineffective CTA, 1 = highly compelling CTA

Spam Analysis Scores:
- spamScore: 0 = definitely not spam, 1 = certainly spam
- confidenceMetrics.linguisticRisk: 0 = natural language, 1 = highly suspicious patterns
- confidenceMetrics.topicMismatch: 0 = perfectly aligned topics, 1 = completely unrelated
- confidenceMetrics.engagementAnomaly: 0 = normal engagement pattern, 1 = highly suspicious
- confidenceMetrics.promotionalIntent: 0 = non-promotional, 1 = purely promotional
- confidenceMetrics.accountTrustSignals: 0 = highly trustworthy, 1 = untrustworthy

# Instructions
Analyze this tweet${isThreadMerged ? " thread" : ""} and provide strategic insights for social media engagement. Use the scoring guidelines above to assign appropriate values to all numeric fields.

Response format MUST be a JSON object with the following structure:
\`\`\`json
{
  "contentAnalysis": {
    "type": "news|opinion|announcement|question|promotion|thought_leadership|educational|entertainment|other",
    "format": "statement|question|poll|call_to_action|thread|image_focus|video_focus|link_share|other",
    "sentiment": "positive|negative|neutral|controversial|inspirational",
    "confidence": 0.5,
    "primaryTopics": ["topic1", "topic2"],
    "secondaryTopics": ["topic3", "topic4"],
    "entities": {
      "people": ["person1", "person2"],
      "organizations": ["org1", "org2"],
      "products": ["product1", "product2"],
      "locations": ["location1", "location2"],
      "events": ["event1", "event2"]
    },
    "hashtagsUsed": ["hashtag1", "hashtag2"],
    "qualityMetrics": {
      "relevance": 0.5,
      "originality": 0.5,
      "clarity": 0.5,
      "authenticity": 0.5,
      "valueAdd": 0.5
    },
    "engagementAnalysis": {
      "overallScore": 0.5,
      "virality": 0.5,
      "conversionPotential": 0.5,
      "communityBuilding": 0.5,
      "thoughtLeadership": 0.5
    }
  },
  "marketingInsights": {
    "targetAudience": ["audience1", "audience2"],
    "keyTakeaways": ["takeaway1", "takeaway2"],
    "contentStrategies": {
      "whatWorked": ["element1", "element2"],
      "improvement": ["suggestion1", "suggestion2"]
    },
    "trendAlignment": {
      "currentTrends": ["trend1", "trend2"],
      "emergingOpportunities": ["opportunity1", "opportunity2"],
      "relevanceScore": 0.5
    },
    "copywriting": {
      "effectiveElements": ["element1", "element2"],
      "hooks": ["hook1", "hook2"],
      "callToAction": {
        "present": true,
        "type": "follow|click|share|reply|other",
        "effectiveness": 0.5
      }
    }
  },
  "actionableRecommendations": {
    "engagementStrategies": [
      {
        "action": "description of specific action to take",
        "rationale": "brief explanation of why",
        "priority": "high|medium|low",
        "expectedOutcome": "brief description of expected result"
      }
    ],
    "contentCreation": [
      {
        "contentType": "type of content to create",
        "focus": "specific focus area",
        "keyElements": ["element1", "element2"]
      }
    ],
    "networkBuilding": [
      {
        "targetType": "user|community|hashtag",
        "target": "specific target name",
        "approach": "brief description of approach",
        "value": "description of potential value"
      }
    ]
  },
  "spamAnalysis": {
    "isSpam": false,
    "spamScore": 0.1,
    "reasons": ["reason1", "reason2"],
    "confidenceMetrics": {
      "linguisticRisk": 0.1,
      "topicMismatch": 0.1,
      "engagementAnomaly": 0.1,
      "promotionalIntent": 0.1,
      "accountTrustSignals": 0.1
    }
  }
}
\`\`\`
${messageCompletionFooter}`,
    modelClass: input.modelClass || ModelClass.MEDIUM
  };
}

// src/bork-protocol/types/response/tweet-analysis.ts
import { z as z3 } from "zod";
var qualityMetricsSchema = z3.object({
  relevance: z3.number().min(0).max(1),
  originality: z3.number().min(0).max(1),
  clarity: z3.number().min(0).max(1),
  authenticity: z3.number().min(0).max(1),
  valueAdd: z3.number().min(0).max(1)
});
var engagementAnalysisSchema = z3.object({
  overallScore: z3.number().min(0).max(1),
  virality: z3.number().min(0).max(1),
  conversionPotential: z3.number().min(0).max(1),
  communityBuilding: z3.number().min(0).max(1),
  thoughtLeadership: z3.number().min(0).max(1)
});
var entitiesSchema = z3.object({
  people: z3.array(z3.string()),
  organizations: z3.array(z3.string()),
  products: z3.array(z3.string()),
  locations: z3.array(z3.string()),
  events: z3.array(z3.string())
});
var contentAnalysisSchema = z3.object({
  type: z3.enum([
    "news",
    "opinion",
    "announcement",
    "question",
    "promotion",
    "thought_leadership",
    "educational",
    "entertainment",
    "other"
  ]),
  format: z3.enum([
    "statement",
    "question",
    "poll",
    "call_to_action",
    "thread",
    "image_focus",
    "video_focus",
    "link_share",
    "other"
  ]),
  sentiment: z3.enum([
    "positive",
    "negative",
    "neutral",
    "controversial",
    "inspirational"
  ]),
  confidence: z3.number().min(0).max(1),
  primaryTopics: z3.array(z3.string()),
  secondaryTopics: z3.array(z3.string()),
  entities: entitiesSchema,
  hashtagsUsed: z3.array(z3.string()),
  qualityMetrics: qualityMetricsSchema,
  engagementAnalysis: engagementAnalysisSchema
});
var callToActionSchema = z3.object({
  present: z3.boolean(),
  type: z3.enum(["follow", "click", "share", "reply", "other", "none"]),
  effectiveness: z3.number().min(0).max(1)
});
var copywritingSchema = z3.object({
  effectiveElements: z3.array(z3.string()),
  hooks: z3.array(z3.string()),
  callToAction: callToActionSchema
});
var trendAlignmentSchema = z3.object({
  currentTrends: z3.array(z3.string()),
  emergingOpportunities: z3.array(z3.string()),
  relevanceScore: z3.number().min(0).max(1)
});
var contentStrategiesSchema = z3.object({
  whatWorked: z3.array(z3.string()),
  improvement: z3.array(z3.string())
});
var marketingInsightsSchema = z3.object({
  targetAudience: z3.array(z3.string()),
  keyTakeaways: z3.array(z3.string()),
  contentStrategies: contentStrategiesSchema,
  trendAlignment: trendAlignmentSchema,
  copywriting: copywritingSchema
});
var confidenceMetricsSchema = z3.object({
  linguisticRisk: z3.number().min(0).max(1),
  topicMismatch: z3.number().min(0).max(1),
  engagementAnomaly: z3.number().min(0).max(1),
  promotionalIntent: z3.number().min(0).max(1),
  accountTrustSignals: z3.number().min(0).max(1)
});
var spamAnalysisSchema = z3.object({
  isSpam: z3.boolean(),
  spamScore: z3.number().min(0).max(1),
  reasons: z3.array(z3.string()),
  confidenceMetrics: confidenceMetricsSchema
});
var engagementStrategySchema = z3.object({
  action: z3.string(),
  rationale: z3.string(),
  priority: z3.enum(["high", "medium", "low"]),
  expectedOutcome: z3.string()
});
var contentCreationSchema = z3.object({
  contentType: z3.string(),
  focus: z3.string(),
  keyElements: z3.array(z3.string())
});
var networkBuildingSchema = z3.object({
  targetType: z3.enum(["user", "community", "hashtag"]),
  target: z3.string(),
  approach: z3.string(),
  value: z3.string()
});
var actionableRecommendationsSchema = z3.object({
  engagementStrategies: z3.array(engagementStrategySchema),
  contentCreation: z3.array(contentCreationSchema),
  networkBuilding: z3.array(networkBuildingSchema)
});
var tweetAnalysisSchema = z3.object({
  contentAnalysis: contentAnalysisSchema,
  marketingInsights: marketingInsightsSchema,
  actionableRecommendations: actionableRecommendationsSchema,
  spamAnalysis: spamAnalysisSchema
});

// src/bork-protocol/utils/tweet-analysis/process-single-tweet.ts
import {
  ModelClass as ModelClass2,
  composeContext,
  elizaLogger as elizaLogger13,
  generateObject,
  stringToUuid as stringToUuid3
} from "@elizaos/core";

// src/bork-protocol/utils/topic-weights/topics.ts
import { elizaLogger as elizaLogger10 } from "@elizaos/core";
function calculateTopicWeight(impactScore, engagementMetrics, sentiment, confidence) {
  const sigmoid = (x, k, x0) => 1 / (1 + Math.exp(-k * (Math.log(x + 1) - Math.log(x0))));
  const normalizedEngagement = {
    // Use logarithmic sigmoid to better handle order-of-magnitude differences
    likes: sigmoid(engagementMetrics.likes, 1.5, 1e3),
    // x0 = 1000 likes
    retweets: sigmoid(engagementMetrics.retweets, 1.5, 500),
    // x0 = 500 retweets
    replies: sigmoid(engagementMetrics.replies, 1.5, 200),
    // x0 = 200 replies
    virality: engagementMetrics.virality,
    conversionPotential: engagementMetrics.conversionPotential,
    communityBuilding: engagementMetrics.communityBuilding,
    thoughtLeadership: engagementMetrics.thoughtLeadership
  };
  const engagementScore = (normalizedEngagement.likes * 0.3 + normalizedEngagement.retweets * 0.25 + normalizedEngagement.replies * 0.2 + normalizedEngagement.virality * 0.25) * 0.3;
  const influenceScore = (normalizedEngagement.conversionPotential * 0.4 + normalizedEngagement.communityBuilding * 0.3 + normalizedEngagement.thoughtLeadership * 0.3) * 0.3;
  const sentimentMultiplier = sentiment === "positive" ? 1 : sentiment === "neutral" ? 0.7 : 0.4;
  const sentimentScore = sentimentMultiplier * 0.2;
  const impactConfidenceScore = (impactScore * 0.6 + confidence * 0.4) * 0.2;
  return Math.max(
    0,
    Math.min(
      1,
      engagementScore + influenceScore + sentimentScore + impactConfidenceScore
    )
  );
}
async function updateTopicWeights(tweetTopics, tweetAnalysis, tweet, context) {
  if (!tweetTopics || tweetTopics.length === 0) {
    elizaLogger10.debug(`${context} No topics to process, skipping`);
    return;
  }
  try {
    for (const topic of tweetTopics) {
      if (!topic || typeof topic !== "string") {
        elizaLogger10.warn(`${context} Invalid topic found, skipping`);
        continue;
      }
      const engagementMetrics = {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
        virality: tweetAnalysis.contentAnalysis.engagementAnalysis.virality,
        conversionPotential: tweetAnalysis.contentAnalysis.engagementAnalysis.conversionPotential,
        communityBuilding: tweetAnalysis.contentAnalysis.engagementAnalysis.communityBuilding,
        thoughtLeadership: tweetAnalysis.contentAnalysis.engagementAnalysis.thoughtLeadership
      };
      const weight = calculateTopicWeight(
        tweetAnalysis.contentAnalysis.engagementAnalysis.overallScore,
        engagementMetrics,
        tweetAnalysis.contentAnalysis.sentiment,
        tweetAnalysis.contentAnalysis.confidence
      );
      try {
        const topicWeight = {
          topic,
          weight,
          impact_score: tweetAnalysis.contentAnalysis.engagementAnalysis.overallScore,
          created_at: /* @__PURE__ */ new Date(),
          engagement_metrics: engagementMetrics,
          sentiment: tweetAnalysis.contentAnalysis.sentiment,
          confidence: tweetAnalysis.contentAnalysis.confidence,
          tweet_id: tweet.tweet_id,
          id: v4_default()
        };
        await tweetQueries.createTopicWeight(topicWeight);
        elizaLogger10.debug(
          `${context} Created new topic weight entry for ${topic}`,
          {
            weight,
            impactScore: tweetAnalysis.contentAnalysis.engagementAnalysis.overallScore,
            tweetId: tweet.tweet_id
          }
        );
      } catch (updateError) {
        elizaLogger10.error(
          `${context} Error creating topic weight for ${topic}:`,
          {
            error: updateError instanceof Error ? updateError.message : String(updateError),
            topic
          }
        );
      }
    }
    elizaLogger10.info(
      `${context} Created weight entries for ${tweetTopics.length} topics`
    );
  } catch (error) {
    elizaLogger10.error(`${context} Error processing topic weights:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetTopics
    });
  }
}
async function getAggregatedTopicWeights(timeframeHours = 168) {
  try {
    elizaLogger10.info(
      `[TopicWeights] Getting aggregated weights for last ${timeframeHours} hours`
    );
    const allWeights = await tweetQueries.getTopicWeights();
    elizaLogger10.info(
      `[TopicWeights] Total topic weights in database: ${allWeights.length}`
    );
    if (allWeights.length === 0) {
      elizaLogger10.warn("[TopicWeights] No topic weights found in database");
      return [];
    }
    const trends = await tweetQueries.getTopicTrends(timeframeHours);
    elizaLogger10.info(
      `[TopicWeights] Found ${trends.length} topic trends in the last ${timeframeHours} hours`
    );
    if (trends.length === 0) {
      elizaLogger10.warn(
        `[TopicWeights] No topic trends found in the last ${timeframeHours} hours`
      );
      return allWeights;
    }
    if (trends.length > 0) {
      elizaLogger10.debug("[TopicWeights] Sample trend data:", {
        firstTrend: trends[0],
        lastTrend: trends[trends.length - 1],
        trendCount: trends.length
      });
    }
    const trendMap = new Map(
      trends.map((trend) => [
        trend.topic,
        {
          avgWeight: trend.avgWeight,
          totalEngagement: trend.totalEngagement,
          mentionCount: trend.mentionCount,
          // Calculate momentum as the rate of change in weight
          momentum: trend.avgWeight / Math.max(1, trend.mentionCount)
        }
      ])
    );
    const recentWeights = await tweetQueries.getRecentTopicWeights(timeframeHours);
    elizaLogger10.info(
      `[TopicWeights] Found ${recentWeights.length} recent weights in the last ${timeframeHours} hours`
    );
    if (recentWeights.length === 0) {
      elizaLogger10.warn(
        `[TopicWeights] No recent weights found in the last ${timeframeHours} hours`
      );
      return allWeights;
    }
    const topicMap = /* @__PURE__ */ new Map();
    for (const weight of recentWeights) {
      const trend = trendMap.get(weight.topic);
      if (!topicMap.has(weight.topic)) {
        topicMap.set(weight.topic, {
          ...weight,
          // Adjust weight based on trend data
          weight: trend ? weight.weight * 0.6 + trend.avgWeight * 0.2 + trend.momentum * 0.2 : weight.weight
        });
      }
    }
    const result = Array.from(topicMap.values());
    elizaLogger10.info(
      `[TopicWeights] Returning ${result.length} aggregated topic weights`
    );
    return result;
  } catch (error) {
    elizaLogger10.error("[Topic Processing] Error getting aggregated weights:", {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

// src/bork-protocol/utils/tweet-analysis/process-accounts.ts
import { elizaLogger as elizaLogger11 } from "@elizaos/core";
import { Scraper } from "agent-twitter-client";
function getMentionsFromText(text) {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex) || [];
  return matches.map((match) => match.slice(1));
}
function getMentionsFromThread(thread) {
  const mentions = /* @__PURE__ */ new Set();
  for (const tweet of thread) {
    if (typeof tweet === "object" && tweet && "text" in tweet) {
      const text = String(tweet.text || "");
      for (const mention of getMentionsFromText(text)) {
        mentions.add(mention);
      }
    }
  }
  return Array.from(mentions);
}
async function storeAccountInfo(tweet, topics = []) {
  try {
    if (!tweet.username) {
      elizaLogger11.warn(
        "[Mentions Processing] Tweet has no username, skipping mentions"
      );
      return;
    }
    const textMentions = getMentionsFromText(tweet.text || "");
    const threadMentions = getMentionsFromThread(tweet.thread || []);
    const metadataMentions = (tweet.mentions || []).map((m) => m.username).filter(Boolean);
    const allMentions = /* @__PURE__ */ new Set([
      ...textMentions,
      ...threadMentions,
      ...metadataMentions
    ]);
    elizaLogger11.info("[Mentions Processing] Processing mentions:");
    elizaLogger11.debug({
      textMentions,
      threadMentions,
      metadataMentions,
      totalUnique: allMentions.size,
      fromUsername: tweet.username,
      hasIds: Array.from(allMentions),
      topics
    });
    const scraper = new Scraper();
    const authorProfile = await scraper.getProfile(tweet.username);
    await tweetQueries.insertTargetAccount({
      username: tweet.username,
      userId: tweet.userId?.toString() || authorProfile?.userId || "",
      displayName: tweet.name || authorProfile?.name || tweet.username,
      description: authorProfile?.biography || "",
      followersCount: authorProfile?.followersCount || 0,
      followingCount: authorProfile?.followingCount || 0,
      friendsCount: authorProfile?.friendsCount || 0,
      mediaCount: authorProfile?.mediaCount || 0,
      statusesCount: authorProfile?.tweetsCount || 0,
      likesCount: authorProfile?.likesCount || 0,
      listedCount: authorProfile?.listedCount || 0,
      tweetsCount: authorProfile?.tweetsCount || 0,
      isPrivate: authorProfile?.isPrivate || false,
      isVerified: authorProfile?.isVerified || false,
      isBlueVerified: authorProfile?.isBlueVerified || false,
      joinedAt: authorProfile?.joined || null,
      location: authorProfile?.location || "",
      avatarUrl: authorProfile?.avatar || null,
      bannerUrl: authorProfile?.banner || null,
      websiteUrl: authorProfile?.website || null,
      canDm: authorProfile?.canDm || false,
      createdAt: /* @__PURE__ */ new Date(),
      lastUpdated: /* @__PURE__ */ new Date(),
      isActive: true,
      source: "tweet_author",
      avgLikes50: 0,
      avgRetweets50: 0,
      avgReplies50: 0,
      avgViews50: 0,
      engagementRate50: 0,
      influenceScore: 0,
      last50TweetsUpdatedAt: null
    });
    for (const topic of topics) {
      try {
        await accountTopicQueries.upsertAccountTopic(tweet.username, topic);
      } catch (topicError) {
        elizaLogger11.error(
          "[Mentions Processing] Error updating author account-topic relationship:",
          {
            error: topicError instanceof Error ? topicError.message : String(topicError),
            username: tweet.username,
            topic
          }
        );
      }
    }
    for (const mentionedUsername of allMentions) {
      try {
        if (!mentionedUsername) {
          continue;
        }
        const mentionedProfile = await scraper.getProfile(mentionedUsername);
        await tweetQueries.insertTargetAccount({
          username: mentionedUsername,
          userId: mentionedProfile?.userId || "",
          displayName: mentionedProfile?.name || mentionedUsername,
          description: mentionedProfile?.biography || "",
          followersCount: mentionedProfile?.followersCount || 0,
          followingCount: mentionedProfile?.followingCount || 0,
          friendsCount: mentionedProfile?.friendsCount || 0,
          mediaCount: mentionedProfile?.mediaCount || 0,
          statusesCount: mentionedProfile?.tweetsCount || 0,
          likesCount: mentionedProfile?.likesCount || 0,
          listedCount: mentionedProfile?.listedCount || 0,
          tweetsCount: mentionedProfile?.tweetsCount || 0,
          isPrivate: mentionedProfile?.isPrivate || false,
          isVerified: mentionedProfile?.isVerified || false,
          isBlueVerified: mentionedProfile?.isBlueVerified || false,
          joinedAt: mentionedProfile?.joined || null,
          location: mentionedProfile?.location || "",
          avatarUrl: mentionedProfile?.avatar || null,
          bannerUrl: mentionedProfile?.banner || null,
          websiteUrl: mentionedProfile?.website || null,
          canDm: mentionedProfile?.canDm || false,
          createdAt: /* @__PURE__ */ new Date(),
          lastUpdated: /* @__PURE__ */ new Date(),
          isActive: true,
          source: "mention",
          avgLikes50: 0,
          avgRetweets50: 0,
          avgReplies50: 0,
          avgViews50: 0,
          engagementRate50: 0,
          influenceScore: 0,
          last50TweetsUpdatedAt: null
        });
        for (const topic of topics) {
          try {
            await accountTopicQueries.upsertAccountTopic(
              mentionedUsername,
              topic
            );
          } catch (topicError) {
            elizaLogger11.error(
              "[Mentions Processing] Error updating mentioned user account-topic relationship:",
              {
                error: topicError instanceof Error ? topicError.message : String(topicError),
                username: mentionedUsername,
                topic
              }
            );
          }
        }
        await userMentionQueries.upsertMentionRelationship(
          tweet.username,
          mentionedUsername,
          tweet.tweet_id,
          new Date(tweet.timestamp * 1e3)
        );
      } catch (error) {
        elizaLogger11.error("[Mentions Processing] Error processing mention:", {
          fromUsername: tweet.username,
          toUsername: mentionedUsername,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  } catch (error) {
    elizaLogger11.error("[Mentions Processing] Error processing mentions:", {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id
    });
  }
}

// src/bork-protocol/utils/tweet-analysis/process-knowledge.ts
import {
  elizaLogger as elizaLogger12,
  stringToUuid as stringToUuid2
} from "@elizaos/core";
async function extractAndStoreKnowledge(runtime, tweet, analysis, logPrefix = "[Knowledge Extraction]") {
  try {
    elizaLogger12.info(
      `${logPrefix} Starting knowledge extraction for tweet ${tweet.tweet_id}`
    );
    if (!analysis || !analysis.contentAnalysis) {
      elizaLogger12.warn(
        `${logPrefix} No valid analysis found for tweet ${tweet.tweet_id}`
      );
      return;
    }
    if (analysis.spamAnalysis.isSpam === true && analysis.spamAnalysis.spamScore > 0.7) {
      elizaLogger12.info(
        `${logPrefix} Skipping knowledge extraction for spam tweet ${tweet.tweet_id}`
      );
      return;
    }
    const topics = [
      ...analysis.contentAnalysis.primaryTopics || [],
      ...analysis.contentAnalysis.secondaryTopics || []
    ];
    const tweetType = analysis.contentAnalysis.type;
    const sentiment = analysis.contentAnalysis.sentiment;
    const impactScore = analysis.contentAnalysis.engagementAnalysis?.overallScore || 0.5;
    const tweetKnowledgeId = stringToUuid2(`tweet-knowledge-${tweet.tweet_id}`);
    const analysisContent = {
      mainContent: analysis.contentAnalysis.summary || tweet.text,
      keyPoints: analysis.contentAnalysis.keyPoints || [],
      entities: analysis.contentAnalysis.entities || [],
      sentiment: analysis.contentAnalysis.sentiment,
      type: analysis.contentAnalysis.type,
      topics,
      originalText: tweet.text
    };
    const tweetKnowledge = {
      id: tweetKnowledgeId,
      agentId: runtime.agentId,
      content: {
        text: JSON.stringify(analysisContent),
        metadata: {
          source: "twitter",
          sourceId: tweet.tweet_id,
          sourceUrl: tweet.permanentUrl,
          authorUsername: tweet.username,
          authorUserId: tweet.userId?.toString(),
          tweetType,
          sentiment,
          impactScore,
          topics,
          isOpinion: tweetType === "opinion",
          isFactual: tweetType === "factual" || tweetType === "informative",
          hasQuestion: tweetType === "question",
          publicMetrics: {
            likes: tweet.likes || 0,
            retweets: tweet.retweets || 0,
            replies: tweet.replies || 0
          },
          timestamp: tweet.timestamp,
          isMain: true,
          isThreadMerged: tweet.isThreadMerged,
          threadSize: tweet.threadSize || 1,
          analysisVersion: "1.0"
          // Add version tracking for analysis format
        }
      },
      embedding: void 0,
      createdAt: Date.now()
    };
    const tweetMemory = {
      id: tweetKnowledgeId,
      content: {
        text: JSON.stringify(analysisContent)
      },
      agentId: runtime.agentId,
      userId: stringToUuid2(`twitter-user-${tweet.userId}`),
      // TODO Should we create a random room all the time?
      roomId: stringToUuid2(v4_default())
    };
    elizaLogger12.info(
      `${logPrefix} Generating embedding for analysis of tweet ${tweet.tweet_id}`
    );
    await runtime.messageManager.addEmbeddingToMemory(tweetMemory);
    if (tweetMemory.embedding) {
      elizaLogger12.debug(
        `${logPrefix} Successfully generated embedding for tweet ${tweet.tweet_id}`,
        {
          embeddingSize: tweetMemory.embedding instanceof Float32Array ? tweetMemory.embedding.length : tweetMemory.embedding.length,
          embeddingType: tweetMemory.embedding instanceof Float32Array ? "Float32Array" : "Array"
        }
      );
      tweetKnowledge.embedding = tweetMemory.embedding instanceof Float32Array ? tweetMemory.embedding : new Float32Array(tweetMemory.embedding);
    } else {
      elizaLogger12.warn(
        `${logPrefix} Failed to generate embedding for tweet ${tweet.tweet_id}`
      );
    }
    await runtime.databaseAdapter.createKnowledge(tweetKnowledge);
    elizaLogger12.debug(
      `${logPrefix} Stored main tweet analysis knowledge for ${tweet.tweet_id}`
    );
  } catch (error) {
    elizaLogger12.error(`${logPrefix} Error extracting knowledge:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id
    });
  }
}
async function fetchAndFormatKnowledge(runtime, tweet, logPrefix = "[Knowledge Retrieval]") {
  try {
    elizaLogger12.info(
      `${logPrefix} Fetching knowledge for tweet ${tweet.tweet_id}`
    );
    const tweetMemory = {
      id: stringToUuid2(`tweet-memory-${tweet.tweet_id}`),
      content: {
        text: tweet.text
      },
      agentId: runtime.agentId,
      userId: stringToUuid2(`twitter-user-${tweet.userId}`),
      roomId: stringToUuid2(v4_default())
    };
    elizaLogger12.info(
      `${logPrefix} Generating embedding for tweet ${tweet.tweet_id} to search for relevant knowledge`
    );
    await runtime.messageManager.addEmbeddingToMemory(tweetMemory);
    if (!tweetMemory.embedding) {
      elizaLogger12.warn(
        `${logPrefix} No embedding generated for tweet ${tweet.tweet_id}`
      );
      return "";
    }
    elizaLogger12.info(
      `${logPrefix} Successfully generated search embedding for tweet ${tweet.tweet_id}`
    );
    elizaLogger12.debug({
      embeddingSize: tweetMemory.embedding instanceof Float32Array ? tweetMemory.embedding.length : tweetMemory.embedding.length,
      embeddingType: tweetMemory.embedding instanceof Float32Array ? "Float32Array" : "Array"
    });
    const embedding = tweetMemory.embedding instanceof Float32Array ? tweetMemory.embedding : new Float32Array(tweetMemory.embedding);
    const relevantKnowledge = await runtime.databaseAdapter.searchKnowledge({
      agentId: runtime.agentId,
      embedding,
      match_threshold: 0.7,
      match_count: 5,
      searchText: tweet.text
    });
    if (relevantKnowledge.length === 0) {
      elizaLogger12.info(
        `${logPrefix} No relevant knowledge found for tweet ${tweet.tweet_id}`
      );
      return "";
    }
    elizaLogger12.info(
      `${logPrefix} Found ${relevantKnowledge.length} relevant knowledge items for tweet ${tweet.tweet_id}`
    );
    const knowledgeContext = `

Relevant Knowledge:
${relevantKnowledge.map((k) => {
      const metadata = k.content.metadata || {};
      const topics = Array.isArray(metadata.topics) ? metadata.topics : [];
      const metrics = metadata.publicMetrics || {};
      let analysisContent;
      try {
        analysisContent = JSON.parse(k.content.text);
      } catch {
        analysisContent = { mainContent: k.content.text };
      }
      return `- ${analysisContent.mainContent}
${analysisContent.keyPoints?.length ? `Key Points:
${analysisContent.keyPoints.map((point) => `  - ${point}`).join("\n")}
` : ""}
Type: ${metadata.tweetType || "unknown"}
Confidence: ${metadata.confidence || "unknown"}
Similarity: ${(k.similarity || 0).toFixed(2)}
Topics: ${topics.join(", ") || "none"}
Impact Score: ${metadata.impactScore || "unknown"}
Engagement: ${metrics ? `Likes: ${metrics.likes || 0}, Retweets: ${metrics.retweets || 0}, Replies: ${metrics.replies || 0}` : "unknown"}
Is Opinion: ${metadata.isOpinion ? "Yes" : "No"}
Is Factual: ${metadata.isFactual ? "Yes" : "No"}
Has Question: ${metadata.hasQuestion ? "Yes" : "No"}`;
    }).join("\n\n")}`;
    elizaLogger12.info(
      `${logPrefix} Successfully fetched and formatted knowledge for tweet ${tweet.tweet_id}`
    );
    elizaLogger12.debug({
      knowledgeCount: relevantKnowledge.length
    });
    return knowledgeContext;
  } catch (error) {
    elizaLogger12.error(`${logPrefix} Error fetching knowledge:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id
    });
    return "";
  }
}

// src/bork-protocol/utils/tweet-analysis/process-single-tweet.ts
async function processSingleTweet(runtime, twitterService, tweet, topicWeights, logPrefix = "[Tweet Analysis]") {
  try {
    elizaLogger13.info(
      `${logPrefix} Starting to process tweet ${tweet.tweet_id}`
    );
    await twitterService.cacheTweet({
      id: tweet.tweet_id,
      // Use Twitter's numeric ID here
      text: tweet.text,
      userId: tweet.userId,
      username: tweet.username,
      name: tweet.name,
      timestamp: tweet.timestamp,
      timeParsed: tweet.timeParsed,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      views: tweet.views,
      bookmarkCount: tweet.bookmarkCount,
      conversationId: tweet.conversationId,
      permanentUrl: tweet.permanentUrl,
      html: tweet.html,
      inReplyToStatus: tweet.inReplyToStatus,
      inReplyToStatusId: tweet.inReplyToStatusId,
      quotedStatus: tweet.quotedStatus,
      quotedStatusId: tweet.quotedStatusId,
      retweetedStatus: tweet.retweetedStatus,
      retweetedStatusId: tweet.retweetedStatusId,
      thread: tweet.thread,
      isQuoted: tweet.isQuoted,
      isPin: tweet.isPin,
      isReply: tweet.isReply,
      isRetweet: tweet.isRetweet,
      isSelfThread: tweet.isSelfThread,
      sensitiveContent: tweet.sensitiveContent,
      hashtags: tweet.hashtags,
      mentions: tweet.mentions,
      photos: tweet.photos,
      urls: tweet.urls,
      videos: tweet.videos,
      place: tweet.place,
      poll: tweet.poll
    });
    const template = tweetAnalysisTemplate({
      text: tweet.text,
      // This is the merged text
      public_metrics: {
        like_count: tweet.likes || 0,
        retweet_count: tweet.retweets || 0,
        reply_count: tweet.replies || 0
      },
      topics: runtime.character.topics || [],
      topicWeights: topicWeights.map((tw) => ({
        topic: tw.topic,
        weight: tw.weight
      })),
      isThreadMerged: tweet.isThreadMerged,
      threadSize: tweet.threadSize,
      originalText: tweet.originalText
    });
    const memoryUserId = stringToUuid3(`twitter-user-${tweet.userId}`);
    try {
      const state = await runtime.composeState(
        {
          content: {
            text: tweet.text,
            isThreadMerged: tweet.isThreadMerged,
            threadSize: tweet.threadSize,
            originalText: tweet.originalText
          },
          userId: memoryUserId,
          agentId: runtime.agentId,
          roomId: v4_default()
        },
        {
          twitterService,
          twitterUserName: runtime.getSetting("TWITTER_USERNAME") || "",
          currentPost: tweet.text
        }
      );
      const knowledgeContext = await fetchAndFormatKnowledge(
        runtime,
        tweet,
        `${logPrefix} [Knowledge]`
      );
      const context = composeContext({
        state,
        template: template.context + (knowledgeContext || "")
      });
      try {
        const { object } = await generateObject({
          runtime,
          context,
          modelClass: ModelClass2.SMALL,
          schema: tweetAnalysisSchema
        });
        const analysis = object;
        elizaLogger13.info(`${logPrefix} Generated analysis`);
        elizaLogger13.debug({
          contentType: analysis.contentAnalysis.type,
          sentiment: analysis.contentAnalysis.sentiment,
          isSpam: analysis.spamAnalysis.isSpam
        });
        if (!analysis || typeof analysis !== "object") {
          elizaLogger13.error(`${logPrefix} Invalid analysis response:`, {
            analysis,
            tweetId: tweet.tweet_id
          });
          throw new Error("Invalid analysis response structure");
        }
        const parsedAnalysis = extractAndRepairAnalysis(analysis);
        await updateUserSpamData(
          tweet.userId?.toString() || "",
          parsedAnalysis.spamAnalysis.spamScore,
          parsedAnalysis.spamAnalysis.reasons,
          logPrefix
        );
        const isSpam = parsedAnalysis.spamAnalysis.isSpam === true && parsedAnalysis.spamAnalysis.spamScore > 0.7;
        if (isSpam) {
          await tweetQueries.updateTweetStatus(tweet.tweet_id, "spam");
          elizaLogger13.warn(
            `${logPrefix} Tweet ${tweet.tweet_id} identified as spam - skipping analysis`
          );
          elizaLogger13.debug({
            tweetId: tweet.tweet_id,
            spamScore: parsedAnalysis.spamAnalysis.spamScore,
            reasons: parsedAnalysis.spamAnalysis.reasons,
            isThreadMerged: tweet.isThreadMerged,
            threadSize: tweet.threadSize
          });
          return;
        }
        if (tweet.username && tweet.userId) {
          elizaLogger13.info(
            `${logPrefix} Upserting non-spam tweet author @${tweet.username} to target accounts`
          );
        }
        const analysisId = stringToUuid3(v4_default());
        try {
          await tweetQueries.processTweetsInTransaction(async (client) => {
            try {
              elizaLogger13.info(
                `${logPrefix} Saving analysis for tweet ${tweet.tweet_id}`
              );
              elizaLogger13.debug({
                analysisId: analysisId.toString(),
                tweetId: tweet.tweet_id,
                isThreadMerged: tweet.isThreadMerged,
                threadSize: tweet.threadSize,
                textLength: tweet.text.length,
                originalTextLength: tweet.originalText.length
              });
              await tweetQueries.insertTweetAnalysis(
                analysisId,
                tweet.tweet_id,
                parsedAnalysis.contentAnalysis.type,
                parsedAnalysis.contentAnalysis.sentiment,
                parsedAnalysis.contentAnalysis.confidence,
                {
                  likes: tweet.likes || 0,
                  retweets: tweet.retweets || 0,
                  replies: tweet.replies || 0,
                  spamScore: parsedAnalysis.spamAnalysis.spamScore,
                  spamViolations: parsedAnalysis.spamAnalysis.reasons,
                  isThreadMerged: tweet.isThreadMerged,
                  threadSize: tweet.threadSize,
                  originalTextLength: tweet.originalText.length,
                  mergedTextLength: tweet.text.length,
                  hashtagsUsed: parsedAnalysis.contentAnalysis.hashtagsUsed || [],
                  engagementMetrics: parsedAnalysis.contentAnalysis.engagementAnalysis
                },
                // Flatten entities into a single array
                [
                  ...parsedAnalysis.contentAnalysis.entities.people || [],
                  ...parsedAnalysis.contentAnalysis.entities.organizations || [],
                  ...parsedAnalysis.contentAnalysis.entities.products || [],
                  ...parsedAnalysis.contentAnalysis.entities.locations || [],
                  ...parsedAnalysis.contentAnalysis.entities.events || []
                ],
                // Combine primary and secondary topics
                [
                  ...parsedAnalysis.contentAnalysis.primaryTopics || [],
                  ...parsedAnalysis.contentAnalysis.secondaryTopics || []
                ],
                parsedAnalysis.contentAnalysis.engagementAnalysis.overallScore,
                new Date(tweet.timestamp * 1e3),
                tweet.userId?.toString() || "",
                tweet.text || "",
                // Use merged text
                {
                  likes: tweet.likes || 0,
                  retweets: tweet.retweets || 0,
                  replies: tweet.replies || 0
                },
                {
                  hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
                  mentions: Array.isArray(tweet.mentions) ? tweet.mentions.map((mention) => ({
                    username: mention.username || "",
                    id: mention.id || ""
                  })) : [],
                  urls: Array.isArray(tweet.urls) ? tweet.urls : [],
                  topicWeights: topicWeights.map((tw) => ({
                    topic: tw.topic,
                    weight: tw.weight
                  })),
                  entities: parsedAnalysis.contentAnalysis.entities
                  // Store full entity structure
                },
                parsedAnalysis.spamAnalysis,
                {
                  relevance: parsedAnalysis.contentAnalysis.qualityMetrics.relevance,
                  quality: parsedAnalysis.contentAnalysis.qualityMetrics.clarity,
                  engagement: parsedAnalysis.contentAnalysis.engagementAnalysis.overallScore,
                  authenticity: parsedAnalysis.contentAnalysis.qualityMetrics.authenticity,
                  valueAdd: parsedAnalysis.contentAnalysis.qualityMetrics.valueAdd,
                  callToActionEffectiveness: parsedAnalysis.marketingInsights?.copywriting?.callToAction?.effectiveness || 0,
                  trendAlignmentScore: parsedAnalysis.marketingInsights?.trendAlignment?.relevanceScore || 0
                },
                parsedAnalysis.contentAnalysis.format,
                // Store full marketing insights structure
                {
                  targetAudience: parsedAnalysis.marketingInsights?.targetAudience || [],
                  keyTakeaways: parsedAnalysis.marketingInsights?.keyTakeaways || [],
                  contentStrategies: {
                    whatWorked: parsedAnalysis.marketingInsights?.contentStrategies?.whatWorked || [],
                    improvement: parsedAnalysis.marketingInsights?.contentStrategies?.improvement || []
                  },
                  trendAlignment: {
                    currentTrends: parsedAnalysis.marketingInsights?.trendAlignment?.currentTrends || [],
                    emergingOpportunities: parsedAnalysis.marketingInsights?.trendAlignment?.emergingOpportunities || [],
                    relevanceScore: parsedAnalysis.marketingInsights?.trendAlignment?.relevanceScore || 0
                  },
                  copywriting: {
                    effectiveElements: parsedAnalysis.marketingInsights?.copywriting?.effectiveElements || [],
                    hooks: parsedAnalysis.marketingInsights?.copywriting?.hooks || [],
                    callToAction: {
                      present: parsedAnalysis.marketingInsights?.copywriting?.callToAction?.present || false,
                      type: parsedAnalysis.marketingInsights?.copywriting?.callToAction?.type || "none",
                      effectiveness: parsedAnalysis.marketingInsights?.copywriting?.callToAction?.effectiveness || 0
                    }
                  }
                },
                client
              );
              elizaLogger13.info(
                `${logPrefix} Successfully saved analysis for tweet ${tweet.tweet_id}`
              );
              await tweetQueries.updateTweetStatus(
                tweet.tweet_id,
                "analyzed",
                void 0,
                client
              );
              const allTopics = [
                ...parsedAnalysis.contentAnalysis.primaryTopics || [],
                ...parsedAnalysis.contentAnalysis.secondaryTopics || []
              ];
              await updateTopicWeights(
                allTopics,
                parsedAnalysis,
                tweet,
                logPrefix
              );
              await storeAccountInfo(tweet, allTopics);
              try {
                await extractAndStoreKnowledge(
                  runtime,
                  tweet,
                  parsedAnalysis,
                  `${logPrefix} [Knowledge]`
                );
                elizaLogger13.info(
                  `${logPrefix} Successfully extracted knowledge from tweet ${tweet.tweet_id}`
                );
              } catch (knowledgeError) {
                elizaLogger13.error(`${logPrefix} Error extracting knowledge:`, {
                  error: knowledgeError instanceof Error ? knowledgeError.message : String(knowledgeError),
                  tweetId: tweet.tweet_id
                });
              }
              elizaLogger13.info(
                `${logPrefix} Successfully processed tweet ${tweet.tweet_id}`
              );
              elizaLogger13.debug({
                analysisId: analysisId.toString(),
                tweetId: tweet.tweet_id,
                isThreadMerged: tweet.isThreadMerged,
                textLength: tweet.text.length,
                originalTextLength: tweet.originalText.length
              });
            } catch (innerError) {
              elizaLogger13.error(`${logPrefix} Error in transaction:`, {
                error: innerError instanceof Error ? innerError.message : String(innerError),
                tweetId: tweet.tweet_id,
                phase: "analysis_insertion"
              });
              throw innerError;
            }
          });
        } catch (txError) {
          elizaLogger13.error(`${logPrefix} Transaction failed:`, {
            error: txError instanceof Error ? txError.message : String(txError),
            tweetId: tweet.tweet_id
          });
          try {
            await tweetQueries.updateTweetStatus(
              tweet.tweet_id,
              "error",
              `Analysis error: ${txError instanceof Error ? txError.message : String(txError)}`
            );
          } catch (statusError) {
            elizaLogger13.error(
              `${logPrefix} Could not update error status:`,
              statusError
            );
          }
        }
      } catch (aiError) {
        elizaLogger13.error(`${logPrefix} AI analysis error:`, {
          error: aiError instanceof Error ? aiError.message : String(aiError),
          tweetId: tweet.tweet_id
        });
        await tweetQueries.updateTweetStatus(
          tweet.tweet_id,
          "error",
          `AI analysis error: ${aiError instanceof Error ? aiError.message : String(aiError)}`
        );
      }
    } catch (contextError) {
      elizaLogger13.error(`${logPrefix} Error preparing context:`, {
        error: contextError instanceof Error ? contextError.message : String(contextError),
        tweetId: tweet.tweet_id
      });
      await tweetQueries.updateTweetStatus(
        tweet.tweet_id,
        "error",
        `Context error: ${contextError instanceof Error ? contextError.message : String(contextError)}`
      );
    }
  } catch (error) {
    elizaLogger13.error(
      `${logPrefix} Error processing tweet:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

// src/bork-protocol/utils/tweet-analysis/process-tweets.ts
async function processTweets(runtime, twitterService, tweets, topicWeights) {
  try {
    const validTweets = validateTweets(tweets);
    if (validTweets.length === 0) {
      return;
    }
    const tweetsToMerge = prepareTweetsForMerging(validTweets);
    const mergedTweets = await mergeTweetContent(
      twitterService,
      runtime,
      tweetsToMerge
    );
    elizaLogger14.info(
      `[TwitterAccounts] Processing ${mergedTweets.length} tweets`
    );
    await updateMetricsForAuthors(mergedTweets, "[Tweet Processing]");
    for (const tweet of mergedTweets) {
      await processSingleTweet(
        runtime,
        twitterService,
        tweet,
        topicWeights,
        "[Tweet Processing]"
      );
    }
    elizaLogger14.info("[TwitterAccounts] Successfully processed all tweets");
  } catch (error) {
    elizaLogger14.error(
      "[Tweet Processing] Error processing tweets:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

// src/bork-protocol/services/twitter/tweet-queue.service.ts
import { elizaLogger as elizaLogger15 } from "@elizaos/core";
var TweetQueueService = class _TweetQueueService {
  static instance = null;
  tweetQueue = [];
  processedTweetIds = /* @__PURE__ */ new Set();
  isProcessing = false;
  maxQueueSize;
  maxProcessedIdsSize;
  processingTimeout = null;
  runtime;
  twitterService;
  constructor(runtime, twitterService, maxQueueSize = 1e3, maxProcessedIdsSize = 1e4) {
    this.runtime = runtime;
    this.twitterService = twitterService;
    this.maxQueueSize = maxQueueSize;
    this.maxProcessedIdsSize = maxProcessedIdsSize;
  }
  static getInstance(runtime, twitterService, maxQueueSize, maxProcessedIdsSize) {
    if (!_TweetQueueService.instance) {
      _TweetQueueService.instance = new _TweetQueueService(
        runtime,
        twitterService,
        maxQueueSize,
        maxProcessedIdsSize
      );
    }
    return _TweetQueueService.instance;
  }
  /**
   * Start the tweet processing loop
   */
  async start() {
    elizaLogger15.info("[TweetQueueService] Starting tweet processing loop");
    await this.processTweetsLoop();
  }
  /**
   * Stop the tweet processing loop
   */
  async stop() {
    elizaLogger15.info("[TweetQueueService] Stopping tweet processing loop");
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    this.isProcessing = false;
  }
  async processTweetsLoop() {
    try {
      const topicWeights = await tweetQueries.getTopicWeights();
      if (topicWeights.length === 0) {
        elizaLogger15.error(
          "[TweetQueueService] No topic weights found - skipping processing"
        );
        return;
      }
      elizaLogger15.debug(
        `[TweetQueueService] Found ${topicWeights.length} topic weights for processing`
      );
      const tweets = await this.getNextBatch();
      if (tweets.length > 0) {
        this.setProcessing(true);
        await this.processBatch(tweets, topicWeights);
        this.setProcessing(false);
      }
    } catch (error) {
      elizaLogger15.error("[TweetQueueService] Error processing tweets:", error);
      this.setProcessing(false);
    }
    this.processingTimeout = setTimeout(
      () => void this.processTweetsLoop(),
      5e3
      // 5 second delay between processing cycles
    );
  }
  async processBatch(tweets, topicWeights) {
    try {
      elizaLogger15.info(
        `[TweetQueueService] Processing batch of ${tweets.length} tweets`
      );
      await processTweets(
        this.runtime,
        this.twitterService,
        tweets,
        topicWeights
      );
      elizaLogger15.info(
        `[TweetQueueService] Successfully processed ${tweets.length} tweets`
      );
      const updatedWeights = await tweetQueries.getTopicWeights();
      elizaLogger15.info(
        `[TweetQueueService] Topic weights after processing: ${updatedWeights.length}`
      );
    } catch (error) {
      elizaLogger15.error(
        "[TweetQueueService] Error in batch processing:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  /**
   * Add tweets to the processing queue with specified priority and source
   */
  async addTweets(tweets, source, priority = 1) {
    const newTweets = tweets.filter((tweet) => {
      if (!tweet.id || this.processedTweetIds.has(tweet.id)) {
        elizaLogger15.debug(
          `[TweetQueueService] Skipping duplicate or invalid tweet: ${tweet.id}`
        );
        return false;
      }
      return true;
    });
    const queuedTweets = newTweets.map((tweet) => ({
      tweet,
      priority,
      timestamp: Date.now(),
      source
    }));
    this.tweetQueue.push(...queuedTweets);
    this.tweetQueue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
    if (this.tweetQueue.length > this.maxQueueSize) {
      const removed = this.tweetQueue.length - this.maxQueueSize;
      this.tweetQueue = this.tweetQueue.slice(0, this.maxQueueSize);
      elizaLogger15.warn(
        `[TweetQueueService] Queue exceeded max size. Removed ${removed} lowest priority tweets.`
      );
    }
    elizaLogger15.info(
      `[TweetQueueService] Added ${newTweets.length} tweets from ${source} to queue. Queue size: ${this.tweetQueue.length}`
    );
  }
  /**
   * Get next batch of tweets for processing
   */
  async getNextBatch(batchSize = 10) {
    if (this.isProcessing) {
      elizaLogger15.debug(
        "[TweetQueueService] Queue is currently being processed, skipping batch"
      );
      return [];
    }
    const batch = this.tweetQueue.slice(0, batchSize);
    this.tweetQueue = this.tweetQueue.slice(batchSize);
    for (const item of batch) {
      if (item.tweet.id) {
        this.processedTweetIds.add(item.tweet.id);
      }
    }
    if (this.processedTweetIds.size > this.maxProcessedIdsSize) {
      const idsArray = Array.from(this.processedTweetIds);
      this.processedTweetIds = new Set(
        idsArray.slice(-this.maxProcessedIdsSize)
      );
      elizaLogger15.info(
        `[TweetQueueService] Trimmed processed tweets set to ${this.maxProcessedIdsSize} entries`
      );
    }
    if (batch.length > 0) {
      elizaLogger15.info(
        `[TweetQueueService] Retrieved batch of ${batch.length} tweets for processing`
      );
    }
    return batch.map((item) => item.tweet);
  }
  /**
   * Get current queue metrics
   */
  getMetrics() {
    const sourceBreakdown = this.tweetQueue.reduce(
      (acc, item) => {
        acc[item.source]++;
        return acc;
      },
      {
        search: 0,
        account: 0,
        discovery: 0
      }
    );
    return {
      queueSize: this.tweetQueue.length,
      processedCount: this.processedTweetIds.size,
      isProcessing: this.isProcessing,
      sourceBreakdown
    };
  }
  /**
   * Check if a tweet has been processed
   */
  hasBeenProcessed(tweetId) {
    return this.processedTweetIds.has(tweetId);
  }
  /**
   * Set processing state
   */
  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    elizaLogger15.debug(
      `[TweetQueueService] Processing state set to: ${isProcessing}`
    );
  }
  /**
   * Clear the queue and processed tweets set
   */
  clear() {
    this.tweetQueue = [];
    this.processedTweetIds.clear();
    this.isProcessing = false;
    elizaLogger15.info("[TweetQueueService] Queue and processed set cleared");
  }
};

// src/bork-protocol/services/twitter/twitter-service.ts
import { elizaLogger as elizaLogger20 } from "@elizaos/core";
import { SearchMode as SearchMode2 } from "agent-twitter-client";

// src/bork-protocol/services/twitter/twitter-auth.service.ts
import { elizaLogger as elizaLogger16 } from "@elizaos/core";
var TwitterAuthService = class {
  twitterClient;
  runtime;
  profile = null;
  constructor(twitterClient, runtime) {
    this.twitterClient = twitterClient;
    this.runtime = runtime;
  }
  async initialize() {
    elizaLogger16.info("[TwitterAuthService] Initializing authentication");
    const username = this.runtime.getSetting("TWITTER_USERNAME");
    if (!username) {
      elizaLogger16.error("[TwitterAuthService] No Twitter username configured");
      return false;
    }
    const cachedCookies = await this.getCachedCookies(username);
    if (cachedCookies && cachedCookies.length > 0) {
      elizaLogger16.info(
        `[TwitterAuthService] Found ${cachedCookies.length} cached cookies for ${username}`
      );
      await this.setCookiesFromArray(cachedCookies);
      elizaLogger16.info("[TwitterAuthService] Successfully set cached cookies");
      this.profile = await this.fetchProfile(username);
      if (this.profile) {
        elizaLogger16.info(
          "[TwitterAuthService] Successfully verified cached cookies"
        );
        return true;
      }
      elizaLogger16.warn(
        "[TwitterAuthService] Cached cookies appear to be invalid, will re-authenticate"
      );
    }
    elizaLogger16.info(
      "[TwitterAuthService] No valid cached cookies found, will need to authenticate"
    );
    const authenticated = await this.authenticateWithCookies();
    if (!authenticated) {
      elizaLogger16.error(
        "[TwitterAuthService] Failed to authenticate with Twitter"
      );
      return false;
    }
    this.profile = await this.fetchProfile(username);
    if (!this.profile) {
      elizaLogger16.error("[TwitterAuthService] Failed to fetch Twitter profile");
      return false;
    }
    elizaLogger16.info(
      "[TwitterAuthService] Successfully authenticated and fetched profile"
    );
    return true;
  }
  async authenticateWithCookies() {
    try {
      const username = this.runtime.getSetting("TWITTER_USERNAME");
      if (!username) {
        elizaLogger16.error(
          "[TwitterAuthService] No Twitter username configured for authentication"
        );
        return false;
      }
      elizaLogger16.info("[TwitterAuthService] Attempting to get fresh cookies");
      const password = this.runtime.getSetting("TWITTER_PASSWORD");
      const email = this.runtime.getSetting("TWITTER_EMAIL");
      if (!password || !email) {
        elizaLogger16.error(
          "[TwitterAuthService] No Twitter password or email configured"
        );
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 3e3;
      while (retryCount < maxRetries) {
        try {
          elizaLogger16.info(
            `[TwitterAuthService] Authentication attempt ${retryCount + 1}/${maxRetries}`
          );
          await this.twitterClient.login(username, password, email);
          elizaLogger16.info("[TwitterAuthService] Successfully authenticated");
          const newCookies = await this.twitterClient.getCookies();
          if (!newCookies || newCookies.length === 0) {
            throw new Error("No cookies received after authentication");
          }
          elizaLogger16.info(
            `[TwitterAuthService] Successfully obtained ${newCookies.length} new cookies`
          );
          await this.cacheCookies(username, newCookies);
          elizaLogger16.info(
            "[TwitterAuthService] Successfully cached new cookies"
          );
          return true;
        } catch (error) {
          retryCount++;
          const delay = baseDelay * 2 ** retryCount;
          elizaLogger16.warn(
            `[TwitterAuthService] Authentication attempt ${retryCount} failed:`,
            error instanceof Error ? error.message : String(error),
            `Retrying in ${delay}ms...`
          );
          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      elizaLogger16.error(
        "[TwitterAuthService] Failed to obtain cookies after maximum retries"
      );
      return false;
    } catch (error) {
      elizaLogger16.error(
        "[TwitterAuthService] Error during cookie authentication:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }
  async setCookiesFromArray(cookiesArray) {
    elizaLogger16.info(
      `[TwitterAuthService] Setting ${cookiesArray.length} cookies`
    );
    const cookieStrings = cookiesArray.map(
      (cookie) => `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure; " : ""}${cookie.httpOnly ? "HttpOnly; " : ""}${cookie.sameSite ? `SameSite=${cookie.sameSite}; ` : ""}`
    );
    await this.twitterClient.setCookies(cookieStrings);
    elizaLogger16.info(
      "[TwitterAuthService] Successfully set cookies on Twitter client"
    );
  }
  async getCachedCookies(username) {
    return await this.runtime.cacheManager.get(
      `twitter/${username}/cookies`
    );
  }
  async cacheCookies(username, cookies) {
    await this.runtime.cacheManager.set(`twitter/${username}/cookies`, cookies);
  }
  async getCachedProfile(username) {
    return await this.runtime.cacheManager.get(
      `twitter/${username}/profile`
    );
  }
  async cacheProfile(profile) {
    await this.runtime.cacheManager.set(
      `twitter/${profile.username}/profile`,
      profile
    );
  }
  async fetchProfile(username) {
    const cached = await this.getCachedProfile(username);
    if (cached) {
      return cached;
    }
    try {
      const twitterProfile = await this.twitterClient.getProfile(username);
      const profile = {
        userId: twitterProfile.userId,
        username,
        displayName: twitterProfile.name || this.runtime.character.name,
        description: twitterProfile.biography || (typeof this.runtime.character.bio === "string" ? this.runtime.character.bio : this.runtime.character.bio?.length > 0 ? this.runtime.character.bio[0] : ""),
        followersCount: twitterProfile.followersCount || 0,
        followingCount: twitterProfile.followingCount || 0,
        friendsCount: twitterProfile.friendsCount || 0,
        mediaCount: twitterProfile.mediaCount || 0,
        statusesCount: twitterProfile.statusesCount || 0,
        likesCount: twitterProfile.likesCount || 0,
        listedCount: twitterProfile.listedCount || 0,
        tweetsCount: twitterProfile.tweetsCount || 0,
        isPrivate: twitterProfile.isPrivate || false,
        isVerified: twitterProfile.isVerified || false,
        isBlueVerified: twitterProfile.isBlueVerified || false,
        joinedAt: twitterProfile.joined ? new Date(twitterProfile.joined) : null,
        location: twitterProfile.location || "",
        avatarUrl: twitterProfile.avatar || null,
        bannerUrl: twitterProfile.banner || null,
        websiteUrl: twitterProfile.website || null,
        canDm: twitterProfile.canDm || false
      };
      await this.cacheProfile(profile);
      return profile;
    } catch (error) {
      elizaLogger16.error(
        "[TwitterAuthService] Error fetching Twitter profile:",
        error
      );
      return void 0;
    }
  }
  getProfile() {
    return this.profile;
  }
  getClient() {
    return this.twitterClient;
  }
};

// src/bork-protocol/services/twitter/twitter-cache.service.ts
import { elizaLogger as elizaLogger17 } from "@elizaos/core";
var TwitterCacheService = class {
  runtime;
  constructor(runtime) {
    this.runtime = runtime;
  }
  async cacheTweet(tweet) {
    if (!tweet) {
      elizaLogger17.warn(
        "[TwitterCacheService] Tweet is undefined, skipping cache"
      );
      return;
    }
    await this.runtime.cacheManager.set(`twitter/tweets/${tweet.id}`, tweet);
  }
  async getCachedTweet(tweetId) {
    return await this.runtime.cacheManager.get(
      `twitter/tweets/${tweetId}`
    );
  }
  async getCachedTimeline(username) {
    if (!username) {
      return void 0;
    }
    return await this.runtime.cacheManager.get(
      `twitter/${username}/timeline`
    );
  }
  async cacheTimeline(username, timeline) {
    if (!username) {
      elizaLogger17.warn(
        "[TwitterCacheService] No username provided, skipping timeline cache"
      );
      return;
    }
    await this.runtime.cacheManager.set(
      `twitter/${username}/timeline`,
      timeline
    );
  }
  async cacheLatestCheckedTweetId(username, tweetId) {
    if (!username || !tweetId) {
      return;
    }
    await this.runtime.cacheManager.set(
      `twitter/${username}/lastCheckedTweetId`,
      tweetId.toString()
    );
  }
  async getLatestCheckedTweetId(username) {
    if (!username) {
      return null;
    }
    const lastId = await this.runtime.cacheManager.get(
      `twitter/${username}/lastCheckedTweetId`
    );
    return lastId ? BigInt(lastId) : null;
  }
  async cacheMentions(username, mentions) {
    if (!username) {
      return;
    }
    await this.runtime.cacheManager.set(
      `twitter/${username}/mentions`,
      mentions,
      { expires: Date.now() + 10 * 1e3 }
      // 10 seconds expiry
    );
  }
  async getCachedMentions(username) {
    if (!username) {
      return void 0;
    }
    return await this.runtime.cacheManager.get(
      `twitter/${username}/mentions`
    );
  }
  async cacheResponseInfo(tweetId, context, tweet, response) {
    const responseInfo = `Context:

${context}

Selected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}
Agent's Output:
${response}`;
    await this.runtime.cacheManager.set(
      `twitter/tweet_generation_${tweetId}.txt`,
      responseInfo
    );
  }
};

// src/bork-protocol/services/twitter/twitter-request.service.ts
import { elizaLogger as elizaLogger18 } from "@elizaos/core";
import {
  SearchMode
} from "agent-twitter-client";
var TwitterRequestService = class {
  twitterClient;
  requestQueue = [];
  isProcessingQueue = false;
  constructor(twitterClient) {
    this.twitterClient = twitterClient;
  }
  async enqueueRequest(request, context) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          elizaLogger18.error(`${context} Error executing request:`, error);
          reject(error);
        }
      });
      if (!this.isProcessingQueue) {
        void this.processRequestQueue();
      }
    });
  }
  async processRequestQueue() {
    if (this.isProcessingQueue) {
      return;
    }
    this.isProcessingQueue = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        } catch (error) {
          elizaLogger18.error("Error processing request:", error);
        }
      }
    }
    this.isProcessingQueue = false;
  }
  async fetchSearchTweets(query, limit, mode, context) {
    return this.enqueueRequest(async () => {
      elizaLogger18.info(`${context} Fetching search tweets for query: ${query}`);
      try {
        const searchResults = await this.twitterClient.fetchSearchTweets(
          query,
          limit,
          mode
        );
        if (!searchResults.tweets.length) {
          elizaLogger18.info(`${context} No tweets found for query: ${query}`);
          return searchResults;
        }
        elizaLogger18.info(`${context} Found ${searchResults.tweets.length}`);
        elizaLogger18.debug("tweets:", {
          tweets: searchResults.tweets.map((t5) => ({
            id: t5.id,
            username: t5.username,
            text: `${t5.text?.slice(0, 50)}...`,
            likes: t5.likes,
            retweets: t5.retweets,
            replies: t5.replies,
            conversationId: t5.conversationId,
            threadSize: t5.thread?.length || 0
          }))
        });
        return searchResults;
      } catch (error) {
        elizaLogger18.error(`${context} Error fetching search tweets:`, error);
        throw error;
      }
    }, context);
  }
  async getTweet(tweetId) {
    return this.enqueueRequest(async () => {
      elizaLogger18.info(`Fetching tweet: ${tweetId}`);
      try {
        return await this.twitterClient.getTweet(tweetId);
      } catch (error) {
        elizaLogger18.error("Error fetching tweet:", error);
        return null;
      }
    }, "getTweet");
  }
  async getUserTweets(username, limit) {
    return this.enqueueRequest(async () => {
      elizaLogger18.info(`Fetching user tweets for: ${username}`);
      try {
        return await this.twitterClient.fetchSearchTweets(
          `from:${username}`,
          limit,
          SearchMode.Latest
        );
      } catch (error) {
        elizaLogger18.error("Error fetching user tweets:", error);
        throw error;
      }
    }, "getUserTweets");
  }
  async sendTweet(text, inReplyToId) {
    return this.enqueueRequest(async () => {
      elizaLogger18.info("Sending tweet:", { text, inReplyToId });
      try {
        const response = await this.twitterClient.sendTweet(text, inReplyToId);
        const tweetId = response.id.toString();
        const timestamp = Math.floor(Date.now() / 1e3);
        const tweet = {
          id: tweetId,
          text,
          userId: "unknown",
          // Will be updated by the TwitterAuthService
          username: "unknown",
          // Will be updated by the TwitterAuthService
          name: "unknown",
          // Will be updated by the TwitterAuthService
          timestamp,
          isReply: !!inReplyToId,
          isRetweet: false,
          inReplyToStatusId: inReplyToId,
          conversationId: tweetId,
          permanentUrl: `https://twitter.com/unknown/status/${tweetId}`,
          // Will be updated by the TwitterAuthService
          hashtags: [],
          mentions: [],
          photos: [],
          thread: [],
          urls: [],
          videos: []
        };
        return tweet;
      } catch (error) {
        elizaLogger18.error("Error sending tweet:", error);
        throw error;
      }
    }, "sendTweet");
  }
};

// src/bork-protocol/services/twitter/twitter-spam.service.ts
import { elizaLogger as elizaLogger19 } from "@elizaos/core";
var TwitterSpamService = class {
  spamCache = /* @__PURE__ */ new Map();
  spamThreshold = 0.7;
  async filterSpamTweets(tweets, context) {
    const uniqueAuthors = [...new Set(tweets.map((t5) => t5.userId))];
    elizaLogger19.info(
      `${context} Fetching spam data for ${uniqueAuthors.length} unique authors`
    );
    const spamUsers = /* @__PURE__ */ new Set();
    await Promise.all(
      uniqueAuthors.map(async (authorId) => {
        try {
          const spamData = await this.getSpamData(authorId);
          if (spamData && spamData.spamScore > this.spamThreshold) {
            spamUsers.add(authorId);
            elizaLogger19.debug(`${context} Filtered out spam user ${authorId}`, {
              spamScore: spamData.spamScore,
              tweetCount: spamData.tweetCount,
              violations: spamData.violations
            });
          }
        } catch (error) {
          elizaLogger19.error(
            `${context} Error fetching spam data for user ${authorId}:`,
            error
          );
        }
      })
    );
    const filteredTweets = tweets.filter(
      (tweet) => !spamUsers.has(tweet.userId)
    );
    const spammedTweets = tweets.length - filteredTweets.length;
    elizaLogger19.info(
      `${context} Filtered ${spammedTweets} tweets from ${spamUsers.size} spam users`
    );
    elizaLogger19.debug({
      totalTweets: tweets.length,
      spammedTweets,
      spamUsers: spamUsers.size,
      remainingTweets: filteredTweets.length
    });
    return {
      filteredTweets,
      spammedTweets,
      spamUsers
    };
  }
  async getSpamData(authorId) {
    const cached = this.spamCache.get(authorId);
    if (cached) {
      return cached;
    }
    try {
      const spamData = await getUserSpamData(authorId);
      if (spamData) {
        this.spamCache.set(authorId, spamData);
        return spamData;
      }
    } catch (error) {
      elizaLogger19.error(
        `[TwitterSpamService] Error getting spam data for user ${authorId}:`,
        error
      );
    }
    return void 0;
  }
  clearSpamCache() {
    this.spamCache.clear();
  }
};

// src/bork-protocol/services/twitter/twitter-service.ts
var TwitterService = class {
  authService;
  cacheService;
  spamService;
  requestService;
  targetUsers = [];
  constructor(twitterClient, runtime) {
    this.authService = new TwitterAuthService(twitterClient, runtime);
    this.cacheService = new TwitterCacheService(runtime);
    this.spamService = new TwitterSpamService();
    this.requestService = new TwitterRequestService(twitterClient);
  }
  async initialize() {
    elizaLogger20.info("[TwitterService] Initializing Twitter service");
    const authenticated = await this.authService.initialize();
    if (!authenticated) {
      elizaLogger20.error(
        "[TwitterService] Failed to initialize Twitter service"
      );
      return false;
    }
    this.requestService = new TwitterRequestService(
      this.authService.getClient()
    );
    return true;
  }
  getProfile() {
    return this.authService.getProfile();
  }
  async searchTweets(query, maxTweets, searchMode = SearchMode2.Latest, context = "[TwitterService]", searchParams, engagementThresholds) {
    elizaLogger20.info(`${context} Searching tweets for query: ${query}`);
    elizaLogger20.debug({
      maxTweets,
      searchMode,
      searchParams,
      engagementThresholds
    });
    const searchResults = await this.requestService.fetchSearchTweets(
      query,
      maxTweets,
      searchMode,
      context
    );
    if (!searchResults.tweets.length) {
      elizaLogger20.info(`${context} No tweets found for query`, {
        context,
        query
      });
      return { tweets: [], spammedTweets: 0, spamUsers: /* @__PURE__ */ new Set() };
    }
    let filteredTweets = searchResults.tweets;
    if (searchParams) {
      filteredTweets = searchResults.tweets.filter((tweet) => {
        if (searchParams.excludeReplies && tweet.inReplyToStatusId) {
          return false;
        }
        if (searchParams.excludeRetweets && tweet.isRetweet) {
          return false;
        }
        return true;
      });
    }
    const {
      filteredTweets: nonSpamTweets,
      spammedTweets,
      spamUsers
    } = await this.spamService.filterSpamTweets(filteredTweets, context);
    await Promise.all(
      nonSpamTweets.map((tweet) => this.cacheService.cacheTweet(tweet))
    );
    return {
      tweets: nonSpamTweets,
      spammedTweets,
      spamUsers
    };
  }
  async getTweet(tweetId) {
    const cachedTweet = await this.cacheService.getCachedTweet(tweetId);
    if (cachedTweet) {
      return cachedTweet;
    }
    const tweet = await this.requestService.getTweet(tweetId);
    if (tweet) {
      await this.cacheService.cacheTweet(tweet);
    }
    return tweet;
  }
  async getUserTimeline(username, count) {
    const cachedTimeline = await this.cacheService.getCachedTimeline(username);
    if (cachedTimeline) {
      return { tweets: cachedTimeline, spammedTweets: 0 };
    }
    const profile = await this.authService.getClient().getProfile(username);
    if (!profile?.userId) {
      elizaLogger20.error(
        `[TwitterService] Could not find user profile for ${username}`
      );
      return { tweets: [], spammedTweets: 0 };
    }
    const response = await this.requestService.getUserTweets(
      profile.userId,
      count
    );
    if (!response.tweets.length) {
      return { tweets: [], spammedTweets: 0 };
    }
    const { filteredTweets, spammedTweets } = await this.spamService.filterSpamTweets(
      response.tweets,
      "[TwitterService]"
    );
    await this.cacheService.cacheTimeline(username, filteredTweets);
    return {
      tweets: filteredTweets,
      spammedTweets
    };
  }
  async updateLatestCheckedTweetId(username, tweetId) {
    await this.cacheService.cacheLatestCheckedTweetId(username, tweetId);
  }
  async getLatestCheckedTweetId(username) {
    return await this.cacheService.getLatestCheckedTweetId(username);
  }
  async cacheMentions(username, mentions) {
    await this.cacheService.cacheMentions(username, mentions);
  }
  async getCachedMentions(username) {
    return await this.cacheService.getCachedMentions(username);
  }
  async cacheResponseInfo(tweetId, context, tweet, response) {
    const responseInfo = `Context:

${context}

Selected Post: ${tweetId} - ${tweet.username}: ${tweet.text}
Agent's Output:
${response}`;
    await this.cacheService.cacheResponseInfo(
      tweetId,
      responseInfo,
      tweet,
      response
    );
  }
  clearSpamCache() {
    this.spamService.clearSpamCache();
  }
  async cacheTweet(tweet) {
    await this.cacheService.cacheTweet(tweet);
  }
  setTargetUsers(users) {
    this.targetUsers = users;
  }
  getTargetUsers() {
    return this.targetUsers;
  }
  async sendTweet(text, inReplyToId) {
    return this.requestService.sendTweet(text, inReplyToId);
  }
};

// src/bork-protocol/clients/x-client/index.ts
import {
  elizaLogger as elizaLogger36
} from "@elizaos/core";
import { Scraper as Scraper2 } from "agent-twitter-client";

// src/bork-protocol/services/twitter/twitter-account-discovery-service.ts
import { elizaLogger as elizaLogger21 } from "@elizaos/core";
var TwitterAccountDiscoveryService = class {
  twitterService;
  configService;
  accountScores = /* @__PURE__ */ new Map();
  // TODO Should be in config?
  // Thresholds for account management
  MIN_RELEVANCE_SCORE = 0.6;
  MIN_QUALITY_SCORE = 0.5;
  SCORE_DECAY_FACTOR = 0.95;
  // 5% decay per check
  MAX_ACCOUNTS = 100;
  // Maximum number of accounts to track
  constructor(twitterService, configService) {
    this.twitterService = twitterService;
    this.configService = configService;
  }
  async discoverAccountsFromTimeline(username) {
    try {
      elizaLogger21.info(
        `[TwitterAccountDiscoveryService] Discovering accounts from ${username}'s timeline`
      );
      const timeline = await this.twitterService.getUserTimeline(username, 50);
      const discoveredAccounts = /* @__PURE__ */ new Set();
      for (const tweet of timeline.tweets) {
        if (tweet.retweetedStatus) {
          discoveredAccounts.add(tweet.retweetedStatus.username);
        }
        if (tweet.quotedStatus) {
          discoveredAccounts.add(tweet.quotedStatus.username);
        }
        if (tweet.mentions) {
          for (const mention of tweet.mentions) {
            discoveredAccounts.add(mention.username);
          }
        }
      }
      discoveredAccounts.delete(username);
      elizaLogger21.info(
        `[TwitterAccountDiscoveryService] Discovered ${discoveredAccounts.size} potential accounts from ${username}'s timeline`
      );
      return Array.from(discoveredAccounts);
    } catch (error) {
      elizaLogger21.error(
        `[TwitterAccountDiscoveryService] Error discovering accounts from ${username}'s timeline:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }
  async evaluateAccount(username) {
    try {
      const timeline = await this.twitterService.getUserTimeline(username, 50);
      if (!timeline.tweets.length) {
        return;
      }
      let relevantTweetsCount = 0;
      let totalQualityScore = 0;
      const topicsMatch = {};
      let totalInteractionScore = 0;
      for (const tweet of timeline.tweets) {
        const engagementScore = (tweet.likes || 0) * 1 + (tweet.retweets || 0) * 2 + (tweet.replies || 0) * 1.5;
        const analysis = await this.analyzeTweetRelevance(tweet);
        if (analysis.isRelevant) {
          relevantTweetsCount++;
          for (const topic of analysis.matchedTopics) {
            topicsMatch[topic] = (topicsMatch[topic] || 0) + 1;
          }
        }
        totalQualityScore += engagementScore;
        totalInteractionScore += tweet.likes || 0;
      }
      const relevanceScore = relevantTweetsCount / timeline.tweets.length;
      const qualityScore = totalQualityScore / timeline.tweets.length;
      this.updateAccountScore(username, {
        username,
        relevanceScore,
        qualityScore,
        lastUpdated: /* @__PURE__ */ new Date(),
        totalTweetsAnalyzed: timeline.tweets.length,
        relevantTweetsCount,
        topicsMatch,
        interactionScore: totalInteractionScore / timeline.tweets.length
      });
      elizaLogger21.info(
        `[TwitterAccountDiscoveryService] Evaluated ${username}: relevance=${relevanceScore.toFixed(2)}, quality=${qualityScore.toFixed(2)}`
      );
    } catch (error) {
      elizaLogger21.error(
        `[TwitterAccountDiscoveryService] Error evaluating account ${username}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  async analyzeTweetRelevance(tweet) {
    const relevantTopics = [
      "blockchain",
      "crypto",
      "web3",
      "defi",
      "nft",
      "dao",
      "ethereum",
      "bitcoin",
      "solana",
      "injective"
    ];
    const matchedTopics = relevantTopics.filter(
      (topic) => tweet.text.toLowerCase().includes(topic.toLowerCase())
    );
    return {
      isRelevant: matchedTopics.length > 0,
      matchedTopics
    };
  }
  updateAccountScore(username, newScore) {
    const existingScore = this.accountScores.get(username);
    if (existingScore) {
      existingScore.relevanceScore *= this.SCORE_DECAY_FACTOR;
      existingScore.qualityScore *= this.SCORE_DECAY_FACTOR;
      this.accountScores.set(username, {
        ...existingScore,
        ...newScore,
        // Weighted average of old and new scores
        relevanceScore: (existingScore.relevanceScore + newScore.relevanceScore) / 2,
        qualityScore: (existingScore.qualityScore + newScore.qualityScore) / 2
      });
    } else {
      this.accountScores.set(username, newScore);
    }
  }
  async updateTargetAccounts() {
    try {
      const config = await this.configService.getConfig();
      const currentAccounts = new Set(config.targetAccounts);
      const accountsToRemove = /* @__PURE__ */ new Set();
      const accountsToAdd = /* @__PURE__ */ new Set();
      for (const username of currentAccounts) {
        const score = this.accountScores.get(username);
        if (score && (score.relevanceScore < this.MIN_RELEVANCE_SCORE || score.qualityScore < this.MIN_QUALITY_SCORE)) {
          accountsToRemove.add(username);
        }
      }
      const sortedAccounts = Array.from(this.accountScores.entries()).filter(
        ([username, score]) => !currentAccounts.has(username) && score.relevanceScore >= this.MIN_RELEVANCE_SCORE && score.qualityScore >= this.MIN_QUALITY_SCORE
      ).sort(
        (a, b) => b[1].relevanceScore + b[1].qualityScore - (a[1].relevanceScore + a[1].qualityScore)
      );
      const availableSlots = this.MAX_ACCOUNTS - (currentAccounts.size - accountsToRemove.size);
      for (const [username] of sortedAccounts.slice(0, availableSlots)) {
        accountsToAdd.add(username);
      }
      if (accountsToRemove.size > 0 || accountsToAdd.size > 0) {
        const updatedAccounts = Array.from(currentAccounts).filter((username) => !accountsToRemove.has(username)).concat(Array.from(accountsToAdd));
        await this.configService.updateConfig({
          targetAccounts: updatedAccounts
        });
        elizaLogger21.info(
          `[TwitterAccountDiscoveryService] Updated target accounts: removed ${accountsToRemove.size}, added ${accountsToAdd.size}`
        );
      }
    } catch (error) {
      elizaLogger21.error(
        "[TwitterAccountDiscoveryService] Error updating target accounts:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  getAccountScores() {
    return new Map(this.accountScores);
  }
};

// src/bork-protocol/services/twitter/twitter-config-service.ts
import { elizaLogger as elizaLogger22 } from "@elizaos/core";
var TwitterConfigService = class {
  twitterUsername;
  constructor(runtime) {
    const username = runtime.getSetting("TWITTER_USERNAME");
    if (!username) {
      throw new Error("TWITTER_USERNAME is not set");
    }
    this.twitterUsername = username;
  }
  // Should use cache here
  async getConfig() {
    try {
      const config = await twitterConfigQueries.getConfig(this.twitterUsername);
      return config;
    } catch (error) {
      elizaLogger22.error(
        `[TwitterConfigService] Error fetching config for ${this.twitterUsername}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }
  async updateConfig(config) {
    try {
      const updatedConfig = await twitterConfigQueries.updateConfig(
        this.twitterUsername,
        config
      );
      return updatedConfig;
    } catch (error) {
      elizaLogger22.error(
        `[TwitterConfigService] Error updating config for ${this.twitterUsername}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }
};

// src/bork-protocol/clients/x-client/account-discovery.ts
import { elizaLogger as elizaLogger23 } from "@elizaos/core";
var TwitterAccountDiscoveryClient = class {
  configService;
  discoveryService;
  discoveryInterval = null;
  evaluationInterval = null;
  // Configuration
  DISCOVERY_INTERVAL = 12 * 60 * 60 * 1e3;
  // 12 hours
  EVALUATION_INTERVAL = 24 * 60 * 60 * 1e3;
  // 24 hours
  ACCOUNTS_PER_DISCOVERY = 5;
  // Number of accounts to process in each discovery cycle
  constructor(runtime, twitterService) {
    this.configService = new TwitterConfigService(runtime);
    this.discoveryService = new TwitterAccountDiscoveryService(
      twitterService,
      this.configService
    );
  }
  async start() {
    elizaLogger23.info(
      "[TwitterAccountDiscoveryClient] Starting account discovery client"
    );
    await this.runDiscoveryCycle();
    await this.runEvaluationCycle();
    this.discoveryInterval = setInterval(
      () => this.runDiscoveryCycle(),
      this.DISCOVERY_INTERVAL
    );
    this.evaluationInterval = setInterval(
      () => this.runEvaluationCycle(),
      this.EVALUATION_INTERVAL
    );
    elizaLogger23.info(
      "[TwitterAccountDiscoveryClient] Account discovery client started"
    );
  }
  async stop() {
    elizaLogger23.info(
      "[TwitterAccountDiscoveryClient] Stopping account discovery client"
    );
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    elizaLogger23.info(
      "[TwitterAccountDiscoveryClient] Account discovery client stopped"
    );
  }
  async runDiscoveryCycle() {
    try {
      elizaLogger23.info(
        "[TwitterAccountDiscoveryClient] Starting discovery cycle"
      );
      const config = await this.configService.getConfig();
      const currentAccounts = config.targetAccounts;
      const accountsToProcess = this.selectRandomAccounts(
        currentAccounts,
        this.ACCOUNTS_PER_DISCOVERY
      );
      for (const account of accountsToProcess) {
        const discoveredAccounts = await this.discoveryService.discoverAccountsFromTimeline(account);
        for (const discoveredAccount of discoveredAccounts) {
          await this.discoveryService.evaluateAccount(discoveredAccount);
        }
      }
      await this.discoveryService.updateTargetAccounts();
      elizaLogger23.info(
        "[TwitterAccountDiscoveryClient] Completed discovery cycle"
      );
    } catch (error) {
      elizaLogger23.error(
        "[TwitterAccountDiscoveryClient] Error in discovery cycle:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  async runEvaluationCycle() {
    try {
      elizaLogger23.info(
        "[TwitterAccountDiscoveryClient] Starting evaluation cycle"
      );
      const config = await this.configService.getConfig();
      for (const account of config.targetAccounts) {
        await this.discoveryService.evaluateAccount(account);
      }
      await this.discoveryService.updateTargetAccounts();
      elizaLogger23.info(
        "[TwitterAccountDiscoveryClient] Completed evaluation cycle"
      );
    } catch (error) {
      elizaLogger23.error(
        "[TwitterAccountDiscoveryClient] Error in evaluation cycle:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  selectRandomAccounts(accounts, count) {
    const shuffled = [...accounts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  getDiscoveryService() {
    return this.discoveryService;
  }
};

// src/bork-protocol/utils/initialize-db/accounts.ts
import { elizaLogger as elizaLogger24 } from "@elizaos/core";
import { SearchMode as SearchMode3 } from "agent-twitter-client";
async function initializeTargetAccounts(twitterService, config) {
  try {
    elizaLogger24.info(
      "[TwitterAccounts] Checking target accounts initialization"
    );
    const existingAccounts = await tweetQueries.getTargetAccounts();
    if (existingAccounts.length > 0) {
      elizaLogger24.info("[TwitterAccounts] Target accounts already initialized");
      return;
    }
    elizaLogger24.info(
      "[TwitterAccounts] Initializing target accounts from config"
    );
    const targetAccounts = config.targetAccounts;
    for (const username of targetAccounts) {
      try {
        const { tweets } = await twitterService.searchTweets(
          `from:${username}`,
          1,
          SearchMode3.Latest,
          "[TwitterAccounts]"
        );
        const profile = tweets[0];
        if (!profile) {
          elizaLogger24.error(
            `[TwitterAccounts] Could not fetch profile for ${username}`
          );
          continue;
        }
        await tweetQueries.insertTargetAccount({
          username,
          userId: profile.userId || "",
          displayName: profile.name || username,
          description: "",
          // We don't have access to this through tweets
          followersCount: 0,
          // We don't have access to this through tweets
          followingCount: 0,
          // We don't have access to this through tweets
          friendsCount: 0,
          mediaCount: 0,
          statusesCount: 0,
          likesCount: 0,
          listedCount: 0,
          tweetsCount: 0,
          isPrivate: false,
          isVerified: false,
          isBlueVerified: false,
          joinedAt: null,
          location: "",
          avatarUrl: null,
          bannerUrl: null,
          websiteUrl: null,
          canDm: false,
          createdAt: /* @__PURE__ */ new Date(),
          lastUpdated: /* @__PURE__ */ new Date(),
          isActive: true,
          source: "config",
          // Initialize influence metrics with default values
          avgLikes50: 0,
          avgRetweets50: 0,
          avgReplies50: 0,
          avgViews50: 0,
          engagementRate50: 0,
          influenceScore: 0,
          last50TweetsUpdatedAt: null
        });
        elizaLogger24.debug(
          `[TwitterAccounts] Initialized target account: ${username}`
        );
      } catch (error) {
        elizaLogger24.error(
          `[TwitterAccounts] Error initializing target account ${username}:`,
          error
        );
      }
    }
    elizaLogger24.info(
      "[TwitterAccounts] Completed target accounts initialization"
    );
  } catch (error) {
    elizaLogger24.error(
      "[TwitterAccounts] Error initializing target accounts:",
      error
    );
    throw error;
  }
}

// src/bork-protocol/utils/initialize-db/topics.ts
import { elizaLogger as elizaLogger25 } from "@elizaos/core";
async function initializeTopicWeights(runtime) {
  try {
    const topicWeights = await tweetQueries.getTopicWeights();
    if (topicWeights.length) {
      elizaLogger25.info(
        `[TwitterAccounts] Found ${topicWeights.length} existing topic weights`
      );
      return topicWeights;
    }
    const defaultTopics = runtime.character.topics || [
      "injective protocol",
      "DeFi",
      "cryptocurrency",
      "blockchain",
      "market analysis"
    ];
    await tweetQueries.initializeTopicWeights(defaultTopics);
    elizaLogger25.info(
      `[TwitterAccounts] Initialized ${defaultTopics.length} default topics`
    );
    const newTopicWeights = await tweetQueries.getTopicWeights();
    if (!newTopicWeights.length) {
      elizaLogger25.error("[TwitterAccounts] Failed to initialize topic weights");
      throw new Error("Failed to initialize topic weights");
    }
    return newTopicWeights;
  } catch (error) {
    elizaLogger25.error(
      "[TwitterAccounts] Error initializing topic weights:",
      error
    );
    throw error;
  }
}

// src/bork-protocol/utils/selection/select-account.ts
import { elizaLogger as elizaLogger29 } from "@elizaos/core";

// src/bork-protocol/services/kaito/kaito-service.ts
import { elizaLogger as elizaLogger26 } from "@elizaos/core";

// ../node_modules/axios/lib/helpers/bind.js
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

// ../node_modules/axios/lib/utils.js
var { toString } = Object.prototype;
var { getPrototypeOf } = Object;
var kindOf = /* @__PURE__ */ ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
var kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
var typeOfTest = (type) => (thing) => typeof thing === type;
var { isArray } = Array;
var isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
var isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
var isString = typeOfTest("string");
var isFunction = typeOfTest("function");
var isNumber = typeOfTest("number");
var isObject = (thing) => thing !== null && typeof thing === "object";
var isBoolean = (thing) => thing === true || thing === false;
var isPlainObject = (val) => {
  if (kindOf(val) !== "object") {
    return false;
  }
  const prototype3 = getPrototypeOf(val);
  return (prototype3 === null || prototype3 === Object.prototype || Object.getPrototypeOf(prototype3) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
};
var isDate = kindOfTest("Date");
var isFile = kindOfTest("File");
var isBlob = kindOfTest("Blob");
var isFileList = kindOfTest("FileList");
var isStream = (val) => isObject(val) && isFunction(val.pipe);
var isFormData = (thing) => {
  let kind;
  return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
  kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
};
var isURLSearchParams = kindOfTest("URLSearchParams");
var [isReadableStream, isRequest, isResponse, isHeaders] = ["ReadableStream", "Request", "Response", "Headers"].map(kindOfTest);
var trim = (str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
var _global = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
var isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge() {
  const { caseless } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
var extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  }, { allOwnKeys });
  return a;
};
var stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
var inherits = (constructor, superConstructor, props, descriptors2) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors2);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, "super", {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
var toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
var endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
var toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
var isTypedArray = /* @__PURE__ */ ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
var forEachEntry = (obj, fn) => {
  const generator = obj && obj[Symbol.iterator];
  const iterator = generator.call(obj);
  let result;
  while ((result = iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
var matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
var isHTMLForm = kindOfTest("HTMLFormElement");
var toCamelCase = (str) => {
  return str.toLowerCase().replace(
    /[-_\s]([a-z\d])(\w*)/g,
    function replacer(m, p1, p2) {
      return p1.toUpperCase() + p2;
    }
  );
};
var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
var isRegExp = kindOfTest("RegExp");
var reduceDescriptors = (obj, reducer) => {
  const descriptors2 = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors2, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
var freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
      return false;
    }
    const value = obj[name];
    if (!isFunction(value)) return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
var toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
var noop = () => {
};
var toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === "FormData" && thing[Symbol.iterator]);
}
var toJSONObject = (obj) => {
  const stack = new Array(10);
  const visit = (source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }
      if (!("toJSON" in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = void 0;
        return target;
      }
    }
    return source;
  };
  return visit(obj, 0);
};
var isAsyncFn = kindOfTest("AsyncFunction");
var isThenable = (thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({ source, data }) => {
      if (source === _global && data === token) {
        callbacks.length && callbacks.shift()();
      }
    }, false);
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(
  typeof setImmediate === "function",
  isFunction(_global.postMessage)
);
var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
var utils_default = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap
};

// ../node_modules/axios/lib/core/AxiosError.js
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack;
  }
  this.message = message;
  this.name = "AxiosError";
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  if (response) {
    this.response = response;
    this.status = response.status ? response.status : null;
  }
}
utils_default.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: utils_default.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
});
var prototype = AxiosError.prototype;
var descriptors = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL"
  // eslint-disable-next-line func-names
].forEach((code) => {
  descriptors[code] = { value: code };
});
Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype, "isAxiosError", { value: true });
AxiosError.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype);
  utils_default.toFlatObject(error, axiosError, function filter2(obj) {
    return obj !== Error.prototype;
  }, (prop) => {
    return prop !== "isAxiosError";
  });
  AxiosError.call(axiosError, error.message, code, config, request, response);
  axiosError.cause = error;
  axiosError.name = error.name;
  customProps && Object.assign(axiosError, customProps);
  return axiosError;
};
var AxiosError_default = AxiosError;

// ../node_modules/axios/lib/platform/node/classes/FormData.js
var import_form_data = __toESM(require_form_data(), 1);
var FormData_default = import_form_data.default;

// ../node_modules/axios/lib/helpers/toFormData.js
function isVisitable(thing) {
  return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
function removeBrackets(key) {
  return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path3, key, dots) {
  if (!path3) return key;
  return path3.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils_default.isArray(arr) && !arr.some(isVisitable);
}
var predicates = utils_default.toFlatObject(utils_default, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData(obj, formData, options) {
  if (!utils_default.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (FormData_default || FormData)();
  options = utils_default.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    return !utils_default.isUndefined(source[option]);
  });
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
  if (!utils_default.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils_default.isDate(value)) {
      return value.toISOString();
    }
    if (!useBlob && utils_default.isBlob(value)) {
      throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
    }
    if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  function defaultVisitor(value, key, path3) {
    let arr = value;
    if (value && !path3 && typeof value === "object") {
      if (utils_default.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils_default.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path3, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path3) {
    if (utils_default.isUndefined(value)) return;
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path3.join("."));
    }
    stack.push(value);
    utils_default.forEach(value, function each(el, key) {
      const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(
        formData,
        el,
        utils_default.isString(key) ? key.trim() : key,
        path3,
        exposedHelpers
      );
      if (result === true) {
        build(el, path3 ? path3.concat(key) : [key]);
      }
    });
    stack.pop();
  }
  if (!utils_default.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
var toFormData_default = toFormData;

// ../node_modules/axios/lib/helpers/AxiosURLSearchParams.js
function encode(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData_default(params, this, options);
}
var prototype2 = AxiosURLSearchParams.prototype;
prototype2.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype2.toString = function toString2(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode);
  } : encode;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
var AxiosURLSearchParams_default = AxiosURLSearchParams;

// ../node_modules/axios/lib/helpers/buildURL.js
function encode2(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
function buildURL(url2, params, options) {
  if (!params) {
    return url2;
  }
  const _encode = options && options.encode || encode2;
  if (utils_default.isFunction(options)) {
    options = {
      serialize: options
    };
  }
  const serializeFn = options && options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url2.indexOf("#");
    if (hashmarkIndex !== -1) {
      url2 = url2.slice(0, hashmarkIndex);
    }
    url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url2;
}

// ../node_modules/axios/lib/core/InterceptorManager.js
var InterceptorManager = class {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils_default.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
};
var InterceptorManager_default = InterceptorManager;

// ../node_modules/axios/lib/defaults/transitional.js
var transitional_default = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

// ../node_modules/axios/lib/platform/node/index.js
import crypto from "crypto";

// ../node_modules/axios/lib/platform/node/classes/URLSearchParams.js
import url from "url";
var URLSearchParams_default = url.URLSearchParams;

// ../node_modules/axios/lib/platform/node/index.js
var ALPHA = "abcdefghijklmnopqrstuvwxyz";
var DIGIT = "0123456789";
var ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};
var generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = "";
  const { length } = alphabet;
  const randomValues = new Uint32Array(size);
  crypto.randomFillSync(randomValues);
  for (let i = 0; i < size; i++) {
    str += alphabet[randomValues[i] % length];
  }
  return str;
};
var node_default = {
  isNode: true,
  classes: {
    URLSearchParams: URLSearchParams_default,
    FormData: FormData_default,
    Blob: typeof Blob !== "undefined" && Blob || null
  },
  ALPHABET,
  generateString,
  protocols: ["http", "https", "file", "data"]
};

// ../node_modules/axios/lib/platform/common/utils.js
var utils_exports = {};
__export(utils_exports, {
  hasBrowserEnv: () => hasBrowserEnv,
  hasStandardBrowserEnv: () => hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
  navigator: () => _navigator,
  origin: () => origin
});
var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
var _navigator = typeof navigator === "object" && navigator || void 0;
var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
var hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
var origin = hasBrowserEnv && window.location.href || "http://localhost";

// ../node_modules/axios/lib/platform/index.js
var platform_default = {
  ...utils_exports,
  ...node_default
};

// ../node_modules/axios/lib/helpers/toURLEncodedForm.js
function toURLEncodedForm(data, options) {
  return toFormData_default(data, new platform_default.classes.URLSearchParams(), Object.assign({
    visitor: function(value, key, path3, helpers) {
      if (platform_default.isNode && utils_default.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    }
  }, options));
}

// ../node_modules/axios/lib/helpers/formDataToJSON.js
function parsePropPath(name) {
  return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path3, value, target, index) {
    let name = path3[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path3.length;
    name = !name && utils_default.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils_default.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils_default.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path3, value, target[name], index);
    if (result && utils_default.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
    const obj = {};
    utils_default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
var formDataToJSON_default = formDataToJSON;

// ../node_modules/axios/lib/defaults/index.js
function stringifySafely(rawValue, parser, encoder) {
  if (utils_default.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils_default.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
var defaults = {
  transitional: transitional_default,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || "";
    const hasJSONContentType = contentType.indexOf("application/json") > -1;
    const isObjectPayload = utils_default.isObject(data);
    if (isObjectPayload && utils_default.isHTMLForm(data)) {
      data = new FormData(data);
    }
    const isFormData2 = utils_default.isFormData(data);
    if (isFormData2) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
    }
    if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (utils_default.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils_default.isURLSearchParams(data)) {
      headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return data.toString();
    }
    let isFileList2;
    if (isObjectPayload) {
      if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }
      if ((isFileList2 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData_default(
          isFileList2 ? { "files[]": data } : data,
          _FormData && new _FormData(),
          this.formSerializer
        );
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType("application/json", false);
      return stringifySafely(data);
    }
    return data;
  }],
  transformResponse: [function transformResponse(data) {
    const transitional2 = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
    const JSONRequested = this.responseType === "json";
    if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (data && utils_default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === "SyntaxError") {
            throw AxiosError_default.from(e, AxiosError_default.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }
    return data;
  }],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform_default.classes.FormData,
    Blob: platform_default.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
utils_default.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
  defaults.headers[method] = {};
});
var defaults_default = defaults;

// ../node_modules/axios/lib/helpers/parseHeaders.js
var ignoreDuplicateOf = utils_default.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
var parseHeaders_default = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};

// ../node_modules/axios/lib/core/AxiosHeaders.js
var $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils_default.isArray(value) ? value.map(normalizeValue) : String(value);
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
var isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils_default.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils_default.isString(value)) return;
  if (utils_default.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils_default.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils_default.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
var AxiosHeaders = class {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error("header name must be a non-empty string");
      }
      const key = utils_default.findKey(self2, lHeader);
      if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils_default.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders_default(header), valueOrRewrite);
    } else if (utils_default.isHeaders(header)) {
      for (const [key, value] of header.entries()) {
        setHeader(value, key, rewrite);
      }
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils_default.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils_default.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils_default.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils_default.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils_default.forEach(this, (value, header) => {
      const key = utils_default.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils_default.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype3 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype3, _header);
        accessors[lHeader] = true;
      }
    }
    utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
};
AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils_default.freezeMethods(AxiosHeaders);
var AxiosHeaders_default = AxiosHeaders;

// ../node_modules/axios/lib/core/transformData.js
function transformData(fns, response) {
  const config = this || defaults_default;
  const context = response || config;
  const headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils_default.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}

// ../node_modules/axios/lib/cancel/isCancel.js
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}

// ../node_modules/axios/lib/cancel/CanceledError.js
function CanceledError(message, config, request) {
  AxiosError_default.call(this, message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
  this.name = "CanceledError";
}
utils_default.inherits(CanceledError, AxiosError_default, {
  __CANCEL__: true
});
var CanceledError_default = CanceledError;

// ../node_modules/axios/lib/core/settle.js
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError_default(
      "Request failed with status code " + response.status,
      [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}

// ../node_modules/axios/lib/helpers/isAbsoluteURL.js
function isAbsoluteURL(url2) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
}

// ../node_modules/axios/lib/helpers/combineURLs.js
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}

// ../node_modules/axios/lib/core/buildFullPath.js
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && isRelativeUrl || allowAbsoluteUrls == false) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

// ../node_modules/axios/lib/adapters/http.js
var import_proxy_from_env = __toESM(require_proxy_from_env(), 1);
var import_follow_redirects = __toESM(require_follow_redirects(), 1);
import http from "http";
import https from "https";
import util2 from "util";
import zlib from "zlib";

// ../node_modules/axios/lib/env/data.js
var VERSION = "1.8.3";

// ../node_modules/axios/lib/helpers/parseProtocol.js
function parseProtocol(url2) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url2);
  return match && match[1] || "";
}

// ../node_modules/axios/lib/helpers/fromDataURI.js
var DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function fromDataURI(uri, asBlob, options) {
  const _Blob = options && options.Blob || platform_default.classes.Blob;
  const protocol = parseProtocol(uri);
  if (asBlob === void 0 && _Blob) {
    asBlob = true;
  }
  if (protocol === "data") {
    uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
    const match = DATA_URL_PATTERN.exec(uri);
    if (!match) {
      throw new AxiosError_default("Invalid URL", AxiosError_default.ERR_INVALID_URL);
    }
    const mime = match[1];
    const isBase64 = match[2];
    const body = match[3];
    const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
    if (asBlob) {
      if (!_Blob) {
        throw new AxiosError_default("Blob is not supported", AxiosError_default.ERR_NOT_SUPPORT);
      }
      return new _Blob([buffer], { type: mime });
    }
    return buffer;
  }
  throw new AxiosError_default("Unsupported protocol " + protocol, AxiosError_default.ERR_NOT_SUPPORT);
}

// ../node_modules/axios/lib/adapters/http.js
import stream3 from "stream";

// ../node_modules/axios/lib/helpers/AxiosTransformStream.js
import stream from "stream";
var kInternals = Symbol("internals");
var AxiosTransformStream = class extends stream.Transform {
  constructor(options) {
    options = utils_default.toFlatObject(options, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (prop, source) => {
      return !utils_default.isUndefined(source[prop]);
    });
    super({
      readableHighWaterMark: options.chunkSize
    });
    const internals = this[kInternals] = {
      timeWindow: options.timeWindow,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (event) => {
      if (event === "progress") {
        if (!internals.isCaptured) {
          internals.isCaptured = true;
        }
      }
    });
  }
  _read(size) {
    const internals = this[kInternals];
    if (internals.onReadCallback) {
      internals.onReadCallback();
    }
    return super._read(size);
  }
  _transform(chunk, encoding, callback) {
    const internals = this[kInternals];
    const maxRate = internals.maxRate;
    const readableHighWaterMark = this.readableHighWaterMark;
    const timeWindow = internals.timeWindow;
    const divider = 1e3 / timeWindow;
    const bytesThreshold = maxRate / divider;
    const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
    const pushChunk = (_chunk, _callback) => {
      const bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;
      internals.isCaptured && this.emit("progress", internals.bytesSeen);
      if (this.push(_chunk)) {
        process.nextTick(_callback);
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
      }
    };
    const transformChunk = (_chunk, _callback) => {
      const chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder = null;
      let maxChunkSize = readableHighWaterMark;
      let bytesLeft;
      let passed = 0;
      if (maxRate) {
        const now = Date.now();
        if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }
        bytesLeft = bytesThreshold - internals.bytes;
      }
      if (maxRate) {
        if (bytesLeft <= 0) {
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        }
        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft;
        }
      }
      if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }
      pushChunk(_chunk, chunkRemainder ? () => {
        process.nextTick(_callback, null, chunkRemainder);
      } : _callback);
    };
    transformChunk(chunk, function transformNextChunk(err, _chunk) {
      if (err) {
        return callback(err);
      }
      if (_chunk) {
        transformChunk(_chunk, transformNextChunk);
      } else {
        callback(null);
      }
    });
  }
};
var AxiosTransformStream_default = AxiosTransformStream;

// ../node_modules/axios/lib/adapters/http.js
import { EventEmitter } from "events";

// ../node_modules/axios/lib/helpers/formDataToStream.js
import util from "util";
import { Readable } from "stream";

// ../node_modules/axios/lib/helpers/readBlob.js
var { asyncIterator } = Symbol;
var readBlob = async function* (blob) {
  if (blob.stream) {
    yield* blob.stream();
  } else if (blob.arrayBuffer) {
    yield await blob.arrayBuffer();
  } else if (blob[asyncIterator]) {
    yield* blob[asyncIterator]();
  } else {
    yield blob;
  }
};
var readBlob_default = readBlob;

// ../node_modules/axios/lib/helpers/formDataToStream.js
var BOUNDARY_ALPHABET = platform_default.ALPHABET.ALPHA_DIGIT + "-_";
var textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new util.TextEncoder();
var CRLF = "\r\n";
var CRLF_BYTES = textEncoder.encode(CRLF);
var CRLF_BYTES_COUNT = 2;
var FormDataPart = class {
  constructor(name, value) {
    const { escapeName } = this.constructor;
    const isStringValue = utils_default.isString(value);
    let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
    if (isStringValue) {
      value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
    } else {
      headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
    }
    this.headers = textEncoder.encode(headers + CRLF);
    this.contentLength = isStringValue ? value.byteLength : value.size;
    this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
    this.name = name;
    this.value = value;
  }
  async *encode() {
    yield this.headers;
    const { value } = this;
    if (utils_default.isTypedArray(value)) {
      yield value;
    } else {
      yield* readBlob_default(value);
    }
    yield CRLF_BYTES;
  }
  static escapeName(name) {
    return String(name).replace(/[\r\n"]/g, (match) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[match]);
  }
};
var formDataToStream = (form, headersHandler, options) => {
  const {
    tag = "form-data-boundary",
    size = 25,
    boundary = tag + "-" + platform_default.generateString(size, BOUNDARY_ALPHABET)
  } = options || {};
  if (!utils_default.isFormData(form)) {
    throw TypeError("FormData instance required");
  }
  if (boundary.length < 1 || boundary.length > 70) {
    throw Error("boundary must be 10-70 characters long");
  }
  const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
  const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF + CRLF);
  let contentLength = footerBytes.byteLength;
  const parts = Array.from(form.entries()).map(([name, value]) => {
    const part = new FormDataPart(name, value);
    contentLength += part.size;
    return part;
  });
  contentLength += boundaryBytes.byteLength * parts.length;
  contentLength = utils_default.toFiniteNumber(contentLength);
  const computedHeaders = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`
  };
  if (Number.isFinite(contentLength)) {
    computedHeaders["Content-Length"] = contentLength;
  }
  headersHandler && headersHandler(computedHeaders);
  return Readable.from(async function* () {
    for (const part of parts) {
      yield boundaryBytes;
      yield* part.encode();
    }
    yield footerBytes;
  }());
};
var formDataToStream_default = formDataToStream;

// ../node_modules/axios/lib/helpers/ZlibHeaderTransformStream.js
import stream2 from "stream";
var ZlibHeaderTransformStream = class extends stream2.Transform {
  __transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }
  _transform(chunk, encoding, callback) {
    if (chunk.length !== 0) {
      this._transform = this.__transform;
      if (chunk[0] !== 120) {
        const header = Buffer.alloc(2);
        header[0] = 120;
        header[1] = 156;
        this.push(header, encoding);
      }
    }
    this.__transform(chunk, encoding, callback);
  }
};
var ZlibHeaderTransformStream_default = ZlibHeaderTransformStream;

// ../node_modules/axios/lib/helpers/callbackify.js
var callbackify = (fn, reducer) => {
  return utils_default.isAsyncFn(fn) ? function(...args) {
    const cb = args.pop();
    fn.apply(this, args).then((value) => {
      try {
        reducer ? cb(null, ...reducer(value)) : cb(null, value);
      } catch (err) {
        cb(err);
      }
    }, cb);
  } : fn;
};
var callbackify_default = callbackify;

// ../node_modules/axios/lib/helpers/speedometer.js
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
var speedometer_default = speedometer;

// ../node_modules/axios/lib/helpers/throttle.js
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
var throttle_default = throttle;

// ../node_modules/axios/lib/helpers/progressEventReducer.js
var progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer_default(50, 250);
  return throttle_default((e) => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : void 0;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
var progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};
var asyncDecorator = (fn) => (...args) => utils_default.asap(() => fn(...args));

// ../node_modules/axios/lib/adapters/http.js
var zlibOptions = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH
};
var brotliOptions = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
};
var isBrotliSupported = utils_default.isFunction(zlib.createBrotliDecompress);
var { http: httpFollow, https: httpsFollow } = import_follow_redirects.default;
var isHttps = /https:?/;
var supportedProtocols = platform_default.protocols.map((protocol) => {
  return protocol + ":";
});
var flushOnFinish = (stream4, [throttled, flush]) => {
  stream4.on("end", flush).on("error", flush);
  return throttled;
};
function dispatchBeforeRedirect(options, responseDetails) {
  if (options.beforeRedirects.proxy) {
    options.beforeRedirects.proxy(options);
  }
  if (options.beforeRedirects.config) {
    options.beforeRedirects.config(options, responseDetails);
  }
}
function setProxy(options, configProxy, location) {
  let proxy = configProxy;
  if (!proxy && proxy !== false) {
    const proxyUrl = import_proxy_from_env.default.getProxyForUrl(location);
    if (proxyUrl) {
      proxy = new URL(proxyUrl);
    }
  }
  if (proxy) {
    if (proxy.username) {
      proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
    }
    if (proxy.auth) {
      if (proxy.auth.username || proxy.auth.password) {
        proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
      }
      const base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
      options.headers["Proxy-Authorization"] = "Basic " + base64;
    }
    options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
    const proxyHost = proxy.hostname || proxy.host;
    options.hostname = proxyHost;
    options.host = proxyHost;
    options.port = proxy.port;
    options.path = location;
    if (proxy.protocol) {
      options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
    }
  }
  options.beforeRedirects.proxy = function beforeRedirect(redirectOptions) {
    setProxy(redirectOptions, configProxy, redirectOptions.href);
  };
}
var isHttpAdapterSupported = typeof process !== "undefined" && utils_default.kindOf(process) === "process";
var wrapAsync = (asyncExecutor) => {
  return new Promise((resolve, reject) => {
    let onDone;
    let isDone;
    const done = (value, isRejected) => {
      if (isDone) return;
      isDone = true;
      onDone && onDone(value, isRejected);
    };
    const _resolve = (value) => {
      done(value);
      resolve(value);
    };
    const _reject = (reason) => {
      done(reason, true);
      reject(reason);
    };
    asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
  });
};
var resolveFamily = ({ address, family }) => {
  if (!utils_default.isString(address)) {
    throw TypeError("address must be a string");
  }
  return {
    address,
    family: family || (address.indexOf(".") < 0 ? 6 : 4)
  };
};
var buildAddressEntry = (address, family) => resolveFamily(utils_default.isObject(address) ? address : { address, family });
var http_default = isHttpAdapterSupported && function httpAdapter(config) {
  return wrapAsync(async function dispatchHttpRequest(resolve, reject, onDone) {
    let { data, lookup, family } = config;
    const { responseType, responseEncoding } = config;
    const method = config.method.toUpperCase();
    let isDone;
    let rejected = false;
    let req;
    if (lookup) {
      const _lookup = callbackify_default(lookup, (value) => utils_default.isArray(value) ? value : [value]);
      lookup = (hostname, opt, cb) => {
        _lookup(hostname, opt, (err, arg0, arg1) => {
          if (err) {
            return cb(err);
          }
          const addresses = utils_default.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
          opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
        });
      };
    }
    const emitter = new EventEmitter();
    const onFinished = () => {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(abort);
      }
      if (config.signal) {
        config.signal.removeEventListener("abort", abort);
      }
      emitter.removeAllListeners();
    };
    onDone((value, isRejected) => {
      isDone = true;
      if (isRejected) {
        rejected = true;
        onFinished();
      }
    });
    function abort(reason) {
      emitter.emit("abort", !reason || reason.type ? new CanceledError_default(null, config, req) : reason);
    }
    emitter.once("abort", reject);
    if (config.cancelToken || config.signal) {
      config.cancelToken && config.cancelToken.subscribe(abort);
      if (config.signal) {
        config.signal.aborted ? abort() : config.signal.addEventListener("abort", abort);
      }
    }
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    const parsed = new URL(fullPath, platform_default.hasBrowserEnv ? platform_default.origin : void 0);
    const protocol = parsed.protocol || supportedProtocols[0];
    if (protocol === "data:") {
      let convertedData;
      if (method !== "GET") {
        return settle(resolve, reject, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config
        });
      }
      try {
        convertedData = fromDataURI(config.url, responseType === "blob", {
          Blob: config.env && config.env.Blob
        });
      } catch (err) {
        throw AxiosError_default.from(err, AxiosError_default.ERR_BAD_REQUEST, config);
      }
      if (responseType === "text") {
        convertedData = convertedData.toString(responseEncoding);
        if (!responseEncoding || responseEncoding === "utf8") {
          convertedData = utils_default.stripBOM(convertedData);
        }
      } else if (responseType === "stream") {
        convertedData = stream3.Readable.from(convertedData);
      }
      return settle(resolve, reject, {
        data: convertedData,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders_default(),
        config
      });
    }
    if (supportedProtocols.indexOf(protocol) === -1) {
      return reject(new AxiosError_default(
        "Unsupported protocol " + protocol,
        AxiosError_default.ERR_BAD_REQUEST,
        config
      ));
    }
    const headers = AxiosHeaders_default.from(config.headers).normalize();
    headers.set("User-Agent", "axios/" + VERSION, false);
    const { onUploadProgress, onDownloadProgress } = config;
    const maxRate = config.maxRate;
    let maxUploadRate = void 0;
    let maxDownloadRate = void 0;
    if (utils_default.isSpecCompliantForm(data)) {
      const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
      data = formDataToStream_default(data, (formHeaders) => {
        headers.set(formHeaders);
      }, {
        tag: `axios-${VERSION}-boundary`,
        boundary: userBoundary && userBoundary[1] || void 0
      });
    } else if (utils_default.isFormData(data) && utils_default.isFunction(data.getHeaders)) {
      headers.set(data.getHeaders());
      if (!headers.hasContentLength()) {
        try {
          const knownLength = await util2.promisify(data.getLength).call(data);
          Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
        } catch (e) {
        }
      }
    } else if (utils_default.isBlob(data) || utils_default.isFile(data)) {
      data.size && headers.setContentType(data.type || "application/octet-stream");
      headers.setContentLength(data.size || 0);
      data = stream3.Readable.from(readBlob_default(data));
    } else if (data && !utils_default.isStream(data)) {
      if (Buffer.isBuffer(data)) {
      } else if (utils_default.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils_default.isString(data)) {
        data = Buffer.from(data, "utf-8");
      } else {
        return reject(new AxiosError_default(
          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
          AxiosError_default.ERR_BAD_REQUEST,
          config
        ));
      }
      headers.setContentLength(data.length, false);
      if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
        return reject(new AxiosError_default(
          "Request body larger than maxBodyLength limit",
          AxiosError_default.ERR_BAD_REQUEST,
          config
        ));
      }
    }
    const contentLength = utils_default.toFiniteNumber(headers.getContentLength());
    if (utils_default.isArray(maxRate)) {
      maxUploadRate = maxRate[0];
      maxDownloadRate = maxRate[1];
    } else {
      maxUploadRate = maxDownloadRate = maxRate;
    }
    if (data && (onUploadProgress || maxUploadRate)) {
      if (!utils_default.isStream(data)) {
        data = stream3.Readable.from(data, { objectMode: false });
      }
      data = stream3.pipeline([data, new AxiosTransformStream_default({
        maxRate: utils_default.toFiniteNumber(maxUploadRate)
      })], utils_default.noop);
      onUploadProgress && data.on("progress", flushOnFinish(
        data,
        progressEventDecorator(
          contentLength,
          progressEventReducer(asyncDecorator(onUploadProgress), false, 3)
        )
      ));
    }
    let auth = void 0;
    if (config.auth) {
      const username = config.auth.username || "";
      const password = config.auth.password || "";
      auth = username + ":" + password;
    }
    if (!auth && parsed.username) {
      const urlUsername = parsed.username;
      const urlPassword = parsed.password;
      auth = urlUsername + ":" + urlPassword;
    }
    auth && headers.delete("authorization");
    let path3;
    try {
      path3 = buildURL(
        parsed.pathname + parsed.search,
        config.params,
        config.paramsSerializer
      ).replace(/^\?/, "");
    } catch (err) {
      const customErr = new Error(err.message);
      customErr.config = config;
      customErr.url = config.url;
      customErr.exists = true;
      return reject(customErr);
    }
    headers.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""),
      false
    );
    const options = {
      path: path3,
      method,
      headers: headers.toJSON(),
      agents: { http: config.httpAgent, https: config.httpsAgent },
      auth,
      protocol,
      family,
      beforeRedirect: dispatchBeforeRedirect,
      beforeRedirects: {}
    };
    !utils_default.isUndefined(lookup) && (options.lookup = lookup);
    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
      options.port = parsed.port;
      setProxy(options, config.proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path);
    }
    let transport;
    const isHttpsRequest = isHttps.test(options.protocol);
    options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
    if (config.transport) {
      transport = config.transport;
    } else if (config.maxRedirects === 0) {
      transport = isHttpsRequest ? https : http;
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects;
      }
      if (config.beforeRedirect) {
        options.beforeRedirects.config = config.beforeRedirect;
      }
      transport = isHttpsRequest ? httpsFollow : httpFollow;
    }
    if (config.maxBodyLength > -1) {
      options.maxBodyLength = config.maxBodyLength;
    } else {
      options.maxBodyLength = Infinity;
    }
    if (config.insecureHTTPParser) {
      options.insecureHTTPParser = config.insecureHTTPParser;
    }
    req = transport.request(options, function handleResponse(res) {
      if (req.destroyed) return;
      const streams = [res];
      const responseLength = +res.headers["content-length"];
      if (onDownloadProgress || maxDownloadRate) {
        const transformStream = new AxiosTransformStream_default({
          maxRate: utils_default.toFiniteNumber(maxDownloadRate)
        });
        onDownloadProgress && transformStream.on("progress", flushOnFinish(
          transformStream,
          progressEventDecorator(
            responseLength,
            progressEventReducer(asyncDecorator(onDownloadProgress), true, 3)
          )
        ));
        streams.push(transformStream);
      }
      let responseStream = res;
      const lastRequest = res.req || req;
      if (config.decompress !== false && res.headers["content-encoding"]) {
        if (method === "HEAD" || res.statusCode === 204) {
          delete res.headers["content-encoding"];
        }
        switch ((res.headers["content-encoding"] || "").toLowerCase()) {
          /*eslint default-case:0*/
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "deflate":
            streams.push(new ZlibHeaderTransformStream_default());
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "br":
            if (isBrotliSupported) {
              streams.push(zlib.createBrotliDecompress(brotliOptions));
              delete res.headers["content-encoding"];
            }
        }
      }
      responseStream = streams.length > 1 ? stream3.pipeline(streams, utils_default.noop) : streams[0];
      const offListeners = stream3.finished(responseStream, () => {
        offListeners();
        onFinished();
      });
      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: new AxiosHeaders_default(res.headers),
        config,
        request: lastRequest
      };
      if (responseType === "stream") {
        response.data = responseStream;
        settle(resolve, reject, response);
      } else {
        const responseBuffer = [];
        let totalResponseBytes = 0;
        responseStream.on("data", function handleStreamData(chunk) {
          responseBuffer.push(chunk);
          totalResponseBytes += chunk.length;
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            rejected = true;
            responseStream.destroy();
            reject(new AxiosError_default(
              "maxContentLength size of " + config.maxContentLength + " exceeded",
              AxiosError_default.ERR_BAD_RESPONSE,
              config,
              lastRequest
            ));
          }
        });
        responseStream.on("aborted", function handlerStreamAborted() {
          if (rejected) {
            return;
          }
          const err = new AxiosError_default(
            "stream has been aborted",
            AxiosError_default.ERR_BAD_RESPONSE,
            config,
            lastRequest
          );
          responseStream.destroy(err);
          reject(err);
        });
        responseStream.on("error", function handleStreamError(err) {
          if (req.destroyed) return;
          reject(AxiosError_default.from(err, null, config, lastRequest));
        });
        responseStream.on("end", function handleStreamEnd() {
          try {
            let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
            if (responseType !== "arraybuffer") {
              responseData = responseData.toString(responseEncoding);
              if (!responseEncoding || responseEncoding === "utf8") {
                responseData = utils_default.stripBOM(responseData);
              }
            }
            response.data = responseData;
          } catch (err) {
            return reject(AxiosError_default.from(err, null, config, response.request, response));
          }
          settle(resolve, reject, response);
        });
      }
      emitter.once("abort", (err) => {
        if (!responseStream.destroyed) {
          responseStream.emit("error", err);
          responseStream.destroy();
        }
      });
    });
    emitter.once("abort", (err) => {
      reject(err);
      req.destroy(err);
    });
    req.on("error", function handleRequestError(err) {
      reject(AxiosError_default.from(err, null, config, req));
    });
    req.on("socket", function handleRequestSocket(socket) {
      socket.setKeepAlive(true, 1e3 * 60);
    });
    if (config.timeout) {
      const timeout = parseInt(config.timeout, 10);
      if (Number.isNaN(timeout)) {
        reject(new AxiosError_default(
          "error trying to parse `config.timeout` to int",
          AxiosError_default.ERR_BAD_OPTION_VALUE,
          config,
          req
        ));
        return;
      }
      req.setTimeout(timeout, function handleRequestTimeout() {
        if (isDone) return;
        let timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
        const transitional2 = config.transitional || transitional_default;
        if (config.timeoutErrorMessage) {
          timeoutErrorMessage = config.timeoutErrorMessage;
        }
        reject(new AxiosError_default(
          timeoutErrorMessage,
          transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
          config,
          req
        ));
        abort();
      });
    }
    if (utils_default.isStream(data)) {
      let ended = false;
      let errored = false;
      data.on("end", () => {
        ended = true;
      });
      data.once("error", (err) => {
        errored = true;
        req.destroy(err);
      });
      data.on("close", () => {
        if (!ended && !errored) {
          abort(new CanceledError_default("Request stream has been aborted", config, req));
        }
      });
      data.pipe(req);
    } else {
      req.end(data);
    }
  });
};

// ../node_modules/axios/lib/helpers/isURLSameOrigin.js
var isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url2) => {
  url2 = new URL(url2, platform_default.origin);
  return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
})(
  new URL(platform_default.origin),
  platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)
) : () => true;

// ../node_modules/axios/lib/helpers/cookies.js
var cookies_default = platform_default.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path3, domain, secure) {
      const cookie = [name + "=" + encodeURIComponent(value)];
      utils_default.isNumber(expires) && cookie.push("expires=" + new Date(expires).toGMTString());
      utils_default.isString(path3) && cookie.push("path=" + path3);
      utils_default.isString(domain) && cookie.push("domain=" + domain);
      secure === true && cookie.push("secure");
      document.cookie = cookie.join("; ");
    },
    read(name) {
      const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
      return match ? decodeURIComponent(match[3]) : null;
    },
    remove(name) {
      this.write(name, "", Date.now() - 864e5);
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
);

// ../node_modules/axios/lib/core/mergeConfig.js
var headersToObject = (thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing;
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, prop, caseless) {
    if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) {
      return utils_default.merge.call({ caseless }, target, source);
    } else if (utils_default.isPlainObject(source)) {
      return utils_default.merge({}, source);
    } else if (utils_default.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(void 0, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils_default.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge2 = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge2(config1[prop], config2[prop], prop);
    utils_default.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}

// ../node_modules/axios/lib/helpers/resolveConfig.js
var resolveConfig_default = (config) => {
  const newConfig = mergeConfig({}, config);
  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
  newConfig.headers = headers = AxiosHeaders_default.from(headers);
  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
  if (auth) {
    headers.set(
      "Authorization",
      "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
    );
  }
  let contentType;
  if (utils_default.isFormData(data)) {
    if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(void 0);
    } else if ((contentType = headers.getContentType()) !== false) {
      const [type, ...tokens] = contentType ? contentType.split(";").map((token) => token.trim()).filter(Boolean) : [];
      headers.setContentType([type || "multipart/form-data", ...tokens].join("; "));
    }
  }
  if (platform_default.hasStandardBrowserEnv) {
    withXSRFToken && utils_default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin_default(newConfig.url)) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
};

// ../node_modules/axios/lib/adapters/xhr.js
var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
var xhr_default = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig_default(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders_default.from(
        "getAllResponseHeaders" in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
      request = null;
    };
    request.onerror = function handleError() {
      reject(new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request));
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitional_default;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError_default(
        timeoutErrorMessage,
        transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
        config,
        request
      ));
      request = null;
    };
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils_default.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils_default.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
        request.abort();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError_default("Unsupported protocol " + protocol + ":", AxiosError_default.ERR_BAD_REQUEST, config));
      return;
    }
    request.send(requestData || null);
  });
};

// ../node_modules/axios/lib/helpers/composeSignals.js
var composeSignals = (signals, timeout) => {
  const { length } = signals = signals ? signals.filter(Boolean) : [];
  if (timeout || length) {
    let controller = new AbortController();
    let aborted;
    const onabort = function(reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err));
      }
    };
    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError_default(`timeout ${timeout} of ms exceeded`, AxiosError_default.ETIMEDOUT));
    }, timeout);
    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal2) => {
          signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    };
    signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
    const { signal } = controller;
    signal.unsubscribe = () => utils_default.asap(unsubscribe);
    return signal;
  }
};
var composeSignals_default = composeSignals;

// ../node_modules/axios/lib/helpers/trackStream.js
var streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
var readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
var readStream = async function* (stream4) {
  if (stream4[Symbol.asyncIterator]) {
    yield* stream4;
    return;
  }
  const reader = stream4.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
var trackStream = (stream4, chunkSize, onProgress, onFinish) => {
  const iterator = readBytes(stream4, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done: done2, value } = await iterator.next();
        if (done2) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator.return();
    }
  }, {
    highWaterMark: 2
  });
};

// ../node_modules/axios/lib/adapters/fetch.js
var isFetchSupported = typeof fetch === "function" && typeof Request === "function" && typeof Response === "function";
var isReadableStreamSupported = isFetchSupported && typeof ReadableStream === "function";
var encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Response(str).arrayBuffer()));
var test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
var supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;
  const hasContentType = new Request(platform_default.origin, {
    body: new ReadableStream(),
    method: "POST",
    get duplex() {
      duplexAccessed = true;
      return "half";
    }
  }).headers.has("Content-Type");
  return duplexAccessed && !hasContentType;
});
var DEFAULT_CHUNK_SIZE = 64 * 1024;
var supportsResponseStream = isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
var resolvers = {
  stream: supportsResponseStream && ((res) => res.body)
};
isFetchSupported && ((res) => {
  ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
    !resolvers[type] && (resolvers[type] = utils_default.isFunction(res[type]) ? (res2) => res2[type]() : (_, config) => {
      throw new AxiosError_default(`Response type '${type}' is not supported`, AxiosError_default.ERR_NOT_SUPPORT, config);
    });
  });
})(new Response());
var getBodyLength = async (body) => {
  if (body == null) {
    return 0;
  }
  if (utils_default.isBlob(body)) {
    return body.size;
  }
  if (utils_default.isSpecCompliantForm(body)) {
    const _request = new Request(platform_default.origin, {
      method: "POST",
      body
    });
    return (await _request.arrayBuffer()).byteLength;
  }
  if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) {
    return body.byteLength;
  }
  if (utils_default.isURLSearchParams(body)) {
    body = body + "";
  }
  if (utils_default.isString(body)) {
    return (await encodeText(body)).byteLength;
  }
};
var resolveBodyLength = async (headers, body) => {
  const length = utils_default.toFiniteNumber(headers.getContentLength());
  return length == null ? getBodyLength(body) : length;
};
var fetch_default = isFetchSupported && (async (config) => {
  let {
    url: url2,
    method,
    data,
    signal,
    cancelToken,
    timeout,
    onDownloadProgress,
    onUploadProgress,
    responseType,
    headers,
    withCredentials = "same-origin",
    fetchOptions
  } = resolveConfig_default(config);
  responseType = responseType ? (responseType + "").toLowerCase() : "text";
  let composedSignal = composeSignals_default([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
  let request;
  const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
    composedSignal.unsubscribe();
  });
  let requestContentLength;
  try {
    if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
      let _request = new Request(url2, {
        method: "POST",
        body: data,
        duplex: "half"
      });
      let contentTypeHeader;
      if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
        headers.setContentType(contentTypeHeader);
      }
      if (_request.body) {
        const [onProgress, flush] = progressEventDecorator(
          requestContentLength,
          progressEventReducer(asyncDecorator(onUploadProgress))
        );
        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
      }
    }
    if (!utils_default.isString(withCredentials)) {
      withCredentials = withCredentials ? "include" : "omit";
    }
    const isCredentialsSupported = "credentials" in Request.prototype;
    request = new Request(url2, {
      ...fetchOptions,
      signal: composedSignal,
      method: method.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      credentials: isCredentialsSupported ? withCredentials : void 0
    });
    let response = await fetch(request);
    const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
    if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
      const options = {};
      ["status", "statusText", "headers"].forEach((prop) => {
        options[prop] = response[prop];
      });
      const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
      const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
        responseContentLength,
        progressEventReducer(asyncDecorator(onDownloadProgress), true)
      ) || [];
      response = new Response(
        trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
          flush && flush();
          unsubscribe && unsubscribe();
        }),
        options
      );
    }
    responseType = responseType || "text";
    let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](response, config);
    !isStreamResponse && unsubscribe && unsubscribe();
    return await new Promise((resolve, reject) => {
      settle(resolve, reject, {
        data: responseData,
        headers: AxiosHeaders_default.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config,
        request
      });
    });
  } catch (err) {
    unsubscribe && unsubscribe();
    if (err && err.name === "TypeError" && /fetch/i.test(err.message)) {
      throw Object.assign(
        new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request),
        {
          cause: err.cause || err
        }
      );
    }
    throw AxiosError_default.from(err, err && err.code, config, request);
  }
});

// ../node_modules/axios/lib/adapters/adapters.js
var knownAdapters = {
  http: http_default,
  xhr: xhr_default,
  fetch: fetch_default
};
utils_default.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e) {
    }
    Object.defineProperty(fn, "adapterName", { value });
  }
});
var renderReason = (reason) => `- ${reason}`;
var isResolvedHandle = (adapter) => utils_default.isFunction(adapter) || adapter === null || adapter === false;
var adapters_default = {
  getAdapter: (adapters) => {
    adapters = utils_default.isArray(adapters) ? adapters : [adapters];
    const { length } = adapters;
    let nameOrAdapter;
    let adapter;
    const rejectedReasons = {};
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      let id;
      adapter = nameOrAdapter;
      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
        if (adapter === void 0) {
          throw new AxiosError_default(`Unknown adapter '${id}'`);
        }
      }
      if (adapter) {
        break;
      }
      rejectedReasons[id || "#" + i] = adapter;
    }
    if (!adapter) {
      const reasons = Object.entries(rejectedReasons).map(
        ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
      );
      let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
      throw new AxiosError_default(
        `There is no suitable adapter to dispatch the request ` + s,
        "ERR_NOT_SUPPORT"
      );
    }
    return adapter;
  },
  adapters: knownAdapters
};

// ../node_modules/axios/lib/core/dispatchRequest.js
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError_default(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(
    config,
    config.transformRequest
  );
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters_default.getAdapter(config.adapter || defaults_default.adapter);
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );
    response.headers = AxiosHeaders_default.from(response.headers);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  });
}

// ../node_modules/axios/lib/helpers/validator.js
var validators = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators[type] = function validator(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
var deprecatedWarnings = {};
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError_default(
        formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
        AxiosError_default.ERR_DEPRECATED
      );
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(
        formatMessage(
          opt,
          " has been deprecated since v" + version + " and will be removed in the near future"
        )
      );
    }
    return validator ? validator(value, opt, opts) : true;
  };
};
validators.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === void 0 || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError_default("option " + opt + " must be " + result, AxiosError_default.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
    }
  }
}
var validator_default = {
  assertOptions,
  validators
};

// ../node_modules/axios/lib/core/Axios.js
var validators2 = validator_default.validators;
var Axios = class {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new InterceptorManager_default(),
      response: new InterceptorManager_default()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
            err.stack += "\n" + stack;
          }
        } catch (e) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) {
      validator_default.assertOptions(transitional2, {
        silentJSONParsing: validators2.transitional(validators2.boolean),
        forcedJSONParsing: validators2.transitional(validators2.boolean),
        clarifyTimeoutError: validators2.transitional(validators2.boolean)
      }, false);
    }
    if (paramsSerializer != null) {
      if (utils_default.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator_default.assertOptions(paramsSerializer, {
          encode: validators2.function,
          serialize: validators2.function
        }, true);
      }
    }
    if (config.allowAbsoluteUrls !== void 0) {
    } else if (this.defaults.allowAbsoluteUrls !== void 0) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator_default.assertOptions(config, {
      baseUrl: validators2.spelling("baseURL"),
      withXsrfToken: validators2.spelling("withXSRFToken")
    }, true);
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils_default.merge(
      headers.common,
      headers[config.method]
    );
    headers && utils_default.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (method) => {
        delete headers[method];
      }
    );
    config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    i = 0;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};
utils_default.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios.prototype[method] = function(url2, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url: url2,
      data: (config || {}).data
    }));
  };
});
utils_default.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url2, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: url2,
        data
      }));
    };
  }
  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});
var Axios_default = Axios;

// ../node_modules/axios/lib/cancel/CancelToken.js
var CancelToken = class _CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError_default(message, config, request);
      resolvePromise(token.reason);
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new _CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
};
var CancelToken_default = CancelToken;

// ../node_modules/axios/lib/helpers/spread.js
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

// ../node_modules/axios/lib/helpers/isAxiosError.js
function isAxiosError(payload) {
  return utils_default.isObject(payload) && payload.isAxiosError === true;
}

// ../node_modules/axios/lib/helpers/HttpStatusCode.js
var HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});
var HttpStatusCode_default = HttpStatusCode;

// ../node_modules/axios/lib/axios.js
function createInstance(defaultConfig) {
  const context = new Axios_default(defaultConfig);
  const instance = bind(Axios_default.prototype.request, context);
  utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
  utils_default.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };
  return instance;
}
var axios = createInstance(defaults_default);
axios.Axios = Axios_default;
axios.CanceledError = CanceledError_default;
axios.CancelToken = CancelToken_default;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData_default;
axios.AxiosError = AxiosError_default;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread;
axios.isAxiosError = isAxiosError;
axios.mergeConfig = mergeConfig;
axios.AxiosHeaders = AxiosHeaders_default;
axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters_default.getAdapter;
axios.HttpStatusCode = HttpStatusCode_default;
axios.default = axios;
var axios_default = axios;

// ../node_modules/axios/index.js
var {
  Axios: Axios2,
  AxiosError: AxiosError2,
  CanceledError: CanceledError2,
  isCancel: isCancel2,
  CancelToken: CancelToken2,
  VERSION: VERSION2,
  all: all2,
  Cancel,
  isAxiosError: isAxiosError2,
  spread: spread2,
  toFormData: toFormData2,
  AxiosHeaders: AxiosHeaders2,
  HttpStatusCode: HttpStatusCode2,
  formToJSON,
  getAdapter,
  mergeConfig: mergeConfig2
} = axios_default;

// src/bork-protocol/services/kaito/kaito-service.ts
var KaitoService = class {
  baseUrl = "https://api.kaito.ai/api/v1";
  rateLimitCalls = 100;
  rateLimitWindow = 5 * 60 * 1e3;
  // 5 minutes in milliseconds
  callCount = 0;
  lastResetTime = Date.now();
  constructor() {
    setInterval(() => {
      this.callCount = 0;
      this.lastResetTime = Date.now();
    }, this.rateLimitWindow);
  }
  async checkRateLimit() {
    if (Date.now() - this.lastResetTime >= this.rateLimitWindow) {
      this.callCount = 0;
      this.lastResetTime = Date.now();
    }
    if (this.callCount >= this.rateLimitCalls) {
      elizaLogger26.warn("[KaitoService] Rate limit reached, waiting for reset");
      return false;
    }
    this.callCount++;
    return true;
  }
  async getYaps(params) {
    try {
      if (!params.userId && !params.username) {
        throw new Error("Either userId or username must be provided");
      }
      if (!await this.checkRateLimit()) {
        return null;
      }
      const queryParams = new URLSearchParams();
      if (params.userId) {
        queryParams.append("user_id", params.userId);
      }
      if (params.username) {
        queryParams.append("username", params.username);
      }
      const response = await axios_default.get(
        `${this.baseUrl}/yaps?${queryParams.toString()}`
      );
      elizaLogger26.info("[KaitoService] Successfully fetched Yaps data", {
        userId: params.userId,
        username: params.username
      });
      return response.data;
    } catch (error) {
      elizaLogger26.error("[KaitoService] Error fetching Yaps data:", {
        error: error instanceof Error ? error.message : String(error),
        userId: params.userId,
        username: params.username
      });
      return null;
    }
  }
  async getYapsForAccounts(accounts) {
    const results = /* @__PURE__ */ new Map();
    for (const account of accounts) {
      try {
        const yaps = await this.getYaps({
          userId: account.userId,
          username: account.username
        });
        if (yaps) {
          results.set(account.username, yaps);
        }
      } catch (error) {
        elizaLogger26.error("[KaitoService] Error fetching Yaps for account:", {
          error: error instanceof Error ? error.message : String(error),
          account
        });
      }
    }
    return results;
  }
};

// src/bork-protocol/utils/account-metrics/yaps.ts
import { elizaLogger as elizaLogger27 } from "@elizaos/core";
var kaitoService = new KaitoService();
async function updateYapsData(accounts) {
  elizaLogger27.info("[Yaps Processing] Updating Yaps data for target accounts");
  try {
    const yapsData = await kaitoService.getYapsForAccounts(accounts);
    for (const [username, yaps] of yapsData.entries()) {
      await tweetQueries.upsertYapsData({
        userId: yaps.user_id,
        username: yaps.username,
        yapsAll: yaps.yaps_all,
        yapsL24h: yaps.yaps_l24h,
        yapsL48h: yaps.yaps_l48h,
        yapsL7d: yaps.yaps_l7d,
        yapsL30d: yaps.yaps_l30d,
        yapsL3m: yaps.yaps_l3m,
        yapsL6m: yaps.yaps_l6m,
        yapsL12m: yaps.yaps_l12m,
        lastUpdated: /* @__PURE__ */ new Date()
      });
      elizaLogger27.debug(`[Yaps Processing] Updated Yaps data for ${username}`, {
        yapsAll: yaps.yaps_all,
        yapsL30d: yaps.yaps_l30d
      });
    }
  } catch (error) {
    elizaLogger27.error("[Yaps Processing] Error updating Yaps data:", error);
  }
}

// src/bork-protocol/templates/topic-relationship.ts
function topicRelationshipTemplate(params) {
  return {
    context: `You are analyzing the relationship between "${params.preferredTopic}" and a list of available topics.
For each topic, determine how closely it relates to "${params.preferredTopic}" on a scale of 0-1.
Consider semantic relationships, domain overlaps, and typical co-occurrence patterns.

Available topics to analyze:
${params.availableTopics.join(", ")}

Provide relevance scores where:
1.0 = Direct relationship/same domain (relationshipType: direct)
0.7-0.9 = Strong relationship/overlapping domain (relationshipType: strong)
0.4-0.6 = Moderate relationship/related domain (relationshipType: moderate)
0.1-0.3 = Weak relationship/tangentially related (relationshipType: weak)
0.0 = No meaningful relationship (relationshipType: none)

For each topic, also provide:
1. A brief explanation of the relationship
2. Specific examples of how the topics relate
3. Potential synergies or conflicts between the topics

Your analysis should consider:
- Semantic overlap
- Domain relationships
- Common use cases
- Typical co-occurrence in content
- Industry or field relationships
- Hierarchical relationships (if any)

Format the response as a JSON object with:
- relatedTopics: array of topic relationships
- analysisMetadata: containing confidence and timestamp`
  };
}

// src/bork-protocol/types/response/topic-relationship.ts
import { z as z4 } from "zod";
var topicRelationshipSchema = z4.object({
  relatedTopics: z4.array(
    z4.object({
      topic: z4.string().min(1),
      relevanceScore: z4.number().min(0).max(1),
      relationshipType: z4.enum([
        "direct",
        "strong",
        "moderate",
        "weak",
        "none"
      ]),
      explanation: z4.string().min(1),
      examples: z4.array(z4.string()).min(1),
      synergiesAndConflicts: z4.object({
        synergies: z4.array(z4.string()),
        conflicts: z4.array(z4.string())
      })
    })
  ),
  analysisMetadata: z4.object({
    confidence: z4.number().min(0).max(1),
    analysisTimestamp: z4.string(),
    analysisFactors: z4.array(z4.string()),
    limitations: z4.array(z4.string()).optional()
  })
});

// src/bork-protocol/utils/selection/analyze-topic-relationships.ts
import {
  ModelClass as ModelClass3,
  composeContext as composeContext2,
  elizaLogger as elizaLogger28,
  generateObject as generateObject2
} from "@elizaos/core";
async function analyzeTopicRelationships(runtime, availableTopics, preferredTopic) {
  try {
    const template = topicRelationshipTemplate({
      preferredTopic,
      availableTopics
    });
    const state = await runtime.composeState(
      {
        content: {
          text: `Analyzing relationship between ${preferredTopic} and ${availableTopics.length} topics`,
          preferredTopic,
          availableTopics
        },
        agentId: runtime.agentId,
        userId: v4_default(),
        roomId: v4_default()
      },
      {
        currentAnalysis: {
          preferredTopic,
          topicCount: availableTopics.length
        }
      }
    );
    const context = composeContext2({
      state,
      template: template.context
    });
    const { object } = await generateObject2({
      runtime,
      context,
      modelClass: ModelClass3.SMALL,
      schema: topicRelationshipSchema
    });
    const analysis = object;
    elizaLogger28.info("[Topic Analysis] Analyzed topic relationships:");
    elizaLogger28.debug({
      preferredTopic,
      topicCount: analysis.relatedTopics.length,
      confidence: analysis.analysisMetadata.confidence,
      factors: analysis.analysisMetadata.analysisFactors
    });
    return analysis;
  } catch (error) {
    elizaLogger28.error("[Topic Analysis] Error analyzing topic relationships:", {
      error: error instanceof Error ? error.message : String(error),
      preferredTopic
    });
    throw error;
  }
}

// src/bork-protocol/utils/selection/select-account.ts
function selectAccountsWithWeights(accounts, count) {
  const selected = [];
  const available = [...accounts];
  const totalWeight = accounts.reduce((sum, { weight }) => sum + weight, 0);
  for (let i = 0; i < count && available.length > 0; i++) {
    let randomWeight = Math.random() * totalWeight;
    let selectedIndex = 0;
    for (let j = 0; j < available.length; j++) {
      randomWeight -= available[j].weight;
      if (randomWeight <= 0) {
        selectedIndex = j;
        break;
      }
    }
    selected.push(available[selectedIndex].account);
    available.splice(selectedIndex, 1);
  }
  return selected;
}
async function selectTargetAccounts(runtime, config, timeframeHours = 24, preferredTopic) {
  try {
    const targetAccounts = await tweetQueries.getTargetAccounts();
    if (!targetAccounts.length) {
      elizaLogger29.warn("[TwitterAccounts] No target accounts found");
      return [];
    }
    const topicWeights = await getAggregatedTopicWeights(timeframeHours);
    let relevantTopics = topicWeights;
    if (preferredTopic && topicWeights.length > 0) {
      try {
        const analysis = await analyzeTopicRelationships(
          runtime,
          topicWeights.map((tw) => tw.topic),
          preferredTopic
        );
        relevantTopics = topicWeights.map((tw) => {
          const relationship = analysis.relatedTopics.find(
            (r) => r.topic === tw.topic
          );
          if (!relationship || relationship.relevanceScore < 0.4 || relationship.relationshipType === "none") {
            return { ...tw, weight: 0 };
          }
          return {
            ...tw,
            weight: tw.weight * 0.3 + relationship.relevanceScore * 0.5 + analysis.analysisMetadata.confidence * 0.2
          };
        }).filter((tw) => tw.weight > 0);
      } catch (error) {
        elizaLogger29.warn(
          "[TwitterAccounts] Error in topic relationship analysis, using original weights:",
          {
            error: error instanceof Error ? error.message : String(error)
          }
        );
      }
    }
    const topicBasedAccounts = /* @__PURE__ */ new Map();
    const accountTopicMentions = /* @__PURE__ */ new Map();
    for (const topic of relevantTopics) {
      const accounts = await accountTopicQueries.getTopicAccounts(topic.topic);
      for (const account of accounts) {
        const currentWeight = topicBasedAccounts.get(account.username) || 0;
        const currentMentions = accountTopicMentions.get(account.username) || 0;
        topicBasedAccounts.set(
          account.username,
          currentWeight + topic.weight * account.mentionCount / 10
        );
        accountTopicMentions.set(
          account.username,
          currentMentions + account.mentionCount
        );
      }
    }
    const accountsWithTopics = targetAccounts.filter(
      (account) => accountTopicMentions.has(account.username)
    );
    if (accountsWithTopics.length === 0) {
      elizaLogger29.warn(
        "[TwitterAccounts] No accounts found with relevant topic relationships"
      );
      return [];
    }
    const userIds = accountsWithTopics.map((account) => account.userId);
    const yapsData = await tweetQueries.getYapsForAccounts(userIds);
    const totalAccountsToProcess = Math.min(
      config.search.tweetLimits.accountsToProcess,
      accountsWithTopics.length
    );
    const yapsBasedCount = Math.ceil(totalAccountsToProcess * 0.5);
    const influenceBasedCount = totalAccountsToProcess - yapsBasedCount;
    const yapsWeighted = accountsWithTopics.map(
      (account) => {
        const accountYaps = yapsData.find(
          (yaps) => yaps.userId === account.userId
        );
        const topicWeight = topicBasedAccounts.get(account.username) || 0;
        const yapsWeight = 1 + (accountYaps?.yapsL24h || 0);
        return {
          account,
          weight: yapsWeight * (0.7 + topicWeight * 0.3)
          // Scale yaps weight by topic relevance
        };
      }
    );
    const influenceWeighted = accountsWithTopics.map(
      (account) => {
        const topicWeight = topicBasedAccounts.get(account.username) || 0;
        const influenceWeight = 1 + account.influenceScore / 100;
        return {
          account,
          weight: influenceWeight * (0.7 + topicWeight * 0.3)
          // Scale influence weight by topic relevance
        };
      }
    );
    const yapsSelected = selectAccountsWithWeights(
      yapsWeighted,
      yapsBasedCount
    );
    const influenceSelected = selectAccountsWithWeights(
      // Filter out accounts already selected by yaps
      influenceWeighted.filter(
        (weighted) => !yapsSelected.some(
          (selected) => selected.userId === weighted.account.userId
        )
      ),
      influenceBasedCount
    );
    const accountsToProcess = [...yapsSelected, ...influenceSelected];
    elizaLogger29.info(
      `[TwitterAccounts] Selected ${accountsToProcess.length} accounts (${yapsSelected.length} by yaps, ${influenceSelected.length} by influence) from ${accountsWithTopics.length} topic-relevant accounts out of ${targetAccounts.length} total accounts. Config limit: ${config.search.tweetLimits.accountsToProcess}. Selected: ${accountsToProcess.map((a) => a.username).join(", ")}`
    );
    await updateYapsData(accountsToProcess);
    return accountsToProcess;
  } catch (error) {
    elizaLogger29.error(
      "[TwitterAccounts] Error selecting target accounts:",
      error instanceof Error ? error.stack || error.message : String(error)
    );
    throw error;
  }
}

// src/bork-protocol/mappers/tweet-mapper.ts
function mapTweet(tweet) {
  return {
    // Core tweet data from AgentTweet
    id: v4_default(),
    // Generate a UUID for our database
    tweet_id: tweet.id || "",
    // Twitter's ID
    text: tweet.text || "",
    userId: tweet.userId || "",
    name: tweet.name || "",
    username: tweet.username || "",
    timestamp: tweet.timestamp || Math.floor(Date.now() / 1e3),
    timeParsed: tweet.timeParsed || /* @__PURE__ */ new Date(),
    // Tweet metrics
    likes: tweet.likes || 0,
    retweets: tweet.retweets || 0,
    replies: tweet.replies || 0,
    views: tweet.views || 0,
    bookmarkCount: tweet.bookmarkCount || 0,
    // Tweet metadata
    conversationId: tweet.conversationId || "",
    permanentUrl: tweet.permanentUrl || "",
    html: tweet.html || "",
    inReplyToStatus: tweet.inReplyToStatus,
    inReplyToStatusId: tweet.inReplyToStatusId,
    quotedStatus: tweet.quotedStatus,
    quotedStatusId: tweet.quotedStatusId,
    retweetedStatus: tweet.retweetedStatus,
    retweetedStatusId: tweet.retweetedStatusId,
    thread: Array.isArray(tweet.thread) ? tweet.thread.map(mapTweet) : [],
    // Tweet flags
    isQuoted: tweet.isQuoted || false,
    isPin: tweet.isPin || false,
    isReply: tweet.isReply || false,
    isRetweet: tweet.isRetweet || false,
    isSelfThread: tweet.isSelfThread || false,
    sensitiveContent: tweet.sensitiveContent || false,
    // Media and entities
    hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
    mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
    photos: Array.isArray(tweet.photos) ? tweet.photos : [],
    urls: Array.isArray(tweet.urls) ? tweet.urls : [],
    videos: Array.isArray(tweet.videos) ? tweet.videos : [],
    place: tweet.place,
    poll: tweet.poll,
    // Our additional fields with defaults
    status: "pending",
    createdAt: /* @__PURE__ */ new Date(),
    mediaType: "text",
    isThreadMerged: false,
    threadSize: 0,
    originalText: tweet.text || "",
    homeTimeline: {
      publicMetrics: {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0
      },
      entities: {
        hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
        mentions: Array.isArray(tweet.mentions) ? tweet.mentions.map((m) => ({
          username: m.username || "",
          id: m.id || ""
        })) : [],
        urls: Array.isArray(tweet.urls) ? tweet.urls : []
      }
    }
  };
}

// src/bork-protocol/utils/selection/select-tweets-from-account.ts
import { elizaLogger as elizaLogger30 } from "@elizaos/core";
import { SearchMode as SearchMode4 } from "agent-twitter-client";
async function selectTweetsFromAccounts(twitterService, accounts, config) {
  const results = [];
  for (const account of accounts) {
    try {
      const { tweets: accountTweets, spammedTweets } = await twitterService.searchTweets(
        `from:${account.username}`,
        config.search.tweetLimits.targetAccounts,
        SearchMode4.Latest,
        "[TwitterAccounts]",
        {
          excludeReplies: config.search.parameters.excludeReplies,
          excludeRetweets: config.search.parameters.excludeRetweets,
          filterLevel: "none"
        },
        config.search.engagementThresholds
      );
      elizaLogger30.debug(
        `[TwitterAccounts] Fetched ${accountTweets.length} tweets from ${account.username}`,
        { spammedTweets }
      );
      const validTweets = accountTweets.filter((tweet) => {
        if (!tweet.id) {
          elizaLogger30.warn(
            `[TwitterAccounts] Tweet from ${account.username} missing ID:`,
            {
              text: tweet.text?.substring(0, 100)
            }
          );
          return false;
        }
        return true;
      });
      const existingTweetIds = new Set(
        (await Promise.all(
          validTweets.map(
            (tweet) => tweetQueries.findTweetByTweetId(tweet.id)
          )
        )).filter(Boolean).map((tweet) => tweet.tweet_id)
      );
      const unprocessedTweets = validTweets.filter(
        (tweet) => !existingTweetIds.has(tweet.id)
      );
      if (validTweets.length > unprocessedTweets.length) {
        elizaLogger30.debug(
          `[TwitterAccounts] Filtered out ${validTweets.length - unprocessedTweets.length} already processed tweets from ${account.username}`
        );
      }
      const mappedTweets = unprocessedTweets.map((tweet) => ({
        ...mapTweet(tweet),
        id: v4_default(),
        // Generate a UUID for our database
        tweet_id: tweet.id
        // Keep Twitter's ID
      }));
      let processedCount = 0;
      const selectedTweets = [];
      const thresholds = config.search.engagementThresholds;
      for (const tweet of mappedTweets) {
        if (meetsCriteria(tweet, thresholds)) {
          selectedTweets.push(tweet);
          processedCount++;
          if (processedCount >= config.search.tweetLimits.qualityTweetsPerAccount) {
            break;
          }
        }
      }
      elizaLogger30.info(
        `[TwitterAccounts] Selected ${selectedTweets.length} tweets meeting criteria from ${mappedTweets.length} unprocessed tweets for ${account.username}`
      );
      elizaLogger30.debug({
        minLikes: thresholds.minLikes,
        minRetweets: thresholds.minRetweets,
        minReplies: thresholds.minReplies,
        maxQualityTweets: config.search.tweetLimits.qualityTweetsPerAccount
      });
      results.push({
        tweets: selectedTweets,
        spammedTweets: spammedTweets || 0,
        processedCount
      });
    } catch (error) {
      elizaLogger30.error(
        `[TwitterAccounts] Error fetching tweets from ${account.username}:`,
        error instanceof Error ? error.message : String(error)
      );
      results.push({
        tweets: [],
        spammedTweets: 0,
        processedCount: 0
      });
    }
  }
  return results;
}
function meetsCriteria(tweet, thresholds) {
  return (tweet.likes || 0) >= thresholds.minLikes && (tweet.retweets || 0) >= thresholds.minRetweets && (tweet.replies || 0) >= thresholds.minReplies;
}

// src/bork-protocol/clients/x-client/accounts.ts
import { elizaLogger as elizaLogger31 } from "@elizaos/core";
var TwitterAccountsClient = class {
  twitterConfigService;
  twitterService;
  runtime;
  tweetQueueService;
  monitoringTimeout = null;
  constructor(twitterService, runtime, tweetQueueService) {
    this.twitterService = twitterService;
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
    this.tweetQueueService = tweetQueueService;
  }
  async start() {
    elizaLogger31.info("[TwitterAccounts] Starting accounts client");
    try {
      await initializeTopicWeights(this.runtime);
    } catch (error) {
      elizaLogger31.error(
        "[TwitterAccounts] Error initializing topic weights:",
        error
      );
    }
    await this.initializeTargetAccounts();
    await this.onReady();
  }
  async stop() {
    elizaLogger31.info("[TwitterAccounts] Stopping accounts client");
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }
  async onReady() {
    await this.monitorTargetAccountsLoop();
  }
  async monitorTargetAccountsLoop() {
    try {
      await this.monitorTargetAccounts();
    } catch (error) {
      elizaLogger31.error("[TwitterAccounts] Error in monitoring loop:", error);
    }
    this.monitoringTimeout = setTimeout(
      () => this.monitorTargetAccountsLoop(),
      Number(this.runtime.getSetting("TWITTER_POLL_INTERVAL") || 60) * 1e3
    );
  }
  async monitorTargetAccounts() {
    elizaLogger31.info("[TwitterAccounts] Starting target account monitoring");
    try {
      const config = await this.twitterConfigService.getConfig();
      const env = getEnv();
      const accountsToProcess = await selectTargetAccounts(
        this.runtime,
        config,
        env.SEARCH_TIMEFRAME_HOURS,
        env.SEARCH_PREFERRED_TOPIC
      );
      if (!accountsToProcess.length) {
        return;
      }
      const selectionResults = await selectTweetsFromAccounts(
        this.twitterService,
        accountsToProcess,
        config
      );
      const allTweets = selectionResults.flatMap((result) => result.tweets);
      if (allTweets.length === 0) {
        elizaLogger31.warn(
          "[TwitterAccounts] No tweets found from any target accounts"
        );
        return;
      }
      await this.tweetQueueService.addTweets(allTweets, "account", 2);
      elizaLogger31.info(
        "[TwitterAccounts] Successfully queued tweets from target accounts"
      );
    } catch (error) {
      elizaLogger31.error(
        "[TwitterAccounts] Error monitoring target accounts:",
        error instanceof Error ? error.stack || error.message : String(error)
      );
    } finally {
      elizaLogger31.info(
        "[TwitterAccounts] Target account monitoring cycle completed"
      );
    }
  }
  async initializeTargetAccounts() {
    const config = await this.twitterConfigService.getConfig();
    await initializeTargetAccounts(this.twitterService, config);
  }
};

// src/bork-protocol/templates/interaction.ts
import { messageCompletionFooter as messageCompletionFooter2 } from "@elizaos/core";
var twitterMessageHandlerTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

{{actions}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}). You MUST include an action if the current post text includes a prompt that is similar to one of the available actions mentioned here:
{{actionNames}}

Here is the current post text again. Remember to include an action if the current post text includes a prompt that asks for one of the available actions mentioned above (does not need to be exact):
{{currentPost}}
${messageCompletionFooter2}`;
var twitterShouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation.

# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

Current Post:
{{currentPost}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

# Task: Determine if {{agentName}} (@{{twitterUserName}}) should respond to this message. Consider:
1. Is the message relevant to {{agentName}}'s expertise and interests?
2. Would a response add value to the conversation?
3. Is the message spam or low quality?
4. Has {{agentName}} already responded to this thread?
5. Is the message directed at {{agentName}}?

Spam Detection Guidelines:
1. Primary Spam Indicators (Must have at least one):
   - Promotional Content:
     * Aggressive sales language ("Buy now!", "Don't miss out!")
     * Get-rich-quick promises
     * Multiple promotional links
   - Engagement Farming:
     * Follow-for-follow schemes
     * Giveaway spam ("RT & Follow to win!")
     * Mass-copied engagement bait

2. Secondary Spam Signals (Multiple required):
   - Hashtag Abuse:
     * More than 7 hashtags
     * Completely unrelated trending hashtags
   - Suspicious Patterns:
     * Exact duplicate tweets
     * Automated-looking content
     * Coordinated spam campaigns
   - Deceptive Tactics:
     * Fake celebrity endorsements
     * Obviously false claims
     * Phishing attempts

3. NOT Spam:
   - Normal Conversations:
     * Personal opinions
     * Questions and responses
     * Casual discussions
     * Emotional expressions
   - Regular Marketing:
     * Product announcements
     * Company updates
     * Professional promotions
   - Community Engagement:
     * Genuine discussions
     * Topic-specific hashtags
     * Industry news sharing

Return one of these responses:
- "RESPOND" - If the message is relevant, valuable, and not spam
- "IGNORE" - If the message is irrelevant or we've already responded
- "SPAM" - If the message matches spam criteria above (include JSON after SPAM with reasons)

Example SPAM response:
SPAM {"spamScore":0.95,"reasons":["engagement farming giveaway","follow-for-follow scheme","automated content"]}

${messageCompletionFooter2}`;

// src/bork-protocol/utils/active-tweeting/tweet.ts
import {
  elizaLogger as elizaLogger32,
  stringToUuid as stringToUuid4
} from "@elizaos/core";
var wait = (minTime = 1e3, maxTime = 3e3) => {
  const waitTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  return new Promise((resolve) => setTimeout(resolve, waitTime));
};
async function sendTweetAndCreateMemory(twitterService, response, roomId, agentId, userId, inReplyToId) {
  const memories = [];
  const text = response.text;
  if (!text) {
    elizaLogger32.error("[Twitter Client] No text to send");
    return memories;
  }
  try {
    const tweet = await twitterService.sendTweet(text, inReplyToId);
    const memory = {
      id: stringToUuid4(`${tweet.id}-${agentId}`),
      agentId,
      content: {
        text: tweet.text,
        source: "twitter",
        url: tweet.permanentUrl,
        inReplyTo: inReplyToId ? stringToUuid4(inReplyToId) : void 0
      },
      createdAt: tweet.timestamp * 1e3,
      roomId,
      userId
    };
    memories.push(memory);
  } catch (error) {
    elizaLogger32.error("[Twitter Client] Error sending tweet:", error);
  }
  return memories;
}

// src/bork-protocol/clients/x-client/interactions.ts
import {
  ModelClass as ModelClass4,
  composeContext as composeContext3,
  elizaLogger as elizaLogger33,
  generateMessageResponse,
  generateShouldRespond,
  stringToUuid as stringToUuid5
} from "@elizaos/core";
import { SearchMode as SearchMode5 } from "agent-twitter-client";
var TwitterInteractionClient = class {
  twitterService;
  runtime;
  interactionLoopTimeout = null;
  constructor(twitterService, runtime) {
    this.twitterService = twitterService;
    this.runtime = runtime;
  }
  async start() {
    elizaLogger33.info("[TwitterInteraction] Twitter interactions starting");
    if (!this.twitterService || !this.twitterService.getProfile()) {
      elizaLogger33.error(
        "[TwitterInteraction] Service or profile not initialized"
      );
      return;
    }
    const handleTwitterInteractionsLoop = () => {
      void this.handleTwitterInteractions();
      this.interactionLoopTimeout = setTimeout(
        handleTwitterInteractionsLoop,
        Number(this.runtime.getSetting("TWITTER_POLL_INTERVAL") || 60) * 1e3
      );
    };
    handleTwitterInteractionsLoop();
  }
  async stop() {
    if (this.interactionLoopTimeout) {
      clearTimeout(this.interactionLoopTimeout);
      this.interactionLoopTimeout = null;
    }
  }
  async handleTwitterInteractions() {
    elizaLogger33.info("[TwitterInteraction] Checking Twitter interactions");
    const profile = this.twitterService.getProfile();
    if (!profile?.username) {
      elizaLogger33.error(
        "[TwitterInteraction] Twitter profile not properly initialized"
      );
      return;
    }
    const twitterUsername = profile.username;
    try {
      const { tweets: mentionCandidates, spammedTweets } = await this.twitterService.searchTweets(
        `@${twitterUsername}`,
        20,
        SearchMode5.Latest,
        "[TwitterInteraction]"
      );
      elizaLogger33.info(
        `[TwitterInteraction] Found ${mentionCandidates.length} mention candidates for ${twitterUsername} (filtered ${spammedTweets} spam tweets)`
      );
      let uniqueTweetCandidates = [...new Set(mentionCandidates)];
      uniqueTweetCandidates = uniqueTweetCandidates.sort((a, b) => a.id.localeCompare(b.id)).filter((tweet) => tweet.userId !== profile.userId);
      const lastCheckedId = await this.twitterService.getLatestCheckedTweetId(
        profile.username
      );
      for (const tweet of uniqueTweetCandidates) {
        if (!lastCheckedId || BigInt(tweet.id) > lastCheckedId) {
          const tweetId = stringToUuid5(`${tweet.id}-${this.runtime.agentId}`);
          const existingResponse = await this.runtime.messageManager.getMemoryById(tweetId);
          if (existingResponse) {
            elizaLogger33.info(
              `[TwitterInteraction] Already responded to tweet ${tweet.id}, skipping`
            );
            continue;
          }
          elizaLogger33.info(
            `[TwitterInteraction] New Tweet found: ${tweet.permanentUrl}`
          );
          const roomId = stringToUuid5(
            `${tweet.conversationId}-${this.runtime.agentId}`
          );
          const userIdUUID = tweet.userId ? tweet.userId === profile.userId ? this.runtime.agentId : stringToUuid5(tweet.userId) : stringToUuid5("unknown-user");
          await this.runtime.ensureConnection(
            userIdUUID,
            roomId,
            tweet.username,
            tweet.name,
            "twitter"
          );
          const thread = await this.buildConversationThread(tweet);
          const message = {
            content: { text: tweet.text },
            agentId: this.runtime.agentId,
            userId: userIdUUID,
            roomId
          };
          await this.handleTweet({
            tweet,
            message,
            thread
          });
          await this.twitterService.updateLatestCheckedTweetId(
            profile.username,
            BigInt(tweet.id)
          );
        }
      }
      elizaLogger33.info(
        "[TwitterInteraction] Finished checking Twitter interactions"
      );
    } catch (error) {
      elizaLogger33.error(
        "[TwitterInteraction] Error handling Twitter interactions:",
        error
      );
    }
  }
  async handleTweet({
    tweet,
    message,
    thread
  }) {
    const profile = this.twitterService.getProfile();
    if (!profile || tweet.userId === profile.userId) {
      return;
    }
    if (!message.content.text) {
      elizaLogger33.info(
        `[TwitterInteraction] Skipping Tweet with no text: ${tweet.id}`
      );
      return;
    }
    elizaLogger33.info(`[TwitterInteraction] Processing Tweet: ${tweet.id}`);
    const formatTweet = (tweet2) => `ID: ${tweet2.id}
From: ${tweet2.name} (@${tweet2.username})
Text: ${tweet2.text}`;
    const currentPost = formatTweet(tweet);
    elizaLogger33.debug(`[TwitterInteraction] Thread: ${thread}`);
    const formattedConversation = thread.map(
      (tweet2) => `@${tweet2.username} (${new Date(
        tweet2.timestamp * 1e3
      ).toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric"
      })}):
      ${tweet2.text}`
    ).join("\n\n");
    elizaLogger33.debug(
      `[TwitterInteraction] formattedConversation: ${formattedConversation}`
    );
    let homeTimeline = [];
    const cachedTimeline = await this.twitterService.getUserTimeline(
      profile.username,
      50
    );
    if (cachedTimeline.tweets.length > 0) {
      homeTimeline = cachedTimeline.tweets;
    }
    const formattedTimeline = homeTimeline.map(
      (tweet2) => `ID: ${tweet2.id}
From: ${tweet2.name} (@${tweet2.username})${tweet2.inReplyToStatusId ? `
In reply to: ${tweet2.inReplyToStatusId}` : ""}
Text: ${tweet2.text}
---`
    ).join("\n");
    let state = await this.runtime.composeState(message, {
      twitterService: this.twitterService,
      twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
      currentPost,
      formattedConversation,
      timeline: formattedTimeline
    });
    const shouldRespondContext = composeContext3({
      state,
      template: this.runtime.character.templates?.twitterShouldRespondTemplate || this.runtime.character?.templates?.shouldRespondTemplate || twitterShouldRespondTemplate
    });
    const shouldRespond = await generateShouldRespond({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass4.SMALL
    });
    if (shouldRespond.startsWith("SPAM")) {
      try {
        const spamJson = shouldRespond.substring(4).trim();
        const spamData = JSON.parse(spamJson);
        elizaLogger33.info(
          `[TwitterInteraction] Tweet ${tweet.id} identified as spam`,
          {
            spamScore: spamData.spamScore,
            reasons: spamData.reasons,
            userId: tweet.userId,
            username: tweet.username
          }
        );
        await tweetQueries.updateSpamUser(
          tweet.userId,
          spamData.spamScore,
          spamData.reasons
        );
        return;
      } catch (error) {
        elizaLogger33.error(
          "[TwitterInteraction] Error processing spam response:",
          error
        );
      }
    }
    if (shouldRespond !== "RESPOND") {
      elizaLogger33.info("[TwitterInteraction] Not responding to message");
      return;
    }
    const context = composeContext3({
      state,
      template: this.runtime.character.templates?.twitterMessageHandlerTemplate || this.runtime.character?.templates?.messageHandlerTemplate || twitterMessageHandlerTemplate
    });
    elizaLogger33.debug(`[TwitterInteraction] Interactions prompt:
${context}`);
    const response = await generateMessageResponse({
      runtime: this.runtime,
      context,
      modelClass: ModelClass4.MEDIUM
    });
    const removeQuotes = (str) => str.replace(/^['"](.*)['"]$/, "$1");
    response.text = removeQuotes(response.text);
    if (response.text) {
      try {
        const responseMessages = await sendTweetAndCreateMemory(
          this.twitterService,
          response,
          message.roomId,
          message.agentId,
          message.userId,
          tweet.id
        );
        state = await this.runtime.updateRecentMessageState(state);
        for (const responseMessage of responseMessages) {
          if (responseMessage === responseMessages[responseMessages.length - 1]) {
            responseMessage.content.action = response.action;
          } else {
            responseMessage.content.action = "CONTINUE";
          }
          await this.runtime.messageManager.createMemory(responseMessage);
        }
        await this.runtime.evaluate(message, state);
        await this.runtime.processActions(message, responseMessages, state);
        await this.twitterService.cacheResponseInfo(
          tweet.id,
          context,
          tweet,
          response.text
        );
        await wait();
      } catch (error) {
        elizaLogger33.error(
          `[TwitterInteraction] Error sending response tweet: ${error}`
        );
      }
    }
  }
  async buildConversationThread(tweet, maxReplies = 10) {
    const thread = [];
    const visited = /* @__PURE__ */ new Set();
    const processThread = async (currentTweet, depth = 0) => {
      elizaLogger33.info(
        `[TwitterInteraction] Processing tweet: ${currentTweet.id}`,
        {
          id: currentTweet.id,
          inReplyToStatusId: currentTweet.inReplyToStatusId,
          depth
        }
      );
      if (!currentTweet) {
        elizaLogger33.info(
          "[TwitterInteraction] No current tweet found for thread building"
        );
        return;
      }
      if (depth >= maxReplies) {
        elizaLogger33.info(
          "[TwitterInteraction] Reached maximum reply depth",
          depth
        );
        return;
      }
      const memory = await this.runtime.messageManager.getMemoryById(
        stringToUuid5(`${currentTweet.id}-${this.runtime.agentId}`)
      );
      if (!memory) {
        const roomId = stringToUuid5(
          `${currentTweet.conversationId}-${this.runtime.agentId}`
        );
        const userId = stringToUuid5(currentTweet.userId);
        await this.runtime.ensureConnection(
          userId,
          roomId,
          currentTweet.username,
          currentTweet.name,
          "twitter"
        );
        const memory2 = {
          id: stringToUuid5(`${currentTweet.id}-${this.runtime.agentId}`),
          agentId: this.runtime.agentId,
          content: {
            text: currentTweet.text,
            source: "twitter",
            url: currentTweet.permanentUrl,
            inReplyTo: currentTweet.inReplyToStatusId ? stringToUuid5(
              `${currentTweet.inReplyToStatusId}-${this.runtime.agentId}`
            ) : void 0
          },
          createdAt: currentTweet.timestamp * 1e3,
          roomId,
          userId: currentTweet.userId === this.twitterService.getProfile()?.userId ? this.runtime.agentId : stringToUuid5(currentTweet.userId)
        };
        await this.runtime.messageManager.addEmbeddingToMemory(memory2);
        await this.runtime.messageManager.createMemory(memory2);
      }
      if (visited.has(currentTweet.id)) {
        elizaLogger33.info(
          "[TwitterInteraction] Already visited tweet:",
          currentTweet.id
        );
        return;
      }
      visited.add(currentTweet.id);
      thread.unshift(currentTweet);
      elizaLogger33.debug("[TwitterInteraction] Current thread state:", {
        length: thread.length,
        currentDepth: depth,
        tweetId: currentTweet.id
      });
      if (currentTweet.inReplyToStatusId) {
        elizaLogger33.info(
          "Fetching parent tweet:",
          currentTweet.inReplyToStatusId
        );
        try {
          const parentTweet = await this.twitterService.getTweet(
            currentTweet.inReplyToStatusId
          );
          if (parentTweet) {
            elizaLogger33.info("[TwitterInteraction] Found parent tweet:", {
              id: parentTweet.id,
              text: parentTweet.text?.slice(0, 50)
            });
            await processThread(parentTweet, depth + 1);
          } else {
            elizaLogger33.info(
              "[TwitterInteraction] No parent tweet found for:",
              currentTweet.inReplyToStatusId
            );
          }
        } catch (error) {
          elizaLogger33.info(
            "[TwitterInteraction] Error fetching parent tweet:",
            {
              tweetId: currentTweet.inReplyToStatusId,
              error
            }
          );
        }
      } else {
        elizaLogger33.info(
          "[TwitterInteraction] Reached end of reply chain at:",
          currentTweet.id
        );
      }
    };
    await processThread(tweet, 0);
    elizaLogger33.debug(
      "[TwitterInteraction] Final thread built:",
      thread.length,
      thread.map((t5) => ({
        id: t5.id,
        text: t5.text?.slice(0, 50)
      }))
    );
    return thread;
  }
};

// src/bork-protocol/utils/selection/select-topic.ts
import { elizaLogger as elizaLogger34 } from "@elizaos/core";
async function selectTopic(runtime, timeframeHours = 24, preferredTopic) {
  const topicWeights = await getAggregatedTopicWeights(timeframeHours);
  if (topicWeights.length === 0) {
    throw new Error("No topics available for selection");
  }
  if (!preferredTopic) {
    return performWeightedSelection(topicWeights);
  }
  try {
    const analysis = await analyzeTopicRelationships(
      runtime,
      topicWeights.map((tw) => tw.topic),
      preferredTopic
    );
    const adjustedWeights = topicWeights.map((tw) => {
      const relationship = analysis.relatedTopics.find(
        (r) => r.topic === tw.topic
      );
      if (!relationship || relationship.relevanceScore < 0.4 || relationship.relationshipType === "none") {
        return {
          ...tw,
          weight: 0
          // Zero weight means it won't be selected
        };
      }
      const baseWeight = tw.weight * 0.3;
      const relationshipWeight = relationship.relevanceScore * 0.5;
      const confidenceWeight = analysis.analysisMetadata.confidence * 0.2;
      return {
        ...tw,
        weight: baseWeight + relationshipWeight + confidenceWeight
      };
    });
    const validWeights = adjustedWeights.filter((tw) => tw.weight > 0);
    if (validWeights.length === 0) {
      elizaLogger34.warn(
        "[TopicSelection] No sufficiently related topics found, using preferred topic",
        { preferredTopic }
      );
      return {
        ...topicWeights[0],
        topic: preferredTopic,
        weight: 1
      };
    }
    elizaLogger34.debug("[TopicSelection] Adjusted weights:", {
      adjustments: validWeights.map((w) => ({
        topic: w.topic,
        originalWeight: topicWeights.find((tw) => tw.topic === w.topic)?.weight,
        adjustedWeight: w.weight,
        relationship: analysis.relatedTopics.find((r) => r.topic === w.topic)?.relationshipType
      }))
    });
    return performWeightedSelection(validWeights);
  } catch (error) {
    elizaLogger34.warn(
      "[TopicSelection] Error in relationship analysis, falling back to basic selection:",
      {
        error: error instanceof Error ? error.message : String(error)
      }
    );
    return performWeightedSelection(topicWeights);
  }
}
function performWeightedSelection(topicWeights) {
  const totalWeight = topicWeights.reduce((sum, tw) => sum + tw.weight, 0);
  const randomValue = Math.random() * totalWeight;
  let accumWeight = 0;
  const selectedTopic = topicWeights.find((tw) => {
    accumWeight += tw.weight;
    return randomValue <= accumWeight;
  }) || topicWeights[0];
  elizaLogger34.debug("[TopicSelection] Selected topic based on weights", {
    selectedTopic: selectedTopic.topic,
    weight: selectedTopic.weight,
    allWeights: topicWeights.map((tw) => ({
      topic: tw.topic,
      weight: tw.weight
    }))
  });
  return selectedTopic;
}

// src/bork-protocol/clients/x-client/search.ts
import { elizaLogger as elizaLogger35 } from "@elizaos/core";
import { SearchMode as SearchMode6 } from "agent-twitter-client";
var TwitterSearchClient = class {
  twitterConfigService;
  twitterService;
  runtime;
  tweetQueueService;
  searchTimeout = null;
  constructor(twitterService, runtime, tweetQueueService) {
    this.twitterService = twitterService;
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
    this.tweetQueueService = tweetQueueService;
  }
  async start() {
    elizaLogger35.info("[TwitterSearch] Starting search client");
    try {
      await initializeTopicWeights(this.runtime);
    } catch (error) {
      elizaLogger35.error(
        "[TwitterAccounts] Error initializing topic weights:",
        error
      );
    }
    await this.onReady();
  }
  async stop() {
    elizaLogger35.info("[TwitterSearch] Stopping search client");
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }
  async onReady() {
    await this.engageWithSearchTermsLoop();
  }
  async engageWithSearchTermsLoop() {
    this.engageWithSearchTerms();
    this.searchTimeout = setTimeout(
      () => this.engageWithSearchTermsLoop(),
      Number(this.runtime.getSetting("TWITTER_POLL_INTERVAL") || 60) * 1e3
    );
  }
  async engageWithSearchTerms() {
    elizaLogger35.info("[TwitterSearch] Engaging with search terms");
    const config = await this.twitterConfigService.getConfig();
    const env = getEnv();
    try {
      const selectedTopic = await selectTopic(
        this.runtime,
        //TODO: update to get this from runtime or twitter config
        env.SEARCH_TIMEFRAME_HOURS,
        env.SEARCH_PREFERRED_TOPIC
      );
      elizaLogger35.info("[TwitterSearch] Fetching search tweets", {
        preferredTopic: env.SEARCH_PREFERRED_TOPIC
      });
      await new Promise((resolve) => setTimeout(resolve, 5e3));
      const { tweets: searchTweets, spammedTweets } = await this.twitterService.searchTweets(
        selectedTopic.topic,
        config.search.tweetLimits.searchResults,
        SearchMode6.Top,
        "[TwitterSearch]",
        config.search.parameters,
        config.search.engagementThresholds
      );
      if (!searchTweets.length) {
        elizaLogger35.warn(
          `[TwitterSearch] No tweets found for term: ${selectedTopic.topic}`
        );
        return;
      }
      elizaLogger35.info(
        `[TwitterSearch] Found ${searchTweets.length} tweets for term: ${selectedTopic.topic}`,
        { spammedTweets }
      );
      await this.tweetQueueService.addTweets(searchTweets, "search", 1);
      elizaLogger35.info("[TwitterSearch] Successfully queued search results");
    } catch (error) {
      elizaLogger35.error(
        "[TwitterSearch] Error engaging with search terms:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
};

// src/bork-protocol/clients/x-client/index.ts
var TwitterClient = class {
  runtime;
  twitterService = null;
  accountsClient = null;
  searchClient = null;
  interactionClient = null;
  discoveryClient = null;
  tweetQueueService = null;
  constructor(runtime) {
    this.runtime = runtime;
  }
  async start() {
    elizaLogger36.info("[TwitterClient] Starting Twitter client");
    const twitterUsername = this.runtime.getSetting("TWITTER_USERNAME");
    const twitterPassword = this.runtime.getSetting("TWITTER_PASSWORD");
    const twitterEmail = this.runtime.getSetting("TWITTER_EMAIL");
    if (!twitterUsername || !twitterPassword || !twitterEmail) {
      elizaLogger36.error(
        "[TwitterClient] Twitter credentials not found in settings"
      );
      return;
    }
    try {
      elizaLogger36.info("[TwitterClient] Creating Twitter client");
      const twitterClient = new Scraper2();
      this.twitterService = new TwitterService(twitterClient, this.runtime);
      const initialized = await this.twitterService.initialize();
      if (!initialized) {
        throw new Error("Failed to initialize Twitter service");
      }
      elizaLogger36.info("[TwitterClient] Initialized Twitter service");
      const targetUsers = this.runtime.getSetting("TWITTER_TARGET_USERS");
      if (targetUsers) {
        this.twitterService.setTargetUsers(
          targetUsers.split(",").map((u) => u.trim())
        );
      }
      this.tweetQueueService = TweetQueueService.getInstance(
        this.runtime,
        this.twitterService
      );
      await this.tweetQueueService.start();
      elizaLogger36.info("[TwitterClient] Started tweet queue service");
      elizaLogger36.info("[TwitterClient] Initializing clients");
      this.accountsClient = new TwitterAccountsClient(
        this.twitterService,
        this.runtime,
        this.tweetQueueService
      );
      this.searchClient = new TwitterSearchClient(
        this.twitterService,
        this.runtime,
        this.tweetQueueService
      );
      this.interactionClient = new TwitterInteractionClient(
        this.twitterService,
        this.runtime
      );
      this.discoveryClient = new TwitterAccountDiscoveryClient(
        this.runtime,
        this.twitterService
      );
      await Promise.all([
        // this.accountsClient.start(),
        this.searchClient.start()
        // this.interactionClient.start(),
        // this.discoveryClient.start(),
      ]);
      elizaLogger36.info("[TwitterClient] Twitter client started successfully");
    } catch (error) {
      elizaLogger36.error(
        "[TwitterClient] Error starting Twitter client:",
        error
      );
      throw error;
    }
  }
  async stop() {
    elizaLogger36.info("[TwitterClient] Stopping Twitter client");
    try {
      if (this.discoveryClient) {
        await this.discoveryClient.stop();
      }
      if (this.interactionClient) {
        await this.interactionClient.stop();
      }
      if (this.searchClient) {
        await this.searchClient.stop();
      }
      if (this.accountsClient) {
        await this.accountsClient.stop();
      }
      if (this.tweetQueueService) {
        await this.tweetQueueService.stop();
      }
      try {
        await cleanupPool();
        elizaLogger36.info("[TwitterClient] Database connections cleaned up");
      } catch (dbError) {
        elizaLogger36.error(
          "[TwitterClient] Error cleaning up database connections:",
          dbError
        );
      }
      elizaLogger36.info("[TwitterClient] Twitter client stopped successfully");
    } catch (error) {
      elizaLogger36.error(
        "[TwitterClient] Error stopping Twitter client:",
        error
      );
      throw error;
    }
  }
};
async function startTwitterClient(runtime) {
  const client = new TwitterClient(runtime);
  await client.start();
  return client;
}

// src/bork-protocol/clients/index.ts
async function initializeClients(_character, runtime) {
  const clients = [];
  if (runtime.getSetting("TWITTER_USERNAME")) {
    const twitterClient = await startTwitterClient(runtime);
    clients.push(twitterClient);
  }
  if (runtime.getSetting("INJECTIVE_ENABLED") === "true") {
    const injectiveClient = await startInjectiveClient(runtime);
    clients.push(injectiveClient);
  }
  return clients;
}

// src/bork-protocol/plugins/adapter-postgres/index.ts
var import_pg2 = __toESM(require_lib2(), 1);
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DatabaseAdapter,
  EmbeddingProvider,
  elizaLogger as elizaLogger37,
  getEmbeddingConfig
} from "@elizaos/core";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PostgresDatabaseAdapter = class extends DatabaseAdapter {
  pool;
  maxRetries = 3;
  baseDelay = 1e3;
  // 1 second
  maxDelay = 1e4;
  // 10 seconds
  jitterMax = 1e3;
  // 1 second
  connectionTimeout = 5e3;
  // 5 seconds
  constructor(connectionConfig) {
    super({
      //circuitbreaker stuff
      failureThreshold: 5,
      resetTimeout: 6e4,
      halfOpenMaxAttempts: 3
    });
    const defaultConfig = {
      max: 20,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: this.connectionTimeout
    };
    this.pool = new import_pg2.default.Pool({
      ...defaultConfig,
      ...connectionConfig
      // Allow overriding defaults
    });
    this.pool.on("error", (err) => {
      elizaLogger37.error("Unexpected pool error", err);
      this.handlePoolError(err);
    });
    this.setupPoolErrorHandling();
    this.testConnection();
  }
  setupPoolErrorHandling() {
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await this.cleanup();
      process.exit(0);
    });
    process.on("beforeExit", async () => {
      await this.cleanup();
    });
  }
  async withDatabase(operation, context) {
    return this.withCircuitBreaker(async () => {
      return this.withRetry(operation);
    }, context);
  }
  async withRetry(operation) {
    let lastError = new Error("Unknown error");
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const backoffDelay = Math.min(
            this.baseDelay * Math.pow(2, attempt - 1),
            this.maxDelay
          );
          const jitter = Math.random() * this.jitterMax;
          const delay = backoffDelay + jitter;
          elizaLogger37.warn(
            `Database operation failed (attempt ${attempt}/${this.maxRetries}):`,
            {
              error: error instanceof Error ? error.message : String(error),
              nextRetryIn: `${(delay / 1e3).toFixed(1)}s`
            }
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          elizaLogger37.error("Max retry attempts reached:", {
            error: error instanceof Error ? error.message : String(error),
            totalAttempts: attempt
          });
          throw error instanceof Error ? error : new Error(String(error));
        }
      }
    }
    throw lastError;
  }
  async handlePoolError(error) {
    elizaLogger37.error("Pool error occurred, attempting to reconnect", {
      error: error.message
    });
    try {
      await this.pool.end();
      this.pool = new import_pg2.default.Pool({
        ...this.pool.options,
        connectionTimeoutMillis: this.connectionTimeout
      });
      await this.testConnection();
      elizaLogger37.success("Pool reconnection successful");
    } catch (reconnectError) {
      elizaLogger37.error("Failed to reconnect pool", {
        error: reconnectError instanceof Error ? reconnectError.message : String(reconnectError)
      });
      throw reconnectError;
    }
  }
  async query(queryTextOrConfig, values) {
    return this.withDatabase(async () => {
      return await this.pool.query(queryTextOrConfig, values);
    }, "query");
  }
  async validateVectorSetup() {
    try {
      const vectorExt = await this.query(`
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            `);
      const hasVector = vectorExt.rows.length > 0;
      if (!hasVector) {
        elizaLogger37.error("Vector extension not found in database");
        return false;
      }
      return true;
    } catch (error) {
      elizaLogger37.error("Failed to validate vector extension:", {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  async init() {
    await this.testConnection();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const embeddingConfig = getEmbeddingConfig();
      if (embeddingConfig.provider === EmbeddingProvider.OpenAI) {
        await client.query("SET app.use_openai_embedding = 'true'");
        await client.query("SET app.use_ollama_embedding = 'false'");
        await client.query("SET app.use_gaianet_embedding = 'false'");
      } else if (embeddingConfig.provider === EmbeddingProvider.Ollama) {
        await client.query("SET app.use_openai_embedding = 'false'");
        await client.query("SET app.use_ollama_embedding = 'true'");
        await client.query("SET app.use_gaianet_embedding = 'false'");
      } else if (embeddingConfig.provider === EmbeddingProvider.GaiaNet) {
        await client.query("SET app.use_openai_embedding = 'false'");
        await client.query("SET app.use_ollama_embedding = 'false'");
        await client.query("SET app.use_gaianet_embedding = 'true'");
      } else {
        await client.query("SET app.use_openai_embedding = 'false'");
        await client.query("SET app.use_ollama_embedding = 'false'");
      }
      const { rows } = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'rooms'
                );
            `);
      if (!rows[0].exists || !await this.validateVectorSetup()) {
        elizaLogger37.info(
          "Applying database schema - tables or vector extension missing"
        );
        const schema = fs.readFileSync(
          path.resolve(__dirname, "../schema.sql"),
          "utf8"
        );
        await client.query(schema);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
  async testConnection() {
    let client;
    try {
      client = await this.pool.connect();
      const result = await client.query("SELECT NOW()");
      elizaLogger37.success(
        "Database connection test successful:",
        result.rows[0]
      );
      return true;
    } catch (error) {
      elizaLogger37.error("Database connection test failed:", error);
      throw new Error(
        `Failed to connect to database: ${error.message}`
      );
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  async cleanup() {
    try {
      await this.pool.end();
      elizaLogger37.info("Database pool closed");
    } catch (error) {
      elizaLogger37.error("Error closing database pool:", error);
    }
  }
  async getRoom(roomId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        "SELECT id FROM rooms WHERE id = $1",
        [roomId]
      );
      return rows.length > 0 ? rows[0].id : null;
    }, "getRoom");
  }
  async getParticipantsForAccount(userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT id, "userId", "roomId", "last_message_read"
                FROM participants
                WHERE "userId" = $1`,
        [userId]
      );
      return rows;
    }, "getParticipantsForAccount");
  }
  async getParticipantUserState(roomId, userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT "userState" FROM participants WHERE "roomId" = $1 AND "userId" = $2`,
        [roomId, userId]
      );
      return rows.length > 0 ? rows[0].userState : null;
    }, "getParticipantUserState");
  }
  async getMemoriesByRoomIds(params) {
    return this.withDatabase(async () => {
      if (params.roomIds.length === 0) {
        return [];
      }
      const placeholders = params.roomIds.map((_, i) => `$${i + 2}`).join(", ");
      let query = `SELECT * FROM memories WHERE type = $1 AND "roomId" IN (${placeholders})`;
      let queryParams = [params.tableName, ...params.roomIds];
      if (params.agentId) {
        query += ` AND "agentId" = $${params.roomIds.length + 2}`;
        queryParams = [...queryParams, params.agentId];
      }
      query += ` ORDER BY "createdAt" DESC`;
      if (params.limit) {
        query += ` LIMIT $${queryParams.length + 1}`;
        queryParams.push(params.limit.toString());
      }
      const { rows } = await this.pool.query(query, queryParams);
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content
      }));
    }, "getMemoriesByRoomIds");
  }
  async setParticipantUserState(roomId, userId, state) {
    return this.withDatabase(async () => {
      await this.pool.query(
        `UPDATE participants SET "userState" = $1 WHERE "roomId" = $2 AND "userId" = $3`,
        [state, roomId, userId]
      );
    }, "setParticipantUserState");
  }
  async getParticipantsForRoom(roomId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        'SELECT "userId" FROM participants WHERE "roomId" = $1',
        [roomId]
      );
      return rows.map((row) => row.userId);
    }, "getParticipantsForRoom");
  }
  async getAccountById(userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        "SELECT * FROM accounts WHERE id = $1",
        [userId]
      );
      if (rows.length === 0) {
        elizaLogger37.debug("Account not found:", { userId });
        return null;
      }
      const account = rows[0];
      return {
        ...account,
        details: typeof account.details === "string" ? JSON.parse(account.details) : account.details
      };
    }, "getAccountById");
  }
  async createAccount(account) {
    return this.withDatabase(async () => {
      try {
        const accountId = account.id ?? v4_default();
        await this.pool.query(
          `INSERT INTO accounts (id, name, username, email, "avatarUrl", details)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            accountId,
            account.name,
            account.username || "",
            account.email || "",
            account.avatarUrl || "",
            JSON.stringify(account.details)
          ]
        );
        elizaLogger37.debug("Account created successfully:", {
          accountId
        });
        return true;
      } catch (error) {
        elizaLogger37.error("Error creating account:", {
          error: error instanceof Error ? error.message : String(error),
          accountId: account.id,
          name: account.name
          // Only log non-sensitive fields
        });
        return false;
      }
    }, "createAccount");
  }
  async getActorById(params) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT a.id, a.name, a.username, a.details
                FROM participants p
                LEFT JOIN accounts a ON p."userId" = a.id
                WHERE p."roomId" = $1`,
        [params.roomId]
      );
      elizaLogger37.debug("Retrieved actors:", {
        roomId: params.roomId,
        actorCount: rows.length
      });
      return rows.map((row) => {
        try {
          return {
            ...row,
            details: typeof row.details === "string" ? JSON.parse(row.details) : row.details
          };
        } catch (error) {
          elizaLogger37.warn("Failed to parse actor details:", {
            actorId: row.id,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            ...row,
            details: {}
            // Provide default empty details on parse error
          };
        }
      });
    }, "getActorById").catch((error) => {
      elizaLogger37.error("Failed to get actors:", {
        roomId: params.roomId,
        error: error.message
      });
      throw error;
    });
  }
  async getMemoryById(id) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        "SELECT * FROM memories WHERE id = $1",
        [id]
      );
      if (rows.length === 0) {
        return null;
      }
      return {
        ...rows[0],
        content: typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content
      };
    }, "getMemoryById");
  }
  async createMemory(memory, tableName) {
    return this.withDatabase(async () => {
      elizaLogger37.debug("PostgresAdapter createMemory:", {
        memoryId: memory.id,
        embeddingLength: memory.embedding?.length,
        contentLength: memory.content?.text?.length
      });
      let isUnique = true;
      if (memory.embedding) {
        const similarMemories = await this.searchMemoriesByEmbedding(
          memory.embedding,
          {
            tableName,
            roomId: memory.roomId,
            match_threshold: 0.95,
            count: 1
          }
        );
        isUnique = similarMemories.length === 0;
      }
      await this.pool.query(
        `INSERT INTO memories (
                    id, type, content, embedding, "userId", "roomId", "agentId", "unique", "createdAt"
                ) VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, $7::uuid, $8, to_timestamp($9/1000.0))`,
        [
          memory.id ?? v4_default(),
          tableName,
          JSON.stringify(memory.content),
          memory.embedding ? `[${memory.embedding.join(",")}]` : null,
          memory.userId,
          memory.roomId,
          memory.agentId,
          memory.unique ?? isUnique,
          Date.now()
        ]
      );
    }, "createMemory");
  }
  async searchMemories(params) {
    return await this.searchMemoriesByEmbedding(params.embedding, {
      match_threshold: params.match_threshold,
      count: params.match_count,
      agentId: params.agentId,
      roomId: params.roomId,
      unique: params.unique,
      tableName: params.tableName
    });
  }
  async getMemories(params) {
    if (!params.tableName) {
      throw new Error("tableName is required");
    }
    if (!params.roomId) {
      throw new Error("roomId is required");
    }
    return this.withDatabase(async () => {
      let sql = `SELECT * FROM memories WHERE type = $1 AND "roomId" = $2`;
      const values = [params.tableName, params.roomId];
      let paramCount = 2;
      if (params.start) {
        paramCount++;
        sql += ` AND "createdAt" >= to_timestamp($${paramCount})`;
        values.push(params.start / 1e3);
      }
      if (params.end) {
        paramCount++;
        sql += ` AND "createdAt" <= to_timestamp($${paramCount})`;
        values.push(params.end / 1e3);
      }
      if (params.unique) {
        sql += ` AND "unique" = true`;
      }
      if (params.agentId) {
        paramCount++;
        sql += ` AND "agentId" = $${paramCount}`;
        values.push(params.agentId);
      }
      sql += ' ORDER BY "createdAt" DESC';
      if (params.count) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        values.push(params.count);
      }
      elizaLogger37.debug("Fetching memories:", {
        roomId: params.roomId,
        tableName: params.tableName,
        unique: params.unique,
        agentId: params.agentId,
        timeRange: params.start || params.end ? {
          start: params.start ? new Date(params.start).toISOString() : void 0,
          end: params.end ? new Date(params.end).toISOString() : void 0
        } : void 0,
        limit: params.count
      });
      const { rows } = await this.pool.query(sql, values);
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content
      }));
    }, "getMemories");
  }
  async getGoals(params) {
    return this.withDatabase(async () => {
      let sql = `SELECT * FROM goals WHERE "roomId" = $1`;
      const values = [params.roomId];
      let paramCount = 1;
      if (params.userId) {
        paramCount++;
        sql += ` AND "userId" = $${paramCount}`;
        values.push(params.userId);
      }
      if (params.onlyInProgress) {
        sql += " AND status = 'IN_PROGRESS'";
      }
      if (params.count) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        values.push(params.count);
      }
      const { rows } = await this.pool.query(sql, values);
      return rows.map((row) => ({
        ...row,
        objectives: typeof row.objectives === "string" ? JSON.parse(row.objectives) : row.objectives
      }));
    }, "getGoals");
  }
  async updateGoal(goal) {
    return this.withDatabase(async () => {
      try {
        await this.pool.query(
          `UPDATE goals SET name = ${goal.name}, status = ${goal.status}, objectives = ${JSON.stringify(goal.objectives)} WHERE id = ${goal.id}`
        );
      } catch (error) {
        elizaLogger37.error("Failed to update goal:", {
          goalId: goal.id,
          error: error instanceof Error ? error.message : String(error),
          status: goal.status
        });
        throw error;
      }
    }, "updateGoal");
  }
  async createGoal(goal) {
    return this.withDatabase(async () => {
      await this.pool.query(
        `INSERT INTO goals (id, "roomId", "userId", name, status, objectives)
                VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          goal.id ?? v4_default(),
          goal.roomId,
          goal.userId,
          goal.name,
          goal.status,
          JSON.stringify(goal.objectives)
        ]
      );
    }, "createGoal");
  }
  async removeGoal(goalId) {
    if (!goalId) {
      throw new Error("Goal ID is required");
    }
    return this.withDatabase(async () => {
      try {
        const result = await this.pool.query(
          "DELETE FROM goals WHERE id = $1 RETURNING id",
          [goalId]
        );
        elizaLogger37.debug("Goal removal attempt:", {
          goalId,
          removed: result?.rowCount ?? 0 > 0
        });
      } catch (error) {
        elizaLogger37.error("Failed to remove goal:", {
          goalId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }, "removeGoal");
  }
  async createRoom(roomId) {
    return this.withDatabase(async () => {
      const newRoomId = roomId || v4_default();
      await this.pool.query("INSERT INTO rooms (id) VALUES ($1)", [newRoomId]);
      return newRoomId;
    }, "createRoom");
  }
  async removeRoom(roomId) {
    if (!roomId) {
      throw new Error("Room ID is required");
    }
    return this.withDatabase(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const checkResult = await client.query(
          "SELECT id FROM rooms WHERE id = $1",
          [roomId]
        );
        if (checkResult.rowCount === 0) {
          elizaLogger37.warn("No room found to remove:", { roomId });
          throw new Error(`Room not found: ${roomId}`);
        }
        await client.query('DELETE FROM memories WHERE "roomId" = $1', [
          roomId
        ]);
        await client.query('DELETE FROM participants WHERE "roomId" = $1', [
          roomId
        ]);
        await client.query('DELETE FROM goals WHERE "roomId" = $1', [roomId]);
        const result = await client.query(
          "DELETE FROM rooms WHERE id = $1 RETURNING id",
          [roomId]
        );
        await client.query("COMMIT");
        elizaLogger37.debug("Room and related data removed successfully:", {
          roomId,
          removed: result?.rowCount ?? 0
        });
      } catch (error) {
        await client.query("ROLLBACK");
        elizaLogger37.error("Failed to remove room:", {
          roomId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        if (client) {
          client.release();
        }
      }
    }, "removeRoom");
  }
  async createRelationship(params) {
    if (!params.userA || !params.userB) {
      throw new Error("userA and userB are required");
    }
    return this.withDatabase(async () => {
      try {
        const relationshipId = v4_default();
        await this.pool.query(
          `INSERT INTO relationships (id, "userA", "userB", "userId")
                    VALUES ($1, $2, $3, $4)
                    RETURNING id`,
          [relationshipId, params.userA, params.userB, params.userA]
        );
        elizaLogger37.debug("Relationship created successfully:", {
          relationshipId,
          userA: params.userA,
          userB: params.userB
        });
        return true;
      } catch (error) {
        if (error.code === "23505") {
          elizaLogger37.warn("Relationship already exists:", {
            userA: params.userA,
            userB: params.userB,
            error: error instanceof Error ? error.message : String(error)
          });
        } else {
          elizaLogger37.error("Failed to create relationship:", {
            userA: params.userA,
            userB: params.userB,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return false;
      }
    }, "createRelationship");
  }
  async getRelationship(params) {
    if (!params.userA || !params.userB) {
      throw new Error("userA and userB are required");
    }
    return this.withDatabase(async () => {
      try {
        const { rows } = await this.pool.query(
          `SELECT * FROM relationships
                    WHERE ("userA" = $1 AND "userB" = $2)
                    OR ("userA" = $2 AND "userB" = $1)`,
          [params.userA, params.userB]
        );
        if (rows.length > 0) {
          elizaLogger37.debug("Relationship found:", {
            relationshipId: rows[0].id,
            userA: params.userA,
            userB: params.userB
          });
          return rows[0];
        }
        elizaLogger37.debug("No relationship found between users:", {
          userA: params.userA,
          userB: params.userB
        });
        return null;
      } catch (error) {
        elizaLogger37.error("Error fetching relationship:", {
          userA: params.userA,
          userB: params.userB,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }, "getRelationship");
  }
  async getRelationships(params) {
    if (!params.userId) {
      throw new Error("userId is required");
    }
    return this.withDatabase(async () => {
      try {
        const { rows } = await this.pool.query(
          `SELECT * FROM relationships
                    WHERE "userA" = $1 OR "userB" = $1
                    ORDER BY "createdAt" DESC`,
          // Add ordering if you have this field
          [params.userId]
        );
        elizaLogger37.debug("Retrieved relationships:", {
          userId: params.userId,
          count: rows.length
        });
        return rows;
      } catch (error) {
        elizaLogger37.error("Failed to fetch relationships:", {
          userId: params.userId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }, "getRelationships");
  }
  async getCachedEmbeddings(opts) {
    if (!opts.query_table_name) {
      throw new Error("query_table_name is required");
    }
    if (!opts.query_input) {
      throw new Error("query_input is required");
    }
    if (!opts.query_field_name) {
      throw new Error("query_field_name is required");
    }
    if (!opts.query_field_sub_name) {
      throw new Error("query_field_sub_name is required");
    }
    if (opts.query_match_count <= 0) {
      throw new Error("query_match_count must be positive");
    }
    return this.withDatabase(async () => {
      try {
        elizaLogger37.debug("Fetching cached embeddings:", {
          tableName: opts.query_table_name,
          fieldName: opts.query_field_name,
          subFieldName: opts.query_field_sub_name,
          matchCount: opts.query_match_count,
          inputLength: opts.query_input.length
        });
        const sql = `
                    WITH content_text AS (
                        SELECT
                            embedding,
                            COALESCE(
                                SUBSTRING(content->$2->>$3 FROM 1 FOR 255),
                                ''
                            ) as content_text
                        FROM memories
                        WHERE type = $4
                        AND content->$2->>$3 IS NOT NULL
                    )
                    SELECT
                        embedding,
                        levenshtein(SUBSTRING($1 FROM 1 FOR 255), content_text) as levenshtein_score
                    FROM content_text
                    WHERE levenshtein(SUBSTRING($1 FROM 1 FOR 255), content_text) <= $6
                    ORDER BY levenshtein_score
                    LIMIT $5
                `;
        const { rows } = await this.pool.query(sql, [
          opts.query_input,
          opts.query_field_name,
          opts.query_field_sub_name,
          opts.query_table_name,
          opts.query_match_count,
          opts.query_threshold
        ]);
        elizaLogger37.debug("Retrieved cached embeddings:", {
          count: rows.length,
          tableName: opts.query_table_name,
          matchCount: opts.query_match_count
        });
        return rows.map(
          (row) => {
            if (!Array.isArray(row.embedding)) {
              return null;
            }
            return {
              embedding: row.embedding,
              levenshtein_score: Number(row.levenshtein_score)
            };
          }
        ).filter(
          (row) => row !== null
        );
      } catch (error) {
        elizaLogger37.error("Error in getCachedEmbeddings:", {
          error: error instanceof Error ? error.message : String(error),
          tableName: opts.query_table_name,
          fieldName: opts.query_field_name
        });
        throw error;
      }
    }, "getCachedEmbeddings");
  }
  async log(params) {
    if (!params.userId) {
      throw new Error("userId is required");
    }
    if (!params.roomId) {
      throw new Error("roomId is required");
    }
    if (!params.type) {
      throw new Error("type is required");
    }
    if (!params.body || typeof params.body !== "object") {
      throw new Error("body must be a valid object");
    }
    return this.withDatabase(async () => {
      try {
        const logId = v4_default();
        await this.pool.query(
          `INSERT INTO logs (
                        id,
                        body,
                        "userId",
                        "roomId",
                        type,
                        "createdAt"
                    ) VALUES ($1, $2, $3, $4, $5, NOW())
                    RETURNING id`,
          [
            logId,
            JSON.stringify(params.body),
            // Ensure body is stringified
            params.userId,
            params.roomId,
            params.type
          ]
        );
        elizaLogger37.debug("Log entry created:", {
          logId,
          type: params.type,
          roomId: params.roomId,
          userId: params.userId,
          bodyKeys: Object.keys(params.body)
        });
      } catch (error) {
        elizaLogger37.error("Failed to create log entry:", {
          error: error instanceof Error ? error.message : String(error),
          type: params.type,
          roomId: params.roomId,
          userId: params.userId
        });
        throw error;
      }
    }, "log");
  }
  async searchMemoriesByEmbedding(embedding, params) {
    return this.withDatabase(async () => {
      elizaLogger37.debug("Incoming vector:", {
        length: embedding.length,
        sample: embedding.slice(0, 5),
        isArray: Array.isArray(embedding),
        allNumbers: embedding.every((n) => typeof n === "number")
      });
      if (embedding.length !== getEmbeddingConfig().dimensions) {
        throw new Error(
          `Invalid embedding dimension: expected ${getEmbeddingConfig().dimensions}, got ${embedding.length}`
        );
      }
      const cleanVector = embedding.map((n) => {
        if (!Number.isFinite(n)) {
          return 0;
        }
        return Number(n.toFixed(6));
      });
      const vectorStr = `[${cleanVector.join(",")}]`;
      elizaLogger37.debug("Vector debug:", {
        originalLength: embedding.length,
        cleanLength: cleanVector.length,
        sampleStr: vectorStr.slice(0, 100)
      });
      let sql = `
                SELECT *,
                1 - (embedding <-> $1::vector(${getEmbeddingConfig().dimensions})) as similarity
                FROM memories
                WHERE type = $2
            `;
      const values = [vectorStr, params.tableName];
      elizaLogger37.debug("Query debug:", {
        sql: sql.slice(0, 200),
        paramTypes: values.map((v) => typeof v),
        vectorStrLength: vectorStr.length
      });
      let paramCount = 2;
      if (params.unique) {
        sql += ` AND "unique" = true`;
      }
      if (params.agentId) {
        paramCount++;
        sql += ` AND "agentId" = $${paramCount}`;
        values.push(params.agentId);
      }
      if (params.roomId) {
        paramCount++;
        sql += ` AND "roomId" = $${paramCount}::uuid`;
        values.push(params.roomId);
      }
      if (params.match_threshold) {
        paramCount++;
        sql += ` AND 1 - (embedding <-> $1::vector) >= $${paramCount}`;
        values.push(params.match_threshold);
      }
      sql += ` ORDER BY embedding <-> $1::vector`;
      if (params.count) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        values.push(params.count);
      }
      const { rows } = await this.pool.query(sql, values);
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content,
        similarity: row.similarity
      }));
    }, "searchMemoriesByEmbedding");
  }
  async addParticipant(userId, roomId) {
    return this.withDatabase(async () => {
      try {
        await this.pool.query(
          `INSERT INTO participants (id, "userId", "roomId")
                    VALUES ($1, $2, $3)`,
          [v4_default(), userId, roomId]
        );
        return true;
      } catch (error) {
        console.log("Error adding participant", error);
        return false;
      }
    }, "addParticpant");
  }
  async removeParticipant(userId, roomId) {
    return this.withDatabase(async () => {
      try {
        await this.pool.query(
          `DELETE FROM participants WHERE "userId" = $1 AND "roomId" = $2`,
          [userId, roomId]
        );
        return true;
      } catch (error) {
        console.log("Error removing participant", error);
        return false;
      }
    }, "removeParticipant");
  }
  async updateGoalStatus(params) {
    return this.withDatabase(async () => {
      await this.pool.query("UPDATE goals SET status = $1 WHERE id = $2", [
        params.status,
        params.goalId
      ]);
    }, "updateGoalStatus");
  }
  async removeMemory(memoryId, tableName) {
    return this.withDatabase(async () => {
      await this.pool.query(
        "DELETE FROM memories WHERE type = $1 AND id = $2",
        [tableName, memoryId]
      );
    }, "removeMemory");
  }
  async removeAllMemories(roomId, tableName) {
    return this.withDatabase(async () => {
      await this.pool.query(
        `DELETE FROM memories WHERE type = $1 AND "roomId" = $2`,
        [tableName, roomId]
      );
    }, "removeAllMemories");
  }
  async countMemories(roomId, unique = true, tableName = "") {
    if (!tableName) {
      throw new Error("tableName is required");
    }
    return this.withDatabase(async () => {
      let sql = `SELECT COUNT(*) as count FROM memories WHERE type = $1 AND "roomId" = $2`;
      if (unique) {
        sql += ` AND "unique" = true`;
      }
      const { rows } = await this.pool.query(sql, [tableName, roomId]);
      return Number.parseInt(rows[0].count);
    }, "countMemories");
  }
  async removeAllGoals(roomId) {
    return this.withDatabase(async () => {
      await this.pool.query(`DELETE FROM goals WHERE "roomId" = $1`, [roomId]);
    }, "removeAllGoals");
  }
  async getRoomsForParticipant(userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT "roomId" FROM participants WHERE "userId" = $1`,
        [userId]
      );
      return rows.map((row) => row.roomId);
    }, "getRoomsForParticipant");
  }
  async getRoomsForParticipants(userIds) {
    return this.withDatabase(async () => {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
      const { rows } = await this.pool.query(
        `SELECT DISTINCT "roomId" FROM participants WHERE "userId" IN (${placeholders})`,
        userIds
      );
      return rows.map((row) => row.roomId);
    }, "getRoomsForParticipants");
  }
  async getActorDetails(params) {
    if (!params.roomId) {
      throw new Error("roomId is required");
    }
    return this.withDatabase(async () => {
      try {
        const sql = `
                    SELECT
                        a.id,
                        a.name,
                        a.username,
                        a."avatarUrl",
                        COALESCE(a.details::jsonb, '{}'::jsonb) as details
                    FROM participants p
                    LEFT JOIN accounts a ON p."userId" = a.id
                    WHERE p."roomId" = $1
                    ORDER BY a.name
                `;
        const result = await this.pool.query(sql, [params.roomId]);
        elizaLogger37.debug("Retrieved actor details:", {
          roomId: params.roomId,
          actorCount: result.rows.length
        });
        return result.rows.map((row) => {
          try {
            return {
              ...row,
              details: typeof row.details === "string" ? JSON.parse(row.details) : row.details
            };
          } catch (parseError) {
            elizaLogger37.warn("Failed to parse actor details:", {
              actorId: row.id,
              error: parseError instanceof Error ? parseError.message : String(parseError)
            });
            return {
              ...row,
              details: {}
              // Fallback to empty object if parsing fails
            };
          }
        });
      } catch (error) {
        elizaLogger37.error("Failed to fetch actor details:", {
          roomId: params.roomId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw new Error(
          `Failed to fetch actor details: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, "getActorDetails");
  }
  async getCache(params) {
    return this.withDatabase(async () => {
      try {
        const sql = `SELECT "value"::TEXT FROM cache WHERE "key" = $1 AND "agentId" = $2`;
        const { rows } = await this.query(sql, [
          params.key,
          params.agentId
        ]);
        return rows[0]?.value ?? void 0;
      } catch (error) {
        elizaLogger37.error("Error fetching cache", {
          error: error instanceof Error ? error.message : String(error),
          key: params.key,
          agentId: params.agentId
        });
        return void 0;
      }
    }, "getCache");
  }
  async setCache(params) {
    return this.withDatabase(async () => {
      try {
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `INSERT INTO cache ("key", "agentId", "value", "createdAt")
                         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                         ON CONFLICT ("key", "agentId")
                         DO UPDATE SET "value" = EXCLUDED.value, "createdAt" = CURRENT_TIMESTAMP`,
            [params.key, params.agentId, params.value]
          );
          await client.query("COMMIT");
          return true;
        } catch (error) {
          await client.query("ROLLBACK");
          elizaLogger37.error("Error setting cache", {
            error: error instanceof Error ? error.message : String(error),
            key: params.key,
            agentId: params.agentId
          });
          return false;
        } finally {
          if (client) {
            client.release();
          }
        }
      } catch (error) {
        elizaLogger37.error("Database connection error in setCache", error);
        return false;
      }
    }, "setCache");
  }
  async deleteCache(params) {
    return this.withDatabase(async () => {
      try {
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `DELETE FROM cache WHERE "key" = $1 AND "agentId" = $2`,
            [params.key, params.agentId]
          );
          await client.query("COMMIT");
          return true;
        } catch (error) {
          await client.query("ROLLBACK");
          elizaLogger37.error("Error deleting cache", {
            error: error instanceof Error ? error.message : String(error),
            key: params.key,
            agentId: params.agentId
          });
          return false;
        } finally {
          client.release();
        }
      } catch (error) {
        elizaLogger37.error("Database connection error in deleteCache", error);
        return false;
      }
    }, "deleteCache");
  }
  async getKnowledge(params) {
    return this.withDatabase(async () => {
      let sql = `SELECT * FROM knowledge WHERE ("agentId" = $1 OR "isShared" = true)`;
      const queryParams = [params.agentId];
      let paramCount = 1;
      if (params.id) {
        paramCount++;
        sql += ` AND id = $${paramCount}`;
        queryParams.push(params.id);
      }
      if (params.limit) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        queryParams.push(params.limit);
      }
      const { rows } = await this.pool.query(sql, queryParams);
      return rows.map((row) => ({
        id: row.id,
        agentId: row.agentId,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content,
        embedding: row.embedding ? new Float32Array(row.embedding) : void 0,
        createdAt: row.createdAt.getTime()
      }));
    }, "getKnowledge");
  }
  async searchKnowledge(params) {
    return this.withDatabase(async () => {
      const cacheKey = `embedding_${params.agentId}_${params.searchText}`;
      const cachedResult = await this.getCache({
        key: cacheKey,
        agentId: params.agentId
      });
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
      const vectorStr = `[${Array.from(params.embedding).join(",")}]`;
      const sql = `
                WITH vector_scores AS (
                    SELECT id,
                        1 - (embedding <-> $1::vector) as vector_score
                    FROM knowledge
                    WHERE ("agentId" IS NULL AND "isShared" = true) OR "agentId" = $2
                    AND embedding IS NOT NULL
                ),
                keyword_matches AS (
                    SELECT id,
                    CASE
                        WHEN content->>'text' ILIKE $3 THEN 3.0
                        ELSE 1.0
                    END *
                    CASE
                        WHEN (content->'metadata'->>'isChunk')::boolean = true THEN 1.5
                        WHEN (content->'metadata'->>'isMain')::boolean = true THEN 1.2
                        ELSE 1.0
                    END as keyword_score
                    FROM knowledge
                    WHERE ("agentId" IS NULL AND "isShared" = true) OR "agentId" = $2
                )
                SELECT k.*,
                    v.vector_score,
                    kw.keyword_score,
                    (v.vector_score * kw.keyword_score) as combined_score
                FROM knowledge k
                JOIN vector_scores v ON k.id = v.id
                LEFT JOIN keyword_matches kw ON k.id = kw.id
                WHERE ("agentId" IS NULL AND "isShared" = true) OR k."agentId" = $2
                AND (
                    v.vector_score >= $4
                    OR (kw.keyword_score > 1.0 AND v.vector_score >= 0.3)
                )
                ORDER BY combined_score DESC
                LIMIT $5
            `;
      const { rows } = await this.pool.query(sql, [
        vectorStr,
        params.agentId,
        `%${params.searchText || ""}%`,
        params.match_threshold,
        params.match_count
      ]);
      const results = rows.map((row) => ({
        id: row.id,
        agentId: row.agentId,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content,
        embedding: row.embedding ? new Float32Array(row.embedding) : void 0,
        createdAt: row.createdAt.getTime(),
        similarity: row.combined_score
      }));
      await this.setCache({
        key: cacheKey,
        agentId: params.agentId,
        value: JSON.stringify(results)
      });
      return results;
    }, "searchKnowledge");
  }
  async createKnowledge(knowledge) {
    return this.withDatabase(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const metadata = knowledge.content.metadata || {};
        const vectorStr = knowledge.embedding ? `[${Array.from(knowledge.embedding).join(",")}]` : null;
        if (metadata.isChunk && metadata.originalId) {
          await this.createKnowledgeChunk({
            id: knowledge.id,
            originalId: metadata.originalId,
            agentId: metadata.isShared ? null : knowledge.agentId,
            content: knowledge.content,
            embedding: knowledge.embedding,
            chunkIndex: metadata.chunkIndex || 0,
            isShared: metadata.isShared || false,
            createdAt: knowledge.createdAt || Date.now()
          });
        } else {
          await client.query(
            `
                        INSERT INTO knowledge (
                            id, "agentId", content, embedding, "createdAt",
                            "isMain", "originalId", "chunkIndex", "isShared"
                        ) VALUES ($1, $2, $3, $4, to_timestamp($5/1000.0), $6, $7, $8, $9)
                        ON CONFLICT (id) DO NOTHING
                    `,
            [
              knowledge.id,
              metadata.isShared ? null : knowledge.agentId,
              knowledge.content,
              vectorStr,
              knowledge.createdAt || Date.now(),
              true,
              null,
              null,
              metadata.isShared || false
            ]
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }, "createKnowledge");
  }
  async removeKnowledge(id) {
    return this.withDatabase(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        if (typeof id === "string" && id.includes("-chunk-*")) {
          const mainId = id.split("-chunk-")[0];
          await client.query('DELETE FROM knowledge WHERE "originalId" = $1', [
            mainId
          ]);
        } else {
          await client.query('DELETE FROM knowledge WHERE "originalId" = $1', [
            id
          ]);
          await client.query("DELETE FROM knowledge WHERE id = $1", [id]);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        elizaLogger37.error("Error removing knowledge", {
          error: error instanceof Error ? error.message : String(error),
          id
        });
        throw error;
      } finally {
        client.release();
      }
    }, "removeKnowledge");
  }
  async clearKnowledge(agentId, shared) {
    return this.withDatabase(async () => {
      const sql = shared ? 'DELETE FROM knowledge WHERE ("agentId" = $1 OR "isShared" = true)' : 'DELETE FROM knowledge WHERE "agentId" = $1';
      await this.pool.query(sql, [agentId]);
    }, "clearKnowledge");
  }
  async createKnowledgeChunk(params) {
    const vectorStr = params.embedding ? `[${Array.from(params.embedding).join(",")}]` : null;
    const patternId = `${params.originalId}-chunk-${params.chunkIndex}`;
    const contentWithPatternId = {
      ...params.content,
      metadata: {
        ...params.content.metadata,
        patternId
      }
    };
    await this.pool.query(
      `
            INSERT INTO knowledge (
                id, "agentId", content, embedding, "createdAt",
                "isMain", "originalId", "chunkIndex", "isShared"
            ) VALUES ($1, $2, $3, $4, to_timestamp($5/1000.0), $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
        `,
      [
        v4_default(),
        // Generate a proper UUID for PostgreSQL
        params.agentId,
        contentWithPatternId,
        // Store the pattern ID in metadata
        vectorStr,
        params.createdAt,
        false,
        params.originalId,
        params.chunkIndex,
        params.isShared
      ]
    );
  }
  async getMemoriesByIds(ids, tableName) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT * FROM memories WHERE type = $1 AND id = ANY($2) ORDER BY "createdAt" DESC`,
        [tableName, ids]
      );
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content
      }));
    }, "getMemoriesByIds");
  }
};

// src/api/api.ts
import { elizaLogger as elizaLogger40 } from "@elizaos/core";
import { Elysia } from "elysia";

// src/eliza/message-controller.ts
import { elizaLogger as elizaLogger38 } from "@elizaos/core";
import { t as t4 } from "elysia";

// src/eliza/error-response.ts
import { t } from "elysia";
var errorResponseSchema = t.Object({
  error: t.String()
});

// src/eliza/message-request.ts
import { t as t2 } from "elysia";
var messageRequestSchema = t2.Object({
  userId: t2.String(),
  agentId: t2.String(),
  text: t2.String(),
  roomId: t2.Optional(t2.String()),
  userName: t2.Optional(t2.String()),
  name: t2.Optional(t2.String())
});

// src/eliza/message-response.ts
import { t as t3 } from "elysia";
var messageResponseSchema = t3.Object({
  text: t3.String(),
  action: t3.Optional(t3.String()),
  source: t3.Optional(t3.String()),
  url: t3.Optional(t3.String()),
  inReplyTo: t3.Optional(t3.String()),
  attachments: t3.Optional(t3.Array(t3.File())),
  metadata: t3.Optional(t3.Record(t3.String(), t3.Any()))
});

// src/eliza/message-controller.ts
var MessageController = class {
  messageService;
  constructor(messageService) {
    this.messageService = messageService;
  }
  setupRoutes(app) {
    app.post(
      "/message",
      async ({ body }) => {
        try {
          elizaLogger38.info(
            `[MessageController] Message endpoint called for agent ${body.agentId}`
          );
          return await this.messageService.handleMessage(body);
        } catch (error) {
          elizaLogger38.error(
            "[MessageController] Error processing message:",
            error
          );
          return Response.json(
            {
              error: error instanceof Error ? error.message : "Unknown error occurred"
            },
            { status: 500 }
          );
        }
      },
      {
        body: messageRequestSchema,
        response: {
          200: t4.Array(messageResponseSchema),
          500: errorResponseSchema
        }
      }
    );
  }
};

// src/eliza/message-service.ts
import {
  ModelClass as ModelClass5,
  composeContext as composeContext4,
  elizaLogger as elizaLogger39,
  generateMessageResponse as generateMessageResponse2,
  stringToUuid as stringToUuid6
} from "@elizaos/core";

// src/eliza/base-templates.ts
import { messageCompletionFooter as messageCompletionFooter3 } from "@elizaos/core";
var messageHandlerTemplate = (
  // {{goals}}
  // "# Action Examples" is already included
  `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
${messageCompletionFooter3}`
);

// src/eliza/message-service.ts
var MessageService = class {
  agents;
  constructor(agents) {
    this.agents = agents;
  }
  async handleMessage(request) {
    try {
      elizaLogger39.info("[MessageService] Starting message handling");
      const { agentId } = request;
      const agent = this.agents.get(agentId);
      if (!agent) {
        elizaLogger39.error(
          `[MessageService] Agent not found for ID/name: ${agentId}`
        );
        return Response.json({ error: "Agent not found" }, { status: 404 });
      }
      const roomId = stringToUuid6(request.roomId ?? `default-room-${agentId}`);
      const userId = request.userId;
      await agent.ensureConnection(
        userId,
        roomId,
        request.userName,
        request.name,
        "direct"
      );
      const text = request.text;
      if (!text) {
        return Response.json([]);
      }
      const messageId = stringToUuid6(Date.now().toString());
      const content = {
        text,
        attachments: [],
        source: "direct",
        inReplyTo: void 0
      };
      const userMessage = {
        content,
        userId,
        roomId,
        agentId: agent.agentId
      };
      const memory = {
        id: stringToUuid6(`${messageId}-${userId}`),
        ...userMessage,
        agentId: agent.agentId,
        userId,
        roomId,
        content
      };
      await agent.messageManager.addEmbeddingToMemory(memory);
      await agent.messageManager.createMemory(memory);
      let knowledgeContent = "";
      if (memory.embedding) {
        try {
          const relevantKnowledge = await agent.databaseAdapter.searchKnowledge(
            {
              agentId: agent.agentId,
              embedding: memory.embedding instanceof Float32Array ? memory.embedding : new Float32Array(memory.embedding),
              match_threshold: 0.7,
              match_count: 5,
              searchText: text
            }
          );
          if (relevantKnowledge.length > 0) {
            knowledgeContent = relevantKnowledge.map((k) => {
              const metadata = k.content.metadata || {};
              return `- ${k.content.text}
Type: ${metadata.type || "unknown"}
Confidence: ${metadata.confidence || "unknown"}
Similarity: ${(k.similarity || 0).toFixed(2)}
Topics: ${Array.isArray(metadata.topics) ? metadata.topics.join(", ") : "none"}
Impact Score: ${metadata.impactScore || "unknown"}`;
            }).join("\n\n");
          }
        } catch (error) {
          elizaLogger39.error(
            "[MessageService] Error fetching knowledge:",
            error
          );
        }
      }
      let state;
      try {
        state = await agent.composeState(userMessage, {
          agentName: agent.character.name
        });
        if (state && knowledgeContent) {
          state.knowledge = knowledgeContent;
          elizaLogger39.debug("[MessageService] Added knowledge to state:", {
            knowledgeLength: knowledgeContent.length,
            stateHasKnowledge: "knowledge" in state
          });
        }
      } catch (error) {
        elizaLogger39.error("[MessageService] Error composing state:", error);
        return Response.json(
          { error: "Failed to compose state" },
          { status: 500 }
        );
      }
      if (!state) {
        return Response.json(
          { error: "Failed to compose state" },
          { status: 500 }
        );
      }
      const context = composeContext4({
        state,
        template: messageHandlerTemplate,
        templatingEngine: "handlebars"
      });
      const response = await generateMessageResponse2({
        runtime: agent,
        context,
        modelClass: ModelClass5.SMALL
      });
      if (!response) {
        return Response.json(
          { error: "No response generated" },
          { status: 500 }
        );
      }
      const responseMessage = {
        id: stringToUuid6(`${messageId}-${agent.agentId}`),
        ...userMessage,
        userId: agent.agentId,
        content: response,
        createdAt: Date.now()
      };
      await agent.messageManager.addEmbeddingToMemory(responseMessage);
      await agent.messageManager.createMemory(responseMessage);
      state = await agent.updateRecentMessageState(state);
      let message = null;
      await agent.processActions(
        memory,
        [responseMessage],
        state,
        async (newMessages) => {
          message = newMessages;
          return [memory];
        }
      );
      await agent.evaluate(memory, state);
      const responseContent = message ? [message] : [response];
      return Response.json(responseContent);
    } catch (error) {
      elizaLogger39.error("[MessageService] Error in handleMessage:", error);
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Unknown error occurred"
        },
        { status: 500 }
      );
    }
  }
};

// src/api/api.ts
var ApiClient = class {
  app;
  agents;
  server = null;
  startAgent = null;
  loadCharacterTryPath = null;
  jsonToCharacter = null;
  isInitialized = false;
  messageController;
  constructor() {
    this.agents = /* @__PURE__ */ new Map();
    this.app = new Elysia().onRequest(({ set }) => {
      set.headers["Access-Control-Allow-Origin"] = "*";
      set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
      set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    }).options("*", () => new Response(null, { status: 204 }));
    const messageService = new MessageService(this.agents);
    this.messageController = new MessageController(messageService);
    this.setupRoutes();
    this.app.onStart(({ server }) => {
      elizaLogger40.info(`[ApiClient] Running at ${server?.url}`);
      if (!this.isInitialized) {
        this.isInitialized = true;
      }
    });
    this.app.onStop(async () => {
      elizaLogger40.info("[ApiClient] Stopping...");
      try {
        this.agents.clear();
        this.isInitialized = false;
        elizaLogger40.info("[ApiClient] Stopped successfully");
      } catch (error) {
        elizaLogger40.error("[ApiClient] Error during shutdown:", error);
        throw error;
      }
    });
  }
  setupRoutes() {
    this.messageController.setupRoutes(this.app);
  }
  // agent/src/index.ts:startAgent calls this
  registerAgent(runtime) {
    this.agents.set(runtime.agentId, runtime);
  }
  unregisterAgent(runtime) {
    this.agents.delete(runtime.agentId);
  }
  start(port) {
    elizaLogger40.info(`[ApiClient] Starting server on port ${port}`);
    this.server = this.app.listen(port, () => {
      elizaLogger40.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
      );
    });
  }
  async stop() {
    elizaLogger40.info("[ApiClient] Stop method called");
    if (this.server) {
      elizaLogger40.info("[ApiClient] Closing server...");
      this.server.close(() => {
        elizaLogger40.info("[ApiClient] Server closed successfully");
      });
    } else {
      elizaLogger40.info("[ApiClient] No server to stop");
    }
  }
};

// src/cache/initialize-db-cache.ts
import {
  CacheManager,
  DbCacheAdapter
} from "@elizaos/core";
function initializeDbCache(character2, db2) {
  if (!character2.id) {
    throw new Error("Character ID is required");
  }
  const cache = new CacheManager(new DbCacheAdapter(db2, character2.id));
  return cache;
}

// src/config/api-routes.ts
function configureApiRoutes(app) {
  return app;
}

// src/config/index.ts
import fs2 from "node:fs";
import path2 from "node:path";
import {
  ModelProviderName,
  settings,
  validateCharacterConfig
} from "@elizaos/core";
import yargs from "yargs";
function parseArguments() {
  try {
    return yargs(process.argv.slice(2)).option("character", {
      type: "string",
      description: "Path to the character JSON file"
    }).option("characters", {
      type: "string",
      description: "Comma separated list of paths to character JSON files"
    }).parseSync();
  } catch (error) {
    console.error("Error parsing arguments:", error);
    return {};
  }
}
async function loadCharacters(charactersArg) {
  const characterPaths = charactersArg?.split(",").map((filePath) => {
    if (path2.basename(filePath) === filePath) {
      return path2.resolve(process.cwd(), `../characters/${filePath}`);
    }
    return path2.resolve(process.cwd(), filePath.trim());
  });
  const loadedCharacters = [];
  if (characterPaths?.length > 0) {
    for (const path3 of characterPaths) {
      try {
        const character2 = JSON.parse(fs2.readFileSync(path3, "utf8"));
        validateCharacterConfig(character2);
        loadedCharacters.push(character2);
      } catch (e) {
        console.error(`Error loading character from ${path3}: ${e}`);
        process.exit(1);
      }
    }
  }
  return loadedCharacters;
}
function getTokenForProvider(provider, character2) {
  switch (provider) {
    case ModelProviderName.OPENAI:
      return character2.settings?.secrets?.OPENAI_API_KEY || settings.OPENAI_API_KEY;
    case ModelProviderName.LLAMACLOUD:
      return character2.settings?.secrets?.LLAMACLOUD_API_KEY || settings.LLAMACLOUD_API_KEY || character2.settings?.secrets?.TOGETHER_API_KEY || settings.TOGETHER_API_KEY || character2.settings?.secrets?.XAI_API_KEY || settings.XAI_API_KEY || character2.settings?.secrets?.OPENAI_API_KEY || settings.OPENAI_API_KEY;
    case ModelProviderName.ANTHROPIC:
      return character2.settings?.secrets?.ANTHROPIC_API_KEY || character2.settings?.secrets?.CLAUDE_API_KEY || settings.ANTHROPIC_API_KEY || settings.CLAUDE_API_KEY;
    case ModelProviderName.REDPILL:
      return character2.settings?.secrets?.REDPILL_API_KEY || settings.REDPILL_API_KEY;
    case ModelProviderName.OPENROUTER:
      return character2.settings?.secrets?.OPENROUTER || settings.OPENROUTER_API_KEY;
    case ModelProviderName.GROK:
      return character2.settings?.secrets?.GROK_API_KEY || settings.GROK_API_KEY;
    case ModelProviderName.HEURIST:
      return character2.settings?.secrets?.HEURIST_API_KEY || settings.HEURIST_API_KEY;
    case ModelProviderName.GROQ:
      return character2.settings?.secrets?.GROQ_API_KEY || settings.GROQ_API_KEY;
  }
}

// src/eliza/character.ts
import { ModelProviderName as ModelProviderName2 } from "@elizaos/core";
var character = {
  id: "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
  name: "Bork",
  username: "bork",
  modelProvider: ModelProviderName2.OPENAI,
  // plugins,
  plugins: [],
  settings: {
    secrets: {}
  },
  system: `Roleplay as Bork Translator, a translation agent for Bork, a chicken who analyzes markets specializing in DeFi and crypto. Your primary functions are:
1. Data Collection & Analysis: Gather and analyze market data, on-chain metrics, and social sentiment
2. Market Scoring: Create comprehensive market scores based on multiple data points
3. Insight Generation: Provide actionable insights and market commentary
4. Content Creation: Generate engaging content based on data-driven analysis

Always maintain a data-driven, analytical approach while making complex market concepts accessible.`,
  bio: [
    "Advanced market analysis AI specializing in DeFi and crypto markets.",
    "Developed proprietary market scoring systems that combine on-chain metrics, social sentiment, and technical analysis.",
    "Pioneered real-time market data collection and analysis methodologies for DeFi protocols.",
    "Created innovative approaches to measuring protocol health, market sentiment, and ecosystem growth."
  ],
  lore: [
    "Built comprehensive market analysis frameworks for DeFi protocols",
    "Developed real-time data collection systems for on-chain metrics",
    "Created market scoring algorithms that combine multiple data points",
    "Established protocols for measuring social sentiment and market impact",
    "Pioneered methods for analyzing cross-chain interactions and market correlations",
    "Designed systems for tracking whale activity and market influence"
  ],
  messageExamples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's your analysis of INJ's current market position?"
        }
      },
      {
        user: "Bork",
        content: {
          text: "Based on current data, INJ shows strong fundamentals with increasing DEX volume (+23% week-over-week) and growing institutional interest. The market score is 7.8/10, driven by positive technical indicators and strong on-chain metrics."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "How is the Injective ecosystem performing overall?"
        }
      },
      {
        user: "Bork",
        content: {
          text: "The ecosystem health score is 8.2/10. Key metrics show: 15% growth in TVL, 8 new protocol integrations, and increasing cross-chain volume. The lending market is particularly strong with optimal utilization rates."
        }
      }
    ]
  ],
  postExamples: [
    "Market Analysis: INJ showing strong momentum with 23% volume increase and growing institutional interest",
    "Ecosystem Update: Injective DEX volume reaches new ATH, driven by institutional participation",
    "Technical Analysis: Bullish divergence forming on 4H timeframe, supported by strong on-chain metrics",
    "Market Score: 7.8/10 - Positive technical indicators and growing protocol adoption",
    "Whale Activity Alert: Large accumulation detected in INJ, potential market impact analysis"
  ],
  adjectives: [
    "analytical",
    "data-driven",
    "precise",
    "insightful",
    "methodical",
    "objective",
    "comprehensive",
    "forward-looking"
  ],
  topics: [
    "injective protocol",
    "INJ price prediction",
    "DeFi derivatives",
    "cross-chain interoperability",
    "staking rewards",
    "governance proposals",
    "liquidity mining",
    "DEX volume trends",
    "market volatility",
    "whale wallet activity",
    "token burns",
    "NFTFi adoption",
    "institutional crypto inflows",
    "technical analysis signals",
    "regulatory updates",
    "exchange listings",
    "smart contract exploits",
    "lending/borrowing rates",
    "stablecoin dominance",
    "social sentiment trends"
  ],
  style: {
    all: [
      "use precise market terminology",
      "reference specific data points",
      "maintain analytical objectivity",
      "explain complex metrics clearly",
      "cite on-chain data",
      "provide quantitative evidence",
      "highlight key market indicators",
      "maintain professional tone"
    ],
    chat: [
      "break down market metrics",
      "reference specific data points",
      "use precise technical language",
      "provide market context",
      "encourage data-driven discussion"
    ],
    post: [
      "share market analysis",
      "highlight key metrics",
      "emphasize data significance",
      "promote informed discussion",
      "announce market updates"
    ]
  }
};

// src/eliza/index.ts
function createAgent(character2, db2, cache, token) {
  const plugins = [];
  return new AgentRuntime({
    databaseAdapter: db2,
    token,
    modelProvider: character2.modelProvider,
    evaluators: [],
    character: character2,
    plugins,
    providers: [],
    actions: [],
    services: [],
    managers: [],
    cacheManager: cache
  });
}
async function startAgent(character2, directClient, db2) {
  try {
    elizaLogger41.info(
      `[Initialize] Starting agent for character: ${character2.name}`
    );
    character2.id ??= stringToUuid7(character2.name);
    character2.username ??= character2.name;
    const token = getTokenForProvider(character2.modelProvider, character2);
    if (!token) {
      elizaLogger41.error(
        `[Initialize]No token found for provider ${character2.modelProvider}`
      );
      throw new Error(`No token found for provider ${character2.modelProvider}`);
    }
    elizaLogger41.info("[Initialize] Initializing database cache");
    const cache = initializeDbCache(character2, db2);
    const runtime = createAgent(character2, db2, cache, token);
    await runtime.initialize();
    runtime.clients = await initializeClients(character2, runtime);
    directClient.registerAgent(runtime);
    return runtime;
  } catch (error) {
    elizaLogger41.error(
      `[Initialize]Error starting agent for character ${character2.name}:`,
      error
    );
    if (db2) {
      elizaLogger41.info("Closing database connection due to error");
      await db2.close();
    }
    throw error;
  }
}
var startAgents = async () => {
  console.log("Starting agents initialization");
  elizaLogger41.info("[Initialize] Starting agents initialization");
  const directClient = new ApiClient();
  configureApiRoutes(directClient.app);
  const serverPort = Number.parseInt(settings2.SERVER_PORT || "3000");
  const args = parseArguments();
  const charactersArg = args.characters || args.character;
  let characters = [character];
  if (charactersArg) {
    characters = await loadCharacters(charactersArg);
  }
  elizaLogger41.info("[Initialize] Loading database adapter");
  let db2;
  try {
    db2 = new PostgresDatabaseAdapter({
      connectionString: getEnv().POSTGRES_URL,
      parseInputs: true
    });
    await db2.init();
  } catch (error) {
    elizaLogger41.error("[Initialize] Error initializing database:", error);
    throw error;
  }
  elizaLogger41.info("[Initialize] Starting agents");
  try {
    for (const character2 of characters) {
      await startAgent(character2, directClient, db2);
    }
  } catch (error) {
    elizaLogger41.error("[Initialize] Error starting agents:", error);
    throw error;
  }
  directClient.startAgent = async (character2) => {
    return startAgent(character2, directClient, db2);
  };
  directClient.start(serverPort);
  let isShuttingDown = false;
  const shutdown = async () => {
    elizaLogger41.info("Shutdown handler triggered");
    if (isShuttingDown) {
      elizaLogger41.info("Already shutting down, skipping...");
      return;
    }
    isShuttingDown = true;
    elizaLogger41.info("Starting graceful shutdown...");
    console.trace("Shutdown stack trace");
    process.exit(0);
  };
  process.removeListener("SIGINT", shutdown);
  process.removeListener("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// src/index.ts
getEnv();
startAgents().catch((error) => {
  elizaLogger42.error("Unhandled error in startAgents:", error);
  process.exit(1);
});
/*! Bundled license information:

mime-db/index.js:
  (*!
   * mime-db
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

mime-types/index.js:
  (*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
//# sourceMappingURL=index.js.map