const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.join(__dirname, "SecondChance/Assets");
const source = fs.readFileSync(
  path.join(root, "SecondChanceDisplay.js"),
  "utf8",
);
const scene = fs.readFileSync(path.join(root, "Scene.scene"), "utf8");
const scriptMeta = fs.readFileSync(
  path.join(root, "SecondChanceDisplay.js.meta"),
  "utf8",
);
const textureNames = [
  "checkTexture",
  "callTexture",
  "callAedTexture",
  "handsTexture",
  "compressUpTexture",
  "compressDownTexture",
  "aedTexture",
  "responderMapTexture",
  "handGuideBottomTexture",
  "handGuideTopTexture",
  "handGuideHeelTexture",
];
const textures = Object.fromEntries(
  textureNames.map((name) => [name, { name }]),
);
for (const name of textureNames) {
  assert.match(source, new RegExp(`@input Asset\\.Texture ${name}`));
  assert.match(scene, new RegExp(`${name}: !<reference\\.Texture> [0-9a-f-]+`));
}
// The screen 06 ghost-hand layers must be bound to the IDs Lens Studio
// imported, or the Lens would ship without them.
for (const [file, input] of Object.entries({
  hand_guide_bottom: "handGuideBottomTexture",
  hand_guide_top: "handGuideTopTexture",
  hand_guide_heel: "handGuideHeelTexture",
})) {
  const meta = fs.readFileSync(
    path.join(root, "Diagrams", file + ".png.meta"),
    "utf8",
  );
  const match = meta.match(/Texture: !<reference> ([0-9a-f-]+)/);
  assert.ok(match, `missing imported texture: ${file}`);
  assert.ok(
    scene.includes(`${input}: !<reference.Texture> ${match[1]}`),
    `guide texture not wired to scene: ${file}`,
  );
}
// Imported voice assets must be referenced by the active scene. A file on disk
// alone is not packaged into a Lens unless a scene component owns the asset.
for (const [topic, input] of Object.entries({
  rate: "voiceRate",
  depth: "voiceDepth",
  hands: "voiceHands",
  aed: "voiceAed",
  breathing: "voiceBreathing",
  call: "voiceCall",
  breaths: "voiceBreaths",
  team: "voiceTeam",
  overview: "voiceOverview",
  scope: "voiceScope",
})) {
  const meta = fs.readFileSync(
    path.join(root, "Voice", topic + ".mp3.meta"),
    "utf8",
  );
  const match = meta.match(/FileAudioTrack: !<reference> ([0-9a-f-]+)/);
  assert.ok(match, `missing imported audio track: ${topic}`);
  assert.match(source, new RegExp(`@input Asset\\.AudioTrackAsset ${input}`));
  assert.ok(
    scene.includes(`${input}: !<reference.AudioTrackAsset> ${match[1]}`),
    `voice not wired to scene: ${topic}`,
  );
}
assert.match(scene, /Name: SecondChanceDisplay[\s\S]*ScriptAsset:/);
assert.match(
  scene,
  /Name: FirstAidFinder[\s\S]*ScriptAsset: !<reference> e32b1985-fa17-4993-aff1-d572297cb3a1/,
);
assert.match(scene, /Name: SC Equipment Marker/);
assert.match(
  scene,
  /marker: !<reference.SceneObject> a81cf46d-f7d9-4ecf-9e13-aa9e27432145/,
);
assert.match(scene, /DeviceTrackingMode: World/);
for (const name of [
  "placementEnterRadiusCm",
  "placementExitRadiusCm",
  "placementDepthCm",
  "placementExitDepthCm",
  "placementHoldSeconds",
  "placementStackRadiusCm",
]) {
  assert.match(source, new RegExp(`@input float ${name}`));
  assert.match(scene, new RegExp(`${name}: (?:!<float> )?[0-9]`));
  assert.match(scriptMeta, new RegExp(`${name}: false`));
}

const objects = new Map(),
  events = {},
  logs = [],
  voiceUpdates = [];
let time = 0,
  asrStarted = false;
const cameraPose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { id: "camera" },
  // Lens Studio convention: a camera looks along back (-Z); forward is +Z.
  back: { x: 0, y: 0, z: -1 },
  forward: { x: 0, y: 0, z: 1 },
  up: { x: 0, y: 1, z: 0 },
  right: { x: 1, y: 0, z: 0 },
};
const cameraRoot = {
  getComponent: (type) => (type === "Component.Camera" ? {} : null),
  getTransform: () => ({
    forward: cameraPose.forward,
    back: cameraPose.back,
    up: cameraPose.up,
    right: cameraPose.right,
    getWorldPosition: () => cameraPose.position,
    getWorldRotation: () => cameraPose.rotation,
  }),
};
function Vec4(r, g, b, a) {
  Object.assign(this, { r, g, b, a });
}
function Vec3(x, y, z) {
  Object.assign(this, { x, y, z });
}
function Quat(w, x, y, z) {
  Object.assign(this, { w, x, y, z });
}
// Rotate v by quaternion q (q v q*), to check where an object's axes point.
function rotate(q, v) {
  const t = {
    x: 2 * (q.y * v.z - q.z * v.y),
    y: 2 * (q.z * v.x - q.x * v.z),
    z: 2 * (q.x * v.y - q.y * v.x),
  };
  return {
    x: v.x + q.w * t.x + (q.y * t.z - q.z * t.y),
    y: v.y + q.w * t.y + (q.z * t.x - q.x * t.z),
    z: v.z + q.w * t.z + (q.x * t.y - q.y * t.x),
  };
}
const near = (a, b, label) =>
  ["x", "y", "z"].forEach((k) =>
    assert.ok(Math.abs(a[k] - b[k]) < 1e-3, `${label}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`),
  );
