const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, 'SecondChance/Assets');
const source = fs.readFileSync(path.join(root, 'SecondChanceDisplay.js'), 'utf8');
const scene = fs.readFileSync(path.join(root, 'Scene.scene'), 'utf8');
const scriptMeta = fs.readFileSync(path.join(root, 'SecondChanceDisplay.js.meta'), 'utf8');
const textureNames = ['checkTexture','callTexture','callAedTexture','handsTexture',
    'compressUpTexture','compressDownTexture','aedTexture','responderMapTexture'];
const textures = Object.fromEntries(textureNames.map(name => [name,{name}]));
for (const name of textureNames) {
    assert.match(source,new RegExp(`@input Asset\\.Texture ${name}`));
    assert.match(scene,new RegExp(`${name}: !<reference\\.Texture> [0-9a-f-]+`));
}
// Imported voice assets must be referenced by the active scene. A file on disk
// alone is not packaged into a Lens unless a scene component owns the asset.
for (const [topic,input] of Object.entries({rate:'voiceRate',depth:'voiceDepth',
    hands:'voiceHands',aed:'voiceAed',breathing:'voiceBreathing',call:'voiceCall',
    breaths:'voiceBreaths',team:'voiceTeam',overview:'voiceOverview',scope:'voiceScope'})) {
    const meta=fs.readFileSync(path.join(root,'Voice',topic+'.mp3.meta'),'utf8');
    const match=meta.match(/FileAudioTrack: !<reference> ([0-9a-f-]+)/);
    assert.ok(match,`missing imported audio track: ${topic}`);
    assert.match(source,new RegExp(`@input Asset\\.AudioTrackAsset ${input}`));
    assert.ok(scene.includes(`${input}: !<reference.AudioTrackAsset> ${match[1]}`),
        `voice not wired to scene: ${topic}`);
}
assert.match(scene,/Name: SecondChanceDisplay[\s\S]*ScriptAsset:/);
assert.match(scene,/Name: FirstAidFinder[\s\S]*ScriptAsset: !<reference> e32b1985-fa17-4993-aff1-d572297cb3a1/);
assert.match(scene,/Name: SC Equipment Marker/);
assert.match(scene,/marker: !<reference.SceneObject> a81cf46d-f7d9-4ecf-9e13-aa9e27432145/);
assert.match(scene,/DeviceTrackingMode: World/);
for(const name of ['placementEnterRadiusCm','placementExitRadiusCm',
    'placementDepthCm','placementExitDepthCm','placementHoldSeconds',
    'placementStackRadiusCm']) {
    assert.match(source,new RegExp(`@input float ${name}`));
    assert.match(scene,new RegExp(`${name}: (?:!<float> )?[0-9]`));
    assert.match(scriptMeta,new RegExp(`${name}: false`));
}

const objects = new Map(), events = {}, logs = [], voiceUpdates = [];
let time = 0, asrStarted = false;
const cameraPose={position:{x:0,y:0,z:0},rotation:{id:'camera'},
    forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0},right:{x:1,y:0,z:0}};
const cameraRoot={getComponent:type=>type==='Component.Camera'?{}:null,
    getTransform:()=>({forward:cameraPose.forward,up:cameraPose.up,
        right:cameraPose.right,getWorldPosition:()=>cameraPose.position,
        getWorldRotation:()=>cameraPose.rotation})};
