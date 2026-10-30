import {Player} from './hrf';
import {estimateLineupSectors, getPlayerRoleEstimate, getRoleIdForSlot, RatingTactic} from './positionRatings';

type LineupResult = {assignments: Record<string, string>; totalRating: number};

export function getPlayerSlotEstimate(player: Player, slot: string, slots: string[]): number {
  return getPlayerRoleEstimate(player, getRoleIdForSlot(slot, slots));
}

/** Maximum-weight one-to-one assignment using the Hungarian algorithm. */
export function optimizeLineup(players: Player[], slots: string[], tactic: RatingTactic = 'Normal'): LineupResult {
  if (!players.length || !slots.length) return {assignments: {}, totalRating: 0};
  const rows = slots.length;
  const realColumns = players.length;
  const columns = Math.max(rows, realColumns);
  const weights = slots.map(slot => [
    ...players.map(player => getPlayerSlotEstimate(player, slot, slots)),
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
  let totalRating = 0;
  for (let j = 1; j <= realColumns; j += 1) {
    const row = p[j] - 1;
    if (row < 0 || row >= rows) continue;
    assignments[slots[row]] = players[j - 1].id;
    totalRating += weights[row][j - 1];
  }

  // Refine the individual-rating assignment against the seven team-sector ratings.
  const assignedIds = new Set(Object.values(assignments));
  const bench = players.filter(player => !assignedIds.has(player.id));
  const sectorScore = (candidate: Record<string, string>) =>
    Object.values(estimateLineupSectors(players, candidate, slots, tactic)).reduce((sum, rating) => sum + rating, 0);
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
      Object.assign(assignments, bestAssignments);
      improved = true;
    }
  }
  return {assignments, totalRating: bestScore};
}
