import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';
import { config } from '../src/config/env.js';

// Helper to generate URL-safe slugs consistently
const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const INITIAL_CATEGORIES = [
  {
    name: 'Agriculture & Irrigation',
    description: 'Precision irrigation, micro-sprinklers, crop water budgeting, and deficit irrigation techniques for sustainable farming.',
  },
  {
    name: 'Rainwater Harvesting',
    description: 'Rooftop catchment design, filtration sumps, first-flush diverters, and artificial aquifer recharge structures.',
  },
  {
    name: 'Groundwater & Aquifers',
    description: 'Borewell recharge shafts, water table monitoring, community percolation tanks, and salinity prevention.',
  },
  {
    name: 'Household Conservation',
    description: 'Domestic greywater recycling, low-flow plumbing aerators, rainwater storage tanks, and household water auditing.',
  },
  {
    name: 'Drip & Micro-Irrigation',
    description: 'Subsurface drip lines, fertigation systems, emitter maintenance, and gravity-fed drip setups for smallholders.',
  },
  {
    name: 'Watershed & Water Bodies',
    description: 'Check dam engineering, contour trenching, wetland rejuvenation, and traditional community johads/bawdis.',
  },
];

const SEED_ARTICLES = [
  {
    title: 'Precision Drip Irrigation: Design, Installation, and 45% Water Saving Guide',
    slug: 'precision-drip-irrigation-design-installation-guide',
    categoryName: 'Drip & Micro-Irrigation',
    summary: 'A step-by-step technical guide for farmers on setting up pressure-compensating drip systems, calculating water discharge rates, and reducing evapotranspiration loss by up to 50%.',
    readTime: '7 min read',
    coverImage: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80',
    content: `## Introduction to Modern Micro-Irrigation

Conventional flood irrigation loses between 40% and 60% of pumped water through surface runoff, deep percolation below crop root zones, and direct soil evaporation. Precision drip irrigation delivers water drop-by-drop directly to plant root zones, maintaining optimal soil moisture tension with minimum water loss.

According to trials conducted across semi-arid zones by agricultural research institutes, converting row crops to drip irrigation achieves:
- **35% to 55% reduction in irrigation water usage**
- **20% to 30% increase in crop yield** due to reduced moisture stress and weed competition
- **Up to 40% savings in fertilizer** when combined with automated fertigation venturi injectors

---

## Key System Components

A complete farm drip system consists of 5 core assemblies:

1. **Water Source & Pumping Unit**: Submersible or monoblock pump delivering required head pressure (1.5 to 2.5 bar).
2. **Filtration Head**:
   - *Hydrocyclone / Sand Media Filter* for removing heavy silt and algae from open canals or surface ponds.
   - *Disc / Screen Filter (120 mesh / 130 microns)* to protect inline dripper emitters from clogging.
3. **Fertigation Unit**: Fertilizer injection tank or Venturi injector installed across the primary manifold.
4. **Mainline and Sub-Mainline PVC Pipes**: Sized according to system flow rate (typically 63mm to 90mm diameter with pressure ratings of 4 to 6 kg/cm²).
5. **Lateral Tubing & Emitters**:
   - UV-stabilized 16mm or 12mm LLDPE lateral pipes.
   - Inline pressure-compensating (PC) emitters spaced at 20cm, 30cm, or 50cm according to crop planting geometry.

---

## Water Requirement Calculation Formula

To calculate the daily irrigation requirement ($V$) per plant:

$$V = Ep \times Kp \times Kc \times Sp \times Sr \times Wa$$

Where:
- **$Ep$**: Open pan evaporation rate (mm/day)
- **$Kp$**: Pan coefficient (typically 0.70 to 0.80)
- **$Kc$**: Crop coefficient for growth stage (0.4 to 1.15)
- **$Sp$**: Plant-to-plant spacing in meters
- **$Sr$**: Row-to-row spacing in meters
- **$Wa$**: Wetted area percentage (usually 0.40 to 0.70 for orchards, 0.80 for row vegetables)

---

## Maintenance & Acid Flushing Protocol

Emitter clogging by calcium carbonate deposits or iron oxides is the most common failure point. Perform preventive chemical treatment twice per season:

1. **Acid Treatment for Mineral Scale**:
   - Inject hydrochloric acid ($HCl$) or phosphoric acid to bring the water discharge pH down to 4.0 for 30 minutes.
   - Let the system rest for 60 minutes, then flush lateral end caps thoroughly.
2. **Chlorination for Organic Slime**:
   - Inject sodium hypochlorite to maintain 10 ppm free residual chlorine at the distal ends of all laterals.`,
    resources: [
      {
        title: 'FAO Irrigation Manual: Design and Management of Drip Systems (PDF)',
        url: 'https://www.fao.org/3/t0231e/t0231e00.htm',
        type: 'PDF',
      },
      {
        title: 'Step-by-Step Drip Emitter Maintenance & Flushing Video Tutorial',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'VIDEO',
      },
      {
        title: 'Crop Water Budgeting & Discharge Calculator Dataset',
        url: 'https://data.gov.in/resource/crop-water-requirements',
        type: 'DATASET',
      },
    ],
  },
  {
    title: 'Rooftop Rainwater Harvesting: Sump Sizing, Filtration, and Aquifer Recharge',
    slug: 'rooftop-rainwater-harvesting-sump-sizing-recharge',
    categoryName: 'Rainwater Harvesting',
    summary: 'Comprehensive engineering guide for residential and community rooftop rainwater collection, first-flush diverter sizing, gravel-sand filters, and recharge shaft construction.',
    readTime: '9 min read',
    coverImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
    content: `## Principles of Rooftop Catchment

Every 100 square meters of clean rooftop area in a region with 800 mm of annual rainfall can capture up to **64,000 liters** of potable-quality water annually after accounting for runoff coefficients and first-flush losses.

In urban areas facing severe groundwater depletion, harvesting rainwater serves two critical purposes:
1. Providing decentralized non-potable and potable storage for domestic resilience.
2. Directly replenishing depleted unconfined and semi-confined aquifers through recharge shafts.

---

## Harvesting Potential Calculation

The theoretical harvestable volume ($Q$) in liters is calculated as:

$$Q = A \times R \times C \times E$$

- **$A$**: Catchment area in square meters ($m^2$)
- **$R$**: Annual average rainfall in millimeters ($mm$)
- **$C$**: Runoff coefficient:
  - Concrete/RCC flat roof: **0.80 – 0.85**
  - Galvanized iron sheets: **0.90**
  - Terracotta clay tiles: **0.75**
- **$E$**: First-flush and filtration efficiency factor (typically **0.80**)

---

## First-Flush Separation

The first 1 to 2 mm of rain flushes airborne particulates, bird droppings, dry leaves, and atmospheric pollutants from the catchment.
- Provide a minimum of **1.5 liters of first-flush storage for every 1 square meter** of catchment area.
- Use a floating ball first-flush diverter pipe that automatically seals itself when full, directing the subsequent pure runoff into the sand-gravel filter.

---

## Multi-Layer Filter Bed Construction

Construct a gravity filtration chamber with the following layers from bottom to top:
1. **Bottom outlet layer**: 150 mm of 20–40 mm river gravel around slotted PVC collector pipe.
2. **Intermediate layer**: 100 mm of 10–12 mm washed gravel.
3. **Coarse sand layer**: 150 mm of washed river sand (effective size 0.6 – 1.2 mm).
4. **Top separation mesh**: Stainless steel 40-mesh wire cloth with brass fasteners for easy cleaning.`,
    resources: [
      {
        title: 'Central Ground Water Board (CGWB) Rainwater Harvesting Manual',
        url: 'http://cgwb.gov.in/documents/rainwater-harvesting.pdf',
        type: 'PDF',
      },
      {
        title: '3D Simulation: Gravity Sand-Gravel Filter & Aquifer Injection Shaft',
        url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
        type: 'VIDEO',
      },
      {
        title: 'Indian Meteorological Department 30-Year Rainfall Normals Dataset',
        url: 'https://mausam.imd.gov.in',
        type: 'DATASET',
      },
    ],
  },
  {
    title: 'System of Rice Intensification (SRI): Saving 35% Water in Paddy Cultivation',
    slug: 'system-of-rice-intensification-sri-paddy-water-saving',
    categoryName: 'Agriculture & Irrigation',
    summary: 'How alternate wetting and drying (AWD) combined with wider square spacing and organic mulch in SRI farming cuts irrigation demand by 35% while boosting paddy yields.',
    readTime: '6 min read',
    coverImage: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&w=1200&q=80',
    content: `## Breaking the Continuous Flooding Myth

Traditional paddy cultivation keeps fields submerged under 5 to 10 cm of standing water throughout the season. Contrary to common belief, rice is not an aquatic plant; continuous inundation causes hypoxia in roots, suffocates beneficial soil microbiology, and generates substantial methane emissions.

The **System of Rice Intensification (SRI)**, developed through agroecological field experiments, demonstrates that keeping paddy soil moist rather than flooded achieves stronger tillering, deeper root proliferation, and substantial water conservation.

---

## Core Agronomic Principles of SRI

1. **Young Seedling Transplanting**:
   - Transplant single seedlings at 8 to 12 days old (two-leaf stage), rather than older 25–30 day seedlings.
   - Preserve seed sac nutrients and avoid root trauma during transplantation.
2. **Wide Square Spacing**:
   - Plant seedlings in a square grid of 25 cm x 25 cm (or 30 cm x 30 cm in rich soils).
   - Promotes solar interception and expansive canopy development.
3. **Alternate Wetting and Drying (AWD)**:
   - Introduce 2 cm of water only when hairline cracks appear on the soil surface during vegetative growth.
   - Drain water 15 days before harvest to hasten uniform grain ripening.
4. **Mechanical Weeding with Rotary Cono-Weeder**:
   - Weed every 10–12 days using a mechanical cono-weeder.
   - Churns weeds into green manure and aerates the upper 5 cm of the soil matrix.`,
    resources: [
      {
        title: 'System of Rice Intensification International Network & Resources (SRI-Rice)',
        url: 'http://sri.cals.cornell.edu/',
        type: 'LINK',
      },
      {
        title: 'Video Guide: Cono-Weeder Operation and AWD Water Level Tube Installation',
        url: 'https://www.youtube.com/watch?v=2vjPBrBU-TM',
        type: 'VIDEO',
      },
    ],
  },
  {
    title: 'Greywater Recycling for Urban Households: Natural Reed Bed and Sand Filters',
    slug: 'greywater-recycling-urban-households-reed-bed-filters',
    categoryName: 'Household Conservation',
    summary: 'Design specifications for recycling domestic wash water from showers and washing machines for garden irrigation and toilet flushing using passive ecological filtration.',
    readTime: '5 min read',
    coverImage: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=1200&q=80',
    content: `## Reclaiming 60% of Domestic Effluent

Up to 65% of household wastewater is greywater—originating from showers, hand basins, and washing machines. Because it does not contain fecal contamination (blackwater), greywater can be safely treated on-site with simple passive biological and mechanical filtration.

---

## Step-by-Step Treatment Train

1. **Lint and Hair Interceptor**: Fine nylon or stainless steel strainer basket placed at the bathroom drain line.
2. **Grease and Soap Trap**: Dual-chamber gravity settlement box where floating soaps and oils are skimmed off.
3. **Subsurface Flow Reed Bed**:
   - Water flows horizontally through a lined basin filled with pea gravel.
   - Wetland plants such as *Typha latifolia* (cattail) and *Phragmites australis* transfer oxygen into their root zone (rhizosphere), breaking down surfactants and organic compounds aerobically without foul odors.
4. **Storage & Disinfection**: Treated effluent is chlorinated with minor dosage (0.5 ppm) and used for garden drip lines and toilet flush cisterns.`,
    resources: [
      {
        title: 'WHO Guidelines for Safe Use of Wastewater, Excreta and Greywater',
        url: 'https://www.who.int/publications/i/item/9241546824',
        type: 'PDF',
      },
    ],
  },
];

