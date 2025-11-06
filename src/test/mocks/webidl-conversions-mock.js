// Mock replacement for webidl-conversions
// This prevents the "Cannot read properties of undefined (reading 'get')" error
// by providing stub implementations

module.exports = {
  // Stub implementations - these are not actually used since we mock URL/URLSearchParams
  DOMString: value => String(value),
  USVString: value => String(value),
  ByteString: value => String(value),
  boolean: value => Boolean(value),
  long: value => Number(value),
  'unsigned long': value => Number(value),
  'long long': value => Number(value),
  'unsigned long long': value => Number(value),
  double: value => Number(value),
  unrestricted: value => Number(value),
  float: value => Number(value),
  'unrestricted float': value => Number(value),
};
