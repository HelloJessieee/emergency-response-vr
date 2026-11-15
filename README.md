# SECOND CHANCE

Browser based AR response simulator for a hackathon demonstration with CPR mannequins and AED trainers. This is **not a medical device** or a live emergency response service.

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
4. Select a fictional AED trainer location and inspect the simulated route.
5. Start the visual CPR rhythm. Tap the button or press Space to see practice tap rate. The app does not measure compression depth or recoil.
6. Mark the AED trainer as arrived, then confirm its training steps. The AED trainer gives the operative prompts; the app never decides whether a shock is needed.
7. Copy the session URL and open it in another browser or phone on the same reachable host. Assign roles, then close a teammate's tab to show role reassignment.
8. In **Training Assistant**, ask “What’s next?” or “Who is doing what?” The answer reads the live demo session. CPR, AED, mock calling, and real-emergency questions use fixed training copy.

For a second device on the same Wi-Fi, find the Mac's LAN address and open `http://<your-mac-ip>:4173/?session=<same-id>`. The server listens on port 4173; a local firewall prompt may appear.

## Training assistant API

The browser demo exposes `POST /api/assistant` and a question panel. Without an API key it returns a clearly labeled local scripted answer, so the demo works offline. To enable OpenAI, copy `.env.example` to `.env`, set `OPENAI_API_KEY`, and restart `npm start`. The `.env` file is ignored by Git and loaded only on the server. Team-role summaries can be rephrased by the Responses API; `OPENAI_MODEL` defaults to `gpt-6-luna`. The server sends only an approved role summary and language for this text feature, not the raw question or full session.

The browser also offers three optional media tools: a short recorded or uploaded question through `POST /api/transcribe` (`gpt-4o-mini-transcribe`), training-prop photo classification through `POST /api/vision` (`gpt-5-mini`), and reading an approved training answer through `POST /api/speech` (`gpt-4o-mini-tts`). Selected audio and images are sent to OpenAI only when the user presses a media button. The visual classifier returns only a fixed equipment category and never updates the simulation. Media requests are capped at 2 MB and rate limited. AI endpoints work on localhost by default; set `AI_ALLOW_LAN=1` only for a trusted local-network demo. Browser microphone recording requires localhost or HTTPS; audio file upload remains available.

The model never updates workflow state or supplies free-form CPR, AED, simulated-call, or real-emergency instructions. The browser media features are for training equipment and approved demo copy, not emergency decisions. The Spectacles Lens now has an experimental request to `/api/lens/ask`; the server maps model classification to a fixed training card. This has passed local tests but has not been verified on Spectacles. The current local HTTP address requires Experimental APIs for testing and cannot be published; a reachable HTTPS backend and on-device testing are needed for a release.

## Architecture

- `shared/engine.js`: deterministic event reducer, AED demo locations, task model, and training sequence.
- `server.js`: small Node HTTP and WebSocket server. It owns session state, broadcasts snapshots, and serves the simulator.
- `public/`: responsive browser interface with an AR-style training view, simulated floor map, optional browser speech commands, and shared team controls.
- `tests/`: critical state transitions and guardrails.
- `shared/training-assistant.js`: bounded question routing and current-state answers. The server can optionally rephrase role summaries through a model API.
- `shared/media-gateway.js`: bounded image classification, speech transcription, and text-to-speech calls.

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
| Vision and audio | Browser prop-photo classification and transcription; the Lens can play an approved training card through server-side speech synthesis |

Medical copy is limited to an adult training scenario and follows [American Heart Association adult basic life support guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support) and [Red Cross AED steps](https://www.redcross.org/take-a-class/aed/using-an-aed/aed-steps). In any real emergency, call local emergency services directly and follow dispatcher and AED instructions. Do not wait for this prototype.

## Spectacles prototype

The native [Lens Studio project](./spectacles/SecondChance/SecondChance.esproj) runs on Spectacles (2024). Its expanded training flow covers voice activation, scene safety, response and breathing branches, call and bystander prompts, simulated AED routing, CPR rhythm, AED steps, and adaptive user-reported task status. It has an offline emergency-call **training** panel with a simulated ringing state and three captioned dispatcher prompts. Saying “Ask AI how fast should I do CPR?” opens a cyan training card and requests a server-classified answer; approved text can also play as speech on the headset. The wearer confirmed English “Next” and a CPR-rate question on an earlier build. The expanded call, AI, audio, and wrist-motion features pass local checks but have not been validated on the device. The [exported Lens zip](./spectacles/build/SecondChance.zip) matches the current script. The Lens does not place a real call, find a live AED, align to a mannequin, or measure compression depth or force.

Set the training region and number in `emergencyConfig` near the top of `SecondChanceDisplay.js` (both values are strings). Set `emergencyNumber` to `""` if unknown; the Lens then asks the wearer to call local emergency services on their phone. The artwork uses a region-neutral phone icon. The default United States / 911 is a **displayed training setting**, not a dialer. In desktop Preview, `C` opens the call panel, `F` changes focus, `N` selects, and `X` cancels. On Spectacles, aim at the call action and pinch; voice “Call emergency services” also opens it.

Open the project in Lens Studio while the app is closed, connect Spectacles over USB, and click **Preview Lens**. See [Snap's wired connection guide](https://developers.snap.com/spectacles/get-started/start-building/connecting-lens-studio-to-spectacles). The editor has repeatedly crashed while opening this expanded project on this Mac, though CLI export succeeds. Preview can simulate next, call flow, and wrist motion; wearable ASR, pinch, layout fit, and tracking still need a connected pair.

For the current local AI demo, keep `node server.js` running on this Mac and set the Lens script's `aiBaseUrl` to the Mac's reachable LAN address. The configured test address is `http://10.27.176.77:4173`. The ignored `.env` contains the OpenAI key and `AI_ALLOW_LAN=1`; neither the key nor model output is included in the Lens. Local HTTP needs **Allow Experimental API** in Lens Studio Project Settings. For a publishable build, use HTTPS and verify the connected headset. [Snap Internet Access](https://developers.snap.com/spectacles/about-spectacles-features/apis/internet-access)

See [project.md](./project.md) for status and next steps.

See [DEMO.md](./DEMO.md) for the timed six-reveal presentation script.
