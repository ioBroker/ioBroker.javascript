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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fbBlocks = void 0;
/**
 * fb-core: the model, the block library, the checks and the code generator of function block
 * diagrams. No React, no DOM, no Node - the editor and the adapter both use it.
 *
 * The runtime the generated code calls is `./runtime`, which is Node only and not exported here. Its
 * blocks are, as `fbBlocks` - the editor runs them for the preview of a block.
 */
exports.fbBlocks = __importStar(require("./blocks"));
__exportStar(require("./types"), exports);
__exportStar(require("./library"), exports);
__exportStar(require("./graph"), exports);
__exportStar(require("./analyze"), exports);
__exportStar(require("./generate"), exports);
__exportStar(require("./time"), exports);
__exportStar(require("./js"), exports);
__exportStar(require("./user"), exports);
__exportStar(require("./layout"), exports);
//# sourceMappingURL=index.js.map