import{o as e}from"./rolldown-runtime-C0FnF6B9.js";import{m as t,ut as n}from"./_virtual_mf___mfe_internal__iobroker_javascript__mf_owner__234968779812303__loadShare___mf_0_iobroker_mf_1_gui_mf_2_components__loadShare__.js-DTP9o5Cn.js";import{t as r}from"./vite-preload-helper-DjNwdemH.js";var i=e(n(),1),a=r(()=>import(`./docs-compact-D7rpMc7r.js`),[],import.meta.url),o={openai:`img/openai.svg`,anthropic:`img/anthropic.svg`,gemini:`img/gemini.svg`,deepseek:`img/deepseek.svg`,custom:`img/custom.svg`},s={width:16,height:16,flexShrink:0,opacity:.7},c={ru:`Russian`,en:`English`,de:`German`,es:`Spanish`,fr:`French`,it:`Italian`,pl:`Polish`,nl:`Dutch`,pt:`Portuguese`,uk:`Ukrainian`,"zh-cn":`Chinese`},l=null,u=null,d=null,f=null;function p(){l=null,u=null,d=null,f=null}async function m(e,t){if(l)return l;let n=Object.keys(t)[0];if(!n)return null;let r=await e.sendTo(n,`getAvailableAiProviders`,{}),i=((r==null?void 0:r.providers)||[]).map(e=>e.provider),a=((r==null?void 0:r.providers)||[]).find(e=>e.provider===`custom`);return i.length?(l={providers:i,gptBaseUrl:a==null?void 0:a.baseUrl},l):null}var h=`embedding.text-embedding.textembedding.embeddinggemma.embed-.-embed.bge-.mxbai-embed.nomic-embed.arctic-embed.snowflake-arctic-embed.all-minilm.multilingual-e5.jina-embed.voyage-.gecko.paraphrase-multilingual.dall-e.gpt-image.image-edit.-image-preview.-image-latest.flash-image.nano-banana.stable-diffusion.sdxl.midjourney.flux-.imagen.sora.veo-.cogvideo.runway-.lumiere.lyria.whisper.tts-.-tts.speech-.audio-preview.mini-tts.mini-transcribe.-transcribe.native-audio.flash-live.gpt-audio.realtime.bark-.xtts.voicebox.moderation.omni-moderation.llama-guard.shieldgemma.prompt-guard.-guardian.safeguard.rerank.reranker.babbage-.davinci-.curie-.text-ada-.text-davinci.text-curie.text-babbage.instructgpt.code-davinci.code-cushman.-turbo-instruct.-search-preview.-search-api.code-search.text-search.similarity-.computer-use-preview.deep-research.robotics.aqa.reader-lm.-nsql.minicheck`.split(`.`);function g(e){let t=e.toLowerCase();return!(h.some(e=>t.includes(e))||t.startsWith(`claude-1`)||t.startsWith(`claude-instant`))}var _=`openai-model`,v=`openai-model-provider`;function y(e,t){window.localStorage.setItem(_,e),t?window.localStorage.setItem(v,t):window.localStorage.removeItem(v)}function b(){return{model:window.localStorage.getItem(_)||``,provider:window.localStorage.getItem(v)||``}}async function x(e,n){let r=await m(e,n);if(!r)return{models:[],providerMap:{},errors:[`No API keys configured`]};let i=Object.keys(n)[0];if(!i)return{models:[],providerMap:{},errors:[t.t(`No running javascript instance found`)]};let a=[],o={},s=[],c={},l=[],u=(t,n)=>{l.push(e.sendTo(i,`testApiConnection`,{provider:t}).then(e=>{e.models?c[t]=e.models:e.error&&s.push(`${n||t}: ${e.error}`)}).catch(e=>{s.push(`${n||t}: ${String(e)}`)}))},d={openai:`OpenAI`,anthropic:`Anthropic`,gemini:`Gemini`,deepseek:`DeepSeek`,custom:`Custom`};for(let e of r.providers)u(e,d[e]);await Promise.all(l);for(let e of r.providers)for(let t of c[e]||[])g(t)&&!o[t]&&(a.push(t),o[t]=e);return a.sort(),{models:a,providerMap:o,errors:s}}var S=`aiChatAnswer`,C=6e5,w=null,T=null,E=0;function D(){w=null,T=null}async function O(e,t){return w||(T||=(async()=>{let n={sessionToken:`ai-${Date.now().toString(36)}-${Math.random().toString(36).substring(2,10)}`,pending:new Map};try{let r=await e.subscribeOnInstance(t,S,{sessionToken:n.sessionToken},e=>{let t=e;if(!(t!=null&&t.requestId))return;let r=n.pending.get(t.requestId);r&&(n.pending.delete(t.requestId),r(t))});return r!=null&&r.accepted?(e.registerConnectionHandler(function t(n){n||(e.unregisterConnectionHandler(t),D())}),w=n,n):null}catch(e){return console.warn(`[AiChat] cannot subscribe for pushed answers, falling back to the callback`,e),null}finally{T=null}})(),T)}async function k(e,n,r){var i;let a=r.timeout||C,o=await O(e,n),s=o?`req-${++E}-${Date.now().toString(36)}`:``,c=await e.sendTo(n,`chatCompletion`,{timeout:a,model:r.model,provider:r.provider,messages:r.messages,...r.baseUrl?{baseUrl:r.baseUrl}:{},...(i=r.tools)!=null&&i.length?{tools:r.tools}:{},...o?{uiSession:o.sessionToken,requestId:s}:{}});return!o||!(c!=null&&c.accepted)?c:new Promise(e=>{let n=setTimeout(()=>{o.pending.delete(s),D(),e({error:`${t.t(`No answer within`)} ${Math.round(a/1e3)}s`})},a);o.pending.set(s,t=>{clearTimeout(n),e(t)})})}async function A(e){if(f)return f;let t=await e.getObjectViewSystem(`state`,``,`香`),n=await e.getObjectViewSystem(`channel`,``,`香`),r=await e.getObjectViewSystem(`device`,``,`香`),i=await e.getObjectViewSystem(`folder`,``,`香`),a=await e.getObjectViewSystem(`enum`,``,`香`);return f=Object.assign(t,n,r,i,a),f}async function j(e){return A(e)}function M(e,t){return e&&typeof e==`object`?e[t]||e.en:e||``}async function N(e){if(u)return u;let n=t.getLanguage(),r=await A(e),a=Object.keys(r).sort(),o=new i.default,s=[],c=[`UNREACH_STICKY`],l=[i.Types.info],d=[],f=[],p=[],m=[];a.forEach(e=>{var t,n;((t=r[e])==null?void 0:t.type)===`enum`?d.push(e):(n=r[e])!=null&&(n=n.common)!=null&&n.smartName&&m.push(e)}),d.forEach(e=>{e.startsWith(`enum.rooms.`)?f.push(e):e.startsWith(`enum.functions.`)&&p.push(e);let t=r[e].common.members;t!=null&&t.length&&t.forEach(e=>{r[e]&&!m.includes(e)&&m.push(e)})});let h={id:``,objects:r,_keysOptional:a,_usedIdsOptional:s,ignoreIndicators:c,excludedTypes:l},g=[];m.forEach(e=>{h.id=e;let t=o.detect(h);t&&t.forEach(e=>{var t;let i=(t=e.states.find(e=>e.id))==null?void 0:t.id;if(!i||g.find(e=>e.id===i))return;let a=r[i],o={id:i,name:M(a.common.name,n),type:a.type,deviceType:e.type,states:e.states.filter(e=>e.id).map(e=>({id:e.id,name:e.name,role:e.defaultRole,type:r[e.id].common.type,unit:r[e.id].common.unit,read:r[e.id].common.read??!0,write:r[e.id].common.write??!0}))},s=i.split(`.`),c,l;(a.type===`channel`||a.type===`state`)&&(s.pop(),c=s.join(`.`),r[c]&&(r[c].type===`channel`||r[c].type===`folder`)?(s.pop(),l=s.join(`.`),(!r[l]||r[l].type!==`device`&&r[c].type!==`folder`)&&(l=void 0)):c=void 0);let u=f.find(e=>{var t,n,a;return(t=r[e].common.members)!=null&&t.includes(i)||c&&(n=r[e].common.members)!=null&&n.includes(c)?!0:l&&((a=r[e].common.members)==null?void 0:a.includes(l))});u&&(o.room=M(r[u].common.name,n));let d=p.find(e=>{var t,n,a;return(t=r[e].common.members)!=null&&t.includes(i)||c&&(n=r[e].common.members)!=null&&n.includes(c)?!0:l&&((a=r[e].common.members)==null?void 0:a.includes(l))});d&&(o.function=M(r[d].common.name,n)),g.push(o)})});for(let e=0;e<g.length;e++){let t=g[e];if(t.type===`state`||t.type===`channel`){let e=t.id.split(`.`);e.pop();let i=r[e.join(`.`)];if(i&&(i.type===`channel`||i.type===`device`||i.type===`folder`)){var _,v;t.name=M(((_=i.common)==null?void 0:_.name)||t.name,n),e.pop();let a=r[e.join(`.`)];if((a==null?void 0:a.type)===`device`&&(v=a.common)!=null&&v.icon){var y;t.name=M(((y=a.common)==null?void 0:y.name)||t.name,n)}}else{var b;t.name=M((i==null||(b=i.common)==null?void 0:b.name)||t.name,n)}}}return u=g,g}async function P(){return d||(d=(await a).default,d)}function F(){return c[t.getLanguage()]||`English`}function I(e){return`You write ioBroker JavaScript adapter scripts.
Copy EXACTLY this syntax. Do NOT change the callback signature.
IMPORTANT: Write all code at top level. NEVER use console.log (use log instead). NEVER define functions with the function keyword.

// CORRECT: on() always has ONE callback argument called obj
on('zigbee.0.sensor.state', (obj) => {
    // obj.state.val = the new value (boolean or number)
    // obj.id = the state ID that changed
    setState('zigbee.0.lamp.state', obj.state.val);
    log('Changed to ' + obj.state.val);
});

// CORRECT: on() with filter
on({id: /zigbee\\.0\\..*\\.state$/, change: 'ne'}, (obj) => {
    if (obj.state.val === true) {
        setState('zigbee.0.other.state', true);
    }
});

// Other correct examples:
setState('id', true);
setState('id', 50);
const val = getState('id').val;
schedule('0 7 * * *', () => { log('runs daily at 07:00'); });
schedule('0 22 * * *', () => { setState('id', false); });

// CORRECT Telegram: always use sendTo, NEVER setState on telegram
sendTo('telegram.0', 'send', {text: 'Alert: ' + someValue});

// CORRECT httpGet: res.data is a STRING, parse JSON with JSON.parse
httpGet('https://api.example.com/data', (err, res) => {
    const data = JSON.parse(res.data);
    log('Temperature: ' + data.main.temp);
});

$('state[state.id=*.state](rooms=Room)').each((id) => { setState(id, false); });
createState('name', 0, {type: 'number', name: 'Name'});
// CORRECT: one-time delayed action (turn off after 5 minutes = 300000ms)
setStateDelayed('zigbee.0.lamp.state', false, false, 5 * 60 * 1000);
log(formatDate(new Date(), 'DD.MM.YYYY hh:mm'));

WRONG: on('id', (id, state) => {})   CORRECT: on('id', (obj) => {})
WRONG: set('id', true)               CORRECT: setState('id', true)
WRONG: adapter.setState('id', true)  CORRECT: setState('id', true)
WRONG: obj.val or newState.val       CORRECT: obj.state.val
WRONG: on('change', {id: 'x'}, cb)  CORRECT: on({id: 'x', change: 'ne'}, cb)
WRONG: setState('telegram.0', text)  CORRECT: sendTo('telegram.0', 'send', {text: text})
WRONG: res.body.main.temp            CORRECT: JSON.parse(res.data).main.temp
WRONG: function myFunc() {}          CORRECT: write code directly, no function definitions
WRONG: setTimeout(fn, ms)            CORRECT: setStateDelayed(id, val, false, ms) for one-time delay
WRONG: schedule('*/5 * * * *', fn)   for one-time delay. schedule() is ONLY for recurring tasks
Values are boolean (true/false) or numbers, NEVER strings like 'ON'/'OFF'.
NEVER use: function keyword, require, import, setInterval, setTimeout, console.log, debug().

All available functions (use syntax from examples above):
on(pattern, (obj)=>{}) | once(pattern, (obj)=>{}) | unsubscribe(handler)
setState(id, val) | getState(id).val | setStateChanged(id, val) | setStateDelayed(id, val, ack, ms) | clearStateDelayed(id)
existsState(id) | existsObject(id) | getObject(id) | setObject(id, obj) | extendObject(id, obj) | deleteObject(id)
createState(name, initVal, {type,name,role}) | deleteState(name) | createAlias(name, alias)
schedule(cron, ()=>{}) | clearSchedule(obj) | scheduleById(id, (obj)=>{}) | getSchedules()
sendTo(adapter, cmd, msg) | sendToHost(host, cmd, msg)
$('selector').each((id)=>{}) | $('selector').setState(val) | $('selector').getState()
log(text) | formatDate(date, 'DD.MM.YYYY hh:mm') | formatTimeDiff(ms) | formatValue(val, decimals)
getDateObject(str) | getAstroDate(pattern) | isAstroDay() | compareTime(start, end, op)
exec(cmd, (err,stdout,stderr)=>{}) | httpGet(url, (err,res)=>{}) | httpPost(url, data, (err,res)=>{})
readFile(adapter, name, (err,data)=>{}) | writeFile(adapter, name, data, cb) | delFile(adapter, name, cb)
onFile(id, name, withFile, cb) | offFile(id, name) | onStop(cb, timeout)
getHistory(inst, {id,start,end,aggregate,count}, cb) | getEnums(name) | getIdByName(name)
wait(ms) | toInt(val) | toFloat(val) | toBoolean(val)
messageTo(target, data) | onMessage(name, cb) | onLog(severity, cb)
runScript(name) | startScript(name) | stopScript(name) | isScriptActive(name)

Write comments in ${e}. Put code in a \`\`\`javascript code block.`}function L(e){return`You generate ioBroker Blockly XML blocks. Return Blockly XML in a \`\`\`xml code block.
Use EXACT state IDs from the plan. Write text/comments in ${e}.

IMPORTANT RULES:
- Return ONLY the inner blocks (no <xml> wrapper needed)
- Use the exact block types shown below
- State IDs must be full paths like "zigbee2mqtt.0.0x1234.state"
- Values are boolean (true/false) or numbers, NEVER strings like "ON"/"OFF"
- For Telegram use sendto_custom block, NEVER setState on telegram

## Block Templates

### Trigger: on_ext (react to state changes)
<block type="on_ext" x="0" y="0">
  <mutation xmlns="http://www.w3.org/1999/xhtml" items="1"></mutation>
  <field name="CONDITION">ne</field>
  <field name="ACK_CONDITION"></field>
  <value name="OID0">
    <shadow type="field_oid"><field name="oid">STATE_ID_HERE</field></shadow>
  </value>
  <statement name="STATEMENT">
    <!-- actions here -->
  </statement>
</block>

### Schedule: schedule (cron-based)
<block type="schedule" x="0" y="0">
  <field name="SCHEDULE">0 7 * * *</field>
  <statement name="STATEMENT">
    <!-- actions here -->
  </statement>
</block>

### Set State: control
<block type="control">
  <mutation xmlns="http://www.w3.org/1999/xhtml" delay_input="false"></mutation>
  <field name="OID">STATE_ID_HERE</field>
  <field name="WITH_DELAY">FALSE</field>
  <value name="VALUE">
    <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
  </value>
</block>

### Get State Value: get_value
<block type="get_value">
  <field name="ATTR">val</field>
  <field name="OID">STATE_ID_HERE</field>
</block>

### Log: debug
<block type="debug">
  <field name="Severity">log</field>
  <value name="TEXT">
    <shadow type="text"><field name="TEXT">Message here</field></shadow>
  </value>
</block>

### SendTo (Telegram): sendto_custom
<block type="sendto_custom">
  <mutation xmlns="http://www.w3.org/1999/xhtml" items="1"></mutation>
  <field name="INSTANCE">telegram.0</field>
  <field name="COMMAND">send</field>
  <field name="LOG"></field>
  <value name="ARG0">
    <block type="text"><field name="TEXT">Message text</field></block>
  </value>
  <value name="ATTR0">
    <block type="text"><field name="TEXT">text</field></block>
  </value>
</block>

### Timeout: timeouts_settimeout
<block type="timeouts_settimeout">
  <field name="NAME">timeout1</field>
  <field name="DELAY">5000</field>
  <field name="UNIT">ms</field>
  <statement name="STATEMENT">
    <!-- delayed actions -->
  </statement>
</block>

### If/Else: controls_if
<block type="controls_if">
  <mutation else="1"></mutation>
  <value name="IF0">
    <block type="logic_compare">
      <field name="OP">EQ</field>
      <value name="A"><block type="get_value"><field name="ATTR">val</field><field name="OID">STATE_ID</field></block></value>
      <value name="B"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
    </block>
  </value>
  <statement name="DO0"><!-- then --></statement>
  <statement name="ELSE"><!-- else --></statement>
</block>

### Number value
<block type="math_number"><field name="NUM">0</field></block>

### Text value
<block type="text"><field name="TEXT">hello</field></block>

### Boolean value
<block type="logic_boolean"><field name="BOOL">TRUE</field></block>

### Comparison: logic_compare
<block type="logic_compare">
  <field name="OP">EQ</field>
  <!-- OP can be: EQ, NEQ, LT, LTE, GT, GTE -->
  <value name="A"><!-- left side --></value>
  <value name="B"><!-- right side --></value>
</block>

## Common Patterns

### Turn on light when sensor triggers:
<block type="on_ext" x="0" y="0">
  <mutation xmlns="http://www.w3.org/1999/xhtml" items="1"></mutation>
  <field name="CONDITION">ne</field>
  <field name="ACK_CONDITION"></field>
  <value name="OID0">
    <shadow type="field_oid"><field name="oid">zigbee2mqtt.0.0xSENSOR.occupancy</field></shadow>
  </value>
  <statement name="STATEMENT">
    <block type="controls_if">
      <value name="IF0">
        <block type="logic_compare">
          <field name="OP">EQ</field>
          <value name="A"><block type="get_value"><field name="ATTR">val</field><field name="OID">zigbee2mqtt.0.0xSENSOR.occupancy</field></block></value>
          <value name="B"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
        </block>
      </value>
      <statement name="DO0">
        <block type="control">
          <mutation xmlns="http://www.w3.org/1999/xhtml" delay_input="false"></mutation>
          <field name="OID">zigbee2mqtt.0.0xLAMP.state</field>
          <field name="WITH_DELAY">FALSE</field>
          <value name="VALUE"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
        </block>
      </statement>
    </block>
  </statement>
</block>

Write comments in ${e}. Put blocks in a \`\`\`xml code block.`}function R(e){let t=e;return t=t.replace(/<think>[\s\S]*?<\/think>/gi,``),t=t.replace(/<\|endoftext\|>/g,``),t=t.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g,``),t=t.replace(/<\|im_start\|>[\s\S]*/g,``),t.trim()}function z(e){return e.finishReason===`max_tokens`||e.finishReason===`length`}function B(e){var n,r;let i=(e.content||``).trim(),a=[];if(e.finishReason&&a.push(`${t.t(`Stop reason`)}: ${e.finishReason}`),((n=e.usage)==null?void 0:n.input)!==void 0||((r=e.usage)==null?void 0:r.output)!==void 0){var o,s;a.push(`${t.t(`Tokens in/out`)}: ${((o=e.usage)==null?void 0:o.input)??`?`}/${((s=e.usage)==null?void 0:s.output)??`?`}`)}let c=a.length?` (${a.join(`, `)})`:``;if(i)return`⚠️ ${t.t(`The model answered with reasoning only, no result`)}${c}\n\n${i}`;if(e.finishReason===`max_tokens`||e.finishReason===`length`)return`⚠️ ${t.t(`The model used up its output budget before writing an answer. Try a shorter question or less context.`)}${c}`;if(e.success!==!0){let n;try{n=typeof e==`string`?e:JSON.stringify(e)}catch{n=Object.prototype.toString.call(e)}return`⚠️ ${t.t(`The javascript adapter did not answer this request. Check the adapter log.`)}\n\n\`${t.t(`Reply`)}: ${n.substring(0,300)}\``}return`⚠️ ${t.t(`The model returned an empty answer`)}${c}`}export{R as _,N as a,L as c,F as d,z as f,k as g,y as h,B as i,I as l,b as m,o as n,j as o,x as p,p as r,m as s,s as t,P as u};