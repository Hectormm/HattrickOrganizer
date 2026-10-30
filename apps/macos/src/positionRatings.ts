import {Player} from './hrf';

export type PositionGroup = 'keeper' | 'defender' | 'midfielder' | 'forward';
export const positionGroups: {key: PositionGroup; label: string}[] = [
  {key: 'keeper', label: 'Portero'},
  {key: 'defender', label: 'Defensas'},
  {key: 'midfielder', label: 'Centrocampistas'},
  {key: 'forward', label: 'Delanteros'},
];

type Sector = 'goal' | 'centralDefence' | 'back' | 'innerMidfield' | 'wing' | 'forward';
type RatingSector = 'defenceLeft' | 'defenceCentral' | 'defenceRight' | 'midfield' | 'attackLeft' | 'attackCentral' | 'attackRight';
type ContributionSet = 'sideDefence' | 'centralDefence' | 'midfield' | 'sideAttack' | 'centralAttack';
type Side = 'left' | 'middle' | 'right';
type SideRestriction = 'none' | 'thisSide' | 'middleOnly';
type Skill = 'keeper' | 'defending' | 'playmaking' | 'passing' | 'winger' | 'scoring';

type Factor = [ContributionSet, Skill, Sector, SideRestriction, number];
type Position = {role: number; sector: Sector; side: Side};

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
  defender: [101, 102, 103, 104, 105],
  midfielder: [106, 107, 108, 109, 110],
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

export function getPlayerPositionEstimate(player: Player, group: PositionGroup): number {
  const roles = new Set(roleIdsByGroup[group]);
  return positions.filter(position => roles.has(position.role)).reduce((best, position) => Math.max(best, normalRating(player, position)), 0);
}
