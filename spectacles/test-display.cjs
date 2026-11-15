const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, 'SecondChance/Assets');
const source = fs.readFileSync(path.join(root, 'SecondChanceDisplay.js'), 'utf8');
const scene = fs.readFileSync(path.join(root, 'Scene.scene'), 'utf8');
const textureNames = ['checkTexture','callTexture','callAedTexture','handsTexture',
    'compressUpTexture','compressDownTexture','aedTexture'];
const textures = Object.fromEntries(textureNames.map(name => [name,{name}]));
for (const name of textureNames) {
    assert.match(source,new RegExp(`@input Asset\\.Texture ${name}`));
    assert.match(scene,new RegExp(`${name}: !<reference\\.Texture> [0-9a-f-]+`));
}
assert.match(scene,/Name: SecondChanceDisplay[\s\S]*ScriptAsset:/);
assert.match(scene,/DeviceTrackingMode: World/);

const objects = new Map(), events = {}, logs = [], voiceUpdates = [];
let time = 0, asrStarted = false;
const cameraRoot={getComponent:type=>type==='Component.Camera'?{}:null,
    getTransform:()=>({forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0},
        right:{x:1,y:0,z:0}})};
function Vec4(r,g,b,a) { Object.assign(this,{r,g,b,a}); }
function Vec3(x,y,z) { Object.assign(this,{x,y,z}); }
function createObject(name) {
    const obj = {
        name,
        setParent(parent) {assert.equal(parent,cameraRoot);},
        getTransform: () => ({setWorldPosition(){},setLocalPosition(){},
            setLocalScale(){},getWorldPosition:()=>({x:0,y:0,z:-40})}),
        createComponent(type) {
            assert.equal(type,'Component.Text');
            this.component = {text:'',textFill:{color:new Vec4(1,1,1,1)},
                backgroundSettings:{fill:{},margins:{}}};
            return this.component;
        }
    };
    objects.set(name,obj); return obj;
}
const script = {...textures,api:{},createEvent(type) {
    return {bind(fn) {(events[type] ||= []).push(fn);}};
}};
const context = {
    vec4:Vec4,vec3:Vec3,getTime:()=>time,print:x=>logs.push(x),
    TextFillMode:{Texture:1},StretchMode:{Stretch:1},
    global:{scene:{createSceneObject:createObject,getRootObject:()=>cameraRoot},
        deviceInfoSystem:{isEditor:()=>true}},
    script,Keys:{N:1,B:2,D:3,U:4,L:5,C:6,F:7,X:8},
    AsrModule:{AsrTranscriptionOptions:{create:()=>({
        onTranscriptionUpdateEvent:{add:fn=>voiceUpdates.push(fn)},
        onTranscriptionErrorEvent:{add(){}}
    })},AsrMode:{Balanced:1}},
    require:id=>id==='LensStudio:AsrModule' ?
        {startTranscribing(){asrStarted=true;}} :
        (()=>{throw Error('wearable gesture API unavailable in Preview');})()
};
vm.runInNewContext(source,context,{filename:'SecondChanceDisplay.js'});
assert.equal(logs.some(x=>x.includes('setup failed')),false,logs.join('\n'));
assert.equal(objects.size,2);
assert.equal(events.UpdateEvent.length,1);
assert.equal(events.TriggerPrimaryEvent.length,1);
assert.equal(events.KeyPressEvent.length,1);
assert.equal(asrStarted,true);
assert.equal(voiceUpdates.length,1);
assert.equal(typeof script.api.practiceSample,'function');
const card=objects.get('SC Illustrated Practice Card').component;
const art=objects.get('SC Action Illustration').component;
const check=()=>{
    const lines=card.text.split('\n');
    assert.equal(lines.length,card.text.includes('Practice motions:') ||
        card.text.includes('CALL / TRAINING ONLY') ? 13 : 11);
    assert.ok(lines.every(line=>line.length<=28),'line too wide: '+card.text);
};
const tick=t=>{time=t;events.UpdateEvent.forEach(fn=>fn());check();};
const pinch=t=>{time=t;events.TriggerPrimaryEvent.forEach(fn=>fn());check();};
const voice=(t,text,isFinal=true)=>{time=t;voiceUpdates[0]({text,isFinal});check();};
const key=(t,keyName)=>{time=t;events.KeyPressEvent[0]({key:context.Keys[keyName]});check();};
const sample=(t,x,y,z)=>{
    time=t;
    script.api.practiceSample(x===null?null:{side:'right',position:{x,y,z}},t);
    check();
};
check();
assert.match(card.text,/SECOND CHANCE/);
assert.equal(art.backgroundSettings.fill.texture.name,'checkTexture');
pinch(1); assert.match(card.text,/SCENE SAFETY/);
pinch(1.1); assert.match(card.text,/SCENE SAFETY/);
pinch(2); assert.match(card.text,/CHECK RESPONSE/);
pinch(3); assert.match(card.text,/CHECK BREATHING/);
pinch(4); assert.match(card.text,/CALL HELP/);
assert.match(card.text,/Use Siri hands-free/);
assert.match(card.text,/United States \/ 911/);
pinch(5); assert.match(card.text,/ASSIGN ROLES/);
pinch(6); assert.match(card.text,/HAND POSITION/);
pinch(7); assert.match(card.text,/07 \/ COMPRESS/);
assert.match(card.text,/Stack your hands and\nbring them into view/);
assert.match(card.text,/Practice motions: 0/);
const frames=new Set();
for(let t=7;t<7.5;t+=0.04){tick(t);frames.add(art.backgroundSettings.fill.texture.name);}
assert.deepEqual([...frames].sort(),['compressDownTexture','compressUpTexture']);
for(let t=7.51;t<=7.91;t+=0.05) sample(t,0,0,0);
assert.match(card.text,/Follow the beat/);
sample(7.95,0,-2,0);sample(8,0,0,0);
assert.match(card.text,/Practice motions: 0/);
function cycle(start) {
    for(let i=0;i<4;i++)sample(start+i*0.05,0,-8,0);
    for(let i=0;i<5;i++)sample(start+0.23+i*0.05,0,0,0);
}
cycle(8.2);assert.match(card.text,/Practice motions: 1/);
cycle(8.75);cycle(9.3);cycle(9.85);
assert.match(card.text,/Practice motions: 4/);
assert.match(card.text,/In range/);
sample(10.4,8,0,0);
assert.match(card.text,/Practice motions: 4/);
for(let t=10.6;t<=11.0;t+=0.05)sample(t,0,0,0);
sample(11.1,0,-8,0);sample(11.15,0,-8,0);
sample(11.5,null,0,0);
assert.match(card.text,/Bring your hands\nback into view/);
assert.match(card.text,/Practice motions: 4/);
for(let t=11.7;t<=12.1;t+=0.05)sample(t,0,0,0);
for(let t=12.2;t<=12.6;t+=0.05)sample(t,0,0,0);
assert.match(card.text,/Practice motions: 4/);
pinch(14);assert.match(card.text,/TURN ON AED/);
assert.equal(art.backgroundSettings.fill.texture.name,'aedTexture');
pinch(15);assert.match(card.text,/AED PADS/);
pinch(16);assert.match(card.text,/STAND CLEAR/);
pinch(17);assert.match(card.text,/RESUME CPR/);
pinch(18);assert.match(card.text,/07 \/ COMPRESS/);
assert.match(card.text,/Practice motions: 0/);
assert.match(card.text,/Stack your hands and\nbring them into view/);
voice(19,'How fast should I do CPR?');
assert.match(card.text,/CPR \/ PRESSING RATE/);
assert.match(card.text,/100-120 compressions\/min/);
voice(20,'Back');assert.match(card.text,/07 \/ COMPRESS/);
voice(21,'Restart');assert.match(card.text,/SECOND CHANCE/);
voice(22,'Start emergency');assert.match(card.text,/SCENE SAFETY/);
voice(23,'Unsafe');assert.match(card.text,/SCENE UNSAFE/);
voice(24,'Restart');assert.match(card.text,/SECOND CHANCE/);
voice(25,'Start emergency');assert.match(card.text,/SCENE SAFETY/);
voice(26,"It's safe");assert.match(card.text,/CHECK RESPONSE/);
voice(27,"He doesn't respond");assert.match(card.text,/CHECK BREATHING/);
voice(28,'Only gasping');assert.match(card.text,/CALL HELP/);
voice(29,'Restart');
voice(30,'Start emergency');
assert.match(card.text,/SCENE SAFETY/);
assert.match(card.text,/United States \/ 911/);
key(31,'C');assert.match(card.text,/Start simulated call/);
assert.match(card.text,/PHONE: CALL 911 NOW/);
key(31.5,'N');assert.match(card.text,/SIMULATED CALL \/ RINGING/);
pinch(31.6);assert.match(card.text,/SIMULATED CALL \/ RINGING/);
key(32.1,'X');assert.match(card.text,/SCENE SAFETY/);
tick(34);assert.doesNotMatch(card.text,/dispatcher connected/);
key(35,'C');key(35.6,'N');tick(37.3);
assert.match(card.text,/SIM DISPATCHER CONNECTED/);
assert.match(card.text,/Where are you/);
key(38,'N');assert.match(card.text,/Is the person responsive/);
key(39,'N');assert.match(card.text,/Are they breathing normally/);
key(40,'N');assert.match(card.text,/SIMULATION ENDED/);
key(41,'N');assert.match(card.text,/SCENE SAFETY/);
pinch(42);assert.match(card.text,/CHECK RESPONSE/);
key(43,'C');key(43.6,'F');assert.match(card.text,/> Cancel/);
key(44.2,'N');assert.match(card.text,/CHECK RESPONSE/);
assert.equal(logs.some(x=>x.includes('setup failed')),false,logs.join('\n'));
// Run the wearable input adapter against SIK-shaped hands, separate from the
// editor injection above. The real headset still requires a manikin check.
const wearableEvents={},wearablePinches=[],wearableTargets=[],wearableLogs=[];
let wrist={x:0,y:0,z:0},tracked=false;
const rightHand={isTracked:()=>tracked,wrist:{get position(){return wrist;}},
    getPalmCenter:()=>null};
