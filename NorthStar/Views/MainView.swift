import SwiftUI

/// The primary view of NorthStar. Designed for maximum clarity and minimum
/// cognitive load: full-screen camera background, large status text, and a
/// single giant "Help Me" button.
struct MainView: View {

    @EnvironmentObject var orchestrator: AgentOrchestrator

    var body: some View {
        ZStack {
            // MARK: - Camera Background
            CameraPreviewView(cameraService: orchestrator.cameraService)
                .ignoresSafeArea()

            // Soft gradient overlay so text is always readable
            LinearGradient(
                colors: [
                    Color.black.opacity(0.3),
                    Color.clear,
                    Color.black.opacity(0.5)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // MARK: - Status & Response Overlays
            StatusOverlay()
                .environmentObject(orchestrator)

            // MARK: - Top Bar
            VStack {
                topBar
                Spacer()
            }

            // MARK: - Bottom Controls
            VStack {
                Spacer()
                bottomControls
                    .padding(.bottom, 48)
            }

            // MARK: - Caregiver Escalation Overlay
            if orchestrator.currentMode == .caregiverEscalation {
                CaregiverAlertView()
                    .environmentObject(orchestrator)
                    .transition(.opacity)
                    .zIndex(10)
            }
        }
        .onAppear {
            orchestrator.cameraService.start()
        }
        .animation(.easeInOut(duration: 0.35), value: orchestrator.currentMode)
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            // Mode indicator
            modeIndicator

            Spacer()

            // Caregiver alert button (discreet)
            Button {
                let generator = UIImpactFeedbackGenerator(style: .heavy)
                generator.impactOccurred()
                orchestrator.escalateToCaregiver(reason: "Manual caregiver request")
            } label: {
                Image(systemName: "person.crop.circle.badge.exclamationmark.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white.opacity(0.7))
                    .padding(12)
                    .background(
                        Circle()
                            .fill(Color.white.opacity(0.15))
                    )
            }
            .accessibilityLabel("Contact caregiver")
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }

    // MARK: - Mode Indicator

    private var modeIndicator: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(modeColor)
                .frame(width: 10, height: 10)

            Text(modeLabel)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Capsule()
                .fill(Color.black.opacity(0.4))
        )
    }

    private var modeLabel: String {
        switch orchestrator.currentMode {
        case .idle:
            return "Ready"
        case .listening:
            return "Listening"
        case .assisting:
            return "Assisting"
        case .monitoring:
            return "Watching"
        case .caregiverEscalation:
            return "Escalating"
        }
    }

    private var modeColor: Color {
        switch orchestrator.currentMode {
        case .idle, .monitoring:
            return Color(red: 0.35, green: 0.55, blue: 0.85)
        case .listening:
            return Color(red: 0.35, green: 0.75, blue: 0.45)
        case .assisting:
            return Color(red: 0.90, green: 0.65, blue: 0.25)
        case .caregiverEscalation:
            return Color(red: 0.85, green: 0.35, blue: 0.35)
        }
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        VStack(spacing: 20) {
            // Help button
            HelpButton(currentMode: orchestrator.currentMode) {
                switch orchestrator.currentMode {
                case .idle, .monitoring:
                    orchestrator.activateListening()
                default:
                    break
                }
            }

            // Stop button (only visible during an active session)
            if orchestrator.isSessionActive && orchestrator.currentMode != .caregiverEscalation {
                Button {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    orchestrator.stopSession()
                } label: {
                    Text("Stop")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(.white.opacity(0.85))
                        .padding(.horizontal, 32)
                        .padding(.vertical, 12)
                        .background(
                            Capsule()
                                .fill(Color.white.opacity(0.2))
                        )
                }
                .accessibilityLabel("Stop current session")
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
    }
}
