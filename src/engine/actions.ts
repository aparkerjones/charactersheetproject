import { classLevel } from "./calc";
import { resourcePools } from "./resources";
import { fightingStyleKey } from "./classChoices";
import type { Character, ClassId } from "./types";

export type ActionInput = "roll-healing" | "points-healing";

export interface ClassActionChoice {
  id: string;
  label: string;
  instruction: string;
  rollFormula?: string;
  minLevel?: number;
  activation?: string;
}

export interface ClassAction {
  id: string;
  classId: ClassId;
  label: string;
  minLevel: number;
  activation: "Action" | "Bonus action" | "Reaction" | "Free";
  instruction: string;
  resourceId?: string;
  resourceCost?: number | "input";
  rollFormula?: string;
  input?: ActionInput;
  choices?: ClassActionChoice[];
}

export interface ActionResolution {
  resourcesUsed: Record<string, number>;
  healing?: number;
}

const actions: ClassAction[] = [
  {
    id: "fighter-second-wind",
    classId: "fighter",
    label: "Second Wind",
    minLevel: 1,
    activation: "Bonus action",
    instruction: "Roll the listed die, add your Fighter level, and enter the total healing.",
    rollFormula: "1d10 + Fighter level",
    input: "roll-healing",
    resourceId: "secondWind",
  },
  {
    id: "fighter-action-surge",
    classId: "fighter",
    label: "Action Surge",
    minLevel: 2,
    activation: "Free",
    instruction: "You gain one additional action this turn. Apply that action in play.",
    resourceId: "actionSurge",
  },
  {
    id: "bardic-inspiration",
    classId: "bard",
    label: "Bardic Inspiration",
    minLevel: 1,
    activation: "Bonus action",
    instruction: "Choose a willing creature and roll the listed die when it uses the granted bonus. Record or communicate the result.",
    resourceId: "bardicInspiration",
  },
  {
    id: "cleric-channel-divinity",
    classId: "cleric",
    label: "Channel Divinity",
    minLevel: 2,
    activation: "Action",
    instruction: "Choose an available Channel Divinity option and resolve its effects. Roll any listed dice yourself.",
    resourceId: "channelDivinity",
  },
  {
    id: "druid-wild-shape",
    classId: "druid",
    label: "Wild Shape",
    minLevel: 2,
    activation: "Action",
    instruction: "Choose a permitted form for your ruleset and Druid level; apply its form statistics and duration.",
    resourceId: "wildShape",
  },
  {
    id: "monk-flurry-of-blows",
    classId: "monk",
    label: "Flurry of Blows",
    minLevel: 2,
    activation: "Bonus action",
    instruction: "After taking the Attack action, make the additional unarmed strikes allowed by your ruleset.",
    resourceId: "focusPoints",
  },
  {
    id: "monk-patient-defense",
    classId: "monk",
    label: "Patient Defense",
    minLevel: 2,
    activation: "Bonus action",
    instruction: "Spend a Focus Point and take the defensive benefit for the duration given by your ruleset.",
    resourceId: "focusPoints",
  },
  {
    id: "monk-step-of-the-wind",
    classId: "monk",
    label: "Step of the Wind",
    minLevel: 2,
    activation: "Bonus action",
    instruction: "Spend a Focus Point and take the movement option available under your ruleset.",
    resourceId: "focusPoints",
  },
  {
    id: "paladin-lay-on-hands",
    classId: "paladin",
    label: "Lay on Hands",
    minLevel: 1,
    activation: "Action",
    instruction: "Enter how many points from your pool to spend healing this character. The same number of hit points will be restored.",
    resourceId: "layOnHands",
    resourceCost: "input",
    input: "points-healing",
  },
];

