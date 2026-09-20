import{Cr as e,Er as t,Et as n,Gt as r,Ht as i,Jn as a,Jt as o,Kt as s,Nr as c,Or as l,Tn as u,Tt as d,Wt as f,an as p,ar as m,kr as h,ln as g,m as _,on as v,or as y,sn as b,sr as x,xn as S,yn as C}from"./_virtual_mf___mfe_internal__iobroker_javascript__mf_owner__180366418666083__loadShare___mf_0_iobroker_mf_1_gui_mf_2_components__loadShare__.js-NI-3Uv4e.js";var ee=a([y(`path`,{d:`M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1m0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5z`},`0`),y(`path`,{d:`M17.5 10.5c.88 0 1.73.09 2.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99M13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.3-4.5.83m4.5 1.84c-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26v-1.52c-.79-.16-1.64-.24-2.5-.24`},`1`)],`MenuBook`);c();var w=/^(#{1,6})\s+(.*?)\s*#*\s*$/,T=/^\s*```/,E=/^(\s*)[-*+]\s+(.*)$/,D=/^(\s*)(\d+)\.\s+(.*)$/,O=/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,k=/`([^`]+)`|\\([!-/:-@[-`{-~])|\*\*\*(\S(?:.*?\S)??)\*\*\*|\*\*(\S(?:.*?\S)??)\*\*|\*([^*\s](?:[^*]*?[^*\s])?)\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()`]*[^\s<>()`.,;:!?'"*])/g;function A(e){let t=[],n=new RegExp(k.source,`g`),r=0,i,a=e=>{let n=t[t.length-1];(n==null?void 0:n.type)===`text`?n.text+=e:e&&t.push({type:`text`,text:e})};for(;(i=n.exec(e))!==null;){a(e.slice(r,i.index));let[,n,o,s,c,l,u,d,f]=i;n===void 0?o===void 0?s===void 0?c===void 0?l===void 0?f===void 0?t.push({type:`link`,href:d,children:A(u)}):t.push({type:`link`,href:f,children:[{type:`text`,text:f}]}):t.push({type:`em`,children:A(l)}):t.push({type:`strong`,children:A(c)}):t.push({type:`strong`,children:[{type:`em`,children:A(s)}]}):a(o):t.push({type:`code`,text:n}),r=i.index+i[0].length}return a(e.slice(r)),t}function j(e){return(typeof e==`string`?A(e):e).map(e=>`children`in e?j(e.children):e.text).join(``)}function M(e,t){let n=e.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu,``).replace(/ /g,`-`),r=n;for(;t.has(r);){let e=(t.get(n)||0)+1;t.set(n,e),r=`${n}-${e}`}return t.set(r,0),r}function N(e){return e.trim().replace(/^\|/,``).replace(/(?<!\\)\|$/,``).split(/(?<!\\)\|/).map(e=>e.trim())}function P(e,t){return e[t].trim().startsWith(`|`)&&O.test(e[t+1]||``)}function F(e,t){let n=e[t];return w.test(n)||T.test(n)||P(e,t)||E.test(n)||D.test(n)}var I=e=>e.replace(/\t/g,`    `).length;function L(e){let t=e.split(/\r?\n/),n=[],r=new Map;for(let e=0;e<t.length;e++){let i=t[e];if(!i.trim())continue;if(T.test(i)){let r=[];for(e++;e<t.length&&!T.test(t[e]);e++)r.push(t[e]);n.push({type:`code`,text:r.join(`
`)});continue}let a=w.exec(i);if(a){let e=j(a[2]);n.push({type:`heading`,level:a[1].length,source:a[2],text:e,anchor:M(e,r)});continue}if(P(t,e)){let r=N(i),a=[];for(e+=2;e<t.length&&t[e].trim().startsWith(`|`);e++)a.push(N(t[e]));e--,n.push({type:`table`,header:r,rows:a});continue}let o=D.exec(i);if(o||E.test(i)){let r=!!o,a=r?D:E,s=I((o||E.exec(i))[1]),c=[];for(;e<t.length&&t[e].trim();e++){let n=a.exec(t[e]);if(n){let e=I(n[1]);c.push({text:n[n.length-1],depth:e>s?Math.ceil((e-s)/4):0})}else if(F(t,e))break;else c[c.length-1].text+=` ${t[e].trim()}`}e--,n.push({type:`list`,ordered:r,start:o?parseInt(o[2],10):1,items:c});continue}let s=[i.trim()];for(e++;e<t.length&&t[e].trim()&&!F(t,e);e++)s.push(t[e].trim());e--,n.push({type:`paragraph`,text:s.join(` `)})}return n}function R(e){let t=e.findIndex(e=>e.type===`heading`&&/^((table of )?contents?|inhalt(sverzeichnis)?)$/i.test(e.text.trim()));if(t===-1)return e;let{level:n}=e[t],r=t+1;for(;r<e.length&&!(e[r].type===`heading`&&e[r].level<=n);){if(e[r].type!==`list`)return e;r++}return[...e.slice(0,t),...e.slice(r)]}var z=/^([A-Za-z_$][\w$]*)(?:\s+-\s+(.*))?$/;function B(e){return e.filter(e=>e.type===`heading`&&e.level<=3).map(e=>{let t=e.text.replace(/:\s*$/,``),n=e.level>=3?z.exec(t):null;return{level:e.level,anchor:e.anchor,name:n?n[1]:t,description:(n==null?void 0:n[2])||``,text:t,code:!!n}})}function V(e,t){if(!t)return null;let n=e.find(e=>e.level>=3&&e.name===t);return n?n.anchor:null}function H(e,t){let n=t.toLowerCase().split(/\s+/).filter(Boolean);return n.length?e.filter(e=>{let t=e.text.toLowerCase();return n.every(e=>t.includes(e))}):e}function U(e,t){return e.startsWith(`#`)?{anchor:decodeURIComponent(e.slice(1)).toLowerCase()}:/^[a-z][a-z\d+.-]*:/i.test(e)?{url:e}:{url:new URL(e,t).href}}var W=`doc-`,G={fontFamily:`ui-monospace, "Cascadia Code", Consolas, monospace`,fontSize:`0.85em`,px:.6,py:.15,borderRadius:.5,bgcolor:`action.hover`},K={1:{fontSize:`1.6rem`,fontWeight:500,mt:0,mb:1.5},2:{fontSize:`1.4rem`,fontWeight:500,mt:5,mb:1,pb:.5,borderBottom:1,borderColor:`divider`},3:{fontSize:`1.15rem`,fontWeight:600,mt:4,mb:.75},4:{fontSize:`1rem`,fontWeight:600,mt:2.5,mb:.5},5:{fontSize:`0.95rem`,fontWeight:600,mt:2,mb:.5},6:{fontSize:`0.9rem`,fontWeight:600,mt:2,mb:.5}};function q(e,t,n){return e.map((e,r)=>{let i=`${t}-${r}`;switch(e.type){case`text`:return e.text;case`code`:return y(s,{component:`code`,sx:G,children:e.text},i);case`strong`:return y(`strong`,{children:q(e.children,i,n)},i);case`em`:return y(`em`,{children:q(e.children,i,n)},i);case`link`:{let t=U(e.href,n.base);return`anchor`in t?y(u,{href:`#${t.anchor}`,onClick:e=>{e.preventDefault(),n.onAnchor(t.anchor)},children:q(e.children,i,n)},i):y(u,{href:t.url,target:`_blank`,rel:`noreferrer`,children:q(e.children,i,n)},i)}default:return null}})}function J(e){let t=(t,n)=>q(A(t),n,e);return y(m,{children:e.blocks.map((e,n)=>{let i=`b${n}`;switch(e.type){case`heading`:return y(r,{id:`${W}${e.anchor}`,"data-level":e.level,component:`h${e.level}`,sx:{...K[e.level],...n===0?{mt:0}:void 0,scrollMarginTop:12},children:t(e.source,i)},i);case`paragraph`:return y(r,{sx:{my:1.25,lineHeight:1.65},children:t(e.text,i)},i);case`code`:return y(s,{component:`pre`,sx:{...G,px:1.5,py:1.25,my:1.5,overflowX:`auto`,fontSize:12.5,lineHeight:1.5,border:1,borderColor:`divider`},children:e.text},i);case`table`:return y(s,{sx:{my:1.5,overflowX:`auto`},children:x(s,{component:`table`,sx:{borderCollapse:`collapse`,width:`100%`,fontSize:14,"& td, & th":{border:1,borderColor:`divider`,px:1,py:.6,textAlign:`left`,verticalAlign:`top`},"& th":{bgcolor:`action.hover`,fontWeight:500}},children:[e.header.some(e=>e)?y(`thead`,{children:y(`tr`,{children:e.header.map((e,n)=>y(`th`,{children:t(e,`${i}h${n}`)},n))})}):null,y(`tbody`,{children:e.rows.map((e,n)=>y(`tr`,{children:e.map((e,r)=>y(`td`,{children:t(e,`${i}r${n}c${r}`)},r))},n))})]})},i);case`list`:return y(s,{component:e.ordered?`ol`:`ul`,start:e.ordered&&e.start!==1?e.start:void 0,sx:{my:1.25,pl:3,lineHeight:1.65,"& li":{mb:.5}},children:e.items.map((e,n)=>y(s,{component:`li`,sx:e.depth?{ml:e.depth*3}:void 0,children:t(e.text,`${i}i${n}`)},n))},i);default:return null}})})}var te=`## Content
- [Global functions](#global-functions)
    - [Best practice](#best-practice)

- [Functions](#the-following-functions-can-be-used-in-scripts)
    - [require - load some module](#require---load-some-module)
    - [console - Gives out the message into log](#console---gives-out-the-message-into-log)
    - [exec - execute some OS command, like "cp file1 file2"](#exec---execute-some-os-command-like-cp-file1-file2)
    - [on - Subscribe on changes or updates of some state](#on---subscribe-on-changes-or-updates-of-some-state)
    - [once](#once)
    - [subscribe - same as on](#subscribe---same-as-on)
    - [unsubscribe](#unsubscribe)
    - [getSubscriptions](#getsubscriptions)
    - [getFileSubscriptions](#getfilesubscriptions)
    - [schedule](#schedule)
        - [Time schedule](#time-schedule)
        - [Astro-function](#astro-function)
    - [scheduleById](#schedulebyid)
    - [getSchedules](#getschedules)
    - [clearSchedule](#clearschedule)
    - [getAttr](#getattr)
    - [getAstroDate](#getastrodate)
    - [isAstroDay](#isastroday)
    - [compareTime](#comparetime)
    - [setState](#setstate)
    - [setStateAsync](#setstateasync)
    - [setStateDelayed](#setstatedelayed)
    - [clearStateDelayed](#clearstatedelayed)
    - [getStateDelayed](#getstatedelayed)
    - [getState](#getstate)
    - [getStateAsync](#getstateasync)
    - [existsState](#existsState)
    - [getObject](#getobject)
    - [setObject](#setobject)
    - [existsObject](#existsObject)
    - [extendObject](#extendobject)
    - [deleteObject](#deleteobject)
    - [getIdByName](#getidbyname)
    - [getEnums](#getenums)
    - [createState](#createstate)
    - [createStateAsync](#createstateasync)
    - [deleteState](#deletestate)
    - [deleteStateAsync](#deletestateasync)
    - [sendTo](#sendto)
    - [sendToAsync](#sendtoasync)
    - [sendToHost](#sendtohost)
    - [sendToHostAsync](#sendtohostasync)
    - [setInterval](#setinterval)
    - [clearInterval](#clearinterval)
    - [setTimeout](#settimeout)
    - [clearTimeout](#cleartimeout)
    - [setImmediate](#setImmediate)
    - [formatDate](#formatdate)
    - [formatTimeDiff](#formattimediff)
    - [getDateObject](#getDateObject)
    - [formatValue](#formatvalue)
    - [adapterSubscribe](#adaptersubscribe)
    - [adapterUnsubscribe](#adapterunsubscribe)
    - [$ - Selector](#---selector)
    - [readFile](#readfile)
    - [writeFile](#writefile)
    - [delFile](#delFile)
    - [renameFile](#renameFile)
    - [onFile](#onFile)
    - [offFile](#offFile)
    - [onStop](#onstop)
    - [getHistory](#gethistory)
    - [runScript](#runscript)
    - [runScriptAsync](#runScriptAsync)
    - [startScript](#startscript)
    - [startScriptAsync](#startscriptasync)
    - [stopScript](#stopscript)
    - [stopScriptAsync](#stopScriptAsync)
    - [isScriptActive](#isscriptactive)
    - [name](#scriptName)
    - [instance](#instance)
    - [SECRETS](#secrets)
    - [messageTo](#messageto)
    - [messageToAsync](#messagetoasync)
    - [onMessage](#onmessage)
    - [onMessageUnregister](#onmessageunregister)
    - [onLog](#onlog)
    - [onLogUnregister](#onlogunregister)
    - [wait](#wait)
    - [sleep](#sleep)
    - [httpGet](#httpget)
    - [httpPost](#httppost)
    - [createTempFile](#createtempfile)
    - [registerNotification](#registerNotification)

- [Scripts activity](#scripts-activity)

## Global functions
You can define the global scripts in the \`global\` folder.
All global scripts are available on all instances. If a global script is disabled, it will not be used.
Global script will be just prepended to the normal script and compiled, so you cannot share data between scripts via global scripts. Use states for it.

To use global functions in TypeScript, you have to \`declare\` them first, so the compiler knows about the global functions. Example:
\`\`\`typescript
// global script:
// ==============
function globalFn(arg: string): void {
    // actual implementation
}

// normal script:
// ==============
declare function globalFn(arg: string): void;
// use as normal:
globalFn('test');
\`\`\`

#### Best practice:
Create two instances of javascript adapter: one "test" and one "production".
After the script is tested in the "test" instance, it can be moved to "production". By that you can restart the "test" instance as you want.

## The following functions can be used in scripts:

### require - load some module
\`\`\`js
const mod = require('module_name');
\`\`\`
The following modules are preloaded: \`node:dgram\`, \`node:crypto\`, \`node:dns\`, \`node:events\`, \`node:fs\`, \`node:http\`, \`node:https\`, \`node:http2\`, \`node:net\`, \`node:os\`, \`node:path\`, \`node:util\`, \`node:stream\`, \`node:zlib\`, \`suncalc2\`, \`axios\`, \`wake_on_lan\`, \`request\` (deprecated)

To use other modules, enter the name (and version) of the module in the instance configuration. ioBroker will install the module. You can require and use it in your scripts afterwards.

### console - Gives out the message into log
Usage is the same as in \`javascript\`

### exec - execute some OS command, like \`cp file1 file2\`
\`\`\`js
exec(cmd, [options], callback);
\`\`\`

Execute system command and get the outputs.

\`\`\`js
// Get the list of files and directories in /var/log
exec('ls /var/log', (error, stdout, stderr) => {
    log('stdout: ' + stdout);
});
\`\`\`

Node.js uses /bin/sh to execute commands. If you want to use another shell, you can use the option object as described in the [Node.js documentation](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback) for child_process.exec.
It is the best practice to always use fill path names to commands to make sure the right command is executed.

**Notice:** you must enable *Enable command "exec"* option to call it.

### on - Subscribe on changes or updates of some state
\`\`\`js
on(pattern, callbackOrId, value);
\`\`\`

The callback function will return the object as parameter with the following content:
\`\`\`js
{
    id: 'javascript.0.myplayer',
    state: {
        val:  'new state',
        ts:   1416149118,
        ack:  true,
        lc:   1416149118,
        from: 'system.adapter.sonos.0'
    },
    oldState: {
        val:  'old state',
        ts:   1416148233,
        ack:  true,
        lc:   1416145154,
        from: 'system.adapter.sonos.0'
    }
}
\`\`\`

**Note:** \`state\` was previously called \`newState\`. That is still working.

Example:
\`\`\`js
let timer;

// Create state "javascript.0.counter"
createState('counter', 0);

// On change
on('adapter.0.device.channel.sensor', (data) => {
    // But not ofter than 30 seconds
    if (!timer) {
        timer = setTimeout(() => {
            timer = null;
        }, 30000);

        // Set acknowledged value
        setState('counter', 1 + getState('counter'), true);

        // Or to set unacknowledged command
        setState('adapter.0.device.channel.actor', true);
    }
});
\`\`\`

You can use the following parameters to specify the trigger:

| parameter   | type/value | description                                                                                                                                         |
|-------------|------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| logic       | string     | "and" or "or" logic to combine the conditions \\(default: "and"\\)                                                                                    |
|             |            |                                                                                                                                                     |
| id          | string     | id is equal to given one                                                                                                                            |
|             | RegExp     | id matched to regular expression                                                                                                                    |
|             | Array      | id matched to a list of allowed IDs                                                                                                                 |
|             |            |                                                                                                                                                     |
| name        | string     | name is equal to given one                                                                                                                          |
|             | RegExp     | name matched to regular expression                                                                                                                  |
|             | Array      | name matched to a list of allowed names                                                                                                             |
|             |            |                                                                                                                                                     |
| change      | string     | "eq", "ne", "gt", "ge", "lt", "le", "any"                                                                                                           |
|             | "eq"       | (equal)            New value must be equal to old one (state.val == oldState.val)                                                                   |
|             | "ne"       | (not equal)        New value must be not equal to the old one (state.val != oldState.val) **If pattern is id-string this value is used by default** |
|             | "gt"       | (greater)          New value must be greater than old value (state.val > oldState.val)                                                              |
|             | "ge"       | (greater or equal) New value must be greater or equal to old one (state.val >= oldState.val)                                                        |
|             | "lt"       | (smaller)          New value must be smaller than old one (state.val < oldState.val)                                                                |
|             | "le"       | (smaller or equal) New value must be smaller or equal to old value (state.val <= oldState.val)                                                      |
|             | "any"      | Trigger will be raised if just the new value comes                                                                                                  |
|             |            |                                                                                                                                                     |
| val         | mixed      | New value must be equal to given one                                                                                                                |
| valNe       | mixed      | New value must be not equal to given one                                                                                                            |
| valGt       | mixed      | New value must be greater than given one                                                                                                            |
| valGe       | mixed      | New value must be greater or equal to given one                                                                                                     |
| valLt       | mixed      | New value must be smaller than given one                                                                                                            |
| valLe       | mixed      | New value must be smaller or equal to given one                                                                                                     |
|             |            |                                                                                                                                                     |
| ack         | boolean    | Acknowledged state of new value is equal to given one                                                                                               |
| q           | number     | Quality code state of new value is equal to given one. You can use '*' for matching to any code. **If not provided q = 0 is set as pattern!**       |
|             |            |                                                                                                                                                     |
| oldVal      | mixed      | Previous value must be equal to given one                                                                                                           |
| oldValNe    | mixed      | Previous value must be not equal to given one                                                                                                       |
| oldValGt    | mixed      | Previous value must be greater than given one                                                                                                       |
| oldValGe    | mixed      | Previous value must be greater or equal to given one                                                                                                |
| oldValLt    | mixed      | Previous value must be smaller than given one                                                                                                       |
| oldValLe    | mixed      | Previous value must be smaller or equal to given one                                                                                                |
|             |            |                                                                                                                                                     |
| oldAck      | bool       | Acknowledged state of previous value is equal to given one                                                                                          |
| oldQ        | number     | Quality code state of previous value is equal to given one. You can use '*' for matching to any code                                                |
|             |            |                                                                                                                                                     |
| ts          | number     | New value time stamp must be equal to given one (state.ts == ts)                                                                                    |
| tsGt        | number     | New value time stamp must be greater than given one (state.ts > ts)                                                                                 |
| tsGe        | number     | New value time stamp must be greater or equal to given one (state.ts >= ts)                                                                         |
| tsLt        | number     | New value time stamp must be smaller than given one (state.ts < ts)                                                                                 |
| tsLe        | number     | New value time stamp must be smaller or equal to given one (state.ts <= ts)                                                                         |
|             |            |                                                                                                                                                     |
| oldTs       | number     | Previous time stamp must be equal to given one (oldState.ts == ts)                                                                                  |
| oldTsGt     | number     | Previous time stamp must be greater than given one (oldState.ts > ts)                                                                               |
| oldTsGe     | number     | Previous time stamp must be greater or equal to given one (oldState.ts >= ts)                                                                       |
| oldTsLt     | number     | Previous time stamp must be smaller than given one (oldState.ts < ts)                                                                               |
| oldTsLe     | number     | Previous time stamp must be smaller or equal to given one (oldState.ts <= ts)                                                                       |
|             |            |                                                                                                                                                     |
| lc          | number     | Last change time stamp must be equal to given one (state.lc == lc)                                                                                  |
| lcGt        | number     | Last change time stamp must be greater than given one (state.lc > lc)                                                                               |
| lcGe        | number     | Last change time stamp must be greater or equal to given one (state.lc >= lc)                                                                       |
| lcLt        | number     | Last change time stamp must be smaller than given one (state.lc < lc)                                                                               |
| lcLe        | number     | Last change time stamp must be smaller or equal to given one (state.lc <= lc)                                                                       |
|             |            |                                                                                                                                                     |
| oldLc       | number     | Previous last change time stamp must be equal to given one (oldState.lc == lc)                                                                      |
| oldLcGt     | number     | Previous last change time stamp must be greater than given one (oldState.lc > lc)                                                                   |
| oldLcGe     | number     | Previous last change time stamp must be greater or equal to given one (oldState.lc >= lc)                                                           |
| oldLcLt     | number     | Previous last change time stamp must be smaller than given one (oldState.lc < lc)                                                                   |
| oldLcLe     | number     | Previous last change time stamp must be smaller or equal to given one (oldState.lc <= lc)                                                           |
|             |            |                                                                                                                                                     |
| channelId   | string     | Channel ID must be equal to given one                                                                                                               |
|             | RegExp     | Channel ID matched to regular expression                                                                                                            |
|             | Array      | Channel ID matched to a list of allowed channel IDs                                                                                                 |
|             |            |                                                                                                                                                     |
| channelName | string     | Channel name must be equal to given one                                                                                                             |
|             | RegExp     | Channel name matched to regular expression                                                                                                          |
|             | Array      | Channel name matched to a list of allowed channel names                                                                                             |
|             |            |                                                                                                                                                     |
| deviceId    | string     | Device ID must be equal to given one                                                                                                                |
|             | RegExp     | Device ID matched to regular expression                                                                                                             |
|             | Array      | Device ID matched to a list of allowed device IDs                                                                                                   |
|             |            |                                                                                                                                                     |
| deviceName  | string     | Device name must be equal to given one                                                                                                              |
|             | RegExp     | Device name matched to regular expression                                                                                                           |
|             | Array      | Device name matched to a list of allowed device names                                                                                               |
|             |            |                                                                                                                                                     |
| enumId      | string     | State belongs to given enum                                                                                                                         |
|             | RegExp     | One enum ID of the state satisfies the given regular expression                                                                                     |
|             | Array      | One enum ID of the state is in the given list of enum IDs                                                                                           |
|             |            |                                                                                                                                                     |
| enumName    | string     | State belongs to given enum                                                                                                                         |
|             | RegExp     | One enum name of the state satisfies the given regular expression                                                                                   |
|             | Array      | One enum name of the state is in the given list of enum names                                                                                       |
|             |            |                                                                                                                                                     |
| from        | string     | New value is from defined adapter                                                                                                                   |
|             | RegExp     | New value is from an adapter that matches the regular expression                                                                                    |
|             | Array      | New value is from an adapter that appears in the given list of allowed adapters                                                                     |
|             |            |                                                                                                                                                     |
| fromNe      | string     | New value is not from defined adapter                                                                                                               |
|             | RegExp     | New value is not from an adapter that matches the regular expression                                                                                |
|             | Array      | New value is not from an adapter that appears in the given list of forbidden adapters                                                               |
|             |            |                                                                                                                                                     |
| oldFrom     | string     | Old value is from defined adapter                                                                                                                   |
|             | RegExp     | Old value is from an adapter that matches the regular expression                                                                                    |
|             | Array      | Old value is from an adapter that appears in the given list of allowed adapters                                                                     |
|             |            |                                                                                                                                                     |
| oldFromNe   | string     | Old value is not from defined adapter                                                                                                               |
|             | RegExp     | Old value is not from an adapter that matches the regular expression                                                                                |
|             | Array      | Old value is not from an adapter that appears in the given list of forbidden adapters                                                               |

Examples:
Trigger on all states with ID \`'*.STATE'\` if they are acknowledged and have new value \`true\`.

\`\`\`js
{
    "id": /\\.STATE$/,
    "val": true,
    "ack": true,
    "logic": "and"
}
\`\`\`

**Note:** you can use RegExp directly:

\`\`\`js
on(/^system\\.adapter\\..*\\.\\d+\\.memRss$/, function (obj) {
});

// same as
on({id: /^system\\.adapter\\..*\\.\\d+\\.memRss$/, change: "ne"}, function (obj) {
});
\`\`\`

To simply connect two states with each other, write:
\`\`\`js
on('stateId1', 'stateId2');
\`\`\`

All changes of *stateId1* will be written to *stateId2*.

If the \`value\` parameter is set in combination with state id as the second parameter, on any change the state will filled with the \`value\`.
\`\`\`js
on('stateId1', 'stateId2', 'triggered');
setState('stateId1', 'new value');

// stateId2 will be set to 'triggered'.
\`\`\`

Function \`on\` returns handler back. This handler can be used by unsubscribing.

*Notice:* By default only states with quality 0x00 will be passed to callback function. If you want to get all events, add \`{q: '*'}\` to pattern structure.

*Notice:* Please note, that by default "change" is equal to "any", except when only id as string is set (like \`on('id', () => {});\`). In last case change will be set to "ne".

*Notice:* If you want to also get state deletions/expires as trigger, you need to use change with \`ne\` or \`any\` AND q with \`*\` as filter!

*Notice:* from 4.3.2 it is possible to write a type of trigger as second parameter: \`on('my.id.0', 'any', obj => log(obj.state.val));\`

### once
Registers a one-time subscription which automatically unsubscribes after the first invocation. Same as [on](#on---subscribe-on-changes-or-updates-of-some-state), but just executed once.

\`\`\`js
once(pattern, callback);
\`\`\`

### subscribe - same as **[on](#on---subscribe-on-changes-or-updates-of-some-state)**

### unsubscribe
\`\`\`js
unsubscribe(id);
// or
unsubscribe(handler);
\`\`\`

Remove all subscriptions for given object ID or for given handler.

\`\`\`js
// By handler
let mySubscription = on({ id: 'javascript.0.myState', change: 'any' }, (data) => {
    // unsubscribe after first trigger
    if (unsubscribe(mySubscription)) {
        log('Subscription deleted');
    }
});

// by Object ID
on({ id: 'javascript.0.myState1', change: 'ne' }, (data) => {
    log('Some event');
});

on({ id: 'javascript.0.myState1', change: 'any' }, (data) => {
    // unsubscribe
    if (unsubscribe('javascript.0.myState1')) {
        log('All subscriptions deleted');
    }
});
\`\`\`

### getSubscriptions
Get the list of subscriptions.

Example of a result:
\`\`\`js
{
    'megad.0.dataPointName': [
        {
            name : 'script.js.NameOfScript',
            pattern : {
                id : 'megad.0.dataPointName',
                change : 'ne'
            }
        }
    ]
}
\`\`\`

### getFileSubscriptions
Get the list of file subscriptions.

Example of a result:
\`\`\`js
{
    'vis.0$%$main/*': [
        {
            name : 'script.js.NameOfScript',
            id : 'vis.0',
            fileNamePattern: 'main/*'
        }
    ]
}
\`\`\`

### schedule
\`\`\`js
schedule(pattern, callback);
\`\`\`

Time scheduler with astro-function.

#### Time schedule
Pattern can be a string with [Cron-Syntax](http://en.wikipedia.org/wiki/Cron), which consists of 5 (without seconds) or 6 (with seconds) digits:
\`\`\`
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ │
│ │ │ │ │ └───── day of week (0 - 6) (0 to 6 are Sunday to Saturday, or use names; 7 is Sunday, the same as 0)
│ │ │ │ └────────── month (1 - 12)
│ │ │ └─────────────── day of month (1 - 31)
│ │ └──────────────────── hour (0 - 23)
│ └───────────────────────── min (0 - 59)
└───────────────────────────── [optional] sec (0 - 59)
\`\`\`

\`\`\`js
// Example with 5 digits:
schedule('*/2 * * * *', () => {
    log('Will be triggered every 2 minutes!');
});

// Example with 6 digits:
schedule('*/3 * * * * *', () => {
    log('Will be triggered every 3 seconds!');
});
\`\`\`

The pattern can also be an object, it is used especially if seconds are required:

the object could have the following properties:
- \`second\`
- \`minute\`
- \`hour\`
- \`date\`
- \`month\`
- \`year\`
- \`dayOfWeek\`

\`\`\`js
schedule({ second: [20, 25] }, () => {
    log('Will be triggered at xx:xx:20 and xx:xx:25 of every minute!');
});

schedule({ hour: 12, minute: 30 }, () => {
    log('Will be triggered at 12:30!');
});
\`\`\`
Pattern can be a Javascript Date object (some specific time point) - in this case only it will be triggered only one time.

If start or end times for a schedule are needed, this could also be implemented with usage of an object. In this scenario, the object has the properties:
- \`start\`
- \`end\`
- \`rule\`

start and end defines a Date object a DateString or a number of milliseconds since 01 January 1970 00:00:00 UTC.
Rule is a schedule string with [Cron-Syntax](http://en.wikipedia.org/wiki/Cron) or an object:
\`\`\`js
let startTime = new Date(Date.now() + 5000);
let endTime = new Date(startTime.getTime() + 5000);
schedule({ start: startTime, end: endTime, rule: '*/1 * * * * *' }, () => {
    log('It will run after 5 seconds and stop after 10 seconds');
});
\`\`\`

The rule itself could be also an object:

\`\`\`js
let today = new Date();
let startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let endTime =  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
let ruleData = { hour: 12, minute: 30 };
schedule({ start: startTime, end: endTime, rule: ruleData }, () => {
    log('Will be triggered at 12:30, starting tomorow, ending in 7 days');
});
\`\`\`

#### Astro-function

Astro-function can be used via "astro" attribute:

\`\`\`js
schedule({ astro: 'sunrise' }, () => {
    log("Sunrise!");
});

schedule({ astro: 'sunset', shift: 10 }, () => {
    log("10 minutes after sunset!");
});
\`\`\`

The attribute "shift" is the offset in minutes. It can be negative, too, to define time before astro event.

The following values can be used as attribute in astro-function:

- \`"sunrise"\`: sunrise (top edge of the sun appears on the horizon)
- \`"sunriseEnd"\`: sunrise ends (bottom edge of the sun touches the horizon)
- \`"goldenHourEnd"\`: morning golden hour (soft light, the best time for photography) ends
- \`"solarNoon"\`: solar noon (sun is in the highest position)
- \`"goldenHour"\`: evening golden hour starts
- \`"sunsetStart"\`: sunset starts (bottom edge of the sun touches the horizon)
- \`"sunset"\`: sunset (sun disappears below the horizon, evening civil twilight starts)
- \`"dusk"\`: dusk (evening nautical twilight starts)
- \`"nauticalDusk"\`: nautical dusk (evening astronomical twilight starts)
- \`"night"\`: night starts (dark enough for astronomical observations)
- \`"nightEnd"\`: night ends (morning astronomical twilight starts)
- \`"nauticalDawn"\`: nautical dawn (morning nautical twilight starts)
- \`"dawn"\`: dawn (morning nautical twilight ends, morning civil twilight starts)
- \`"nadir"\`: nadir (the darkest moment of the night, sun is in the lowest position)

**Note:** to use "astro"-function the "latitude" and "longitude" must be defined in javascript adapter settings.

**Note:** in some places sometimes it could be so that no night/nightEnd exists. Please read [here](https://github.com/mourner/suncalc/issues/70) about it.

**Note:** you can use "on" function for schedule with small modification:
\`\`\`js
on({ time: '*/2 * * * *' }, () => {
    log((new Date()).toString() + " - Will be triggered every 2 minutes!");
});

on({ time: { hour: 12, minute: 30 }}, () => {
    log((new Date()).toString() + " - Will be triggered at 12:30!");
});

on({ astro: 'sunset', shift: 10 }, () => {
    log((new Date()).toString() + " - 10 minutes after sunset!");
});
\`\`\`

### scheduleById
\`\`\`js
scheduleById(id, callback);
scheduleById(id, ack, callback);
\`\`\`

Allows creating a schedule based on a state value. If the state value changes, the old schedule will be deleted and a new schedule is created automatically.

Supported formats:

- \`[h]h:[m]m:ss\` (e.g. \`12:42:15\`, \`15:3:12\`, \`3:10:25\`)
- \`[h]h:[m]m\` (e.g. \`13:37\`, \`9:40\`)

\`\`\`js
scheduleById('0_userdata.0.configurableTimeFormat', () => {
    log('Executed!');
});
\`\`\`

Example: Create state and register schedule on changes:

\`\`\`js
createState(
    '0_userdata.0.myTime',
    '00:00:00', // default value
    {
        type: 'string',
        read: true,
        write: true
    },
    () => {
        scheduleById('0_userdata.0.myTime', () => {
            log('Executed!');
        });
    }
);
\`\`\`

### getSchedules
\`\`\`js
const list = getSchedules(true);
\`\`\`
Returns the list of all CRON jobs and schedules (except astro).
Argument must be \`true\` if you want to get the list for **every running script**. Otherwise, only schedules in the current script will be returned.

\`\`\`js
const list = getSchedules(true);
list.forEach(schedule => log(JSON.stringify(schedule)));

// clear all schedules in all scripts!
list.forEach(schedule => clearSchedule(schedule));
\`\`\`

Example output:
\`\`\`
2020-11-01 20:15:19.929  - {"type":"cron","pattern":"0 * * * *","scriptName":"script.js.Heizung","id":"cron_1604258108384_74924"}
2020-11-01 20:15:19.931  - {"type":"schedule","schedule":"{"period":{}}","scriptName":"script.js.Heizung","id":"schedule_19576"}
\`\`\`

### clearSchedule
If **no** "astro" function is used, you can cancel the schedule later. To allow this, the schedule object must be saved:

\`\`\`js
let sch = schedule('*/2 * * * *', () => { /* ... */ });

// later:
clearSchedule(sch);
\`\`\`

\`clearSchedule\` accepts everything \`schedule\` returns (a CRON job object or the ID of a schedule of the time wizard)
and also the entries of [getSchedules](#getschedules):

\`\`\`js
// Clear all schedules of this script
getSchedules().forEach(sch => clearSchedule(sch));
\`\`\`

It returns \`true\` if the schedule was found and cleared, otherwise \`false\`.
Schedules created with the astro option cannot be cleared this way.

### getAttr
\`\`\`js
getAttr({ attr1: { attr2: 5 } }, 'attr1.attr2');
\`\`\`
Returns an attribute of the object. Path to attribute can be nested, like in the example.

If the first attribute is string, the function will try to parse the string as JSON string.

### getAstroDate
\`\`\`js
getAstroDate(pattern, date, offsetMinutes);
\`\`\`
Returns a javascript Date object for the specified astro-name (e.g. \`"sunrise"\` or \`"sunriseEnd"\`). For valid values, see the list of allowed values in the [Astro](#astro-function) section in the *schedule* function.

The returned Date object is calculated for the passed *date*. If no date is provided, the current day is used.

\`\`\`js
let sunriseEnd = getAstroDate('sunriseEnd');
log(\`Sunrise ends today at \${sunriseEnd.toLocaleTimeString()}\`);

let today = new Date();
let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let tomorrowNight = getAstroDate('night', tomorrow);
\`\`\`

**Note: Depending on your geographical location, there can be cases where e.g. 'night'/'nightEnd' do not exist on certain time points (e.g. locations north in May/June each year!**

You can use webpages like [suncalc.net](http://suncalc.net) to check if the time points are correct.

### isAstroDay
\`\`\`js
isAstroDay();
\`\`\`
Returns \`true\` if the current time is between the astro sunrise and sunset.

### compareTime
\`\`\`js
compareTime(startTime, endTime, operation, timeToCompare);
\`\`\`
Compare given time with limits.

If \`timeToCompare\` is not given, so the actual time will be used.

The following operations are possible:

- \`">"\` - if given time is greater than \`startTime\`
- \`">="\` - if given time is greater or equal to \`startTime\`
- \`"<"\` - if given time is less than \`startTime\`
- \`"<="\` - if given time is less or equal to \`startTime\`
- \`"=="\` - if given time is equal to \`startTime\`
- \`"<>"\` - if given time is not equal to \`startTime\`
- \`"between"\` - if given time is between \`startTime\` and \`endTime\`
- \`"not between"\` - if given time is not between \`startTime\` and \`endTime\`

Time can be Date object or Date with time or just time.

You can use astro-names for the time definition. All 3 parameters can be set as astro time.
Following values are possible: \`sunrise\`, \`sunset\`, \`sunriseEnd\`, \`sunsetStart\`, \`dawn\`, \`dusk\`, \`nauticalDawn\`, \`nauticalDusk\`, \`nightEnd\`, \`night\`, \`goldenHourEnd\`, \`goldenHour\`.
See [Astro](#astro-function) for detail.

\`\`\`js
log(compareTime('sunsetStart', 'sunsetEnd', 'between') ? 'Now is sunrise' : 'Now is no sunrise');
\`\`\`

It is possible to define the time with offset too:

\`\`\`js
log(compareTime({ astro: 'sunsetStart', offset: 30 }, { astro: 'sunrise', offset: -30 }, '>') ? 'Now is at least 30 minutes after sunset' : 'No idea');
\`\`\`

Structure of an astro object.

\`\`\`js
{
    astro: 'sunsetStart',// mandatory, can be written as string and not as object if offset and date are default
    offset: 30,          // optional
    date:   new Date()   // optional
}
\`\`\`

### setState
\`\`\`js
setState(id, state, ack, callback);
\`\`\`

*Note*: The following commands are identical

\`\`\`js
setState('myState', 1, false);
setState('myState', { val: 1, ack: false });
setState('myState', 1);
\`\`\`

Please refer to https://github.com/ioBroker/ioBroker/wiki/Adapter-Development-Documentation#commands-and-statuses for usage of \`ack\`.
Short:
- \`ack\` = \`false\` : Script wants to send a command to be executed by the target device/adapter
- \`ack\` = \`true\`  : Command was successfully executed, and state is updated as a positive result

### setStateAsync
\`\`\`js
await setStateAsync(id, state, ack);
\`\`\`
Same as setState, but with \`promise\`.

### setStateDelayed
\`\`\`js
setStateDelayed(id, state, isAck, delay, clearRunning, callback);
\`\`\`

Same as setState but with delay in milliseconds. You can clear all running delays for this ID (by default). E.g.

\`\`\`js
// Switch ON the light in the kitchen in one second
setStateDelayed('Kitchen.Light.Lamp', true,  1000);

// Switch OFF the light in the kitchen in 5 seconds and let first timeout run.
setStateDelayed('Kitchen.Light.Lamp', false, 5000, false, () => {
    log('Lamp is OFF');
});
\`\`\`
This function returns the handler of the timer, and this timer can be individually stopped by clearStateDelayed

### setStateChanged
\`\`\`js
await setStateChanged(id, state, ack);
\`\`\`
Same as setState, but set value only if the value is really changed.

### setStateChangedAsync
\`\`\`js
await setStateChangedAsync(id, state, ack);
\`\`\`
Same as setStateChanged, but with \`promise\`.

### clearStateDelayed
\`\`\`js
clearStateDelayed(id);
\`\`\`

Clears all delayed tasks for specified state ID or some specific delayed task.

\`\`\`js
setStateDelayed('Kitchen.Light.Lamp', false,  10000); // Switch OFF the light in the kitchen in ten second
let timer = setStateDelayed('Kitchen.Light.Lamp', true, 5000, false); // Switch ON the light in the kitchen in five second
clearStateDelayed('Kitchen.Light.Lamp', timer); // Nothing will be switched on
clearStateDelayed('Kitchen.Light.Lamp'); // Clear all running delayed tasks for this ID
\`\`\`

### getStateDelayed
\`\`\`js
getStateDelayed(id);
\`\`\`

This is a synchronous call, and you will get the list of all running timers (setStateDelayed) for this id.
You can call this function without id and get timers for all IDs.
In case you call this function for some specific object ID, you will get the following answer:

\`\`\`js
getStateDelayed('hm-rpc.0.LQE91119.1.STATE');

// returns an array like
[
    { timerId: 1, left: 1123,   delay: 5000,  val: true,  ack: false },
    { timerId: 2, left: 12555,  delay: 15000, val: false, ack: false },
]
\`\`\`

If you ask for all IDs, the answer will look like:

\`\`\`js
getStateDelayed();

// returns an object like
{
    'hm-rpc.0.LQE91119.1.STATE': [
        { timerId: 1, left: 1123,   delay: 5000,   val: true,  ack: false },
        { timerId: 2, left: 12555,  delay: 15000,  val: false, ack: false },
    ],
    'hm-rpc.0.LQE91119.2.LEVEL': [
        { timerId: 3, left: 5679, delay: 10000,   val: 100,  ack: false },
    ],
}
\`\`\`

- \`left\` is the time left in milliseconds
- \`delay\` is the initial delay value in milliseconds

You can ask by timerId directly. In this case, the answer will be:

\`\`\`js
getStateDelayed(3);

// returns an object like
{ id: 'hm-rpc.0.LQE91119.2.LEVEL', left: 5679, delay: 10000, val: 100, ack: false }
\`\`\`

### getState
\`\`\`js
getState(id);
\`\`\`

Returns state with the given id in the following form:

\`\`\`js
{
    val: value,
    ack: true/false,
    ts: timestamp,
    lc: lastchanged,
    from: origin
}
\`\`\`

If state does not exist, a warning will be printed in the logs and the object \`{ val: null, notExist: true }\` will be returned.
To suppress the warning, check if the state exists before calling getState (see [existsState](#existsState)).

### getStateAsync
\`\`\`js
const stateObject = await getStateAsync(id);
\`\`\`
Same as getState, but with \`promise\`.

### existsState
\`\`\`js
existsState(id, (err, isExists) => {});
\`\`\`

If option "Do not subscribe all states on start" is deactivated, you can use simpler call:

\`\`\`js
existsState(id)
\`\`\`
the function returns in this case true or false.

Check if a state exists.

### getObject
\`\`\`js
getObject(id, enumName);
\`\`\`
Get description of object id as stored in a system.
You can specify the enumeration name. If this is defined, two additional attributes will be added to result: enumIds and enumNames.
These arrays have all enumerations, where ID is a member of. E.g.:

\`\`\`js
getObject('adapter.N.objectName', 'rooms');
\`\`\`

gives back in enumIds all rooms, where the requested object is a member. You can define "true" as enumName to get back *all* enumerations.

### setObject
\`\`\`js
setObject(id, obj, callback);
\`\`\`
Write an object into DB. This command can be disabled in adapter's settings. Use this function carefully, while the global settings can be damaged.

You should use it to **modify** an existing object you read beforehand, e.g.:
\`\`\`js
const obj = getObject('adapter.N.objectName');
obj.native.settings = 1;
setObject('adapter.N.objectName', obj, (err) => {
    if (err) log('Cannot write object: ' + err);
});
\`\`\`

### existsObject
\`\`\`js
existsObject(id, function (err, isExists) {});
\`\`\`

If the option "Do not subscribe all states on start" is deactivated, you can use simpler call:

\`\`\`js
existsObject(id)
\`\`\`
the function returns in this case true or false.

Check if an object exists.


### extendObject
\`\`\`js
extendObject(id, obj, callback);
\`\`\`

It is almost the same as \`setObject\`, but first it reads the object and tries to merge all settings together.

Use it like this:
\`\`\`js
// Stop instance
extendObject('system.adapter.sayit.0', {common: {enabled: false}});
\`\`\`

### deleteObject
\`\`\`js
deleteObject(id, isRecursive, callback);
\`\`\`

Delete an object from DB by ID. If the object has type \`state\`, the state value will be deleted too.

Additional parameter \`isRecursive\` could be provided, so all children of given ID will be deleted. Very dangerous!

Use it like this:
\`\`\`js
// Delete state
deleteObject('javascript.0.createdState');
\`\`\`

*Notice: \`isRecursive\` option is available only with js-controller >= 2.2.x*

### getIdByName
\`\`\`js
getIdByName(name, alwaysArray);
\`\`\`

Returns id of the object with given name.
If there is more than one object with this name, the result will be an array.
If \`alwaysArray\` flag is set, the result will always be an array if some ID found.
### getEnums
\`\`\`js
getEnums(enumName);
\`\`\`

Get the list of existing enumerations with members, like:

\`\`\`js
getEnums('rooms');

// returns all rooms - e.g.:
[
    {
        id: 'enum.rooms.LivingRoom',
        members: [ 'hm-rpc.0.JEQ0024123.1', 'hm-rpc.0.BidCoS-RF.4' ],
        name: 'Living room'
    },
    {
        id: 'enum.rooms.Bath',
        members: [ 'hm-rpc.0.JEQ0024124.1', 'hm-rpc.0.BidCoS-RF.5' ],
        name: 'Bath'
    }
]

getEnums('functions');

// returns all functions - e.g.:
[
    {
        id: 'enum.functions.light',
        members: [
            '0_userdata.0.AnotherOne',
            '0_userdata.0.MyLigh'
        ],
        name: {
            en: 'Light',
            ru: 'Свет',
            de: 'Licht',
            fr: 'Lumière',
            it: 'Leggero',
            nl: 'Licht',
            pl: 'Lekki',
            pt: 'Luz',
            es: 'Luz',
            'zh-cn': '光'
        }
    }
]
\`\`\`

### createState
\`\`\`js
createState(name, initialValue, forceCreation, common, native, callback);
\`\`\`
Create state and object in javascript space if it does not exist, e.g. \`javascript.0.mystate\`.

!! Prefer to create own data points with the full ID \`0_userdata.0.mystate\` !!!

#### Parameters:

- \`name\`: name of the state without namespace, e.g. \`mystate\`
- \`initialValue\`: variable can be initialized after created. Value "undefined" means do not initialize value.
- \`forceCreation\`: create/overwrite state independent of if state yet exists or not.
- \`common\`: common description of object see description [here](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state)
- \`native\`: native description of an object. Any specific information.
- \`callback\`: called after state is created and initialized.

If you set in \`common\` the flag \`alias\` to \`true\`, then alias will be created with the same name (but in \`alias.0\` namespace) as the state.
Alias is created only if it does not exist yet.

The following settings for aliases are valid too:
\`\`\`js
common => {
    alias: {
        id: 'alias.0.myOtherState', // will be created automatically if not already exists
        write: 'val * 1000', // convert function for write to created state
        read: 'val / 1000'   // convert function to read from created state
    }
}
\`\`\`

or

\`\`\`js
common => {
    alias: {
        id: 'alias.0.myOtherState', // will be created automatically if not already exists
    }
}
\`\`\`

It is possible short type of createState:

- \`createState('myDatapoint')\` - simply create datapoint if it does not exist
- \`createState('myDatapoint', 1)\` - create datapoint if it does not exist and initialize it with value 1
- \`createState('myDatapoint', { type: 'string', role: 'json', read: true, write: false }, () => { log('created'); });\` - with common definitions like type, read, write and role
- \`createState('myDatapoint', { name: 'My own datapoint', unit: '°C' }, () => { log('created'); });\`
- \`createState('myDatapoint', 1, { name: 'My own datapoint', unit: '°C' })\` - create datapoint if it does not exist with specific name and units

#### An object in the second position is always the \`common\`

These short forms are the reason why an object in the second position is **never** read as an initial
value. \`createState('myDatapoint', {}, { type: 'object' })\` therefore does not do what it looks like:
the \`{}\` becomes the \`common\`, and \`{ type: 'object' }\` moves on to the \`native\`.

To give a state an initial value that is not a primitive, put it into \`common.def\`:

\`\`\`js
createState('0_userdata.0.myObject', { name: 'My object', type: 'object', read: true, write: true, def: {} });
\`\`\`

A state of type \`object\`, \`json\` or \`array\` keeps its value as JSON, so the state above starts out
with the string \`'{}'\` - just as \`setState('0_userdata.0.myObject', {})\` would store it. The default
is stringified for you; writing \`def: '{}'\` yourself works as well.

### createStateAsync
\`\`\`js
await createStateAsync(name, initialValue, forceCreation, common, native);
\`\`\`

Same as \`createState\`, but the promise will be returned.

### deleteState
\`\`\`js
deleteState(name, callback);
\`\`\`
Delete state and object in javascript space, e.g. \`javascript.0.mystate\`. States from other adapters cannot be deleted.

\`\`\`js
deleteState('myDatapoint')
\`\`\`
simply delete datapoint if exists.

### deleteStateAsync
\`\`\`js
await deleteStateAsync(name);
\`\`\`

Same as \`deleteState\`, but the promise will be returned.

### createAlias
\`\`\`js
createAlias(name, alias, forceCreation, common, native, callback);
\`\`\`

Create alias in \`alias.0\` space if it does not exist, e.g. \`javascript.0.myalias\` and reference to a state or read/write states.
The common definition is taken from the read alias id object, but a provided common takes precedence.

#### Parameters:

- \`name\`: id of the new alias state with (possible without alias namespace), e.g. \`test.mystate\` (namespace \`alias.0.\` will be added = \`alias.0.test.mystate\`)
- \`alias\`: can be either an existing state id as string or an object with full alias definition including read/write ids and read/write functions. Note: Alias definitions can not be set as part of the common parameter!
- \`forceCreation\`: create/overwrite alias independent of if state yet exists or not.
- \`common\`: common description of alias object see description [here](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state). Values provided here will take precedence over the common definition of the read alias id object. Not: Alias definitions can not be set as part of this common parameter, see alias parameter!
- \`native\`: native description of an object. Any specific information.
- \`callback\`: called after state is created and initialized.

It is possible a short type of createAlias:

- \`createAlias('myAlias', 'myDatapoint')\` - simply create alias.0.myAlias that refernces to javascript.X.myDatapoint if it does not exist
- \`createAlias('myAlias', { id: { read: 'myReadDatapoint', write: 'myWriteDatapoint' }})\` - creates alias and reference to different read/write states

For other details, see createState, it is similar.

### createAliasAsync
\`\`\`js
await createAliasAsync(name, alias, forceCreation, common, native);
\`\`\`

Same as \`createAlias\`, but the promise will be returned.

### sendTo
\`\`\`js
sendTo(adapter, command, message, callback);
sendTo(adapter, command, message, options, callback);
\`\`\`

Send a message to a specific or all adapter instances. When using the adapter name, the message is sent to all instances.

To get specific information about messages, you must read the documentation for a particular adapter.

Example (with custom timeout):

\`\`\`js
sendTo('telegram', { user: 'UserName', text: 'Test message' }, { timeout: 2000 });
\`\`\`

Some adapters also support responses to the sent messages. (e.g. history, sql, telegram)
The response is only returned to the callback if the message is sent to a specific instance!

Example (with callback):

\`\`\`js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, (res) => {
    log(\`Sent to \${res} users\`);
});
\`\`\`

*Default timeout is 20000 milliseconds (if a callback function has been defined)*

\`\`\`js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, { timeout: 2000 }, (res) => {
    log(\`Sent to \${res} users\`);
});
\`\`\`

### sendToAsync
\`\`\`js
await sendToAsync(adapter, command, message);
await sendToAsync(adapter, command, message, options);
\`\`\`
Same as sendTo, but with \`promise\`.

Example:

\`\`\`js
const res = await sendToAsync('sql.0', 'getEnabledDPs', {});
log(JSON.stringify(res));
\`\`\`

### sendToHost
\`\`\`js
sendToHost(hostName, command, message, callback);
\`\`\`

Send a message to controller instance.

The following commands are supported:
- \`'cmdExec'\`
- \`'getRepository'\`
- \`'getInstalled'\`
- \`'getVersion'\`
- \`'getDiagData'\`
- \`'getLocationOnDisk'\`
- \`'getDevList'\`
- \`'getLogs'\`
- \`'getLogFile'\`
- \`'getLogFiles'\`
- \`'delLogs'\`
- \`'getHostInfo'\`
- \`'getHostInfoShort'\`
- \`'updateMultihost'\`
- \`'upgradeController'\` - Upgrade js-controller to newest version
- \`'getInterfaces'\` - Returns all available network interfaces of the system
- \`'upload'\` - Starts an adapter upload
- \`'rebuildAdapter'\`
- \`'readBaseSettings'\`
- \`'writeBaseSettings'\`
- \`'addNotification'\`
- \`'clearNotifications'\`
- \`'getNotifications'\`
- \`'updateLicenses'\` - read licenses from iobroker.net
- \`'upgradeOsPackages'\`
- \`'restartController'\`

It is rather specific commands and are not required often.

Example:

\`\`\`js
sendToHost('myComputer', 'cmdExec', { data: 'ls /' }, (res) => {
    log('List of files: ' + res.data);
});
\`\`\`

**Notice:** you must enable *Enable command "sendToHost"* option to call it.

### sendToHostAsync
\`\`\`js
await sendToHostAsync(hostName, command, message);
\`\`\`
Same as sendToHost, but with \`promise\`.

### setInterval
\`\`\`js
setInterval(callback, ms, arg1, arg2, arg3, arg4);
\`\`\`

Same as javascript \`setInterval\`.

### clearInterval
\`\`\`js
clearInterval(id);
\`\`\`

Same as javascript \`clearInterval\`.

### setTimeout
\`\`\`js
setTimeout(callback, ms, arg1, arg2, arg3, arg4);
\`\`\`
Same as javascript \`setTimeout\`.

### clearTimeout
\`\`\`js
clearTimeout(id);
\`\`\`

Same as javascript \`clearTimeout\`.

### setImmediate
\`\`\`js
setImmediate(callback, arg1, arg2, arg3, arg4);
\`\`\`

Same as javascript \`setImmediate\` and almost the same as \`setTimeout(callback, 0, arg1, arg2, arg3, arg4)\` but with higher priority.

### formatDate
\`\`\`js
formatDate(millisecondsOrDate, format);
\`\`\`

#### Parameters:

- \`millisecondsOrDate\`: number of milliseconds from state.ts or state.lc (Number milliseconds from 1970.01.01 00:00:00) or javascript *new Date()* object or number of milliseconds from *(new Date().getTime())*
- \`format\`: Can be \`null\`, so the system time format will be used, otherwise

* YYYY, JJJJ, ГГГГ - full year, e.g 2015
* YY, JJ, ГГ - short year, e.g 15
* MM, ММ(cyrillic) - full month, e.g. 01
* M, М(cyrillic) - short month, e.g., 1
* DD, TT, ДД - full day, e.g. 02
* D, T, Д - short day, e.g., 2
* hh, SS, чч - full hours, e.g. 03
* h, S, ч - short hours, e.g. 3
* mm, мм(cyrillic) - full minutes, e.g. 04
* m, м(cyrillic) - short minutes, e.g., 4
* ss, сс(cyrillic) - full seconds, e.g. 05
* s, с(cyrillic) - short seconds, e.g., 5
* sss, ссс(cyrillic) - milliseconds
* WW, НН(cyrillic) - full week day as text
* W, Н(cyrillic) - short week day as text
* OO, ОО(cyrillic) - full month as text
* OOO, ООО(cyrillic) - full month as text as genitiv
* O, О(cyrillic) - short month as text

#### Example

\`\`\`js
formatDate(new Date(), "YYYY-MM-DD") // => Date "2015-02-24"
formatDate(new Date(), "hh:mm") // => Hours and minutes "17:41"
formatDate(state.ts) // => "24.02.2015"
formatDate(state.ts, "JJJJ.MM.TT SS:mm:ss.sss") // => "2015.02.15 17:41:98.123"
formatDate(new Date(), "WW") // => Day of week "Tuesday"
formatDate(new Date(), "W") // => Day of week "Tu"
\`\`\`

### formatTimeDiff
\`\`\`js
formatTimeDiff(milliseconds, format);
\`\`\`

#### Parameters:

- \`milliseconds\`: difference in milliseconds*
- \`format\`: Can be \`null\`, so the \`hh:mm:ss\` format will be used, otherwise

* DD, TT, ДД - full day, e.g. "02"
* D, T, Д - short day, e.g., "2"
* hh, SS, чч - full hours, e.g. "03"
* h, S, ч - short hours, e.g. "3"
* mm, мм(cyrillic) - full minutes, e.g. "04"
* m, м(cyrillic) - short minutes, e.g., "4"
* ss, сс(cyrillic) - full seconds, e.g. "05"
* s, с(cyrillic) - short seconds, e.g., "5"

You can use escape charachter \`\\\` to avoid the replacement. e.g. \`DD \\Day\\s, h \\hour\\s, m \\minute, ss \\second\\s\`

#### Example

\`\`\`js
formatTimeDiff(60000, "mm:ss") // => "01:00"

const diff = 172800000 + 10800000 + 540000 + 15000; // 2 days, 3 hours, 9 minutes + 15 secoonds
formatTimeDiff(diff); // "51:09:15"
formatTimeDiff(diff, 'DD hh:mm'); // "02 03:09"
formatTimeDiff(diff, 'D hh:mm'); // "2 03:09"
formatTimeDiff(diff, 'hh:mm:ss'); // "51:09:15"
formatTimeDiff(diff, 'h:m:s'); // "51:9:15"
formatTimeDiff(diff, 'hh:mm'); // "51:09"
formatTimeDiff(diff, 'mm:ss'); // "3069:15"
formatTimeDiff(diff, 'hh'); // "51"
formatTimeDiff(diff, 'mm'); // "3069"
\`\`\`

### getDateObject
\`\`\`js
getDateObject(stringOrNumber);
\`\`\`

Converts string or number to a Date object.
If only hours are given, it will add current date to it and will try to convert.

\`\`\`js
getDateObject('20:00'); // 2024-05-18T18:00:00.000Z
getDateObject('2024-01-01'); // 2024-01-01T00:00:00.000Z
\`\`\`

### formatValue
\`\`\`js
formatValue(value, decimals, format);
\`\`\`

Formats any value (strings too) to number. Replaces point with comma if configured in system.
Decimals specify digits after comma. The default value is 2.
Format is optional:
 - '.,': 1234.567 => 1.234,56
 - ',.': 1234.567 => 1,234.56
 - ' .': 1234.567 => 1 234.56


### adapterSubscribe
\`\`\`js
adapterSubscribe(id);
\`\`\`

Send to an adapter message "subscribe" to inform adapter. If adapter has the common flag "subscribable" in case of function "subscribe" this function will be called automatically.

### adapterUnsubscribe
\`\`\`js
adapterUnsubscribe(id);
\`\`\`

Sends to an adapter the message \`unsubscribe\` to inform adapter to not poll the values.

### $ - Selector
\`\`\`js
$(selector).on((obj) => {}); // Register a subscription for each matching state
$(selector).toArray(); // Get all matching object IDs of the selector expression (requires version >= 8.2.0)
$(selector).each((id, i) => {}); // iterate over all matching states
$(selector).setState(value, ack, callback); // set state value of all matching object IDs (callback is optional)
$(selector).setStateAsync(value, ack); // set state value of all matching object IDs - returns a promise
$(selector).setStateChanged(value, ack, callback); // set state value of all matching object IDs if value has changed (callback is optional)
$(selector).setStateChangedAsync(value, ack, callback); // set state value of all matching object IDs if value has changed - returns a promise
$(selector).setStateDelayed(state, isAck, delay, clearRunning, callback); // // set state value of all matching object IDs with a given delay
$(selector).getState(); // get all states
$(selector).getStateAsync(); // get all states - returns a promise
\`\`\`

Format of selector:
\`\`\`js
"name[commonAttr=something1](enumName=something2){nativeName=something3}[id=idfilter][state.id=idfilter]"
\`\`\`

name can be: state, channel, device or schedule
\`idfilter\` can have wildcards '*'

Prefixes ***(not implemented - should be discussed)*** :

* \\# - take by name and not by id
* . - filter by role
* § - filter by room

***Example***:

- \`$('state[id=*.STATE]')\` or \`$('state[state.id=*.STATE]')\` or \`$('*.STATE')\` - select all states where id ends with ".STATE".
- \`$('state[id='hm-rpc.0.*]')\` or \`$('hm-rpc.0.*')\` - returns all states of adapter instance hm-rpc.0
- \`$('channel(rooms=Living room)')\` - all states in room "Living room"
- \`$('channel{TYPE=BLIND}[state.id=*.LEVEL]')\` - Get all shutters of Homematic
- \`$('channel[role=switch](rooms=Living room)[state.id=*.STATE]').setState(false)\` - Switch all states with .STATE of channels with role "switch" in "Living room" to false
- \`$('channel[state.id=*.STATE](functions=Windows)').each(function (id, i) {log(id);});\` - print all states of enum "windows" in log
- \`$('schedule[id=*65]').each(function (id, i) {log(id);});\` - print all schedules with 65 at the end
- \`$('.switch §"Living room")\` - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***
- \`$('channel .switch §"Living room")\` - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***

***Explanation***
Lets take a look at:
\`\`\`js
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').on(obj => {
   log('New state ' + obj.id + ' = ' + obj.state.val);
});
\`\`\`

This code searches in channels.
Find all channels with \`common.role="switch"\` and belongs to \`enum.rooms.Wohnzimmer\`.
Take all their states, where id ends with \`".STATE"\` and make subscription on all these states.
If some of these states change, the callback will be called like for "on" function.

Following functions are possible, setState, getState (only from first), on, each, toArray

\`\`\`js
// Switch on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setState(true);
\`\`\`

You can interrupt the "each" loop by returning the false value, like:
\`\`\`js
// print two first IDs of on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').each((id, i) => {
    log(id);
    if (i == 1) {
        return false;
    }
});
\`\`\`
Or you can get a an usual array of ids and process it your own way:
\`\`\`js
// get some state and filter only which has an \`true\` value
const enabled = $('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').toArray().filter((id) => getState(id)?.val === true);
\`\`\`

### readFile
\`\`\`js
readFile(adapter, fileName, (error, bytes) => {});
\`\`\`

The result will be given in callback.
Read file from DB from folder \`javascript.0\`.

Argument *adapter* can be omitted.

\`\`\`js
// read vis views
readFile('vis.0', '/main/vis-views.json', (error, data) => {
    log(data.substring(0, 50));
});

// The same as
//readFile('/../vis.0/main/vis-views.json', (error, data) => {
//     log(data.substring(0, 50));
//});
\`\`\`

By default, working directory/adapter is \`javascript.0\`.

### writeFile
\`\`\`js
writeFile(adapter, fileName, bytes, (error) => {});
\`\`\`

The optional error code will be given in callback. Argument *adapter* can be omitted.
fileName is the name of file in DB. All files are stored in the folder "javascript".
if you want to write to other folders, e.g. to "/vis.0/" use setFile for that.

The file that looks like \`'/subfolder/file.txt'\` will be stored under \`"/javascript/subfolder/file.txt"\` and can be accessed over web server with \`"http://ip:8082/javascript/subfolder/file.txt"\`

\`\`\`js
// store screenshot in DB
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile(null, '/screenshots/1.png', data, (error) => {
    log('file written');
});

// The same as
//writeFile('/screenshots/1.png', data, function (error) {
//    log('file written');
//});
\`\`\`

\`\`\`js
// store file in '/vis.0' in DB
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile('vis.0', '/screenshots/1.png', data, (error) => {
    log('file written');
});
\`\`\`

### delFile
\`\`\`js
delFile(adapter, fileName, (error) => {});
\`\`\`

Delete file or directory. fileName is the name of file or directory in DB.

The alternative name of this method is \`unlink\`

### renameFile
\`\`\`js
renameFile(adapter, oldName, newName, (error) => {});
\`\`\`

Rename file or directory. oldName is the name of file or directory in DB and is renamed to newName.

The alternative name of this method is \`rename\`

### onFile
\`\`\`js
onFile(id, fileName, withFile, (id, fileName, size, fileData, mimeType) => {});
// or
onFile(id, fileName, (id, fileName, size) => {});
\`\`\`

Subscribe to file changes:
- \`id\` is ID of an object of type \`meta\`, like \`vis.0\`
- \`fileName\` is file name or pattern, like \`main/*\` or \`main/vis-view.json\`
- \`withFile\` if the content of file should be delivered in callback or not. the delivery of file content costs memory and time, so if you want to be just informed about changes, set \`withFile\`to false.

Arguments in callback:
- \`id\` - ID of \`meta\` object;
- \`fileName\` - file name (not pattern);
- \`size\` - new file size;
- \`fileData\` - file content of type \`Buffer\` if file is binary (detected by extension) or \`string\`. Delivered only if \`withFile\`;
- \`mimeType\` - mime type of file, like \`image/jpeg\`. Delivered only if \`withFile\`;

**Important**: this functionality is only available with js-controller@4.1.x or newer.

### offFile
\`\`\`js
offFile(id, fileName);
// or
onFile(id, fileName);
\`\`\`
Unsubscribe from file changes:
- \`id\` is ID of an object of type \`meta\`, like \`vis.0\`
- \`fileName\` is file name or pattern, like \`main/*\` or \`main/vis-view.json\`

**Important**: this functionality is only available with js-controller@4.1.x or newer.

### onStop
\`\`\`js
onStop (() => { /* do something when script is stopped */ }, timeout);
\`\`\`
Install callback, that will be called if a script stopped. Used, e.g., to stop communication or to close connections.

\`\`\`js
// establish connection
const conn = require('net');
// ...

// close connection if script stopped
onStop((callback) => {
    if (conn) {
        // close connection
        conn.destroy();
    }
    callback();
}, 2000 /*ms*/);
\`\`\`
\`timeout\` is 1000ms by default.

### getHistory
\`\`\`js
getHistory(instance, options, (error, result, options, instance) => {});
\`\`\`

Read history from specified instance. If no instance is specified, the system default history instance will be taken.
\`\`\`js
// Read history of 'system.adapter.admin.0.memRss' from sql driver
const end = new Date().getTime();
getHistory(
    'sql.0',
    {
        id:         'system.adapter.admin.0.memRss',
        start:      end - 3600000,
        end:        end,
        aggregate:  'm4',
        timeout:    2000
    },
    (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    }
);
\`\`\`

Possible options you can find [here](https://github.com/ioBroker/ioBroker.history#access-values-from-javascript-adapter).

Additionally, to these parameters you must specify "id" and you may specify timeout (default: 20000ms).

One more example:
\`\`\`js
// Get last 50 entries from default history instance with no aggregation:
getHistory({
        id:         'system.adapter.admin.0.alive',
        aggregate:  'none',
        count:      50
    }, (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    });
\`\`\`

**Note: ** of course, history must be first enabled for selected ID in admin.

### runScript
\`\`\`js
runScript('scriptName', () => {
    // Callback is optional
    log('Srcipt started, but not yet executed');
});
\`\`\`

Starts or restarts other scripts (and itself too) by name.

\`\`\`js
// restart script
runScript('groupName.scriptName1');
\`\`\`

### runScriptAsync
Same as runScript, but with \`promise\`.
\`\`\`js
runScriptAsync('scriptName')
    .then(() => log('Script started, but not yet executed'));

// or

await runScriptAsync('scriptName');
log(\`Script was restarted\`);
\`\`\`

### startScript
\`\`\`js
startScript('scriptName', ignoreIfStarted, callback);
\`\`\`

Starts the script. If ignoreIfStarted set to true, nothing will be done if a script yet running, otherwise the script will be restarted.

\`\`\`js
startScript('scriptName', true); // start script if not started
\`\`\`

### startScriptAsync
Same as runScript, but with \`promise\`.

\`\`\`js
startScriptAsync('scriptName', ignoreIfStarted)
    .then(started => log(\`Script was \${started ? 'started' : 'already started'}\`));

// or

const started = await startScriptAsync('scriptName', ignoreIfStarted);
log(\`Script was \${started ? 'started' : 'already started'}\`);
\`\`\`

Starts the script. If ignoreIfStarted set to true, nothing will be done if a script yet running, otherwise the script will be restarted.

\`\`\`js
startScript('scriptName', true); // start script if not started
\`\`\`

### stopScript
\`\`\`js
stopScript('scriptName', callback);
\`\`\`

If stopScript is called without arguments, it will stop itself:

\`\`\`js
stopScript();
\`\`\`

### stopScriptAsync
Same as stopScript, but with \`promise\`:
\`\`\`js
stopScriptAsync('scriptName')
    .then(stopped => log(\`Script was \${stopped ? 'stopped' : 'already stopped'}\`));

//or
const stopped = await stopScriptAsync('scriptName');
log(\`Script was \${stopped ? 'stopped' : 'already stopped'}\`);
\`\`\`

If stopScript is called without arguments, it will stop itself:

\`\`\`js
stopScript();
\`\`\`

### isScriptActive
\`\`\`js
isScriptActive('scriptName');
\`\`\`

Returns if a script enabled or disabled. Please note that that does not give back if the script is now running or not.
The script can be finished, but still activated.

It is not a function. It is a variable with javascript instance, that is visible in script's scope.

### toInt
### toFloat
### toBoolean
### jsonataExpression

### wait
Just pause the execution of the script.
Warning this function is \`promise\` and must be called as follows:
\`\`\`js
await wait(1000);
\`\`\`

### sleep
Same as [wait](#wait)

### messageTo
\`\`\`js
messageTo({ instance: 'instance', script: 'script.js.common.scriptName', message: 'messageName' }, data, { timeout: 1000 }, result =>
    log(JSON.stringify(result)));
\`\`\`

Send via the "message bus" the message to some other script. Or even to some handler in the same script.

Timeout for callback is 5 seconds by default.

The target could be shorted to:

\`\`\`js
messageTo('messageName', data, (result) => {
    log(JSON.stringify(result));
});
\`\`\`

Callback and options are optional and timeout is by default 5000 milliseconds (if callback provided).

\`\`\`js
messageTo('messageName', dataWithNoResponse);
\`\`\`

### messageToAsync
\`\`\`js
onMessage('myTopic', async (data, callback) => {
    log(data);

    if (!data.myPayload) {
        // return error (promise reject)
        callback({ error: 'something went wrong!!' });
    } else {
        // return result (promise resolve)
        callback({ result: 'ok' });
    }
});

(async () => {
    try {
        const msg = await messageToAsync({ instance: 0, script: 'script.js.test2', message: 'myTopic' }, { myPayload: true }, { timeout: 1000 });
        log(\`Done with: \${JSON.stringify(msg)}\`);
    } catch (error) {
        // contents of result.error
        console.error(error);
    }
})();
\`\`\`

### onMessage
\`\`\`js
onMessage('messageName', (data, callback) => {
    log(\`Received data: \${data}\`);

    callback({ result: Date.now() });
});
\`\`\`

Subscribes on \`javascript\` adapter message bus and delivers response via callback.
The response from script which sends response as first will be accepted as answer, all other answers will be ignored.

To send a message to a JavaScript script which is then received by this handler, use [messageTo](#messageTo).

To send a message from any other adapter use

\`\`\`js
adapter.sendTo('javascript.0', 'toScript', {
    script: 'script.js.messagetest',
    message: 'messageName',
    data: {
        flag: true
    }
});
\`\`\`

to send a message from CLI use

\`\`\`bash
iob message javascript.0 toScript '{"script": "script.js.messagetest", "message": "messageName", "data": { "flag": true }}'
\`\`\`

### onMessageUnregister
\`\`\`js
const id = onMessage('messageName', (data, callback) => {
    log(data);
    callback({ result: Date.now() });
});

// unsubscribe specific handler
onMessageUnregister(id);
// or unsubscribe by name
onMessageUnregister('messageName');
\`\`\`

Unsubscribes from this message.

### onLog
\`\`\`js
onLog('error', data => {
    sendTo('telegram.0', { user: 'UserName', text: data.message });
    log('Following was sent to telegram: ' + data.message);
});
\`\`\`

Subscribe on logs with specified severity.

*Important:* you cannot output logs in handler with the same severity to avoid infinite loops.

E.g., this will produce no logs:
\`\`\`js
onLog('error', data => {
    console.error('Error: ' + data.message);
});
\`\`\`

To receive all logs the \`*\` could be used. In this case, the log output in handler will be disabled completely.

\`\`\`js
onLog('*', data => {
    console.error('Error: ' + data.message); // will produce no logs
});
\`\`\`

### onLogUnregister
\`\`\`js
function logHandler(data) {
    console.error('Error: ' + data.message);
}
const id = onLog('warn', logHandler);

// unsubscribe by ID
onLogUnregister(id);
// or unsubscribe by function handler
onLogUnregister(logHandler);
// or unsubscribe all handlers with specific severity
onLogUnregister('warn');
\`\`\`

Unsubscribes from these logs.

### httpGet

*Requires version >= 7.9.0*

\`\`\`js
httpGet('http://jsonplaceholder.typicode.com/posts', (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
\`\`\`

The second parameter can be an object with further options (optional). All options are optional. Supported flags:

- \`timeout\` (number) - Timeout in milliseconds
- \`responseType\` (string) - Supported values are \`text\` (default) or \`arraybuffer\` for binary data in the response
- \`basicAuth\` (object) - HTTP basic authentication credentials. e.g. \`{ user: 'admin', password: 'iobroker' }\`
- \`bearerAuth\` (string) - Token for bearer authentication
- \`headers\` (object) - Additional custom HTTP headers e.g. \`{ 'Accept-Language': 'en-GB,en;q=0.9' }\`
- \`validateCertificate\` (boolean) - Allows self-signed certificates when \`false\`

\`\`\`js
httpGet('http://jsonplaceholder.typicode.com/posts', { timeout: 1000 }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
\`\`\`

Download file to ioBroker file system:

\`\`\`js
httpGet('http://1.2.3.4/image.jpg', { responseType: 'arraybuffer' }, async (err, response) => {
    if (!err) {
        writeFile('0_userdata.0', 'test.jpg', response.data, (err) => {
            if (err) {
                console.error(err);
            }
        });
    } else {
        console.error(err);
    }
});
\`\`\`

Disable certificate validation - *Requires version >= 8.4.0*

\`\`\`js
httpGet('http://jsonplaceholder.typicode.com/posts', { validateCertificate: false }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
\`\`\`

### httpPost

*Requires version >= 7.9.0*

\`\`\`js
httpPost('http://jsonplaceholder.typicode.com/posts', { title: 'foo', body: 'bar', userId: 1 }, (error, response) => {
    if (!error) {
        console.log(response.statusCode);
        console.log(response.data);
        console.log(response.headers);
    } else {
        console.error(error);
    }
});
\`\`\`

With custom headers and authentication

\`\`\`js
httpPost(
    'http://jsonplaceholder.typicode.com/posts',
    {
        title: 'foo',
        body: 'bar',
        userId: 1
    },
    {
        timeout: 2000,
        basicAuth: {
            user: 'admin',
            password: 'dg2LdALNznHFNo'
        },
        headers: {
            'Cookie': 'PHPSESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1'
        }
    },
    (error, response) => {
        if (!error) {
            console.log(response.statusCode);
            console.log(response.data);
            console.log(response.headers);
        } else {
            console.error(error);
        }
    }
);
\`\`\`

### createTempFile

*Requires version >= 8.3.0*

\`\`\`js
httpGet('https://raw.githubusercontent.com/ioBroker/ioBroker.javascript/master/admin/javascript.svg', { responseType: 'arraybuffer' }, async (err, response) => {
    if (err) {
        console.error(err);
    } else {
        const tempFilePath = createTempFile('javascript.svg', response.data);
        console.log(\`Saved to \${tempFilePath}\`);

        // Use the new path in other scripts (e.g. sendTo)
    }
});
\`\`\`

\`\`\`js
onFile('0_userdata.0', '*.jpg', true, async (id, fileName, size, data, mimeType) => {
    const tempFilePath = createTempFile(fileName, response.data);

    // Use the new path in other scripts (e.g. sendTo)
});
\`\`\`

\`\`\`js
readFile('0_userdata.0', 'test.jpg', (err, data, mimeType) => {
    if (err) {
        console.error(err);
    } else {
        const tempFilePath = createTempFile('test.jpg', data);

        // Use the new path in other scripts (e.g. sendTo)
        sendTo('telegram.0', 'send', {
            text: tempFilePath,
            caption: 'Just a test image',
            user: 'yourUsername',
        });
    }
});
\`\`\`

### registerNotification

*Requires version >= 8.8.0*

\`\`\`js
registerNotification('This is just an information'); // Notify
registerNotification('This is an important message!', true); // Alert
\`\`\`

## Global script variables
### scriptName
\`scriptName\` - The name of the script.

\`\`\`js
log(\`Script \${scriptName} started!\`);
\`\`\`

### instance
\`instance\` - The javascript instance where a script is executed (e.g. \`0\`).

\`\`\`js
log(\`Script \${scriptName} started started by \${instance}\`);
\`\`\`

### defaultDataDir
\`defaultDataDir\` - Absolute path to iobroker-data.

\`\`\`js
log(\`Data dir: \${defaultDataDir}\`);
\`\`\`

### verbose
\`verbose\` - Verbose mode enabled?

\`\`\`js
log(\`Verbose mode: \${verbose ? 'enabled' : 'disabled'}\`);

// Example
if (verbose) {
    log('...');
}
\`\`\`

### SECRETS
\`SECRETS\` - The credentials of the central ioBroker credential storage.

The credentials are managed in the admin UI under **Basic settings** -> **Credentials**. Every credential
has an ID (like \`CameraPassword\`) and holds either a single **key** (e.g. an API key or a password) or a
**login**/**password** pair. The secret fields are stored encrypted with the system secret and are handed
to the scripts already decrypted:

\`\`\`js
// credential of the type "key"
httpGet(\`http://camera.local/snapshot?password=\${SECRETS.CameraPassword.key}\`, (err, result) => {
    // ...
});

// credential of the type "login"
log(\`Mail account: \${SECRETS.MyMailAccount.login} / \${SECRETS.MyMailAccount.password}\`);

// credential IDs that are no valid variable names
log(SECRETS['My camera'].key);
\`\`\`

\`SECRETS\` is read-only and always up to date: if a credential is added, changed or deleted in the admin UI,
the new value is used immediately - neither the adapter nor the script must be restarted.

If a credential does not exist, \`undefined\` is returned:

\`\`\`js
if (SECRETS.CameraPassword) {
    log('The camera password is defined');
}
\`\`\`

#### Which fields does a credential have?

Every credential has either a single \`key\` or a \`login\`/\`password\` pair. Three ways to find out which:

- In the instance settings of the JavaScript adapter, the section **Available credentials** lists every
  credential with its fields and the ready-to-copy expression.
- In the editor, the auto-completion after \`SECRETS.\` offers the credentials that exist, and after the
  next dot exactly the fields that credential has.
- In a script:

\`\`\`js
log(JSON.stringify(Object.keys(SECRETS.CameraPassword))); // ["key"]
log(JSON.stringify(Object.keys(SECRETS.MyMailAccount))); // ["login","password"]
\`\`\`

Blockly has a **credential** block for the same purpose - see the
[Blockly documentation](blockly.md#credential).

The access can be switched off with the instance option **Allow scripts to read the credentials**.
\`SECRETS\` is then empty and a warning is written to the log.

**Note:** this requires js-controller 7.2 or newer.

## Option - "Do not subscribe all states on start"
There are two modes of subscribing to states:

1. Adapter subscribes to all states at start and receives all changes of all states (it is easy to use getState(id), but requires more CPU and RAM):

\`\`\`js
log(getState('someID').val);
\`\`\`

2. Adapter subscribes every time on specified ID when \`on/subscribe\` is called. In this mode, the adapter receives only updates for desired states. This option requires less RAM and is more efficient, but you cannot access states synchronously via getState. **You must use callbacks or promises to access the states**:

\`\`\`js
getState('someID', (error, state) => {
    log(state.val);
});
\`\`\`

Reason: The adapter does not have the state's value in RAM and must request it from the central state database.

## Scripts activity

There is a possibility to enable and disable scripts via states. For every script, the state will be created with the name \`javascript.INSTANCE.scriptEnabled.SCRIPT_NAME\`.
Scripts can be activated and deactivated by controlling this state with \`ack=false\`.
`,ne=`## Inhalt
- [Globale Funktionen](#globale-funktionen)
    - [Best Practice](#best-practice)

- [Funktionen](#die-folgenden-funktionen-können-in-skripten-verwendet-werden)
    - [require - Modul laden](#require---modul-laden)
    - [console - Gibt die Nachricht im Log aus](#console---gibt-die-nachricht-im-log-aus)
    - [exec - Führt ein Betriebssystem-Kommando aus, z. B. "cp file1 file2"](#exec---führt-ein-betriebssystem-kommando-aus-z-b-cp-file1-file2)
    - [on - Änderungen oder Aktualisierungen eines States abonnieren](#on---änderungen-oder-aktualisierungen-eines-states-abonnieren)
    - [once](#once)
    - [subscribe - wie on](#subscribe---wie-on)
    - [unsubscribe](#unsubscribe)
    - [getSubscriptions](#getsubscriptions)
    - [getFileSubscriptions](#getfilesubscriptions)
    - [schedule](#schedule)
        - [Zeitplan](#zeitplan)
        - [Astro-Funktion](#astro-funktion)
    - [scheduleById](#schedulebyid)
    - [getSchedules](#getschedules)
    - [clearSchedule](#clearschedule)
    - [getAttr](#getattr)
    - [getAstroDate](#getastrodate)
    - [isAstroDay](#isastroday)
    - [compareTime](#comparetime)
    - [setState](#setstate)
    - [setStateAsync](#setstateasync)
    - [setStateDelayed](#setstatedelayed)
    - [clearStateDelayed](#clearstatedelayed)
    - [getStateDelayed](#getstatedelayed)
    - [getState](#getstate)
    - [getStateAsync](#getstateasync)
    - [existsState](#existsstate)
    - [getObject](#getobject)
    - [setObject](#setobject)
    - [existsObject](#existsobject)
    - [extendObject](#extendobject)
    - [deleteObject](#deleteobject)
    - [getIdByName](#getidbyname)
    - [getEnums](#getenums)
    - [createState](#createstate)
    - [createStateAsync](#createstateasync)
    - [deleteState](#deletestate)
    - [deleteStateAsync](#deletestateasync)
    - [sendTo](#sendto)
    - [sendToAsync](#sendtoasync)
    - [sendToHost](#sendtohost)
    - [sendToHostAsync](#sendtohostasync)
    - [setInterval](#setinterval)
    - [clearInterval](#clearinterval)
    - [setTimeout](#settimeout)
    - [clearTimeout](#cleartimeout)
    - [setImmediate](#setimmediate)
    - [formatDate](#formatdate)
    - [formatTimeDiff](#formattimediff)
    - [getDateObject](#getdateobject)
    - [formatValue](#formatvalue)
    - [adapterSubscribe](#adaptersubscribe)
    - [adapterUnsubscribe](#adapterunsubscribe)
    - [$ - Selektor](#---selektor)
    - [readFile](#readfile)
    - [writeFile](#writefile)
    - [delFile](#delfile)
    - [renameFile](#renamefile)
    - [onFile](#onfile)
    - [offFile](#offfile)
    - [onStop](#onstop)
    - [getHistory](#gethistory)
    - [runScript](#runscript)
    - [runScriptAsync](#runscriptasync)
    - [startScript](#startscript)
    - [startScriptAsync](#startscriptasync)
    - [stopScript](#stopscript)
    - [stopScriptAsync](#stopscriptasync)
    - [isScriptActive](#isscriptactive)
    - [name](#scriptname)
    - [instance](#instance)
    - [SECRETS](#secrets)
    - [messageTo](#messageto)
    - [messageToAsync](#messagetoasync)
    - [onMessage](#onmessage)
    - [onMessageUnregister](#onmessageunregister)
    - [onLog](#onlog)
    - [onLogUnregister](#onlogunregister)
    - [wait](#wait)
    - [sleep](#sleep)
    - [httpGet](#httpget)
    - [httpPost](#httppost)
    - [createTempFile](#createtempfile)
    - [registerNotification](#registernotification)

- [Skriptaktivität](#skriptaktivität)

## Globale Funktionen
Globale Skripte können im Ordner \`global\` definiert werden.
Alle globalen Skripte stehen in allen Instanzen zur Verfügung. Ist ein globales Skript deaktiviert, wird es nicht verwendet.
Ein globales Skript wird einfach dem normalen Skript vorangestellt und zusammen mit diesem kompiliert. Daher können über globale Skripte keine Daten zwischen Skripten ausgetauscht werden. Dafür sollten States verwendet werden.

Um globale Funktionen in TypeScript zu verwenden, müssen sie zuerst mit \`declare\` deklariert werden, damit der Compiler die globalen Funktionen kennt. Beispiel:
\`\`\`typescript
// globales Skript:
// ================
function globalFn(arg: string): void {
    // eigentliche Implementierung
}

// normales Skript:
// ================
declare function globalFn(arg: string): void;
// wie gewohnt verwenden:
globalFn('test');
\`\`\`

#### Best Practice:
Es empfiehlt sich, zwei Instanzen des JavaScript-Adapters anzulegen: eine "test"- und eine "production"-Instanz.
Nachdem das Skript in der "test"-Instanz getestet wurde, kann es nach "production" verschoben werden. So lässt sich die "test"-Instanz beliebig neu starten.

## Die folgenden Funktionen können in Skripten verwendet werden:

### require - Modul laden
\`\`\`js
const mod = require('module_name');
\`\`\`
Folgende Module sind bereits vorgeladen: \`node:dgram\`, \`node:crypto\`, \`node:dns\`, \`node:events\`, \`node:fs\`, \`node:http\`, \`node:https\`, \`node:http2\`, \`node:net\`, \`node:os\`, \`node:path\`, \`node:util\`, \`node:stream\`, \`node:zlib\`, \`suncalc2\`, \`axios\`, \`wake_on_lan\`, \`request\` (veraltet)

Um andere Module zu verwenden, trägt man den Namen (und die Version) des Moduls in der Instanzkonfiguration ein. ioBroker installiert das Modul dann. Anschließend kann es in den Skripten geladen (require) und verwendet werden.

### console - Gibt die Nachricht im Log aus
Die Verwendung ist dieselbe wie in \`javascript\`

### exec - Führt ein Betriebssystem-Kommando aus, z. B. \`cp file1 file2\`
\`\`\`js
exec(cmd, [options], callback);
\`\`\`

Führt ein Systemkommando aus und liefert dessen Ausgaben.

\`\`\`js
// Liste der Dateien und Verzeichnisse in /var/log abrufen
exec('ls /var/log', (error, stdout, stderr) => {
    log('stdout: ' + stdout);
});
\`\`\`

Node.js verwendet /bin/sh zum Ausführen von Kommandos. Soll eine andere Shell verwendet werden, kann das Optionsobjekt genutzt werden, wie in der [Node.js-Dokumentation](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback) zu child_process.exec beschrieben.
Es empfiehlt sich, bei Kommandos immer vollständige Pfadnamen anzugeben, damit sichergestellt ist, dass das richtige Kommando ausgeführt wird.

**Hinweis:** Um diese Funktion aufzurufen, muss die Option *Kommando "exec" erlauben* aktiviert sein.

### on - Änderungen oder Aktualisierungen eines States abonnieren
\`\`\`js
on(pattern, callbackOrId, value);
\`\`\`

Die Callback-Funktion erhält als Parameter ein Objekt mit folgendem Inhalt:
\`\`\`js
{
    id: 'javascript.0.myplayer',
    state: {
        val:  'new state',
        ts:   1416149118,
        ack:  true,
        lc:   1416149118,
        from: 'system.adapter.sonos.0'
    },
    oldState: {
        val:  'old state',
        ts:   1416148233,
        ack:  true,
        lc:   1416145154,
        from: 'system.adapter.sonos.0'
    }
}
\`\`\`

**Hinweis:** \`state\` hieß früher \`newState\`. Diese Bezeichnung funktioniert weiterhin.

Beispiel:
\`\`\`js
let timer;

// State "javascript.0.counter" anlegen
createState('counter', 0);

// Bei Änderung
on('adapter.0.device.channel.sensor', (data) => {
    // Aber nicht öfter als alle 30 Sekunden
    if (!timer) {
        timer = setTimeout(() => {
            timer = null;
        }, 30000);

        // Bestätigten Wert setzen
        setState('counter', 1 + getState('counter'), true);

        // Oder ein unbestätigtes Kommando setzen
        setState('adapter.0.device.channel.actor', true);
    }
});
\`\`\`

Folgende Parameter können zur Definition des Triggers verwendet werden:

| Parameter   | Typ/Wert | Beschreibung                                                                                                                                                         |
|-------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| logic       | string   | Logik "and" oder "or" zur Verknüpfung der Bedingungen \\(Standard: "and"\\)                                                                                            |
|             |          |                                                                                                                                                                      |
| id          | string   | ID ist gleich der angegebenen                                                                                                                                        |
|             | RegExp   | ID entspricht dem regulären Ausdruck                                                                                                                                 |
|             | Array    | ID ist in einer Liste erlaubter IDs enthalten                                                                                                                        |
|             |          |                                                                                                                                                                      |
| name        | string   | Name ist gleich dem angegebenen                                                                                                                                      |
|             | RegExp   | Name entspricht dem regulären Ausdruck                                                                                                                               |
|             | Array    | Name ist in einer Liste erlaubter Namen enthalten                                                                                                                    |
|             |          |                                                                                                                                                                      |
| change      | string   | "eq", "ne", "gt", "ge", "lt", "le", "any"                                                                                                                            |
|             | "eq"     | (gleich)              Neuer Wert muss gleich dem alten sein (state.val == oldState.val)                                                                              |
|             | "ne"     | (ungleich)            Neuer Wert muss ungleich dem alten sein (state.val != oldState.val) **Ist das Muster ein ID-String, wird dieser Wert standardmäßig verwendet** |
|             | "gt"     | (größer)              Neuer Wert muss größer als der alte sein (state.val > oldState.val)                                                                            |
|             | "ge"     | (größer oder gleich)  Neuer Wert muss größer oder gleich dem alten sein (state.val >= oldState.val)                                                                  |
|             | "lt"     | (kleiner)             Neuer Wert muss kleiner als der alte sein (state.val < oldState.val)                                                                           |
|             | "le"     | (kleiner oder gleich) Neuer Wert muss kleiner oder gleich dem alten sein (state.val <= oldState.val)                                                                 |
|             | "any"    | Trigger wird ausgelöst, sobald ein neuer Wert eintrifft                                                                                                              |
|             |          |                                                                                                                                                                      |
| val         | mixed    | Neuer Wert muss gleich dem angegebenen sein                                                                                                                          |
| valNe       | mixed    | Neuer Wert muss ungleich dem angegebenen sein                                                                                                                        |
| valGt       | mixed    | Neuer Wert muss größer als der angegebene sein                                                                                                                       |
| valGe       | mixed    | Neuer Wert muss größer oder gleich dem angegebenen sein                                                                                                              |
| valLt       | mixed    | Neuer Wert muss kleiner als der angegebene sein                                                                                                                      |
| valLe       | mixed    | Neuer Wert muss kleiner oder gleich dem angegebenen sein                                                                                                             |
|             |          |                                                                                                                                                                      |
| ack         | boolean  | Bestätigungsstatus (ack) des neuen Werts ist gleich dem angegebenen                                                                                                  |
| q           | number   | Qualitätscode des neuen Werts ist gleich dem angegebenen. Mit '*' passt jeder Code. **Ist q nicht angegeben, wird q = 0 als Muster gesetzt!**                        |
|             |          |                                                                                                                                                                      |
| oldVal      | mixed    | Vorheriger Wert muss gleich dem angegebenen sein                                                                                                                     |
| oldValNe    | mixed    | Vorheriger Wert muss ungleich dem angegebenen sein                                                                                                                   |
| oldValGt    | mixed    | Vorheriger Wert muss größer als der angegebene sein                                                                                                                  |
| oldValGe    | mixed    | Vorheriger Wert muss größer oder gleich dem angegebenen sein                                                                                                         |
| oldValLt    | mixed    | Vorheriger Wert muss kleiner als der angegebene sein                                                                                                                 |
| oldValLe    | mixed    | Vorheriger Wert muss kleiner oder gleich dem angegebenen sein                                                                                                        |
|             |          |                                                                                                                                                                      |
| oldAck      | bool     | Bestätigungsstatus (ack) des vorherigen Werts ist gleich dem angegebenen                                                                                             |
| oldQ        | number   | Qualitätscode des vorherigen Werts ist gleich dem angegebenen. Mit '*' passt jeder Code                                                                              |
|             |          |                                                                                                                                                                      |
| ts          | number   | Zeitstempel des neuen Werts muss gleich dem angegebenen sein (state.ts == ts)                                                                                        |
| tsGt        | number   | Zeitstempel des neuen Werts muss größer als der angegebene sein (state.ts > ts)                                                                                      |
| tsGe        | number   | Zeitstempel des neuen Werts muss größer oder gleich dem angegebenen sein (state.ts >= ts)                                                                            |
| tsLt        | number   | Zeitstempel des neuen Werts muss kleiner als der angegebene sein (state.ts < ts)                                                                                     |
| tsLe        | number   | Zeitstempel des neuen Werts muss kleiner oder gleich dem angegebenen sein (state.ts <= ts)                                                                           |
|             |          |                                                                                                                                                                      |
| oldTs       | number   | Vorheriger Zeitstempel muss gleich dem angegebenen sein (oldState.ts == ts)                                                                                          |
| oldTsGt     | number   | Vorheriger Zeitstempel muss größer als der angegebene sein (oldState.ts > ts)                                                                                        |
| oldTsGe     | number   | Vorheriger Zeitstempel muss größer oder gleich dem angegebenen sein (oldState.ts >= ts)                                                                              |
| oldTsLt     | number   | Vorheriger Zeitstempel muss kleiner als der angegebene sein (oldState.ts < ts)                                                                                       |
| oldTsLe     | number   | Vorheriger Zeitstempel muss kleiner oder gleich dem angegebenen sein (oldState.ts <= ts)                                                                             |
|             |          |                                                                                                                                                                      |
| lc          | number   | Zeitstempel der letzten Änderung muss gleich dem angegebenen sein (state.lc == lc)                                                                                   |
| lcGt        | number   | Zeitstempel der letzten Änderung muss größer als der angegebene sein (state.lc > lc)                                                                                 |
| lcGe        | number   | Zeitstempel der letzten Änderung muss größer oder gleich dem angegebenen sein (state.lc >= lc)                                                                       |
| lcLt        | number   | Zeitstempel der letzten Änderung muss kleiner als der angegebene sein (state.lc < lc)                                                                                |
| lcLe        | number   | Zeitstempel der letzten Änderung muss kleiner oder gleich dem angegebenen sein (state.lc <= lc)                                                                      |
|             |          |                                                                                                                                                                      |
| oldLc       | number   | Vorheriger Zeitstempel der letzten Änderung muss gleich dem angegebenen sein (oldState.lc == lc)                                                                     |
| oldLcGt     | number   | Vorheriger Zeitstempel der letzten Änderung muss größer als der angegebene sein (oldState.lc > lc)                                                                   |
| oldLcGe     | number   | Vorheriger Zeitstempel der letzten Änderung muss größer oder gleich dem angegebenen sein (oldState.lc >= lc)                                                         |
| oldLcLt     | number   | Vorheriger Zeitstempel der letzten Änderung muss kleiner als der angegebene sein (oldState.lc < lc)                                                                  |
| oldLcLe     | number   | Vorheriger Zeitstempel der letzten Änderung muss kleiner oder gleich dem angegebenen sein (oldState.lc <= lc)                                                        |
|             |          |                                                                                                                                                                      |
| channelId   | string   | Kanal-ID muss gleich der angegebenen sein                                                                                                                            |
|             | RegExp   | Kanal-ID entspricht dem regulären Ausdruck                                                                                                                           |
|             | Array    | Kanal-ID ist in einer Liste erlaubter Kanal-IDs enthalten                                                                                                            |
|             |          |                                                                                                                                                                      |
| channelName | string   | Kanalname muss gleich dem angegebenen sein                                                                                                                           |
|             | RegExp   | Kanalname entspricht dem regulären Ausdruck                                                                                                                          |
|             | Array    | Kanalname ist in einer Liste erlaubter Kanalnamen enthalten                                                                                                          |
|             |          |                                                                                                                                                                      |
| deviceId    | string   | Geräte-ID muss gleich der angegebenen sein                                                                                                                           |
|             | RegExp   | Geräte-ID entspricht dem regulären Ausdruck                                                                                                                          |
|             | Array    | Geräte-ID ist in einer Liste erlaubter Geräte-IDs enthalten                                                                                                          |
|             |          |                                                                                                                                                                      |
| deviceName  | string   | Gerätename muss gleich dem angegebenen sein                                                                                                                          |
|             | RegExp   | Gerätename entspricht dem regulären Ausdruck                                                                                                                         |
|             | Array    | Gerätename ist in einer Liste erlaubter Gerätenamen enthalten                                                                                                        |
|             |          |                                                                                                                                                                      |
| enumId      | string   | State gehört zum angegebenen Enum                                                                                                                                    |
|             | RegExp   | Eine Enum-ID des States entspricht dem angegebenen regulären Ausdruck                                                                                                |
|             | Array    | Eine Enum-ID des States ist in der angegebenen Liste von Enum-IDs enthalten                                                                                          |
|             |          |                                                                                                                                                                      |
| enumName    | string   | State gehört zum angegebenen Enum                                                                                                                                    |
|             | RegExp   | Ein Enum-Name des States entspricht dem angegebenen regulären Ausdruck                                                                                               |
|             | Array    | Ein Enum-Name des States ist in der angegebenen Liste von Enum-Namen enthalten                                                                                       |
|             |          |                                                                                                                                                                      |
| from        | string   | Neuer Wert stammt vom angegebenen Adapter                                                                                                                            |
|             | RegExp   | Neuer Wert stammt von einem Adapter, der dem regulären Ausdruck entspricht                                                                                           |
|             | Array    | Neuer Wert stammt von einem Adapter aus der angegebenen Liste erlaubter Adapter                                                                                      |
|             |          |                                                                                                                                                                      |
| fromNe      | string   | Neuer Wert stammt nicht vom angegebenen Adapter                                                                                                                      |
|             | RegExp   | Neuer Wert stammt nicht von einem Adapter, der dem regulären Ausdruck entspricht                                                                                     |
|             | Array    | Neuer Wert stammt nicht von einem Adapter aus der angegebenen Liste verbotener Adapter                                                                               |
|             |          |                                                                                                                                                                      |
| oldFrom     | string   | Alter Wert stammt vom angegebenen Adapter                                                                                                                            |
|             | RegExp   | Alter Wert stammt von einem Adapter, der dem regulären Ausdruck entspricht                                                                                           |
|             | Array    | Alter Wert stammt von einem Adapter aus der angegebenen Liste erlaubter Adapter                                                                                      |
|             |          |                                                                                                                                                                      |
| oldFromNe   | string   | Alter Wert stammt nicht vom angegebenen Adapter                                                                                                                      |
|             | RegExp   | Alter Wert stammt nicht von einem Adapter, der dem regulären Ausdruck entspricht                                                                                     |
|             | Array    | Alter Wert stammt nicht von einem Adapter aus der angegebenen Liste verbotener Adapter                                                                               |

Beispiele:
Trigger auf alle States mit der ID \`'*.STATE'\`, wenn sie bestätigt (ack) sind und den neuen Wert \`true\` haben.

\`\`\`js
{
    "id": /\\.STATE$/,
    "val": true,
    "ack": true,
    "logic": "and"
}
\`\`\`

**Hinweis:** RegExp kann direkt verwendet werden:

\`\`\`js
on(/^system\\.adapter\\..*\\.\\d+\\.memRss$/, function (obj) {
});

// entspricht
on({id: /^system\\.adapter\\..*\\.\\d+\\.memRss$/, change: "ne"}, function (obj) {
});
\`\`\`

Um zwei States einfach miteinander zu verbinden, schreibt man:
\`\`\`js
on('stateId1', 'stateId2');
\`\`\`

Alle Änderungen von *stateId1* werden in *stateId2* geschrieben.

Ist der Parameter \`value\` in Kombination mit einer State-ID als zweitem Parameter gesetzt, wird der State bei jeder Änderung mit \`value\` befüllt.
\`\`\`js
on('stateId1', 'stateId2', 'triggered');
setState('stateId1', 'new value');

// stateId2 wird auf 'triggered' gesetzt.
\`\`\`

Die Funktion \`on\` gibt einen Handler zurück. Dieser Handler kann zum Beenden des Abonnements verwendet werden.

*Hinweis:* Standardmäßig werden nur States mit der Qualität 0x00 an die Callback-Funktion übergeben. Um alle Ereignisse zu erhalten, muss \`{q: '*'}\` zur Muster-Struktur hinzugefügt werden.

*Hinweis:* Standardmäßig ist "change" gleich "any", außer wenn nur eine ID als String angegeben wird (wie \`on('id', () => {});\`). Im letzteren Fall wird change auf "ne" gesetzt.

*Hinweis:* Sollen auch das Löschen oder Ablaufen von States als Trigger erkannt werden, muss change mit \`ne\` oder \`any\` UND q mit \`*\` als Filter verwendet werden!

*Hinweis:* Ab Version 4.3.2 kann der Trigger-Typ als zweiter Parameter angegeben werden: \`on('my.id.0', 'any', obj => log(obj.state.val));\`

### once
Registriert ein einmaliges Abonnement, das nach dem ersten Aufruf automatisch beendet wird. Wie [on](#on---änderungen-oder-aktualisierungen-eines-states-abonnieren), wird aber nur einmal ausgeführt.

\`\`\`js
once(pattern, callback);
\`\`\`

### subscribe - wie **[on](#on---änderungen-oder-aktualisierungen-eines-states-abonnieren)**

### unsubscribe
\`\`\`js
unsubscribe(id);
// oder
unsubscribe(handler);
\`\`\`

Entfernt alle Abonnements für die angegebene Objekt-ID oder den angegebenen Handler.

\`\`\`js
// Per Handler
let mySubscription = on({ id: 'javascript.0.myState', change: 'any' }, (data) => {
    // Abonnement nach dem ersten Trigger beenden
    if (unsubscribe(mySubscription)) {
        log('Subscription deleted');
    }
});

// Per Objekt-ID
on({ id: 'javascript.0.myState1', change: 'ne' }, (data) => {
    log('Some event');
});

on({ id: 'javascript.0.myState1', change: 'any' }, (data) => {
    // Abonnement beenden
    if (unsubscribe('javascript.0.myState1')) {
        log('All subscriptions deleted');
    }
});
\`\`\`

### getSubscriptions
Liefert die Liste der Abonnements.

Beispiel für ein Ergebnis:
\`\`\`js
{
    'megad.0.dataPointName': [
        {
            name : 'script.js.NameOfScript',
            pattern : {
                id : 'megad.0.dataPointName',
                change : 'ne'
            }
        }
    ]
}
\`\`\`

### getFileSubscriptions
Liefert die Liste der Datei-Abonnements.

Beispiel für ein Ergebnis:
\`\`\`js
{
    'vis.0$%$main/*': [
        {
            name : 'script.js.NameOfScript',
            id : 'vis.0',
            fileNamePattern: 'main/*'
        }
    ]
}
\`\`\`

### schedule
\`\`\`js
schedule(pattern, callback);
\`\`\`

Zeitplaner mit Astro-Funktion.

#### Zeitplan
Das Muster kann ein String mit [Cron-Syntax](http://en.wikipedia.org/wiki/Cron) sein, der aus 5 (ohne Sekunden) oder 6 (mit Sekunden) Stellen besteht:
\`\`\`
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ │
│ │ │ │ │ └───── Wochentag (0 - 6) (0 bis 6 entspricht Sonntag bis Samstag, alternativ Namen verwenden; 7 ist Sonntag, wie 0)
│ │ │ │ └────────── Monat (1 - 12)
│ │ │ └─────────────── Tag des Monats (1 - 31)
│ │ └──────────────────── Stunde (0 - 23)
│ └───────────────────────── Minute (0 - 59)
└───────────────────────────── [optional] Sekunde (0 - 59)
\`\`\`

\`\`\`js
// Beispiel mit 5 Stellen:
schedule('*/2 * * * *', () => {
    log('Will be triggered every 2 minutes!');
});

// Beispiel mit 6 Stellen:
schedule('*/3 * * * * *', () => {
    log('Will be triggered every 3 seconds!');
});
\`\`\`

Das Muster kann auch ein Objekt sein. Das wird vor allem verwendet, wenn Sekunden benötigt werden:

Das Objekt kann folgende Eigenschaften haben:
- \`second\`
- \`minute\`
- \`hour\`
- \`date\`
- \`month\`
- \`year\`
- \`dayOfWeek\`

\`\`\`js
schedule({ second: [20, 25] }, () => {
    log('Will be triggered at xx:xx:20 and xx:xx:25 of every minute!');
});

schedule({ hour: 12, minute: 30 }, () => {
    log('Will be triggered at 12:30!');
});
\`\`\`
Das Muster kann auch ein JavaScript-Date-Objekt (ein bestimmter Zeitpunkt) sein - in diesem Fall wird der Zeitplan nur ein einziges Mal ausgelöst.

Werden Start- oder Endzeiten für einen Zeitplan benötigt, lässt sich das ebenfalls mit einem Objekt umsetzen. In diesem Fall hat das Objekt folgende Eigenschaften:
- \`start\`
- \`end\`
- \`rule\`

start und end legen jeweils ein Date-Objekt, einen Datums-String oder eine Anzahl von Millisekunden seit dem 01. Januar 1970 00:00:00 UTC fest.
Die Regel (rule) ist ein Zeitplan-String mit [Cron-Syntax](http://en.wikipedia.org/wiki/Cron) oder ein Objekt:
\`\`\`js
let startTime = new Date(Date.now() + 5000);
let endTime = new Date(startTime.getTime() + 5000);
schedule({ start: startTime, end: endTime, rule: '*/1 * * * * *' }, () => {
    log('It will run after 5 seconds and stop after 10 seconds');
});
\`\`\`

Die Regel selbst kann auch ein Objekt sein:

\`\`\`js
let today = new Date();
let startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let endTime =  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
let ruleData = { hour: 12, minute: 30 };
schedule({ start: startTime, end: endTime, rule: ruleData }, () => {
    log('Will be triggered at 12:30, starting tomorow, ending in 7 days');
});
\`\`\`

#### Astro-Funktion

Die Astro-Funktion kann über das Attribut "astro" verwendet werden:

\`\`\`js
schedule({ astro: 'sunrise' }, () => {
    log("Sunrise!");
});

schedule({ astro: 'sunset', shift: 10 }, () => {
    log("10 minutes after sunset!");
});
\`\`\`

Das Attribut "shift" ist der Versatz in Minuten. Er kann auch negativ sein, um einen Zeitpunkt vor dem Astro-Ereignis festzulegen.

Folgende Werte können als Attribut in der Astro-Funktion verwendet werden:

- \`"sunrise"\`: Sonnenaufgang (die Oberkante der Sonne erscheint am Horizont)
- \`"sunriseEnd"\`: Ende des Sonnenaufgangs (die Unterkante der Sonne berührt den Horizont)
- \`"goldenHourEnd"\`: Ende der morgendlichen goldenen Stunde (weiches Licht, die beste Zeit zum Fotografieren)
- \`"solarNoon"\`: Sonnenmittag (die Sonne steht am höchsten)
- \`"goldenHour"\`: Beginn der abendlichen goldenen Stunde
- \`"sunsetStart"\`: Beginn des Sonnenuntergangs (die Unterkante der Sonne berührt den Horizont)
- \`"sunset"\`: Sonnenuntergang (die Sonne verschwindet unter dem Horizont, die abendliche bürgerliche Dämmerung beginnt)
- \`"dusk"\`: Abenddämmerung (die abendliche nautische Dämmerung beginnt)
- \`"nauticalDusk"\`: nautische Abenddämmerung (die abendliche astronomische Dämmerung beginnt)
- \`"night"\`: Beginn der Nacht (dunkel genug für astronomische Beobachtungen)
- \`"nightEnd"\`: Ende der Nacht (die morgendliche astronomische Dämmerung beginnt)
- \`"nauticalDawn"\`: nautische Morgendämmerung (die morgendliche nautische Dämmerung beginnt)
- \`"dawn"\`: Morgendämmerung (die morgendliche nautische Dämmerung endet, die morgendliche bürgerliche Dämmerung beginnt)
- \`"nadir"\`: Nadir (der dunkelste Moment der Nacht, die Sonne steht am tiefsten)

**Hinweis:** Um die "astro"-Funktion zu verwenden, müssen "latitude" und "longitude" (Breiten- und Längengrad) in den Einstellungen des JavaScript-Adapters definiert sein.

**Hinweis:** An manchen Orten kann es vorkommen, dass kein night/nightEnd existiert. Mehr dazu [hier](https://github.com/mourner/suncalc/issues/70).

**Hinweis:** Die Funktion "on" kann mit einer kleinen Anpassung auch für Zeitpläne verwendet werden:
\`\`\`js
on({ time: '*/2 * * * *' }, () => {
    log((new Date()).toString() + " - Will be triggered every 2 minutes!");
});

on({ time: { hour: 12, minute: 30 }}, () => {
    log((new Date()).toString() + " - Will be triggered at 12:30!");
});

on({ astro: 'sunset', shift: 10 }, () => {
    log((new Date()).toString() + " - 10 minutes after sunset!");
});
\`\`\`
### scheduleById
\`\`\`js
scheduleById(id, callback);
scheduleById(id, ack, callback);
\`\`\`

Ermöglicht das Anlegen eines Zeitplans auf Basis eines State-Werts. Ändert sich der State-Wert, wird der alte Zeitplan gelöscht und automatisch ein neuer Zeitplan angelegt.

Unterstützte Formate:

- \`[h]h:[m]m:ss\` (z. B. \`12:42:15\`, \`15:3:12\`, \`3:10:25\`)
- \`[h]h:[m]m\` (z. B. \`13:37\`, \`9:40\`)

\`\`\`js
scheduleById('0_userdata.0.configurableTimeFormat', () => {
    log('Executed!');
});
\`\`\`

Beispiel: State anlegen und bei Änderungen einen Zeitplan registrieren:

\`\`\`js
createState(
    '0_userdata.0.myTime',
    '00:00:00', // Standardwert
    {
        type: 'string',
        read: true,
        write: true
    },
    () => {
        scheduleById('0_userdata.0.myTime', () => {
            log('Executed!');
        });
    }
);
\`\`\`

### getSchedules
\`\`\`js
const list = getSchedules(true);
\`\`\`
Liefert die Liste aller CRON-Jobs und Zeitpläne (außer Astro).
Das Argument muss \`true\` sein, wenn man die Liste für **jedes laufende Skript** erhalten möchte. Andernfalls werden nur die Zeitpläne des aktuellen Skripts zurückgegeben.

\`\`\`js
const list = getSchedules(true);
list.forEach(schedule => log(JSON.stringify(schedule)));

// Alle Zeitpläne in allen Skripten löschen!
list.forEach(schedule => clearSchedule(schedule));
\`\`\`

Beispielausgabe:
\`\`\`
2020-11-01 20:15:19.929  - {"type":"cron","pattern":"0 * * * *","scriptName":"script.js.Heizung","id":"cron_1604258108384_74924"}
2020-11-01 20:15:19.931  - {"type":"schedule","schedule":"{"period":{}}","scriptName":"script.js.Heizung","id":"schedule_19576"}
\`\`\`

### clearSchedule
Wenn **keine** "astro"-Funktion verwendet wird, kann man den Zeitplan später abbrechen. Dazu muss das Zeitplan-Objekt gespeichert werden:

\`\`\`js
let sch = schedule('*/2 * * * *', () => { /* ... */ });

// später:
clearSchedule(sch);
\`\`\`

\`clearSchedule\` akzeptiert alles, was \`schedule\` zurückgibt (ein CRON-Job-Objekt oder die ID eines Zeitplans aus dem Zeit-Assistenten)
und außerdem die Einträge von [getSchedules](#getschedules):

\`\`\`js
// Alle Zeitpläne dieses Skripts löschen
getSchedules().forEach(sch => clearSchedule(sch));
\`\`\`

Die Funktion gibt \`true\` zurück, wenn der Zeitplan gefunden und gelöscht wurde, andernfalls \`false\`.
Zeitpläne, die mit der Astro-Option angelegt wurden, können auf diese Weise nicht gelöscht werden.

### getAttr
\`\`\`js
getAttr({ attr1: { attr2: 5 } }, 'attr1.attr2');
\`\`\`
Liefert ein Attribut des Objekts. Der Pfad zum Attribut kann verschachtelt sein, wie im Beispiel.

Ist das erste Attribut ein String, versucht die Funktion, den String als JSON zu parsen.

### getAstroDate
\`\`\`js
getAstroDate(pattern, date, offsetMinutes);
\`\`\`
Liefert ein JavaScript-Date-Objekt für den angegebenen Astro-Namen (z. B. \`"sunrise"\` oder \`"sunriseEnd"\`). Die gültigen Werte sind in der Liste der erlaubten Werte im Abschnitt [Astro](#astro-funktion) der Funktion *schedule* aufgeführt.

Das zurückgegebene Date-Objekt wird für das übergebene *date* berechnet. Wird kein Datum angegeben, wird der aktuelle Tag verwendet.

\`\`\`js
let sunriseEnd = getAstroDate('sunriseEnd');
log(\`Sunrise ends today at \${sunriseEnd.toLocaleTimeString()}\`);

let today = new Date();
let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let tomorrowNight = getAstroDate('night', tomorrow);
\`\`\`

**Hinweis: Abhängig vom geografischen Standort kann es vorkommen, dass z. B. 'night'/'nightEnd' zu bestimmten Zeitpunkten nicht existieren (z. B. an nördlichen Standorten jedes Jahr im Mai/Juni)!**

Mit Webseiten wie [suncalc.net](http://suncalc.net) kann man prüfen, ob die Zeitpunkte korrekt sind.

### isAstroDay
\`\`\`js
isAstroDay();
\`\`\`
Gibt \`true\` zurück, wenn die aktuelle Zeit zwischen dem astronomischen Sonnenaufgang und Sonnenuntergang liegt.

### compareTime
\`\`\`js
compareTime(startTime, endTime, operation, timeToCompare);
\`\`\`
Vergleicht die angegebene Zeit mit Grenzwerten.

Ist \`timeToCompare\` nicht angegeben, wird die aktuelle Zeit verwendet.

Folgende Operationen sind möglich:

- \`">"\` - wenn die angegebene Zeit größer als \`startTime\` ist
- \`">="\` - wenn die angegebene Zeit größer oder gleich \`startTime\` ist
- \`"<"\` - wenn die angegebene Zeit kleiner als \`startTime\` ist
- \`"<="\` - wenn die angegebene Zeit kleiner oder gleich \`startTime\` ist
- \`"=="\` - wenn die angegebene Zeit gleich \`startTime\` ist
- \`"<>"\` - wenn die angegebene Zeit ungleich \`startTime\` ist
- \`"between"\` - wenn die angegebene Zeit zwischen \`startTime\` und \`endTime\` liegt
- \`"not between"\` - wenn die angegebene Zeit nicht zwischen \`startTime\` und \`endTime\` liegt

Die Zeit kann ein Date-Objekt, ein Datum mit Uhrzeit oder nur eine Uhrzeit sein.

Für die Zeitangabe kann man Astro-Namen verwenden. Alle 3 Parameter können als Astro-Zeit angegeben werden.
Folgende Werte sind möglich: \`sunrise\`, \`sunset\`, \`sunriseEnd\`, \`sunsetStart\`, \`dawn\`, \`dusk\`, \`nauticalDawn\`, \`nauticalDusk\`, \`nightEnd\`, \`night\`, \`goldenHourEnd\`, \`goldenHour\`.
Details siehe [Astro](#astro-funktion).

\`\`\`js
log(compareTime('sunsetStart', 'sunsetEnd', 'between') ? 'Now is sunrise' : 'Now is no sunrise');
\`\`\`

Die Zeit kann auch mit einem Offset angegeben werden:

\`\`\`js
log(compareTime({ astro: 'sunsetStart', offset: 30 }, { astro: 'sunrise', offset: -30 }, '>') ? 'Now is at least 30 minutes after sunset' : 'No idea');
\`\`\`

Struktur eines Astro-Objekts.

\`\`\`js
{
    astro: 'sunsetStart',// Pflichtangabe, kann als String statt als Objekt angegeben werden, wenn offset und date Standardwerte haben
    offset: 30,          // optional
    date:   new Date()   // optional
}
\`\`\`

### setState
\`\`\`js
setState(id, state, ack, callback);
\`\`\`

*Hinweis*: Die folgenden Befehle sind identisch

\`\`\`js
setState('myState', 1, false);
setState('myState', { val: 1, ack: false });
setState('myState', 1);
\`\`\`

Zur Verwendung von \`ack\` siehe https://github.com/ioBroker/ioBroker/wiki/Adapter-Development-Documentation#commands-and-statuses
Kurz:
- \`ack\` = \`false\` : Das Skript möchte ein Kommando senden, das vom Zielgerät/Adapter ausgeführt werden soll
- \`ack\` = \`true\`  : Das Kommando wurde erfolgreich ausgeführt, und der State wird als positives Ergebnis aktualisiert

### setStateAsync
\`\`\`js
await setStateAsync(id, state, ack);
\`\`\`
Wie setState, aber mit \`promise\`.

### setStateDelayed
\`\`\`js
setStateDelayed(id, state, isAck, delay, clearRunning, callback);
\`\`\`

Wie setState, aber mit einer Verzögerung in Millisekunden. Dabei kann man (standardmäßig) alle laufenden Verzögerungen für diese ID löschen. Z. B.

\`\`\`js
// Das Licht in der Küche in einer Sekunde EINschalten
setStateDelayed('Kitchen.Light.Lamp', true,  1000);

// Das Licht in der Küche in 5 Sekunden AUSschalten und den ersten Timeout weiterlaufen lassen.
setStateDelayed('Kitchen.Light.Lamp', false, 5000, false, () => {
    log('Lamp is OFF');
});
\`\`\`
Die Funktion gibt den Handler des Timers zurück, und dieser Timer kann mit clearStateDelayed einzeln gestoppt werden.

### setStateChanged
\`\`\`js
await setStateChanged(id, state, ack);
\`\`\`
Wie setState, setzt den Wert aber nur, wenn er sich tatsächlich geändert hat.

### setStateChangedAsync
\`\`\`js
await setStateChangedAsync(id, state, ack);
\`\`\`
Wie setStateChanged, aber mit \`promise\`.

### clearStateDelayed
\`\`\`js
clearStateDelayed(id);
\`\`\`

Löscht alle verzögerten Aufgaben für die angegebene State-ID oder eine bestimmte verzögerte Aufgabe.

\`\`\`js
setStateDelayed('Kitchen.Light.Lamp', false,  10000); // Das Licht in der Küche in zehn Sekunden AUSschalten
let timer = setStateDelayed('Kitchen.Light.Lamp', true, 5000, false); // Das Licht in der Küche in fünf Sekunden EINschalten
clearStateDelayed('Kitchen.Light.Lamp', timer); // Es wird nichts eingeschaltet
clearStateDelayed('Kitchen.Light.Lamp'); // Alle laufenden verzögerten Aufgaben für diese ID löschen
\`\`\`

### getStateDelayed
\`\`\`js
getStateDelayed(id);
\`\`\`

Dies ist ein synchroner Aufruf, der die Liste aller laufenden Timer (setStateDelayed) für diese ID liefert.
Man kann die Funktion auch ohne ID aufrufen und erhält dann die Timer für alle IDs.
Ruft man die Funktion für eine bestimmte Objekt-ID auf, erhält man folgende Antwort:

\`\`\`js
getStateDelayed('hm-rpc.0.LQE91119.1.STATE');

// liefert ein Array wie
[
    { timerId: 1, left: 1123,   delay: 5000,  val: true,  ack: false },
    { timerId: 2, left: 12555,  delay: 15000, val: false, ack: false },
]
\`\`\`

Fragt man alle IDs ab, sieht die Antwort so aus:

\`\`\`js
getStateDelayed();

// liefert ein Objekt wie
{
    'hm-rpc.0.LQE91119.1.STATE': [
        { timerId: 1, left: 1123,   delay: 5000,   val: true,  ack: false },
        { timerId: 2, left: 12555,  delay: 15000,  val: false, ack: false },
    ],
    'hm-rpc.0.LQE91119.2.LEVEL': [
        { timerId: 3, left: 5679, delay: 10000,   val: 100,  ack: false },
    ],
}
\`\`\`

- \`left\` ist die verbleibende Zeit in Millisekunden
- \`delay\` ist der ursprüngliche Verzögerungswert in Millisekunden

Man kann auch direkt anhand der timerId abfragen. In diesem Fall lautet die Antwort:

\`\`\`js
getStateDelayed(3);

// liefert ein Objekt wie
{ id: 'hm-rpc.0.LQE91119.2.LEVEL', left: 5679, delay: 10000, val: 100, ack: false }
\`\`\`

### getState
\`\`\`js
getState(id);
\`\`\`

Liefert den State mit der angegebenen ID in folgender Form:

\`\`\`js
{
    val: value,
    ack: true/false,
    ts: timestamp,
    lc: lastchanged,
    from: origin
}
\`\`\`

Existiert der State nicht, wird eine Warnung ins Log geschrieben und das Objekt \`{ val: null, notExist: true }\` zurückgegeben.
Um die Warnung zu vermeiden, sollte man vor dem Aufruf von getState prüfen, ob der State existiert (siehe [existsState](#existsstate)).

### getStateAsync
\`\`\`js
const stateObject = await getStateAsync(id);
\`\`\`
Wie getState, aber mit \`promise\`.

### existsState
\`\`\`js
existsState(id, (err, isExists) => {});
\`\`\`

Ist die Option "Nicht alle Zustände beim Start abonnieren" deaktiviert, kann man einen einfacheren Aufruf verwenden:

\`\`\`js
existsState(id)
\`\`\`
In diesem Fall gibt die Funktion true oder false zurück.

Prüft, ob ein State existiert.

### getObject
\`\`\`js
getObject(id, enumName);
\`\`\`
Liefert die Beschreibung der Objekt-ID, wie sie im System gespeichert ist.
Man kann den Namen eines Enums angeben. Ist dieser angegeben, werden dem Ergebnis zwei zusätzliche Attribute hinzugefügt: enumIds und enumNames.
Diese Arrays enthalten alle Enums, in denen die ID Mitglied ist. Z. B.:

\`\`\`js
getObject('adapter.N.objectName', 'rooms');
\`\`\`

liefert in enumIds alle Räume, in denen das angefragte Objekt Mitglied ist. Gibt man "true" als enumName an, erhält man *alle* Enums zurück.

### setObject
\`\`\`js
setObject(id, obj, callback);
\`\`\`
Schreibt ein Objekt in die DB. Dieses Kommando kann in den Einstellungen des Adapters deaktiviert werden. Die Funktion sollte vorsichtig verwendet werden, da sonst die globalen Einstellungen beschädigt werden können.

Man sollte sie verwenden, um ein vorhandenes, zuvor gelesenes Objekt zu **ändern**, z. B.:
\`\`\`js
const obj = getObject('adapter.N.objectName');
obj.native.settings = 1;
setObject('adapter.N.objectName', obj, (err) => {
    if (err) log('Cannot write object: ' + err);
});
\`\`\`

### existsObject
\`\`\`js
existsObject(id, function (err, isExists) {});
\`\`\`

Ist die Option "Nicht alle Zustände beim Start abonnieren" deaktiviert, kann man einen einfacheren Aufruf verwenden:

\`\`\`js
existsObject(id)
\`\`\`
In diesem Fall gibt die Funktion true oder false zurück.

Prüft, ob ein Objekt existiert.


### extendObject
\`\`\`js
extendObject(id, obj, callback);
\`\`\`

Fast dasselbe wie \`setObject\`, allerdings wird das Objekt zuerst gelesen und dann versucht, alle Einstellungen zusammenzuführen.

Verwendung z. B. so:
\`\`\`js
// Instanz stoppen
extendObject('system.adapter.sayit.0', {common: {enabled: false}});
\`\`\`

### deleteObject
\`\`\`js
deleteObject(id, isRecursive, callback);
\`\`\`

Löscht ein Objekt anhand der ID aus der DB. Hat das Objekt den Typ \`state\`, wird auch der State-Wert gelöscht.

Zusätzlich kann der Parameter \`isRecursive\` angegeben werden, dann werden auch alle Kindobjekte der angegebenen ID gelöscht. Sehr gefährlich!

Verwendung z. B. so:
\`\`\`js
// State löschen
deleteObject('javascript.0.createdState');
\`\`\`

*Hinweis: Die Option \`isRecursive\` ist nur mit js-controller >= 2.2.x verfügbar*

### getIdByName
\`\`\`js
getIdByName(name, alwaysArray);
\`\`\`

Liefert die ID des Objekts mit dem angegebenen Namen.
Gibt es mehr als ein Objekt mit diesem Namen, ist das Ergebnis ein Array.
Ist das Flag \`alwaysArray\` gesetzt, ist das Ergebnis immer ein Array, sofern eine ID gefunden wurde.
### getEnums
\`\`\`js
getEnums(enumName);
\`\`\`

Liefert die Liste der vorhandenen Enums mit ihren Mitgliedern, z. B.:

\`\`\`js
getEnums('rooms');

// liefert alle Räume, z. B.:
[
    {
        id: 'enum.rooms.LivingRoom',
        members: [ 'hm-rpc.0.JEQ0024123.1', 'hm-rpc.0.BidCoS-RF.4' ],
        name: 'Living room'
    },
    {
        id: 'enum.rooms.Bath',
        members: [ 'hm-rpc.0.JEQ0024124.1', 'hm-rpc.0.BidCoS-RF.5' ],
        name: 'Bath'
    }
]

getEnums('functions');

// liefert alle Funktionen, z. B.:
[
    {
        id: 'enum.functions.light',
        members: [
            '0_userdata.0.AnotherOne',
            '0_userdata.0.MyLigh'
        ],
        name: {
            en: 'Light',
            ru: 'Свет',
            de: 'Licht',
            fr: 'Lumière',
            it: 'Leggero',
            nl: 'Licht',
            pl: 'Lekki',
            pt: 'Luz',
            es: 'Luz',
            'zh-cn': '光'
        }
    }
]
\`\`\`

### createState
\`\`\`js
createState(name, initialValue, forceCreation, common, native, callback);
\`\`\`
Legt State und Objekt im javascript-Namensraum an, falls sie nicht existieren, z. B. \`javascript.0.mystate\`.

!! Eigene States sollten bevorzugt mit der vollständigen ID \`0_userdata.0.mystate\` angelegt werden !!!

#### Parameter:

- \`name\`: Name des States ohne Namensraum, z. B. \`mystate\`
- \`initialValue\`: Die Variable kann nach dem Anlegen initialisiert werden. Der Wert "undefined" bedeutet, dass der Wert nicht initialisiert wird.
- \`forceCreation\`: State anlegen/überschreiben, unabhängig davon, ob der State bereits existiert oder nicht.
- \`common\`: common-Beschreibung des Objekts, siehe Beschreibung [hier](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state)
- \`native\`: native-Beschreibung eines Objekts. Beliebige spezifische Informationen.
- \`callback\`: wird aufgerufen, nachdem der State angelegt und initialisiert wurde.

Setzt man in \`common\` das Flag \`alias\` auf \`true\`, wird ein Alias mit demselben Namen wie der State (aber im Namensraum \`alias.0\`) angelegt.
Der Alias wird nur angelegt, wenn er noch nicht existiert.

Folgende Einstellungen für Aliase sind ebenfalls gültig:
\`\`\`js
common => {
    alias: {
        id: 'alias.0.myOtherState', // wird automatisch angelegt, falls noch nicht vorhanden
        write: 'val * 1000', // Umrechnungsfunktion für das Schreiben in den angelegten State
        read: 'val / 1000'   // Umrechnungsfunktion für das Lesen aus dem angelegten State
    }
}
\`\`\`

oder

\`\`\`js
common => {
    alias: {
        id: 'alias.0.myOtherState', // wird automatisch angelegt, falls noch nicht vorhanden
    }
}
\`\`\`

Es gibt auch Kurzformen von createState:

- \`createState('myDatapoint')\` - legt den State einfach an, falls er nicht existiert
- \`createState('myDatapoint', 1)\` - legt den State an, falls er nicht existiert, und initialisiert ihn mit dem Wert 1
- \`createState('myDatapoint', { type: 'string', role: 'json', read: true, write: false }, () => { log('created'); });\` - mit common-Definitionen wie type, read, write und role
- \`createState('myDatapoint', { name: 'My own datapoint', unit: '°C' }, () => { log('created'); });\`
- \`createState('myDatapoint', 1, { name: 'My own datapoint', unit: '°C' })\` - legt den State mit bestimmtem Namen und bestimmter Einheit an, falls er nicht existiert

#### Ein Objekt an zweiter Position ist immer das \`common\`

Diese Kurzformen sind der Grund, warum ein Objekt an zweiter Position **nie** als Initialwert
gelesen wird. \`createState('myDatapoint', {}, { type: 'object' })\` macht daher nicht das, wonach es aussieht:
Das \`{}\` wird zu \`common\`, und \`{ type: 'object' }\` rückt an die Stelle von \`native\`.

Um einem State einen Initialwert zu geben, der kein primitiver Wert ist, gibt man ihn in \`common.def\` an:

\`\`\`js
createState('0_userdata.0.myObject', { name: 'My object', type: 'object', read: true, write: true, def: {} });
\`\`\`

Ein State vom Typ \`object\`, \`json\` oder \`array\` speichert seinen Wert als JSON, daher beginnt der obige State
mit dem String \`'{}'\` - genau so, wie \`setState('0_userdata.0.myObject', {})\` ihn speichern würde. Der Standardwert
wird automatisch in einen String umgewandelt; \`def: '{}'\` selbst anzugeben funktioniert ebenso.

### createStateAsync
\`\`\`js
await createStateAsync(name, initialValue, forceCreation, common, native);
\`\`\`

Wie \`createState\`, aber es wird ein Promise zurückgegeben.

### deleteState
\`\`\`js
deleteState(name, callback);
\`\`\`
Löscht State und Objekt im javascript-Namensraum, z. B. \`javascript.0.mystate\`. States anderer Adapter können nicht gelöscht werden.

\`\`\`js
deleteState('myDatapoint')
\`\`\`
löscht den State einfach, falls er existiert.

### deleteStateAsync
\`\`\`js
await deleteStateAsync(name);
\`\`\`

Wie \`deleteState\`, aber es wird ein Promise zurückgegeben.

### createAlias
\`\`\`js
createAlias(name, alias, forceCreation, common, native, callback);
\`\`\`

Legt einen Alias im Namensraum \`alias.0\` an, falls er nicht existiert, z. B. \`javascript.0.myalias\`, der auf einen State oder auf States zum Lesen/Schreiben verweist.
Die common-Definition wird aus dem Objekt der Lese-Alias-ID übernommen, ein übergebenes common hat jedoch Vorrang.

#### Parameter:

- \`name\`: ID des neuen Alias-States (auch ohne Alias-Namensraum möglich), z. B. \`test.mystate\` (der Namensraum \`alias.0.\` wird ergänzt = \`alias.0.test.mystate\`)
- \`alias\`: kann entweder eine vorhandene State-ID als String sein oder ein Objekt mit vollständiger Alias-Definition inklusive Lese-/Schreib-IDs und Lese-/Schreibfunktionen. Hinweis: Alias-Definitionen können nicht als Teil des Parameters common gesetzt werden!
- \`forceCreation\`: Alias anlegen/überschreiben, unabhängig davon, ob der State bereits existiert oder nicht.
- \`common\`: common-Beschreibung des Alias-Objekts, siehe Beschreibung [hier](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state). Hier angegebene Werte haben Vorrang vor der common-Definition des Objekts der Lese-Alias-ID. Hinweis: Alias-Definitionen können nicht als Teil dieses common-Parameters gesetzt werden, siehe Parameter alias!
- \`native\`: native-Beschreibung eines Objekts. Beliebige spezifische Informationen.
- \`callback\`: wird aufgerufen, nachdem der State angelegt und initialisiert wurde.

Es gibt auch Kurzformen von createAlias:

- \`createAlias('myAlias', 'myDatapoint')\` - legt einfach alias.0.myAlias an, das auf javascript.X.myDatapoint verweist, falls es nicht existiert
- \`createAlias('myAlias', { id: { read: 'myReadDatapoint', write: 'myWriteDatapoint' }})\` - legt einen Alias an, der auf unterschiedliche States zum Lesen/Schreiben verweist

Weitere Details siehe createState, die Funktion arbeitet ähnlich.

### createAliasAsync
\`\`\`js
await createAliasAsync(name, alias, forceCreation, common, native);
\`\`\`

Wie \`createAlias\`, aber es wird ein Promise zurückgegeben.
### sendTo
\`\`\`js
sendTo(adapter, command, message, callback);
sendTo(adapter, command, message, options, callback);
\`\`\`

Sendet eine Nachricht an eine bestimmte oder an alle Instanzen eines Adapters. Wird nur der Adaptername angegeben, wird die Nachricht an alle Instanzen gesendet.

Welche Nachrichten konkret unterstützt werden, ist in der Dokumentation des jeweiligen Adapters beschrieben.

Beispiel (mit benutzerdefiniertem Timeout):

\`\`\`js
sendTo('telegram', { user: 'UserName', text: 'Test message' }, { timeout: 2000 });
\`\`\`

Einige Adapter unterstützen auch Antworten auf die gesendeten Nachrichten (z. B. history, sql, telegram).
Die Antwort wird nur dann an den Callback zurückgegeben, wenn die Nachricht an eine bestimmte Instanz gesendet wird!

Beispiel (mit Callback):

\`\`\`js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, (res) => {
    log(\`Sent to \${res} users\`);
});
\`\`\`

*Der Standard-Timeout beträgt 20000 Millisekunden (sofern eine Callback-Funktion angegeben wurde)*

\`\`\`js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, { timeout: 2000 }, (res) => {
    log(\`Sent to \${res} users\`);
});
\`\`\`

### sendToAsync
\`\`\`js
await sendToAsync(adapter, command, message);
await sendToAsync(adapter, command, message, options);
\`\`\`
Wie sendTo, jedoch mit \`promise\`.

Beispiel:

\`\`\`js
const res = await sendToAsync('sql.0', 'getEnabledDPs', {});
log(JSON.stringify(res));
\`\`\`

### sendToHost
\`\`\`js
sendToHost(hostName, command, message, callback);
\`\`\`

Sendet eine Nachricht an die Controller-Instanz.

Die folgenden Kommandos werden unterstützt:
- \`'cmdExec'\`
- \`'getRepository'\`
- \`'getInstalled'\`
- \`'getVersion'\`
- \`'getDiagData'\`
- \`'getLocationOnDisk'\`
- \`'getDevList'\`
- \`'getLogs'\`
- \`'getLogFile'\`
- \`'getLogFiles'\`
- \`'delLogs'\`
- \`'getHostInfo'\`
- \`'getHostInfoShort'\`
- \`'updateMultihost'\`
- \`'upgradeController'\` - Aktualisiert den js-controller auf die neueste Version
- \`'getInterfaces'\` - Liefert alle verfügbaren Netzwerkschnittstellen des Systems
- \`'upload'\` - Startet einen Adapter-Upload
- \`'rebuildAdapter'\`
- \`'readBaseSettings'\`
- \`'writeBaseSettings'\`
- \`'addNotification'\`
- \`'clearNotifications'\`
- \`'getNotifications'\`
- \`'updateLicenses'\` - Liest die Lizenzen von iobroker.net
- \`'upgradeOsPackages'\`
- \`'restartController'\`

Dabei handelt es sich um recht spezielle Kommandos, die nur selten benötigt werden.

Beispiel:

\`\`\`js
sendToHost('myComputer', 'cmdExec', { data: 'ls /' }, (res) => {
    log('List of files: ' + res.data);
});
\`\`\`

**Hinweis:** Um diese Funktion aufzurufen, muss die Option *Kommando "sendToHost" erlauben* aktiviert sein.

### sendToHostAsync
\`\`\`js
await sendToHostAsync(hostName, command, message);
\`\`\`
Wie sendToHost, jedoch mit \`promise\`.

### setInterval
\`\`\`js
setInterval(callback, ms, arg1, arg2, arg3, arg4);
\`\`\`

Wie \`setInterval\` in JavaScript.

### clearInterval
\`\`\`js
clearInterval(id);
\`\`\`

Wie \`clearInterval\` in JavaScript.

### setTimeout
\`\`\`js
setTimeout(callback, ms, arg1, arg2, arg3, arg4);
\`\`\`
Wie \`setTimeout\` in JavaScript.

### clearTimeout
\`\`\`js
clearTimeout(id);
\`\`\`

Wie \`clearTimeout\` in JavaScript.

### setImmediate
\`\`\`js
setImmediate(callback, arg1, arg2, arg3, arg4);
\`\`\`

Wie \`setImmediate\` in JavaScript und nahezu identisch mit \`setTimeout(callback, 0, arg1, arg2, arg3, arg4)\`, jedoch mit höherer Priorität.

### formatDate
\`\`\`js
formatDate(millisecondsOrDate, format);
\`\`\`

#### Parameter:

- \`millisecondsOrDate\`: Anzahl der Millisekunden aus state.ts oder state.lc (Millisekunden seit 1970.01.01 00:00:00), ein JavaScript-Objekt *new Date()* oder die Anzahl der Millisekunden aus *(new Date().getTime())*
- \`format\`: Kann \`null\` sein, dann wird das Zeitformat des Systems verwendet, andernfalls

* YYYY, JJJJ, ГГГГ - Jahr vierstellig, z. B. 2015
* YY, JJ, ГГ - Jahr zweistellig, z. B. 15
* MM, ММ(kyrillisch) - Monat zweistellig, z. B. 01
* M, М(kyrillisch) - Monat ohne führende Null, z. B. 1
* DD, TT, ДД - Tag zweistellig, z. B. 02
* D, T, Д - Tag ohne führende Null, z. B. 2
* hh, SS, чч - Stunden zweistellig, z. B. 03
* h, S, ч - Stunden ohne führende Null, z. B. 3
* mm, мм(kyrillisch) - Minuten zweistellig, z. B. 04
* m, м(kyrillisch) - Minuten ohne führende Null, z. B. 4
* ss, сс(kyrillisch) - Sekunden zweistellig, z. B. 05
* s, с(kyrillisch) - Sekunden ohne führende Null, z. B. 5
* sss, ссс(kyrillisch) - Millisekunden
* WW, НН(kyrillisch) - Wochentag ausgeschrieben als Text
* W, Н(kyrillisch) - Wochentag abgekürzt als Text
* OO, ОО(kyrillisch) - Monatsname ausgeschrieben
* OOO, ООО(kyrillisch) - Monatsname ausgeschrieben im Genitiv
* O, О(kyrillisch) - Monatsname abgekürzt

#### Beispiel

\`\`\`js
formatDate(new Date(), "YYYY-MM-DD") // => Datum "2015-02-24"
formatDate(new Date(), "hh:mm") // => Stunden und Minuten "17:41"
formatDate(state.ts) // => "24.02.2015"
formatDate(state.ts, "JJJJ.MM.TT SS:mm:ss.sss") // => "2015.02.15 17:41:98.123"
formatDate(new Date(), "WW") // => Wochentag "Tuesday"
formatDate(new Date(), "W") // => Wochentag "Tu"
\`\`\`

### formatTimeDiff
\`\`\`js
formatTimeDiff(milliseconds, format);
\`\`\`

#### Parameter:

- \`milliseconds\`: Differenz in Millisekunden*
- \`format\`: Kann \`null\` sein, dann wird das Format \`hh:mm:ss\` verwendet, andernfalls

* DD, TT, ДД - Tage zweistellig, z. B. "02"
* D, T, Д - Tage ohne führende Null, z. B. "2"
* hh, SS, чч - Stunden zweistellig, z. B. "03"
* h, S, ч - Stunden ohne führende Null, z. B. "3"
* mm, мм(kyrillisch) - Minuten zweistellig, z. B. "04"
* m, м(kyrillisch) - Minuten ohne führende Null, z. B. "4"
* ss, сс(kyrillisch) - Sekunden zweistellig, z. B. "05"
* s, с(kyrillisch) - Sekunden ohne führende Null, z. B. "5"

Mit dem Escape-Zeichen \`\\\` lässt sich die Ersetzung verhindern, z. B. \`DD \\Day\\s, h \\hour\\s, m \\minute, ss \\second\\s\`

#### Beispiel

\`\`\`js
formatTimeDiff(60000, "mm:ss") // => "01:00"

const diff = 172800000 + 10800000 + 540000 + 15000; // 2 Tage, 3 Stunden, 9 Minuten + 15 Sekunden
formatTimeDiff(diff); // "51:09:15"
formatTimeDiff(diff, 'DD hh:mm'); // "02 03:09"
formatTimeDiff(diff, 'D hh:mm'); // "2 03:09"
formatTimeDiff(diff, 'hh:mm:ss'); // "51:09:15"
formatTimeDiff(diff, 'h:m:s'); // "51:9:15"
formatTimeDiff(diff, 'hh:mm'); // "51:09"
formatTimeDiff(diff, 'mm:ss'); // "3069:15"
formatTimeDiff(diff, 'hh'); // "51"
formatTimeDiff(diff, 'mm'); // "3069"
\`\`\`

### getDateObject
\`\`\`js
getDateObject(stringOrNumber);
\`\`\`

Wandelt einen String oder eine Zahl in ein Date-Objekt um.
Wird nur die Uhrzeit angegeben, wird das aktuelle Datum ergänzt und anschließend die Umwandlung versucht.

\`\`\`js
getDateObject('20:00'); // 2024-05-18T18:00:00.000Z
getDateObject('2024-01-01'); // 2024-01-01T00:00:00.000Z
\`\`\`

### formatValue
\`\`\`js
formatValue(value, decimals, format);
\`\`\`

Formatiert einen beliebigen Wert (auch Strings) als Zahl. Ersetzt den Punkt durch ein Komma, wenn dies im System so konfiguriert ist.
Decimals gibt die Anzahl der Nachkommastellen an. Der Standardwert ist 2.
Format ist optional:
 - '.,': 1234.567 => 1.234,56
 - ',.': 1234.567 => 1,234.56
 - ' .': 1234.567 => 1 234.56


### adapterSubscribe
\`\`\`js
adapterSubscribe(id);
\`\`\`

Sendet an einen Adapter die Nachricht "subscribe", um den Adapter zu informieren. Hat der Adapter in common das Flag "subscribable", wird diese Funktion bei "subscribe" automatisch aufgerufen.

### adapterUnsubscribe
\`\`\`js
adapterUnsubscribe(id);
\`\`\`

Sendet an einen Adapter die Nachricht \`unsubscribe\`, um den Adapter zu informieren, dass er die Werte nicht mehr abfragen soll.

### $ - Selektor
\`\`\`js
$(selector).on((obj) => {}); // Registriert ein Abonnement für jeden passenden State
$(selector).toArray(); // Liefert alle zum Selektor-Ausdruck passenden Objekt-IDs (erfordert Version >= 8.2.0)
$(selector).each((id, i) => {}); // Iteriert über alle passenden States
$(selector).setState(value, ack, callback); // Setzt den State-Wert aller passenden Objekt-IDs (Callback ist optional)
$(selector).setStateAsync(value, ack); // Setzt den State-Wert aller passenden Objekt-IDs - gibt ein Promise zurück
$(selector).setStateChanged(value, ack, callback); // Setzt den State-Wert aller passenden Objekt-IDs, falls sich der Wert geändert hat (Callback ist optional)
$(selector).setStateChangedAsync(value, ack, callback); // Setzt den State-Wert aller passenden Objekt-IDs, falls sich der Wert geändert hat - gibt ein Promise zurück
$(selector).setStateDelayed(state, isAck, delay, clearRunning, callback); // Setzt den State-Wert aller passenden Objekt-IDs mit der angegebenen Verzögerung
$(selector).getState(); // Liefert alle States
$(selector).getStateAsync(); // Liefert alle States - gibt ein Promise zurück
\`\`\`

Format des Selektors:
\`\`\`js
"name[commonAttr=something1](enumName=something2){nativeName=something3}[id=idfilter][state.id=idfilter]"
\`\`\`

name kann sein: state, channel, device oder schedule
\`idfilter\` kann Platzhalter '*' enthalten

Präfixe ***(nicht implementiert - sollte diskutiert werden)*** :

* \\# - nach Name statt nach ID auswählen
* . - nach Rolle filtern
* § - nach Raum filtern

***Beispiel***:

- \`$('state[id=*.STATE]')\` oder \`$('state[state.id=*.STATE]')\` oder \`$('*.STATE')\` - wählt alle States aus, deren ID auf ".STATE" endet.
- \`$('state[id='hm-rpc.0.*]')\` oder \`$('hm-rpc.0.*')\` - liefert alle States der Adapterinstanz hm-rpc.0
- \`$('channel(rooms=Living room)')\` - alle States im Raum "Living room"
- \`$('channel{TYPE=BLIND}[state.id=*.LEVEL]')\` - liefert alle Rollläden von Homematic
- \`$('channel[role=switch](rooms=Living room)[state.id=*.STATE]').setState(false)\` - schaltet alle States mit .STATE von Kanälen mit der Rolle "switch" im Raum "Living room" auf false
- \`$('channel[state.id=*.STATE](functions=Windows)').each(function (id, i) {log(id);});\` - gibt alle States des Enums "windows" im Log aus
- \`$('schedule[id=*65]').each(function (id, i) {log(id);});\` - gibt alle Zeitpläne aus, deren ID auf 65 endet
- \`$('.switch §"Living room")\` - nimmt die States aller Schalter im Raum 'Living room' ***(nicht implementiert - sollte diskutiert werden)***
- \`$('channel .switch §"Living room")\` - nimmt die States aller Schalter im Raum 'Living room' ***(nicht implementiert - sollte diskutiert werden)***

***Erklärung***
Als Beispiel dient folgender Code:
\`\`\`js
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').on(obj => {
   log('New state ' + obj.id + ' = ' + obj.state.val);
});
\`\`\`

Dieser Code sucht in Kanälen.
Er findet alle Kanäle mit \`common.role="switch"\`, die zu \`enum.rooms.Wohnzimmer\` gehören.
Von diesen Kanälen werden alle States genommen, deren ID auf \`".STATE"\` endet, und alle diese States werden abonniert.
Ändert sich einer dieser States, wird der Callback wie bei der Funktion "on" aufgerufen.

Folgende Funktionen sind möglich: setState, getState (nur vom ersten), on, each, toArray

\`\`\`js
// Alle Schalter im "Wohnzimmer" einschalten
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setState(true);
\`\`\`

Die "each"-Schleife lässt sich abbrechen, indem man false zurückgibt, z. B.:
\`\`\`js
// Die ersten zwei IDs aller Schalter im "Wohnzimmer" ausgeben
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').each((id, i) => {
    log(id);
    if (i == 1) {
        return false;
    }
});
\`\`\`
Alternativ kann man ein gewöhnliches Array der IDs abrufen und es beliebig weiterverarbeiten:
\`\`\`js
// States holen und nur diejenigen mit dem Wert \`true\` herausfiltern
const enabled = $('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').toArray().filter((id) => getState(id)?.val === true);
\`\`\`

### readFile
\`\`\`js
readFile(adapter, fileName, (error, bytes) => {});
\`\`\`

Das Ergebnis wird im Callback übergeben.
Liest eine Datei aus der DB aus dem Ordner \`javascript.0\`.

Das Argument *adapter* kann weggelassen werden.

\`\`\`js
// vis-Views lesen
readFile('vis.0', '/main/vis-views.json', (error, data) => {
    log(data.substring(0, 50));
});

// Dasselbe wie
//readFile('/../vis.0/main/vis-views.json', (error, data) => {
//     log(data.substring(0, 50));
//});
\`\`\`

Standardmäßig ist das Arbeitsverzeichnis/der Adapter \`javascript.0\`.

### writeFile
\`\`\`js
writeFile(adapter, fileName, bytes, (error) => {});
\`\`\`

Der optionale Fehlercode wird im Callback übergeben. Das Argument *adapter* kann weggelassen werden.
fileName ist der Name der Datei in der DB. Alle Dateien werden im Ordner "javascript" gespeichert.
Um in andere Ordner zu schreiben, z. B. nach "/vis.0/", verwendet man setFile.

Eine Datei wie \`'/subfolder/file.txt'\` wird unter \`"/javascript/subfolder/file.txt"\` gespeichert und ist über den Webserver unter \`"http://ip:8082/javascript/subfolder/file.txt"\` erreichbar.

\`\`\`js
// Screenshot in der DB speichern
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile(null, '/screenshots/1.png', data, (error) => {
    log('file written');
});

// Dasselbe wie
//writeFile('/screenshots/1.png', data, function (error) {
//    log('file written');
//});
\`\`\`

\`\`\`js
// Datei in '/vis.0' in der DB speichern
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile('vis.0', '/screenshots/1.png', data, (error) => {
    log('file written');
});
\`\`\`

### delFile
\`\`\`js
delFile(adapter, fileName, (error) => {});
\`\`\`

Löscht eine Datei oder ein Verzeichnis. fileName ist der Name der Datei oder des Verzeichnisses in der DB.

Der alternative Name dieser Methode ist \`unlink\`

### renameFile
\`\`\`js
renameFile(adapter, oldName, newName, (error) => {});
\`\`\`

Benennt eine Datei oder ein Verzeichnis um. oldName ist der Name der Datei oder des Verzeichnisses in der DB, der in newName umbenannt wird.

Der alternative Name dieser Methode ist \`rename\`

### onFile
\`\`\`js
onFile(id, fileName, withFile, (id, fileName, size, fileData, mimeType) => {});
// oder
onFile(id, fileName, (id, fileName, size) => {});
\`\`\`

Abonniert Dateiänderungen:
- \`id\` ist die ID eines Objekts vom Typ \`meta\`, z. B. \`vis.0\`
- \`fileName\` ist ein Dateiname oder ein Muster, z. B. \`main/*\` oder \`main/vis-view.json\`
- \`withFile\` gibt an, ob der Dateiinhalt im Callback übergeben werden soll oder nicht. Die Übergabe des Dateiinhalts kostet Speicher und Zeit; möchte man nur über Änderungen informiert werden, setzt man \`withFile\` auf false.

Argumente im Callback:
- \`id\` - ID des \`meta\`-Objekts;
- \`fileName\` - Dateiname (kein Muster);
- \`size\` - neue Dateigröße;
- \`fileData\` - Dateiinhalt vom Typ \`Buffer\`, wenn die Datei binär ist (anhand der Dateiendung erkannt), sonst \`string\`. Wird nur bei \`withFile\` übergeben;
- \`mimeType\` - MIME-Typ der Datei, z. B. \`image/jpeg\`. Wird nur bei \`withFile\` übergeben;

**Wichtig**: Diese Funktionalität ist nur mit js-controller@4.1.x oder neuer verfügbar.

### offFile
\`\`\`js
offFile(id, fileName);
// oder
onFile(id, fileName);
\`\`\`
Beendet das Abonnement von Dateiänderungen:
- \`id\` ist die ID eines Objekts vom Typ \`meta\`, z. B. \`vis.0\`
- \`fileName\` ist ein Dateiname oder ein Muster, z. B. \`main/*\` oder \`main/vis-view.json\`

**Wichtig**: Diese Funktionalität ist nur mit js-controller@4.1.x oder neuer verfügbar.

### onStop
\`\`\`js
onStop (() => { /* etwas tun, wenn das Skript gestoppt wird */ }, timeout);
\`\`\`
Registriert einen Callback, der aufgerufen wird, wenn das Skript gestoppt wird. Wird z. B. verwendet, um die Kommunikation zu beenden oder Verbindungen zu schließen.

\`\`\`js
// Verbindung aufbauen
const conn = require('net');
// ...

// Verbindung schließen, wenn das Skript gestoppt wird
onStop((callback) => {
    if (conn) {
        // Verbindung schließen
        conn.destroy();
    }
    callback();
}, 2000 /*ms*/);
\`\`\`
\`timeout\` beträgt standardmäßig 1000 ms.

### getHistory
\`\`\`js
getHistory(instance, options, (error, result, options, instance) => {});
\`\`\`

Liest die Historie aus der angegebenen Instanz. Ist keine Instanz angegeben, wird die im System eingestellte Standard-Historieninstanz verwendet.
\`\`\`js
// Historie von 'system.adapter.admin.0.memRss' aus dem SQL-Treiber lesen
const end = new Date().getTime();
getHistory(
    'sql.0',
    {
        id:         'system.adapter.admin.0.memRss',
        start:      end - 3600000,
        end:        end,
        aggregate:  'm4',
        timeout:    2000
    },
    (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    }
);
\`\`\`

Die möglichen Optionen sind [hier](https://github.com/ioBroker/ioBroker.history#access-values-from-javascript-adapter) beschrieben.

Zusätzlich zu diesen Parametern muss "id" angegeben werden, optional kann auch timeout angegeben werden (Standard: 20000 ms).

Ein weiteres Beispiel:
\`\`\`js
// Die letzten 50 Einträge aus der Standard-Historieninstanz ohne Aggregation abrufen:
getHistory({
        id:         'system.adapter.admin.0.alive',
        aggregate:  'none',
        count:      50
    }, (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    });
\`\`\`

**Hinweis: ** Selbstverständlich muss die Historie für die gewählte ID zuerst im Admin aktiviert werden.
### runScript
\`\`\`js
runScript('scriptName', () => {
    // Callback ist optional
    log('Srcipt started, but not yet executed');
});
\`\`\`

Startet andere Skripte (und auch sich selbst) anhand des Namens bzw. startet sie neu.

\`\`\`js
// Skript neu starten
runScript('groupName.scriptName1');
\`\`\`

### runScriptAsync
Wie runScript, aber mit \`promise\`.
\`\`\`js
runScriptAsync('scriptName')
    .then(() => log('Script started, but not yet executed'));

// oder

await runScriptAsync('scriptName');
log(\`Script was restarted\`);
\`\`\`

### startScript
\`\`\`js
startScript('scriptName', ignoreIfStarted, callback);
\`\`\`

Startet das Skript. Wenn ignoreIfStarted auf true gesetzt ist, passiert nichts, falls das Skript bereits läuft, andernfalls wird das Skript neu gestartet.

\`\`\`js
startScript('scriptName', true); // Skript starten, falls es nicht gestartet ist
\`\`\`

### startScriptAsync
Wie startScript, aber mit \`promise\`.

\`\`\`js
startScriptAsync('scriptName', ignoreIfStarted)
    .then(started => log(\`Script was \${started ? 'started' : 'already started'}\`));

// oder

const started = await startScriptAsync('scriptName', ignoreIfStarted);
log(\`Script was \${started ? 'started' : 'already started'}\`);
\`\`\`

Startet das Skript. Wenn ignoreIfStarted auf true gesetzt ist, passiert nichts, falls das Skript bereits läuft, andernfalls wird das Skript neu gestartet.

\`\`\`js
startScript('scriptName', true); // Skript starten, falls es nicht gestartet ist
\`\`\`

### stopScript
\`\`\`js
stopScript('scriptName', callback);
\`\`\`

Wenn stopScript ohne Argumente aufgerufen wird, stoppt sich das Skript selbst:

\`\`\`js
stopScript();
\`\`\`

### stopScriptAsync
Wie stopScript, aber mit \`promise\`:
\`\`\`js
stopScriptAsync('scriptName')
    .then(stopped => log(\`Script was \${stopped ? 'stopped' : 'already stopped'}\`));

// oder
const stopped = await stopScriptAsync('scriptName');
log(\`Script was \${stopped ? 'stopped' : 'already stopped'}\`);
\`\`\`

Wenn stopScript ohne Argumente aufgerufen wird, stoppt sich das Skript selbst:

\`\`\`js
stopScript();
\`\`\`

### isScriptActive
\`\`\`js
isScriptActive('scriptName');
\`\`\`

Gibt zurück, ob ein Skript aktiviert oder deaktiviert ist. Dabei ist zu beachten, dass damit nicht angegeben wird, ob das Skript gerade läuft oder nicht.
Das Skript kann beendet, aber dennoch aktiviert sein.

Es ist keine Funktion. Es ist eine Variable mit der JavaScript-Instanz, die im Gültigkeitsbereich des Skripts sichtbar ist.

### toInt
### toFloat
### toBoolean
### jsonataExpression

### wait
Pausiert einfach die Ausführung des Skripts.
Achtung: Diese Funktion ist ein \`promise\` und muss wie folgt aufgerufen werden:
\`\`\`js
await wait(1000);
\`\`\`

### sleep
Wie [wait](#wait)

### messageTo
\`\`\`js
messageTo({ instance: 'instance', script: 'script.js.common.scriptName', message: 'messageName' }, data, { timeout: 1000 }, result =>
    log(JSON.stringify(result)));
\`\`\`

Sendet die Nachricht über den "Nachrichtenbus" an ein anderes Skript. Oder sogar an einen Handler im selben Skript.

Das Timeout für den Callback beträgt standardmäßig 5 Sekunden.

Das Ziel kann verkürzt werden zu:

\`\`\`js
messageTo('messageName', data, (result) => {
    log(JSON.stringify(result));
});
\`\`\`

Callback und Optionen sind optional, das Timeout beträgt standardmäßig 5000 Millisekunden (falls ein Callback angegeben ist).

\`\`\`js
messageTo('messageName', dataWithNoResponse);
\`\`\`

### messageToAsync
\`\`\`js
onMessage('myTopic', async (data, callback) => {
    log(data);

    if (!data.myPayload) {
        // Fehler zurückgeben (Promise reject)
        callback({ error: 'something went wrong!!' });
    } else {
        // Ergebnis zurückgeben (Promise resolve)
        callback({ result: 'ok' });
    }
});

(async () => {
    try {
        const msg = await messageToAsync({ instance: 0, script: 'script.js.test2', message: 'myTopic' }, { myPayload: true }, { timeout: 1000 });
        log(\`Done with: \${JSON.stringify(msg)}\`);
    } catch (error) {
        // Inhalt von result.error
        console.error(error);
    }
})();
\`\`\`

### onMessage
\`\`\`js
onMessage('messageName', (data, callback) => {
    log(\`Received data: \${data}\`);

    callback({ result: Date.now() });
});
\`\`\`

Abonniert den Nachrichtenbus des \`javascript\`-Adapters und liefert die Antwort über den Callback.
Die Antwort des Skripts, das als erstes antwortet, wird als Antwort akzeptiert, alle anderen Antworten werden ignoriert.

Um eine Nachricht an ein JavaScript-Skript zu senden, die dann von diesem Handler empfangen wird, verwendet man [messageTo](#messageto).

Um eine Nachricht von einem beliebigen anderen Adapter zu senden, verwendet man

\`\`\`js
adapter.sendTo('javascript.0', 'toScript', {
    script: 'script.js.messagetest',
    message: 'messageName',
    data: {
        flag: true
    }
});
\`\`\`

Um eine Nachricht über die CLI zu senden, verwendet man

\`\`\`bash
iob message javascript.0 toScript '{"script": "script.js.messagetest", "message": "messageName", "data": { "flag": true }}'
\`\`\`

### onMessageUnregister
\`\`\`js
const id = onMessage('messageName', (data, callback) => {
    log(data);
    callback({ result: Date.now() });
});

// Abonnement eines bestimmten Handlers beenden
onMessageUnregister(id);
// oder Abonnement über den Namen beenden
onMessageUnregister('messageName');
\`\`\`

Beendet das Abonnement dieser Nachricht.

### onLog
\`\`\`js
onLog('error', data => {
    sendTo('telegram.0', { user: 'UserName', text: data.message });
    log('Following was sent to telegram: ' + data.message);
});
\`\`\`

Abonniert Logs mit dem angegebenen Schweregrad.

*Wichtig:* Im Handler können keine Logs mit demselben Schweregrad ausgegeben werden, um Endlosschleifen zu vermeiden.

Beispielsweise erzeugt dies keine Logs:
\`\`\`js
onLog('error', data => {
    console.error('Error: ' + data.message);
});
\`\`\`

Um alle Logs zu empfangen, kann \`*\` verwendet werden. In diesem Fall wird die Log-Ausgabe im Handler vollständig deaktiviert.

\`\`\`js
onLog('*', data => {
    console.error('Error: ' + data.message); // erzeugt keine Logs
});
\`\`\`

### onLogUnregister
\`\`\`js
function logHandler(data) {
    console.error('Error: ' + data.message);
}
const id = onLog('warn', logHandler);

// Abonnement über die ID beenden
onLogUnregister(id);
// oder Abonnement über die Handler-Funktion beenden
onLogUnregister(logHandler);
// oder Abonnement aller Handler mit einem bestimmten Schweregrad beenden
onLogUnregister('warn');
\`\`\`

Beendet das Abonnement dieser Logs.

### httpGet

*Erfordert Version >= 7.9.0*

\`\`\`js
httpGet('http://jsonplaceholder.typicode.com/posts', (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
\`\`\`

Der zweite Parameter kann ein Objekt mit weiteren Optionen sein (optional). Alle Optionen sind optional. Unterstützte Flags:

- \`timeout\` (number) - Timeout in Millisekunden
- \`responseType\` (string) - Unterstützte Werte sind \`text\` (Standard) oder \`arraybuffer\` für Binärdaten in der Antwort
- \`basicAuth\` (object) - Zugangsdaten für die HTTP-Basic-Authentifizierung, z. B. \`{ user: 'admin', password: 'iobroker' }\`
- \`bearerAuth\` (string) - Token für die Bearer-Authentifizierung
- \`headers\` (object) - Zusätzliche benutzerdefinierte HTTP-Header, z. B. \`{ 'Accept-Language': 'en-GB,en;q=0.9' }\`
- \`validateCertificate\` (boolean) - Erlaubt selbstsignierte Zertifikate, wenn \`false\`

\`\`\`js
httpGet('http://jsonplaceholder.typicode.com/posts', { timeout: 1000 }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
\`\`\`

Datei in das ioBroker-Dateisystem herunterladen:

\`\`\`js
httpGet('http://1.2.3.4/image.jpg', { responseType: 'arraybuffer' }, async (err, response) => {
    if (!err) {
        writeFile('0_userdata.0', 'test.jpg', response.data, (err) => {
            if (err) {
                console.error(err);
            }
        });
    } else {
        console.error(err);
    }
});
\`\`\`

Zertifikatsprüfung deaktivieren - *Erfordert Version >= 8.4.0*

\`\`\`js
httpGet('http://jsonplaceholder.typicode.com/posts', { validateCertificate: false }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
\`\`\`

### httpPost

*Erfordert Version >= 7.9.0*

\`\`\`js
httpPost('http://jsonplaceholder.typicode.com/posts', { title: 'foo', body: 'bar', userId: 1 }, (error, response) => {
    if (!error) {
        console.log(response.statusCode);
        console.log(response.data);
        console.log(response.headers);
    } else {
        console.error(error);
    }
});
\`\`\`

Mit benutzerdefinierten Headern und Authentifizierung

\`\`\`js
httpPost(
    'http://jsonplaceholder.typicode.com/posts',
    {
        title: 'foo',
        body: 'bar',
        userId: 1
    },
    {
        timeout: 2000,
        basicAuth: {
            user: 'admin',
            password: 'dg2LdALNznHFNo'
        },
        headers: {
            'Cookie': 'PHPSESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1'
        }
    },
    (error, response) => {
        if (!error) {
            console.log(response.statusCode);
            console.log(response.data);
            console.log(response.headers);
        } else {
            console.error(error);
        }
    }
);
\`\`\`

### createTempFile

*Erfordert Version >= 8.3.0*

\`\`\`js
httpGet('https://raw.githubusercontent.com/ioBroker/ioBroker.javascript/master/admin/javascript.svg', { responseType: 'arraybuffer' }, async (err, response) => {
    if (err) {
        console.error(err);
    } else {
        const tempFilePath = createTempFile('javascript.svg', response.data);
        console.log(\`Saved to \${tempFilePath}\`);

        // Den neuen Pfad in anderen Skripten verwenden (z. B. sendTo)
    }
});
\`\`\`

\`\`\`js
onFile('0_userdata.0', '*.jpg', true, async (id, fileName, size, data, mimeType) => {
    const tempFilePath = createTempFile(fileName, response.data);

    // Den neuen Pfad in anderen Skripten verwenden (z. B. sendTo)
});
\`\`\`

\`\`\`js
readFile('0_userdata.0', 'test.jpg', (err, data, mimeType) => {
    if (err) {
        console.error(err);
    } else {
        const tempFilePath = createTempFile('test.jpg', data);

        // Den neuen Pfad in anderen Skripten verwenden (z. B. sendTo)
        sendTo('telegram.0', 'send', {
            text: tempFilePath,
            caption: 'Just a test image',
            user: 'yourUsername',
        });
    }
});
\`\`\`

### registerNotification

*Erfordert Version >= 8.8.0*

\`\`\`js
registerNotification('This is just an information'); // Benachrichtigung
registerNotification('This is an important message!', true); // Alarm
\`\`\`

## Globale Skriptvariablen
### scriptName
\`scriptName\` - Der Name des Skripts.

\`\`\`js
log(\`Script \${scriptName} started!\`);
\`\`\`

### instance
\`instance\` - Die JavaScript-Instanz, in der ein Skript ausgeführt wird (z. B. \`0\`).

\`\`\`js
log(\`Script \${scriptName} started started by \${instance}\`);
\`\`\`

### defaultDataDir
\`defaultDataDir\` - Absoluter Pfad zu iobroker-data.

\`\`\`js
log(\`Data dir: \${defaultDataDir}\`);
\`\`\`

### verbose
\`verbose\` - Ist der ausführliche Modus (Verbose) aktiviert?

\`\`\`js
log(\`Verbose mode: \${verbose ? 'enabled' : 'disabled'}\`);

// Beispiel
if (verbose) {
    log('...');
}
\`\`\`

### SECRETS
\`SECRETS\` - Die Zugangsdaten aus dem zentralen Zugangsdaten-Speicher von ioBroker.

Die Zugangsdaten werden in der Admin-Oberfläche unter **Allgemeine Einstellungen** -> **Zugangsdaten** verwaltet. Jeder Zugangsdaten-Eintrag
hat eine ID (wie \`CameraPassword\`) und enthält entweder einen einzelnen Schlüssel **key** (z. B. einen API-Schlüssel oder ein Passwort) oder ein
Paar aus **login**/**password**. Die geheimen Felder werden mit dem System-Secret verschlüsselt gespeichert und
den Skripten bereits entschlüsselt übergeben:

\`\`\`js
// Zugangsdaten-Eintrag vom Typ "key"
httpGet(\`http://camera.local/snapshot?password=\${SECRETS.CameraPassword.key}\`, (err, result) => {
    // ...
});

// Zugangsdaten-Eintrag vom Typ "login"
log(\`Mail account: \${SECRETS.MyMailAccount.login} / \${SECRETS.MyMailAccount.password}\`);

// IDs von Zugangsdaten, die keine gültigen Variablennamen sind
log(SECRETS['My camera'].key);
\`\`\`

\`SECRETS\` ist schreibgeschützt und immer aktuell: Wenn ein Zugangsdaten-Eintrag in der Admin-Oberfläche hinzugefügt, geändert oder gelöscht wird,
wird der neue Wert sofort verwendet - weder der Adapter noch das Skript müssen neu gestartet werden.

Wenn ein Zugangsdaten-Eintrag nicht existiert, wird \`undefined\` zurückgegeben:

\`\`\`js
if (SECRETS.CameraPassword) {
    log('The camera password is defined');
}
\`\`\`

#### Welche Felder hat ein Zugangsdaten-Eintrag?

Jeder Zugangsdaten-Eintrag hat entweder einen einzelnen \`key\` oder ein Paar \`login\`/\`password\`. Es gibt drei Möglichkeiten, das herauszufinden:

- In den Instanzeinstellungen des JavaScript-Adapters listet der Abschnitt **Verfügbare Zugangsdaten** jeden
  Zugangsdaten-Eintrag mit seinen Feldern und dem kopierfertigen Ausdruck auf.
- Im Editor bietet die Autovervollständigung nach \`SECRETS.\` die vorhandenen Zugangsdaten an und nach dem
  nächsten Punkt genau die Felder, die dieser Zugangsdaten-Eintrag hat.
- In einem Skript:

\`\`\`js
log(JSON.stringify(Object.keys(SECRETS.CameraPassword))); // ["key"]
log(JSON.stringify(Object.keys(SECRETS.MyMailAccount))); // ["login","password"]
\`\`\`

Blockly hat für denselben Zweck einen **Zugangsdaten**-Baustein - siehe die
[Blockly-Dokumentation](../en/blockly.md#credential) (englisch).

Der Zugriff kann mit der Instanzoption **Skripten den Zugriff auf die Zugangsdaten erlauben** abgeschaltet werden.
\`SECRETS\` ist dann leer, und es wird eine Warnung ins Log geschrieben.

**Hinweis:** Dies erfordert js-controller 7.2 oder neuer.

## Option - "Nicht alle Zustände beim Start abonnieren"
Es gibt zwei Modi, States zu abonnieren:

1. Der Adapter abonniert beim Start alle States und empfängt alle Änderungen aller States (getState(id) ist einfach zu verwenden, benötigt aber mehr CPU und RAM):

\`\`\`js
log(getState('someID').val);
\`\`\`

2. Der Adapter abonniert die angegebene ID jedes Mal, wenn \`on/subscribe\` aufgerufen wird. In diesem Modus empfängt der Adapter nur Aktualisierungen für die gewünschten States. Diese Option benötigt weniger RAM und ist effizienter, allerdings kann man nicht synchron über getState auf States zugreifen. **Man muss Callbacks oder Promises verwenden, um auf die States zuzugreifen**:

\`\`\`js
getState('someID', (error, state) => {
    log(state.val);
});
\`\`\`

Grund: Der Adapter hat den Wert des States nicht im RAM und muss ihn aus der zentralen State-Datenbank anfordern.

## Skriptaktivität

Skripte können über States aktiviert und deaktiviert werden. Für jedes Skript wird ein State mit dem Namen \`javascript.INSTANCE.scriptEnabled.SCRIPT_NAME\` angelegt.
Skripte können aktiviert und deaktiviert werden, indem dieser State mit \`ack=false\` gesteuert wird.
`;c();var Y={en:te,de:ne},re=`https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/`,ie=`Editor.docScroll`,X=`Editor.docContents`,ae=1500,oe=`ui-monospace, "Cascadia Code", Consolas, monospace`,Z={};function se(e){let t=Y[e]?e:`en`;if(!Z[t]){let e=R(L(Y[t]));Z[t]={lang:t,blocks:e,entries:B(e)}}return Z[t]}function Q(e){try{return window.localStorage.getItem(e)}catch{return null}}function $(e,t){try{window.localStorage.setItem(e,t)}catch{}}function ce({onClose:a,word:c}){let{lang:u,blocks:m,entries:w}=se(_.getLanguage()),T=`${ie}.${u}`,E=l(null),D=l(null),O=l(0),k=l(null),[A,j]=h(()=>Q(X)!==`false`),[M,N]=h(``),[P,F]=h(``),I=t(()=>H(w,M),[w,M]),L=()=>{let e=E.current;if(!e)return;let t=e.scrollTop+24,n=``;for(let r of Array.from(e.querySelectorAll(`[data-level]`)))if(!(Number(r.dataset.level)>3)){if(r.offsetTop>t)break;n=r.id.substring(W.length)}e.scrollTop+e.clientHeight>=e.scrollHeight-4&&k.current&&Date.now()-k.current.at<ae&&(n=k.current.anchor),F(n)},R=(e,t=!0)=>{var n;let r=(n=E.current)==null?void 0:n.querySelector(`#${CSS.escape(W+e)}`);r&&(k.current={anchor:e,at:Date.now()},F(e),r.scrollIntoView({block:`start`,behavior:t?`smooth`:`auto`}))};e(()=>{let e=V(w,c),t=Number(Q(T)),n=0,r=requestAnimationFrame(()=>{n=requestAnimationFrame(()=>{e?R(e,!1):E.current&&Number.isFinite(t)&&t>0&&(E.current.scrollTop=t),L()})});return()=>{cancelAnimationFrame(r),cancelAnimationFrame(n),cancelAnimationFrame(O.current)}},[]),e(()=>{if(P){var e;(e=D.current)==null||(e=e.querySelector(`[data-anchor="${CSS.escape(P)}"]`))==null||e.scrollIntoView({block:`nearest`})}},[P,A]);let z=()=>{O.current||=requestAnimationFrame(()=>{var e;O.current=0,$(T,String(((e=E.current)==null?void 0:e.scrollTop)||0)),L()})},B=t(()=>y(J,{blocks:m,base:`${re}${u}/`,onAnchor:e=>R(e)}),[m,u]);return x(p,{open:!0,fullWidth:!0,maxWidth:`lg`,onClose:a,slotProps:{paper:{sx:{height:`calc(100% - 64px)`}}},children:[x(g,{sx:{display:`flex`,alignItems:`center`,gap:1,pb:1},children:[y(f,{title:_.t(`Contents`),slotProps:{popper:{sx:{pointerEvents:`none`}}},children:y(C,{size:`small`,color:A?`primary`:`default`,onClick:()=>{$(X,String(!A)),j(!A)},children:y(ee,{})})}),_.t(`Documentation`)]}),x(b,{dividers:!0,sx:{display:`flex`,p:0,minHeight:0},children:[A?x(s,{sx:{flex:`0 0 280px`,minWidth:0,display:`flex`,flexDirection:`column`,minHeight:0,borderRight:1,borderColor:`divider`},children:[y(s,{sx:{p:1},children:y(i,{autoFocus:!0,fullWidth:!0,size:`small`,variant:`outlined`,placeholder:_.t(`Filter`),value:M,onChange:e=>N(e.target.value),onKeyDown:e=>{e.key===`Enter`&&I.length?R(I[0].anchor):e.key===`Escape`&&M&&(e.stopPropagation(),N(``))},slotProps:{input:{endAdornment:M?y(S,{position:`end`,children:y(C,{size:`small`,onClick:()=>N(``),children:y(n,{fontSize:`small`})})}):null}}})}),x(s,{ref:D,sx:{flex:1,overflowY:`auto`,pb:1},children:[I.map(e=>x(s,{"data-anchor":e.anchor,title:e.text,onClick:()=>R(e.anchor),sx:{display:`flex`,alignItems:`baseline`,gap:1,pl:e.level<3?1.5:3,pr:1,py:.4,mt:+(e.level<3&&!M),cursor:`pointer`,fontSize:e.level<3?14:13,fontWeight:e.level<3?500:400,color:e.anchor===P?`primary.main`:`text.primary`,bgcolor:e.anchor===P?`action.selected`:void 0,"&:hover":{bgcolor:`action.hover`}},children:[y(s,{component:`span`,sx:{flexShrink:+!e.code,fontFamily:e.code?oe:void 0,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:e.code?`nowrap`:void 0,maxWidth:`100%`},children:e.name}),e.description?y(s,{component:`span`,sx:{minWidth:0,fontSize:12,color:`text.secondary`,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.description}):null]},e.anchor)),I.length?null:y(r,{sx:{px:1.5,py:1,fontSize:13,color:`text.secondary`},children:_.t(`Nothing found`)})]})]}):null,y(s,{ref:E,onScroll:z,sx:{flex:1,minWidth:0,overflowY:`auto`,position:`relative`,px:3,py:2},children:B})]}),y(v,{children:y(o,{variant:`contained`,color:`grey`,startIcon:y(d,{}),onClick:a,children:_.t(`Close`)})})]})}export{ce as default};