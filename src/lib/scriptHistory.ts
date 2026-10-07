/**
 * Storage layout and bookkeeping for the script history.
 *
 * Every saved source lands in the adapter's file database as one file per version, next to a small
 * index that carries nothing but the metadata. Listing a history therefore reads one small file,
 * and writing a version does not rewrite the sources already there - which matters for Blockly and
 * FBD scripts, whose source is the generated code *plus* the model in one string.
 *
 * The functions here are pure so they can be tested without an adapter; `main.ts` does the file IO.
 */

/** Folder inside the instance's file area that holds every script's history */
export const HISTORY_ROOT = 'history';
/** Name of the metadata file inside a script's history folder */
export const INDEX_FILE = 'index.json';
/** Versions kept per script when the setting says nothing */
export const DEFAULT_HISTORY_VERSIONS = 30;
/** Nobody is served by more than this, whatever the setting says */
export const MAX_HISTORY_VERSIONS = 200;

/** What is known about one stored version, without its source */
export interface ScriptVersion {
    /** When it was saved, ms since the epoch - also the name of its file */
    ts: number;
    /** Which adapter wrote it, e.g. `system.adapter.admin.0` */
    from?: string;
    /** Which user wrote it, e.g. `system.user.admin` */
    user?: string;
    /** Length of the source in characters */
    size: number;
    /** Number of lines of the source */
    lines: number;
    /** The source was stored encrypted, as it is in the object (`native.protected`) */
    protected?: boolean;
}

/**
 * The file name of one version. The timestamp is the identity of a version, so it is also its name.
 *
 * @param ts timestamp of the version
 */
export function versionFileName(ts: number): string {
    return `${ts}.txt`;
}

/**
 * Where a script's history lives.
 *
 * The script id is encoded: it is a user-chosen name and may contain characters that have a meaning
 * in a path.
 *
 * @param scriptId full id of the script, e.g. `script.js.Folder.Name`
 */
export function historyFolder(scriptId: string): string {
    return `${HISTORY_ROOT}/${encodeURIComponent(scriptId)}`;
}

/**
 * Path of a script's index file.
 *
 * @param scriptId full id of the script
 */
export function indexPath(scriptId: string): string {
    return `${historyFolder(scriptId)}/${INDEX_FILE}`;
}

/**
 * Path of one stored version.
 *
 * @param scriptId full id of the script
 * @param ts timestamp of the version
 */
export function versionPath(scriptId: string, ts: number): string {
    return `${historyFolder(scriptId)}/${versionFileName(ts)}`;
}

/**
 * How many versions to keep, from the adapter setting.
 *
 * Zero switches the history off, which is why it is not simply clamped into the valid range.
 *
 * @param configured the value from the adapter settings
 */
export function resolveHistoryVersions(configured?: unknown): number {
    const requested = parseInt(configured as string, 10);
    if (isNaN(requested)) {
        return DEFAULT_HISTORY_VERSIONS;
    }
    if (requested <= 0) {
        return 0;
    }
    return Math.min(requested, MAX_HISTORY_VERSIONS);
}

/**
 * Reads an index file. Anything unreadable counts as "no history yet" rather than as an error:
 * a broken index must not stop a script from being saved.
 *
 * @param raw contents of the index file
 */
export function parseIndex(raw: string | undefined | null): ScriptVersion[] {
    if (!raw) {
        return [];
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return (parsed as ScriptVersion[])
            .filter(entry => entry && typeof entry.ts === 'number')
            .sort((a, b) => b.ts - a.ts);
    } catch {
        return [];
    }
}

/**
 * Add a version to an index and work out which stored files are now surplus.
 *
 * The newest entry stays newest even if two saves land in the same millisecond, and the very first
 * version is never dropped - it is the one worth having when everything else has scrolled away.
 *
 * @param index the index as it is on disk, newest first
 * @param entry the version that was just written
 * @param keep how many versions to keep
 */
