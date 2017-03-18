document.addEventListener('DOMContentLoaded', function() {
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),

    boxSelectionEnabled: true,
    autounselectify: false,

    style: stylesheet,
    elements: elements
  });

  // `cy.layout()` and `eles.layout()` now return the layout, rather than chaining the calling object
  cy.layout({ name: 'grid' }).run();

  // Functions with `function(i, ele)` signature are now `function(ele, i)`
  cy.nodes().each((ele, i) => {
    if (i % 2 === 0) {
      // `this` is no longer modified to be the element of interest for many callback functions
      ele.addClass('highlighted', 500);
    }
  });

  cy.on('tap', 'node', function(event) {
    // `cy` prefix has been removed from names of event fields
    var node = event.target;
    console.log('tapped on ' + node.id());
  });

  // `cy.onRender()` and `cy.offRender()` have been replaced with the `render` event
  cy.once('render', () => {
    console.log('render event');
  });

  // The `grab` event has been broken into two parts: `grab` and `grabon`
  var grabCount = 0;
  cy.nodes().on('grab', () => {
    grabCount += 1;
  });
  cy.nodes().on('grabon', (event) => {
    console.log('clicked on node ' + event.target.id());
  })
  cy.nodes().on('free', () => {
    console.log('grabbed ' + grabCount + ' nodes');
    grabCount = 0;
  });
});
