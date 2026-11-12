import { MENU_CATALOG } from './catalog';
import { ContextMode, DietaryPreference, MenuItem } from './types';

export interface SituationalScenario {
  id: string;
  badge: string;
  title: string;
  persona: string;
  role: string;
  situation: string;
  urgency: string;
  freeMinutes: number;
  distanceMeters: number;
  dietary: DietaryPreference;
  contextMode?: ContextMode;
  itemId: string;
  item: MenuItem;
  nextMeetingTitle: string;
  reason: string;
  timeSavedMinutes: number;
  highlightValue: string;
  hackathonTrack: string;
  autoVoidOnAlert?: boolean;
}

function catalogItem(id: string): MenuItem {
  return MENU_CATALOG.find((m) => m.id === id) ?? MENU_CATALOG[0];
}

export const SITUATIONAL_SCENARIOS: SituationalScenario[] = [
  {
    id: 'lunch',
    badge: '🚶 12:15 PM Lunch',
    title: 'Executive Lunch',
    persona: 'Jack Sullivan',
    role: 'Product Lead',
    situation:
      "35m calendar window before Standup. 3m walk to Jack's Cafe. Zero time to wait in lunch line.",
    urgency: "35m window · Jack's Cafe",
    freeMinutes: 35,
    distanceMeters: 200,
    dietary: 'Omnivore',
    contextMode: 'calendar_gap',
    itemId: 'prod_turkey_panini',
    item: catalogItem('prod_turkey_panini'),
    nextMeetingTitle: 'Afternoon Product Standup',
    reason: "35m window before Standup · 3m walk to Jack's Cafe.",
    timeSavedMinutes: 20,
    highlightValue: 'Proactive calendar sync & instant escrow hold',
    hackathonTrack: 'PayPal AI & AG Grid Micro-Commerce',
  },
  {
    id: 'transit',
    badge: '🚆 Transit Crunch',
    title: 'Platform Connection',
    persona: 'David Chen',
    role: 'Suburban Rail Commuter',
    situation:
      'Tight 8m platform transfer between Commuter Rail & Downtown Metro. 20-person cafe queues mean missing connection.',
    urgency: '8m window · Concourse A',
    freeMinutes: 8,
    distanceMeters: 45,
    dietary: 'Omnivore',
    contextMode: 'transit_transfer',
    itemId: 'prod_truffle_melt',
    item: catalogItem('prod_truffle_melt'),
    nextMeetingTitle: 'Metro Red Line Express (Departing 8:22 AM)',
    reason:
      '8m transfer window detected. Artisan melt ready in heated Cubby #2 on Concourse A.',
    timeSavedMinutes: 18,
    highlightValue: 'Sub-minute physical sync with zero pause',
    hackathonTrack: 'Agentic Micro-Commerce & Proximity Doorstep Capture',
  },
  {
    id: 'hospital',
    badge: '🏥 ER On-Call',
    title: 'Trauma Shift Lull',
    persona: 'Dr. Maya Lin',
    role: 'Emergency Trauma Resident',
    situation:
      'Unpredictable 20m downtime lull between patient rounds. Sudden Code Blue risk means standard delivery gets abandoned.',
    urgency: '20m window · Hospital Bistro',
    freeMinutes: 20,
    distanceMeters: 110,
    dietary: 'Vegan',
    contextMode: 'on_call_lull',
    itemId: 'prod_quinoa_bowl',
    item: catalogItem('prod_quinoa_bowl'),
    nextMeetingTitle: 'Emergency Trauma Surgical Rotation',
    reason:
      '20m surgical lull detected. Warm grain bowl ready at Medical Bistro. 2-phase escrow protects $0 on emergency calls.',
    timeSavedMinutes: 25,
    highlightValue: '2-Phase Escrow ($0 risk if called to surgery)',
    hackathonTrack: 'PayPal 2-Phase Escrow Safety',
  },
  {
    id: 'parent',
    badge: '🚗 Parent Commute',
    title: 'School Run Rush',
    persona: 'Rachel Miller',
    role: 'VP & Working Parent',
    situation:
      '12m commute window to elementary school pickup. Drive-throughs backed up 15 cars; dangerous to type cards while driving.',
    urgency: '12m drive · Curbside',
    freeMinutes: 35,
    distanceMeters: 180,
    dietary: 'Omnivore',
    contextMode: 'calendar_gap',
    itemId: 'prod_turkey_panini',
    item: catalogItem('prod_turkey_panini'),
    nextMeetingTitle: 'School Dismissal & Soccer Practice',
    reason:
      "School route anticipated. Fresh Turkey Avocado Club queued at Jack's Cafe pickup locker.",
    timeSavedMinutes: 22,
    highlightValue: 'Proactive route anticipation & hands-free safety',
    hackathonTrack: 'Proactive Context-Aware Autonomous Agent',
  },
  {
    id: 'void',
    badge: '⚡ Meeting Void ($0)',
    title: 'Emergency Board Sync',
    persona: 'Sophia Vance',
    role: 'VP of Engineering',
    situation:
      'Lunch placed in escrow for 12:45 PM. Emergency executive board sync called at 12:42 PM. 1-tap autonomous escrow void.',
    urgency: 'Collision · $0.00 Voided',
    freeMinutes: 12,
    distanceMeters: 250,
    dietary: 'Omnivore',
    contextMode: 'on_call_lull',
    itemId: 'prod_turkey_panini',
    item: catalogItem('prod_turkey_panini'),
    nextMeetingTitle: 'Emergency Executive Board Collision',
    reason:
      'Calendar conflict detected. Phase 1 Escrow authorization released with $0.00 charged and zero dispute fees.',
    timeSavedMinutes: 30,
    highlightValue: 'Zero chargebacks, zero friction refund release',
    hackathonTrack: 'PayPal Orders v2 Auth Voiding',
    autoVoidOnAlert: true,
  },
  {
    id: 'fitness',
    badge: '🏋️ Post-Gym Macros',
    title: 'Metabolic Refuel',
    persona: 'Marcus Cole',
    role: 'Marathoner / CrossFitter',
    situation:
      'Strict 30m metabolic window post-workout. Requires exact 48g protein, gluten-free, <600 kcal. Zero time to parse PDF menus.',
    urgency: '45m window · Tokyo Bites',
    freeMinutes: 45,
    distanceMeters: 150,
    dietary: 'Gluten-Free',
    contextMode: 'calendar_gap',
    itemId: 'prod_salmon_poke',
    item: catalogItem('prod_salmon_poke'),
    nextMeetingTitle: 'Afternoon Strategy Review',
    reason:
      'Post-workout recovery window detected. Fresh Salmon Poke Protein Bowl pre-matched with gluten-free tamari glaze.',
    timeSavedMinutes: 20,
    highlightValue: 'Multi-attribute nutritional constraint satisfaction',
    hackathonTrack: 'Gemini 4 Argon Structured Decision Engine',
  },
];

export function getScenarioById(id: string): SituationalScenario {
  return (
    SITUATIONAL_SCENARIOS.find(
      (s) => s.id.toLowerCase() === id.toLowerCase()
    ) ?? SITUATIONAL_SCENARIOS[0]
  );
}