const leftHand={isTracked:()=>false,wrist:{position:{x:0,y:0,z:0}},
    getPalmCenter:()=>null};
const wearableScript={...textures,api:{},createEvent(type){
    return {bind(fn){(wearableEvents[type] ||= []).push(fn);}};
}};
const wearableContext={...context,script:wearableScript,
    print:x=>wearableLogs.push(x),
    global:{scene:{createSceneObject:createObject,getRootObject:()=>cameraRoot},
        deviceInfoSystem:{isEditor:()=>false}},
    require:id=>{
        if(id==='SpectaclesInteractionKit.lspkg/SIK')return {
            SIK:{HandInputData:{getHand:side=>side==='left'?leftHand:rightHand}}};
        if(id==='LensStudio:GestureModule')return {
            getPinchDownEvent:()=>({add:fn=>wearablePinches.push(fn)}),
            getTargetingDataEvent:()=>({add:fn=>wearableTargets.push(fn)})};
        if(id==='LensStudio:AsrModule')return {startTranscribing(){}};
        throw Error('unexpected require: '+id);
    }
};
vm.runInNewContext(source,wearableContext,{filename:'SecondChanceDisplay.js'});
assert.equal(wearableLogs.some(x=>x.includes('setup failed')),false,wearableLogs.join('\n'));
assert.equal(wearableLogs.some(x=>x.includes('world-space wrist tracking ready')),true);
assert.equal(wearablePinches.length,2);
assert.equal(wearableTargets.length,2);
const wearableCard=objects.get('SC Illustrated Practice Card').component;
for(let t=1;t<=7;t++){time=t;wearablePinches[0]();}
assert.match(wearableCard.text,/07 \/ COMPRESS/);
tracked=true;
for(let t=7.1;t<=7.5;t+=0.05){time=t;wearableEvents.UpdateEvent[0]();}
for(let i=0;i<4;i++){time=8+i*0.05;wrist={x:0,y:-8,z:0};wearableEvents.UpdateEvent[0]();}
for(let i=0;i<5;i++){time=8.23+i*0.05;wrist={x:0,y:0,z:0};wearableEvents.UpdateEvent[0]();}
assert.match(wearableCard.text,/Practice motions: 1/);
time=9;wearablePinches[1]();
assert.match(wearableCard.text,/TURN ON AED/);
time=10;voiceUpdates[1]({text:'Restart',isFinal:true});
time=11;voiceUpdates[1]({text:'Start emergency',isFinal:true});
time=12;wearableTargets[0]({isValid:true,
    rayOriginInWorld:{x:0,y:0,z:0},
    rayDirectionInWorld:{x:0,y:-0.2,z:-1}});
