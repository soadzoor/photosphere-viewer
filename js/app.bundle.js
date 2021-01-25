(()=>{var I=class{static detach(e){var t;(t=e==null?void 0:e.parentElement)==null||t.removeChild(e)}};var P=class{constructor(){this._shouldPropagate=!0;this._bindings=[]}static create(){return new P}add(e,t,i=0){this.registerListener(e,!1,t,i)}addAndCall(e,t,i=0){this.registerListener(e,!1,t,i),t=t||this,e.call(t)}addOnce(e,t,i=0){this.registerListener(e,!0,t,i)}registerListener(e,t,i,r=0){let n=this.indexOfListener(e,i),a=null;if(n!==-1){if(a=this._bindings[n],a.isOnce!==t)throw new Error("You cannot add"+(t?"":"Once")+"() then add"+(t?"Once":"")+"() the same listener without removing the relationship first.")}else a={listener:e,context:i,isOnce:t,priority:r},this.addBinding(a)}addBinding(e){let t=this._bindings.length;do--t;while(this._bindings[t]&&e.priority<=this._bindings[t].priority);this._bindings.splice(t+1,0,e)}indexOfListener(e,t){for(let i=this._bindings.length-1;i>=0;--i){let r=this._bindings[i];if(r.listener===e&&r.context===t)return i}return-1}has(){}halt(){this._shouldPropagate=!1}remove(e,t){let i=this.indexOfListener(e,t);return i!==-1?(this._bindings.splice(i,1),!0):!1}removeAll(){this._bindings.length=0}dispatch(...e){let t=Array.prototype.slice.call(arguments);this._shouldPropagate=!0;let i=this._bindings;for(let r=i.length-1;r>=0&&!(i[r].listener.apply(i[r].context,t)===!1||!this._shouldPropagate);--r);}dispose(){this.removeAll()}get bindings(){return this._bindings}};var A=class{constructor(e){this.signals={filesSelected:P.create()};this.onDragCancel=e=>{e.preventDefault(),this._uploadArea.classList.remove("active")};this._inputElement=document.createElement("input"),this._inputElement.type="file",this._inputElement.accept=e,this._inputElement.addEventListener("change",t=>{let i=this._inputElement.files;this.processFile(i)}),this._uploadArea=document.getElementById("uploadArea"),document.addEventListener("dragover",t=>{t.preventDefault(),this._uploadArea.classList.add("active")}),document.addEventListener("drop",t=>{t.preventDefault();let i=t.dataTransfer.files;this.processFile(i),this._uploadArea.classList.remove("active")}),document.addEventListener("dragleave",this.onDragCancel),this._uploadArea.addEventListener("click",()=>{this._inputElement.click()})}processFile(e){this.signals.filesSelected.dispatch(e)}destroy(){I.detach(this._inputElement),I.detach(this._uploadArea);for(let e in this.signals)this.signals[e].removeAll()}};var v=class{static lengthOfSquared(e){let t=0;for(let i of e)t+=i*i;return t}static lengthOf(e){return Math.sqrt(v.lengthOfSquared(e))}static normalize(e){let t=v.lengthOf(e);for(let i=0;i<e.length;++i)e[i]/=t;return e}static getWorldPositionFromUV(e,t){let i=[Math.cos(e)*Math.sin(t),Math.cos(t),Math.sin(e)*Math.sin(t)];return v.normalize(i)}};var u=class{static clamp(e,t,i){return e<=t?t:e>=i?i:e}static isValidNumber(e){return!(e===null||e===void 0||isNaN(e)||e===Infinity||e===-Infinity)}static deg2rad(e){return Math.PI/180*e}static rad2deg(e){return 180/Math.PI*e}static getRandomInt(e,t){return Math.floor(Math.random()*(t-e+1))+e}static getForwardLengthFromFOV(e){return 1/Math.tan(u.deg2rad(e/2))}static getNormalizedCursorCoords(e,t,i){return[2*(e/i[0]-.5),2*((i[1]-t)/i[1]-.5)]}static getSphereSurfacePointFromUV(e,t){let i=[Math.cos(e)*Math.sin(t),Math.cos(t),Math.sin(e)*Math.sin(t)];return v.normalize(i)}static getUVFromSphereSufracePoint(e){let t=v.normalize(e),i=1-(Math.PI-Math.atan2(t[2],t[0]))/(2*Math.PI),r=(Math.PI/2-Math.asin(-t[1]))/Math.PI;return[i,r]}static getLongitudeLatitudeFromUV(e){return[2*Math.PI*((e[0]+.5)%1),Math.PI*(e[1]-.5)]}};var R=class{static get DEFAULT_ZOOM_FACTOR(){return R.MIN_ZOOM_FACTOR}static get isFullscreenAvailable(){let e=document.body;return!!e.requestFullscreen||!!e.webkitRequestFullscreen||!!e.mozRequestFullScreen||!!e.msRequestFullscreen}static get isIOS(){return/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream}static get isMac(){return/Mac/.test(navigator.userAgent)&&!window.MSStream}},s=R;s.ANIMATION_DURATION=400,s.DAMPING_DURATION=2e3,s.MOUSE_BUTTON={LEFT:0,MIDDLE:1,RIGHT:2},s.TRANSITION_DURATION=400,s.FOV=75,s.POINTER_SENSITIVITY=1.2,s.MIN_ZOOM_FACTOR=1,s.WORLD_UP=[0,1,0],s.CAMERA_POSITION=[0,0,0],s.AUTOROTATION_SPEEDS={default:3e-5,fast:9e-4},s.MOUSE_BUTTON={LEFT:0,MIDDLE:1,RIGHT:2};var L=class{static get vertexShader(){return`precision highp float;

attribute vec3 vertPosition;

varying vec3 vsRay;

uniform float zoomFactor;
uniform vec3 fw;
uniform float ratio;

void main()
{
	gl_Position = vec4(zoomFactor * vertPosition, 1.0);

	vec3 worldUp = vec3(0, 1, 0);
	vec3 camRight = normalize(cross(fw, worldUp));
	vec3 camUp = normalize(cross(camRight, fw));

	vec3 corner = fw * ${u.getForwardLengthFromFOV(s.FOV)} + ratio*camRight*vertPosition.x + camUp*vertPosition.y;

	vsRay = corner;
}`}static get fragmentShader(){return`precision highp float;

#define PI 3.14159265359
#define rayOrigin vec3(0.0, 0.0, 0.0)
#define SKY vec3(0.1, 0.1, 0.11)
#define EPSILON 0.0001

varying vec3 vsRay;

uniform sampler2D texture;
uniform vec4 textureViewBox;

// Based on https://www.shadertoy.com/view/ldS3DW
// But optimized (we're using the origo as center, and 1 as radius), + we're always inside the sphere
float intersectSphere(vec3 ro, vec3 rd)
{
	vec3 rc = ro;
	float c = dot(rc, rc) - 1.0;
	float b = dot(rd, rc);
	float d = b*b - c;
	float t = -b + sqrt(abs(d));

	return t;
}

vec3 getColor(in sampler2D texture, in vec2 sphereUV, in vec4 textureViewBox)
{
	if ((textureViewBox.x <= sphereUV.x && sphereUV.x <= textureViewBox.z) && (textureViewBox.y <= sphereUV.y && sphereUV.y <= textureViewBox.w))
	{
		vec2 imageUV = vec2(
			(sphereUV.x - textureViewBox.x) / (textureViewBox.z - textureViewBox.x),
			(sphereUV.y - textureViewBox.y) / (textureViewBox.w - textureViewBox.y)
		);

		// Anti-aliasing trick for the edge of the image

		float minX = abs(1.0 - (textureViewBox.z - textureViewBox.x)) < EPSILON ? 1.0 : min(abs(sphereUV.x - textureViewBox.x), abs(sphereUV.x - textureViewBox.z));
		float minY = abs(1.0 - (textureViewBox.w - textureViewBox.y)) < EPSILON ? 1.0 : min(abs(sphereUV.y - textureViewBox.y), abs(sphereUV.y - textureViewBox.w));
		float dist = min(minX, minY) * 2000.0;

		float factor = clamp(dist, 0.0, 1.0);

		return mix(SKY, texture2D(texture, imageUV).rgb, factor);
	}
	else
	{
		return SKY;
	}
}

void main()
{
	vec3 rayDirection = normalize(vsRay);

	float t = intersectSphere(rayOrigin, rayDirection);

	vec3 hitPoint = rayOrigin + rayDirection * t;

	vec2 sphereUV = vec2(
		0.5 + atan(hitPoint.z, hitPoint.x) / (2.0 * PI),
		0.5 - asin(hitPoint.y) / PI
	);

	vec3 color = getColor(texture, sphereUV, textureViewBox);

	gl_FragColor = vec4(color, 1.0);
}`}};var x=class{constructor(e){this._ratio={value:1,loc:null};this._zoomFactorLoc=null;this._forward={value:[0,0,-1],loc:null};this._texture={texValue:null,texLoc:null,viewBox:x.defaultViewBox,viewBoxLoc:null};this._isInitialTexture=!0;this._gl=e,this._vertexShader=e.createShader(e.VERTEX_SHADER),this._fragmentShader=e.createShader(e.FRAGMENT_SHADER),e.shaderSource(this._vertexShader,L.vertexShader),e.shaderSource(this._fragmentShader,L.fragmentShader);try{this.compileShaders(),this.initProgram(),this._ratio.loc=this._gl.getUniformLocation(this._program,"ratio"),this._zoomFactorLoc=this._gl.getUniformLocation(this._program,"zoomFactor"),this._forward.loc=this._gl.getUniformLocation(this._program,"fw"),this._texture.texLoc=this._gl.getUniformLocation(this._program,"texture"),this._texture.viewBoxLoc=this._gl.getUniformLocation(this._program,"textureViewBox")}catch(t){console.error(t)}}compileShaders(){this.compileShader(this._vertexShader),this.compileShader(this._fragmentShader)}compileShader(e){if(this._gl.compileShader(e),!this._gl.getShaderParameter(e,this._gl.COMPILE_STATUS))throw`Error compiling shader: ${this._gl.getShaderInfoLog(e)}`}initProgram(){this._program=this._gl.createProgram(),this._gl.attachShader(this._program,this._vertexShader),this._gl.attachShader(this._program,this._fragmentShader),this.linkProgram(),this.validateProgram()}linkProgram(){if(this._gl.linkProgram(this._program),!this._gl.getProgramParameter(this._program,this._gl.LINK_STATUS)&&!this._gl.isContextLost())throw`Error linking program: ${this._gl.getError()}, ${this._gl.getProgramInfoLog(this._program)}`}validateProgram(){if(this._gl.validateProgram(this._program),!this._gl.getProgramParameter(this._program,this._gl.VALIDATE_STATUS))throw`Error validating program: ${this._gl.getProgramInfoLog(this._program)}`}setSize(e,t){this._ratio.value=e/t}loadTexture(e){this._texture.texValue=this._gl.createTexture();let t=this._texture;this._isInitialTexture&&(this._isInitialTexture=!1),t.viewBox=e.viewBox;let i=this._gl;i.bindTexture(i.TEXTURE_2D,t.texValue),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texImage2D(i.TEXTURE_2D,0,i.RGB,i.RGB,i.UNSIGNED_BYTE,e.textureData),i.bindTexture(i.TEXTURE_2D,null)}setVec3Uniform(e,t){this._gl.uniform3fv(e,t)}setVec4Uniform(e,t){this._gl.uniform4fv(e,t)}setFloatUniform(e,t){this._gl.uniform1f(e,t)}setTextureData(e,t){this._gl.activeTexture(this._gl.TEXTURE0+t),this._gl.bindTexture(this._gl.TEXTURE_2D,e.texValue),this._gl.uniform1i(e.texLoc,t)}setTexture(e,t){this.setVec4Uniform(e.viewBoxLoc,e.viewBox),this.setTextureData(e,t)}updateUniforms(e){this.setFloatUniform(this._ratio.loc,this._ratio.value),this.setVec3Uniform(this._forward.loc,this._forward.value),this.setFloatUniform(this._zoomFactorLoc,e),this.setTexture(this._texture,0)}render(e,t){this._forward.value=e,this._gl.useProgram(this._program),this.updateUniforms(t),this._gl.drawArrays(this._gl.TRIANGLE_STRIP,0,4)}get program(){return this._program}static get defaultViewBox(){return[0,0,1,1]}static get defaultTextureData(){return{textureData:new ImageData(1,1),viewBox:this.defaultViewBox,headingAngle:0}}};var D=class{static readAsText(e){return new Promise((t,i)=>{let r=new FileReader;r.onload=()=>{t(r.result)},r.onerror=()=>{i((e==null?void 0:e.name)||"Error")},r.readAsText(e)})}static getValueFromTextByKey(e,t){let i=e.indexOf(t);if(i>-1){let r=e.indexOf('"',i+t.length+3);return e.substring(t.length+i+2,r)}else return null}};var y=["GPano:CroppedAreaImageHeightPixels","GPano:CroppedAreaImageWidthPixels","GPano:CroppedAreaLeftPixels","GPano:CroppedAreaTopPixels","GPano:FullPanoHeightPixels","GPano:FullPanoWidthPixels","GPano:InitialViewHeadingDegrees"],m=class{static createWorker(e){return new Worker(URL.createObjectURL(new Blob([`(${e})()`])))}static getImage(e,t){return typeof createImageBitmap!="undefined"?new Promise((i,r)=>{function n(a){a.data.src===e&&(m.worker.removeEventListener("message",n),a.data.error&&r(a.data.error),i(a.data.bitmap))}m.worker.addEventListener("message",n),m.worker.postMessage({url:e,maxTextureSize:t})}):new Promise(async(i,r)=>{let n=await m.getImageElement(e),a=Math.max(n.width,n.height);if(t<a){let h=Math.min(a,t),o=n.width/n.height,l={width:null,height:null};o>=1?(l.width=h,l.height=l.width/o):(l.height=h,l.width=l.width*o),m._canvas.width=l.width,m._canvas.height=l.height,m._ctx.drawImage(n,0,0,l.width,l.height),m._canvas.toBlob(async p=>{let S=await m.getImageElement(URL.createObjectURL(p));i(S)})}else i(n)})}static async getImageElement(e){return new Promise((t,i)=>{let r=document.createElement("img");r.setAttribute("crossorigin","anonymous"),r.onload=()=>{t(r)},r.onerror=()=>{i(r)},r.src=e})}static async getCachedImageElement(e){return m._cache[e]||(m._cache[e]=this.getImageElement(e)),m._cache[e]}static async getXMPMetaDataFromImageFile(e){let t=await D.readAsText(e),i={};for(let r of y)i[r]=parseFloat(D.getValueFromTextByKey(t,r));return i}static async getMetaDataFromFile(e){let t=x.defaultViewBox,i=URL.createObjectURL(e),r=await this.getCachedImageElement(i),n=await this.getXMPMetaDataFromImageFile(e);if(n["GPano:FullPanoWidthPixels"]){let h=n["GPano:FullPanoWidthPixels"],o=n["GPano:FullPanoHeightPixels"],l=n["GPano:CroppedAreaLeftPixels"],p=n["GPano:CroppedAreaTopPixels"],S=n["GPano:CroppedAreaImageWidthPixels"],M=n["GPano:CroppedAreaImageHeightPixels"];(h!==S||o!==M)&&(t[0]=l/h,t[1]=(o-M-p)/o,t[2]=(l+S)/h,t[3]=(o-p)/o)}else{let h=r.width/2-r.height,o=r.height+h;if(h>1){let l=h/2;t[1]=l/o,t[3]=(o-l)/o}}let a=(n["GPano:InitialViewHeadingDegrees"]+180)%360,c=u.isValidNumber(a)?u.deg2rad(a):0;return{viewBox:t,headingAngle:c,originalWidth:r.width,originalHeight:r.height,imageUrl:i}}static getNewImageElement(e){return new Promise((t,i)=>{let r=document.createElement("img");r.setAttribute("crossorigin","anonymous"),r.onload=()=>{t(r)},r.onerror=()=>{i(r)},r.src=e})}static async getImageForTexture(e,t){let i=await m.getMetaDataFromFile(e);return{textureData:await m.getImage(i.imageUrl,t),viewBox:i.viewBox}}},w=m;w._canvas=document.createElement("canvas"),w._ctx=m._canvas.getContext("2d"),w._cache={},w.worker=m.createWorker(()=>{self.addEventListener("message",e=>{let t=e.data.url,i=e.data.maxTextureSize;fetch(t).then(r=>{r.blob().then(n=>{createImageBitmap(n).then(a=>{let c=Math.max(a.width,a.height);if(i<c){let o=Math.min(c,i),l=a.width/a.height,p={width:null,height:null};l>=1?(p.width=o,p.height=p.width/l):(p.height=o,p.width=p.height*l),createImageBitmap(a,0,0,a.width,a.height,{resizeWidth:p.width,resizeHeight:p.height}).then(M=>{self.postMessage({src:t,bitmap:M},[M])})}else self.postMessage({src:t,bitmap:a},[a])})})})})});var b;(function(_){_[_.EASE_OUT=0]="EASE_OUT",_[_.EASE_IN_OUT=1]="EASE_IN_OUT"})(b||(b={}));var f=class{constructor(e,t,i=0,r=s.ANIMATION_DURATION,n=!0){this._timeStampAtSetEnd=0;this._min=-Infinity;this._max=Infinity;this._hasChanged=!1;this._prevDeltaValue=0;this._prevTimeStamp=1;this._prevDeltaTime=1;this._easing=0;this._timeoutId=-1;this._originalStart=e,this._start=e,this._originalEnd=t,this._end=t,this._value=this._start,this._originalAnimationDuration=this._animationDuration=r,this._easing=i,this._triggerRender=n}static removeFromActiveOnes(e){f._activeInstances=f._activeInstances.filter(t=>t!==e)}static addToActiveOnes(e){f._activeInstances.includes(e)||f._activeInstances.push(e)}static updateActiveOnes(e){let t=!1;for(let i of f._activeInstances)t=t||i._triggerRender,i.update(e);return t}smoothStep(e){if(e<this._animationDuration){let t=e/this._animationDuration;return u.clamp(t**2*(3-2*t)*(this._end-this._start)+this._start,this._min,this._max)}else return this._end=u.clamp(this._end,this._min,this._max),this._end}exponentialOut(e){if(e<this._animationDuration){let t=e/this._animationDuration;return u.clamp((1-2**(-10*t))*(1024/1023)*(this._end-this._start)+this._start,this._min,this._max)}else return this._end=u.clamp(this._end,this._min,this._max),this._end}getNextValue(e){return this._easing===1?this.smoothStep(e):this.exponentialOut(e)}increaseEndBy(e,t=!1){this.setEnd(this._end+e,t)}decreaseEndBy(e,t=!1){this.setEnd(this._end-e,t)}setEnd(e,t=!1,i=this._originalAnimationDuration){this._animationDuration=i;let r=t?u.clamp(e,this._min,this._max):e;f.addToActiveOnes(this),this._start=this._value,this._end=r,this._timeStampAtSetEnd=d.timeStamp,t||(clearTimeout(this._timeoutId),this._timeoutId=setTimeout(()=>{this._end=u.clamp(this._end,this._min,this._max)},this._animationDuration))}reset(e,t,i=this._originalAnimationDuration){this._animationDuration=i,f.addToActiveOnes(this),this._start=e!=null?e:this._originalStart,this._end=t!=null?t:this._originalEnd,this._timeStampAtSetEnd=d.timeStamp}update(e){this._prevDeltaTime=e-this._prevTimeStamp;let t=e-this._timeStampAtSetEnd,i=this._value;this._value=this.getNextValue(t),this._prevDeltaValue=this._value-i,this._prevTimeStamp=e,this._value===i?(this._start=this._end,this._hasChanged=!1,f.removeFromActiveOnes(this)):this._hasChanged=!0}get animationDuration(){return this._animationDuration}get originalAnimationDuration(){return this._originalAnimationDuration}get start(){return this._start}get value(){return this._value}get end(){return this._end}get hasChangedSinceLastTick(){return this._hasChanged}get prevDeltaValue(){return this._prevDeltaValue}get prevDeltaTime(){return this._prevDeltaTime}get derivateAt0(){return this._easing===0?6.938247437862991:0}},T=f;T._activeInstances=[];var E=class extends T{constructor(e,t,i,r,n=b.EASE_OUT,a=s.ANIMATION_DURATION,c=!0){super(e,t,n,a,c);this._originalMin=this._min=i,this._originalMax=this._max=r}get min(){return this._min}get max(){return this._max}get originalMin(){return this._originalMin}get originalMax(){return this._originalMax}setMin(e){this._min=e;let t=u.clamp(this._start,this._min,this._max),i=u.clamp(this._end,this._min,this._max);super.reset(t,i)}setMax(e){this._max=e;let t=u.clamp(this._start,this._min,this._max),i=u.clamp(this._end,this._min,this._max);super.reset(t,i)}reset(e,t,i,r,n=!1){this._min=i!=null?i:this._min,this._max=r!=null?r:this._max;let a=e!=null?e:this._originalStart,c=n?u.clamp(a,this._min,this._max):a,h=t!=null?t:this._originalEnd,o=n?u.clamp(h,this._min,this._max):h;super.reset(c,o)}isPlaying(){return this.value!==this.end}};var U=class{constructor(e,t){this._isPointerDown=!1;this._mouseMoved=!0;this._pointer={downTimeStamp:null,startX:null,startY:null,prevX:null,prevY:null,prevDeltaX:0,prevDeltaY:0,prevTimeStamp:0,prevDeltaTime:1};this._u=new E(0,0,-Infinity,Infinity,void 0,s.DAMPING_DURATION);this._v=new E(Math.PI/2,Math.PI/2,.01,3.14,void 0,s.DAMPING_DURATION);this._pinch={startValue:{touchDistance:null,zoomValue:null},currentValue:{touchDistance:null,zoomValue:null}};this._forward=[-1,0,0];this._dampingTimeoutId=null;this._dampOnPointerUp=!1;this._prevSpeed=[];this._enabled=!1;this._autoRotation=[s.AUTOROTATION_SPEEDS.default,0];this.ignorePinch=e=>{e.touches.length>1&&e.preventDefault(),(s.isIOS||s.isMac)&&(e=e.originalEvent||e,e.scale!==1&&e.preventDefault())};this.preventDefault=e=>{e.preventDefault()};this.onWheel=e=>{e.preventDefault();let t=1.1,i=this._sceneManager.userZoomFactor,r=Math.sign(-e.deltaY)>0?i.end*t:i.end/t;i.setEnd(r,!0)};this.onMouseDown=e=>{e.button===s.MOUSE_BUTTON.LEFT&&this.onPointerDown(e.clientX,e.clientY)};this.onTouchStart=e=>{e.preventDefault(),e.touches.length===1?this.onPointerDown(e.touches[0].clientX,e.touches[0].clientY):e.touches.length===2?(this._pinch.startValue.touchDistance=this.getTouchDistance(e),this._pinch.startValue.zoomValue=this._sceneManager.userZoomFactor.value):this.onPointerUp()};this.onMouseMove=e=>{this.onPointerMove(e.clientX,e.clientY)};this.onTouchMove=e=>{e.preventDefault(),e.touches.length===1?this.onPointerMove(e.touches[0].clientX,e.touches[0].clientY):e.touches.length===2&&this._pinch.startValue.touchDistance?(this._pinch.currentValue.touchDistance=this.getTouchDistance(e),this._pinch.currentValue.zoomValue=this._pinch.currentValue.touchDistance/this._pinch.startValue.touchDistance*this._pinch.startValue.zoomValue,this._sceneManager.userZoomFactor.setEnd(this._pinch.currentValue.zoomValue)):this.onPointerUp()};this.onPointerUp=()=>{if(this._isPointerDown){let e=performance.now();this._domElement.classList.remove("rotating");let t=this._prevSpeed,i=v.lengthOfSquared(t);if(this._dampOnPointerUp&&!isNaN(i)&&0<i&&i<Infinity){this._dampOnPointerUp=!1;let r=this._u.derivateAt0,n=this._u.originalAnimationDuration,a=[n*t[0]/r,n*t[1]/r];this._u.setEnd(this._u.value+a[0]),this._v.setEnd(this._v.value+a[1])}}this._isPointerDown=!1,this._pointer.downTimeStamp=null,this._pointer.startX=null,this._pointer.startY=null,this._pointer.prevX=null,this._pointer.prevY=null,this._pointer.prevTimeStamp=0,this._pointer.prevDeltaX=0,this._pointer.prevDeltaY=0,this._pointer.prevDeltaTime=1,this._pinch.startValue.touchDistance=this._pinch.startValue.zoomValue=this._pinch.currentValue.touchDistance=this._pinch.currentValue.zoomValue=null};this.cancelDamping=()=>{this._dampOnPointerUp=!1};this._domElement=e,this._sceneManager=t,this.disableDefaultZoomGesture()}disableDefaultZoomGesture(){window.addEventListener("touchstart",this.ignorePinch,{passive:!1}),window.addEventListener("touchmove",this.ignorePinch,{passive:!1}),window.addEventListener("gesturestart",this.preventDefault,{passive:!1}),window.addEventListener("gesturechange",this.preventDefault,{passive:!1})}getTouchDistance(e){let t={x:e.touches[0].clientX,y:e.touches[0].clientY},i={x:e.touches[1].clientX,y:e.touches[1].clientY},r={x:i.x-t.x,y:i.y-t.y};return Math.sqrt(r.x*r.x+r.y*r.y)}onPointerDown(e,t){this.stopRotating(),this._isPointerDown=!0,this._mouseMoved=!1,this._pointer.startX=this._pointer.prevX=e,this._pointer.startY=this._pointer.prevY=t,this._pointer.downTimeStamp=performance.now(),this._pointer.prevTimeStamp=this._pointer.downTimeStamp,this._domElement.classList.add("rotating"),this._u.reset(this._u.value,this._u.value),this._v.reset(this._v.value,this._v.value)}onPointerMove(e,t){if(this._isPointerDown&&(this._mouseMoved=e!==this._pointer.prevX||t!==this._pointer.prevY,this._mouseMoved)){if(this._domElement.classList.add("rotating"),this._pointer.prevX!=null&&this._pointer.prevY!=null){let r=this._sceneManager.userZoomFactor.value,n=(e-this._pointer.prevX)*s.POINTER_SENSITIVITY/window.innerHeight/r,a=(t-this._pointer.prevY)*s.POINTER_SENSITIVITY/window.innerHeight/r,c=this._u.end-n,h=this._v.end-a,o=this._pointer.startX-e,l=this._pointer.startY-t;this._u.reset(c,c),this._v.reset(h,h)}this._pointer.prevDeltaX=e-this._pointer.prevX,this._pointer.prevDeltaY=t-this._pointer.prevY,this._pointer.prevX=e,this._pointer.prevY=t;let i=performance.now();this._pointer.prevDeltaTime=i-this._pointer.prevTimeStamp,this._pointer.prevTimeStamp=i,this._dampOnPointerUp=!0,clearTimeout(this._dampingTimeoutId),this._dampingTimeoutId=setTimeout(this.cancelDamping,100)}}setUVFromSphereSufracePoint(e){let t=Math.PI+Math.atan2(-e[2],-e[0]);this._u.reset(t,t);let i=Math.PI/2-Math.asin(e[1]);this._v.reset(i,i)}setHeadingAngle(e,t,i){this._u.reset(e,e),t?this._v.reset(this._v.value,this._v.value):this._v.reset(Math.PI/2,Math.PI/2),i&&(this._autoRotation[0]=0,this._autoRotation[1]=0)}updateRotationLimit(){let e=this._viewBox;if(e){let t=this._domElement.offsetWidth/this._domElement.offsetHeight,i=u.deg2rad(s.FOV),r=2*Math.atan(Math.tan(i/2)*t);if(e[2]-e[0]<1){let n=!1,a=2*Math.PI*(-.5+e[0]),c=2*Math.PI*(-.5+e[2]),h=a,o=c;if(n&&(h+=r/2,o-=r/2),o>h)this._u.setMin(h),this._u.setMax(o);else{let l=(a+c)/2;this._u.setMin(l),this._u.setMax(l)}}else this._u.setMin(this._u.originalMin),this._u.setMax(this._u.originalMax);if(e[3]-e[1]<1){let n=!1,a=e[1]*Math.PI,c=e[3]*Math.PI,h=a,o=c;if(n&&(h+=i/2,o-=i/2),o>h)this._v.setMin(h),this._v.setMax(o);else{let l=(a+c)/2;this._v.setMin(l),this._v.setMax(l)}}else this._v.setMin(this._v.originalMin),this._v.setMax(this._v.originalMax)}}limitRotation(e){this._viewBox=e,this.updateRotationLimit()}setSize(){this.updateRotationLimit()}activate(){this._enabled||(this._enabled=!0,this.setUVFromSphereSufracePoint(this._forward),this._domElement.addEventListener("mousedown",this.onMouseDown),this._domElement.addEventListener("touchstart",this.onTouchStart),this._domElement.addEventListener("wheel",this.onWheel),window.addEventListener("mousemove",this.onMouseMove),window.addEventListener("touchmove",this.onTouchMove),window.addEventListener("mouseup",this.onPointerUp),window.addEventListener("touchend",this.onPointerUp),window.addEventListener("touchcancel",this.onPointerUp))}deactivate(){this._enabled&&(this._enabled=!1,this._isPointerDown=!1,this._domElement.classList.remove("rotating"),this._domElement.removeEventListener("mousedown",this.onMouseDown),this._domElement.removeEventListener("touchstart",this.onTouchStart),this._domElement.removeEventListener("wheel",this.onWheel),window.removeEventListener("mousemove",this.onMouseMove),window.removeEventListener("touchmove",this.onTouchMove),window.removeEventListener("mouseup",this.onPointerUp),window.removeEventListener("touchend",this.onPointerUp),window.removeEventListener("touchcancel",this.onPointerUp))}stopRotating(){this._autoRotation[0]=0,this._autoRotation[1]=0,this._u.reset(this._u.value,this._u.value),this._v.reset(this._v.value,this._v.value)}update(){return(this._autoRotation[0]!==0||this._autoRotation[1]!==0)&&(this._u.reset(this._u.end+this._autoRotation[0]*d.deltaFrame,this._u.end+this._autoRotation[0]*d.deltaFrame),this._v.reset(this._v.end+this._autoRotation[1]*d.deltaFrame,this._v.end+this._autoRotation[1]*d.deltaFrame,void 0,void 0,!0)),(this._u.hasChangedSinceLastTick||this._v.hasChangedSinceLastTick)&&(this._prevSpeed[0]=this._u.prevDeltaValue/this._u.prevDeltaTime,this._prevSpeed[1]=this._v.prevDeltaValue/this._v.prevDeltaTime,this._forward=u.getSphereSurfacePointFromUV(this._u.value,this._v.value),this._sceneManager.needsRender=!0),this._forward}get autoRotation(){return this._autoRotation}get currentHeadingAngle(){let e=this._u.value%(2*Math.PI);return e<0?e+2*Math.PI:e}get forward(){return this._forward}};var F=class{constructor(e,t){this._canvas=e,this._sceneManager=t}init(){let e={alpha:!1,antialias:!1};return this._gl=this._canvas.getContext("webgl2",e)||this._canvas.getContext("experimental-webgl2",e)||this._canvas.getContext("webgl",e),this._gl?(this._gl.clearColor(.125,.25,.5,1),this._gl.viewport(0,0,this._gl.drawingBufferWidth,this._gl.drawingBufferHeight),this._gl.enable(this._gl.BLEND),this._gl.blendFunc(this._gl.SRC_ALPHA,this._gl.DST_ALPHA),this._gl.clear(this._gl.COLOR_BUFFER_BIT|this._gl.DEPTH_BUFFER_BIT),this._shader=new x(this._gl),this.initGeometry(),this._gl.useProgram(this._shader.program),!0):!1}get maxTextureSize(){var e;return(e=this._gl)==null?void 0:e.getParameter(this._gl.MAX_TEXTURE_SIZE)}setSize(e,t){if(this._gl){let i=window.devicePixelRatio,r=window.innerWidth*i,n=window.innerHeight*i;this._canvas.width=r,this._canvas.height=n,this._gl.viewport(0,0,this._gl.drawingBufferWidth,this._gl.drawingBufferHeight),this._shader.setSize(e,t),this._sceneManager.needsRender=!0}}initAttribPointer(e){this._gl.vertexAttribPointer(e,3,this._gl.FLOAT,!1,3*Float32Array.BYTES_PER_ELEMENT,0)}initVertices(e){let t=this._gl.getAttribLocation(e,"vertPosition");this.initAttribPointer(t),this._gl.enableVertexAttribArray(t)}initGeometry(){let e=[-1,-1,0,1,-1,0,-1,1,0,1,1,0],t=this._gl.createBuffer();this._gl.bindBuffer(this._gl.ARRAY_BUFFER,t),this._gl.bufferData(this._gl.ARRAY_BUFFER,new Float32Array(e),this._gl.STATIC_DRAW),this.initVertices(this._shader.program)}loadDefaultTexture(){this.loadTexture(x.defaultTextureData)}loadTexture(e){this._shader.loadTexture(e)}render(e,t){this._shader.render(e,t)}};var g=class{constructor(){this._domElement=document.createElement("div");this._canvas=document.createElement("canvas");this._forward=[0,0,-1];this._userZoomFactor=new E(s.DEFAULT_ZOOM_FACTOR,s.DEFAULT_ZOOM_FACTOR,s.MIN_ZOOM_FACTOR,4,b.EASE_OUT,s.TRANSITION_DURATION);this.needsRender=!0;this.onContextLost=e=>{e.preventDefault(),alert("WebGL Context Lost")};this.onWindowResize=()=>{let e=window.innerWidth,t=window.innerHeight;this._webGLRenderer.setSize(e,t),this._controls.setSize()};this.update=()=>{g._timeStamp=performance.now(),g._deltaFrame=g._timeStamp-g.prevTimeStamp,g.prevTimeStamp=g._timeStamp,this.needsRender=T.updateActiveOnes(g._timeStamp)||this.needsRender,this.needsRender&&(this._forward=this._controls.update(),this._webGLRenderer.render(this._forward,this._userZoomFactor.value),this.needsRender=!1)};this.animate=()=>{this.update(),requestAnimationFrame(this.animate)};this.init()}init(){try{this._domElement.classList.add("playGround"),this._domElement.appendChild(this._canvas),document.body.appendChild(this._domElement),this.initRenderers(),this.initControls(),window.addEventListener("resize",this.onWindowResize),this.onWindowResize(),this.animate()}catch(e){return!1}return!0}initRenderers(){this._webGLRenderer=new F(this._canvas,this),this._webGLRenderer.init(),this._canvas.addEventListener("webglcontextlost",this.onContextLost)}initControls(){this._controls=new U(this._canvas.parentElement,this),this._controls.activate()}loadPhotoSphere(e){this._controls.limitRotation(e.viewBox);let t=Math.max(s.MIN_ZOOM_FACTOR,e.textureData.width*(1.7/4e3)/(e.viewBox[2]-e.viewBox[0]));this._webGLRenderer.loadTexture(e),requestAnimationFrame(()=>{this._userZoomFactor.setEnd(Math.min(this._userZoomFactor.end,t)),setTimeout(()=>{this._userZoomFactor.setMax(t)},this._userZoomFactor.animationDuration)}),this.needsRender=!0}static get timeStamp(){return g._timeStamp}static get deltaFrame(){return g._deltaFrame}get userZoomFactor(){return this._userZoomFactor}get maxTextureSize(){return this._webGLRenderer.maxTextureSize}get forward(){return this._forward}},d=g;d.prevTimeStamp=0,d._timeStamp=0,d._deltaFrame=1e3;var V=class{constructor(){this._dropManager=new A("image/jpeg");this.filesSelected=async e=>{let t=e[0];this._dropManager.destroy();let i=new d,r=await w.getImageForTexture(t,i.maxTextureSize);i.loadPhotoSphere({headingAngle:0,textureData:r.textureData,viewBox:r.viewBox})};this._dropManager.signals.filesSelected.add(this.filesSelected)}},Le=new V;})();
