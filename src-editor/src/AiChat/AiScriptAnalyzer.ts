import type { ScriptInfo, DatapointUsage } from './AiChatTypes';

/** Extract all script infos from ioBroker objects */
export function getAllScripts(objects: Record<string, ioBroker.ScriptObject | ioBroker.ChannelObject>): ScriptInfo[] {
    const scripts: ScriptInfo[] = [];
    for (const id of Object.keys(objects)) {
        const obj = objects[id];
        if (obj?.type !== 'script') {
            continue;
        }
        const common = obj.common;
        if (!common?.source) {
            continue;
        }
        let name: string;
        if (typeof common.name === 'object' && common.name) {
            name = (common.name as Record<string, string>).en || (common.name as Record<string, string>).de || id;
        } else {
            name = common.name || id;
        }
        scripts.push({
            id,
            name,
            source: common.source,
            engineType: common.engineType || 'Javascript/js',
            enabled: common.enabled ?? false,
        });
    }
    return scripts;
}

// Patterns that indicate datapoint usage in ioBroker scripts (literal string references)
const USAGE_PATTERNS: { regex: (dp: string) => RegExp; type: DatapointUsage['usageType'] }[] = [
    { regex: dp => new RegExp(`getState\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'read' },
    { regex: dp => new RegExp(`setState\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'write' },
    { regex: dp => new RegExp(`setStateChanged\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'write' },
    { regex: dp => new RegExp(`setStateDelayed\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'write' },
    { regex: dp => new RegExp(`on\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'subscribe' },
    {
        regex: dp => new RegExp(`on\\s*\\(\\s*\\{[^}]*id\\s*:\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'),
        type: 'subscribe',
    },
    { regex: dp => new RegExp(`subscribe\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'subscribe' },
    { regex: dp => new RegExp(`existsState\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'exists' },
    { regex: dp => new RegExp(`existsObject\\s*\\(\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'exists' },
    // Also match variable assignments containing the datapoint ID (e.g. const lichtID = 'zigbee2mqtt.0.lamp.state')
    { regex: dp => new RegExp(`=\\s*['"\`]${escapeRegex(dp)}['"\`]`, 'g'), type: 'read' },
];

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find all scripts that use a specific datapoint ID */
export function findScriptsUsingDatapoint(scripts: ScriptInfo[], datapointId: string): DatapointUsage[] {
    const results: DatapointUsage[] = [];

    for (const script of scripts) {
        // Quick check: skip scripts that don't contain the datapoint at all
        if (!script.source.includes(datapointId)) {
            continue;
        }

        const lines = script.source.split('\n');

        for (const pattern of USAGE_PATTERNS) {
            const regex = pattern.regex(datapointId);
            let match: RegExpExecArray | null;
            while ((match = regex.exec(script.source)) !== null) {
                // Find line number
                const upToMatch = script.source.substring(0, match.index);
                const lineNumber = upToMatch.split('\n').length;
                const line = lines[lineNumber - 1]?.trim() || '';

                // Avoid duplicate entries for same script+line+type
                if (
                    !results.some(
                        r => r.scriptId === script.id && r.lineNumber === lineNumber && r.usageType === pattern.type,
                    )
                ) {
                    let scriptName: string;
                    if (typeof script.name === 'string') {
                        scriptName = script.name;
                    } else {
                        scriptName = script.id;
                    }
                    results.push({
                        scriptId: script.id,
                        scriptName,
                        usageType: pattern.type,
                        lineNumber,
                        line,
                    });
                }
            }
        }
    }

    return results;
}

// Maximum total characters for all script sources in the system prompt
const MAX_ALL_SCRIPTS_CHARS = 200000;

/**
 * Extract compiled JavaScript from a Blockly script source.
 * Blockly source format: "compiled JS\n//<base64 encoded XML>"
 */
export function extractBlocklyCompiledCode(source: string): string | null {
    // Blockly source format: compiled JS code followed by a base64 comment like:
    // //<base64 encoded XML of the Blockly workspace>
    // The base64 comment is typically a very long single line starting with //

    // Strategy 1: Look for the base64 XML marker - it's a comment with base64 content
    // Base64 of URL-encoded XML always starts with "PH" or "JT" (from <xml or %3C)
    const base64Regex = /\n\/\/((?:[A-Za-z0-9+/=]){50,})$/;
    const base64Match = source.match(base64Regex);
    if (base64Match) {
        const jsCode = source.substring(0, source.length - base64Match[0].length).trim();
        if (jsCode && !jsCode.startsWith('<xml') && !jsCode.startsWith('<block')) {
            return jsCode;
        }
    }

    // Strategy 2: Find last line that is a very long comment (>200 chars, likely base64)
    const lines = source.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('//') && trimmed.length > 200 && /^\/\/[A-Za-z0-9+/=%]+$/.test(trimmed)) {
            const jsCode = lines.slice(0, i).join('\n').trim();
            if (jsCode && !jsCode.startsWith('<xml') && !jsCode.startsWith('<block')) {
                return jsCode;
            }
        }
    }

    // Strategy 3: Source doesn't start with XML tags - treat as plain JS
    const trimmedSource = source.trim();
    if (
        !trimmedSource.startsWith('<xml') &&
        !trimmedSource.startsWith('<block') &&
        !trimmedSource.startsWith('<?xml')
    ) {
        return trimmedSource;
    }

    return null;
}

/** Extract useful info from Blockly XML source (state IDs, function calls, values) */
function extractBlocklyInfo(xmlSource: string): string {
    const info: string[] = [];

    // Extract state/object IDs from <field name="OID">...</field> and similar
    const oidRegex = /<field name="OID">([^<]+)<\/field>/gi;
    const oids = new Set<string>();
    let oidMatch: RegExpExecArray | null;
    while ((oidMatch = oidRegex.exec(xmlSource)) !== null) {
        oids.add(oidMatch[1]);
    }
    if (oids.size > 0) {
        info.push(`Datapoints used: ${[...oids].join(', ')}`);
    }

    // Extract values from <field name="VALUE">...</field>
    const valRegex = /<field name="(?:VALUE|TEXT|NUM|DELAY_MS|CRON)">([^<]+)<\/field>/gi;
    const vals: string[] = [];
    let valMatch: RegExpExecArray | null;
    while ((valMatch = valRegex.exec(xmlSource)) !== null) {
        if (valMatch[1].trim()) {
            vals.push(`${valMatch[1].trim()}`);
        }
    }
    if (vals.length > 0) {
        info.push(`Values/parameters: ${vals.join(', ')}`);
    }

    // Extract block types to understand what the script does
    const blockRegex = /<block type="([^"]+)"/gi;
    const blockTypes = new Set<string>();
    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = blockRegex.exec(xmlSource)) !== null) {
        blockTypes.add(blockMatch[1]);
    }

    // Map block types to human-readable descriptions
    const actions: string[] = [];
    for (const bt of blockTypes) {
        if (bt.includes('on_ext') || bt.includes('on_source')) {
            actions.push('subscribes to state changes (trigger)');
        }
        if (bt.includes('set') || bt.includes('update')) {
            actions.push('sets state values');
        }
        if (bt.includes('get')) {
            actions.push('reads state values');
        }
        if (bt.includes('cron') || bt.includes('schedule')) {
            actions.push('uses time schedule/cron');
        }
        if (bt.includes('telegram') || bt.includes('sendto')) {
            actions.push('sends messages (sendTo)');
        }
        if (bt.includes('timeout') || bt.includes('delay')) {
            actions.push('uses delays/timeouts');
        }
        if (bt.includes('log') || bt.includes('debug')) {
            actions.push('logging');
        }
        if (bt.includes('if') || bt.includes('logic') || bt.includes('controls_if')) {
            actions.push('conditional logic (if/else)');
        }
    }
    if (actions.length > 0) {
        info.push(`Actions: ${[...new Set(actions)].join(', ')}`);
    }

    // Extract comment blocks
    const commentRegex = /<comment[^>]*>([^<]+)<\/comment>/gi;
    const comments: string[] = [];
    let commentMatch: RegExpExecArray | null;
    while ((commentMatch = commentRegex.exec(xmlSource)) !== null) {
        if (commentMatch[1].trim()) {
            comments.push(commentMatch[1].trim());
        }
    }
    if (comments.length > 0) {
        info.push(`Comments: ${comments.join('; ')}`);
    }

    return info.length > 0 ? info.join('\n') : 'No details could be extracted from the Blockly XML.';
}

/**
 * Build a detailed summary of all scripts, including source code for the AI system prompt.
 */
export function buildScriptSummary(scripts: ScriptInfo[], noSizeLimit = false): string {
    if (scripts.length === 0) {
        return 'No scripts found.';
    }

    const parts: string[] = ['All scripts in this ioBroker installation:\n'];
    let totalChars = 0;
    let truncated = false;

    for (const script of scripts) {
        const status = script.enabled ? 'active' : 'inactive';
        const isBlockly = script.engineType === 'Blockly' || script.engineType === 'Rules';
        const isTS = script.engineType.includes('TypeScript');
        const typeLabel = isBlockly ? 'Blockly' : isTS ? 'TS' : 'JS';
        // Show full path structure: script.js.common.Licht.Carport -> common/Licht/Carport
        const path = script.id.replace(/^script\.js\./, '').replace(/\./g, '/');
        const header = `### ${path} [${typeLabel}, ${status}] (${script.id})`;

        let entry: string;
        if (isBlockly) {
            // Blockly scripts store compiled JS + base64 XML in source
            // Format: "compiled JS code\n//<base64 encoded XML>"
            const compiledJs = extractBlocklyCompiledCode(script.source);
            if (compiledJs) {
                entry = `${header}\nThis is a Blockly script. Compiled JavaScript:\n\`\`\`javascript\n${compiledJs}\n\`\`\`\n`;
            } else {
                // Fallback: extract info from XML
                const blocklyInfo = extractBlocklyInfo(script.source);
                entry = `${header}\nThis is a Blockly (visual programming) script. Extracted information:\n${blocklyInfo}\n`;
            }
        } else {
            const langTag = isTS ? 'typescript' : 'javascript';
            const codeBlock = `\`\`\`${langTag}\n${script.source}\n\`\`\``;
            entry = `${header}\n${codeBlock}\n`;
        }

        if (!noSizeLimit && totalChars + entry.length > MAX_ALL_SCRIPTS_CHARS) {
            truncated = true;
            parts.push(`${header}\n(source too large to include)\n`);
        } else {
            parts.push(entry);
            totalChars += entry.length;
        }
    }

    if (truncated) {
        parts.push(
            '\nNote: Some script sources were omitted due to size. The user can ask about specific scripts by name.',
        );
    }

    return parts.join('\n');
}
