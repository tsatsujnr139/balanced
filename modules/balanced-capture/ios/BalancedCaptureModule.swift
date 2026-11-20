import ExpoModulesCore
import Foundation
import ImageIO
import Vision

#if canImport(FoundationModels)
import FoundationModels
#endif

public class BalancedCaptureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BalancedCapture")

    Function("getCapabilities") { () -> [String: Any] in
      [
        "textRecognition": TextRecognizer.isSupported,
        "onDeviceModel": TransactionExtractor.availability,
      ]
    }

    AsyncFunction("recognizeTextAsync") { (uri: String) async throws -> [String: Any] in
      let url = try fileURL(from: uri)
      let text = try await TextRecognizer.recognize(url: url)
      var result: [String: Any] = ["text": text]
      if let capturedAt = ImageMetadata.capturedAt(url: url) {
        result["capturedAt"] = capturedAt.timeIntervalSince1970 * 1000
      }
      return result
    }

    AsyncFunction("extractTransactionsAsync") { (text: String) async throws -> [[String: Any]] in
      try await TransactionExtractor.extract(text: text)
    }

    View(CaptureDropView.self) {
      Events("onDropImages", "onDropActiveChange")
    }
  }
}

// MARK: - Errors

final class InvalidImageUriException: GenericException<String> {
  override var reason: String {
    "Invalid image URI: \(param)"
  }
}

final class TextRecognitionUnavailableException: Exception {
  override var reason: String {
    "Text recognition requires iOS 18 or later"
  }
}

final class OnDeviceModelUnavailableException: GenericException<String> {
  override var code: String {
    "ERR_MODEL_UNAVAILABLE"
  }

  override var reason: String {
    "The on-device model is unavailable: \(param)"
  }
}

final class InputTooLongException: Exception {
  override var code: String {
    "ERR_INPUT_TOO_LONG"
  }

  override var reason: String {
    "The text is too long for the on-device model"
  }
}

final class ExtractionFailedException: GenericException<String> {
  override var code: String {
    "ERR_EXTRACTION_FAILED"
  }

  override var reason: String {
    "The on-device model could not extract transactions: \(param)"
  }
}

private func fileURL(from uri: String) throws -> URL {
  if let url = URL(string: uri), url.scheme != nil {
    return url
  }
  if uri.hasPrefix("/") {
    return URL(fileURLWithPath: uri)
  }
  throw InvalidImageUriException(uri)
}

// MARK: - Text recognition

enum TextRecognizer {
  static var isSupported: Bool {
    if #available(iOS 18.0, *) {
      return true
    }
    return false
  }

  /// Recognised lines in reading order (top to bottom, then left to right).
  static func recognize(url: URL) async throws -> String {
    guard #available(iOS 18.0, *) else {
      throw TextRecognitionUnavailableException()
    }

    var request = RecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    let observations = try await request.perform(on: url)

    // Vision uses a bottom-left origin, so a larger maxY is higher on screen.
    let lineTolerance = 0.005
    let sorted = observations.sorted { lhs, rhs in
      let lhsRect = lhs.boundingBox.cgRect
      let rhsRect = rhs.boundingBox.cgRect
      if abs(lhsRect.maxY - rhsRect.maxY) > lineTolerance {
        return lhsRect.maxY > rhsRect.maxY
      }
      return lhsRect.minX < rhsRect.minX
    }
    return sorted
      .compactMap { $0.topCandidates(1).first?.string }
      .joined(separator: "\n")
  }
}

// MARK: - Image metadata

enum ImageMetadata {
  private static let exifDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy:MM:dd HH:mm:ss"
    return formatter
  }()

  /// When the screenshot or photo was taken, if the file records it.
  static func capturedAt(url: URL) -> Date? {
    guard
      let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    else {
      return nil
    }

    let exif = properties[kCGImagePropertyExifDictionary] as? [CFString: Any]
    let tiff = properties[kCGImagePropertyTIFFDictionary] as? [CFString: Any]
    let png = properties[kCGImagePropertyPNGDictionary] as? [CFString: Any]
    let candidates = [
      exif?[kCGImagePropertyExifDateTimeOriginal],
      exif?[kCGImagePropertyExifDateTimeDigitized],
      tiff?[kCGImagePropertyTIFFDateTime],
      png?[kCGImagePropertyPNGCreationTime],
    ]
    for case let value as String in candidates {
      if let date = exifDateFormatter.date(from: value) {
        return date
      }
    }
    return nil
  }
}

// MARK: - On-device extraction

enum TransactionExtractor {
  /// Rough cap that keeps prompt, schema, and response inside the 4K-token window.
  static let maximumInputCharacters = 6000

