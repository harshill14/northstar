import SwiftUI

/// A large, accessible circular button designed for minimal cognitive load.
/// Changes appearance based on the current app mode.
struct HelpButton: View {

    let currentMode: AppMode
    let action: () -> Void

    // Pulsing animation state
    @State private var isPulsing: Bool = false

    // MARK: - Computed Properties

    private var buttonColor: Color {
        switch currentMode {
        case .idle, .monitoring:
            return Color(red: 0.35, green: 0.55, blue: 0.85)   // Calming blue
        case .listening:
            return Color(red: 0.35, green: 0.75, blue: 0.45)   // Soft green
        case .assisting:
            return Color(red: 0.90, green: 0.65, blue: 0.25)   // Warm orange
        case .caregiverEscalation:
            return Color(red: 0.85, green: 0.35, blue: 0.35)   // Muted red
        }
    }

    private var label: String {
        switch currentMode {
        case .idle, .monitoring:
            return "Help Me"
        case .listening:
            return "Listening..."
        case .assisting:
            return "Thinking..."
        case .caregiverEscalation:
            return "Alert Sent"
        }
    }

    private var iconName: String {
        switch currentMode {
        case .idle, .monitoring:
            return "hand.raised.fill"
        case .listening:
            return "mic.fill"
        case .assisting:
            return "ellipsis"
        case .caregiverEscalation:
            return "phone.fill"
        }
    }

    private var shouldPulse: Bool {
        currentMode == .idle || currentMode == .monitoring
    }

    // MARK: - Body

    var body: some View {
        Button(action: {
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            action()
        }) {
            VStack(spacing: 8) {
                if currentMode == .assisting {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(1.5)
                } else {
                    Image(systemName: iconName)
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundColor(.white)
                }

                Text(label)
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
            .frame(width: 140, height: 140)
            .background(
                Circle()
                    .fill(buttonColor)
                    .shadow(color: buttonColor.opacity(0.5), radius: 12, x: 0, y: 4)
            )
            .clipShape(Circle())
            .scaleEffect(isPulsing && shouldPulse ? 1.05 : 1.0)
            .animation(
                shouldPulse
                    ? .easeInOut(duration: 1.5).repeatForever(autoreverses: true)
                    : .easeInOut(duration: 0.3),
                value: isPulsing
            )
        }
        .accessibilityLabel(Text("Help Me button. \(label)"))
        .accessibilityHint(Text("Double tap to ask for help"))
        .onAppear {
            isPulsing = true
        }
    }
}
