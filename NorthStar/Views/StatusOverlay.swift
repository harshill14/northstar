import SwiftUI

/// Overlay that displays detected objects, agent messages, and safety alerts
/// with gentle, calming animations.
struct StatusOverlay: View {

    @EnvironmentObject var orchestrator: AgentOrchestrator

    // Controls the fade-in of the spoken response text
    @State private var responseOpacity: Double = 0

    var body: some View {
        ZStack {
            // MARK: - Detected Objects (top)
            VStack {
                detectedObjectsPills
                Spacer()
            }
            .padding(.top, 100)

            // MARK: - Agent Spoken Response (center)
            if !orchestrator.spokenResponse.isEmpty {
                agentResponseCard
                    .opacity(responseOpacity)
                    .onAppear {
                        withAnimation(.easeIn(duration: 0.6)) {
                            responseOpacity = 1
                        }
                    }
                    .onChange(of: orchestrator.spokenResponse) { _ in
                        responseOpacity = 0
                        withAnimation(.easeIn(duration: 0.6)) {
                            responseOpacity = 1
                        }
                    }
            }

            // MARK: - Safety Alerts (bottom area, above the help button)
            VStack {
                Spacer()
                safetyAlertBanners
                    .padding(.bottom, 200) // Room for the help button
            }
        }
        .allowsHitTesting(true)
    }

    // MARK: - Detected Objects Pills

    private var detectedObjectsPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(orchestrator.detectedObjects.prefix(6)) { object in
                    Text(object.label)
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.9))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(Color.white.opacity(0.2))
                        )
                }
            }
            .padding(.horizontal, 20)
        }
    }

    // MARK: - Agent Response Card

    private var agentResponseCard: some View {
        Text(orchestrator.spokenResponse)
            .font(.system(size: 26, weight: .medium, design: .rounded))
            .foregroundColor(.white)
            .multilineTextAlignment(.center)
            .lineSpacing(6)
            .padding(28)
            .frame(maxWidth: 340)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color.black.opacity(0.55))
            )
            .padding(.horizontal, 24)
    }

    // MARK: - Safety Alert Banners

    private var safetyAlertBanners: some View {
        VStack(spacing: 10) {
            ForEach(orchestrator.safetyAlerts.prefix(3)) { alert in
                safetyBanner(for: alert)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.4), value: orchestrator.safetyAlerts.map(\.id))
    }

    private func safetyBanner(for alert: SafetyAlert) -> some View {
        let bannerColor: Color = alert.requiresEscalation
            ? Color(red: 0.85, green: 0.25, blue: 0.25)   // Red for critical
            : Color(red: 0.90, green: 0.75, blue: 0.20)   // Yellow for warning

        let iconName = alert.requiresEscalation ? "exclamationmark.triangle.fill" : "exclamationmark.circle.fill"

        return HStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 22))
                .foregroundColor(.white)

            Text(alert.message)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundColor(.white)
                .lineLimit(2)

            Spacer()

            Button {
                orchestrator.dismissAlert(alert)
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white.opacity(0.7))
            }
            .accessibilityLabel("Dismiss alert")
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(bannerColor.opacity(0.9))
        )
        .padding(.horizontal, 20)
    }
}
