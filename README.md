# Rescue Specs

Browser based AR response simulator for a hackathon demonstration with CPR mannequins and AED trainers. This is **not a medical device** or a live emergency response service.

## Current status (2026-11-15)

### Works

- **Browser simulator and server:** the full demo flow, shared multi-device session, mock dispatcher, responder and AED-route simulations, and training assistant. `npm test` passes (18 tests).
- **Spectacles Lens, confirmed on the glasses:**
  - It launches over USB from Lens Studio 5.15.4.
  - The home screen and the 11-screen adult CPR lesson work.
  - Pinch and English voice commands navigate the lesson.
  - Spoken CPR questions show a fixed training card and play its bundled voice answer.
  - The responder map opens by aiming at `MAP` and pinching.
  - The equipment finder's colour and depth camera frames are captured.
- **Hand-practice screens 06, 07 and 09:** on the glasses, a pinch must be held for 0.8 s (or say "Next") to advance. Device logs show short, accidental pinches being rejected.
- **Voice recovery:** if the glasses' speech service goes silent for 20 s or reports an error, the Lens stops and restarts the session. Voice input works again on the glasses with this build.
- **End of lesson:** after screen 11 (RESUME CPR), "Next" or a pinch returns to the start screen for a fresh run.
- **Lens flow checks:** `node spectacles/test-display.cjs` simulates the Lens flow, hand tracking, pinch holds, voice recovery and AI calls without the glasses.

### In progress or known issues

- **Phantom pinches:** on the glasses, one resting hand can report pinches several times a second without the wearer pinching. One two-minute run logged 257. These can advance screens or open the responder map or practice 911 panel when that hand's pointing ray rests on those rows. Workaround: keep hands lowered or out of view between actions.
- **Screen 06 ghost hands:** the picture currently renders as many small repeated copies instead of one life-size pair. It is sized by stretching a Text background, and Lens Studio repeats the texture rather than stretching it. Planned fix: keep the background at the glyph size and scale the object instead. Checking whether the wearer's hands fit the ghost, with green "in position" feedback, is designed but not built.
- **Not yet verified on the glasses:** virtual hand-placement and AED-pad alignment, model-backed equipment matches and marker placement, and the spoken "Call my contact" iPhone request.
- **Stale export:** [`spectacles/build/SecondChance.zip`](./spectacles/build/SecondChance.zip) is from 2026-11-14 and does not include the 2026-11-15 changes. Re-export it from Lens Studio before sharing.

### Could improve

- Filter pinches by the confidence the glasses report, and only accept aimed selections while the hand is raised in a pointing pose.
- Finish screen 06: fit checks for heel position, palms facing down and stacked hands, with direction hints and colour feedback.
- Replace the local HTTP gateway (USB `adb reverse` to the Mac) with a secured HTTPS backend, so the Lens runs untethered and without Experimental APIs.
- Calibrate the virtual targets to a physical manikin. Compression depth, force and recoil are not measured and would need dedicated hardware.
- A repeatable on-glasses test checklist that is compared against the Lens Studio device log.

## Run locally

Requires Node.js 20 or later.

```bash
npm install
npm start
```

