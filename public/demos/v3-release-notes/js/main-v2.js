document.addEventListener('DOMContentLoaded', function() {
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),

    boxSelectionEnabled: true,
    autounselectify: false,

    style: stylesheet,
    elements: elements
  });

  cy.layout({ name: 'grid' });

  cy.nodes().each(function(i) {
    if (i % 2 === 0) {
      this.addClass('highlighted', 500);
    }
  });

  cy.on('tap', 'node', function(event) {
    var node = event.cyTarget;
    console.log('tapped on ' + node.id());
  });

  cy.onRender(function() {
    console.log('render event');
    cy.offRender();
  });

  var grabCount = 0;
  cy.nodes().on('grab', function() {
    grabCount += 1;
  });
  cy.nodes().on('free', function() {
    console.log('grabbed ' + grabCount + ' nodes');
    grabCount = 0;
  });
});
