"use strict";

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

  var concentricButton = document.getElementById('concentricButton');
  concentricButton.addEventListener('click', function() {
    concentricLayout.run();
  });

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
  // with the submit button hidden, we'll run the graph automatically
  submitButton.click();

  /**
   * Get followers for the top three users (ranked by followers) at each level.
   *
   * Levels are degrees from the initial node.
   * Example: user specifies 'cytoscape' as the initial node. Cytoscape's followers
   * are level=1, followers of cytoscape's followers are level=2, etc.
   *
   * @param {number} level The level of the graph being added to
   * @param {object} options Constant options for addFollowersByLevel
   * @param {number} options.maxLevel The deepest level to add followers to (Main user's followers are at level=1)
   * @param {number} options.usersPerLevel Number of users to add followers at each level
   * @param {function} options.graphFunc Function passed to add JSON data to graph after Promise completes
   */
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
      // and finally, clear the loading animation
      var loading = document.getElementById('loading');
      loading.classList.add('loaded');
    }
  }
});

function qtipText(node) {
  var twitterLink = '<a href="http://twitter.com/' + node.data('username') + '">' + node.data('username') + '</a>';
  var following = 'Following ' + node.data('followingCount') + ' other users';
  var location = 'Location: ' + node.data('location');
  var image = '<img src="' + node.data('profilePic') + '" style="float:left;width:48px;height:48px;">';
  var description = '<i>' + node.data('description') + '</i>';

  return image + '&nbsp' + twitterLink + '<br> &nbsp' + location + '<br> &nbsp' + following + '<p><br>' + description + '</p>';
}

function getUser(targetUser) {
  // use cached data
  var userPromise = $.ajax({
    url: 'cache/' + targetUser + '-user.json',
    type: 'GET',
    dataType: 'json'
  });

  var followersPromise = $.ajax({
    url: 'cache/' + targetUser + '-followers.json',
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

  // Express API
  // Will download data from Twitter
  // var expressUserPromise = $.ajax({
  //   async: true,
  //   crossDomain: true,
  //   url: 'http://localhost:3000/twitter/user',
  //   method: 'POST',
  //   headers: {
  //     'content-type': 'application/x-www-form-urlencoded'
  //   },
  //   data: {
  //     username: targetUser
  //   }
  // });

  // var expressFollowersPromise = $.ajax({
  //   async: true,
  //   crossDomain: true,
  //   url: 'http://localhost:3000/twitter/followers',
  //   method: "POST",
  //   headers: {
  //     'content-type': 'application/x-www-form-urlencoded'
  //   },
  //   data: {
  //     username: targetUser
  //   }
  // });
  // return Promise.all([expressUserPromise, expressFollowersPromise])
  //   .then(function(then) {
  //     return {
  //       user: then[0],
  //       followers: then[1]
  //     };
  //   });
}

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
