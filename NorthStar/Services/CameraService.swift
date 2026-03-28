import Foundation
import AVFoundation
import UIKit

/// Manages an AVCaptureSession for the back camera, converting captured frames
/// to JPEG data and forwarding them through a callback.
final class CameraService: NSObject, ObservableObject {

    // MARK: - Published Properties

    @Published var isRunning: Bool = false

    // MARK: - Capture Infrastructure

    /// The underlying capture session. Views bind their preview layer to this.
    let session = AVCaptureSession()

    /// A convenience preview layer pre-configured with this session.
    var previewLayer: AVCaptureVideoPreviewLayer?

    /// Called on the session queue each time a new video frame is captured.
    var onFrameCaptured: ((Data) -> Void)?

    // MARK: - Private

    private let sessionQueue = DispatchQueue(label: "com.northstar.camera.session")
    private let videoOutput = AVCaptureVideoDataOutput()
    private var isConfigured = false

    // MARK: - Convenience alias

    /// Alias so callers that expect `captureSession` still compile.
    var captureSession: AVCaptureSession { session }

    // MARK: - Setup

    /// Requests camera permission and configures the capture session.
    func configure() {
        guard !isConfigured else { return }

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            sessionQueue.async { [weak self] in
                self?.setupCaptureSession()
            }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted {
                    self?.sessionQueue.async {
                        self?.setupCaptureSession()
                    }
                }
            }
        default:
            break
        }
    }

    private func setupCaptureSession() {
        session.beginConfiguration()
        session.sessionPreset = .medium

        // --- Input (back camera) ---
        guard let backCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: backCamera),
              session.canAddInput(input) else {
            session.commitConfiguration()
            return
        }
        session.addInput(input)

        // --- Output ---
        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        videoOutput.setSampleBufferDelegate(self, queue: sessionQueue)

        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
        }

        session.commitConfiguration()

        // Build a preview layer so views can attach it.
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill

        DispatchQueue.main.async { [weak self] in
            self?.previewLayer = layer
            self?.isConfigured = true
        }
    }

    // MARK: - Session Control

    /// Starts the camera session. Configures on first call.
    func start() {
        if !isConfigured {
            configure()
        }
        startSession()
    }

    /// Stops the camera session.
    func stop() {
        stopSession()
    }

    func startSession() {
        sessionQueue.async { [weak self] in
            guard let self, !self.session.isRunning else { return }
            self.session.startRunning()
            DispatchQueue.main.async {
                self.isRunning = true
            }
        }
    }

    func stopSession() {
        sessionQueue.async { [weak self] in
            guard let self, self.session.isRunning else { return }
            self.session.stopRunning()
            DispatchQueue.main.async {
                self.isRunning = false
            }
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {

    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }

        let uiImage = UIImage(cgImage: cgImage)
        guard let jpegData = uiImage.jpegData(compressionQuality: 0.6) else { return }

        onFrameCaptured?(jpegData)
    }
}
