export type Player = {
  id: string;
  name: string;
  age: number | null;
  form: number | null;
  stamina: number | null;
  keeper: number | null;
  defending: number | null;
  playmaking: number | null;
  passing: number | null;
  winger: number | null;
  scoring: number | null;
  setPieces: number | null;
};

export type Team = {id: string | null; name: string; players: Player[]};

type RecordSection = {type: string; id: string | null; values: Record<string, string>};

const numberOrNull = (value: string | undefined): number | null => {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function parseHrf(source: string): Team {
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
      keeper: numberOrNull(values.mlv),
      defending: numberOrNull(values.bac),
      playmaking: numberOrNull(values.spe),
      passing: numberOrNull(values.fra),
      winger: numberOrNull(values.ytt),
      scoring: numberOrNull(values.mal),
      setPieces: numberOrNull(values.fas),
    }));

  if (!players.length) throw new Error('No encuentro jugadores del primer equipo en este HRF.');
  return {id: basics.teamid || null, name: basics.teamname || 'Equipo importado', players};
}