function createObject(name) {
  const transform = {
    position: { x: 0, y: 0, z: -40 },
    rotation: null,
    setWorldPosition(p) {
      this.position = { x: p.x, y: p.y, z: p.z };
    },
    setLocalPosition(p) {
      this.position = { x: p.x, y: p.y, z: p.z };
    },
    setLocalScale() {},
    setWorldRotation(r) {
      this.rotation = r;
    },
    getWorldPosition() {
      return this.position;
    },
  };
  const obj = {
    name,
    setParent(parent) {
      assert.equal(parent, cameraRoot);
    },
    getTransform: () => transform,
    createComponent(type) {
      assert.equal(type, "Component.Text");
      this.component = {
        text: "",
        textFill: { color: new Vec4(1, 1, 1, 1) },
        backgroundSettings: { fill: {}, margins: {} },
        getBoundingBox: () => ({ left: -0.3, right: 0.3, bottom: -0.4, top: 0.4 }),
      };
      return this.component;
    },
  };
  objects.set(name, obj);
  return obj;
}
const script = {
  ...textures,
  api: {},
  createEvent(type) {
    return {
      bind(fn) {
        (events[type] ||= []).push(fn);
      },
    };
  },
};
const context = {
  vec4: Vec4,
  vec3: Vec3,
  quat: Quat,
  getTime: () => time,
  print: (x) => logs.push(x),
  TextFillMode: { Texture: 1 },
  StretchMode: { Stretch: 1 },
  global: {
    scene: { createSceneObject: createObject, getRootObject: () => cameraRoot },
    deviceInfoSystem: { isEditor: () => true },
  },
  script,
  Keys: {
    N: 1,
    B: 2,
    D: 3,
    U: 4,
    L: 5,
    C: 6,
    F: 7,
    X: 8,
    J: 9,
    K: 10,
    O: 11,
    R: 12,
    V: 13,
    T: 14,
  },
  AsrModule: {
    AsrTranscriptionOptions: {
      create: () => ({
        onTranscriptionUpdateEvent: { add: (fn) => voiceUpdates.push(fn) },
        onTranscriptionErrorEvent: { add() {} },
      }),
    },
    AsrMode: { HighAccuracy: 2 },
  },
  require: (id) =>
    id === "LensStudio:AsrModule"
      ? {
          startTranscribing() {
            asrStarted = true;
          },
        }
      : (() => {
          throw Error("wearable gesture API unavailable in Preview");
        })(),
};
vm.runInNewContext(source, context, { filename: "SecondChanceDisplay.js" });
assert.equal(
  logs.some((x) => x.includes("setup failed")),
  false,
  logs.join("\n"),
);
assert.equal(objects.size, 11);
assert.equal(events.UpdateEvent.length, 1);
assert.equal(events.TriggerPrimaryEvent.length, 1);
assert.equal(events.KeyPressEvent.length, 1);
assert.equal(asrStarted, true);
assert.equal(voiceUpdates.length, 1);
assert.equal(typeof script.api.practiceSample, "function");
const card = objects.get("SC Illustrated Practice Card").component;
const art = objects.get("SC Action Illustration").component;
const check = () => {
  const lines = card.text.split("\n");
  // Screens 06 and 09 use a compact card raised above their world targets.
  assert.equal(
    lines.length,
    card.text.includes("09 / AED PADS")
      ? 6
      : card.text.includes("06 / HAND POSITION")
        ? 7
        : card.text.includes("Practice motions:") ||
            card.text.includes("CALL / TRAINING ONLY")
          ? 13
          : 11,
  );
  assert.ok(
    lines.every((line) => line.length <= 28),
    "line too wide: " + card.text,
  );
};
const tick = (t) => {
  time = t;
  events.UpdateEvent.forEach((fn) => fn());
  check();
};
const pinch = (t) => {
  time = t;
  events.TriggerPrimaryEvent.forEach((fn) => fn());
  check();
};
const voice = (t, text, isFinal = true) => {
  time = t;
  voiceUpdates[0]({ text, isFinal });
  check();
};
const key = (t, keyName) => {
  time = t;
  events.KeyPressEvent[0]({ key: context.Keys[keyName] });
  check();
};
const sample = (t, x, y, z) => {
  time = t;
  script.api.practiceSample(
    x === null ? null : { side: "right", position: { x, y, z } },
    t,
  );
  check();
};
check();
assert.match(card.text, /SECOND CHANCE/);
assert.equal(art.backgroundSettings.fill.texture.name, "checkTexture");
pinch(1);
assert.match(card.text, /SCENE SAFETY/);
pinch(1.1);
assert.match(card.text, /SCENE SAFETY/);
pinch(2);
assert.match(card.text, /CHECK RESPONSE/);
pinch(3);
assert.match(card.text, /CHECK BREATHING/);
pinch(4);
assert.match(card.text, /CALL HELP/);
assert.match(card.text, /Use Siri hands-free/);
assert.match(card.text, /United States \/ 911/);
pinch(5);
assert.match(card.text, /ASSIGN ROLES/);
pinch(6);
assert.match(card.text, /HAND POSITION/);
pinch(7);
assert.match(card.text, /07 \/ COMPRESS/);
assert.match(card.text, /Stack your hands and\nbring them into view/);
assert.match(card.text, /Practice motions: 0/);
const frames = new Set(),
  beforeBeat = card.text;
for (let t = 7; t < 7.5; t += 0.04) {
  tick(t);
  frames.add(art.backgroundSettings.fill.texture.name);
}
assert.deepEqual([...frames].sort(), [
  "compressDownTexture",
  "compressUpTexture",
]);
// The beat swaps only the illustration; the card text is not rewritten.
assert.equal(card.text, beforeBeat);
for (let t = 7.51; t <= 7.91; t += 0.05) sample(t, 0, 0, 0);
assert.match(card.text, /Follow the beat/);
sample(7.95, 0, -2, 0);
sample(8, 0, 0, 0);
assert.match(card.text, /Practice motions: 0/);
function cycle(start) {
  for (let i = 0; i < 4; i++) sample(start + i * 0.05, 0, -8, 0);
  for (let i = 0; i < 5; i++) sample(start + 0.23 + i * 0.05, 0, 0, 0);
}
cycle(8.2);
assert.match(card.text, /Practice motions: 1/);
cycle(8.75);
cycle(9.3);
cycle(9.85);
assert.match(card.text, /Practice motions: 4/);
assert.match(card.text, /In range/);
sample(10.4, 8, 0, 0);
assert.match(card.text, /Practice motions: 4/);
for (let t = 10.6; t <= 11.0; t += 0.05) sample(t, 0, 0, 0);
sample(11.1, 0, -8, 0);
sample(11.15, 0, -8, 0);
sample(11.5, null, 0, 0);
assert.match(card.text, /Bring your hands\nback into view/);
assert.match(card.text, /Practice motions: 4/);
for (let t = 11.7; t <= 12.1; t += 0.05) sample(t, 0, 0, 0);
for (let t = 12.2; t <= 12.6; t += 0.05) sample(t, 0, 0, 0);
assert.match(card.text, /Practice motions: 4/);
pinch(14);
assert.match(card.text, /TURN ON AED/);
assert.equal(art.backgroundSettings.fill.texture.name, "aedTexture");
pinch(15);
assert.match(card.text, /AED PADS/);
const padA = objects.get("SC AED Pad A");
const padB = objects.get("SC AED Pad B");
const padATarget = objects.get("SC AED Pad A Target");
const padBTarget = objects.get("SC AED Pad B Target");
assert.equal(padATarget.enabled, true);
assert.equal(padA.enabled, false);
const fixedPadTarget = { ...padATarget.getTransform().getWorldPosition() };
// The camera looks along -Z here, so the pad targets must have z < 0.
assert.ok(fixedPadTarget.z < -40, "pad targets are in front of the wearer");
const farPad = {
  x: fixedPadTarget.x - 20,
  y: fixedPadTarget.y,
  z: fixedPadTarget.z,
};
script.api.padSample({ left: { ...farPad } }, 15.1);
assert.equal(padA.enabled, true);
// A new status settles briefly before the card is rewritten.
assert.match(card.text, /Bring a hand into view/);
script.api.padSample({ left: { ...farPad } }, 15.45);
assert.match(card.text, /Move pad toward target/);
const farPadX = padA.getTransform().getWorldPosition().x;
for (let t = 15.5; t < 15.9; t += 0.05)
  script.api.padSample(
    {
      left: {
        x: fixedPadTarget.x,
        y: fixedPadTarget.y,
        z: fixedPadTarget.z - 18,
      },
    },
    t,
  );
