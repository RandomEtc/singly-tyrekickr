"use strict";

var express = require('express'),
    url = require('url'),
    querystring = require('querystring'),
    RedisStore = require('connect-redis')(express),
    OAuth2 = require('oauth').OAuth2;

var serverUrl = process.env.SERVER_URL;

// use an OAuth2 instance to handle basic OAuth dance logistics
var singly = new OAuth2(
    process.env.SINGLY_CLIENT_ID,
    process.env.SINGLY_CLIENT_SECRET,
    process.env.SINGLY_API_URL || 'https://api.singly.com'
);

// patch OAuth2 to accept relative paths and to deal with JSON in one place:
singly.getResource = function(path, access_token, callback) {
    this._request("GET", this._baseSite + path, {}, "", access_token, function(err, body) {
        try {
            body = JSON.parse(body);
            callback(null, body);
        } catch(parseErr) {
            callback(parseErr);
        }
    });
}

// TODO: can these be fetched from Singly API using my client_id?
var displayServices = {
    'facebook': 'Facebook',
    'foursquare': 'Foursquare',
    'twitter': 'Twitter',
    'instagram': 'Instagram',
    'tumblr': 'Tumblr',
    'linkedin': 'LinkedIn',
}
var services = Object.keys(displayServices);

// TODO: use ddollar's redis-uri to tidy this up?
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

// getRelativeTime(ms) and grammaticalJoin(arr,delim,lastdelim)
var helpers = require('./helpers');

// getService(item), getAuthor(item) and getPermalink(item)
var itemHelpers = require('./item-helpers');

var serviceHelpers = {
    makeAuthLink: function(service){
        var data = { service: service, redirect_uri: serverUrl + "/auth/singly" };
        return displayServices[service].link(singly.getAuthorizeUrl(data));
    },
    getDisplayName: function(service){
        return displayServices[service];
    }
};

// merge itemHelpers and serviceHelpers onto helpers:
for (var key in itemHelpers) {
    helpers[key] = itemHelpers[key];
}
for (var key in serviceHelpers) {
    helpers[key] = serviceHelpers[key];
}
console.dir(helpers)
app.helpers(helpers);

app.dynamicHelpers({
    loggedIn: function(req, res) {
        return req.session.access_token && req.session.profiles;
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

// use middleware to enforce requirements:
function withAccessToken(req, res, next) {
    if (req.session.access_token) {
        next();
    } else {
        res.redirect('/');
    }
}

// TODO maybe use middleware to handle pagination?

app.get('/photos', withAccessToken, function(req, res){
    var page = Math.max(1, parseInt(req.param('page'),10) || 1),
        limit = 20,
        params = '?'+querystring.stringify({ limit: limit, offset: limit * (page-1) });
    singly.getResource('/types/photos'+params, req.session.access_token, function(err, items) {
        if (err) {
            console.err(err);
            return res.send("Error fetching photos.", 500);
        }
        if (items.length) {
            res.render('photos', {
                layout: false,
                locals: {
                    whose: "your",
                    items: items,
                    page: page,
                    currentHref: '/photos'
                }
            });
        } else {
            res.send("No more!", 404);
        }
    });
});

app.get('/photos_feed', withAccessToken, function(req, res){
    var page = Math.max(1, parseInt(req.param('page'),10) || 1),
        limit = 20,
        params = '?'+querystring.stringify({ limit: limit, offset: limit * (page-1) });
    singly.getResource('/types/photos_feed'+params, req.session.access_token, function(err, items) {
        if (err) {
            console.err(err);
            return res.send("Error fetching photos_feed.", 500);
        }
        if (items.length) {
            res.render('photos', {
                layout: false,
                locals: {
                    whose: "your contacts'",
                    items: items,
                    page: page,
                    currentHref: '/photos_feed'
                }
            });
        } else {
            res.send("No more!", 404);
        }
    });
});

app.get('/logout', function(req, res){
    req.session.destroy(function(err,rsp) {
        if (err) {
            console.err(err);
            return res.send("problem destroying session", 500);
        }
        res.redirect('/');
    })
});

// after we send people to Singly to auth, they come back here with a code
// we exchange the code for a real access_token which we store in the session
// we also ask Singly about the services this user has and put those in the
// session as well.
app.get('/auth/singly', function(req, res) {
    // first get the access_token:
    singly.getOAuthAccessToken(req.param('code'), {}, function (err, access_token, refresh_token, results) {

        if (err) {
            console.err(err);
            return res.send("Error fetching access token.", 500);
        }
        // store in the Session for later...
        req.session.access_token = access_token;

        // now pull down the profile and see how we're doing...
        singly.getResource('/profiles', access_token, function(err, profiles) {
            if (err) {
                console.err(err);
                return res.send('Error fetching profile.', 500);
            }
            req.session.profiles = profiles;
            // and back to base
            res.redirect('/');
        });
    });
});

app.listen(process.env.PORT);
