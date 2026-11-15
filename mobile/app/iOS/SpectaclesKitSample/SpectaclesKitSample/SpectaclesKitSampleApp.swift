import SwiftUI
import MapKit

@main
struct SpectaclesKitSampleApp: App {
    @StateObject private var model = Model()

    var body: some Scene {
        WindowGroup {
            TabView {
                ResponderSimulationView()
                    .tabItem { Label("Responders", systemImage: "map") }
                NavigationStack {
                Form {
                    Section("Test destination") {
                        TextField("Non-emergency phone number", text: $model.phoneNumber)
                            .keyboardType(.phonePad)
                        Text("Stored on this iPhone. The Lens never receives the number.")
                            .font(.footnote)
                    }
                    Section("Spectacles") {
                        Button("Pair with SECOND CHANCE") { model.bind() }
                        ForEach(model.bondings) { bonding in
                            HStack {
                                Text("Paired Lens")
                                Spacer()
                                Button("Unpair") { model.unbind(id: bonding.id) }
                            }
                            Button(model.sessionStarted ? "Stop session" : "Start session") {
                                if model.sessionStarted { model.stopSession() }
                                else { model.startSession(binding: bonding) }
                            }
                        }
                    }
                    Section("Local bridge · no pairing") {
                        TextField("Mac address", text: $model.localBridgeURL)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.URL)
                        Button(model.bridgeListening ? "Stop local bridge" : "Start local bridge") {
                            if model.bridgeListening { model.stopLocalBridge() }
                            else { model.startLocalBridge() }
                        }
                        Text("Keep this app open and connect iPhone and Mac to the same network.")
                            .font(.footnote)
                    }
                    Section("Call request") {
                        Text(model.status)
                        if model.pendingCall {
                            Button("Open iPhone call confirmation") { model.openDialer() }
                                .disabled(model.normalizedNumber == nil)
                        }
                    }
                }
                .navigationTitle("Second Chance Phone")
                }
                .tabItem { Label("Phone bridge", systemImage: "phone.connection") }
            }
            .environmentObject(model)
            .onOpenURL { model.pushDeeplinkURL(url: $0) }
        }
    }
}

private struct DemoResponder {
    let name: String
    let role: String
    let distance: String
    let eta: String
    let coordinate: CLLocationCoordinate2D
}

private struct ResponderSimulationView: View {
    @State private var selected = 0
    @State private var stage = 0

    private let responders: [DemoResponder] = [
        .init(name: "Volunteer A", role: "CPR trained", distance: "60 m", eta: "1 min",
              coordinate: .init(latitude: 37.78847, longitude: -122.40718)),
        .init(name: "Volunteer B", role: "AED runner", distance: "110 m", eta: "2 min",
              coordinate: .init(latitude: 37.78853, longitude: -122.40849)),
        .init(name: "Volunteer C", role: "First aid trained", distance: "180 m", eta: "3 min",
              coordinate: .init(latitude: 37.78938, longitude: -122.40852))
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 7) {
                        Text("TRAINING SIMULATION")
                            .font(.caption.weight(.bold)).tracking(2)
                            .foregroundStyle(.cyan)
                        Text("Nearby responders")
                            .font(.largeTitle.weight(.bold))
                        Text("Fictional people and distances for CPR practice.")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }

                    mapPanel
                        .frame(height: 385)
                        .clipShape(RoundedRectangle(cornerRadius: 24))

                    HStack {
                        Label(stage == 0 ? "Available" : stage == 1 ? "En route" : "On scene",
                              systemImage: stage == 2 ? "checkmark.circle.fill" : "circle.fill")
                            .font(.subheadline.weight(.semibold))
                        Spacer()
                        Text(stage == 2 ? "ARRIVED · SIM" : responders[selected].eta + " DEMO ETA")
                            .font(.caption.weight(.bold)).foregroundStyle(.secondary)
                    }

