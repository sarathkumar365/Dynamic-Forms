"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function migrateTemplates() {
    return __awaiter(this, void 0, void 0, function () {
        var publications, _loop_1, _i, publications_1, pub;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, prisma.publication.findMany()];
                case 1:
                    publications = _k.sent();
                    _loop_1 = function (pub) {
                        var specRaw, uiRaw, spec, uiSchema, usedKeys, _l, _m, p, _o, _p, s, _q, _r, q, base, key, i, idToKey, _s, _t, p, _u, _v, s, _w, _x, q, _y, _z, p, _0, _1, s, _2, _3, q;
                        return __generator(this, function (_4) {
                            switch (_4.label) {
                                case 0:
                                    specRaw = pub.schema;
                                    uiRaw = pub.uiSchema;
                                    spec = typeof specRaw === "string" ? JSON.parse(specRaw) : specRaw;
                                    uiSchema = typeof uiRaw === "string" ? JSON.parse(uiRaw) : uiRaw;
                                    if (!spec)
                                        return [2 /*return*/, "continue"];
                                    usedKeys = new Set();
                                    for (_l = 0, _m = (_a = spec.pages) !== null && _a !== void 0 ? _a : []; _l < _m.length; _l++) {
                                        p = _m[_l];
                                        for (_o = 0, _p = (_b = p.sections) !== null && _b !== void 0 ? _b : []; _o < _p.length; _o++) {
                                            s = _p[_o];
                                            for (_q = 0, _r = (_c = s.questions) !== null && _c !== void 0 ? _c : []; _q < _r.length; _q++) {
                                                q = _r[_q];
                                                if (!q.key || !/^[a-z][a-z0-9_]*$/.test(q.key)) {
                                                    base = (q.label || "")
                                                        .toLowerCase()
                                                        .replace(/[^a-z0-9_]+/g, "_")
                                                        .replace(/^_+|_+$/g, "");
                                                    if (!/^[a-z][a-z0-9_]*$/.test(base))
                                                        base = "q_" + q.id.slice(0, 6);
                                                    key = base;
                                                    i = 2;
                                                    while (usedKeys.has(key)) {
                                                        key = base + "_" + i;
                                                        i++;
                                                    }
                                                    q.key = key;
                                                }
                                                usedKeys.add(q.key);
                                            }
                                        }
                                    }
                                    idToKey = {};
                                    for (_s = 0, _t = (_d = spec.pages) !== null && _d !== void 0 ? _d : []; _s < _t.length; _s++) {
                                        p = _t[_s];
                                        for (_u = 0, _v = (_e = p.sections) !== null && _e !== void 0 ? _e : []; _u < _v.length; _u++) {
                                            s = _v[_u];
                                            for (_w = 0, _x = (_f = s.questions) !== null && _f !== void 0 ? _f : []; _w < _x.length; _w++) {
                                                q = _x[_w];
                                                if (q.id && q.key)
                                                    idToKey[q.id] = q.key;
                                            }
                                        }
                                    }
                                    // Remap visibleWhen fields to use keys
                                    for (_y = 0, _z = (_g = spec.pages) !== null && _g !== void 0 ? _g : []; _y < _z.length; _y++) {
                                        p = _z[_y];
                                        for (_0 = 0, _1 = (_h = p.sections) !== null && _h !== void 0 ? _h : []; _0 < _1.length; _0++) {
                                            s = _1[_0];
                                            for (_2 = 0, _3 = (_j = s.questions) !== null && _j !== void 0 ? _j : []; _2 < _3.length; _2++) {
                                                q = _3[_2];
                                                if (q.visibleWhen) {
                                                    q.visibleWhen = q.visibleWhen.map(function (clause) {
                                                        var _a, _b;
                                                        return ({
                                                            all: (_a = clause.all) === null || _a === void 0 ? void 0 : _a.map(function (cond) { return (__assign(__assign({}, cond), { field: idToKey[cond.field] || cond.field })); }),
                                                            any: (_b = clause.any) === null || _b === void 0 ? void 0 : _b.map(function (cond) { return (__assign(__assign({}, cond), { field: idToKey[cond.field] || cond.field })); }),
                                                        });
                                                    });
                                                }
                                            }
                                        }
                                    }
                                    // Optionally, recompile spec to update schema/uiSchema
                                    // If you have a compileFormSpec function, you can use it here
                                    // const { schema: newSchema, uiSchema: newUiSchema } = compileFormSpec(spec);
                                    // Update publication with fixed spec
                                    return [4 /*yield*/, prisma.publication.update({
                                            where: { id: pub.id },
                                            data: {
                                                schema: spec,
                                                uiSchema: uiSchema,
                                            },
                                        })];
                                case 1:
                                    // Optionally, recompile spec to update schema/uiSchema
                                    // If you have a compileFormSpec function, you can use it here
                                    // const { schema: newSchema, uiSchema: newUiSchema } = compileFormSpec(spec);
                                    // Update publication with fixed spec
                                    _4.sent();
                                    console.log("Fixed publication:", pub.title);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, publications_1 = publications;
                    _k.label = 2;
                case 2:
                    if (!(_i < publications_1.length)) return [3 /*break*/, 5];
                    pub = publications_1[_i];
                    return [5 /*yield**/, _loop_1(pub)];
                case 3:
                    _k.sent();
                    _k.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
migrateTemplates().then(function () {
    console.log("Migration complete");
    prisma.$disconnect();
});
