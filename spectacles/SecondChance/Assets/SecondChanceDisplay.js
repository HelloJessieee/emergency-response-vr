// @input Asset.Texture checkTexture
// @input Asset.Texture callTexture
// @input Asset.Texture callAedTexture
// @input Asset.Texture handsTexture
// @input Asset.Texture compressUpTexture
// @input Asset.Texture compressDownTexture
// @input Asset.Texture aedTexture
// @input Asset.Texture responderMapTexture
// @input Asset.Texture handGuideBottomTexture
// @input Asset.Texture handGuideTopTexture
// @input Asset.Texture handGuideHeelTexture
// @input string aiBaseUrl = "http://127.0.0.1:4173"
// @input Asset.AudioTrackAsset voiceRate
// @input Asset.AudioTrackAsset voiceDepth
// @input Asset.AudioTrackAsset voiceHands
// @input Asset.AudioTrackAsset voiceAed
// @input Asset.AudioTrackAsset voiceBreathing
// @input Asset.AudioTrackAsset voiceCall
// @input Asset.AudioTrackAsset voiceBreaths
// @input Asset.AudioTrackAsset voiceTeam
// @input Asset.AudioTrackAsset voiceOverview
// @input Asset.AudioTrackAsset voiceScope
// @input float placementEnterRadiusCm = 6.0
// @input float placementExitRadiusCm = 8.0
// @input float placementDepthCm = 5.0
// @input float placementExitDepthCm = 7.0
// @input float placementHoldSeconds = 0.6
// @input float placementStackRadiusCm = 9.0
// SECOND CHANCE — adult CPR training simulation.
// No emergency call, live AED lookup, or measured compression quality occurs here.

// Change both strings for another training region. Leave emergencyNumber empty
// when unknown; never infer an emergency number from device location.
var emergencyConfig = { regionLabel: "United States", emergencyNumber: "911" };
function callRegion() {
  return emergencyConfig.emergencyNumber
    ? emergencyConfig.regionLabel.slice(
        0,
        Math.max(0, 25 - emergencyConfig.emergencyNumber.length),
      ) +
        " / " +
        emergencyConfig.emergencyNumber
    : "Region not configured";
}
function manualCall() {
  return emergencyConfig.emergencyNumber
    ? "PHONE: CALL " + emergencyConfig.emergencyNumber + " NOW"
    : "Call local emergency";
}
function manualCallTail() {
  return emergencyConfig.emergencyNumber
    ? "TRAINING / NO REAL CALL"
    : "services on your phone";
}

