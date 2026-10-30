import {Player} from './hrf';

export type PositionGroup = 'keeper' | 'centralDefender' | 'back' | 'innerMidfielder' | 'winger' | 'forward';
export type RatingTactic = 'Normal' | 'Ataque por el centro' | 'Ataque por las bandas' | 'Contraataques' | 'Presionar';
export const positionGroups: {key: PositionGroup; label: string}[] = [
  {key: 'keeper', label: 'Portero'},
  {key: 'centralDefender', label: 'Defensa central'},
  {key: 'back', label: 'Lateral'},
  {key: 'winger', label: 'Extremo'},
  {key: 'innerMidfielder', label: 'Centrocampista central'},
  {key: 'forward', label: 'Delanteros'},
];

type Sector = 'goal' | 'centralDefence' | 'back' | 'innerMidfield' | 'wing' | 'forward';
type RatingSector = 'defenceLeft' | 'defenceCentral' | 'defenceRight' | 'midfield' | 'attackLeft' | 'attackCentral' | 'attackRight';
type ContributionSet = 'sideDefence' | 'centralDefence' | 'midfield' | 'sideAttack' | 'centralAttack';
type Side = 'left' | 'middle' | 'right';
type SideRestriction = 'none' | 'thisSide' | 'middleOnly';
type Skill = 'keeper' | 'defending' | 'playmaking' | 'passing' | 'winger' | 'scoring' | 'stamina' | 'experience';

type Factor = [ContributionSet, Skill, Sector, SideRestriction, number];
type Position = {role: number; sector: Sector; side: Side};
export type LineupSectorRatings = Record<RatingSector, number>;

// Normal-behaviour factors ported from RatingPredictionModel.initRatingContributionParameterMap.
const factors: Factor[] = [
  ['sideDefence', 'keeper', 'goal', 'none', 0.61],
  ['sideDefence', 'defending', 'goal', 'none', 0.25],
  ['sideDefence', 'defending', 'centralDefence', 'thisSide', 0.52],
  ['sideDefence', 'defending', 'centralDefence', 'middleOnly', 0.26],
  ['sideDefence', 'defending', 'back', 'thisSide', 0.92],
  ['sideDefence', 'defending', 'innerMidfield', 'thisSide', 0.19],
  ['sideDefence', 'defending', 'innerMidfield', 'middleOnly', 0.095],
  ['sideDefence', 'defending', 'wing', 'thisSide', 0.35],

  ['centralDefence', 'keeper', 'goal', 'none', 0.87],
  ['centralDefence', 'defending', 'goal', 'none', 0.35],
  ['centralDefence', 'defending', 'centralDefence', 'none', 1],
  ['centralDefence', 'defending', 'back', 'none', 0.38],
  ['centralDefence', 'defending', 'innerMidfield', 'none', 0.4],
  ['centralDefence', 'defending', 'wing', 'none', 0.2],

  ['midfield', 'playmaking', 'centralDefence', 'none', 0.25],
  ['midfield', 'playmaking', 'back', 'none', 0.15],
  ['midfield', 'playmaking', 'innerMidfield', 'none', 1],
  ['midfield', 'playmaking', 'wing', 'none', 0.45],
  ['midfield', 'playmaking', 'forward', 'none', 0.25],

  ['centralAttack', 'passing', 'innerMidfield', 'none', 0.33],
  ['centralAttack', 'passing', 'wing', 'none', 0.11],
  ['centralAttack', 'passing', 'forward', 'none', 0.33],
  ['centralAttack', 'scoring', 'innerMidfield', 'none', 0.22],
  ['centralAttack', 'scoring', 'forward', 'none', 1],

  ['sideAttack', 'passing', 'innerMidfield', 'middleOnly', 0.13],
  ['sideAttack', 'passing', 'forward', 'none', 0.14],
  ['sideAttack', 'passing', 'innerMidfield', 'thisSide', 0.26],
  ['sideAttack', 'passing', 'wing', 'thisSide', 0.26],
  ['sideAttack', 'winger', 'back', 'thisSide', 0.59],
  ['sideAttack', 'winger', 'wing', 'thisSide', 0.86],
  ['sideAttack', 'winger', 'forward', 'none', 0.24],
  ['sideAttack', 'scoring', 'forward', 'none', 0.27],
];

const ratingSectors: {key: RatingSector; set: ContributionSet; side: Side; scale: number; experience: number}[] = [
  {key: 'defenceLeft', set: 'sideDefence', side: 'left', scale: 0.834, experience: 0.345},
  {key: 'defenceCentral', set: 'centralDefence', side: 'middle', scale: 0.501, experience: 0.48},
  {key: 'defenceRight', set: 'sideDefence', side: 'right', scale: 0.834, experience: 0.345},
  {key: 'midfield', set: 'midfield', side: 'middle', scale: 0.312, experience: 0.73},
  {key: 'attackLeft', set: 'sideAttack', side: 'left', scale: 0.615, experience: 0.375},
  {key: 'attackCentral', set: 'centralAttack', side: 'middle', scale: 0.513, experience: 0.45},
  {key: 'attackRight', set: 'sideAttack', side: 'right', scale: 0.615, experience: 0.375},
];

