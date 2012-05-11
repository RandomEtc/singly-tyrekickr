
var OAuth2 = require('oauth').OAuth2;

var baseUrl = process.env.SINGLY_API_URL || 'https://api.singly.com';

var oa = new OAuth2(process.env.SINGLY_CLIENT_ID, process.env.SINGLY_CLIENT_SECRET, baseUrl);

exports.getOAuthAccessToken = function(code, options, callback) {
   oa.getOAuthAccessToken(code, {}, callback);
};

exports.getProtectedResource = function(path, access_token, callback) {
   oa.getProtectedResource(baseUrl + path, access_token, callback);
}