assert.match(wearableCard.text,/> CALL EMERGENCY/);
time=12.6;wearablePinches[0]();
assert.match(wearableCard.text,/Start simulated call/);
wearableEvents.TriggerPrimaryEvent[0]();
assert.match(wearableCard.text,/Start simulated call/);
time=13.2;wearableTargets[0]({isValid:true,
    rayOriginInWorld:{x:0,y:0,z:0},
    rayDirectionInWorld:{x:0,y:-0.25,z:-1}});
assert.match(wearableCard.text,/> Cancel/);
time=13.8;wearablePinches[0]();
assert.match(wearableCard.text,/SCENE SAFETY/);
time=14.5;wearablePinches[0]();
assert.match(wearableCard.text,/CHECK RESPONSE/);
function checkRegion(region,number,expected,panelExpected) {
    const variantSource=source.replace(
        'regionLabel:"United States", emergencyNumber:"911"',
        `regionLabel:"${region}", emergencyNumber:"${number}"`);
    const variantEvents={};
    const variantScript={...textures,api:{},createEvent(type){
        return {bind(fn){(variantEvents[type] ||= []).push(fn);}};
    }};
    vm.runInNewContext(variantSource,{...context,script:variantScript},
        {filename:'SecondChanceDisplay.js'});
    const variantCard=objects.get('SC Illustrated Practice Card').component;
    time=50;variantEvents.KeyPressEvent[0]({key:context.Keys.N});
    assert.match(variantCard.text,expected);
    time=51;variantEvents.KeyPressEvent[0]({key:context.Keys.C});
    assert.match(variantCard.text,panelExpected || expected);
    assert.equal(variantCard.text.split('\n').length,13);
    assert.ok(variantCard.text.split('\n').every(line=>line.length<=28));
}
checkRegion('Demo Region','5550100',/Demo Region \/ 5550100/);
checkRegion('','',/Region not configured/,
    /Region not configured[\s\S]*Call local emergency\nservices on your phone/);
