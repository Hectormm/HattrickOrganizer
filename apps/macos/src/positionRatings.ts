import {Player} from './hrf';

export type PositionGroup = 'keeper' | 'centralDefender' | 'back' | 'innerMidfielder' | 'winger' | 'forward';
export type RatingTactic = 'Normal' | 'Ataque por el centro' | 'Ataque por las bandas' | 'Contraataques' | 'Presionar' | 'Jugar creativamente' | 'Tiros lejanos';
export type PlayerBehavior = 'Normal' | 'Ofensivo' | 'Defensivo' | 'Hacia el centro' | 'Hacia la banda';
export type MatchWeather = 'Neutro' | 'Soleado' | 'Lluvioso';
export type MatchAttitude = 'Normal' | 'Jugar relajados' | 'Partido de la temporada';
export type MatchVenue = 'Fuera' | 'En casa' | 'Derbi fuera';
export type MatchContext = {teamSpirit: number; confidence: number; coachModifier: number; attitude: MatchAttitude; venue: MatchVenue};
export const defaultMatchContext: MatchContext = {teamSpirit: 4.5, confidence: 4, coachModifier: 0, attitude: 'Normal', venue: 'Fuera'};
export const matchAttitudes: MatchAttitude[] = ['Normal', 'Jugar relajados', 'Partido de la temporada'];
export const matchVenues: MatchVenue[] = ['Fuera', 'En casa', 'Derbi fuera'];
export const matchWeathers: MatchWeather[] = ['Neutro', 'Soleado', 'Lluvioso'];
export const playerBehaviors: PlayerBehavior[] = ['Normal', 'Ofensivo', 'Defensivo', 'Hacia el centro', 'Hacia la banda'];
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
type SideRestriction = 'none' | 'thisSide' | 'middleOnly' | 'oppositeSide';
type Skill = 'keeper' | 'defending' | 'playmaking' | 'passing' | 'winger' | 'scoring' | 'setPieces' | 'stamina' | 'experience';

type Factor = [ContributionSet, Skill, Sector, SideRestriction, PlayerBehavior, number, number?];
type Position = {role: number; sector: Sector; side: Side};
export type LineupSectorRatings = Record<RatingSector, number>;
export type OpponentSectorRatings = Partial<Record<keyof LineupSectorRatings, number | null>>;

