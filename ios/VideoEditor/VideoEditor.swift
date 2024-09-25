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

  @objc func makeBoomerang(_ filePath: String, startTime: String, cropPosition: NSDictionary, duration: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      currentSession?.cancel()



      let cropX = cropPosition["x"] as? Int ?? 0;
      let cropY = cropPosition["y"] as? Int ?? 0;
      let cropWidth = cropPosition["width"] as? Int;
      let cropHeight = cropPosition["height"] as? Int;
      let cgPoint = CGPoint(x: cropX, y: cropY)
      var croppingRect: CGRect?;
      // TODO add check for out of bounds
      if (cropWidth != nil && cropHeight != nil) {
        let cgSize = CGSize(width: cropWidth ?? 0, height: cropHeight ?? 0)
        croppingRect = CGRect(origin: cgPoint, size: cgSize)
      }

      var cropCommand: String?
      if let unwrappedRect = croppingRect {
        cropCommand = "-vf crop=\(unwrappedRect.width):\(unwrappedRect.height):\(unwrappedRect.origin.x):\(unwrappedRect.origin.y)"
      }

    let url = URL(fileURLWithPath: filePath)
    let isProRes = isProResVideo(filePath)
    let fileExtension = isProRes ? "mov" : url.pathExtension

      let trimmedVideoPath = self.createOutputPath(filename: "trimmedVideo.\(fileExtension)")
    let trimCommand = "-ss \(startTime) -i \(filePath) -t 00:00:0\(duration).000 \(cropCommand != nil ? cropCommand! : "") \(cropCommand != nil ? "-c:a" : "-c") copy \(trimmedVideoPath)"
    print(trimCommand)

      currentSession = FFmpegKit.executeAsync(trimCommand) { [weak self] session in
          guard let self = self else { return }
          let returnCode = session?.getReturnCode()

          if ReturnCode.isSuccess(returnCode) {
              let outputPath = self.createOutputPath(filename: "boomerangVideo.\(fileExtension)")
              let bitRate = self.getBitRateOfVideo(filePath: filePath) ?? 5000 * 1000

            let boomerangCommand = "-i \(trimmedVideoPath) -filter_complex \"[0:v]reverse[r];[0][r]concat=n=2:v=1:a=0\" -an -c:v h264_videotoolbox -b:v \(bitRate) \(outputPath)"

            self.currentSession = FFmpegKit.executeAsync(boomerangCommand) { boomerangSession in
                  let boomerangReturnCode = boomerangSession?.getReturnCode()

                  if ReturnCode.isSuccess(boomerangReturnCode) {
                      resolve(outputPath)
                  } else {
                      if ReturnCode.isCancel(boomerangReturnCode) {
                          reject("Error", "Operation cancelled", nil)
                      } else {
                          let message = "Error creating boomerang video"
                          reject("Error", message, nil)
                      }
                  }
              }
          } else {
              if ReturnCode.isCancel(returnCode) {
                  reject("Error", "Operation cancelled", nil)
              } else {
                  let message = "Error trimming video"
                  reject("Error", message, nil)
              }
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

  @objc func createThumbnails(_ filePath: String, durationSec: Int, cropPosition: NSDictionary, duration: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let url = URL(fileURLWithPath: filePath)
      let asset = AVURLAsset(url: url)
      let imageGenerator = AVAssetImageGenerator(asset: asset)
      imageGenerator.appliesPreferredTrackTransform = true


      imageGenerator.maximumSize = CGSize(width: 180, height: 180)

      var thumbnailPaths: [String] = []
      let dispatchGroup = DispatchGroup()

      let cropX = cropPosition["x"] as? Int ?? 0;
      let cropY = cropPosition["y"] as? Int ?? 0;
      let cropWidth = cropPosition["width"] as? Int;
      let cropHeight = cropPosition["height"] as? Int;
      let cgPoint = CGPoint(x: cropX, y:cropY)
      var croppingRect: CGRect?;
      // TODO add check for out of bounds
      if (cropWidth != nil && cropHeight != nil) {
        let cgSize = CGSize(width: cropWidth ?? 0, height: cropHeight ?? 0)
        croppingRect = CGRect(origin: cgPoint, size: cgSize)
      }

    var intervals = [Double]()
      if durationSec <= duration {
        intervals = [0, Double(durationSec)]
      } else {
        let interval: Double = Double(duration) / 2
        var currentTime: Double = 0
        while currentTime < Double(durationSec) {
          intervals.append(currentTime)
          currentTime += interval
        }
        intervals.append(Double(durationSec))
      }
    for timeForFrame in intervals {
        dispatchGroup.enter()
        let cmTime = CMTime(seconds: timeForFrame, preferredTimescale: asset.duration.timescale)
        imageGenerator.generateCGImagesAsynchronously(forTimes: [NSValue(time: cmTime)]) { _, image, _, _, error in
          defer { dispatchGroup.leave() }
          if let image = image, error == nil {
            let outputPath = self.createOutputPath(filename: "thumbnail_\(timeForFrame).jpg")
            var cgImage: CGImage = image
            if let rectCrop = croppingRect {
              cgImage = image.cropping(to: rectCrop) ?? image
            }

            let uiImage = UIImage(cgImage: cgImage)
            if let imageData = uiImage.jpegData(compressionQuality: 0.2) {
              try? imageData.write(to: URL(fileURLWithPath: outputPath))
              thumbnailPaths.append(outputPath)
            }
          } else {
            print("Error generating thumbnail: \(error?.localizedDescription ?? "Unknown error")")
          }
        }
      }

      dispatchGroup.notify(queue: .main) {
          resolve(thumbnailPaths)
      }
  }

}
