const {
  createRunOncePlugin,
  withXcodeProject,
} = require("expo/config-plugins");

/**
 * expo-sharing adds its extension's files with the `xcode` package, which
 * reuses any existing file reference with the same path. expo-widgets already
 * added an `Info.plist` for its target, so both extension groups end up
 * sharing one reference and Xcode refuses to open the project ("The reference
 * Info.plist is a member of more than one group").
 *
 * This gives the share extension group its own `Info.plist` reference.
 */
const SHARE_EXTENSION_GROUP = "expo-sharing-extension";

const isComment = (key) => key.endsWith("_comment");

const withShareExtensionInfoPlist = (config) =>
  withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const { objects } = project.hash.project;
    const groups = objects.PBXGroup ?? {};
    const fileRefs = objects.PBXFileReference ?? {};

    const shareGroup = Object.entries(groups).find(
      ([key, group]) =>
        !isComment(key) &&
        (group.name === SHARE_EXTENSION_GROUP ||
          group.path === SHARE_EXTENSION_GROUP)
    )?.[1];
    if (!shareGroup?.children) {
      return modConfig;
    }

    const plistChild = shareGroup.children.find(
      (child) => child.comment === "Info.plist"
    );
    if (!plistChild) {
      return modConfig;
    }
    const sharedElsewhere = Object.entries(groups).some(
      ([key, group]) =>
        !isComment(key) &&
        group !== shareGroup &&
        group.children?.some((child) => child.value === plistChild.value)
    );
    if (!sharedElsewhere) {
      return modConfig;
    }

    const uuid = project.generateUuid();
    fileRefs[uuid] = { ...fileRefs[plistChild.value] };
    fileRefs[`${uuid}_comment`] = "Info.plist";
    plistChild.value = uuid;
    return modConfig;
  });

module.exports = createRunOncePlugin(
  withShareExtensionInfoPlist,
  "with-share-extension-info-plist",
  "1.0.0"
);