                    ForEach(responders.indices, id: \.self) { index in
                        Button {
                            selected = index
                            stage = 0
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: index == selected ? "person.crop.circle.fill" : "person.crop.circle")
                                    .font(.title2)
                                    .foregroundStyle(index == selected ? .cyan : .secondary)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(responders[index].name).font(.headline)
                                    Text(responders[index].role).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(responders[index].distance)
                                    .font(.subheadline.monospacedDigit().weight(.semibold))
                            }
                            .padding(15)
                            .background(index == selected ? Color.cyan.opacity(0.14) : Color.secondary.opacity(0.10),
                                        in: RoundedRectangle(cornerRadius: 17))
                        }
                        .buttonStyle(.plain)
                    }

                    Button(stage == 0 ? "Simulate request" : stage == 1 ? "Simulate arrival" : "Reset simulation") {
                        stage = stage == 2 ? 0 : stage + 1
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.cyan)
                    .controlSize(.large)
                    .frame(maxWidth: .infinity)

                    Text("SIMULATION ONLY · Demo map area and fictional responders. No GPS, responder directory, messages, or dispatch. For a real emergency, contact local emergency services.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.bottom, 16)
                }
                .padding(20)
            }
            .background(Color(red: 0.035, green: 0.065, blue: 0.095))
            .preferredColorScheme(.dark)
            .navigationBarHidden(true)
        }
    }

    private var mapPanel: some View {
        ZStack(alignment: .topLeading) {
            ResponderStreetMap(selected: selected, stage: stage, responders: responders) { index in
                selected = index
                stage = 0
            }
            VStack(alignment: .leading, spacing: 5) {
                Text("DEMO MAP · SAN FRANCISCO")
                    .font(.caption2.weight(.black)).tracking(1.2)
                Text("Fictional responders · no live location")
                    .font(.caption2.weight(.medium))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(.black.opacity(0.80), in: RoundedRectangle(cornerRadius: 12))
            .padding(14)
        }
        .accessibilityLabel("Simulated street map with three fictional responders")
    }
}

private final class DemoMapPin: NSObject, MKAnnotation {
    let coordinate: CLLocationCoordinate2D
    let title: String?
    let index: Int

    init(coordinate: CLLocationCoordinate2D, title: String, index: Int) {
        self.coordinate = coordinate
        self.title = title
        self.index = index
    }
}

private struct ResponderStreetMap: UIViewRepresentable {
    let selected: Int
    let stage: Int
    let responders: [DemoResponder]
    let onSelect: (Int) -> Void

    private let scene = CLLocationCoordinate2D(latitude: 37.78802, longitude: -122.40750)

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> MKMapView {
        let map = MKMapView(frame: .zero)
        map.delegate = context.coordinator
        map.mapType = .mutedStandard
        map.showsUserLocation = false
        map.isRotateEnabled = false
        map.isPitchEnabled = false
        map.showsCompass = false
        map.pointOfInterestFilter = .excludingAll
        map.setRegion(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 37.78865,
                                                                        longitude: -122.40795),
                                         span: MKCoordinateSpan(latitudeDelta: 0.0037,
                                                                longitudeDelta: 0.0048)), animated: false)
        return map
    }

    func updateUIView(_ map: MKMapView, context: Context) {
        context.coordinator.parent = self
        guard context.coordinator.lastSelected != selected ||
              context.coordinator.lastStage != stage || map.annotations.isEmpty else { return }
        context.coordinator.lastSelected = selected
        context.coordinator.lastStage = stage
        map.removeAnnotations(map.annotations.filter { !($0 is MKUserLocation) })
        map.removeOverlays(map.overlays)
        map.addAnnotation(DemoMapPin(coordinate: scene, title: "YOU · simulated scene", index: -1))
        map.addAnnotations(responders.enumerated().map { index, responder in
            DemoMapPin(coordinate: responder.coordinate,
                       title: "\(responder.name) · \(responder.role)", index: index)
        })

        let destination = responders[selected].coordinate
        var route = [scene,
                     CLLocationCoordinate2D(latitude: scene.latitude,
                                            longitude: destination.longitude),
                     destination]
        let line = MKPolyline(coordinates: &route, count: route.count)
        line.title = "Illustrative demo route"
        map.addOverlay(line)
    }

    final class Coordinator: NSObject, MKMapViewDelegate {
        var parent: ResponderStreetMap
        var lastSelected = -1
        var lastStage = -1

        init(_ parent: ResponderStreetMap) { self.parent = parent }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard let pin = annotation as? DemoMapPin else { return nil }
            let identifier = "DemoResponderPin"
            let view = (mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView)
                ?? MKMarkerAnnotationView(annotation: pin, reuseIdentifier: identifier)
            view.annotation = pin
            view.canShowCallout = true
            view.displayPriority = .required
            view.markerTintColor = pin.index == -1 ? .systemRed :
                pin.index == parent.selected ? .systemCyan : .systemBlue
            view.glyphText = pin.index == -1 ? "+" : String(UnicodeScalar(65 + pin.index)!)
            view.glyphTintColor = .white
            return view
        }

        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            let renderer = MKPolylineRenderer(overlay: overlay)
            renderer.strokeColor = .systemCyan
            renderer.lineWidth = 5
            renderer.lineDashPattern = [8, 6]
            return renderer
        }

        func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
            guard let pin = view.annotation as? DemoMapPin, pin.index >= 0,
                  pin.index != parent.selected else { return }
            parent.onSelect(pin.index)
        }
    }
}
