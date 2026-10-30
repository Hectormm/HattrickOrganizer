import type {LineupSectorRatings, RatingTactic} from './positionRatings';

export type MatchSimulationResult = {
  matches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  averageHomeGoals: number;
  averageAwayGoals: number;
  commonScores: {home: number; away: number; count: number}[];
};

type SimTeam = {
  ratings: LineupSectorRatings;
  tactic: RatingTactic;
  level: number;
  midfieldShare: number;
  scoreChances: [number, number, number];
};

const randomInt = (max: number) => Math.floor(Math.random() * max);

function linearChance(first: number, second: number): number {
  const total = first + second;
  return total > 0 ? first / total : 0.5;
}

function effectiveness(value: number): number {
  let percent = value * 100;
  const low = percent < 50;
  if (low) percent = 100 - percent;
  const result = -500000 / percent ** 2 + 10000 / percent + 50;
  return low ? 100 - result : result;
}

function createTeam(own: LineupSectorRatings, rival: LineupSectorRatings, tactic: RatingTactic, level: number): SimTeam {
  const midfieldShare = linearChance(own.midfield, rival.midfield);
  return {
    ratings: own,
    tactic,
    level,
    midfieldShare,
    scoreChances: [
      linearChance(own.attackLeft, rival.defenceRight),
      linearChance(own.attackCentral, rival.defenceCentral),
      linearChance(own.attackRight, rival.defenceLeft),
    ],
  };
}

function areaFor(team: SimTeam): 0 | 1 | 2 {
  let middlePercent = 40;
  if (team.tactic === 'Ataque por el centro') middlePercent += team.level * 3;
  if (team.tactic === 'Ataque por las bandas') middlePercent -= team.level * 1.5;
  const area = randomInt(100);
  if (area < middlePercent) return 1;
  return area < ((100 - middlePercent) / 2 + middlePercent) ? 0 : 2;
}

function counterLimit(team: SimTeam, rival: SimTeam): number {
  if (team.tactic !== 'Contraataques') return 0;
  const defending = rival.ratings.defenceLeft + rival.ratings.defenceCentral + rival.ratings.defenceRight;
  const counterIndex = (team.level / (defending / 6 + team.level)) * 100;
  const expected = 4.00008896306671 / (1 + 58995.2231780103 * Math.exp(-0.21970325236894 * counterIndex));
  const rounded = Math.floor(expected) + (randomInt(10) < (expected % 1) * 10 ? 1 : 0);
  return Math.min(3, rounded);
}

function scoreChance(team: SimTeam, area: number): boolean {
  const percent = Math.trunc(effectiveness(team.scoreChances[area]));
  return randomInt(100) < percent;
}

function pressingLevel(home: SimTeam, away: SimTeam): number {
  return (home.tactic === 'Presionar' && home.level > 4 ? home.level - 4 : 0)
    + (away.tactic === 'Presionar' && away.level > 4 ? away.level - 4 : 0);
}

function simulateOne(home: SimTeam, away: SimTeam): [number, number] {
  const pressing = pressingLevel(home, away);
  const maxHomeCounters = counterLimit(home, away);
  const maxAwayCounters = counterLimit(away, home);
  let homeCounters = 0;
  let awayCounters = 0;
  let successfulPressing = 0;
  let homeGoals = 0;
  let awayGoals = 0;

  for (let action = 0; action < 10; action += 1) {
    if (successfulPressing < 7 && successfulPressing * 2 <= pressing && randomInt(14) < pressing) {
      successfulPressing += 1;
      continue;
    }

    const isHomeAction = randomInt(100) < effectiveness(home.midfieldShare);
    const attacking = isHomeAction ? home : away;
    const defending = isHomeAction ? away : home;
    const area = areaFor(attacking);
    let scored: boolean;

    if (randomInt(10) < 1) {
      scored = randomInt(100) < (randomInt(2) === 0 ? 25 : 75);
    } else {
      scored = scoreChance(attacking, area);
      if (!scored && defending.tactic === 'Contraataques') {
        if (defending.midfieldShare <= 0.5) {
          const counters = isHomeAction ? awayCounters : homeCounters;
          const maxCounters = isHomeAction ? maxAwayCounters : maxHomeCounters;
          if (counters < maxCounters) {
            if (isHomeAction) awayCounters += 1;
            else homeCounters += 1;
            const counterArea = areaFor(defending);
            if (scoreChance(defending, counterArea)) {
              if (isHomeAction) awayGoals += 1;
              else homeGoals += 1;
            }
          }
        }
      }
    }

    if (scored) {
      if (isHomeAction) homeGoals += 1;
      else awayGoals += 1;
    }
  }

  return [homeGoals, awayGoals];
}

export function simulateMatches(
  homeRatings: LineupSectorRatings,
  awayRatings: LineupSectorRatings,
  homeTactic: RatingTactic,
  homeTacticLevel: number,
  awayTactic: RatingTactic,
  awayTacticLevel: number,
  matches = 10000,
): MatchSimulationResult {
  const count = Math.min(100000, Math.max(1000, Math.trunc(matches)));
  // HO's legacy engine stores tactic levels as integers and simulates ten actions per match.
  const home = createTeam(homeRatings, awayRatings, homeTactic, Math.trunc(homeTacticLevel));
  const away = createTeam(awayRatings, homeRatings, awayTactic, Math.trunc(awayTacticLevel));
  const scoreCounts = new Map<string, {home: number; away: number; count: number}>();
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;

  for (let i = 0; i < count; i += 1) {
    const [homeGoals, awayGoals] = simulateOne(home, away);
    totalHomeGoals += homeGoals;
    totalAwayGoals += awayGoals;
    if (homeGoals > awayGoals) homeWins += 1;
    else if (homeGoals < awayGoals) awayWins += 1;
    else draws += 1;
    const key = `${homeGoals}-${awayGoals}`;
    const score = scoreCounts.get(key) ?? {home: homeGoals, away: awayGoals, count: 0};
    score.count += 1;
    scoreCounts.set(key, score);
  }

  const commonScores = [...scoreCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  return {
    matches: count,
    homeWins,
    draws,
    awayWins,
    averageHomeGoals: totalHomeGoals / count,
    averageAwayGoals: totalAwayGoals / count,
    commonScores,
  };
}

export function tacticLevelForSimulation(level: number | null): number {
  return level === null ? 0 : Math.trunc(level > 0 ? level + 1 : level);
}

