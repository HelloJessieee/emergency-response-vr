// RESCUE SPECS — mannequin and AED-trainer demo only.
// Attach this script to a Scene Object in Lens Studio and assign three Text components.
// @input Component.Text heading
// @input Component.Text instruction
// @input Component.Text footer

var steps = [
    {
        heading: "RESCUE SPECS",
        instruction: "TRAINING MODE\nUse a CPR mannequin and AED trainer.",
        footer: "Primary input: start"
    },
    {
        heading: "01 / CHECK",
        instruction: "Check scene safety.\nCheck responsiveness and breathing.",
        footer: "Primary input: next"
    },
    {
        heading: "02 / CALL",
        instruction: "Simulate calling emergency services.\nAsk a teammate to bring the AED trainer.",
        footer: "Demo only — no call is placed"
    },
    {
        heading: "03 / CPR",
        instruction: "Practice compressions on the mannequin.\nFollow your instructor's guidance.",
        footer: "Primary input: next"
    },
    {
        heading: "04 / AED",
        instruction: "Turn on the AED trainer.\nFollow its spoken prompts.",
        footer: "The trainer decides the next step"
    }
];

var currentStep = 0;

function renderStep() {
    var step = steps[currentStep];
    if (script.heading) { script.heading.text = step.heading; }
    if (script.instruction) { script.instruction.text = step.instruction; }
    if (script.footer) { script.footer.text = step.footer; }
    print("RESCUE SPECS training step " + currentStep);
}

renderStep();
script.createEvent("TriggerPrimaryEvent").bind(function () {
    currentStep = (currentStep + 1) % steps.length;
    renderStep();
});
