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
const cameraRoot={getComponent:type=>type==='Component.Camera'?{}:null};
function Vec4(r,g,b,a) { Object.assign(this,{r,g,b,a}); }
function Vec3(x,y,z) { Object.assign(this,{x,y,z}); }
function createObject(name) {
    const obj = {
        name,
        setParent(parent) {assert.equal(parent,cameraRoot);},
        getTransform: () => ({setWorldPosition(){},setLocalPosition(){},setLocalScale(){}}),
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
    script,Keys:{N:1,B:2,D:3,U:4,L:5},
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
    assert.equal(lines.length,card.text.includes('Practice motions:')?13:11);
    assert.ok(lines.every(line=>line.length<=28),'line too wide: '+card.text);
};
const tick=t=>{time=t;events.UpdateEvent.forEach(fn=>fn());check();};
const pinch=t=>{time=t;events.TriggerPrimaryEvent.forEach(fn=>fn());check();};
const voice=(t,text,isFinal=true)=>{time=t;voiceUpdates[0]({text,isFinal});check();};
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
pinch(4); assert.match(card.text,/CALL 911/);
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
assert.equal(logs.some(x=>x.includes('setup failed')),false,logs.join('\n'));
console.log('Native Lens flow and practice-motion state checks passed.');
