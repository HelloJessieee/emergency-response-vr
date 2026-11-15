# SECOND CHANCE — 4-minute live demo

## Prepare

1. Run `npm start` and open `http://localhost:4173` in the main browser.
2. Place a CPR mannequin and an AED **trainer** in the demonstration area. The map locations in the app are fictional.
3. Open the same session URL in a second browser or phone on the same reachable network. Keep both views open.
4. On the main view, click **Reset demo** immediately before presenting. If browser voice recognition is unavailable, use the on-screen controls.

For the Spectacles walkthrough, connect the glasses by USB, open `spectacles/SecondChance/SecondChance.esproj` in Lens Studio, and click **Preview Lens**. The wearer advances by pinching thumb and index finger on either hand. On the hand-practice screens (06 HAND POSITION, 07 COMPRESS, 09 AED PADS), hold the pinch for about 0.8 seconds with the hands apart, or say “Next”; quick or stacked-hand pinches are ignored there. The Lens is a training overlay; its mock dispatcher never places a call, and its CPR beat is a visual cue rather than measured feedback.

## Spectacles walkthrough

Start on `SECOND CHANCE`, then pinch through `CHECK`, `CALL`, `MOCK CALL`, `CPR`, `AED`, `PADS`, `CLEAR`, `FOLLOW`, and `COMPLETE`. On the `CALL` screen, the next pinch enters the clearly labeled simulated dispatcher state. On `CPR`, watch the simulated 110 BPM cue while using a mannequin. The AED stages are for an AED trainer; follow the trainer's own prompts and pinch only after each physical training step is complete. The final pinch restarts the Lens.

## Six reveals

| Time | Presenter action | What the audience sees |
| --- | --- | --- |
| 0:00 | Say “Emergency mode” or click **Activate emergency mode**. | High-contrast training response view and timeline. |
| 0:30 | Confirm **Unresponsive / Not breathing normally** on the mannequin. Click **Connect mock dispatcher**, then confirm. | Assessment record and a clearly labeled simulated dispatcher. No real call is placed. |
| 1:00 | Open **AED MAP**, select **Lobby desk**, and point out the fictional route. | Training floor map, AED trainer location, and uncertainty label. |
| 1:30 | Open **CPR COACH** and click **Start visual rhythm**. Tap the practice button or Space while a teammate demonstrates compressions on the mannequin. | 110 BPM visual pulse and practice tap tempo. No compression depth or recoil claim. |
| 2:10 | In **AED MAP**, click **Mark trainer arrived**. Advance the AED trainer steps while following the physical trainer's own prompts. | Pad-placement illustration, clear-for-analysis step, and trainer-led sequence. The app makes no shock decision. |
| 3:10 | Open **TEAM**. Show two participants and task roles. Close the second participant's browser tab. | Shared session updates and the departed person's role is released. |

## Closing line

“SECOND CHANCE turns an uncoordinated group of bystanders into a connected training team. The next step is to validate this interface on actual Spectacles and real training equipment.”

## Fallbacks

- **No Spectacles or tracking:** The browser viewport is the primary MVP and can run the complete story.
- **No voice support:** Use the visible activation and action buttons.
- **No second device or Wi-Fi:** Open the same session URL in a second browser window on the same Mac. Close it for the departure reveal.
- **Server reconnects or restarts:** Reload both tabs, reset the demo, and begin again. In-memory session state is not durable.

## Safety cue for presenter

Say “training mannequin,” “AED trainer,” and “mock dispatcher” aloud. Never dial 911 during the demonstration. For a real emergency, call local emergency services directly and follow dispatcher and AED instructions.