const positions: Position[] = [
  {role: 100, sector: 'goal', side: 'middle'},
  {role: 101, sector: 'back', side: 'right'},
  {role: 102, sector: 'centralDefence', side: 'right'},
  {role: 103, sector: 'centralDefence', side: 'middle'},
  {role: 104, sector: 'centralDefence', side: 'left'},
  {role: 105, sector: 'back', side: 'left'},
  {role: 106, sector: 'wing', side: 'right'},
  {role: 107, sector: 'innerMidfield', side: 'right'},
  {role: 108, sector: 'innerMidfield', side: 'middle'},
  {role: 109, sector: 'innerMidfield', side: 'left'},
  {role: 110, sector: 'wing', side: 'left'},
  {role: 111, sector: 'forward', side: 'right'},
  {role: 112, sector: 'forward', side: 'middle'},
  {role: 113, sector: 'forward', side: 'left'},
];

const roleIdsByGroup: Record<PositionGroup, number[]> = {
  keeper: [100],
  centralDefender: [102, 103, 104],
  back: [101, 105],
  winger: [106, 110],
  innerMidfielder: [107, 108, 109],
  forward: [111, 112, 113],
};

const skillValue = (player: Player, skill: Skill) => Math.max(0, (player[skill] ?? 0) - 1);
const loyaltyValue = (player: Player) => player.homeGrown ? 1.5 : Math.max(0, (player.loyalty ?? 0) - 1) / 19;
const formFactor = (player: Player) => 0.378 * Math.sqrt(Math.min(7, Math.max(0, (player.form ?? 0) - 1)));
const playerStrength = (player: Player, skill: Skill) => (skillValue(player, skill) + loyaltyValue(player)) * formFactor(player);

function sideRestrictionAllows(position: Position, ratingSide: Side, restriction: SideRestriction): boolean {
  if (restriction === 'none') return true;
  if (restriction === 'middleOnly') return position.side === 'middle' && [103, 108, 112].includes(position.role);
  return position.side === ratingSide;
}

function experienceContribution(player: Player, factor: number): number {
  const experience = Math.max(0, (player.experience ?? 0) - 1);
  const k = -0.00000725 * experience ** 4 + 0.0005 * experience ** 3 - 0.01336 * experience ** 2 + 0.176 * experience;
  return k * factor;
}

function averageStaminaFactor(player: Player): number {
  const stamina = player.stamina ?? 0;
  return Math.min(1, -0.0033 * stamina ** 2 + 0.085 * stamina + 0.51);
}

function normalRating(player: Player, position: Position): number {
  let sum = 0;
  for (const sector of ratingSectors) {
    const contribution = factors
      .filter(([set, , playerSector, restriction]) => set === sector.set && playerSector === position.sector && sideRestrictionAllows(position, sector.side, restriction))
      .reduce((total, [, skill, , , weight]) => total + playerStrength(player, skill) * weight, 0);
    let sectorContribution = contribution;
    if (contribution > 0) sectorContribution += experienceContribution(player, sector.experience);
    sum += sectorContribution * sector.scale * (sector.key === 'midfield' ? 3 : 1);
  }
  return sum > 0 ? (sum ** 1.2 / 4) * averageStaminaFactor(player) : 0;
}

export function getRoleIdForSlot(slot: string, slots: string[]): number {
  const index = Number(slot.match(/\d+$/)?.[0] ?? 1) - 1;
  if (slot.startsWith('Portero')) return 100;
  if (slot === 'Lateral izquierdo') return 105;
  if (slot === 'Lateral derecho') return 101;
  if (slot.startsWith('Defensa central')) {
    const roles = slots.filter(candidate => candidate.startsWith('Defensa central')).length === 2 ? [102, 104] : [102, 103, 104];
    return roles[index] ?? 103;
  }
  if (slot === 'Extremo izquierdo') return 110;
  if (slot === 'Extremo derecho') return 106;
  if (slot.startsWith('Centrocampista central')) {
    const count = slots.filter(candidate => candidate.startsWith('Centrocampista central')).length;
    const roles = count === 1 ? [108] : count === 2 ? [107, 109] : [107, 108, 109];
    return roles[index] ?? 108;
  }
  const count = slots.filter(candidate => candidate.startsWith('Delantero')).length;
  const roles = count === 1 ? [112] : count === 2 ? [111, 113] : [111, 112, 113];
  return roles[index] ?? 112;
}

