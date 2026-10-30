export type Player = {
  id: string;
  name: string;
  age: number | null;
  form: number | null;
  stamina: number | null;
  experience: number | null;
  loyalty: number | null;
  homeGrown: boolean;
  specialty: number | null;
  keeper: number | null;
  defending: number | null;
  playmaking: number | null;
  passing: number | null;
  winger: number | null;
  scoring: number | null;
  setPieces: number | null;
};

export type Team = {id: string | null; name: string; players: Player[]};
export type HrfSubstitution = {slot: string; outgoingPlayerId: string; incomingPlayerId: string; minute: number; standing: number; card: number};
export type HrfImport = {
  team: Team;
  formation?: '3-5-2' | '4-4-2' | '4-5-1' | '5-3-2' | '3-4-3';
  lineup?: Record<string, string>;
  behaviors?: Record<string, 'Normal' | 'Ofensivo' | 'Defensivo' | 'Hacia el centro' | 'Hacia la banda'>;
  tactic?: 'Normal' | 'Ataque por el centro' | 'Ataque por las bandas' | 'Contraataques' | 'Presionar' | 'Jugar creativamente' | 'Tiros lejanos';
  attitude?: 'Normal' | 'Jugar relajados' | 'Partido de la temporada';
  substitutions?: HrfSubstitution[];
};

type RecordSection = {type: string; id: string | null; values: Record<string, string>};