async function checkLensAi() {
    const aiVoice=[],aiEvents={},aiObjects=new Map(),requests=[];
    let played=0,resourceUrl='',finishAudio=()=>{};
    const audio={audioTrack:null,volume:0,isPlaying:()=>false,stop(){},
        setOnFinish(fn){finishAudio=fn;},play(){played++;}};
    const aiScript={...textures,aiBaseUrl:'https://example.test',api:{},createEvent(type){
        return {bind(fn){(aiEvents[type] ||= []).push(fn);}};
    }};
    const aiContext={...context,script:aiScript,Request:class {
        constructor(url,options){this.url=url;this.options=options;}
    },global:{scene:{createSceneObject(name){
        const object=createObject(name),base=object.createComponent;
        object.createComponent=function(type){return type==='Component.AudioComponent' ?
            audio : base.call(this,type);};
        aiObjects.set(name,object);return object;
    },getRootObject:()=>cameraRoot},deviceInfoSystem:{isEditor:()=>false}},
    AsrModule:{AsrTranscriptionOptions:{create:()=>({
        onTranscriptionUpdateEvent:{add:fn=>aiVoice.push(fn)},
        onTranscriptionErrorEvent:{add(){}}
    })},AsrMode:{Balanced:1}},
    require:id=>id==='LensStudio:AsrModule' ? {startTranscribing(){}} :
        id==='SpectaclesInteractionKit.lspkg/SIK' ?
            {SIK:{HandInputData:{getHand:()=>({isTracked:()=>false})}}} :
        id==='LensStudio:GestureModule' ? {getPinchDownEvent:()=>({add(){}}),
            getTargetingDataEvent:()=>({add(){}})} :
        id==='LensStudio:RemoteMediaModule' ? {loadResourceAsAudioTrackAsset(resource,success){
            resourceUrl=resource.url;success({name:'approved-audio'});
        }} :
        id==='LensStudio:InternetModule' ? {makeResourceFromUrl:url=>({url}),fetch:request=>{
            requests.push(request);
            return Promise.resolve({status:200,json:async()=>({
                title:'AI / CPR RHYTHM',art:'compress',
                lines:['Aim for 100-120 per min.','Let the chest rise fully.','Beat here is practice only.'],
                topic:'rate',mode:'model'
            })});
        }} : (()=>{throw Error('unavailable');})()
    };
    vm.runInNewContext(source,aiContext,{filename:'SecondChanceDisplay.js'});
    const aiCard=aiObjects.get('SC Illustrated Practice Card').component;
    time=51;aiVoice[0]({text:'Ask AI how fast should I press?',isFinal:true});
    assert.match(aiCard.text,/AI \/ THINKING/);
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,'https://example.test/api/lens/ask');
    assert.equal(JSON.parse(requests[0].options.body).question,'how fast should i press');
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(aiCard.text,/AI \/ CPR RHYTHM/);
    assert.match(aiCard.text,/100-120 per min/);
    assert.ok(aiCard.text.split('\n').every(line=>line.length<=28));
    assert.equal(resourceUrl,'https://example.test/api/lens/audio?topic=rate');
    assert.equal(audio.audioTrack.name,'approved-audio');
    assert.equal(played,1);
    time=52;aiVoice[0]({text:'Back',isFinal:true});
    assert.match(aiCard.text,/AI \/ CPR RHYTHM/);
    finishAudio();
    time=53;aiVoice[0]({text:'Back',isFinal:true});
    assert.match(aiCard.text,/SECOND CHANCE/);
}
checkLensAi().then(()=>console.log('Native Lens flow, practice motion, and AI network checks passed.'))
    .catch(error=>{console.error(error);process.exitCode=1;});
