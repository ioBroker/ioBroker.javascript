"use strict";
/**
 * The data model of a function block diagram (FBD, in the style of CFC).
 *
 * This part is shared: the editor draws and edits the graph, the generator turns it into
 * JavaScript. It must not depend on React, the DOM or Node, so it runs in the browser and in the
 * adapter alike.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FB_USER_PREFIX = exports.FB_RUNTIME_MODULE = exports.FB_RUNTIME_VERSION = exports.FB_FORMAT = void 0;
/** Version of the graph format - raised only when an older graph cannot be read as it is */
exports.FB_FORMAT = 1;
/** Version of the block library and of the runtime module the generated code needs */
exports.FB_RUNTIME_VERSION = '1.5.0';
/** Name under which the generated code requires the runtime module */
exports.FB_RUNTIME_MODULE = '@iobroker/fb-runtime';
/** Types of user blocks start with this, e.g. `@userFb/shutter` */
exports.FB_USER_PREFIX = '@userFb/';
//# sourceMappingURL=types.js.map