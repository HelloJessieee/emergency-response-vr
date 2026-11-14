# SECOND CHANCE — project status

Updated: 2026-11-14, 15:08 PST

## Goal

Adult Hands-Only CPR training simulation for Snap Spectacles, using a witnessed sudden adult collapse scenario. The Lens demonstrates actions and a 110 BPM practice rhythm. It does not call 911, operate an AED, or measure hand placement or compression quality.

## Current Lens

- Lens Studio project: `spectacles/SecondChance/SecondChance.esproj`
- Active scene script: `spectacles/SecondChance/Assets/SecondChanceDisplay.js`, attached to `Lighting`
- Current export: `spectacles/build/SecondChance.zip`
- Prior overlapping multi-label version backed up as `spectacles/build/overlap-version.js`

The wearer reported that the graphic build sent at 15:02 had all elements overlapping. The script was rebuilt around **one `Component.Text` card** at the center. Its title, drawing, instructions, cue, five-segment progress, and pinch hint are lines in the same text layout, so separate world-space labels cannot collide. The card has a translucent charcoal background. Size was reduced from 75 to 68 after desktop preview. It uses simple line glyphs; detailed imported illustrations are still future polish.

Five screens use one step state and advance with a thumb/index pinch: check response, call 911 and get an AED, place hands, push hard and fast, use AED. Step 2 changes from the phone glyph to AED after 0.7 seconds. Step 4 changes the compression direction mark at a 110 BPM practice rhythm and stops doing so on departure. The final pinch restarts at step 1. The same debounced handler is registered for both hands and `TriggerPrimaryEvent`. There is one updater, including after a restart. The existing project has no back navigation.

## Verification

- `node --check spectacles/SecondChance/Assets/SecondChanceDisplay.js` passed.
- `node spectacles/test-display.cjs` passed: single component, five screens/order, debounce, phone to AED change, beat frames, beat stopping, and restart without an extra updater.
- Lens Studio desktop Preview showed the revised card with title, drawing, instructions, cue, progress, and footer in separate lines without overlap. The Logger had 0 errors. The desktop simulator cannot invoke Spectacles' pinch API; this is caught.
- The revised Lens was sent with **Preview Lens** over USB at about 15:07. Lens Studio logged `The Lens was sent in 332 ms`, and the device-side script logged `SECOND CHANCE pinch controls ready`; Logger error count was 0. Wearer confirmation of the revised layout is pending.
- Lens Studio CLI exported the revised project successfully at 15:07. The source script and script inside `SecondChance.zip` have matching SHA-256: `0e5edf393d1fe233c37505495977b3934a30935d206253f8ce437f932206df10`.

## Next check

Confirm on glasses that the single card is fully visible and no text overlaps. Pinch once to confirm the second card appears. If the full card does not fit the wearer field of view, shorten the text further and resend. The graphic glyphs are a temporary instructional illustration; imported vector or 3D artwork can follow once legibility is stable.

Lens Studio 5.15.4 sometimes crashes during object creation or import. Editing the attached script externally and reopening the project has been reliable. Close the GUI before using the CLI exporter.

## References

- [American Heart Association: What is CPR](https://cpr.heart.org/en/resources/what-is-cpr)
- [American Red Cross: Hands-Only CPR](https://www.redcross.org/take-a-class/cpr/performing-cpr/hands-only-cpr)
- [Snap: Test a Lens on Spectacles](https://developers.snap.com/spectacles/get-started/start-building/test-lens-on-spectacles)