const domainChannelChoices: Record<string, ClassActionChoice[]> = {
  "roster-arcana-domain": [
    { id: "arcane-abjuration", label: "Arcane Abjuration", activation: "Action", instruction: "Choose one celestial, elemental, fey, or fiend within 30 feet that can see or hear you. It makes a Wisdom save; on a failure, it is turned for 1 minute or until damaged. At Cleric 5+, an eligible creature not on its home plane can instead be banished if its CR is at most 1/2 at level 5, 1 at 8, 2 at 11, 3 at 14, or 4 at 17." },
  ],
  "roster-death-domain": [
    { id: "touch-of-death", label: "Touch of Death", activation: "When you hit with a melee attack", instruction: "Add necrotic damage equal to 5 + twice your Cleric level to that target." },
  ],
  "roster-forge-domain": [
    { id: "artisans-blessing", label: "Artisan's Blessing", activation: "1-hour ritual", instruction: "Create a nonmagical metal-containing item worth up to 100 gp. Lay out metal of equal value; the materials are consumed when the item is made." },
  ],
  "roster-grave-domain": [
    { id: "path-to-the-grave", label: "Path to the Grave", activation: "Action", instruction: "Choose a creature you can see within 30 feet. Until the end of your next turn, the next attack that hits it makes it vulnerable to all damage from that attack, then the curse ends." },
  ],
  "roster-knowledge-domain": [
    { id: "knowledge-of-the-ages", label: "Knowledge of the Ages", activation: "Action", instruction: "Choose one skill or tool. You gain proficiency with it for 10 minutes." },
    { id: "read-thoughts", label: "Read Thoughts", minLevel: 6, activation: "Action", instruction: "Choose a creature you can see within 60 feet; it makes a Wisdom save. On a failure, read its surface thoughts for up to 1 minute. You can then use an action to end the effect and cast Suggestion on it without a slot; it automatically fails that save." },
  ],
  "roster-life-domain": [
    { id: "preserve-life", label: "Preserve Life", activation: "Action", instruction: "Distribute healing equal to 5 × Cleric level among creatures within 30 feet. No target can be healed above half its hit point maximum; this cannot heal undead or constructs." },
  ],
  "roster-light-domain": [
    { id: "radiance-of-the-dawn", label: "Radiance of the Dawn", activation: "Action", instruction: "Dispel magical darkness within 30 feet. Each hostile creature there makes a Constitution save, taking radiant damage on a failure or half on a success.", rollFormula: "2d10 + Cleric level radiant damage" },
  ],
  "roster-nature-domain": [
    { id: "charm-animals-and-plants", label: "Charm Animals and Plants", activation: "Action", instruction: "Beasts and plant creatures that can see you within 30 feet make Wisdom saves. On a failure, each is charmed by you for 1 minute or until it takes damage." },
  ],
  "roster-order-domain": [
    { id: "orders-demand", label: "Order's Demand", activation: "Action", instruction: "Choose creatures that can see or hear you within 30 feet; each makes a Wisdom save. On a failure, it is charmed until the end of your next turn or until damaged. You may also make it drop what it is holding." },
  ],
  "roster-peace-domain": [
    { id: "balm-of-peace", label: "Balm of Peace", activation: "Action", instruction: "Move up to your speed without provoking opportunity attacks. Each creature you pass within 5 feet can regain hit points once during this movement.", rollFormula: "2d6 + Wisdom modifier healing (minimum 1)" },
  ],
  "roster-tempest-domain": [
    { id: "destructive-wrath", label: "Destructive Wrath", activation: "When rolling lightning or thunder damage", instruction: "Choose to deal maximum damage instead of rolling." },
  ],
  "roster-trickery-domain": [
    { id: "invoke-duplicity", label: "Invoke Duplicity", activation: "Action", instruction: "Create an illusory duplicate in a space you can see within 30 feet for up to 1 minute while concentrating. It can move up to 30 feet as a bonus action (within 120 feet); you can cast spells as though you occupied its space and gain advantage on attacks against a creature that is within 5 feet of both you and the illusion." },
    { id: "cloak-of-shadows", label: "Cloak of Shadows", minLevel: 6, activation: "Action", instruction: "Become invisible until the end of your next turn. You become visible if you attack or cast a spell." },
  ],
  "roster-twilight-domain": [
    { id: "twilight-sanctuary", label: "Twilight Sanctuary", activation: "Action", instruction: "Create a mobile 30-foot-radius sphere of dim light for 1 minute. At the end of each of your turns, choose a creature in the sphere to gain temporary hit points or end one effect causing it to be charmed or frightened.", rollFormula: "1d6 + Cleric level temporary hit points" },
  ],
  "roster-war-domain": [
    { id: "guided-strike", label: "Guided Strike", activation: "When you make an attack roll", instruction: "After seeing your attack roll but before its outcome is announced, add +10 to that roll." },
    { id: "war-gods-blessing", label: "War God's Blessing", minLevel: 6, activation: "Reaction", instruction: "When a creature within 30 feet makes an attack roll, add +10 after seeing the roll but before its outcome is announced." },
  ],
  "roster-ambition-domain": [
    { id: "invoke-duplicity", label: "Invoke Duplicity", activation: "Action", instruction: "Create an illusory duplicate in a space you can see within 30 feet for up to 1 minute while concentrating. It can move up to 30 feet as a bonus action (within 120 feet); you can cast spells as though you occupied its space." },
    { id: "cloak-of-shadows", label: "Cloak of Shadows", minLevel: 6, activation: "Action", instruction: "Become invisible until the end of your next turn. You become visible if you attack or cast a spell." },
  ],
  "roster-solidarity-domain": [
    { id: "preserve-life", label: "Preserve Life", activation: "Action", instruction: "Distribute healing equal to 5 × Cleric level among creatures within 30 feet. No target can be healed above half its hit point maximum; this cannot heal undead or constructs." },
    { id: "oketras-blessing", label: "Oketra's Blessing", minLevel: 6, activation: "Reaction", instruction: "When a creature within 30 feet makes an attack roll, add +10 after seeing the roll but before its outcome is announced." },
  ],
  "roster-strength-domain": [
    { id: "feat-of-strength", label: "Feat of Strength", activation: "When making a Strength attack roll, check, or save", instruction: "Add +10 after seeing the roll but before its outcome is announced." },
  ],
  "roster-zeal-domain": [
    { id: "consuming-fervor", label: "Consuming Fervor", activation: "When rolling fire or thunder damage", instruction: "Choose to deal maximum damage instead of rolling." },
  ],
  "roster-fate-domain": [
    { id: "strands-of-fate", label: "Strands of Fate", activation: "Bonus action; later, a reaction", instruction: "For up to 1 minute while concentrating, use your reaction when another creature you can see makes an attack roll or ability check to give it advantage or disadvantage." },
  ],
};

