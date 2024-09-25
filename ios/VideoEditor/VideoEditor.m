#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VideoEditor, NSObject)

RCT_EXTERN_METHOD(createThumbnails:(NSString *)filePath
durationSec:(NSInteger)durationSec
cropPosition:(NSDictionary*)cropPosition
duration:(NSInteger)duration
resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(makeBoomerang:(NSString *)filePath
startTime:(NSString *)startTime
cropPosition:(NSDictionary*)cropPosition
duration:(NSInteger)duration
resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(clearVideoCache:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

@end
