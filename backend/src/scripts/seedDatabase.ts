import dotenv from 'dotenv';
dotenv.config();

import { getDb, isFirebaseAdminConfigured } from '../config/firebase';
import { DEFAULT_RATE_CARDS } from '../services/costEstimationService';
import { Skill } from '../types';

const INITIAL_SKILLS: Skill[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    category: 'Plumbing',
    description: 'Repair and maintenance of water pipes, taps, drains, valves, and water heaters.',
    active: true,
  },
  {
    id: 'electrical',
    name: 'Electrical Repair',
    category: 'Electrical',
    description: 'Repair of sockets, switches, wiring, ceiling fans, breakers, and light fixtures.',
    active: true,
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    category: 'Woodwork',
    description: 'Repair and installation of doors, windows, locks, wooden furniture, and cabinetry.',
    active: true,
  },
  {
    id: 'appliance_repair',
    name: 'Appliance Repair',
    category: 'Appliances',
    description: 'Troubleshooting and repair of refrigerators, washing machines, microwaves, and RO units.',
    active: true,
  },
  {
    id: 'painting',
    name: 'Painting',
    category: 'Finishing',
    description: 'Interior and exterior wall touch-ups, putty repair, primer, and complete painting.',
    active: true,
  },
  {
    id: 'cleaning',
    name: 'Deep Cleaning',
    category: 'Cleaning',
    description: 'Comprehensive sanitization and deep cleaning of kitchens, bathrooms, and floorings.',
    active: true,
  },
  {
    id: 'masonry',
    name: 'Masonry & Tiling',
    category: 'Civil',
    description: 'Repair of cracked tiles, plastering, grouting, and minor brickwork maintenance.',
    active: true,
  },
  {
    id: 'general_maintenance',
    name: 'General Maintenance',
    category: 'General',
    description: 'Handyman tasks, picture hanging, minor fixture alignment, and general upkeep.',
    active: true,
  },
];

async function seedDatabase() {
  console.log('--- Seeding WorkForce Database ---');

  if (!isFirebaseAdminConfigured()) {
    console.error('Error: Firebase Admin is not configured. Please supply serviceAccountKey.json before seeding.');
    process.exit(1);
  }

  const db = getDb();

  // 1. Seed Skills
  console.log('Seeding skills catalog...');
  for (const skill of INITIAL_SKILLS) {
    await db.collection('skills').doc(skill.id).set(skill, { merge: true });
    console.log(`  ✓ Skill: ${skill.name} (${skill.id})`);
  }

  // 2. Seed Rate Cards
  console.log('\nSeeding sample rate cards...');
  for (const [key, card] of Object.entries(DEFAULT_RATE_CARDS)) {
    await db.collection('rateCards').doc(card.id).set(card, { merge: true });
    console.log(`  ✓ Rate Card: ${card.skillName} - Base: ₹${card.baseLabourRate}, Travel: ₹${card.travelRate}, Materials: ₹${card.indicativeMaterialsAllowance}`);
  }

  console.log('\n✓ Database seeding completed successfully!');
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('Failed to seed database:', err);
  process.exit(1);
});
