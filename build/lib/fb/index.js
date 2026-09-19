"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * fb-core: the model, the block library, the checks and the code generator of function block
 * diagrams. No React, no DOM, no Node - the editor and the adapter both use it.
 *
 * The runtime the generated code calls is `./runtime`, which is Node only and not exported here.
 */
__exportStar(require("./types"), exports);
__exportStar(require("./library"), exports);
__exportStar(require("./graph"), exports);
__exportStar(require("./analyze"), exports);
__exportStar(require("./generate"), exports);
//# sourceMappingURL=index.js.map