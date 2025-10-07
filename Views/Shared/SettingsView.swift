import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section("Account") {
                    HStack {
                        Image(systemName: "person.circle")
                        Text("Profile")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                }

                Section("Game Settings") {
                    HStack {
                        Image(systemName: "gamecontroller")
                        Text("Default Game Mode")
                        Spacer()
                        Text("Classic")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Image(systemName: "speaker.wave.2")
                        Text("Sound Effects")
                        Spacer()
                        Toggle("", isOn: .constant(true))
                    }
                }

                Section("Support") {
                    HStack {
                        Image(systemName: "questionmark.circle")
                        Text("Help & FAQ")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Image(systemName: "envelope")
                        Text("Contact Support")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// #Preview {
//     SettingsView()
// }
