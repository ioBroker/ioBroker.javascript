(()=>{var M={56046:()=>{}},G={};function e(a){var l=G[a];if(l!==void 0)return l.exports;var i=G[a]={id:a,loaded:!1,exports:{}};return M[a].call(i.exports,i,i.exports,e),i.loaded=!0,i.exports}e.m=M,e.c=G,e.amdD=function(){throw new Error("define cannot be used indirect")},e.n=a=>{var l=a&&a.__esModule?()=>a.default:()=>a;return e.d(l,{a:l}),l},e.d=(a,l)=>{for(var i in l)e.o(l,i)&&!e.o(a,i)&&Object.defineProperty(a,i,{enumerable:!0,get:l[i]})},e.f={},e.e=a=>Promise.all(Object.keys(e.f).reduce((l,i)=>(e.f[i](a,l),l),[])),e.u=a=>"static/js/"+a+"."+{"vendors-node_modules_mui_material_styles_styled_js":"88505a8c","vendors-node_modules_emotion_react_dist_emotion-element-5486c51c_browser_esm_js-node_modules_-642cbe":"73938178","vendors-node_modules_mui_material_styles_ThemeProvider_js":"a5c18e58","vendors-node_modules_react-color_es_index_js-node_modules_react-icons_lib_index_mjs":"d66af36b","vendors-node_modules_iobroker_adapter-react-v5_index_js-node_modules_iobroker_adapter-react-v-de88f8":"89fdd5af",webpack_sharing_consume_default_react_react:"9749d585","webpack_sharing_consume_default_prop-types_prop-types":"0e28b347","webpack_sharing_consume_default_mui_icons-material_mui_icons-material-webpack_sharing_consume-80e7de":"a1919016",webpack_sharing_consume_default_mui_material_mui_material:"a8c21b37","node_modules_iobroker_adapter-react-v5_assets_devices_sync_recursive_-node_modules_iobroker_a-2a94c9":"a7694f32","vendors-node_modules_mui_material_FilledInput_FilledInput_js":"d25ba5f8","vendors-node_modules_iobroker_json-config_build_index_js":"f1bc6a0d","webpack_sharing_consume_default_react-dom_react-dom":"1f2f2a35","webpack_sharing_consume_default_iobroker_adapter-react-v5_iobroker_adapter-react-v5-webpack_s-c8c16a":"62497ceb","webpack_sharing_consume_default_react-ace_react-ace":"1facb5dd","node_modules_mui_styled-engine_GlobalStyles_GlobalStyles_js-node_modules_mui_system_useThemeW-ca1f79":"e4f8c64f","vendors-node_modules_mui_icons-material_esm_index_js":"6444139b","vendors-node_modules_mui_material_Button_Button_js-node_modules_mui_material_Chip_Chip_js-nod-9c86d7":"b84b9078","vendors-node_modules_mui_material_index_js":"ae51d320","node_modules_mui_styled-engine_GlobalStyles_GlobalStyles_js-node_modules_mui_system_useThemeW-fb3b790":"6481e809","vendors-node_modules_mui_x-date-pickers_index_js":"127acf37","node_modules_mui_styled-engine_GlobalStyles_GlobalStyles_js-node_modules_mui_system_useThemeW-fb3b791":"a621e253","vendors-node_modules_date-fns_locale_mjs":"8db70a83","node_modules_date-fns_locale_en-US_mjs-node_modules_date-fns_startOfWeek_mjs":"a6caf466","vendors-node_modules_leaflet_dist_leaflet-src_js":"387b6edc","node_modules_prop-types_index_js":"7e14cd38","vendors-node_modules_react-ace_lib_index_js":"d131cf1a","vendors-node_modules_react-dom_index_js":"fbaeb7bd","vendors-node_modules_react-dropzone_dist_es_index_js":"6e3751cc",node_modules_react_index_js:"ca0c923d","node_modules_iobroker_adapter-react-v5_assets_devices_sync_recursive_-node_modules_iobroker_a-673682":"5785d994","vendors-node_modules_react-qr-code_lib_index_js":"4bf0d163"}[a]+".chunk.js",e.miniCssF=a=>{},e.g=function(){if(typeof globalThis=="object")return globalThis;try{return this||new Function("return this")()}catch(a){if(typeof window=="object")return window}}(),e.o=(a,l)=>Object.prototype.hasOwnProperty.call(a,l),(()=>{var a={},l="iobroker-admin-component-backitup:";e.l=(i,u,v,p)=>{if(a[i]){a[i].push(u);return}var m,k;if(v!==void 0)for(var c=document.getElementsByTagName("script"),w=0;w<c.length;w++){var f=c[w];if(f.getAttribute("src")==i||f.getAttribute("data-webpack")==l+v){m=f;break}}m||(k=!0,m=document.createElement("script"),m.charset="utf-8",m.timeout=120,e.nc&&m.setAttribute("nonce",e.nc),m.setAttribute("data-webpack",l+v),m.src=i),a[i]=[u];var h=(S,x)=>{m.onerror=m.onload=null,clearTimeout(j);var y=a[i];if(delete a[i],m.parentNode&&m.parentNode.removeChild(m),y&&y.forEach(b=>b(x)),S)return S(x)},j=setTimeout(h.bind(null,void 0,{type:"timeout",target:m}),12e4);m.onerror=h.bind(null,m.onerror),m.onload=h.bind(null,m.onload),k&&document.head.appendChild(m)}})(),e.r=a=>{typeof Symbol!="undefined"&&Symbol.toStringTag&&Object.defineProperty(a,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(a,"__esModule",{value:!0})},e.nmd=a=>(a.paths=[],a.children||(a.children=[]),a),(()=>{e.S={};var a={},l={};e.I=(i,u)=>{u||(u=[]);var v=l[i];if(v||(v=l[i]={}),!(u.indexOf(v)>=0)){if(u.push(v),a[i])return a[i];e.o(e.S,i)||(e.S[i]={});var p=e.S[i],m=h=>{typeof console!="undefined"&&console.warn&&console.warn(h)},k="iobroker-admin-component-backitup",c=(h,j,S,x)=>{var y=p[h]=p[h]||{},b=y[j];(!b||!b.loaded&&(!x!=!b.eager?x:k>b.from))&&(y[j]={get:S,from:k,eager:!!x})},w=h=>{var j=b=>m("Initialization of sharing external failed: "+b);try{var S=e(h);if(!S)return;var x=b=>b&&b.init&&b.init(e.S[i],u);if(S.then)return f.push(S.then(x,j));var y=x(S);if(y&&y.then)return f.push(y.catch(j))}catch(b){j(b)}},f=[];switch(i){case"default":c("@iobroker/adapter-react-v5","7.0.1",()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_emotion_react_dist_emotion-element-5486c51c_browser_esm_js-node_modules_-642cbe"),e.e("vendors-node_modules_mui_material_styles_ThemeProvider_js"),e.e("vendors-node_modules_react-color_es_index_js-node_modules_react-icons_lib_index_mjs"),e.e("vendors-node_modules_iobroker_adapter-react-v5_index_js-node_modules_iobroker_adapter-react-v-de88f8"),e.e("webpack_sharing_consume_default_react_react"),e.e("webpack_sharing_consume_default_prop-types_prop-types"),e.e("webpack_sharing_consume_default_mui_icons-material_mui_icons-material-webpack_sharing_consume-80e7de"),e.e("webpack_sharing_consume_default_mui_material_mui_material"),e.e("node_modules_iobroker_adapter-react-v5_assets_devices_sync_recursive_-node_modules_iobroker_a-2a94c9")]).then(()=>()=>e(64620))),c("@iobroker/json-config","7.1.0",()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_emotion_react_dist_emotion-element-5486c51c_browser_esm_js-node_modules_-642cbe"),e.e("vendors-node_modules_mui_material_FilledInput_FilledInput_js"),e.e("vendors-node_modules_react-color_es_index_js-node_modules_react-icons_lib_index_mjs"),e.e("vendors-node_modules_iobroker_json-config_build_index_js"),e.e("webpack_sharing_consume_default_react_react"),e.e("webpack_sharing_consume_default_prop-types_prop-types"),e.e("webpack_sharing_consume_default_react-dom_react-dom"),e.e("webpack_sharing_consume_default_mui_icons-material_mui_icons-material-webpack_sharing_consume-80e7de"),e.e("webpack_sharing_consume_default_mui_material_mui_material"),e.e("webpack_sharing_consume_default_iobroker_adapter-react-v5_iobroker_adapter-react-v5-webpack_s-c8c16a"),e.e("webpack_sharing_consume_default_react-ace_react-ace"),e.e("node_modules_mui_styled-engine_GlobalStyles_GlobalStyles_js-node_modules_mui_system_useThemeW-ca1f79")]).then(()=>()=>e(93488))),c("@mui/icons-material","6.0.2",()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_emotion_react_dist_emotion-element-5486c51c_browser_esm_js-node_modules_-642cbe"),e.e("vendors-node_modules_mui_icons-material_esm_index_js"),e.e("webpack_sharing_consume_default_react_react"),e.e("webpack_sharing_consume_default_prop-types_prop-types")]).then(()=>()=>e(61636))),c("@mui/material","6.0.2",()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_emotion_react_dist_emotion-element-5486c51c_browser_esm_js-node_modules_-642cbe"),e.e("vendors-node_modules_mui_material_FilledInput_FilledInput_js"),e.e("vendors-node_modules_mui_material_styles_ThemeProvider_js"),e.e("vendors-node_modules_mui_material_Button_Button_js-node_modules_mui_material_Chip_Chip_js-nod-9c86d7"),e.e("vendors-node_modules_mui_material_index_js"),e.e("webpack_sharing_consume_default_react_react"),e.e("webpack_sharing_consume_default_prop-types_prop-types"),e.e("webpack_sharing_consume_default_react-dom_react-dom"),e.e("node_modules_mui_styled-engine_GlobalStyles_GlobalStyles_js-node_modules_mui_system_useThemeW-fb3b790")]).then(()=>()=>e(24224))),c("@mui/x-date-pickers","7.16.0",()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_emotion_react_dist_emotion-element-5486c51c_browser_esm_js-node_modules_-642cbe"),e.e("vendors-node_modules_mui_material_FilledInput_FilledInput_js"),e.e("vendors-node_modules_mui_material_Button_Button_js-node_modules_mui_material_Chip_Chip_js-nod-9c86d7"),e.e("vendors-node_modules_mui_x-date-pickers_index_js"),e.e("webpack_sharing_consume_default_react_react"),e.e("webpack_sharing_consume_default_prop-types_prop-types"),e.e("webpack_sharing_consume_default_react-dom_react-dom"),e.e("node_modules_mui_styled-engine_GlobalStyles_GlobalStyles_js-node_modules_mui_system_useThemeW-fb3b791")]).then(()=>()=>e(21412))),c("date-fns/locale","3.6.0",()=>Promise.all([e.e("vendors-node_modules_date-fns_locale_mjs"),e.e("node_modules_date-fns_locale_en-US_mjs-node_modules_date-fns_startOfWeek_mjs")]).then(()=>()=>e(21402))),c("leaflet","1.9.4",()=>e.e("vendors-node_modules_leaflet_dist_leaflet-src_js").then(()=>()=>e(84067))),c("prop-types","15.8.1",()=>e.e("node_modules_prop-types_index_js").then(()=>()=>e(75826))),c("react-ace","12.0.0",()=>Promise.all([e.e("vendors-node_modules_react-ace_lib_index_js"),e.e("webpack_sharing_consume_default_react_react"),e.e("webpack_sharing_consume_default_prop-types_prop-types")]).then(()=>()=>e(76216))),c("react-dom","18.3.1",()=>Promise.all([e.e("vendors-node_modules_react-dom_index_js"),e.e("webpack_sharing_consume_default_react_react")]).then(()=>()=>e(22483))),c("react-dropzone","14.2.3",()=>Promise.all([e.e("vendors-node_modules_react-dropzone_dist_es_index_js"),e.e("webpack_sharing_consume_default_react_react"),e.e("webpack_sharing_consume_default_prop-types_prop-types")]).then(()=>()=>e(72589))),c("react","18.3.1",()=>e.e("node_modules_react_index_js").then(()=>()=>e(77810)));break}return f.length?a[i]=Promise.all(f).then(()=>a[i]=1):a[i]=1}}})(),(()=>{var a;e.g.importScripts&&(a=e.g.location+"");var l=e.g.document;if(!a&&l&&(l.currentScript&&l.currentScript.tagName.toUpperCase()==="SCRIPT"&&(a=l.currentScript.src),!a)){var i=l.getElementsByTagName("script");if(i.length)for(var u=i.length-1;u>-1&&(!a||!/^http(s?):/.test(a));)a=i[u--].src}if(!a)throw new Error("Automatic publicPath is not supported in this browser");a=a.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),e.p=a+"../../"})(),(()=>{var a=r=>{var o=s=>s.split(".").map(t=>+t==t?+t:t),_=/^([^-+]+)?(?:-([^+]+))?(?:\+(.+))?$/.exec(r),n=_[1]?o(_[1]):[];return _[2]&&(n.length++,n.push.apply(n,o(_[2]))),_[3]&&(n.push([]),n.push.apply(n,o(_[3]))),n},l=(r,o)=>{r=a(r),o=a(o);for(var _=0;;){if(_>=r.length)return _<o.length&&(typeof o[_])[0]!="u";var n=r[_],s=(typeof n)[0];if(_>=o.length)return s=="u";var t=o[_],d=(typeof t)[0];if(s!=d)return s=="o"&&d=="n"||d=="s"||s=="u";if(s!="o"&&s!="u"&&n!=t)return n<t;_++}},i=r=>{var o=r[0],_="";if(r.length===1)return"*";if(o+.5){_+=o==0?">=":o==-1?"<":o==1?"^":o==2?"~":o>0?"=":"!=";for(var n=1,s=1;s<r.length;s++)n--,_+=(typeof(d=r[s]))[0]=="u"?"-":(n>0?".":"")+(n=2,d);return _}var t=[];for(s=1;s<r.length;s++){var d=r[s];t.push(d===0?"not("+g()+")":d===1?"("+g()+" || "+g()+")":d===2?t.pop()+" "+t.pop():i(d))}return g();function g(){return t.pop().replace(/^\((.+)\)$/,"$1")}},u=(r,o)=>{if(0 in r){o=a(o);var _=r[0],n=_<0;n&&(_=-_-1);for(var s=0,t=1,d=!0;;t++,s++){var g,E,T=t<r.length?(typeof r[t])[0]:"";if(s>=o.length||(E=(typeof(g=o[s]))[0])=="o")return!d||(T=="u"?t>_&&!n:T==""!=n);if(E=="u"){if(!d||T!="u")return!1}else if(d)if(T==E)if(t<=_){if(g!=r[t])return!1}else{if(n?g>r[t]:g<r[t])return!1;g!=r[t]&&(d=!1)}else if(T!="s"&&T!="n"){if(n||t<=_)return!1;d=!1,t--}else{if(t<=_||E<T!=n)return!1;d=!1}else T!="s"&&T!="n"&&(d=!1,t--)}}var B=[],C=B.pop.bind(B);for(s=1;s<r.length;s++){var F=r[s];B.push(F==1?C()|C():F==2?C()&C():F?u(F,o):!C())}return!!C()},v=(r,o)=>r&&e.o(r,o),p=r=>(r.loaded=1,r.get()),m=r=>Object.keys(r).reduce((o,_)=>(r[_].eager&&(o[_]=r[_]),o),{}),k=(r,s,_)=>{var n=_?m(r[s]):r[s],s=Object.keys(n).reduce((t,d)=>!t||l(t,d)?d:t,0);return s&&n[s]},c=(r,t,_,n)=>{var s=n?m(r[t]):r[t],t=Object.keys(s).reduce((d,g)=>u(_,g)&&(!d||l(d,g))?g:d,0);return t&&s[t]},w=(r,o,_)=>{var n=_?m(r[o]):r[o];return Object.keys(n).reduce((s,t)=>!s||!n[s].loaded&&l(s,t)?t:s,0)},f=(r,o,_,n)=>"Unsatisfied version "+_+" from "+(_&&r[o][_].from)+" of shared singleton module "+o+" (required "+i(n)+")",h=(r,o,_,n,s)=>{var t=r[_];return"No satisfying version ("+i(n)+")"+(s?" for eager consumption":"")+" of shared module "+_+" found in shared scope "+o+`.
Available versions: `+Object.keys(t).map(d=>d+" from "+t[d].from).join(", ")},j=r=>{throw new Error(r)},S=(r,o)=>j("Shared module "+o+" doesn't exist in shared scope "+r),x=r=>{typeof console!="undefined"&&console.warn&&console.warn(r)},y=r=>function(o,_,n,s,t){var d=e.I(o);return d&&d.then&&!n?d.then(r.bind(r,o,e.S[o],_,!1,s,t)):r(o,e.S[o],_,n,s,t)},b=(r,o,_)=>_?_():S(r,o),$=y((r,o,_,n,s)=>v(o,_)?p(k(o,_,n)):b(r,_,s)),z=y((r,o,_,n,s,t)=>{if(!v(o,_))return b(r,_,t);var d=c(o,_,s,n);return d?p(d):(x(h(o,r,_,s,n)),p(k(o,_,n)))}),U=y((r,o,_,n,s,t)=>{if(!v(o,_))return b(r,_,t);var d=c(o,_,s,n);if(d)return p(d);if(t)return t();j(h(o,r,_,s,n))}),L=y((r,o,_,n,s)=>{if(!v(o,_))return b(r,_,s);var t=w(o,_,n);return p(o[_][t])}),P=y((r,o,_,n,s,t)=>{if(!v(o,_))return b(r,_,t);var d=w(o,_,n);return u(s,d)||x(f(o,_,d,s)),p(o[_][d])}),D=y((r,o,_,n,s,t)=>{if(!v(o,_))return b(r,_,t);var d=w(o,_,n);return u(s,d)||j(f(o,_,d,s)),p(o[_][d])}),O={},A={28437:()=>P("default","react",!1,[0],()=>e.e("node_modules_react_index_js").then(()=>()=>e(77810))),95973:()=>P("default","prop-types",!1,[0],()=>e.e("node_modules_prop-types_index_js").then(()=>()=>e(75826))),21839:()=>P("default","@mui/icons-material",!1,[0],()=>e.e("vendors-node_modules_mui_icons-material_esm_index_js").then(()=>()=>e(61636))),53683:()=>P("default","react-dropzone",!1,[0],()=>e.e("vendors-node_modules_react-dropzone_dist_es_index_js").then(()=>()=>e(72589))),67085:()=>P("default","@mui/material",!1,[0],()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_mui_material_FilledInput_FilledInput_js"),e.e("vendors-node_modules_mui_material_styles_ThemeProvider_js"),e.e("vendors-node_modules_mui_material_Button_Button_js-node_modules_mui_material_Chip_Chip_js-nod-9c86d7"),e.e("vendors-node_modules_mui_material_index_js"),e.e("webpack_sharing_consume_default_react-dom_react-dom")]).then(()=>()=>e(24224))),23479:()=>P("default","react-dom",!1,[0],()=>e.e("vendors-node_modules_react-dom_index_js").then(()=>()=>e(22483))),37449:()=>P("default","@iobroker/adapter-react-v5",!1,[0],()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_mui_material_styles_ThemeProvider_js"),e.e("vendors-node_modules_react-color_es_index_js-node_modules_react-icons_lib_index_mjs"),e.e("vendors-node_modules_iobroker_adapter-react-v5_index_js-node_modules_iobroker_adapter-react-v-de88f8"),e.e("webpack_sharing_consume_default_mui_icons-material_mui_icons-material-webpack_sharing_consume-80e7de"),e.e("node_modules_iobroker_adapter-react-v5_assets_devices_sync_recursive_-node_modules_iobroker_a-673682")]).then(()=>()=>e(64620))),28497:()=>P("default","@mui/x-date-pickers",!1,[0],()=>Promise.all([e.e("vendors-node_modules_mui_material_styles_styled_js"),e.e("vendors-node_modules_mui_material_FilledInput_FilledInput_js"),e.e("vendors-node_modules_mui_material_Button_Button_js-node_modules_mui_material_Chip_Chip_js-nod-9c86d7"),e.e("vendors-node_modules_mui_x-date-pickers_index_js")]).then(()=>()=>e(21412))),58093:()=>P("default","react-ace",!1,[0],()=>e.e("vendors-node_modules_react-ace_lib_index_js").then(()=>()=>e(76216)))},V={webpack_sharing_consume_default_react_react:[28437],"webpack_sharing_consume_default_prop-types_prop-types":[95973],"webpack_sharing_consume_default_mui_icons-material_mui_icons-material-webpack_sharing_consume-80e7de":[21839,53683],webpack_sharing_consume_default_mui_material_mui_material:[67085],"webpack_sharing_consume_default_react-dom_react-dom":[23479],"webpack_sharing_consume_default_iobroker_adapter-react-v5_iobroker_adapter-react-v5-webpack_s-c8c16a":[37449,28497],"webpack_sharing_consume_default_react-ace_react-ace":[58093]},W={};e.f.consumes=(r,o)=>{e.o(V,r)&&V[r].forEach(_=>{if(e.o(O,_))return o.push(O[_]);if(!W[_]){var n=d=>{O[_]=0,e.m[_]=g=>{delete e.c[_],g.exports=d()}};W[_]=!0;var s=d=>{delete O[_],e.m[_]=g=>{throw delete e.c[_],d}};try{var t=A[_]();t.then?o.push(O[_]=t.then(n).catch(s)):n(t)}catch(d){s(d)}}})}})(),(()=>{var a={main:0};e.f.j=(u,v)=>{var p=e.o(a,u)?a[u]:void 0;if(p!==0)if(p)v.push(p[2]);else if(/^webpack_sharing_consume_default_(mui_(icons\-material_mui_icons\-material\-webpack_sharing_consume\-80e7de|material_mui_material)|react(\-ace_react\-ace|\-dom_react\-dom|_react)|iobroker_adapter\-react\-v5_iobroker_adapter\-react\-v5\-webpack_s\-c8c16a|prop\-types_prop\-types)$/.test(u))a[u]=0;else{var m=new Promise((f,h)=>p=a[u]=[f,h]);v.push(p[2]=m);var k=e.p+e.u(u),c=new Error,w=f=>{if(e.o(a,u)&&(p=a[u],p!==0&&(a[u]=void 0),p)){var h=f&&(f.type==="load"?"missing":f.type),j=f&&f.target&&f.target.src;c.message="Loading chunk "+u+` failed.
(`+h+": "+j+")",c.name="ChunkLoadError",c.type=h,c.request=j,p[1](c)}};e.l(k,w,"chunk-"+u,u)}};var l=(u,v)=>{var p=v[0],m=v[1],k=v[2],c,w,f=0;if(p.some(j=>a[j]!==0)){for(c in m)e.o(m,c)&&(e.m[c]=m[c]);if(k)var h=k(e)}for(u&&u(v);f<p.length;f++)w=p[f],e.o(a,w)&&a[w]&&a[w][0](),a[w]=0},i=self.webpackChunkiobroker_admin_component_backitup=self.webpackChunkiobroker_admin_component_backitup||[];i.forEach(l.bind(null,0)),i.push=l.bind(null,i.push.bind(i))})(),e.nc=void 0;var I=e(56046)})();

//# sourceMappingURL=main.6c445cf7.js.map