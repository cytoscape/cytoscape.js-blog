---
layout: post
title: Desktop applications with Cytoscape.js and Electron
subtitle: Turning Tutorial 3 into a cross platform desktop application
tags:
- tutorial
---

# Table of contents

1. [Introduction](#intro)
2. [Environment setup](#setup)
  - [Node.js](#setup-node)
    - [package.json](#setup-node-package)
3. [Electron](#electron)
  - [createWindow()](#electron-window)
  - [The rest of `main.js`](#electron-rest)
4. [The Cytoscape.js window](#index)
  - [`<head>`](#ui-head)
  - [`<body>`](#ui-body)
5. [CSS](#css)
6. [The Twitter API](#api)
  - [Reading from disk](#api-read)
  - [Writing to disk](#api-write)
  - [API errors](#api-errors)
  - [Checking authentication](#api-getauth)
  - [User information from Twitter](#api-getuser)
  - [Follower information from Twitter](#api-getfollowers)
  - [module.exports](api-exports)
7. [Creating a graph with `renderer.js`](#renderer)
  - [DOMContentLoaded](#renderer-loaded)
    - [Cytoscape initialization](#renderer-loaded-setup)
    - [Adding to the graph](#renderer-loaded-add)
    - [Layout](#renderer-loaded-layout)
    - [Submit button](#renderer-loaded-submit)
    - [Adding followers by level](#renderer-loaded-bylevel)
  - [Getting Promises](#renderer-getpromise)
  - [twitterObjToCyEle](#renderer-obj)
  - [qTip](#renderer-qtip)
  - [Overriding defaults](#renderer-browser)
8. [Conclusion](#conclusion)



# <a name="intro" />Introduction

This tutorial is the fourth part in a series of tutorials about [Cytoscape.js](http://js.cytoscape.org) written by [Joseph Stahl](http://josephstahl.com/) for Google Summer of Code 2016.
It builds upon the previous tutorials, especially [part 3]({% post_url 2016-07-04-social-network %}).
For readers unfamiliar with Cytoscape.js, it's recommended to start with [part 1]({% post_url 2016-05-24-getting-started %}) and progress from there.

Previous tutorials have focused on using Cytoscape.js in the browser.
However, projects such as [Electron](http://electron.atom.io/) have made it possible to run web apps on the desktop, with full access to the resources available to native applications, such as file system access.
Additionally, Electron allows us to overcome a significant limitation in the previous tutorial: running into API limits with Twitter.
Because Electron uses [Node.js](https://nodejs.org/en/), we can use packages such as [Twit](https://github.com/ttezel/twit) for getting data from Twitter while the program runs.
What would have formerly required a static web page and an API process running on a service such as Heroku can now all be done locally with Electron.

Because this tutorial reuses a lot of the code from Tutorial 3, the main focus will be on changes made to run Cytoscape.js with Electron.
I wrote Tutorial 3 with the possibility of later downloading data in real time so very few changes will need to be made to run the graph with Twit.

*Designed for Twitter REST API v1.1*

# <a name="setup" />Setting up the environment

The nature of this tutorial (being a desktop application instead of a web app) necessitates more [yak shaving](http://www.hanselman.com/blog/YakShavingDefinedIllGetThatDoneAsSoonAsIShaveThisYak.aspx) than previous tutorials.
Luckily, a few tools will make quick work of this.

## <a name="setup-node" />Node.js (and npm)

First of all, create a directory for this tutorial. `electron_twitter` will do.
Next, we'll need to install [Node.js](https://nodejs.org/en/download/).
For the sake of ensuring compatibility with this tutorial, I recommend [the current version](https://nodejs.org/en/download/current) (6.3.1 at time of writing) but based on a quick glance at Node.js API docs I don't believe I'm using any brand new features.

Once Node.js is installed, open a shell and `cd electron_twitter`.
To make sure everything is set up properly, run `node -v` and `npm -v`.
You should get `6.3.1` and `3.10.3`, respectively. 

Now that Node.js and npm are working, we can install the packages we'll use in this tutorial.
While package managers such as [bower](https://bower.io/) could technically have been used in previous tutorials—Cytoscape.js is listed—it adds complexity to the tutorial.
In this case, using the packages installed by npm is easy as `var cytoscape = require('cytoscape');`.

### <a name="setup-node-package" />package.json

`npm install` will automatically install all packages in a `package.json` file located in the root of `electron_twitter`.
We'll take advantage of this to install all our packages at once.
Open your favorite editor and create a new `package.json` with the following contents: 

```javascript
{
  "name": "twitter-electron",
  "version": "0.1.0",
  "main": "main.js",
  "dependencies": {
    "bluebird": "^3.4.1",
    "cytoscape": "^2.7.6",
    "cytoscape-qtip": "^2.4.0",
    "eslint": "^3.1.1",
    "jquery": "^2.2.4",
    "mkdirp": "^0.5.1",
    "qtip2": "^2.2.0",
    "twit": "^2.2.4"
  },
  "devDependencies": {
    "electron-prebuilt": "^1.2.8"
  },
  "scripts": {
    "start": "electron ."
  }
}
```

I'll explain the packages as we get to them but a few should already be recogniziable.
For example, `cytoscape`, `cytoscape-qtip`, `jquery`, and `qtip2` all correspond to the JavaScript files downloaded in Tutorial 3.
A lot easier than hopping between websites to download all the files, unzip them, and make sure versions match!

The numbers after each package are for [semantic versioning](http://semver.org/), a wonderful system that increments version numbers predictably in response to patchs, minor updates, and major updates.
The carat (^) before each version indicates that each package can be updated to the most recent minor version but no major version upgrades.
This is necessary because some package depend on specific versions of others; for example, `cytoscape-qtip` requires a specific `qtip` version, which in turn requires a specific `jquery` version.

Once the file is done and in the root of `electron_twitter/`, run `npm install` and you should see npm taking care of downloading and installing each package.

# <a name="electron" />Electron

Now that the environment is set up, we can get to work! 
First, we'll need a file for Electron to load at startup.
In `package.json`, we indicated that `main.js` is the [main file](https://xkcd.com/703/) of our application.

Create a `main.js` file for Electron to use.

```javascript
var electron = require('electron');
// Module to control application life.
var app = electron.app;
// Module to create native browser window.
var BrowserWindow = electron.BrowserWindow;


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 800, height: 600 });

  // and load the graph screen
  win.loadURL(`file://${__dirname}/index.html`);

  win.on('closed', () => {
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});
```

*Note: this is borrowed heavily from Electron's [quick start guide](http://electron.atom.io/docs/tutorial/quick-start/), which provides excellent boilerplate code for a simple app such as this one.*

## <a name="electron-window" />createWindow()

`createWindow()` will create the Cytoscape.js window where the graph will exist.
[`loadURL()`](http://electron.atom.io/docs/api/web-contents/#webcontentsloadurlurl-options) loads `index.html`, the starting HTML page of our application.
Now the purpose of Electron and Node.js should be more apparent—instead of a browser that will run JavaScript, we've written JavaScript that will run a browser!

## <a name="electron-rest" />The rest of main.js

A few more lines are necessary to round out `main.js`.
We've writen a function to create a graph window but not yet provided a way to execute that function.
Just like event listeners for windows, Electron has an event listener for the app becoming ready, [`app.on('ready', createWindow)`](http://electron.atom.io/docs/all/#event-ready).
Here, we'll pass `createWindow()` as the function to run when the app is ready.

MacOS handles application lifecycles differently than Windows or Linux; applications will stay "loaded" until the application has been quit, even if all windows are closed.
With that in mind, we only want the following code to execute on non-MacOS systems.
Node.js provides [`process.platform`](https://nodejs.org/api/process.html#process_process_platform) for checking the platform the code is running on.
If it's macOS (i.e. `darwin`), we'll do nothing; otherwise, closing all application windows and getting the [`window-all-closed`](http://electron.atom.io/docs/all/#event-window-all-closed) event means it's time to close the application with [`app.quit()`](http://electron.atom.io/docs/all/#appquit).

[`activate`](http://electron.atom.io/docs/all/#event-activate-macos) is another MacOS-specific behavior; it indicates that the app has been activated (i.e. the application is open but a window may not be open).

# <a name="index" />index.html

`main.js` will take care of creating a new window containing `index.html`, while we'll cover now.
Due to [a bug with Electron on Macs](https://github.com/electron/electron/issues/6803), `index.html` is nothing more than a blank page which loads another page, `ui.html`.
The bug is still under investagation but causes a "ghosted" image when the graph is panned and when qTip text boxes appear and fade.
However, a workaround exists: the ghosting stops occuring after the page is reloaded.
This workaround also works when the page is changed without the window changing (i.e. opening the graph in a new window does not eliminate the issue but (re)opening the graph in the same window fixes the issue).
With this in mind, we'll write a short `index.html` that simply loads a blank window and runs a script to change the window to the main graph UI.

```html
<!DOCTYPE html>
<!-- workaround replacement index.html for electron bug -->
<html>

<head>
  <meta charset="UTF-8">
  <script>
    // work around electron bug
    // see https://github.com/electron/electron/issues/6803
    window.location.assign('./ui.html');
  </script>
</head>

<body>
</body>

</html>
```

And then, in `ui.html`:

```html
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>Tutorial 4</title>
  <link href="css/normalize.css" rel="stylesheet" type="text/css" />
  <link href="css/skeleton.css" rel="stylesheet" type="text/css" />
  <link href="css/jquery.qtip.min.css" rel="stylesheet" type="text/css" />
  <link href="css/font-awesome.min.css" rel="stylesheet" type="text/css" />
  <link href="css/graph_style.css" rel="stylesheet" type="text/css" />
  <script>
    require("./javascripts/renderer.js");

  </script>
</head>

<body>
  <div id="full">
    <div class="container">

      <div class="row">
        <h1>Tutorial 4</h1>
      </div>

      <div class="row">
        <input type="text" class="u-full-width" id="twitterHandle" placeholder="Username (leave blank for cytoscape's Twitter profile)">
      </div>

      <div class="row">
        <div class="six columns">
          <input type="button" class="button-primary u-full-width" id="submitButton" value="Start graph" type="submit">
        </div>
        <div class="six columns">
          <input type="button" class="button u-full-width" id="layoutButton" value="Redo layout">
        </div>
      </div>
    </div>

    <div id="loading" class="hidden">
      <span class="fa fa-refresh fa-spin"></span>
    </div>

    <div id="cy"></div>
  </div>
</body>

</html>
```

## <a name="ui-head" />\<head\>

`<head>` is pretty standard, with our normal Font Awesome and Skeleton files as well as the qTip jQuery CSS file.
Unlike previous tutorials, none of the JavaScript files for Cytoscape.js or qTip need to be included because they can be loaded with `require()` 
This time, we'll load `renderer.js` in `<head>` because all DOM-sensitive code within `renderer.js` is loaded within an event listener which waits for `DOMContentLoaded`, as in previous tutorials.

## <a name="ui-body" />\<body\>

All elements in `<body>` are within `<div id="full">`, which we'll use later for a [flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Using_CSS_flexible_boxes) powered layout.
Using flexible boxes allows us to give Cytoscape.js 100% of the remaining space after our Skeleton-related elements are laid out.
The [Skeleton](http://getskeleton.com/) framework is used again here to help with layout and appearance, so we'll again use the classes provided, such as `six columns`, `u-full-width`, `row`, and `container`.
Like in Tutorial 3, the Font Awesome spinner is present, this time hidden by default (it will be unhidden when graphing activity starts after a button is clicked).
The final element in our `full` flexbox is, as in every previous tutorial, the `cy` element which will hold our graph.

# <a name="css" />graph_style.css

`ui.html` relies on a number of CSS rules which I'll cover now.
`graph_style.css`, like the rest of our `.css` files, will go in the `css/` directory.

```css
#full {
    display: flex;
    flex-direction: column;
    height: 100vh;
}
#cy {
    height: 100%;
    flex-grow: 1;
}
h1 {
    text-align: center;
}
#loading {
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    text-align: center;
    margin-top: -0.5em;
    font-size: 2em;
    color: #000;
}
.hidden {
    display: none;
}
```

[Skeleton](http://getskeleton.com/) takes care of most of the CSS so we only need to write a few of our own rules:

- `#full` is used in `ui.html` for creating the flexbox that the rest of the graph (and buttons) are within.
The `height` property deserves mentioning; by setting `height: 100vh` we'll use the full height of the window Electron created for us.
- `#cy` is our normal Cytoscape.js container, although here we've also set `flex-grow: 1` which will grow the Cytoscape.js container to all remaining space after the input area is laid out.
- `h1` will center any text with an `<h1>` tag; in this case, the text "Tutorial 4"
- `#loading` will put any element with a `loading` id (i.e. the Font Awesome loading spinner) in the vertical and horizontal center of the page.
- `.hidden` is used for hiding the Font Awesome loading spinner when data has been downloaded for the graph.


# <a name="api" />twitter_api.js

Before I cover the `renderer.js` file we recently `require()`-ed, it's necessary to discuss `twitter_api.js`, which will be used heavily by `renderer.js` to retrieve data from Twitter.
`twitter_api.js` is relatively complex so I'll cover it in sections.

```javascript
var fs = require('fs');
var os = require('os');
var path = require('path');
var Twit = require('twit');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');

var programTempDir = 'cytoscape-electron';
var apiAuth;

try {
  apiAuth = require('../api_key.json');
} catch (error) {
  console.log('api_key.json not found');
  console.log(error);
}

var userCount = 100; // number of followers to return per call
var preDownloadedDir = path.join(__dirname, '../predownload');
var T;
```

First, we load our modules with Node.js's [`require()`](https://nodejs.org/api/modules.html) function. 
We'll be using:

- [`fs`](https://nodejs.org/dist/latest-v6.x/docs/api/fs.html), [`os`](https://nodejs.org/dist/latest-v6.x/docs/api/os.html), and [`path`](https://nodejs.org/dist/latest-v6.x/docs/api/path.html): all built-in Node.js modules
- [`Twit`](https://github.com/ttezel/twit): the heart of `twitter_api.js`; handles interactions with Twitter's REST API.
- [`mkdirp`](https://github.com/substack/node-mkdirp): a Node equivalent of `mkdir -p`; can create nested folders with a single call
- [`bluebird`](http://bluebirdjs.com/docs/getting-started.html): implementation of JavaScript Promises, used for asynchronous interactions with Twitter's API

Next, we set up a few variables: 

- `programTempDir = 'cytoscape-electron'`: this is the directory where we'll save data downloaded from Twitter for Cytoscape.js to use. It will also hold our API authentication information
- `apiAuth = require('../api_key.json')`: if a JSON file named `api_key.json` is in the root of the program directory, we'll load the authentication information from it.
  Otherwise, we'll use pre-downloaded information for the Cytoscape Twitter account. 
- `userCount = 100`: we'll get 100 followers on each call to Twitter. This value may be increased up to 200
- `preDownloadedDir = path.join(__dirname, '../predownload')`: if an API key isn't entered, we'll use pre-downloaded data that is distributed with the program in the `predownload` folder.
- `T`: we'll later make this a Twit object if we're able to load the API key that Twit requires


```javascript
try {
  if (apiAuth) {
    T = new Twit({
      consumer_key: apiAuth.key,
      consumer_secret: apiAuth.secret,
      app_only_auth: true,
      timeout_ms: 60 * 1000
    });
  }
} catch (error) {
  T = undefined;
  console.log('could not initialize Twit');
  console.log(error);
}
```

Here's another `try ... catch` block, this time for initializing `T` if loading the authentication (with `require('../api_key.json')`) was successful.
Below the block, we create a `TwitterAPI` variable but it's nothing more than an empty object right now.
We'll add functions to `TwitterAPI.prototype` as we proceed, but first we need some helper functions.

## <a name="api-read" />Reading saved files: readFile()

If used the Twitter API each time we needed data, we would quickly run out of Twitter API requests.
To work around this, we'll read cached data if it exists.

```javascript
function readFile(username, fileName) {
  var predownloadPromise = new Promise(function(resolve, reject) {
    var predownloadFileName = path.join(preDownloadedDir, username, fileName);
    fs.readFile(predownloadFileName, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
  var cachedPromise = new Promise(function(resolve, reject) {
    var cacheDir = path.join(os.tmpdir(), programTempDir, username);
    var cachedFileName = path.join(cacheDir, fileName);
    fs.readFile(cachedFileName, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
  return Promise.any([predownloadPromise, cachedPromise]);
}
```

This function accepts two arguments: `username` and `fileName`.
Our directory structure will create directories based on `username` with two files: either `user.json` or `followers.json`.

- `username`: the directory to look in
- `filename`: either `user.json` or `followers.json`, depending on the request

Data can be stored in two locations: the cache (in the OS's temporary directory) or distributed with the program, in the previously mentioned `preDownloadedDir`.
Neither requires an API request to use, so accessing both simultaneously is okay (whereas we don't want to issue an API request unless all other possibilities have been exhausted).
Both data sources, cache and pre-downloaded, use very similar functions except for their paths, so I'll discuss them as a pair.

First of all, we'll be using [Promises](http://bluebirdjs.com/docs/getting-started.html) again, this time with the Bluebird Promise API.
[`new Promise(function(resolve, reject)) { ... }`](http://bluebirdjs.com/docs/api/new-promise.html) creates a new Promise, which expects a function (with `resolve` and `reject` as arguments) to run after the Promise returns.
A successful resolution of the Promise will call the function given as [`resolve()`](http://bluebirdjs.com/docs/api/promise.resolve.html), while an unsuccessful resolution (such as trying to access a file that doesn't exist on disk) will call [`reject()`](http://bluebirdjs.com/docs/api/promise.reject.html).
Resolution is determined by the result of [`fs.readFile()`](https://nodejs.org/dist/latest-v6.x/docs/api/fs.html#fs_fs_readfile_file_options_callback), which takes a filename and callback function as arguments.
Once the file has been read, the callback function will be executed, leading the program down two possible paths: reject if an error occured, or resolve with the JSON data read from disk.

Now that we've defined both Promises and their resolve/ reject functions, we need to return something from the `readFile` function.
As soon as one of the two Promises has resolved successfully, we can return the data and not worry about the other Promise.
Bluebird allows this functionality through [`Promise.any()`](http://bluebirdjs.com/docs/api/promise.any.html), which takes an array of Promises as an argument and will resolve with the data provided by the first successful `resolve()` or reject if both Promises gave a `reject()`.
This contrasts nicely with [`Promise.all()`](http://bluebirdjs.com/docs/api/promise.all.html) as used in the previous tutorial; whereas previously we needed all Promises to resolve successfully (and had to wait on all of them), now we can resolve as soon as *any* Promise is successful.

## <a name="api-write" />Writing files: logDataToTemp()

Reading files is only half the work—we need to write to files too!

```javascript
function logDataToTemp(data, username, fileName) {
  var tempPath = path.join(os.tmpdir(), programTempDir, username);
  var filePath = path.join(tempPath, fileName);
  try {
    mkdirp.sync(tempPath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
  } catch (error) {
    console.log('could not write data');
    console.log(error);
  }
}
```

`logDataToTemp(data, username, fileName)` requires three arguments:

- `data`: the data to write (provided by Twitter API)
- `username`: used for determining which directory to write to
- `fileName`: either `'user.json'` or `'followers.json'` depending on which function called `logDataToTemp()`.

`tempPath` and `filePath` determine where temporary files are written; currently these go within the operating system's temporary files directory.
Because file writing is not always successful, the rest of the function is within a try/ catch block.

`mkdirp.sync(tempPath)` will create the folders necessary to hold the file to be created (because Node.js's `fs.writeFile` will only write within existing folders).
Next, [`fs.writeFileSync()`](https://nodejs.org/dist/latest-v6.x/docs/api/fs.html#fs_fs_writefilesync_file_data_options) takes care of writing the data to disk.
Writing raw JSON data makes the files difficult to inspect, so [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) converts the `data` JSON object into a string and adds some whitespace.

In the event of an error, we'll log the error and move on.

## <a name="api-errors" />Informative errors with makeErrorMessage()

Because there are a [variety of errors that may occur (rate limiting, private users, missing data, etc.)](https://dev.twitter.com/overview/api/response-codes), we'll write a quick function that takes error codes from Twit and modifies them to better describe potential errors.

```javascript
function makeErrorMessage(err) {
  if (err.statusCode === 401) {
    // can't send error status because it breaks promise, so JSON instead
    return {
      error: true,
      status: err.statusCode,
      statusText: 'User\'s data is private'
    };
  } else if (err.statusCode === 429) {
    // can't send error status because it breaks promise, so JSON instead
    return {
      error: true,
      status: err.statusCode,
      statusText: 'Rate limited'
    };
  }
  // unknown error
  return {
    error: true,
    status: err.statusCode,
    statusText: 'Other error'
  };
}
```

A `401` error indicates a private user, `429` is rate limiting, and other errors are rare enough that we'll treat them generically. 

## <a name="api-getauth" />Checking authentication: TwitterAPI.prototype.getAuth()

This is the first method we'll add to our `TwitterAPI` object.
It's worth being able to check whether authentication was successful (i.e. a valid API key) so that we can use sample data if unsuccessful.
Making this a function of `TwitterAPI` allows us to check authentication in any program that uses `TwitterAPI` (such as `renderer.js`), where we can change the requested user to `cytoscape` instead of the originally user if authentication failed.

```javascript
TwitterAPI.prototype.getAuth = function() {
  return (T && T.getAuth());
};
```

Of cource, we can only use [Twit's `getAuth()`](https://github.com/ttezel/twit#tgetauth) function if Twit was loaded successfully, which only happens if `api_key.json` was loaded successfully.
Returning `return (T && T.getAuth())` allows us to short-circuit the check and immediately return `undefined` if T was never initialized with Twit (in which case authentication has obviously failed).

## <a name="api-getuser" />User information: TwitterAPI.prototype.getUser()

With the small functions out of the way, it's time to move on to the heart of our `TwitterAPI` object: the `getUser()` and `getFollowers()` functions.
Due to the work done in `readFile()`, all `getUser()` needs to do is call `readFile()` and return the result if successful. If unsuccessful, we'll have to use Twit to make a call to Twitter.
The Promise returned by `readFile()` is easily extended; because `readFile()` returns a Promise, we can chain it with [`.catch()`](http://bluebirdjs.com/docs/api/catch.html) and [`.then()`](http://bluebirdjs.com/docs/api/then.html) to modify the Promise returned.
For example, if `readFile()` resolves successfully (data was found on disk), we can just return that.
However, if `readFile()` rejects (because **both** `predownloadPromise` and `cachedPromise` rejected), we'll need to *catch* that rejection and instead get data from Twitter.

**Important:** Because most Promise-related functions return Promises, the best way to interact with them is chaining calls.
This will be done for `getUser()`—if you look carefully, the entire function is within a single `return` statement.

```javascript
TwitterAPI.prototype.getUser = function(username) {
  return readFile(username, 'user.json') // checks predownloaded data and cache
    .catch(function() {
      // need to download data from Twitter
      return T.get('users/show', { screen_name: username })
        .then(function(result) {
          // success; record and return data
          var data = result.data;
          logDataToTemp(data, username, 'user.json');
          return Promise.resolve(data);
        }, function(err) {
          // error. probably rate limited or private user
          return Promise.reject(makeErrorMessage(err));
        });
    });
};
```

See how there's a `.catch()` statement but no `.then()` statement?
This is done because we only have to handle rejections from `readFile()`—and rejections are handled by `.catch()`.
If `readFile()` resolved successfully, we'll pass that Promise back unmodified to whichever function called `getUser()` (which can then use `.then(functionThatUsesData)`).
In the event that the Promise returned by `readFile()` rejects, we'll need a backup plan: using the Twitter API.

[`.catch()`](http://bluebirdjs.com/docs/api/catch.html) will pick up any error in the promise chain, just like a `catch()` in a try/ catch block.
Because we want a Promise to be returned from `getUser()`, we need to get a Promise back from `readFile()`.
Of course, if a cached file is found, `return readFile()` will already be a Promise and nothing in `.catch()` will be run.
However, if `.catch()` is run due to an error from `readFile()`, we need `.catch()` to return its own Promise (effectively "replacing" the rejected Promise from `readFile()`).

Helpfully, Twit can natively return Promises! 
This means `return T.get()` will return a Promise, which we can again chain with `.then()` just like any other Promise.
Bluebird's [`.then()`](http://bluebirdjs.com/docs/api/then.html) conforms to the [Promises/A+ `.then()`](https://promisesaplus.com/#point-22), meaning that it accepts two functions as arguments: one to run on success, and one to run on failure.
The net effect is the same as chaining `.then(successFunction).catch(errFunction)`, just more streamlined.

First, we'll tackle the case of success.
Looking back at the `.then()` block, we can see that we take the `data` value from the result (Twit returns a few other properties we don't need) and log it to disk with `logDataToTemp()`.
Because this is `getUser()`, we'll specify that the filename to use is `user.json`.
Lastly, we'll call [`return Promise.resolve(data)`](http://bluebirdjs.com/docs/api/promise.resolve.html), an easy way to wrap the data from Twit within a Promise (remember that `getUser()` must return a Promise).

If an error occurs, the first function of `.then()` is skipped and instead the error is given to the second function.
All we do here is call `Promise.reject(makeErrorMessage(err))` to return a Promise (keeping with the all-paths-lead-to-Promise trend) that [rejects](http://bluebirdjs.com/docs/api/promise.reject.html) with the error from `makeErrorMessage()`. 
And with that, `getUser()` is done!

## <a name="api-getfollowers" />Follower information: TwitterAPI.prototype.getFollowers()

Followers are retrieved in a nearly identical manner to users, save for a different call to `T.get()` and having to access `result.data.users` instead of `result.data`.

```javascript
TwitterAPI.prototype.getFollowers = function(username) {
  return readFile(username, 'followers.json')
    .catch(function() {
      return T.get('followers/list', { screen_name: username, count: userCount, skip_status: true })
        .then(function(result) {
          var data = result.data.users;
          logDataToTemp(data, username, 'followers.json');
          return Promise.resolve(data);
        }, function(err) {
          // error. probably rate limited or private user
          return Promise.reject(makeErrorMessage(err));
        });
    });
};
```

Because we're now dealing with followers instead of a single user, the filename is now `followers.json`.
For more information about how the Promises are working, look back to `getUser()`.

## <a name="api-exports" />module.exports

So far, we've created a new object, `TwitterAPI` and given it two functions; however, these functions are completely inaccessible to any other file which `require()`s `twitter_api.js`.
A single line at the bottom of the file fixes that.

```javascript
module.exports = new TwitterAPI();
```

[`module.exports = new TwitterAPI()`](https://nodejs.org/api/modules.html) means that any call to `require('twitter_api.js')` will return a new instance of the `TwitterAPI` object, allowing its functions to be accessed through something like:

```javascript
var foo = require('./twitter_api.js');
foo.getAuth();
```

With that, the Twitter API is finished and we can move onwards to using it in `renderer.js`!


# <a name="renderer" />renderer.js

*Note: this file is pretty complex. I recommend having it [all available in one place](https://github.com/cytoscape/cytoscape.js-tutorials/blob/master/electron_twitter/javascripts/renderer.js) for reference during this part.*

`ui.html` was fairly straightforward because almost all work in done in `renderer.js`, which is loaded with `require()` because of the Node.js environment.
`renderer.js` goes in `javascripts/` because it deals with an HTML page rather than Electron.
`renderer.js` is far larger than previous JavaScript files, so I'll cover it in sections.

```javascript
var twitter = require('./twitter_api.js');
var cytoscape = require('cytoscape');
var Promise = require('bluebird');
var jQuery = global.jQuery = require('jquery');
var cyqtip = require('cytoscape-qtip');
var shell = require('electron').shell;
var ipcRenderer = require('electron').ipcRenderer;

jQuery.qtip = require('qtip2');
cyqtip(cytoscape, jQuery); // register extension
```

Starting with the top of the document, we'll load a number of other JavaScript files.
`twitter` is loaded from our own Twitter API; `cytoscape`, `Promise`, `jQuery`, and `cyqtip` are all loaded from `npm_modules/`; and `shell` and `ipcRenderer` are part of Electron.
`jQuery` is a bit unique because we also set `global.jQuery`; this allows qTip to "see" jQuery.

Speaking of qTip, its loading is more complex.
Because it's an extension of jQuery, it's loaded as part of the jQuery object rather than as its own variable.
Next, we need to register `cyqtip` (the Cytoscape.js qTip) extension with the graph (`cytoscape`) and jQuery.
In Node, this is done with `cyqtip(cytoscape, jQuery)` (whereas in a browser, using `<script>` tags was sufficient).

## <a name="renderer-loaded" />DOMContentLoaded

With the beginning of `renderer.js` out of the way, we reencounter an old friend: `document.addEventListener('DOMContentLoaded', function() { ... })`.
The contents are much the same as in [tutorial 3]({% post_url 2016-07-04-social-network %}) so I won't go into as much detail here.

```javascript
document.addEventListener('DOMContentLoaded', function() {
  var mainUser;
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    style: [{
      selector: 'node',
      style: {
        'label': 'data(username)',
        'width': 'mapData(followerCount, 0, 400, 50, 150)',
        'height': 'mapData(followerCount, 0, 400, 50, 150)',
        'background-color': 'mapData(tweetCount, 0, 2000, #aaa, #02779E)'
      }
    }, {
      selector: 'edge',
      style: {
        events: 'no'
      }
    }, {
      selector: ':selected',
      style: {
        'border-width': 10,
        'border-style': 'solid',
        'border-color': 'black'
      }
    }]
  });
  var concentricLayoutOptions = {
    name: 'concentric',
    fit: true,
    concentric: function(node) {
      return 10 - node.data('level');
    },
    levelWidth: function() {
      return 1;
    },
    animate: false
  };

  function addToGraph(targetUser, followers, level) {
    // target user
    if (cy.getElementById(targetUser.id_str).empty()) {
      // getElementById is faster here than a selector
      // does not yet contain user
      cy.add(twitterUserObjToCyEle(targetUser, level));
    }

    // targetUser's followers
    var targetId = targetUser.id_str; // saves calls while adding edges
    cy.batch(function() {
      followers.forEach(function(twitterFollower) {
        if (cy.getElementById(twitterFollower.id_str).empty()) {
          // does not yet contain follower
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
  var layoutButton = document.getElementById('layoutButton');
  layoutButton.addEventListener('click', function() {
    cy.layout(concentricLayoutOptions);
  });
  var submitButton = document.getElementById('submitButton');
  submitButton.addEventListener('click', function() {
    cy.elements().remove();
    var userInput = document.getElementById('twitterHandle').value;
    if (userInput && twitter.getAuth()) {
      mainUser = userInput;
    } else {
      // default value
      mainUser = 'cytoscape';
    }

    // put up loading spinner
    jQuery("#loading").removeClass("hidden");

    // add first user to graph
    getTwitterPromise(mainUser)
      .then(function(then) {
        addToGraph(then.user, then.followers, 0);

        // add followers
        var options = {
          maxLevel: 4,
          usersPerLevel: 3,
          layout: concentricLayoutOptions
        };
        addFollowersByLevel(1, options);
      })
      .catch(function(error) {
        console.log(error);
      });
  });

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
            if (twitterData && twitterData.user.error || twitterData.followers.error) {
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
        });
    } else {
      // reached the final level, now let's lay things out
      cy.layout(options.layout);
      // remove loading spinner
      jQuery("#loading").addClass('hidden');
      // add qtip boxes
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
    }
  }
});
```

### <a name="renderer-loaded-setup" />Setup

Like before, we'll start with `mainUser` and `cy`, variables for the user at the center of the graph and the Cytoscape.js graph, respectively.
Style is the same, with area corresponding to follower count and color corresponding to number of tweets.

### <a name="renderer-loaded-add" />addToGraph()

`addToGraph()` remains unchanged; we'll get a user and the user's followers, add them to the graph if they have not yet been added, and add edges between the new nodes.

### <a name="renderer-loaded-layout" />A new way to do layout: concentricLayoutOptions
Some data from Twitter can take a long time to arrive, so it's possible that if we specify a layout now, the layout won't affect all of the elements in the graph.
Because of that, I've changed from using [`cy.makeLayout()`](http://js.cytoscape.org/#cy.makeLayout) to create a layout, to only creating the *object* that is later passed to [`cy.layout()`](http://js.cytoscape.org/#cy.layout) when all data has been downloaded and we're ready to do layout.
`layoutButton` was renamed from `concentricButton` in the previous tutorial because it's possible to provide a different layout (such as `grid`) when the layout button is clicked.
However, the element IDs (`layoutButton`, `submitButton`, and `twitterHandle`) all remain the same as in Tutorial 3.


### <a name="renderer-loaded-submit" />submitButton.addEventListener()

The function provided to `submitButton.addEventListener()` is changed slightly:

- Now that we're interacting with Twitter, we need to make sure that there's user input **and** valid authentication before we send a request.
If either fail, we fall back to using `user = 'cytoscape'` like we did before.
- The loading spinner will start out hidden and be unhidden when the submit button is clicked.
- `getUser()` has been renamed to `getTwitterPromise()` because we are now using `twitter`, from `twitter_api.js`, to handle the work of getting user and follower information.
This greatly reduces the work done by `renderer.js` because there's no longer a need to use AJAX and jQuery to load Twitter data.
To accompany this significant change, I renamed `getUser()` to `getTwitterPromise()` (also a more precise name).
- The function is more Promise-centric now; instead of mixing `.then()` from Promises with a try/ catch block, everything uses the Promise syntax of `.then()` and `.catch()`.
This is possible because chaining `.catch()` after `.then()` means that `.catch()` will catch errors from `getTwitterPromise(mainUser)` and from any errors within the `.then()` statement.
The net effect is eliminating the `catch(error) { console.log(error) }` statement in Tutorial 3.
- To accompany the change from layout being `cy.makeLayout()` to the options that are passed to `cy.layout()`, `options.layout` is now `concentricLayoutOptions`.

With a functional Twitter API now, there's the possibility of a user inputting a name besides `cytoscape` so we no longer need to run `submitButton.click()`.
The submit button is unhidden in this tutorial and fully functional!

### <a name="renderer-loaded-bylevel" />addFollowersByLevel()

A few small changes have also been made to `addFollowersByLevel()`.
As mentioned previously, `getUser()` has been renamed to the more descriptive `getTwitterPromise()` in `topFollowerPromises()` but is still an object with `user` and `followers` keys.
The rest of `topFollowerPromises()` remains unchanged: the list of followers are sorted and an array containing Promises (generated by `getTwitterPromise(followerName)`) is returned for the highest-follower-count followers in a level.

`Promise.all(followerPromises).then()` has changed slightly; we're still using [`Promise.all`](http://bluebirdjs.com/docs/api/promise.all.html) but have eliminated the `.catch()` statement.
Additionally, we'll make sure that `twitterData` exists before checking for `twitterData.user.error` or `twitterData.followers.error`.
It's possible that `twitterData` could be undefined without an error occuring previously; for example, if a blank `user.json` or `followers.json` file was read.
The `.catch()` statement can be eliminated because `addFollowersByLevel()` is only called within `getTwitterPromise(mainUser).then()`, which is chained to its own `.catch()` statement (recall that a `.catch()` will also catch any errors from preceding `.then()` statements).

Changing `options.layout` to the object passed to `cy.layout()` means changing up the layout call in our `else { ... }` block slightly: we call `cy.layout(options.layout)` to run a layout.
Everything related to qTip remains the same; by registering it as a Cytoscape.js extension at the beginning of `renderer.js` we can use qTip just like we did in Tutorial 3.

Additionally, we can hide the loading spinner now that data's been added and the layout is finished.

With qTip done, we're finished with our event listener and can move on to the remaining functions.

## <a name="renderer-getpromise" />getTwitterPromise()

Now outside of `document.addEventListener()`, we get to `getTwitterPromise(targetUser)`, which replaces `getUser(targetUser)` from Tutorial 3.
Whereas `getUser()` used jQuery and AJAX to load Twitter data from disk, we can leave all that work to `twitter_api.js`.
All that we need to do is use the API we created, and when results arrive, put them into an object.

```javascript
function getTwitterPromise(targetUser) {
  return Promise.all([twitter.getUser(targetUser), twitter.getFollowers(targetUser)])
    .then(function(then) {
      return {
        user: then[0],
        followers: then[1]
      };
    });
}
```

Compare this to [the previous `getUser()`](https://github.com/cytoscape/cytoscape.js-tutorials/blob/master/twitter_graph/main.js#L204) and you can see why it's nice to have an API taking care of this for us.

## <a name="renderer-obj" />twitterObjToCyEle()

The descriptively named `twitterObjToCyEle(user, level)` remains unchanged from Tutorial 3 and continues to work tirelessly in its task of converting Twitter API information to Cytoscape.js elements.


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
      // render offscreen
      x: -1000000,
      y: -1000000
    }
  };
}
```

## <a name="renderer-qtip" />qTipText()

`qTipText(node)` also remains unchanged from Tutorial 3 and serves to take Cytoscape.js nodes and create qTips for them.

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

qTip displays HTML, so the function simply takes values of interest from the node and creates a string out of them, which qTip parses as HTML.

## <a name="renderer-browser" />Opening links in a web browser

Because Electron is a web browser, any links, such as Twitter profile URLs, will default to opening in Electron.
For our graph, this isn't desired behavior—we'd rather use the system's default web browser for links and use Electron for the graph.
To fix this, we'll override Electron's default behavior.

```javascript
jQuery(document).on('click', 'a[href^="http"]', function(event) {
  event.preventDefault();
  shell.openExternal(this.href);
});
```

Now we finally use [`shell`](http://electron.atom.io/docs/api/shell/).
This should be recognizable as an event listener, albeit one which uses jQuery and a selector to ensure that the event only handles clicks on link beginning with `http`.
Two things happen: 

- We prevent the default behavior of Electron opening the link with `event.preventDefault()`
- We instead open the link with `shell.openExternal(this.href)`.

# <a name="conclusion" />Conclusion

By now, you've setup an environment with all the requried modules installed and `package.json`, `main.js`, `renderer.js`, `twitter_api.js`, `ui.html`, and `index.html` all completed.
Before we can run the graph, we'll need some sample data (unless you have an API key to use) so unzip [`predownload.zip`](http://blog.js.cytoscape.org/public/demos/electron-twitter/predownload.zip) into your `electron_twitter` directory alongside `package.json` and `main.js`.
With this completed, run `npm start` in the root of `electron_twitter/` and you should soon see the main screen.

Congratulations! 



![The finished graph]({{ site.url }}/public/demos/electron-twitter/screenshots/finished.png)
