var PapLib = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // vendor/lohnsteuerrechner/dist/core/index.js
  var index_exports = {};
  __export(index_exports, {
    ALL_OUTPUT_NAMES: () => ALL_OUTPUT_NAMES,
    DBA_OUTPUT_NAMES: () => DBA_OUTPUT_NAMES,
    INPUT_DEFAULTS: () => INPUT_DEFAULTS,
    STANDARD_OUTPUT_NAMES: () => STANDARD_OUTPUT_NAMES,
    SUPPORTED_YEARS: () => SUPPORTED_YEARS,
    calculate: () => calculate
  });

  // node_modules/decimal.js/decimal.mjs
  var EXP_LIMIT = 9e15;
  var MAX_DIGITS = 1e9;
  var NUMERALS = "0123456789abcdef";
  var LN10 = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058";
  var PI = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789";
  var DEFAULTS = {
    // These values must be integers within the stated ranges (inclusive).
    // Most of these values can be changed at run-time using the `Decimal.config` method.
    // The maximum number of significant digits of the result of a calculation or base conversion.
    // E.g. `Decimal.config({ precision: 20 });`
    precision: 20,
    // 1 to MAX_DIGITS
    // The rounding mode used when rounding to `precision`.
    //
    // ROUND_UP         0 Away from zero.
    // ROUND_DOWN       1 Towards zero.
    // ROUND_CEIL       2 Towards +Infinity.
    // ROUND_FLOOR      3 Towards -Infinity.
    // ROUND_HALF_UP    4 Towards nearest neighbour. If equidistant, up.
    // ROUND_HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
    // ROUND_HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
    // ROUND_HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
    // ROUND_HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
    //
    // E.g.
    // `Decimal.rounding = 4;`
    // `Decimal.rounding = Decimal.ROUND_HALF_UP;`
    rounding: 4,
    // 0 to 8
    // The modulo mode used when calculating the modulus: a mod n.
    // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
    // The remainder (r) is calculated as: r = a - n * q.
    //
    // UP         0 The remainder is positive if the dividend is negative, else is negative.
    // DOWN       1 The remainder has the same sign as the dividend (JavaScript %).
    // FLOOR      3 The remainder has the same sign as the divisor (Python %).
    // HALF_EVEN  6 The IEEE 754 remainder function.
    // EUCLID     9 Euclidian division. q = sign(n) * floor(a / abs(n)). Always positive.
    //
    // Truncated division (1), floored division (3), the IEEE 754 remainder (6), and Euclidian
    // division (9) are commonly used for the modulus operation. The other rounding modes can also
    // be used, but they may not give useful results.
    modulo: 1,
    // 0 to 9
    // The exponent value at and beneath which `toString` returns exponential notation.
    // JavaScript numbers: -7
    toExpNeg: -7,
    // 0 to -EXP_LIMIT
    // The exponent value at and above which `toString` returns exponential notation.
    // JavaScript numbers: 21
    toExpPos: 21,
    // 0 to EXP_LIMIT
    // The minimum exponent value, beneath which underflow to zero occurs.
    // JavaScript numbers: -324  (5e-324)
    minE: -EXP_LIMIT,
    // -1 to -EXP_LIMIT
    // The maximum exponent value, above which overflow to Infinity occurs.
    // JavaScript numbers: 308  (1.7976931348623157e+308)
    maxE: EXP_LIMIT,
    // 1 to EXP_LIMIT
    // Whether to use cryptographically-secure random number generation, if available.
    crypto: false
    // true/false
  };
  var inexact;
  var quadrant;
  var external = true;
  var decimalError = "[DecimalError] ";
  var invalidArgument = decimalError + "Invalid argument: ";
  var precisionLimitExceeded = decimalError + "Precision limit exceeded";
  var cryptoUnavailable = decimalError + "crypto unavailable";
  var tag = "[object Decimal]";
  var mathfloor = Math.floor;
  var mathpow = Math.pow;
  var isBinary = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i;
  var isHex = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i;
  var isOctal = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i;
  var isDecimal = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
  var BASE = 1e7;
  var LOG_BASE = 7;
  var MAX_SAFE_INTEGER = 9007199254740991;
  var LN10_PRECISION = LN10.length - 1;
  var PI_PRECISION = PI.length - 1;
  var P = { toStringTag: tag };
  P.absoluteValue = P.abs = function() {
    var x = new this.constructor(this);
    if (x.s < 0) x.s = 1;
    return finalise(x);
  };
  P.ceil = function() {
    return finalise(new this.constructor(this), this.e + 1, 2);
  };
  P.clampedTo = P.clamp = function(min2, max2) {
    var k, x = this, Ctor = x.constructor;
    min2 = new Ctor(min2);
    max2 = new Ctor(max2);
    if (!min2.s || !max2.s) return new Ctor(NaN);
    if (min2.gt(max2)) throw Error(invalidArgument + max2);
    k = x.cmp(min2);
    return k < 0 ? min2 : x.cmp(max2) > 0 ? max2 : new Ctor(x);
  };
  P.comparedTo = P.cmp = function(y) {
    var i, j, xdL, ydL, x = this, xd = x.d, yd = (y = new x.constructor(y)).d, xs = x.s, ys = y.s;
    if (!xd || !yd) {
      return !xs || !ys ? NaN : xs !== ys ? xs : xd === yd ? 0 : !xd ^ xs < 0 ? 1 : -1;
    }
    if (!xd[0] || !yd[0]) return xd[0] ? xs : yd[0] ? -ys : 0;
    if (xs !== ys) return xs;
    if (x.e !== y.e) return x.e > y.e ^ xs < 0 ? 1 : -1;
    xdL = xd.length;
    ydL = yd.length;
    for (i = 0, j = xdL < ydL ? xdL : ydL; i < j; ++i) {
      if (xd[i] !== yd[i]) return xd[i] > yd[i] ^ xs < 0 ? 1 : -1;
    }
    return xdL === ydL ? 0 : xdL > ydL ^ xs < 0 ? 1 : -1;
  };
  P.cosine = P.cos = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.d) return new Ctor(NaN);
    if (!x.d[0]) return new Ctor(1);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
    Ctor.rounding = 1;
    x = cosine(Ctor, toLessThanHalfPi(Ctor, x));
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant == 2 || quadrant == 3 ? x.neg() : x, pr, rm, true);
  };
  P.cubeRoot = P.cbrt = function() {
    var e, m, n, r, rep, s, sd, t, t3, t3plusx, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero()) return new Ctor(x);
    external = false;
    s = x.s * mathpow(x.s * x, 1 / 3);
    if (!s || Math.abs(s) == 1 / 0) {
      n = digitsToString(x.d);
      e = x.e;
      if (s = (e - n.length + 1) % 3) n += s == 1 || s == -2 ? "0" : "00";
      s = mathpow(n, 1 / 3);
      e = mathfloor((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2));
      if (s == 1 / 0) {
        n = "5e" + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf("e") + 1) + e;
      }
      r = new Ctor(n);
      r.s = x.s;
    } else {
      r = new Ctor(s.toString());
    }
    sd = (e = Ctor.precision) + 3;
    for (; ; ) {
      t = r;
      t3 = t.times(t).times(t);
      t3plusx = t3.plus(x);
      r = divide(t3plusx.plus(x).times(t), t3plusx.plus(t3), sd + 2, 1);
      if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
        n = n.slice(sd - 3, sd + 1);
        if (n == "9999" || !rep && n == "4999") {
          if (!rep) {
            finalise(t, e + 1, 0);
            if (t.times(t).times(t).eq(x)) {
              r = t;
              break;
            }
          }
          sd += 4;
          rep = 1;
        } else {
          if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
            finalise(r, e + 1, 1);
            m = !r.times(r).times(r).eq(x);
          }
          break;
        }
      }
    }
    external = true;
    return finalise(r, e, Ctor.rounding, m);
  };
  P.decimalPlaces = P.dp = function() {
    var w, d = this.d, n = NaN;
    if (d) {
      w = d.length - 1;
      n = (w - mathfloor(this.e / LOG_BASE)) * LOG_BASE;
      w = d[w];
      if (w) for (; w % 10 == 0; w /= 10) n--;
      if (n < 0) n = 0;
    }
    return n;
  };
  P.dividedBy = P.div = function(y) {
    return divide(this, new this.constructor(y));
  };
  P.dividedToIntegerBy = P.divToInt = function(y) {
    var x = this, Ctor = x.constructor;
    return finalise(divide(x, new Ctor(y), 0, 1, 1), Ctor.precision, Ctor.rounding);
  };
  P.equals = P.eq = function(y) {
    return this.cmp(y) === 0;
  };
  P.floor = function() {
    return finalise(new this.constructor(this), this.e + 1, 3);
  };
  P.greaterThan = P.gt = function(y) {
    return this.cmp(y) > 0;
  };
  P.greaterThanOrEqualTo = P.gte = function(y) {
    var k = this.cmp(y);
    return k == 1 || k === 0;
  };
  P.hyperbolicCosine = P.cosh = function() {
    var k, n, pr, rm, len, x = this, Ctor = x.constructor, one = new Ctor(1);
    if (!x.isFinite()) return new Ctor(x.s ? 1 / 0 : NaN);
    if (x.isZero()) return one;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
    Ctor.rounding = 1;
    len = x.d.length;
    if (len < 32) {
      k = Math.ceil(len / 3);
      n = (1 / tinyPow(4, k)).toString();
    } else {
      k = 16;
      n = "2.3283064365386962890625e-10";
    }
    x = taylorSeries(Ctor, 1, x.times(n), new Ctor(1), true);
    var cosh2_x, i = k, d8 = new Ctor(8);
    for (; i--; ) {
      cosh2_x = x.times(x);
      x = one.minus(cosh2_x.times(d8.minus(cosh2_x.times(d8))));
    }
    return finalise(x, Ctor.precision = pr, Ctor.rounding = rm, true);
  };
  P.hyperbolicSine = P.sinh = function() {
    var k, pr, rm, len, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
    Ctor.rounding = 1;
    len = x.d.length;
    if (len < 3) {
      x = taylorSeries(Ctor, 2, x, x, true);
    } else {
      k = 1.4 * Math.sqrt(len);
      k = k > 16 ? 16 : k | 0;
      x = x.times(1 / tinyPow(5, k));
      x = taylorSeries(Ctor, 2, x, x, true);
      var sinh2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
      for (; k--; ) {
        sinh2_x = x.times(x);
        x = x.times(d5.plus(sinh2_x.times(d16.times(sinh2_x).plus(d20))));
      }
    }
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(x, pr, rm, true);
  };
  P.hyperbolicTangent = P.tanh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(x.s);
    if (x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 7;
    Ctor.rounding = 1;
    return divide(x.sinh(), x.cosh(), Ctor.precision = pr, Ctor.rounding = rm);
  };
  P.inverseCosine = P.acos = function() {
    var x = this, Ctor = x.constructor, k = x.abs().cmp(1), pr = Ctor.precision, rm = Ctor.rounding;
    if (k !== -1) {
      return k === 0 ? x.isNeg() ? getPi(Ctor, pr, rm) : new Ctor(0) : new Ctor(NaN);
    }
    if (x.isZero()) return getPi(Ctor, pr + 4, rm).times(0.5);
    Ctor.precision = pr + 6;
    Ctor.rounding = 1;
    x = new Ctor(1).minus(x).div(x.plus(1)).sqrt().atan();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(2);
  };
  P.inverseHyperbolicCosine = P.acosh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (x.lte(1)) return new Ctor(x.eq(1) ? 0 : NaN);
    if (!x.isFinite()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(Math.abs(x.e), x.sd()) + 4;
    Ctor.rounding = 1;
    external = false;
    x = x.times(x).minus(1).sqrt().plus(x);
    external = true;
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.ln();
  };
  P.inverseHyperbolicSine = P.asinh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 2 * Math.max(Math.abs(x.e), x.sd()) + 6;
    Ctor.rounding = 1;
    external = false;
    x = x.times(x).plus(1).sqrt().plus(x);
    external = true;
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.ln();
  };
  P.inverseHyperbolicTangent = P.atanh = function() {
    var pr, rm, wpr, xsd, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(NaN);
    if (x.e >= 0) return new Ctor(x.abs().eq(1) ? x.s / 0 : x.isZero() ? x : NaN);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    xsd = x.sd();
    if (Math.max(xsd, pr) < 2 * -x.e - 1) return finalise(new Ctor(x), pr, rm, true);
    Ctor.precision = wpr = xsd - x.e;
    x = divide(x.plus(1), new Ctor(1).minus(x), wpr + pr, 1);
    Ctor.precision = pr + 4;
    Ctor.rounding = 1;
    x = x.ln();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(0.5);
  };
  P.inverseSine = P.asin = function() {
    var halfPi, k, pr, rm, x = this, Ctor = x.constructor;
    if (x.isZero()) return new Ctor(x);
    k = x.abs().cmp(1);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (k !== -1) {
      if (k === 0) {
        halfPi = getPi(Ctor, pr + 4, rm).times(0.5);
        halfPi.s = x.s;
        return halfPi;
      }
      return new Ctor(NaN);
    }
    Ctor.precision = pr + 6;
    Ctor.rounding = 1;
    x = x.div(new Ctor(1).minus(x.times(x)).sqrt().plus(1)).atan();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(2);
  };
  P.inverseTangent = P.atan = function() {
    var i, j, k, n, px, t, r, wpr, x2, x = this, Ctor = x.constructor, pr = Ctor.precision, rm = Ctor.rounding;
    if (!x.isFinite()) {
      if (!x.s) return new Ctor(NaN);
      if (pr + 4 <= PI_PRECISION) {
        r = getPi(Ctor, pr + 4, rm).times(0.5);
        r.s = x.s;
        return r;
      }
    } else if (x.isZero()) {
      return new Ctor(x);
    } else if (x.abs().eq(1) && pr + 4 <= PI_PRECISION) {
      r = getPi(Ctor, pr + 4, rm).times(0.25);
      r.s = x.s;
      return r;
    }
    Ctor.precision = wpr = pr + 10;
    Ctor.rounding = 1;
    k = Math.min(28, wpr / LOG_BASE + 2 | 0);
    for (i = k; i; --i) x = x.div(x.times(x).plus(1).sqrt().plus(1));
    external = false;
    j = Math.ceil(wpr / LOG_BASE);
    n = 1;
    x2 = x.times(x);
    r = new Ctor(x);
    px = x;
    for (; i !== -1; ) {
      px = px.times(x2);
      t = r.minus(px.div(n += 2));
      px = px.times(x2);
      r = t.plus(px.div(n += 2));
      if (r.d[j] !== void 0) for (i = j; r.d[i] === t.d[i] && i--; ) ;
    }
    if (k) r = r.times(2 << k - 1);
    external = true;
    return finalise(r, Ctor.precision = pr, Ctor.rounding = rm, true);
  };
  P.isFinite = function() {
    return !!this.d;
  };
  P.isInteger = P.isInt = function() {
    return !!this.d && mathfloor(this.e / LOG_BASE) > this.d.length - 2;
  };
  P.isNaN = function() {
    return !this.s;
  };
  P.isNegative = P.isNeg = function() {
    return this.s < 0;
  };
  P.isPositive = P.isPos = function() {
    return this.s > 0;
  };
  P.isZero = function() {
    return !!this.d && this.d[0] === 0;
  };
  P.lessThan = P.lt = function(y) {
    return this.cmp(y) < 0;
  };
  P.lessThanOrEqualTo = P.lte = function(y) {
    return this.cmp(y) < 1;
  };
  P.logarithm = P.log = function(base) {
    var isBase10, d, denominator, k, inf, num, sd, r, arg = this, Ctor = arg.constructor, pr = Ctor.precision, rm = Ctor.rounding, guard = 5;
    if (base == null) {
      base = new Ctor(10);
      isBase10 = true;
    } else {
      base = new Ctor(base);
      d = base.d;
      if (base.s < 0 || !d || !d[0] || base.eq(1)) return new Ctor(NaN);
      isBase10 = base.eq(10);
    }
    d = arg.d;
    if (arg.s < 0 || !d || !d[0] || arg.eq(1)) {
      return new Ctor(d && !d[0] ? -1 / 0 : arg.s != 1 ? NaN : d ? 0 : 1 / 0);
    }
    if (isBase10) {
      if (d.length > 1) {
        inf = true;
      } else {
        for (k = d[0]; k % 10 === 0; ) k /= 10;
        inf = k !== 1;
      }
    }
    external = false;
    sd = pr + guard;
    num = naturalLogarithm(arg, sd);
    denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
    r = divide(num, denominator, sd, 1);
    if (checkRoundingDigits(r.d, k = pr, rm)) {
      do {
        sd += 10;
        num = naturalLogarithm(arg, sd);
        denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
        r = divide(num, denominator, sd, 1);
        if (!inf) {
          if (+digitsToString(r.d).slice(k + 1, k + 15) + 1 == 1e14) {
            r = finalise(r, pr + 1, 0);
          }
          break;
        }
      } while (checkRoundingDigits(r.d, k += 10, rm));
    }
    external = true;
    return finalise(r, pr, rm);
  };
  P.minus = P.sub = function(y) {
    var d, e, i, j, k, len, pr, rm, xd, xe, xLTy, yd, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.d) {
      if (!x.s || !y.s) y = new Ctor(NaN);
      else if (x.d) y.s = -y.s;
      else y = new Ctor(y.d || x.s !== y.s ? x : NaN);
      return y;
    }
    if (x.s != y.s) {
      y.s = -y.s;
      return x.plus(y);
    }
    xd = x.d;
    yd = y.d;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (!xd[0] || !yd[0]) {
      if (yd[0]) y.s = -y.s;
      else if (xd[0]) y = new Ctor(x);
      else return new Ctor(rm === 3 ? -0 : 0);
      return external ? finalise(y, pr, rm) : y;
    }
    e = mathfloor(y.e / LOG_BASE);
    xe = mathfloor(x.e / LOG_BASE);
    xd = xd.slice();
    k = xe - e;
    if (k) {
      xLTy = k < 0;
      if (xLTy) {
        d = xd;
        k = -k;
        len = yd.length;
      } else {
        d = yd;
        e = xe;
        len = xd.length;
      }
      i = Math.max(Math.ceil(pr / LOG_BASE), len) + 2;
      if (k > i) {
        k = i;
        d.length = 1;
      }
      d.reverse();
      for (i = k; i--; ) d.push(0);
      d.reverse();
    } else {
      i = xd.length;
      len = yd.length;
      xLTy = i < len;
      if (xLTy) len = i;
      for (i = 0; i < len; i++) {
        if (xd[i] != yd[i]) {
          xLTy = xd[i] < yd[i];
          break;
        }
      }
      k = 0;
    }
    if (xLTy) {
      d = xd;
      xd = yd;
      yd = d;
      y.s = -y.s;
    }
    len = xd.length;
    for (i = yd.length - len; i > 0; --i) xd[len++] = 0;
    for (i = yd.length; i > k; ) {
      if (xd[--i] < yd[i]) {
        for (j = i; j && xd[--j] === 0; ) xd[j] = BASE - 1;
        --xd[j];
        xd[i] += BASE;
      }
      xd[i] -= yd[i];
    }
    for (; xd[--len] === 0; ) xd.pop();
    for (; xd[0] === 0; xd.shift()) --e;
    if (!xd[0]) return new Ctor(rm === 3 ? -0 : 0);
    y.d = xd;
    y.e = getBase10Exponent(xd, e);
    return external ? finalise(y, pr, rm) : y;
  };
  P.modulo = P.mod = function(y) {
    var q, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.s || y.d && !y.d[0]) return new Ctor(NaN);
    if (!y.d || x.d && !x.d[0]) {
      return finalise(new Ctor(x), Ctor.precision, Ctor.rounding);
    }
    external = false;
    if (Ctor.modulo == 9) {
      q = divide(x, y.abs(), 0, 3, 1);
      q.s *= y.s;
    } else {
      q = divide(x, y, 0, Ctor.modulo, 1);
    }
    q = q.times(y);
    external = true;
    return x.minus(q);
  };
  P.naturalExponential = P.exp = function() {
    return naturalExponential(this);
  };
  P.naturalLogarithm = P.ln = function() {
    return naturalLogarithm(this);
  };
  P.negated = P.neg = function() {
    var x = new this.constructor(this);
    x.s = -x.s;
    return finalise(x);
  };
  P.plus = P.add = function(y) {
    var carry, d, e, i, k, len, pr, rm, xd, yd, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.d) {
      if (!x.s || !y.s) y = new Ctor(NaN);
      else if (!x.d) y = new Ctor(y.d || x.s === y.s ? x : NaN);
      return y;
    }
    if (x.s != y.s) {
      y.s = -y.s;
      return x.minus(y);
    }
    xd = x.d;
    yd = y.d;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (!xd[0] || !yd[0]) {
      if (!yd[0]) y = new Ctor(x);
      return external ? finalise(y, pr, rm) : y;
    }
    k = mathfloor(x.e / LOG_BASE);
    e = mathfloor(y.e / LOG_BASE);
    xd = xd.slice();
    i = k - e;
    if (i) {
      if (i < 0) {
        d = xd;
        i = -i;
        len = yd.length;
      } else {
        d = yd;
        e = k;
        len = xd.length;
      }
      k = Math.ceil(pr / LOG_BASE);
      len = k > len ? k + 1 : len + 1;
      if (i > len) {
        i = len;
        d.length = 1;
      }
      d.reverse();
      for (; i--; ) d.push(0);
      d.reverse();
    }
    len = xd.length;
    i = yd.length;
    if (len - i < 0) {
      i = len;
      d = yd;
      yd = xd;
      xd = d;
    }
    for (carry = 0; i; ) {
      carry = (xd[--i] = xd[i] + yd[i] + carry) / BASE | 0;
      xd[i] %= BASE;
    }
    if (carry) {
      xd.unshift(carry);
      ++e;
    }
    for (len = xd.length; xd[--len] == 0; ) xd.pop();
    y.d = xd;
    y.e = getBase10Exponent(xd, e);
    return external ? finalise(y, pr, rm) : y;
  };
  P.precision = P.sd = function(z) {
    var k, x = this;
    if (z !== void 0 && z !== !!z && z !== 1 && z !== 0) throw Error(invalidArgument + z);
    if (x.d) {
      k = getPrecision(x.d);
      if (z && x.e + 1 > k) k = x.e + 1;
    } else {
      k = NaN;
    }
    return k;
  };
  P.round = function() {
    var x = this, Ctor = x.constructor;
    return finalise(new Ctor(x), x.e + 1, Ctor.rounding);
  };
  P.sine = P.sin = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(NaN);
    if (x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
    Ctor.rounding = 1;
    x = sine(Ctor, toLessThanHalfPi(Ctor, x));
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant > 2 ? x.neg() : x, pr, rm, true);
  };
  P.squareRoot = P.sqrt = function() {
    var m, n, sd, r, rep, t, x = this, d = x.d, e = x.e, s = x.s, Ctor = x.constructor;
    if (s !== 1 || !d || !d[0]) {
      return new Ctor(!s || s < 0 && (!d || d[0]) ? NaN : d ? x : 1 / 0);
    }
    external = false;
    s = Math.sqrt(+x);
    if (s == 0 || s == 1 / 0) {
      n = digitsToString(d);
      if ((n.length + e) % 2 == 0) n += "0";
      s = Math.sqrt(n);
      e = mathfloor((e + 1) / 2) - (e < 0 || e % 2);
      if (s == 1 / 0) {
        n = "5e" + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf("e") + 1) + e;
      }
      r = new Ctor(n);
    } else {
      r = new Ctor(s.toString());
    }
    sd = (e = Ctor.precision) + 3;
    for (; ; ) {
      t = r;
      r = t.plus(divide(x, t, sd + 2, 1)).times(0.5);
      if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
        n = n.slice(sd - 3, sd + 1);
        if (n == "9999" || !rep && n == "4999") {
          if (!rep) {
            finalise(t, e + 1, 0);
            if (t.times(t).eq(x)) {
              r = t;
              break;
            }
          }
          sd += 4;
          rep = 1;
        } else {
          if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
            finalise(r, e + 1, 1);
            m = !r.times(r).eq(x);
          }
          break;
        }
      }
    }
    external = true;
    return finalise(r, e, Ctor.rounding, m);
  };
  P.tangent = P.tan = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(NaN);
    if (x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 10;
    Ctor.rounding = 1;
    x = x.sin();
    x.s = 1;
    x = divide(x, new Ctor(1).minus(x.times(x)).sqrt(), pr + 10, 0);
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant == 2 || quadrant == 4 ? x.neg() : x, pr, rm, true);
  };
  P.times = P.mul = function(y) {
    var carry, e, i, k, r, rL, t, xdL, ydL, x = this, Ctor = x.constructor, xd = x.d, yd = (y = new Ctor(y)).d;
    y.s *= x.s;
    if (!xd || !xd[0] || !yd || !yd[0]) {
      return new Ctor(!y.s || xd && !xd[0] && !yd || yd && !yd[0] && !xd ? NaN : !xd || !yd ? y.s / 0 : y.s * 0);
    }
    e = mathfloor(x.e / LOG_BASE) + mathfloor(y.e / LOG_BASE);
    xdL = xd.length;
    ydL = yd.length;
    if (xdL < ydL) {
      r = xd;
      xd = yd;
      yd = r;
      rL = xdL;
      xdL = ydL;
      ydL = rL;
    }
    r = [];
    rL = xdL + ydL;
    for (i = rL; i--; ) r.push(0);
    for (i = ydL; --i >= 0; ) {
      carry = 0;
      for (k = xdL + i; k > i; ) {
        t = r[k] + yd[i] * xd[k - i - 1] + carry;
        r[k--] = t % BASE | 0;
        carry = t / BASE | 0;
      }
      r[k] = (r[k] + carry) % BASE | 0;
    }
    for (; !r[--rL]; ) r.pop();
    if (carry) ++e;
    else r.shift();
    y.d = r;
    y.e = getBase10Exponent(r, e);
    return external ? finalise(y, Ctor.precision, Ctor.rounding) : y;
  };
  P.toBinary = function(sd, rm) {
    return toStringBinary(this, 2, sd, rm);
  };
  P.toDecimalPlaces = P.toDP = function(dp, rm) {
    var x = this, Ctor = x.constructor;
    x = new Ctor(x);
    if (dp === void 0) return x;
    checkInt32(dp, 0, MAX_DIGITS);
    if (rm === void 0) rm = Ctor.rounding;
    else checkInt32(rm, 0, 8);
    return finalise(x, dp + x.e + 1, rm);
  };
  P.toExponential = function(dp, rm) {
    var str, x = this, Ctor = x.constructor;
    if (dp === void 0) {
      str = finiteToString(x, true);
    } else {
      checkInt32(dp, 0, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
      x = finalise(new Ctor(x), dp + 1, rm);
      str = finiteToString(x, true, dp + 1);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toFixed = function(dp, rm) {
    var str, y, x = this, Ctor = x.constructor;
    if (dp === void 0) {
      str = finiteToString(x);
    } else {
      checkInt32(dp, 0, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
      y = finalise(new Ctor(x), dp + x.e + 1, rm);
      str = finiteToString(y, false, dp + y.e + 1);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toFraction = function(maxD) {
    var d, d0, d1, d2, e, k, n, n0, n1, pr, q, r, x = this, xd = x.d, Ctor = x.constructor;
    if (!xd) return new Ctor(x);
    n1 = d0 = new Ctor(1);
    d1 = n0 = new Ctor(0);
    d = new Ctor(d1);
    e = d.e = getPrecision(xd) - x.e - 1;
    k = e % LOG_BASE;
    d.d[0] = mathpow(10, k < 0 ? LOG_BASE + k : k);
    if (maxD == null) {
      maxD = e > 0 ? d : n1;
    } else {
      n = new Ctor(maxD);
      if (!n.isInt() || n.lt(n1)) throw Error(invalidArgument + n);
      maxD = n.gt(d) ? e > 0 ? d : n1 : n;
    }
    external = false;
    n = new Ctor(digitsToString(xd));
    pr = Ctor.precision;
    Ctor.precision = e = xd.length * LOG_BASE * 2;
    for (; ; ) {
      q = divide(n, d, 0, 1, 1);
      d2 = d0.plus(q.times(d1));
      if (d2.cmp(maxD) == 1) break;
      d0 = d1;
      d1 = d2;
      d2 = n1;
      n1 = n0.plus(q.times(d2));
      n0 = d2;
      d2 = d;
      d = n.minus(q.times(d2));
      n = d2;
    }
    d2 = divide(maxD.minus(d0), d1, 0, 1, 1);
    n0 = n0.plus(d2.times(n1));
    d0 = d0.plus(d2.times(d1));
    n0.s = n1.s = x.s;
    r = divide(n1, d1, e, 1).minus(x).abs().cmp(divide(n0, d0, e, 1).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];
    Ctor.precision = pr;
    external = true;
    return r;
  };
  P.toHexadecimal = P.toHex = function(sd, rm) {
    return toStringBinary(this, 16, sd, rm);
  };
  P.toNearest = function(y, rm) {
    var x = this, Ctor = x.constructor;
    x = new Ctor(x);
    if (y == null) {
      if (!x.d) return x;
      y = new Ctor(1);
      rm = Ctor.rounding;
    } else {
      y = new Ctor(y);
      if (rm === void 0) {
        rm = Ctor.rounding;
      } else {
        checkInt32(rm, 0, 8);
      }
      if (!x.d) return y.s ? x : y;
      if (!y.d) {
        if (y.s) y.s = x.s;
        return y;
      }
    }
    if (y.d[0]) {
      external = false;
      x = divide(x, y, 0, rm, 1).times(y);
      external = true;
      finalise(x);
    } else {
      y.s = x.s;
      x = y;
    }
    return x;
  };
  P.toNumber = function() {
    return +this;
  };
  P.toOctal = function(sd, rm) {
    return toStringBinary(this, 8, sd, rm);
  };
  P.toPower = P.pow = function(y) {
    var e, k, pr, r, rm, s, x = this, Ctor = x.constructor, yn = +(y = new Ctor(y));
    if (!x.d || !y.d || !x.d[0] || !y.d[0]) return new Ctor(mathpow(+x, yn));
    x = new Ctor(x);
    if (x.eq(1)) return x;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (y.eq(1)) return finalise(x, pr, rm);
    e = mathfloor(y.e / LOG_BASE);
    if (e >= y.d.length - 1 && (k = yn < 0 ? -yn : yn) <= MAX_SAFE_INTEGER) {
      r = intPow(Ctor, x, k, pr);
      return y.s < 0 ? new Ctor(1).div(r) : finalise(r, pr, rm);
    }
    s = x.s;
    if (s < 0) {
      if (e < y.d.length - 1) return new Ctor(NaN);
      if ((y.d[e] & 1) == 0) s = 1;
      if (x.e == 0 && x.d[0] == 1 && x.d.length == 1) {
        x.s = s;
        return x;
      }
    }
    k = mathpow(+x, yn);
    e = k == 0 || !isFinite(k) ? mathfloor(yn * (Math.log("0." + digitsToString(x.d)) / Math.LN10 + x.e + 1)) : new Ctor(k + "").e;
    if (e > Ctor.maxE + 1 || e < Ctor.minE - 1) return new Ctor(e > 0 ? s / 0 : 0);
    external = false;
    Ctor.rounding = x.s = 1;
    k = Math.min(12, (e + "").length);
    r = naturalExponential(y.times(naturalLogarithm(x, pr + k)), pr);
    if (r.d) {
      r = finalise(r, pr + 5, 1);
      if (checkRoundingDigits(r.d, pr, rm)) {
        e = pr + 10;
        r = finalise(naturalExponential(y.times(naturalLogarithm(x, e + k)), e), e + 5, 1);
        if (+digitsToString(r.d).slice(pr + 1, pr + 15) + 1 == 1e14) {
          r = finalise(r, pr + 1, 0);
        }
      }
    }
    r.s = s;
    external = true;
    Ctor.rounding = rm;
    return finalise(r, pr, rm);
  };
  P.toPrecision = function(sd, rm) {
    var str, x = this, Ctor = x.constructor;
    if (sd === void 0) {
      str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    } else {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
      x = finalise(new Ctor(x), sd, rm);
      str = finiteToString(x, sd <= x.e || x.e <= Ctor.toExpNeg, sd);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toSignificantDigits = P.toSD = function(sd, rm) {
    var x = this, Ctor = x.constructor;
    if (sd === void 0) {
      sd = Ctor.precision;
      rm = Ctor.rounding;
    } else {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
    }
    return finalise(new Ctor(x), sd, rm);
  };
  P.toString = function() {
    var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.truncated = P.trunc = function() {
    return finalise(new this.constructor(this), this.e + 1, 1);
  };
  P.valueOf = P.toJSON = function() {
    var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    return x.isNeg() ? "-" + str : str;
  };
  function digitsToString(d) {
    var i, k, ws, indexOfLastWord = d.length - 1, str = "", w = d[0];
    if (indexOfLastWord > 0) {
      str += w;
      for (i = 1; i < indexOfLastWord; i++) {
        ws = d[i] + "";
        k = LOG_BASE - ws.length;
        if (k) str += getZeroString(k);
        str += ws;
      }
      w = d[i];
      ws = w + "";
      k = LOG_BASE - ws.length;
      if (k) str += getZeroString(k);
    } else if (w === 0) {
      return "0";
    }
    for (; w % 10 === 0; ) w /= 10;
    return str + w;
  }
  function checkInt32(i, min2, max2) {
    if (i !== ~~i || i < min2 || i > max2) {
      throw Error(invalidArgument + i);
    }
  }
  function checkRoundingDigits(d, i, rm, repeating) {
    var di, k, r, rd;
    for (k = d[0]; k >= 10; k /= 10) --i;
    if (--i < 0) {
      i += LOG_BASE;
      di = 0;
    } else {
      di = Math.ceil((i + 1) / LOG_BASE);
      i %= LOG_BASE;
    }
    k = mathpow(10, LOG_BASE - i);
    rd = d[di] % k | 0;
    if (repeating == null) {
      if (i < 3) {
        if (i == 0) rd = rd / 100 | 0;
        else if (i == 1) rd = rd / 10 | 0;
        r = rm < 4 && rd == 99999 || rm > 3 && rd == 49999 || rd == 5e4 || rd == 0;
      } else {
        r = (rm < 4 && rd + 1 == k || rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 100 | 0) == mathpow(10, i - 2) - 1 || (rd == k / 2 || rd == 0) && (d[di + 1] / k / 100 | 0) == 0;
      }
    } else {
      if (i < 4) {
        if (i == 0) rd = rd / 1e3 | 0;
        else if (i == 1) rd = rd / 100 | 0;
        else if (i == 2) rd = rd / 10 | 0;
        r = (repeating || rm < 4) && rd == 9999 || !repeating && rm > 3 && rd == 4999;
      } else {
        r = ((repeating || rm < 4) && rd + 1 == k || !repeating && rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 1e3 | 0) == mathpow(10, i - 3) - 1;
      }
    }
    return r;
  }
  function convertBase(str, baseIn, baseOut) {
    var j, arr = [0], arrL, i = 0, strL = str.length;
    for (; i < strL; ) {
      for (arrL = arr.length; arrL--; ) arr[arrL] *= baseIn;
      arr[0] += NUMERALS.indexOf(str.charAt(i++));
      for (j = 0; j < arr.length; j++) {
        if (arr[j] > baseOut - 1) {
          if (arr[j + 1] === void 0) arr[j + 1] = 0;
          arr[j + 1] += arr[j] / baseOut | 0;
          arr[j] %= baseOut;
        }
      }
    }
    return arr.reverse();
  }
  function cosine(Ctor, x) {
    var k, len, y;
    if (x.isZero()) return x;
    len = x.d.length;
    if (len < 32) {
      k = Math.ceil(len / 3);
      y = (1 / tinyPow(4, k)).toString();
    } else {
      k = 16;
      y = "2.3283064365386962890625e-10";
    }
    Ctor.precision += k;
    x = taylorSeries(Ctor, 1, x.times(y), new Ctor(1));
    for (var i = k; i--; ) {
      var cos2x = x.times(x);
      x = cos2x.times(cos2x).minus(cos2x).times(8).plus(1);
    }
    Ctor.precision -= k;
    return x;
  }
  var divide = /* @__PURE__ */ (function() {
    function multiplyInteger(x, k, base) {
      var temp, carry = 0, i = x.length;
      for (x = x.slice(); i--; ) {
        temp = x[i] * k + carry;
        x[i] = temp % base | 0;
        carry = temp / base | 0;
      }
      if (carry) x.unshift(carry);
      return x;
    }
    function compare(a, b, aL, bL) {
      var i, r;
      if (aL != bL) {
        r = aL > bL ? 1 : -1;
      } else {
        for (i = r = 0; i < aL; i++) {
          if (a[i] != b[i]) {
            r = a[i] > b[i] ? 1 : -1;
            break;
          }
        }
      }
      return r;
    }
    function subtract(a, b, aL, base) {
      var i = 0;
      for (; aL--; ) {
        a[aL] -= i;
        i = a[aL] < b[aL] ? 1 : 0;
        a[aL] = i * base + a[aL] - b[aL];
      }
      for (; !a[0] && a.length > 1; ) a.shift();
    }
    return function(x, y, pr, rm, dp, base) {
      var cmp, e, i, k, logBase, more, prod, prodL, q, qd, rem, remL, rem0, sd, t, xi, xL, yd0, yL, yz, Ctor = x.constructor, sign2 = x.s == y.s ? 1 : -1, xd = x.d, yd = y.d;
      if (!xd || !xd[0] || !yd || !yd[0]) {
        return new Ctor(
          // Return NaN if either NaN, or both Infinity or 0.
          !x.s || !y.s || (xd ? yd && xd[0] == yd[0] : !yd) ? NaN : (
            // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
            xd && xd[0] == 0 || !yd ? sign2 * 0 : sign2 / 0
          )
        );
      }
      if (base) {
        logBase = 1;
        e = x.e - y.e;
      } else {
        base = BASE;
        logBase = LOG_BASE;
        e = mathfloor(x.e / logBase) - mathfloor(y.e / logBase);
      }
      yL = yd.length;
      xL = xd.length;
      q = new Ctor(sign2);
      qd = q.d = [];
      for (i = 0; yd[i] == (xd[i] || 0); i++) ;
      if (yd[i] > (xd[i] || 0)) e--;
      if (pr == null) {
        sd = pr = Ctor.precision;
        rm = Ctor.rounding;
      } else if (dp) {
        sd = pr + (x.e - y.e) + 1;
      } else {
        sd = pr;
      }
      if (sd < 0) {
        qd.push(1);
        more = true;
      } else {
        sd = sd / logBase + 2 | 0;
        i = 0;
        if (yL == 1) {
          k = 0;
          yd = yd[0];
          sd++;
          for (; (i < xL || k) && sd--; i++) {
            t = k * base + (xd[i] || 0);
            qd[i] = t / yd | 0;
            k = t % yd | 0;
          }
          more = k || i < xL;
        } else {
          k = base / (yd[0] + 1) | 0;
          if (k > 1) {
            yd = multiplyInteger(yd, k, base);
            xd = multiplyInteger(xd, k, base);
            yL = yd.length;
            xL = xd.length;
          }
          xi = yL;
          rem = xd.slice(0, yL);
          remL = rem.length;
          for (; remL < yL; ) rem[remL++] = 0;
          yz = yd.slice();
          yz.unshift(0);
          yd0 = yd[0];
          if (yd[1] >= base / 2) ++yd0;
          do {
            k = 0;
            cmp = compare(yd, rem, yL, remL);
            if (cmp < 0) {
              rem0 = rem[0];
              if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);
              k = rem0 / yd0 | 0;
              if (k > 1) {
                if (k >= base) k = base - 1;
                prod = multiplyInteger(yd, k, base);
                prodL = prod.length;
                remL = rem.length;
                cmp = compare(prod, rem, prodL, remL);
                if (cmp == 1) {
                  k--;
                  subtract(prod, yL < prodL ? yz : yd, prodL, base);
                }
              } else {
                if (k == 0) cmp = k = 1;
                prod = yd.slice();
              }
              prodL = prod.length;
              if (prodL < remL) prod.unshift(0);
              subtract(rem, prod, remL, base);
              if (cmp == -1) {
                remL = rem.length;
                cmp = compare(yd, rem, yL, remL);
                if (cmp < 1) {
                  k++;
                  subtract(rem, yL < remL ? yz : yd, remL, base);
                }
              }
              remL = rem.length;
            } else if (cmp === 0) {
              k++;
              rem = [0];
            }
            qd[i++] = k;
            if (cmp && rem[0]) {
              rem[remL++] = xd[xi] || 0;
            } else {
              rem = [xd[xi]];
              remL = 1;
            }
          } while ((xi++ < xL || rem[0] !== void 0) && sd--);
          more = rem[0] !== void 0;
        }
        if (!qd[0]) qd.shift();
      }
      if (logBase == 1) {
        q.e = e;
        inexact = more;
      } else {
        for (i = 1, k = qd[0]; k >= 10; k /= 10) i++;
        q.e = i + e * logBase - 1;
        finalise(q, dp ? pr + q.e + 1 : pr, rm, more);
      }
      return q;
    };
  })();
  function finalise(x, sd, rm, isTruncated) {
    var digits, i, j, k, rd, roundUp, w, xd, xdi, Ctor = x.constructor;
    out: if (sd != null) {
      xd = x.d;
      if (!xd) return x;
      for (digits = 1, k = xd[0]; k >= 10; k /= 10) digits++;
      i = sd - digits;
      if (i < 0) {
        i += LOG_BASE;
        j = sd;
        w = xd[xdi = 0];
        rd = w / mathpow(10, digits - j - 1) % 10 | 0;
      } else {
        xdi = Math.ceil((i + 1) / LOG_BASE);
        k = xd.length;
        if (xdi >= k) {
          if (isTruncated) {
            for (; k++ <= xdi; ) xd.push(0);
            w = rd = 0;
            digits = 1;
            i %= LOG_BASE;
            j = i - LOG_BASE + 1;
          } else {
            break out;
          }
        } else {
          w = k = xd[xdi];
          for (digits = 1; k >= 10; k /= 10) digits++;
          i %= LOG_BASE;
          j = i - LOG_BASE + digits;
          rd = j < 0 ? 0 : w / mathpow(10, digits - j - 1) % 10 | 0;
        }
      }
      isTruncated = isTruncated || sd < 0 || xd[xdi + 1] !== void 0 || (j < 0 ? w : w % mathpow(10, digits - j - 1));
      roundUp = rm < 4 ? (rd || isTruncated) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : rd > 5 || rd == 5 && (rm == 4 || isTruncated || rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
      (i > 0 ? j > 0 ? w / mathpow(10, digits - j) : 0 : xd[xdi - 1]) % 10 & 1 || rm == (x.s < 0 ? 8 : 7));
      if (sd < 1 || !xd[0]) {
        xd.length = 0;
        if (roundUp) {
          sd -= x.e + 1;
          xd[0] = mathpow(10, (LOG_BASE - sd % LOG_BASE) % LOG_BASE);
          x.e = -sd || 0;
        } else {
          xd[0] = x.e = 0;
        }
        return x;
      }
      if (i == 0) {
        xd.length = xdi;
        k = 1;
        xdi--;
      } else {
        xd.length = xdi + 1;
        k = mathpow(10, LOG_BASE - i);
        xd[xdi] = j > 0 ? (w / mathpow(10, digits - j) % mathpow(10, j) | 0) * k : 0;
      }
      if (roundUp) {
        for (; ; ) {
          if (xdi == 0) {
            for (i = 1, j = xd[0]; j >= 10; j /= 10) i++;
            j = xd[0] += k;
            for (k = 1; j >= 10; j /= 10) k++;
            if (i != k) {
              x.e++;
              if (xd[0] == BASE) xd[0] = 1;
            }
            break;
          } else {
            xd[xdi] += k;
            if (xd[xdi] != BASE) break;
            xd[xdi--] = 0;
            k = 1;
          }
        }
      }
      for (i = xd.length; xd[--i] === 0; ) xd.pop();
    }
    if (external) {
      if (x.e > Ctor.maxE) {
        x.d = null;
        x.e = NaN;
      } else if (x.e < Ctor.minE) {
        x.e = 0;
        x.d = [0];
      }
    }
    return x;
  }
  function finiteToString(x, isExp, sd) {
    if (!x.isFinite()) return nonFiniteToString(x);
    var k, e = x.e, str = digitsToString(x.d), len = str.length;
    if (isExp) {
      if (sd && (k = sd - len) > 0) {
        str = str.charAt(0) + "." + str.slice(1) + getZeroString(k);
      } else if (len > 1) {
        str = str.charAt(0) + "." + str.slice(1);
      }
      str = str + (x.e < 0 ? "e" : "e+") + x.e;
    } else if (e < 0) {
      str = "0." + getZeroString(-e - 1) + str;
      if (sd && (k = sd - len) > 0) str += getZeroString(k);
    } else if (e >= len) {
      str += getZeroString(e + 1 - len);
      if (sd && (k = sd - e - 1) > 0) str = str + "." + getZeroString(k);
    } else {
      if ((k = e + 1) < len) str = str.slice(0, k) + "." + str.slice(k);
      if (sd && (k = sd - len) > 0) {
        if (e + 1 === len) str += ".";
        str += getZeroString(k);
      }
    }
    return str;
  }
  function getBase10Exponent(digits, e) {
    var w = digits[0];
    for (e *= LOG_BASE; w >= 10; w /= 10) e++;
    return e;
  }
  function getLn10(Ctor, sd, pr) {
    if (sd > LN10_PRECISION) {
      external = true;
      if (pr) Ctor.precision = pr;
      throw Error(precisionLimitExceeded);
    }
    return finalise(new Ctor(LN10), sd, 1, true);
  }
  function getPi(Ctor, sd, rm) {
    if (sd > PI_PRECISION) throw Error(precisionLimitExceeded);
    return finalise(new Ctor(PI), sd, rm, true);
  }
  function getPrecision(digits) {
    var w = digits.length - 1, len = w * LOG_BASE + 1;
    w = digits[w];
    if (w) {
      for (; w % 10 == 0; w /= 10) len--;
      for (w = digits[0]; w >= 10; w /= 10) len++;
    }
    return len;
  }
  function getZeroString(k) {
    var zs = "";
    for (; k--; ) zs += "0";
    return zs;
  }
  function intPow(Ctor, x, n, pr) {
    var isTruncated, r = new Ctor(1), k = Math.ceil(pr / LOG_BASE + 4);
    external = false;
    for (; ; ) {
      if (n % 2) {
        r = r.times(x);
        if (truncate(r.d, k)) isTruncated = true;
      }
      n = mathfloor(n / 2);
      if (n === 0) {
        n = r.d.length - 1;
        if (isTruncated && r.d[n] === 0) ++r.d[n];
        break;
      }
      x = x.times(x);
      truncate(x.d, k);
    }
    external = true;
    return r;
  }
  function isOdd(n) {
    return n.d[n.d.length - 1] & 1;
  }
  function maxOrMin(Ctor, args, n) {
    var k, y, x = new Ctor(args[0]), i = 0;
    for (; ++i < args.length; ) {
      y = new Ctor(args[i]);
      if (!y.s) {
        x = y;
        break;
      }
      k = x.cmp(y);
      if (k === n || k === 0 && x.s === n) {
        x = y;
      }
    }
    return x;
  }
  function naturalExponential(x, sd) {
    var denominator, guard, j, pow2, sum2, t, wpr, rep = 0, i = 0, k = 0, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
    if (!x.d || !x.d[0] || x.e > 17) {
      return new Ctor(x.d ? !x.d[0] ? 1 : x.s < 0 ? 0 : 1 / 0 : x.s ? x.s < 0 ? 0 : x : 0 / 0);
    }
    if (sd == null) {
      external = false;
      wpr = pr;
    } else {
      wpr = sd;
    }
    t = new Ctor(0.03125);
    while (x.e > -2) {
      x = x.times(t);
      k += 5;
    }
    guard = Math.log(mathpow(2, k)) / Math.LN10 * 2 + 5 | 0;
    wpr += guard;
    denominator = pow2 = sum2 = new Ctor(1);
    Ctor.precision = wpr;
    for (; ; ) {
      pow2 = finalise(pow2.times(x), wpr, 1);
      denominator = denominator.times(++i);
      t = sum2.plus(divide(pow2, denominator, wpr, 1));
      if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum2.d).slice(0, wpr)) {
        j = k;
        while (j--) sum2 = finalise(sum2.times(sum2), wpr, 1);
        if (sd == null) {
          if (rep < 3 && checkRoundingDigits(sum2.d, wpr - guard, rm, rep)) {
            Ctor.precision = wpr += 10;
            denominator = pow2 = t = new Ctor(1);
            i = 0;
            rep++;
          } else {
            return finalise(sum2, Ctor.precision = pr, rm, external = true);
          }
        } else {
          Ctor.precision = pr;
          return sum2;
        }
      }
      sum2 = t;
    }
  }
  function naturalLogarithm(y, sd) {
    var c, c0, denominator, e, numerator, rep, sum2, t, wpr, x1, x2, n = 1, guard = 10, x = y, xd = x.d, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
    if (x.s < 0 || !xd || !xd[0] || !x.e && xd[0] == 1 && xd.length == 1) {
      return new Ctor(xd && !xd[0] ? -1 / 0 : x.s != 1 ? NaN : xd ? 0 : x);
    }
    if (sd == null) {
      external = false;
      wpr = pr;
    } else {
      wpr = sd;
    }
    Ctor.precision = wpr += guard;
    c = digitsToString(xd);
    c0 = c.charAt(0);
    if (Math.abs(e = x.e) < 15e14) {
      while (c0 < 7 && c0 != 1 || c0 == 1 && c.charAt(1) > 3) {
        x = x.times(y);
        c = digitsToString(x.d);
        c0 = c.charAt(0);
        n++;
      }
      e = x.e;
      if (c0 > 1) {
        x = new Ctor("0." + c);
        e++;
      } else {
        x = new Ctor(c0 + "." + c.slice(1));
      }
    } else {
      t = getLn10(Ctor, wpr + 2, pr).times(e + "");
      x = naturalLogarithm(new Ctor(c0 + "." + c.slice(1)), wpr - guard).plus(t);
      Ctor.precision = pr;
      return sd == null ? finalise(x, pr, rm, external = true) : x;
    }
    x1 = x;
    sum2 = numerator = x = divide(x.minus(1), x.plus(1), wpr, 1);
    x2 = finalise(x.times(x), wpr, 1);
    denominator = 3;
    for (; ; ) {
      numerator = finalise(numerator.times(x2), wpr, 1);
      t = sum2.plus(divide(numerator, new Ctor(denominator), wpr, 1));
      if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum2.d).slice(0, wpr)) {
        sum2 = sum2.times(2);
        if (e !== 0) sum2 = sum2.plus(getLn10(Ctor, wpr + 2, pr).times(e + ""));
        sum2 = divide(sum2, new Ctor(n), wpr, 1);
        if (sd == null) {
          if (checkRoundingDigits(sum2.d, wpr - guard, rm, rep)) {
            Ctor.precision = wpr += guard;
            t = numerator = x = divide(x1.minus(1), x1.plus(1), wpr, 1);
            x2 = finalise(x.times(x), wpr, 1);
            denominator = rep = 1;
          } else {
            return finalise(sum2, Ctor.precision = pr, rm, external = true);
          }
        } else {
          Ctor.precision = pr;
          return sum2;
        }
      }
      sum2 = t;
      denominator += 2;
    }
  }
  function nonFiniteToString(x) {
    return String(x.s * x.s / 0);
  }
  function parseDecimal(x, str) {
    var e, i, len;
    if ((e = str.indexOf(".")) > -1) str = str.replace(".", "");
    if ((i = str.search(/e/i)) > 0) {
      if (e < 0) e = i;
      e += +str.slice(i + 1);
      str = str.substring(0, i);
    } else if (e < 0) {
      e = str.length;
    }
    for (i = 0; str.charCodeAt(i) === 48; i++) ;
    for (len = str.length; str.charCodeAt(len - 1) === 48; --len) ;
    str = str.slice(i, len);
    if (str) {
      len -= i;
      x.e = e = e - i - 1;
      x.d = [];
      i = (e + 1) % LOG_BASE;
      if (e < 0) i += LOG_BASE;
      if (i < len) {
        if (i) x.d.push(+str.slice(0, i));
        for (len -= LOG_BASE; i < len; ) x.d.push(+str.slice(i, i += LOG_BASE));
        str = str.slice(i);
        i = LOG_BASE - str.length;
      } else {
        i -= len;
      }
      for (; i--; ) str += "0";
      x.d.push(+str);
      if (external) {
        if (x.e > x.constructor.maxE) {
          x.d = null;
          x.e = NaN;
        } else if (x.e < x.constructor.minE) {
          x.e = 0;
          x.d = [0];
        }
      }
    } else {
      x.e = 0;
      x.d = [0];
    }
    return x;
  }
  function parseOther(x, str) {
    var base, Ctor, divisor, i, isFloat, len, p, xd, xe;
    if (str.indexOf("_") > -1) {
      str = str.replace(/(\d)_(?=\d)/g, "$1");
      if (isDecimal.test(str)) return parseDecimal(x, str);
    } else if (str === "Infinity" || str === "NaN") {
      if (!+str) x.s = NaN;
      x.e = NaN;
      x.d = null;
      return x;
    }
    if (isHex.test(str)) {
      base = 16;
      str = str.toLowerCase();
    } else if (isBinary.test(str)) {
      base = 2;
    } else if (isOctal.test(str)) {
      base = 8;
    } else {
      throw Error(invalidArgument + str);
    }
    i = str.search(/p/i);
    if (i > 0) {
      p = +str.slice(i + 1);
      str = str.substring(2, i);
    } else {
      str = str.slice(2);
    }
    i = str.indexOf(".");
    isFloat = i >= 0;
    Ctor = x.constructor;
    if (isFloat) {
      str = str.replace(".", "");
      len = str.length;
      i = len - i;
      divisor = intPow(Ctor, new Ctor(base), i, i * 2);
    }
    xd = convertBase(str, base, BASE);
    xe = xd.length - 1;
    for (i = xe; xd[i] === 0; --i) xd.pop();
    if (i < 0) return new Ctor(x.s * 0);
    x.e = getBase10Exponent(xd, xe);
    x.d = xd;
    external = false;
    if (isFloat) x = divide(x, divisor, len * 4);
    if (p) x = x.times(Math.abs(p) < 54 ? mathpow(2, p) : Decimal.pow(2, p));
    external = true;
    return x;
  }
  function sine(Ctor, x) {
    var k, len = x.d.length;
    if (len < 3) {
      return x.isZero() ? x : taylorSeries(Ctor, 2, x, x);
    }
    k = 1.4 * Math.sqrt(len);
    k = k > 16 ? 16 : k | 0;
    x = x.times(1 / tinyPow(5, k));
    x = taylorSeries(Ctor, 2, x, x);
    var sin2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
    for (; k--; ) {
      sin2_x = x.times(x);
      x = x.times(d5.plus(sin2_x.times(d16.times(sin2_x).minus(d20))));
    }
    return x;
  }
  function taylorSeries(Ctor, n, x, y, isHyperbolic) {
    var j, t, u, x2, i = 1, pr = Ctor.precision, k = Math.ceil(pr / LOG_BASE);
    external = false;
    x2 = x.times(x);
    u = new Ctor(y);
    for (; ; ) {
      t = divide(u.times(x2), new Ctor(n++ * n++), pr, 1);
      u = isHyperbolic ? y.plus(t) : y.minus(t);
      y = divide(t.times(x2), new Ctor(n++ * n++), pr, 1);
      t = u.plus(y);
      if (t.d[k] !== void 0) {
        for (j = k; t.d[j] === u.d[j] && j--; ) ;
        if (j == -1) break;
      }
      j = u;
      u = y;
      y = t;
      t = j;
      i++;
    }
    external = true;
    t.d.length = k + 1;
    return t;
  }
  function tinyPow(b, e) {
    var n = b;
    while (--e) n *= b;
    return n;
  }
  function toLessThanHalfPi(Ctor, x) {
    var t, isNeg = x.s < 0, pi = getPi(Ctor, Ctor.precision, 1), halfPi = pi.times(0.5);
    x = x.abs();
    if (x.lte(halfPi)) {
      quadrant = isNeg ? 4 : 1;
      return x;
    }
    t = x.divToInt(pi);
    if (t.isZero()) {
      quadrant = isNeg ? 3 : 2;
    } else {
      x = x.minus(t.times(pi));
      if (x.lte(halfPi)) {
        quadrant = isOdd(t) ? isNeg ? 2 : 3 : isNeg ? 4 : 1;
        return x;
      }
      quadrant = isOdd(t) ? isNeg ? 1 : 4 : isNeg ? 3 : 2;
    }
    return x.minus(pi).abs();
  }
  function toStringBinary(x, baseOut, sd, rm) {
    var base, e, i, k, len, roundUp, str, xd, y, Ctor = x.constructor, isExp = sd !== void 0;
    if (isExp) {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
    } else {
      sd = Ctor.precision;
      rm = Ctor.rounding;
    }
    if (!x.isFinite()) {
      str = nonFiniteToString(x);
    } else {
      str = finiteToString(x);
      i = str.indexOf(".");
      if (isExp) {
        base = 2;
        if (baseOut == 16) {
          sd = sd * 4 - 3;
        } else if (baseOut == 8) {
          sd = sd * 3 - 2;
        }
      } else {
        base = baseOut;
      }
      if (i >= 0) {
        str = str.replace(".", "");
        y = new Ctor(1);
        y.e = str.length - i;
        y.d = convertBase(finiteToString(y), 10, base);
        y.e = y.d.length;
      }
      xd = convertBase(str, 10, base);
      e = len = xd.length;
      for (; xd[--len] == 0; ) xd.pop();
      if (!xd[0]) {
        str = isExp ? "0p+0" : "0";
      } else {
        if (i < 0) {
          e--;
        } else {
          x = new Ctor(x);
          x.d = xd;
          x.e = e;
          x = divide(x, y, sd, rm, 0, base);
          xd = x.d;
          e = x.e;
          roundUp = inexact;
        }
        i = xd[sd];
        k = base / 2;
        roundUp = roundUp || xd[sd + 1] !== void 0;
        roundUp = rm < 4 ? (i !== void 0 || roundUp) && (rm === 0 || rm === (x.s < 0 ? 3 : 2)) : i > k || i === k && (rm === 4 || roundUp || rm === 6 && xd[sd - 1] & 1 || rm === (x.s < 0 ? 8 : 7));
        xd.length = sd;
        if (roundUp) {
          for (; ++xd[--sd] > base - 1; ) {
            xd[sd] = 0;
            if (!sd) {
              ++e;
              xd.unshift(1);
            }
          }
        }
        for (len = xd.length; !xd[len - 1]; --len) ;
        for (i = 0, str = ""; i < len; i++) str += NUMERALS.charAt(xd[i]);
        if (isExp) {
          if (len > 1) {
            if (baseOut == 16 || baseOut == 8) {
              i = baseOut == 16 ? 4 : 3;
              for (--len; len % i; len++) str += "0";
              xd = convertBase(str, base, baseOut);
              for (len = xd.length; !xd[len - 1]; --len) ;
              for (i = 1, str = "1."; i < len; i++) str += NUMERALS.charAt(xd[i]);
            } else {
              str = str.charAt(0) + "." + str.slice(1);
            }
          }
          str = str + (e < 0 ? "p" : "p+") + e;
        } else if (e < 0) {
          for (; ++e; ) str = "0" + str;
          str = "0." + str;
        } else {
          if (++e > len) for (e -= len; e--; ) str += "0";
          else if (e < len) str = str.slice(0, e) + "." + str.slice(e);
        }
      }
      str = (baseOut == 16 ? "0x" : baseOut == 2 ? "0b" : baseOut == 8 ? "0o" : "") + str;
    }
    return x.s < 0 ? "-" + str : str;
  }
  function truncate(arr, len) {
    if (arr.length > len) {
      arr.length = len;
      return true;
    }
  }
  function abs(x) {
    return new this(x).abs();
  }
  function acos(x) {
    return new this(x).acos();
  }
  function acosh(x) {
    return new this(x).acosh();
  }
  function add(x, y) {
    return new this(x).plus(y);
  }
  function asin(x) {
    return new this(x).asin();
  }
  function asinh(x) {
    return new this(x).asinh();
  }
  function atan(x) {
    return new this(x).atan();
  }
  function atanh(x) {
    return new this(x).atanh();
  }
  function atan2(y, x) {
    y = new this(y);
    x = new this(x);
    var r, pr = this.precision, rm = this.rounding, wpr = pr + 4;
    if (!y.s || !x.s) {
      r = new this(NaN);
    } else if (!y.d && !x.d) {
      r = getPi(this, wpr, 1).times(x.s > 0 ? 0.25 : 0.75);
      r.s = y.s;
    } else if (!x.d || y.isZero()) {
      r = x.s < 0 ? getPi(this, pr, rm) : new this(0);
      r.s = y.s;
    } else if (!y.d || x.isZero()) {
      r = getPi(this, wpr, 1).times(0.5);
      r.s = y.s;
    } else if (x.s < 0) {
      this.precision = wpr;
      this.rounding = 1;
      r = this.atan(divide(y, x, wpr, 1));
      x = getPi(this, wpr, 1);
      this.precision = pr;
      this.rounding = rm;
      r = y.s < 0 ? r.minus(x) : r.plus(x);
    } else {
      r = this.atan(divide(y, x, wpr, 1));
    }
    return r;
  }
  function cbrt(x) {
    return new this(x).cbrt();
  }
  function ceil(x) {
    return finalise(x = new this(x), x.e + 1, 2);
  }
  function clamp(x, min2, max2) {
    return new this(x).clamp(min2, max2);
  }
  function config(obj) {
    if (!obj || typeof obj !== "object") throw Error(decimalError + "Object expected");
    var i, p, v, useDefaults = obj.defaults === true, ps = [
      "precision",
      1,
      MAX_DIGITS,
      "rounding",
      0,
      8,
      "toExpNeg",
      -EXP_LIMIT,
      0,
      "toExpPos",
      0,
      EXP_LIMIT,
      "maxE",
      0,
      EXP_LIMIT,
      "minE",
      -EXP_LIMIT,
      0,
      "modulo",
      0,
      9
    ];
    for (i = 0; i < ps.length; i += 3) {
      if (p = ps[i], useDefaults) this[p] = DEFAULTS[p];
      if ((v = obj[p]) !== void 0) {
        if (mathfloor(v) === v && v >= ps[i + 1] && v <= ps[i + 2]) this[p] = v;
        else throw Error(invalidArgument + p + ": " + v);
      }
    }
    if (p = "crypto", useDefaults) this[p] = DEFAULTS[p];
    if ((v = obj[p]) !== void 0) {
      if (v === true || v === false || v === 0 || v === 1) {
        if (v) {
          if (typeof crypto != "undefined" && crypto && (crypto.getRandomValues || crypto.randomBytes)) {
            this[p] = true;
          } else {
            throw Error(cryptoUnavailable);
          }
        } else {
          this[p] = false;
        }
      } else {
        throw Error(invalidArgument + p + ": " + v);
      }
    }
    return this;
  }
  function cos(x) {
    return new this(x).cos();
  }
  function cosh(x) {
    return new this(x).cosh();
  }
  function clone(obj) {
    var i, p, ps;
    function Decimal2(v) {
      var e, i2, t, x = this;
      if (!(x instanceof Decimal2)) return new Decimal2(v);
      x.constructor = Decimal2;
      if (isDecimalInstance(v)) {
        x.s = v.s;
        if (external) {
          if (!v.d || v.e > Decimal2.maxE) {
            x.e = NaN;
            x.d = null;
          } else if (v.e < Decimal2.minE) {
            x.e = 0;
            x.d = [0];
          } else {
            x.e = v.e;
            x.d = v.d.slice();
          }
        } else {
          x.e = v.e;
          x.d = v.d ? v.d.slice() : v.d;
        }
        return;
      }
      t = typeof v;
      if (t === "number") {
        if (v === 0) {
          x.s = 1 / v < 0 ? -1 : 1;
          x.e = 0;
          x.d = [0];
          return;
        }
        if (v < 0) {
          v = -v;
          x.s = -1;
        } else {
          x.s = 1;
        }
        if (v === ~~v && v < 1e7) {
          for (e = 0, i2 = v; i2 >= 10; i2 /= 10) e++;
          if (external) {
            if (e > Decimal2.maxE) {
              x.e = NaN;
              x.d = null;
            } else if (e < Decimal2.minE) {
              x.e = 0;
              x.d = [0];
            } else {
              x.e = e;
              x.d = [v];
            }
          } else {
            x.e = e;
            x.d = [v];
          }
          return;
        }
        if (v * 0 !== 0) {
          if (!v) x.s = NaN;
          x.e = NaN;
          x.d = null;
          return;
        }
        return parseDecimal(x, v.toString());
      }
      if (t === "string") {
        if ((i2 = v.charCodeAt(0)) === 45) {
          v = v.slice(1);
          x.s = -1;
        } else {
          if (i2 === 43) v = v.slice(1);
          x.s = 1;
        }
        return isDecimal.test(v) ? parseDecimal(x, v) : parseOther(x, v);
      }
      if (t === "bigint") {
        if (v < 0) {
          v = -v;
          x.s = -1;
        } else {
          x.s = 1;
        }
        return parseDecimal(x, v.toString());
      }
      throw Error(invalidArgument + v);
    }
    Decimal2.prototype = P;
    Decimal2.ROUND_UP = 0;
    Decimal2.ROUND_DOWN = 1;
    Decimal2.ROUND_CEIL = 2;
    Decimal2.ROUND_FLOOR = 3;
    Decimal2.ROUND_HALF_UP = 4;
    Decimal2.ROUND_HALF_DOWN = 5;
    Decimal2.ROUND_HALF_EVEN = 6;
    Decimal2.ROUND_HALF_CEIL = 7;
    Decimal2.ROUND_HALF_FLOOR = 8;
    Decimal2.EUCLID = 9;
    Decimal2.config = Decimal2.set = config;
    Decimal2.clone = clone;
    Decimal2.isDecimal = isDecimalInstance;
    Decimal2.abs = abs;
    Decimal2.acos = acos;
    Decimal2.acosh = acosh;
    Decimal2.add = add;
    Decimal2.asin = asin;
    Decimal2.asinh = asinh;
    Decimal2.atan = atan;
    Decimal2.atanh = atanh;
    Decimal2.atan2 = atan2;
    Decimal2.cbrt = cbrt;
    Decimal2.ceil = ceil;
    Decimal2.clamp = clamp;
    Decimal2.cos = cos;
    Decimal2.cosh = cosh;
    Decimal2.div = div;
    Decimal2.exp = exp;
    Decimal2.floor = floor;
    Decimal2.hypot = hypot;
    Decimal2.ln = ln;
    Decimal2.log = log;
    Decimal2.log10 = log10;
    Decimal2.log2 = log2;
    Decimal2.max = max;
    Decimal2.min = min;
    Decimal2.mod = mod;
    Decimal2.mul = mul;
    Decimal2.pow = pow;
    Decimal2.random = random;
    Decimal2.round = round;
    Decimal2.sign = sign;
    Decimal2.sin = sin;
    Decimal2.sinh = sinh;
    Decimal2.sqrt = sqrt;
    Decimal2.sub = sub;
    Decimal2.sum = sum;
    Decimal2.tan = tan;
    Decimal2.tanh = tanh;
    Decimal2.trunc = trunc;
    if (obj === void 0) obj = {};
    if (obj) {
      if (obj.defaults !== true) {
        ps = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"];
        for (i = 0; i < ps.length; ) if (!obj.hasOwnProperty(p = ps[i++])) obj[p] = this[p];
      }
    }
    Decimal2.config(obj);
    return Decimal2;
  }
  function div(x, y) {
    return new this(x).div(y);
  }
  function exp(x) {
    return new this(x).exp();
  }
  function floor(x) {
    return finalise(x = new this(x), x.e + 1, 3);
  }
  function hypot() {
    var i, n, t = new this(0);
    external = false;
    for (i = 0; i < arguments.length; ) {
      n = new this(arguments[i++]);
      if (!n.d) {
        if (n.s) {
          external = true;
          return new this(1 / 0);
        }
        t = n;
      } else if (t.d) {
        t = t.plus(n.times(n));
      }
    }
    external = true;
    return t.sqrt();
  }
  function isDecimalInstance(obj) {
    return obj instanceof Decimal || obj && obj.toStringTag === tag || false;
  }
  function ln(x) {
    return new this(x).ln();
  }
  function log(x, y) {
    return new this(x).log(y);
  }
  function log2(x) {
    return new this(x).log(2);
  }
  function log10(x) {
    return new this(x).log(10);
  }
  function max() {
    return maxOrMin(this, arguments, -1);
  }
  function min() {
    return maxOrMin(this, arguments, 1);
  }
  function mod(x, y) {
    return new this(x).mod(y);
  }
  function mul(x, y) {
    return new this(x).mul(y);
  }
  function pow(x, y) {
    return new this(x).pow(y);
  }
  function random(sd) {
    var d, e, k, n, i = 0, r = new this(1), rd = [];
    if (sd === void 0) sd = this.precision;
    else checkInt32(sd, 1, MAX_DIGITS);
    k = Math.ceil(sd / LOG_BASE);
    if (!this.crypto) {
      for (; i < k; ) rd[i++] = Math.random() * 1e7 | 0;
    } else if (crypto.getRandomValues) {
      d = crypto.getRandomValues(new Uint32Array(k));
      for (; i < k; ) {
        n = d[i];
        if (n >= 429e7) {
          d[i] = crypto.getRandomValues(new Uint32Array(1))[0];
        } else {
          rd[i++] = n % 1e7;
        }
      }
    } else if (crypto.randomBytes) {
      d = crypto.randomBytes(k *= 4);
      for (; i < k; ) {
        n = d[i] + (d[i + 1] << 8) + (d[i + 2] << 16) + ((d[i + 3] & 127) << 24);
        if (n >= 214e7) {
          crypto.randomBytes(4).copy(d, i);
        } else {
          rd.push(n % 1e7);
          i += 4;
        }
      }
      i = k / 4;
    } else {
      throw Error(cryptoUnavailable);
    }
    k = rd[--i];
    sd %= LOG_BASE;
    if (k && sd) {
      n = mathpow(10, LOG_BASE - sd);
      rd[i] = (k / n | 0) * n;
    }
    for (; rd[i] === 0; i--) rd.pop();
    if (i < 0) {
      e = 0;
      rd = [0];
    } else {
      e = -1;
      for (; rd[0] === 0; e -= LOG_BASE) rd.shift();
      for (k = 1, n = rd[0]; n >= 10; n /= 10) k++;
      if (k < LOG_BASE) e -= LOG_BASE - k;
    }
    r.e = e;
    r.d = rd;
    return r;
  }
  function round(x) {
    return finalise(x = new this(x), x.e + 1, this.rounding);
  }
  function sign(x) {
    x = new this(x);
    return x.d ? x.d[0] ? x.s : 0 * x.s : x.s || NaN;
  }
  function sin(x) {
    return new this(x).sin();
  }
  function sinh(x) {
    return new this(x).sinh();
  }
  function sqrt(x) {
    return new this(x).sqrt();
  }
  function sub(x, y) {
    return new this(x).sub(y);
  }
  function sum() {
    var i = 0, args = arguments, x = new this(args[i]);
    external = false;
    for (; x.s && ++i < args.length; ) x = x.plus(args[i]);
    external = true;
    return finalise(x, this.precision, this.rounding);
  }
  function tan(x) {
    return new this(x).tan();
  }
  function tanh(x) {
    return new this(x).tanh();
  }
  function trunc(x) {
    return finalise(x = new this(x), x.e + 1, 1);
  }
  P[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = P.toString;
  P[Symbol.toStringTag] = "Decimal";
  var Decimal = P.constructor = clone(DEFAULTS);
  LN10 = new Decimal(LN10);
  PI = new Decimal(PI);
  var decimal_default = Decimal;

  // vendor/lohnsteuerrechner/dist/chunk-WBDRFOIQ.js
  var INPUT_DEFAULTS = {
    af: 1,
    AJAHR: 0,
    ALTER1: 0,
    ALV: 0,
    f: 1,
    JFREIB: 0,
    JHINZU: 0,
    JRE4: 0,
    JRE4ENT: 0,
    JVBEZ: 0,
    KRV: 0,
    KVZ: 0,
    LZZ: 1,
    LZZFREIB: 0,
    LZZHINZU: 0,
    MBV: 0,
    PKPV: 0,
    PKPVAGZ: 0,
    PKV: 0,
    PVA: 0,
    PVS: 0,
    PVZ: 0,
    R: 0,
    RE4: 0,
    SONSTB: 0,
    SONSTENT: 0,
    STERBE: 0,
    STKL: 1,
    VBEZ: 0,
    VBEZM: 0,
    VBEZS: 0,
    VBS: 0,
    VJAHR: 0,
    ZKF: 0,
    ZMVB: 0
  };
  var STANDARD_OUTPUT_NAMES = [
    "BK",
    "BKS",
    "LSTLZZ",
    "SOLZLZZ",
    "SOLZS",
    "STS"
  ];
  var DBA_OUTPUT_NAMES = [
    "VFRB",
    "VFRBS1",
    "VFRBS2",
    "WVFRB",
    "WVFRBO",
    "WVFRBM"
  ];
  var ALL_OUTPUT_NAMES = [
    ...STANDARD_OUTPUT_NAMES,
    ...DBA_OUTPUT_NAMES
  ];
  var Pap2025 = class {
    // -------------------------------------------------------------------------
    // Inputs: BigDecimal type -> Decimal
    // -------------------------------------------------------------------------
    RE4 = new decimal_default(0);
    VBEZ = new decimal_default(0);
    VBEZM = new decimal_default(0);
    VBEZS = new decimal_default(0);
    VBS = new decimal_default(0);
    LZZFREIB = new decimal_default(0);
    LZZHINZU = new decimal_default(0);
    JFREIB = new decimal_default(0);
    JHINZU = new decimal_default(0);
    JRE4 = new decimal_default(0);
    JRE4ENT = new decimal_default(0);
    JVBEZ = new decimal_default(0);
    SONSTB = new decimal_default(0);
    SONSTENT = new decimal_default(0);
    STERBE = new decimal_default(0);
    KVZ = new decimal_default(0);
    PVA = new decimal_default(0);
    PKPV = new decimal_default(0);
    MBV = new decimal_default(0);
    ZKF = new decimal_default(0);
    // -------------------------------------------------------------------------
    // Inputs: int type -> number
    // -------------------------------------------------------------------------
    af = 1;
    AJAHR = 0;
    ALTER1 = 0;
    KRV = 0;
    LZZ = 1;
    PKV = 0;
    PVS = 0;
    PVZ = 0;
    R = 0;
    STKL = 1;
    VJAHR = 0;
    ZMVB = 0;
    // -------------------------------------------------------------------------
    // Inputs: double type -> number
    // -------------------------------------------------------------------------
    f = 1;
    // -------------------------------------------------------------------------
    // Outputs: all BigDecimal -> Decimal
    // -------------------------------------------------------------------------
    BK = new decimal_default(0);
    BKS = new decimal_default(0);
    LSTLZZ = new decimal_default(0);
    SOLZLZZ = new decimal_default(0);
    SOLZS = new decimal_default(0);
    STS = new decimal_default(0);
    VFRB = new decimal_default(0);
    VFRBS1 = new decimal_default(0);
    VFRBS2 = new decimal_default(0);
    WVFRB = new decimal_default(0);
    WVFRBO = new decimal_default(0);
    WVFRBM = new decimal_default(0);
    // 2025-specific outputs (VKVLZZ and VKVSONST are not in LohnsteuerOutputs,
    // but are computed internally for the algorithm)
    VKVLZZ = new decimal_default(0);
    VKVSONST = new decimal_default(0);
    // -------------------------------------------------------------------------
    // Internals: BigDecimal -> Decimal
    // -------------------------------------------------------------------------
    ALTE = new decimal_default(0);
    ANP = new decimal_default(0);
    ANTEIL1 = new decimal_default(0);
    BBGKVPV = new decimal_default(0);
    BBGRV = new decimal_default(0);
    // 2025 uses BBGRV, not BBGRVALV
    BMG = new decimal_default(0);
    DIFF = new decimal_default(0);
    EFA = new decimal_default(0);
    FVB = new decimal_default(0);
    FVBSO = new decimal_default(0);
    FVBZ = new decimal_default(0);
    FVBZSO = new decimal_default(0);
    GFB = new decimal_default(0);
    HBALTE = new decimal_default(0);
    HFVB = new decimal_default(0);
    HFVBZ = new decimal_default(0);
    HFVBZSO = new decimal_default(0);
    HOCH = new decimal_default(0);
    JBMG = new decimal_default(0);
    JLFREIB = new decimal_default(0);
    JLHINZU = new decimal_default(0);
    JW = new decimal_default(0);
    KFB = new decimal_default(0);
    KVSATZAG = new decimal_default(0);
    // 2025 only
    KVSATZAN = new decimal_default(0);
    LSTJAHR = new decimal_default(0);
    LSTOSO = new decimal_default(0);
    LSTSO = new decimal_default(0);
    MIST = new decimal_default(0);
    PVSATZAG = new decimal_default(0);
    // 2025 only
    PVSATZAN = new decimal_default(0);
    RVSATZAN = new decimal_default(0);
    RW = new decimal_default(0);
    SAP = new decimal_default(0);
    SOLZFREI = new decimal_default(0);
    SOLZJ = new decimal_default(0);
    SOLZMIN = new decimal_default(0);
    SOLZSBMG = new decimal_default(0);
    SOLZSZVE = new decimal_default(0);
    SOLZVBMG = new decimal_default(0);
    // 2025 only
    ST = new decimal_default(0);
    ST1 = new decimal_default(0);
    ST2 = new decimal_default(0);
    VBEZB = new decimal_default(0);
    VBEZBSO = new decimal_default(0);
    VERGL = new decimal_default(0);
    VHB = new decimal_default(0);
    // 2025 only
    VKV = new decimal_default(0);
    // 2025 only
    VSP = new decimal_default(0);
    VSPN = new decimal_default(0);
    VSP1 = new decimal_default(0);
    // 2025 only (replaces VSPR)
    VSP2 = new decimal_default(0);
    // 2025 only (replaces VSPKVPV)
    VSP3 = new decimal_default(0);
    // 2025 only
    W1STKL5 = new decimal_default(0);
    W2STKL5 = new decimal_default(0);
    W3STKL5 = new decimal_default(0);
    X = new decimal_default(0);
    Y = new decimal_default(0);
    ZRE4 = new decimal_default(0);
    ZRE4J = new decimal_default(0);
    ZRE4VP = new decimal_default(0);
    ZTABFB = new decimal_default(0);
    ZVBEZ = new decimal_default(0);
    ZVBEZJ = new decimal_default(0);
    ZVE = new decimal_default(0);
    ZX = new decimal_default(0);
    ZZX = new decimal_default(0);
    // -------------------------------------------------------------------------
    // Internals: int -> number
    // -------------------------------------------------------------------------
    J = 0;
    K = 0;
    KZTAB = 0;
    // -------------------------------------------------------------------------
    // Constants: TAB1-TAB5 (index 0..54) -- IDENTICAL to 2026
    // -------------------------------------------------------------------------
    TAB1 = [
      new decimal_default(0),
      new decimal_default("0.4"),
      new decimal_default("0.384"),
      new decimal_default("0.368"),
      new decimal_default("0.352"),
      new decimal_default("0.336"),
      new decimal_default("0.32"),
      new decimal_default("0.304"),
      new decimal_default("0.288"),
      new decimal_default("0.272"),
      new decimal_default("0.256"),
      new decimal_default("0.24"),
      new decimal_default("0.224"),
      new decimal_default("0.208"),
      new decimal_default("0.192"),
      new decimal_default("0.176"),
      new decimal_default("0.16"),
      new decimal_default("0.152"),
      new decimal_default("0.144"),
      new decimal_default("0.14"),
      new decimal_default("0.136"),
      new decimal_default("0.132"),
      new decimal_default("0.128"),
      new decimal_default("0.124"),
      new decimal_default("0.12"),
      new decimal_default("0.116"),
      new decimal_default("0.112"),
      new decimal_default("0.108"),
      new decimal_default("0.104"),
      new decimal_default("0.1"),
      new decimal_default("0.096"),
      new decimal_default("0.092"),
      new decimal_default("0.088"),
      new decimal_default("0.084"),
      new decimal_default("0.08"),
      new decimal_default("0.076"),
      new decimal_default("0.072"),
      new decimal_default("0.068"),
      new decimal_default("0.064"),
      new decimal_default("0.06"),
      new decimal_default("0.056"),
      new decimal_default("0.052"),
      new decimal_default("0.048"),
      new decimal_default("0.044"),
      new decimal_default("0.04"),
      new decimal_default("0.036"),
      new decimal_default("0.032"),
      new decimal_default("0.028"),
      new decimal_default("0.024"),
      new decimal_default("0.02"),
      new decimal_default("0.016"),
      new decimal_default("0.012"),
      new decimal_default("0.008"),
      new decimal_default("0.004"),
      new decimal_default(0)
    ];
    TAB2 = [
      new decimal_default(0),
      new decimal_default(3e3),
      new decimal_default(2880),
      new decimal_default(2760),
      new decimal_default(2640),
      new decimal_default(2520),
      new decimal_default(2400),
      new decimal_default(2280),
      new decimal_default(2160),
      new decimal_default(2040),
      new decimal_default(1920),
      new decimal_default(1800),
      new decimal_default(1680),
      new decimal_default(1560),
      new decimal_default(1440),
      new decimal_default(1320),
      new decimal_default(1200),
      new decimal_default(1140),
      new decimal_default(1080),
      new decimal_default(1050),
      new decimal_default(1020),
      new decimal_default(990),
      new decimal_default(960),
      new decimal_default(930),
      new decimal_default(900),
      new decimal_default(870),
      new decimal_default(840),
      new decimal_default(810),
      new decimal_default(780),
      new decimal_default(750),
      new decimal_default(720),
      new decimal_default(690),
      new decimal_default(660),
      new decimal_default(630),
      new decimal_default(600),
      new decimal_default(570),
      new decimal_default(540),
      new decimal_default(510),
      new decimal_default(480),
      new decimal_default(450),
      new decimal_default(420),
      new decimal_default(390),
      new decimal_default(360),
      new decimal_default(330),
      new decimal_default(300),
      new decimal_default(270),
      new decimal_default(240),
      new decimal_default(210),
      new decimal_default(180),
      new decimal_default(150),
      new decimal_default(120),
      new decimal_default(90),
      new decimal_default(60),
      new decimal_default(30),
      new decimal_default(0)
    ];
    TAB3 = [
      new decimal_default(0),
      new decimal_default(900),
      new decimal_default(864),
      new decimal_default(828),
      new decimal_default(792),
      new decimal_default(756),
      new decimal_default(720),
      new decimal_default(684),
      new decimal_default(648),
      new decimal_default(612),
      new decimal_default(576),
      new decimal_default(540),
      new decimal_default(504),
      new decimal_default(468),
      new decimal_default(432),
      new decimal_default(396),
      new decimal_default(360),
      new decimal_default(342),
      new decimal_default(324),
      new decimal_default(315),
      new decimal_default(306),
      new decimal_default(297),
      new decimal_default(288),
      new decimal_default(279),
      new decimal_default(270),
      new decimal_default(261),
      new decimal_default(252),
      new decimal_default(243),
      new decimal_default(234),
      new decimal_default(225),
      new decimal_default(216),
      new decimal_default(207),
      new decimal_default(198),
      new decimal_default(189),
      new decimal_default(180),
      new decimal_default(171),
      new decimal_default(162),
      new decimal_default(153),
      new decimal_default(144),
      new decimal_default(135),
      new decimal_default(126),
      new decimal_default(117),
      new decimal_default(108),
      new decimal_default(99),
      new decimal_default(90),
      new decimal_default(81),
      new decimal_default(72),
      new decimal_default(63),
      new decimal_default(54),
      new decimal_default(45),
      new decimal_default(36),
      new decimal_default(27),
      new decimal_default(18),
      new decimal_default(9),
      new decimal_default(0)
    ];
    TAB4 = [
      new decimal_default(0),
      new decimal_default("0.4"),
      new decimal_default("0.384"),
      new decimal_default("0.368"),
      new decimal_default("0.352"),
      new decimal_default("0.336"),
      new decimal_default("0.32"),
      new decimal_default("0.304"),
      new decimal_default("0.288"),
      new decimal_default("0.272"),
      new decimal_default("0.256"),
      new decimal_default("0.24"),
      new decimal_default("0.224"),
      new decimal_default("0.208"),
      new decimal_default("0.192"),
      new decimal_default("0.176"),
      new decimal_default("0.16"),
      new decimal_default("0.152"),
      new decimal_default("0.144"),
      new decimal_default("0.14"),
      new decimal_default("0.136"),
      new decimal_default("0.132"),
      new decimal_default("0.128"),
      new decimal_default("0.124"),
      new decimal_default("0.12"),
      new decimal_default("0.116"),
      new decimal_default("0.112"),
      new decimal_default("0.108"),
      new decimal_default("0.104"),
      new decimal_default("0.1"),
      new decimal_default("0.096"),
      new decimal_default("0.092"),
      new decimal_default("0.088"),
      new decimal_default("0.084"),
      new decimal_default("0.08"),
      new decimal_default("0.076"),
      new decimal_default("0.072"),
      new decimal_default("0.068"),
      new decimal_default("0.064"),
      new decimal_default("0.06"),
      new decimal_default("0.056"),
      new decimal_default("0.052"),
      new decimal_default("0.048"),
      new decimal_default("0.044"),
      new decimal_default("0.04"),
      new decimal_default("0.036"),
      new decimal_default("0.032"),
      new decimal_default("0.028"),
      new decimal_default("0.024"),
      new decimal_default("0.02"),
      new decimal_default("0.016"),
      new decimal_default("0.012"),
      new decimal_default("0.008"),
      new decimal_default("0.004"),
      new decimal_default(0)
    ];
    TAB5 = [
      new decimal_default(0),
      new decimal_default(1900),
      new decimal_default(1824),
      new decimal_default(1748),
      new decimal_default(1672),
      new decimal_default(1596),
      new decimal_default(1520),
      new decimal_default(1444),
      new decimal_default(1368),
      new decimal_default(1292),
      new decimal_default(1216),
      new decimal_default(1140),
      new decimal_default(1064),
      new decimal_default(988),
      new decimal_default(912),
      new decimal_default(836),
      new decimal_default(760),
      new decimal_default(722),
      new decimal_default(684),
      new decimal_default(665),
      new decimal_default(646),
      new decimal_default(627),
      new decimal_default(608),
      new decimal_default(589),
      new decimal_default(570),
      new decimal_default(551),
      new decimal_default(532),
      new decimal_default(513),
      new decimal_default(494),
      new decimal_default(475),
      new decimal_default(456),
      new decimal_default(437),
      new decimal_default(418),
      new decimal_default(399),
      new decimal_default(380),
      new decimal_default(361),
      new decimal_default(342),
      new decimal_default(323),
      new decimal_default(304),
      new decimal_default(285),
      new decimal_default(266),
      new decimal_default(247),
      new decimal_default(228),
      new decimal_default(209),
      new decimal_default(190),
      new decimal_default(171),
      new decimal_default(152),
      new decimal_default(133),
      new decimal_default(114),
      new decimal_default(95),
      new decimal_default(76),
      new decimal_default(57),
      new decimal_default(38),
      new decimal_default(19),
      new decimal_default(0)
    ];
    // -------------------------------------------------------------------------
    // ZAHL constants
    // -------------------------------------------------------------------------
    ZAHL1 = new decimal_default(1);
    ZAHL2 = new decimal_default(2);
    ZAHL5 = new decimal_default(5);
    ZAHL7 = new decimal_default(7);
    ZAHL12 = new decimal_default(12);
    ZAHL100 = new decimal_default(100);
    ZAHL360 = new decimal_default(360);
    ZAHL500 = new decimal_default(500);
    ZAHL700 = new decimal_default(700);
    ZAHL1000 = new decimal_default(1e3);
    ZAHL10000 = new decimal_default(1e4);
    // =========================================================================
    // Public API
    // =========================================================================
    setInputs(inputs) {
      const merged = { ...INPUT_DEFAULTS, ...inputs };
      this.RE4 = new decimal_default(merged.RE4);
      this.VBEZ = new decimal_default(merged.VBEZ);
      this.VBEZM = new decimal_default(merged.VBEZM);
      this.VBEZS = new decimal_default(merged.VBEZS);
      this.VBS = new decimal_default(merged.VBS);
      this.LZZFREIB = new decimal_default(merged.LZZFREIB);
      this.LZZHINZU = new decimal_default(merged.LZZHINZU);
      this.JFREIB = new decimal_default(merged.JFREIB);
      this.JHINZU = new decimal_default(merged.JHINZU);
      this.JRE4 = new decimal_default(merged.JRE4);
      this.JRE4ENT = new decimal_default(merged.JRE4ENT);
      this.JVBEZ = new decimal_default(merged.JVBEZ);
      this.SONSTB = new decimal_default(merged.SONSTB);
      this.SONSTENT = new decimal_default(merged.SONSTENT);
      this.STERBE = new decimal_default(merged.STERBE);
      this.KVZ = new decimal_default(merged.KVZ);
      this.PVA = new decimal_default(merged.PVA);
      this.PKPV = new decimal_default(merged.PKPV);
      this.MBV = new decimal_default(merged.MBV);
      this.ZKF = new decimal_default(merged.ZKF);
      this.af = merged.af;
      this.AJAHR = merged.AJAHR;
      this.ALTER1 = merged.ALTER1;
      this.KRV = merged.KRV;
      this.LZZ = merged.LZZ;
      this.PKV = merged.PKV;
      this.PVS = merged.PVS;
      this.PVZ = merged.PVZ;
      this.R = merged.R;
      this.STKL = merged.STKL;
      this.VJAHR = merged.VJAHR;
      this.ZMVB = merged.ZMVB;
      this.f = merged.f;
      this.BK = new decimal_default(0);
      this.BKS = new decimal_default(0);
      this.LSTLZZ = new decimal_default(0);
      this.SOLZLZZ = new decimal_default(0);
      this.SOLZS = new decimal_default(0);
      this.STS = new decimal_default(0);
      this.VFRB = new decimal_default(0);
      this.VFRBS1 = new decimal_default(0);
      this.VFRBS2 = new decimal_default(0);
      this.WVFRB = new decimal_default(0);
      this.WVFRBO = new decimal_default(0);
      this.WVFRBM = new decimal_default(0);
      this.VKVLZZ = new decimal_default(0);
      this.VKVSONST = new decimal_default(0);
      this.ALTE = new decimal_default(0);
      this.ANP = new decimal_default(0);
      this.ANTEIL1 = new decimal_default(0);
      this.BBGKVPV = new decimal_default(0);
      this.BBGRV = new decimal_default(0);
      this.BMG = new decimal_default(0);
      this.DIFF = new decimal_default(0);
      this.EFA = new decimal_default(0);
      this.FVB = new decimal_default(0);
      this.FVBSO = new decimal_default(0);
      this.FVBZ = new decimal_default(0);
      this.FVBZSO = new decimal_default(0);
      this.GFB = new decimal_default(0);
      this.HBALTE = new decimal_default(0);
      this.HFVB = new decimal_default(0);
      this.HFVBZ = new decimal_default(0);
      this.HFVBZSO = new decimal_default(0);
      this.HOCH = new decimal_default(0);
      this.J = 0;
      this.JBMG = new decimal_default(0);
      this.JLFREIB = new decimal_default(0);
      this.JLHINZU = new decimal_default(0);
      this.JW = new decimal_default(0);
      this.K = 0;
      this.KFB = new decimal_default(0);
      this.KVSATZAG = new decimal_default(0);
      this.KVSATZAN = new decimal_default(0);
      this.KZTAB = 0;
      this.LSTJAHR = new decimal_default(0);
      this.LSTOSO = new decimal_default(0);
      this.LSTSO = new decimal_default(0);
      this.MIST = new decimal_default(0);
      this.PVSATZAG = new decimal_default(0);
      this.PVSATZAN = new decimal_default(0);
      this.RVSATZAN = new decimal_default(0);
      this.RW = new decimal_default(0);
      this.SAP = new decimal_default(0);
      this.SOLZFREI = new decimal_default(0);
      this.SOLZJ = new decimal_default(0);
      this.SOLZMIN = new decimal_default(0);
      this.SOLZSBMG = new decimal_default(0);
      this.SOLZSZVE = new decimal_default(0);
      this.SOLZVBMG = new decimal_default(0);
      this.ST = new decimal_default(0);
      this.ST1 = new decimal_default(0);
      this.ST2 = new decimal_default(0);
      this.VBEZB = new decimal_default(0);
      this.VBEZBSO = new decimal_default(0);
      this.VERGL = new decimal_default(0);
      this.VHB = new decimal_default(0);
      this.VKV = new decimal_default(0);
      this.VSP = new decimal_default(0);
      this.VSPN = new decimal_default(0);
      this.VSP1 = new decimal_default(0);
      this.VSP2 = new decimal_default(0);
      this.VSP3 = new decimal_default(0);
      this.W1STKL5 = new decimal_default(0);
      this.W2STKL5 = new decimal_default(0);
      this.W3STKL5 = new decimal_default(0);
      this.X = new decimal_default(0);
      this.Y = new decimal_default(0);
      this.ZRE4 = new decimal_default(0);
      this.ZRE4J = new decimal_default(0);
      this.ZRE4VP = new decimal_default(0);
      this.ZTABFB = new decimal_default(0);
      this.ZVBEZ = new decimal_default(0);
      this.ZVBEZJ = new decimal_default(0);
      this.ZVE = new decimal_default(0);
      this.ZX = new decimal_default(0);
      this.ZZX = new decimal_default(0);
    }
    calculate() {
      this.MPARA();
      this.MRE4JL();
      this.VBEZBSO = new decimal_default(0);
      this.MRE4();
      this.MRE4ABZ();
      this.MBERECH();
      this.MSONST();
    }
    getOutputs() {
      return {
        BK: this.BK.trunc().toNumber(),
        BKS: this.BKS.trunc().toNumber(),
        LSTLZZ: this.LSTLZZ.trunc().toNumber(),
        SOLZLZZ: this.SOLZLZZ.trunc().toNumber(),
        SOLZS: this.SOLZS.trunc().toNumber(),
        STS: this.STS.trunc().toNumber(),
        VFRB: this.VFRB.trunc().toNumber(),
        VFRBS1: this.VFRBS1.trunc().toNumber(),
        VFRBS2: this.VFRBS2.trunc().toNumber(),
        WVFRB: this.WVFRB.trunc().toNumber(),
        WVFRBO: this.WVFRBO.trunc().toNumber(),
        WVFRBM: this.WVFRBM.trunc().toNumber()
      };
    }
    // =========================================================================
    // PAP Methods
    // =========================================================================
    /**
     * Zuweisung von Werten für bestimmte Sozialversicherungsparameter
     * PAP Seite 14
     *
     * DIFFERS FROM 2026: Conditional BBGRV/RVSATZAN (behind KRV check);
     * uses KVSATZAG/PVSATZAG; different constant values.
     */
    MPARA() {
      if (this.KRV < 1) {
        this.BBGRV = new decimal_default(96600);
        this.RVSATZAN = new decimal_default("0.093");
      }
      this.BBGKVPV = new decimal_default(66150);
      this.KVSATZAN = this.KVZ.div(this.ZAHL2).div(this.ZAHL100).plus(new decimal_default("0.07"));
      this.KVSATZAG = new decimal_default("0.0125").plus(new decimal_default("0.07"));
      if (this.PVS === 1) {
        this.PVSATZAN = new decimal_default("0.023");
        this.PVSATZAG = new decimal_default("0.013");
      } else {
        this.PVSATZAN = new decimal_default("0.018");
        this.PVSATZAG = new decimal_default("0.018");
      }
      if (this.PVZ === 1) {
        this.PVSATZAN = this.PVSATZAN.plus(new decimal_default("0.006"));
      } else {
        this.PVSATZAN = this.PVSATZAN.minus(this.PVA.times(new decimal_default("0.0025")));
      }
      this.W1STKL5 = new decimal_default(13785);
      this.W2STKL5 = new decimal_default(34240);
      this.W3STKL5 = new decimal_default(222260);
      this.GFB = new decimal_default(12096);
      this.SOLZFREI = new decimal_default(19950);
    }
    /**
     * Ermittlung des Jahresarbeitslohns nach § 39 b Abs. 2 Satz 2 EStG
     * PAP Seite 15 -- IDENTICAL to 2026
     */
    MRE4JL() {
      if (this.LZZ === 1) {
        this.ZRE4J = this.RE4.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      } else if (this.LZZ === 2) {
        this.ZRE4J = this.RE4.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      } else if (this.LZZ === 3) {
        this.ZRE4J = this.RE4.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
      } else {
        this.ZRE4J = this.RE4.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      }
      if (this.af === 0) {
        this.f = 1;
      }
    }
    /**
     * Freibeträge für Versorgungsbezüge, Altersentlastungsbetrag
     * (§ 39b Abs. 2 Satz 3 EStG)
     * PAP Seite 16 -- IDENTICAL to 2026
     */
    MRE4() {
      if (this.ZVBEZJ.cmp(new decimal_default(0)) === 0) {
        this.FVBZ = new decimal_default(0);
        this.FVB = new decimal_default(0);
        this.FVBZSO = new decimal_default(0);
        this.FVBSO = new decimal_default(0);
      } else {
        if (this.VJAHR < 2006) {
          this.J = 1;
        } else if (this.VJAHR < 2058) {
          this.J = this.VJAHR - 2004;
        } else {
          this.J = 54;
        }
        if (this.LZZ === 1) {
          this.VBEZB = this.VBEZM.times(new decimal_default(this.ZMVB)).plus(this.VBEZS);
          this.HFVB = this.TAB2[this.J].div(this.ZAHL12).times(new decimal_default(this.ZMVB)).toDP(0, decimal_default.ROUND_UP);
          this.FVBZ = this.TAB3[this.J].div(this.ZAHL12).times(new decimal_default(this.ZMVB)).toDP(0, decimal_default.ROUND_UP);
        } else {
          this.VBEZB = this.VBEZM.times(this.ZAHL12).plus(this.VBEZS).toDP(2, decimal_default.ROUND_DOWN);
          this.HFVB = this.TAB2[this.J];
          this.FVBZ = this.TAB3[this.J];
        }
        this.FVB = this.VBEZB.times(this.TAB1[this.J]).div(this.ZAHL100).toDP(2, decimal_default.ROUND_UP);
        if (this.FVB.cmp(this.HFVB) === 1) {
          this.FVB = this.HFVB;
        }
        if (this.FVB.cmp(this.ZVBEZJ) === 1) {
          this.FVB = this.ZVBEZJ;
        }
        this.FVBSO = this.FVB.plus(this.VBEZBSO.times(this.TAB1[this.J]).div(this.ZAHL100)).toDP(2, decimal_default.ROUND_UP);
        if (this.FVBSO.cmp(this.TAB2[this.J]) === 1) {
          this.FVBSO = this.TAB2[this.J];
        }
        this.HFVBZSO = this.VBEZB.plus(this.VBEZBSO).div(this.ZAHL100).minus(this.FVBSO).toDP(2, decimal_default.ROUND_DOWN);
        this.FVBZSO = this.FVBZ.plus(this.VBEZBSO.div(this.ZAHL100)).toDP(0, decimal_default.ROUND_UP);
        if (this.FVBZSO.cmp(this.HFVBZSO) === 1) {
          this.FVBZSO = this.HFVBZSO.toDP(0, decimal_default.ROUND_UP);
        }
        if (this.FVBZSO.cmp(this.TAB3[this.J]) === 1) {
          this.FVBZSO = this.TAB3[this.J];
        }
        this.HFVBZ = this.VBEZB.div(this.ZAHL100).minus(this.FVB).toDP(2, decimal_default.ROUND_DOWN);
        if (this.FVBZ.cmp(this.HFVBZ) === 1) {
          this.FVBZ = this.HFVBZ.toDP(0, decimal_default.ROUND_UP);
        }
      }
      this.MRE4ALTE();
    }
    /**
     * Altersentlastungsbetrag (§ 39b Abs. 2 Satz 3 EStG)
     * PAP Seite 17 -- IDENTICAL to 2026
     */
    MRE4ALTE() {
      if (this.ALTER1 === 0) {
        this.ALTE = new decimal_default(0);
      } else {
        if (this.AJAHR < 2006) {
          this.K = 1;
        } else if (this.AJAHR < 2058) {
          this.K = this.AJAHR - 2004;
        } else {
          this.K = 54;
        }
        this.BMG = this.ZRE4J.minus(this.ZVBEZJ);
        this.ALTE = this.BMG.times(this.TAB4[this.K]).toDP(0, decimal_default.ROUND_UP);
        this.HBALTE = this.TAB5[this.K];
        if (this.ALTE.cmp(this.HBALTE) === 1) {
          this.ALTE = this.HBALTE;
        }
      }
    }
    /**
     * Ermittlung des Jahresarbeitslohns nach Abzug der Freibeträge
     * nach § 39 b Abs. 2 Satz 3 und 4 EStG
     * PAP Seite 20 -- IDENTICAL to 2026
     */
    MRE4ABZ() {
      this.ZRE4 = this.ZRE4J.minus(this.FVB).minus(this.ALTE).minus(this.JLFREIB).plus(this.JLHINZU).toDP(2, decimal_default.ROUND_DOWN);
      if (this.ZRE4.cmp(new decimal_default(0)) === -1) {
        this.ZRE4 = new decimal_default(0);
      }
      this.ZRE4VP = this.ZRE4J;
      this.ZVBEZ = this.ZVBEZJ.minus(this.FVB).toDP(2, decimal_default.ROUND_DOWN);
      if (this.ZVBEZ.cmp(new decimal_default(0)) === -1) {
        this.ZVBEZ = new decimal_default(0);
      }
    }
    /**
     * Berechnung fuer laufende Lohnzahlungszeitraueme
     * PAP Seite 21
     *
     * DIFFERS FROM 2026: Calls UPVKVLZZ after UPLSTLZZ
     */
    MBERECH() {
      this.MZTABFB();
      this.VFRB = this.ANP.plus(this.FVB.plus(this.FVBZ)).times(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
      this.MLSTJAHR();
      this.WVFRB = this.ZVE.minus(this.GFB).times(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
      if (this.WVFRB.cmp(new decimal_default(0)) === -1) {
        this.WVFRB = new decimal_default(0);
      }
      this.LSTJAHR = this.ST.times(new decimal_default(this.f)).toDP(0, decimal_default.ROUND_DOWN);
      this.UPLSTLZZ();
      this.UPVKVLZZ();
      if (this.ZKF.cmp(new decimal_default(0)) === 1) {
        this.ZTABFB = this.ZTABFB.plus(this.KFB);
        this.MRE4ABZ();
        this.MLSTJAHR();
        this.JBMG = this.ST.times(new decimal_default(this.f)).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.JBMG = this.LSTJAHR;
      }
      this.MSOLZ();
    }
    /**
     * Ermittlung der festen Tabellenfreibeträge (ohne Vorsorgepauschale)
     * PAP Seite 22
     *
     * DIFFERS FROM 2026: KFB multipliers are 9600/4800 (vs 9756/4878)
     */
    MZTABFB() {
      this.ANP = new decimal_default(0);
      if (this.ZVBEZ.cmp(new decimal_default(0)) >= 0 && this.ZVBEZ.cmp(this.FVBZ) === -1) {
        this.FVBZ = new decimal_default(this.ZVBEZ.trunc().toNumber());
      }
      if (this.STKL < 6) {
        if (this.ZVBEZ.cmp(new decimal_default(0)) === 1) {
          if (this.ZVBEZ.minus(this.FVBZ).cmp(new decimal_default(102)) === -1) {
            this.ANP = this.ZVBEZ.minus(this.FVBZ).toDP(0, decimal_default.ROUND_UP);
          } else {
            this.ANP = new decimal_default(102);
          }
        }
      } else {
        this.FVBZ = new decimal_default(0);
        this.FVBZSO = new decimal_default(0);
      }
      if (this.STKL < 6) {
        if (this.ZRE4.cmp(this.ZVBEZ) === 1) {
          if (this.ZRE4.minus(this.ZVBEZ).cmp(new decimal_default(1230)) === -1) {
            this.ANP = this.ANP.plus(this.ZRE4).minus(this.ZVBEZ).toDP(0, decimal_default.ROUND_UP);
          } else {
            this.ANP = this.ANP.plus(new decimal_default(1230));
          }
        }
      }
      this.KZTAB = 1;
      if (this.STKL === 1) {
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(9600)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 2) {
        this.EFA = new decimal_default(4260);
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(9600)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 3) {
        this.KZTAB = 2;
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(9600)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 4) {
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(4800)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 5) {
        this.SAP = new decimal_default(36);
        this.KFB = new decimal_default(0);
      } else {
        this.KFB = new decimal_default(0);
      }
      this.ZTABFB = this.EFA.plus(this.ANP).plus(this.SAP).plus(this.FVBZ).toDP(2, decimal_default.ROUND_DOWN);
    }
    /**
     * Ermittlung Jahreslohnsteuer
     * PAP Seite 23 -- IDENTICAL to 2026
     */
    MLSTJAHR() {
      this.UPEVP();
      this.ZVE = this.ZRE4.minus(this.ZTABFB).minus(this.VSP);
      this.UPMLST();
    }
    /**
     * PAP Seite 24 -- 2025 specific: UPVKVLZZ
     */
    UPVKVLZZ() {
      this.UPVKV();
      this.JW = this.VKV;
      this.UPANTEIL();
      this.VKVLZZ = this.ANTEIL1;
    }
    /**
     * PAP Seite 24 -- 2025 specific: UPVKV
     */
    UPVKV() {
      if (this.PKV > 0) {
        if (this.VSP2.cmp(this.VSP3) === 1) {
          this.VKV = this.VSP2.times(this.ZAHL100);
        } else {
          this.VKV = this.VSP3.times(this.ZAHL100);
        }
      } else {
        this.VKV = new decimal_default(0);
      }
    }
    /**
     * PAP Seite 25
     */
    UPLSTLZZ() {
      this.JW = this.LSTJAHR.times(this.ZAHL100);
      this.UPANTEIL();
      this.LSTLZZ = this.ANTEIL1;
    }
    /**
     * PAP Seite 26
     */
    UPMLST() {
      if (this.ZVE.cmp(this.ZAHL1) === -1) {
        this.ZVE = new decimal_default(0);
        this.X = new decimal_default(0);
      } else {
        this.X = this.ZVE.div(new decimal_default(this.KZTAB)).toDP(0, decimal_default.ROUND_DOWN);
      }
      if (this.STKL < 5) {
        this.UPTAB25();
      } else {
        this.MST5_6();
      }
    }
    /**
     * Vorsorgepauschale (§ 39b Absatz 2 Satz 5 Nummer 3 und Absatz 4 EStG)
     * PAP Seite 27
     *
     * DIFFERS FROM 2026: Completely different algorithm.
     * Uses VSP1/VSP2/VHB/VSPN and calls MVSP instead of
     * VSPR/VSPKVPV/MVSPKVPV/MVSPHB.
     */
    UPEVP() {
      if (this.KRV === 1) {
        this.VSP1 = new decimal_default(0);
      } else {
        if (this.ZRE4VP.cmp(this.BBGRV) === 1) {
          this.ZRE4VP = this.BBGRV;
        }
        this.VSP1 = this.ZRE4VP.times(this.RVSATZAN).toDP(2, decimal_default.ROUND_DOWN);
      }
      this.VSP2 = this.ZRE4VP.times(new decimal_default("0.12")).toDP(2, decimal_default.ROUND_DOWN);
      if (this.STKL === 3) {
        this.VHB = new decimal_default(3e3);
      } else {
        this.VHB = new decimal_default(1900);
      }
      if (this.VSP2.cmp(this.VHB) === 1) {
        this.VSP2 = this.VHB;
      }
      this.VSPN = this.VSP1.plus(this.VSP2).toDP(0, decimal_default.ROUND_UP);
      this.MVSP();
      if (this.VSPN.cmp(this.VSP) === 1) {
        this.VSP = this.VSPN.toDP(2, decimal_default.ROUND_DOWN);
      }
    }
    /**
     * Vorsorgepauschale (§39b Abs. 2 Satz 5 Nr 3 EStG) Vergleichsberechnung
     * fuer Guenstigerpruefung
     * PAP Seite 28
     *
     * DIFFERS FROM 2026: This method does not exist in 2026
     * (replaced by MVSPKVPV + MVSPHB).
     */
    MVSP() {
      if (this.ZRE4VP.cmp(this.BBGKVPV) === 1) {
        this.ZRE4VP = this.BBGKVPV;
      }
      if (this.PKV > 0) {
        if (this.STKL === 6) {
          this.VSP3 = new decimal_default(0);
        } else {
          this.VSP3 = this.PKPV.times(this.ZAHL12).div(this.ZAHL100);
          if (this.PKV === 2) {
            this.VSP3 = this.VSP3.minus(
              this.ZRE4VP.times(this.KVSATZAG.plus(this.PVSATZAG))
            ).toDP(2, decimal_default.ROUND_DOWN);
          }
        }
      } else {
        this.VSP3 = this.ZRE4VP.times(this.KVSATZAN.plus(this.PVSATZAN)).toDP(2, decimal_default.ROUND_DOWN);
      }
      this.VSP = this.VSP3.plus(this.VSP1).toDP(0, decimal_default.ROUND_UP);
    }
    /**
     * Lohnsteuer fuer die Steuerklassen V und VI (§ 39b Abs. 2 Satz 7 EStG)
     * PAP Seite 29 -- IDENTICAL to 2026
     */
    MST5_6() {
      this.ZZX = this.X;
      if (this.ZZX.cmp(this.W2STKL5) === 1) {
        this.ZX = this.W2STKL5;
        this.UP5_6();
        if (this.ZZX.cmp(this.W3STKL5) === 1) {
          this.ST = this.ST.plus(this.W3STKL5.minus(this.W2STKL5).times(new decimal_default("0.42"))).toDP(0, decimal_default.ROUND_DOWN);
          this.ST = this.ST.plus(this.ZZX.minus(this.W3STKL5).times(new decimal_default("0.45"))).toDP(0, decimal_default.ROUND_DOWN);
        } else {
          this.ST = this.ST.plus(this.ZZX.minus(this.W2STKL5).times(new decimal_default("0.42"))).toDP(0, decimal_default.ROUND_DOWN);
        }
      } else {
        this.ZX = this.ZZX;
        this.UP5_6();
        if (this.ZZX.cmp(this.W1STKL5) === 1) {
          this.VERGL = this.ST;
          this.ZX = this.W1STKL5;
          this.UP5_6();
          this.HOCH = this.ST.plus(this.ZZX.minus(this.W1STKL5).times(new decimal_default("0.42"))).toDP(0, decimal_default.ROUND_DOWN);
          if (this.HOCH.cmp(this.VERGL) === -1) {
            this.ST = this.HOCH;
          } else {
            this.ST = this.VERGL;
          }
        }
      }
    }
    /**
     * Unterprogramm zur Lohnsteuer fuer die Steuerklassen V und VI
     * (§ 39b Abs. 2 Satz 7 EStG)
     * PAP Seite 30
     *
     * DIFFERS FROM 2026: Uses setScale(2, ROUND_DOWN) for X instead of setScale(0, ROUND_DOWN)
     */
    UP5_6() {
      this.X = this.ZX.times(new decimal_default("1.25")).toDP(2, decimal_default.ROUND_DOWN);
      this.UPTAB25();
      this.ST1 = this.ST;
      this.X = this.ZX.times(new decimal_default("0.75")).toDP(2, decimal_default.ROUND_DOWN);
      this.UPTAB25();
      this.ST2 = this.ST;
      this.DIFF = this.ST1.minus(this.ST2).times(this.ZAHL2);
      this.MIST = this.ZX.times(new decimal_default("0.14")).toDP(0, decimal_default.ROUND_DOWN);
      if (this.MIST.cmp(this.DIFF) === 1) {
        this.ST = this.MIST;
      } else {
        this.ST = this.DIFF;
      }
    }
    /**
     * Solidaritaetszuschlag
     * PAP Seite 31 -- IDENTICAL to 2026
     */
    MSOLZ() {
      this.SOLZFREI = this.SOLZFREI.times(new decimal_default(this.KZTAB));
      if (this.JBMG.cmp(this.SOLZFREI) === 1) {
        this.SOLZJ = this.JBMG.times(new decimal_default("5.5")).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.SOLZMIN = this.JBMG.minus(this.SOLZFREI).times(new decimal_default("11.9")).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        if (this.SOLZMIN.cmp(this.SOLZJ) === -1) {
          this.SOLZJ = this.SOLZMIN;
        }
        this.JW = this.SOLZJ.times(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
        this.UPANTEIL();
        this.SOLZLZZ = this.ANTEIL1;
      } else {
        this.SOLZLZZ = new decimal_default(0);
      }
      if (this.R > 0) {
        this.JW = this.JBMG.times(this.ZAHL100);
        this.UPANTEIL();
        this.BK = this.ANTEIL1;
      } else {
        this.BK = new decimal_default(0);
      }
    }
    /**
     * Anteil von Jahresbetraegen fuer einen LZZ (§ 39b Abs. 2 Satz 9 EStG)
     * PAP Seite 32 -- IDENTICAL to 2026
     */
    UPANTEIL() {
      if (this.LZZ === 1) {
        this.ANTEIL1 = this.JW;
      } else if (this.LZZ === 2) {
        this.ANTEIL1 = this.JW.div(this.ZAHL12).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.LZZ === 3) {
        this.ANTEIL1 = this.JW.times(this.ZAHL7).div(this.ZAHL360).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.ANTEIL1 = this.JW.div(this.ZAHL360).toDP(0, decimal_default.ROUND_DOWN);
      }
    }
    /**
     * Berechnung sonstiger Bezuege nach § 39b Abs. 3 Saetze 1 bis 8 EStG
     * PAP Seite 33
     *
     * DIFFERS FROM 2026: Has VKVSONST/VKV handling and additional UPVKV calls
     */
    MSONST() {
      this.LZZ = 1;
      if (this.ZMVB === 0) {
        this.ZMVB = 12;
      }
      if (this.SONSTB.cmp(new decimal_default(0)) === 0 && this.MBV.cmp(new decimal_default(0)) === 0) {
        this.VKVSONST = new decimal_default(0);
        this.LSTSO = new decimal_default(0);
        this.STS = new decimal_default(0);
        this.SOLZS = new decimal_default(0);
        this.BKS = new decimal_default(0);
      } else {
        this.MOSONST();
        this.UPVKV();
        this.VKVSONST = this.VKV;
        this.ZRE4J = this.JRE4.plus(this.SONSTB).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.JVBEZ.plus(this.VBS).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.VBEZBSO = this.STERBE;
        this.MRE4SONST();
        this.MLSTJAHR();
        this.WVFRBM = this.ZVE.minus(this.GFB).times(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        if (this.WVFRBM.cmp(new decimal_default(0)) === -1) {
          this.WVFRBM = new decimal_default(0);
        }
        this.UPVKV();
        this.VKVSONST = this.VKV.minus(this.VKVSONST);
        this.LSTSO = this.ST.times(this.ZAHL100);
        this.STS = this.LSTSO.minus(this.LSTOSO).times(new decimal_default(this.f)).div(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN).times(this.ZAHL100);
        this.STSMIN();
      }
    }
    /**
     * PAP Seite 34 -- IDENTICAL to 2026
     */
    STSMIN() {
      if (this.STS.cmp(new decimal_default(0)) === -1) {
        if (this.MBV.cmp(new decimal_default(0)) === 0) {
        } else {
          this.LSTLZZ = this.LSTLZZ.plus(this.STS);
          if (this.LSTLZZ.cmp(new decimal_default(0)) === -1) {
            this.LSTLZZ = new decimal_default(0);
          }
          this.SOLZLZZ = this.SOLZLZZ.plus(this.STS.times(new decimal_default("5.5").div(this.ZAHL100))).toDP(0, decimal_default.ROUND_DOWN);
          if (this.SOLZLZZ.cmp(new decimal_default(0)) === -1) {
            this.SOLZLZZ = new decimal_default(0);
          }
          this.BK = this.BK.plus(this.STS);
          if (this.BK.cmp(new decimal_default(0)) === -1) {
            this.BK = new decimal_default(0);
          }
        }
        this.STS = new decimal_default(0);
        this.SOLZS = new decimal_default(0);
      } else {
        this.MSOLZSTS();
      }
      if (this.R > 0) {
        this.BKS = this.STS;
      } else {
        this.BKS = new decimal_default(0);
      }
    }
    /**
     * Berechnung des SolZ auf sonstige Bezüge
     * PAP Seite 35
     */
    MSOLZSTS() {
      if (this.ZKF.cmp(new decimal_default(0)) === 1) {
        this.SOLZSZVE = this.ZVE.minus(this.KFB);
      } else {
        this.SOLZSZVE = this.ZVE;
      }
      if (this.SOLZSZVE.cmp(new decimal_default(1)) === -1) {
        this.SOLZSZVE = new decimal_default(0);
        this.X = new decimal_default(0);
      } else {
        this.X = this.SOLZSZVE.div(new decimal_default(this.KZTAB)).toDP(0, decimal_default.ROUND_DOWN);
      }
      if (this.STKL < 5) {
        this.UPTAB25();
      } else {
        this.MST5_6();
      }
      this.SOLZSBMG = this.ST.times(new decimal_default(this.f)).toDP(0, decimal_default.ROUND_DOWN);
      if (this.SOLZSBMG.cmp(this.SOLZFREI) === 1) {
        this.SOLZS = this.STS.times(new decimal_default("5.5")).div(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.SOLZS = new decimal_default(0);
      }
    }
    /**
     * Sonderberechnung ohne sonstige Bezüge für Berechnung bei sonstigen Bezügen
     * PAP Seite 36 -- IDENTICAL to 2026
     */
    MOSONST() {
      this.ZRE4J = this.JRE4.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.ZVBEZJ = this.JVBEZ.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.JLFREIB = this.JFREIB.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.JLHINZU = this.JHINZU.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.MRE4();
      this.MRE4ABZ();
      this.ZRE4VP = this.ZRE4VP.minus(this.JRE4ENT.div(this.ZAHL100));
      this.MZTABFB();
      this.VFRBS1 = this.ANP.plus(this.FVB.plus(this.FVBZ)).times(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.MLSTJAHR();
      this.WVFRBO = this.ZVE.minus(this.GFB).times(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      if (this.WVFRBO.cmp(new decimal_default(0)) === -1) {
        this.WVFRBO = new decimal_default(0);
      }
      this.LSTOSO = this.ST.times(this.ZAHL100);
    }
    /**
     * Sonderberechnung mit sonstige Bezüge für Berechnung bei sonstigen Bezügen
     * PAP Seite 37 -- IDENTICAL to 2026
     */
    MRE4SONST() {
      this.MRE4();
      this.FVB = this.FVBSO;
      this.MRE4ABZ();
      this.ZRE4VP = this.ZRE4VP.plus(this.MBV.div(this.ZAHL100)).minus(this.JRE4ENT.div(this.ZAHL100)).minus(this.SONSTENT.div(this.ZAHL100));
      this.FVBZ = this.FVBZSO;
      this.MZTABFB();
      this.VFRBS2 = this.ANP.plus(this.FVB).plus(this.FVBZ).times(this.ZAHL100).minus(this.VFRBS1);
    }
    /**
     * Tarifliche Einkommensteuer §32a EStG
     * PAP Seite 38
     *
     * DIFFERS FROM 2026: Different thresholds and coefficients:
     * - Zone 2 upper:  17444 (2025) vs 17800 (2026)
     * - Zone 2 coeff:  932.30 (2025) vs 914.51 (2026)
     * - Zone 3 upper:  68481 (2025) vs 69879 (2026)
     * - Zone 3 base:   17443 (2025) vs 17799 (2026)
     * - Zone 3 coeff:  176.64 (2025) vs 173.1 (2026)
     * - Zone 3 const:  1015.13 (2025) vs 1034.87 (2026)
     * - Zone 4 const:  10911.92 (2025) vs 11135.63 (2026)
     * - Zone 5 const:  19246.67 (2025) vs 19470.38 (2026)
     * - Zone 4/5 boundary: 277826 (same both years)
     */
    UPTAB25() {
      if (this.X.cmp(this.GFB.plus(this.ZAHL1)) === -1) {
        this.ST = new decimal_default(0);
      } else if (this.X.cmp(new decimal_default(17444)) === -1) {
        this.Y = this.X.minus(this.GFB).div(this.ZAHL10000).toDP(6, decimal_default.ROUND_DOWN);
        this.RW = this.Y.times(new decimal_default("932.30"));
        this.RW = this.RW.plus(new decimal_default(1400));
        this.ST = this.RW.times(this.Y).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.X.cmp(new decimal_default(68481)) === -1) {
        this.Y = this.X.minus(new decimal_default(17443)).div(this.ZAHL10000).toDP(6, decimal_default.ROUND_DOWN);
        this.RW = this.Y.times(new decimal_default("176.64"));
        this.RW = this.RW.plus(new decimal_default(2397));
        this.RW = this.RW.times(this.Y);
        this.ST = this.RW.plus(new decimal_default("1015.13")).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.X.cmp(new decimal_default(277826)) === -1) {
        this.ST = this.X.times(new decimal_default("0.42")).minus(new decimal_default("10911.92")).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.ST = this.X.times(new decimal_default("0.45")).minus(new decimal_default("19246.67")).toDP(0, decimal_default.ROUND_DOWN);
      }
      this.ST = this.ST.times(new decimal_default(this.KZTAB));
    }
  };
  var Pap2026 = class {
    // -------------------------------------------------------------------------
    // Inputs: BigDecimal type -> Decimal
    // -------------------------------------------------------------------------
    RE4 = new decimal_default(0);
    VBEZ = new decimal_default(0);
    VBEZM = new decimal_default(0);
    VBEZS = new decimal_default(0);
    VBS = new decimal_default(0);
    LZZFREIB = new decimal_default(0);
    LZZHINZU = new decimal_default(0);
    JFREIB = new decimal_default(0);
    JHINZU = new decimal_default(0);
    JRE4 = new decimal_default(0);
    JRE4ENT = new decimal_default(0);
    JVBEZ = new decimal_default(0);
    SONSTB = new decimal_default(0);
    SONSTENT = new decimal_default(0);
    STERBE = new decimal_default(0);
    KVZ = new decimal_default(0);
    PVA = new decimal_default(0);
    PKPV = new decimal_default(0);
    PKPVAGZ = new decimal_default(0);
    MBV = new decimal_default(0);
    ZKF = new decimal_default(0);
    // -------------------------------------------------------------------------
    // Inputs: int type -> number
    // -------------------------------------------------------------------------
    af = 1;
    AJAHR = 0;
    ALTER1 = 0;
    ALV = 0;
    KRV = 0;
    LZZ = 1;
    PKV = 0;
    PVS = 0;
    PVZ = 0;
    R = 0;
    STKL = 1;
    VJAHR = 0;
    ZMVB = 0;
    // -------------------------------------------------------------------------
    // Inputs: double type -> number
    // -------------------------------------------------------------------------
    f = 1;
    // -------------------------------------------------------------------------
    // Outputs: all BigDecimal -> Decimal
    // -------------------------------------------------------------------------
    BK = new decimal_default(0);
    BKS = new decimal_default(0);
    LSTLZZ = new decimal_default(0);
    SOLZLZZ = new decimal_default(0);
    SOLZS = new decimal_default(0);
    STS = new decimal_default(0);
    VFRB = new decimal_default(0);
    VFRBS1 = new decimal_default(0);
    VFRBS2 = new decimal_default(0);
    WVFRB = new decimal_default(0);
    WVFRBO = new decimal_default(0);
    WVFRBM = new decimal_default(0);
    // -------------------------------------------------------------------------
    // Internals: BigDecimal -> Decimal
    // -------------------------------------------------------------------------
    ALTE = new decimal_default(0);
    ANP = new decimal_default(0);
    ANTEIL1 = new decimal_default(0);
    AVSATZAN = new decimal_default(0);
    BBGKVPV = new decimal_default(0);
    BBGRVALV = new decimal_default(0);
    BMG = new decimal_default(0);
    DIFF = new decimal_default(0);
    EFA = new decimal_default(0);
    FVB = new decimal_default(0);
    FVBSO = new decimal_default(0);
    FVBZ = new decimal_default(0);
    FVBZSO = new decimal_default(0);
    GFB = new decimal_default(0);
    HBALTE = new decimal_default(0);
    HFVB = new decimal_default(0);
    HFVBZ = new decimal_default(0);
    HFVBZSO = new decimal_default(0);
    HOCH = new decimal_default(0);
    JBMG = new decimal_default(0);
    JLFREIB = new decimal_default(0);
    JLHINZU = new decimal_default(0);
    JW = new decimal_default(0);
    KFB = new decimal_default(0);
    KVSATZAN = new decimal_default(0);
    LSTJAHR = new decimal_default(0);
    LSTOSO = new decimal_default(0);
    LSTSO = new decimal_default(0);
    MIST = new decimal_default(0);
    PKPVAGZJ = new decimal_default(0);
    PVSATZAN = new decimal_default(0);
    RVSATZAN = new decimal_default(0);
    RW = new decimal_default(0);
    SAP = new decimal_default(0);
    SOLZFREI = new decimal_default(0);
    SOLZJ = new decimal_default(0);
    SOLZMIN = new decimal_default(0);
    SOLZSBMG = new decimal_default(0);
    SOLZSZVE = new decimal_default(0);
    ST = new decimal_default(0);
    ST1 = new decimal_default(0);
    ST2 = new decimal_default(0);
    VBEZB = new decimal_default(0);
    VBEZBSO = new decimal_default(0);
    VERGL = new decimal_default(0);
    VSPHB = new decimal_default(0);
    VSP = new decimal_default(0);
    VSPN = new decimal_default(0);
    VSPALV = new decimal_default(0);
    VSPKVPV = new decimal_default(0);
    VSPR = new decimal_default(0);
    W1STKL5 = new decimal_default(0);
    W2STKL5 = new decimal_default(0);
    W3STKL5 = new decimal_default(0);
    X = new decimal_default(0);
    Y = new decimal_default(0);
    ZRE4 = new decimal_default(0);
    ZRE4J = new decimal_default(0);
    ZRE4VP = new decimal_default(0);
    ZRE4VPR = new decimal_default(0);
    ZTABFB = new decimal_default(0);
    ZVBEZ = new decimal_default(0);
    ZVBEZJ = new decimal_default(0);
    ZVE = new decimal_default(0);
    ZX = new decimal_default(0);
    ZZX = new decimal_default(0);
    // -------------------------------------------------------------------------
    // Internals: int -> number
    // -------------------------------------------------------------------------
    J = 0;
    K = 0;
    KZTAB = 0;
    // -------------------------------------------------------------------------
    // Constants: TAB1-TAB5 (index 0..54)
    // -------------------------------------------------------------------------
    TAB1 = [
      new decimal_default(0),
      new decimal_default("0.4"),
      new decimal_default("0.384"),
      new decimal_default("0.368"),
      new decimal_default("0.352"),
      new decimal_default("0.336"),
      new decimal_default("0.32"),
      new decimal_default("0.304"),
      new decimal_default("0.288"),
      new decimal_default("0.272"),
      new decimal_default("0.256"),
      new decimal_default("0.24"),
      new decimal_default("0.224"),
      new decimal_default("0.208"),
      new decimal_default("0.192"),
      new decimal_default("0.176"),
      new decimal_default("0.16"),
      new decimal_default("0.152"),
      new decimal_default("0.144"),
      new decimal_default("0.14"),
      new decimal_default("0.136"),
      new decimal_default("0.132"),
      new decimal_default("0.128"),
      new decimal_default("0.124"),
      new decimal_default("0.12"),
      new decimal_default("0.116"),
      new decimal_default("0.112"),
      new decimal_default("0.108"),
      new decimal_default("0.104"),
      new decimal_default("0.1"),
      new decimal_default("0.096"),
      new decimal_default("0.092"),
      new decimal_default("0.088"),
      new decimal_default("0.084"),
      new decimal_default("0.08"),
      new decimal_default("0.076"),
      new decimal_default("0.072"),
      new decimal_default("0.068"),
      new decimal_default("0.064"),
      new decimal_default("0.06"),
      new decimal_default("0.056"),
      new decimal_default("0.052"),
      new decimal_default("0.048"),
      new decimal_default("0.044"),
      new decimal_default("0.04"),
      new decimal_default("0.036"),
      new decimal_default("0.032"),
      new decimal_default("0.028"),
      new decimal_default("0.024"),
      new decimal_default("0.02"),
      new decimal_default("0.016"),
      new decimal_default("0.012"),
      new decimal_default("0.008"),
      new decimal_default("0.004"),
      new decimal_default(0)
    ];
    TAB2 = [
      new decimal_default(0),
      new decimal_default(3e3),
      new decimal_default(2880),
      new decimal_default(2760),
      new decimal_default(2640),
      new decimal_default(2520),
      new decimal_default(2400),
      new decimal_default(2280),
      new decimal_default(2160),
      new decimal_default(2040),
      new decimal_default(1920),
      new decimal_default(1800),
      new decimal_default(1680),
      new decimal_default(1560),
      new decimal_default(1440),
      new decimal_default(1320),
      new decimal_default(1200),
      new decimal_default(1140),
      new decimal_default(1080),
      new decimal_default(1050),
      new decimal_default(1020),
      new decimal_default(990),
      new decimal_default(960),
      new decimal_default(930),
      new decimal_default(900),
      new decimal_default(870),
      new decimal_default(840),
      new decimal_default(810),
      new decimal_default(780),
      new decimal_default(750),
      new decimal_default(720),
      new decimal_default(690),
      new decimal_default(660),
      new decimal_default(630),
      new decimal_default(600),
      new decimal_default(570),
      new decimal_default(540),
      new decimal_default(510),
      new decimal_default(480),
      new decimal_default(450),
      new decimal_default(420),
      new decimal_default(390),
      new decimal_default(360),
      new decimal_default(330),
      new decimal_default(300),
      new decimal_default(270),
      new decimal_default(240),
      new decimal_default(210),
      new decimal_default(180),
      new decimal_default(150),
      new decimal_default(120),
      new decimal_default(90),
      new decimal_default(60),
      new decimal_default(30),
      new decimal_default(0)
    ];
    TAB3 = [
      new decimal_default(0),
      new decimal_default(900),
      new decimal_default(864),
      new decimal_default(828),
      new decimal_default(792),
      new decimal_default(756),
      new decimal_default(720),
      new decimal_default(684),
      new decimal_default(648),
      new decimal_default(612),
      new decimal_default(576),
      new decimal_default(540),
      new decimal_default(504),
      new decimal_default(468),
      new decimal_default(432),
      new decimal_default(396),
      new decimal_default(360),
      new decimal_default(342),
      new decimal_default(324),
      new decimal_default(315),
      new decimal_default(306),
      new decimal_default(297),
      new decimal_default(288),
      new decimal_default(279),
      new decimal_default(270),
      new decimal_default(261),
      new decimal_default(252),
      new decimal_default(243),
      new decimal_default(234),
      new decimal_default(225),
      new decimal_default(216),
      new decimal_default(207),
      new decimal_default(198),
      new decimal_default(189),
      new decimal_default(180),
      new decimal_default(171),
      new decimal_default(162),
      new decimal_default(153),
      new decimal_default(144),
      new decimal_default(135),
      new decimal_default(126),
      new decimal_default(117),
      new decimal_default(108),
      new decimal_default(99),
      new decimal_default(90),
      new decimal_default(81),
      new decimal_default(72),
      new decimal_default(63),
      new decimal_default(54),
      new decimal_default(45),
      new decimal_default(36),
      new decimal_default(27),
      new decimal_default(18),
      new decimal_default(9),
      new decimal_default(0)
    ];
    TAB4 = [
      new decimal_default(0),
      new decimal_default("0.4"),
      new decimal_default("0.384"),
      new decimal_default("0.368"),
      new decimal_default("0.352"),
      new decimal_default("0.336"),
      new decimal_default("0.32"),
      new decimal_default("0.304"),
      new decimal_default("0.288"),
      new decimal_default("0.272"),
      new decimal_default("0.256"),
      new decimal_default("0.24"),
      new decimal_default("0.224"),
      new decimal_default("0.208"),
      new decimal_default("0.192"),
      new decimal_default("0.176"),
      new decimal_default("0.16"),
      new decimal_default("0.152"),
      new decimal_default("0.144"),
      new decimal_default("0.14"),
      new decimal_default("0.136"),
      new decimal_default("0.132"),
      new decimal_default("0.128"),
      new decimal_default("0.124"),
      new decimal_default("0.12"),
      new decimal_default("0.116"),
      new decimal_default("0.112"),
      new decimal_default("0.108"),
      new decimal_default("0.104"),
      new decimal_default("0.1"),
      new decimal_default("0.096"),
      new decimal_default("0.092"),
      new decimal_default("0.088"),
      new decimal_default("0.084"),
      new decimal_default("0.08"),
      new decimal_default("0.076"),
      new decimal_default("0.072"),
      new decimal_default("0.068"),
      new decimal_default("0.064"),
      new decimal_default("0.06"),
      new decimal_default("0.056"),
      new decimal_default("0.052"),
      new decimal_default("0.048"),
      new decimal_default("0.044"),
      new decimal_default("0.04"),
      new decimal_default("0.036"),
      new decimal_default("0.032"),
      new decimal_default("0.028"),
      new decimal_default("0.024"),
      new decimal_default("0.02"),
      new decimal_default("0.016"),
      new decimal_default("0.012"),
      new decimal_default("0.008"),
      new decimal_default("0.004"),
      new decimal_default(0)
    ];
    TAB5 = [
      new decimal_default(0),
      new decimal_default(1900),
      new decimal_default(1824),
      new decimal_default(1748),
      new decimal_default(1672),
      new decimal_default(1596),
      new decimal_default(1520),
      new decimal_default(1444),
      new decimal_default(1368),
      new decimal_default(1292),
      new decimal_default(1216),
      new decimal_default(1140),
      new decimal_default(1064),
      new decimal_default(988),
      new decimal_default(912),
      new decimal_default(836),
      new decimal_default(760),
      new decimal_default(722),
      new decimal_default(684),
      new decimal_default(665),
      new decimal_default(646),
      new decimal_default(627),
      new decimal_default(608),
      new decimal_default(589),
      new decimal_default(570),
      new decimal_default(551),
      new decimal_default(532),
      new decimal_default(513),
      new decimal_default(494),
      new decimal_default(475),
      new decimal_default(456),
      new decimal_default(437),
      new decimal_default(418),
      new decimal_default(399),
      new decimal_default(380),
      new decimal_default(361),
      new decimal_default(342),
      new decimal_default(323),
      new decimal_default(304),
      new decimal_default(285),
      new decimal_default(266),
      new decimal_default(247),
      new decimal_default(228),
      new decimal_default(209),
      new decimal_default(190),
      new decimal_default(171),
      new decimal_default(152),
      new decimal_default(133),
      new decimal_default(114),
      new decimal_default(95),
      new decimal_default(76),
      new decimal_default(57),
      new decimal_default(38),
      new decimal_default(19),
      new decimal_default(0)
    ];
    // -------------------------------------------------------------------------
    // ZAHL constants
    // -------------------------------------------------------------------------
    ZAHL1 = new decimal_default(1);
    ZAHL2 = new decimal_default(2);
    ZAHL5 = new decimal_default(5);
    ZAHL7 = new decimal_default(7);
    ZAHL12 = new decimal_default(12);
    ZAHL100 = new decimal_default(100);
    ZAHL360 = new decimal_default(360);
    ZAHL500 = new decimal_default(500);
    ZAHL700 = new decimal_default(700);
    ZAHL1000 = new decimal_default(1e3);
    ZAHL10000 = new decimal_default(1e4);
    // =========================================================================
    // Public API
    // =========================================================================
    setInputs(inputs) {
      const merged = { ...INPUT_DEFAULTS, ...inputs };
      this.RE4 = new decimal_default(merged.RE4);
      this.VBEZ = new decimal_default(merged.VBEZ);
      this.VBEZM = new decimal_default(merged.VBEZM);
      this.VBEZS = new decimal_default(merged.VBEZS);
      this.VBS = new decimal_default(merged.VBS);
      this.LZZFREIB = new decimal_default(merged.LZZFREIB);
      this.LZZHINZU = new decimal_default(merged.LZZHINZU);
      this.JFREIB = new decimal_default(merged.JFREIB);
      this.JHINZU = new decimal_default(merged.JHINZU);
      this.JRE4 = new decimal_default(merged.JRE4);
      this.JRE4ENT = new decimal_default(merged.JRE4ENT);
      this.JVBEZ = new decimal_default(merged.JVBEZ);
      this.SONSTB = new decimal_default(merged.SONSTB);
      this.SONSTENT = new decimal_default(merged.SONSTENT);
      this.STERBE = new decimal_default(merged.STERBE);
      this.KVZ = new decimal_default(merged.KVZ);
      this.PVA = new decimal_default(merged.PVA);
      this.PKPV = new decimal_default(merged.PKPV);
      this.PKPVAGZ = new decimal_default(merged.PKPVAGZ);
      this.MBV = new decimal_default(merged.MBV);
      this.ZKF = new decimal_default(merged.ZKF);
      this.af = merged.af;
      this.AJAHR = merged.AJAHR;
      this.ALTER1 = merged.ALTER1;
      this.ALV = merged.ALV;
      this.KRV = merged.KRV;
      this.LZZ = merged.LZZ;
      this.PKV = merged.PKV;
      this.PVS = merged.PVS;
      this.PVZ = merged.PVZ;
      this.R = merged.R;
      this.STKL = merged.STKL;
      this.VJAHR = merged.VJAHR;
      this.ZMVB = merged.ZMVB;
      this.f = merged.f;
      this.BK = new decimal_default(0);
      this.BKS = new decimal_default(0);
      this.LSTLZZ = new decimal_default(0);
      this.SOLZLZZ = new decimal_default(0);
      this.SOLZS = new decimal_default(0);
      this.STS = new decimal_default(0);
      this.VFRB = new decimal_default(0);
      this.VFRBS1 = new decimal_default(0);
      this.VFRBS2 = new decimal_default(0);
      this.WVFRB = new decimal_default(0);
      this.WVFRBO = new decimal_default(0);
      this.WVFRBM = new decimal_default(0);
      this.ALTE = new decimal_default(0);
      this.ANP = new decimal_default(0);
      this.ANTEIL1 = new decimal_default(0);
      this.AVSATZAN = new decimal_default(0);
      this.BBGKVPV = new decimal_default(0);
      this.BBGRVALV = new decimal_default(0);
      this.BMG = new decimal_default(0);
      this.DIFF = new decimal_default(0);
      this.EFA = new decimal_default(0);
      this.FVB = new decimal_default(0);
      this.FVBSO = new decimal_default(0);
      this.FVBZ = new decimal_default(0);
      this.FVBZSO = new decimal_default(0);
      this.GFB = new decimal_default(0);
      this.HBALTE = new decimal_default(0);
      this.HFVB = new decimal_default(0);
      this.HFVBZ = new decimal_default(0);
      this.HFVBZSO = new decimal_default(0);
      this.HOCH = new decimal_default(0);
      this.J = 0;
      this.JBMG = new decimal_default(0);
      this.JLFREIB = new decimal_default(0);
      this.JLHINZU = new decimal_default(0);
      this.JW = new decimal_default(0);
      this.K = 0;
      this.KFB = new decimal_default(0);
      this.KVSATZAN = new decimal_default(0);
      this.KZTAB = 0;
      this.LSTJAHR = new decimal_default(0);
      this.LSTOSO = new decimal_default(0);
      this.LSTSO = new decimal_default(0);
      this.MIST = new decimal_default(0);
      this.PKPVAGZJ = new decimal_default(0);
      this.PVSATZAN = new decimal_default(0);
      this.RVSATZAN = new decimal_default(0);
      this.RW = new decimal_default(0);
      this.SAP = new decimal_default(0);
      this.SOLZFREI = new decimal_default(0);
      this.SOLZJ = new decimal_default(0);
      this.SOLZMIN = new decimal_default(0);
      this.SOLZSBMG = new decimal_default(0);
      this.SOLZSZVE = new decimal_default(0);
      this.ST = new decimal_default(0);
      this.ST1 = new decimal_default(0);
      this.ST2 = new decimal_default(0);
      this.VBEZB = new decimal_default(0);
      this.VBEZBSO = new decimal_default(0);
      this.VERGL = new decimal_default(0);
      this.VSPHB = new decimal_default(0);
      this.VSP = new decimal_default(0);
      this.VSPN = new decimal_default(0);
      this.VSPALV = new decimal_default(0);
      this.VSPKVPV = new decimal_default(0);
      this.VSPR = new decimal_default(0);
      this.W1STKL5 = new decimal_default(0);
      this.W2STKL5 = new decimal_default(0);
      this.W3STKL5 = new decimal_default(0);
      this.X = new decimal_default(0);
      this.Y = new decimal_default(0);
      this.ZRE4 = new decimal_default(0);
      this.ZRE4J = new decimal_default(0);
      this.ZRE4VP = new decimal_default(0);
      this.ZRE4VPR = new decimal_default(0);
      this.ZTABFB = new decimal_default(0);
      this.ZVBEZ = new decimal_default(0);
      this.ZVBEZJ = new decimal_default(0);
      this.ZVE = new decimal_default(0);
      this.ZX = new decimal_default(0);
      this.ZZX = new decimal_default(0);
    }
    calculate() {
      this.MPARA();
      this.MRE4JL();
      this.VBEZBSO = new decimal_default(0);
      this.MRE4();
      this.MRE4ABZ();
      this.MBERECH();
      this.MSONST();
    }
    getOutputs() {
      return {
        BK: this.BK.trunc().toNumber(),
        BKS: this.BKS.trunc().toNumber(),
        LSTLZZ: this.LSTLZZ.trunc().toNumber(),
        SOLZLZZ: this.SOLZLZZ.trunc().toNumber(),
        SOLZS: this.SOLZS.trunc().toNumber(),
        STS: this.STS.trunc().toNumber(),
        VFRB: this.VFRB.trunc().toNumber(),
        VFRBS1: this.VFRBS1.trunc().toNumber(),
        VFRBS2: this.VFRBS2.trunc().toNumber(),
        WVFRB: this.WVFRB.trunc().toNumber(),
        WVFRBO: this.WVFRBO.trunc().toNumber(),
        WVFRBM: this.WVFRBM.trunc().toNumber()
      };
    }
    // =========================================================================
    // PAP Methods
    // =========================================================================
    /**
     * Zuweisung von Werten für bestimmte Steuer- und Sozialversicherungsparameter
     * PAP Seite 14
     */
    MPARA() {
      this.BBGRVALV = new decimal_default(101400);
      this.AVSATZAN = new decimal_default("0.013");
      this.RVSATZAN = new decimal_default("0.093");
      this.BBGKVPV = new decimal_default(69750);
      this.KVSATZAN = this.KVZ.div(this.ZAHL2).div(this.ZAHL100).plus(new decimal_default("0.07"));
      if (this.PVS === 1) {
        this.PVSATZAN = new decimal_default("0.023");
      } else {
        this.PVSATZAN = new decimal_default("0.018");
      }
      if (this.PVZ === 1) {
        this.PVSATZAN = this.PVSATZAN.plus(new decimal_default("0.006"));
      } else {
        this.PVSATZAN = this.PVSATZAN.minus(this.PVA.times(new decimal_default("0.0025")));
      }
      this.W1STKL5 = new decimal_default(14071);
      this.W2STKL5 = new decimal_default(34939);
      this.W3STKL5 = new decimal_default(222260);
      this.GFB = new decimal_default(12348);
      this.SOLZFREI = new decimal_default(20350);
    }
    /**
     * Ermittlung des Jahresarbeitslohns nach § 39 b Absatz 2 Satz 2 EStG
     * PAP Seite 15
     */
    MRE4JL() {
      if (this.LZZ === 1) {
        this.ZRE4J = this.RE4.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      } else if (this.LZZ === 2) {
        this.ZRE4J = this.RE4.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      } else if (this.LZZ === 3) {
        this.ZRE4J = this.RE4.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.times(this.ZAHL360).div(this.ZAHL700).toDP(2, decimal_default.ROUND_DOWN);
      } else {
        this.ZRE4J = this.RE4.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.VBEZ.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLFREIB = this.LZZFREIB.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.JLHINZU = this.LZZHINZU.times(this.ZAHL360).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      }
      if (this.af === 0) {
        this.f = 1;
      }
    }
    /**
     * Freibeträge für Versorgungsbezüge, Altersentlastungsbetrag
     * (§ 39b Absatz 2 Satz 3 EStG)
     * PAP Seite 16
     */
    MRE4() {
      if (this.ZVBEZJ.cmp(new decimal_default(0)) === 0) {
        this.FVBZ = new decimal_default(0);
        this.FVB = new decimal_default(0);
        this.FVBZSO = new decimal_default(0);
        this.FVBSO = new decimal_default(0);
      } else {
        if (this.VJAHR < 2006) {
          this.J = 1;
        } else if (this.VJAHR < 2058) {
          this.J = this.VJAHR - 2004;
        } else {
          this.J = 54;
        }
        if (this.LZZ === 1) {
          this.VBEZB = this.VBEZM.times(new decimal_default(this.ZMVB)).plus(this.VBEZS);
          this.HFVB = this.TAB2[this.J].div(this.ZAHL12).times(new decimal_default(this.ZMVB)).toDP(0, decimal_default.ROUND_UP);
          this.FVBZ = this.TAB3[this.J].div(this.ZAHL12).times(new decimal_default(this.ZMVB)).toDP(0, decimal_default.ROUND_UP);
        } else {
          this.VBEZB = this.VBEZM.times(this.ZAHL12).plus(this.VBEZS).toDP(2, decimal_default.ROUND_DOWN);
          this.HFVB = this.TAB2[this.J];
          this.FVBZ = this.TAB3[this.J];
        }
        this.FVB = this.VBEZB.times(this.TAB1[this.J]).div(this.ZAHL100).toDP(2, decimal_default.ROUND_UP);
        if (this.FVB.cmp(this.HFVB) === 1) {
          this.FVB = this.HFVB;
        }
        if (this.FVB.cmp(this.ZVBEZJ) === 1) {
          this.FVB = this.ZVBEZJ;
        }
        this.FVBSO = this.FVB.plus(this.VBEZBSO.times(this.TAB1[this.J]).div(this.ZAHL100)).toDP(2, decimal_default.ROUND_UP);
        if (this.FVBSO.cmp(this.TAB2[this.J]) === 1) {
          this.FVBSO = this.TAB2[this.J];
        }
        this.HFVBZSO = this.VBEZB.plus(this.VBEZBSO).div(this.ZAHL100).minus(this.FVBSO).toDP(2, decimal_default.ROUND_DOWN);
        this.FVBZSO = this.FVBZ.plus(this.VBEZBSO.div(this.ZAHL100)).toDP(0, decimal_default.ROUND_UP);
        if (this.FVBZSO.cmp(this.HFVBZSO) === 1) {
          this.FVBZSO = this.HFVBZSO.toDP(0, decimal_default.ROUND_UP);
        }
        if (this.FVBZSO.cmp(this.TAB3[this.J]) === 1) {
          this.FVBZSO = this.TAB3[this.J];
        }
        this.HFVBZ = this.VBEZB.div(this.ZAHL100).minus(this.FVB).toDP(2, decimal_default.ROUND_DOWN);
        if (this.FVBZ.cmp(this.HFVBZ) === 1) {
          this.FVBZ = this.HFVBZ.toDP(0, decimal_default.ROUND_UP);
        }
      }
      this.MRE4ALTE();
    }
    /**
     * Altersentlastungsbetrag (§ 39b Absatz 2 Satz 3 EStG)
     * PAP Seite 17
     */
    MRE4ALTE() {
      if (this.ALTER1 === 0) {
        this.ALTE = new decimal_default(0);
      } else {
        if (this.AJAHR < 2006) {
          this.K = 1;
        } else if (this.AJAHR < 2058) {
          this.K = this.AJAHR - 2004;
        } else {
          this.K = 54;
        }
        this.BMG = this.ZRE4J.minus(this.ZVBEZJ);
        this.ALTE = this.BMG.times(this.TAB4[this.K]).toDP(0, decimal_default.ROUND_UP);
        this.HBALTE = this.TAB5[this.K];
        if (this.ALTE.cmp(this.HBALTE) === 1) {
          this.ALTE = this.HBALTE;
        }
      }
    }
    /**
     * Ermittlung des Jahresarbeitslohns nach Abzug der Freibeträge
     * nach § 39 b Absatz 2 Satz 3 und 4 EStG
     * PAP Seite 20
     */
    MRE4ABZ() {
      this.ZRE4 = this.ZRE4J.minus(this.FVB).minus(this.ALTE).minus(this.JLFREIB).plus(this.JLHINZU).toDP(2, decimal_default.ROUND_DOWN);
      if (this.ZRE4.cmp(new decimal_default(0)) === -1) {
        this.ZRE4 = new decimal_default(0);
      }
      this.ZRE4VP = this.ZRE4J;
      this.ZVBEZ = this.ZVBEZJ.minus(this.FVB).toDP(2, decimal_default.ROUND_DOWN);
      if (this.ZVBEZ.cmp(new decimal_default(0)) === -1) {
        this.ZVBEZ = new decimal_default(0);
      }
    }
    /**
     * Berechnung fuer laufende Lohnzahlungszeitraueme
     * PAP Seite 21
     */
    MBERECH() {
      this.MZTABFB();
      this.VFRB = this.ANP.plus(this.FVB.plus(this.FVBZ)).times(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
      this.MLSTJAHR();
      this.WVFRB = this.ZVE.minus(this.GFB).times(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
      if (this.WVFRB.cmp(new decimal_default(0)) === -1) {
        this.WVFRB = new decimal_default(0);
      }
      this.LSTJAHR = this.ST.times(new decimal_default(this.f)).toDP(0, decimal_default.ROUND_DOWN);
      this.UPLSTLZZ();
      if (this.ZKF.cmp(new decimal_default(0)) === 1) {
        this.ZTABFB = this.ZTABFB.plus(this.KFB);
        this.MRE4ABZ();
        this.MLSTJAHR();
        this.JBMG = this.ST.times(new decimal_default(this.f)).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.JBMG = this.LSTJAHR;
      }
      this.MSOLZ();
    }
    /**
     * Ermittlung der festen Tabellenfreibeträge (ohne Vorsorgepauschale)
     * PAP Seite 22
     */
    MZTABFB() {
      this.ANP = new decimal_default(0);
      if (this.ZVBEZ.cmp(new decimal_default(0)) >= 0 && this.ZVBEZ.cmp(this.FVBZ) === -1) {
        this.FVBZ = new decimal_default(this.ZVBEZ.trunc().toNumber());
      }
      if (this.STKL < 6) {
        if (this.ZVBEZ.cmp(new decimal_default(0)) === 1) {
          if (this.ZVBEZ.minus(this.FVBZ).cmp(new decimal_default(102)) === -1) {
            this.ANP = this.ZVBEZ.minus(this.FVBZ).toDP(0, decimal_default.ROUND_UP);
          } else {
            this.ANP = new decimal_default(102);
          }
        }
      } else {
        this.FVBZ = new decimal_default(0);
        this.FVBZSO = new decimal_default(0);
      }
      if (this.STKL < 6) {
        if (this.ZRE4.cmp(this.ZVBEZ) === 1) {
          if (this.ZRE4.minus(this.ZVBEZ).cmp(new decimal_default(1230)) === -1) {
            this.ANP = this.ANP.plus(this.ZRE4).minus(this.ZVBEZ).toDP(0, decimal_default.ROUND_UP);
          } else {
            this.ANP = this.ANP.plus(new decimal_default(1230));
          }
        }
      }
      this.KZTAB = 1;
      if (this.STKL === 1) {
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(9756)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 2) {
        this.EFA = new decimal_default(4260);
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(9756)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 3) {
        this.KZTAB = 2;
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(9756)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 4) {
        this.SAP = new decimal_default(36);
        this.KFB = this.ZKF.times(new decimal_default(4878)).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.STKL === 5) {
        this.SAP = new decimal_default(36);
        this.KFB = new decimal_default(0);
      } else {
        this.KFB = new decimal_default(0);
      }
      this.ZTABFB = this.EFA.plus(this.ANP).plus(this.SAP).plus(this.FVBZ).toDP(2, decimal_default.ROUND_DOWN);
    }
    /**
     * Ermittlung Jahreslohnsteuer
     * PAP Seite 23
     */
    MLSTJAHR() {
      this.UPEVP();
      this.ZVE = this.ZRE4.minus(this.ZTABFB).minus(this.VSP);
      this.UPMLST();
    }
    /**
     * PAP Seite 24
     */
    UPLSTLZZ() {
      this.JW = this.LSTJAHR.times(this.ZAHL100);
      this.UPANTEIL();
      this.LSTLZZ = this.ANTEIL1;
    }
    /**
     * PAP Seite 25
     */
    UPMLST() {
      if (this.ZVE.cmp(this.ZAHL1) === -1) {
        this.ZVE = new decimal_default(0);
        this.X = new decimal_default(0);
      } else {
        this.X = this.ZVE.div(new decimal_default(this.KZTAB)).toDP(0, decimal_default.ROUND_DOWN);
      }
      if (this.STKL < 5) {
        this.UPTAB26();
      } else {
        this.MST5_6();
      }
    }
    /**
     * Vorsorgepauschale (§ 39b Absatz 2 Satz 5 Nummer 3 EStG)
     * PAP Seite 26
     */
    UPEVP() {
      if (this.KRV === 1) {
        this.VSPR = new decimal_default(0);
      } else {
        if (this.ZRE4VP.cmp(this.BBGRVALV) === 1) {
          this.ZRE4VPR = this.BBGRVALV;
        } else {
          this.ZRE4VPR = this.ZRE4VP;
        }
        this.VSPR = this.ZRE4VPR.times(this.RVSATZAN).toDP(2, decimal_default.ROUND_DOWN);
      }
      this.MVSPKVPV();
      if (this.ALV === 1) {
      } else {
        if (this.STKL === 6) {
        } else {
          this.MVSPHB();
        }
      }
    }
    /**
     * Vorsorgepauschale (§ 39b Absatz 2 Satz 5 Nummer 3 Buchstaben b bis d EStG)
     * PAP Seite 27
     */
    MVSPKVPV() {
      if (this.ZRE4VP.cmp(this.BBGKVPV) === 1) {
        this.ZRE4VPR = this.BBGKVPV;
      } else {
        this.ZRE4VPR = this.ZRE4VP;
      }
      if (this.PKV > 0) {
        if (this.STKL === 6) {
          this.VSPKVPV = new decimal_default(0);
        } else {
          this.PKPVAGZJ = this.PKPVAGZ.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
          this.VSPKVPV = this.PKPV.times(this.ZAHL12).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
          this.VSPKVPV = this.VSPKVPV.minus(this.PKPVAGZJ);
          if (this.VSPKVPV.cmp(new decimal_default(0)) === -1) {
            this.VSPKVPV = new decimal_default(0);
          }
        }
      } else {
        this.VSPKVPV = this.ZRE4VPR.times(this.KVSATZAN.plus(this.PVSATZAN)).toDP(2, decimal_default.ROUND_DOWN);
      }
      this.VSP = this.VSPKVPV.plus(this.VSPR).toDP(0, decimal_default.ROUND_UP);
    }
    /**
     * Höchstbetragsberechnung zur Arbeitslosenversicherung
     * (§ 39b Absatz 2 Satz 5 Nummer 3 Buchstabe e EStG)
     * PAP Seite 28
     */
    MVSPHB() {
      if (this.ZRE4VP.cmp(this.BBGRVALV) === 1) {
        this.ZRE4VPR = this.BBGRVALV;
      } else {
        this.ZRE4VPR = this.ZRE4VP;
      }
      this.VSPALV = this.AVSATZAN.times(this.ZRE4VPR).toDP(2, decimal_default.ROUND_DOWN);
      this.VSPHB = this.VSPALV.plus(this.VSPKVPV).toDP(2, decimal_default.ROUND_DOWN);
      if (this.VSPHB.cmp(new decimal_default(1900)) === 1) {
        this.VSPHB = new decimal_default(1900);
      }
      this.VSPN = this.VSPR.plus(this.VSPHB).toDP(0, decimal_default.ROUND_UP);
      if (this.VSPN.cmp(this.VSP) === 1) {
        this.VSP = this.VSPN;
      }
    }
    /**
     * Lohnsteuer fuer die Steuerklassen V und VI (§ 39b Absatz 2 Satz 7 EStG)
     * PAP Seite 29
     */
    MST5_6() {
      this.ZZX = this.X;
      if (this.ZZX.cmp(this.W2STKL5) === 1) {
        this.ZX = this.W2STKL5;
        this.UP5_6();
        if (this.ZZX.cmp(this.W3STKL5) === 1) {
          this.ST = this.ST.plus(this.W3STKL5.minus(this.W2STKL5).times(new decimal_default("0.42"))).toDP(0, decimal_default.ROUND_DOWN);
          this.ST = this.ST.plus(this.ZZX.minus(this.W3STKL5).times(new decimal_default("0.45"))).toDP(0, decimal_default.ROUND_DOWN);
        } else {
          this.ST = this.ST.plus(this.ZZX.minus(this.W2STKL5).times(new decimal_default("0.42"))).toDP(0, decimal_default.ROUND_DOWN);
        }
      } else {
        this.ZX = this.ZZX;
        this.UP5_6();
        if (this.ZZX.cmp(this.W1STKL5) === 1) {
          this.VERGL = this.ST;
          this.ZX = this.W1STKL5;
          this.UP5_6();
          this.HOCH = this.ST.plus(this.ZZX.minus(this.W1STKL5).times(new decimal_default("0.42"))).toDP(0, decimal_default.ROUND_DOWN);
          if (this.HOCH.cmp(this.VERGL) === -1) {
            this.ST = this.HOCH;
          } else {
            this.ST = this.VERGL;
          }
        }
      }
    }
    /**
     * Unterprogramm zur Lohnsteuer fuer die Steuerklassen V und VI
     * (§ 39b Absatz 2 Satz 7 EStG)
     * PAP Seite 30
     */
    UP5_6() {
      this.X = this.ZX.times(new decimal_default("1.25")).toDP(0, decimal_default.ROUND_DOWN);
      this.UPTAB26();
      this.ST1 = this.ST;
      this.X = this.ZX.times(new decimal_default("0.75")).toDP(0, decimal_default.ROUND_DOWN);
      this.UPTAB26();
      this.ST2 = this.ST;
      this.DIFF = this.ST1.minus(this.ST2).times(this.ZAHL2);
      this.MIST = this.ZX.times(new decimal_default("0.14")).toDP(0, decimal_default.ROUND_DOWN);
      if (this.MIST.cmp(this.DIFF) === 1) {
        this.ST = this.MIST;
      } else {
        this.ST = this.DIFF;
      }
    }
    /**
     * Solidaritätszuschlag
     * PAP Seite 31
     */
    MSOLZ() {
      this.SOLZFREI = this.SOLZFREI.times(new decimal_default(this.KZTAB));
      if (this.JBMG.cmp(this.SOLZFREI) === 1) {
        this.SOLZJ = this.JBMG.times(new decimal_default("5.5")).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.SOLZMIN = this.JBMG.minus(this.SOLZFREI).times(new decimal_default("11.9")).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        if (this.SOLZMIN.cmp(this.SOLZJ) === -1) {
          this.SOLZJ = this.SOLZMIN;
        }
        this.JW = this.SOLZJ.times(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
        this.UPANTEIL();
        this.SOLZLZZ = this.ANTEIL1;
      } else {
        this.SOLZLZZ = new decimal_default(0);
      }
      if (this.R > 0) {
        this.JW = this.JBMG.times(this.ZAHL100);
        this.UPANTEIL();
        this.BK = this.ANTEIL1;
      } else {
        this.BK = new decimal_default(0);
      }
    }
    /**
     * Anteil von Jahresbeträgen fuer einen LZZ (§ 39b Absatz 2 Satz 9 EStG)
     * PAP Seite 32
     */
    UPANTEIL() {
      if (this.LZZ === 1) {
        this.ANTEIL1 = this.JW;
      } else if (this.LZZ === 2) {
        this.ANTEIL1 = this.JW.div(this.ZAHL12).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.LZZ === 3) {
        this.ANTEIL1 = this.JW.times(this.ZAHL7).div(this.ZAHL360).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.ANTEIL1 = this.JW.div(this.ZAHL360).toDP(0, decimal_default.ROUND_DOWN);
      }
    }
    /**
     * Berechnung sonstiger Bezüge nach § 39b Absatz 3 Sätze 1 bis 8 EStG
     * PAP Seite 33
     */
    MSONST() {
      this.LZZ = 1;
      if (this.ZMVB === 0) {
        this.ZMVB = 12;
      }
      if (this.SONSTB.cmp(new decimal_default(0)) === 0 && this.MBV.cmp(new decimal_default(0)) === 0) {
        this.LSTSO = new decimal_default(0);
        this.STS = new decimal_default(0);
        this.SOLZS = new decimal_default(0);
        this.BKS = new decimal_default(0);
      } else {
        this.MOSONST();
        this.ZRE4J = this.JRE4.plus(this.SONSTB).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.ZVBEZJ = this.JVBEZ.plus(this.VBS).div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        this.VBEZBSO = this.STERBE;
        this.MRE4SONST();
        this.MLSTJAHR();
        this.WVFRBM = this.ZVE.minus(this.GFB).times(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
        if (this.WVFRBM.cmp(new decimal_default(0)) === -1) {
          this.WVFRBM = new decimal_default(0);
        }
        this.LSTSO = this.ST.times(this.ZAHL100);
        this.STS = this.LSTSO.minus(this.LSTOSO).times(new decimal_default(this.f)).div(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN).times(this.ZAHL100);
        this.STSMIN();
      }
    }
    /**
     * PAP Seite 34
     */
    STSMIN() {
      if (this.STS.cmp(new decimal_default(0)) === -1) {
        if (this.MBV.cmp(new decimal_default(0)) === 0) {
        } else {
          this.LSTLZZ = this.LSTLZZ.plus(this.STS);
          if (this.LSTLZZ.cmp(new decimal_default(0)) === -1) {
            this.LSTLZZ = new decimal_default(0);
          }
          this.SOLZLZZ = this.SOLZLZZ.plus(this.STS.times(new decimal_default("5.5").div(this.ZAHL100))).toDP(0, decimal_default.ROUND_DOWN);
          if (this.SOLZLZZ.cmp(new decimal_default(0)) === -1) {
            this.SOLZLZZ = new decimal_default(0);
          }
          this.BK = this.BK.plus(this.STS);
          if (this.BK.cmp(new decimal_default(0)) === -1) {
            this.BK = new decimal_default(0);
          }
        }
        this.STS = new decimal_default(0);
        this.SOLZS = new decimal_default(0);
      } else {
        this.MSOLZSTS();
      }
      if (this.R > 0) {
        this.BKS = this.STS;
      } else {
        this.BKS = new decimal_default(0);
      }
    }
    /**
     * Berechnung des SolZ auf sonstige Bezüge
     * PAP Seite 35
     */
    MSOLZSTS() {
      if (this.ZKF.cmp(new decimal_default(0)) === 1) {
        this.SOLZSZVE = this.ZVE.minus(this.KFB);
      } else {
        this.SOLZSZVE = this.ZVE;
      }
      if (this.SOLZSZVE.cmp(new decimal_default(1)) === -1) {
        this.SOLZSZVE = new decimal_default(0);
        this.X = new decimal_default(0);
      } else {
        this.X = this.SOLZSZVE.div(new decimal_default(this.KZTAB)).toDP(0, decimal_default.ROUND_DOWN);
      }
      if (this.STKL < 5) {
        this.UPTAB26();
      } else {
        this.MST5_6();
      }
      this.SOLZSBMG = this.ST.times(new decimal_default(this.f)).toDP(0, decimal_default.ROUND_DOWN);
      if (this.SOLZSBMG.cmp(this.SOLZFREI) === 1) {
        this.SOLZS = this.STS.times(new decimal_default("5.5")).div(this.ZAHL100).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.SOLZS = new decimal_default(0);
      }
    }
    /**
     * Sonderberechnung ohne sonstige Bezüge für Berechnung bei sonstigen Bezügen
     * PAP Seite 36
     */
    MOSONST() {
      this.ZRE4J = this.JRE4.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.ZVBEZJ = this.JVBEZ.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.JLFREIB = this.JFREIB.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.JLHINZU = this.JHINZU.div(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.MRE4();
      this.MRE4ABZ();
      this.ZRE4VP = this.ZRE4VP.minus(this.JRE4ENT.div(this.ZAHL100));
      this.MZTABFB();
      this.VFRBS1 = this.ANP.plus(this.FVB.plus(this.FVBZ)).times(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      this.MLSTJAHR();
      this.WVFRBO = this.ZVE.minus(this.GFB).times(this.ZAHL100).toDP(2, decimal_default.ROUND_DOWN);
      if (this.WVFRBO.cmp(new decimal_default(0)) === -1) {
        this.WVFRBO = new decimal_default(0);
      }
      this.LSTOSO = this.ST.times(this.ZAHL100);
    }
    /**
     * Sonderberechnung mit sonstigen Bezüge für Berechnung bei sonstigen Bezügen
     * PAP Seite 37
     */
    MRE4SONST() {
      this.MRE4();
      this.FVB = this.FVBSO;
      this.MRE4ABZ();
      this.ZRE4VP = this.ZRE4VP.plus(this.MBV.div(this.ZAHL100)).minus(this.JRE4ENT.div(this.ZAHL100)).minus(this.SONSTENT.div(this.ZAHL100));
      this.FVBZ = this.FVBZSO;
      this.MZTABFB();
      this.VFRBS2 = this.ANP.plus(this.FVB).plus(this.FVBZ).times(this.ZAHL100).minus(this.VFRBS1);
    }
    /**
     * Tarifliche Einkommensteuer §32a EStG
     * PAP Seite 38
     */
    UPTAB26() {
      if (this.X.cmp(this.GFB.plus(this.ZAHL1)) === -1) {
        this.ST = new decimal_default(0);
      } else if (this.X.cmp(new decimal_default(17800)) === -1) {
        this.Y = this.X.minus(this.GFB).div(this.ZAHL10000).toDP(6, decimal_default.ROUND_DOWN);
        this.RW = this.Y.times(new decimal_default("914.51"));
        this.RW = this.RW.plus(new decimal_default(1400));
        this.ST = this.RW.times(this.Y).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.X.cmp(new decimal_default(69879)) === -1) {
        this.Y = this.X.minus(new decimal_default(17799)).div(this.ZAHL10000).toDP(6, decimal_default.ROUND_DOWN);
        this.RW = this.Y.times(new decimal_default("173.1"));
        this.RW = this.RW.plus(new decimal_default(2397));
        this.RW = this.RW.times(this.Y);
        this.ST = this.RW.plus(new decimal_default("1034.87")).toDP(0, decimal_default.ROUND_DOWN);
      } else if (this.X.cmp(new decimal_default(277826)) === -1) {
        this.ST = this.X.times(new decimal_default("0.42")).minus(new decimal_default("11135.63")).toDP(0, decimal_default.ROUND_DOWN);
      } else {
        this.ST = this.X.times(new decimal_default("0.45")).minus(new decimal_default("19470.38")).toDP(0, decimal_default.ROUND_DOWN);
      }
      this.ST = this.ST.times(new decimal_default(this.KZTAB));
    }
  };
  var PAP_REGISTRY = {
    2025: Pap2025,
    2026: Pap2026
  };
  function calculate(year, inputs) {
    const PapClass = PAP_REGISTRY[year];
    if (!PapClass) {
      const supported = Object.keys(PAP_REGISTRY).join(", ");
      throw new Error(`Unsupported tax year: ${year}. Supported: ${supported}`);
    }
    const pap = new PapClass();
    pap.setInputs(inputs);
    pap.calculate();
    return pap.getOutputs();
  }
  var SUPPORTED_YEARS = Object.keys(PAP_REGISTRY).map(Number);
  return __toCommonJS(index_exports);
})();
/*! Bundled license information:

decimal.js/decimal.mjs:
  (*!
   *  decimal.js v10.6.0
   *  An arbitrary-precision Decimal type for JavaScript.
   *  https://github.com/MikeMcl/decimal.js
   *  Copyright (c) 2025 Michael Mclaughlin <M8ch88l@gmail.com>
   *  MIT Licence
   *)
*/
