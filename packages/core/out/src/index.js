"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.core = exports.Author = void 0;
class Author {
    constructor(name, email) {
        this.name = name;
        this.email = email;
    }
}
exports.Author = Author;
__exportStar(require("./ref"), exports);
function core() {
    console.log('TODO: this is a test to see we can call code in other packages');
}
exports.core = core;
