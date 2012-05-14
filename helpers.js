// useful functions instended to be exposed as Express.js template helpers...

// return a human readable list for the given items,
// e.g. grammaticalJoin([ 1, 2, 3, 4, 5 ]) ==> "1, 2, 3, 4 and 5"
// call grammaticalJoin(list, ', ', ' or ') for optional things
function grammaticalJoin(items, delimeter, finalDelimeter) {
    finalDelimeter = finalDelimeter || ' and ';
    delimeter = delimeter || ', ';
    if (items.length == 1) {
        return items[0];
    } else if (items.length == 2) {
        return items.join(finalDelimeter)
    } else if (items.length >= 3) {
        return items.slice(0,-1).join(delimeter) + finalDelimeter + items.slice(-1);
    }
    return '';
}

// return a human-readable relative date (e.g. "4 weeks ago") for the given Date or millisecond value
function getRelativeTime(ms){
    if (ms instanceof Date) ms = ms.getTime();
    var now = new Date().getTime();
    var timeAgo = Math.floor((now - ms) / 1000);
    if (timeAgo < 60) {
        return timeAgo + " second" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 60);
    if (timeAgo < 60) {
        return "about " + timeAgo + " minute" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 60);
    if (timeAgo < 24) {
        return "about " + timeAgo + " hour" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 24);
    if (timeAgo < 7) {
        return "about " + timeAgo + " day" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 7);
    return "about " + timeAgo + " week" + (timeAgo == 1 ? "" : "s") + " ago";
    // TODO: handle month, year etc.
}

module.exports = {
    grammaticalJoin: grammaticalJoin,
    getRelativeTime: getRelativeTime
}
