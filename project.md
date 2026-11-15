# SECOND CHANCE — project status

Updated: 2026-11-14

## Goal

Adult Hands-Only CPR training simulation for Snap Spectacles, using a witnessed sudden adult collapse scenario. The Lens demonstrates actions, a 110 BPM practice rhythm, and estimated wrist-motion pacing when tracking is available. It does not call 911, operate an AED, locate a live AED, or measure actual chest compression depth, placement, or clinical quality.

## Current project

- Lens Studio project: `spectacles/SecondChance/SecondChance.esproj`
- Active script: `spectacles/SecondChance/Assets/SecondChanceDisplay.js`, attached to `Lighting`
- Seven imported 512 px transparent diagrams: `spectacles/SecondChance/Assets/Diagrams/`
- Diagram generator: `spectacles/make_diagrams.py`
- State check: `spectacles/test-display.cjs`
- `spectacles/build/SecondChance.zip` is the current illustrated export. Its script matches the source file and it contains all seven diagram textures.

The first graphic version placed multiple world-space labels together, and the wearer reported overlap. The current version has one central text card and a separate, bounded one-line texture layer inside a reserved illustration band. After the wearer reported clipped text, the ordinary card was reduced to 11 fixed lines at text size 60. The compression-practice card uses 13 lines at text size 49, so its total line height remains comparable. Its illustration scale is 1.08 instead of 1.25. The compression illustration keeps its independent 110 BPM texture swap.

The current native Lens has a home screen and a 12-screen training flow covering scene safety, response, breathing, calling for help, role assignment, hand position, compressions, and AED use, with additional answer and simulated AED-route screens. Thumb/index pinch and `TriggerPrimaryEvent` still advance or select the appropriate scenario answer; voice commands also navigate. The wearer previously confirmed English “Next” on Spectacles. This expanded flow has not yet been checked on the device. Desktop simulation does not provide wearable pinch or ASR APIs.

The native Lens now also has an offline emergency-call **training panel**. From scene safety (Step 1) or the call lesson, aim at `CALL EMERGENCY` and pinch, or say “Call emergency services.” The panel preserves the originating lesson step and has focused actions for start, cancel, end, and return. Its local states are `ready → ringing → connected → dispatcher → ended`, with three captioned prompts and short scripted acknowledgements; the region-neutral phone icon pulses while ringing. No ringtone or bundled voice line is included. The simulation does not report a real 911 connection or advance the medical assessment. `emergencyConfig` near the top of `SecondChanceDisplay.js` holds the region label and number as strings. The current displayed preset is United States / 911; a blank number shows “Call local emergency services on your phone” across two lines. Lens Studio Preview uses `C` open, `F` change focus, `N` select, and `X` cancel. One pinch handler owns lesson and panel input, with a 450 ms debounce against duplicate gesture events. The call panel uses 13 fixed lines at text size 48 to fit the compact card.

As of this build, a completed speech transcript can also select one of eight adult CPR training answers: first actions, compression rate, compression depth, hand placement, AED, breathing/gasping, calling for help, and Hands-Only CPR breaths. The same centered illustration band shows the relevant diagram. Questions such as “How fast should I do CPR?” and “Where do I put my hands?” are matched by local keywords. This is a bounded training guide, not open-ended medical conversation or real-time CPR assessment. Unmatched speech leaves the screen unchanged.

The current Lens source contains a wrist-motion **practice prototype** built with the Snap Spectacles Interaction Kit version bundled with the Lens Studio 5.15 sample. On the COMPRESS lesson screen, it waits for a stable world-space wrist pose, then counts a complete downward-and-return cycle. Smoothed position, distinct down/return thresholds, a lateral limit, and reacquisition-jump rejection reduce false counts. After four motions it gives one pacing cue against 100–120/min; the rate clears after a pause or tracking loss, while the count stays until the user leaves COMPRESS. Two visible palms can produce the approximate cue “Hands close”; one visible wrist is enough for rhythm tracking. The kit exposes wrists and hand joints but no reliable wearer shoulder/elbow positions here, so no arm-alignment verdict is shown. This is practice-motion feedback only: it cannot verify manikin contact, placement, depth, force, recoil, or CPR quality.

