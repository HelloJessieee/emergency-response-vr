const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, 'SecondChance/Assets');
const source = fs.readFileSync(path.join(root, 'SecondChanceDisplay.js'), 'utf8');
const scene = fs.readFileSync(path.join(root, 'Scene.scene'), 'utf8');
const textureNames = [
    'checkTexture', 'callTexture', 'callAedTexture', 'handsTexture',
    'compressUpTexture', 'compressDownTexture', 'aedTexture'
];
const textures = Object.fromEntries(textureNames.map(name => [name, { name }]));
for (const name of textureNames) {
    assert.match(source, new RegExp(`@input Asset\\.Texture ${name}`));
    assert.match(scene, new RegExp(`${name}: !<reference\\.Texture> [0-9a-f-]+`));
}
const objects = new Map(), events = {}, logs = [];
let time = 0;
function Vec4(r,g,b,a) { Object.assign(this,{r,g,b,a}); }
function Vec3(x,y,z) { Object.assign(this,{x,y,z}); }
function createObject(name) {
    const obj = {
        name,
        getTransform: () => ({ setWorldPosition() {}, setLocalScale() {} }),
        createComponent(type) {
            assert.equal(type,'Component.Text');
            this.component = {
                text: '', textFill: { color: new Vec4(1,1,1,1) },
                backgroundSettings: { fill: {}, margins: {} }
            };
            return this.component;
        }
    };
    objects.set(name,obj); return obj;
}
const script = {
    ...textures,
    createEvent(type) { return { bind(fn) { (events[type] ||= []).push(fn); } }; }
};
const context = {
    vec4:Vec4, vec3:Vec3, getTime:()=>time, print:x=>logs.push(x),
    TextFillMode:{Texture:1}, StretchMode:{Stretch:1},
    global:{scene:{createSceneObject:createObject}}, script,
    require:()=>{throw Error('wearable API unavailable in test');}
};
vm.runInNewContext(source,context,{filename:'SecondChanceDisplay.js'});
assert.equal(logs.some(x=>x.includes('setup failed')),false,logs.join('\n'));
const card = objects.get('SC Illustrated Practice Card').component;
const art = objects.get('SC Action Illustration').component;
const tick=t=>{time=t; events.UpdateEvent.forEach(fn=>fn());};
const advance=t=>{time=t; events.TriggerPrimaryEvent.forEach(fn=>fn());};
assert.equal(objects.size,2);
assert.equal(events.UpdateEvent.length,1);
assert.equal(art.backgroundSettings.fill.texture.name,'checkTexture');
assert.equal(card.backgroundSettings.fill.texture,undefined);
assert.match(card.text,/CHECK RESPONSE/);
advance(1);
assert.equal(art.backgroundSettings.fill.texture.name,'callTexture');
advance(1.1);
assert.equal(art.backgroundSettings.fill.texture.name,'callTexture');
tick(1.8);
assert.equal(art.backgroundSettings.fill.texture.name,'callAedTexture');
advance(2);
assert.equal(art.backgroundSettings.fill.texture.name,'handsTexture');
advance(3);
assert.equal(art.backgroundSettings.fill.texture.name,'compressUpTexture');
const frames = new Set();
for(let t=3;t<4;t+=0.05){tick(t);frames.add(art.backgroundSettings.fill.texture.name);}
assert.deepEqual([...frames].sort(),['compressDownTexture','compressUpTexture']);
advance(4);
assert.equal(art.backgroundSettings.fill.texture.name,'aedTexture');
const finalText=card.text;
tick(4.2);tick(4.4);
assert.equal(card.text,finalText);
advance(5);
assert.equal(art.backgroundSettings.fill.texture.name,'checkTexture');
assert.equal(events.UpdateEvent.length,1);
assert.equal(logs.filter(x=>x.includes('practice step')).length,6);
assert.equal(logs.some(x=>x.includes('setup failed')),false);
console.log('Illustrated Lens state check passed: textures, five steps, debounce, staged AED, beat and restart.');
