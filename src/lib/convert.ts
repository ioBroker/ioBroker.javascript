// controller uses this file when build uploads
export function stringify(data: { data: ioBroker.ScriptObject | ioBroker.ChannelObject; id: string }): {
    id: string;
    data: string | undefined;
} {
    const obj = data.data;
    let id = data.id;
    let result: string | undefined;
    if (data.data.type === 'channel') {
        id = `${id.replace(/\./g, '/').substring('script.js.'.length)}/_dir.json`;
        result = JSON.stringify(obj, null, 2);
    } else if (data.data.type === 'script') {
        id = `${id.replace(/\./g, '/').substring('script.js.'.length)}.json`;
        if ((obj as ioBroker.ScriptObject).common?.source) {
            const source = (obj as ioBroker.ScriptObject).common.source;
            if ((obj as ioBroker.ScriptObject).common.enabled) {
                // @ts-expect-error We do not use it
                delete (obj as ioBroker.ScriptObject).common.enabled;
            }
            if ((obj as ioBroker.ScriptObject).common.engine === 'system.adapter.javascript.0') {
                // @ts-expect-error We do not use it
                delete (obj as ioBroker.ScriptObject).common.engine;
            }
            if ((obj as ioBroker.ScriptObject).common.engineType === 'Javascript/js') {
                // @ts-expect-error We do not use it
                delete (obj as ioBroker.ScriptObject).common.engineType;
            }
            // @ts-expect-error We do not use it
            delete (obj as ioBroker.ScriptObject).common.name;
            // @ts-expect-error We do not use it
            delete (obj as ioBroker.ScriptObject).common.source;
            if (JSON.stringify(obj.common) !== '{}') {
                result = `/* -- do not edit following lines - START --\n${JSON.stringify(obj.common, null, 2)}\n-- do not edit previous lines - END --*/\n${source}`;
            } else {
                result = source;
            }
        } else {
            result = JSON.stringify(obj, null, 2);
        }
    }

    return { id, data: result };
}

export function parse(data: {
    data: string;
    id: string;
}): { id: string; data: ioBroker.ScriptObject; error: string | undefined } | null {
    let obj: string = data.data;
    let id = data.id;
    let error: string | undefined;
    let name: string;
    let result: ioBroker.Object | undefined;
    if (id[id.length - 1] === '/') {
        id = id.substring(0, id.length - 1);
    }

    if (!id.match(/\.json$/)) {
        return null;
    }

    if (id.match(/_dir\.json$/)) {
        name = id.substring(0, id.length - '/_dir.json'.length).replace(/\//g, '.');

        try {
            result = JSON.parse(obj);
        } catch (err: unknown) {
            error = `Cannot parse object "${name}": ${err as Error}`;
            result = {
                common: {
                    name: name.split('.').pop() || name,
                },
                type: 'channel',
                _id: `script.js.${name}`,
                native: {},
            };
        }
        id = `script.js.${name}`;
    } else {
        //script
        name = id.substring(0, id.length - '.json'.length).replace(/\//g, '.');
        let source: string;
        if (obj.match(/^\/\*\s--\sdo\snot/)) {
            obj = obj.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const lines = obj.split('\n');
            let stringObj = '';
            let line = 1;
            while (line < lines.length) {
                if (lines[line].match(/^--\sdo\snot/)) {
                    break;
                }
                stringObj += lines[line];
                line++;
            }
            lines.splice(0, line + 1);
            source = lines.join('\n');
            try {
                result = {} as ioBroker.Object;
                result.common = JSON.parse(stringObj);
                result.common.source = source;
            } catch (err: unknown) {
                error = `Cannot parse object "${id}": ${err as Error}`;
            }
        } else {
            source = obj;
        }
        result = {} as ioBroker.Object;
        result.common = result.common || {};
        result._id = `script.js.${name}`;
        result.type = 'script';
        result.common.name = name.split('.').pop() || name;
        result.common.enabled = result.common.enabled === undefined ? true : result.common.enabled;
        result.common.engine = result.common.engine || 'system.adapter.javascript.0';
        result.common.engineType = result.common.engineType || 'Javascript/js';
        result.common.source = result.common.source || source;
        id = `script.js.${name}`;
    }

    return { id: id, data: result as ioBroker.ScriptObject, error: error };
}