export function classActions(c: Character): ClassAction[] {
  const classActions = actions
    .filter((action) => classLevel(c, action.classId) >= action.minLevel)
    .map((action) =>
      action.id === "bardic-inspiration"
        ? { ...action, rollFormula: `1d${bardicInspirationDie(classLevel(c, "bard"))}` }
        : action.id === "cleric-channel-divinity"
          ? { ...action, choices: channelDivinityChoices(c) }
          : action,
    );
  const interceptionActions = c.classes.flatMap((entry) =>
    c.classChoices?.[fightingStyleKey(entry.classId)]?.[0] === "interception"
      ? [{
          id: `fighting-style-interception-${entry.classId}`,
          classId: entry.classId,
          label: "Interception",
          minLevel: 1,
          activation: "Reaction" as const,
          instruction: "When a creature you can see hits another creature within 5 feet of you, use your reaction while wielding a shield or weapon. Roll and subtract the result from the damage.",
          rollFormula: "1d10 + proficiency bonus",
        }]
      : [],
  );
  return [...classActions, ...interceptionActions];
}

function channelDivinityChoices(c: Character): ClassActionChoice[] {
  const clericLevel = classLevel(c, "cleric");
  const options: ClassActionChoice[] = c.ruleset === "2024"
    ? [
        {
          id: "divine-spark",
          label: "Divine Spark",
          activation: "Magic action",
          instruction: "Choose a creature you can see within 30 feet. Either restore hit points to it or have it make a Constitution save against your Cleric spell DC; on a failure, it takes the chosen radiant or necrotic damage, or half as much on a success.",
          rollFormula: `${clericLevel >= 18 ? "4" : clericLevel >= 13 ? "3" : clericLevel >= 7 ? "2" : "1"}d8 + Wisdom modifier`,
        },
        {
          id: "turn-undead",
          label: "Turn Undead",
          activation: "Magic action",
          instruction: `Undead you choose within 30 feet make Wisdom saves against your Cleric spell DC. On a failure, they are frightened and incapacitated for 1 minute and try to move away; the effect ends early if they take damage, you become incapacitated, or you die.${clericLevel >= 5 ? " Sear Undead: each undead that fails also takes radiant damage; roll d8s equal to your Wisdom modifier (minimum 1)." : ""}`,
          ...(clericLevel >= 5 ? { rollFormula: "Sear Undead: max(1, Wisdom modifier)d8 radiant damage" } : {}),
        },
      ]
    : [
        {
          id: "turn-undead",
          label: "Turn Undead",
          activation: "Action",
          instruction: `Undead that can see or hear you within 30 feet make Wisdom saves against your Cleric spell DC. On a failure, they are turned for 1 minute or until damaged.${clericLevel >= 5 ? ` Destroy Undead: a failed save destroys an undead at or below CR ${clericLevel >= 17 ? "4" : clericLevel >= 14 ? "3" : clericLevel >= 11 ? "2" : clericLevel >= 8 ? "1" : "1/2"}.` : ""}`,
        },
      ];
  const subclassId = c.classes.find((entry) => entry.classId === "cleric")?.subclassId;
  const revisedDomainChoices: Record<string, ClassActionChoice[]> = {
    "roster-life-domain": [
      { id: "preserve-life", label: "Preserve Life", activation: "Magic action", instruction: "Choose Bloodied creatures within 30 feet (including yourself) and distribute healing equal to 5 × Cleric level. No target can be restored above half its hit point maximum." },
    ],
    "roster-light-domain": [
      { id: "radiance-of-the-dawn", label: "Radiance of the Dawn", activation: "Magic action", instruction: "Dispel magical darkness in a 30-foot emanation. Each creature you choose there makes a Constitution save, taking radiant damage on a failure or half on a success.", rollFormula: "2d10 + Cleric level radiant damage" },
    ],
    "roster-trickery-domain": [
      { id: "invoke-duplicity", label: "Invoke Duplicity", activation: "Bonus action", instruction: "Create an intangible visual illusion within 30 feet for 1 minute. While it persists, you can cast spells as if in its space; you have advantage on attacks against a creature when you and the illusion are both within 5 feet of it and it can see the illusion." },
    ],
    "roster-war-domain": [
      { id: "guided-strike", label: "Guided Strike", activation: "When you or a creature within 30 feet misses an attack", instruction: "Add +10 to that roll. If aiding another creature, use your reaction." },
    ],
  };
  return [
    ...options,
    ...(subclassId && clericLevel >= (c.ruleset === "2014" ? 1 : 3)
      ? c.ruleset === "2024"
        ? revisedDomainChoices[subclassId] ?? domainChannelChoices[subclassId] ?? []
        : domainChannelChoices[subclassId] ?? []
      : []),
  ].filter((choice) => clericLevel >= (choice.minLevel ?? 2));
}

