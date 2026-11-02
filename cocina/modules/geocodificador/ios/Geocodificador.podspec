Pod::Spec.new do |s|
  s.name           = 'Geocodificador'
  s.version        = '1.0.0'
  s.summary        = 'Wera Cocina: the phone\'s own geocoder, asked for an address she typed (plan 10.4d)'
  s.description    = 'Apple\'s CLGeocoder behind one Expo module function; no location permission.'
  s.author         = 'Wera'
  s.homepage       = 'https://tu-wera.com'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.swift"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
