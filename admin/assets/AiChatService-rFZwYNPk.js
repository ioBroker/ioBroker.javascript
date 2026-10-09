import{o as e,t}from"./rolldown-runtime-C0FnF6B9.js";import{m as n,or as r,ut as i}from"./_virtual_mf___mfe_internal__iobroker_javascript__mf_owner__234968779812303__loadShare___mf_0_iobroker_mf_1_gui_mf_2_components__loadShare__.js-BRdHvuuG.js";import{t as a}from"./vite-preload-helper-DjNwdemH.js";var o=t((e=>{Object.defineProperty(e,"__esModule",{value:!0}),e.AI_PUSH_MESSAGE_TYPE=e.AI_COMMANDS=void 0,e.AI_COMMANDS={providers:`ai:providers`,models:`ai:models`,chat:`ai:chat`},e.AI_PUSH_MESSAGE_TYPE=`aiChatAnswer`})),s=t((e=>{Object.defineProperty(e,"__esModule",{value:!0}),e.isChatModel=n,e.stripThinkingArtifacts=r,e.isTruncatedAnswer=i;var t=`embedding.text-embedding.textembedding.embeddinggemma.embed-.-embed.bge-.mxbai-embed.nomic-embed.arctic-embed.snowflake-arctic-embed.all-minilm.multilingual-e5.jina-embed.voyage-.gecko.paraphrase-multilingual.dall-e.gpt-image.image-edit.-image-preview.-image-latest.flash-image.nano-banana.stable-diffusion.sdxl.midjourney.flux-.imagen.sora.veo-.cogvideo.runway-.lumiere.lyria.whisper.tts-.-tts.speech-.audio-preview.mini-tts.mini-transcribe.-transcribe.native-audio.flash-live.gpt-audio.realtime.bark-.xtts.voicebox.moderation.omni-moderation.llama-guard.shieldgemma.prompt-guard.-guardian.safeguard.rerank.reranker.babbage-.davinci-.curie-.text-ada-.text-davinci.text-curie.text-babbage.instructgpt.code-davinci.code-cushman.-turbo-instruct.-search-preview.-search-api.code-search.text-search.similarity-.computer-use-preview.deep-research.robotics.aqa.reader-lm.-nsql.minicheck`.split(`.`);function n(e){let n=e.toLowerCase();return!(t.some(e=>n.includes(e))||n.startsWith(`claude-1`)||n.startsWith(`claude-instant`))}function r(e){let t=e;return t=t.replace(/<think>[\s\S]*?<\/think>/gi,``),t=t.replace(/<\|endoftext\|>/g,``),t=t.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g,``),t=t.replace(/<\|im_start\|>[\s\S]*/g,``),t.trim()}function i(e){return e.finishReason===`max_tokens`||e.finishReason===`length`}})),c=o(),l=s(),u={anthropic:[`claude-sonnet-4`,`claude-opus-4`,`claude-3-7-sonnet`],openai:[`gpt-5`,`gpt-4.1`,`gpt-4o`],gemini:[`gemini-2.5-pro`,`gemini-2.5-flash`,`gemini-2.0-flash`],deepseek:[`deepseek-chat`],custom:[]};function d(e){return e instanceof Error?e.message:String(e)}function f(e,t){let n;return Promise.race([e,new Promise(e=>{n=setTimeout(()=>e(null),t)})]).finally(()=>clearTimeout(n))}var p=class{constructor(e,t,n={}){r(this,`socket`,void 0),r(this,`instance`,void 0),r(this,`commands`,void 0),r(this,`storageKey`,void 0),r(this,`answerTimeout`,void 0),r(this,`askTimeout`,void 0),r(this,`modelCache`,new Map),r(this,`pushChannel`,null),r(this,`pushChannelPromise`,null),r(this,`requestCounter`,0),this.socket=e,this.instance=t,this.commands={...c.AI_COMMANDS,...n.commands},this.storageKey=n.storageKey||`ai.model`,this.answerTimeout=n.answerTimeout||8e3,this.askTimeout=n.askTimeout||6e5}async getProviders(){try{let e=await f(this.socket.sendTo(this.instance,this.commands.providers,{}),this.answerTimeout);return e===null?null:(e==null?void 0:e.providers)||[]}catch{return null}}async getModels(e){let t=this.modelCache.get(e);if(t)return{models:t};try{let t=await f(this.socket.sendTo(this.instance,this.commands.models,{provider:e}),Math.max(this.answerTimeout,3e4));if(t===null)return{models:[],error:`timeout`};if(t!=null&&t.error)return{models:[],error:t.error};let n=((t==null?void 0:t.models)||[]).filter(l.isChatModel);return n.length&&this.modelCache.set(e,n),{models:n}}catch(e){return{models:[],error:d(e)}}}clearModelCache(){this.modelCache.clear()}preferredModel(e,t){let n=``;try{n=window.localStorage.getItem(this.storageKey)||``}catch{}if(n&&e.includes(n))return n;for(let n of u[t]||[]){let t=e.find(e=>e.startsWith(n));if(t)return t}return e[0]||``}rememberModel(e){try{e&&window.localStorage.setItem(this.storageKey,e)}catch{}}resetPushChannel(){this.pushChannel=null,this.pushChannelPromise=null}ensurePushChannel(){return this.pushChannel?Promise.resolve(this.pushChannel):(this.pushChannelPromise||=(async()=>{let e={sessionToken:`ai-${Date.now().toString(36)}-${Math.random().toString(36).substring(2,10)}`,pending:new Map};try{let t=await f(this.socket.subscribeOnInstance(this.instance,c.AI_PUSH_MESSAGE_TYPE,{sessionToken:e.sessionToken},t=>{let n=t,r=n==null?void 0:n.requestId,i=r?e.pending.get(r):void 0;r&&i&&(e.pending.delete(r),i(n))}),this.answerTimeout);if(!(t!=null&&t.accepted))return null;let n=e=>{e||(this.socket.unregisterConnectionHandler(n),this.resetPushChannel())};return this.socket.registerConnectionHandler(n),this.pushChannel=e,e}catch{return null}finally{this.pushChannelPromise=null}})(),this.pushChannelPromise)}async ask(e){let t=e.timeout||this.askTimeout,n=await this.ensurePushChannel(),r=n?`req-${++this.requestCounter}-${Date.now().toString(36)}`:``,i;try{var a;i=await this.socket.sendTo(this.instance,this.commands.chat,{provider:e.provider,model:e.model,messages:e.messages,...(a=e.tools)!=null&&a.length?{tools:e.tools}:{},timeout:t,...n?{uiSession:n.sessionToken,requestId:r}:{}})}catch(e){return{error:d(e)}}return!n||!(i!=null&&i.accepted)?i?typeof i==`string`?{error:i}:i:{error:`The adapter answered with nothing`}:new Promise(e=>{let i=setTimeout(()=>{n.pending.delete(r),this.resetPushChannel(),e({error:`No answer within ${Math.round(t/1e3)}s`})},t);n.pending.set(r,t=>{clearTimeout(i),e(t)})})}},m=e(i(),1),h=a(()=>import(`./docs-compact-D7rpMc7r.js`),[],import.meta.url),g={openai:`img/openai.svg`,anthropic:`img/anthropic.svg`,gemini:`img/gemini.svg`,deepseek:`img/deepseek.svg`,custom:`img/custom.svg`},_={width:16,height:16,flexShrink:0,opacity:.7},v={ru:`Russian`,en:`English`,de:`German`,es:`Spanish`,fr:`French`,it:`Italian`,pl:`Polish`,nl:`Dutch`,pt:`Portuguese`,uk:`Ukrainian`,"zh-cn":`Chinese`},y=null,b=null,x=null,S=null,C=null;function w(){y=null,b=null,x=null,S=null,C=null}function T(e,t){return(!y||y.socket!==e||y.instance!==t)&&(y=new p(e,t)),y}async function E(e,t){if(b)return b;let n=Object.keys(t)[0];if(!n)return null;let r=await T(e,n).getProviders()||[],i=r.map(e=>e.provider),a=r.find(e=>e.provider===`custom`);return i.length?(b={providers:i,gptBaseUrl:a==null?void 0:a.baseUrl},b):null}var D=`openai-model`,O=`openai-model-provider`;function k(e,t){window.localStorage.setItem(D,e),t?window.localStorage.setItem(O,t):window.localStorage.removeItem(O)}function A(){return{model:window.localStorage.getItem(D)||``,provider:window.localStorage.getItem(O)||``}}async function j(e,t){let r=await E(e,t);if(!r)return{models:[],providerMap:{},errors:[`No API keys configured`]};let i=Object.keys(t)[0];if(!i)return{models:[],providerMap:{},errors:[n.t(`No running javascript instance found`)]};let a=[],o={},s=[],c={},l=T(e,i),u=[],d=(e,t)=>{u.push(l.getModels(e).then(n=>{n.error?s.push(`${t||e}: ${n.error}`):c[e]=n.models}))},f={openai:`OpenAI`,anthropic:`Anthropic`,gemini:`Gemini`,deepseek:`DeepSeek`,custom:`Custom`};for(let e of r.providers)d(e,f[e]);await Promise.all(u);for(let e of r.providers)for(let t of c[e]||[])o[t]||(a.push(t),o[t]=e);return a.sort(),{models:a,providerMap:o,errors:s}}async function M(e,t,n){return await T(e,t).ask({provider:n.provider,model:n.model,messages:n.messages,tools:n.tools,timeout:n.timeout})}async function N(e){if(C)return C;let t=await e.getObjectViewSystem(`state`,``,`香`),n=await e.getObjectViewSystem(`channel`,``,`香`),r=await e.getObjectViewSystem(`device`,``,`香`),i=await e.getObjectViewSystem(`folder`,``,`香`),a=await e.getObjectViewSystem(`enum`,``,`香`);return C=Object.assign(t,n,r,i,a),C}async function P(e){return N(e)}function F(e,t){return e&&typeof e==`object`?e[t]||e.en:e||``}async function I(e){if(x)return x;let t=n.getLanguage(),r=await N(e),i=Object.keys(r).sort(),a=new m.default,o=[],s=[`UNREACH_STICKY`],c=[m.Types.info],l=[],u=[],d=[],f=[];i.forEach(e=>{var t,n;((t=r[e])==null?void 0:t.type)===`enum`?l.push(e):(n=r[e])!=null&&(n=n.common)!=null&&n.smartName&&f.push(e)}),l.forEach(e=>{e.startsWith(`enum.rooms.`)?u.push(e):e.startsWith(`enum.functions.`)&&d.push(e);let t=r[e].common.members;t!=null&&t.length&&t.forEach(e=>{r[e]&&!f.includes(e)&&f.push(e)})});let p={id:``,objects:r,_keysOptional:i,_usedIdsOptional:o,ignoreIndicators:s,excludedTypes:c},h=[];f.forEach(e=>{p.id=e;let n=a.detect(p);n&&n.forEach(e=>{var n;let i=(n=e.states.find(e=>e.id))==null?void 0:n.id;if(!i||h.find(e=>e.id===i))return;let a=r[i],o={id:i,name:F(a.common.name,t),type:a.type,deviceType:e.type,states:e.states.filter(e=>e.id).map(e=>({id:e.id,name:e.name,role:e.defaultRole,type:r[e.id].common.type,unit:r[e.id].common.unit,read:r[e.id].common.read??!0,write:r[e.id].common.write??!0}))},s=i.split(`.`),c,l;(a.type===`channel`||a.type===`state`)&&(s.pop(),c=s.join(`.`),r[c]&&(r[c].type===`channel`||r[c].type===`folder`)?(s.pop(),l=s.join(`.`),(!r[l]||r[l].type!==`device`&&r[c].type!==`folder`)&&(l=void 0)):c=void 0);let f=u.find(e=>{var t,n,a;return(t=r[e].common.members)!=null&&t.includes(i)||c&&(n=r[e].common.members)!=null&&n.includes(c)?!0:l&&((a=r[e].common.members)==null?void 0:a.includes(l))});f&&(o.room=F(r[f].common.name,t));let p=d.find(e=>{var t,n,a;return(t=r[e].common.members)!=null&&t.includes(i)||c&&(n=r[e].common.members)!=null&&n.includes(c)?!0:l&&((a=r[e].common.members)==null?void 0:a.includes(l))});p&&(o.function=F(r[p].common.name,t)),h.push(o)})});for(let e=0;e<h.length;e++){let n=h[e];if(n.type===`state`||n.type===`channel`){let e=n.id.split(`.`);e.pop();let i=r[e.join(`.`)];if(i&&(i.type===`channel`||i.type===`device`||i.type===`folder`)){var g,_;n.name=F(((g=i.common)==null?void 0:g.name)||n.name,t),e.pop();let a=r[e.join(`.`)];if((a==null?void 0:a.type)===`device`&&(_=a.common)!=null&&_.icon){var v;n.name=F(((v=a.common)==null?void 0:v.name)||n.name,t)}}else{var y;n.name=F((i==null||(y=i.common)==null?void 0:y.name)||n.name,t)}}}return x=h,h}async function L(){return S||(S=(await h).default,S)}function R(){return v[n.getLanguage()]||`English`}function z(e){return`You write ioBroker JavaScript adapter scripts.
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

Write comments in ${e}. Put code in a \`\`\`javascript code block.`}function B(e){return`You generate ioBroker Blockly XML blocks. Return Blockly XML in a \`\`\`xml code block.
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

Write comments in ${e}. Put blocks in a \`\`\`xml code block.`}function V(e){var t,r;let i=(e.content||``).trim(),a=[];if(e.finishReason&&a.push(`${n.t(`Stop reason`)}: ${e.finishReason}`),((t=e.usage)==null?void 0:t.input)!==void 0||((r=e.usage)==null?void 0:r.output)!==void 0){var o,s;a.push(`${n.t(`Tokens in/out`)}: ${((o=e.usage)==null?void 0:o.input)??`?`}/${((s=e.usage)==null?void 0:s.output)??`?`}`)}let c=a.length?` (${a.join(`, `)})`:``;if(i)return`⚠️ ${n.t(`The model answered with reasoning only, no result`)}${c}\n\n${i}`;if(e.finishReason===`max_tokens`||e.finishReason===`length`)return`⚠️ ${n.t(`The model used up its output budget before writing an answer. Try a shorter question or less context.`)}${c}`;if(e.success!==!0){let t;try{t=typeof e==`string`?e:JSON.stringify(e)}catch{t=Object.prototype.toString.call(e)}return`⚠️ ${n.t(`The javascript adapter did not answer this request. Check the adapter log.`)}\n\n\`${n.t(`Reply`)}: ${t.substring(0,300)}\``}return`⚠️ ${n.t(`The model returned an empty answer`)}${c}`}export{M as _,V as a,E as c,L as d,R as f,k as g,A as h,w as i,B as l,j as m,g as n,I as o,l as p,T as r,P as s,_ as t,z as u};