package com.videoeditor

import android.graphics.Bitmap
import android.media.*
import com.facebook.react.bridge.*
import android.os.Environment
import android.util.Log
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode
import java.io.FileOutputStream
import com.arthenica.ffmpegkit.Session

class VideoEditorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    var currentSession: Session? = null

    override fun getName(): String {
        return "VideoEditor"
    }

    @ReactMethod
    fun makeBoomerang(sourcePath: String, startTime: String, cropPosition: ReadableMap, duration: Int, promise: Promise) {
        try {
            currentSession?.cancel()

            val formatSourcePath = sourcePath.replace("file://", "")
            val trimmedVideoPath = generateOutputPath("trimmedVideo")
            val outputPath = generateOutputPath("boomerangVideo")

            val cropX = if (cropPosition.hasKey("x")) cropPosition.getInt("x") else 0;
            val cropY = if (cropPosition.hasKey("y")) cropPosition.getInt("y") else 0;
            val cropWidth = if (cropPosition.hasKey("width")) cropPosition.getInt("width") else 0;
            val cropHeight = if (cropPosition.hasKey("height")) cropPosition.getInt("height") else 0;
            var cropCommand = if (cropHeight != 0 && cropWidth != 0) "-vf crop=$cropWidth:$cropHeight:$cropX:$cropY" else ""

            val trimCommand = "-ss $startTime -i \"$formatSourcePath\" -t 00:00:0\"$duration\".000 $cropCommand ${if (cropCommand.length > 0) "-c:a copy -an" else "-c copy -an" } \"$trimmedVideoPath\""
            val boomerangCommand = "-i \"$trimmedVideoPath\" -filter_complex \"[0:v]reverse[r];[0][r]concat=n=2:v=1:a=0\" $outputPath"


            currentSession =FFmpegKit.executeAsync(trimCommand) { trimSession ->
                val trimReturnCode = trimSession.getReturnCode()

                if (ReturnCode.isSuccess(trimReturnCode)) {
                    currentSession =FFmpegKit.executeAsync(boomerangCommand) { boomerangSession ->
                        val boomerangReturnCode = boomerangSession.getReturnCode()

                        if (ReturnCode.isSuccess(boomerangReturnCode)) {
                            promise.resolve(outputPath)
                        } else {
                            val message = "Error creating boomerang video: ${boomerangSession.getFailStackTrace()}"
                            promise.reject("Error", message)
                        }
                    }
                } else {
                    val message = "Error trimming video: ${trimSession.getFailStackTrace()}"
                    promise.reject("Error", message)
                }
            }
        } catch (e: Exception) {
            Log.e("VideoEditor", "Video processing failed: ${e.localizedMessage}", e)
            promise.reject("Error", "Video processing failed: ${e.localizedMessage}")
        }
    }

    @ReactMethod
    fun createThumbnails(sourcePath: String, durationSec: Int, cropPosition: ReadableMap, duration: Int, promise: Promise) {
        val formatSourcePath = sourcePath.replace("file://", "")
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(formatSourcePath)
            val thumbnailPaths = ArrayList<String>()
            val interval = 1500
            val cropX = if (cropPosition.hasKey("x")) cropPosition.getInt("x") else 0;
            val cropY = if (cropPosition.hasKey("y")) cropPosition.getInt("y") else 0;
            val cropWidth = if (cropPosition.hasKey("width")) cropPosition.getInt("width") else 0;
            val cropHeight = if (cropPosition.hasKey("height")) cropPosition.getInt("height") else 0;

            var currentTime = 0L
            while (currentTime <= durationSec * 1000L) {
                val frameTime = maxOf(0, (currentTime - 500)) * 1000
                val bitmap = retriever.getFrameAtTime(frameTime, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                bitmap?.let {
                    val croppedBitmap = if (cropWidth !== 0 && cropHeight !== 0) Bitmap.createBitmap(it, cropX, cropY, cropWidth, cropHeight) else it;
                    val resizedBitmap = Bitmap.createScaledBitmap(croppedBitmap, 80, (80 * it.height) / it.width, false)
                    val thumbnailPath = saveBitmap(resizedBitmap, "thumbnail_${System.currentTimeMillis()}_$currentTime.jpg")
                    thumbnailPaths.add(thumbnailPath)
                } ?: run {
                    Log.e("VideoEditor", "Failed to retrieve frame at time: $frameTime")
                }
                currentTime += interval
            }

            promise.resolve(Arguments.fromList(thumbnailPaths))
        } catch (e: Exception) {
            Log.d("editor_debug", e.localizedMessage)
            promise.reject("Error", "Failed to create thumbnails: ${e.localizedMessage}")
        } finally {
            retriever.release()
        }
    }


    private fun saveBitmap(bitmap: Bitmap?, fileName: String): String {
        val outputPath = reactApplicationContext.getExternalFilesDir(null)?.absolutePath + File.separator + fileName
        try {
            FileOutputStream(outputPath).use { out ->
                bitmap?.compress(Bitmap.CompressFormat.JPEG, 85, out)
            }
        } catch (e: IOException) {
            e.printStackTrace()
        }

        return outputPath
    }

    private fun generateOutputPath(prefix: String): String {
        val timeStamp: String = SimpleDateFormat("yyyyMMdd_HHmmss").format(Date())
        val storageDir: File? = reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES)
        return File(storageDir, "${prefix}_$timeStamp.mp4").absolutePath
    }

    private fun clearCacheDirectory(directoryPath: String) {
        try {
            val directory = File(directoryPath)
            if (directory.exists() && directory.isDirectory) {
                val files = directory.listFiles()
                if (files != null) {
                    for (file in files) {
                        if (file.name.startsWith("thumbnail_") || file.name.contains("boomerangVideo") || file.name.contains("trimmedVideo")) {
                            val deleted = file.delete()
                            if (!deleted) {
                                Log.e("VideoEditor", "Failed to delete file: ${file.absolutePath}")
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("VideoEditor", "Error while clearing cache directory: ${e.localizedMessage}", e)
        }
    }

    @ReactMethod
    fun clearVideoCache(promise: Promise) {
        try {
            val moviesDirectoryPath = reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES)?.absolutePath
            if (moviesDirectoryPath != null) {
                clearCacheDirectory(moviesDirectoryPath)
            } else {
                promise.reject("Error", "Movies directory path is null")
            }

            val filesDirectoryPath = reactApplicationContext.getExternalFilesDir(null)?.absolutePath
            if (filesDirectoryPath != null) {
                clearCacheDirectory(filesDirectoryPath)
            } else {
                promise.reject("Error", "Files directory path is null")
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("VideoEditor", "Error clearing cache: ${e.localizedMessage}", e)
            promise.reject("Error", "Error clearing cache: ${e.localizedMessage}")
        }
    }
}
