import {Player} from './hrf';
import {estimateLineupSectors, getBehaviorsForSlot, getPlayerRoleEstimate, getRoleIdForSlot, LineupSectorRatings, OpponentSectorRatings, defaultMatchContext, MatchContext, MatchWeather, PlayerBehavior, RatingTactic} from './positionRatings';

type LineupResult = {assignments: Record<string, string>; behaviors: Record<string, PlayerBehavior>; totalRating: number; matchupScore: number | null};
export type BenchSuggestion = {slot: string; outgoingPlayerId: string | null; incomingPlayerId: string; gain: number; matchupBased: boolean};

const sectorMatchups: {own: keyof LineupSectorRatings; opponent: keyof LineupSectorRatings; weight: number}[] = [
  {own: 'midfield', opponent: 'midfield', weight: 3},
  {own: 'defenceRight', opponent: 'attackLeft', weight: 1},
  {own: 'defenceCentral', opponent: 'attackCentral', weight: 1},
  {own: 'defenceLeft', opponent: 'attackRight', weight: 1},
  {own: 'attackRight', opponent: 'defenceLeft', weight: 1},
  {own: 'attackCentral', opponent: 'defenceCentral', weight: 1},
  {own: 'attackLeft', opponent: 'defenceRight', weight: 1},
];

function hasCompleteOpponentRatings(opponentRatings?: OpponentSectorRatings | null): boolean {
  return Boolean(opponentRatings) && sectorMatchups.every(matchup => {
    const value = opponentRatings?.[matchup.opponent];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  });
}

function scoreLineup(ratings: LineupSectorRatings, opponentRatings?: OpponentSectorRatings | null): number {
  if (!hasCompleteOpponentRatings(opponentRatings)) return Object.values(ratings).reduce((sum, rating) => sum + rating, 0);

  let weightedShare = 0;
  let totalWeight = 0;
  for (const matchup of sectorMatchups) {
    const own = ratings[matchup.own];
    const opponent = opponentRatings![matchup.opponent] as number;
    const total = own + opponent;
    const share = total > 0 ? own / total : 0.5;
    weightedShare += share * matchup.weight;
    totalWeight += matchup.weight;
  }
  return weightedShare / totalWeight;
}

export function getPlayerSlotEstimate(player: Player, slot: string, slots: string[], behaviors: Record<string, PlayerBehavior> = {}, weather: MatchWeather = 'Neutro', tactic: RatingTactic = 'Normal', context: MatchContext = defaultMatchContext): number {
  return getPlayerRoleEstimate(player, getRoleIdForSlot(slot, slots), behaviors[slot] ?? 'Normal', weather, tactic, context);
}

export function getBenchSuggestions(players: Player[], lineup: Record<string, string>, slots: string[], tactic: RatingTactic, opponentRatings?: OpponentSectorRatings | null, behaviors: Record<string, PlayerBehavior> = {}, weather: MatchWeather = 'Neutro', context: MatchContext = defaultMatchContext): BenchSuggestion[] {
  const assignedIds = new Set(Object.values(lineup));
  const bench = players.filter(player => !assignedIds.has(player.id));
  if (!bench.length) return [];

  const sectorScore = (candidate: Record<string, string>) =>
    scoreLineup(estimateLineupSectors(players, candidate, slots, tactic, behaviors, weather, context), opponentRatings);
  const currentScore = sectorScore(lineup);
  const candidates = slots.flatMap(slot => bench.flatMap(player => {
    const outgoingPlayerId = lineup[slot] ?? null;
    const candidate = {...lineup, [slot]: player.id};
    const gain = sectorScore(candidate) - currentScore;
    return gain > 1e-6 ? [{slot, outgoingPlayerId, incomingPlayerId: player.id, gain, matchupBased: hasCompleteOpponentRatings(opponentRatings)}] : [];
  })).sort((a, b) => b.gain - a.gain);

  const usedSlots = new Set<string>();
  const usedPlayers = new Set<string>();
  return candidates.filter(suggestion => {
    if (usedSlots.has(suggestion.slot) || usedPlayers.has(suggestion.incomingPlayerId)) return false;
    usedSlots.add(suggestion.slot);
    usedPlayers.add(suggestion.incomingPlayerId);
    return true;
  }).slice(0, 3);
}

