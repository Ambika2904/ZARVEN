// ══════════════════════════════════════════
// elements.js — Periodic Table Data
// Used by ZARVEN Level 2
// ══════════════════════════════════════════

const ELEMENTS = [
  { z:1,  sym:'H',  name:'Hydrogen',    mass:1,   radius:53,  noble:false, example:'Water (H₂O), rocket fuel'         },
  { z:2,  sym:'He', name:'Helium',      mass:4,   radius:31,  noble:true,  example:'Balloons, MRI cooling'             },
  { z:3,  sym:'Li', name:'Lithium',     mass:7,   radius:167, noble:false, example:'Phone & EV batteries'              },
  { z:4,  sym:'Be', name:'Beryllium',   mass:9,   radius:112, noble:false, example:'Aerospace alloys'                  },
  { z:5,  sym:'B',  name:'Boron',       mass:11,  radius:87,  noble:false, example:'Bulletproof vests, Pyrex glass'    },
  { z:6,  sym:'C',  name:'Carbon',      mass:12,  radius:77,  noble:false, example:'Diamonds, graphite, life itself'   },
  { z:7,  sym:'N',  name:'Nitrogen',    mass:14,  radius:75,  noble:false, example:'78% of air, fertilisers'           },
  { z:8,  sym:'O',  name:'Oxygen',      mass:16,  radius:73,  noble:false, example:'Breathing, combustion'             },
  { z:9,  sym:'F',  name:'Fluorine',    mass:19,  radius:64,  noble:false, example:'Toothpaste, Teflon non-stick pans' },
  { z:10, sym:'Ne', name:'Neon',        mass:20,  radius:38,  noble:true,  example:'Neon signs, lasers'                },
  { z:11, sym:'Na', name:'Sodium',      mass:23,  radius:186, noble:false, example:'Table salt (NaCl), street lights'  },
  { z:12, sym:'Mg', name:'Magnesium',   mass:24,  radius:160, noble:false, example:'Lightweight car & aircraft parts'  },
  { z:13, sym:'Al', name:'Aluminium',   mass:27,  radius:143, noble:false, example:'Cans, aircraft bodies, foil'       },
  { z:14, sym:'Si', name:'Silicon',     mass:28,  radius:117, noble:false, example:'Microchips, solar cells'           },
  { z:15, sym:'P',  name:'Phosphorus',  mass:31,  radius:109, noble:false, example:'DNA backbone, matches'             },
  { z:16, sym:'S',  name:'Sulfur',      mass:32,  radius:104, noble:false, example:'Vulcanised rubber, acid rain'      },
  { z:17, sym:'Cl', name:'Chlorine',    mass:35,  radius:99,  noble:false, example:'Water purification, bleach'        },
  { z:18, sym:'Ar', name:'Argon',       mass:40,  radius:71,  noble:true,  example:'Welding gas, light bulbs'          },
  { z:19, sym:'K',  name:'Potassium',   mass:39,  radius:227, noble:false, example:'Nerve signals, bananas'            },
  { z:20, sym:'Ca', name:'Calcium',     mass:40,  radius:197, noble:false, example:'Bones, teeth, chalk, cement'       },
];

// Filtered pools for each selectable range
const ELEMENT_RANGES = {
  '1-10':  ELEMENTS.filter(e => e.z >= 1  && e.z <= 10),
  '11-20': ELEMENTS.filter(e => e.z >= 11 && e.z <= 20),
  '1-20':  ELEMENTS,
};
