const {
  createRunOncePlugin,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

/**
 * expo-widgets removed its hardcoded `.containerBackground(for: .widget)` and expects
 * the JS `containerBackground` modifier instead. WidgetKit still requires the modifier
 * on the native entry view, so without this patch iOS shows:
 * "Please adopt containerBackground API".
 *
 * @see https://github.com/expo/expo/issues/46200
 * @see https://github.com/expo/expo/pull/44192
 */
const ENTRY_VIEW_PATTERN =
  /^(?<indent>\s*)(?<entryViewExpression>(?:WidgetsEntryView|\w+EntryView)\(entry: entry\))\s*$/gm;

const CONTAINER_BACKGROUND_MARKER = "expoWidgetContainerBackground";

/** Brand primary — keep in sync with src/widgets/add-transaction-widget.tsx */
const WIDGET_BACKGROUND_COLOR =
  "Color(red: 47.0 / 255.0, green: 107.0 / 255.0, blue: 255.0 / 255.0)";

const wrapEntryView = (indent, entryViewExpression) =>
  [
    `${indent}Group { // ${CONTAINER_BACKGROUND_MARKER}`,
    `${indent}  if #available(iOS 17.0, *) {`,
    `${indent}    ${entryViewExpression}`,
    `${indent}      .containerBackground(${WIDGET_BACKGROUND_COLOR}, for: .widget)`,
    `${indent}  } else {`,
    `${indent}    ${entryViewExpression}`,
    `${indent}  }`,
    `${indent}}`,
  ].join("\n");

const replaceEntryView = (
  _match,
  _indent,
  _entryViewExpression,
  _offset,
  _source,
  groups
) => wrapEntryView(groups.indent, groups.entryViewExpression);

const patchWidgetSwift = (contents) => {
  if (contents.includes(CONTAINER_BACKGROUND_MARKER)) {
    return contents;
  }

  const patched = contents.replace(ENTRY_VIEW_PATTERN, replaceEntryView);

  if (patched === contents) {
    return contents;
  }

  return patched;
};

const withWidgetContainerBackground = (config) =>
  withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const targetDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "ExpoWidgetsTarget"
      );

      if (!fs.existsSync(targetDir)) {
        console.warn(
          "[withWidgetContainerBackground] ExpoWidgetsTarget not found — skipping."
        );
        return modConfig;
      }

      for (const fileName of fs.readdirSync(targetDir)) {
        if (!fileName.endsWith(".swift") || fileName === "index.swift") {
          continue;
        }

        const filePath = path.join(targetDir, fileName);
        const original = fs.readFileSync(filePath, "utf-8");
        const patched = patchWidgetSwift(original);

        if (patched !== original) {
          fs.writeFileSync(filePath, patched);
          console.log(`[withWidgetContainerBackground] Patched ${fileName}`);
        }
      }

      return modConfig;
    },
  ]);

module.exports = createRunOncePlugin(
  withWidgetContainerBackground,
  "with-widget-container-background",
  "1.0.0"
);