// Contribution factors for all five position behaviours, ported from RatingPredictionModel.initRatingContributionParameterMap.
const factors: Factor[] = [
  ['sideDefence', 'keeper', 'goal', 'none', 'Normal', 0.61],
  ['sideDefence', 'defending', 'goal', 'none', 'Normal', 0.25],
  ['sideDefence', 'defending', 'centralDefence', 'thisSide', 'Normal', 0.52],
  ['sideDefence', 'defending', 'centralDefence', 'thisSide', 'Ofensivo', 0.4],
  ['sideDefence', 'defending', 'centralDefence', 'thisSide', 'Hacia la banda', 0.81],
  ['sideDefence', 'defending', 'centralDefence', 'middleOnly', 'Normal', 0.26],
  ['sideDefence', 'defending', 'centralDefence', 'middleOnly', 'Ofensivo', 0.2],
  ['sideDefence', 'defending', 'back', 'thisSide', 'Normal', 0.92],
  ['sideDefence', 'defending', 'back', 'thisSide', 'Ofensivo', 0.74],
  ['sideDefence', 'defending', 'back', 'thisSide', 'Defensivo', 1],
  ['sideDefence', 'defending', 'back', 'thisSide', 'Hacia el centro', 0.75],
  ['sideDefence', 'defending', 'innerMidfield', 'thisSide', 'Normal', 0.19],
  ['sideDefence', 'defending', 'innerMidfield', 'thisSide', 'Ofensivo', 0.09],
  ['sideDefence', 'defending', 'innerMidfield', 'thisSide', 'Defensivo', 0.27],
  ['sideDefence', 'defending', 'innerMidfield', 'thisSide', 'Hacia la banda', 0.24],
  ['sideDefence', 'defending', 'innerMidfield', 'middleOnly', 'Normal', 0.095],
  ['sideDefence', 'defending', 'innerMidfield', 'middleOnly', 'Ofensivo', 0.045],
  ['sideDefence', 'defending', 'innerMidfield', 'middleOnly', 'Defensivo', 0.135],
  ['sideDefence', 'defending', 'wing', 'thisSide', 'Normal', 0.35],
  ['sideDefence', 'defending', 'wing', 'thisSide', 'Ofensivo', 0.22],
  ['sideDefence', 'defending', 'wing', 'thisSide', 'Defensivo', 0.61],
  ['sideDefence', 'defending', 'wing', 'thisSide', 'Hacia el centro', 0.29],
  ['centralDefence', 'keeper', 'goal', 'none', 'Normal', 0.87],
  ['centralDefence', 'defending', 'goal', 'none', 'Normal', 0.35],
  ['centralDefence', 'defending', 'centralDefence', 'none', 'Normal', 1],
  ['centralDefence', 'defending', 'centralDefence', 'none', 'Ofensivo', 0.73],
  ['centralDefence', 'defending', 'centralDefence', 'none', 'Hacia la banda', 0.67],
  ['centralDefence', 'defending', 'back', 'none', 'Normal', 0.38],
  ['centralDefence', 'defending', 'back', 'none', 'Ofensivo', 0.35],
  ['centralDefence', 'defending', 'back', 'none', 'Defensivo', 0.43],
  ['centralDefence', 'defending', 'back', 'none', 'Hacia el centro', 0.7],
  ['centralDefence', 'defending', 'innerMidfield', 'none', 'Normal', 0.4],
  ['centralDefence', 'defending', 'innerMidfield', 'none', 'Ofensivo', 0.16],
  ['centralDefence', 'defending', 'innerMidfield', 'none', 'Defensivo', 0.58],
  ['centralDefence', 'defending', 'innerMidfield', 'none', 'Hacia la banda', 0.33],
  ['centralDefence', 'defending', 'wing', 'none', 'Normal', 0.2],
  ['centralDefence', 'defending', 'wing', 'none', 'Ofensivo', 0.13],
  ['centralDefence', 'defending', 'wing', 'none', 'Defensivo', 0.25],
  ['centralDefence', 'defending', 'wing', 'none', 'Hacia el centro', 0.25],
  ['midfield', 'playmaking', 'centralDefence', 'none', 'Normal', 0.25],
  ['midfield', 'playmaking', 'centralDefence', 'none', 'Ofensivo', 0.4],
  ['midfield', 'playmaking', 'centralDefence', 'none', 'Hacia la banda', 0.15],
  ['midfield', 'playmaking', 'back', 'none', 'Normal', 0.15],
  ['midfield', 'playmaking', 'back', 'none', 'Ofensivo', 0.2],
  ['midfield', 'playmaking', 'back', 'none', 'Defensivo', 0.1],
  ['midfield', 'playmaking', 'back', 'none', 'Hacia el centro', 0.2],
  ['midfield', 'playmaking', 'innerMidfield', 'none', 'Normal', 1],
  ['midfield', 'playmaking', 'innerMidfield', 'none', 'Ofensivo', 0.95],
  ['midfield', 'playmaking', 'innerMidfield', 'none', 'Defensivo', 0.95],
  ['midfield', 'playmaking', 'innerMidfield', 'none', 'Hacia la banda', 0.9],
  ['midfield', 'playmaking', 'wing', 'none', 'Normal', 0.45],
  ['midfield', 'playmaking', 'wing', 'none', 'Ofensivo', 0.3],
  ['midfield', 'playmaking', 'wing', 'none', 'Defensivo', 0.3],
  ['midfield', 'playmaking', 'wing', 'none', 'Hacia el centro', 0.55],
  ['midfield', 'playmaking', 'forward', 'none', 'Normal', 0.25],
  ['midfield', 'playmaking', 'forward', 'none', 'Defensivo', 0.35],
  ['midfield', 'playmaking', 'forward', 'none', 'Hacia la banda', 0.15],
  ['centralAttack', 'passing', 'innerMidfield', 'none', 'Normal', 0.33],
  ['centralAttack', 'passing', 'innerMidfield', 'none', 'Ofensivo', 0.49],
  ['centralAttack', 'passing', 'innerMidfield', 'none', 'Defensivo', 0.18],
  ['centralAttack', 'passing', 'innerMidfield', 'none', 'Hacia la banda', 0.23],
  ['centralAttack', 'passing', 'wing', 'none', 'Normal', 0.11],
  ['centralAttack', 'passing', 'wing', 'none', 'Ofensivo', 0.13],
  ['centralAttack', 'passing', 'wing', 'none', 'Defensivo', 0.05],
  ['centralAttack', 'passing', 'wing', 'none', 'Hacia el centro', 0.16],
  ['centralAttack', 'passing', 'forward', 'none', 'Normal', 0.33],
  ['centralAttack', 'passing', 'forward', 'none', 'Defensivo', 0.53],
  ['centralAttack', 'passing', 'forward', 'none', 'Hacia la banda', 0.23],
  ['centralAttack', 'scoring', 'innerMidfield', 'none', 'Normal', 0.22],
  ['centralAttack', 'scoring', 'innerMidfield', 'none', 'Ofensivo', 0.31],
  ['centralAttack', 'scoring', 'innerMidfield', 'none', 'Defensivo', 0.13],
  ['centralAttack', 'scoring', 'forward', 'none', 'Normal', 1],
  ['centralAttack', 'scoring', 'forward', 'none', 'Defensivo', 0.56],
  ['centralAttack', 'scoring', 'forward', 'none', 'Hacia la banda', 0.66],
  ['sideAttack', 'passing', 'innerMidfield', 'middleOnly', 'Normal', 0.13],
  ['sideAttack', 'passing', 'innerMidfield', 'middleOnly', 'Ofensivo', 0.18],
  ['sideAttack', 'passing', 'innerMidfield', 'middleOnly', 'Defensivo', 0.07],
  ['sideAttack', 'passing', 'forward', 'none', 'Normal', 0.14],
  ['sideAttack', 'passing', 'forward', 'none', 'Defensivo', 0.31],
  ['sideAttack', 'passing', 'forward', 'none', 'Defensivo', 0.41, 1],
  ['sideAttack', 'passing', 'innerMidfield', 'thisSide', 'Normal', 0.26],
  ['sideAttack', 'passing', 'innerMidfield', 'thisSide', 'Ofensivo', 0.36],
  ['sideAttack', 'passing', 'innerMidfield', 'thisSide', 'Defensivo', 0.14],
  ['sideAttack', 'passing', 'innerMidfield', 'thisSide', 'Hacia la banda', 0.31],
  ['sideAttack', 'passing', 'wing', 'thisSide', 'Normal', 0.26],
  ['sideAttack', 'passing', 'wing', 'thisSide', 'Ofensivo', 0.29],
  ['sideAttack', 'passing', 'wing', 'thisSide', 'Defensivo', 0.21],
  ['sideAttack', 'passing', 'wing', 'thisSide', 'Hacia el centro', 0.15],
  ['sideAttack', 'passing', 'forward', 'thisSide', 'Hacia la banda', 0.21],
  ['sideAttack', 'passing', 'forward', 'oppositeSide', 'Hacia la banda', 0.06],
  ['sideAttack', 'winger', 'centralDefence', 'thisSide', 'Hacia la banda', 0.26],
  ['sideAttack', 'winger', 'back', 'thisSide', 'Normal', 0.59],
  ['sideAttack', 'winger', 'back', 'thisSide', 'Ofensivo', 0.69],
  ['sideAttack', 'winger', 'back', 'thisSide', 'Defensivo', 0.45],
  ['sideAttack', 'winger', 'back', 'thisSide', 'Hacia el centro', 0.35],
  ['sideAttack', 'winger', 'innerMidfield', 'thisSide', 'Hacia la banda', 0.59],
  ['sideAttack', 'winger', 'wing', 'thisSide', 'Normal', 0.86],
  ['sideAttack', 'winger', 'wing', 'thisSide', 'Ofensivo', 1],
  ['sideAttack', 'winger', 'wing', 'thisSide', 'Defensivo', 0.69],
  ['sideAttack', 'winger', 'wing', 'thisSide', 'Hacia el centro', 0.74],
  ['sideAttack', 'winger', 'forward', 'none', 'Normal', 0.24],
  ['sideAttack', 'winger', 'forward', 'none', 'Defensivo', 0.13],
  ['sideAttack', 'winger', 'forward', 'thisSide', 'Hacia la banda', 0.64],
  ['sideAttack', 'winger', 'forward', 'oppositeSide', 'Hacia la banda', 0.21],
  ['sideAttack', 'scoring', 'forward', 'none', 'Normal', 0.27],
  ['sideAttack', 'scoring', 'forward', 'none', 'Defensivo', 0.13],
  ['sideAttack', 'scoring', 'forward', 'oppositeSide', 'Hacia la banda', 0.19],
  ['sideAttack', 'scoring', 'forward', 'thisSide', 'Hacia la banda', 0.51],
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

const playerSkillContributionCache = new WeakMap<Player, Map<string, number>>();
const playerRoleRatingCache = new WeakMap<Player, Map<string, number>>();
const pressingStaminaCache = new WeakMap<Player, number>();

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
  if (restriction === 'middleOnly') return [103, 108, 112].includes(position.role);
  if (restriction === 'thisSide') return position.side === ratingSide;
  if (ratingSide === 'left') return position.side === 'right';
  if (ratingSide === 'right') return position.side === 'left';
  return false;
}

