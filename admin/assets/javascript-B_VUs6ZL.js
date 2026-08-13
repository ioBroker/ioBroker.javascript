import{o as e,t}from"./rolldown-runtime-C0FnF6B9.js";import{g as n}from"./blockly-CKsEOJpn.js";var{JavascriptGenerator:r,Order:i,javascriptGenerator:a}=e(t(((e,t)=>{(function(r,i){typeof define==`function`&&define.amd?define([`./blockly_compressed.js`],i):typeof e==`object`?t.exports=i(n()):(r.javascript=i(r.Blockly),r.Blockly.JavaScript=r.javascript.javascriptGenerator)})(e,function(e){var t=e.__namespace__,n=function(e,t,n){return t===`FIRST`?`0`:t===`FROM_END`?e+`.length - 1 - `+n:t===`LAST`?e+`.length - 1`:n},r=function(e,t){var n=0,r=``;t.STATEMENT_PREFIX&&(r+=t.injectId(t.STATEMENT_PREFIX,e));do{let i=t.valueToCode(e,`IF`+n,f.NONE)||`false`,a=t.statementToCode(e,`DO`+n);t.STATEMENT_SUFFIX&&(a=t.prefixLines(t.injectId(t.STATEMENT_SUFFIX,e),t.INDENT)+a),r+=(n>0?` else `:``)+`if (`+i+`) {
`+a+`}`,n++}while(e.getInput(`IF`+n));return(e.getInput(`ELSE`)||t.STATEMENT_SUFFIX)&&(n=e.getInput(`ELSE`)?t.statementToCode(e,`ELSE`):``,t.STATEMENT_SUFFIX&&(n=t.prefixLines(t.injectId(t.STATEMENT_SUFFIX,e),t.INDENT)+n),r+=` else {
`+n+`}`),r+`
`},i=function(e,n){var r=e.getField(`TIMES`)?String(Number(e.getFieldValue(`TIMES`))):n.valueToCode(e,`TIMES`,f.ASSIGNMENT)||`0`,i=n.statementToCode(e,`DO`);i=n.addLoopTrap(i,e),e=``;var a=n.nameDB_.getDistinctName(`count`,t.P.VARIABLE),o=r;return r.match(/^\w+$/)||t.zf(r)||(o=n.nameDB_.getDistinctName(`repeat_end`,t.P.VARIABLE),e+=`var `+o+` = `+r+`;
`),e+(`for (var `+a+` = 0; `+a+` < `+o+`; `+a+`++) {
`+i+`}
`)},a=function(e,t){var n=e.getFieldValue(`OP`);if(n===`NEG`)return e=t.valueToCode(e,`NUM`,f.UNARY_NEGATION)||`0`,e[0]===`-`&&(e=` `+e),[`-`+e,f.UNARY_NEGATION];switch(e=n===`SIN`||n===`COS`||n===`TAN`?t.valueToCode(e,`NUM`,f.DIVISION)||`0`:t.valueToCode(e,`NUM`,f.NONE)||`0`,n){case`ABS`:var r=`Math.abs(`+e+`)`;break;case`ROOT`:r=`Math.sqrt(`+e+`)`;break;case`LN`:r=`Math.log(`+e+`)`;break;case`EXP`:r=`Math.exp(`+e+`)`;break;case`POW10`:r=`Math.pow(10,`+e+`)`;break;case`ROUND`:r=`Math.round(`+e+`)`;break;case`ROUNDUP`:r=`Math.ceil(`+e+`)`;break;case`ROUNDDOWN`:r=`Math.floor(`+e+`)`;break;case`SIN`:r=`Math.sin(`+e+` / 180 * Math.PI)`;break;case`COS`:r=`Math.cos(`+e+` / 180 * Math.PI)`;break;case`TAN`:r=`Math.tan(`+e+` / 180 * Math.PI)`}if(r)return[r,f.FUNCTION_CALL];switch(n){case`LOG10`:r=`Math.log(`+e+`) / Math.log(10)`;break;case`ASIN`:r=`Math.asin(`+e+`) / Math.PI * 180`;break;case`ACOS`:r=`Math.acos(`+e+`) / Math.PI * 180`;break;case`ATAN`:r=`Math.atan(`+e+`) / Math.PI * 180`;break;default:throw Error(`Unknown math operator: `+n)}return[r,f.DIVISION]},o=function(e,t){var n=t.getProcedureName(e.getFieldValue(`NAME`)),r=``;t.STATEMENT_PREFIX&&(r+=t.injectId(t.STATEMENT_PREFIX,e)),t.STATEMENT_SUFFIX&&(r+=t.injectId(t.STATEMENT_SUFFIX,e)),r&&=t.prefixLines(r,t.INDENT);var i=``;t.INFINITE_LOOP_TRAP&&(i=t.prefixLines(t.injectId(t.INFINITE_LOOP_TRAP,e),t.INDENT));var a=``;e.getInput(`STACK`)&&(a=t.statementToCode(e,`STACK`));var o=``;e.getInput(`RETURN`)&&(o=t.valueToCode(e,`RETURN`,f.NONE)||``);var s=``;a&&o&&(s=r),o&&=t.INDENT+`return `+o+`;
`;var c=[],l=e.getVarModels();for(let e=0;e<l.length;e++)c[e]=t.getVariableName(l[e].getId());return r=`function `+n+`(`+c.join(`, `)+`) {
`+r+i+a+s+o+`}`,r=t.scrub_(e,r),t.definitions_[`%`+n]=r,null},s=function(e){return y.test(e)?[e,f.ATOMIC]:[`String(`+e+`)`,f.FUNCTION_CALL]},c=function(e,t,n){return t===`FIRST`?`0`:t===`FROM_END`?e+`.length - 1 - `+n:t===`LAST`?e+`.length - 1`:n},l=function(e,t){return t=`window.prompt(`+(e.getField(`TEXT`)?t.quote_(e.getFieldValue(`TEXT`)):t.valueToCode(e,`TEXT`,f.NONE)||`''`)+`)`,e.getFieldValue(`TYPE`)===`NUMBER`&&(t=`Number(`+t+`)`),[t,f.FUNCTION_CALL]},u=function(e,t){return[t.getVariableName(e.getFieldValue(`VAR`)),f.ATOMIC]},d=function(e,t){var n=t.valueToCode(e,`VALUE`,f.ASSIGNMENT)||`0`;return t.getVariableName(e.getFieldValue(`VAR`))+` = `+n+`;
`},f,p=f||={};p[p.ATOMIC=0]=`ATOMIC`,p[p.NEW=1.1]=`NEW`,p[p.MEMBER=1.2]=`MEMBER`,p[p.FUNCTION_CALL=2]=`FUNCTION_CALL`,p[p.INCREMENT=3]=`INCREMENT`,p[p.DECREMENT=3]=`DECREMENT`,p[p.BITWISE_NOT=4.1]=`BITWISE_NOT`,p[p.UNARY_PLUS=4.2]=`UNARY_PLUS`,p[p.UNARY_NEGATION=4.3]=`UNARY_NEGATION`,p[p.LOGICAL_NOT=4.4]=`LOGICAL_NOT`,p[p.TYPEOF=4.5]=`TYPEOF`,p[p.VOID=4.6]=`VOID`,p[p.DELETE=4.7]=`DELETE`,p[p.AWAIT=4.8]=`AWAIT`,p[p.EXPONENTIATION=5]=`EXPONENTIATION`,p[p.MULTIPLICATION=5.1]=`MULTIPLICATION`,p[p.DIVISION=5.2]=`DIVISION`,p[p.MODULUS=5.3]=`MODULUS`,p[p.SUBTRACTION=6.1]=`SUBTRACTION`,p[p.ADDITION=6.2]=`ADDITION`,p[p.BITWISE_SHIFT=7]=`BITWISE_SHIFT`,p[p.RELATIONAL=8]=`RELATIONAL`,p[p.IN=8]=`IN`,p[p.INSTANCEOF=8]=`INSTANCEOF`,p[p.EQUALITY=9]=`EQUALITY`,p[p.BITWISE_AND=10]=`BITWISE_AND`,p[p.BITWISE_XOR=11]=`BITWISE_XOR`,p[p.BITWISE_OR=12]=`BITWISE_OR`,p[p.LOGICAL_AND=13]=`LOGICAL_AND`,p[p.LOGICAL_OR=14]=`LOGICAL_OR`,p[p.CONDITIONAL=15]=`CONDITIONAL`,p[p.ASSIGNMENT=16]=`ASSIGNMENT`,p[p.YIELD=17]=`YIELD`,p[p.COMMA=18]=`COMMA`,p[p.NONE=99]=`NONE`;var m=class extends t.dq{constructor(e=`JavaScript`){super(e),this.ORDER_OVERRIDES=[[f.FUNCTION_CALL,f.MEMBER],[f.FUNCTION_CALL,f.FUNCTION_CALL],[f.MEMBER,f.MEMBER],[f.MEMBER,f.FUNCTION_CALL],[f.LOGICAL_NOT,f.LOGICAL_NOT],[f.MULTIPLICATION,f.MULTIPLICATION],[f.ADDITION,f.ADDITION],[f.LOGICAL_AND,f.LOGICAL_AND],[f.LOGICAL_OR,f.LOGICAL_OR]],this.isInitialized=!1;for(let t in f)e=f[t],typeof e!=`string`&&(this[`ORDER_`+t]=e);this.addReservedWords(`break,case,catch,class,const,continue,debugger,default,delete,do,else,export,extends,finally,for,function,if,import,in,instanceof,new,return,super,switch,this,throw,try,typeof,var,void,while,with,yield,enum,implements,interface,let,package,private,protected,public,static,await,null,true,false,arguments,`+Object.getOwnPropertyNames(globalThis).join(`,`))}init(e){super.init(e),this.nameDB_?this.nameDB_.reset():this.nameDB_=new t.kj(this.RESERVED_WORDS_),this.nameDB_.setVariableMap(e.getVariableMap()),this.nameDB_.populateVariables(e),this.nameDB_.populateProcedures(e);var n=[],r=t.Cd(e);for(let e=0;e<r.length;e++)n.push(this.nameDB_.getName(r[e],t.P.DEVELOPER_VARIABLE));for(e=t.Bd(e),r=0;r<e.length;r++)n.push(this.nameDB_.getName(e[r].getId(),t.P.VARIABLE));n.length&&(this.definitions_.variables=`var `+n.join(`, `)+`;`),this.isInitialized=!0}finish(e){var t=Object.values(this.definitions_);return super.finish(e),this.isInitialized=!1,this.nameDB_.reset(),t.join(`

`)+`


`+e}scrubNakedValue(e){return e+`;
`}quote_(e){return e=e.replace(/\\/g,`\\\\`).replace(/\n/g,`\\
`).replace(/'/g,`\\'`),`'`+e+`'`}multiline_quote_(e){return e.split(/\n/g).map(this.quote_).join(` + '\\n' +
`)}scrub_(e,n,r=!1){var i=``;if(!e.outputConnection||!e.outputConnection.targetConnection){var a=e.getCommentText();a&&(a=t.yf(a,this.COMMENT_WRAP-3),i+=this.prefixLines(a+`
`,`// `));for(let n=0;n<e.inputList.length;n++)e.inputList[n].type===t.je.VALUE&&(a=e.inputList[n].connection.targetBlock())&&(a=this.allNestedComments(a))&&(i+=this.prefixLines(a,`// `))}return e=e.nextConnection&&e.nextConnection.targetBlock(),r=r?``:this.blockToCode(e),i+n+r}getAdjusted(e,n,r=0,i=!1,a=f.NONE){e.workspace.options.oneBasedIndex&&r--;var o=e.workspace.options.oneBasedIndex?`1`:`0`,s=a;return r>0?s=f.ADDITION:r<0?s=f.SUBTRACTION:i&&(s=f.UNARY_NEGATION),e=this.valueToCode(e,n,s)||o,r===0&&!i?e:t.zf(e)?(e=String(Number(e)+r),i&&(e=String(-Number(e))),e):(r>0?e=`${e} + ${r}`:r<0&&(e=`${e} - ${-r}`),i&&(e=r?`-(${e})`:`-${e}`),Math.floor(a)>=Math.floor(s)&&(e=`(${e})`),e)}},h={};h.controls_if=r,h.controls_ifelse=r,h.logic_boolean=function(e){return[e.getFieldValue(`BOOL`)===`TRUE`?`true`:`false`,f.ATOMIC]},h.logic_compare=function(e,t){var n={EQ:`==`,NEQ:`!=`,LT:`<`,LTE:`<=`,GT:`>`,GTE:`>=`}[e.getFieldValue(`OP`)],r=n===`==`||n===`!=`?f.EQUALITY:f.RELATIONAL,i=t.valueToCode(e,`A`,r)||`0`;return e=t.valueToCode(e,`B`,r)||`0`,[i+` `+n+` `+e,r]},h.logic_negate=function(e,t){var n=f.LOGICAL_NOT;return[`!`+(t.valueToCode(e,`BOOL`,n)||`true`),n]},h.logic_null=function(){return[`null`,f.ATOMIC]},h.logic_operation=function(e,t){var n=e.getFieldValue(`OP`)===`AND`?`&&`:`||`,r=n===`&&`?f.LOGICAL_AND:f.LOGICAL_OR,i=t.valueToCode(e,`A`,r);return e=t.valueToCode(e,`B`,r),i||e?(t=n===`&&`?`true`:`false`,i||=t,e||=t):e=i=`false`,[i+` `+n+` `+e,r]},h.logic_ternary=function(e,t){var n=t.valueToCode(e,`IF`,f.CONDITIONAL)||`false`,r=t.valueToCode(e,`THEN`,f.CONDITIONAL)||`null`;return e=t.valueToCode(e,`ELSE`,f.CONDITIONAL)||`null`,[n+` ? `+r+` : `+e,f.CONDITIONAL]};var g={controls_flow_statements:function(e,t){var n=``;if(t.STATEMENT_PREFIX&&(n+=t.injectId(t.STATEMENT_PREFIX,e)),t.STATEMENT_SUFFIX&&(n+=t.injectId(t.STATEMENT_SUFFIX,e)),t.STATEMENT_PREFIX){let r=e.getSurroundLoop();r&&!r.suppressPrefixSuffix&&(n+=t.injectId(t.STATEMENT_PREFIX,r))}switch(e.getFieldValue(`FLOW`)){case`BREAK`:return n+`break;
`;case`CONTINUE`:return n+`continue;
`}throw Error(`Unknown flow statement.`)},controls_for:function(e,n){var r=n.getVariableName(e.getFieldValue(`VAR`)),i=n.valueToCode(e,`FROM`,f.ASSIGNMENT)||`0`,a=n.valueToCode(e,`TO`,f.ASSIGNMENT)||`0`,o=n.valueToCode(e,`BY`,f.ASSIGNMENT)||`1`,s=n.statementToCode(e,`DO`);if(s=n.addLoopTrap(s,e),t.zf(i)&&t.zf(a)&&t.zf(o))n=Number(i)<=Number(a),e=`for (`+r+` = `+i+`; `+r+(n?` <= `:` >= `)+a+`; `+r,r=Math.abs(Number(o)),e=r===1?e+(n?`++`:`--`):e+((n?` += `:` -= `)+r),e+=`) {
`+s+`}
`;else{e=``;let c=i;i.match(/^\w+$/)||t.zf(i)||(c=n.nameDB_.getDistinctName(r+`_start`,t.P.VARIABLE),e+=`var `+c+` = `+i+`;
`),i=a,a.match(/^\w+$/)||t.zf(a)||(i=n.nameDB_.getDistinctName(r+`_end`,t.P.VARIABLE),e+=`var `+i+` = `+a+`;
`),a=n.nameDB_.getDistinctName(r+`_inc`,t.P.VARIABLE),e+=`var `+a+` = `,e=t.zf(o)?e+(Math.abs(Number(o))+`;
`):e+(`Math.abs(`+o+`);
`),e+=`if (`+c+` > `+i+`) {
`,e+=n.INDENT+a+` = -`+a+`;
`,e=e+`}
for (`+(r+` = `+c+`; `+a+` >= 0 ? `+r+` <= `+i+` : `+r+` >= `+i+`; `+r+` += `+a+`) {
`+s+`}
`)}return e},controls_forEach:function(e,n){var r=n.getVariableName(e.getFieldValue(`VAR`)),i=n.valueToCode(e,`LIST`,f.ASSIGNMENT)||`[]`,a=n.statementToCode(e,`DO`);a=n.addLoopTrap(a,e),e=``;var o=i;return i.match(/^\w+$/)||(o=n.nameDB_.getDistinctName(r+`_list`,t.P.VARIABLE),e+=`var `+o+` = `+i+`;
`),i=n.nameDB_.getDistinctName(r+`_index`,t.P.VARIABLE),a=n.INDENT+r+` = `+o+`[`+i+`];
`+a,e+(`for (var `+i+` in `+o+`) {
`+a+`}
`)}};g.controls_repeat=i,g.controls_repeat_ext=i,g.controls_whileUntil=function(e,t){var n=e.getFieldValue(`MODE`)===`UNTIL`,r=t.valueToCode(e,`BOOL`,n?f.LOGICAL_NOT:f.NONE)||`false`,i=t.statementToCode(e,`DO`);return i=t.addLoopTrap(i,e),n&&(r=`!`+r),`while (`+r+`) {
`+i+`}
`};var _={math_arithmetic:function(e,t){var n={ADD:[` + `,f.ADDITION],MINUS:[` - `,f.SUBTRACTION],MULTIPLY:[` * `,f.MULTIPLICATION],DIVIDE:[` / `,f.DIVISION],POWER:[null,f.NONE]}[e.getFieldValue(`OP`)],r=n[0];n=n[1];var i=t.valueToCode(e,`A`,n)||`0`;return e=t.valueToCode(e,`B`,n)||`0`,r?[i+r+e,n]:[`Math.pow(`+i+`, `+e+`)`,f.FUNCTION_CALL]},math_atan2:function(e,t){var n=t.valueToCode(e,`X`,f.NONE)||`0`;return[`Math.atan2(`+(t.valueToCode(e,`Y`,f.NONE)||`0`)+`, `+n+`) / Math.PI * 180`,f.DIVISION]},math_change:function(e,t){var n=t.valueToCode(e,`DELTA`,f.ADDITION)||`0`;return e=t.getVariableName(e.getFieldValue(`VAR`)),e+` = (typeof `+e+` === 'number' ? `+e+` : 0) + `+n+`;
`},math_constant:function(e){return{PI:[`Math.PI`,f.MEMBER],E:[`Math.E`,f.MEMBER],GOLDEN_RATIO:[`(1 + Math.sqrt(5)) / 2`,f.DIVISION],SQRT2:[`Math.SQRT2`,f.MEMBER],SQRT1_2:[`Math.SQRT1_2`,f.MEMBER],INFINITY:[`Infinity`,f.ATOMIC]}[e.getFieldValue(`CONSTANT`)]},math_constrain:function(e,t){var n=t.valueToCode(e,`VALUE`,f.NONE)||`0`,r=t.valueToCode(e,`LOW`,f.NONE)||`0`;return e=t.valueToCode(e,`HIGH`,f.NONE)||`Infinity`,[`Math.min(Math.max(`+n+`, `+r+`), `+e+`)`,f.FUNCTION_CALL]},math_modulo:function(e,t){var n=t.valueToCode(e,`DIVIDEND`,f.MODULUS)||`0`;return e=t.valueToCode(e,`DIVISOR`,f.MODULUS)||`0`,[n+` % `+e,f.MODULUS]},math_number:function(e){return e=Number(e.getFieldValue(`NUM`)),[String(e),e>=0?f.ATOMIC:f.UNARY_NEGATION]},math_number_property:function(e,t){var n={EVEN:[` % 2 === 0`,f.MODULUS,f.EQUALITY],ODD:[` % 2 === 1`,f.MODULUS,f.EQUALITY],WHOLE:[` % 1 === 0`,f.MODULUS,f.EQUALITY],POSITIVE:[` > 0`,f.RELATIONAL,f.RELATIONAL],NEGATIVE:[` < 0`,f.RELATIONAL,f.RELATIONAL],DIVISIBLE_BY:[null,f.MODULUS,f.EQUALITY],PRIME:[null,f.NONE,f.FUNCTION_CALL]},r=e.getFieldValue(`PROPERTY`),[i,a,o]=n[r];return n=t.valueToCode(e,`NUMBER_TO_CHECK`,a)||`0`,r===`PRIME`?e=t.provideFunction_(`mathIsPrime`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(n) {
  // https://en.wikipedia.org/wiki/Primality_test#Naive_methods
  if (n == 2 || n == 3) {
    return true;
  }
  // False if n is NaN, negative, is 1, or not whole.
  // And false if n is divisible by 2 or 3.
  if (isNaN(n) || n <= 1 || n % 1 !== 0 || n % 2 === 0 || n % 3 === 0) {
    return false;
  }
  // Check all the numbers of form 6k +/- 1, up to sqrt(n).
  for (var x = 6; x <= Math.sqrt(n) + 1; x += 6) {
    if (n % (x - 1) === 0 || n % (x + 1) === 0) {
      return false;
    }
  }
  return true;
}
`)+`(`+n+`)`:r===`DIVISIBLE_BY`?(e=t.valueToCode(e,`DIVISOR`,f.MODULUS)||`0`,e=n+` % `+e+` === 0`):e=n+i,[e,o]},math_on_list:function(e,t){var n=e.getFieldValue(`OP`);switch(n){case`SUM`:e=t.valueToCode(e,`LIST`,f.MEMBER)||`[]`,e+=`.reduce(function(x, y) {return x + y;}, 0)`;break;case`MIN`:e=t.valueToCode(e,`LIST`,f.NONE)||`[]`,e=`Math.min.apply(null, `+e+`)`;break;case`MAX`:e=t.valueToCode(e,`LIST`,f.NONE)||`[]`,e=`Math.max.apply(null, `+e+`)`;break;case`AVERAGE`:n=t.provideFunction_(`mathMean`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(myList) {
  return myList.reduce(function(x, y) {return x + y;}, 0) / myList.length;
}
`),e=t.valueToCode(e,`LIST`,f.NONE)||`[]`,e=n+`(`+e+`)`;break;case`MEDIAN`:n=t.provideFunction_(`mathMedian`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(myList) {
  var localList = myList.filter(function (x) {return typeof x === 'number';});
  if (!localList.length) return null;
  localList.sort(function(a, b) {return b - a;});
  if (localList.length % 2 === 0) {
    return (localList[localList.length / 2 - 1] + localList[localList.length / 2]) / 2;
  } else {
    return localList[(localList.length - 1) / 2];
  }
}
`),e=t.valueToCode(e,`LIST`,f.NONE)||`[]`,e=n+`(`+e+`)`;break;case`MODE`:n=t.provideFunction_(`mathModes`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(values) {
  var modes = [];
  var counts = [];
  var maxCount = 0;
  for (var i = 0; i < values.length; i++) {
    var value = values[i];
    var found = false;
    var thisCount;
    for (var j = 0; j < counts.length; j++) {
      if (counts[j][0] === value) {
        thisCount = ++counts[j][1];
        found = true;
        break;
      }
    }
    if (!found) {
      counts.push([value, 1]);
      thisCount = 1;
    }
    maxCount = Math.max(thisCount, maxCount);
  }
  for (var j = 0; j < counts.length; j++) {
    if (counts[j][1] === maxCount) {
      modes.push(counts[j][0]);
    }
  }
  return modes;
}
`),e=t.valueToCode(e,`LIST`,f.NONE)||`[]`,e=n+`(`+e+`)`;break;case`STD_DEV`:n=t.provideFunction_(`mathStandardDeviation`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(numbers) {
  var n = numbers.length;
  if (!n) return null;
  var mean = numbers.reduce(function(x, y) {return x + y;}) / n;
  var variance = 0;
  for (var j = 0; j < n; j++) {
    variance += Math.pow(numbers[j] - mean, 2);
  }
  variance /= n;
  return Math.sqrt(variance);
}
`),e=t.valueToCode(e,`LIST`,f.NONE)||`[]`,e=n+`(`+e+`)`;break;case`RANDOM`:n=t.provideFunction_(`mathRandomList`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(list) {
  var x = Math.floor(Math.random() * list.length);
  return list[x];
}
`),e=t.valueToCode(e,`LIST`,f.NONE)||`[]`,e=n+`(`+e+`)`;break;default:throw Error(`Unknown operator: `+n)}return[e,f.FUNCTION_CALL]},math_random_float:function(){return[`Math.random()`,f.FUNCTION_CALL]},math_random_int:function(e,t){var n=t.valueToCode(e,`FROM`,f.NONE)||`0`;return e=t.valueToCode(e,`TO`,f.NONE)||`0`,[t.provideFunction_(`mathRandomInt`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(a, b) {
  if (a > b) {
    // Swap a and b to ensure a is smaller.
    var c = a;
    a = b;
    b = c;
  }
  return Math.floor(Math.random() * (b - a + 1) + a);
}
`)+`(`+n+`, `+e+`)`,f.FUNCTION_CALL]}};_.math_round=a,_.math_single=a,_.math_trig=a;var v={procedures_callnoreturn:function(e,t){return t.forBlock.procedures_callreturn(e,t)[0]+`;
`},procedures_callreturn:function(e,t){var n=t.getProcedureName(e.getFieldValue(`NAME`)),r=[],i=e.getVarModels();for(let n=0;n<i.length;n++)r[n]=t.valueToCode(e,`ARG`+n,f.NONE)||`null`;return[n+`(`+r.join(`, `)+`)`,f.FUNCTION_CALL]}};v.procedures_defnoreturn=o,v.procedures_defreturn=o,v.procedures_ifreturn=function(e,t){var n=`if (`+(t.valueToCode(e,`CONDITION`,f.NONE)||`false`)+`) {
`;return t.STATEMENT_SUFFIX&&(n+=t.prefixLines(t.injectId(t.STATEMENT_SUFFIX,e),t.INDENT)),e.hasReturnValue_?(e=t.valueToCode(e,`VALUE`,f.NONE)||`null`,n+=t.INDENT+`return `+e+`;
`):n+=t.INDENT+`return;
`,n+`}
`};var y=/^\s*'([^']|\\')*'\s*$/,b={text:function(e,t){return[t.quote_(e.getFieldValue(`TEXT`)),f.ATOMIC]},text_append:function(e,t){var n=t.getVariableName(e.getFieldValue(`VAR`));return e=t.valueToCode(e,`TEXT`,f.NONE)||`''`,n+` += `+s(e)[0]+`;
`},text_changeCase:function(e,t){var n={UPPERCASE:`.toUpperCase()`,LOWERCASE:`.toLowerCase()`,TITLECASE:null}[e.getFieldValue(`CASE`)];return e=t.valueToCode(e,`TEXT`,n?f.MEMBER:f.NONE)||`''`,[n?e+n:t.provideFunction_(`textToTitleCase`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(str) {
  return str.replace(/\\S+/g,
      function(txt) {return txt[0].toUpperCase() + txt.substring(1).toLowerCase();});
}
`)+`(`+e+`)`,f.FUNCTION_CALL]},text_charAt:function(e,t){var n=e.getFieldValue(`WHERE`)||`FROM_START`,r=t.valueToCode(e,`VALUE`,n===`RANDOM`?f.NONE:f.MEMBER)||`''`;switch(n){case`FIRST`:return[r+`.charAt(0)`,f.FUNCTION_CALL];case`LAST`:return[r+`.slice(-1)`,f.FUNCTION_CALL];case`FROM_START`:return e=t.getAdjusted(e,`AT`),[r+`.charAt(`+e+`)`,f.FUNCTION_CALL];case`FROM_END`:return e=t.getAdjusted(e,`AT`,1,!0),[r+`.slice(`+e+`).charAt(0)`,f.FUNCTION_CALL];case`RANDOM`:return[t.provideFunction_(`textRandomLetter`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(text) {
  var x = Math.floor(Math.random() * text.length);
  return text[x];
}
`)+`(`+r+`)`,f.FUNCTION_CALL]}throw Error(`Unhandled option (text_charAt).`)},text_count:function(e,t){var n=t.valueToCode(e,`TEXT`,f.NONE)||`''`;return e=t.valueToCode(e,`SUB`,f.NONE)||`''`,[t.provideFunction_(`textCount`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(haystack, needle) {
  if (needle.length === 0) {
    return haystack.length + 1;
  } else {
    return haystack.split(needle).length - 1;
  }
}
`)+`(`+n+`, `+e+`)`,f.FUNCTION_CALL]},text_getSubstring:function(e,t){var n={FIRST:`First`,LAST:`Last`,FROM_START:`FromStart`,FROM_END:`FromEnd`},r=e.getFieldValue(`WHERE1`),i=e.getFieldValue(`WHERE2`),a=r!==`FROM_END`&&r!==`LAST`&&i!==`FROM_END`&&i!==`LAST`,o=t.valueToCode(e,`STRING`,a?f.MEMBER:f.NONE)||`''`;if(r===`FIRST`&&i===`LAST`)return[o,f.NONE];if(o.match(/^'?\w+'?$/)||a){switch(r){case`FROM_START`:n=t.getAdjusted(e,`AT1`);break;case`FROM_END`:n=t.getAdjusted(e,`AT1`,1,!1,f.SUBTRACTION),n=o+`.length - `+n;break;case`FIRST`:n=`0`;break;default:throw Error(`Unhandled option (text_getSubstring).`)}switch(i){case`FROM_START`:t=t.getAdjusted(e,`AT2`,1);break;case`FROM_END`:t=t.getAdjusted(e,`AT2`,0,!1,f.SUBTRACTION),t=o+`.length - `+t;break;case`LAST`:t=o+`.length`;break;default:throw Error(`Unhandled option (text_getSubstring).`)}o=o+`.slice(`+n+`, `+t+`)`}else a=t.getAdjusted(e,`AT1`),e=t.getAdjusted(e,`AT2`),o=t.provideFunction_(`subsequence`+n[r]+n[i],`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(sequence${r===`FROM_END`||r===`FROM_START`?`, at1`:``}${i===`FROM_END`||i===`FROM_START`?`, at2`:``}) {
  var start = ${c(`sequence`,r,`at1`)};
  var end = ${c(`sequence`,i,`at2`)} + 1;
  return sequence.slice(start, end);
}
`)+`(`+o+(r===`FROM_END`||r===`FROM_START`?`, `+a:``)+(i===`FROM_END`||i===`FROM_START`?`, `+e:``)+`)`;return[o,f.FUNCTION_CALL]},text_indexOf:function(e,t){var n=e.getFieldValue(`END`)===`FIRST`?`indexOf`:`lastIndexOf`,r=t.valueToCode(e,`FIND`,f.NONE)||`''`;return t=(t.valueToCode(e,`VALUE`,f.MEMBER)||`''`)+`.`+n+`(`+r+`)`,e.workspace.options.oneBasedIndex?[t+` + 1`,f.ADDITION]:[t,f.FUNCTION_CALL]},text_isEmpty:function(e,t){return[`!`+(t.valueToCode(e,`VALUE`,f.MEMBER)||`''`)+`.length`,f.LOGICAL_NOT]},text_join:function(e,t){switch(e.itemCount_){case 0:return[`''`,f.ATOMIC];case 1:return e=t.valueToCode(e,`ADD0`,f.NONE)||`''`,s(e);case 2:var n=t.valueToCode(e,`ADD0`,f.NONE)||`''`;return e=t.valueToCode(e,`ADD1`,f.NONE)||`''`,[s(n)[0]+` + `+s(e)[0],f.ADDITION];default:n=Array(e.itemCount_);for(let r=0;r<e.itemCount_;r++)n[r]=t.valueToCode(e,`ADD`+r,f.NONE)||`''`;return[`[`+n.join(`,`)+`].join('')`,f.FUNCTION_CALL]}},text_length:function(e,t){return[(t.valueToCode(e,`VALUE`,f.MEMBER)||`''`)+`.length`,f.MEMBER]},text_print:function(e,t){return`window.alert(`+(t.valueToCode(e,`TEXT`,f.NONE)||`''`)+`);
`}};b.text_prompt=l,b.text_prompt_ext=l,b.text_replace=function(e,t){var n=t.valueToCode(e,`TEXT`,f.NONE)||`''`,r=t.valueToCode(e,`FROM`,f.NONE)||`''`;return e=t.valueToCode(e,`TO`,f.NONE)||`''`,[t.provideFunction_(`textReplace`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(haystack, needle, replacement) {
  needle = needle.replace(/([-()\\[\\]{}+?*.$\\^|,:#<!\\\\])/g, '\\\\$1')
                 .replace(/\\x08/g, '\\\\x08');
  return haystack.replace(new RegExp(needle, 'g'), replacement);
}
`)+`(`+n+`, `+r+`, `+e+`)`,f.FUNCTION_CALL]},b.text_reverse=function(e,t){return[(t.valueToCode(e,`TEXT`,f.MEMBER)||`''`)+`.split('').reverse().join('')`,f.FUNCTION_CALL]},b.text_trim=function(e,t){var n={LEFT:`.replace(/^[\\s\\xa0]+/, '')`,RIGHT:`.replace(/[\\s\\xa0]+$/, '')`,BOTH:`.trim()`}[e.getFieldValue(`MODE`)];return[(t.valueToCode(e,`TEXT`,f.MEMBER)||`''`)+n,f.FUNCTION_CALL]};var x={};x.variables_get=u,x.variables_set=d;var S={};S.variables_get_dynamic=u,S.variables_set_dynamic=d;var C=new m,w=Object.assign({},{lists_create_empty:function(){return[`[]`,f.ATOMIC]},lists_create_with:function(e,t){var n=Array(e.itemCount_);for(let r=0;r<e.itemCount_;r++)n[r]=t.valueToCode(e,`ADD`+r,f.NONE)||`null`;return[`[`+n.join(`, `)+`]`,f.ATOMIC]},lists_getIndex:function(e,t){var n=e.getFieldValue(`MODE`)||`GET`,r=e.getFieldValue(`WHERE`)||`FROM_START`,i=t.valueToCode(e,`VALUE`,r===`RANDOM`?f.NONE:f.MEMBER)||`[]`;switch(r){case`FIRST`:if(n===`GET`)return[i+`[0]`,f.MEMBER];if(n===`GET_REMOVE`)return[i+`.shift()`,f.MEMBER];if(n===`REMOVE`)return i+`.shift();
`;break;case`LAST`:if(n===`GET`)return[i+`.slice(-1)[0]`,f.MEMBER];if(n===`GET_REMOVE`)return[i+`.pop()`,f.MEMBER];if(n===`REMOVE`)return i+`.pop();
`;break;case`FROM_START`:if(e=t.getAdjusted(e,`AT`),n===`GET`)return[i+`[`+e+`]`,f.MEMBER];if(n===`GET_REMOVE`)return[i+`.splice(`+e+`, 1)[0]`,f.FUNCTION_CALL];if(n===`REMOVE`)return i+`.splice(`+e+`, 1);
`;break;case`FROM_END`:if(e=t.getAdjusted(e,`AT`,1,!0),n===`GET`)return[i+`.slice(`+e+`)[0]`,f.FUNCTION_CALL];if(n===`GET_REMOVE`)return[i+`.splice(`+e+`, 1)[0]`,f.FUNCTION_CALL];if(n===`REMOVE`)return i+`.splice(`+e+`, 1);`;break;case`RANDOM`:if(i=t.provideFunction_(`listsGetRandomItem`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(list, remove) {
  var x = Math.floor(Math.random() * list.length);
  if (remove) {
    return list.splice(x, 1)[0];
  } else {
    return list[x];
  }
}
`)+`(`+i+`, `+(n!==`GET`)+`)`,n===`GET`||n===`GET_REMOVE`)return[i,f.FUNCTION_CALL];if(n===`REMOVE`)return i+`;
`}throw Error(`Unhandled combination (lists_getIndex).`)},lists_getSublist:function(e,t){var r={FIRST:`First`,LAST:`Last`,FROM_START:`FromStart`,FROM_END:`FromEnd`},i=t.valueToCode(e,`LIST`,f.MEMBER)||`[]`,a=e.getFieldValue(`WHERE1`),o=e.getFieldValue(`WHERE2`);if(a===`FIRST`&&o===`LAST`)i+=`.slice(0)`;else if(i.match(/^\w+$/)||a!==`FROM_END`&&o===`FROM_START`){switch(a){case`FROM_START`:r=t.getAdjusted(e,`AT1`);break;case`FROM_END`:r=t.getAdjusted(e,`AT1`,1,!1,f.SUBTRACTION),r=i+`.length - `+r;break;case`FIRST`:r=`0`;break;default:throw Error(`Unhandled option (lists_getSublist).`)}switch(o){case`FROM_START`:t=t.getAdjusted(e,`AT2`,1);break;case`FROM_END`:t=t.getAdjusted(e,`AT2`,0,!1,f.SUBTRACTION),t=i+`.length - `+t;break;case`LAST`:t=i+`.length`;break;default:throw Error(`Unhandled option (lists_getSublist).`)}i=i+`.slice(`+r+`, `+t+`)`}else{let s=t.getAdjusted(e,`AT1`);e=t.getAdjusted(e,`AT2`),i=t.provideFunction_(`subsequence`+r[a]+r[o],`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(sequence${a===`FROM_END`||a===`FROM_START`?`, at1`:``}${o===`FROM_END`||o===`FROM_START`?`, at2`:``}) {
  var start = ${n(`sequence`,a,`at1`)};
  var end = ${n(`sequence`,o,`at2`)} + 1;
  return sequence.slice(start, end);
}
`)+`(`+i+(a===`FROM_END`||a===`FROM_START`?`, `+s:``)+(o===`FROM_END`||o===`FROM_START`?`, `+e:``)+`)`}return[i,f.FUNCTION_CALL]},lists_indexOf:function(e,t){var n=e.getFieldValue(`END`)===`FIRST`?`indexOf`:`lastIndexOf`,r=t.valueToCode(e,`FIND`,f.NONE)||`''`;return t=(t.valueToCode(e,`VALUE`,f.MEMBER)||`[]`)+`.`+n+`(`+r+`)`,e.workspace.options.oneBasedIndex?[t+` + 1`,f.ADDITION]:[t,f.FUNCTION_CALL]},lists_isEmpty:function(e,t){return[`!`+(t.valueToCode(e,`VALUE`,f.MEMBER)||`[]`)+`.length`,f.LOGICAL_NOT]},lists_length:function(e,t){return[(t.valueToCode(e,`VALUE`,f.MEMBER)||`[]`)+`.length`,f.MEMBER]},lists_repeat:function(e,t){var n=t.provideFunction_(`listsRepeat`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(value, n) {
  var array = [];
  for (var i = 0; i < n; i++) {
    array[i] = value;
  }
  return array;
}
`),r=t.valueToCode(e,`ITEM`,f.NONE)||`null`;return e=t.valueToCode(e,`NUM`,f.NONE)||`0`,[n+`(`+r+`, `+e+`)`,f.FUNCTION_CALL]},lists_reverse:function(e,t){return[(t.valueToCode(e,`LIST`,f.FUNCTION_CALL)||`[]`)+`.slice().reverse()`,f.FUNCTION_CALL]},lists_setIndex:function(e,n){function r(){if(i.match(/^\w+$/))return``;var e=n.nameDB_.getDistinctName(`tmpList`,t.P.VARIABLE),r=`var `+e+` = `+i+`;
`;return i=e,r}var i=n.valueToCode(e,`LIST`,f.MEMBER)||`[]`,a=e.getFieldValue(`MODE`)||`GET`,o=e.getFieldValue(`WHERE`)||`FROM_START`,s=n.valueToCode(e,`TO`,f.ASSIGNMENT)||`null`;switch(o){case`FIRST`:if(a===`SET`)return i+`[0] = `+s+`;
`;if(a===`INSERT`)return i+`.unshift(`+s+`);
`;break;case`LAST`:if(a===`SET`)return r()+(i+`[`+i+`.length - 1] = `+s+`;
`);if(a===`INSERT`)return i+`.push(`+s+`);
`;break;case`FROM_START`:if(e=n.getAdjusted(e,`AT`),a===`SET`)return i+`[`+e+`] = `+s+`;
`;if(a===`INSERT`)return i+`.splice(`+e+`, 0, `+s+`);
`;break;case`FROM_END`:if(e=n.getAdjusted(e,`AT`,1,!1,f.SUBTRACTION),o=r(),a===`SET`)return o+(i+`[`+i+`.length - `+e+`] = `+s+`;
`);if(a===`INSERT`)return o+(i+`.splice(`+i+`.length - `+e+`, 0, `+s+`);
`);break;case`RANDOM`:if(e=r(),o=n.nameDB_.getDistinctName(`tmpX`,t.P.VARIABLE),e+=`var `+o+` = Math.floor(Math.random() * `+i+`.length);
`,a===`SET`)return e+(i+`[`+o+`] = `+s+`;
`);if(a===`INSERT`)return e+(i+`.splice(`+o+`, 0, `+s+`);
`)}throw Error(`Unhandled combination (lists_setIndex).`)},lists_sort:function(e,t){var n=t.valueToCode(e,`LIST`,f.FUNCTION_CALL)||`[]`,r=e.getFieldValue(`DIRECTION`)===`1`?1:-1;return e=e.getFieldValue(`TYPE`),t=t.provideFunction_(`listsGetSortCompare`,`
function ${t.FUNCTION_NAME_PLACEHOLDER_}(type, direction) {
  var compareFuncs = {
    'NUMERIC': function(a, b) {
        return Number(a) - Number(b); },
    'TEXT': function(a, b) {
        return String(a) > String(b) ? 1 : -1; },
    'IGNORE_CASE': function(a, b) {
        return String(a).toLowerCase() > String(b).toLowerCase() ? 1 : -1; },
  };
  var compare = compareFuncs[type];
  return function(a, b) { return compare(a, b) * direction; };
}
      `),[n+`.slice().sort(`+t+`("`+e+`", `+r+`))`,f.FUNCTION_CALL]},lists_split:function(e,t){var n=t.valueToCode(e,`INPUT`,f.MEMBER);if(t=t.valueToCode(e,`DELIM`,f.NONE)||`''`,e=e.getFieldValue(`MODE`),e===`SPLIT`)n||=`''`,e=`split`;else if(e===`JOIN`)n||=`[]`,e=`join`;else throw Error(`Unknown mode: `+e);return[n+`.`+e+`(`+t+`)`,f.FUNCTION_CALL]}},h,g,_,v,b,x,S);for(let e in w)C.forBlock[e]=w[e];var T={};return T.JavascriptGenerator=m,T.Order=f,T.javascriptGenerator=C,t.__chunk_javascript=T,t.__chunk_javascript.__namespace__=t,t.__chunk_javascript})}))(),1).default;export{a as n,i as t};