export function estimateLineupSectors(players: Player[], lineup: Record<string, string>, slots: string[], tactic: RatingTactic = 'Normal'): LineupSectorRatings {
  const totals: LineupSectorRatings = {
    defenceLeft: 0, defenceCentral: 0, defenceRight: 0, midfield: 0,
    attackLeft: 0, attackCentral: 0, attackRight: 0,
  };
  const playerById = new Map(players.map(player => [player.id, player]));
  const positionsInLineup = slots.flatMap(slot => {
    const player = playerById.get(lineup[slot]);
    const position = positions.find(candidate => candidate.role === getRoleIdForSlot(slot, slots));
    return player && position ? [{player, position}] : [];
  });
  const sectorCounts = new Map<Sector, number>();
  for (const {position} of positionsInLineup) sectorCounts.set(position.sector, (sectorCounts.get(position.sector) ?? 0) + 1);

  for (const {player, position} of positionsInLineup) {
    let overcrowding = 1;
    const count = sectorCounts.get(position.sector) ?? 0;
    if (position.sector === 'centralDefence' && count === 2) overcrowding = 0.964;
    if (position.sector === 'centralDefence' && count >= 3) overcrowding = 0.9;
    if (position.sector === 'innerMidfield' && count === 2) overcrowding = 0.935;
    if (position.sector === 'innerMidfield' && count >= 3) overcrowding = 0.825;
    if (position.sector === 'forward' && count === 2) overcrowding = 0.945;
    if (position.sector === 'forward' && count >= 3) overcrowding = 0.865;

    for (const sector of ratingSectors) {
      const contribution = factors
        .filter(([set, , playerSector, restriction]) => set === sector.set && playerSector === position.sector && sideRestrictionAllows(position, sector.side, restriction))
        .reduce((sum, [, skill, , , weight]) => sum + playerStrength(player, skill) * weight, 0);
      if (contribution <= 0) continue;
      totals[sector.key] += (contribution * overcrowding + experienceContribution(player, sector.experience)) * averageStaminaFactor(player);
    }
  }

  for (const sector of ratingSectors) {
    let tacticFactor = 1;
    if (sector.key === 'midfield' && tactic === 'Contraataques') tacticFactor = 0.93;
    if ((sector.key === 'defenceLeft' || sector.key === 'defenceRight') && tactic === 'Ataque por el centro') tacticFactor = 0.85;
    if (sector.key === 'defenceCentral' && tactic === 'Ataque por las bandas') tacticFactor = 0.85;
    const base = totals[sector.key] * sector.scale * (sector.key === 'midfield' ? 3 : 1) * tacticFactor;
    totals[sector.key] = base > 0 ? base ** 1.2 / 4 + 1 : 0.75;
  }
  return totals;
}

export function getPlayerPositionEstimate(player: Player, group: PositionGroup): number {
  const roles = new Set(roleIdsByGroup[group]);
  return positions.filter(position => roles.has(position.role)).reduce((best, position) => Math.max(best, normalRating(player, position)), 0);
}

export function getPlayerRoleEstimate(player: Player, roleId: number): number {
  const position = positions.find(candidate => candidate.role === roleId);
  return position ? normalRating(player, position) : 0;
}

function matchStaminaFactor(player: Player, minute: number, pressing: boolean): number {
  const skill = skillValue(player, 'stamina');
  const tacticFactor = pressing ? 1.1 : 1;
  const initial = skill < 7
    ? 102 + (23 / 7) * skill
    : 125 + ((skill - 7) * 100) / 7;
  const lossPerFiveMinutes = skill < 7
    ? tacticFactor * ((27 / 70) * skill - 5.95)
    : -3.25 * tacticFactor;
  let stamina = initial;
  const firstHalfEnd = Math.min(45, minute);
  if (firstHalfEnd > 0) stamina += firstHalfEnd * lossPerFiveMinutes / 5;
  if (minute >= 45) {
    stamina = Math.min(initial, stamina + 18.75);
    const secondHalfStart = 45;
    const secondHalfEnd = Math.min(90, minute);
    if (secondHalfStart < secondHalfEnd) stamina += (secondHalfEnd - secondHalfStart) * lossPerFiveMinutes / 5;
  }
  return Math.min(1, stamina / 100);
}

function tacticSkillStrength(player: Player, skill: Skill): number {
  const loyalty = loyaltyValue(player);
  const strength = (skillValue(player, skill) + loyalty) * formFactor(player);
  const experience = skillValue(player, 'experience');
  const experienceFactor = experience > 0 ? (Math.log10(experience) * 4) / 3 : 0;
  return loyalty + strength + experienceFactor;
}

// Ports RatingPredictionModel.calcPressing at minute 90 with neutral weather.
export function estimatePressingLevel(players: Player[], lineup: Record<string, string>, slots: string[]): number {
  const playerById = new Map(players.map(player => [player.id, player]));
  let defending = 0;
  for (const slot of slots) {
    if (slot === 'Portero') continue;
    const player = playerById.get(lineup[slot]);
    if (!player) continue;
    let contribution = tacticSkillStrength(player, 'defending') * matchStaminaFactor(player, 90, true);
    if (contribution > 0 && player.specialty === 3) contribution *= 2;
    defending += contribution;
  }
  return 0.085 * defending + 0.075;
}
