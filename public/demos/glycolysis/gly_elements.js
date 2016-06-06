// based on https://en.wikipedia.org/wiki/Glycolysis

var GlyElements = {
  nodes: [
    {
      data: {
        id: 0,
        molecule: 'Glucose',
        image: 'assets/glucose.svg'
      }
    }, {
      data: {
        id: 1,
        molecule: 'G6P',
        image: 'assets/g6p.svg'
      }
    }, {
      data: {
        id: 2,
        molecule: 'F6P',
        image: 'assets/f6p.svg'
      }
    }, {
      data: {
        id: 3,
        molecule: 'F1,6BP',
        image: 'assets/f16bp.svg'
      }
    },
    // GADP & DHAP is in equilibrium
    {
      data: {
        id: 4,
        molecule: 'GADP',
        image: 'assets/gadp.svg'
      }
    }, {
      data: {
        id: 5,
        molecule: 'DHAP',
        image: 'assets/dhap.svg'
      }
    }, {
      data: {
        id: 6,
        molecule: '1,3BPG',
        image: 'assets/13bpg.svg'
      }
    }, {
      data: {
        id: 7,
        molecule: '3PG',
        image: 'assets/3pg.svg'
      }
    }, {
      data: {
        id: 8,
        molecule: '2PG',
        image: 'assets/2pg.svg'
      }
    }, {
      data: {
        id: 9,
        molecule: 'PEP',
        image: 'assets/pep.svg'
      }
    }, {
      data: {
        id: 10,
        molecule: 'Pyruvate',
        image: 'assets/pyruvate.svg'
      }
    }
  ],
  edges: [
    {
      data: {
        id: 'step1',
        enzyme: 'Hexokinase',
        source: 0,
        target: 1
      }
    }, {
      data: {
        id: 'step2',
        enzyme: 'Phosphoglucose isomerase',
        source: 1,
        target: 2
      }
    }, {
      data: {
        id: 'step3',
        enzyme: 'Phosphofructokinase',
        source: 2,
        target: 3
      }
    }, {
      data: {
        id: 'step4',
        enzyme: 'Fructose-bisphosphate aldolase',
        source: 3,
        target: 4
      }
    }, {
      data: {
        id: 'step5',
        enzyme: 'Triosephosphate isomerase',
        source: 4,
        target: 5
      }
    },
    // DHAP is in equilibrium with GADP; only GADP moves pathway forward
    {
      data: {
        id: 'step5-reverse',
        enzyme: 'Triosephosphate isomerase',
        source: 5,
        target: 4
      }
    }, {
      data: {
        id: 'step6',
        enzyme: 'Glyceraldehyde 3-phosphate dehydrogenase',
        // 4 is GADP, 5 is DHAP and is therefore skipped over
        source: 4,
        target: 6
      }
    }, {
      data: {
        id: 'step7',
        enzyme: 'Phosphoglycerate kinase',
        source: 6,
        target: 7
      }
    }, {
      data: {
        id: 'step8',
        enzyme: 'Phosphoglycerate mutase',
        source: 7,
        target: 8
      }
    }, {
      data: {
        id: 'step9',
        enzyme: 'Enolase',
        source: 8,
        target: 9
      }
    }, {
      data: {
        id: 'step10',
        enzyme: 'Pyruvate kinase',
        source: 9,
        target: 10
      }
    }
  ]
};
