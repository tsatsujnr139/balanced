Pod::Spec.new do |s|
  s.name           = 'BalancedCapture'
  s.version        = '1.0.0'
  s.summary        = 'On-device text recognition and transaction extraction'
  s.description    = 'Reads transaction notifications from screenshots with Vision and extracts them with Apple Foundation Models.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Weak-link so the app still launches on iOS versions without these frameworks.
  s.weak_frameworks = 'FoundationModels'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
