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

As of this build, a completed speech transcript can also select one of eight adult CPR training answers: first actions, compression rate, compression depth, hand placement, AED, breathing/gasping, calling for help, and Hands-Only CPR breaths. The same centered illustration band shows the relevant diagram. Questions such as “How fast should I do CPR?” and “Where do I put my hands?” are matched by local keywords. This is a bounded training guide, not open-ended medical conversation or real-time CPR assessment. Unmatched speech leaves the screen unchanged.

The current Lens source contains a wrist-motion **practice prototype** built with the Snap Spectacles Interaction Kit version bundled with the Lens Studio 5.15 sample. On the COMPRESS lesson screen, it waits for a stable world-space wrist pose, then counts a complete downward-and-return cycle. Smoothed position, distinct down/return thresholds, a lateral limit, and reacquisition-jump rejection reduce false counts. After four motions it gives one pacing cue against 100–120/min; the rate clears after a pause or tracking loss, while the count stays until the user leaves COMPRESS. Two visible palms can produce the approximate cue “Hands close”; one visible wrist is enough for rhythm tracking. The kit exposes wrists and hand joints but no reliable wearer shoulder/elbow positions here, so no arm-alignment verdict is shown. This is practice-motion feedback only: it cannot verify manikin contact, placement, depth, force, recoil, or CPR quality.

## OpenAI browser companion

- The API key is stored only in the local, Git-ignored `.env` file. The browser never receives the key.
- The browser assistant uses a model only to rephrase approved team-role summaries. Other training questions keep fixed responses.
- Optional browser tools transcribe a short audio question, classify a selected training-prop photo, and speak a server-approved answer. These calls cannot advance Lens or browser workflow state.
- The text, vision, transcription, and speech model endpoints were reached successfully with the configured key. The local browser showed the new controls and a model-backed team-role answer.
- AI media endpoints are limited to localhost unless `AI_ALLOW_LAN=1` is deliberately set. The Spectacles Lens still has no OpenAI connection; that needs a reachable HTTPS backend and device testing.

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
- At 16:32, `node spectacles/test-display.cjs` passed against the expanded native flow and the new practice counter: stable acquisition, a complete cycle, partial motion rejection, sideways rejection, tracking loss mid-cycle, cadence feedback, pinch to AED, and reset on re-entry. The Preview-only keys are `N` next, `B` show hand, `D` down, `U` return, and `L` tracking loss; they call the same counter used by wearable hand data. Lens Studio 5.15.4 CLI export succeeded with the compatible SIK package. The current script is attached to `Lighting`; `Camera Object` now has World `DeviceTracking`, and the text/illustration are parented to that camera to maintain viewing distance. GUI Lens Studio repeatedly exits while opening this project, so the new visual layout was not observed in desktop Preview. The new hand-motion flow has not been pushed to or validated on Spectacles.

## Seven-feature feasibility (training prototype)

The present Lens is a CPR training simulation. The seven requested capabilities are a roadmap, not a claim that a reliable emergency-response product already exists.

| Capability | Feasibility and dependency |
| --- | --- |
| Voice emergency mode and assessment prompts | Feasible in this Lens using the existing ASR and a bounded decision flow. Current voice navigation and CPR topic answers are working on device. Scene-based automatic medical detection would need separate validation. |
| Hands-free 911 calling | The current Lens only displays a call instruction. No official Spectacles Lens telephone/emergency-dial API was verified in the reviewed Snap documentation. Treat direct calling as unimplemented; a phone or telephony integration would need separate research and end-to-end testing. |
| Nearby AED navigation | Technically feasible with Location API and Navigation Kit, provided an accurate, maintained AED location data source, location permission, internet, and appropriate indoor/outdoor positioning. A known-location demo can be built first. |
| Real-time CPR coaching | Hand-placement illustration and 110 BPM training rhythm already exist. Spectacles hand tracking can add visible hand-position prompts. Actual compression depth, recoil, and quality require a calibrated CPR manikin/sensor. BLE GATT exists, but Snap says using it in a Lens disables camera-frame, location, and audio access; combined architecture needs validation. |
| Interactive AED guidance | Feasible as training illustrations, pad-position cues, and safety prompts. Actual AED use must follow the device's own instructions; the Lens must not decide whether to deliver a shock. |
| Multi-person coordination | Feasible as one wearer's spoken task assignments and a shared checklist. Spectacles Connected Lenses can sync multiple Spectacles wearers; Spectacles Sync Kit documentation says a phone cannot join the same Spectacles session through that route. A separate phone companion would need separate integration. |
| Adaptive response | Feasible as a deterministic state machine that advances on explicit user confirmation or validated sensor events. It should distinguish user-reported actions from automatically verified actions. |

Development order: (1) recover stable Lens Studio GUI launch and verify the expanded Lens on Spectacles; (2) calibrate the practice-motion counter and confirm all screens fit; (3) connect a verified AED data source only if moving beyond the fictional simulation; (4) evaluate an iPhone companion and a calibrated CPR sensor before representing emergency calling or clinical feedback as working functionality.

## Next development

1. Reopen the project in Lens Studio GUI, inspect the 13-line compression layout in desktop Preview, then push the expanded build to Spectacles when connected.
2. Test voice start, assessment branches, role assignment, simulated AED route, AED arrival, and restart on the glasses; confirm every screen fits.
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
