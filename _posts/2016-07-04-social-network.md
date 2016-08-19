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
**This means that when running the graph, you *must* specify `cytoscape` as the Twitter username on the webpage**.
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
</html>
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
If you are running your own Twitter API server, the value may be set later by getting the value of an input field.
In the more common case of using the cached data, only one user may be graphed (cytoscape) so there's no need for this input field.

`var cy = window.cy = cytoscape({ ... })` is the standard Cytoscape.js initialization pattern, with a slight modification (`window.cy`) to make this instance of Cytoscape.js visible globally to help with debugging.

# Adding the center user

Because this tutorial is geared towards using cached data rather than downloading unique data, allowing user input of a Twitter username is unnecessary.
With that in mind, we'll hide the user input field (it may be unhidden for those with their own Twitter API access and server running).

## The HTML side

Although these HTML elements are hidden, adding them means that they can later be unhidden if one is running the [Twitter API server](https://github.com/cytoscape/cytoscape.js-tutorials/tree/master/twitterAPI_express) I wrote.
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
        display: none;
    }
</style>
<body>
    <div id='cy'></div>
    <div id='userSelection'>
        <input type='text' id='twitterHandle' placeholder="Twitter username">
        <input type='button' id='submitButton' value='Start graph'>
    </div>
</body>
</html>
``` 

Here we've made changes to the CSS and added a new `<div>` element.
Keep in mind that the `<div>` element is hidden so there should be no change in the graph's appearance.

Returning to `main.js`, we'll give this button a function to handle events, then run this function manually because it's difficult to click an invisible button!

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
Note that although the submit button is not displayed (unless a user unhides it while running their own API server), it still exists and can therefore be given an action.
Currently the only action performed is clearing the graph (useful for when a user tries several Twitter handles in a row without reloading the page), and setting `mainUser` to `cytoscape` if no other user is defined.
By default, `mainUser` will always be set to `cytoscape` because the username input box is hidden.
Before we can go further here, we need to write a few functions to use.

# Functions for adding nodes

A few functions come to mind: 

- Getting data about `mainUser` and the followers of `mainUser`
  - Converting this data from a Twitter user object to an object Cytoscape.js can use
- Adding `mainUser` to the graph
  - Adding the followers of `mainUser` to the graph
  - Connecting `mainUser` and his or her followers
- Go out a level and repeat, this time with the top three followers of `mainUser`

A pattern emerges here; getting data about a user and her or his followers is done several times so we'll make that into a function.
Similarly, adding followers and connecting to an existing user is also a good fit for a function.

When we are moving out a level and getting the top followers of `mainUser`, we need a way to make sure the followers we're sorting are recently added.
In other words, there's no point in finding a several-million-follower user early on and continually ranking them first.
Instead, we want to focus on new users, such that after we've populated "level 2" (i.e. the followers of `mainUser`'s followers) we will no longer examine level 1.

With this in mind, we can define interfaces for our new functions:

- `getUser(targetUser)` takes one argument and will return a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) (to be covered in detail soon!)
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

## getUser(targetUser)

Since this function does not rely on the `cy` object at all, it will be located outside of the `DOMContentLoaded` listener.

```javascript
function getUser(targetUser) {
  // Use cached data
  var userPromise = $.ajax({
    url: 'http://blog.js.cytoscape.org/public/demos/twitter-graph/cache/' + targetUser + '-user.json',
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
`$` is a quick way to use jQuery.
Additionally, it'll be useful for adding an extension to the graph later.

The `return` statement is undoubedtly the most interesting part of this statement; it will return a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) object.
Some work has already been done in this function; rather than returning an array of Promises (ex: `[userPromise, followersPromise]`), a single Promise is returned.
[`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) is a function for coalescing many Promises into a single Promise.
Here, we are using it to return a Promise which will resolve when both of jQuery's AJAX calls have resolved.
[`.then(function(then) { ... })`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) is a function for Promises which is called when `Promise.all()` is fulfilled (also known as resolved) and like `Promise.all()`, returns a Promise.
Since `Promise.all()` was given an array of two Promises, it will resolve to two values (`then[0]` and `then[1]`), which are stored in an object as `user` and `followers` properties.
In short, `Promise.all()` takes two Promises and will return one Promise which is then given to `Promise.then()`, which also returns a Promise.
This one Promise, when successfully fulfilled, will have its valued passed to whatever function is specified in `getUser(username).then(myFunction)`.
The format of `then` passed to `myFunction()` is already known, since we specified it as the `{ user: then[0], followers: then[1] }` object.

If you're confused, I hope this will make more sense when you see it in action back in the `submitButton` function.

## addToGraph(targetUser, followers, level)

Recall that `targetUser` is a user object and `followers` is an array of that user's followers.
Both are in formats provided by Twitter's API rather than the format expected by Cytoscape.js.
Because of this, we'll need to convert from the object received from Twitter (or, for the purposes of this tutorial, the object created from cached data) to an object conforming to the [Cytoscape.js specification](http://js.cytoscape.org/#notation/elements-json).
Before we can add the user (either `targetUser` or one of `followers`), it's necessary to check whether the element already exists—this could happen if Person C follows Person A and Person B; in this case, Person C may be added while adding Person A's followers and would not need to be added again for Person B.
Cytoscape.js provides [`empty()`](http://js.cytoscape.org/#eles.empty) which, when combined with [`getElementById()`](http://js.cytoscape.org/#cy.getElementById), will efficiently check whether an element already exists.

Adding elements to the graph will occur in three steps:

1. Add `targetUser` at the `level` specified
2. For every user in `followers`:
  - Add that user at `level + 1`
  - Add an edge between the newly added user and `targetUser`

Now that an outline of `addToGraph()` has been defined, the code naturally falls into place.
Because this function requires an initialized `cy` element, we'll place it within the `DOMContentLoaded` function, before our `submitButton` listener and after `var cy = cytoscape{ ... }`.

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
            },
            selectable: false
          });
        }
      });
    });
  }
```

Because `targetUser` and `followers` are Twitter objects rather than Cytoscape.js objects, `getElementById()` is using `id_str`.
`id_str` is one of the several dozen keys in the Twitter object and corresponds to the `id` name of nodes in the Cytoscape.js graph.
[`getElementById()`](http://js.cytoscape.org/#cy.getElementById) will return a [collection](http://js.cytoscape.org/#collection) of all elements matching that ID (of which there will only be 0 or 1, since elements must have unique IDs).
In the case that the collection has 0 elements, [`empty()`](http://js.cytoscape.org/#eles.empty) will return true and the element will be added.

Adding `targetUser` is straightforward, requiring only a call to `twitterUserObjToCyEle()` and [`cy.add()`](http://js.cytoscape.org/#cy.add).
`twitterUserObjToCyEle()` is necessary for converting the Twitter user object to a Cytoscape.js object and will be covered in the next section.
It combines several values from the Twitter object with `level` to return a Cytoscape.js object to be added. 

Adding users from `followers` is similar to adding `targetUser` but has slightly more complexity because of the array.
First, `targetId` is defined as the `id_str` of `targetUser` (which is also the `id` of the Cytoscape.js node) for efficiency because it is used repeatedly through the `forEach()` loop.
Next, [`cy.batch()`](http://js.cytoscape.org/#cy.batch) is called and the remaining code is wrapped within the function passed to `cy.batch()`.
`cy.batch()` has a huge benefit to performance, since instead of modifying the appearance of the graph after each user is added, it will allow all calls to `cy.add()` to finish and then update the graph's appearance a single time.
The `followers` array is stepped through with [`forEach()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) to get individual followers.
Within the function passed to `forEach()`, we perform the same `.empty()` check as before to make sure we're only adding unique nodes.
Also like before, `cy.add()` is called on the result of `twitterUserObjToCyEle()`.
Helpfully, the same `twitterUserObjToCyEle()` works for both `targetUser` and users from `followers` because the objects returned from Twitter are very similar.
This time, `twitterUserObjToCyEle()` is given `level + 1` because followers should be placed one level out from `targetUser`.
Finally, an edge between this newly added follower and `targetUser` is added.
To keep the IDs unique, I'm prepending `'follower-'` to each follower's `id_str`.
The `selectable` property is set to false because in this graph, only nodes are of interest (edges have no function besides representing follower connections).

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
    },
    position: {
      x: -1000000,
      y: -1000000
  };
}
```

Right now `twitterUserObjToCyEle` creates Cytoscape.js nodes with far more information than is necessary; we'll use it later on for modifying appearance and extending the graph.
Specifying x and y coordinates for `position` ensures that nodes are added off-screen during graph initialization, giving things a more polished look.
They will move into focus when a layout is run because layouts default to adjusting the viewport to show elements in the layout.

## addFollowersByLevel(level, options)

This function ties together `getUser()` and `addToGraph()` to find top users (users with the highest followers) at a given level, query Twitter for a top user's followers (or use cached data), and add the resulting followers to the graph.

Place the following at the very end of the `DOMContentLoaded` listener. 

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
          return getUser(followerName);
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
The `level` parameter passed to `addFollowersByLevel()` and referenced throughout this tutorial is finally put to use to ensure that only one level of users is selected (avoiding repeatedly getting high-follower-count users in lower levels).
It's inside the large `if` block because sorting is only necessary if we'll be issuing requests for JSON data (when `level < options.maxLevel`).
Lastly, this collection is sorted with the previously defined `followerCompare`, which will sort the list in ascending order by follower count.

### topFollowerPromises(sortedFollowers)

Promises have returned!

```javascript
    function topFollowerPromises(sortedFollowers) {
      return sortedFollowers.slice(-options.usersPerLevel)
        .map(function(follower) {
          // remember that follower is a Cy element so need to access username
          var followerName = follower.data('username');
          return getUser(followerName);
        });
    }
```

This function takes a collection of Cytoscape.js nodes, sorted by followers, as an argument and will return an array of Promises which resolve to an object containing follower data for the most-followed users in each level.

First, [`sortedFollowers.slice(-options.usersPerLevel)`](http://js.cytoscape.org/#eles.slice) is called so that this function only operates on the most popular users in a given level. Since `sortedFollowers` is in ascending order, a negative bound is used. 
Then, [`.map()`](http://js.cytoscape.org/#eles.map) is used to run a function on each of these users.
`.map()` provides an array element as an argument to its function; in this case, we'll call the element `follower`.
Becase `getUser()` expects a username rather than a Cytoscape.js node, we first get `follower`'s username, then return a Promise for `followerName`.

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
By using a loop, `twitterData` is assigned to the value returned by an individual Promise within `followerPromises` (recall that the value returned is an object; this was defined in `getUser()`.
Despite `followerPromises` being fulfilled successfully, there's still a possibility that an error occured (such as trying to get data for a private user) so we'll need to check whether the `error` key exists in `twitterData` (I chose to use this field in my Node.js server so that other Promises wouldn't be abandoned even if one didn't fill successfully due to a private user).

If an error did occur, `error` is assigned to whichever part of the object had the error (`user` or `followers`) and information is logged.
Additionally, if it was a rate-limiting error, graphing of additional levels is stopped by setting `quit` to `true`.

Hopefully no error occured, and we can go ahead with adding the returned `twitterData` to the graph with `addToGraph()`.
Because `twitterData` is an object with both `user` and `follower` properties, we need to separate them for `addToGraph()`.

Finally, `level` is incremented and `addFollowersByLevel()` is called again with the same `option` object (because options do not change).
If this is the last run of `addFollowersByLevel` (when `level = options.maxLevel`), we'll skip adding elements to the graph and instead run a layout to organize all the newly added elements.
Defining the `layout` property of `options` will by covered in the **Style and Layout** section.

## A brief return to submitButton

All functions necessary for adding elements to the graph have been defined, so we can finish writing a function for `submitButton`.

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
    getUser(mainUser)
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
Additionally, the entire `Promise.then()` function has a [`.catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) statement at the end to collect and print any error produced by a Promise that was rejected.

A keen-eyed reader may notice that we just spent a huge amount of time defining an event handler for an event that will never happen—no button click should happen when the submit button is hidden.
To make this event handler run, add the following immediately below `submitButton.addEventListener( ... );`:

```javascript
  submitButton.click();
```

This will run our submit button automatically.

# Intermission

JSON data is available [on GitHub](https://github.com/cytoscape/cytoscape.js-blog/tree/gh-pages/public/demos/twitter-graph/cache).
However, it should not be necessary because the JSON files will be downloaded from GitHub pages rather than being loaded from local disk.
Make sure your folder layout looks like this:

```
twitter-graph/
    +-- assets/
        +-- cytoscape.js
        +-- jquery-2.2.4.js
    +-- main.js
    +-- index.html
```

If you're interested in running the graph to see what it looks like, comment out the call to `options.layout.run()` in `addFollowersByLevel()` and the `layout` property of `options` in the `submitButton` listener function since a layout function is not yet defined.
Then, you'll have enough of the graph done to reload and see a graph that you can drag around!

If you don't see anything, make sure you've a web server running (`npm install -g http-server` is a good start) in the `twitter-graph` directory.
Unlike before, opening a file in the web browser (as in Ctrl-O => `index.html`) will not work because many browsers block loading of files (such as JSON data) from other domains.

The graph is quite boring though, so next we'll add some style options and run a layout.

# Style and Layout

Because style and layout options were already covered in [part 1]({% post_url 2016-05-24-getting-started %}) and [part 2]({% post_url 2016-06-08-glycolysis %}), I won't go into as much detail here.

## Defining a layout

In this tutorial, we'll be using a concentric layout—good for representing the increasing degrees out from the initial username.
Creating [layout objects](http://js.cytoscape.org/#layouts) with [`makeLayout()`](http://js.cytoscape.org/#cy.makeLayout) gives us the flexibility to use layouts besides `concentricLayout` (although concentric is the focus of this tutorial).
Other layouts may be tested by defining them and setting `options.layout` (in the submitButton listener) equal to the user-defined layout rather than `concentricLayout`.

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

## Layout buttons

In order to run a layout manually, we'll need to add a button to the webpage.
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
        <input type='button' id='concentricButton' value='Redo layout'>
    </div>
</body>
</html>
```

Now that we've added the button, it's time to give it a function, much like our invisible `submitButton`.

## Layout button function

Back in `main.js`, add the following to the `DOMContentLoaded` listener: 

```javascript
  var concentricButton = document.getElementById('concentricButton');
  concentricButton.addEventListener('click', function() {
    concentricLayout.run();
  });
```

After the complexities of Promises, isn't it nice to have something straightforward?
[`layout.run()`](http://js.cytoscape.org/#layout.run) will run our previously-defined layout when the corresponding button is clicked. Pretty simple!

Now that a layout has been defined, you'll be able to uncomment the layout commands I talked about during Intermission (`options.layout.run()` and the `layout` property of `options`)—you have a layout to run!

## Style

Adding a style to the graph will help convey information to users.
In this graph, I've chosen to map node color to tweet count and node size to follower count.
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
          'background-color': 'mapData(tweetCount, 0, 2000, #aaa, #02779E)'
        }
      }
    ]
  });
```

Cytoscape.js provides [several other node properties](http://js.cytoscape.org/#style) that can be styled if you don't like these options.
I'm using a special Cytoscape.js option, [`mapData()`](http://js.cytoscape.org/#style/mappers) for the values of `width`, `height`, and `background-color` which will change the style of individual nodes depending on their properties.
These defaults give the nodes a light blue color (fitting, since we're dealing with Twitter) and provide minimums for `width` and `height` (50px) so that nodes won't be invisible for low-tweet users.

Now that we've styled nodes, let's style edges too.
They're much less complicated, since we don't want edges to do anything.
This is accomplished by adding another selector and setting the [`events`] property to `no`

```javascript
document.addEventListener('DOMContentLoaded', function() {
  var mainUser;
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(username)',
          'width': 'mapData(followerCount, 0, 400, 50, 150)',
          'height': 'mapData(followerCount, 0, 400, 50, 150)',
          'background-color': 'mapData(tweetCount, 0, 2000, #aaa, #02779E)'
        }
      },
      {
        selector: 'edge',
        style: {
          events: 'no'
        }
      }
    ]
  });
```

Additionally, it'd be nice to make it clear which node is selected. We can accomplish this by adding a black border around the selected node.
Like in CSS, it's possible for an element to match several style rules.
With this in mind, we can add a style rule that specifies a border for a selected node while leaving all other properties the same as ordinary nodes.
Cytoscape.js provides a [`:selected`](http://js.cytoscape.org/#selectors/state) state that will limit the style to selected nodes only.
Again, in the `style` object:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  var mainUser;
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(username)',
          'width': 'mapData(followerCount, 0, 400, 50, 150)',
          'height': 'mapData(followerCount, 0, 400, 50, 150)',
          'background-color': 'mapData(tweetCount, 0, 2000, #aaa, #02779E)'
        }
      },
      {
        selector: 'edge',
        style: {
          events: 'no'
        }
      },
      {
        selector: ':selected',
        style: {
          'border-width': 10,
          'border-style': 'solid',
          'border-color': 'black'
        }
      }
    ]
  });
``` 

On selection, we want to add a 10px black border to the selected node.
The border is automatically removed when the node is no longer selected, since it will no longer have a `:selected` attribute.

**The "core" of the graph is now complete. We've been able to download data asynchronously, add it to the graph, adjust the appearance of the graph, and run a concentric layout. Congratulations!**

# Extensions

With the core of the graph done, it's time to add some more features.
Remember all those extra properties we added with `twitterUserObjToCyEle()`?
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
The qTip extension will display a tooltip whenever a node is selected, so the only step necessary to set up qTip is calling `.qtip()` on each node as we add it.
Because we want to modify all nodes with the qTip extension, we'll need to make sure that all nodes have been added to the graph before calling `.qtip()` on each one.
With this in mind, we'll place the `.qtip()` call immediately after `options.layout.run()` in `addFollowersByLevel()`.

In the `addFollowersByLevel()`, add the `.forEach()` statement following `options.layout.run()` in `addFollowersByLevel()`'s `else` statement:

```javascript
      options.layout.run();
      cy.nodes().forEach(function(ele) {
        ele.qtip({
          content: {
            text: qtipText(ele),
            title: ele.data('fullName')
          },
          style: {
            classes: 'qtip-bootstrap'
          },
          position: {
            my: 'bottom center',
            at: 'top center',
            target: ele
          }
        });
      });
```

This uses [`forEach()`](http://js.cytoscape.org/#collection/iteration/eles.forEach) to call `qtip()` on each node of the graph.

The qTip extension was loaded in `index.html`, so we're free to use `.qtip()` here.
The object passed to the Cytoscape.js qTip extension is identical to [normal qTip](http://qtip2.com/guides#content) in terms of `content` and `style` but some of the values are different. For `text`, we'll be using a function `qtipText()` that builds an HTML string from the data of a Cytoscape.js node. For `title`, we can easily extract the name of a user from a selected node with `data('fullName')`.
The `style` and `position` properties are there to make things look nice.

## qtipText(node)

Because the graph element is passed to `qtipText()` and `qtipText()` otherwise makes no calls to `cy`, we'll place `qtipText()` outside the `DOMContentLoaded` listener.

```javascript
function qtipText(node) {
  var twitterLink = '<a href="http://twitter.com/' + node.data('username') + '">' + node.data('username') + '</a>';
  var following = 'Following ' + node.data('followingCount') + ' other users';
  var location = 'Location: ' + node.data('location');
  var image = '<img src="' + node.data('profilePic') + '" style="float:left;width:48px;height:48px;">';
  var description = '<i>' + node.data('description') + '</i>';

  return image + '&nbsp' + twitterLink + '<br> &nbsp' + location + '<br> &nbsp' + following + '<p><br>' + description + '</p>';
}
```

This function is here to build up an HTML string for qTip to display within the tooltip box. Each variable accesses one of the properties of the Cytoscape.js we saved in `twitterUserObjToCyEle` and surrounds it with some HTML tags to get a properly-formatted string to return.

With this function complete, integration with qTip is complete!
However, I've also added a style rule to change the fonts of the qTip box; adding the following style to `index.html` will allow for a better font:

```css
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
    }
```

# A loading spinner

For the last bit of extra polish, we'll add a loading spinner to the graph so that there is something besides a blank white screen to look at while nodes are being created and added off-screen.
This will be done using [Font Awesome](http://fontawesome.io/), which conveniently includes a loading spinner for us to use.

In `index.html`, add a new CSS file to `<head>` to bring in Font Awesome:

```html
<head>
    <meta charset='utf-8'></meta>
    <title>Tutorial 3: Twitter</title>
    <link type="text/css" rel="stylesheet" href="assets/jquery.qtip.min.css" />
    <link type="text/css" rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css" />
    <script src='assets/jquery-2.2.4.js'></script>
    <script src='assets/jquery.qtip.min.js'></script>
    <script src='assets/cytoscape.js'></script>
    <script src='assets/cytoscape-qtip.js'></script>
    <script src='main.js'></script>
</head>
```

Now we'll need to give the graph a special loading appearance and provide a way to clear this when the graph is done loading.
Add the following CSS rules to the `<style>` section:

```css
    #loading {
    position: absolute;
    display: block;
    left: 0;
    top: 50%;
    width: 100%;
    text-align: center;
    margin-top: -0.5em;
    font-size: 2em;
    color: #000;
    }
    #loading.loaded {
    display: none;
    }
```

This code (borrowed heavily from my Google Summer of Code mentor Max Franz's [Wine and Cheese demo](https://gist.github.com/maxkfranz/cde4db55e581d10405f5)) will put the spinner in the center of the graph and clear it when the `.loaded` class is added.

In `index.html`, we'll create the spinner: 

```html
<body>
    <div id='cy'></div>
    <div id="loading">
        <span class="fa fa-refresh fa-spin"></span>
    </div>
    <!--userSelection and layoutButtons omitted for brevity -->
</body>
```

Then, in `main.js`, we'll hide the spinner as soon as the graph is done loading.
All code that runs after populating the graph exists in the `else` statement of `addFollowersByLevel()`; clearing the loading spinner will be done there too.

```javascript
    else {
      // reached the final level, now let's lay things out
      options.layout.run();
      cy.nodes().forEach(function(ele) {
        // omitted for brevity
      });
      var loading = document.getElementById('loading');
      loading.classList.add('loaded');
    }
```

These two lines will select the loading element and add the `loaded` style which hides the spinner.
Waiting for an event is unnecessary because this part of the code will only run once all `.add()` operations have finished.

# Conclusion

The finished graph should look something like this after running: 

![finished]({{site.baseurl}}/public/demos/twitter-graph/screenshots/finished.png)

With a qTip box open: 

![finished]({{site.baseurl}}/public/demos/twitter-graph/screenshots/qtip.png)

For comparison, [here's my finished graph]({{site.baseurl}}/public/demos/twitter-graph/index.html) and [the source on GitHub](https://github.com/cytoscape/cytoscape.js-blog/tree/gh-pages/public/demos/twitter-graph).
Remember that running this graph requires an HTTP server such as [http-server](https://www.npmjs.com/package/http-server) to be serving files in `twitter-graph/`.
Congratulations on finishing Tutorial 3!