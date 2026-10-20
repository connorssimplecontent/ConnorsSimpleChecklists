// Starter checklists with pre-established versions.
// Each item: [text, section, { versionKey: quantity | true }]
//   - a version key present  -> the item is in that version
//   - a number               -> the quantity shown for that version
//   - true                   -> in that version, no quantity

const each = (keys, qty = true) => Object.fromEntries(keys.map(k => [k, qty]));

const TRIP = ['d3', 'd5', 'd7'];
const BEACH = ['full', 'part'];
const CAMP = ['night', 'wknd', 'week'];
const CLEAN = ['daily', 'weekly', 'deep'];

export const TEMPLATES = [
  {
    id: 'travel',
    title: 'Travel Packing',
    emoji: '🧳',
    description: 'Clothes, toiletries, tech and documents, sized to the length of the trip.',
    variants: [
      { key: 'd3', name: '3-Day Trip' },
      { key: 'd5', name: '5-Day Trip' },
      { key: 'd7', name: '7-Day Trip' }
    ],
    items: [
      ['Shirts', 'Clothing', { d3: 3, d5: 5, d7: 7 }],
      ['Pants / shorts', 'Clothing', { d3: 2, d5: 3, d7: 4 }],
      ['Underwear', 'Clothing', { d3: 4, d5: 6, d7: 8 }],
      ['Socks', 'Clothing', { d3: 4, d5: 6, d7: 8 }],
      ['Pajamas', 'Clothing', { d3: 1, d5: 1, d7: 2 }],
      ['Jacket or sweater', 'Clothing', each(TRIP)],
      ['Comfortable walking shoes', 'Clothing', each(TRIP)],
      ['Workout clothes', 'Clothing', { d3: 1, d5: 2, d7: 3 }],
      ['Swimsuit', 'Clothing', { d5: 1, d7: 1 }],
      ['Dress outfit', 'Clothing', { d5: 1, d7: 1 }],
      ['Toothbrush & toothpaste', 'Toiletries', each(TRIP)],
      ['Deodorant', 'Toiletries', each(TRIP)],
      ['Shampoo & conditioner', 'Toiletries', each(TRIP)],
      ['Razor', 'Toiletries', each(TRIP)],
      ['Medications', 'Toiletries', each(TRIP)],
      ['Sunscreen', 'Toiletries', each(TRIP)],
      ['Glasses / contacts', 'Toiletries', each(TRIP)],
      ['Laundry bag', 'Toiletries', { d5: true, d7: true }],
      ['Phone charger', 'Tech', each(TRIP)],
      ['Headphones', 'Tech', each(TRIP)],
      ['Power bank', 'Tech', each(TRIP)],
      ['Laptop & charger', 'Tech', { d5: true, d7: true }],
      ['Travel adapter', 'Tech', { d7: true }],
      ['ID / passport', 'Documents', each(TRIP)],
      ['Wallet & cards', 'Documents', each(TRIP)],
      ['Boarding passes / tickets', 'Documents', each(TRIP)],
      ['Hotel confirmation', 'Documents', each(TRIP)],
      ['Travel insurance info', 'Documents', { d7: true }],
      ['Take out the trash', 'Before you leave', each(TRIP)],
      ['Set the thermostat', 'Before you leave', each(TRIP)],
      ['Water the plants', 'Before you leave', { d5: true, d7: true }],
      ['Hold the mail', 'Before you leave', { d7: true }],
      ['Lock doors & windows', 'Before you leave', each(TRIP)]
    ]
  },
  {
    id: 'beach',
    title: 'Beach Day',
    emoji: '🏖️',
    description: 'Everything for the sand – pack light for a few hours or go all in for the day.',
    variants: [
      { key: 'full', name: 'Full Day' },
      { key: 'part', name: 'Partial Day' }
    ],
    items: [
      ['Sunscreen', 'Essentials', each(BEACH)],
      ['Beach towels', 'Essentials', { full: 2, part: 1 }],
      ['Sunglasses', 'Essentials', each(BEACH)],
      ['Hat', 'Essentials', each(BEACH)],
      ['Flip-flops', 'Essentials', each(BEACH)],
      ['Cash / card for parking', 'Essentials', each(BEACH)],
      ['Water bottles', 'Food & drink', { full: 4, part: 2 }],
      ['Snacks', 'Food & drink', each(BEACH)],
      ['Packed lunch', 'Food & drink', { full: true }],
      ['Cooler with ice', 'Food & drink', { full: true }],
      ['Beach umbrella or tent', 'Comfort', { full: true }],
      ['Beach chairs', 'Comfort', { full: 2 }],
      ['Change of clothes', 'Comfort', { full: true }],
      ['Aloe vera', 'Comfort', { full: true }],
      ['Book or magazine', 'Fun', each(BEACH)],
      ['Bluetooth speaker', 'Fun', { full: true }],
      ['Beach toys / frisbee', 'Fun', { full: true }],
      ['Phone in waterproof pouch', 'Fun', each(BEACH)],
      ['Power bank', 'Fun', { full: true }],
      ['Trash bag', 'Leave no trace', each(BEACH)]
    ]
  },
  {
    id: 'camping',
    title: 'Camping Trip',
    emoji: '🏕️',
    description: 'Shelter, kitchen and gear for a night out or a full week in the woods.',
    variants: [
      { key: 'night', name: 'Overnight' },
      { key: 'wknd', name: 'Weekend' },
      { key: 'week', name: 'Full Week' }
    ],
    items: [
      ['Tent, stakes & rainfly', 'Shelter', each(CAMP)],
      ['Sleeping bag', 'Shelter', each(CAMP)],
      ['Sleeping pad', 'Shelter', each(CAMP)],
      ['Camp pillow', 'Shelter', each(CAMP)],
      ['Tarp', 'Shelter', { wknd: true, week: true }],
      ['Stove & fuel', 'Kitchen', { night: 1, wknd: 1, week: 2 }],
      ['Cookware & utensils', 'Kitchen', each(CAMP)],
      ['Lighter / matches', 'Kitchen', each(CAMP)],
      ['Water (gallons)', 'Kitchen', { night: 2, wknd: 4, week: 10 }],
      ['Planned meals', 'Kitchen', { night: 2, wknd: 5, week: 18 }],
      ['Cooler & ice', 'Kitchen', { wknd: true, week: true }],
      ['Water filter', 'Kitchen', { week: true }],
      ['Headlamp', 'Gear', each(CAMP)],
      ['Extra batteries', 'Gear', { wknd: true, week: true }],
      ['First aid kit', 'Gear', each(CAMP)],
      ['Knife / multi-tool', 'Gear', each(CAMP)],
      ['Bug spray', 'Gear', each(CAMP)],
      ['Camp chairs', 'Gear', { wknd: 2, week: 2 }],
      ['Warm layer', 'Clothing', each(CAMP)],
      ['Rain jacket', 'Clothing', each(CAMP)],
      ['Socks', 'Clothing', { night: 2, wknd: 3, week: 7 }],
      ['Hiking boots', 'Clothing', each(CAMP)]
    ]
  },
  {
    id: 'cleaning',
    title: 'House Cleaning',
    emoji: '🧹',
    description: 'A quick daily tidy, the weekly reset, or a top-to-bottom deep clean.',
    variants: [
      { key: 'daily', name: 'Daily' },
      { key: 'weekly', name: 'Weekly' },
      { key: 'deep', name: 'Deep Clean' }
    ],
    items: [
      ['Wash the dishes', 'Kitchen', each(CLEAN)],
      ['Wipe counters & stovetop', 'Kitchen', each(CLEAN)],
      ['Clean out the fridge', 'Kitchen', { deep: true }],
      ['Clean the oven & microwave', 'Kitchen', { deep: true }],
      ['Make the beds', 'Bedrooms', each(CLEAN)],
      ['Change bed sheets', 'Bedrooms', { weekly: true, deep: true }],
      ['Dust ceiling fans', 'Bedrooms', { deep: true }],
      ['Tidy the living room', 'Living areas', each(CLEAN)],
      ['Vacuum', 'Living areas', { weekly: true, deep: true }],
      ['Mop floors', 'Living areas', { weekly: true, deep: true }],
      ['Wipe baseboards', 'Living areas', { deep: true }],
      ['Clean windows', 'Living areas', { deep: true }],
      ['Clean toilets, sinks & showers', 'Bathrooms', { weekly: true, deep: true }],
      ['Wash shower curtain & bath mats', 'Bathrooms', { deep: true }],
      ['Run a load of laundry', 'Chores', { weekly: 2, deep: 3 }],
      ['Take out trash & recycling', 'Chores', each(CLEAN)]
    ]
  }
];
