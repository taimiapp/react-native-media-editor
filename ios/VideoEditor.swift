import Foundation
import ffmpegkit
import AVFoundation
import Photos

@objc(VideoEditor)
class VideoEditor: NSObject, RCTBridgeModule {

  var currentSession: Session?

  static func moduleName() -> String! {
    return "VideoTrimmer"
  }

  func createOutputPath(filename: String) -> String {
      let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
      let documentsDirectory = paths[0]
      let outputPath = documentsDirectory.appendingPathComponent("\(UUID().uuidString)_\(filename)").path
      return outputPath
  }

  func isProResVideo(_ filePath: String) -> Bool {
      let asset = AVURLAsset(url: URL(fileURLWithPath: filePath))
      let videoTracks = asset.tracks(withMediaType: .video)
      let proResCodecs: [FourCharCode] = [
          kCMVideoCodecType_AppleProRes422HQ,
          kCMVideoCodecType_AppleProRes422,
          kCMVideoCodecType_AppleProRes422LT,
          kCMVideoCodecType_AppleProRes422Proxy
      ]

      for track in videoTracks {
          for case let formatDescription as CMFormatDescription in track.formatDescriptions {
              let mediaSubType = CMFormatDescriptionGetMediaSubType(formatDescription)
              if proResCodecs.contains(mediaSubType) {
                  return true
              }
          }
      }
      return false
  }

  @objc func makeBoomerang(
      _ filePathPure: String,
      startTime: String,
      cropPosition: NSDictionary,
      duration: Int,
      resolver resolve: @escaping RCTPromiseResolveBlock,
      rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
      currentSession?.cancel()

      let filePath    = filePathPure.removingPercentEncoding ?? filePathPure
      let cropX       = cropPosition["x"]      as? Int ?? 0
      let cropY       = cropPosition["y"]      as? Int ?? 0
      let cropW       = cropPosition["width"]  as? Int ?? 0
      let cropH       = cropPosition["height"] as? Int ?? 0
      let cropFilter  = (cropW > 0 && cropH > 0)
          ? "crop=\(cropW):\(cropH):\(cropX):\(cropY),"
          : ""

    let bitRate     = getBitRateOfVideo(filePath: filePath) ?? 5_000_000
      let outputPath  = createOutputPath(filename: "boomerang.mp4")
      let durString   = String(format: "00:00:%02d.000", duration)

      let cmd = """
      -ss \(startTime) -t \(durString) \
      -hwaccel videotoolbox -hwaccel_output_format videotoolbox \
      -i "\(filePath)" \
      -filter_complex_threads 1 -filter_threads 1 \
      -filter_complex "\
        [0:v]\
        \(cropFilter)\
        scale=1280:-2,format=yuv420p,fifo,split[v1][v2];\
        [v2]reverse[r];\
        [v1][r]concat[out]" \
      -map "[out]" \
      -an \
      -c:v h264_videotoolbox -b:v \(bitRate) -crf 18 -preset fast \
      -movflags +faststart \
      "\(outputPath)"
      """

      currentSession = FFmpegKit.executeAsync(cmd) { session in
          if ReturnCode.isSuccess(session?.getReturnCode()) {
              resolve(outputPath)
          } else {
              reject("boomerang_error", "Не удалось создать бумеранг", nil)
          }
      }
  }


  @objc func clearVideoCache(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let fileManager = FileManager.default
      let videoFileExtensions = ["mp4", "mov", "avi", "flv", "wmv", "mkv", "webm"]
      let thumbnailExtension = "jpg"
      let videoPrefixes = ["trimmedVideo", "boomerangVideo"]
      let thumbnailPrefix = "thumbnail_"

      do {
          let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
          let documentDirectoryContents = try fileManager.contentsOfDirectory(at: documentsPath, includingPropertiesForKeys: nil)

          for file in documentDirectoryContents {
              if videoFileExtensions.contains(file.pathExtension.lowercased()) && videoPrefixes.contains(where: { file.lastPathComponent.contains($0) }) {
                  try fileManager.removeItem(at: file)
                  print("Removed video file: \(file.lastPathComponent)")
              } else if file.pathExtension.lowercased() == thumbnailExtension && (file.lastPathComponent.contains(thumbnailPrefix) || file.lastPathComponent.contains("boomerangVideo") || file.lastPathComponent.contains("trimmedVideo")) {
                  try fileManager.removeItem(at: file)
                  print("Removed thumbnail file: \(file.lastPathComponent)")
              }
          }
          resolve(true)
      } catch let error {
          reject("Error", "Could not clear cache: \(error.localizedDescription)", error)
      }
  }

  func getBitRateOfVideo(filePath: String) -> Int? {
      let url = URL(fileURLWithPath: filePath)
      let asset = AVAsset(url: url)
      let assetTrack = asset.tracks(withMediaType: .video).first

      if let estimatedDataRate = assetTrack?.estimatedDataRate {
          return Int(estimatedDataRate)
      } else {
          return nil
      }
  }