  static var availability: String {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      switch SystemLanguageModel.default.availability {
      case .available:
        return "available"
      case .unavailable(.deviceNotEligible):
        return "deviceNotEligible"
      case .unavailable(.appleIntelligenceNotEnabled):
        return "appleIntelligenceNotEnabled"
      case .unavailable(.modelNotReady):
        return "modelNotReady"
      case .unavailable:
        return "unavailable"
      }
    }
    #endif
    return "unsupportedOS"
  }

  static func extract(text: String) async throws -> [[String: Any]] {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      return try await extractWithFoundationModels(text: text)
    }
    #endif
    throw OnDeviceModelUnavailableException("unsupportedOS")
  }

  #if canImport(FoundationModels)
  @available(iOS 26.0, *)
  private static func extractWithFoundationModels(text: String) async throws -> [[String: Any]] {
    let status = availability
    guard status == "available" else {
      throw OnDeviceModelUnavailableException(status)
    }
    guard text.count <= maximumInputCharacters else {
      throw InputTooLongException()
    }

    let session = LanguageModelSession(instructions: extractionInstructions)
    // Xcode 27 renamed this initializer; EAS can still build with Xcode 26.
    let options: GenerationOptions
    #if compiler(>=6.4)
    options = GenerationOptions(samplingMode: .greedy)
    #else
    options = GenerationOptions(sampling: .greedy)
    #endif
    do {
      let response: LanguageModelSession.Response<TransactionExtraction> = try await session.respond(
        to: text,
        generating: TransactionExtraction.self,
        options: options
      )
      return response.content.transactions.map { transaction in transaction.dictionary }
    } catch {
      if isContextOverflow(error) {
        throw InputTooLongException()
      }
      throw ExtractionFailedException(String(describing: error))
    }
  }

  @available(iOS 26.0, *)
  private static func isContextOverflow(_ error: Error) -> Bool {
    // A runtime availability check alone cannot hide a type from an older SDK.
    #if compiler(>=6.4)
    if #available(iOS 27.0, *), let error = error as? LanguageModelError,
      case .contextSizeExceeded = error
    {
      return true
    }
    #endif
    if let error = error as? LanguageModelSession.GenerationError,
      case .exceededContextWindowSize = error
    {
      return true
    }
    return false
  }

  private static let extractionInstructions = """
    You read bank and mobile money notifications (SMS text or text recognised \
    from a screenshot) for a personal finance app in Ghana. Extract every \
    complete transaction notification. Copy numbers exactly as printed and never \
    invent values: leave a field empty when the message does not state it. Skip \
    promotional messages, Messages-app timestamps, and messages cut off at the \
    start or end.
    """
  #endif
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable(description: "One money movement described in a notification")
struct ExtractedTransaction {
  @Guide(description: "Amount as printed, digits and decimal point only, e.g. 1071.75")
  var amount: String

  @Guide(description: "Currency code for the sent amount, e.g. GHS, USD, USDT. Use the currency printed, not a default.")
  var currency: String?

  @Guide(description: "Amount received for a currency exchange, digits and decimal point only, when printed")
  var toAmount: String?

  @Guide(description: "Currency code of the received amount, e.g. USD, USDT, GHS, when printed")
  var toCurrency: String?

  @Guide(
    description: "debit when money left the account holder's account, credit when it arrived",
    .anyOf(["debit", "credit"])
  )
  var direction: String

  @Guide(description: "Fee or charge as printed, digits and decimal point only")
  var fee: String?

  @Guide(description: "Account balance after the transaction, digits and decimal point only")
  var balanceAfter: String?

  @Guide(description: "Name, phone number, or network of the other party")
  var counterparty: String?

  @Guide(description: "Reference or narration typed by the sender")
  var reference: String?

  @Guide(description: "Transaction or reference ID exactly as printed")
  var transactionId: String?

  @Guide(description: "Date and time printed inside the message, formatted YYYY-MM-DD HH:MM")
  var occurredAt: String?

  @Guide(description: "Who sent the notification, e.g. MTN MoMo, GhanaPay, First National Bank")
  var institution: String?

  @Guide(description: "Short description of what the payment was for")
  var summary: String

  @Guide(description: "The notification text this transaction was read from, copied verbatim")
  var sourceText: String

  var dictionary: [String: Any] {
    var result: [String: Any] = [
      "amount": amount,
      "direction": direction,
      "sourceText": sourceText,
      "summary": summary,
    ]
    let optionals: [String: String?] = [
      "balanceAfter": balanceAfter,
      "counterparty": counterparty,
      "currency": currency,
      "toAmount": toAmount,
      "toCurrency": toCurrency,
      "fee": fee,
      "institution": institution,
      "occurredAt": occurredAt,
      "reference": reference,
      "transactionId": transactionId,
    ]
    for (key, value) in optionals {
      if let value, !value.isEmpty {
        result[key] = value
      }
    }
    return result
  }
}

@available(iOS 26.0, *)
@Generable(description: "All complete transaction notifications found in the text")
struct TransactionExtraction {
  var transactions: [ExtractedTransaction]
}
#endif
