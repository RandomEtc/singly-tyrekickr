"use strict";

var express = require('express'),
    request = require('request'),
    url = require('url'),
    querystring = require('querystring'),
    RedisStore = require('connect-redis')(express),
    singly = require('./singly');

// TODO: can these be fetched from Singly API using my client_id?
var services = [
    'facebook',
    'foursquare',
    'twitter',
    'instagram',
    'tumblr',
    'linkedin'
];

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

app.helpers({
    makeAuthLink: function(service){
        var data = {
            client_id: singlyClientId,
            redirect_uri: serverUrl + "/auth/singly",
            service: service
        };
        return singlyUrl + "/oauth/authorize?"+querystring.stringify(data);
    }
});

app.dynamicHelpers({
    loggedIn: function(req, res) {
        return req.session.profiles && req.session.profiles.id;
    },
    activeServices: function(req, res){
        return services.filter(function(service) { return req.session.profiles && (service in req.session.profiles); })
    },
    inactiveServices: function(req, res){
        return services.filter(function(service) { return !req.session.profiles || !(service in req.session.profiles); })
    }
});

app.get('/', function(req, res){
    res.render('home', {
        layout: false,
        locals: {

        }
    });
});

app.get('/photos', function(req, res){
    if (req.session.access_token) {
        var page = Math.max(1, parseInt(req.param('page'),10) || 1),
            limit = 20,
            params = '?'+querystring.stringify({ limit: limit, offset: limit * (page-1) });
        singly.getProtectedResource('/types/photos'+params, req.session.access_token, function(err, photosBody) {
            try {
                photosBody = JSON.parse(photosBody);
            } catch(parseErr) {
                return res.send(parseErr, 500);
            }
            if (photosBody.length) {
                res.render('photos', {
                    layout: false,
                    locals: {
                        whose: "your",
                        data: photosBody,
                        page: page,
                        currentHref: '/photos'
                    }
                });
            } else {
                res.send("No more!", 404)
            }
        });
    } else {
        res.redirect('/');
    }
});

app.get('/photos_feed', function(req, res){
    if (req.session.access_token) {
        var page = Math.max(1, parseInt(req.param('page'),10) || 1),
            limit = 20,
            params = '?'+querystring.stringify({ limit: limit, offset: limit * (page-1) });
        singly.getProtectedResource('/types/photos_feed'+params, req.session.access_token, function(err, photosBody) {
            try {
                photosBody = JSON.parse(photosBody);
            } catch(parseErr) {
                return res.send(parseErr, 500);
            }
            if (photosBody.length) {
                res.render('photos', {
                    layout: false,
                    locals: {
                        whose: "everyone's",
                        data: photosBody,
                        page: page,
                        currentHref: '/photos_feed'
                    }
                });
            } else {
                res.send("No more!", 404)
            }
        });
    } else {
        res.redirect('/');
    }
});

app.get('/logout', function(req, res){
    req.session.destroy(function(err,rsp) {
        if (err) {
            res.send("problem destroying session", 500);
        } else {
            res.redirect('/')
        }
    })
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