const numberOrNull = (value: string | undefined): number | null => {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const lineupRoleFields = [
  {player: 'keeper', role: 100, behavior: null, group: 'keeper'},
  {player: 'rightback', role: 101, behavior: 'behrightback', group: 'defence'},
  {player: 'insideback1', role: 102, behavior: 'behinsideback1', group: 'defence'},
  {player: 'insideback3', role: 103, behavior: 'behinsideback3', group: 'defence'},
  {player: 'insideback2', role: 104, behavior: 'behinsideback2', group: 'defence'},
  {player: 'leftback', role: 105, behavior: 'behleftback', group: 'defence'},
  {player: 'rightwinger', role: 106, behavior: 'behrightwinger', group: 'midfield'},
  {player: 'insidemid1', role: 107, behavior: 'behinsidemid1', group: 'midfield'},
  {player: 'insidemid3', role: 108, behavior: 'behinsidemid3', group: 'midfield'},
  {player: 'insidemid2', role: 109, behavior: 'behinsidemid2', group: 'midfield'},
  {player: 'leftwinger', role: 110, behavior: 'behleftwinger', group: 'midfield'},
  {player: 'forward1', role: 111, behavior: 'behforward1', group: 'forward'},
  {player: 'forward3', role: 112, behavior: 'behforward3', group: 'forward'},
  {player: 'forward2', role: 113, behavior: 'behforward2', group: 'forward'},
] as const;

const behaviorNames = ['Normal', 'Ofensivo', 'Defensivo', 'Hacia el centro', 'Hacia la banda'] as const;
const tacticsById: Record<string, HrfImport['tactic']> = {
  '0': 'Normal', '1': 'Presionar', '2': 'Contraataques', '3': 'Ataque por el centro',
  '4': 'Ataque por las bandas', '7': 'Jugar creativamente', '8': 'Tiros lejanos',
};

function parseLastLineup(values: Record<string, string>, players: Player[]): Pick<HrfImport, 'formation' | 'lineup' | 'behaviors' | 'tactic' | 'attitude' | 'substitutions'> {
  const availablePlayers = new Set(players.map(player => player.id));
  const selectedRoles = lineupRoleFields.flatMap(field => {
    const playerId = numberOrNull(values[field.player]);
    return playerId !== null && playerId > 0 && availablePlayers.has(String(playerId)) ? [{...field, playerId: String(playerId)}] : [];
  });
  const count = (group: string) => selectedRoles.filter(field => field.group === group).length;
  const formation = `${count('defence')}-${count('midfield')}-${count('forward')}` as HrfImport['formation'];
  const supportedFormations = ['3-5-2', '4-4-2', '4-5-1', '5-3-2', '3-4-3'];
  if (!supportedFormations.includes(formation ?? '') || !selectedRoles.some(field => field.group === 'keeper')) return {};

  const slots: Record<string, string> = {keeper: 'Portero'};
  const defenderCount = count('defence');
  if (defenderCount === 3) {
    Object.assign(slots, {insideback1: 'Defensa central 1', insideback3: 'Defensa central 2', insideback2: 'Defensa central 3'});
  } else if (defenderCount === 4) {
    Object.assign(slots, {leftback: 'Lateral izquierdo', insideback1: 'Defensa central 1', insideback2: 'Defensa central 2', rightback: 'Lateral derecho'});
  } else {
    Object.assign(slots, {leftback: 'Lateral izquierdo', insideback1: 'Defensa central 1', insideback3: 'Defensa central 2', insideback2: 'Defensa central 3', rightback: 'Lateral derecho'});
  }
  Object.assign(slots, {leftwinger: 'Extremo izquierdo', rightwinger: 'Extremo derecho'});
  const innerMidfields = selectedRoles.filter(field => field.group === 'midfield' && field.player !== 'rightwinger' && field.player !== 'leftwinger');
  innerMidfields.forEach((field, index) => { slots[field.player] = `Centrocampista central ${index + 1}`; });
  const forwards = selectedRoles.filter(field => field.group === 'forward').sort((a, b) => a.role - b.role);
  forwards.forEach((field, index) => { slots[field.player] = `Delantero ${index + 1}`; });

  const lineup: Record<string, string> = {};
  const behaviors: NonNullable<HrfImport['behaviors']> = {};
  const slotRoleIds: Record<string, number> = {};
  for (const field of selectedRoles) {
    const slot = slots[field.player];
    if (!slot || slot in lineup) continue;
    lineup[slot] = field.playerId;
    slotRoleIds[slot] = field.role;
    if (field.behavior) {
      const behaviorId = numberOrNull(values[field.behavior]);
      if (behaviorId !== null && behaviorNames[behaviorId]) behaviors[slot] = behaviorNames[behaviorId];
    }
  }

  const substitutions: HrfSubstitution[] = [];
  for (let index = 0; index < 20 && substitutions.length < 3; index += 1) {
    const prefix = `subst${index}`;
    if (numberOrNull(values[`${prefix}playerorderid`]) === null) break;
    if (numberOrNull(values[`${prefix}ordertype`]) !== 1) continue;
    const card = numberOrNull(values[`${prefix}card`]);
    const standing = numberOrNull(values[`${prefix}standing`]);
    if (card === null || ![-1, 1, 2, 11, 12, 13, 14, 15, 21, 22, 23, 24, 25].includes(card)) continue;
    if (standing === null || !Array.from({length: 15}, (_, id) => id - 1).includes(standing)) continue;
    const minute = numberOrNull(values[`${prefix}matchminutecriteria`]);
    const outgoing = numberOrNull(values[`${prefix}playerout`]);
    const incoming = numberOrNull(values[`${prefix}playerin`]);
    if (minute === null || minute < 0 || minute > 120 || outgoing === null || incoming === null) continue;
    const slot = Object.keys(lineup).find(key => lineup[key] === String(outgoing));
    if (!slot || !availablePlayers.has(String(incoming))) continue;
    const newRole = numberOrNull(values[`${prefix}pos`]);
    if (newRole !== null && newRole !== -1 && newRole !== slotRoleIds[slot]) continue;
    substitutions.push({slot, outgoingPlayerId: String(outgoing), incomingPlayerId: String(incoming), minute, standing, card});
  }

  const attitude = values.installning === '1' ? 'Partido de la temporada' : values.installning === '-1' ? 'Jugar relajados' : 'Normal';
  return {
    formation: formation as HrfImport['formation'],
    lineup,
    behaviors,
    tactic: tacticsById[values.tactictype],
    attitude,
    substitutions,
  };
}

export function parseHrf(source: string): HrfImport {
  const sections: RecordSection[] = [];
  let current: RecordSection | null = null;

  for (const rawLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      if (current) sections.push(current);
      const header = line.slice(1, -1);
      const playerHeader = header.match(/^(player|youthplayer)\s*(\d+)$/i);
      current = {
        type: playerHeader ? playerHeader[1].toLowerCase() : header.toLowerCase(),
        id: playerHeader ? playerHeader[2] : null,
        values: {},
      };
      continue;
    }
    const separator = line.indexOf('=');
    if (current && separator > 0) {
      current.values[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
    }
  }
  if (current) sections.push(current);

  const basics = sections.find(section => section.type === 'basics')?.values ?? {};
  const players = sections
    .filter(section => section.type === 'player' && section.id)
    .map(({id, values}): Player => ({
      id: id!,
      name: values.name || [values.firstname, values.lastname].filter(Boolean).join(' ') || `Jugador ${id}`,
      age: numberOrNull(values.ald),
      form: numberOrNull(values.for),
      stamina: numberOrNull(values.uth),
      experience: numberOrNull(values.rut),
      loyalty: numberOrNull(values.loy),
      homeGrown: values.homegr === '1' || values.homegr?.toLowerCase() === 'true',
      specialty: numberOrNull(values.speciality),
      keeper: numberOrNull(values.mlv),
      defending: numberOrNull(values.bac),
      playmaking: numberOrNull(values.spe),
      passing: numberOrNull(values.fra),
      winger: numberOrNull(values.ytt),
      scoring: numberOrNull(values.mal),
      setPieces: numberOrNull(values.fas),
    }));

  if (!players.length) throw new Error('No encuentro jugadores del primer equipo en este HRF.');
  const lastLineup = sections.find(section => section.type === 'lastlineup')?.values;
  return {
    team: {id: basics.teamid || null, name: basics.teamname || 'Equipo importado', players},
    ...(lastLineup ? parseLastLineup(lastLineup, players) : {}),
  };
}