function positionSkillContribution(player: Player, position: Position, ratingSector: typeof ratingSectors[number], behavior: PlayerBehavior): number {
  let cache = playerSkillContributionCache.get(player);
  if (!cache) {
    cache = new Map<string, number>();
    playerSkillContributionCache.set(player, cache);
  }
  const cacheKey = `${position.role}:${ratingSector.key}:${behavior}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const selectedFactors = new Map<string, {skill: Skill; weight: number; specialtySpecific: boolean}>();
  for (const [set, skill, playerSector, restriction, factorBehavior, weight, specialty] of factors) {
    if (set !== ratingSector.set || playerSector !== position.sector || factorBehavior !== behavior || !sideRestrictionAllows(position, ratingSector.side, restriction)) continue;
    const specialtySpecific = specialty !== undefined;
    if (specialtySpecific && specialty !== player.specialty) continue;
    const key = `${set}:${skill}:${playerSector}:${restriction}:${factorBehavior}`;
    const existing = selectedFactors.get(key);
    if (!existing || specialtySpecific || !existing.specialtySpecific) {
      selectedFactors.set(key, {skill, weight, specialtySpecific});
    }
  }
  const contribution = Array.from(selectedFactors.values()).reduce((sum, factor) => sum + playerStrength(player, factor.skill) * factor.weight, 0);
  cache.set(cacheKey, contribution);
  return contribution;
}

function weatherFactor(player: Player, weather: MatchWeather): number {
  if (weather === 'Neutro') return 1;
  if (player.specialty === 1) return weather === 'Soleado' ? 1.05 : 0.95;
  if (player.specialty === 2) return 0.95;
  if (player.specialty === 3) return weather === 'Lluvioso' ? 1.05 : 0.95;
  return 1;
}

function experienceContribution(player: Player, factor: number): number {
  const experience = Math.max(0, (player.experience ?? 0) - 1);
  const k = -0.00000725 * experience ** 4 + 0.0005 * experience ** 3 - 0.01336 * experience ** 2 + 0.176 * experience;
  return k * factor;
}

function averageStaminaFactor(player: Player, pressing = false): number {
  if (pressing) {
    const cached = pressingStaminaCache.get(player);
    if (cached !== undefined) return cached;
    let total = 0;
    for (let minute = 0; minute < 90; minute += 1) total += matchStaminaFactor(player, minute, true);
    const average = total / 90;
    pressingStaminaCache.set(player, average);
    return average;
  }
  const stamina = player.stamina ?? 0;
  return Math.min(1, -0.0033 * stamina ** 2 + 0.085 * stamina + 0.51);
}

function sectorContextFactor(key: RatingSector, context: MatchContext): number {
  let factor = 1;
  if (key === 'midfield') {
    if (context.attitude === 'Jugar relajados') factor *= 0.83945;
    if (context.attitude === 'Partido de la temporada') factor *= 1.1149;
    if (context.venue === 'En casa') factor *= 1.19892;
    if (context.venue === 'Derbi fuera') factor *= 1.11493;
    factor *= 0.1 + 0.425 * Math.sqrt(Math.max(0, context.teamSpirit));
  }
  if (key.startsWith('defence')) {
    factor *= context.coachModifier <= 0
      ? 1.02 - context.coachModifier * (1.15 - 1.02) / 10
      : 1.02 - context.coachModifier * (1.02 - 0.9) / 10;
  }
  if (key.startsWith('attack')) {
    factor *= context.coachModifier <= 0
      ? 1.02 - context.coachModifier * (0.9 - 1.02) / 10
      : 1.02 - context.coachModifier * (1.02 - 1.1) / 10;
    factor *= 0.8 + 0.05 * (context.confidence + 0.5);
  }
  return factor;
}

function tacticSectorFactor(key: RatingSector, tactic: RatingTactic): number {
  if (tactic === 'Contraataques' && key === 'midfield') return 0.93;
  if (tactic === 'Ataque por el centro' && (key === 'defenceLeft' || key === 'defenceRight')) return 0.85;
  if (tactic === 'Ataque por las bandas' && key === 'defenceCentral') return 0.85;
  if (tactic === 'Jugar creativamente' && key.startsWith('defence')) return 0.93;
  if (tactic === 'Tiros lejanos' && (key === 'midfield' || key.startsWith('attack'))) return 0.96;
  return 1;
}

function normalRating(player: Player, position: Position, behavior: PlayerBehavior = 'Normal', weather: MatchWeather = 'Neutro', tactic: RatingTactic = 'Normal', context: MatchContext = defaultMatchContext): number {
  let cache = playerRoleRatingCache.get(player);
  if (!cache) {
    cache = new Map<string, number>();
    playerRoleRatingCache.set(player, cache);
  }
  const cacheKey = `${position.role}:${behavior}:${weather}:${tactic}:${context.teamSpirit}:${context.confidence}:${context.coachModifier}:${context.attitude}:${context.venue}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  let sum = 0;
  for (const sector of ratingSectors) {
    const contribution = positionSkillContribution(player, position, sector, behavior);
    let sectorContribution = contribution;
    if (contribution > 0) sectorContribution += experienceContribution(player, sector.experience);
    sectorContribution *= weatherFactor(player, weather);
    sum += sectorContribution * sector.scale * (sector.key === 'midfield' ? 3 : 1) * tacticSectorFactor(sector.key, tactic) * sectorContextFactor(sector.key, context);
  }
  const rating = sum > 0 ? (sum ** 1.2 / 4) * averageStaminaFactor(player, tactic === 'Presionar') : 0;
  cache.set(cacheKey, rating);
  return rating;
}