export function addVersion(
    index: ScriptVersion[],
    entry: ScriptVersion,
    keep: number,
): { index: ScriptVersion[]; obsolete: number[] } {
    const next = [entry, ...index.filter(v => v.ts !== entry.ts)].sort((a, b) => b.ts - a.ts);
    if (next.length <= keep) {
        return { index: next, obsolete: [] };
    }
    // The oldest entry is the original state of the script and is kept on top of the quota
    const oldest = next[next.length - 1];
    const kept = next.slice(0, keep - 1);
    const obsolete = next.slice(keep - 1, next.length - 1).map(v => v.ts);
    return { index: [...kept, oldest], obsolete };
}

/**
 * Whether this change is worth a new version.
 *
 * A script object is written for all sorts of reasons - enabling it, renaming it, the adapter
 * storing its compiled form - and none of those changed the source. Without this the history would
 * be full of entries that differ in nothing.
 *
 * @param previous the source before the change, if any
 * @param next the source after the change
 */
export function isWorthStoring(previous: string | undefined | null, next: string | undefined | null): boolean {
    if (typeof next !== 'string' || !next) {
        return false;
    }
    return previous !== next;
}

/**
 * Describe a source for the index.
 *
 * @param source the source to describe
 * @param isProtected whether it is stored encrypted
 */
export function describeSource(
    source: string,
    isProtected: boolean,
): Pick<ScriptVersion, 'size' | 'lines'> & {
    protected?: boolean;
} {
    return {
        size: source.length,
        lines: source.split('\n').length,
        ...(isProtected ? { protected: true } : {}),
    };
}

/**
 * The content of a file read through the adapter, as a string.
 *
 * `readFile` answers with the content for some back ends and with `{ file, mimeType }` for others,
 * and the content itself is a string or a buffer. Everything else counts as "nothing there".
 *
 * @param raw whatever `readFileAsync` resolved with
 */
export function fileToString(raw: unknown): string {
    if (raw === null || raw === undefined) {
        return '';
    }
    const file: unknown = typeof raw === 'object' && 'file' in raw ? raw.file : raw;
    if (typeof file === 'string') {
        return file;
    }
    if (file instanceof Uint8Array) {
        return Buffer.from(file).toString('utf8');
    }
    return '';
}

/**
 * The script a history folder belongs to.
 *
 * @param folder the folder name as `readDir` reports it
 */
export function decodeFolderName(folder: string): string {
    try {
        return decodeURIComponent(folder);
    } catch {
        // A folder nobody of ours wrote - report it under its own name rather than throwing
        return folder;
    }
}

/**
 * How much one history occupies, from its index alone - the stored sources are never read for this.
 *
 * @param index the index of a script
 */
export function sumIndex(index: ScriptVersion[]): { versions: number; bytes: number } {
    return {
        versions: index.length,
        bytes: index.reduce((sum, entry) => sum + (entry.size || 0), 0),
    };
}

/**
 * A size a human can read at a glance.
 *
 * @param bytes the number of bytes
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Cut an index down to the current limit, for instance after the setting was made smaller.
 *
 * Follows the same rule as `addVersion`: the newest ones are kept and the very first version
 * survives on top of the quota.
 *
 * @param index the index as it is on disk, newest first
 * @param keep how many versions to keep; `0` drops everything
 */
export function trimIndex(index: ScriptVersion[], keep: number): { index: ScriptVersion[]; obsolete: number[] } {
    const sorted = [...index].sort((a, b) => b.ts - a.ts);
    if (!keep) {
        return { index: [], obsolete: sorted.map(v => v.ts) };
    }
    if (sorted.length <= keep) {
        return { index: sorted, obsolete: [] };
    }
    const oldest = sorted[sorted.length - 1];
    return {
        index: [...sorted.slice(0, keep - 1), oldest],
        obsolete: sorted.slice(keep - 1, sorted.length - 1).map(v => v.ts),
    };
}
