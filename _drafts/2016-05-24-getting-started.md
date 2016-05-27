---
layout: post
title: Getting started with Cytoscape.js
subtitle: Making a simple graph
tags:
- tutorial
---

This is the first in a series of tutorials about Cytoscape.js.
Cytoscape.js is a graph theory library for analysis and visualization.
This encompasses a variety of uses, from network biology to social network analysis.

*Tutorial by  [Joseph Stahl](http://josephstahl.com)*

## A simple site
First, create a directory for this tutorial. I will be using `getting-started/`.
[Download Cytoscape.js](http://js.cytoscape.org) and copy `cytoscape.js` to the project folder.
In the interest of keeping this tutorial as simple as possible, all code—HTML, JavaScript, and CSS—will go in `index.html`.

In `index.html`, enter the following to get started with Cytoscape.js:

```html
<!doctype html>
<html>
<head>
    <title>Tutorial 1: Getting Started</title>
    <script src='cytoscape.js'></script>
</head>
</html>
```

This creates a very simple webpage, consisting only of a title and a script so far.
The `<script>` HTML tag allows JavaScript to be embedded in a webpage.
In this case, the `cytoscape.js` script is being embedded into the webpage so that it can be accessed later while building a graph.
At this point, you can open `index.html` in a web browser but will not see anything more than a blank page with a title.
Cytoscape.js has been added to the site but currently has no work to do because no graph instance has been created.

Before moving on, ensure that your directory looks similar to the following:

```
getting-started/
    +-- cytoscape.js
    +-- index.html
```

This ensures that the scripts on `index.html` can "see" `cytoscape.js`.

Now let's make a graph!

## Adding a graph
Adding a graph to this page can be broken down into two parts.

1. Provide an area to draw the graph
2. Create a graph instance

### An area to draw the graph
First, there must be an area to draw the graph.
Add a `<body>` tag to `index.html`, then within the `body` section, add a `div` element named `"cy"`, like so: `<div id="cy"></div>`.
This creates the body of the webpage, which in turn holds a `div` element named `cy`.
Naming the element makes it easy to later access and modify this element for styling and passing to Cytoscape.js.

`index.html` should now look like this:

```html
<!doctype html>
<html>
<head>
    <title>Tutorial 1: Getting Started</title>
    <script src='cytoscape.js'></script>
</head>

<body>
    <div id="cy"></div>
</body>
</html>
```

Next, the style of the graph area must be slightly modified via CSS (putting a graph into a 0 area `div` element is rather uninteresting).
To accomplish this, add the following CSS code between `<head>` and `<body>`:

```html
<style>
    #cy {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0px;
        left: 0px;
    }
</style>
```

This expands the `div` element to take up the entire height and width of the broswer window, providing maximum space to the graph.
Other sizes are possible too, such as `400px` or `50%`.


### Creating a graph instance
Now comes the interesting part! To start, add a `<script>` tag in `<body>` **after the `<div>` element**.
Placing `<script>` after the `<div id="cy">` element is crucial. Otherwise, the graph will try to draw within an element that has not yet been created. Not good!

*Note: If using [`DOMContentLoaded`](https://developer.mozilla.org/en-US/docs/Web/Events/DOMContentLoaded),
the `script` tag may be placed anywhere.
In this case, `var cy = ...` will be located within an anonymous function provided to the Event Listener.*    

Within the `<script>` tag, add the following:

```javascript
var cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    { data: { id: 'a' } },
    { data: { id: 'b' } },
    {
      data: {
        id: 'ab',
        source: 'a',
        target: 'b'
      }
    }]
});
```

**This is the most important part of this tutorial!** Here, the graph is created.
`var cy = cytoscape({ ... })` creates a new graph instance, using `cytoscape` which was previously embedded via the `<script>` tag.
Then, an array of elements are added to the graph.

- `{ data: { id: 'a' } }` is a node with an id of *a*
- `{ data: { id: 'b' } }` is a node with an id of *b*
- `{ data: { id: 'ab', source: 'a', target: 'b' } }` is an edge between nodes *a* and *b*.

Cytoscape.js can automatically infer which data are nodes and which are edges, as is done here.
A user may also [specify groups manually](http://js.cytoscape.org/#ele.group), with (for example) `group: 'nodes'`, useful for keeping track of more complicated graphs.

By now, `index.html` should be finished and resemble this:

```html
<!doctype html>

<html>

<head>
    <title>Tutorial 1: Getting Started</title>
    <script src="cytoscape.js"></script>
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
    <div id="cy"></div>
    <script>
      var cy = cytoscape({
        container: document.getElementById('cy'),
        elements: [
          { data: { id: 'a' } },
          { data: { id: 'b' } },
          {
            data: {
              id: 'ab',
              source: 'a',
              target: 'b'
            }
          }]
      });
    </script>
</body>
</html>
```

Open `index.html` in your favorite web browser and celebrate!

## Next steps
How about making the graph look nicer?
Cytoscape.js provides a multitude of [styling options for changing graph appearance](http://js.cytoscape.org/#style).
The initialization of the graph may be modified to change default style options, as follows:

```javascript
var cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    { data: { id: 'a' } },
    { data: { id: 'b' } },
    {
      data: {
        id: 'ab',
        source: 'a',
        target: 'b'
      }
    }],
    style: [
        {
            selector: 'node',
            style: {
                shape: 'hexagon',
                'background-color': 'red'
            }
        }]      
});
```

Next up is displaying labels in the graph so that nodes can be identified.
Labels are added via the `'label`' property of style.
Since labels are already provided (via the `id` property of `data`), we'll use those.
If other `data` properties are provided, such as `firstname`, those could be used instead.

```javascript
style: [
    {
        selector: 'node',
        style: {
            shape: 'hexagon',
            'background-color': 'red',
            label: 'data(id)'
        }
    }]
```

The final common component of a graph in Cytoscape.js is the layout.
Like `style`, `elements`, and `containers`, `layout` is also specified as a part of the object passed to `cytoscape` during construction.
To the existing `cy` object, add (after `elements`):

```javascript
layout: {
    name: 'grid'
}
```

This adds a grid layout to the graph; however, there's not much to see with only two nodes present.
Let's add some more points and edges to the graph.

```javascript
elements: [
  // nodes
  { data: { id: 'a' } },
  { data: { id: 'b' } },
  { data: { id: 'c' } },
  { data: { id: 'd' } },
  { data: { id: 'e' } },
  { data: { id: 'f' } },
  // edges
  {
    data: {
      id: 'ab',
      source: 'a',
      target: 'b'
    }
  },
  {
    data: {
      id: 'cd',
      source: 'c',
      target: 'd'
    }
  },
  {
    data: {
      id: 'ef',
      source: 'e',
      target: 'f'
    }
  },
  {
    data: {
      id: 'ac',
      source: 'a',
      target: 'd'
    }
  },
  {
    data: {
      id: 'be',
      source: 'b',
      target: 'e'
    }
  }
],
```

By now you might be wondering if there's a faster way to add elements to the graph, and there is!
After the graph has been made, it can be accessed via the variable `cy`.
This allows us to use functions such as [`cy.add(...)`](http://js.cytoscape.org/#cy.add) to automate adding variables.
Try it out with: 

```javascript
for (var i = 0; i < 10; i++) {
    cy.add({
        data: { id: 'node' + i }
        }
    );
    var source = 'node' + i;
    cy.add({
        data: {
            id: 'edge' + i,
            source: source,
            target: (i % 2 == 0 ? 'a' : 'b')
        }
    });
}
```

This adds 10 new nodes to the graph with half the edges going to `a` and half going to `b`.
If you examine the graph now, you may notice that the layout has been messed up.
To fix this, add a call to [`cy.layout()`](http://js.cytoscape.org/#cy.layout) after you are done adding nodes and edges.
Here we're using `circle`, one of the [many layouts availble in Cytoscape.js](http://js.cytoscape.org/#layouts).

```javascript
cy.layout({
    name: 'circle'
});
```

Cytoscape.js has a wealth of functions available; far more than can be covered in tutorials.


## Conclusion
Before a Cytoscape.js graph may be created, it needs an element to draw within and the element must be given a width and height.
Graphs are created with `var graphName = cytoscape({...});` where an object containing graph properties is passed to `cytoscape()`.
The most common properties passed are `container`, `elements`, `style`, and `layout`.

Once a graph has been created, it can be manipulated via a variety of methods, among them `cy.add({...})` and `cy.layout({...})`.

Take a look at my finished graphs:

- [Getting started]({{site.baseurl}}/public/demos/getting-started/index.html)
- [Style & Layout]({{site.baseurl}}/public/demos/getting-started/index-layout.html)
- [Adding nodes with `cy.add()`]({{site.baseurl}}/public/demos/getting-started/index-addingNodes.html)

Source code [available on Github](https://github.com/cytoscape/cytoscape.js-blog/tree/gh-pages/public/demos/getting-started)