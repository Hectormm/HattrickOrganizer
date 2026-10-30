#import "AppDelegate.h"

#import <React/RCTBridgeModule.h>
#import <React/RCTBundleURLProvider.h>

@interface HODocumentPicker : NSObject <RCTBridgeModule>
@end

@implementation HODocumentPicker

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(pickHRF,
                 pickHRFWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = NO;
    panel.allowedFileTypes = @[@"hrf"];

    if ([panel runModal] != NSModalResponseOK) {
      resolve([NSNull null]);
      return;
    }

    NSError *error = nil;
    NSString *contents = [NSString stringWithContentsOfURL:panel.URL
                                                  encoding:NSUTF8StringEncoding
                                                     error:&error];
    if (contents != nil) {
      resolve(contents);
    } else {
      reject(@"hrf_read_failed", @"No se pudo leer el archivo HRF en UTF-8.", error);
    }
  });
}

@end

@interface HOStorage : NSObject <RCTBridgeModule>
@end

@implementation HOStorage

RCT_EXPORT_MODULE();

- (NSString *)stateFilePath
{
  NSArray<NSString *> *paths = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES);
  NSString *supportDirectory = [paths.firstObject stringByAppendingPathComponent:@"HattrickOrganizer"];
  return [supportDirectory stringByAppendingPathComponent:@"react-native-state.json"];
}

RCT_REMAP_METHOD(loadState,
                 loadStateWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *path = [self stateFilePath];
  NSData *data = [NSData dataWithContentsOfFile:path];
  if (data == nil) {
    resolve([NSNull null]);
    return;
  }

  NSError *error = nil;
  id state = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
  if ([state isKindOfClass:[NSDictionary class]]) {
    resolve(state);
  } else {
    reject(@"state_read_failed", @"No se pudo leer el estado guardado.", error);
  }
}

RCT_REMAP_METHOD(saveState,
                 saveState:(NSDictionary *)state
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSError *error = nil;
  NSData *data = [NSJSONSerialization dataWithJSONObject:state options:0 error:&error];
  if (data == nil) {
    reject(@"state_encode_failed", @"No se pudo codificar el estado de la app.", error);
    return;
  }

  NSString *path = [self stateFilePath];
  NSString *directory = [path stringByDeletingLastPathComponent];
  if (![[NSFileManager defaultManager] createDirectoryAtPath:directory
                                withIntermediateDirectories:YES
                                                 attributes:nil
                                                      error:&error]) {
    reject(@"state_directory_failed", @"No se pudo crear el directorio de datos de la app.", error);
    return;
  }

  if ([data writeToFile:path options:NSDataWritingAtomic error:&error]) {
    resolve(@YES);
  } else {
    reject(@"state_write_failed", @"No se pudo guardar el estado de la app.", error);
  }
}

@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
  self.moduleName = @"hattrick-organizer-macos";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super applicationDidFinishLaunching:notification];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
#ifdef RN_FABRIC_ENABLED
  return true;
#else
  return false;
#endif
}

@end
