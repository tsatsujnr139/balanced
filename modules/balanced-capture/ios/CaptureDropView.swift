import ExpoModulesCore
import UIKit
import UniformTypeIdentifiers

/// Accepts screenshots dragged in from Photos, Messages, or another app
/// (like the iMessage and WhatsApp composers) and hands them to JS as files.
public final class CaptureDropView: ExpoView, UIDropInteractionDelegate {
  let onDropImages = EventDispatcher()
  let onDropActiveChange = EventDispatcher()

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addInteraction(UIDropInteraction(delegate: self))
  }

  public func dropInteraction(
    _ interaction: UIDropInteraction,
    canHandle session: UIDropSession
  ) -> Bool {
    session.hasItemsConforming(toTypeIdentifiers: [UTType.image.identifier])
  }

  public func dropInteraction(
    _ interaction: UIDropInteraction,
    sessionDidUpdate session: UIDropSession
  ) -> UIDropProposal {
    UIDropProposal(operation: .copy)
  }

  public func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnter session: UIDropSession) {
    onDropActiveChange(["active": true])
  }

  public func dropInteraction(_ interaction: UIDropInteraction, sessionDidExit session: UIDropSession) {
    onDropActiveChange(["active": false])
  }

  public func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnd session: UIDropSession) {
    onDropActiveChange(["active": false])
  }

  public func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
    let providers = session.items.map(\.itemProvider)
    let group = DispatchGroup()
    let lock = NSLock()
    var images: [(index: Int, image: [String: Any])] = []

    for (index, provider) in providers.enumerated() {
      guard let typeIdentifier = Self.imageTypeIdentifier(of: provider) else {
        continue
      }
      group.enter()
      // The original file keeps its metadata (e.g. when the screenshot was taken).
      provider.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { url, _ in
        defer { group.leave() }
        guard let url, let copy = Self.copyToCaches(url) else {
          return
        }
        let type = UTType(typeIdentifier)
        lock.lock()
        images.append((index, [
          "uri": copy.absoluteString,
          "name": provider.suggestedName.map { name in
            type?.preferredFilenameExtension.map { "\(name).\($0)" } ?? name
          } ?? copy.lastPathComponent,
          "mimeType": type?.preferredMIMEType ?? "image/png",
        ]))
        lock.unlock()
      }
    }

    group.notify(queue: .main) { [weak self] in
      let ordered = images.sorted { $0.index < $1.index }.map(\.image)
      if !ordered.isEmpty {
        self?.onDropImages(["images": ordered])
      }
    }
  }

  private static func imageTypeIdentifier(of provider: NSItemProvider) -> String? {
    provider.registeredTypeIdentifiers.first { identifier in
      UTType(identifier)?.conforms(to: .image) ?? false
    }
  }

  /// The provided file is deleted when the load handler returns, so keep a copy.
  private static func copyToCaches(_ url: URL) -> URL? {
    let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("CaptureDrops", isDirectory: true)
    let destination = directory.appendingPathComponent(
      "\(UUID().uuidString).\(url.pathExtension.isEmpty ? "png" : url.pathExtension)"
    )
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try FileManager.default.copyItem(at: url, to: destination)
      return destination
    } catch {
      return nil
    }
  }
}