var screens = {
  home: [
    "SECOND CHANCE",
    "check",
    ["ADULT CPR TRAINING", "Pinch to start lesson.", "Aim at MAP + pinch."],
    "MAP / CPR RESPONDER SIM",
  ],
  safety: [
    "01 / SCENE SAFETY",
    "check",
    [
      "Check for traffic, fire,",
      "wires or other danger.",
      "Is the scene safe?",
    ],
    "Say SAFE or UNSAFE.",
  ],
  unsafe: [
    "STOP / SCENE UNSAFE",
    "check",
    ["Do not enter danger.", "Move to safety and", "call emergency services."],
    "Say RESTART to retry.",
  ],
  response: [
    "02 / CHECK RESPONSE",
    "check",
    ["Tap both shoulders.", "Shout: Are you OK?", "Does the adult respond?"],
    "Say YES or NO.",
  ],
  responsive: [
    "PERSON RESPONDS",
    "check",
    ["Do not start CPR.", "Assess and call for help", "if needed."],
    "Say RESTART to retry.",
  ],
  breathing: [
    "03 / CHECK BREATHING",
    "check",
    [
      "Look for normal breathing.",
      "Gasping is not normal.",
      "Breathing normally?",
    ],
    "Say YES, NO or GASPING.",
  ],
  breathingYes: [
    "NORMAL BREATHING",
    "check",
    [
      "Do not start compressions.",
      "Call for help; monitor.",
      "Follow the dispatcher.",
    ],
    "Say RESTART to retry.",
  ],
  call: [
    "04 / CALL HELP",
    "call",
    ["Call on your iPhone.", "Use Siri hands-free, or", "ask someone to call."],
    "THIS LENS MAKES NO CALL.",
  ],
  team: [
    "05 / ASSIGN ROLES",
    "callAed",
    [
      "You: start compressions.",
      "Person 2: call for help.",
      "Person 3: bring an AED.",
    ],
    "Say CALLER / AED RUNNER.",
  ],
  hands: [
    "06 / HAND POSITION",
    "hands",
    ["Heel in chest center.", "Other hand on top.", "Shoulders over hands."],
    "Arms straight. Say NEXT.",
  ],
  compress: [
    "07 / COMPRESS",
    "compress",
    ["Push hard and fast.", "100-120 per minute.", "Allow full recoil."],
    "110 BPM PRACTICE BEAT.",
  ],
  aedPower: [
    "08 / TURN ON AED",
    "aed",
    ["Turn on the AED.", "Follow its voice and", "visual instructions."],
    "Say NEXT for pad guide.",
  ],
  aedPads: [
    "09 / AED PADS",
    "aed",
    [
      "Expose and dry the chest.",
      "Use the pad diagrams",
      "printed on the AED pads.",
    ],
    "Follow the AED itself.",
  ],
  aedClear: [
    "10 / STAND CLEAR",
    "aed",
    [
      "Do not touch the person",
      "during analysis or shock.",
      "Follow the AED prompts.",
    ],
    "AED decides on a shock.",
  ],
  aedResume: [
    "11 / RESUME CPR",
    "compress",
    [
      "Resume compressions",
      "when the AED tells you.",
      "Keep following its prompts.",
    ],
    "NEXT: BACK TO START.",
  ],
  navStart: [
    "AED ROUTE / SIM",
    "callAed",
    ["Training route only.", "AED: lobby cabinet.", "No live AED data."],
    "Say NEXT for route.",
  ],
  navHall: [
    "AED ROUTE / SIM",
    "callAed",
    ["Step 1: leave the room.", "Go toward the lobby.", "Keep CPR going here."],
    "Say NEXT for cabinet.",
  ],
  navCabinet: [
    "AED ROUTE / SIM",
    "aed",
    ["Step 2: find the", "lobby AED cabinet.", "Bring AED to the adult."],
    "Say AED HERE or BACK.",
  ],
  responderMap: [
    "CPR RESPONDER / SIM",
    "responder",
    ["Fictional Volunteer A", "shown 60 m away.", "Route is a training demo."],
    "SIM ONLY / NO LIVE POSITION",
  ],
  help: [
    "CALL STATUS",
    "call",
    [
      "This Lens cannot dial 911.",
      "On iPhone, use Siri or",
      "ask someone to call.",
    ],
    "Say CALLED when done.",
  ],
};
var lesson = [
  "home",
  "safety",
  "response",
  "breathing",
  "call",
  "team",
  "hands",
  "compress",
  "aedPower",
  "aedPads",
  "aedClear",
  "aedResume",
];
var answers = {
  overview: [
    "CPR / FIRST ACTIONS",
    "check",
    [
      "For sudden adult collapse:",
      "Call 911 and get an AED.",
      "Push in the chest center.",
    ],
    "Follow dispatcher guidance.",
  ],
  rate: [
    "CPR / PRESSING RATE",
    "compress",
    [
      "100-120 compressions/min.",
      "This visual beat is 110 BPM.",
      "Let the chest rise fully.",
    ],
    "Practice beat; not measured.",
  ],
  depth: [
    "CPR / PRESSING DEPTH",
    "compress",
    [
      "At least 2 in / 5 cm.",
      "Avoid deeper than 2.4 in",
      "or 6 cm in an adult.",
    ],
    "Depth is not measured here.",
  ],
  hands: [
    "CPR / HAND POSITION",
    "hands",
    [
      "Heel in the chest center.",
      "Put your other hand on top.",
      "Shoulders over your hands.",
    ],
    "Keep both arms straight.",
  ],
  aed: [
    "CPR / USING AN AED",
    "aed",
    [
      "Turn on the AED as soon",
      "as it arrives. Follow its",
      "voice and visual prompts.",
    ],
    "Resume CPR when prompted.",
  ],
  breathing: [
    "CPR / CHECK BREATHING",
    "check",
    [
      "No normal breathing or",
      "only gasping? Call 911",
      "and begin compressions.",
    ],
    "Adult sudden-collapse drill.",
  ],
  call: [
    "CPR / GET HELP",
    "call",
    [
      "Call 911 immediately.",
      "Ask someone to get an AED.",
      "Follow the dispatcher.",
    ],
    "This Lens makes no call.",
  ],
  breaths: [
    "CPR / HANDS ONLY",
    "compress",
    [
      "For witnessed sudden adult",
      "collapse, Hands-Only CPR",
      "uses no rescue breaths.",
    ],
    "Follow dispatcher guidance.",
  ],
};
function topicFor(text) {
  if (/(mouth|rescue breath|ventilat|人工呼吸|吹气)/.test(text))
    return "breaths";
  if (/(rate|speed|how fast|rhythm|per minute|bpm|频率|速度|多快)/.test(text))
    return "rate";
  if (/(deep|depth|inches|centimeter|cm|多深|深度|厘米)/.test(text))
    return "depth";
  if (
    /(hands?|hand placement|where.*press|where.*put|position|手放|双手|手掌|按哪里)/.test(
      text,
    )
  )
    return "hands";
  if (/(aed|defibrillat|除颤|电击器)/.test(text)) return "aed";
  if (/(breath|gasp|unresponsive|responsive|呼吸|喘气|反应)/.test(text))
    return "breathing";
  if (
    /(911|ambulance|emergency call|call for help|救护车|求救|报警)/.test(text)
  )
    return "call";
  if (/(cpr|心肺复苏|胸外按压|心脏按压)/.test(text)) return "overview";
  return null;
}
function textureFor(kind, down) {
  if (kind === "responder")
    return script.responderMapTexture || script.callAedTexture;
  if (kind === "check") return script.checkTexture;
  if (kind === "call") return script.callTexture;
  if (kind === "callAed") return script.callAedTexture;
  if (kind === "hands") return script.handsTexture;
  if (kind === "compress")
    return down ? script.compressDownTexture : script.compressUpTexture;
  return script.aedTexture;
}
// All positions and thresholds below use Lens Studio world centimeters. These are
// practice-motion thresholds, not a measurement of chest compression depth.
var motionTuning = {
  settleSeconds: 0.3,
  settleCm: 2.0,
  downCm: 4.5,
  returnCm: 1.5,
  maxSideCm: 6,
  maxJumpCm: 12,
  minCycleSeconds: 0.18,
  maxCycleSeconds: 1.25,
  lossSeconds: 0.22,
  pauseSeconds: 2.0,
  smoothing: 0.58,
};
// Screens 06, 07 and 09 ask the wearer to raise and stack their hands, which
// can register as accidental pinches. There, only a held pinch advances, and
// brief tracking dropouts must not redraw the card or blink the markers.
var handScreenTuning = {
  holdSeconds: 0.8,
  handsTogetherCm: 12,
  noticeSeconds: 1.6,
  trackingGraceSeconds: 0.25,
  statusSettleSeconds: 0.3,
};
// Screen 06 ghost hands, drawn by spectacles/make_hand_guide.py. The guide
// lies flat (palms down) at about waist height in front of the wearer, with
// the fingers pointing away. Sizes match the drawing: 20 x 24 cm layers whose
// bottom-hand heel sits 9.875 cm toward the wearer from the layer centre.
// Voice recovery. On device the speech service can go silent (no partials,
// finals or errors) and never resumes by itself. Any sound normally produces
// partial results, so a long silence or an error triggers a clean stop and
// restart. Waits double after each consecutive attempt, up to the maximum.
var voiceTuning = {
  silentRestartSeconds: 20,
  errorRetrySeconds: 3,
  maxRetrySeconds: 120,
};
var handGuideTuning = {
  forwardCm: 40,
  belowEyeCm: 45,
  widthCm: 20,
  heightCm: 24,
  heelOffsetCm: 9.875,
  heelRingCm: 5,
};
function point(p) {
  return { x: p.x, y: p.y, z: p.z };
}
function distance(a, b) {
  var x = a.x - b.x,
    y = a.y - b.y,
    z = a.z - b.z;
  return Math.sqrt(x * x + y * y + z * z);
}
function lateral(a, b) {
  var x = a.x - b.x,
    z = a.z - b.z;
  return Math.sqrt(x * x + z * z);
}
function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function sub3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function addScaled3(a, b, scale) {
  return { x: a.x + b.x * scale, y: a.y + b.y * scale, z: a.z + b.z * scale };
}
function finitePoint(p) {
  return p && isFinite(p.x) && isFinite(p.y) && isFinite(p.z);
}
function normalize3(v) {
  var length = Math.sqrt(dot3(v, v));
  return length > 1e-6
    ? { x: v.x / length, y: v.y / length, z: v.z / length }
    : null;
}
function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
// Lens Studio cameras look along transform.back; transform.forward points
// behind the wearer. Spectacles Interaction Kit uses back for "facing" too.
function cameraFacing(ct) {
  if (ct && ct.back) return point(ct.back);
  if (ct && ct.forward)
    return { x: -ct.forward.x, y: -ct.forward.y, z: -ct.forward.z };
  return { x: 0, y: 0, z: -1 };
}
// Rotation whose local X, Y and Z axes become the given world axes.
function quatFromBasis(x, y, z) {
  var m00 = x.x, m01 = y.x, m02 = z.x;
  var m10 = x.y, m11 = y.y, m12 = z.y;
  var m20 = x.z, m21 = y.z, m22 = z.z;
  var trace = m00 + m11 + m22, s, w, qx, qy, qz;
  if (trace > 0) {
    s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    qx = (m21 - m12) * s;
    qy = (m02 - m20) * s;
    qz = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    qx = 0.25 * s;
    qy = (m01 + m10) / s;
    qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    qx = (m01 + m10) / s;
    qy = 0.25 * s;
    qz = (m12 + m21) / s;
  } else {
    s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    qx = (m02 + m20) / s;
    qy = (m12 + m21) / s;
    qz = 0.25 * s;
  }
  return new quat(w, qx, qy, qz);
}
// A level "chest" frame in front of the wearer: right, away (fingers point
// this way) and up (palms face down against it). Looking straight down has no
// level facing direction, so the head's up vector stands in for it.
function chestFrame(ct) {
  var worldUp = { x: 0, y: 1, z: 0 };
  var facing = cameraFacing(ct);
  var away = normalize3({ x: facing.x, y: 0, z: facing.z });
  if (!away || Math.abs(dot3(facing, worldUp)) > 0.95) {
    var headUp = ct && ct.up ? ct.up : { x: 0, y: 0, z: -1 };
    away = normalize3({ x: headUp.x, y: 0, z: headUp.z }) || {
      x: 0,
      y: 0,
      z: -1,
    };
  }
  return { right: cross3(away, worldUp), up: away, normal: worldUp };
}
function tune(value, fallback, min, max) {
  return isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
function newPractice() {
  return {
    count: 0,
    status: "Stack your hands and bring them into view",
    side: null,
    candidate: null,
    candidateAt: -1,
    base: null,
    filtered: null,
    lastRaw: null,
    lastSeen: -1,
    stage: "acquire",
    downAt: -1,
    times: [],
    rate: null,
    everSeen: false,
    highlightUntil: -1,
  };
}
try {
  var obj = global.scene.createSceneObject("SC Illustrated Practice Card");
  obj.getTransform().setWorldPosition(new vec3(0, 0, 0));
  var card = obj.createComponent("Component.Text");
  card.size = 60;
  card.depthTest = false;
  card.textFill.color = new vec4(1, 1, 1, 1);
  var bg = card.backgroundSettings;
  bg.enabled = true;
  bg.fill.color = new vec4(0.02, 0.07, 0.1, 0.9);
  bg.margins.left = 0.5;
  bg.margins.right = 0.5;
  bg.margins.top = 0.5;
  bg.margins.bottom = 0.5;
  var artObject = global.scene.createSceneObject("SC Action Illustration");
  artObject.getTransform().setWorldPosition(new vec3(0, 3, 0));
  artObject.getTransform().setLocalScale(new vec3(1.25, 1.25, 1));
  var art = artObject.createComponent("Component.Text");
  art.size = 192;
  art.depthTest = false;
  art.text = "XXXXXX";
  art.textFill.color = new vec4(0, 0, 0, 0);
  art.backgroundSettings.enabled = true;
  art.backgroundSettings.fill.mode = TextFillMode.Texture;
  art.backgroundSettings.fill.textureStretch = StretchMode.Stretch;
  art.backgroundSettings.fill.tileCount = 1;
  art.backgroundSettings.fill.colorTint = new vec4(1, 1, 1, 1);
  art.backgroundSettings.margins.left = 0;
  art.backgroundSettings.margins.right = 0;
  art.backgroundSettings.margins.top = 0;
  art.backgroundSettings.margins.bottom = 0;
  // Keep the teaching card at its original 40 cm viewing distance while the
  // camera gains world tracking for head-motion-resistant wrist coordinates.
  var cameraRoot = global.scene.getRootObject(0);
  if (cameraRoot && cameraRoot.getComponent("Component.Camera")) {
    obj.setParent(cameraRoot);
    obj.getTransform().setLocalPosition(new vec3(0, 0, -40));
    artObject.setParent(cameraRoot);
    artObject.getTransform().setLocalPosition(new vec3(0, 3, -40));
  }
  // These three world-space objects are owned by this already-bound script.
  // They are never parented to the camera, so the target stays put as the head moves.
  function placementLabel(name, text, color, size) {
    var object = global.scene.createSceneObject(name);
    var label = object.createComponent("Component.Text");
    label.text = text;
    label.size = size;
    label.depthTest = false;
    label.textFill.color = color;
    label.backgroundSettings.enabled = false;
    // The card and these guides all skip depth testing, so draw order decides
    // which is visible. Keep the guides consistently in front of the card.
    try {
      if (label.setRenderOrder) label.setRenderOrder(10);
    } catch (orderError) {
      /* Default order still renders the guide. */
    }
    object.enabled = false;
    return object;
  }
  // A flat world-space picture. Like the lesson illustration, it is a Text
  // background with a texture fill; one invisible character is measured and
  // the margins are set so the background is exactly widthCm x heightCm.
  function guideImage(name, texture, widthCm, heightCm, order) {
    var object = global.scene.createSceneObject(name);
    var label = object.createComponent("Component.Text");
    label.text = "X";
    label.size = 8;
    label.depthTest = false;
    label.textFill.color = new vec4(0, 0, 0, 0);
    try {
      label.twoSided = true;
      if (label.setRenderOrder) label.setRenderOrder(order);
    } catch (styleError) {
      /* Optional styling; the picture still renders. */
    }
    var fill = label.backgroundSettings.fill;
    label.backgroundSettings.enabled = true;
    label.backgroundSettings.cornerRadius = 0;
    fill.mode = TextFillMode.Texture;
    fill.texture = texture;
    fill.textureStretch = StretchMode.Stretch;
    fill.tileCount = 1;
    fill.colorTint = new vec4(1, 1, 1, 1);
    object.enabled = false;
    return {
      object: object,
      label: label,
      widthCm: widthCm,
      heightCm: heightCm,
      fitted: false,
    };
  }
  // Text layout can be empty until the first frame, so this is retried while
  // the guide is visible and logs the result once for on-device checking.
  function fitGuideImage(image) {
    if (image.fitted) return true;
    var box = null;
    try {
      box = image.label.getBoundingBox ? image.label.getBoundingBox() : null;
    } catch (boxError) {
      box = null;
    }
    if (!box || !(box.right - box.left > 0) || !(box.top - box.bottom > 0))
      return false;
    var margins = image.label.backgroundSettings.margins;
    margins.left = box.left + image.widthCm / 2;
    margins.right = image.widthCm / 2 - box.right;
    margins.bottom = box.bottom + image.heightCm / 2;
    margins.top = image.heightCm / 2 - box.top;
    image.fitted = true;
    print(
      "SECOND CHANCE guide " + image.object.name + " sized " +
        image.widthCm + " x " + image.heightCm + " cm from glyph box " +
        (box.right - box.left).toFixed(2) + " x " +
        (box.top - box.bottom).toFixed(2),
    );
    return true;
  }
  var guideBottom = guideImage(
    "SC Hand Guide Bottom Hand",
    script.handGuideBottomTexture,
    handGuideTuning.widthCm,
    handGuideTuning.heightCm,
    7,
  );
  var guideTop = guideImage(
    "SC Hand Guide Top Hand",
    script.handGuideTopTexture,
    handGuideTuning.widthCm,
    handGuideTuning.heightCm,
    8,
  );
  var guideHeel = guideImage(
    "SC Virtual Placement Target",
    script.handGuideHeelTexture,
    handGuideTuning.heelRingCm,
    handGuideTuning.heelRingCm,
    9,
  );
  var guideImages = [guideBottom, guideTop, guideHeel];
  // The heel ring is the placement target; the hand checks measure from it.
  var targetObject = guideHeel.object;
  function showHandGuide(visible) {
    guideImages.forEach(function (image) {
      image.object.enabled = visible;
      if (visible) fitGuideImage(image);
    });
  }
  function hideGuides() {
    showHandGuide(false);
    leftMarker.enabled = false;
    rightMarker.enabled = false;
    padTargets.forEach(function (object) {
      object.enabled = false;
    });
    padMarkers.forEach(function (object) {
      object.enabled = false;
    });
  }
  var leftMarker = placementLabel(
    "SC Left Palm Marker",
    "L +",
    new vec4(1, 0.78, 0.36, 1),
    43,
  );
  var rightMarker = placementLabel(
    "SC Right Palm Marker",
    "R +",
    new vec4(0.6, 0.83, 1, 1),
    43,
  );
  var padTargets = [
    placementLabel(
      "SC AED Pad A Target",
      "( A )",
      new vec4(0.32, 0.96, 0.83, 1),
      46,
    ),
    placementLabel(
      "SC AED Pad B Target",
      "( B )",
      new vec4(0.32, 0.96, 0.83, 1),
      46,
    ),
  ];
  var padMarkers = [
    placementLabel("SC AED Pad A", "[ A  + ]", new vec4(1, 0.86, 0.45, 1), 42),
    placementLabel("SC AED Pad B", "[ B  + ]", new vec4(1, 0.86, 0.45, 1), 42),
  ];
  padMarkers.forEach(function (marker) {
    var label = marker.getComponent
      ? marker.getComponent("Component.Text")
      : null;
    if (label) {
      label.backgroundSettings.enabled = true;
      label.backgroundSettings.fill.color = new vec4(0.1, 0.15, 0.18, 0.88);
      label.backgroundSettings.margins.left = 0.18;
      label.backgroundSettings.margins.right = 0.18;
      label.backgroundSettings.margins.top = 0.12;
      label.backgroundSettings.margins.bottom = 0.12;
    }
  });

  var current = "home",
    overlay = null,
    returnScreen = "call";
  var visionItem = "",
    visionFound = false;
  var visionView = [
    "FIND / EQUIPMENT",
    "check",
    [
      "Say FIND THE GAUZE.",
      "The Lens checks one view.",
      "Verify any result yourself.",
    ],
    "TRAINING / VISUAL CHECK",
  ];
  var aiView = [
    "AI / READY",
    "check",
    ["Ask a training question.", "Say ASK AI, then speak.", "Pinch to return."],
    "TRAINING ONLY / NO LIVE AID",
  ];
  var phoneView = [
    "IPHONE / CALL REQUEST",
    "call",
    [
      "Pair the iPhone app.",
      "Set a non-emergency number",
      "on the phone first.",
    ],
    "NO CALL HAS BEEN PLACED",
  ];
  // This build uses the local USB bridge. Starting an unpaired Mobile Kit
  // session is unnecessary and can compete with other Spectacles services.
  var aiRequestId = 0,
    internetModule = null,
    remoteMediaModule = null;
  var aiAudio = null,
    aiTopic = null,
    speechActive = false,
    lastSpeechAt = -10;
  var speechStartedAt = -1;
  var asrModule = null,
    asrOptions = null;
  var lastAsrUpdateAt = -1,
    lastAsrPartialLogAt = -1;
  var voiceInternetAvailable = true,
    voiceFailure = null;
  // asrStartedAt is when the current session began; asrRetryAt is a pending
  // retry after an error; voiceQuietLimit is the current silence allowance.
  var asrStartedAt = -1,
    asrRestarting = false,
    asrRetryAt = -1,
    voiceErrorCount = 0,
    voiceQuietLimit = voiceTuning.silentRestartSeconds;
  var aiAudioProbeAt = -1;
  var aiSpokenTopic = null,
    aiPendingTopic = null;
  var bundledVoices = {
    rate: script.voiceRate,
    depth: script.voiceDepth,
    hands: script.voiceHands,
    aed: script.voiceAed,
    breathing: script.voiceBreathing,
    call: script.voiceCall,
    breaths: script.voiceBreaths,
    team: script.voiceTeam,
    overview: script.voiceOverview,
    scope: script.voiceScope,
  };
  var awaitingAiQuestion = false;
  try {
    internetModule = require("LensStudio:InternetModule");
  } catch (networkError) {
    print("SECOND CHANCE AI network unavailable: " + networkError);
  }
  var callPanel = null,
    callTarget = false,
    lastCallTargetAt = -1;
  var mapTarget = false,
    lastMapTargetAt = -1;
  var lastAction = -1,
    transitionAt = -1,
    beatDown = false,
    lastStyleKey = "";
  // pinchHold tracks a pinch in progress on a hand-practice screen; pinchNotice
  // briefly explains an ignored pinch in the footer.
  var pinchHold = null,
    pinchNotice = null,
    pinchUpReady = false;
  var callReported = false,
    callerAssigned = false,
    runnerAssigned = false,
    aedPresent = false;
  var practice = newPractice(),
    leftHand = null,
    rightHand = null,
    handsReady = false;
  var editorMode = !!(
    global.deviceInfoSystem && global.deviceInfoSystem.isEditor()
  );
  if (!editorMode) {
    try {
      remoteMediaModule = require("LensStudio:RemoteMediaModule");
      aiAudio = obj.createComponent("Component.AudioComponent");
      aiAudio.volume = 1.0;
      // Spoken instructions are head-centered UI audio, not a source in the room.
      // The display object sits at the scene origin, away from the headset.
      if (aiAudio.spatialAudio) aiAudio.spatialAudio.enabled = false;
      if (typeof Audio !== "undefined" && Audio.PlaybackMode)
        aiAudio.playbackMode = Audio.PlaybackMode.LowLatency;
      print("SECOND CHANCE audio configured: nonspatial / low latency");
    } catch (audioError) {
      print("SECOND CHANCE AI audio unavailable: " + audioError);
    }
  }
  var editorHand = { tracked: false, position: { x: 0, y: 0, z: 0 } };
  var editorPlacement = { left: null, right: null };
  var placement = null;
  var padPractice = null;
  function placementActive() {
    return !overlay && !callPanel && current === "hands";
  }
  function padsActive() {
    return !overlay && !callPanel && current === "aedPads";
  }
  function newPlacement() {
    return {
      left: { filtered: null, lastSeen: -1 },
      right: { filtered: null, lastSeen: -1 },
      target: null,
      frame: null,
      candidate: null,
      insideAt: -1,
      aligned: null,
      stackAt: -1,
      status: "Bring your hands into view",
      second: "Virtual target only",
      pending: null,
    };
  }
  function clearPlacement() {
    placement = null;
    showHandGuide(false);
    leftMarker.enabled = false;
    rightMarker.enabled = false;
    editorPlacement.left = null;
    editorPlacement.right = null;
  }
  // Puts the heel ring on the chest point and lays the ghost hands flat
  // around it: palms down, fingers pointing along frame.up (away).
  function targetAt(position, frame) {
    placement.target = point(position);
    placement.frame = frame;
    placement.candidate = null;
    placement.insideAt = -1;
    placement.aligned = null;
    placement.stackAt = -1;
    var rotation =
      typeof quat !== "undefined"
        ? quatFromBasis(frame.right, frame.up, frame.normal)
        : null;
    // The drawing's heel is 9.875 cm toward the wearer from its centre.
    var handsCenter = addScaled3(position, frame.up, handGuideTuning.heelOffsetCm);
    [
      [guideBottom, handsCenter],
      [guideTop, handsCenter],
      [guideHeel, position],
    ].forEach(function (entry) {
      var transform = entry[0].object.getTransform();
      transform.setWorldPosition(new vec3(entry[1].x, entry[1].y, entry[1].z));
      if (rotation && transform.setWorldRotation)
        transform.setWorldRotation(rotation);
    });
    showHandGuide(true);
  }
  function beginPlacement() {
    placement = newPlacement();
    var ct =
      cameraRoot && cameraRoot.getTransform ? cameraRoot.getTransform() : null;
    var eye =
      ct && ct.getWorldPosition ? ct.getWorldPosition() : { x: 0, y: 0, z: 0 };
    var frame = chestFrame(ct);
    // About waist height in front of the wearer, fixed in the room.
    var heel = addScaled3(
      addScaled3(eye, frame.up, handGuideTuning.forwardCm),
      frame.normal,
      -handGuideTuning.belowEyeCm,
    );
    targetAt(heel, frame);
    leftMarker.enabled = false;
    rightMarker.enabled = false;
  }
  function placementPoint(hand) {
    if (!hand || !hand.isTracked || !hand.isTracked() || !hand.getPalmCenter)
      return null;
    var palm = hand.getPalmCenter();
    return finitePoint(palm) ? point(palm) : null;
  }
  function placementHand(side, raw, now) {
    var state = placement[side],
      marker = side === "left" ? leftMarker : rightMarker;
    if (!finitePoint(raw)) {
      // Tracking drops briefly when one hand covers the other. Hold the last
      // position for a moment instead of blinking the marker off and on.
      if (
        state.filtered &&
        now - state.lastSeen <= handScreenTuning.trackingGraceSeconds
      )
        return state.filtered;
      state.filtered = null;
      marker.enabled = false;
      return null;
    }
    state.lastSeen = now;
    if (!state.filtered || distance(raw, state.filtered) > 20)
      state.filtered = point(raw);
    else {
      var a = 0.42;
      state.filtered.x += a * (raw.x - state.filtered.x);
      state.filtered.y += a * (raw.y - state.filtered.y);
      state.filtered.z += a * (raw.z - state.filtered.z);
    }
    marker
      .getTransform()
      .setWorldPosition(
        new vec3(state.filtered.x, state.filtered.y, state.filtered.z),
      );
    var ct =
      cameraRoot && cameraRoot.getTransform ? cameraRoot.getTransform() : null;
    if (ct && ct.getWorldRotation && marker.getTransform().setWorldRotation)
      marker.getTransform().setWorldRotation(ct.getWorldRotation());
    marker.enabled = true;
    return state.filtered;
  }
  function targetLocal(position) {
    var offset = sub3(position, placement.target),
      frame = placement.frame;
    return {
      x: dot3(offset, frame.right),
      y: dot3(offset, frame.up),
      z: dot3(offset, frame.normal),
    };
  }
  function inPlacementZone(position, exit) {
    if (!position) return false;
    var local = targetLocal(position);
    var enterRadius = tune(script.placementEnterRadiusCm, 6, 2, 20);
    var exitRadius = tune(script.placementExitRadiusCm, 8, enterRadius, 25);
    var enterDepth = tune(script.placementDepthCm, 5, 2, 20);
    var exitDepth = tune(script.placementExitDepthCm, 7, enterDepth, 25);
    return (
      Math.sqrt(local.x * local.x + local.y * local.y) <=
        (exit ? exitRadius : enterRadius) &&
      Math.abs(local.z) <= (exit ? exitDepth : enterDepth)
    );
  }
  // A new status must hold steady briefly before the card is rewritten, so
  // flickering hand tracking cannot redraw the card many times a second.
  function setPlacementStatus(status, second, now, immediate) {
    if (placement.status === status && placement.second === second) {
      placement.pending = null;
      return;
    }
    if (!immediate) {
      var pending = placement.pending;
      if (!pending || pending.status !== status || pending.second !== second) {
        placement.pending = { status: status, second: second, since: now };
        return;
      }
      if (now - pending.since < handScreenTuning.statusSettleSeconds) return;
    }
    placement.pending = null;
    placement.status = status;
    placement.second = second;
    render();
  }
  function placementSample(samples, now) {
    if (!placementActive() || !placement) return;
    var left = placementHand("left", samples && samples.left, now);
    var right = placementHand("right", samples && samples.right, now);
    var visible = (left ? 1 : 0) + (right ? 1 : 0);
    if (!visible) {
      placement.candidate = null;
      placement.aligned = null;
      placement.insideAt = -1;
      placement.stackAt = -1;
      setPlacementStatus(
        "Bring your hands into view",
        "Virtual target only",
        now,
      );
      return;
    }
    if (
      placement.aligned &&
      !inPlacementZone(placement.aligned === "left" ? left : right, true)
    ) {
      placement.aligned = null;
      placement.candidate = null;
      placement.insideAt = -1;
      placement.stackAt = -1;
    }
    if (!placement.aligned) {
      var candidate = inPlacementZone(left, false)
        ? "left"
        : inPlacementZone(right, false)
          ? "right"
          : null;
      if (candidate !== placement.candidate) {
        placement.candidate = candidate;
        placement.insideAt = candidate ? now : -1;
      }
      if (
        candidate &&
        now - placement.insideAt >=
          tune(script.placementHoldSeconds, 0.6, 0.2, 3)
      )
        placement.aligned = candidate;
    }
    var second =
      visible === 1 ? "Second hand out of view" : "Stack hands over target";
    if (placement.aligned && visible === 2) {
      var stackOffset = sub3(left, right),
        stackLocal = {
          x: dot3(stackOffset, placement.frame.right),
          y: dot3(stackOffset, placement.frame.up),
          z: dot3(stackOffset, placement.frame.normal),
        };
      var stacked =
        Math.sqrt(stackLocal.x * stackLocal.x + stackLocal.y * stackLocal.y) <=
          tune(script.placementStackRadiusCm, 9, 3, 20) &&
        Math.abs(stackLocal.z) <= 8;
      if (stacked) {
        if (placement.stackAt < 0) placement.stackAt = now;
        if (
          now - placement.stackAt >=
          tune(script.placementHoldSeconds, 0.6, 0.2, 3)
        )
          second = "Hands stacked (approx.)";
      } else placement.stackAt = -1;
    } else placement.stackAt = -1;
    setPlacementStatus(
      placement.aligned ? "Hand aligned with target" : "Move toward the target",
      second,
      now,
    );
  }
  function setTargetHere() {
    if (!placementActive() || !placement) return;
    var position = placement.left.filtered || placement.right.filtered;
    if (!position) {
      setPlacementStatus(
        "Bring your hands into view",
        "Set target when visible",
        getTime(),
        true,
      );
      return;
    }
    // Keep the level chest orientation; only the heel point moves.
    targetAt(position, placement.frame);
    setPlacementStatus(
      "Move toward the target",
      "Virtual target set by you",
      getTime(),
      true,
    );
    print(
      "SECOND CHANCE virtual target manually placed; physical alignment unverified",
    );
  }
  function clearPads() {
    padPractice = null;
    padTargets.forEach(function (object) {
      object.enabled = false;
    });
    padMarkers.forEach(function (object) {
      object.enabled = false;
    });
    editorPlacement.left = null;
    editorPlacement.right = null;
  }
  function beginPads() {
    editorPlacement.left = null;
    editorPlacement.right = null;
    var ct =
      cameraRoot && cameraRoot.getTransform ? cameraRoot.getTransform() : null;
    var origin =
      ct && ct.getWorldPosition ? ct.getWorldPosition() : { x: 0, y: 0, z: 0 };
    var frame = {
      right: point(ct && ct.right ? ct.right : { x: 1, y: 0, z: 0 }),
      up: point(ct && ct.up ? ct.up : { x: 0, y: 1, z: 0 }),
      // In front of the wearer (forward would put the pads behind them).
      normal: cameraFacing(ct),
    };
    // Freeze the virtual chest plane at lesson entry. Head movement must not
    // drag these targets around or create a false placement match.
    var center = addScaled3(addScaled3(origin, frame.normal, 52), frame.up, -8);
    var targetA = addScaled3(addScaled3(center, frame.right, -9), frame.up, 5);
    var targetB = addScaled3(addScaled3(center, frame.right, 9), frame.up, -5);
    padPractice = {
      target: [targetA, targetB],
      frame: frame,
      placed: [false, false],
      side: [null, null],
      filtered: [null, null],
      insideAt: [-1, -1],
      lastSeen: [-1, -1],
      status: "Bring a hand into view",
      pending: null,
    };
    [targetA, targetB].forEach(function (position, index) {
      var target = padTargets[index];
      target
        .getTransform()
        .setWorldPosition(new vec3(position.x, position.y, position.z));
      if (ct && ct.getWorldRotation && target.getTransform().setWorldRotation)
        target.getTransform().setWorldRotation(ct.getWorldRotation());
      target.enabled = true;
      padMarkers[index].enabled = false;
      var label = padMarkers[index].getComponent
        ? padMarkers[index].getComponent("Component.Text")
        : null;
      if (label) {
        label.text = index ? "[ PAD B  + ]" : "[ PAD A  + ]";
        label.textFill.color = new vec4(1, 0.86, 0.45, 1);
      }
    });
  }
  function padZone(index, position, exit) {
    var offset = sub3(position, padPractice.target[index]),
      frame = padPractice.frame;
    var x = dot3(offset, frame.right),
      y = dot3(offset, frame.up);
    var z = dot3(offset, frame.normal);
    var enterRadius = tune(script.placementEnterRadiusCm, 6, 2, 20);
    var exitRadius = tune(script.placementExitRadiusCm, 8, enterRadius, 25);
    var enterDepth = tune(script.placementDepthCm, 5, 2, 20);
    var exitDepth = tune(script.placementExitDepthCm, 7, enterDepth, 25);
    return (
      Math.sqrt(x * x + y * y) <= (exit ? exitRadius : enterRadius) &&
      Math.abs(z) <= (exit ? exitDepth : enterDepth)
    );
  }
  function setPadStatus(status, now) {
    if (padPractice.status === status) {
      padPractice.pending = null;
      return;
    }
    var pending = padPractice.pending;
    if (!pending || pending.status !== status) {
      padPractice.pending = { status: status, since: now };
      return;
    }
    if (now - pending.since < handScreenTuning.statusSettleSeconds) return;
    padPractice.pending = null;
    padPractice.status = status;
    render();
  }
  function padSample(samples, now) {
    if (!padsActive() || !padPractice) return;
    var visible = false,
      holding = false;
    for (var index = 0; index < 2; index++) {
      if (padPractice.placed[index]) continue;
      var side = padPractice.side[index],
        raw = side && samples && samples[side];
      if (
        !finitePoint(raw) &&
        padPractice.filtered[index] &&
        now - padPractice.lastSeen[index] <=
          handScreenTuning.trackingGraceSeconds
      ) {
        // Brief dropout: leave the pad where it is rather than hiding it or
        // handing it to the other hand.
        visible = true;
        if (padPractice.insideAt[index] >= 0) holding = true;
        continue;
      }
      if (!finitePoint(raw)) {
        // The second pad uses the other visible hand before Pad A is placed.
        side =
          index === 0
            ? finitePoint(samples && samples.left)
              ? "left"
              : finitePoint(samples && samples.right)
                ? "right"
                : null
            : padPractice.placed[0]
              ? finitePoint(samples && samples.right)
                ? "right"
                : finitePoint(samples && samples.left)
                  ? "left"
                  : null
              : finitePoint(samples && samples.left) &&
                  finitePoint(samples && samples.right)
                ? padPractice.side[0] === "right"
                  ? "left"
                  : "right"
                : null;
        raw = side && samples[side];
        padPractice.side[index] = side;
        padPractice.filtered[index] = null;
        padPractice.insideAt[index] = -1;
      }
      if (!finitePoint(raw)) {
        padMarkers[index].enabled = false;
        continue;
      }
      padPractice.lastSeen[index] = now;
      visible = true;
      var filtered = padPractice.filtered[index];
      if (!filtered || distance(raw, filtered) > 20) filtered = point(raw);
      else {
        filtered.x += 0.42 * (raw.x - filtered.x);
        filtered.y += 0.42 * (raw.y - filtered.y);
        filtered.z += 0.42 * (raw.z - filtered.z);
      }
      padPractice.filtered[index] = filtered;
      var marker = padMarkers[index],
        transform = marker.getTransform();
      transform.setWorldPosition(new vec3(filtered.x, filtered.y, filtered.z));
      var ct =
        cameraRoot && cameraRoot.getTransform
          ? cameraRoot.getTransform()
          : null;
      if (ct && ct.getWorldRotation && transform.setWorldRotation)
        transform.setWorldRotation(ct.getWorldRotation());
      marker.enabled = true;
      var inside = padZone(index, filtered, padPractice.insideAt[index] >= 0);
      if (!inside) {
        padPractice.insideAt[index] = -1;
        continue;
      }
      holding = true;
      if (padPractice.insideAt[index] < 0) padPractice.insideAt[index] = now;
      if (
        now - padPractice.insideAt[index] >=
        tune(script.placementHoldSeconds, 0.6, 0.2, 3)
      ) {
        padPractice.placed[index] = true;
        padPractice.side[index] = null;
        marker
          .getTransform()
          .setWorldPosition(
            new vec3(
              padPractice.target[index].x,
              padPractice.target[index].y,
              padPractice.target[index].z,
            ),
          );
        padTargets[index].enabled = false;
        var placedLabel = marker.getComponent
          ? marker.getComponent("Component.Text")
          : null;
        if (placedLabel) {
          placedLabel.text = index ? "[ PAD B  SET ]" : "[ PAD A  SET ]";
          placedLabel.textFill.color = new vec4(0.32, 1, 0.76, 1);
        }
        print(
          "SECOND CHANCE virtual AED pad " +
            (index ? "B" : "A") +
            " placed; physical contact unverified",
        );
      }
    }
    setPadStatus(
      padPractice.placed[0] && padPractice.placed[1]
        ? "Both pads on virtual targets"
        : holding
          ? "Hold pad over target"
          : visible
            ? "Move pad toward target"
            : "Bring a hand into view",
      now,
    );
  }
  // Returning from a voice card or the call panel restores the same targets
  // instead of re-anchoring them to wherever the head now points.
  function resumeGuides() {
    if (current === "hands" && placement) {
      placement.left = { filtered: null, lastSeen: -1 };
      placement.right = { filtered: null, lastSeen: -1 };
      placement.pending = null;
      showHandGuide(true);
    }
    if (current === "aedPads" && padPractice) {
      for (var index = 0; index < 2; index++) {
        padTargets[index].enabled = !padPractice.placed[index];
        padMarkers[index].enabled = padPractice.placed[index];
        if (!padPractice.placed[index]) {
          padPractice.filtered[index] = null;
          padPractice.side[index] = null;
          padPractice.insideAt[index] = -1;
        }
      }
      padPractice.pending = null;
    }
  }
  function practicing() {
    return !overlay && current === "compress";
  }
  function handPracticeScreen() {
    return (
      !overlay &&
      !callPanel &&
      (current === "hands" || current === "compress" || current === "aedPads")
    );
  }
  // Desktop Preview clicks cannot be held, so the hold applies on the headset only.
  function holdScreen() {
    return !editorMode && pinchUpReady && handPracticeScreen();
  }
  function handsTogether() {
    if (
      editorMode ||
      !handsReady ||
      !leftHand.isTracked() ||
      !rightHand.isTracked()
    )
      return false;
    var a = leftHand.getPalmCenter(),
      b = rightHand.getPalmCenter();
    return (
      finitePoint(a) &&
      finitePoint(b) &&
      distance(a, b) < handScreenTuning.handsTogetherCm
    );
  }
  function statusLines() {
    if (!editorMode && !handsReady)
      return ["Hand tracking unavailable", "Follow visual beat only"];
    if (practice.status === "Stack your hands and bring them into view")
      return ["Stack your hands and", "bring them into view"];
    if (practice.status === "Bring your hands back into view")
      return ["Bring your hands", "back into view"];
    return [practice.status, ""];
  }
  function setStatus(status) {
    if (practice.status !== status) {
      practice.status = status;
      render();
    }
  }
  function loseTracking() {
    practice.side = null;
    practice.candidate = null;
    practice.candidateAt = -1;
    practice.base = null;
    practice.filtered = null;
    practice.lastRaw = null;
    practice.stage = "acquire";
    practice.downAt = -1;
    practice.rate = null;
    practice.times = [];
    setStatus(
      practice.everSeen
        ? "Bring your hands back into view"
        : "Stack your hands and bring them into view",
    );
  }
  function practiceSample(sample, now) {
    if (!practicing()) return;
    if (
      !sample ||
      !sample.position ||
      !isFinite(sample.position.x) ||
      !isFinite(sample.position.y) ||
      !isFinite(sample.position.z)
    ) {
      if (
        practice.lastSeen < 0 ||
        now - practice.lastSeen > motionTuning.lossSeconds
      )
        loseTracking();
      return;
    }
    var raw = sample.position;
    if (practice.side && sample.side !== practice.side) loseTracking();
    if (
      practice.lastRaw &&
      now > practice.lastSeen &&
      now - practice.lastSeen < 0.2 &&
      distance(raw, practice.lastRaw) > motionTuning.maxJumpCm
    ) {
      loseTracking();
      return;
    }
    practice.side = sample.side;
    practice.everSeen = true;
    practice.lastSeen = now;
    practice.lastRaw = point(raw);
    if (!practice.filtered) practice.filtered = point(raw);
    else {
      var a = motionTuning.smoothing;
      practice.filtered.x += a * (raw.x - practice.filtered.x);
      practice.filtered.y += a * (raw.y - practice.filtered.y);
      practice.filtered.z += a * (raw.z - practice.filtered.z);
    }
    var p = practice.filtered;
    if (practice.stage === "acquire") {
      if (
        !practice.candidate ||
        distance(p, practice.candidate) > motionTuning.settleCm
      ) {
        practice.candidate = point(p);
        practice.candidateAt = now;
      } else if (now - practice.candidateAt >= motionTuning.settleSeconds) {
        practice.base = point(p);
        practice.stage = "ready";
        setStatus(
          sample.handsClose ? "Hands close; follow beat" : "Follow the beat",
        );
      }
      return;
    }
    if (lateral(p, practice.base) > motionTuning.maxSideCm) {
      loseTracking();
      return;
    }
    var drop = practice.base.y - p.y;
    if (practice.stage === "ready" && drop >= motionTuning.downCm) {
      practice.stage = "down";
      practice.downAt = now;
    } else if (practice.stage === "down") {
      if (now - practice.downAt > motionTuning.maxCycleSeconds) {
        practice.stage = "acquire";
        practice.candidate = null;
        setStatus("Follow the beat");
      } else if (
        drop <= motionTuning.returnCm &&
        now - practice.downAt >= motionTuning.minCycleSeconds
      ) {
        practice.stage = "ready";
        practice.base = point(p);
        practice.count++;
        practice.highlightUntil = now + 0.18;
        practice.times.push(now);
        if (practice.times.length > 5) practice.times.shift();
        if (practice.times.length >= 4) {
          var first = practice.times[0],
            last = practice.times[practice.times.length - 1];
          practice.rate = (60 * (practice.times.length - 1)) / (last - first);
          practice.status =
            practice.rate < 100
              ? "A little faster"
              : practice.rate > 120
                ? "A little slower"
                : "In range";
        } else practice.status = "Follow the beat";
        render();
      }
    }
    if (
      practice.rate !== null &&
      practice.times.length &&
      now - practice.times[practice.times.length - 1] >
        motionTuning.pauseSeconds
    ) {
      practice.rate = null;
      practice.times = [];
      setStatus("Follow the beat");
    }
  }
  function handSample() {
    if (editorMode)
      return editorHand.tracked
        ? { side: "right", position: editorHand.position }
        : null;
    if (!handsReady) return null;
    var hand = null,
      side = null;
    if (practice.side === "left" && leftHand.isTracked()) {
      hand = leftHand;
      side = "left";
    } else if (practice.side === "right" && rightHand.isTracked()) {
      hand = rightHand;
      side = "right";
    } else if (rightHand.isTracked()) {
      hand = rightHand;
      side = "right";
    } else if (leftHand.isTracked()) {
      hand = leftHand;
      side = "left";
    }
    if (!hand || !hand.wrist || !hand.wrist.position) return null;
    var handsClose = false;
    if (leftHand.isTracked() && rightHand.isTracked()) {
      var leftPalm = leftHand.getPalmCenter(),
        rightPalm = rightHand.getPalmCenter();
      if (leftPalm && rightPalm)
        handsClose =
          lateral(leftPalm, rightPalm) < 9 &&
          Math.abs(leftPalm.y - rightPalm.y) < 10;
    }
    return {
      side: side,
      position: hand.wrist.position,
      handsClose: handsClose,
    };
  }
  function holdFooter() {
    var now = getTime();
    if (pinchHold) {
      var bar = "";
      for (var step = 0; step < 4; step++)
        bar += step < pinchHold.step ? "#" : "-";
      return "HOLDING PINCH [" + bar + "]";
    }
    if (pinchNotice && now < pinchNotice.until) return pinchNotice.text;
    return voiceInternetAvailable && !voiceFailure
      ? "HOLD PINCH / SAY NEXT"
      : "HOLD PINCH TO CONTINUE";
  }
  function footer() {
    if (holdScreen()) return holdFooter();
    if (!voiceInternetAvailable) return "VOICE NEEDS WI-FI / PINCH";
    if (voiceFailure === "Unauthenticated") return "SIGN IN FOR VOICE / PINCH";
    if (voiceFailure) return "VOICE UNAVAILABLE / PINCH";
    if (callPanel) return "AIM / PINCH OR SAY SELECT";
    if (overlay) return "SAY BACK / PINCH BACK";
    if (current === "safety" || current === "call")
      return callTarget
        ? "> CALL EMERGENCY / PINCH"
        : "CALL EMERGENCY: AIM+PINCH";
    if (
      current === "safety" ||
      current === "response" ||
      current === "breathing"
    )
      return "PINCH = SCENARIO ANSWER";
    if (
      current === "unsafe" ||
      current === "responsive" ||
      current === "breathingYes"
    )
      return "SAY RESTART / PINCH";
    if (current === "navCabinet") return "SAY AED HERE / BACK";
    if (current === "responderMap") return "SAY BACK / PINCH BACK";
    if (current === "home")
      return mapTarget ? "> MAP / PINCH" : "SAY START / PINCH";
    return "SAY NEXT / PINCH NEXT";
  }
  function currentView() {
    if (!overlay) return screens[current];
    if (overlay === "ai") return aiView;
    if (overlay === "vision") return visionView;
    if (overlay === "phone") return phoneView;
    return answers[overlay];
  }
  function render() {
    // Screens 06 and 09 put world-space targets below eye level. Their compact
    // card sits higher, without the illustration, so it never covers them.
    var guideLayout = placementActive() || padsActive();
    if (!guideLayout) hideGuides();
    obj.enabled = !(overlay === "vision" && visionFound);
    artObject.enabled = obj.enabled && !guideLayout;
    if (cameraRoot && obj.getTransform().setLocalPosition)
      obj
        .getTransform()
        .setLocalPosition(new vec3(0, guideLayout ? 9 : 0, -40));
    if (callPanel) {
      var state = callPanel.stage,
        main = "",
        sub = "";
      var prompts = [
        "Where are you?",
        "Is the person responsive?",
        "Are they breathing normally?",
      ];
      if (state === "ready") {
        main = "Start simulated call";
        sub = "Cancel";
      } else if (state === "ringing") {
        main = "Cancel";
        sub = "";
      } else if (state === "connected" || state === "dispatcher") {
        main = "Next prompt";
        sub = "End simulation";
      } else {
        main = "Back to lesson";
        sub = "";
      }
      var detail =
        state === "ready"
          ? "SIMULATED CALL / READY"
          : state === "ringing"
            ? "SIMULATED CALL / RINGING"
            : state === "ended"
              ? "SIMULATION ENDED"
              : state === "connected"
                ? "SIM DISPATCHER CONNECTED"
                : "SIM DISPATCHER / PROMPT";
      var question =
        state === "connected" || state === "dispatcher"
          ? prompts[callPanel.question]
          : "";
      var actionA = (callPanel.focus === "primary" ? "> " : "  ") + main;
      var actionB = sub
        ? (callPanel.focus === "secondary" ? "> " : "  ") + sub
        : "";
      card.size = 48;
      artObject.getTransform().setLocalScale(new vec3(1.15, 1.15, 1));
      card.text = [
        "ADULT CPR / SIMULATION R3",
        "CALL / TRAINING ONLY",
        "",
        "",
        "",
        callRegion(),
        detail,
        question,
        callPanel.ack || "",
        actionA,
        actionB,
        manualCall(),
        manualCallTail(),
      ].join("\n");
      art.backgroundSettings.fill.texture = script.callTexture;
      return;
    }
    var view = currentView();
    if (padsActive() && padPractice) {
      card.size = 39;
      card.text = [
        "09 / AED PADS",
        "VIRTUAL TRAINING TARGETS",
        "Follow AED pad diagram.",
        padPractice.status,
        "A: " +
          (padPractice.placed[0] ? "SET" : "MOVE") +
          "   B: " +
          (padPractice.placed[1] ? "SET" : "MOVE"),
        footer(),
      ].join("\n");
      return;
    }
    if (placementActive() && placement) {
      card.size = 39;
      card.text = [
        "06 / HAND POSITION",
        "Heel in center, hand on top",
        "Shoulders over your hands.",
        placement.status,
        placement.second,
        editorMode ? "PREVIEW HANDS / SIM" : "MATCH GHOST HANDS BELOW",
        footer(),
      ].join("\n");
      return;
    }
    card.size = practicing() ? 49 : 60;
    artObject
      .getTransform()
      .setLocalScale(
        practicing() ? new vec3(1.08, 1.08, 1) : new vec3(1.25, 1.25, 1),
      );
    var cue = view[3];
    if (!overlay && current === "team") {
      cue =
        "CALL " +
        (callReported ? "REPORTED" : callerAssigned ? "ASSIGNED" : "OPEN") +
        " / AED " +
        (aedPresent ? "HERE" : runnerAssigned ? "SENT" : "OPEN");
    }
    if (!overlay && current === "call" && callReported)
      cue = "CALL REPORTED BY USER.";
    else if (!overlay && (current === "safety" || current === "call"))
      cue = callRegion();
    if (!overlay && current === "compress" && aedPresent)
      cue = "AED HERE? SAY USE AED.";
    var lines = ["ADULT CPR / SIMULATION R3", view[0], "", "", ""];
    if (!practicing()) lines.push("");
    lines = lines.concat(view[2]);
    lines.push(cue);
    if (practicing()) {
      lines = lines.concat(statusLines());
      lines.push("Practice motions: " + practice.count);
    }
    lines.push(footer());
    card.text = lines.join("\n");
    art.backgroundSettings.fill.texture = textureFor(view[1], beatDown);
  }
  function show(id) {
    // Closing a card shown over this same screen resumes its practice targets.
    var resume = !!overlay && id === current;
    if (global.secondChanceClearEquipment) global.secondChanceClearEquipment();
    visionFound = false;
    aiRequestId++;
    stopAiAudio();
    aiTopic = null;
    awaitingAiQuestion = false;
    pinchHold = null;
    pinchNotice = null;
    if (current === "hands" && !resume) clearPlacement();
    if (current === "aedPads" && !resume) clearPads();
    if (current === "compress" || id === "compress") {
      practice = newPractice();
      if (editorMode) {
        editorHand.tracked = false;
        editorHand.position = { x: 0, y: 0, z: 0 };
      }
    }
    current = id;
    overlay = null;
    beatDown = false;
    callTarget = false;
    mapTarget = false;
    if (id === "hands") {
      if (resume && placement) resumeGuides();
      else beginPlacement();
    }
    if (id === "aedPads") {
      if (resume && padPractice) resumeGuides();
      else beginPads();
    }
    transitionAt = getTime();
    render();
    print("SECOND CHANCE screen " + id);
  }
  function reset() {
    callPanel = null;
    callTarget = false;
    lastCallTargetAt = -1;
    mapTarget = false;
    lastMapTargetAt = -1;
    callReported = false;
    callerAssigned = false;
    runnerAssigned = false;
    aedPresent = false;
    returnScreen = "call";
    show("home");
  }
  function accepted() {
    var now = getTime();
    if (now - lastAction < 0.45) return false;
    lastAction = now;
    return true;
  }
  function openCallPanel() {
    if (!accepted()) return;
    pinchHold = null;
    callPanel = {
      stage: "ready",
      origin: current,
      focus: "primary",
      question: 0,
      connectAt: -1,
      ack: "",
    };
    overlay = null;
    transitionAt = getTime();
    render();
    print("SECOND CHANCE simulated call panel opened from " + current);
  }
  function closeCallPanel() {
    var origin = callPanel ? callPanel.origin : current;
    callPanel = null;
    current = origin;
    callTarget = false;
    lastCallTargetAt = -1;
    if (current === "hands") {
      if (placement) resumeGuides();
      else beginPlacement();
    }
    if (current === "aedPads") {
      if (padPractice) resumeGuides();
      else beginPads();
    }
    transitionAt = getTime();
    render();
  }
  function selectCallPanel() {
    if (!accepted() || !callPanel) return;
    var state = callPanel.stage;
    if (state === "ready") {
      if (callPanel.focus === "secondary") {
        closeCallPanel();
        return;
      }
      callPanel.stage = "ringing";
      callPanel.focus = "primary";
      callPanel.ack = "";
      callPanel.connectAt = getTime() + 1.6;
    } else if (state === "ringing") closeCallPanel();
    else if (state === "connected" || state === "dispatcher") {
      if (callPanel.focus === "secondary" || callPanel.question === 2) {
        callPanel.stage = "ended";
        callPanel.focus = "primary";
        callPanel.connectAt = -1;
        callPanel.ack = "";
      } else {
        callPanel.question++;
        callPanel.stage = "dispatcher";
        callPanel.ack =
          callPanel.question === 1
            ? "Thank you. Stay with me."
            : "Thank you. Keep going.";
      }
    } else closeCallPanel();
    if (callPanel) {
      transitionAt = getTime();
      render();
    }
  }
  // GestureModule targeting ray selects a row on the camera-facing call card.
  // The same physical pinch is handled only by pinch() and accepted().
  function targetCall(args) {
    if (!args || !args.isValid || !cameraRoot || !cameraRoot.getTransform)
      return;
    var ct = cameraRoot.getTransform(),
      center = obj.getTransform().getWorldPosition();
    var normal = ct.forward,
      up = ct.up,
      ray = args.rayDirectionInWorld,
      origin = args.rayOriginInWorld;
    var dot = ray.x * normal.x + ray.y * normal.y + ray.z * normal.z;
    if (Math.abs(dot) < 0.01) return;
    var dx = center.x - origin.x,
      dy = center.y - origin.y,
      dz = center.z - origin.z;
    var t = (dx * normal.x + dy * normal.y + dz * normal.z) / dot;
    if (t <= 0 || t > 100) return;
    var hit = {
      x: origin.x + ray.x * t - center.x,
      y: origin.y + ray.y * t - center.y,
      z: origin.z + ray.z * t - center.z,
    };
    var height = hit.x * up.x + hit.y * up.y + hit.z * up.z;
    var right = ct.right,
      wide = hit.x * right.x + hit.y * right.y + hit.z * right.z;
    if (Math.abs(wide) > 14) return;
    lastCallTargetAt = getTime();
    if (callPanel) {
      var focus = height < -5 ? "secondary" : "primary";
      if (
        height < -15 ||
        height > 8 ||
        (focus === "secondary" &&
          (callPanel.stage === "ringing" || callPanel.stage === "ended"))
      )
        return;
      if (focus !== callPanel.focus) {
        callPanel.focus = focus;
        render();
      }
    } else if (current === "home") {
      var onMap = height < -5 && height > -15;
      lastMapTargetAt = getTime();
      if (onMap !== mapTarget) {
        mapTarget = onMap;
        render();
      }
    } else if (current === "safety" || current === "call") {
      var active = height < -5 && height > -15;
      if (active !== callTarget) {
        callTarget = active;
        render();
      }
    }
  }
  function next() {
    if (!accepted()) return;
    if (overlay) {
      show(current);
      return;
    }
    if (
      current === "unsafe" ||
      current === "responsive" ||
      current === "breathingYes"
    ) {
      reset();
      return;
    }
    if (current === "navStart") {
      show("navHall");
      return;
    }
    if (current === "navHall") {
      show("navCabinet");
      return;
    }
    if (
      current === "navCabinet" ||
      current === "help" ||
      current === "responderMap"
    ) {
      show(returnScreen);
      return;
    }
    // Screen 11 ends the lesson: return to the start screen with a fresh
    // run, the same as saying "Restart".
    if (current === "aedResume") {
      reset();
      return;
    }
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
    if (current === "help") show(returnScreen);
    else render();
    print("SECOND CHANCE call reported by user, not verified");
  }
  function assign(role) {
    if (!accepted()) return;
    if (role === "caller") callerAssigned = true;
    if (role === "runner") runnerAssigned = true;
    render();
    print("SECOND CHANCE role assigned " + role);
  }
  function openNav() {
    if (!accepted()) return;
    returnScreen = current;
    show("navStart");
  }
  function openResponderMap() {
    if (!accepted()) return;
    returnScreen = current;
    show("responderMap");
    print("SECOND CHANCE simulated responder map opened; no live location");
  }
  function aedHere() {
    if (!accepted()) return;
    aedPresent = true;
    show("aedPower");
    print("SECOND CHANCE AED presence reported by user, not verified");
  }
  function showHelp() {
    if (!accepted()) return;
    returnScreen = current;
    show("help");
  }
  function showAnswer(topic) {
    if (!accepted()) return;
    if (global.secondChanceClearEquipment) global.secondChanceClearEquipment();
    visionFound = false;
    if (practicing()) practice = newPractice();
    overlay = topic;
    transitionAt = getTime();
    beatDown = false;
    render();
    print("SECOND CHANCE voice topic " + topic);
  }
  function aiCard(title, artKind, lines, cue) {
    var valid = {
      check: 1,
      call: 1,
      callAed: 1,
      hands: 1,
      compress: 1,
      aed: 1,
    };
    function short(value) {
      return String(value || "")
        .replace(/[\r\n]/g, " ")
        .slice(0, 28);
    }
    return [
      short(title),
      valid[artKind] ? artKind : "check",
      [short(lines[0]), short(lines[1]), short(lines[2])],
      short(cue),
    ];
  }
  function stopAiAudio() {
    if (aiAudio && aiAudio.isPlaying && aiAudio.isPlaying()) aiAudio.stop(true);
    aiAudioProbeAt = -1;
    if (speechActive) lastSpeechAt = getTime();
    speechActive = false;
    speechStartedAt = -1;
    aiSpokenTopic = null;
    aiPendingTopic = null;
  }
  function playVoiceTrack(track, topic, requestId) {
    if (!track || !aiAudio || requestId !== aiRequestId || overlay !== "ai")
      return false;
    stopAiAudio();
    aiAudio.audioTrack = track;
    print(
      "SECOND CHANCE voice asset: " + topic + " duration " + aiAudio.duration,
    );
    aiAudio.setOnFinish(function () {
      print(
        "SECOND CHANCE voice finished: " + topic + " at " + aiAudio.position,
      );
      speechActive = false;
      lastSpeechAt = getTime();
      if (requestId === aiRequestId && overlay === "ai") {
        aiView[3] = "VOICE FINISHED";
        render();
      }
    });
    speechActive = true;
    speechStartedAt = getTime();
    aiSpokenTopic = topic;
    aiAudio.play(1);
    aiAudioProbeAt = getTime() + 0.5;
    aiView[3] = "SPOKEN TRAINING ANSWER";
    render();
    print(
      "SECOND CHANCE bundled voice playing: " +
        topic +
        " / " +
        aiAudio.isPlaying(),
    );
    return true;
  }
  function speakAi(topic, requestId) {
    if (aiSpokenTopic === topic || aiPendingTopic === topic) return;
    if (playVoiceTrack(bundledVoices[topic], topic, requestId)) return;
    if (
      !aiAudio ||
      !remoteMediaModule ||
      !internetModule ||
      !script.aiBaseUrl
    ) {
      if (requestId === aiRequestId && overlay === "ai") {
        aiView[3] = "VOICE UNAVAILABLE";
        render();
      }
      return;
    }
    try {
      aiPendingTopic = topic;
      var url =
        String(script.aiBaseUrl).replace(/\/$/, "") +
        "/api/lens/audio?topic=" +
        encodeURIComponent(topic);
      // The media downloader cannot reach the Mac's USB-reversed localhost URL
      // on Spectacles even though InternetModule.fetch can. Download the MP3
      // through fetch first, then hand its Blob to RemoteMediaModule to decode.
      internetModule
        .fetch(url)
        .then(function (response) {
          if (response.status !== 200)
            throw new Error("Audio HTTP " + response.status);
          return response.blob();
        })
        .then(function (blob) {
          if (requestId !== aiRequestId || overlay !== "ai") return;
          var resource = internetModule.makeResourceFromBlob(blob);
          remoteMediaModule.loadResourceAsAudioTrackAsset(
            resource,
            function (track) {
              if (requestId !== aiRequestId || overlay !== "ai") return;
              stopAiAudio();
              aiAudio.audioTrack = track;
              aiAudio.setOnFinish(function () {
                speechActive = false;
                lastSpeechAt = getTime();
                if (requestId === aiRequestId && overlay === "ai") {
                  aiView[3] = "AI VOICE FINISHED";
                  render();
                }
              });
              speechActive = true;
              speechStartedAt = getTime();
              aiSpokenTopic = topic;
              aiAudio.play(1);
              aiView[3] = "AI-GENERATED VOICE";
              render();
              print("SECOND CHANCE AI speech playing");
            },
            function (error) {
              if (aiPendingTopic === topic) aiPendingTopic = null;
              if (requestId === aiRequestId && overlay === "ai") {
                aiView[3] = "VOICE UNAVAILABLE";
                render();
              }
              print("SECOND CHANCE AI speech unavailable: " + error);
            },
          );
        })
        .catch(function (error) {
          if (aiPendingTopic === topic) aiPendingTopic = null;
          if (requestId === aiRequestId && overlay === "ai") {
            aiView[3] = "VOICE UNAVAILABLE";
            render();
          }
          print("SECOND CHANCE AI audio fetch failed: " + error);
        });
    } catch (error) {
      if (aiPendingTopic === topic) aiPendingTopic = null;
      if (requestId === aiRequestId && overlay === "ai") {
        aiView[3] = "VOICE UNAVAILABLE";
        render();
      }
      print("SECOND CHANCE AI speech failed: " + error);
    }
  }
  function askAi(question) {
    if (!accepted()) {
      print("SECOND CHANCE AI command debounced");
      return;
    }
    if (global.secondChanceClearEquipment) global.secondChanceClearEquipment();
    visionFound = false;
    var requestId = ++aiRequestId;
    var prompt = String(question || "")
      .trim()
      .slice(0, 240);
    awaitingAiQuestion = !prompt;
    stopAiAudio();
    aiTopic = null;
    callPanel = null;
    callTarget = false;
    overlay = "ai";
    transitionAt = getTime();
    beatDown = false;
    print("SECOND CHANCE AI request started");
    var localTopic = topicFor(prompt);
    var localAnswer = localTopic && answers[localTopic];
    aiView = localAnswer
      ? aiCard(
          localAnswer[0],
          localAnswer[1],
          localAnswer[2],
          "CONNECTING SPOKEN ANSWER",
        )
      : aiCard(
          "ANSWER / LOADING",
          "check",
          [
            "Checking your question.",
            "A short training answer",
            "will appear here.",
          ],
          "CONNECTING TO SERVER",
        );
    render();
    // Approved short clips are imported into the Lens, so a common training
    // answer can be heard immediately while the model gateway classifies it.
    if (localTopic) speakAi(localTopic, requestId);
    if (!prompt) {
      aiView = aiCard(
        "AI / ASK A QUESTION",
        "check",
        [
          "Say ASK AI, followed by",
          "a CPR or AED question.",
          "Example: ASK AI HOW FAST?",
        ],
        "SAY BACK TO RETURN",
      );
      render();
      return;
    }
    if (!internetModule || !script.aiBaseUrl) {
      aiView = aiCard(
        "AI / OFFLINE",
        "check",
        [
          "Server not connected.",
          "The guided drill still",
          "works without internet.",
        ],
        "SAY BACK TO RETURN",
      );
      render();
      return;
    }
    var url = String(script.aiBaseUrl).replace(/\/$/, "") + "/api/lens/ask";
    internetModule
      .fetch(
        new Request(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: prompt, stage: current }),
        }),
      )
      .then(function (response) {
        if (response.status !== 200) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        if (requestId !== aiRequestId || overlay !== "ai") return;
        if (!data || !data.lines || data.lines.length !== 3)
          throw new Error("Invalid answer");
        aiView = aiCard(
          data.title,
          data.art,
          data.lines,
          aiSpokenTopic === data.topic
            ? "SPOKEN TRAINING ANSWER"
            : "LOADING VOICE...",
        );
        aiTopic = data.topic;
        transitionAt = getTime();
        render();
        if (aiSpokenTopic !== aiTopic) speakAi(aiTopic, requestId);
        print("SECOND CHANCE AI topic " + data.topic + " mode " + data.mode);
      })
      .catch(function (error) {
        if (requestId !== aiRequestId || overlay !== "ai") return;
        aiView = localAnswer
          ? aiCard(
              localAnswer[0],
              localAnswer[1],
              localAnswer[2],
              "VOICE CONNECTION LOST",
            )
          : aiCard(
              "ANSWER / OFFLINE",
              "check",
              [
                "Server not connected.",
                "The training drill",
                "still works offline.",
              ],
              "VOICE CONNECTION LOST",
            );
        transitionAt = getTime();
        render();
        print("SECOND CHANCE AI request failed: " + error);
      });
  }
  function visionStatus(message) {
    if (overlay !== "vision") return;
    visionFound = /^(Possible |SIMULATED marker)/.test(message);
    if (visionFound) {
      visionView = aiCard(
        "FIND / POSSIBLE MATCH",
        "check",
        [
          "Look for the cyan marker.",
          "Verify the item yourself.",
          "Say BACK to return.",
        ],
        "VISUAL MATCH / NOT PROOF",
      );
    } else if (/^Searching/.test(message)) {
      visionView = aiCard(
        "FIND / SEARCHING",
        "check",
        [
          "Capturing this view.",
          "Looking for " + visionItem + ".",
          "Hold your head still.",
        ],
        "TRAINING / ONE IMAGE",
      );
    } else if (/^Item not located/.test(message)) {
      visionView = aiCard(
        "FIND / NOT LOCATED",
        "check",
        [
          "Not found in this view.",
          "Ask another person or",
          "follow the dispatcher.",
        ],
        "SAY BACK TO RETURN",
      );
    } else if (/^Object depth uncertain/.test(message)) {
      visionView = aiCard(
        "FIND / DEPTH UNCERTAIN",
        "check",
        [
          "Possible image match,",
          "but depth is uncertain.",
          "Try another view.",
        ],
        "NO MARKER PLACED",
      );
    } else {
      visionView = aiCard(
        "FIND / UNAVAILABLE",
        "check",
        [
          "Camera, depth or server",
          "is not ready right now.",
          "Try again later.",
        ],
        "SAY BACK TO RETURN",
      );
    }
    transitionAt = getTime();
    render();
  }
  global.secondChanceVisionStatus = visionStatus;
  function findEquipment(item) {
    if (!accepted()) {
      print("SECOND CHANCE find command debounced");
      return;
    }
    if (practicing()) practice = newPractice();
    stopAiAudio();
    aiRequestId++;
    callPanel = null;
    callTarget = false;
    visionItem = item;
    visionFound = false;
    overlay = "vision";
    visionView = aiCard(
      "FIND / CAPTURING",
      "check",
      [
        "Capturing one view.",
        "Looking for " + item + ".",
        "Verify any result.",
      ],
      "TRAINING / NOT DIAGNOSIS",
    );
    transitionAt = getTime();
    render();
    print("SECOND CHANCE find requested: " + item);
    if (typeof global.secondChanceFindEquipment === "function")
      global.secondChanceFindEquipment(item);
    else visionStatus("Camera controller unavailable");
  }
  function update() {
    var now = getTime();
    updateVoiceWatchdog(now);
    // Some device audio paths omit the completion callback. Never let a stale
    // playback flag permanently silence subsequent voice commands.
    if (speechActive && speechStartedAt >= 0 && now - speechStartedAt > 15) {
      speechActive = false;
      speechStartedAt = -1;
      lastSpeechAt = now - 1;
      print("SECOND CHANCE voice playback gate recovered after timeout");
    }
    if (aiAudioProbeAt > 0 && now >= aiAudioProbeAt) {
      aiAudioProbeAt = -1;
      print(
        "SECOND CHANCE audio after 0.5s: playing=" +
          aiAudio.isPlaying() +
          " position=" +
          aiAudio.position +
          " duration=" +
          aiAudio.duration +
          " volume=" +
          aiAudio.volume,
      );
    }
    if (callTarget && now - lastCallTargetAt > 0.25) {
      callTarget = false;
      render();
    }
    if (mapTarget && now - lastMapTargetAt > 0.25) {
      mapTarget = false;
      render();
    }
    if (
      callPanel &&
      callPanel.stage === "ringing" &&
      now >= callPanel.connectAt
    ) {
      callPanel.stage = "connected";
      callPanel.connectAt = -1;
      callPanel.ack = "Training dispatcher only.";
      transitionAt = now;
      render();
    }
    var fade = Math.min(1, Math.max(0.3, (now - transitionAt) / 0.18));
    var highlight = practicing() && now < practice.highlightUntil;
    // Restyle only while fading or when the highlight changes, not every frame.
    var styleKey =
      (overlay === "ai" ? "ai" : "plain") +
      (highlight ? "+" : "") +
      fade.toFixed(2);
    if (styleKey !== lastStyleKey) {
      lastStyleKey = styleKey;
      card.textFill.color =
        overlay === "ai"
          ? new vec4(0.78, 1, 0.97, fade)
          : new vec4(1, 1, 1, fade);
      bg.fill.color =
        overlay === "ai"
          ? new vec4(0.015, 0.13, 0.16, 0.94 * fade)
          : highlight
            ? new vec4(0.03, 0.14, 0.15, 0.9 * fade)
            : new vec4(0.02, 0.07, 0.1, 0.9 * fade);
      art.backgroundSettings.fill.colorTint =
        overlay === "ai"
          ? new vec4(0.45, 1, 0.9, fade)
          : new vec4(1, 1, 1, fade);
    }
    updatePinchHold(now);
    if (callPanel) {
      var pulse =
        callPanel.stage === "ringing" && Math.floor(now * 3) % 2 === 0
          ? 1.22
          : 1.15;
      artObject.getTransform().setLocalScale(new vec3(pulse, pulse, 1));
      return;
    }
    if (placementActive()) {
      // Ghost layers size themselves once text layout is available.
      guideImages.forEach(fitGuideImage);
      var samples = editorMode
        ? editorPlacement
        : { left: placementPoint(leftHand), right: placementPoint(rightHand) };
      placementSample(samples, now);
    }
    if (padsActive()) {
      var padSamples = editorMode
        ? editorPlacement
        : { left: placementPoint(leftHand), right: placementPoint(rightHand) };
      padSample(padSamples, now);
    }
    if (practicing()) practiceSample(handSample(), now);
    var view = currentView();
    if (!view || view[1] !== "compress") return;
    var down = now % (60 / 110) < 0.16;
    // The beat only swaps the illustration; rewriting the whole card here
    // made the text re-layout on every beat.
    if (down !== beatDown) {
      beatDown = down;
      art.backgroundSettings.fill.texture = textureFor(view[1], beatDown);
    }
  }
  function setPinchNotice(text) {
    pinchNotice = {
      text: text,
      until: getTime() + handScreenTuning.noticeSeconds,
    };
    render();
  }
  function updatePinchHold(now) {
    if (!pinchHold) {
      if (pinchNotice && now >= pinchNotice.until) {
        pinchNotice = null;
        render();
      }
      return;
    }
    if (!holdScreen() || pinchHold.screen !== current) {
      pinchHold = null;
      render();
      return;
    }
    if (handsTogether()) {
      print(
        "SECOND CHANCE pinch " +
          pinchHold.hand +
          " hold cancelled on " +
          current +
          ": hands together",
      );
      pinchHold = null;
      setPinchNotice("SEPARATE HANDS, THEN PINCH");
      return;
    }
    if (handsReady && !leftHand.isTracked() && !rightHand.isTracked()) {
      // Without a tracked hand the release event may never arrive.
      print(
        "SECOND CHANCE pinch " +
          pinchHold.hand +
          " hold cancelled on " +
          current +
          ": hands lost",
      );
      pinchHold = null;
      render();
      return;
    }
    var held = now - pinchHold.startedAt;
    if (held >= handScreenTuning.holdSeconds) {
      print(
        "SECOND CHANCE pinch " +
          pinchHold.hand +
          " held " +
          held.toFixed(2) +
          "s on " +
          current +
          ": next",
      );
      pinchHold = null;
      next();
      return;
    }
    var step = Math.min(
      3,
      Math.floor((held / handScreenTuning.holdSeconds) * 4),
    );
    if (step !== pinchHold.step) {
      pinchHold.step = step;
      render();
    }
  }
  // GestureModule pinches. On hand-practice screens a pinch must be held for
  // handScreenTuning.holdSeconds; elsewhere it acts immediately as before.
  function onPinchDown(hand) {
    if (handPracticeScreen() && handsTogether()) {
      print(
        "SECOND CHANCE pinch " +
          hand +
          " ignored on " +
          current +
          ": hands together",
      );
      setPinchNotice("SEPARATE HANDS, THEN PINCH");
      return;
    }
    if (!holdScreen()) {
      print("SECOND CHANCE pinch " + hand + " on " + (overlay || current));
      pinch();
      return;
    }
    if (pinchHold) return;
    pinchHold = { hand: hand, startedAt: getTime(), screen: current, step: 0 };
    pinchNotice = null;
    print("SECOND CHANCE pinch " + hand + " hold started on " + current);
    render();
  }
  function onPinchUp(hand) {
    if (!pinchHold || pinchHold.hand !== hand) return;
    var held = getTime() - pinchHold.startedAt;
    pinchHold = null;
    print(
      "SECOND CHANCE pinch " +
        hand +
        " released after " +
        held.toFixed(2) +
        "s on " +
        current +
        ": not advanced",
    );
    setPinchNotice("HOLD LONGER TO CONTINUE");
  }
  function onTriggerPrimary() {
    // This event has no release signal, so on the headset the gesture events
    // above own pinches on hand-practice screens.
    if (holdScreen()) return;
    pinch();
  }
  function pinch() {
    if (callPanel) {
      selectCallPanel();
      return;
    }
    if (current === "home" && mapTarget) {
      openResponderMap();
      return;
    }
    if (callTarget && (current === "safety" || current === "call")) {
      openCallPanel();
      return;
    }
    if (current === "safety" && !overlay) {
      assess(true);
      return;
    }
    if ((current === "response" || current === "breathing") && !overlay) {
      assess(false);
      return;
    }
    next();
  }
  function assessmentValue(spoken, command) {
    if (/^(yes|yeah|yep|是)$/.test(command)) return true;
    if (/^(no|nope|否)$/.test(command)) return false;
    if (current === "safety") {
      if (/(unsafe|not safe|isn't safe|danger|不安全|有危险)/.test(spoken))
        return false;
      if (
        /(scene is safe|it's safe|it is safe|safe here|^safe$|安全)/.test(
          spoken,
        )
      )
        return true;
    }
    if (current === "response") {
      if (
        /(unresponsive|no response|not responding|doesn't respond|无反应|没有反应)/.test(
          spoken,
        )
      )
        return false;
      if (
        /(responsive|is responding|responds|is awake|有反应|醒着)/.test(spoken)
      )
        return true;
    }
    if (current === "breathing") {
      if (
        /(not breathing|no breathing|only gasping|gasping|isn't breathing|没有呼吸|喘气)/.test(
          spoken,
        )
      )
        return false;
      if (
        /(breathing normally|normal breathing|^normalbreathing$|呼吸正常|正常呼吸)/.test(
          spoken,
        )
      )
        return true;
    }
    return null;
  }
  function requestPhoneCall() {
    if (!accepted()) return;
    if (global.secondChanceClearEquipment) global.secondChanceClearEquipment();
    callPanel = null;
    overlay = "phone";
    phoneView = [
      "IPHONE / CALL REQUEST",
      "call",
      [
        "Calling requires the",
        "companion iPhone app",
        "and phone confirmation.",
      ],
      "NO CALL HAS BEEN PLACED",
    ];
    render();
    if (!internetModule || !script.aiBaseUrl) {
      phoneView[2] = [
        "Open Second Chance Phone",
        "on your iPhone and start",
        "its local bridge.",
      ];
      phoneView[3] = "LOCAL BRIDGE UNAVAILABLE";
      render();
      print("SECOND CHANCE iPhone call request blocked: no network bridge");
      return;
    }
    phoneView[3] = "SENDING REQUEST TO MAC";
    render();
    var localUrl =
      String(script.aiBaseUrl).replace(/\/$/, "") + "/api/phone/request";
    try {
      internetModule
        .fetch(new Request(localUrl, { method: "POST" }))
        .then(function (response) {
          if (response.status !== 200)
            throw new Error("Bridge HTTP " + response.status);
          if (overlay !== "phone") return;
          phoneView[2] = [
            "Request reached your Mac.",
            "Open Second Chance Phone",
            "and confirm on iPhone.",
          ];
          phoneView[3] = "CHECK IPHONE / NO CALL YET";
          render();
          print("SECOND CHANCE local phone request delivered to Mac");
        })
        .catch(function (error) {
          if (overlay !== "phone") return;
          phoneView[3] = "MAC BRIDGE UNAVAILABLE";
          render();
          print("SECOND CHANCE local phone request failed: " + error);
        });
    } catch (error) {
      phoneView[3] = "MAC BRIDGE UNAVAILABLE";
      render();
      print("SECOND CHANCE local phone request failed: " + error);
    }
  }
  function startVoiceSession(reason) {
    asrModule.startTranscribing(asrOptions);
    asrStartedAt = getTime();
    print(
      "SECOND CHANCE voice session started" + (reason ? " (" + reason + ")" : ""),
    );
  }
  // Stop first, then start: starting over a live session returned
  // InternalError on device, so the old session is always closed before.
  function restartVoice(reason) {
    if (!asrModule || !asrOptions || asrRestarting) return;
    asrRestarting = true;
    asrRetryAt = -1;
    print("SECOND CHANCE voice restarting: " + reason);
    var resume = function () {
      asrRestarting = false;
      try {
        startVoiceSession("restart");
      } catch (startError) {
        print("SECOND CHANCE voice restart failed: " + startError);
        scheduleVoiceRetry();
      }
    };
    try {
      var stopped = asrModule.stopTranscribing
        ? asrModule.stopTranscribing()
        : null;
      if (stopped && stopped.then) stopped.then(resume, resume);
      else resume();
    } catch (stopError) {
      resume();
    }
  }
  function scheduleVoiceRetry() {
    voiceErrorCount++;
    var wait = Math.min(
      voiceTuning.maxRetrySeconds,
      voiceTuning.errorRetrySeconds * Math.pow(2, voiceErrorCount - 1),
    );
    asrRetryAt = getTime() + wait;
    print("SECOND CHANCE voice retry in " + wait + "s");
  }
  function updateVoiceWatchdog(now) {
    if (editorMode || !asrModule || asrRestarting || asrStartedAt < 0) return;
    if (asrRetryAt >= 0) {
      if (now >= asrRetryAt) restartVoice("retry after " + voiceFailure);
      return;
    }
    // The Lens's own spoken answers can pause recognition; do not count that.
    if (speechActive) return;
    var quietFor = now - Math.max(asrStartedAt, lastAsrUpdateAt);
    if (quietFor >= voiceQuietLimit) {
      restartVoice("no speech events for " + quietFor.toFixed(0) + "s");
      voiceQuietLimit = Math.min(
        voiceTuning.maxRetrySeconds,
        voiceQuietLimit * 2,
      );
    }
  }
  function onVoiceText(eventArgs) {
    if (!eventArgs.text) return;
    lastAsrUpdateAt = getTime();
    // Recognition is working again: reset the recovery waits.
    voiceQuietLimit = voiceTuning.silentRestartSeconds;
    voiceErrorCount = 0;
    asrRetryAt = -1;
    if (voiceFailure) {
      voiceFailure = null;
      render();
    }
    if (!eventArgs.isFinal) {
      if (lastAsrUpdateAt - lastAsrPartialLogAt > 2) {
        lastAsrPartialLogAt = lastAsrUpdateAt;
        print(
          "SECOND CHANCE ASR partial: " + String(eventArgs.text).slice(0, 80),
        );
      }
      return;
    }
    var spoken = eventArgs.text
      .toLowerCase()
      .replace(/[.,!?，。！？]/g, " ")
      .trim();
    var command = spoken.replace(/\s/g, "");
    print("SECOND CHANCE ASR heard: " + spoken.slice(0, 100));
    if (speechActive || getTime() - lastSpeechAt < 0.75) {
      print("SECOND CHANCE ASR ignored during voice playback cooldown");
      return;
    }
    if (
      /\b(find|locate|where|show)\b.*\b(cpr responders?|trained responders?|first aid responders?|volunteers?)\b/.test(
        spoken,
      )
    ) {
      openResponderMap();
      return;
    }
    if (
      /^(call my contact|call test number|call the test number|dial my contact|phone my contact)$/.test(
        spoken,
      )
    ) {
      requestPhoneCall();
      return;
    }
    // Spectacles ASR has transcribed "gauze" as "goat" and "goats" on device.
    // Also accept a short item-only reply when ASR drops the word "find".
    var equipmentNames =
      "tourniquet|gauze dressing|gauzes?|gause|gauz|goats?|gods|gauge|dressing|bandage|epinephrine(?: auto[ -]?injector)?|aed trainer";
    var findMatch =
      new RegExp(
        "\\b(?:find|locate|look for)\\b(?:\\s+\\w+){0,4}\\s+(" +
          equipmentNames +
          ")\\b",
      ).exec(spoken) ||
      new RegExp("^(?:the\\s+)?(" + equipmentNames + ")$").exec(spoken);
    if (findMatch) {
      var foundName = findMatch[1];
      findEquipment(
        /^(?:gauze|gauzes|gause|gauz|goats?|gods|gauge|gauze dressing|dressing|bandage)$/.test(
          foundName,
        )
          ? "gauze"
          : foundName,
      );
      return;
    }
    if (
      /\b(?:find|locate|look for)\b/.test(spoken) &&
      !/\baed\b/.test(spoken)
    ) {
      if (accepted()) {
        overlay = "vision";
        visionFound = false;
        visionView = aiCard(
          "FIND / SAY ITEM AGAIN",
          "check",
          [
            "I heard: " + spoken.slice(0, 18),
            "Say FIND THE DRESSING",
            "or FIND THE GAUZE.",
          ],
          "NO IMAGE CAPTURED",
        );
        transitionAt = getTime();
        render();
      }
      return;
    }
    var aiQuestion =
      /^(?:(?:ask|hey)\s+(?:the\s+)?(?:a\s*i|a\s*eye|artificial intelligence)|ai question|问ai|问一下ai|问人工智能)\s*(.*)$/.exec(
        spoken,
      );
    if (aiQuestion) {
      askAi(aiQuestion[1]);
      return;
    }
    if (
      awaitingAiQuestion &&
      !/^(back|return|cancel|stop|返回|取消)$/.test(command)
    ) {
      print("SECOND CHANCE follow-up AI question received");
      askAi(spoken);
      return;
    }
    if (/^(restart|startover|reset|重来|重新开始)$/.test(command)) {
      if (accepted()) reset();
      return;
    }
    if (callPanel) {
      if (/^(back|return|cancel|stop|返回|取消)$/.test(command)) {
        if (accepted()) closeCallPanel();
        return;
      }
      if (/^(end|end simulation|hang up|结束)$/.test(spoken)) {
        if (accepted()) {
          callPanel.stage = "ended";
          callPanel.connectAt = -1;
          callPanel.ack = "";
          render();
        }
        return;
      }
      if (
        /^(select|next|continue|start simulated call|begin call|下一步|继续)$/.test(
          spoken,
        )
      ) {
        selectCallPanel();
        return;
      }
      return;
    }
    if (/^(back|return|返回|回去)$/.test(command)) {
      if (!accepted()) return;
      if (overlay) show(current);
      else if (
        current === "navStart" ||
        current === "navHall" ||
        current === "navCabinet" ||
        current === "responderMap" ||
        current === "help"
      )
        show(returnScreen);
      return;
    }
    if (
      /(start emergency|emergency mode|begin training|start cpr|启动急救|开始急救)/.test(
        spoken,
      ) ||
      (current === "home" && /^(start|begin|开始)$/.test(command))
    ) {
      if (accepted()) show("safety");
      return;
    }
    if (
      /(find|locate|navigate|where).*\baed\b|找.*除颤|导航.*aed/.test(spoken)
    ) {
      openNav();
      return;
    }
    if (
      /(aed is here|aed arrived|got the aed|have the aed|use aed|拿到除颤器|aed到了)/.test(
        spoken,
      )
    ) {
      aedHere();
      return;
    }
    if (
      /(someone|person|bystander).*(call 911|call emergency)|assign caller|caller assigned|让.*报警/.test(
        spoken,
      )
    ) {
      assign("caller");
      return;
    }
    if (
      /(someone|person|bystander).*(get|fetch|bring).*aed|assign aed runner|aed runner|让.*拿.*除颤/.test(
        spoken,
      )
    ) {
      assign("runner");
      return;
    }
    if (
      /(i called 911|911 called|called 911|call completed|已经报警|打过911)/.test(
        spoken,
      )
    ) {
      reportCall();
      return;
    }
    if (
      /(call 911|dial 911|call emergency|emergency services|拨打911|报警)/.test(
        spoken,
      )
    ) {
      openCallPanel();
      return;
    }
    if (
      current === "hands" &&
      /^(set target here|set target|align target|设置目标|校准目标)$/.test(
        spoken,
      )
    ) {
      setTargetHere();
      return;
    }
    if (
      current === "safety" ||
      current === "response" ||
      current === "breathing"
    ) {
      var value = assessmentValue(spoken, command);
      if (value !== null) {
        assess(value);
        return;
      }
    }
    if (/^(next|continue|下一步|继续)$/.test(command)) {
      pinch();
      return;
    }
    if (
      /(breathing normally now|started breathing normally|恢复正常呼吸)/.test(
        spoken,
      ) &&
      current === "compress"
    ) {
      if (accepted()) show("breathingYes");
      return;
    }
    var topic = topicFor(spoken);
    if (topic) {
      // ASR may omit or rephrase the start of a question. Any recognized CPR
      // topic can use the bounded model gateway; offline mode keeps local cards.
      if (internetModule && script.aiBaseUrl) {
        print("SECOND CHANCE AI topic request " + topic);
        askAi(spoken);
      } else showAnswer(topic);
    }
  }
  reset();
  script.createEvent("UpdateEvent").bind(update);
  script.createEvent("TriggerPrimaryEvent").bind(onTriggerPrimary);
  if (editorMode) {
    // Preview placement keys drive the same frame-by-frame logic as SIK palms.
    script.api.practiceSample = function (sample, at) {
      practiceSample(sample, at);
    };
    script.api.placementSample = function (samples, at) {
      placementSample(samples, at);
    };
    script.api.padSample = function (samples, at) {
      padSample(samples, at);
    };
    script.api.openResponderMap = openResponderMap;
    try {
      script.createEvent("KeyPressEvent").bind(function (event) {
        if (event.key === Keys.N) pinch();
        else if (event.key === Keys.C) openCallPanel();
        else if (event.key === Keys.F && callPanel) {
          callPanel.focus =
            callPanel.focus === "primary" ? "secondary" : "primary";
          render();
        } else if (event.key === Keys.X && callPanel) {
          if (accepted()) closeCallPanel();
        } else if (practicing() && event.key === Keys.B)
          editorHand.tracked = true;
        else if (practicing() && event.key === Keys.D)
          editorHand.position.y = -8;
        else if (practicing() && event.key === Keys.U)
          editorHand.position.y = 0;
        else if (practicing() && event.key === Keys.L)
          editorHand.tracked = false;
        else if (placementActive() && event.key === Keys.J)
          editorPlacement.left = addScaled3(
            placement.target,
            placement.frame.right,
            -20,
          );
        else if (placementActive() && event.key === Keys.K)
          editorPlacement.left = point(placement.target);
        else if (placementActive() && event.key === Keys.O)
          editorPlacement.left = addScaled3(
            placement.target,
            placement.frame.normal,
            -18,
          );
        else if (placementActive() && event.key === Keys.R)
          editorPlacement.right = point(placement.target);
        else if (placementActive() && event.key === Keys.V) {
          editorPlacement.left = point(placement.target);
          editorPlacement.right = addScaled3(
            placement.target,
            placement.frame.right,
            2,
          );
        } else if (placementActive() && event.key === Keys.L) {
          editorPlacement.left = null;
          editorPlacement.right = null;
        } else if (placementActive() && event.key === Keys.T) setTargetHere();
        else if (padsActive() && event.key === Keys.J)
          editorPlacement.left = addScaled3(
            padPractice.target[0],
            padPractice.frame.right,
            -20,
          );
        else if (padsActive() && event.key === Keys.K)
          editorPlacement.left = point(padPractice.target[0]);
        else if (padsActive() && event.key === Keys.R)
          editorPlacement.right = point(padPractice.target[1]);
        else if (padsActive() && event.key === Keys.O)
          editorPlacement.right = addScaled3(
            padPractice.target[1],
            padPractice.frame.normal,
            -18,
          );
        else if (padsActive() && event.key === Keys.L) {
          editorPlacement.left = null;
          editorPlacement.right = null;
        }
      });
    } catch (previewKeyError) {
      print("SECOND CHANCE Preview keyboard unavailable: " + previewKeyError);
    }
    print(
      "SECOND CHANCE Preview placement SIM: J far, K target, O wrong depth, R right, V both, L lost, T set target; N next",
    );
  } else {
    try {
      try {
        require("SpectaclesInteractionKit.lspkg/Providers/InteractionConfigurationProvider/SIKLogLevelProvider").default.getInstance().logLevel = 3;
      } catch (logLevelError) {
        /* Keep tracking if this package omits the setting. */
      }
      // Import only the hand provider. The SIK umbrella also imports
      // Interactable, which uses BaseScriptComponent on unsupported firmware.
      var handInput =
        require("SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData").HandInputData.getInstance();
      leftHand = handInput.getHand("left");
      rightHand = handInput.getHand("right");
      handsReady = true;
      print("SECOND CHANCE world-space palm and wrist tracking ready");
    } catch (handError) {
      print("SECOND CHANCE hand tracking unavailable: " + handError);
    }
    print("SECOND CHANCE local iPhone bridge selected; no pairing session");
  }
  try {
    var gestures = require("LensStudio:GestureModule");
    gestures.getPinchDownEvent(0).add(function () {
      onPinchDown(0);
    });
    gestures.getPinchDownEvent(1).add(function () {
      onPinchDown(1);
    });
    gestures.getTargetingDataEvent(0).add(targetCall);
    gestures.getTargetingDataEvent(1).add(targetCall);
    print("SECOND CHANCE pinch controls ready");
    try {
      gestures.getPinchUpEvent(0).add(function () {
        onPinchUp(0);
      });
      gestures.getPinchUpEvent(1).add(function () {
        onPinchUp(1);
      });
      pinchUpReady = true;
      print("SECOND CHANCE pinch hold ready on hand-practice screens");
    } catch (pinchUpError) {
      print(
        "SECOND CHANCE pinch release unavailable; hand screens use a single pinch: " +
          pinchUpError,
      );
    }
  } catch (gestureError) {
    print("SECOND CHANCE pinch controls unavailable: " + gestureError);
  }
  try {
    if (!editorMode && global.deviceInfoSystem.isInternetAvailable) {
      voiceInternetAvailable = global.deviceInfoSystem.isInternetAvailable();
      print("SECOND CHANCE internet available: " + voiceInternetAvailable);
      global.deviceInfoSystem.onInternetStatusChanged.add(function (status) {
        voiceInternetAvailable = !!status.isInternetAvailable;
        print("SECOND CHANCE internet changed: " + voiceInternetAvailable);
        render();
      });
      render();
    }
    asrModule = require("LensStudio:AsrModule");
    asrOptions = AsrModule.AsrTranscriptionOptions.create();
    asrOptions.silenceUntilTerminationMs = 1000;
    asrOptions.mode = AsrModule.AsrMode.HighAccuracy;
    asrOptions.onTranscriptionUpdateEvent.add(onVoiceText);
    asrOptions.onTranscriptionErrorEvent.add(function (code) {
      voiceFailure =
        code === AsrModule.AsrStatusCode.Unauthenticated
          ? "Unauthenticated"
          : code === AsrModule.AsrStatusCode.NoInternet
            ? "NoInternet"
            : "InternalError";
      if (voiceFailure === "NoInternet") voiceInternetAvailable = false;
      print(
        "SECOND CHANCE voice unavailable: " + voiceFailure + " (" + code + ")",
      );
      // Errors used to stop voice for the rest of the run; retry instead.
      scheduleVoiceRetry();
      render();
    });
    startVoiceSession();
  } catch (voiceError) {
    print("SECOND CHANCE voice unavailable: " + voiceError);
  }
} catch (error) {
  print("SECOND CHANCE setup failed: " + error);
}