export function canUseClassAction(c: Character, action: ClassAction): boolean {
  if (!action.resourceId) return true;
  const resource = resourcePools(c).find((pool) => pool.id === action.resourceId && pool.classId === action.classId);
  return Boolean(resource && resource.used < resource.total);
}

export function resolveClassAction(c: Character, actionId: string, inputValue?: number, choiceId?: string): ActionResolution | null {
  const action = classActions(c).find((candidate) => candidate.id === actionId);
  if (!action) return null;
  if (action.choices?.length && !action.choices.some((choice) => choice.id === choiceId)) return null;

  const cost = action.resourceCost === "input" ? inputValue : action.resourceCost ?? (action.resourceId ? 1 : 0);
  if (cost === undefined || !Number.isInteger(cost) || cost < 0) return null;
  const resource = action.resourceId
    ? resourcePools(c).find((pool) => pool.id === action.resourceId && pool.classId === action.classId)
    : undefined;
  if (action.resourceId && (!resource || resource.used + cost > resource.total)) return null;
  if (action.input && (inputValue === undefined || !Number.isInteger(inputValue) || inputValue < 1)) return null;

  const resourcesUsed = { ...c.resourcesUsed };
  if (action.resourceId) resourcesUsed[action.resourceId] = (resourcesUsed[action.resourceId] ?? 0) + cost;
  return {
    resourcesUsed,
    ...(action.input ? { healing: inputValue } : {}),
  };
}

export function bardicInspirationDie(level: number): number {
  return level >= 15 ? 12 : level >= 10 ? 10 : level >= 5 ? 8 : 6;
}
