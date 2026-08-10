const {
  createRunOncePlugin,
  IOSConfig,
  withAppDelegate,
  withPodfile,
} = require("expo/config-plugins");

const SCENE_DELEGATE_CONTENTS = `internal import Expo
import React
import UIKit

/**
 UIScene life cycle entry point required by the iOS 27 / Xcode 27 SDK.
 See Apple TN3187 and https://github.com/expo/expo/issues/46664
 */
@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo _: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory
    else {
      fatalError("SceneDelegate could not find AppDelegate.reactNativeFactory")
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(from: connectionOptions)
    )

    Self.route(urlContexts: connectionOptions.urlContexts)
    for userActivity in connectionOptions.userActivities {
      Self.route(userActivity: userActivity)
    }
  }

  func scene(_: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    Self.route(urlContexts: URLContexts)
  }

  func scene(_: UIScene, continue userActivity: NSUserActivity) {
    Self.route(userActivity: userActivity)
  }

  private static func launchOptions(
    from connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]

    if let url = connectionOptions.urlContexts.first?.url {
      let urlKey = UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")
      launchOptions[urlKey] = url
    }

    if let userActivity = connectionOptions.userActivities.first(where: {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }) {
      let userActivityDictionaryKey = UIApplication.LaunchOptionsKey(
        rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey"
      )
      launchOptions[userActivityDictionaryKey] = [
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
      ]
    }

    return launchOptions.isEmpty ? nil : launchOptions
  }

  private static func route(urlContexts: Set<UIOpenURLContext>) {
    for context in urlContexts {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
  }

  private static func route(userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`;

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: "Default Configuration",
        UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
      },
    ],
  },
};

/** Stock Expo AppDelegate still owns the window; strip that for UIScene. */
const STOCK_WINDOW_STARTUP =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n\s*withModuleName: "main",\s*\n\s*in: window,\s*\n\s*launchOptions: launchOptions\)\s*\n#endif\s*\n/;

const PATCHED_WINDOW_STARTUP = `// @generated begin ios-scene-lifecycle - expo prebuild (DO NOT MODIFY)
    // Window + React Native startup happen in SceneDelegate (iOS 27 / Xcode 27 SDK).
    // @generated end ios-scene-lifecycle
`;

const MIN_POD_DEPLOYMENT_TARGET_TAG = "ios-min-deployment-target";

const MIN_POD_DEPLOYMENT_TARGET_SNIPPET = `
    # @generated begin ${MIN_POD_DEPLOYMENT_TARGET_TAG} - expo prebuild (DO NOT MODIFY)
    # Xcode 16+ rejects pod targets below iOS 15 (e.g. ReachabilitySwift still ships 12.0).
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        deployment_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.0
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
        end
      end
    end
    # @generated end ${MIN_POD_DEPLOYMENT_TARGET_TAG}
`;

const REACT_NATIVE_POST_INSTALL =
  /react_native_post_install\(\s*\n(?:[^\n]*\n)*?\s*\)\n/;

/**
 * Adopts the UIKit scene life cycle required by the iOS 27 / Xcode 27 SDK,
 * and bumps outdated CocoaPods deployment targets rejected by newer Xcode.
 * Temporary until Expo's prebuild template covers these by default.
 *
 * @type {import('expo/config-plugins').ConfigPlugin}
 */
const withIosSceneLifecycle = (config) => {
  config.ios ??= {};
  config.ios.infoPlist = {
    ...config.ios.infoPlist,
    UIApplicationSceneManifest: SCENE_MANIFEST,
  };

  let nextConfig = IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    contents: SCENE_DELEGATE_CONTENTS,
    filePath: "SceneDelegate.swift",
    overwrite: true,
  });

  nextConfig = withAppDelegate(nextConfig, (mod) => {
    if (mod.modResults.language !== "swift") {
      throw new Error(
        "withIosSceneLifecycle only supports a Swift AppDelegate"
      );
    }

    const { contents } = mod.modResults;
    if (
      contents.includes("@generated begin ios-scene-lifecycle") ||
      contents.includes("happen in SceneDelegate")
    ) {
      return mod;
    }

    if (!STOCK_WINDOW_STARTUP.test(contents)) {
      throw new Error(
        "withIosSceneLifecycle could not find the stock AppDelegate window/startReactNative block to remove. The Expo template may have changed — update plugins/withIosSceneLifecycle.js."
      );
    }

    mod.modResults.contents = contents.replace(
      STOCK_WINDOW_STARTUP,
      PATCHED_WINDOW_STARTUP
    );
    return mod;
  });

  nextConfig = withPodfile(nextConfig, (mod) => {
    const { contents } = mod.modResults;
    if (
      contents.includes(`@generated begin ${MIN_POD_DEPLOYMENT_TARGET_TAG}`)
    ) {
      return mod;
    }

    if (!REACT_NATIVE_POST_INSTALL.test(contents)) {
      throw new Error(
        "withIosSceneLifecycle could not find react_native_post_install in the Podfile. The Expo template may have changed — update plugins/withIosSceneLifecycle.js."
      );
    }

    mod.modResults.contents = contents.replace(
      REACT_NATIVE_POST_INSTALL,
      (match) => `${match}${MIN_POD_DEPLOYMENT_TARGET_SNIPPET}`
    );
    return mod;
  });

  return nextConfig;
};

module.exports = createRunOncePlugin(
  withIosSceneLifecycle,
  "withIosSceneLifecycle",
  "1.1.0"
);
