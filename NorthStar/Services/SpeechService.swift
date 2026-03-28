import Foundation
import Speech
import AVFoundation

/// Provides on-device speech recognition via SFSpeechRecognizer and
/// text-to-speech output through AVSpeechSynthesizer with a calm, slow voice
/// suitable for Alzheimer's patients.
@MainActor
final class SpeechService: NSObject, ObservableObject {

    // MARK: - Published Properties

    @Published var isListening: Bool = false
    @Published var recognizedText: String = ""

    // MARK: - Callback

    /// Fired each time a final or partial transcription is produced.
    var onSpeechRecognized: ((String) -> Void)?

    // MARK: - Private

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let synthesizer = AVSpeechSynthesizer()

    // MARK: - Permissions

    /// Requests both speech recognition and microphone permissions.
    func requestPermissions(completion: @escaping (Bool) -> Void) {
        var speechGranted = false
        var micGranted = false
        let group = DispatchGroup()

        group.enter()
        SFSpeechRecognizer.requestAuthorization { status in
            speechGranted = (status == .authorized)
            group.leave()
        }

        group.enter()
        AVAudioApplication.requestRecordPermission { granted in
            micGranted = granted
            group.leave()
        }

        group.notify(queue: .main) {
            completion(speechGranted && micGranted)
        }
    }

    // MARK: - Listening

    func startListening() {
        guard !isListening else { return }
        guard let recognizer = speechRecognizer, recognizer.isAvailable else { return }

        // Cancel any in-flight task.
        recognitionTask?.cancel()
        recognitionTask = nil

        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            return
        }

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let request = recognitionRequest else { return }
        request.shouldReportPartialResults = true

        // Prefer on-device recognition when available.
        if #available(iOS 13, *) {
            request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                let text = result.bestTranscription.formattedString
                Task { @MainActor in
                    self.recognizedText = text
                    self.onSpeechRecognized?(text)
                }
            }
            if error != nil || (result?.isFinal ?? false) {
                Task { @MainActor in
                    self.stopListening()
                }
            }
        }

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isListening = true
        } catch {
            stopListening()
        }
    }

    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isListening = false
    }

    // MARK: - Text-to-Speech

    /// Speaks the given text in a calm, slow voice appropriate for
    /// Alzheimer's patients.
    func speak(_ text: String) {
        synthesizer.stopSpeaking(at: .immediate)

        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.75 // slower than default
        utterance.pitchMultiplier = 0.95
        utterance.volume = 1.0
        utterance.preUtteranceDelay = 0.3
        utterance.postUtteranceDelay = 0.2

        // Prefer a Siri-quality voice when available.
        if let voice = AVSpeechSynthesisVoice(language: "en-US") {
            utterance.voice = voice
        }

        synthesizer.speak(utterance)
    }
}
