module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1746941627205, function(require, module, exports) {
var aws4 = exports,
    url = require('url'),
    querystring = require('querystring'),
    crypto = require('crypto'),
    lru = require('./lru'),
    credentialsCache = lru(1000)

// http://docs.amazonwebservices.com/general/latest/gr/signature-version-4.html

function hmac(key, string, encoding) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest(encoding)
}

function hash(string, encoding) {
  return crypto.createHash('sha256').update(string, 'utf8').digest(encoding)
}

// This function assumes the string has already been percent encoded
function encodeRfc3986(urlEncodedString) {
  return urlEncodedString.replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

function encodeRfc3986Full(str) {
  return encodeRfc3986(encodeURIComponent(str))
}

// A bit of a combination of:
// https://github.com/aws/aws-sdk-java-v2/blob/dc695de6ab49ad03934e1b02e7263abbd2354be0/core/auth/src/main/java/software/amazon/awssdk/auth/signer/internal/AbstractAws4Signer.java#L59
// https://github.com/aws/aws-sdk-js/blob/18cb7e5b463b46239f9fdd4a65e2ff8c81831e8f/lib/signers/v4.js#L191-L199
// https://github.com/mhart/aws4fetch/blob/b3aed16b6f17384cf36ea33bcba3c1e9f3bdfefd/src/main.js#L25-L34
var HEADERS_TO_IGNORE = {
  'authorization': true,
  'connection': true,
  'x-amzn-trace-id': true,
  'user-agent': true,
  'expect': true,
  'presigned-expires': true,
  'range': true,
}

// request: { path | body, [host], [method], [headers], [service], [region] }
// credentials: { accessKeyId, secretAccessKey, [sessionToken] }
function RequestSigner(request, credentials) {

  if (typeof request === 'string') request = url.parse(request)

  var headers = request.headers = Object.assign({}, (request.headers || {})),
      hostParts = (!this.service || !this.region) && this.matchHost(request.hostname || request.host || headers.Host || headers.host)

  this.request = request
  this.credentials = credentials || this.defaultCredentials()

  this.service = request.service || hostParts[0] || ''
  this.region = request.region || hostParts[1] || 'us-east-1'

  // SES uses a different domain from the service name
  if (this.service === 'email') this.service = 'ses'

  if (!request.method && request.body)
    request.method = 'POST'

  if (!headers.Host && !headers.host) {
    headers.Host = request.hostname || request.host || this.createHost()

    // If a port is specified explicitly, use it as is
    if (request.port)
      headers.Host += ':' + request.port
  }
  if (!request.hostname && !request.host)
    request.hostname = headers.Host || headers.host

  this.isCodeCommitGit = this.service === 'codecommit' && request.method === 'GIT'

  this.extraHeadersToIgnore = request.extraHeadersToIgnore || Object.create(null)
  this.extraHeadersToInclude = request.extraHeadersToInclude || Object.create(null)
}

RequestSigner.prototype.matchHost = function(host) {
  var match = (host || '').match(/([^\.]{1,63})\.(?:([^\.]{0,63})\.)?amazonaws\.com(\.cn)?$/)
  var hostParts = (match || []).slice(1, 3)

  // ES's hostParts are sometimes the other way round, if the value that is expected
  // to be region equals ‘es’ switch them back
  // e.g. search-cluster-name-aaaa00aaaa0aaa0aaaaaaa0aaa.us-east-1.es.amazonaws.com
  if (hostParts[1] === 'es' || hostParts[1] === 'aoss')
    hostParts = hostParts.reverse()

  if (hostParts[1] == 's3') {
    hostParts[0] = 's3'
    hostParts[1] = 'us-east-1'
  } else {
    for (var i = 0; i < 2; i++) {
      if (/^s3-/.test(hostParts[i])) {
        hostParts[1] = hostParts[i].slice(3)
        hostParts[0] = 's3'
        break
      }
    }
  }

  return hostParts
}

// http://docs.aws.amazon.com/general/latest/gr/rande.html
RequestSigner.prototype.isSingleRegion = function() {
  // Special case for S3 and SimpleDB in us-east-1
  if (['s3', 'sdb'].indexOf(this.service) >= 0 && this.region === 'us-east-1') return true

  return ['cloudfront', 'ls', 'route53', 'iam', 'importexport', 'sts']
    .indexOf(this.service) >= 0
}

RequestSigner.prototype.createHost = function() {
  var region = this.isSingleRegion() ? '' : '.' + this.region,
      subdomain = this.service === 'ses' ? 'email' : this.service
  return subdomain + region + '.amazonaws.com'
}

RequestSigner.prototype.prepareRequest = function() {
  this.parsePath()

  var request = this.request, headers = request.headers, query

  if (request.signQuery) {

    this.parsedPath.query = query = this.parsedPath.query || {}

    if (this.credentials.sessionToken)
      query['X-Amz-Security-Token'] = this.credentials.sessionToken

    if (this.service === 's3' && !query['X-Amz-Expires'])
      query['X-Amz-Expires'] = 86400

    if (query['X-Amz-Date'])
      this.datetime = query['X-Amz-Date']
    else
      query['X-Amz-Date'] = this.getDateTime()

    query['X-Amz-Algorithm'] = 'AWS4-HMAC-SHA256'
    query['X-Amz-Credential'] = this.credentials.accessKeyId + '/' + this.credentialString()
    query['X-Amz-SignedHeaders'] = this.signedHeaders()

  } else {

    if (!request.doNotModifyHeaders && !this.isCodeCommitGit) {
      if (request.body && !headers['Content-Type'] && !headers['content-type'])
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8'

      if (request.body && !headers['Content-Length'] && !headers['content-length'])
        headers['Content-Length'] = Buffer.byteLength(request.body)

      if (this.credentials.sessionToken && !headers['X-Amz-Security-Token'] && !headers['x-amz-security-token'])
        headers['X-Amz-Security-Token'] = this.credentials.sessionToken

      if (this.service === 's3' && !headers['X-Amz-Content-Sha256'] && !headers['x-amz-content-sha256'])
        headers['X-Amz-Content-Sha256'] = hash(this.request.body || '', 'hex')

      if (headers['X-Amz-Date'] || headers['x-amz-date'])
        this.datetime = headers['X-Amz-Date'] || headers['x-amz-date']
      else
        headers['X-Amz-Date'] = this.getDateTime()
    }

    delete headers.Authorization
    delete headers.authorization
  }
}

RequestSigner.prototype.sign = function() {
  if (!this.parsedPath) this.prepareRequest()

  if (this.request.signQuery) {
    this.parsedPath.query['X-Amz-Signature'] = this.signature()
  } else {
    this.request.headers.Authorization = this.authHeader()
  }

  this.request.path = this.formatPath()

  return this.request
}

RequestSigner.prototype.getDateTime = function() {
  if (!this.datetime) {
    var headers = this.request.headers,
      date = new Date(headers.Date || headers.date || new Date)

    this.datetime = date.toISOString().replace(/[:\-]|\.\d{3}/g, '')

    // Remove the trailing 'Z' on the timestamp string for CodeCommit git access
    if (this.isCodeCommitGit) this.datetime = this.datetime.slice(0, -1)
  }
  return this.datetime
}

RequestSigner.prototype.getDate = function() {
  return this.getDateTime().substr(0, 8)
}

RequestSigner.prototype.authHeader = function() {
  return [
    'AWS4-HMAC-SHA256 Credential=' + this.credentials.accessKeyId + '/' + this.credentialString(),
    'SignedHeaders=' + this.signedHeaders(),
    'Signature=' + this.signature(),
  ].join(', ')
}

RequestSigner.prototype.signature = function() {
  var date = this.getDate(),
      cacheKey = [this.credentials.secretAccessKey, date, this.region, this.service].join(),
      kDate, kRegion, kService, kCredentials = credentialsCache.get(cacheKey)
  if (!kCredentials) {
    kDate = hmac('AWS4' + this.credentials.secretAccessKey, date)
    kRegion = hmac(kDate, this.region)
    kService = hmac(kRegion, this.service)
    kCredentials = hmac(kService, 'aws4_request')
    credentialsCache.set(cacheKey, kCredentials)
  }
  return hmac(kCredentials, this.stringToSign(), 'hex')
}

RequestSigner.prototype.stringToSign = function() {
  return [
    'AWS4-HMAC-SHA256',
    this.getDateTime(),
    this.credentialString(),
    hash(this.canonicalString(), 'hex'),
  ].join('\n')
}

RequestSigner.prototype.canonicalString = function() {
  if (!this.parsedPath) this.prepareRequest()

  var pathStr = this.parsedPath.path,
      query = this.parsedPath.query,
      headers = this.request.headers,
      queryStr = '',
      normalizePath = this.service !== 's3',
      decodePath = this.service === 's3' || this.request.doNotEncodePath,
      decodeSlashesInPath = this.service === 's3',
      firstValOnly = this.service === 's3',
      bodyHash

  if (this.service === 's3' && this.request.signQuery) {
    bodyHash = 'UNSIGNED-PAYLOAD'
  } else if (this.isCodeCommitGit) {
    bodyHash = ''
  } else {
    bodyHash = headers['X-Amz-Content-Sha256'] || headers['x-amz-content-sha256'] ||
      hash(this.request.body || '', 'hex')
  }

  if (query) {
    var reducedQuery = Object.keys(query).reduce(function(obj, key) {
      if (!key) return obj
      obj[encodeRfc3986Full(key)] = !Array.isArray(query[key]) ? query[key] :
        (firstValOnly ? query[key][0] : query[key])
      return obj
    }, {})
    var encodedQueryPieces = []
    Object.keys(reducedQuery).sort().forEach(function(key) {
      if (!Array.isArray(reducedQuery[key])) {
        encodedQueryPieces.push(key + '=' + encodeRfc3986Full(reducedQuery[key]))
      } else {
        reducedQuery[key].map(encodeRfc3986Full).sort()
          .forEach(function(val) { encodedQueryPieces.push(key + '=' + val) })
      }
    })
    queryStr = encodedQueryPieces.join('&')
  }
  if (pathStr !== '/') {
    if (normalizePath) pathStr = pathStr.replace(/\/{2,}/g, '/')
    pathStr = pathStr.split('/').reduce(function(path, piece) {
      if (normalizePath && piece === '..') {
        path.pop()
      } else if (!normalizePath || piece !== '.') {
        if (decodePath) piece = decodeURIComponent(piece.replace(/\+/g, ' '))
        path.push(encodeRfc3986Full(piece))
      }
      return path
    }, []).join('/')
    if (pathStr[0] !== '/') pathStr = '/' + pathStr
    if (decodeSlashesInPath) pathStr = pathStr.replace(/%2F/g, '/')
  }

  return [
    this.request.method || 'GET',
    pathStr,
    queryStr,
    this.canonicalHeaders() + '\n',
    this.signedHeaders(),
    bodyHash,
  ].join('\n')
}

RequestSigner.prototype.filterHeaders = function() {
  var headers = this.request.headers,
      extraHeadersToInclude = this.extraHeadersToInclude,
      extraHeadersToIgnore = this.extraHeadersToIgnore
  this.filteredHeaders = Object.keys(headers)
    .map(function(key) { return [key.toLowerCase(), headers[key]] })
    .filter(function(entry) {
      return extraHeadersToInclude[entry[0]] ||
        (HEADERS_TO_IGNORE[entry[0]] == null && !extraHeadersToIgnore[entry[0]])
    })
    .sort(function(a, b) { return a[0] < b[0] ? -1 : 1 })
}

RequestSigner.prototype.canonicalHeaders = function() {
  if (!this.filteredHeaders) this.filterHeaders()

  return this.filteredHeaders.map(function(entry) {
    return entry[0] + ':' + entry[1].toString().trim().replace(/\s+/g, ' ')
  }).join('\n')
}

RequestSigner.prototype.signedHeaders = function() {
  if (!this.filteredHeaders) this.filterHeaders()

  return this.filteredHeaders.map(function(entry) { return entry[0] }).join(';')
}

RequestSigner.prototype.credentialString = function() {
  return [
    this.getDate(),
    this.region,
    this.service,
    'aws4_request',
  ].join('/')
}

RequestSigner.prototype.defaultCredentials = function() {
  var env = process.env
  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_KEY,
    sessionToken: env.AWS_SESSION_TOKEN,
  }
}

