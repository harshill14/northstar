import SwiftUI

/// Full-screen overlay displayed when a caregiver escalation is triggered.
/// Shows a calming but prominent alert with connection status.
struct CaregiverAlertView: View {

    @EnvironmentObject var orchestrator: AgentOrchestrator

    @State private var isConnected: Bool = false
    @State private var dotCount: Int = 0
    @State private var borderOpacity: Double = 0.6

    // Timer to simulate connection progress
    let connectTimer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            // Dimmed background
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            // Alert card
            VStack(spacing: 32) {

                // Icon
                Image(systemName: isConnected ? "phone.connection.fill" : "phone.arrow.up.right.fill")
                    .font(.system(size: 56))
                    .foregroundColor(.white)
                    .padding(.top, 8)

                // Title
                if isConnected {
                    Text("Connected to \(orchestrator.caregiverName)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .transition(.opacity)
                } else {
                    Text("Connecting to Caregiver\(animatedDots)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                }

                // Reason
                if !orchestrator.escalationReason.isEmpty {
                    VStack(spacing: 8) {
                        Text("Concern Detected")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))

                        Text(orchestrator.escalationReason)
                            .font(.system(size: 20, weight: .medium, design: .rounded))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                    }
                    .padding(.horizontal, 16)
                }

                // Status indicator
                if !isConnected {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(1.4)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(Color(red: 0.35, green: 0.80, blue: 0.45))
                        .transition(.scale.combined(with: .opacity))
                }

                // Cancel button
                Button {
                    let generator = UIImpactFeedbackGenerator(style: .medium)
                    generator.impactOccurred()
                    orchestrator.cancelEscalation()
                } label: {
                    Text("Cancel")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.2))
                        )
                }
                .accessibilityLabel("Cancel caregiver alert")
                .padding(.horizontal, 8)
            }
            .padding(32)
            .frame(maxWidth: 360)
            .background(
                RoundedRectangle(cornerRadius: 28)
                    .fill(Color(red: 0.15, green: 0.15, blue: 0.18))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 28)
                    .stroke(alertBorderColor, lineWidth: 3)
                    .opacity(borderOpacity)
            )
            .padding(.horizontal, 24)
        }
        .onReceive(connectTimer) { _ in
            // Animate dots
            dotCount = (dotCount + 1) % 4

            // Pulse border
            withAnimation(.easeInOut(duration: 0.5)) {
                borderOpacity = borderOpacity == 0.6 ? 1.0 : 0.6
            }
        }
        .onAppear {
            // Simulate connection after 3 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                withAnimation(.easeInOut(duration: 0.4)) {
                    isConnected = true
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: isConnected)
    }

    // MARK: - Helpers

    private var animatedDots: String {
        String(repeating: ".", count: dotCount)
    }

    private var alertBorderColor: Color {
        Color(red: 0.90, green: 0.40, blue: 0.25)  // Red-orange
    }
}