async function main() {
  console.log('🌱 Starting JalGyan database seeding...');

  // 1. Seed Categories using upsert to guarantee idempotency
  console.log('📦 Seeding knowledge categories...');
  const categoryMap = new Map();
  for (const cat of INITIAL_CATEGORIES) {
    const slug = slugify(cat.name);
    const category = await prisma.category.upsert({
      where: { slug },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: {
        name: cat.name,
        slug,
        description: cat.description,
      },
    });
    categoryMap.set(cat.name, category);
    console.log(`   ✔ Category: "${category.name}" (slug: ${category.slug})`);
  }

  // 2. Seed Initial Administrator Account
  console.log('👤 Seeding default administrator account...');
  const adminEmail = config.adminEmail.toLowerCase().trim();
  const rawAdminPassword = config.adminPassword;

  if (!rawAdminPassword) {
    throw new Error('ADMIN_PASSWORD must be configured in environment variables.');
  }

  const hashedPassword = await bcrypt.hash(rawAdminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: 'Dr. Ramesh Sharma',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      location: 'National Water Conservation Center, New Delhi',
      bio: 'Senior Hydrologist & Agricultural Engineer with 20+ years experience in micro-irrigation and watershed management.',
    },
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
      name: 'Dr. Ramesh Sharma',
      bio: 'Senior Hydrologist & Agricultural Engineer with 20+ years experience in micro-irrigation and watershed management.',
    },
  });

  console.log(`   ✔ Admin ready: "${admin.name}" (${admin.email}) [Role: ${admin.role}, Status: ${admin.status}]`);

  // 3. Seed Verified Water Conservation Articles
  console.log('📚 Seeding verified knowledge articles & resources...');
  for (const art of SEED_ARTICLES) {
    const category = categoryMap.get(art.categoryName);
    if (!category) continue;

    const article = await prisma.article.upsert({
      where: { slug: art.slug },
      update: {
        title: art.title,
        summary: art.summary,
        content: art.content,
        readTime: art.readTime,
        coverImage: art.coverImage,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
        authorId: admin.id,
      },
      create: {
        title: art.title,
        slug: art.slug,
        summary: art.summary,
        content: art.content,
        readTime: art.readTime,
        coverImage: art.coverImage,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
        authorId: admin.id,
      },
    });

    // Seed resources for this article
    if (art.resources && art.resources.length > 0) {
      for (const res of art.resources) {
        const existing = await prisma.articleResource.findFirst({
          where: { articleId: article.id, url: res.url },
        });
        if (!existing) {
          await prisma.articleResource.create({
            data: {
              articleId: article.id,
              title: res.title,
              url: res.url,
              type: res.type,
            },
          });
        }
      }
    }

    console.log(`   ✔ Article: "${article.title}" (slug: ${article.slug})`);
  }

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
