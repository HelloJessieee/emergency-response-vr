import SwiftUI

struct SessionView: View {
    @EnvironmentObject private var model: Model
    var bonding: BondingData

    var body: some View {
        Form {
            Text(model.status)
            Button(model.sessionStarted ? "Stop session" : "Start session") {
                if model.sessionStarted { model.stopSession() }
                else { model.startSession(binding: bonding) }
            }
        }
        .navigationTitle("Second Chance")
    }
}