assert.notEqual(padA.getTransform().getWorldPosition().x, farPadX);
assert.equal(padATarget.enabled, true);
// A brief tracking dropout leaves the pad in place; a longer one hides it.
script.api.padSample({}, 15.95);
assert.equal(padA.enabled, true);
script.api.padSample({}, 16.2);
assert.equal(padA.enabled, false);
const fixedSecondTarget = { ...padBTarget.getTransform().getWorldPosition() };
for (let t = 16.25; t < 17.7; t += 0.05)
  script.api.padSample(
    {
      left: { ...fixedPadTarget },
      right: { ...fixedSecondTarget },
    },
    t,
  );
assert.equal(padATarget.enabled, false);
assert.equal(padBTarget.enabled, false);
assert.match(card.text, /Both pads on virtual targets/);
cameraPose.position = { x: 7, y: 2, z: 0 };
tick(17.8);
assert.deepEqual(padATarget.getTransform().getWorldPosition(), fixedPadTarget);
cameraPose.position = { x: 0, y: 0, z: 0 };
pinch(16);
assert.match(card.text, /STAND CLEAR/);
assert.equal(padA.enabled, false);
assert.equal(padB.enabled, false);
pinch(17);
assert.match(card.text, /RESUME CPR/);
assert.match(card.text, /NEXT: BACK TO START/);
// Screen 11 ends the lesson and returns to the start screen, not 07.
pinch(18);
assert.match(card.text, /SECOND CHANCE/);
assert.doesNotMatch(card.text, /07 \/ COMPRESS/);
// The next run starts fresh from screen 01.
pinch(18.5);
assert.match(card.text, /01 \/ SCENE SAFETY/);
voice(19, "How fast should I do CPR?");
assert.match(card.text, /CPR \/ PRESSING RATE/);
assert.match(card.text, /100-120 compressions\/min/);
voice(20, "Back");
assert.match(card.text, /01 \/ SCENE SAFETY/);
voice(21, "Restart");
assert.match(card.text, /SECOND CHANCE/);
voice(22, "Start emergency");
assert.match(card.text, /SCENE SAFETY/);
voice(23, "Unsafe");
assert.match(card.text, /SCENE UNSAFE/);
voice(24, "Restart");
assert.match(card.text, /SECOND CHANCE/);
voice(25, "Start emergency");
assert.match(card.text, /SCENE SAFETY/);
voice(26, "It's safe");
assert.match(card.text, /CHECK RESPONSE/);
voice(27, "He doesn't respond");
assert.match(card.text, /CHECK BREATHING/);
voice(28, "Only gasping");
assert.match(card.text, /CALL HELP/);
voice(29, "Restart");
voice(30, "Start emergency");
assert.match(card.text, /SCENE SAFETY/);
assert.match(card.text, /United States \/ 911/);
key(31, "C");
assert.match(card.text, /Start simulated call/);
assert.match(card.text, /PHONE: CALL 911 NOW/);
key(31.5, "N");
assert.match(card.text, /SIMULATED CALL \/ RINGING/);
pinch(31.6);
assert.match(card.text, /SIMULATED CALL \/ RINGING/);
key(32.1, "X");
assert.match(card.text, /SCENE SAFETY/);
tick(34);
assert.doesNotMatch(card.text, /dispatcher connected/);
key(35, "C");
key(35.6, "N");
tick(37.3);
assert.match(card.text, /SIM DISPATCHER CONNECTED/);
assert.match(card.text, /Where are you/);
key(38, "N");
assert.match(card.text, /Is the person responsive/);
key(39, "N");
assert.match(card.text, /Are they breathing normally/);
key(40, "N");
assert.match(card.text, /SIMULATION ENDED/);
key(41, "N");
assert.match(card.text, /SCENE SAFETY/);
pinch(42);
assert.match(card.text, /CHECK RESPONSE/);
key(43, "C");
key(43.6, "F");
assert.match(card.text, /> Cancel/);
key(44.2, "N");
assert.match(card.text, /CHECK RESPONSE/);
// Step 3 placement uses update samples, never pinch, and the target is world-fixed.
voice(45, "Restart");
for (let t = 46; t <= 51; t++) pinch(t);
assert.match(card.text, /06 \/ HAND POSITION/);
assert.match(card.text, /Bring your hands into view/);
const virtualTarget = objects.get("SC Virtual Placement Target");
const leftMarker = objects.get("SC Left Palm Marker");
const rightMarker = objects.get("SC Right Palm Marker");
assert.equal(virtualTarget.enabled, true);
assert.equal(leftMarker.enabled, false);
const originalTarget = { ...virtualTarget.getTransform().getWorldPosition() };
// The compact card sits above the target and hides the illustration.
assert.equal(objects.get("SC Action Illustration").enabled, false);
assert.equal(
  objects.get("SC Illustrated Practice Card").getTransform().getWorldPosition()
    .y,
  9,
);
// Ghost hands lie flat (palms down) about waist height in front of the
// wearer, fingers pointing away, with the heel ring on the target point.
const guideBottom = objects.get("SC Hand Guide Bottom Hand");
const guideTop = objects.get("SC Hand Guide Top Hand");
assert.equal(guideBottom.enabled, true);
assert.equal(guideTop.enabled, true);
near(originalTarget, { x: 0, y: -45, z: -40 }, "heel ring position");
for (const layer of [guideBottom, guideTop, virtualTarget]) {
  const q = layer.getTransform().rotation;
  near(rotate(q, { x: 0, y: 0, z: 1 }), { x: 0, y: 1, z: 0 }, "faces up");
  near(rotate(q, { x: 0, y: 1, z: 0 }), { x: 0, y: 0, z: -1 }, "fingers away");
  near(rotate(q, { x: 1, y: 0, z: 0 }), { x: 1, y: 0, z: 0 }, "right is right");
}
// The drawing's heel is 9.875 cm toward the wearer from the layer centre.
const handsCentre = { x: 0, y: -45, z: -49.875 };
near(guideBottom.getTransform().getWorldPosition(), handsCentre, "hands centre");
near(guideTop.getTransform().getWorldPosition(), handsCentre, "top hand centre");
// Margins turn the measured 0.6 x 0.8 glyph box into exact picture sizes.
const sized = (object) => {
  const m = object.component.backgroundSettings.margins;
  return { x: m.left + m.right + 0.6, y: m.top + m.bottom + 0.8, z: 0 };
};
near(sized(guideBottom), { x: 20, y: 24, z: 0 }, "hand layer size");
near(sized(virtualTarget), { x: 5, y: 5, z: 0 }, "heel ring size");
assert.equal(
  guideBottom.component.backgroundSettings.fill.texture.name,
  "handGuideBottomTexture",
);
assert.equal(
  guideTop.component.backgroundSettings.fill.texture.name,
  "handGuideTopTexture",
);
assert.equal(
  virtualTarget.component.backgroundSettings.fill.texture.name,
  "handGuideHeelTexture",
);
assert.ok(logs.some((x) => x.includes("SC Hand Guide Bottom Hand sized 20 x 24")));
key(51.1, "J");
tick(51.15);
assert.equal(leftMarker.enabled, true);
// A new status settles for 0.3 s before the card is rewritten.
assert.match(card.text, /Bring your hands into view/);
for (let t = 51.2; t < 51.6; t += 0.05) tick(t);
assert.match(card.text, /Move toward the target/);
const farX = leftMarker.getTransform().getWorldPosition().x;
key(51.6, "O");
for (let t = 51.65; t < 52.3; t += 0.05) tick(t);
assert.notEqual(leftMarker.getTransform().getWorldPosition().x, farX);
assert.match(card.text, /Move toward the target/);
key(52.35, "K");
for (let t = 52.4; t < 53.6; t += 0.05) tick(t);
assert.match(card.text, /Hand aligned with target/);
assert.match(card.text, /Second hand out of view/);
cameraPose.position = { x: 9, y: 4, z: 2 };
tick(53.65);
cameraPose.back = { x: 0.3, y: 0, z: -0.953 };
cameraPose.forward = { x: -0.3, y: 0, z: 0.953 };
cameraPose.right = { x: 0.953, y: 0, z: 0.3 };
tick(53.7);
assert.deepEqual(
  virtualTarget.getTransform().getWorldPosition(),
  originalTarget,
);
assert.match(card.text, /Hand aligned with target/);
// A voice card hides the guides; closing it restores the same target even
// though the head has moved, instead of re-anchoring it.
voice(53.75, "Find supplies");
assert.match(card.text, /FIND \/ SAY ITEM AGAIN/);
assert.equal(virtualTarget.enabled, false);
assert.equal(leftMarker.enabled, false);
assert.equal(guideBottom.enabled, false);
assert.equal(guideTop.enabled, false);
voice(54.25, "Back");
assert.match(card.text, /06 \/ HAND POSITION/);
assert.equal(virtualTarget.enabled, true);
assert.equal(guideBottom.enabled, true);
near(guideBottom.getTransform().getWorldPosition(), handsCentre, "restored");
assert.deepEqual(
  virtualTarget.getTransform().getWorldPosition(),
  originalTarget,
);
key(54.3, "J");
for (let t = 54.35; t < 55.0; t += 0.05) tick(t);
assert.match(card.text, /Move toward the target/);
key(55.05, "L");
tick(55.1);
// Brief loss keeps the marker; sustained loss hides it.
assert.equal(leftMarker.enabled, true);
for (let t = 55.15; t < 55.75; t += 0.05) tick(t);
assert.equal(leftMarker.enabled, false);
assert.match(card.text, /Bring your hands into view/);
key(55.75, "R");
for (let t = 55.8; t < 57.0; t += 0.05) tick(t);
assert.equal(rightMarker.enabled, true);
assert.match(card.text, /Hand aligned with target/);
key(57.0, "V");
for (let t = 57.05; t < 58.15; t += 0.05) tick(t);
assert.match(card.text, /Hands stacked \(approx\.\)/);
key(58.15, "L");
for (let t = 58.2; t < 58.85; t += 0.05) tick(t);
assert.equal(rightMarker.enabled, false);
assert.match(card.text, /Bring your hands into view/);
key(58.85, "J");
tick(58.9);
key(58.95, "T");
assert.notDeepEqual(
  virtualTarget.getTransform().getWorldPosition(),
  originalTarget,
);
assert.match(card.text, /Virtual target set by you/);
// The ghost moves with the target and keeps its level, away-facing layout.
const movedTarget = virtualTarget.getTransform().getWorldPosition();
near(
  guideBottom.getTransform().getWorldPosition(),
  { x: movedTarget.x, y: movedTarget.y, z: movedTarget.z - 9.875 },
  "ghost follows set target",
);
near(
  rotate(guideBottom.getTransform().rotation, { x: 0, y: 0, z: 1 }),
  { x: 0, y: 1, z: 0 },
  "still flat",
);
pinch(59);
assert.match(card.text, /07 \/ COMPRESS/);
assert.equal(
  objects.get("SC Illustrated Practice Card").getTransform().getWorldPosition()
    .y,
  0,
);
cameraPose.back = { x: 0, y: 0, z: -1 };
cameraPose.forward = { x: 0, y: 0, z: 1 };
cameraPose.right = { x: 1, y: 0, z: 0 };
assert.equal(virtualTarget.enabled, false);
assert.equal(leftMarker.enabled, false);
assert.equal(guideBottom.enabled, false);
assert.equal(guideTop.enabled, false);
assert.equal(
  logs.some((x) => x.includes("setup failed")),
  false,
  logs.join("\n"),
);
// The existing ASR session routes equipment commands into the scene-bound
// TypeScript finder and displays its status without advancing the lesson.
let requestedItem = "",
  markerCleared = 0;
