 // @input Asset.Texture checkTexture
 // @input Asset.Texture callTexture
 // @input Asset.Texture callAedTexture
 // @input Asset.Texture handsTexture
 // @input Asset.Texture compressUpTexture
 // @input Asset.Texture compressDownTexture
 // @input Asset.Texture aedTexture
 // @input string aiBaseUrl = "http://10.27.176.77:4173"
 // SECOND CHANCE — adult CPR training simulation.
 // No emergency call, live AED lookup, or measured compression quality occurs here.

// Change both strings for another training region. Leave emergencyNumber empty
// when unknown; never infer an emergency number from device location.
var emergencyConfig = {regionLabel:"United States", emergencyNumber:"911"};
function callRegion() {
 return emergencyConfig.emergencyNumber ?
  emergencyConfig.regionLabel.slice(0,Math.max(0,25-emergencyConfig.emergencyNumber.length)) +
   " / " + emergencyConfig.emergencyNumber :
  "Region not configured";
}
function manualCall() {
 return emergencyConfig.emergencyNumber ?
  "PHONE: CALL " + emergencyConfig.emergencyNumber + " NOW" :
  "Call local emergency";
}
function manualCallTail() {
 return emergencyConfig.emergencyNumber ? "TRAINING / NO REAL CALL" :
  "services on your phone";
}