## OpenAI browser and Lens companion

- The API key is stored only in the local, Git-ignored `.env` file. The browser never receives the key.
- The browser assistant uses a model only to rephrase approved team-role summaries. Other training questions keep fixed responses.
- Optional browser tools transcribe a short audio question, classify a selected training-prop photo, and speak a server-approved answer. These calls cannot advance Lens or browser workflow state.
- The text, vision, transcription, and speech model endpoints were reached successfully with the configured key. The local browser showed the new controls and a model-backed team-role answer.
- The native Lens now recognizes “Ask AI …” on its existing ASR session, shows a cyan response card, sends the question through `InternetModule` to `/api/lens/ask`, and maps the model's topic classification to one of ten fixed three-line training cards. It optionally plays the approved card through `/api/lens/audio` and `RemoteMediaModule`; speech output is ignored by ASR while playing. No model-generated emergency instructions are shown.
- The local `.env` currently sets `AI_ALLOW_LAN=1` for a trusted Wi-Fi test. The Lens points to this Mac at `http://10.27.176.77:4173`, and the local text and MP3 endpoints responded successfully. This address may change when the Mac changes networks. Snap requires Experimental APIs for `http` on Spectacles, so this test configuration cannot be published; a reachable HTTPS backend is needed for release. No request from the headset has been observed yet. [Snap Internet Access](https://developers.snap.com/spectacles/about-spectacles-features/apis/internet-access)
- Vision classification remains in the browser companion. The Spectacles camera flow still needs a device check and transparent permission design before sending images to a server. [Snap Camera Module](https://developers.snap.com/spectacles/about-spectacles-features/apis/camera-module)

## Verification

- Earlier `node spectacles/test-display.cjs` checks passed for the five-step illustrated version and simulated ASR commands.
- Lens Studio desktop Preview showed the illustrated card and Logger error count 0. The picture appears once in the reserved band rather than repeating across the full card.
- The illustrated Lens was sent to the connected Spectacles with **Preview Lens** at about 15:26. Lens Studio logged `The Lens was sent in 559 ms` and `The sent Lens has successfully started on Spectacles`. Device logs show `SECOND CHANCE pinch controls ready` and `SECOND CHANCE voice session started`.
- Lens Studio itself crashed after the send, while idle. The observed send and device start completed before that crash; the cause of the editor crash has not been established.
- CLI export succeeded with exit code 0 at 15:28. The script inside the zip has the same SHA-256 as the source script, and the archive contains all seven compressed diagram textures.
- The wearer reported that English “Next” now works on Spectacles after an initial attempt did not switch screens. Device logs from that later attempt were unavailable because adb logcat timed out. Wearer confirmation of full layout fit and all five illustration screens is still pending; the desktop screenshot cannot prove wearable field-of-view fit.
- At about 15:40, the CPR question-answer build was exported and sent to the connected Spectacles. Lens Studio showed `The sent Lens has successfully started on Spectacles`, a started voice session, and Logger error count 0. Local tests cover all eight topic answers, diagram switching, unmatched speech, and returning to the lesson with “Next”. The wearer said “How fast should I do CPR?” and confirmed the glasses displayed `CPR / PRESSING RATE` and `100–120 compressions/min.` Other topic questions remain unverified on the device.
- At about 15:48, the compact layout was sent to Spectacles. Lens Studio reported a successful start, pinch controls ready, a started voice session, and Logger error count 0. The desktop Preview showed the title, illustration, instructions, and footer without overlap. Wearer confirmation that every line fits the Spectacles field of view is still pending.
- At 15:56, offline CLI export of the compact Lens succeeded with exit code 0. `node spectacles/test-display.cjs` passed, including the 11-line/28-character screen limits. The exported script and source both have SHA-256 `b07a5ee757d6e8d3d7281fbc04f25729b2118403036500117d9902aaca5813b3`. Code editing, local tests, desktop Preview, and export can continue without the glasses; final field-of-view, gesture, and ASR checks still require the device.
- At 16:33, `node spectacles/test-display.cjs` passed against the expanded native flow and the new practice counter: stable acquisition, a complete cycle, partial motion rejection, sideways rejection, tracking loss mid-cycle, cadence feedback, pinch to AED, reset on re-entry, and the SIK hand-input adapter in a simulated wearable runtime. The Preview-only keys are `N` next, `B` show hand, `D` down, `U` return, and `L` tracking loss; they call the same counter used by wearable hand data. Lens Studio 5.15.4 CLI export succeeded with the compatible SIK package. The current script is attached to `Lighting`; `Camera Object` now has World `DeviceTracking`, and the text/illustration are parented to that camera to maintain viewing distance. GUI Lens Studio repeatedly exits while opening this project, including after resetting its project cache, so the new visual layout was not observed in desktop Preview. `adb devices` found no connected Spectacles; the new hand-motion flow has not been pushed to or validated on the headset.

- At 16:39, CLI export succeeded again after natural-language assessment improvements. The native flow test and all 13 browser tests pass. The project uses Spectacles Interaction Kit 0.15.0. Source and exported script SHA-256 match at `0c29360e084c03551e80fc6fbbed665845ba35cfcc40f46d53d595fe83f1f798`. The expanded build has not been verified on connected Spectacles.

- At 16:42, the iPhone call screen was revised to offer Siri as a hands-free option while still stating that the Lens places no call. CLI export succeeded after closing a conflicting Lens Studio instance. The source and exported script both have SHA-256 `0c29360e084c03551e80fc6fbbed665845ba35cfcc40f46d53d595fe83f1f798`; the native flow test passes. No real emergency call was made.

- The call-panel state checks cover Step 1 entry, ringing cancellation with no delayed reconnection, all three dispatcher prompts, ending, return to the originating lesson, targeted wearable pinch, duplicate event consumption, a configured demo number, and the unconfigured-region fallback. Desktop Preview and on-device selection are still pending because the project-opening editor crash and lack of a connected device remain.

- The Lens Studio 5.15.4 CLI export completed successfully for the current call-panel build. The script in `spectacles/build/SecondChance.zip` matches the source byte for byte (SHA-256 `4c60cc20571ad8fe7eefca90f240f130a2c0010b052be9871a3548011c3a77c3`). Local native checks and the browser test suite pass. `adb devices -l` listed no device, so this call panel has not been pushed to Spectacles.

- At 16:44, Lens Studio 5.15.4 opened its default blank project normally. Opening an isolated copy of SECOND CHANCE without its Packages and Cache still crashed the editor, so the failure is associated with loading this project rather than launching Lens Studio generally. A further scene-only isolation copy was prepared under `/private/tmp`, but it was not opened successfully and does not establish the offending asset. The original project and exported zip remain intact. No Spectacles device was listed by `adb devices` for this verification pass.

- At 17:05, the AI and audio Lens exported successfully with Lens Studio 5.15.4. The exported main script matches the source SHA-256 `c31606e7054b02d68f80bbbb609acea8befa34006b9878c648e3ef497ea65c14`, and the zip integrity check passed. `node spectacles/test-display.cjs` covers the Lens request, compact response, approved audio resource, ASR suppression during playback, and return to the drill; all 16 Node tests pass. A live OpenAI classification returned the rate card, and the local LAN audio endpoint returned a 140,160-byte MP3. `adb devices -l` still found no headset, so the AI and audio flows have not been observed on Spectacles. Lens Studio GUI remained on its blank project during this check; Experimental APIs were not enabled in the target project.

## Seven-feature feasibility (training prototype)

The present Lens is a CPR training simulation. The seven requested capabilities are a roadmap, not a claim that a reliable emergency-response product already exists.

| Capability | Feasibility and dependency |
| --- | --- |
| Voice emergency mode and assessment prompts | Implemented as an English voice-started, bounded safety/response/breathing flow. The expanded flow passes local tests; only the earlier voice navigation and CPR topic answer were confirmed on glasses. Experimental AI question classification is wired in code but unverified on the device. No automatic medical detection. |
| Hands-free 911 calling | The Lens displays an iPhone Siri prompt, an offline simulated dispatcher, and explicit training labels. It cannot place or verify a real call. No official Lens emergency-dial API was found. Snap Mobile Kit can exchange data with a separately built iPhone app after bonding; dialer handoff is not implemented or verified. |
| Nearby AED navigation | Implemented as a clearly fictional lobby-route simulation, as requested. No live registry, positioning, or verified AED location. A real version needs maintained AED data and appropriate indoor/outdoor positioning. |
| Real-time CPR coaching | Implemented as hand-placement illustration, 110 BPM visual rhythm, and approximate wrist-motion pacing feedback. No actual compression depth, recoil, force, or clinical quality measurement; these require a calibrated CPR manikin/sensor. BLE GATT access may conflict with other Lens capabilities and needs device testing. |
| Interactive AED guidance | Implemented as training screens for powering on, pad placement, clearing the patient, and resuming CPR. The Lens does not operate an AED or decide whether to shock; the AED's own instructions take precedence. |
| Multi-person coordination | Implemented as spoken role-assignment prompts in the Lens and a separate browser companion's simulated shared checklist. The Lens and browser checklist are not synced. A phone companion needs separate integration. |
| Adaptive response | Implemented as a deterministic scenario state machine using explicit answers and user-reported call/AED status. The Lens does not independently verify these actions. |

Development order: (1) recover stable Lens Studio GUI launch and verify the expanded Lens on Spectacles; (2) calibrate the practice-motion counter and confirm all screens fit; (3) connect a verified AED data source only if moving beyond the fictional simulation; (4) evaluate an iPhone companion and a calibrated CPR sensor before representing emergency calling or clinical feedback as working functionality.

## Next development

1. Reopen the actual `SecondChance.esproj` in Lens Studio GUI, enable Allow Experimental API for the local HTTP test, then preview the exported build on a connected Spectacles device. Confirm the Mac and glasses share reachable Wi-Fi.
2. On the headset, say “Ask AI how fast should I do CPR?” and confirm the cyan rate card and spoken answer. Check voice start, assessment branches, role assignment, simulated AED route, AED arrival, restart, and screen fit.
3. Test wrist-motion feedback against a training manikin, including tracking loss and head movement, then tune thresholds. This cannot validate chest compression depth or CPR quality.
4. If moving beyond simulation, obtain a verified AED registry and site location, and select a calibrated sensor model.
5. Investigate an iPhone companion through Snap Mobile Kit. Apple supports hands-free emergency calls through Siri, while iOS `tel:` links generally require system confirmation. Do not make a live 911 call during training.

## References

- [American Heart Association: What is CPR](https://cpr.heart.org/en/resources/what-is-cpr)
- [American Red Cross: Hands-Only CPR](https://www.redcross.org/take-a-class/cpr/performing-cpr/hands-only-cpr)
- [Snap: Gesture Module](https://www.developers.snap.com/spectacles/about-spectacles-features/apis/gesture-module)
- [Snap: Hand Tracking](https://developers.snap.com/spectacles/spectacles-frameworks/spectacles-interaction-kit/features/handtracking)
- [Snap: ASR Module](https://developers.snap.com/spectacles/about-spectacles-features/apis/asr-module)
- [Snap: Location API](https://developers.snap.com/spectacles/about-spectacles-features/apis/location)
- [Snap: Navigation Kit](https://developers.snap.com/spectacles/spectacles-frameworks/spectacles-navigation-kit/getting-started)
- [Snap: Bluetooth GATT API](https://developers.snap.com/spectacles/about-spectacles-features/apis/bluetooth)
- [Snap: Connected Lenses for Spectacles](https://developers.snap.com/spectacles/about-spectacles-features/connected-lenses/overview)
- [American Heart Association: Treatment of Cardiac Arrest](https://www.heart.org/en/health-topics/cardiac-arrest/emergency-treatment-of-cardiac-arrest)
- [Snap: Spectacles Mobile Kit](https://developers.snap.com/spectacles/spectacles-frameworks/spectacles-mobile-kit/getting-started)
- [Apple: Safety features and Siri emergency calling](https://support.apple.com/safety-features)
- [Apple: Phone links require user confirmation](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html)
- [911.gov: United States emergency number](https://www.911.gov/calling-911/frequently-asked-questions/)
- [Australian Communications and Media Authority: Triple Zero (000)](https://www.acma.gov.au/emergency-calls)
