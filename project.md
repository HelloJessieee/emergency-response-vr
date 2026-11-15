# SECOND CHANCE — project status

Updated: 2026-11-14

## Goal

Adult Hands-Only CPR training simulation for Snap Spectacles, using a witnessed sudden adult collapse scenario. The Lens demonstrates actions and a 110 BPM practice rhythm. It does not call 911, operate an AED, or measure hand placement or compression quality.

## Current project

- Lens Studio project: `spectacles/SecondChance/SecondChance.esproj`
- Active script: `spectacles/SecondChance/Assets/SecondChanceDisplay.js`, attached to `Lighting`
- Seven imported 512 px transparent diagrams: `spectacles/SecondChance/Assets/Diagrams/`
- Diagram generator: `spectacles/make_diagrams.py`
- State check: `spectacles/test-display.cjs`
- `spectacles/build/SecondChance.zip` is the current illustrated export. Its script matches the source file and it contains all seven diagram textures.

The first graphic version placed multiple world-space labels together, and the wearer reported overlap. The current version has one central text card and a separate, bounded one-line texture layer inside a reserved illustration band. It shows a different diagram for each step. The call screen switches from a phone to an AED diagram after 0.7 seconds; the compression screen alternates two frames at a 110 BPM practice rhythm. After the wearer reported clipped text, the card was reduced to 11 fixed lines, its text size to 60, and its illustration scale to 1.25. Long cues were shortened to fit a single screen without scrolling.

Five screens advance with a thumb/index pinch: check response, call 911 and get an AED, place hands, push hard and fast, use AED. The final pinch restarts at step 1. `TriggerPrimaryEvent` is a fallback. The script also accepts speech commands (next/continue/下一步/继续; restart/start over/重来/重新开始). The wearer confirmed that English “Next” advances the screen on Spectacles. “Restart” and the Chinese commands have not yet been checked on the device. Desktop simulation does not provide the Spectacles gesture or ASR APIs.

As of this build, a completed speech transcript can also select one of eight adult CPR training answers: first actions, compression rate, compression depth, hand placement, AED, breathing/gasping, calling for help, and Hands-Only CPR breaths. The same centered illustration band shows the relevant diagram. Questions such as “How fast should I do CPR?” and “Where do I put my hands?” are matched by local keywords. This is a bounded training guide, not open-ended medical conversation or real-time CPR assessment. Unmatched speech leaves the screen unchanged.

The latest Lens source also contains a wrist-motion **practice prototype** built with Spectacles Interaction Kit. It estimates a practice rhythm from visible wrist movement and displays bounded pacing cues. Its local tests pass, and the export contains the matching script and package. This does not measure actual chest compression depth, force, recoil, or medical quality; wearable validation of the motion flow is pending.

## OpenAI browser companion

- The API key is stored only in the local, Git-ignored `.env` file. The browser never receives the key.
- The browser assistant uses a model only to rephrase approved team-role summaries. Other training questions keep fixed responses.
- Optional browser tools transcribe a short audio question, classify a selected training-prop photo, and speak a server-approved answer. These calls cannot advance Lens or browser workflow state.
- The text, vision, transcription, and speech model endpoints were reached successfully with the configured key. The local browser showed the new controls and a model-backed team-role answer.
- AI media endpoints are limited to localhost unless `AI_ALLOW_LAN=1` is deliberately set. The Spectacles Lens still has no OpenAI connection; that needs a reachable HTTPS backend and device testing.

## Verification

- `node spectacles/test-display.cjs` passed: diagram selection, five-step order, pinch debounce, staged AED diagram, two compression frames, restart, and simulated ASR commands.
- Lens Studio desktop Preview showed the illustrated card and Logger error count 0. The picture appears once in the reserved band rather than repeating across the full card.
- The illustrated Lens was sent to the connected Spectacles with **Preview Lens** at about 15:26. Lens Studio logged `The Lens was sent in 559 ms` and `The sent Lens has successfully started on Spectacles`. Device logs show `SECOND CHANCE pinch controls ready` and `SECOND CHANCE voice session started`.
- Lens Studio itself crashed after the send, while idle. The observed send and device start completed before that crash; the cause of the editor crash has not been established.
- CLI export succeeded with exit code 0 at 15:28. The script inside the zip has the same SHA-256 as the source script, and the archive contains all seven compressed diagram textures.
- The wearer reported that English “Next” now works on Spectacles after an initial attempt did not switch screens. Device logs from that later attempt were unavailable because adb logcat timed out. Wearer confirmation of full layout fit and all five illustration screens is still pending; the desktop screenshot cannot prove wearable field-of-view fit.
- At about 15:40, the CPR question-answer build was exported and sent to the connected Spectacles. Lens Studio showed `The sent Lens has successfully started on Spectacles`, a started voice session, and Logger error count 0. Local tests cover all eight topic answers, diagram switching, unmatched speech, and returning to the lesson with “Next”. The wearer said “How fast should I do CPR?” and confirmed the glasses displayed `CPR / PRESSING RATE` and `100–120 compressions/min.` Other topic questions remain unverified on the device.
- At about 15:48, the compact layout was sent to Spectacles. Lens Studio reported a successful start, pinch controls ready, a started voice session, and Logger error count 0. The desktop Preview showed the title, illustration, instructions, and footer without overlap. Wearer confirmation that every line fits the Spectacles field of view is still pending.
- At 15:56, offline CLI export of the compact Lens succeeded with exit code 0. `node spectacles/test-display.cjs` passed, including the 11-line/28-character screen limits. The exported script and source both have SHA-256 `b07a5ee757d6e8d3d7281fbc04f25729b2118403036500117d9902aaca5813b3`. Code editing, local tests, desktop Preview, and export can continue without the glasses; final field-of-view, gesture, and ASR checks still require the device.

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

Development order: (1) preserve the compact wearable layout and confirm it on device; (2) add voice emergency-mode and bystander task checklist; (3) add AED training flow and a known-location navigation demo; (4) prototype hand tracking; (5) evaluate sensor and calling integrations separately before representing either as working emergency functionality.

## Next development

1. Confirm that the compact illustrated layout, including the bottom cue, fully fits in the eyewear on each screen.
2. Add voice emergency-mode and a bystander task checklist using the existing state flow.
3. Add AED training prompts and then a known-location AED navigation demonstration.
4. Validate the wrist-motion practice prototype on Spectacles and tune its prompts. Hand tracking alone cannot validate chest compression depth or CPR quality.
5. Test “Restart” and the other topic questions on the device. Keep pinch as the working fallback.

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
