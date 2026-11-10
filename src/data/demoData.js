export const demoPosts = [
  {
    id: 'p1', title: 'How can our housing society reduce water wastage?',
    body: 'Our society has 4 buildings and a shared garden. We are looking for practical ways to reduce water use without a major infrastructure overhaul. What has worked in your community?',
    category: 'Community', author: 'Aarav Kulkarni', initials: 'AK', time: '2 hours ago',
    location: 'Pune, Maharashtra', votes: 28, comments: 12, tags: ['Rainwater harvesting', 'Housing'],
    commentsList: [
      { id: 'c1', author: 'Meera Shah', initials: 'MS', time: '1 hour ago', text: 'Start by checking overhead tank overflow. A simple float valve can prevent a surprising amount of waste.', replies: [{ id: 'r1', author: 'Aarav Kulkarni', initials: 'AK', time: '45 min ago', text: 'That is a good first step. We will check the tanks this weekend.' }] },
      { id: 'c2', author: 'Rohan Patil', initials: 'RP', time: '35 min ago', text: 'Consider drip irrigation for the garden and watering early in the morning.', replies: [] }
    ]
  },
  {
    id: 'p2', title: 'Experiences with drip irrigation for small farms',
    body: 'I am comparing drip irrigation kits for a small vegetable plot. Interested in maintenance costs, filter cleaning and actual water savings reported by farmers.',
    category: 'Agriculture', author: 'Sonal Deshmukh', initials: 'SD', time: '5 hours ago',
    location: 'Nashik, Maharashtra', votes: 19, comments: 8, tags: ['Drip irrigation', 'Farming'], commentsList: []
  },
  {
    id: 'p3', title: 'Is rooftop rainwater harvesting practical in older buildings?',
    body: 'Looking for advice on retrofitting rainwater harvesting in a building constructed around 2005. What should be assessed before installation?',
    category: 'Rainwater', author: 'Kabir Nair', initials: 'KN', time: 'Yesterday',
    location: 'Bengaluru, Karnataka', votes: 14, comments: 6, tags: ['Rainwater harvesting', 'Urban'], commentsList: []
  },
  {
    id: 'p4', title: 'Low-cost ways to reuse greywater at home',
    body: 'Has anyone implemented a safe greywater reuse setup for gardening? Please share what sources you reused and what precautions you took.',
    category: 'Household', author: 'Nisha Rao', initials: 'NR', time: 'Yesterday',
    location: 'Hyderabad, Telangana', votes: 9, comments: 4, tags: ['Greywater', 'Household'], commentsList: []
  }
]

export const demoArticles = [
  { id: 'a1', title: 'Drip Irrigation: A Practical Guide for Small Farms', category: 'Agriculture', read: '8 min read', summary: 'An overview of drip systems, filtration, maintenance and implementation considerations.' },
  { id: 'a2', title: 'Rainwater Harvesting for Urban Homes', category: 'Rainwater', read: '6 min read', summary: 'Planning rooftop collection, first-flush systems, storage and recharge.' },
  { id: 'a3', title: 'Reducing Water Loss in Community Buildings', category: 'Community', read: '5 min read', summary: 'A checklist for leak audits, tank controls and responsible landscape watering.' }
]