function Vec4(r,g,b,a) { Object.assign(this,{r,g,b,a}); }
function Vec3(x,y,z) { Object.assign(this,{x,y,z}); }
function createObject(name) {
    const transform={position:{x:0,y:0,z:-40},rotation:null,
        setWorldPosition(p){this.position={x:p.x,y:p.y,z:p.z};},
        setLocalPosition(p){this.position={x:p.x,y:p.y,z:p.z};},
        setLocalScale(){},setWorldRotation(r){this.rotation=r;},
        getWorldPosition(){return this.position;}};
    const obj = {
        name,
        setParent(parent) {assert.equal(parent,cameraRoot);},
        getTransform: () => transform,
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
    script,Keys:{N:1,B:2,D:3,U:4,L:5,C:6,F:7,X:8,
        J:9,K:10,O:11,R:12,V:13,T:14},
    AsrModule:{AsrTranscriptionOptions:{create:()=>({
        onTranscriptionUpdateEvent:{add:fn=>voiceUpdates.push(fn)},
        onTranscriptionErrorEvent:{add(){}}
    })},AsrMode:{HighAccuracy:2}},
    require:id=>id==='LensStudio:AsrModule' ?
        {startTranscribing(){asrStarted=true;}} :
        (()=>{throw Error('wearable gesture API unavailable in Preview');})()
};
vm.runInNewContext(source,context,{filename:'SecondChanceDisplay.js'});
assert.equal(logs.some(x=>x.includes('setup failed')),false,logs.join('\n'));
assert.equal(objects.size,9);
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
    assert.equal(lines.length,card.text.includes('09 / AED PADS') ? 6 :
        card.text.includes('Practice motions:') ||
        card.text.includes('CALL / TRAINING ONLY') ||
        card.text.includes('HAND POSITION') && !card.text.includes('CPR / HAND POSITION')
        ? 13 : 11);
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
const padA=objects.get('SC AED Pad A');
const padB=objects.get('SC AED Pad B');
const padATarget=objects.get('SC AED Pad A Target');
const padBTarget=objects.get('SC AED Pad B Target');
assert.equal(padATarget.enabled,true);
assert.equal(padA.enabled,false);
const fixedPadTarget={...padATarget.getTransform().getWorldPosition()};
script.api.padSample({left:{x:fixedPadTarget.x-20,y:fixedPadTarget.y,
    z:fixedPadTarget.z}},15.1);
assert.equal(padA.enabled,true);
assert.match(card.text,/Move pad toward target/);
const farPadX=padA.getTransform().getWorldPosition().x;
for(let t=15.2;t<15.6;t+=0.05)script.api.padSample({left:{
    x:fixedPadTarget.x,y:fixedPadTarget.y,z:fixedPadTarget.z-18}},t);
assert.notEqual(padA.getTransform().getWorldPosition().x,farPadX);
assert.equal(padATarget.enabled,true);
script.api.padSample({},15.6);
assert.equal(padA.enabled,false);
const fixedSecondTarget={...padBTarget.getTransform().getWorldPosition()};
for(let t=15.65;t<17.1;t+=0.05)script.api.padSample({
    left:{...fixedPadTarget},right:{...fixedSecondTarget}},t);
assert.equal(padATarget.enabled,false);
assert.equal(padBTarget.enabled,false);
assert.match(card.text,/Both pads on virtual targets/);
cameraPose.position={x:7,y:2,z:0};
tick(17.2);
assert.deepEqual(padATarget.getTransform().getWorldPosition(),fixedPadTarget);
cameraPose.position={x:0,y:0,z:0};
pinch(16);assert.match(card.text,/STAND CLEAR/);
assert.equal(padA.enabled,false);
assert.equal(padB.enabled,false);
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
// Step 3 placement uses update samples, never pinch, and the target is world-fixed.
voice(45,'Restart');
for(let t=46;t<=51;t++)pinch(t);
assert.match(card.text,/06 \/ HAND POSITION/);
assert.match(card.text,/Bring your hands into view/);
const virtualTarget=objects.get('SC Virtual Placement Target');
const leftMarker=objects.get('SC Left Palm Marker');
const rightMarker=objects.get('SC Right Palm Marker');
assert.equal(virtualTarget.enabled,true);
assert.equal(leftMarker.enabled,false);
const originalTarget={...virtualTarget.getTransform().getWorldPosition()};
key(51.1,'J');tick(51.2);
assert.equal(leftMarker.enabled,true);
assert.match(card.text,/Move toward the target/);
const farX=leftMarker.getTransform().getWorldPosition().x;
key(51.3,'O');
for(let t=51.35;t<52.15;t+=0.05)tick(t);
assert.notEqual(leftMarker.getTransform().getWorldPosition().x,farX);
assert.match(card.text,/Move toward the target/);
key(52.2,'K');
for(let t=52.25;t<53.75;t+=0.05)tick(t);
assert.match(card.text,/Hand aligned with target/);
assert.match(card.text,/Second hand out of view/);
cameraPose.position={x:9,y:4,z:2};tick(53.8);
cameraPose.forward={x:0.3,y:0,z:-0.953};
cameraPose.right={x:0.953,y:0,z:0.3};tick(53.9);
assert.deepEqual(virtualTarget.getTransform().getWorldPosition(),originalTarget);
assert.match(card.text,/Hand aligned with target/);
key(54,'J');for(let t=54.05;t<54.7;t+=0.05)tick(t);
assert.match(card.text,/Move toward the target/);
key(54.8,'L');tick(54.9);
assert.equal(leftMarker.enabled,false);
assert.match(card.text,/Bring your hands into view/);
key(55,'R');for(let t=55.05;t<56.3;t+=0.05)tick(t);
assert.equal(rightMarker.enabled,true);
assert.match(card.text,/Hand aligned with target/);
key(56.4,'V');for(let t=56.45;t<57.5;t+=0.05)tick(t);
assert.match(card.text,/Hands stacked \(approx\.\)/);
key(57.6,'L');tick(57.7);
assert.equal(rightMarker.enabled,false);
assert.match(card.text,/Bring your hands into view/);
key(58,'J');tick(58.1);key(58.2,'T');
assert.notDeepEqual(virtualTarget.getTransform().getWorldPosition(),originalTarget);
assert.match(card.text,/Virtual target set by you/);
pinch(59);assert.match(card.text,/07 \/ COMPRESS/);
cameraPose.forward={x:0,y:0,z:-1};cameraPose.right={x:1,y:0,z:0};
assert.equal(virtualTarget.enabled,false);
assert.equal(leftMarker.enabled,false);
assert.equal(logs.some(x=>x.includes('setup failed')),false,logs.join('\n'));
// The existing ASR session routes equipment commands into the scene-bound
// TypeScript finder and displays its status without advancing the lesson.
let requestedItem='',markerCleared=0;
context.global.secondChanceFindEquipment=item=>{requestedItem=item;};
context.global.secondChanceClearEquipment=()=>{markerCleared++;};
voice(60,'Find the gauze');
assert.equal(requestedItem,'gauze');
assert.match(card.text,/FIND \/ CAPTURING/);
context.global.secondChanceVisionStatus('Item not located. Ask another person.');
assert.match(card.text,/FIND \/ NOT LOCATED/);
context.global.secondChanceVisionStatus('Possible gauze — verify visually.');
assert.equal(objects.get('SC Illustrated Practice Card').enabled,false);
voice(61,'Back');
assert.match(card.text,/07 \/ COMPRESS/);
assert.equal(objects.get('SC Illustrated Practice Card').enabled,true);
voice(61.6,'Find the goat');
assert.equal(requestedItem,'gauze');
assert.match(card.text,/FIND \/ CAPTURING/);
voice(62.2,'Back');
assert.match(card.text,/07 \/ COMPRESS/);
voice(62.8,'Find the dressing');
assert.equal(requestedItem,'gauze');
assert.match(card.text,/FIND \/ CAPTURING/);
voice(63.4,'Back');
assert.match(card.text,/07 \/ COMPRESS/);
assert.ok(markerCleared>0);
voice(64,'Locate CPR responder nearby');
assert.match(card.text,/CPR RESPONDER \/ SIM/);
assert.match(card.text,/SIM ONLY \/ NO LIVE POSITION/);
assert.equal(art.backgroundSettings.fill.texture.name,'responderMapTexture');
voice(65,'Back');
assert.match(card.text,/07 \/ COMPRESS/);
voice(66,'Dressing');
assert.equal(requestedItem,'gauze');
assert.match(card.text,/FIND \/ CAPTURING/);
voice(67,'Back');
voice(68,'Find supplies');
assert.match(card.text,/FIND \/ SAY ITEM AGAIN/);
assert.match(card.text,/NO IMAGE CAPTURED/);
voice(69,'Back');
assert.match(card.text,/07 \/ COMPRESS/);
// Run the wearable input adapter against SIK-shaped hands, separate from the
// editor injection above. The real headset still requires a manikin check.
const wearableEvents={},wearablePinches=[],wearableTargets=[],wearableLogs=[];
let wrist={x:0,y:0,z:0},tracked=false,leftTracked=false;
let palm={x:0,y:0,z:0},leftPalm={x:0,y:0,z:0};
const rightHand={isTracked:()=>tracked,wrist:{get position(){return wrist;}},
    getPalmCenter:()=>tracked?palm:null};
const leftHand={isTracked:()=>leftTracked,wrist:{position:{x:0,y:0,z:0}},
    getPalmCenter:()=>leftTracked?leftPalm:null};
const wearableScript={...textures,api:{},createEvent(type){
    return {bind(fn){(wearableEvents[type] ||= []).push(fn);}};
}};
const wearableContext={...context,script:wearableScript,
    print:x=>wearableLogs.push(x),
    global:{scene:{createSceneObject:createObject,getRootObject:()=>cameraRoot},
        deviceInfoSystem:{isEditor:()=>false}},
    require:id=>{
        if(id==='SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData')return {
            HandInputData:{getInstance:()=>({getHand:side=>side==='left'?leftHand:rightHand})}};
        if(id==='LensStudio:GestureModule')return {
            getPinchDownEvent:()=>({add:fn=>wearablePinches.push(fn)}),
            getTargetingDataEvent:()=>({add:fn=>wearableTargets.push(fn)})};
        if(id==='LensStudio:AsrModule')return {startTranscribing(){}};
        throw Error('unexpected require: '+id);
    }
};
vm.runInNewContext(source,wearableContext,{filename:'SecondChanceDisplay.js'});
assert.equal(wearableLogs.some(x=>x.includes('setup failed')),false,wearableLogs.join('\n'));
assert.equal(wearableLogs.some(x=>x.includes('world-space palm and wrist tracking ready')),true);
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
time=15;voiceUpdates[1]({text:'Restart',isFinal:true});
for(let t=16;t<=21;t++){time=t;wearablePinches[0]();}
assert.match(wearableCard.text,/06 \/ HAND POSITION/);
const wearableTarget=objects.get('SC Virtual Placement Target');
const wearableRight=objects.get('SC Right Palm Marker');
const wearableLeft=objects.get('SC Left Palm Marker');
const targetPosition=wearableTarget.getTransform().getWorldPosition();
tracked=true;palm={x:targetPosition.x-18,y:targetPosition.y,z:targetPosition.z};
time=21.1;wearableEvents.UpdateEvent[0]();
assert.equal(wearableRight.enabled,true);
assert.equal(wearableLeft.enabled,false);
assert.match(wearableCard.text,/Move toward the target/);
palm={...targetPosition};
for(let t=21.2;t<22.5;t+=0.05){time=t;wearableEvents.UpdateEvent[0]();}
assert.match(wearableCard.text,/Hand aligned with target/);
palm={x:targetPosition.x+18,y:targetPosition.y,z:targetPosition.z};
for(let t=22.6;t<23.2;t+=0.05){time=t;wearableEvents.UpdateEvent[0]();}
assert.match(wearableCard.text,/Move toward the target/);
tracked=false;time=23.3;wearableEvents.UpdateEvent[0]();
assert.equal(wearableRight.enabled,false);
assert.match(wearableCard.text,/Bring your hands into view/);
leftTracked=true;leftPalm={...targetPosition};
for(let t=23.4;t<24.5;t+=0.05){time=t;wearableEvents.UpdateEvent[0]();}
assert.equal(wearableLeft.enabled,true);
assert.match(wearableCard.text,/Hand aligned with target/);
time=25;wearablePinches[0]();
assert.match(wearableCard.text,/07 \/ COMPRESS/);
assert.equal(wearableTarget.enabled,false);
assert.equal(wearableLeft.enabled,false);
time=26;wearablePinches[0]();
time=27;wearablePinches[0]();
assert.match(wearableCard.text,/09 \/ AED PADS/);
const wearablePadA=objects.get('SC AED Pad A');
const wearablePadTarget=objects.get('SC AED Pad A Target');
leftPalm={x:wearablePadTarget.getTransform().getWorldPosition().x-18,
    y:wearablePadTarget.getTransform().getWorldPosition().y,
    z:wearablePadTarget.getTransform().getWorldPosition().z};
time=27.1;wearableEvents.UpdateEvent[0]();
assert.equal(wearablePadA.enabled,true);
assert.match(wearableCard.text,/Move pad toward target/);
leftTracked=false;time=27.2;wearableEvents.UpdateEvent[0]();
assert.equal(wearablePadA.enabled,false);
leftTracked=true;leftPalm={...wearablePadTarget.getTransform().getWorldPosition()};
for(let t=27.3;t<28.3;t+=0.05){time=t;wearableEvents.UpdateEvent[0]();}
assert.equal(wearablePadTarget.enabled,false);
time=29;wearablePinches[0]();
assert.match(wearableCard.text,/STAND CLEAR/);
assert.equal(wearablePadA.enabled,false);
time=30;voiceUpdates[1]({text:'Restart',isFinal:true});
assert.match(wearableCard.text,/Aim at MAP \+ pinch/);
time=30.5;wearableTargets[0]({isValid:true,
    rayOriginInWorld:{x:0,y:0,z:0},
    rayDirectionInWorld:{x:0,y:-0.2,z:-1}});
assert.match(wearableCard.text,/> MAP \/ PINCH/);
time=31;wearablePinches[0]();
assert.match(wearableCard.text,/CPR RESPONDER \/ SIM/);
time=32;wearablePinches[0]();
assert.match(wearableCard.text,/SECOND CHANCE/);
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
    const aiVoice=[],aiEvents={},aiObjects=new Map(),requests=[],audioRequests=[];
    let played=0,resourceBlob=null,finishAudio=()=>{};
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
        id==='SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData' ?
            {HandInputData:{getInstance:()=>({getHand:()=>({isTracked:()=>false})})}} :
        id==='LensStudio:GestureModule' ? {getPinchDownEvent:()=>({add(){}}),
            getTargetingDataEvent:()=>({add(){}})} :
        id==='LensStudio:RemoteMediaModule' ? {loadResourceAsAudioTrackAsset(resource,success){
            resourceBlob=resource.blob;success({name:'approved-audio'});
        }} :
        id==='LensStudio:InternetModule' ? {makeResourceFromBlob:blob=>({blob}),fetch:request=>{
            if (typeof request==='string') {
                audioRequests.push(request);
                return Promise.resolve({status:200,blob:async()=>({kind:'audio/mpeg'})});
            }
            requests.push(request);
            return Promise.resolve({status:200,json:async()=>({
                title:'CPR SPEED / 100-120',art:'compress',
                lines:['Press 100-120 per min.','Let the chest rise fully.','Beat here is practice only.'],
                topic:'rate',mode:'model'
            })});
        }} : (()=>{throw Error('unavailable');})()
    };
    vm.runInNewContext(source,aiContext,{filename:'SecondChanceDisplay.js'});
    const aiCard=aiObjects.get('SC Illustrated Practice Card').component;
    time=51;aiVoice[0]({text:'Ask AI how fast should I press?',isFinal:true});
    assert.match(aiCard.text,/CPR \/ PRESSING RATE/);
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,'https://example.test/api/lens/ask');
    assert.equal(JSON.parse(requests[0].options.body).question,'how fast should i press');
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(aiCard.text,/CPR SPEED \/ 100-120/);
    assert.match(aiCard.text,/100-120 per min/);
    assert.ok(aiCard.text.split('\n').every(line=>line.length<=28));
    assert.equal(audioRequests[0],'https://example.test/api/lens/audio?topic=rate');
    assert.equal(resourceBlob.kind,'audio/mpeg');
    assert.equal(audio.audioTrack.name,'approved-audio');
    assert.equal(played,1);
    time=52;aiVoice[0]({text:'Back',isFinal:true});
    assert.match(aiCard.text,/CPR SPEED \/ 100-120/);
    finishAudio();
    time=53;aiVoice[0]({text:'Back',isFinal:true});
    assert.match(aiCard.text,/SECOND CHANCE/);
    // ASR sometimes drops the short "Ask AI" prefix on Spectacles.
    time=55;aiVoice[0]({text:'How fast should I do CPR?',isFinal:true});
    assert.match(aiCard.text,/CPR \/ PRESSING RATE/);
    assert.equal(JSON.parse(requests[1].options.body).question,'how fast should i do cpr');
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(aiCard.text,/CPR SPEED \/ 100-120/);
    finishAudio();
    time=57;aiVoice[0]({text:'Back',isFinal:true});
    time=59;aiVoice[0]({text:'Ask AI',isFinal:true});
    assert.match(aiCard.text,/AI \/ ASK A QUESTION/);
    time=61;aiVoice[0]({text:'How fast should I press?',isFinal:true});
    assert.equal(JSON.parse(requests[2].options.body).question,'how fast should i press');
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(aiCard.text,/CPR SPEED \/ 100-120/);
    finishAudio();
    time=63;aiVoice[0]({text:'Back',isFinal:true});
    time=65;aiVoice[0]({text:'Ask A I how fast should I press?',isFinal:true});
    assert.match(aiCard.text,/CPR \/ PRESSING RATE/);
    assert.equal(JSON.parse(requests[3].options.body).question,'how fast should i press');
    finishAudio();
    time=67;aiVoice[0]({text:'Back',isFinal:true});
    time=69;aiVoice[0]({text:'Call my contact',isFinal:true});
    assert.equal(requests.at(-1).url,'https://example.test/api/phone/request');
    assert.equal(requests.at(-1).options.method,'POST');
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(aiCard.text,/CHECK IPHONE/);
    assert.match(aiCard.text,/NO CALL YET/);
}
checkLensAi().then(()=>console.log('Native Lens flow, palm placement, practice motion, and AI network checks passed.'))
    .catch(error=>{console.error(error);process.exitCode=1;});