Open [http://localhost:4173](http://localhost:4173). Run `npm test` for the state engine checks.

## Demo flow

1. Activate emergency training mode.
2. Record the observed mannequin state: unresponsive and not breathing normally.
3. Connect the **mock** dispatcher. The app never dials 911.
4. Open **Responders** to see three fictional nearby people with demo distances and ETAs. Choose a training task, click **Simulate request**, then **Simulate arrival** to update the shared map and activity log. This does not use GPS, contact anyone, or dispatch help.
5. Select a fictional AED trainer location and inspect the simulated route.
6. Start the visual CPR rhythm. Tap the button or press Space to see practice tap rate. The app does not measure compression depth or recoil.
7. Mark the AED trainer as arrived, then confirm its training steps. The AED trainer gives the operative prompts; the app never decides whether a shock is needed.
8. Copy the session URL and open it in another browser or phone on the same reachable host. Assign roles, then close a teammate's tab to show role reassignment.
9. In **Training Assistant**, ask “What’s next?” or “Who is doing what?” The answer reads the live demo session. CPR, AED, mock calling, and real-emergency questions use fixed training copy.

For a second device on the same Wi-Fi, find the Mac's LAN address and open `http://<your-mac-ip>:4173/?session=<same-id>`. The server listens on port 4173; a local firewall prompt may appear.

## Training assistant API

The browser demo exposes `POST /api/assistant` and a question panel. Without an API key it returns a clearly labeled local scripted answer, so the demo works offline. To enable OpenAI, copy `.env.example` to `.env`, set `OPENAI_API_KEY`, and restart `npm start`. The `.env` file is ignored by Git and loaded only on the server. Team-role summaries can be rephrased by the Responses API; `OPENAI_MODEL` defaults to `gpt-6-luna`. The server sends only an approved role summary and language for this text feature, not the raw question or full session.

The browser also offers three optional media tools: a short recorded or uploaded question through `POST /api/transcribe` (`gpt-4o-mini-transcribe`), training-prop photo classification through `POST /api/vision` (`gpt-5-mini`), and reading an approved training answer through `POST /api/speech` (`gpt-4o-mini-tts`). Selected audio and images are sent to OpenAI only when the user presses a media button. The visual classifier returns only a fixed equipment category and never updates the simulation. Media requests are capped at 2 MB and rate limited. AI endpoints work on localhost by default; set `AI_ALLOW_LAN=1` only for a trusted local-network demo. Browser microphone recording requires localhost or HTTPS; audio file upload remains available.

The model never updates workflow state or supplies free-form CPR, AED, simulated-call, or real-emergency instructions. The browser media features are for training equipment and approved demo copy, not emergency decisions. The Spectacles Lens requests fixed training cards through `/api/lens/ask`. Its new equipment finder uses `/api/lens/find` to return a possible pixel location for gauze, a tourniquet, an epinephrine auto-injector, or an AED trainer. The finder is a training prototype: no on-glasses camera/depth result has been verified. The current local HTTP address and Depth Module require Experimental APIs; this build cannot be published, and a reachable HTTPS backend plus device testing are needed for release.

## Architecture

- `shared/engine.js`: deterministic event reducer, AED demo locations, task model, and training sequence.
- `server.js`: small Node HTTP and WebSocket server. It owns session state, broadcasts snapshots, and serves the simulator.
- `public/`: responsive browser interface with an AR-style training view, simulated floor map, optional browser speech commands, and shared team controls.
- `tests/`: critical state transitions and guardrails.
- `shared/training-assistant.js`: bounded question routing and current-state answers. The server can optionally rephrase role summaries through a model API.
- `shared/media-gateway.js`: bounded image classification and equipment localization, speech transcription, and text-to-speech calls.

Session state is kept in server memory and resets when the server restarts. There is no account system or durable data store. The WebSocket endpoint has no authentication and is intended for a trusted hackathon demo network only.

## Real vs simulated

| Capability | Current implementation |
| --- | --- |
| Emergency call | Mock dispatcher only; no phone integration or dialing |
| AED locations | Fictional training building; no real registry or verified availability |
| CPR rhythm | Visual 110 BPM metronome and keyboard or button taps |
| CPR quality | Lens has an unvalidated wrist-motion practice counter; no compression depth, recoil, or force measurement |
| AED analysis | Training sequence only; no shock decision |
| AR view | Browser simulation and a Spectacles training overlay with wrist tracking; no spatial mannequin alignment yet |
| Voice | Browser speech tools and Lens voice commands; manual and pinch controls remain available |
| Multi-person | Live WebSocket session and task assignment; no access control |
| Language model | Server-side Responses API classifies Lens voice questions into fixed training cards; the browser can rephrase approved team-role wording |
| Vision and audio | Browser prop-photo classification and transcription; the Lens has an unverified camera/depth equipment finder and can play an approved training card through server-side speech synthesis |

Medical copy is limited to an adult training scenario and follows [American Heart Association adult basic life support guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support) and [Red Cross AED steps](https://www.redcross.org/take-a-class/aed/using-an-aed/aed-steps). In any real emergency, call local emergency services directly and follow dispatcher and AED instructions. Do not wait for this prototype.

## Spectacles prototype

The native [Lens Studio project](./spectacles/SecondChance/SecondChance.esproj) runs on Spectacles (2024). Its training flow covers voice activation, scene safety, response and breathing branches, call and bystander prompts, simulated AED routing, CPR rhythm, AED steps, and adaptive user-reported task status. It has an offline emergency-call **training** panel with simulated ringing and three captioned dispatcher prompts. The current build routes “Ask AI…” and natural CPR/AED questions to a server that uses OpenAI to select a bounded training card. Ten approved spoken answers are bundled as Lens audio assets for immediate playback; network audio is a fallback. Device startup, ASR, pinch, color camera, and depth-frame pairing have been confirmed on the glasses. The wearer confirmed hearing the English answer to “How deep should I press?”. The [exported Lens zip](./spectacles/build/SecondChance.zip) is an earlier export (2026-11-14) and needs re-exporting to include the latest changes. The Lens does not place a real call, find a live AED, align to a mannequin, or measure compression depth or force.

The `FirstAidFinder.ts` component is attached to `Lighting`, with `SC Equipment Marker` and a Camera Module asset assigned in the scene. It shares the existing ASR session: say “Find the gauze”, “Find the tourniquet”, “Find the epinephrine”, or “Find the AED trainer”. It pairs a frozen left-camera frame with a depth frame by timestamp, sends a JPEG to the local OpenAI-backed gateway, maps a returned pixel through the cached depth and camera pose, then shows a world-space **possible match** marker. Say “Back” or pinch to clear it. `mockVisionForTraining` is off; turning it on places a clearly simulated marker at image center and does not identify equipment. The project declares `EXPERIMENTAL_API`. A live API request with the AED diagram returned a bounded coordinate, while a blank synthetic image returned `found:false`. Color/depth pairing has now been observed on the glasses, but no model-backed equipment match or marker position has been verified there. The project uses Lens Studio 5.15.4 for Spectacles (2024); Snap's 5.24 branch targets newer SPECS hardware.

On the HAND POSITION lesson, flat **ghost hands** (two stacked palm-down hands with a heel ring, drawn by `spectacles/make_hand_guide.py`) appear at about waist height in front of the wearer, fingers pointing away, as the shape to fit the hands into. On the glasses they currently render as repeated small copies (see Current status). The heel ring is the world-fixed **virtual target**; it and the left/right palm markers use the installed Spectacles Interaction Kit's `getPalmCenter()` world coordinates. Marker movement and alignment feedback need no pinch. On the headset, a pinch held for about 0.8 seconds (or “Next”) advances to COMPRESS; quick pinches and pinches with both hands together are ignored on screens 06, 07 and 09, because stacking hands can register as a pinch. The footer shows the hold progress. The compact screen 06 card sits above the target so the two do not overlap, and brief tracking dropouts no longer blink the markers or rewrite the card. Text and a visible ring distinguish tracking loss, approach, alignment, and approximate two-hand stacking. Say “Set target here” with a visible palm to reposition the virtual target for a manikin demo. This is manually placed geometry, not a verified physical chest-placement measurement. Tolerances and hold time are editable on the `SecondChanceDisplay` component attached to `Lighting`. Desktop simulated keys are `J` far, `K` target, `O` wrong depth, `R` right hand, `V` both, `L` lost, `T` set target, and `N` next. The hand provider initializes on Spectacles; visual marker movement and physical alignment remain unverified.

The `09 / AED PADS` lesson now has two virtual target rings and two pad graphics. A visible palm moves an unplaced pad continuously; holding it within the target's lateral and depth tolerances places it on that virtual target. Sustained tracking loss (over 0.25 s) hides a pad that has not been placed. A held pinch or “Next” advances. Desktop Preview can simulate hand movement with `J` (far), `K` (pad A target), `R` (pad B target), `O` (wrong depth), and `L` (tracking loss). These graphics and placement checks are training aids; they have not been calibrated to a physical manikin or verified on the headset. Follow the actual AED's pad diagram and prompts.

Say **“Locate CPR responder nearby”** to open a fictional responder map on Spectacles, or aim at `MAP / CPR RESPONDER SIM` on the Lens home card and pinch. It shows YOU, Volunteer A, and a sample route labeled `SIM`; “Back” or pinch returns to the lesson. The map uses no GPS, live responder directory, notifications, or dispatch. The **Rescue Specs** iPhone app also opens directly to an independent **Responders** simulation with a MapKit street basemap, three fictional volunteers, a sample route, and manual `Simulate request` / `Simulate arrival` controls. It uses fixed demo coordinates, not the phone's location, and needs no Spectacles pairing. Map tiles may require internet access.

For a **non-emergency outbound test call**, use the iPhone app's separate **Phone bridge** tab; the responder map needs no pairing. Keep `node server.js` running on this Mac and USB reverse port `4173` to Spectacles. On the same Wi-Fi network, enter the Mac address (currently `http://10.8.176.66:4173`) in the iPhone app and tap **Start local bridge**. Enter a non-emergency test number on the iPhone. Say **“Call my contact”** to the Lens; when the request reaches the phone, tap **Open iPhone call confirmation** and confirm in iOS. The number stays on the phone. The Lens knows only that the request reached the Mac, not whether a call connected. The current Lens uses the local bridge without Mobile Kit pairing. Mac-to-iPhone delivery has been seen on the phone, while the spoken Lens request is still being checked. The existing simulated call panel does not place a phone call.

Set the training region and number in `emergencyConfig` near the top of `SecondChanceDisplay.js` (both values are strings). Set `emergencyNumber` to `""` if unknown; the Lens then asks the wearer to call local emergency services on their phone. The artwork uses a region-neutral phone icon. The default United States / 911 is a **displayed training setting**, not a dialer. In desktop Preview, `C` opens the call panel, `F` changes focus, `N` selects, and `X` cancels. On Spectacles, aim at the call action and pinch; voice “Call emergency services” also opens it.

Open the project in Lens Studio while the app is closed, connect Spectacles over USB, and click **Preview Lens**. See [Snap's wired connection guide](https://developers.snap.com/spectacles/get-started/start-building/connecting-lens-studio-to-spectacles). Lens Studio compiled and sent the responder-map revision over USB, and the wearer confirmed opening its map by aiming and pinching. Preview can simulate next, call flow, and wrist motion; voice access to the map still needs a device retest.

For the current USB-connected AI demo, keep `node server.js` running on this Mac and forward the port with Lens Studio's bundled ADB: `adb reverse tcp:4173 tcp:4173`. Both Lens gateway inputs use `http://127.0.0.1:4173`, which reaches the Mac through that USB mapping; reconnecting the glasses may require redoing the mapping. The ignored `.env` contains the OpenAI key; the key is not included in the Lens. Local HTTP needs **Allow Experimental API** in Lens Studio Project Settings. For an untethered or publishable build, use a secured HTTPS gateway and verify headset connectivity. [Snap Internet Access](https://developers.snap.com/spectacles/about-spectacles-features/apis/internet-access)

### Lens Studio and Git LFS

Lens Studio writes `spectacles/SecondChance/.gitattributes`, which routes everything under `Assets/` and `Packages/` through Git LFS. This repository stores those files directly, so that file is ignored. Git still applies it locally, however, and images, audio and packages then show as modified even when unchanged. Committing them would upload LFS placeholder files instead of the real assets. Add this local override once per clone (it is never uploaded):

```bash
printf '%s\n' \
  'spectacles/SecondChance/Assets/** !filter !diff !merge' \
  'spectacles/SecondChance/Packages/** !filter !diff !merge' >> .git/info/attributes
```

See [project.md](./project.md) for status and next steps.

See [DEMO.md](./DEMO.md) for the timed six-reveal presentation script.

## License

Rescue Specs is released under the [MIT License](./LICENSE).

Third-party code keeps its own terms. The Spectacles Interaction Kit package in `spectacles/SecondChance/Packages/` and the Spectacles Kit SDK and sample app in `mobile/` come from Specs Inc.; see [mobile/SNAP-SAMPLES-LICENSE.md](./mobile/SNAP-SAMPLES-LICENSE.md), which also points to the Specs Developer Terms and the Lens Studio License Agreement.
