"use strict";

document.addEventListener("DOMContentLoaded", function() {
  var cy = cytoscape({
    container: document.getElementById('cy'),
    elements: GlyElements,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(molecule)',
          'width': '200px',
          'height': '200px',
          'color': 'blue',
          'font-size': '26px',
          'text-halign': 'right',
          'text-valign': 'center',
          'background-opacity': 0,
          'background-image': 'data(image)',
          'background-fit': 'contain',
          'background-clip': 'none'
        }
      }, {
        selector: 'edge',
        style: {
          'label': 'data(enzyme)',
          'text-background-color': 'yellow',
          'text-background-opacity': 0.4,
          'width': '6px',
          'target-arrow-shape': 'triangle',
          'control-point-step-size': '140px'
        }
      }
    ],
    layout: {
      name: 'grid',
      fit: false, // it's okay if some of the graph is hidden off-screen because viewport scrolls
      columns: 2,
      avoidOverlap: true,
      avoidOverlapPadding: 80,
      position: function(ele) {
        if (ele.data('molecule') === 'DHAP') {
          // DHAP is, as usual, a special case
          return { row: ele.id() - 1, col: 1 }; // layout to right of GADP
        }
        return { row: ele.id(), col: 0 };
      }
    }
  });

  cy.autolock(true);

  function panIn(target) {
    cy.animate({
      fit: {
        eles: target,
        padding: 200
      },
      duration: 700,
      easing: 'ease',
      queue: true
    });
  }

  function findSuccessor(selected) {
    var connectedNodes;
    if (selected.isEdge()) {
      connectedNodes = selected.target();
    } else {
      connectedNodes = selected.outgoers().nodes();
    }
    var successor = connectedNodes.max(function(ele) {
      return Number(ele.id());
      // Need to use Number; otherwise, id() provide string
      // which messes up comparison (says that "10" < "9")

      // max returns object with value and ele
    });
    return successor.ele;
  }

  function advanceByButton(previous) {
    // unselecting is not strictly necessary since cy defaults to single selection
    previous.unselect();
    var nextSelect = findSuccessor(previous);
    if (previous.id() === cy.nodes('#10').id()) {
      // loop back to beginning instead of repeating pyruvate
      nextSelect = cy.nodes('#0');
    }
    nextSelect.select();
    panIn(nextSelect);
  }

  var advanceButton = document.getElementById('advance');
  advanceButton.addEventListener('click', function() {
    var previous = cy.$(':selected');
    advanceByButton(previous);
  });

  cy.on('tap', 'node', function(event) {
    // acts as advanceByButton for manually selected nodes
    var target = event.cyTarget;
    cy.nodes().unselect();
    target.select();
    panIn(target);
    // open Wikipedia for node info
    window.open(target.data('url'));
  });

  // Initialization: select first element to focus on.
  var startNode = cy.$('node[molecule = "Glucose"]');
  startNode.select();
  panIn(startNode);
});