context.global.secondChanceFindEquipment = (item) => {
  requestedItem = item;
};
context.global.secondChanceClearEquipment = () => {
  markerCleared++;
};
voice(60, "Find the gauze");
assert.equal(requestedItem, "gauze");
assert.match(card.text, /FIND \/ CAPTURING/);
context.global.secondChanceVisionStatus(
  "Item not located. Ask another person.",
);
assert.match(card.text, /FIND \/ NOT LOCATED/);
context.global.secondChanceVisionStatus("Possible gauze — verify visually.");
assert.equal(objects.get("SC Illustrated Practice Card").enabled, false);
voice(61, "Back");
assert.match(card.text, /07 \/ COMPRESS/);
assert.equal(objects.get("SC Illustrated Practice Card").enabled, true);
voice(61.6, "Find the goat");
assert.equal(requestedItem, "gauze");
assert.match(card.text, /FIND \/ CAPTURING/);
voice(62.2, "Back");
assert.match(card.text, /07 \/ COMPRESS/);
voice(62.8, "Find the dressing");
assert.equal(requestedItem, "gauze");
assert.match(card.text, /FIND \/ CAPTURING/);
voice(63.4, "Back");
assert.match(card.text, /07 \/ COMPRESS/);
assert.ok(markerCleared > 0);
voice(64, "Locate CPR responder nearby");
assert.match(card.text, /CPR RESPONDER \/ SIM/);
assert.match(card.text, /SIM ONLY \/ NO LIVE POSITION/);
assert.equal(art.backgroundSettings.fill.texture.name, "responderMapTexture");
voice(65, "Back");
assert.match(card.text, /07 \/ COMPRESS/);
voice(66, "Dressing");
assert.equal(requestedItem, "gauze");
assert.match(card.text, /FIND \/ CAPTURING/);
voice(67, "Back");
voice(68, "Find supplies");
assert.match(card.text, /FIND \/ SAY ITEM AGAIN/);
assert.match(card.text, /NO IMAGE CAPTURED/);
voice(69, "Back");
assert.match(card.text, /07 \/ COMPRESS/);
// Run the wearable input adapter against SIK-shaped hands, separate from the
// editor injection above. The real headset still requires a manikin check.
const wearableEvents = {},
  wearablePinches = [],
  wearablePinchUps = [],
  wearableTargets = [],
  wearableLogs = [];
