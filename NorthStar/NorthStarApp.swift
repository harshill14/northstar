import SwiftUI

@main
struct NorthStarApp: App {
    @StateObject private var orchestrator = AgentOrchestrator()

    var body: some Scene {
        WindowGroup {
            MainView()
                .environmentObject(orchestrator)
                .preferredColorScheme(.light)
        }
    }
}
