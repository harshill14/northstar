# 🧠 Memory Companion — React Native

AI-powered memory assistance app for Alzheimer's patients.  
Live camera streaming → Multi-agent orchestration → Real-time calming voice guidance.

---

## Architecture

```
React Native App (iOS + Android)
│
├── WelcomeScreen      → Setup, URL config, ethics consent
├── ConnectingScreen   → WS handshake animation
└── SessionScreen      → Live camera + agent UI
    │
    ├── RNCamera           Captures JPEG frames at ~2fps
    ├── WebSocketService   Binary frame streaming + JSON events
    ├── SpeechService      On-device STT via react-native-voice
    ├── TTSService         Agent responses spoken aloud
    └── Zustand Store      Global session state machine
              │
              │ ws://host:8765
              ▼
    Python Agent Server (../server/server.py)
    ├── Agent A (Observer)      Claude Vision — analyzes frames
    ├── Agent B (Context)       Synthesizes speech + visual history
    └── Agent C (Communicator)  Calm, clear patient-facing response
```

### Screen Flow

```
idle ──START──► connecting ──2s──► active ◄──────────────┐
                                     │                    │
                                  listening            agentSpeaking
                                     │                    │
                                   [speech]──────────────►┘
                                     │
                              [caregiver btn]
                                     │
                                  escalated ──dismiss──► active
```

### WebSocket Binary Frame Format

```
[4 bytes: 'VFRM'] [8 bytes: uint64 timestamp ms LE] [JPEG payload]
```

---

## Quick Start

### 1. Start the Python server

```bash
cd ../server
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python3 server.py
# → Listening on ws://0.0.0.0:8765
```

### 2. Install JS dependencies

```bash
npm install
```

### 3. iOS setup

```bash
cd ios && pod install && cd ..

# Find your Mac's LAN IP:
ipconfig getifaddr en0   # Wi-Fi
# e.g. 192.168.1.42

npx react-native run-ios --device
```

In the app → Advanced Settings → enter `ws://192.168.1.42:8765`

### 4. Android setup

```bash
# Enable developer mode + USB debugging on device
npx react-native run-android
```

---

## Native Library Setup Notes

### react-native-camera (RNCamera)

iOS — add to `ios/Podfile`:
```ruby
pod 'react-native-camera', path: '../node_modules/react-native-camera', subspecs: ['BarcodeDetectorMLKit']
```

Android — add to `android/app/build.gradle`:
```groovy
android {
  defaultConfig {
    missingDimensionStrategy 'react-native-camera', 'general'
  }
}
```

### react-native-voice

iOS — no extra steps after `pod install`.

Android — add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
```

### react-native-tts

iOS — works out of the box with system voices.

Android — ensure Google TTS is installed on device.

### react-native-reanimated

Add to `babel.config.js` plugins (already done):
```js
'react-native-reanimated/plugin'
```

---

## 3-Minute Demo Script

| Time | Action | What to show |
|------|--------|-------------|
| 0:00 | Open app | Warm welcome screen, large START button |
| 0:15 | Tap START | Connecting screen with 3-agent animation |
| 0:25 | Session opens | Camera live, HUD shows "Live", frame counter ticking |
| 0:40 | Tap Demo → 🔑 Lost Keys | Agent bubble + TTS speaks response |
| 1:00 | Tap Demo → 🔥 Stove | Red safety badge, explain Agent A monitoring |
| 1:20 | Hold SPEAK button | Live transcription banner appears |
| 1:30 | Say "Where are my glasses?" | Release, watch STT → WS → agent response |
| 1:50 | Tap Demo → 💊 Medication | Show "wait for caregiver" — NEVER confirm pills |
| 2:10 | Tap Caregiver button | Full-screen escalation overlay, pulsing phone icon |
| 2:30 | Tap "I'm OK" | Dismiss, show session resumes |
| 2:50 | Tap ■ End | Session stops cleanly |

---

## Safety Design

| Risk | Mitigation |
|------|-----------|
| Medication hallucination | Agent C system prompt hardcodes: always defer to caregiver |
| Stove detection lag | Agent A fires safety alert immediately, pre-empts all other queued responses |
| Object misidentification | Agent B timestamps every sighting — "I saw keys 3 min ago" not "your keys are there" |
| Continuous surveillance anxiety | Explicit START/STOP; no background recording; no disk storage |
| Caregiver loop | Escalation fires WS event → server can SMS/push/call caregiver in production |

---

## File Structure

```
MemoryCompanion/
├── App.tsx                          # Root state-machine router
├── package.json
├── metro.config.js
├── babel.config.js
├── tsconfig.json
├── index.js
│
├── src/
│   ├── theme/index.ts               # Colors, fonts, spacing
│   ├── services/
│   │   ├── store.ts                 # Zustand global store
│   │   ├── WebSocketService.ts      # Binary frame + JSON streaming
│   │   ├── SpeechService.ts         # react-native-voice wrapper
│   │   ├── TTSService.ts            # react-native-tts wrapper
│   │   └── demoScenarios.ts         # 8 demo scenarios
│   ├── components/
│   │   ├── AgentBubble.tsx          # Animated agent message
│   │   ├── SpeakButton.tsx          # Hold-to-speak with pulse rings
│   │   ├── PulseRing.tsx            # Reusable animated ring
│   │   ├── HUDBar.tsx               # Top status overlay
│   │   ├── TranscriptionBanner.tsx  # Live STT preview
│   │   ├── DemoPanel.tsx            # Bottom sheet scenario picker
│   │   └── EscalationOverlay.tsx    # Fullscreen caregiver alert
│   └── screens/
│       ├── WelcomeScreen.tsx        # Intro + settings
│       ├── ConnectingScreen.tsx     # WS handshake loading
│       └── SessionScreen.tsx        # Main camera + interaction
│
├── ios/
│   └── MemoryCompanion/Info.plist   # Camera/mic/speech permissions
└── android/
    └── AndroidManifest.xml          # Android permissions
```