let wrist = { x: 0, y: 0, z: 0 },
  tracked = false,
  leftTracked = false;
let palm = { x: 0, y: 0, z: 0 },
  leftPalm = { x: 0, y: 0, z: 0 };
const rightHand = {
  isTracked: () => tracked,
  wrist: {
    get position() {
      return wrist;
    },
  },
  getPalmCenter: () => (tracked ? palm : null),
};
const leftHand = {
  isTracked: () => leftTracked,
  wrist: { position: { x: 0, y: 0, z: 0 } },
  getPalmCenter: () => (leftTracked ? leftPalm : null),
};
const wearableScript = {
  ...textures,
  api: {},
  createEvent(type) {
    return {
      bind(fn) {
        (wearableEvents[type] ||= []).push(fn);
      },
    };
  },
};
const wearableContext = {
  ...context,
  script: wearableScript,
  print: (x) => wearableLogs.push(x),
  global: {
    scene: { createSceneObject: createObject, getRootObject: () => cameraRoot },
    deviceInfoSystem: { isEditor: () => false },
  },
  require: (id) => {
    if (
      id ===
      "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"
    )
      return {
        HandInputData: {
          getInstance: () => ({
            getHand: (side) => (side === "left" ? leftHand : rightHand),
          }),
        },
      };
    if (id === "LensStudio:GestureModule")
      return {
        getPinchDownEvent: () => ({ add: (fn) => wearablePinches.push(fn) }),
        getPinchUpEvent: () => ({ add: (fn) => wearablePinchUps.push(fn) }),
        getTargetingDataEvent: () => ({
          add: (fn) => wearableTargets.push(fn),
        }),
      };
    if (id === "LensStudio:AsrModule") return { startTranscribing() {} };
    throw Error("unexpected require: " + id);
  },
};
vm.runInNewContext(source, wearableContext, {
  filename: "SecondChanceDisplay.js",
});
assert.equal(
  wearableLogs.some((x) => x.includes("setup failed")),
  false,
  wearableLogs.join("\n"),
);
assert.equal(
  wearableLogs.some((x) =>
    x.includes("world-space palm and wrist tracking ready"),
  ),
  true,
);
assert.equal(
  wearableLogs.some((x) =>
    x.includes("pinch hold ready on hand-practice screens"),
  ),
  true,
);
assert.equal(wearablePinches.length, 2);
assert.equal(wearablePinchUps.length, 2);
assert.equal(wearableTargets.length, 2);
const wearableCard = objects.get("SC Illustrated Practice Card").component;
const wearableTick = (t) => {
  time = t;
  wearableEvents.UpdateEvent[0]();
};
// Press, keep holding through frame updates for 0.85 s, then release.
function holdPinch(start, hand = 0) {
  time = start;
  wearablePinches[hand]();
  for (let t = start + 0.05; t < start + 0.86; t += 0.05) wearableTick(t);
  time = start + 0.9;
  wearablePinchUps[hand]();
}
for (let t = 1; t <= 6; t++) {
  time = t;
  wearablePinches[0]();
}
assert.match(wearableCard.text, /06 \/ HAND POSITION/);
assert.match(wearableCard.text, /HOLD PINCH \/ SAY NEXT/);
// Screen 06: a quick pinch does not advance.
tracked = true;
palm = { x: 30, y: 0, z: -40 };
time = 6.4;
wearablePinches[0]();
assert.match(wearableCard.text, /HOLDING PINCH \[----\]/);
wearableTick(6.5);
time = 6.6;
wearablePinchUps[0]();
assert.match(wearableCard.text, /06 \/ HAND POSITION/);
assert.match(wearableCard.text, /HOLD LONGER TO CONTINUE/);
// TriggerPrimaryEvent has no release signal, so it cannot bypass the hold.
time = 6.7;
wearableEvents.TriggerPrimaryEvent[0]();
assert.match(wearableCard.text, /06 \/ HAND POSITION/);
// A pinch while both hands are together is treated as accidental.
leftTracked = true;
leftPalm = { x: 33, y: 0, z: -40 };
time = 6.8;
wearablePinches[1]();
assert.match(wearableCard.text, /SEPARATE HANDS, THEN PINCH/);
wearableTick(6.85);
assert.doesNotMatch(wearableCard.text, /HOLDING PINCH/);
// Hands coming together during a hold cancel it.
leftTracked = false;
time = 6.9;
wearablePinches[0]();
assert.match(wearableCard.text, /HOLDING PINCH/);
leftTracked = true;
wearableTick(6.95);
assert.match(wearableCard.text, /SEPARATE HANDS, THEN PINCH/);
assert.match(wearableCard.text, /06 \/ HAND POSITION/);
leftTracked = false;
time = 7.0;
wearablePinchUps[0]();
// Holding for 0.8 s advances exactly once, even if the pinch stays closed.
time = 7.1;
wearablePinches[0]();
wearableTick(7.55);
assert.match(wearableCard.text, /HOLDING PINCH \[##--\]/);
for (let t = 7.6; t < 7.96; t += 0.05) wearableTick(t);
assert.match(wearableCard.text, /07 \/ COMPRESS/);
assert.match(wearableCard.text, /HOLD PINCH \/ SAY NEXT/);
wearableTick(8.0);
wearableTick(8.5);
time = 8.55;
wearablePinchUps[0]();
assert.match(wearableCard.text, /07 \/ COMPRESS/);
assert.ok(
  wearableLogs.some((x) =>
    /pinch 0 released after 0\.20s on hands: not advanced/.test(x),
  ),
);
assert.ok(
  wearableLogs.some((x) => /pinch 1 ignored on hands: hands together/.test(x)),
);
assert.ok(
  wearableLogs.some((x) =>
    /pinch 0 hold cancelled on hands: hands together/.test(x),
  ),
);
assert.ok(
  wearableLogs.some((x) => /pinch 0 held 0\.8\ds on hands: next/.test(x)),
);
for (let t = 8.6; t <= 9.0; t += 0.05) wearableTick(t);
for (let i = 0; i < 4; i++) {
  time = 9.1 + i * 0.05;
  wrist = { x: 0, y: -8, z: 0 };
  wearableEvents.UpdateEvent[0]();
}
for (let i = 0; i < 5; i++) {
  time = 9.33 + i * 0.05;
  wrist = { x: 0, y: 0, z: 0 };
  wearableEvents.UpdateEvent[0]();
}
assert.match(wearableCard.text, /Practice motions: 1/);
holdPinch(9.7, 1);
assert.match(wearableCard.text, /TURN ON AED/);
time = 11;
voiceUpdates[1]({ text: "Restart", isFinal: true });
time = 11.5;
voiceUpdates[1]({ text: "Start emergency", isFinal: true });
time = 12;
wearableTargets[0]({
  isValid: true,
  rayOriginInWorld: { x: 0, y: 0, z: 0 },
  rayDirectionInWorld: { x: 0, y: -0.2, z: -1 },
});
assert.match(wearableCard.text, /> CALL EMERGENCY/);
time = 12.6;
wearablePinches[0]();
assert.match(wearableCard.text, /Start simulated call/);
wearableEvents.TriggerPrimaryEvent[0]();
assert.match(wearableCard.text, /Start simulated call/);
time = 13.2;
wearableTargets[0]({
  isValid: true,
  rayOriginInWorld: { x: 0, y: 0, z: 0 },
  rayDirectionInWorld: { x: 0, y: -0.25, z: -1 },
});
assert.match(wearableCard.text, /> Cancel/);
time = 13.8;
wearablePinches[0]();
assert.match(wearableCard.text, /SCENE SAFETY/);
time = 14.5;
wearablePinches[0]();
assert.match(wearableCard.text, /CHECK RESPONSE/);
time = 15;
voiceUpdates[1]({ text: "Restart", isFinal: true });
for (let t = 16; t <= 21; t++) {
  time = t;
  wearablePinches[0]();
}
assert.match(wearableCard.text, /06 \/ HAND POSITION/);
const wearableTarget = objects.get("SC Virtual Placement Target");
const wearableRight = objects.get("SC Right Palm Marker");
const wearableLeft = objects.get("SC Left Palm Marker");
const targetPosition = wearableTarget.getTransform().getWorldPosition();
tracked = true;
palm = { x: targetPosition.x - 18, y: targetPosition.y, z: targetPosition.z };
wearableTick(21.1);
assert.equal(wearableRight.enabled, true);
assert.equal(wearableLeft.enabled, false);
for (let t = 21.15; t < 21.5; t += 0.05) wearableTick(t);
assert.match(wearableCard.text, /Move toward the target/);
palm = { ...targetPosition };
for (let t = 21.5; t < 22.8; t += 0.05) wearableTick(t);
assert.match(wearableCard.text, /Hand aligned with target/);
palm = { x: targetPosition.x + 18, y: targetPosition.y, z: targetPosition.z };
for (let t = 22.85; t < 23.45; t += 0.05) wearableTick(t);
assert.match(wearableCard.text, /Move toward the target/);
// A single dropped frame keeps the marker; sustained loss hides it.
tracked = false;
wearableTick(23.5);
assert.equal(wearableRight.enabled, true);
for (let t = 23.55; t < 24.1; t += 0.05) wearableTick(t);
assert.equal(wearableRight.enabled, false);
assert.match(wearableCard.text, /Bring your hands into view/);
leftTracked = true;
leftPalm = { ...targetPosition };
for (let t = 24.15; t < 25.3; t += 0.05) wearableTick(t);
assert.equal(wearableLeft.enabled, true);
assert.match(wearableCard.text, /Hand aligned with target/);
holdPinch(25.4);
assert.match(wearableCard.text, /07 \/ COMPRESS/);
assert.equal(wearableTarget.enabled, false);
assert.equal(wearableLeft.enabled, false);
holdPinch(26.8);
assert.match(wearableCard.text, /TURN ON AED/);
time = 28.2;
wearablePinches[0]();
assert.match(wearableCard.text, /09 \/ AED PADS/);
assert.match(wearableCard.text, /HOLD PINCH \/ SAY NEXT/);
const wearablePadA = objects.get("SC AED Pad A");
const wearablePadTarget = objects.get("SC AED Pad A Target");
leftPalm = {
  x: wearablePadTarget.getTransform().getWorldPosition().x - 18,
  y: wearablePadTarget.getTransform().getWorldPosition().y,
  z: wearablePadTarget.getTransform().getWorldPosition().z,
};
wearableTick(28.25);
assert.equal(wearablePadA.enabled, true);
for (let t = 28.3; t < 28.7; t += 0.05) wearableTick(t);
assert.match(wearableCard.text, /Move pad toward target/);
leftTracked = false;
wearableTick(28.7);
assert.equal(wearablePadA.enabled, true);
for (let t = 28.75; t < 29.1; t += 0.05) wearableTick(t);
assert.equal(wearablePadA.enabled, false);
leftTracked = true;
leftPalm = { ...wearablePadTarget.getTransform().getWorldPosition() };
for (let t = 29.15; t < 30.2; t += 0.05) wearableTick(t);
assert.equal(wearablePadTarget.enabled, false);
holdPinch(30.3);
assert.match(wearableCard.text, /STAND CLEAR/);
assert.equal(wearablePadA.enabled, false);
time = 31.7;
voiceUpdates[1]({ text: "Restart", isFinal: true });
assert.match(wearableCard.text, /Aim at MAP \+ pinch/);
time = 32.2;
wearableTargets[0]({
  isValid: true,
  rayOriginInWorld: { x: 0, y: 0, z: 0 },
  rayDirectionInWorld: { x: 0, y: -0.2, z: -1 },
});
assert.match(wearableCard.text, /> MAP \/ PINCH/);
time = 32.7;
wearablePinches[0]();
assert.match(wearableCard.text, /CPR RESPONDER \/ SIM/);
time = 33.4;
wearablePinches[0]();
assert.match(wearableCard.text, /SECOND CHANCE/);
// Voice recovery on the headset: a silent or failed speech session is
// stopped and restarted, and recognised phrases are echoed in the footer.
{
  const asrEvents = {},
    asrLog = [],
    asrUpdates = [],
    asrErrors = [];
  let starts = 0,
    stops = 0;
  const asrScript = {
    ...textures,
    api: {},
    createEvent(type) {
      return {
        bind(fn) {
          (asrEvents[type] ||= []).push(fn);
        },
      };
    },
  };
  time = 100;
  vm.runInNewContext(
    source,
    {
      ...context,
      script: asrScript,
      print: (x) => asrLog.push(x),
      global: {
        scene: { createSceneObject: createObject, getRootObject: () => cameraRoot },
        deviceInfoSystem: { isEditor: () => false },
      },
      AsrModule: {
        AsrTranscriptionOptions: {
          create: () => ({
            onTranscriptionUpdateEvent: { add: (fn) => asrUpdates.push(fn) },
            onTranscriptionErrorEvent: { add: (fn) => asrErrors.push(fn) },
          }),
        },
        AsrMode: { HighAccuracy: 2 },
        AsrStatusCode: { Success: 0, InternalError: 1, Unauthenticated: 2, NoInternet: 3 },
      },
      require: (id) =>
        id === "LensStudio:AsrModule"
          ? {
              startTranscribing() {
                starts++;
              },
              stopTranscribing() {
                stops++;
                return { then: (done) => done() };
              },
            }
          : (() => {
              throw Error("unavailable");
            })(),
    },
    { filename: "SecondChanceDisplay.js" },
  );
  const asrCard = objects.get("SC Illustrated Practice Card").component;
  const asrTick = (t) => {
    time = t;
    asrEvents.UpdateEvent[0]();
  };
  assert.equal(starts, 1);
  asrTick(110);
  assert.equal(starts, 1);
  // 20 s with no speech events at all: stop, then start a fresh session.
  asrTick(120.5);
  assert.equal(stops, 1);
  assert.equal(starts, 2);
  assert.ok(asrLog.some((x) => /voice restarting: no speech events for 2\ds/.test(x)));
  // Consecutive silent restarts wait twice as long (40 s).
  asrTick(150);
  assert.equal(starts, 2);
  asrTick(160.6);
  assert.equal(starts, 3);
  // Speech resets the wait; the footer keeps its normal instruction.
  time = 161;
  asrUpdates[0]({ text: "Next", isFinal: true });
  assert.match(asrCard.text, /01 \/ SCENE SAFETY/);
  assert.doesNotMatch(asrCard.text, /HEARD:/);
  assert.match(asrCard.text, /CALL EMERGENCY: AIM\+PINCH/);
  asrTick(163.1);
  asrTick(180);
  assert.equal(starts, 3);
  asrTick(181.2);
  assert.equal(starts, 4);
  // An error no longer ends voice for the run: retry after 3 s, then 6 s.
  time = 182;
  asrErrors[0](1);
  assert.match(asrCard.text, /VOICE UNAVAILABLE/);
  asrTick(184.9);
  assert.equal(starts, 4);
  asrTick(185.1);
  assert.equal(starts, 5);
  time = 186;
  asrErrors[0](1);
  asrTick(191.9);
  assert.equal(starts, 5);
  asrTick(192.1);
  assert.equal(starts, 6);
  assert.equal(stops, starts - 1, "every restart stops the old session first");
  time = 193;
  asrUpdates[0]({ text: "Hmm", isFinal: false });
  assert.doesNotMatch(asrCard.text, /VOICE UNAVAILABLE/);
}
function checkRegion(region, number, expected, panelExpected) {
  // Tolerate formatter spacing, and fail loudly if the config line moves.
  const configPattern =
    /regionLabel:\s*"United States",\s*emergencyNumber:\s*"911"/;
  assert.match(source, configPattern);
  const variantSource = source.replace(
    configPattern,
    `regionLabel:"${region}", emergencyNumber:"${number}"`,
  );
  const variantEvents = {};
  const variantScript = {
    ...textures,
    api: {},
    createEvent(type) {
      return {
        bind(fn) {
          (variantEvents[type] ||= []).push(fn);
        },
      };
    },
  };
  vm.runInNewContext(
    variantSource,
    { ...context, script: variantScript },
    { filename: "SecondChanceDisplay.js" },
  );
  const variantCard = objects.get("SC Illustrated Practice Card").component;
  time = 50;
  variantEvents.KeyPressEvent[0]({ key: context.Keys.N });
  assert.match(variantCard.text, expected);
  time = 51;
  variantEvents.KeyPressEvent[0]({ key: context.Keys.C });
  assert.match(variantCard.text, panelExpected || expected);
  assert.equal(variantCard.text.split("\n").length, 13);
  assert.ok(variantCard.text.split("\n").every((line) => line.length <= 28));
}
checkRegion("Demo Region", "5550100", /Demo Region \/ 5550100/);
checkRegion(
  "",
  "",
  /Region not configured/,
  /Region not configured[\s\S]*Call local emergency\nservices on your phone/,
);
async function checkLensAi() {
  const aiVoice = [],
    aiEvents = {},
    aiObjects = new Map(),
    requests = [],
    audioRequests = [];
  let played = 0,
    resourceBlob = null,
    finishAudio = () => {};
  const audio = {
    audioTrack: null,
    volume: 0,
    isPlaying: () => false,
    stop() {},
    setOnFinish(fn) {
      finishAudio = fn;
    },
    play() {
      played++;
    },
  };
  const aiScript = {
    ...textures,
    aiBaseUrl: "https://example.test",
    api: {},
    createEvent(type) {
      return {
        bind(fn) {
          (aiEvents[type] ||= []).push(fn);
        },
      };
    },
  };
  const aiContext = {
    ...context,
    script: aiScript,
    Request: class {
      constructor(url, options) {
        this.url = url;
        this.options = options;
      }
    },
    global: {
      scene: {
        createSceneObject(name) {
          const object = createObject(name),
            base = object.createComponent;
          object.createComponent = function (type) {
            return type === "Component.AudioComponent"
              ? audio
              : base.call(this, type);
          };
          aiObjects.set(name, object);
          return object;
        },
        getRootObject: () => cameraRoot,
      },
      deviceInfoSystem: { isEditor: () => false },
    },
    AsrModule: {
      AsrTranscriptionOptions: {
        create: () => ({
          onTranscriptionUpdateEvent: { add: (fn) => aiVoice.push(fn) },
          onTranscriptionErrorEvent: { add() {} },
        }),
      },
      AsrMode: { Balanced: 1 },
    },
    require: (id) =>
      id === "LensStudio:AsrModule"
        ? { startTranscribing() {} }
        : id ===
            "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"
          ? {
              HandInputData: {
                getInstance: () => ({
                  getHand: () => ({ isTracked: () => false }),
                }),
              },
            }
          : id === "LensStudio:GestureModule"
            ? {
                getPinchDownEvent: () => ({ add() {} }),
                getTargetingDataEvent: () => ({ add() {} }),
              }
            : id === "LensStudio:RemoteMediaModule"
              ? {
                  loadResourceAsAudioTrackAsset(resource, success) {
                    resourceBlob = resource.blob;
                    success({ name: "approved-audio" });
                  },
                }
              : id === "LensStudio:InternetModule"
                ? {
                    makeResourceFromBlob: (blob) => ({ blob }),
                    fetch: (request) => {
                      if (typeof request === "string") {
                        audioRequests.push(request);
                        return Promise.resolve({
                          status: 200,
                          blob: async () => ({ kind: "audio/mpeg" }),
                        });
                      }
                      requests.push(request);
                      return Promise.resolve({
                        status: 200,
                        json: async () => ({
                          title: "CPR SPEED / 100-120",
                          art: "compress",
                          lines: [
                            "Press 100-120 per min.",
                            "Let the chest rise fully.",
                            "Beat here is practice only.",
                          ],
                          topic: "rate",
                          mode: "model",
                        }),
                      });
                    },
                  }
                : (() => {
                    throw Error("unavailable");
                  })(),
  };
  vm.runInNewContext(source, aiContext, { filename: "SecondChanceDisplay.js" });
  const aiCard = aiObjects.get("SC Illustrated Practice Card").component;
  time = 51;
  aiVoice[0]({ text: "Ask AI how fast should I press?", isFinal: true });
  assert.match(aiCard.text, /CPR \/ PRESSING RATE/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://example.test/api/lens/ask");
  assert.equal(
    JSON.parse(requests[0].options.body).question,
    "how fast should i press",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(aiCard.text, /CPR SPEED \/ 100-120/);
  assert.match(aiCard.text, /100-120 per min/);
  assert.ok(aiCard.text.split("\n").every((line) => line.length <= 28));
  assert.equal(
    audioRequests[0],
    "https://example.test/api/lens/audio?topic=rate",
  );
  assert.equal(resourceBlob.kind, "audio/mpeg");
  assert.equal(audio.audioTrack.name, "approved-audio");
  assert.equal(played, 1);
  time = 52;
  aiVoice[0]({ text: "Back", isFinal: true });
  assert.match(aiCard.text, /CPR SPEED \/ 100-120/);
  finishAudio();
  time = 53;
  aiVoice[0]({ text: "Back", isFinal: true });
  assert.match(aiCard.text, /SECOND CHANCE/);
  // ASR sometimes drops the short "Ask AI" prefix on Spectacles.
  time = 55;
  aiVoice[0]({ text: "How fast should I do CPR?", isFinal: true });
  assert.match(aiCard.text, /CPR \/ PRESSING RATE/);
  assert.equal(
    JSON.parse(requests[1].options.body).question,
    "how fast should i do cpr",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(aiCard.text, /CPR SPEED \/ 100-120/);
  finishAudio();
  time = 57;
  aiVoice[0]({ text: "Back", isFinal: true });
  time = 59;
  aiVoice[0]({ text: "Ask AI", isFinal: true });
  assert.match(aiCard.text, /AI \/ ASK A QUESTION/);
  time = 61;
  aiVoice[0]({ text: "How fast should I press?", isFinal: true });
  assert.equal(
    JSON.parse(requests[2].options.body).question,
    "how fast should i press",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(aiCard.text, /CPR SPEED \/ 100-120/);
  finishAudio();
  time = 63;
  aiVoice[0]({ text: "Back", isFinal: true });
  time = 65;
  aiVoice[0]({ text: "Ask A I how fast should I press?", isFinal: true });
  assert.match(aiCard.text, /CPR \/ PRESSING RATE/);
  assert.equal(
    JSON.parse(requests[3].options.body).question,
    "how fast should i press",
  );
  finishAudio();
  time = 67;
  aiVoice[0]({ text: "Back", isFinal: true });
  time = 69;
  aiVoice[0]({ text: "Call my contact", isFinal: true });
  assert.equal(requests.at(-1).url, "https://example.test/api/phone/request");
  assert.equal(requests.at(-1).options.method, "POST");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(aiCard.text, /CHECK IPHONE/);
  assert.match(aiCard.text, /NO CALL YET/);
  // The per-frame update must handle the phone card; it used to throw here.
  time = 70;
  aiEvents.UpdateEvent[0]();
  assert.match(aiCard.text, /CHECK IPHONE/);
}
checkLensAi()
  .then(() =>
    console.log(
      "Native Lens flow, palm placement, practice motion, and AI network checks passed.",
    ),
  )
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
