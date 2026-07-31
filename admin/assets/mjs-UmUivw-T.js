import{t as e}from"./rolldown-runtime-DAXXjFlN.js";import{Hn as t,Qn as n,Un as r,Xn as i,Zn as a,cr as o,fr as s,pr as c,rr as l,vr as u}from"./_virtual_mf___mfe_internal__iobroker_javascript__mf_owner__1__loadShare___mf_0_iobroker_mf_1_gui_mf_2_components__loadShare__.js-GyvEEKgN.js";var d=e((e=>{var t=60103,n=60106,r=60107,i=60108,a=60114,o=60109,s=60110,c=60112,l=60113,u=60120,d=60115,f=60116;if(typeof Symbol==`function`&&Symbol.for){var p=Symbol.for;t=p(`react.element`),n=p(`react.portal`),r=p(`react.fragment`),i=p(`react.strict_mode`),a=p(`react.profiler`),o=p(`react.provider`),s=p(`react.context`),c=p(`react.forward_ref`),l=p(`react.suspense`),u=p(`react.suspense_list`),d=p(`react.memo`),f=p(`react.lazy`),p(`react.block`),p(`react.server.block`),p(`react.fundamental`),p(`react.debug_trace_mode`),p(`react.legacy_hidden`)}function m(e){if(typeof e==`object`&&e){var p=e.$$typeof;switch(p){case t:switch(e=e.type,e){case r:case a:case i:case l:case u:return e;default:switch(e&&=e.$$typeof,e){case s:case c:case f:case d:case o:return e;default:return p}}case n:return p}}}e.isFragment=function(e){return m(e)===r}})),f=e(((e,t)=>{t.exports=d()}));u();var p=f();function m(e,t){let n=getComputedStyle(t);if(!n)return;let r=e===S.Horizontal?t.clientWidth:t.clientHeight;return r===0?void 0:(e===S.Horizontal?r-=parseFloat(n.paddingLeft)+parseFloat(n.paddingRight):r-=parseFloat(n.paddingTop)+parseFloat(n.paddingBottom),r)}function h(e,t,n=[],r={condition:!0}){let{condition:i}=r,a=function(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols==`function`){var i=0;for(r=Object.getOwnPropertySymbols(e);i<r.length;i++)t.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(e,r[i])&&(n[r[i]]=e[r[i]])}return n}(r,[`condition`]);o((()=>(i&&window.addEventListener(e,t,a),()=>{i&&window.removeEventListener(e,t)})),[e,t,i,...n])}(function(e,t){t===void 0&&(t={});var n=t.insertAt;if(e&&typeof document<`u`){var r=document.head||document.getElementsByTagName(`head`)[0],i=document.createElement(`style`);i.type=`text/css`,n===`top`&&r.firstChild?r.insertBefore(i,r.firstChild):r.appendChild(i),i.styleSheet?i.styleSheet.cssText=e:i.appendChild(document.createTextNode(e))}})(`/* === Main Container === */
.__dbk__container {
  height: 100%;
  width: 100%;

  display: flex;
  overflow: hidden;
}

.__dbk__container.Horizontal {
  flex-direction: row;
}

.__dbk__container.Vertical {
  flex-direction: column;
}
/* ====== */

/* === Wrapper for each child element === */
.__dbk__child-wrapper {
  height: 100%;
  width: 100%;
}
/* ====== */

/* === Gutter === */
.__dbk__gutter {
  display: flex;
  align-items: center;
  justify-content: center;
}
/* .__dbk__gutter > div {
  background: red;
} */
.__dbk__gutter.Horizontal {
  height: 100%;
  padding: 0 2px;
  flex-direction: column;
}
.__dbk__gutter.Horizontal:hover {
  cursor: col-resize;
}

.__dbk__gutter.Vertical {
  width: 100%;
  padding: 2px 0;
  flex-direction: row;
}
.__dbk__gutter.Vertical:hover {
  cursor: row-resize;
}

.__dbk__gutter.Light {
  background: #EDF0EF;
}
.__dbk__gutter.Light:hover > .__dbk__dragger {
  background: #76747B;
}

.__dbk__gutter.Dark {
  background: #020203;
}
.__dbk__gutter.Dark:hover > .__dbk__dragger {
  background: #9995A3;
}
/* ====== */

/* === Gutter's Dragger === */
.__dbk__dragger {
  border-radius: 2px;
}

.__dbk__dragger.Horizontal {
  width: 4px;
  height: 24px;  
}

.__dbk__dragger.Vertical {
  width: 24px;
  height: 4px;  
}

.__dbk__dragger.Light {
  background: #A6ACB5;
}

.__dbk__dragger.Dark {
  background: #434252;
}
/* ====== */`);var g=i.forwardRef((({className:e,theme:n,draggerClassName:r,direction:i=S.Vertical,onDragging:a},o)=>{let s=`__dbk__gutter ${i} ${e||n}`,c=`__dbk__dragger ${i} ${r||n}`;return t(`div`,Object.assign({className:s,ref:o,dir:i,onMouseDown:a,onTouchStart:w?a:void 0},{children:t(`div`,{className:c},void 0)}),void 0)})),_;function v(e,t,n){let r,i;return t?(r=e/2,i=e):n?(r=e,i=e/2):(r=e,i=e),{aGutterSize:r,bGutterSize:i}}function y(e,t){switch(t.type){case _.SetIsReadyToCompute:return Object.assign(Object.assign({},e),{isReady:t.payload.isReady});case _.CreatePairs:{let{direction:n,children:r,gutters:i}=t.payload,a=r[0].parentNode;if(!a)throw Error(`Cannot create pairs - parent is undefined.`);let o=m(n,a);if(o===void 0)throw Error(`Cannot create pairs - parent has undefined or zero size: ${o}.`);let s=[];return r.forEach(((e,t)=>{if(t>0){let e=r[t-1],o=r[t],c=i[t-1],l=n===S.Horizontal?e.getBoundingClientRect().left:e.getBoundingClientRect().top,u=n===S.Horizontal?o.getBoundingClientRect().right:o.getBoundingClientRect().bottom,d=n===S.Horizontal?e.getBoundingClientRect().width+c.getBoundingClientRect().width+o.getBoundingClientRect().width:e.getBoundingClientRect().height+c.getBoundingClientRect().height+o.getBoundingClientRect().height,f=n===S.Horizontal?c.getBoundingClientRect().width:c.getBoundingClientRect().height,p={idx:t-1,a:e,b:o,gutter:c,parent:a,start:l,end:u,size:d,gutterSize:f,aSizePct:100/r.length,bSizePct:100/r.length};s.push(p)}})),Object.assign(Object.assign({},e),{pairs:s})}case _.StartDragging:{let{gutterIdx:n}=t.payload;return Object.assign(Object.assign({},e),{isDragging:!0,draggingIdx:n})}case _.StopDragging:return Object.assign(Object.assign({},e),{isDragging:!1});case _.CalculateSizes:{let{direction:n,gutterIdx:r}=t.payload,i=e.pairs[r],a=m(n,i.parent);if(!a)throw Error(`Cannot calculate sizes - 'pair.parent' has undefined or zero size.`);let o=i.gutter[n===S.Horizontal?`clientWidth`:`clientHeight`],{aGutterSize:s,bGutterSize:c}=v(o,r===0,r===e.pairs.length-1),l,u,d,f,p;return n===S.Horizontal?(l=i.a.getBoundingClientRect().left,u=i.b.getBoundingClientRect().right,f=(i.a.getBoundingClientRect().width+s)/a*100,p=(i.b.getBoundingClientRect().width+c)/a*100,d=i.a.getBoundingClientRect().width+s+c+i.b.getBoundingClientRect().width):(l=i.a.getBoundingClientRect().top,u=i.b.getBoundingClientRect().bottom,f=(i.a.getBoundingClientRect().height+s)/a*100,p=(i.b.getBoundingClientRect().height+c)/a*100,d=i.a.getBoundingClientRect().height+s+c+i.b.getBoundingClientRect().height),e.pairs[r]=Object.assign(Object.assign({},i),{start:l,end:u,size:d,aSizePct:f,bSizePct:p,gutterSize:o}),Object.assign({},e)}default:return e}}function b(e,t=0,r=[]){return a.toArray(e).reduce(((e,i,a)=>((0,p.isFragment)(i)?e.push.apply(e,b(i.props.children,t+1,r.concat(i.key||a))):l(i)?e.push(n(i,{key:r.concat(String(i.key)).join(`.`)})):typeof i!=`string`&&typeof i!=`number`||e.push(i),e)),[])}(function(e){e[e.SetIsReadyToCompute=0]=`SetIsReadyToCompute`,e[e.CreatePairs=1]=`CreatePairs`,e[e.CalculateSizes=2]=`CalculateSizes`,e[e.StartDragging=3]=`StartDragging`,e[e.StopDragging=4]=`StopDragging`})(_||={});var x=e=>`changedTouches`in e,S,C;(function(e){e.Horizontal=`Horizontal`,e.Vertical=`Vertical`})(S||={}),function(e){e.Light=`Light`,e.Dark=`Dark`}(C||={});var w=typeof window<`u`&&`ontouchstart`in window;function T(e){return e===S.Horizontal?`col-resize`:`row-resize`}var E={isReady:!1,isDragging:!1,pairs:[]};function D({direction:e=S.Horizontal,minWidths:n=[],minHeights:a=[],initialSizes:l,gutterTheme:u=C.Dark,gutterClassName:d,draggerClassName:f,children:p,onResizeStarted:D,onResizeFinished:O,classes:k=[]}){let A=b(p),[j,M]=s(y,E),N=c(null),P=c([]),F=c([]);P.current=[],F.current=[];let I=i.useCallback((e=>{M({type:_.SetIsReadyToCompute,payload:{isReady:e}})}),[]),L=i.useCallback(((e,t)=>{M({type:_.StartDragging,payload:{gutterIdx:t}});let n=j.pairs[t];D==null||D(n.idx),n.a.style.userSelect=`none`,n.b.style.userSelect=`none`,n.gutter.style.cursor=T(e),n.parent.style.cursor=T(e),document.body.style.cursor=T(e)}),[j.pairs]),R=i.useCallback((()=>{M({type:_.StopDragging});let t=[];for(let n=0;n<j.pairs.length;n++){let r=j.pairs[n],i=m(e,r.parent);if(i===void 0)throw Error(`Cannot call the 'onResizeFinished' callback - parentSize is undefined`);if(r.gutterSize===void 0)throw Error(`Cannot call 'onResizeFinished' callback - gutterSize is undefined`);let a=n===0,o=n===j.pairs.length-1,s=r.a.getBoundingClientRect()[e===S.Horizontal?`width`:`height`],{aGutterSize:c,bGutterSize:l}=v(r.gutterSize,a,o),u=(s+c)/i*100;if(t.push(u),o){let n=(r.b.getBoundingClientRect()[e===S.Horizontal?`width`:`height`]+l)/i*100;t.push(n)}}if(j.draggingIdx===void 0)throw Error(`Could not reset cursor and user-select because 'state.draggingIdx' is undefined`);let n=j.pairs[j.draggingIdx];O==null||O(n.idx,t),n.a.style.userSelect=``,n.b.style.userSelect=``,n.gutter.style.cursor=``,n.parent.style.cursor=``,document.body.style.cursor=``}),[j.draggingIdx,j.pairs,e]),z=i.useCallback(((e,t)=>{M({type:_.CalculateSizes,payload:{direction:e,gutterIdx:t}})}),[]),B=i.useCallback(((e,t,n)=>{M({type:_.CreatePairs,payload:{direction:e,children:t,gutters:n}})}),[]),V=i.useCallback(((e,t,n,r)=>{let i=t[0].parentNode;if(!i)throw Error(`Cannot set initial sizes - parent is undefined`);if(m(e,i)===void 0)throw Error(`Cannot set initial sizes - parent has undefined size`);t.forEach(((i,a)=>{let o=a===0,s=a===t.length-1,c,l=0;t.length>1&&(l=n[s?a-1:a].getBoundingClientRect()[e===S.Horizontal?`width`:`height`],l=o||s?l/2:l),c=r&&a<r.length?`calc(${r[a]}% - ${l}px)`:`calc(${100/t.length}% - ${l}px)`,e===S.Horizontal?(i.style.width=c,i.style.height=`100%`):(i.style.height=c,i.style.width=`100%`)}))}),[]),H=i.useCallback(((e,t)=>{if(j.draggingIdx===void 0)throw Error(`Cannot adjust size - 'draggingIdx' is undefined`);let n=j.pairs[j.draggingIdx];if(n.size===void 0)throw Error(`Cannot adjust size - 'pair.size' is undefined`);if(n.gutterSize===void 0)throw Error(`Cannot adjust size - 'pair.gutterSize' is undefined`);let r=n.aSizePct+n.bSizePct,i=t/n.size*r,a=r-t/n.size*r,o=j.draggingIdx===0,s=j.draggingIdx===j.pairs.length-1,{aGutterSize:c,bGutterSize:l}=v(n.gutterSize,o,s),u=`calc(${i}% - ${c}px)`,d=`calc(${a}% - ${l}px)`;e===S.Horizontal?(n.a.style.width=u,n.b.style.width=d):(n.a.style.height=u,n.b.style.height=d)}),[j.draggingIdx,j.pairs,e]),U=i.useCallback(((e,t,n)=>{if(!j.isDragging)return;if(j.draggingIdx===void 0)throw Error(`Cannot drag - 'draggingIdx' is undefined`);let r=j.pairs[j.draggingIdx];if(r.start===void 0)throw Error(`Cannot drag - 'pair.start' is undefined`);if(r.size===void 0)throw Error(`Cannot drag - 'pair.size' is undefined`);if(r.gutterSize===void 0)throw Error(`Cannot drag - 'pair.gutterSize' is undefined`);let i=function(e,t){let n=x(t)?t.changedTouches[0]:t;return e===S.Horizontal?n.clientX:n.clientY}(t,e)-r.start,a=16,o=16;n.length>j.draggingIdx&&(a=n[j.draggingIdx]),n.length>=j.draggingIdx+1&&(o=n[j.draggingIdx+1]),i<r.gutterSize+a&&(i=r.gutterSize+a),i>=r.size-(r.gutterSize+o)&&(i=r.size-(r.gutterSize+o)),H(t,i)}),[j.isDragging,j.draggingIdx,j.pairs,H]),W=()=>{if(j.isDragging){if(j.draggingIdx===void 0)throw Error(`Cannot calculate sizes after dragging = 'state.draggingIdx' is undefined`);z(e,j.draggingIdx),R()}},G=t=>{j.isDragging&&(x(t)&&t.preventDefault(),U(t,e,e===S.Horizontal?n:a))};function K(e,t){if(!e.current)throw Error(`Can't add element to ref object - ref isn't initialized`);t&&!e.current.includes(t)&&e.current.push(t)}return h(`mouseup`,W,[j.isDragging,R]),h(`mousemove`,G,[e,j.isDragging,U,n,a]),h(`touchend`,W,[j.isDragging,R],{condition:w}),h(`touchmove`,G,[e,j.isDragging,U,n,a],{condition:w,passive:!w}),o((function(){if(!N.current)return;let t=N.current.parentElement;if(!t)return;let n=new ResizeObserver((()=>{let n=getComputedStyle(t),r=e===S.Horizontal?t.clientWidth:t.clientHeight;I(!!n&&!!r)}));return n.observe(t),()=>{n.disconnect()}}),[N.current,e]),o((function(){if(j.isReady&&(!P.current||P.current[0].offsetParent)){if(!P.current||!F.current)throw Error(`Cannot create pairs - either variable 'childRefs' or 'gutterRefs' is undefined`);A.length<=1?V(e,P.current,F.current,l):(V(e,P.current,F.current,l),B(e,P.current,F.current))}}),[p,j.isReady,e,V,B,l]),t(`div`,Object.assign({className:`__dbk__container ${e}`,ref:N},{children:j.isReady&&A.map(((n,a)=>r(i.Fragment,{children:[t(`div`,Object.assign({ref:e=>K(P,e),className:`__dbk__child-wrapper `+(a<k.length?k[a]:``)},{children:n}),void 0),a<A.length-1&&t(g,{ref:e=>K(F,e),className:d,theme:u,draggerClassName:f,direction:e,onDragging:()=>{z(e,t=a),L(e,t);return;var t}},void 0)]},a)))}),void 0)}export{S as n,D as t};