"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LazyTsServer = void 0;
const virtual_tsc_1 = require("virtual-tsc");
/**
 * A `virtual-tsc` `Server` that is only built when something is actually compiled.
 *
 * Creating one is far from free: its constructor reads every `lib*.d.ts` of the bundled
 * TypeScript into a virtual file system, and the first `compile()` makes the language service
 * build a program out of them plus `@types/node`, `@iobroker/types` and the user libraries.
 * Measured on Node 22 / TypeScript 6: ~10 MB for the constructor and ~95 MB for the first
 * compilation - per server, and the adapter has two of them.
 *
 * An instance that runs plain JavaScript only never needs any of it, and an instance whose
 * global scripts are all cached needs it only when a script is edited. So the server is
 * created on the first `compile()` and the ambient declarations handed to it in the meantime
 * are remembered and replayed at that point.
 *
 * `releaseMemory()` drops the language service's program and type checker again. That is what
 * holds the ~95 MB; the server stays usable and rebuilds them on the next compilation
 * (~1 s extra). See https://github.com/ioBroker/ioBroker.javascript/issues/2373.
 */
class LazyTsServer {
    server = null;
    options;
    logger;
    releaseAfterMs;
    releaseTimer = null;
    keepAlive = null;
    /**
     * Every ambient declaration the adapter has provided so far, so a server that is created
     * later - or re-created after `setOptions()` - sees exactly the same files. These are
     * references to strings the adapter holds anyway, so the map itself costs next to nothing.
     */
    declarations = {};
    /**
     * @param options Compiler options for the server
     * @param logger Log function of `virtual-tsc`, or `false` to silence it
     * @param releaseAfterMs How long to wait after the last compilation before the program and the
     *  type checker are released again. 0 keeps them forever.
     */
    constructor(options, logger, releaseAfterMs = 0) {
        this.options = options;
        this.logger = logger;
        this.releaseAfterMs = releaseAfterMs;
    }
    /**
     * While this returns true, nothing is released. The adapter uses it to keep the compiler hot
     * as long as a script editor is open, so saving a script stays fast.
     *
     * @param keepAlive Predicate that is asked every time the release is due
     */
    setKeepAlive(keepAlive) {
        this.keepAlive = keepAlive;
    }
    /**
     * Replaces the compiler options. A server that already exists is thrown away, so the next
     * compilation runs with the new options. Used once the instance configuration is known.
     *
     * @param options The new compiler options
     */
    setOptions(options) {
        this.options = options;
        // The options are baked into the language service, so it cannot be re-used
        this.server = null;
    }
    /**
     * Makes the given declaration files known to the compiler. Only remembered while no
     * server exists - they are handed over as soon as one is built.
     *
     * @param declarations The declaration files, keyed by file name
     */
    provideAmbientDeclarations(declarations) {
        Object.assign(this.declarations, declarations);
        this.server?.provideAmbientDeclarations(declarations);
    }
    /**
     * Compiles a script, building the language service if this is the first compilation.
     *
     * @param filename Name the script gets in the virtual file system
     * @param scriptContent The source code
     */
    compile(filename, scriptContent) {
        try {
            return this.get().compile(filename, scriptContent);
        }
        finally {
            this.scheduleRelease();
        }
    }
    /** Whether the underlying server exists, i.e. whether anything was compiled yet */
    isCreated() {
        return !!this.server;
    }
    /**
     * Releases the program and the type checker the language service is holding on to.
     * Everything else - the virtual file system with the declarations, the compiled scripts -
     * stays, so the next compilation only has to build the program again.
     */
    releaseMemory() {
        if (this.releaseTimer) {
            clearTimeout(this.releaseTimer);
            this.releaseTimer = null;
        }
        if (!this.server) {
            return;
        }
        // `service` is not part of the public typings of virtual-tsc
        const service = this.server.service;
        service?.cleanupSemanticCache?.();
    }
    /**
     * Forgets the given declaration files. They are gone from the virtual file system with the next
     * `unload()`, which is what actually frees them - this only makes sure they are not handed to a
     * server that is built later.
     *
     * @param fileNames The declaration files to forget
     */
    forgetDeclarations(fileNames) {
        for (const fileName of fileNames) {
            delete this.declarations[fileName];
        }
    }
    /**
     * Throws the whole server away, not just its program: the virtual file system with all
     * `lib*.d.ts` of the bundled TypeScript goes with it. The next compilation builds a new one
     * from the declarations that are still remembered, which takes about a second longer than
     * after `releaseMemory()`.
     */
    unload() {
        if (this.releaseTimer) {
            clearTimeout(this.releaseTimer);
            this.releaseTimer = null;
        }
        this.server = null;
    }
    /** Stops the pending release. To be called when the adapter shuts down. */
    destroy() {
        if (this.releaseTimer) {
            clearTimeout(this.releaseTimer);
            this.releaseTimer = null;
        }
    }
    /**
     * Restarts the countdown after which the memory is released. Scripts are compiled in bursts -
     *  at startup and when the user saves one - so the release should only happen once the burst
     *  is over.
     */
    scheduleRelease() {
        if (!this.releaseAfterMs) {
            return;
        }
        if (this.releaseTimer) {
            clearTimeout(this.releaseTimer);
        }
        this.releaseTimer = setTimeout(() => {
            this.releaseTimer = null;
            if (this.keepAlive?.()) {
                // An editor is open - stay hot and ask again later
                this.scheduleRelease();
                return;
            }
            this.releaseMemory();
        }, this.releaseAfterMs);
        // This must never be a reason for the process to stay alive
        this.releaseTimer.unref();
    }
    get() {
        if (!this.server) {
            this.server = new virtual_tsc_1.Server(this.options, this.logger);
            this.server.provideAmbientDeclarations(this.declarations);
        }
        return this.server;
    }
}
exports.LazyTsServer = LazyTsServer;
//# sourceMappingURL=lazyTsServer.js.map