  func convertPHAssetToURL(_ identifier: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let assets = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil)
      guard let asset = assets.firstObject else {
          let error = NSError(domain: "", code: 0, userInfo: [NSLocalizedDescriptionKey: "PHAsset not found"])
          reject("Error", "PHAsset not found", error)
          return
      }

      PHImageManager.default().requestAVAsset(forVideo: asset, options: nil) { avAsset, audioMix, info in
          guard let urlAsset = avAsset as? AVURLAsset else {
              let error = NSError(domain: "", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to get AVURLAsset"])
              reject("Error", "Failed to get AVURLAsset", error)
              return
          }
          resolve(urlAsset.url.absoluteString)
      }
  }

  func getVideoDuration(sourcePath: String) -> Double {
    let asset = AVURLAsset(url: URL(fileURLWithPath: sourcePath), options: nil)
    let duration = asset.duration
    return CMTimeGetSeconds(duration)
  }

  @objc func createThumbnails(_ filePathPure: String,
                              durationSec: Int,
                              cropPosition: NSDictionary,
                              duration: Int,
                              resolver resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
      let filePath = (filePathPure.removingPercentEncoding != nil) ? filePathPure.removingPercentEncoding! : filePathPure
      var workingFilePath = filePath
      var didCopy = false

      if filePath.hasPrefix("/var/mobile/Media/DCIM") {
          let sourceURL = URL(fileURLWithPath: filePath)
          let tempDirectory = NSTemporaryDirectory()
          let tempFilename = sourceURL.lastPathComponent
          let tempFilePath = (tempDirectory as NSString).appendingPathComponent("\(UUID().uuidString)_\(tempFilename)")
          let tempFileURL = URL(fileURLWithPath: tempFilePath)

          do {
              try FileManager.default.copyItem(at: sourceURL, to: tempFileURL)
              print("The file has been successfully copied to the sandbox (temporary directory): \(tempFileURL)")
              workingFilePath = tempFilePath
              didCopy = true
          } catch {
              print("Error copying file from DCIM: \(error.localizedDescription)")
              reject("copy_error", error.localizedDescription, error)
              return
          }
      } else {
          print("The file is not in DCIM, use the original path: \(filePath)")
      }

      let url = URL(fileURLWithPath: workingFilePath)
      let asset = AVURLAsset(url: url)
      let imageGenerator = AVAssetImageGenerator(asset: asset)
      imageGenerator.appliesPreferredTrackTransform = true
      imageGenerator.maximumSize = CGSize(width: 180, height: 180)

      let cropX = cropPosition["x"] as? Int ?? 0
      let cropY = cropPosition["y"] as? Int ?? 0
      let cropWidth = cropPosition["width"] as? Int
      let cropHeight = cropPosition["height"] as? Int

      var croppingRect: CGRect?
      if let w = cropWidth, let h = cropHeight {
          croppingRect = CGRect(x: cropX, y: cropY, width: w, height: h)
      }

      var intervals = [Double]()
      if durationSec <= duration {
          intervals = [0, Double(durationSec)]
      } else {
          let interval: Double = Double(duration) / 2.0
          var currentTime: Double = 0
          while currentTime < Double(durationSec) {
              intervals.append(currentTime)
              currentTime += interval
          }
          intervals.append(Double(durationSec))
      }

      var thumbnailPaths = [String]()
      let dispatchGroup = DispatchGroup()

      for timeForFrame in intervals {
          dispatchGroup.enter()
          let cmTime = CMTime(seconds: timeForFrame, preferredTimescale: asset.duration.timescale)
          imageGenerator.generateCGImagesAsynchronously(forTimes: [NSValue(time: cmTime)]) { _, image, _, _, error in
              defer { dispatchGroup.leave() }
              if let image = image, error == nil {
                  var finalCGImage = image
                  if let rect = croppingRect, let cropped = image.cropping(to: rect) {
                      finalCGImage = cropped
                  }
                  let uiImage = UIImage(cgImage: finalCGImage)
                  if let imageData = uiImage.jpegData(compressionQuality: 0.2) {
                      let outputPath = self.createOutputPath(filename: "thumbnail_\(timeForFrame).jpg")
                      do {
                          try imageData.write(to: URL(fileURLWithPath: outputPath))
                          thumbnailPaths.append(outputPath)
                      } catch {
                          print("Error writing thumbnail: \(error.localizedDescription)")
                      }
                  }
              } else {
                  print("Error generating thumbnail at \(timeForFrame)s: \(error?.localizedDescription ?? "Unknown error")")
              }
          }
      }

      dispatchGroup.notify(queue: .main) {
          if didCopy {
              do {
                  try FileManager.default.removeItem(atPath: workingFilePath)
                  print("Temporary copy successfully deleted: \(workingFilePath)")
              } catch {
                  print("Failed to delete temporary copy: \(error.localizedDescription)")
              }
          }
          resolve(thumbnailPaths)
      }
  }

}
