// @input Asset.Texture checkTexture
// @input Asset.Texture callTexture
// @input Asset.Texture callAedTexture
// @input Asset.Texture handsTexture
// @input Asset.Texture compressUpTexture
// @input Asset.Texture compressDownTexture
// @input Asset.Texture aedTexture
// SECOND CHANCE — adult Hands-Only CPR practice for Spectacles.
// One card holds the copy; a bounded single-line texture holds the illustration.
// The Lens does not measure CPR or place an emergency call.

var steps = ["check", "call", "hands", "compress", "aed"];
var titles = [
    "01 / CHECK RESPONSE", "02 / CALL 911 + AED", "03 / PLACE HANDS",
    "04 / PUSH HARD + FAST", "05 / USE AED"
];
var instructions = [
    ["Scene safe. Tap shoulders.", "Shout; check breathing.", "Gasping is not normal."],
    ["Call 911. Send someone", "for an AED. Follow", "dispatcher instructions."],
    ["Heel on chest center.", "Other hand on top.", "Shoulders over hands."],
    ["100-120 compressions/min.", "Let the chest rise fully.", "110 BPM practice beat."],
    ["Turn on AED. Follow", "its prompts. Resume CPR", "when prompted."]
];
var cues = [
    "Unresponsive + gasping?", "No call is placed here.",
    "Keep both arms straight.", "2 in / 5 cm; avoid over\n2.4 in / 6 cm.",
    "AED prompts guide you."
];

function drawingTexture(kind, phase) {
    if (kind === "check") { return script.checkTexture; }
    if (kind === "call") { return phase ? script.callAedTexture : script.callTexture; }
    if (kind === "hands") { return script.handsTexture; }
    if (kind === "compress") { return phase ? script.compressDownTexture : script.compressUpTexture; }
    return script.aedTexture;
}

try {
    var obj = global.scene.createSceneObject("SC Illustrated Practice Card");
    obj.getTransform().setWorldPosition(new vec3(0, 0, 0));
    var card = obj.createComponent("Component.Text");
    card.size = 68;
    card.depthTest = false;
    card.textFill.color = new vec4(1, 1, 1, 1);
    var bg = card.backgroundSettings;
    bg.enabled = true;
    bg.fill.color = new vec4(0.02, 0.07, 0.10, 0.9);
    bg.margins.left = 0.5; bg.margins.right = 0.5;
    bg.margins.top = 0.5; bg.margins.bottom = 0.5;

    // The image has its own bounded layer inside the card's reserved blank band.
    var artObject = global.scene.createSceneObject("SC Action Illustration");
    artObject.getTransform().setWorldPosition(new vec3(0, 2.0, 0));
    artObject.getTransform().setLocalScale(new vec3(1.55, 1.55, 1));
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

    var stepIndex = 0, transitionAt = -1, lastPinch = -1;
    var revealAt = -1, phase = false;

    function progress() {
        var result = "";
        for (var i = 0; i < steps.length; i++) { result += i <= stepIndex ? "=" : "-"; }
        return "[" + result + "]";
    }
    function render() {
        var kind = steps[stepIndex];
        var lines = ["ADULT CPR SIMULATION", "WITNESSED SUDDEN COLLAPSE", titles[stepIndex]];
        // Reserve the illustration band in the same card; no world-space overlap.
        lines.push("", "", "", "", "", "");
        lines = lines.concat(instructions[stepIndex]);
        lines.push(cues[stepIndex]);
        lines.push(progress() + "  " + (stepIndex === 4 ? "PINCH RESTART" : "PINCH NEXT"));
        card.text = lines.join("\n");
        art.backgroundSettings.fill.texture = drawingTexture(kind, phase);
    }
    function showStep() {
        phase = false;
        revealAt = steps[stepIndex] === "call" ? getTime() + 0.7 : -1;
        transitionAt = getTime();
        render();
        print("SECOND CHANCE practice step " + (stepIndex + 1) + "/5 " + steps[stepIndex]);
    }
    function update() {
        var now = getTime();
        var fade = Math.min(1, Math.max(0.3, (now - transitionAt) / 0.18));
        card.textFill.color = new vec4(1, 1, 1, fade);
        bg.fill.color = new vec4(0.02, 0.07, 0.10, 0.9 * fade);
        art.backgroundSettings.fill.colorTint = new vec4(1, 1, 1, fade);
        if (steps[stepIndex] === "call" && !phase && now >= revealAt) {
            phase = true; render();
        }
        if (steps[stepIndex] !== "compress") { return; }
        var beat = (now % (60 / 110)) < 0.16;
        if (beat !== phase) { phase = beat; render(); }
    }
    function advanceStep() {
        var now = getTime();
        if (now - lastPinch < 0.45) { return; }
        lastPinch = now;
        stepIndex = (stepIndex + 1) % steps.length;
        showStep();
    }
    function restartLesson() {
        var now = getTime();
        if (now - lastPinch < 0.45) { return; }
        lastPinch = now; stepIndex = 0; showStep();
    }
    function onVoiceText(eventArgs) {
        if (!eventArgs.isFinal) { return; }
        var command = eventArgs.text.toLowerCase().replace(/[\s.,!?，。！？]/g, "");
        if (/^(next|continue|下一步|继续)$/.test(command)) { advanceStep(); }
        else if (/^(restart|startover|重来|重新开始)$/.test(command)) { restartLesson(); }
    }

    showStep();
    script.createEvent("UpdateEvent").bind(update);
    script.createEvent("TriggerPrimaryEvent").bind(advanceStep);
    try {
        var gestures = require("LensStudio:GestureModule");
        gestures.getPinchDownEvent(0).add(advanceStep);
        gestures.getPinchDownEvent(1).add(advanceStep);
        print("SECOND CHANCE pinch controls ready");
    } catch (gestureError) {
        print("SECOND CHANCE pinch controls unavailable: " + gestureError);
    }
    try {
        var asr = require("LensStudio:AsrModule");
        var options = AsrModule.AsrTranscriptionOptions.create();
        options.silenceUntilTerminationMs = 650;
        options.mode = AsrModule.AsrMode.Balanced;
        options.onTranscriptionUpdateEvent.add(onVoiceText);
        options.onTranscriptionErrorEvent.add(function (errorCode) {
            print("SECOND CHANCE voice unavailable, code " + errorCode);
        });
        asr.startTranscribing(options);
        print("SECOND CHANCE voice session started");
    } catch (voiceError) {
        print("SECOND CHANCE voice unavailable: " + voiceError);
    }
} catch (error) {
    print("SECOND CHANCE setup failed: " + error);
}