var screens = {
 home: ["SECOND CHANCE", "check", ["ADULT CPR TRAINING", "Say START EMERGENCY.", "Or ASK AI how fast?"], "Real emergency? Use phone."],
 safety: ["01 / SCENE SAFETY", "check", ["Check for traffic, fire,", "wires or other danger.", "Is the scene safe?"], "Say SAFE or UNSAFE."],
 unsafe: ["STOP / SCENE UNSAFE", "check", ["Do not enter danger.", "Move to safety and", "call emergency services."], "Say RESTART to retry."],
 response: ["02 / CHECK RESPONSE", "check", ["Tap both shoulders.", "Shout: Are you OK?", "Does the adult respond?"], "Say YES or NO."],
 responsive: ["PERSON RESPONDS", "check", ["Do not start CPR.", "Assess and call for help", "if needed."], "Say RESTART to retry."],
 breathing: ["03 / CHECK BREATHING", "check", ["Look for normal breathing.", "Gasping is not normal.", "Breathing normally?"], "Say YES, NO or GASPING."],
 breathingYes: ["NORMAL BREATHING", "check", ["Do not start compressions.", "Call for help; monitor.", "Follow the dispatcher."], "Say RESTART to retry."],
 call: ["04 / CALL HELP", "call", ["Call on your iPhone.", "Use Siri hands-free, or", "ask someone to call."], "THIS LENS MAKES NO CALL."],
 team: ["05 / ASSIGN ROLES", "callAed", ["You: start compressions.", "Person 2: call for help.", "Person 3: bring an AED."], "Say CALLER / AED RUNNER."],
 hands: ["06 / HAND POSITION", "hands", ["Heel in chest center.", "Other hand on top.", "Shoulders over hands."], "Arms straight. Say NEXT."],
 compress: ["07 / COMPRESS", "compress", ["Push hard and fast.", "100-120 per minute.", "Allow full recoil."], "110 BPM PRACTICE BEAT."],
 aedPower: ["08 / TURN ON AED", "aed", ["Turn on the AED.", "Follow its voice and", "visual instructions."], "Say NEXT for pad guide."],
 aedPads: ["09 / AED PADS", "aed", ["Expose and dry the chest.", "Use the pad diagrams", "printed on the AED pads."], "Follow the AED itself."],
 aedClear: ["10 / STAND CLEAR", "aed", ["Do not touch the person", "during analysis or shock.", "Follow the AED prompts."], "AED decides on a shock."],
 aedResume: ["11 / RESUME CPR", "compress", ["Resume compressions", "when the AED tells you.", "Keep following its prompts."], "Say NEXT to keep going."],
 navStart: ["AED ROUTE / SIM", "callAed", ["Training route only.", "AED: lobby cabinet.", "No live AED data."], "Say NEXT for route."],
 navHall: ["AED ROUTE / SIM", "callAed", ["Step 1: leave the room.", "Go toward the lobby.", "Keep CPR going here."], "Say NEXT for cabinet."],
 navCabinet: ["AED ROUTE / SIM", "aed", ["Step 2: find the", "lobby AED cabinet.", "Bring AED to the adult."], "Say AED HERE or BACK."],
 help: ["CALL STATUS", "call", ["This Lens cannot dial 911.", "On iPhone, use Siri or", "ask someone to call."], "Say CALLED when done."]
};
var lesson = ["home","safety","response","breathing","call","team","hands","compress","aedPower","aedPads","aedClear","aedResume"];
var answers = {
 overview: ["CPR / FIRST ACTIONS","check",["For sudden adult collapse:","Call 911 and get an AED.","Push in the chest center."],"Follow dispatcher guidance."],
 rate: ["CPR / PRESSING RATE","compress",["100-120 compressions/min.","This visual beat is 110 BPM.","Let the chest rise fully."],"Practice beat; not measured."],
 depth: ["CPR / PRESSING DEPTH","compress",["At least 2 in / 5 cm.","Avoid deeper than 2.4 in","or 6 cm in an adult."],"Depth is not measured here."],
 hands: ["CPR / HAND POSITION","hands",["Heel in the chest center.","Put your other hand on top.","Shoulders over your hands."],"Keep both arms straight."],
 aed: ["CPR / USING AN AED","aed",["Turn on the AED as soon","as it arrives. Follow its","voice and visual prompts."],"Resume CPR when prompted."],
 breathing: ["CPR / CHECK BREATHING","check",["No normal breathing or","only gasping? Call 911","and begin compressions."],"Adult sudden-collapse drill."],
 call: ["CPR / GET HELP","call",["Call 911 immediately.","Ask someone to get an AED.","Follow the dispatcher."],"This Lens makes no call."],
 breaths: ["CPR / HANDS ONLY","compress",["For witnessed sudden adult","collapse, Hands-Only CPR","uses no rescue breaths."],"Follow dispatcher guidance."]
};
function topicFor(text) {
 if (/(mouth|rescue breath|ventilat|人工呼吸|吹气)/.test(text)) return "breaths";
 if (/(rate|speed|how fast|rhythm|per minute|bpm|频率|速度|多快)/.test(text)) return "rate";
 if (/(deep|depth|inches|centimeter|cm|多深|深度|厘米)/.test(text)) return "depth";
 if (/(hands?|hand placement|where.*press|where.*put|position|手放|双手|手掌|按哪里)/.test(text)) return "hands";
 if (/(aed|defibrillat|除颤|电击器)/.test(text)) return "aed";
 if (/(breath|gasp|unresponsive|responsive|呼吸|喘气|反应)/.test(text)) return "breathing";
 if (/(911|ambulance|emergency call|call for help|救护车|求救|报警)/.test(text)) return "call";
 if (/(cpr|心肺复苏|胸外按压|心脏按压)/.test(text)) return "overview";
 return null;
}
function textureFor(kind, down) {
 if (kind === "check") return script.checkTexture;
 if (kind === "call") return script.callTexture;
 if (kind === "callAed") return script.callAedTexture;
 if (kind === "hands") return script.handsTexture;
 if (kind === "compress") return down ? script.compressDownTexture : script.compressUpTexture;
 return script.aedTexture;
}
// All positions and thresholds below use Lens Studio world centimeters. These are
// practice-motion thresholds, not a measurement of chest compression depth.
var motionTuning = {
 settleSeconds: 0.30, settleCm: 2.0, downCm: 4.5, returnCm: 1.5,
 maxSideCm: 6, maxJumpCm: 12, minCycleSeconds: 0.18,
 maxCycleSeconds: 1.25, lossSeconds: 0.22, pauseSeconds: 2.0,
 smoothing: 0.58
};
function point(p) { return {x:p.x,y:p.y,z:p.z}; }
function distance(a,b) {
 var x=a.x-b.x,y=a.y-b.y,z=a.z-b.z;
 return Math.sqrt(x*x+y*y+z*z);
}
function lateral(a,b) {
 var x=a.x-b.x,z=a.z-b.z;
 return Math.sqrt(x*x+z*z);
}
function newPractice() {
 return {count:0,status:"Stack your hands and bring them into view",
  side:null,candidate:null,candidateAt:-1,base:null,filtered:null,
  lastRaw:null,lastSeen:-1,stage:"acquire",downAt:-1,
  times:[],rate:null,everSeen:false,highlightUntil:-1};
}
try {
 var obj = global.scene.createSceneObject("SC Illustrated Practice Card");
 obj.getTransform().setWorldPosition(new vec3(0,0,0));
 var card = obj.createComponent("Component.Text");
 card.size = 60; card.depthTest = false;
 card.textFill.color = new vec4(1,1,1,1);
 var bg = card.backgroundSettings;
 bg.enabled = true; bg.fill.color = new vec4(0.02,0.07,0.10,0.9);
 bg.margins.left = 0.5; bg.margins.right = 0.5;
 bg.margins.top = 0.5; bg.margins.bottom = 0.5;
 var artObject = global.scene.createSceneObject("SC Action Illustration");
 artObject.getTransform().setWorldPosition(new vec3(0,3,0));
 artObject.getTransform().setLocalScale(new vec3(1.25,1.25,1));
 var art = artObject.createComponent("Component.Text");
 art.size = 192; art.depthTest = false; art.text = "XXXXXX";
 art.textFill.color = new vec4(0,0,0,0);
 art.backgroundSettings.enabled = true;
 art.backgroundSettings.fill.mode = TextFillMode.Texture;
 art.backgroundSettings.fill.textureStretch = StretchMode.Stretch;
 art.backgroundSettings.fill.tileCount = 1;
 art.backgroundSettings.fill.colorTint = new vec4(1,1,1,1);
 art.backgroundSettings.margins.left = 0; art.backgroundSettings.margins.right = 0;
 art.backgroundSettings.margins.top = 0; art.backgroundSettings.margins.bottom = 0;
 // Keep the teaching card at its original 40 cm viewing distance while the
 // camera gains world tracking for head-motion-resistant wrist coordinates.
 var cameraRoot=global.scene.getRootObject(0);
 if (cameraRoot && cameraRoot.getComponent("Component.Camera")) {
  obj.setParent(cameraRoot);
  obj.getTransform().setLocalPosition(new vec3(0,0,-40));
  artObject.setParent(cameraRoot);
  artObject.getTransform().setLocalPosition(new vec3(0,3,-40));
 }

 var current = "home", overlay = null, returnScreen = "call";
 var aiView = ["AI / READY", "check", ["Ask a training question.", "Say ASK AI, then speak.", "Pinch to return."], "TRAINING ONLY / NO LIVE AID"];
 var aiRequestId = 0, internetModule = null, remoteMediaModule = null;
 var aiAudio = null, aiTopic = null, speechActive = false, lastSpeechAt = -10;
 try { internetModule = require("LensStudio:InternetModule"); }
 catch (networkError) { print("SECOND CHANCE AI network unavailable: " + networkError); }
 var callPanel = null, callTarget = false, lastCallTargetAt = -1;
 var lastAction = -1, transitionAt = -1, beatDown = false;
 var callReported = false, callerAssigned = false, runnerAssigned = false, aedPresent = false;
 var practice = newPractice(), leftHand = null, rightHand = null, handsReady = false;
 var editorMode = !!(global.deviceInfoSystem && global.deviceInfoSystem.isEditor());
 if (!editorMode) {
  try {
   remoteMediaModule = require("LensStudio:RemoteMediaModule");
   aiAudio = obj.createComponent("Component.AudioComponent");
   aiAudio.volume = 0.9;
  } catch (audioError) {print("SECOND CHANCE AI audio unavailable: " + audioError);}
 }
 var editorHand = {tracked:false,position:{x:0,y:0,z:0}};
 function practicing() { return !overlay && current === "compress"; }
 function statusLines() {
  if (!editorMode && !handsReady) return ["Hand tracking unavailable","Follow visual beat only"];
  if (practice.status === "Stack your hands and bring them into view")
   return ["Stack your hands and","bring them into view"];
  if (practice.status === "Bring your hands back into view")
   return ["Bring your hands","back into view"];
  return [practice.status,""];
 }
 function setStatus(status) {
  if (practice.status !== status) { practice.status = status; render(); }
 }
 function loseTracking() {
  practice.side=null; practice.candidate=null; practice.candidateAt=-1;
  practice.base=null; practice.filtered=null; practice.lastRaw=null;
  practice.stage="acquire"; practice.downAt=-1;
  practice.rate=null; practice.times=[];
  setStatus(practice.everSeen ? "Bring your hands back into view" :
   "Stack your hands and bring them into view");
 }
 function practiceSample(sample,now) {
  if (!practicing()) return;
  if (!sample || !sample.position || !isFinite(sample.position.x) ||
      !isFinite(sample.position.y) || !isFinite(sample.position.z)) {
   if (practice.lastSeen < 0 || now-practice.lastSeen > motionTuning.lossSeconds) loseTracking();
   return;
  }
  var raw=sample.position;
  if (practice.side && sample.side !== practice.side) loseTracking();
  if (practice.lastRaw && now>practice.lastSeen && now-practice.lastSeen<0.2 &&
      distance(raw,practice.lastRaw)>motionTuning.maxJumpCm) {
   loseTracking(); return;
  }
  practice.side=sample.side; practice.everSeen=true;
  practice.lastSeen=now; practice.lastRaw=point(raw);
  if (!practice.filtered) practice.filtered=point(raw);
  else {
   var a=motionTuning.smoothing;
   practice.filtered.x+=a*(raw.x-practice.filtered.x);
   practice.filtered.y+=a*(raw.y-practice.filtered.y);
   practice.filtered.z+=a*(raw.z-practice.filtered.z);
  }
  var p=practice.filtered;
  if (practice.stage === "acquire") {
   if (!practice.candidate || distance(p,practice.candidate)>motionTuning.settleCm) {
    practice.candidate=point(p); practice.candidateAt=now;
   } else if (now-practice.candidateAt>=motionTuning.settleSeconds) {
    practice.base=point(p); practice.stage="ready";
    setStatus(sample.handsClose ? "Hands close; follow beat" : "Follow the beat");
   }
   return;
  }
  if (lateral(p,practice.base)>motionTuning.maxSideCm) {
   loseTracking(); return;
  }
  var drop=practice.base.y-p.y;
  if (practice.stage === "ready" && drop>=motionTuning.downCm) {
   practice.stage="down"; practice.downAt=now;
  } else if (practice.stage === "down") {
   if (now-practice.downAt>motionTuning.maxCycleSeconds) {
    practice.stage="acquire"; practice.candidate=null;
    setStatus("Follow the beat");
   } else if (drop<=motionTuning.returnCm &&
       now-practice.downAt>=motionTuning.minCycleSeconds) {
    practice.stage="ready"; practice.base=point(p);
    practice.count++; practice.highlightUntil=now+0.18;
    practice.times.push(now);
    if (practice.times.length>5) practice.times.shift();
    if (practice.times.length>=4) {
     var first=practice.times[0],last=practice.times[practice.times.length-1];
     practice.rate=60*(practice.times.length-1)/(last-first);
     practice.status=practice.rate<100 ? "A little faster" :
      practice.rate>120 ? "A little slower" : "In range";
    } else practice.status="Follow the beat";
    render();
   }
  }
  if (practice.rate!==null && practice.times.length &&
      now-practice.times[practice.times.length-1]>motionTuning.pauseSeconds) {
   practice.rate=null; practice.times=[]; setStatus("Follow the beat");
  }
 }
 function handSample() {
  if (editorMode) return editorHand.tracked ? {side:"right",position:editorHand.position} : null;
  if (!handsReady) return null;
  var hand=null,side=null;
  if (practice.side==="left" && leftHand.isTracked()) {hand=leftHand;side="left";}
  else if (practice.side==="right" && rightHand.isTracked()) {hand=rightHand;side="right";}
  else if (rightHand.isTracked()) {hand=rightHand;side="right";}
  else if (leftHand.isTracked()) {hand=leftHand;side="left";}
  if (!hand || !hand.wrist || !hand.wrist.position) return null;
  var handsClose=false;
  if (leftHand.isTracked() && rightHand.isTracked()) {
   var leftPalm=leftHand.getPalmCenter(),rightPalm=rightHand.getPalmCenter();
   if (leftPalm && rightPalm) handsClose=lateral(leftPalm,rightPalm)<9 &&
    Math.abs(leftPalm.y-rightPalm.y)<10;
  }
  return {side:side,position:hand.wrist.position,handsClose:handsClose};
 }
 function footer() {
  if (callPanel) return "AIM / PINCH OR SAY SELECT";
  if (overlay) return "SAY BACK / PINCH BACK";
  if (current === "safety" || current === "call")
   return callTarget ? "> CALL EMERGENCY / PINCH" : "CALL EMERGENCY: AIM+PINCH";
  if (current === "safety" || current === "response" || current === "breathing") return "PINCH = SCENARIO ANSWER";
  if (current === "unsafe" || current === "responsive" || current === "breathingYes") return "SAY RESTART / PINCH";
  if (current === "navCabinet") return "SAY AED HERE / BACK";
  if (current === "home") return "SAY START / PINCH";
  return "SAY NEXT / PINCH NEXT";
 }
 function render() {
  if (callPanel) {
   var state=callPanel.stage, main="",sub="";
   var prompts=["Where are you?","Is the person responsive?","Are they breathing normally?"];
   if (state==="ready") {main="Start simulated call";sub="Cancel";}
   else if (state==="ringing") {main="Cancel";sub="";}
   else if (state==="connected" || state==="dispatcher") {
    main="Next prompt";sub="End simulation";
   } else {main="Back to lesson";sub="";}
   var detail=state==="ready" ? "SIMULATED CALL / READY" :
    state==="ringing" ? "SIMULATED CALL / RINGING" :
    state==="ended" ? "SIMULATION ENDED" :
    state==="connected" ? "SIM DISPATCHER CONNECTED" :
    "SIM DISPATCHER / PROMPT";
   var question=(state==="connected" || state==="dispatcher") ?
    prompts[callPanel.question] : "";
   var actionA=(callPanel.focus==="primary" ? "> " : "  ")+main;
   var actionB=sub ? (callPanel.focus==="secondary" ? "> " : "  ")+sub : "";
   card.size=48;
   artObject.getTransform().setLocalScale(new vec3(1.15,1.15,1));
   card.text=["ADULT CPR / SIMULATION","CALL / TRAINING ONLY","","","",
    callRegion(),detail,question,callPanel.ack || "",actionA,actionB,
    manualCall(),manualCallTail()].join("\n");
   art.backgroundSettings.fill.texture=script.callTexture;
   return;
  }
  var view = overlay ? (overlay === "ai" ? aiView : answers[overlay]) : screens[current];
  card.size=practicing() ? 49 : 60;
  artObject.getTransform().setLocalScale(practicing() ?
   new vec3(1.08,1.08,1) : new vec3(1.25,1.25,1));
  var cue = view[3];
  if (!overlay && current === "team") {
   cue = "CALL " + (callReported ? "REPORTED" : callerAssigned ? "ASSIGNED" : "OPEN") +
     " / AED " + (aedPresent ? "HERE" : runnerAssigned ? "SENT" : "OPEN");
  }
  if (!overlay && current === "call" && callReported) cue = "CALL REPORTED BY USER.";
  else if (!overlay && (current === "safety" || current === "call")) cue=callRegion();
  if (!overlay && current === "compress" && aedPresent) cue = "AED HERE? SAY USE AED.";
  var lines = ["ADULT CPR / SIMULATION", view[0], "", "", ""];
  if (!practicing()) lines.push("");
  lines = lines.concat(view[2]);
  lines.push(cue);
  if (practicing()) {
   lines=lines.concat(statusLines());
   lines.push("Practice motions: " + practice.count);
  }
  lines.push(footer());
  card.text = lines.join("\n");
  art.backgroundSettings.fill.texture = textureFor(view[1], beatDown);
 }
 function show(id) {
  aiRequestId++;
  stopAiAudio(); aiTopic = null;
  if (current === "compress" || id === "compress") {
   practice=newPractice();
   if (editorMode) {editorHand.tracked=false;editorHand.position={x:0,y:0,z:0};}
  }
  current = id; overlay = null; beatDown = false; callTarget = false;
  transitionAt = getTime();
  render(); print("SECOND CHANCE screen " + id);
 }
 function reset() {
  callPanel=null; callTarget=false; lastCallTargetAt=-1;
  callReported = false; callerAssigned = false; runnerAssigned = false; aedPresent = false;
  returnScreen = "call"; show("home");
 }
 function accepted() {
  var now = getTime();
  if (now - lastAction < 0.45) return false;
  lastAction = now; return true;
 }
 function openCallPanel() {
  if (!accepted()) return;
  callPanel={stage:"ready",origin:current,focus:"primary",question:0,
   connectAt:-1,ack:""};
  overlay=null; transitionAt=getTime(); render();
  print("SECOND CHANCE simulated call panel opened from " + current);
 }
 function closeCallPanel() {
  var origin=callPanel ? callPanel.origin : current;
  callPanel=null; current=origin; callTarget=false; lastCallTargetAt=-1;
  transitionAt=getTime(); render();
 }
 function selectCallPanel() {
  if (!accepted() || !callPanel) return;
  var state=callPanel.stage;
  if (state==="ready") {
   if (callPanel.focus==="secondary") {closeCallPanel();return;}
   callPanel.stage="ringing";callPanel.focus="primary";callPanel.ack="";
   callPanel.connectAt=getTime()+1.6;
  } else if (state==="ringing") closeCallPanel();
  else if (state==="connected" || state==="dispatcher") {
   if (callPanel.focus==="secondary" || callPanel.question===2) {
    callPanel.stage="ended";callPanel.focus="primary";
    callPanel.connectAt=-1;callPanel.ack="";
   } else {
    callPanel.question++;callPanel.stage="dispatcher";
    callPanel.ack=callPanel.question===1 ? "Thank you. Stay with me." :
     "Thank you. Keep going.";
   }
  } else closeCallPanel();
  if (callPanel) {transitionAt=getTime();render();}
 }
 // GestureModule targeting ray selects a row on the camera-facing call card.
 // The same physical pinch is handled only by pinch() and accepted().
 function targetCall(args) {
  if (!args || !args.isValid || !cameraRoot || !cameraRoot.getTransform) return;
  var ct=cameraRoot.getTransform(),center=obj.getTransform().getWorldPosition();
  var normal=ct.forward,up=ct.up,ray=args.rayDirectionInWorld,
   origin=args.rayOriginInWorld;
  var dot=ray.x*normal.x+ray.y*normal.y+ray.z*normal.z;
  if (Math.abs(dot)<0.01) return;
  var dx=center.x-origin.x,dy=center.y-origin.y,dz=center.z-origin.z;
  var t=(dx*normal.x+dy*normal.y+dz*normal.z)/dot;
  if (t<=0 || t>100) return;
  var hit={x:origin.x+ray.x*t-center.x,y:origin.y+ray.y*t-center.y,
   z:origin.z+ray.z*t-center.z};
  var height=hit.x*up.x+hit.y*up.y+hit.z*up.z;
  var right=ct.right,wide=hit.x*right.x+hit.y*right.y+hit.z*right.z;
  if (Math.abs(wide)>14) return;
  lastCallTargetAt=getTime();
  if (callPanel) {
   var focus=height < -5 ? "secondary" : "primary";
   if (height < -15 || height > 8 || (focus==="secondary" &&
       (callPanel.stage==="ringing" || callPanel.stage==="ended"))) return;
   if (focus!==callPanel.focus) {callPanel.focus=focus;render();}
  } else if (current==="safety" || current==="call") {
   var active=height < -5 && height > -15;
   if (active!==callTarget) {callTarget=active;render();}
  }
 }
 function next() {
  if (!accepted()) return;
  if (overlay) { overlay = null; stopAiAudio(); render(); return; }
  if (current === "unsafe" || current === "responsive" || current === "breathingYes") { reset(); return; }
  if (current === "navStart") { show("navHall"); return; }
  if (current === "navHall") { show("navCabinet"); return; }
  if (current === "navCabinet" || current === "help") { show(returnScreen); return; }
  if (current === "aedResume") { show("compress"); return; }
  var index = lesson.indexOf(current);
  if (index >= 0 && index < lesson.length - 1) show(lesson[index + 1]);
 }
 function assess(yes) {
  if (!accepted()) return;
  if (current === "safety") show(yes ? "response" : "unsafe");
  else if (current === "response") show(yes ? "responsive" : "breathing");
  else if (current === "breathing") show(yes ? "breathingYes" : "call");
 }
 function reportCall() {
  if (!accepted()) return;
  callReported = true;
  if (current === "help") show(returnScreen); else render();
  print("SECOND CHANCE call reported by user, not verified");
 }
 function assign(role) {
  if (!accepted()) return;
  if (role === "caller") callerAssigned = true;
  if (role === "runner") runnerAssigned = true;
  render(); print("SECOND CHANCE role assigned " + role);
 }
 function openNav() {
  if (!accepted()) return;
  returnScreen = current; show("navStart");
 }
 function aedHere() {
  if (!accepted()) return;
  aedPresent = true; show("aedPower");
  print("SECOND CHANCE AED presence reported by user, not verified");
 }
 function showHelp() {
  if (!accepted()) return;
  returnScreen = current; show("help");
 }
 function showAnswer(topic) {
  if (!accepted()) return;
  if (practicing()) practice=newPractice();
  overlay = topic; transitionAt = getTime(); beatDown = false; render();
  print("SECOND CHANCE voice topic " + topic);
 }
 function aiCard(title, artKind, lines, cue) {
  var valid = {check:1,call:1,callAed:1,hands:1,compress:1,aed:1};
  function short(value) {return String(value || "").replace(/[\r\n]/g," ").slice(0,28);}
  return [short(title),valid[artKind] ? artKind : "check",
   [short(lines[0]),short(lines[1]),short(lines[2])],short(cue)];
 }
 function stopAiAudio() {
  if (aiAudio && aiAudio.isPlaying && aiAudio.isPlaying()) aiAudio.stop(true);
  if (speechActive) lastSpeechAt = getTime();
  speechActive = false;
 }
 function speakAi(topic, requestId) {
  if (!aiAudio || !remoteMediaModule || !internetModule || !script.aiBaseUrl) return;
  try {
   var url = String(script.aiBaseUrl).replace(/\/$/,"") +
    "/api/lens/audio?topic=" + encodeURIComponent(topic);
   var resource = internetModule.makeResourceFromUrl(url);
   remoteMediaModule.loadResourceAsAudioTrackAsset(resource,function(track) {
    if (requestId !== aiRequestId || overlay !== "ai") return;
    stopAiAudio();
    aiAudio.audioTrack = track;
    aiAudio.setOnFinish(function() {speechActive = false; lastSpeechAt = getTime();});
    speechActive = true;
    aiAudio.play(1);
   },function(error) {print("SECOND CHANCE AI speech unavailable: " + error);});
  } catch (error) {print("SECOND CHANCE AI speech failed: " + error);}
 }
 function askAi(question) {
  if (!accepted()) return;
  var requestId = ++aiRequestId;
  var prompt = String(question || "").trim().slice(0,240);
  stopAiAudio(); aiTopic = null;
  callPanel = null; callTarget = false;
  overlay = "ai"; transitionAt = getTime(); beatDown = false;
  aiView = aiCard("AI / THINKING", "check", ["Listening to your question", "and checking the training", "guide..."], "VOICE QUESTION / TRAINING");
  render();
  if (!prompt) {
   aiView = aiCard("AI / ASK A QUESTION", "check", ["Say ASK AI, followed by", "a CPR or AED question.", "Example: ASK AI HOW FAST?"], "SAY BACK TO RETURN");
   render(); return;
  }
  if (!internetModule || !script.aiBaseUrl) {
   aiView = aiCard("AI / OFFLINE", "check", ["Server not connected.", "The guided drill still", "works without internet."], "SAY BACK TO RETURN");
   render(); return;
  }
  var url = String(script.aiBaseUrl).replace(/\/$/,"") + "/api/lens/ask";
  internetModule.fetch(new Request(url,{method:"POST",
   headers:{"Content-Type":"application/json"},body:JSON.stringify({question:prompt,stage:current})}))
   .then(function(response) {
    if (response.status !== 200) throw new Error("HTTP " + response.status);
    return response.json();
   }).then(function(data) {
    if (requestId !== aiRequestId || overlay !== "ai") return;
    if (!data || !data.lines || data.lines.length !== 3) throw new Error("Invalid answer");
    aiView = aiCard(data.title,data.art,data.lines,
     data.mode === "model" ? "AI CLASSIFIED / TRAINING" : "TRAINING GUIDE / VERIFIED");
    aiTopic = data.topic;
    transitionAt = getTime(); render();
    speakAi(aiTopic,requestId);
    print("SECOND CHANCE AI topic " + data.topic + " mode " + data.mode);
   }).catch(function(error) {
    if (requestId !== aiRequestId || overlay !== "ai") return;
    aiView = aiCard("AI / CONNECTION LOST", "check", ["Check the training server", "and the headset network.", "The drill remains ready."], "SAY BACK TO RETURN");
    transitionAt = getTime(); render();
    print("SECOND CHANCE AI request failed: " + error);
   });
 }
 function update() {
  var now = getTime();
  if (callTarget && now-lastCallTargetAt>0.25) {callTarget=false;render();}
  if (callPanel && callPanel.stage==="ringing" && now>=callPanel.connectAt) {
   callPanel.stage="connected";callPanel.connectAt=-1;
   callPanel.ack="Training dispatcher only.";
   transitionAt=now;render();
  }
  var fade = Math.min(1,Math.max(0.3,(now-transitionAt)/0.18));
  card.textFill.color = overlay === "ai" ? new vec4(0.78,1,0.97,fade) : new vec4(1,1,1,fade);
  bg.fill.color = overlay === "ai" ? new vec4(0.015,0.13,0.16,0.94*fade) :
   practicing() && now<practice.highlightUntil ?
   new vec4(0.03,0.14,0.15,0.9*fade) : new vec4(0.02,0.07,0.10,0.9*fade);
  art.backgroundSettings.fill.colorTint = overlay === "ai" ?
   new vec4(0.45,1,0.90,fade) : new vec4(1,1,1,fade);
  if (callPanel) {
   var pulse=callPanel.stage==="ringing" && Math.floor(now*3)%2===0 ? 1.22 : 1.15;
   artObject.getTransform().setLocalScale(new vec3(pulse,pulse,1));
   return;
  }
  if (practicing()) practiceSample(handSample(),now);
  var view = overlay ? (overlay === "ai" ? aiView : answers[overlay]) : screens[current];
  if (view[1] !== "compress") return;
  var down = (now % (60/110)) < 0.16;
  if (down !== beatDown) { beatDown = down; render(); }
 }
 function pinch() {
  if (callPanel) {selectCallPanel();return;}
  if (callTarget && (current==="safety" || current==="call"))
   {openCallPanel();return;}
  if (current === "safety" && !overlay) { assess(true); return; }
  if ((current === "response" || current === "breathing") && !overlay) { assess(false); return; }
  next();
 }
 function assessmentValue(spoken,command) {
  if (/^(yes|yeah|yep|是)$/.test(command)) return true;
  if (/^(no|nope|否)$/.test(command)) return false;
  if (current === "safety") {
   if (/(unsafe|not safe|isn't safe|danger|不安全|有危险)/.test(spoken)) return false;
   if (/(scene is safe|it's safe|it is safe|safe here|^safe$|安全)/.test(spoken)) return true;
  }
  if (current === "response") {
   if (/(unresponsive|no response|not responding|doesn't respond|无反应|没有反应)/.test(spoken)) return false;
   if (/(responsive|is responding|responds|is awake|有反应|醒着)/.test(spoken)) return true;
  }
  if (current === "breathing") {
   if (/(not breathing|no breathing|only gasping|gasping|isn't breathing|没有呼吸|喘气)/.test(spoken)) return false;
   if (/(breathing normally|normal breathing|^normalbreathing$|呼吸正常|正常呼吸)/.test(spoken)) return true;
  }
  return null;
 }
 function onVoiceText(eventArgs) {
  if (!eventArgs.isFinal || !eventArgs.text) return;
  if (speechActive || getTime()-lastSpeechAt<0.75) return;
  var spoken = eventArgs.text.toLowerCase().replace(/[.,!?，。！？]/g," ").trim();
  var command = spoken.replace(/\s/g,"");
  var aiQuestion = /^(?:ask ai|hey ai|ai question|问ai|问一下ai|问人工智能)\s*(.*)$/.exec(spoken);
  if (aiQuestion) { askAi(aiQuestion[1]); return; }
  if (/^(restart|startover|reset|重来|重新开始)$/.test(command)) {
   if (accepted()) reset(); return;
  }
  if (callPanel) {
   if (/^(back|return|cancel|stop|返回|取消)$/.test(command))
    {if (accepted()) closeCallPanel();return;}
   if (/^(end|end simulation|hang up|结束)$/.test(spoken))
    {if (accepted()) {callPanel.stage="ended";callPanel.connectAt=-1;
     callPanel.ack="";render();}return;}
   if (/^(select|next|continue|start simulated call|begin call|下一步|继续)$/.test(spoken))
    {selectCallPanel();return;}
   return;
  }
  if (/^(back|return|返回|回去)$/.test(command)) {
   if (!accepted()) return;
   if (overlay) { overlay = null; stopAiAudio(); render(); }
   else if (current === "navStart" || current === "navHall" || current === "navCabinet" || current === "help") show(returnScreen);
   return;
  }
  if (/(start emergency|emergency mode|begin training|start cpr|启动急救|开始急救)/.test(spoken) ||
      (current === "home" && /^(start|begin|开始)$/.test(command))) {
   if (accepted()) show("safety"); return;
  }
  if (/(find|locate|navigate|where).*\baed\b|找.*除颤|导航.*aed/.test(spoken)) { openNav(); return; }
  if (/(aed is here|aed arrived|got the aed|have the aed|use aed|拿到除颤器|aed到了)/.test(spoken)) { aedHere(); return; }
  if (/(someone|person|bystander).*(call 911|call emergency)|assign caller|caller assigned|让.*报警/.test(spoken)) { assign("caller"); return; }
  if (/(someone|person|bystander).*(get|fetch|bring).*aed|assign aed runner|aed runner|让.*拿.*除颤/.test(spoken)) { assign("runner"); return; }
  if (/(i called 911|911 called|called 911|call completed|已经报警|打过911)/.test(spoken)) { reportCall(); return; }
  if (/(call 911|dial 911|call emergency|emergency services|拨打911|报警)/.test(spoken))
   { openCallPanel(); return; }
  if (current === "safety" || current === "response" || current === "breathing") {
   var value = assessmentValue(spoken,command);
   if (value !== null) { assess(value); return; }
  }
  if (/^(next|continue|下一步|继续)$/.test(command)) { pinch(); return; }
  if (/(breathing normally now|started breathing normally|恢复正常呼吸)/.test(spoken) && current === "compress") {
   if (accepted()) show("breathingYes"); return;
  }
  var topic = topicFor(spoken);
  if (topic) showAnswer(topic);
 }
 reset();
 script.createEvent("UpdateEvent").bind(update);
 script.createEvent("TriggerPrimaryEvent").bind(pinch);
 if (editorMode) {
  // Preview: C opens call, F changes focus, N selects; B/D/U/L move hand.
  script.api.practiceSample=function(sample,at) {practiceSample(sample,at);};
  script.createEvent("KeyPressEvent").bind(function(event) {
   if (event.key===Keys.N) pinch();
   else if (event.key===Keys.C) openCallPanel();
   else if (event.key===Keys.F && callPanel) {
    callPanel.focus=callPanel.focus==="primary" ? "secondary" : "primary";render();
   }
   else if (event.key===Keys.X && callPanel) {if (accepted()) closeCallPanel();}
   else if (practicing() && event.key===Keys.B) editorHand.tracked=true;
   else if (practicing() && event.key===Keys.D) editorHand.position.y=-8;
   else if (practicing() && event.key===Keys.U) editorHand.position.y=0;
   else if (practicing() && event.key===Keys.L) editorHand.tracked=false;
  });
  print("SECOND CHANCE Preview: C call, F focus, N select, X cancel; B/D/U/L hand");
 } else {
  try {
   var sik=require("SpectaclesInteractionKit.lspkg/SIK").SIK;
   leftHand=sik.HandInputData.getHand("left");
   rightHand=sik.HandInputData.getHand("right");
   handsReady=true;
   print("SECOND CHANCE world-space wrist tracking ready");
  } catch(handError) {print("SECOND CHANCE hand tracking unavailable: " + handError);}
 }
 try {
  var gestures = require("LensStudio:GestureModule");
  gestures.getPinchDownEvent(0).add(pinch);
  gestures.getPinchDownEvent(1).add(pinch);
  gestures.getTargetingDataEvent(0).add(targetCall);
  gestures.getTargetingDataEvent(1).add(targetCall);
  print("SECOND CHANCE pinch controls ready");
 } catch (gestureError) { print("SECOND CHANCE pinch controls unavailable: " + gestureError); }
 try {
  var asr = require("LensStudio:AsrModule");
  var options = AsrModule.AsrTranscriptionOptions.create();
  options.silenceUntilTerminationMs = 650;
  options.mode = AsrModule.AsrMode.Balanced;
  options.onTranscriptionUpdateEvent.add(onVoiceText);
  options.onTranscriptionErrorEvent.add(function(code) { print("SECOND CHANCE voice unavailable, code " + code); });
  asr.startTranscribing(options);
  print("SECOND CHANCE voice session started");
 } catch (voiceError) { print("SECOND CHANCE voice unavailable: " + voiceError); }
} catch (error) { print("SECOND CHANCE setup failed: " + error); }
