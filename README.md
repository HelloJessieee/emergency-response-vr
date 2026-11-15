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

The model never updates workflow state or answers CPR, AED, simulated-call, or real-emergency questions. The browser media features are for training equipment and approved demo copy, not emergency decisions. The current local HTTP server is for a trusted demo network; connecting the Spectacles Lens to it will require a reachable HTTPS deployment and on-device testing.

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
| Language model | Optional server-side Responses API for team-role wording; scripted fallback is always available |
| Vision and audio | Optional browser companion tools for training props and approved text; not wired into the Spectacles Lens |

Medical copy is limited to an adult training scenario and follows [American Heart Association adult basic life support guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support) and [Red Cross AED steps](https://www.redcross.org/take-a-class/aed/using-an-aed/aed-steps). In any real emergency, call local emergency services directly and follow dispatcher and AED instructions. Do not wait for this prototype.

## Spectacles prototype

The native [Lens Studio project](./spectacles/SecondChance/SecondChance.esproj) runs on connected Spectacles (2024). The current Lens has an illustrated, voice and pinch controlled training scenario. The wearer confirmed that English “Next” advances and that a CPR rate question shows the bounded training answer. It also includes a wrist-motion practice prototype using Spectacles Interaction Kit; this has passed local state tests but has not been validated as a CPR measurement on the device. The Lens has no OpenAI connection, real call, mannequin alignment, or compression depth/force sensor. The [exported Lens zip](./spectacles/build/SecondChance.zip) matches the current script; full field-of-view fit and the latest motion flow still need wearable testing.

Open the project in Lens Studio while the app is closed, connect Spectacles over USB, and click **Preview Lens**. See [Snap's wired connection guide](https://developers.snap.com/spectacles/get-started/start-building/connecting-lens-studio-to-spectacles). The editor's desktop preview cannot run the wearable-only pinch API; test hand input on the glasses. Lens Studio 5.15.4 has intermittently crashed during scene edits on this Mac, so the project script is maintained as a source file and the exported zip is rebuilt from it.

See [project.md](./project.md) for status and next steps.

See [DEMO.md](./DEMO.md) for the timed six-reveal presentation script.
