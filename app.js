"use strict";

var express = require('express'),
    request = require('request'),
    url = require('url'),
    querystring = require('querystring'),
    RedisStore = require('connect-redis')(express),
    singly = require('./singly');

var serverUrl = process.env.SERVER_URL;

var singlyUrl = process.env.SINGLY_API_URL || 'https://api.singly.com',
    singlyClientId = process.env.SINGLY_CLIENT_ID;

var redisUrl = url.parse(process.env.REDISTOGO_URL),
    redisOptions = {
        port: redisUrl.port,
        host: redisUrl.hostname,
        pass: redisUrl.auth && redisUrl.auth.split(":")[1] // just the password
    };

var app = express.createServer();

app.set('view engine', 'ejs');

app.configure(function() {
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
        store: new RedisStore(redisOptions),
        secret: process.env.SESSION_SECRET
    }));
    app.use(app.router);
});

app.configure('development', function() {
   app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
   }));
});

app.configure('production', function() {
   app.use(express.errorHandler());
});

function makeAuthLink(service) {
    var data = {
        client_id: singlyClientId,
        redirect_uri: serverUrl + "/auth/singly",
        service: service
    };
    return singlyUrl + "/oauth/authorize?"+querystring.stringify(data);
}

app.get('/', function(req, res){
    if (req.session.profiles) {
        res.send(JSON.stringify(req.session.profiles));
    } else {
        res.send('<a href="'+makeAuthLink('facebook')+'">log in with singly/facebook</a>');
    }
});

app.get('/auth/singly', function(req, res) {

    var data = {
        client_id: process.env.SINGLY_CLIENT_ID,
        client_secret: process.env.SINGLY_CLIENT_SECRET,
        code: req.param('code')
    };

    // TODO: check for presence of code/id/secret

    var params = {
        uri: singlyUrl + '/oauth/access_token',
        body: querystring.stringify(data),
        headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    // TODO: use the OAuth lib for this? or comment why not ;)
    request.post(params, function (err, resp, body) {
        try {
            body = JSON.parse(body);
        } catch(parseErr) {
            return callback(parseErr);
        }

        req.session.access_token = body.access_token;

        // pull down the profile and see how we're doing...

        singly.getProtectedResource('/profiles', req.session.access_token, function(err, profilesBody) {
            try {
                profilesBody = JSON.parse(profilesBody);
            } catch(parseErr) {
                return res.send(parseErr, 500);
            }

            req.session.profiles = profilesBody;

            res.redirect('/');
        });
    });
});

app.listen(process.env.PORT);
