/**
 * VS-Code-style "find where this code block belongs" matching.
 *
 * When the user clicks "Show diff" on an AI reply that has NO captured source
 * range (legacy messages, free-form /ask without selection, etc.), we try to
 * locate the correct spot inside the current script by looking at the AI block
 * itself — exactly what VS Code Copilot does when applying a code suggestion
 * from the chat panel.
 *
 * Two-stage matching:
 *   1. matchByName: parse the AI block for top-level function/class/arrow
 *      declarations; if any of those names exist in the current script, we
 *      use that symbol's range. Fast and precise.
 *   2. matchBySimilarity: sliding window over the script lines, score by how
 *      many non-trivial AI-block lines appear in each window. Picks the best
 *      score if it passes the threshold.
 *
 * If neither works, returns null and the caller falls back to the modal.
 */

import { findCodeLensSymbols } from './aiCodeLensProvider';

export interface TargetRange {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

export interface MatchResult {
    range: TargetRange;
    /**
     * 0..1. For name matches: always 1. For similarity: fraction of AI-block
     *  significant lines found in the best window.
     */
    confidence: number;
    method: 'name' | 'similarity';
    /** The matched symbol name (name-match only), useful for UI tooltips. */
    matchedName?: string;
}

/**
 * Balanced-brace scan to find the last line of the symbol starting at `startLine1Based`.
 *  Handles curly braces only (good enough for function/class bodies in JS/TS).
 *  Falls back to the naive "next symbol line - 1" if no brace pair is found.
 */
function findSymbolEndByBraces(scriptLines: string[], startLine1Based: number, fallback: number): number {
    let depth = 0;
    let sawOpen = false;
    for (let i = startLine1Based - 1; i < scriptLines.length; i++) {
        const line = scriptLines[i];
        for (let ci = 0; ci < line.length; ci++) {
            const ch = line[ci];
            if (ch === '{') {
                depth++;
                sawOpen = true;
            } else if (ch === '}') {
                depth--;
                if (sawOpen && depth === 0) {
                    return i + 1;
                }
            }
        }
    }
    return fallback;
}

/**
 * Try to find where the AI block belongs by matching function/class names.
 *  Returns null if the AI block has no detectable top-level symbols, or none
 *  of them exist in the script.
 */
export function matchByName(aiBlock: string, scriptSource: string): MatchResult | null {
    if (!aiBlock || !scriptSource) {
        return null;
    }
    const aiSymbols = findCodeLensSymbols(aiBlock);
    if (!aiSymbols.length) {
        return null;
    }
    const scriptSymbols = findCodeLensSymbols(scriptSource);
    if (!scriptSymbols.length) {
        return null;
    }
    const scriptLines = scriptSource.split('\n');

    // name -> {line, endLine} in the script. If the same name occurs twice, first wins.
    // End line is detected via balanced-brace counting so we don't swallow
    // unrelated code between this function and the next top-level symbol.
    const scriptByName = new Map<string, { line: number; endLine: number }>();
    for (let i = 0; i < scriptSymbols.length; i++) {
        const s = scriptSymbols[i];
        if (scriptByName.has(s.name)) {
            continue;
        }
        const fallback = i + 1 < scriptSymbols.length ? scriptSymbols[i + 1].line - 1 : scriptLines.length;
        const endLine = findSymbolEndByBraces(scriptLines, s.line, fallback);
        scriptByName.set(s.name, { line: s.line, endLine });
    }

    // Walk the AI block's symbols top-down; return the first one with a script hit.
    for (const sym of aiSymbols) {
        const hit = scriptByName.get(sym.name);
        if (hit) {
            const lastLine = scriptLines[hit.endLine - 1] ?? '';
            return {
                range: {
                    startLine: hit.line,
                    startColumn: 1,
                    endLine: hit.endLine,
                    endColumn: lastLine.length + 1,
                },
                confidence: 1,
                method: 'name',
                matchedName: sym.name,
            };
        }
    }
    return null;
}

/**
 * A line is "significant" if it has real content — not empty, not just braces
 *  or punctuation. Those noisy lines occur everywhere and would boost every
 *  window score uniformly, washing out the signal.
 */
function isSignificantLine(trimmed: string): boolean {
    if (trimmed.length < 4) {
        return false;
    }
    // Lines of pure punctuation / braces are noise.
    if (/^[{}();,]+$/.test(trimmed)) {
        return false;
    }
    return true;
}

/**
 * Sliding-window similarity match. For each start position in the script, compute
 *  how many significant AI-block lines appear inside a window of similar size.
 *  The best start with score >= threshold wins.
 *
 *  Window size is aiBlockSize, but we allow the script side to be up to 50% larger
 *  so the match works even if the AI's reply was slightly shorter than the existing
 *  function (e.g. compressed into a one-liner).
 */
export function matchBySimilarity(aiBlock: string, scriptSource: string, threshold = 0.5): MatchResult | null {
    if (!aiBlock || !scriptSource) {
        return null;
    }
    const aiLines = aiBlock.split('\n');
    const scriptLines = scriptSource.split('\n');
    if (aiLines.length < 2 || scriptLines.length < 2) {
        return null;
    }

    const significant = new Set<string>();
    for (const line of aiLines) {
        const t = line.trim();
        if (isSignificantLine(t)) {
            significant.add(t);
        }
    }
    // Need at least 2 distinct signal lines for a meaningful match.
    if (significant.size < 2) {
        return null;
    }

    const aiSize = aiLines.length;
    const maxWindow = Math.ceil(aiSize * 1.5);
    const minWindow = Math.max(2, Math.floor(aiSize * 0.5));

    let bestStart = -1;
    let bestEnd = -1;
    let bestScore = 0;

    // Precompute which script line indices contain a significant AI line
    // (tight hot loop → O(n) preprocessing + O(n) sweep via prefix sums).
    const hits = new Uint8Array(scriptLines.length);
    for (let i = 0; i < scriptLines.length; i++) {
        if (significant.has(scriptLines[i].trim())) {
            hits[i] = 1;
        }
    }
    // Prefix sum of hits for O(1) window scoring.
    const prefix = new Int32Array(scriptLines.length + 1);
    for (let i = 0; i < scriptLines.length; i++) {
        prefix[i + 1] = prefix[i] + hits[i];
    }

    for (let start = 0; start + minWindow <= scriptLines.length; start++) {
        const end = Math.min(start + maxWindow, scriptLines.length);
        const matches = prefix[end] - prefix[start];
        const score = matches / significant.size;
        if (score > bestScore) {
            bestScore = score;
            bestStart = start;
            bestEnd = end;
        }
    }

    if (bestStart < 0 || bestScore < threshold) {
        return null;
    }

    // Shrink the window from the right as long as the last lines contribute no hits.
    // Keeps the range tight around the actually matching content.
    while (bestEnd > bestStart + 1 && !hits[bestEnd - 1]) {
        bestEnd--;
    }
    while (bestStart < bestEnd - 1 && !hits[bestStart]) {
        bestStart++;
    }

    const lastLine = scriptLines[bestEnd - 1] ?? '';
    return {
        range: {
            startLine: bestStart + 1,
            startColumn: 1,
            endLine: bestEnd,
            endColumn: lastLine.length + 1,
        },
        confidence: bestScore,
        method: 'similarity',
    };
}

/**
 * Returns true if every non-empty line of the block looks like a comment
 *  (//-style, JSDoc open, JSDoc body star, or JSDoc close). Used to detect
 *  "pure comment block" AI replies so we can match them against the script's
 *  existing comment blocks instead of inserting a duplicate.
 */
function isPureCommentBlock(block: string): boolean {
    const lines = block
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
    if (lines.length === 0) {
        return false;
    }
    return lines.every(l => l.startsWith('//') || l.startsWith('/*') || l.startsWith('*') || l.endsWith('*/'));
}

/**
 * Find contiguous comment blocks (JSDoc or //-runs) in the script. Returns
 *  1-based start/end lines for each block.
 */
function findCommentBlocks(scriptLines: string[]): { startLine: number; endLine: number }[] {
    const blocks: { startLine: number; endLine: number }[] = [];
    let inBlock = false;
    let blockKind: 'jsdoc' | 'line' | null = null;
    let startLine = 0;

    for (let i = 0; i < scriptLines.length; i++) {
        const t = scriptLines[i].trim();
        if (!inBlock) {
            if (t.startsWith('/*')) {
                inBlock = true;
                blockKind = 'jsdoc';
                startLine = i + 1;
                if (t.includes('*/')) {
                    blocks.push({ startLine, endLine: i + 1 });
                    inBlock = false;
                    blockKind = null;
                }
            } else if (t.startsWith('//')) {
                inBlock = true;
                blockKind = 'line';
                startLine = i + 1;
            }
        } else if (blockKind === 'jsdoc') {
            if (t.endsWith('*/') || t.includes('*/')) {
                blocks.push({ startLine, endLine: i + 1 });
                inBlock = false;
                blockKind = null;
            }
        } else if (blockKind === 'line') {
            if (!t.startsWith('//') && t.length > 0) {
                // End of a run of `//` comments — close the block at the previous line.
                blocks.push({ startLine, endLine: i });
                inBlock = false;
                blockKind = null;
            } else if (t.length === 0) {
                // Empty line inside a //-run → also end the block.
                blocks.push({ startLine, endLine: i });
                inBlock = false;
                blockKind = null;
            }
        }
    }
    if (inBlock && startLine > 0) {
        blocks.push({ startLine, endLine: scriptLines.length });
    }
    return blocks;
}

/**
 * When the AI block is a comment-only block (e.g. rewording a JSDoc), match it
 *  to the best-overlapping comment block in the script. Uses the same non-trivial-
 *  line overlap score as matchBySimilarity, but scoped to comment ranges only.
 */
export function matchCommentBlock(aiBlock: string, scriptSource: string, threshold = 0.2): MatchResult | null {
    if (!isPureCommentBlock(aiBlock) || !scriptSource) {
        return null;
    }
    const scriptLines = scriptSource.split('\n');
    const comments = findCommentBlocks(scriptLines);
    if (!comments.length) {
        return null;
    }

    // Significant tokens from the AI block (ignore pure delimiter lines)
    const aiSignificant = new Set<string>();
    for (const raw of aiBlock.split('\n')) {
        const t = raw.trim();
        // Strip leading comment delimiters so reworded comments still match word-wise.
        const normalized = t
            .replace(/^\/\*+/, '')
            .replace(/\*+\/$/, '')
            .replace(/^\/\//, '')
            .replace(/^\*+/, '')
            .trim();
        if (normalized.length >= 3) {
            aiSignificant.add(normalized.toLowerCase());
        }
    }

    if (aiSignificant.size === 0) {
        // Nothing discriminating — if there's exactly one comment block in the script,
        // bet on that; otherwise bail and let the next matcher try.
        if (comments.length === 1) {
            const c = comments[0];
            const lastLine = scriptLines[c.endLine - 1] ?? '';
            return {
                range: {
                    startLine: c.startLine,
                    startColumn: 1,
                    endLine: c.endLine,
                    endColumn: lastLine.length + 1,
                },
                confidence: 0.5,
                method: 'similarity',
            };
        }
        return null;
    }

    let best = comments[0];
    let bestScore = 0;
    for (const c of comments) {
        let matches = 0;
        for (let i = c.startLine - 1; i < c.endLine; i++) {
            const t = scriptLines[i]
                .trim()
                .replace(/^\/\*+/, '')
                .replace(/\*+\/$/, '')
                .replace(/^\/\//, '')
                .replace(/^\*+/, '')
                .trim()
                .toLowerCase();
            if (t && aiSignificant.has(t)) {
                matches++;
            }
        }
        const score = matches / aiSignificant.size;
        if (score > bestScore) {
            bestScore = score;
            best = c;
        }
    }

    // If overlap is very low but there's only ONE comment block in the script,
    // still match it — a reworded JSDoc may share almost no literal tokens.
    if (bestScore < threshold) {
        if (comments.length === 1) {
            bestScore = Math.max(bestScore, 0.3);
        } else {
            return null;
        }
    }

    const lastLine = scriptLines[best.endLine - 1] ?? '';
    return {
        range: {
            startLine: best.startLine,
            startColumn: 1,
            endLine: best.endLine,
            endColumn: lastLine.length + 1,
        },
        confidence: bestScore,
        method: 'similarity',
    };
}

/**
 * Orchestrator: try name-based match first (precise), then comment-block match
 *  (for JSDoc / //-comment rewordings), then generic similarity scanning.
 *  Returns null when no strategy yields a usable anchor.
 */
export function findBestTarget(
    aiBlock: string,
    scriptSource: string,
    options?: { similarityThreshold?: number },
): MatchResult | null {
    const byName = matchByName(aiBlock, scriptSource);
    if (byName) {
        return byName;
    }
    const byComment = matchCommentBlock(aiBlock, scriptSource);
    if (byComment) {
        return byComment;
    }
    return matchBySimilarity(aiBlock, scriptSource, options?.similarityThreshold);
}
