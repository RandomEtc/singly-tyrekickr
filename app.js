"use strict";

var express = require('express'),
    request = require('request'),
    url = require('url'),
    RedisStore = require('connect-redis')(express),
    singly = require('./singly');

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

app.get('/', function(req, res){
    res.send('Hello World');
});

app.get('/auth/singly', function(req, res) {

    var data = {
        client_id: process.env.SINGLY_CLIENT_ID,
        client_secret: process.env.SINGLY_CLIENT_SECRET,
        code: req.param('code')
    };

    // TODO: check for presence of code/id/secret

    var params = {
        uri: hostUrl + '/oauth/access_token',
        body: querystring.stringify(data),
        headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    request.post(params, function (err, resp, body) {

        // find the access token...

        try {
            body = JSON.parse(body);
        } catch(parseErr) {
            return res.send(parseErr, 500);
        }

        req.session.access_token = body.access_token;

        // pull down the profile and see how we're doing...

        singly.getProtectedResource('/profiles', req.session, function(err, profilesBody) {
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
