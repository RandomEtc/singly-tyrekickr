// useful functions instended to be exposed as Express.js template helpers...

// get the Singly service for a given item, using Singly's idr property:
function getService(item){
    // console.log('getService:', item);
    if (item.idr) {
        var matches = item.idr.match(/\w+\:\w+\@(\w+)\/\w+\#\w+/);
        if (matches && matches.length) {
            return matches[1];
        }
    }
    return 'Unknown Service';
}

// get the name (most human looking name) for the given Singly item:
function getAuthor(item){
    // console.log('getAuthor:', item);
    switch(getService(item)) {
        case 'facebook':
            return item.data.from.name;
        // case 'foursquare':
        //     return 'Unknown Author';
        case 'twitter':
            return item.data.user.name;
        case 'instagram':
            return item.data.user.full_name;
        case 'tumblr':
            return item.data.blog_name;
        // case 'linkedin':
        //     return 'Unknown Author';
        default:
            return 'Unknown Author';
    }
}

// get the most specific link available for the given Singly item:
function getPermalink(item){
    // console.log('getPermalink:', item);
    switch(getService(item)) {
        case 'facebook':
            return 'https://www.facebook.com/photo.php?fbid='+item.data.id;
        // case 'foursquare':
        //     return 'https://foursquare.com/ + ??? + /checkin/'+item.data.checkin.id;
        case 'twitter':
            return 'https://twitter.com/' + item.data.user.screen_name + '/statuses/' + item.data.id_str;
        case 'instagram':
            return item.data.link;
        case 'tumblr':
            return item.data.post_url;
        // case 'linkedin':
        //     return '#';
        default:
            return '#link-unknown';
    }
}

module.exports = {
    getService: getService,
    getAuthor: getAuthor,
    getPermalink: getPermalink
};
