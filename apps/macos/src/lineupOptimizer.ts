import {Player} from './hrf';
import {getPlayerRoleEstimate} from './positionRatings';

type LineupResult = {assignments: Record<string, string>; totalRating: number};

function roleForSlot(slot: string, slots: string[]): number {
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

/** Maximum-weight one-to-one assignment using the Hungarian algorithm. */
export function optimizeLineup(players: Player[], slots: string[]): LineupResult {
  if (!players.length || !slots.length) return {assignments: {}, totalRating: 0};
  const rows = slots.length;
  const realColumns = players.length;
  const columns = Math.max(rows, realColumns);
  const weights = slots.map(slot => [
    ...players.map(player => getPlayerRoleEstimate(player, roleForSlot(slot, slots))),
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
  return {assignments, totalRating};
}
