# SECOND CHANCE — project status

Updated: 2026-11-14, 15:28 PST

## Goal

Adult Hands-Only CPR training simulation for Snap Spectacles, using a witnessed sudden adult collapse scenario. The Lens demonstrates actions and a 110 BPM practice rhythm. It does not call 911, operate an AED, or measure hand placement or compression quality.

## Current project

- Lens Studio project: `spectacles/SecondChance/SecondChance.esproj`
- Active script: `spectacles/SecondChance/Assets/SecondChanceDisplay.js`, attached to `Lighting`
- Seven imported 512 px transparent diagrams: `spectacles/SecondChance/Assets/Diagrams/`
- Diagram generator: `spectacles/make_diagrams.py`
- State check: `spectacles/test-display.cjs`
- `spectacles/build/SecondChance.zip` is the current illustrated export. Its script matches the source file and it contains all seven diagram textures.

The first graphic version placed multiple world-space labels together, and the wearer reported overlap. The current version has one central text card and a separate, bounded one-line texture layer inside a reserved illustration band. It shows a different diagram for each step. The call screen switches from a phone to an AED diagram after 0.7 seconds; the compression screen alternates two frames at a 110 BPM practice rhythm.

Five screens advance with a thumb/index pinch: check response, call 911 and get an AED, place hands, push hard and fast, use AED. The final pinch restarts at step 1. `TriggerPrimaryEvent` is a fallback. The script also attempts speech commands (next/continue/下一步/继续; restart/start over/重来/重新开始), but voice recognition has **not been verified on Spectacles**. Desktop simulation does not provide the Spectacles gesture or ASR APIs.

## Verification

- `node spectacles/test-display.cjs` passed: diagram selection, five-step order, pinch debounce, staged AED diagram, two compression frames, restart, and simulated ASR commands.
- Lens Studio desktop Preview showed the illustrated card and Logger error count 0. The picture appears once in the reserved band rather than repeating across the full card.
- The illustrated Lens was sent to the connected Spectacles with **Preview Lens** at about 15:26. Lens Studio logged `The Lens was sent in 559 ms`, device-side `SECOND CHANCE pinch controls ready`, and Logger error count 0.
- Wearer confirmation of the new layout, image visibility, and voice command behavior is still pending. The desktop screenshot cannot prove how much of the card fits in the wearable field of view.

## Next development

1. Check the illustrated layout in the eyewear. If it clips, shorten the copy or reduce the card scale and resend.
2. Add hand presence/position tracking for training prompts using Spectacles Interaction Kit. This could show whether hands are in the visible region; it cannot by itself validate chest compression depth or CPR quality.
3. Test ASR on the device before exposing voice commands as a reliable control. Keep pinch as the working fallback.
4. Confirm the exported illustrated Lens fits in the eyewear before distributing the zip as a tested wearable build.

## References

- [American Heart Association: What is CPR](https://cpr.heart.org/en/resources/what-is-cpr)
- [American Red Cross: Hands-Only CPR](https://www.redcross.org/take-a-class/cpr/performing-cpr/hands-only-cpr)
- [Snap: Gesture Module](https://www.developers.snap.com/spectacles/about-spectacles-features/apis/gesture-module)
- [Snap: Hand Tracking](https://developers.snap.com/spectacles/spectacles-frameworks/spectacles-interaction-kit/features/handtracking)