/** Maximum-weight one-to-one assignment using the Hungarian algorithm. */
export function optimizeLineup(players: Player[], slots: string[], tactic: RatingTactic = 'Normal', opponentRatings?: OpponentSectorRatings | null, behaviors: Record<string, PlayerBehavior> = {}, weather: MatchWeather = 'Neutro', context: MatchContext = defaultMatchContext): LineupResult {
  if (!players.length || !slots.length) return {assignments: {}, behaviors, totalRating: 0, matchupScore: null};
  const rows = slots.length;
  const realColumns = players.length;
  const columns = Math.max(rows, realColumns);
  const weights = slots.map(slot => [
    ...players.map(player => getPlayerSlotEstimate(player, slot, slots, behaviors, weather, tactic, context)),
    ...Array.from({length: columns - realColumns}, () => 0),
  ]);

  // Hungarian algorithm for a rectangular matrix (rows <= columns), minimizing -rating.
  const u = Array(rows + 1).fill(0);
  const v = Array(columns + 1).fill(0);
  const p = Array(columns + 1).fill(0);
  const way = Array(columns + 1).fill(0);
  for (let i = 1; i <= rows; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(columns + 1).fill(Number.POSITIVE_INFINITY);
    const used = Array(columns + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Number.POSITIVE_INFINITY;
      let j1 = 0;
      for (let j = 1; j <= columns; j += 1) {
        if (used[j]) continue;
        const cost = -(weights[i0 - 1][j - 1] ?? 0) - u[i0] - v[j];
        if (cost < minv[j]) {
          minv[j] = cost;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= columns; j += 1) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignments: Record<string, string> = {};
  for (let j = 1; j <= realColumns; j += 1) {
    const row = p[j] - 1;
    if (row < 0 || row >= rows) continue;
    assignments[slots[row]] = players[j - 1].id;
  }

  // Refine the individual-rating assignment against the seven team-sector ratings.
  const assignedIds = new Set(Object.values(assignments));
  const bench = players.filter(player => !assignedIds.has(player.id));
  const sectorScore = (candidate: Record<string, string>) => scoreLineup(estimateLineupSectors(players, candidate, slots, tactic, behaviors, weather, context), opponentRatings);
  let bestScore = sectorScore(assignments);
  let improved = true;
  while (improved) {
    improved = false;
    let bestAssignments = assignments;
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        const leftSlot = slots[i];
        const rightSlot = slots[j];
        const leftPlayer = assignments[leftSlot];
        const rightPlayer = assignments[rightSlot];
        if (!leftPlayer && !rightPlayer) continue;
        const candidate = {...assignments};
        if (leftPlayer && rightPlayer) {
          candidate[leftSlot] = rightPlayer;
          candidate[rightSlot] = leftPlayer;
        } else if (leftPlayer) {
          candidate[rightSlot] = leftPlayer;
          delete candidate[leftSlot];
        } else if (rightPlayer) {
          candidate[leftSlot] = rightPlayer;
          delete candidate[rightSlot];
        }
        const score = sectorScore(candidate);
        if (score > bestScore + 1e-6) {
          bestScore = score;
          bestAssignments = candidate;
        }
      }
      for (const substitute of bench) {
        const candidate = {...assignments, [slots[i]]: substitute.id};
        const score = sectorScore(candidate);
        if (score > bestScore + 1e-6) {
          bestScore = score;
          bestAssignments = candidate;
        }
      }
    }
    if (bestAssignments !== assignments) {
      const replaced = new Set(Object.values(bestAssignments));
      bench.splice(0, bench.length, ...players.filter(player => !replaced.has(player.id)));
      for (const slot of Object.keys(assignments)) {
        if (!(slot in bestAssignments)) delete assignments[slot];
      }
      Object.assign(assignments, bestAssignments);
      improved = true;
    }
  }
  const optimizedBehaviors = Object.fromEntries(Object.entries(behaviors).filter(([slot, behavior]) =>
    slots.includes(slot) && getBehaviorsForSlot(slot, slots).includes(behavior))) as Record<string, PlayerBehavior>;
  let ordersImproved = true;
  while (ordersImproved) {
    ordersImproved = false;
    for (const slot of slots) {
      const currentBehavior = optimizedBehaviors[slot] ?? 'Normal';
      let bestBehavior = currentBehavior;
      let bestOrderScore = scoreLineup(estimateLineupSectors(players, assignments, slots, tactic, optimizedBehaviors, weather, context), opponentRatings);
      for (const behavior of getBehaviorsForSlot(slot, slots)) {
        optimizedBehaviors[slot] = behavior;
        const score = scoreLineup(estimateLineupSectors(players, assignments, slots, tactic, optimizedBehaviors, weather, context), opponentRatings);
        if (score > bestOrderScore + 1e-6) {
          bestOrderScore = score;
          bestBehavior = behavior;
        }
      }
      optimizedBehaviors[slot] = bestBehavior;
      if (bestBehavior !== currentBehavior) ordersImproved = true;
    }
  }
  const ratings = estimateLineupSectors(players, assignments, slots, tactic, optimizedBehaviors, weather, context);
  const totalRating = Object.values(ratings).reduce((sum, rating) => sum + rating, 0);
  const matchupScore = scoreLineup(ratings, opponentRatings);
  return {assignments, behaviors: optimizedBehaviors, totalRating, matchupScore: hasCompleteOpponentRatings(opponentRatings) ? matchupScore : null};
}
