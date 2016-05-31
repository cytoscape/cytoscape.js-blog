"use strict";

document.addEventListener("DOMContentLoaded", function() {
  var cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(molecule)'
        }
      }, {
        selector: 'edge',
        style: {
          label: 'data(enzyme)'
        }
      }
    ]
  });

  cy.add(GlyElements);
  cy.nodes().forEach(function(ele) {
    cy.style().selector('#' + ele.id())
      .style({
        'width': 200,
        'height': 200,
        'background-opacity': 0,
        'background-image': 'assets/' + ele.data().image,
        'background-fit': 'contain',
        'background-clip': 'none'
      })
      .update();
  });

  cy.layout({
    name: 'grid',
    fit: false, // it's okay if some of the graph is hidden off-screen because viewport scrolls
    columns: 2,
    avoidOverlap: true,
    avoidOverlapPadding: 80,
    position: function(ele) {
      if (ele.data().molecule === 'DHAP') {
        // DHAP is, as usual, a special case
        return { row: ele.id(), col: 1 }; // layout to right of GADP
      }
      return { row: ele.id(), col: 0 };
    }
  });
  cy.nodes().lock();

  function panIn(target) {
    cy.animate({
      fit: {
        eles: target,
        padding: 40
      },
      duration: 700,
      easing: 'linear',
      queue: true
    });
  }

  function findSuccessor(selected) {
    var connectedNodes;
    if (selected.isEdge()) {
      connectedNodes = selected.target();
    } else {
      connectedNodes = selected.connectedEdges().targets();
      connectedNodes = connectedNodes.difference(selected);
    }
    var successor = connectedNodes.max(function(ele) {
      return Number(ele.id());
      // Need to use Number; otherwise, id() provide string
      // which messes up comparison (says that "10" < "9")

      // max returns object with value and ele
    });
    return successor.ele;
  }

  function advanceViewport() {
    var oldSelect = cy.$(':selected');
    oldSelect.unselect();
    var nextSelect = findSuccessor(oldSelect);
    if (oldSelect.id() === cy.$('#10').id()) {
      // loop back to beginning instead of repeating pyruvate
      nextSelect = cy.$('#0');
    }
    nextSelect.select();
    panIn(nextSelect);
  }

  function makeAdvanceButton() {
    var advanceButton = document.createElement('input');
    advanceButton.type = 'button';
    advanceButton.id = 'advance';
    advanceButton.value = "Next Step";
    advanceButton.onclick = advanceViewport;
    return advanceButton;
  }

  // Initialization: select first element to focus on.
  var startNode = cy.$('node[molecule = "Glucose"]');
  startNode.select();
  panIn(startNode);
  // TUTORIAL: this can be more succintly written as cy.$('#0').select()

  document.body.appendChild(makeAdvanceButton());
});
