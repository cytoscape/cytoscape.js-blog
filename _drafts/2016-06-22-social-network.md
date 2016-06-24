---
layout: post
title: Graphing a social network
subtitle: Using Twitter and Cytoscape.js to visualize social influence
tags:
- tutorial
---

# Introduction

This tutorial is the third part in a series of tutorials about [Cytoscape.js](http://js.cytoscape.org) written by [Joseph Stahl](http://josephstahl.com/) for Google Summer of Code 2016.
For readers new to Cytoscape.js, [part 1]({% post_url 2016-05-24-getting-started %}) and [part 2]({% post_url 2016-06-08-glycolysis %}) are recommended reading.

Due to the [Twitter API](https://dev.twitter.com/rest/public) being rate-limited, this tutorial will use existing data.
**This means that when running the graph, you *must* specify cytoscape as the Twitter username on the webpage**.
For readers interested in using their own data, I've made a [Node.js server available](https://github.com/cytoscape/cytoscape.js-tutorials/tree/master/twitterAPI_express) with [instructions in README.md](https://github.com/cytoscape/cytoscape.js-tutorials/blob/master/twitterAPI_express/README.md).

In this tutorial, I will focus on loading elements into Cytoscape.js from JSON files that may be located on other servers.
Additionally, I will cover switching between layouts, changing individual node appearance, and using extensions.  

# Getting ready

Like before, we'll start with `index.html` so that the graph has an element to draw itself within.

```html
<!doctype html>
<html>
<head>
    <meta charset='utf-8'></meta>
    <title>Tutorial 3: Twitter</title>
    <script src='assets/cytoscape.js'></script>
    <script src='assets/jquery-2.2.4.js'></script>
    <script src='main.js'></script>
</head>
<style>
    #cy {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0px;
        left: 0px;
    }
</style>
<body>
    <div id='cy'></div>
</body>
``` 

**Note that `cytoscape.js` is now in an `assets/` folder.**
[Download the most recent version of Cytoscape.js](http://js.cytoscape.org) and unzip `cytoscape.js` to the `assets/` folder.
Do the same for [jQuery 2](https://code.jquery.com/), which will be used for downloading JSON data.
As this tutorial progresses many more Javascript files will be added so we'll place them in `assets/` to keep things organized.

Now it's time to start with `main.js`.
Like in the previous tutorials, we must wait for DOM layout to finish before giving Cytoscape.js a container.
To accomplish this, we'll again turn to [`DOMContentLoaded`](https://developer.mozilla.org/en-US/docs/Web/Events/DOMContentLoaded).

```javascript
"use strict";
document.addEventListener('DOMContentLoaded', function() {
  var mainUser;
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy')
  });
});
```

`mainUser` refers to the name of the Twitter user the graph will be built around.
The value will be set later by getting the value of an input field.

`var cy = window.cy = cytoscape({ ... })` is the standard Cytoscape.js initialization pattern, with a slight modification (`window.cy`) to make this instance of Cytoscape.js visible globally to help with debugging.

# Adding the first user

## The HTML side

First, we'll add an input field and submit button to `index.html` to get the name of a Twitter user.

```html
<!doctype html>
<html>
<head>
    <meta charset='utf-8'></meta>
    <title>Tutorial 3: Twitter</title>
    <script src='assets/cytoscape.js'></script>
    <script src='main.js'></script>
</head>
<style>
    #cy {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0px;
        left: 0px;
    }
    input[type='button'] {
        width: 100%;
    }
    #userSelection {
        position: absolute;
        top: 5%;
        left: 2%;
        width: 10%;
    }
</style>
<body>
    <div id='cy'></div>
    <div id='userSelection'>
        <input type='text' id='twitterHandle' placeholder="Twitter username">
        <input type='button' id='submitButton' value='Start graph'>
    </div>
</body>
``` 

Here we've made changes to the CSS and added a new `<div>` element.
It should look like this: 
![input buttons]({{site.baseurl}}/public/demos/twitter-graph/screenshots/input_button.png)

Now to get this button to do something when clicked, we'll turn back to `main.js`

## The JS side

```javascript
  var submitButton = document.getElementById('submitButton');
  submitButton.addEventListener('click', function() {
    cy.elements().remove();
    var userInput = document.getElementById('twitterHandle').value;
    if (userInput) {
      mainUser = userInput;
    } else {
      // default value
      mainUser = 'cytoscape';
    }
  });
```

This code should be placed within the `DOMContentLoaded` block of `main.js`.
Here the submit button is selected, then given an action.
Currently the only action performed is clearing the graph (useful for when a user tries several users in a row without reloading the page).
Before we can go further here, we need to write a few functions to use.

# Functions for adding nodes

A few functions come to mind: 

- Getting data about `mainUser` and the followers of `mainUser`
  - Converting this data from a Twitter user object to an object Cytoscape.js can use
- Adding `mainUser` to the graph
  - Adding the followers of `mainUser` to the graph
  - Connecting `mainUser` and his or her followers
- Go out a level and repeat, this time with the top three followers of `mainUser`

A pattern emerges here; getting data about a user and her or his followers is done several times so we'll make that into a method.
Similarly, adding followers and connecting to an existing user is also a good fit for a method.

When we are moving out a level and getting the top followers of `mainUser`, we need a way to make sure the followers we're sorting are recently added.
In other words, there's no point in finding a several-million-follower user early on and continually ranking them first.
Instead, we want to focus on new users, such that after we've populated "level 2" (i.e. the followers of `mainUser`'s followers) we will no longer examine level 1.

With this in mind, we can define interfaces for our new functions:

- `getTwitterPromise(targetUser)` takes one argument and will return a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) (to be covered in detail soon!)
  - `targetUser`: the user (as an ID string) whose followers will be requested from Twitter 
- `addToGraph(targetUser, followers, level)` takes three arguments and will modify `cy`
  - `targetUser`: this time, the user object provided by Twitter
  - `followers`: an array of follower objects to be added to the graph
  - `level`: an integer; refers to the degrees out from the initially specified user and helps to prevent the same users from coming up during follower ranking
  - Here we'll also define `twitterUserObjToCyEle()` to convert Twitter user objects to Cytoscape.js nodes
- `addFollowersByLevel(level, options)`: takes two arguments and will repeatedly run until the graph is built
  - `level`: same as `addToGraph`; integer refering to degrees out from original user
  - `options`: an object with several parameters for `addFollowersByLevel`
    - `maxLevel`: integer; number of degrees to fill before ending
    - `usersPerLevel`: integer; refers to number of users to get followers for at each level
    - `layout`: the layout to run after all elements have been added

## getTwitterPromise(targetUser)

Since this function does not rely on the `cy` object at all, it will be located outside of the `DOMContentLoaded` listener.

```javascript
function getTwitterPromise(targetUser) {
  // Use cached data
  var userPromise = $.ajax({
    url: '(http://blog.js.cytoscape.org/public/demos/twitter-graph/cache/' + targetUser + '-user.json',
    type: 'GET',
    dataType: 'json'
  });

  var followersPromise = $.ajax({
    url: 'http://blog.js.cytoscape.org/public/demos/twitter-graph/cache/' + targetUser + '-followers.json',
    type: 'GET',
    dataType: 'json'
  });

  return Promise.all([userPromise, followersPromise])
    .then(function(then) {
      return {
        user: then[0],
        followers: then[1]
      };
    });
}
```

*If you're following along and running your own copy of the API, modify the request URL (likely to `localhost:3000/twitter/`), change from `GET` to `POST`, and add `data: { username: targetUser }` to make the request properly.* 

For those unfamiliar with [jQuery](https://jquery.com/), it's a JavaScript library that can help us with asynchronously downloading JSON files (in this case, cached Twitter data).
Additionally, it'll be useful for adding an extension to the graph later.

The `return` statement is undoubedtly the most interesting part of this statement; it will return a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) object.
Some work has already been done in this function; rather than returning an array of Promises (ex: `[userPromise, followersPromise]`), a single Promise is returned.
[`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) is a method for coalescing many Promises into a single promise.
Here, we are using it to return a Promise which will resolve when both of jQuery's AJAX calls have resolved.
[`.then(function(then) { ... })`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) is a method for Promises which is called when `Promise.all()` is fulfilled (also known as resolved) and like `Promise.all()`, returns a Promise.
Since `Promise.all()` was given an array of two Promises, it will resolve to two values in `.then()`, which are stored in an object as `user` and `followers` properties.
In short, `Promise.all()` takes two Promises and will return one Promise which is then given to `Promise.then()`, which also returns a Promise.
This one Promise, when successfully fulfilled, will have its valued passed to whatever function is specified in `getTwitterPromise(username).then(myFunction)`.
The value is already known, since we specified it as the `{ user: then[0], followers: then[1] }` object.

Confused yet? Hopefully this will make more sense when you see it in action back in the `submitButton` function.

## addToGraph(targetUser, followers, level)

Recall that `targetUser` is a user object and followers is an array that user's followers.
Because of this, we'll need to convert from the object received from Twitter (or, for the purposes of this tutorial, the object created from cached data) to an object conforming to the [Cytoscape.js specification](http://js.cytoscape.org/#notation/elements-json).
Before we can add the user (either `targetUser` or one of `followers`), it's necessary to check whether the element already exists—this could happen if Person C follows Person A and Person B; in this case, Person C may be added while adding Person A's followers and would not need to be added again for Person B.
Cytoscape.js provides [`empty()`](http://js.cytoscape.org/#eles.empty) which, when combined with [`getElementById()`](http://js.cytoscape.org/#cy.getElementById), will efficiently check whether an element already exists.

Adding elements to the graph will occur in three steps:

1. Add `targetUser` at the `level` specified
2. For every user in `followers`:
  - Add that user at `level + 1`
  - Add a line between the newly added user and `targetUser`

Now that an outline of `addToGraph()` has been defined, the code naturally falls into place.
Because this function requires an initialized `cy` element, we'll place with within the `DOMContentLoaded` function, before our `submitButton` listener and after `var cy = cytoscape{ ... }`.

```javascript
  function addToGraph(targetUser, followers, level) {
    // targetUser
    if (cy.getElementById(targetUser.id_str).empty()) {
      cy.add(twitterUserObjToCyEle(targetUser, level));
    }
    // targetUser's followers
    var targetId = targetUser.id_str; // saves calls while adding edges
    cy.batch(function() {
      followers.forEach(function(twitterFollower) {
        if (cy.getElementById(twitterFollower.id_str).empty()) {
          // level + 1 since followers are 1 degree out from the main user
          cy.add(twitterUserObjToCyEle(twitterFollower, level + 1));
          cy.add({
            data: {
              id: 'follower-' + twitterFollower.id_str,
              source: twitterFollower.id_str,
              target: targetId
            }
          });
        }
      });
    });
  }
```

Because `targetUser` and `followers` are Twitter objects rather than Cytoscape.js objects, `getElementById()` is using `id_str`.
`id_str` is one of the several dozen names in the Twitter object and corresponds to the `id` name of nodes in the Cytoscape.js graph.
[`getElementById()`](http://js.cytoscape.org/#cy.getElementById) will return a [collection](http://js.cytoscape.org/#collection) of all elements matching that ID (of which there will only be 0 or 1, since elements must have unique IDs).
In the case that the collection has 0 elements, [`empty()`](http://js.cytoscape.org/#eles.empty) will return true and the element will be added.

Adding `targetUser` is straightforward, requiring only a call to `twitterUserObjToCyEle()` and [`cy.add()`](http://js.cytoscape.org/#cy.add).
`twitterUserObjToCyEle()` is necessary for converting the Twitter user object to a Cytoscape.js object and will be covered in the next section.
It combines several values from the Twitter object with `level` to return a Cytoscape.js object to be added. 

Adding users from `followers` is similar to adding `targetUser` but has slightly more complexity because of the array.
First, `targetId` is defined as the `id_str` (which is also the `id` of the Cytoscape.js node) for efficiency because it is used repeatedly through the `forEach()` loop.
Next, [`cy.batch()`](http://js.cytoscape.org/#cy.batch) is called and the remaining code is wrapped within the function passed to `cy.batch()`.
`cy.batch()` has a huge benefit to performance, since instead of modifying the appearance of the graph after each user is added, it will allow all calls to `cy.add()` to finish and then update the graph's appearance a single time.
The `followers` array is stepped through with [`forEach()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) to get individual followers.
Within the function passed to `forEach()`, we perform the same `.empty()` check as before to make sure we're only adding unique nodes.
Also like before, `cy.add()` is called on the result of `twitterUserObjToCyEle()`.
Helpfully, the same `twitterUserObjToCyEle()` works for both `targetUser` and users from `followers` because the objects returned from Twitter are very similar.
This time, `twitterUserObjToCyEle()` is given `level + 1` because followers should be placed one level out from `targetUser`.
Finally, an edge between this newly added follower and `targetUser` is added.
To keep the IDs unique, I'm prepending `'follower-'` to each follower's `id_str`. 

## twitterUserObjToCyEle()

This function serves a single purpose: converting Twitter user objects to Cytoscape.js nodes.
There's very little to explain; we just take the Twitter user object and a `level` and return a Cytoscape.js object.
As the code does not rely on `cy`, we're free to place it after the `DOMContentLoaded` listener.

```javascript
function twitterUserObjToCyEle(user, level) {
  return {
    data: {
      id: user.id_str,
      username: user.screen_name,
      followerCount: user.followers_count,
      tweetCount: user.statuses_count,
      // following data for qTip
      fullName: user.name,
      followingCount: user.friends_count,
      location: user.location,
      description: user.description,
      profilePic: user.profile_image_url,
      level: level
    }
  };
}
```

Right now `twitterUserObjToCyEle` creates Cytoscape.js nodes with far more information than is necessary; we'll use it later on for modifying appearance and extending the graph.

## addFollowersByLevel(level, options)

This function ties together `getTwitterPromise()` and `addToGraph()` to find top users (users with the highest followers) at a given level, query Twitter for a top user's followers, and add the resulting followers to the graph.

Place the following at the very end the `DOMContentLoaded` listener. 

```javascript
function addFollowersByLevel(level, options) {
    function followerCompare(a, b) {
      return a.data('followerCount') - b.data('followerCount');
    }

    function topFollowerPromises(sortedFollowers) {
      return sortedFollowers.slice(-options.usersPerLevel)
        .map(function(follower) {
          // remember that follower is a Cy element so need to access username
          var followerName = follower.data('username');
          return getTwitterPromise(followerName);
        });
    }

    var quit = false;
    if (level < options.maxLevel && !quit) {
      var topFollowers = cy.nodes()
          .filter('[level = ' + level + ']')
          .sort(followerCompare);
      var followerPromises = topFollowerPromises(topFollowers);
      Promise.all(followerPromises)
        .then(function(userAndFollowerData) {
          // all data returned successfully!
          for (var i = 0; i < userAndFollowerData.length; i++) {
            var twitterData = userAndFollowerData[i];
            if (twitterData.user.error || twitterData.followers.error) {
              // error occured, such as rate limiting
              var error = twitterData.user.error ? twitterData.user : twitterData.followers;
              console.log('Error occured. Code: ' + error.status + ' Text: ' + error.statusText);
              if (error.status === 429) {
                // rate limited, so stop sending requests
                quit = true;
              }
            } else {
              addToGraph(twitterData.user, twitterData.followers, level);
            }
          }
          addFollowersByLevel(level + 1, options);
        }).catch(function(err) {
          console.log('Could not get data. Error message: ' + err);
        });
    } else {
      // reached the final level, now let's lay things out
      options.layout.run();
    }
  }
```

This function relies on two smaller functions and a sorted array which I'll introduce now.

### followerCompare(a, b)
Cytoscape.js allows for [sorting](http://js.cytoscape.org/#eles.sort) based on a user-defined function.
We'll be sorting based on follower counts so we need to write a function to compare followers.

```javascript
    function followerCompare(a, b) {
      return a.data('followerCount') - b.data('followerCount');
    }
```

This function takes two arguments (objects passed by [`.sort()`](http://js.cytoscape.org/#eles.sort)) and will return a positive integer if `a`'s count is larger and a negative integer if `b`'s is larger.
Follower counts were added to the objects by `twitterUserObjToCyEle()` so they are easily accessed with [`.data()`](http://js.cytoscape.org/#eles.data).


### topFollowers

```javascript
      var topFollowers = cy.nodes()
          .filter('[level = ' + level + ']')
          .sort(followerCompare);
```

This function uses `cy.nodes()` to get a [collection](http://js.cytoscape.org/#collection) and then filters it with [`.filter()`](http://js.cytoscape.org/#eles.filter).
The `level` parameter passed to `addFollowersByLevel()` and referenced throghout this tutorial is finally put to use to ensure that only one level of users is selected (avoiding repeatedly getting high-follower-count users in lower levels).
It's inside the large `if` block because sorting is only necessary if we'll be issueing requests for JSON data (when `level < options.maxLevel`).
Lastly, this collection is sorted with the previously defined `followerCompare`, which will sort the list in ascending order by follower count.

### topFollowerPromises(sortedFollowers)

Promises have returned!

```javascript
    function topFollowerPromises(sortedFollowers) {
      return sortedFollowers.slice(-options.usersPerLevel)
        .map(function(follower) {
          // remember that follower is a Cy element so need to access username
          var followerName = follower.data('username');
          return getTwitterPromise(followerName);
        });
    }
```

This function takes a collection of Cytoscape.js nodes, sorted by followers, as an argument and will return an array of Promises which resolve to an object containing follower data for the most-followed users in each level.

First, [`sortedFollowers.slice(-options.usersPerLevel)`](http://js.cytoscape.org/#eles.slice) is called so that this function only operates on the most popular users in a given level. Since `sortedFollowers` is in ascending order, a negative bound is used. 
Then, [.map()](http://js.cytoscape.org/#eles.map) is used to run a function on each of these users.
`.map()` provides the object as an argument to its function; in this case, we'll call the object `follower`.
Becase `getTwitterPromise()` expects a username rather than a Cytoscape.js node, we first get `follower`'s username, then return a Promise for that user.

### The rest of addFollowersByLevel()

```javascript
    var quit = false;
    if (level < options.maxLevel && !quit) {
      var topFollowers = cy.nodes()
          .filter('[level = ' + level + ']')
          .sort(followerCompare);
      var followerPromises = topFollowerPromises(topFollowers);
      Promise.all(followerPromises)
        .then(function(userAndFollowerData) {
          // all data returned successfully!
          for (var i = 0; i < userAndFollowerData.length; i++) {
            var twitterData = userAndFollowerData[i];
            if (twitterData.user.error || twitterData.followers.error) {
              // error occured, such as rate limiting
              var error = twitterData.user.error ? twitterData.user : twitterData.followers;
              console.log('Error occured. Code: ' + error.status + ' Text: ' + error.statusText);
              if (error.status === 429) {
                // rate limited, so stop sending requests
                quit = true;
              }
            } else {
              addToGraph(twitterData.user, twitterData.followers, level);
            }
          }
          addFollowersByLevel(level + 1, options);
        }).catch(function(err) {
          console.log('Could not get data. Error message: ' + err);
        });
    } else {
      // reached the final level, now let's lay things out
      options.layout.run();
    }
```

We'll declare `quit` to ensure that errors stop the graph.
This isn't much of a concern using cached data, but when getting data from Twitter, it's possible to run into rate limiting—no point in continuing after being rate limited.

Next, we start a large `if` block (checking `quit` and `level` to make sure we don't run more iterations than requested).
`var followerPromises = topFollowerPromises(topFollowers);` will assign an array of Promises to `followerPromises`, which is immediately resolved in the next line with `Promise.all(followerPromises).then( ... )`. If an error arises, it's handled by the `.catch()` statement later on, which prints the error and allows the program to move on.

If the `.then()` statement is run, all Promises in `followerPromises` must have resolved successfully so we now have user and follower data to process.
By using a loop, `twitterData` is assigned to the value returned by an individual Promise within `followerPromises` (recall that the value returned is an object; this was defined in `getTwitterPromise()`.
Despite `followerPromises` being fulfilled successfully, there's still a possibility that an error occured (such as trying to get data for a private user) so we'll need to check whether the `error` key exists in `twitterData` (I chose to use this field in by Node.js server so that other Promises wouldn't be abandoned even if one didn't fill successfully due to a private user).

If an error did occur, `error` is assigned to whichever part of the object had the error (`user` or `followers`) and information is logged.
Additionally, if it was a rate-limiting error, graphing of additional levels is stopped.

Hopefully no error occured, and we can go ahead with adding the returned `twitterData` to the graph with `addToGraph()`.
Because `twitterData` is an object with both `user` and `follower` properties, we need to separate them for `addToGraph()`.

Finally, `level` is incremented and `addFollowersByLevel()` is called again with the same `option` object (because options do not change). If this is the last run of `addFollowersByLevel` (when `level = options.maxLevel`), we'll skip adding elements to the graph and instead run a layout to organize all the newly added elements. Defining the `layout` property of `options` will by covered in the Style and Layout section.

## A brief return to submitButton

All methods necessary for adding elements to the graph have been defined, so we can finish writing a function for `submitButton`.

```javascript
submitButton.addEventListener('click', function() {
    cy.elements().remove();
    var userInput = document.getElementById('twitterHandle').value;
    if (userInput) {
      mainUser = userInput;
    } else {
      // default value
      mainUser = 'cytoscape';
    }

    // add first user to graph
    getTwitterPromise(mainUser)
      .then(function(then) {
        addToGraph(then.user, then.followers, 0);

        // add followers
        try {
          var options = {
            maxLevel: 4,
            usersPerLevel: 3,
            layout: concentricLayout
          };
          addFollowersByLevel(1, options);
        } catch (error) {
          console.log(error);
        }
      })
      .catch(function(err) {
        console.log('Could not get data. Error message: ' + err);
      });
  });
```

This function is structured similarly to `addFollowersByLevel()`, minus sorting top followers.
We're only getting data for one user (the username in the input box) so there's no need to loop through the Promises either.

We get a Promise for `mainUser` and on its fulfillment, add the returned data to the graph at level 0 (recall that `addToGraph()` takes care of converting the Twitter user object to a Cytoscape.js node).
After adding the main user and that user's followers, we can expand outwards with `addFollowersByLevel()`, starting from level 1 (the followers of the main user).
The `options` object, containing properties that are constant between calls of `addFollowersByLevel()`, is specified here. I've used these values (`maxLevel: 4, usersPerLevel: 3`) when downloading data for the cache so if you want to change these, [running your own API](https://github.com/cytoscape/cytoscape.js-tutorials/tree/master/twitterAPI_express) is necessary.

In case there's an error, we don't want to abort the graphing (it's better to display the graph in its current state than to throw an error and erase everything).
To accomplish this, `addFollowersByLevel()` is wrapped in a [`try...catch`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch) block.
Additionally, the entire Promise.then() function has a [`.catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) statement at the end to collect and print any error produced by a Promise that was rejected.

# Intermission

JSON data is available [on GitHub](https://github.com/cytoscape/cytoscape.js-blog/tree/gh-pages/public/demos/twitter-graph/cache).
Make sure your folder layout looks like this:

```
twitter-graph/
    +-- assets/
        +-- cytoscape.js
        +-- jquery-2.2.4.js
    +-- cache/
        +-- BenjaminEnfield-followers.json
        +-- BenjaminEnfield-user.json
        +-- charlesherring-followers.json
        +-- charlesherring-user.json
        +-- cytoscape-followers.json
        +-- cytoscape-user.json
        +-- ElsevierConnect-followers.json
        +-- ElsevierConnect-user.json
        +-- iamfountainhead-followers.json
        +-- iamfountainhead-user.json
        +-- JeffreyHayzlett-followers.json
        +-- JeffreyHayzlett-user.json
        +-- kahaba-followers.json
        +-- kahaba-user.json
        +-- KanhemaPhoto-followers.json
        +-- KanhemaPhoto-user.json
        +-- officialbskip-followers.json
        +-- officialbskip-user.json
        +-- SimplyAfterDark-followers.json
        +-- SimplyAfterDark-user.json
    +-- main.js
    +-- index.html
```

If you're interested in running the graph to see what it looks like, comment out the call to `options.layout.run()` in `addFollowersByLevel()` and the `layout` property of `options` in the `submitButton` listener function since a layout function is not yet defined.
Then, you'll have enough of the graph done to reload, run via the submit button, and see a graph that you can drag around!

![intermission]({{site.baseurl}}/public/demos/twitter-graph/screenshots/intermission.png)

If you don't see anything, make sure you've a web server running (`npm install -g http-server` is a good start) in the `twitter-graph` directory. Unlike before, opening a file in the web browser (as in Ctrl-O => `index.html) will not work because many browsers block loading of files (such as JSON data) from other domains.

The graph is quite boring though, so next we'll add some style and give the user layout choices.

# Style and Layout

Because style and layout options were already covered in [part 1]({% post_url 2016-05-24-getting-started %}) and [part 2]({% post_url 2016-06-08-glycolysis %}), I won't go into as much detail here.

## Defining layouts

Unlike previous tutorials, we'll give users a choice between two layout options: concentric and force-directed. We'll default to `concentricLayout` (this option is set in the `options` object in the `submitButton` listener. To allow for switching between them, we'll create [layout objects](http://js.cytoscape.org/#layouts) with [`makeLayout()`](http://js.cytoscape.org/#cy.makeLayout).

### Concentric layout

Within the `DOMContentLoaded` listener, add the following code: 

```javascript
  var concentricLayout = cy.makeLayout({
    name: 'concentric',
    concentric: function(node) {
      return 10 - node.data('level');
    },
    levelWidth: function() {
      return 1;
    },
    animate: false
  });
```

This creates a [concentric layout](http://js.cytoscape.org/#layouts/concentric) without actually running the layout (since elements are not added to the graph until the user clicks the submit button, there's no reason to run a layout beforehand).
In a concentric layout, the higher the value returned to `concentric`, the closer the node will be to the center of the graph. Because we have been using `level = 0` for the center of the graph, we'll subtract `level` from 10 to get a high value for central nodes and a low value for leaf nodes.
`levelWidth` expects a function which will be used for determining how wide a range of `concentric` values will be mapped to a single concentric circle of the graph. In this case, we've made each level separated by a value of 1 so this function will return 1 every time (so that `level=0` gets its own circle, `level=1` has its own circle, `level=2` has its own circle, etc.).

### Force directed layout

Next to `concentricLayout`, add the following code:

```javascript
  var forceLayout = cy.makeLayout({
    name: 'cose',
    animate: false
  });
```

[`cose`](http://js.cytoscape.org/#layouts/cose) is a force-directed layout which is good for seeing clique-esque sections of the graph—clusters of users who all follow each other. The low rate limit for the Twitter API limits its usefulness here (we can't get complete lists of followers for all users) but there are still some interesting results from this layout.

## Layout buttons

Before we can run these layouts manually, we'll need to add buttons to the webpage.
Return to `index.html` and insert the following:

```html
<style>
    <!-- other style blocks omitted for brevity -->
    #layoutButtons {
        position: absolute;
        top: 5%;
        right: 2%;
    }
</style>
<body>
    <div id='cy'></div>
    <div id='userSelection'>
        <input type='text' id='twitterHandle' placeholder="Twitter username">
        <input type='button' id='submitButton' value='Start graph'>
    </div>
    <div id='layoutButtons'>
        <input type='button' id='concentricButton' value='Concentric'>
        <input type='button' id='forceButton' value='Force-directed'>
    </div>
</body>
```

Now that we've added the buttons, it's time to give them a function, much like `submitButton`.

## Layout button functions

Back in `main.js`, add the following to the `DOMContentLoaded` listener: 

```javascript
  var concentricButton = document.getElementById('concentricButton');
  concentricButton.addEventListener('click', function() {
    concentricLayout.run();
  });

  var forceButton = document.getElementById('forceButton');
  forceButton.addEventListener('click', function() {
    forceLayout.run();
  });
```

After the complexities of Promises, isn't it nice to have something straightforward?
[`layout.run()`](http://js.cytoscape.org/#layout.run) will run our previously-defined layout (either concentric or force-directed) when the corresponding button is clicked. Pretty simple!

Now that layouts have been defined, you'll be able to uncomment the layout commands I talked about during Intermission (`options.layout.run()` and the `layout` property of `options`)—you have layouts to run!

## Style

Adding a style to the graph will help convey information to users.
In this graph, I've chosen to map node opacity to tweet count and node size to follower count.
Back in `var cy = ...`, we'll finally specify a `style` property!

```javascript
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(username)',
          'width': 'mapData(followerCount, 0, 400, 50, 150)',
          'height': 'mapData(followerCount, 0, 400, 50, 150)',
          'background-color': '#02779E',
          'background-opacity': 'mapData(tweetCount, 0, 2000, 0.1, 1)'
        }
      }
    ]
  });
```

Cytoscape.js provides [several other node properties](http://js.cytoscape.org/#style) that can be styled if you don't like these options.
I'm using a special Cytoscape.js option, [`mapData()`](http://js.cytoscape.org/#style/mappers) for the values of `width`, `height`, and `background-opacity` which will change the style of individual nodes depending on their properties.
These defaults give the nodes a light blue color (fitting, since we're dealing with Twitter) and provide minimums for size (50px) and opacity (0.1) so that nodes won't be invisible for low-tweet or low-follower users.

**The "core" of the graph is now complete. We've been able to download data asynchronously, add it to the graph, adjust the appearance of the graph, and switch between layouts. Congratulations!**

# Extensions

With the core of the graph done, it's time to add some more features.
Remember all those extra properties we added with `twitterUserObjToCyEle`?
It's time to make use of them, using an extension called [qTip](https://github.com/cytoscape/cytoscape.js-qtip). 
qTip will allow use to see Twitter user information whenever we select a node.

## qTip

First, we'll need to [download qTip](http://qtip2.com/download).
In case you run into issues, try using version 3.0.3 (the most recent version when I made this tutorial). Place `jquery.qtip.min.css`, `jquery.qtip.min.js`, and `jquery.qtip.min.map` in the `assets/` folder. Additionally, we need the Cytoscape.js extension that connects qTip to Cytoscape.js. [Get `cytoscape-qtip.js` here](https://github.com/cytoscape/cytoscape.js-qtip) and move it to `assets/` (I'm using version 2.4.0).

With the files downloaded, it's time to load the qTip extension into our graph. First, we'll need to load the files in `index.html`:

```html
<head>
    <meta charset='utf-8'></meta>
    <title>Tutorial 3: Twitter</title>
    <link type="text/css" rel="stylesheet" href="assets/jquery.qtip.min.css" />
    <script src='assets/jquery-2.2.4.js'></script>
    <script src='assets/jquery.qtip.min.js'></script>
    <script src='assets/cytoscape.js'></script>
    <script src='assets/cytoscape-qtip.js'></script>
    <script src='main.js'></script>
</head>
```

Note that in addition to the `.js` files added, I also added the qTip stylesheet so that the tooltip appearance can be modified.

Back in `main.js`, we'll need to add a function which displays a qTip box whenever a node is selected.
Because the tooltip will be displayed in response to an event (a click), we'll use Cytoscape.js's [events](http://js.cytoscape.org/#core/events) functionality.

In the `DOMContentLoaded` listener, add the following statement:

```javascript
  cy.on('select', 'node', function(event) {
    var target = event.cyTarget;
    target.qtip({
      content: {
        text: qtipText(target),
        title: target.data('fullName')
      },
      style: {
        classes: 'qtip-bootstrap'
      }
    });
  });
```

This uses the [`cy.on()`](http://js.cytoscape.org/#cy.on) listener to bind to node selection. [Part 2]({% post_url 2016-06-08-glycolysis %}) has a discussion of events for those interested. I'll be focusing on the `.qtip()` part for this tutorial.

The qTip extension was loaded in `index.html`, so we're free to use `.qtip()` here.
The object passed to the Cytoscape.js qTip extension is identical to [normal qTip](http://qtip2.com/guides#content) in terms of `content` and `style` but some of the values are different. For `text`, we'll be using a function `qtipText()` that builds an HTML string from the data of a Cytoscape.js node. For `title`, we can easily extract the name of a user from a selected node with `data('fullName')`. The `style` property is there to make things look nice.

## qtipText(node)

Because the graph element is passed to `qtipText()` and `qtipText()` otherwise makes no calls to `cy`, we'll place `qtipText()` outside the `DOMContentLoaded` listener.

```javascript
function qtipText(node) {
  var twitterLink = '<a href="http://twitter.com/' + node.data('username') + '">' + node.data('username') + '</a>';
  var following = 'Following ' + node.data('followingCount') + ' other users';
  var location = 'Location: ' + node.data('location');
  var image = '<img src="' + node.data('profilePic') + '" style="float:left;width:48px;height:48px;">';
  var description = '<i>' + node.data('description') + '</i>';

  return image + twitterLink + '<br>' + location + '<br>' + following + '<p><br>' + description + '</p>';
}
```

This function is here to build up an HTML string for qTip to display within the tooltip box. Each variable accesses one of the properties of the Cytoscape.js we saved in `twitterUserObjToCyEle` and surrounds it with some HTML tags to get a properly-formatted string to return.

With this function complete, integration with qTip is complete! 

# Conclusion

The finished graph should look something like this after running: 

![finished]({{site.baseurl}}/public/demos/twitter-graph/screenshots/finished.png)

With a qTip box open: 

![finished]({{site.baseurl}}/public/demos/twitter-graph/screenshots/qtip.png)

Congratulations on finishing Tutorial 3!



# TODO
- Try other force-directed layout options