RequestSigner.prototype.parsePath = function() {
  var path = this.request.path || '/'

  // S3 doesn't always encode characters > 127 correctly and
  // all services don't encode characters > 255 correctly
  // So if there are non-reserved chars (and it's not already all % encoded), just encode them all
  if (/[^0-9A-Za-z;,/?:@&=+$\-_.!~*'()#%]/.test(path)) {
    path = encodeURI(decodeURI(path))
  }

  var queryIx = path.indexOf('?'),
      query = null

  if (queryIx >= 0) {
    query = querystring.parse(path.slice(queryIx + 1))
    path = path.slice(0, queryIx)
  }

  this.parsedPath = {
    path: path,
    query: query,
  }
}

RequestSigner.prototype.formatPath = function() {
  var path = this.parsedPath.path,
      query = this.parsedPath.query

  if (!query) return path

  // Services don't support empty query string keys
  if (query[''] != null) delete query['']

  return path + '?' + encodeRfc3986(querystring.stringify(query))
}

aws4.RequestSigner = RequestSigner

aws4.sign = function(request, credentials) {
  return new RequestSigner(request, credentials).sign()
}

}, function(modId) {var map = {"./lru":1746941627206}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1746941627206, function(require, module, exports) {
module.exports = function(size) {
  return new LruCache(size)
}

function LruCache(size) {
  this.capacity = size | 0
  this.map = Object.create(null)
  this.list = new DoublyLinkedList()
}

LruCache.prototype.get = function(key) {
  var node = this.map[key]
  if (node == null) return undefined
  this.used(node)
  return node.val
}

LruCache.prototype.set = function(key, val) {
  var node = this.map[key]
  if (node != null) {
    node.val = val
  } else {
    if (!this.capacity) this.prune()
    if (!this.capacity) return false
    node = new DoublyLinkedNode(key, val)
    this.map[key] = node
    this.capacity--
  }
  this.used(node)
  return true
}

LruCache.prototype.used = function(node) {
  this.list.moveToFront(node)
}

LruCache.prototype.prune = function() {
  var node = this.list.pop()
  if (node != null) {
    delete this.map[node.key]
    this.capacity++
  }
}


function DoublyLinkedList() {
  this.firstNode = null
  this.lastNode = null
}

DoublyLinkedList.prototype.moveToFront = function(node) {
  if (this.firstNode == node) return

  this.remove(node)

  if (this.firstNode == null) {
    this.firstNode = node
    this.lastNode = node
    node.prev = null
    node.next = null
  } else {
    node.prev = null
    node.next = this.firstNode
    node.next.prev = node
    this.firstNode = node
  }
}

DoublyLinkedList.prototype.pop = function() {
  var lastNode = this.lastNode
  if (lastNode != null) {
    this.remove(lastNode)
  }
  return lastNode
}

DoublyLinkedList.prototype.remove = function(node) {
  if (this.firstNode == node) {
    this.firstNode = node.next
  } else if (node.prev != null) {
    node.prev.next = node.next
  }
  if (this.lastNode == node) {
    this.lastNode = node.prev
  } else if (node.next != null) {
    node.next.prev = node.prev
  }
}


function DoublyLinkedNode(key, val) {
  this.key = key
  this.val = val
  this.prev = null
  this.next = null
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1746941627205);
})()
//miniprogram-npm-outsideDeps=["url","querystring","crypto"]
//# sourceMappingURL=index.js.map