export function getBehaviorsForSlot(slot: string, slots: string[]): PlayerBehavior[] {
  const role = getRoleIdForSlot(slot, slots);
  if (role === 100) return ['Normal'];
  if ([102, 103, 104].includes(role)) return ['Normal', 'Ofensivo', 'Hacia la banda'];
  if ([101, 105].includes(role)) return ['Normal', 'Ofensivo', 'Defensivo', 'Hacia el centro'];
  if ([106, 110].includes(role)) return ['Normal', 'Ofensivo', 'Defensivo', 'Hacia el centro'];
  if ([107, 108, 109].includes(role)) return ['Normal', 'Ofensivo', 'Defensivo', 'Hacia la banda'];
  return ['Normal', 'Defensivo', 'Hacia la banda'];
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

export function estimateLineupSectors(players: Player[], lineup: Record<string, string>, slots: string[], tactic: RatingTactic = 'Normal', behaviors: Record<string, PlayerBehavior> = {}, weather: MatchWeather = 'Neutro', context: MatchContext = defaultMatchContext): LineupSectorRatings {
  const totals: LineupSectorRatings = {
    defenceLeft: 0, defenceCentral: 0, defenceRight: 0, midfield: 0,
    attackLeft: 0, attackCentral: 0, attackRight: 0,
  };
  const playerById = new Map(players.map(player => [player.id, player]));
  const positionsInLineup = slots.flatMap(slot => {
    const player = playerById.get(lineup[slot]);
    const position = positions.find(candidate => candidate.role === getRoleIdForSlot(slot, slots));
    return player && position ? [{player, position, behavior: behaviors[slot] ?? 'Normal'}] : [];
  });
  const sectorCounts = new Map<Sector, number>();
  for (const {position} of positionsInLineup) sectorCounts.set(position.sector, (sectorCounts.get(position.sector) ?? 0) + 1);

  for (const {player, position, behavior} of positionsInLineup) {
    let overcrowding = 1;
    const count = sectorCounts.get(position.sector) ?? 0;
    if (position.sector === 'centralDefence' && count === 2) overcrowding = 0.964;
    if (position.sector === 'centralDefence' && count >= 3) overcrowding = 0.9;
    if (position.sector === 'innerMidfield' && count === 2) overcrowding = 0.935;
    if (position.sector === 'innerMidfield' && count >= 3) overcrowding = 0.825;
    if (position.sector === 'forward' && count === 2) overcrowding = 0.945;
    if (position.sector === 'forward' && count >= 3) overcrowding = 0.865;

    for (const sector of ratingSectors) {
      const contribution = positionSkillContribution(player, position, sector, behavior);
      if (contribution <= 0) continue;
      totals[sector.key] += (contribution * overcrowding + experienceContribution(player, sector.experience)) * weatherFactor(player, weather) * averageStaminaFactor(player, tactic === 'Presionar');
    }
  }

  for (const sector of ratingSectors) {
    const base = totals[sector.key] * sector.scale * (sector.key === 'midfield' ? 3 : 1) * tacticSectorFactor(sector.key, tactic) * sectorContextFactor(sector.key, context);
    totals[sector.key] = base > 0 ? base ** 1.2 / 4 + 1 : 0.75;
  }
  return totals;
}

export function getPlayerPositionEstimate(player: Player, group: PositionGroup, weather: MatchWeather = 'Neutro', tactic: RatingTactic = 'Normal', context: MatchContext = defaultMatchContext): number {
  const roles = new Set(roleIdsByGroup[group]);
  return positions.filter(position => roles.has(position.role)).reduce((best, position) => Math.max(best, normalRating(player, position, 'Normal', weather, tactic, context)), 0);
}

export function getPlayerRoleEstimate(player: Player, roleId: number, behavior: PlayerBehavior = 'Normal', weather: MatchWeather = 'Neutro', tactic: RatingTactic = 'Normal', context: MatchContext = defaultMatchContext): number {
  const position = positions.find(candidate => candidate.role === roleId);
  return position ? normalRating(player, position, behavior, weather, tactic, context) : 0;
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
  if (minute >= 90) stamina = Math.min(initial, stamina + 6.25);
  return Math.min(1, stamina / 100);
}

function tacticSkillStrength(player: Player, skill: Skill): number {
  const loyalty = loyaltyValue(player);
  const strength = (skillValue(player, skill) + loyalty) * formFactor(player);
  const experience = skillValue(player, 'experience');
  const experienceFactor = experience > 0 ? (Math.log10(experience) * 4) / 3 : 0;
  return loyalty + strength + experienceFactor;
}

// Ports RatingPredictionModel.calcPressing at minute 90 with the selected weather.
export function estimatePressingLevel(players: Player[], lineup: Record<string, string>, slots: string[], weather: MatchWeather = 'Neutro'): number {
  const playerById = new Map(players.map(player => [player.id, player]));
  let defending = 0;
  for (const slot of slots) {
    if (slot === 'Portero') continue;
    const player = playerById.get(lineup[slot]);
    if (!player) continue;
    let contribution = tacticSkillStrength(player, 'defending') * weatherFactor(player, weather) * matchStaminaFactor(player, 90, true);
    if (contribution > 0 && player.specialty === 3) contribution *= 2;
    defending += contribution;
  }
  return 0.085 * defending + 0.075;
}

export function estimateTacticLevel(players: Player[], lineup: Record<string, string>, slots: string[], tactic: RatingTactic, weather: MatchWeather = 'Neutro'): number | null {
  if (tactic === 'Normal') return null;
  if (tactic === 'Presionar') return estimatePressingLevel(players, lineup, slots, weather);

  const playerById = new Map(players.map(player => [player.id, player]));
  if (tactic === 'Ataque por el centro' || tactic === 'Ataque por las bandas') {
    const passingTotal = slots
      .filter(slot => slot !== 'Portero')
      .map(slot => playerById.get(lineup[slot]))
      .filter((player): player is Player => Boolean(player))
      .reduce((sum, player) => sum + loyaltyValue(player) + skillValue(player, 'passing'), 0);
    return passingTotal / 5 - 2;
  }

  if (tactic === 'Tiros lejanos') {
    const playersOnField = slots.filter(slot => slot !== 'Portero').map(slot => playerById.get(lineup[slot])).filter((player): player is Player => Boolean(player));
    if (!playersOnField.length) return 0;
    const scoring = playersOnField.reduce((sum, player) => sum + loyaltyValue(player) + skillValue(player, 'scoring'), 0);
    const setPieces = playersOnField.reduce((sum, player) => sum + loyaltyValue(player) + skillValue(player, 'setPieces'), 0);
    return Math.max(0, (1.66 * scoring + 0.55 * setPieces) / playersOnField.length - 7.6);
  }

  if (tactic === 'Jugar creativamente') {
    return slots.filter(slot => slot !== 'Portero').map(slot => playerById.get(lineup[slot])).filter((player): player is Player => Boolean(player))
      .reduce((sum, player) => {
        let contribution = 4 * playerStrength(player, 'passing') + skillValue(player, 'experience');
        if (player.specialty === 4) contribution *= 2;
        return sum + contribution;
      }, 0) / 50;
  }

  const defenders = slots
    .filter(slot => slot.startsWith('Lateral') || slot.startsWith('Defensa central'))
    .map(slot => playerById.get(lineup[slot]))
    .filter((player): player is Player => Boolean(player));
  if (!defenders.length) return 0;
  let weightedStrength = 0;
  let formTotal = 0;
  for (const player of defenders) {
    const loyalty = loyaltyValue(player);
    const passing = loyalty + skillValue(player, 'passing');
    const defending = loyalty + skillValue(player, 'defending');
    weightedStrength += 2 * passing + defending;
    formTotal += player.form ?? 0;
  }
  weightedStrength *= formTotal / defenders.length;
  return 0.017272 * weightedStrength + 1.042313;
}
