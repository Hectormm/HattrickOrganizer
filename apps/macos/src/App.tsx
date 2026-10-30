import React, {useEffect, useMemo, useState} from 'react';
import {NativeModules, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {HrfSubstitution, parseHrf, Player, Team} from './hrf';
import {estimateLineupSectors, estimateTacticLevel, getBehaviorsForSlot, getPlayerPositionEstimate, defaultMatchContext, MatchAttitude, MatchContext, MatchVenue, MatchWeather, matchAttitudes, matchVenues, matchWeathers, OpponentSectorRatings, PlayerBehavior, positionGroups, RatingTactic} from './positionRatings';
import {getBenchSuggestions, getPlayerSlotEstimate, optimizeLineup} from './lineupOptimizer';

type Tab = 'Plantilla' | 'Alineación' | 'Team Analyzer';
type Formation = '3-5-2' | '4-4-2' | '4-5-1' | '5-3-2' | '3-4-3';
type Tactic = RatingTactic;
type RatingKey = 'defenceLeft' | 'defenceCentral' | 'defenceRight' | 'midfield' | 'attackLeft' | 'attackCentral' | 'attackRight';
type OpponentRatings = Record<RatingKey, string>;
type MatchSettings = {teamSpirit: string; confidence: string; coachModifier: string; attitude: MatchAttitude; venue: MatchVenue};
type PlannedSubstitution = HrfSubstitution;

const tabs: Tab[] = ['Plantilla', 'Alineación', 'Team Analyzer'];
const formations: Formation[] = ['3-5-2', '4-4-2', '4-5-1', '5-3-2', '3-4-3'];
const tactics: Tactic[] = ['Normal', 'Ataque por el centro', 'Ataque por las bandas', 'Contraataques', 'Presionar', 'Jugar creativamente', 'Tiros lejanos'];
const defaultMatchSettings: MatchSettings = {teamSpirit: String(defaultMatchContext.teamSpirit), confidence: String(defaultMatchContext.confidence), coachModifier: String(defaultMatchContext.coachModifier), attitude: defaultMatchContext.attitude, venue: defaultMatchContext.venue};
const goalConditions = [
  {id: -1, label: 'Cualquier marcador'}, {id: 0, label: 'Empate'}, {id: 1, label: 'Vamos ganando'},
  {id: 2, label: 'Vamos perdiendo'}, {id: 3, label: 'Ganamos por más de uno'}, {id: 4, label: 'Perdemos por más de uno'},
  {id: 5, label: 'Empate o ganando'}, {id: 6, label: 'Empate o perdiendo'}, {id: 7, label: 'Ganamos por más de dos'},
  {id: 8, label: 'Perdemos por más de dos'}, {id: 9, label: 'No vamos empatando'}, {id: 10, label: 'No perdemos por más de uno'},
  {id: 11, label: 'No ganamos por más de uno'}, {id: 12, label: 'No perdemos por más de dos'}, {id: 13, label: 'No ganamos por más de dos'},
];
const redCardConditions = [
  {id: -1, label: 'Sin condición de expulsión'}, {id: 1, label: 'Expulsan a un jugador nuestro'}, {id: 2, label: 'Expulsan a un rival'},
  {id: 11, label: 'Expulsan a nuestro defensa central'}, {id: 12, label: 'Expulsan a nuestro centrocampista'}, {id: 13, label: 'Expulsan a nuestro delantero'},
  {id: 14, label: 'Expulsan a nuestro lateral'}, {id: 15, label: 'Expulsan a nuestro extremo'}, {id: 21, label: 'Expulsan a un central rival'},
  {id: 22, label: 'Expulsan a un centrocampista rival'}, {id: 23, label: 'Expulsan a un delantero rival'}, {id: 24, label: 'Expulsan a un lateral rival'},
  {id: 25, label: 'Expulsan a un extremo rival'},
];
const redCardEvents = [
  {id: -1, label: 'No hay expulsiones'}, ...redCardConditions.slice(1),
];

function goalConditionMatches(condition: number, goalDifference: number): boolean {
  switch (condition) {
    case -1: return true;
    case 0: return goalDifference === 0;
    case 1: return goalDifference > 0;
    case 2: return goalDifference < 0;
    case 3: return goalDifference >= 2;
    case 4: return goalDifference <= -2;
    case 5: return goalDifference >= 0;
    case 6: return goalDifference <= 0;
    case 7: return goalDifference >= 3;
    case 8: return goalDifference <= -3;
    case 9: return goalDifference !== 0;
    case 10: return goalDifference <= 1;
    case 11: return goalDifference >= -1;
    case 12: return goalDifference <= 2;
    case 13: return goalDifference >= -2;
    default: return false;
  }
}

function redCardConditionMatches(condition: number, event: number): boolean {
  if (condition === -1) return true;
  if (event === -1) return false;
  if (condition === 1) return event === 1 || (event >= 11 && event <= 15);
  if (condition === 2) return event === 2 || (event >= 21 && event <= 25);
  return condition === event;
}
const skillMetrics: {key: keyof Player; label: string}[] = [
  {key: 'keeper', label: 'Portería'},
  {key: 'defending', label: 'Defensa'},
  {key: 'playmaking', label: 'Jugadas'},
  {key: 'passing', label: 'Pases'},
  {key: 'winger', label: 'Lateral'},
  {key: 'scoring', label: 'Anotación'},
  {key: 'form', label: 'Forma'},
  {key: 'stamina', label: 'Resistencia'},
  {key: 'experience', label: 'Experiencia'},
  {key: 'loyalty', label: 'Fidelidad'},
];
const lineupSectors = [
  {key: 'midfield', label: 'Mediocampo'},
  {key: 'defenceLeft', label: 'Defensa izquierda'},
  {key: 'defenceCentral', label: 'Defensa central'},
  {key: 'defenceRight', label: 'Defensa derecha'},
  {key: 'attackLeft', label: 'Ataque izquierda'},
  {key: 'attackCentral', label: 'Ataque central'},
  {key: 'attackRight', label: 'Ataque derecha'},
] as const;
const emptyOpponentRatings: OpponentRatings = {
  midfield: '', defenceLeft: '', defenceCentral: '', defenceRight: '',
  attackLeft: '', attackCentral: '', attackRight: '',
};
const ratingMatchups: {key: RatingKey; opponentKey: RatingKey; label: string}[] = [
  {key: 'midfield', opponentKey: 'midfield', label: 'Mediocampo'},
  {key: 'defenceRight', opponentKey: 'attackLeft', label: 'Nuestra defensa derecha vs. ataque izquierdo rival'},
  {key: 'defenceCentral', opponentKey: 'attackCentral', label: 'Nuestra defensa central vs. ataque central rival'},
  {key: 'defenceLeft', opponentKey: 'attackRight', label: 'Nuestra defensa izquierda vs. ataque derecho rival'},
  {key: 'attackRight', opponentKey: 'defenceLeft', label: 'Nuestro ataque derecho vs. defensa izquierda rival'},
  {key: 'attackCentral', opponentKey: 'defenceCentral', label: 'Nuestro ataque central vs. defensa central rival'},
  {key: 'attackLeft', opponentKey: 'defenceRight', label: 'Nuestro ataque izquierdo vs. defensa derecha rival'},
];

function formationRows(formation: Formation): string[][] {
  const [defenders, midfielders, forwards] = formation.split('-').map(Number);
  const forwardsLine = Array.from({length: forwards}, (_, i) => `Delantero ${i + 1}`);
  const defendersLine = defenders === 3
    ? Array.from({length: defenders}, (_, i) => `Defensa central ${i + 1}`)
    : ['Lateral izquierdo', ...Array.from({length: defenders - 2}, (_, i) => `Defensa central ${i + 1}`), 'Lateral derecho'];
  const midfieldLine = midfielders === 3
    ? ['Extremo izquierdo', 'Centrocampista central 1', 'Extremo derecho']
    : midfielders === 4
      ? ['Extremo izquierdo', 'Centrocampista central 1', 'Centrocampista central 2', 'Extremo derecho']
      : ['Extremo izquierdo', 'Centrocampista central 1', 'Centrocampista central 2', 'Centrocampista central 3', 'Extremo derecho'];
  return [forwardsLine, midfieldLine, defendersLine, ['Portero']];
}

function Choice({label, selected, disabled, onPress}: {label: string; selected?: boolean; disabled?: boolean; onPress: () => void}) {
  return (
    <Text accessibilityRole="button" accessibilityState={{disabled: Boolean(disabled), selected: Boolean(selected)}} onPress={disabled ? undefined : onPress} style={[styles.choice, selected && styles.choiceActive, disabled && styles.choiceDisabled]}>
      {label}
    </Text>
  );
}

function specialtyName(value: number | null): string {
  const names: Record<number, string> = {1: 'Técnico', 2: 'Rápido', 3: 'Potente', 4: 'Imprevisible', 5: 'Cabeceador', 6: 'Resistente', 8: 'Apoyo'};
  return value === null ? '—' : names[value] ?? 'Sin especialidad';
}

function average(players: Player[], key: keyof Player): string {
  const values = players.map(player => player[key]).filter((value): value is number => typeof value === 'number');
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';
}

function parseRatingInput(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readMatchSettings(value: unknown): MatchSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {...defaultMatchSettings};
  const saved = value as Record<string, unknown>;
  const asText = (key: string, fallback: string) => typeof saved[key] === 'string' || typeof saved[key] === 'number' ? String(saved[key]) : fallback;
  return {
    teamSpirit: asText('teamSpirit', defaultMatchSettings.teamSpirit),
    confidence: asText('confidence', defaultMatchSettings.confidence),
    coachModifier: asText('coachModifier', defaultMatchSettings.coachModifier),
    attitude: matchAttitudes.includes(saved.attitude as MatchAttitude) ? saved.attitude as MatchAttitude : defaultMatchContext.attitude,
    venue: matchVenues.includes(saved.venue as MatchVenue) ? saved.venue as MatchVenue : defaultMatchContext.venue,
  };
}

function contextNumber(value: string, min: number, max: number, fallback: number, step = 1): number {
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.min(max, Math.max(min, parsed));
  return Number((Math.round(clamped / step) * step).toFixed(2));
}

function matchContextFromSettings(settings: MatchSettings): MatchContext {
  return {
    teamSpirit: contextNumber(settings.teamSpirit, 0, 10, defaultMatchContext.teamSpirit, 0.25),
    confidence: contextNumber(settings.confidence, 0, 9, defaultMatchContext.confidence, 1),
    coachModifier: contextNumber(settings.coachModifier, -10, 10, defaultMatchContext.coachModifier, 1),
    attitude: settings.attitude,
    venue: settings.venue,
  };
}

function readOpponentRatings(value: unknown): OpponentRatings {
  if (!value || typeof value !== 'object') return {...emptyOpponentRatings};
  const saved = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(emptyOpponentRatings).map(key => [
    key,
    typeof saved[key] === 'string' || typeof saved[key] === 'number' ? String(saved[key]) : '',
  ])) as OpponentRatings;
}

function isTeam(value: unknown): value is Team {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Team>;
  return typeof candidate.name === 'string' && Array.isArray(candidate.players) && candidate.players.every(player =>
    player && typeof player.id === 'string' && typeof player.name === 'string');
}

function isLineup(value: unknown): value is Record<string, string> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([slot, playerId]) =>
    typeof slot === 'string' && typeof playerId === 'string'));
}

function sanitizeLineup(value: unknown, allowedSlots: Set<string>, allowedPlayerIds: Set<string>): Record<string, string> {
  if (!isLineup(value)) return {};
  const usedPlayerIds = new Set<string>();
  return Object.fromEntries(Object.entries(value).filter(([slot, playerId]) => {
    if (!allowedSlots.has(slot) || !allowedPlayerIds.has(playerId) || usedPlayerIds.has(playerId)) return false;
    usedPlayerIds.add(playerId);
    return true;
  }));
}

function sanitizeBehaviors(value: unknown, allowedSlots: Set<string>): Record<string, PlayerBehavior> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([slot, behavior]) =>
    allowedSlots.has(slot) && getBehaviorsForSlot(slot, [...allowedSlots]).includes(behavior as PlayerBehavior)) as [string, PlayerBehavior][]);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Alineación');
  const [formation, setFormation] = useState<Formation>('3-5-2');
  const [tactic, setTactic] = useState<Tactic>('Normal');
  const [weather, setWeather] = useState<MatchWeather>('Neutro');
  const [matchSettings, setMatchSettings] = useState<MatchSettings>({...defaultMatchSettings});
  const matchContext = useMemo(() => matchContextFromSettings(matchSettings), [matchSettings]);
  const [team, setTeam] = useState<Team | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<Team | null>(null);
  const [opponentFormation, setOpponentFormation] = useState<Formation>('3-5-2');
  const [opponentTactic, setOpponentTactic] = useState<Tactic>('Normal');
  const [opponentName, setOpponentName] = useState('');
  const [opponentRatings, setOpponentRatings] = useState<OpponentRatings>({...emptyOpponentRatings});
  const [hrfText, setHrfText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [opponentImportMessage, setOpponentImportMessage] = useState('');
  const [lineupMessage, setLineupMessage] = useState('');
  const [lineup, setLineup] = useState<Record<string, string>>({});
  const [behaviors, setBehaviors] = useState<Record<string, PlayerBehavior>>({});
  const [plannedSubstitutions, setPlannedSubstitutions] = useState<PlannedSubstitution[]>([]);
  const [substitutionMinute, setSubstitutionMinute] = useState('60');
  const [substitutionStanding, setSubstitutionStanding] = useState(-1);
  const [substitutionCard, setSubstitutionCard] = useState(-1);
  const [previewMinute, setPreviewMinute] = useState('90');
  const [previewGoalDifference, setPreviewGoalDifference] = useState('0');
  const [previewRedCard, setPreviewRedCard] = useState(-1);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const rows = useMemo(() => formationRows(formation), [formation]);
  const slots = useMemo(() => rows.flat(), [rows]);
  const opponentRows = useMemo(() => formationRows(opponentFormation), [opponentFormation]);
  const opponentSlots = useMemo(() => opponentRows.flat(), [opponentRows]);
  const opponentLineupResult = useMemo(() => opponentTeam ? optimizeLineup(opponentTeam.players, opponentSlots, opponentTactic, null, {}, weather) : null, [opponentTeam, opponentSlots, opponentTactic, weather]);
  const opponentSectorRatings = useMemo(() => opponentTeam && opponentLineupResult
    ? estimateLineupSectors(opponentTeam.players, opponentLineupResult.assignments, opponentSlots, opponentTactic, opponentLineupResult.behaviors, weather)
    : null, [opponentTeam, opponentLineupResult, opponentSlots, opponentTactic, weather]);
  const sectorRatings = useMemo(() => team ? estimateLineupSectors(team.players, lineup, slots, tactic, behaviors, weather, matchContext) : null, [team, lineup, slots, tactic, behaviors, weather, matchContext]);
  const tacticLevel = useMemo(() => team ? estimateTacticLevel(team.players, lineup, slots, tactic, weather) : null, [team, lineup, slots, tactic, weather]);
  const parsedOpponentRatings = useMemo(() => Object.fromEntries(Object.keys(emptyOpponentRatings).map(key => {
    const manualRating = parseRatingInput(opponentRatings[key as RatingKey]);
    return [key, manualRating ?? opponentSectorRatings?.[key as RatingKey] ?? null];
  })) as OpponentSectorRatings, [opponentRatings, opponentSectorRatings]);
  const hasCompleteOpponentRatings = Object.keys(emptyOpponentRatings).every(key => typeof parsedOpponentRatings[key as RatingKey] === 'number');
  const hasAnyOpponentRatings = Object.values(parsedOpponentRatings).some(value => typeof value === 'number');
  const benchSuggestions = useMemo(() => team ? getBenchSuggestions(team.players, lineup, slots, tactic, hasCompleteOpponentRatings ? parsedOpponentRatings : null, behaviors, weather, matchContext) : [], [team, lineup, slots, tactic, hasCompleteOpponentRatings, parsedOpponentRatings, behaviors, weather, matchContext]);
  const projectedMinute = Math.max(0, Math.min(120, Number(previewMinute.replace(',', '.')) || 0));
  const parsedGoalDifference = Number(previewGoalDifference.replace(',', '.'));
  const previewDiff = Number.isFinite(parsedGoalDifference) ? Math.max(-20, Math.min(20, Math.trunc(parsedGoalDifference))) : 0;
  const projectedLineup = useMemo(() => {
    const projection = {...lineup};
    for (const substitution of [...plannedSubstitutions].sort((a, b) => a.minute - b.minute)) {
      if (substitution.minute > projectedMinute || !goalConditionMatches(substitution.standing, previewDiff) || !redCardConditionMatches(substitution.card, previewRedCard) || projection[substitution.slot] !== substitution.outgoingPlayerId) continue;
      if (Object.values(projection).includes(substitution.incomingPlayerId)) continue;
      projection[substitution.slot] = substitution.incomingPlayerId;
    }
    return projection;
  }, [lineup, plannedSubstitutions, projectedMinute, previewDiff, previewRedCard]);
  const projectedRatings = useMemo(() => team && plannedSubstitutions.length
    ? estimateLineupSectors(team.players, projectedLineup, slots, tactic, behaviors, weather, matchContext)
    : null, [team, plannedSubstitutions.length, projectedLineup, slots, tactic, behaviors, weather, matchContext]);
  const formationRecommendations = useMemo(() => {
    if (!team || !hasCompleteOpponentRatings || activeTab !== 'Alineación') return [];
    return formations.flatMap(candidateFormation => {
      const candidateSlots = formationRows(candidateFormation).flat();
      return tactics.map(candidateTactic => ({
        formation: candidateFormation,
        tactic: candidateTactic,
        slots: candidateSlots,
        result: optimizeLineup(team.players, candidateSlots, candidateTactic, parsedOpponentRatings, {}, weather, matchContext),
      }));
    }).filter(recommendation => recommendation.result.matchupScore !== null)
      .sort((a, b) => (b.result.matchupScore ?? 0) - (a.result.matchupScore ?? 0));
  }, [team, hasCompleteOpponentRatings, activeTab, parsedOpponentRatings, weather, matchContext]);

  useEffect(() => {
    const storage = NativeModules.HOStorage;
    if (!storage) {
      setStorageReady(true);
      return;
    }

    let mounted = true;
    storage.loadState().then((saved: unknown) => {
      if (!mounted || !saved || typeof saved !== 'object') return;
      const state = saved as {team?: unknown; formation?: unknown; tactic?: unknown; lineup?: unknown; opponentTeam?: unknown; opponentFormation?: unknown; opponentTactic?: unknown; opponentName?: unknown; opponentRatings?: unknown; behaviors?: unknown; weather?: unknown; matchSettings?: unknown; plannedSubstitutions?: unknown; substitutionMinute?: unknown; previewMinute?: unknown; previewGoalDifference?: unknown; previewRedCard?: unknown};
      const savedTeam = isTeam(state.team) ? state.team : null;
      const savedOpponentTeam = isTeam(state.opponentTeam) ? state.opponentTeam : null;
      const savedFormation = formations.includes(state.formation as Formation) ? state.formation as Formation : '3-5-2';
      const savedTactic = tactics.includes(state.tactic as Tactic) ? state.tactic as Tactic : 'Normal';
      const savedWeather = matchWeathers.includes(state.weather as MatchWeather) ? state.weather as MatchWeather : 'Neutro';
      const savedMatchSettings = readMatchSettings(state.matchSettings);
      const savedOpponentFormation = formations.includes(state.opponentFormation as Formation) ? state.opponentFormation as Formation : '3-5-2';
      const savedOpponentTactic = tactics.includes(state.opponentTactic as Tactic) ? state.opponentTactic as Tactic : 'Normal';

      setTeam(savedTeam);
      setOpponentTeam(savedOpponentTeam);
      setOpponentFormation(savedOpponentFormation);
      setOpponentTactic(savedOpponentTactic);
      setOpponentName(typeof state.opponentName === 'string' ? state.opponentName : '');
      setOpponentRatings(readOpponentRatings(state.opponentRatings));
      setFormation(savedFormation);
      setTactic(savedTactic);
      setWeather(savedWeather);
      setMatchSettings(savedMatchSettings);
      if (Array.isArray(state.plannedSubstitutions)) {
        const validIds = new Set(savedTeam?.players.map(player => player.id) ?? []);
        const validSlots = new Set(formationRows(savedFormation).flat());
        const restored = state.plannedSubstitutions.flatMap(item => {
          if (!item || typeof item !== 'object') return [];
          const savedSub = item as Partial<PlannedSubstitution>;
          const substitution = {slot: savedSub.slot, outgoingPlayerId: savedSub.outgoingPlayerId, incomingPlayerId: savedSub.incomingPlayerId, minute: savedSub.minute, standing: savedSub.standing ?? -1, card: savedSub.card ?? -1};
          const validCriteria = goalConditions.some(condition => condition.id === substitution.standing) && redCardConditions.some(condition => condition.id === substitution.card);
          return typeof substitution.slot === 'string' && validSlots.has(substitution.slot) && typeof substitution.outgoingPlayerId === 'string' && typeof substitution.incomingPlayerId === 'string' && validIds.has(substitution.outgoingPlayerId) && validIds.has(substitution.incomingPlayerId) && typeof substitution.minute === 'number' && Number.isInteger(substitution.minute) && substitution.minute >= 0 && substitution.minute <= 120 && validCriteria ? [substitution as PlannedSubstitution] : [];
        });
        setPlannedSubstitutions(restored.slice(0, 3));
      }
      if (typeof state.substitutionMinute === 'string') setSubstitutionMinute(state.substitutionMinute);
      if (typeof state.previewMinute === 'string') setPreviewMinute(state.previewMinute);
      if (typeof state.previewGoalDifference === 'string') setPreviewGoalDifference(state.previewGoalDifference);
      if (redCardEvents.some(event => event.id === state.previewRedCard)) setPreviewRedCard(state.previewRedCard as number);
      setBehaviors(sanitizeBehaviors(state.behaviors, new Set(formationRows(savedFormation).flat())));
      if (savedTeam && isLineup(state.lineup)) {
        const playerIds = new Set(savedTeam.players.map(player => player.id));
        const slotsForFormation = new Set(formationRows(savedFormation).flat());
        setLineup(sanitizeLineup(state.lineup, slotsForFormation, playerIds));
      }
    }).catch((error: unknown) => {
      console.warn('No se pudieron cargar los datos guardados de HO.', error);
    }).finally(() => {
      if (mounted) setStorageReady(true);
    });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!storageReady || !NativeModules.HOStorage) return;
    NativeModules.HOStorage.saveState({team, lineup, behaviors, formation, tactic, weather, matchSettings, opponentTeam, opponentFormation, opponentTactic, opponentName, opponentRatings, plannedSubstitutions, substitutionMinute, previewMinute, previewGoalDifference, previewRedCard}).catch((error: unknown) => {
      console.warn('No se pudieron guardar los datos de HO.', error);
    });
  }, [storageReady, team, lineup, behaviors, formation, tactic, weather, matchSettings, opponentTeam, opponentFormation, opponentTactic, opponentName, opponentRatings, plannedSubstitutions, substitutionMinute, previewMinute, previewGoalDifference, previewRedCard]);

  const chooseFormation = (next: Formation) => {
    setFormation(next);
    setPlannedSubstitutions([]);
    const availableSlots = new Set(formationRows(next).flat());
    setLineup(previous => Object.fromEntries(Object.entries(previous).filter(([slot]) => availableSlots.has(slot))));
    setBehaviors(previous => Object.fromEntries(Object.entries(previous).filter(([slot]) => availableSlots.has(slot))));
    setActiveSlot(null);
  };

  const importTeam = (source = hrfText) => {
    try {
      const imported = parseHrf(source);
      setTeam(imported.team);
      if (imported.formation && imported.lineup) {
        setFormation(imported.formation);
        setLineup(imported.lineup);
        setBehaviors(sanitizeBehaviors(imported.behaviors, new Set(formationRows(imported.formation).flat())));
        setPlannedSubstitutions(imported.substitutions ?? []);
        setSubstitutionStanding(-1);
        setSubstitutionCard(-1);
        setMatchSettings(previous => ({...previous, attitude: imported.attitude ?? previous.attitude}));
        setActiveTab('Alineación');
      } else {
        setLineup({});
        setBehaviors({});
        setPlannedSubstitutions([]);
      }
      setActiveSlot(null);
      setImportMessage(`${imported.team.players.length} jugadores importados · ${imported.team.name}${imported.lineup ? ` · última alineación ${imported.formation} cargada` : ''}${imported.substitutions?.length ? ` · ${imported.substitutions.length} cambios programados` : ''}`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'No se pudo leer el HRF.');
    }
  };

  const openHrfFile = async () => {
    try {
      const source: string | null = await NativeModules.HODocumentPicker.pickHRF();
      if (source) {
        setHrfText(source);
        importTeam(source);
      }
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'No se pudo abrir el archivo HRF.');
    }
  };

  const openOpponentHrfFile = async () => {
    try {
      const source: string | null = await NativeModules.HODocumentPicker.pickHRF();
      if (!source) return;
      const imported = parseHrf(source);
      setOpponentTeam(imported.team);
      setOpponentName(imported.team.name);
      setOpponentRatings({...emptyOpponentRatings});
      setOpponentImportMessage(`${imported.team.players.length} jugadores importados · ${imported.team.name}`);
    } catch (error) {
      setOpponentImportMessage(error instanceof Error ? error.message : 'No se pudo abrir el HRF del rival.');
    }
  };

  const assignedName = (slot: string) => team?.players.find(player => player.id === lineup[slot])?.name;
  const assignedOpponentName = (slot: string) => opponentTeam?.players.find(player => player.id === opponentLineupResult?.assignments[slot])?.name;
  const assignPlayerToSlot = (targetSlot: string, playerId: string) => {
    setLineup(previous => {
      const previousSlot = Object.entries(previous).find(([, assignedId]) => assignedId === playerId)?.[0];
      const targetPlayerId = previous[targetSlot];
      const next = {...previous};
      if (previousSlot && previousSlot !== targetSlot) {
        if (targetPlayerId) next[previousSlot] = targetPlayerId;
        else delete next[previousSlot];
      }
      next[targetSlot] = playerId;
      return next;
    });
  };
  const applyBestLineup = () => {
    if (!team) return;
    const result = optimizeLineup(team.players, slots, tactic, hasCompleteOpponentRatings ? parsedOpponentRatings : null, behaviors, weather, matchContext);
    setLineup(result.assignments);
    setBehaviors(result.behaviors);
    setPlannedSubstitutions([]);
    setActiveSlot(null);
    const coverage = `${Object.keys(result.assignments).length}/${slots.length} puestos cubiertos`;
    setLineupMessage(result.matchupScore !== null
      ? `${coverage} · índice de ventaja ${Math.round(result.matchupScore * 100)}% orientativo${opponentName.trim() ? ` contra ${opponentName.trim()}` : ''} · mediocampo ponderado ×3`
      : `${coverage} · suma de sectores ${result.totalRating.toFixed(1)}★${hasAnyOpponentRatings ? ' · completa los siete ratings rivales para optimizar por cruces' : ''}`);
  };
  const applyFormationRecommendation = (recommendation: (typeof formationRecommendations)[number]) => {
    setFormation(recommendation.formation);
    setTactic(recommendation.tactic);
    setLineup(recommendation.result.assignments);
    setBehaviors(recommendation.result.behaviors);
    setPlannedSubstitutions([]);
    setActiveSlot(null);
    const score = recommendation.result.matchupScore;
    const coverage = `${Object.keys(recommendation.result.assignments).length}/${recommendation.slots.length} puestos cubiertos`;
    setLineupMessage(`${recommendation.formation} · ${recommendation.tactic} · ${coverage} · índice de ventaja ${Math.round((score ?? 0) * 100)}% orientativo${opponentName.trim() ? ` contra ${opponentName.trim()}` : ''}`);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.sidebar}>
        <Text style={styles.brand}>HO</Text>
        <Text style={styles.club}>{team?.name ?? 'HATTRICK ORGANIZER'}</Text>
        {tabs.map(tab => (
          <Text accessibilityRole="button" key={tab} onPress={() => setActiveTab(tab)} style={[styles.navItem, activeTab === tab && styles.navActive]}>
            {tab}
          </Text>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>HATTRICK ORGANIZER · PROTOTIPO NATIVO</Text>
        <Text style={styles.title}>{activeTab}</Text>
        {activeTab === 'Plantilla' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Importar equipo desde un HRF</Text>
              <Text style={styles.muted}>Abre directamente un archivo .hrf exportado desde Hattrick Organizer. También puedes pegar su contenido.</Text>
              <Choice label="Abrir archivo .hrf…" onPress={openHrfFile} />
              <TextInput
                accessibilityLabel="Contenido del archivo HRF"
                multiline
                onChangeText={setHrfText}
                placeholder="Pega aquí el contenido del archivo .hrf…"
                placeholderTextColor="#91a1aa"
                style={styles.hrfInput}
                value={hrfText}
              />
              <Choice label="Importar texto pegado" onPress={() => importTeam()} />
              {importMessage ? <Text style={styles.importMessage}>{importMessage}</Text> : null}
            </View>
            {team ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{team.name} · {team.players.length} jugadores</Text>
                {team.players.map(player => (
                  <View key={player.id} style={styles.playerRow}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerSkills}>DEF {player.defending ?? '—'} · JUG {player.playmaking ?? '—'} · LAT {player.winger ?? '—'} · ANO {player.scoring ?? '—'} · ESP {specialtyName(player.specialty)}</Text>
                  </View>
                ))}
              </View>
            ) : <View style={styles.card}><Text style={styles.empty}>Importa un HRF para cargar la plantilla real de tu equipo.</Text></View>}
          </>
        ) : null}
        {activeTab === 'Alineación' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Esquema de juego</Text>
              <Text style={styles.muted}>{team ? `${team.name} · toca una posición para asignar un jugador.` : 'Importa tu HRF desde Plantilla para asignar a tus jugadores.'}</Text>
              {formationRecommendations.length ? (
                <View style={styles.sectorCard}>
                  <Text style={styles.sectionTitle}>Mejores esquemas y tácticas frente al rival</Text>
                  <Text style={styles.caption}>Compara 35 combinaciones de formación y táctica con los siete ratings disponibles. El índice es orientativo, no una predicción del marcador.</Text>
                  {formationRecommendations.slice(0, 3).map(recommendation => (
                    <Choice key={`recommend-${recommendation.formation}-${recommendation.tactic}`} label={`${recommendation.formation} · ${recommendation.tactic} · ${Math.round((recommendation.result.matchupScore ?? 0) * 100)}% de rating relativo · aplicar` } selected={formation === recommendation.formation && tactic === recommendation.tactic} onPress={() => applyFormationRecommendation(recommendation)} />
                  ))}
                </View>
              ) : null}
              <View style={styles.choices}>{formations.map(item => <Choice key={item} label={item} selected={formation === item} onPress={() => chooseFormation(item)} />)}</View>
              <Choice label="Calcular mejor once" disabled={!team} onPress={applyBestLineup} />
              {lineupMessage ? <Text style={styles.importMessage}>{lineupMessage}</Text> : null}
              <Text style={styles.sectionTitle}>Vista del campo · {formation}</Text>
              <View style={styles.pitch}>
                {rows.map((row, index) => (
                  <View key={`${formation}-${index}`} style={styles.row}>
                    {row.map(slot => (
                      <Text accessibilityRole="button" key={slot} onPress={() => {setActiveSlot(slot); setActiveTab('Alineación');}} style={[styles.position, activeSlot === slot && styles.positionActive]}>
                        <Text style={styles.positionDot}>●</Text>
                        <Text style={styles.positionText}>{assignedName(slot) ?? slot}</Text>
                        {behaviors[slot] && behaviors[slot] !== 'Normal' ? <Text style={styles.positionOrder}>{behaviors[slot]}</Text> : null}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
              <Text style={styles.caption}>{Object.keys(lineup).length} de {slots.length} posiciones asignadas</Text>
              {sectorRatings && Object.keys(lineup).length > 0 ? (
                <View style={styles.sectorCard}>
                  <Text style={styles.sectionTitle}>Ratings estimados del once</Text>
                  <Text style={styles.caption}>Incluye el modificador sectorial de la táctica cuando aplica. No incluye clima, entrenador, confianza, espíritu ni el gasto adicional de resistencia de Presionar.</Text>
                  <View style={styles.sectorGrid}>
                    {lineupSectors.map(sector => (
                      <View key={sector.key} style={styles.sectorRow}>
                        <Text style={styles.metricName}>{sector.label}</Text>
                        <Text style={styles.metricValue}>{sectorRatings[sector.key].toFixed(1)}★</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {tacticLevel !== null && Object.keys(lineup).length > 0 ? (
                <View style={styles.sectorCard}>
                  <Text style={styles.sectionTitle}>Nivel de táctica estimado · {tactic}</Text>
                  <Text style={styles.metricValue}>{tacticLevel.toFixed(2)}</Text>
                  <Text style={styles.caption}>{tactic === 'Contraataques'
                    ? 'Cálculo HO con forma y habilidades de defensa y pases de los defensas.'
                    : tactic === 'Presionar'
                      ? 'Cálculo HO al minuto 90 con defensa, forma, experiencia, fidelidad, resistencia y especialidad Potente; aplica el clima seleccionado.'
                      : tactic === 'Jugar creativamente'
                        ? 'Cálculo HO con pases, forma, fidelidad, experiencia y especialidad Imprevisible de los jugadores de campo.'
                        : tactic === 'Tiros lejanos'
                          ? 'Cálculo HO con anotación, balón parado y fidelidad de los jugadores de campo.'
                          : 'Cálculo HO con el nivel de Pases de los diez jugadores de campo.'}</Text>
                </View>
              ) : null}
              {team && Object.keys(lineup).length > 0 && (plannedSubstitutions.length > 0 || team.players.some(player => !Object.values(lineup).includes(player.id))) ? (
                <View style={styles.sectorCard}>
                  <Text style={styles.sectionTitle}>Plan de sustituciones</Text>
                  <Text style={styles.caption}>{hasCompleteOpponentRatings ? 'Añade al plan los cambios que mejoran el índice de cruce contra el rival.' : 'Añade al plan los cambios de banquillo que mejoran los ratings estimados.'} Máximo tres cambios, con criterios de resultado y expulsión como en HO.</Text>
                  <View style={styles.contextInputRow}><Text style={styles.opponentInputLabel}>Minuto del próximo cambio (0–120)</Text><TextInput accessibilityLabel="Minuto de la sustitución" keyboardType="number-pad" onChangeText={setSubstitutionMinute} style={styles.contextInput} value={substitutionMinute} /></View>
                  <Text style={styles.caption}>Cada cambio se activa con el minuto y los criterios seleccionados.</Text>
                  <Text style={styles.sectionTitle}>Marcador</Text>
                  <View style={styles.choices}>{goalConditions.map(condition => <Choice key={`goal-${condition.id}`} label={condition.label} selected={substitutionStanding === condition.id} onPress={() => setSubstitutionStanding(condition.id)} />)}</View>
                  <Text style={styles.sectionTitle}>Tarjeta roja</Text>
                  <View style={styles.choices}>{redCardConditions.map(condition => <Choice key={`card-${condition.id}`} label={condition.label} selected={substitutionCard === condition.id} onPress={() => setSubstitutionCard(condition.id)} />)}</View>
                  {benchSuggestions.length ? benchSuggestions.map(suggestion => {
                    const outgoing = team.players.find(player => player.id === suggestion.outgoingPlayerId)?.name ?? 'Vacío';
                    const incoming = team.players.find(player => player.id === suggestion.incomingPlayerId)?.name ?? 'Jugador';
                    const gain = suggestion.matchupBased ? `+${(suggestion.gain * 100).toFixed(1)} pp de ventaja` : `+${suggestion.gain.toFixed(2)}★`;
                    const minute = Math.max(0, Math.min(120, Math.round(Number(substitutionMinute.replace(',', '.')) || 0)));
                    const duplicate = plannedSubstitutions.some(item => item.slot === suggestion.slot || item.incomingPlayerId === suggestion.incomingPlayerId || item.outgoingPlayerId === suggestion.incomingPlayerId);
                    const disabled = plannedSubstitutions.length >= 3 || duplicate || !suggestion.outgoingPlayerId;
                    return <Choice key={`${suggestion.slot}-${suggestion.incomingPlayerId}`} disabled={disabled} label={`${suggestion.slot}: ${outgoing} → ${incoming} · ${gain} · ${minute}' · añadir`} onPress={() => setPlannedSubstitutions(previous => [...previous, {slot: suggestion.slot, outgoingPlayerId: suggestion.outgoingPlayerId!, incomingPlayerId: suggestion.incomingPlayerId, minute, standing: substitutionStanding, card: substitutionCard}].sort((a, b) => a.minute - b.minute))} />;
                  }) : <Text style={styles.muted}>{hasCompleteOpponentRatings ? 'Ningún cambio del banquillo mejora el índice de cruce.' : 'Ningún cambio de un suplente mejora la suma estimada.'}</Text>}
                  {plannedSubstitutions.length ? <>
                    <Text style={styles.sectionTitle}>Cambios guardados · vista al minuto</Text>
                    <View style={styles.contextInputRow}><Text style={styles.opponentInputLabel}>Minuto para calcular los ratings (0–120)</Text><TextInput accessibilityLabel="Minuto de la vista previa" keyboardType="number-pad" onChangeText={setPreviewMinute} style={styles.contextInput} value={previewMinute} /></View>
                    <View style={styles.contextInputRow}><Text style={styles.opponentInputLabel}>Diferencia de goles (tú − rival)</Text><TextInput accessibilityLabel="Diferencia de goles para la vista previa" keyboardType="numbers-and-punctuation" onChangeText={setPreviewGoalDifference} style={styles.contextInput} value={previewGoalDifference} /></View>
                    <Text style={styles.sectionTitle}>Expulsión del escenario</Text>
                    <View style={styles.choices}>{redCardEvents.map(event => <Choice key={`preview-card-${event.id}`} label={event.label} selected={previewRedCard === event.id} onPress={() => setPreviewRedCard(event.id)} />)}</View>
                    {plannedSubstitutions.map((item, index) => {
                      const from = team.players.find(player => player.id === item.outgoingPlayerId)?.name ?? 'Jugador';
                      const to = team.players.find(player => player.id === item.incomingPlayerId)?.name ?? 'Jugador';
                      const standing = goalConditions.find(condition => condition.id === item.standing)?.label ?? 'Marcador';
                      const card = redCardConditions.find(condition => condition.id === item.card)?.label ?? 'Expulsión';
                      return <Choice key={`${item.slot}-${item.incomingPlayerId}`} label={`${item.minute}' · ${item.slot}: ${from} → ${to} · ${standing} · ${card} · quitar`} onPress={() => setPlannedSubstitutions(previous => previous.filter((_, itemIndex) => itemIndex !== index))} />;
                    })}
                    <Text style={styles.caption}>Se aplican los criterios de minuto, marcador y expulsión seleccionados para esta simulación.</Text>
                    {projectedRatings ? <><Text style={styles.sectionTitle}>Ratings estimados al minuto {projectedMinute}' · {previewDiff > 0 ? `ganas por ${previewDiff}` : previewDiff < 0 ? `pierdes por ${Math.abs(previewDiff)}` : 'empate'}</Text><View style={styles.sectorGrid}>{lineupSectors.map(sector => <View key={`projected-${sector.key}`} style={styles.sectorRow}><Text style={styles.metricName}>{sector.label}</Text><Text style={styles.metricValue}>{projectedRatings[sector.key].toFixed(1)}★</Text></View>)}</View></> : null}
                  </> : null}
                </View>
              ) : null}
              {activeSlot ? (
                <View style={styles.picker}>
                  <Text style={styles.sectionTitle}>Orden individual · {activeSlot}</Text>
                  <Text style={styles.caption}>La recomendación optimiza las órdenes según la táctica, el clima y los ratings actuales.</Text>
                  <View style={styles.choices}>{getBehaviorsForSlot(activeSlot, slots).map(behavior => <Choice key={behavior} label={behavior} selected={(behaviors[activeSlot] ?? 'Normal') === behavior} onPress={() => setBehaviors(previous => ({...previous, [activeSlot]: behavior}))} />)}</View>
                  <Text style={styles.sectionTitle}>Elige jugador · {activeSlot}</Text>
                  {team?.players
                    .map(player => ({player, rating: getPlayerSlotEstimate(player, activeSlot, slots, behaviors, weather, tactic, matchContext)}))
                    .sort((a, b) => b.rating - a.rating)
                    .map(({player, rating}) => {
                      const assignedSlot = Object.entries(lineup).find(([, playerId]) => playerId === player.id)?.[0];
                      const transfer = assignedSlot && assignedSlot !== activeSlot ? ` · intercambiar desde ${assignedSlot}` : '';
                      return <Choice key={player.id} label={`${player.name} · ${rating.toFixed(1)}★ · DEF ${player.defending ?? '—'} · JUG ${player.playmaking ?? '—'} · ANO ${player.scoring ?? '—'} · ESP ${specialtyName(player.specialty)}${transfer}`} selected={lineup[activeSlot] === player.id} onPress={() => {assignPlayerToSlot(activeSlot, player.id); setActiveSlot(null);}} />;
                    })}
                  {!team ? <Text style={styles.muted}>Importa tu HRF desde Plantilla para elegir jugadores.</Text> : null}
                  <Choice label="Dejar posición vacía" onPress={() => {setLineup(previous => {const next = {...previous}; delete next[activeSlot]; return next;}); setActiveSlot(null);}} />
                </View>
              ) : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Órdenes del equipo</Text>
              <Text style={styles.muted}>Selecciona un planteamiento para este partido.</Text>
              <View style={styles.choices}>{tactics.map(item => <Choice key={item} label={item} selected={tactic === item} onPress={() => setTactic(item)} />)}</View>
              <Text style={styles.sectionTitle}>Clima del partido</Text><View style={styles.choices}>{matchWeathers.map(item => <Choice key={item} label={item} selected={weather === item} onPress={() => setWeather(item)} />)}</View>
              <Text style={styles.sectionTitle}>Contexto del partido</Text>
              <Text style={styles.caption}>Valores por defecto de HO: espíritu 4,5; confianza 4; entrenador equilibrado. Ajústalos al partido para recalcular ratings y recomendaciones.</Text>
              <View style={styles.contextInputGrid}>
                <View style={styles.contextInputRow}><Text style={styles.opponentInputLabel}>Espíritu (0–10)</Text><TextInput accessibilityLabel="Espíritu del equipo" keyboardType="decimal-pad" onChangeText={value => setMatchSettings(previous => ({...previous, teamSpirit: value}))} style={styles.contextInput} value={matchSettings.teamSpirit} /></View>
                <View style={styles.contextInputRow}><Text style={styles.opponentInputLabel}>Confianza (0–9)</Text><TextInput accessibilityLabel="Confianza del equipo" keyboardType="number-pad" onChangeText={value => setMatchSettings(previous => ({...previous, confidence: value}))} style={styles.contextInput} value={matchSettings.confidence} /></View>
                <View style={styles.contextInputRow}><Text style={styles.opponentInputLabel}>Estilo del entrenador (−10 a +10)</Text><TextInput accessibilityLabel="Estilo del entrenador" keyboardType="numbers-and-punctuation" onChangeText={value => setMatchSettings(previous => ({...previous, coachModifier: value}))} style={styles.contextInput} value={matchSettings.coachModifier} /></View>
              </View>
              <Text style={styles.caption}>Actitud</Text><View style={styles.choices}>{matchAttitudes.map(item => <Choice key={item} label={item} selected={matchSettings.attitude === item} onPress={() => setMatchSettings(previous => ({...previous, attitude: item}))} />)}</View>
              <Text style={styles.caption}>Sede</Text><View style={styles.choices}>{matchVenues.map(item => <Choice key={item} label={item} selected={matchSettings.venue === item} onPress={() => setMatchSettings(previous => ({...previous, venue: item}))} />)}</View>
              <View style={styles.summary}><Text style={styles.summaryLabel}>Planteamiento actual</Text><Text style={styles.summaryValue}>{formation} · {tactic} · {weather}</Text><Text style={styles.summaryLabel}>Espíritu {matchContext.teamSpirit} · Confianza {matchContext.confidence} · Estilo {matchContext.coachModifier >= 0 ? '+' : ''}{matchContext.coachModifier} · {matchContext.attitude} · {matchContext.venue}</Text></View>
            </View>
          </>
        ) : null}
        {activeTab === 'Team Analyzer' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Comparativa de ratings</Text>
              <Text style={styles.muted}>{team ? `${team.name} · alineación ${formation} · ${tactic} · ${weather}` : 'Importa tu HRF y configura una alineación para calcular tus ratings.'}</Text>
              {team ? <Text style={styles.caption}>Ratings propios con espíritu {matchContext.teamSpirit}, confianza {matchContext.confidence}, entrenador {matchContext.coachModifier >= 0 ? '+' : ''}{matchContext.coachModifier}, {matchContext.attitude.toLowerCase()} · {matchContext.venue.toLowerCase()}.</Text> : null}
              <Choice label={opponentTeam ? 'Cambiar HRF del rival…' : 'Importar HRF del rival…'} onPress={openOpponentHrfFile} />
              {opponentImportMessage ? <Text style={styles.importMessage}>{opponentImportMessage}</Text> : null}
              {opponentTeam ? (
                <View style={styles.opponentTeamCard}>
                  <Text style={styles.cardTitle}>{opponentTeam.name} · {opponentTeam.players.length} jugadores</Text>
                  <Text style={styles.caption}>Se estima su mejor once y sus siete ratings con los datos de la plantilla.</Text>
                  <Text style={styles.metricName}>Formación del rival</Text>
                  <View style={styles.choices}>{formations.map(item => <Choice key={`opponent-${item}`} label={item} selected={opponentFormation === item} onPress={() => setOpponentFormation(item)} />)}</View>
                  <Text style={styles.metricName}>Táctica estimada del rival</Text>
                  <View style={styles.choices}>{tactics.map(item => <Choice key={`opponent-${item}`} label={item} selected={opponentTactic === item} onPress={() => setOpponentTactic(item)} />)}</View>
                  <Text style={styles.caption}>Alineación estimada: {opponentLineupResult ? `${Object.keys(opponentLineupResult.assignments).length}/${opponentSlots.length} puestos` : '—'} · ratings calculados, no importados de un partido.</Text>
                  <View style={styles.pitch}>
                    {opponentRows.map((row, index) => (
                      <View key={`opponent-row-${index}`} style={styles.row}>
                        {row.map(slot => <Text key={slot} style={styles.opponentPosition}>{assignedOpponentName(slot) ?? slot}</Text>)}
                      </View>
                    ))}
                  </View>
                  {opponentSectorRatings ? (
                    <View style={styles.sectorGrid}>
                      {lineupSectors.map(sector => (
                        <View key={`opponent-${sector.key}`} style={styles.sectorRow}>
                          <Text style={styles.metricName}>{sector.label}</Text>
                          <Text style={styles.metricValue}>{opponentSectorRatings[sector.key].toFixed(1)}★</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.caption}>Estimación sin clima ni eventos del partido; Presionar no descuenta aquí la resistencia adicional.</Text>
                </View>
              ) : null}
              <TextInput
                accessibilityLabel="Nombre del rival"
                onChangeText={setOpponentName}
                placeholder="Nombre del rival"
                placeholderTextColor="#91a1aa"
                style={styles.opponentNameInput}
                value={opponentName}
              />
              <Text style={styles.sectionTitle}>Ratings del rival</Text>
              <Text style={styles.caption}>{opponentTeam ? 'Los ratings se estiman desde el HRF; cualquier valor manual sustituye ese sector.' : 'Introduce los ratings defensivos y ofensivos del Team Analyzer clásico para compararlos con tu alineación.'}</Text>
              <View style={styles.opponentInputGrid}>
                {lineupSectors.map(sector => (
                  <View key={sector.key} style={styles.opponentInputRow}>
                    <Text style={styles.opponentInputLabel}>{sector.label}</Text>
                    <TextInput
                      accessibilityLabel={`Rating rival ${sector.label}`}
                      onChangeText={value => setOpponentRatings(previous => ({...previous, [sector.key]: value}))}
                      placeholder={opponentSectorRatings?.[sector.key]?.toFixed(1) ?? '—'}
                      placeholderTextColor="#91a1aa"
                      style={styles.opponentRatingInput}
                      value={opponentRatings[sector.key]}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.sectionTitle}>Ventaja por sector</Text>
              {ratingMatchups.map(matchup => {
                const own = Object.keys(lineup).length ? sectorRatings?.[matchup.key] : undefined;
                const opponent = parsedOpponentRatings[matchup.opponentKey] ?? null;
                const total = (own ?? 0) + (opponent ?? 0);
                const advantage = own !== undefined && opponent !== null && total > 0 ? Math.round((own / total) * 100) : null;
                const difference = own !== undefined && opponent !== null ? own - opponent : null;
                const comparison = difference === null
                  ? 'Añade los ratings del rival'
                  : advantage === null
                    ? `Δ ${difference >= 0 ? '+' : ''}${difference.toFixed(1)}`
                    : `Δ ${difference >= 0 ? '+' : ''}${difference.toFixed(1)} · ${advantage}% de rating relativo`;
                return (
                  <View key={matchup.key} style={styles.matchupRow}>
                    <Text style={styles.metricName}>{matchup.label}</Text>
                    <Text style={styles.matchupValue}>{own === undefined ? 'Tú —' : `Tú ${own.toFixed(1)}`} · {opponent === null ? 'Rival —' : `Rival ${opponent.toFixed(1)}`}</Text>
                    <Text style={styles.matchupAdvantage}>{comparison}</Text>
                  </View>
                );
              })}
              <Text style={styles.caption}>La ventaja relativa compara ratings; no predice por sí sola el resultado ni las ocasiones.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Medias de habilidades y estado</Text>
              <Text style={styles.muted}>{team ? `${team.name} · ${team.players.length} jugadores` : 'Importa un HRF desde Plantilla para analizar tu equipo.'}</Text>
              {team ? <>
                {skillMetrics.map(metric => (
                  <View key={metric.key} style={styles.metricRow}>
                    <Text style={styles.metricName}>{metric.label}</Text>
                    <Text style={styles.metricValue}>{average(team.players, metric.key)}</Text>
                  </View>
                ))}
                <Text style={styles.sectionTitle}>Mejores perfiles por posición</Text>
                <Text style={styles.caption}>Estimación individual de HO con órdenes normales; no incluye clima ni ratings colectivos del partido.</Text>
                {positionGroups.map(group => (
                  <View key={group.key} style={styles.rankingGroup}>
                    <Text style={styles.metricName}>{group.label}</Text>
                    {team.players
                      .map(player => ({player, rating: getPlayerPositionEstimate(player, group.key, weather, tactic, matchContext)}))
                      .sort((a, b) => b.rating - a.rating)
                      .slice(0, 3)
                      .map(({player, rating}, index) => (
                        <Text key={player.id} style={styles.rankingPlayer}>{index + 1}. {player.name} · {rating.toFixed(1)}★</Text>
                      ))}
                  </View>
                ))}
              </> : <Text style={styles.empty}>Todavía no hay datos cargados</Text>}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, flexDirection: 'row', backgroundColor: '#f3f6f8'},
  sidebar: {width: 230, padding: 24, backgroundColor: '#102b3f'},
  brand: {fontSize: 34, fontWeight: '800', color: '#fff'},
  club: {marginTop: 8, marginBottom: 40, color: '#a9c1d0', fontSize: 11, letterSpacing: 1},
  navItem: {paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6, color: '#d5e0e7', borderRadius: 8, overflow: 'hidden'},
  navActive: {backgroundColor: '#1e526f', color: '#fff'},
  content: {padding: 42, width: '100%', maxWidth: 1150},
  eyebrow: {fontSize: 11, letterSpacing: 1.4, color: '#507084', fontWeight: '700'},
  title: {marginTop: 8, marginBottom: 24, fontSize: 32, fontWeight: '700', color: '#142d3d'},
  card: {padding: 22, marginBottom: 18, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e7eb'},
  cardTitle: {fontSize: 19, fontWeight: '700', color: '#19384b'},
  muted: {marginTop: 7, color: '#617785', fontSize: 14},
  choices: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 14},
  choice: {paddingVertical: 8, paddingHorizontal: 13, marginRight: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#edf2f5', color: '#385465', fontSize: 13},
  choiceActive: {backgroundColor: '#1c6b83', color: '#fff', fontWeight: '700'},
  choiceDisabled: {opacity: 0.4},
  sectionTitle: {marginTop: 12, marginBottom: 10, color: '#19384b', fontSize: 15, fontWeight: '700'},
  pitch: {paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#e9f3ed', borderWidth: 1, borderColor: '#d6e8dc'},
  row: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 58},
  position: {minWidth: 100, alignItems: 'center', marginHorizontal: 5, padding: 5, borderRadius: 7, overflow: 'hidden', color: '#35584a'},
  positionActive: {backgroundColor: '#d4e8db'},
  positionDot: {color: '#267550', fontSize: 17},
  positionText: {marginTop: 3, color: '#35584a', fontSize: 11, textAlign: 'center'},
  positionOrder: {marginTop: 2, color: '#1c6b83', fontSize: 9, textAlign: 'center'},
  caption: {marginTop: 9, color: '#758995', fontSize: 12},
  sectorCard: {marginTop: 14, padding: 14, borderRadius: 10, backgroundColor: '#f6f8f9'},
  opponentTeamCard: {marginTop: 14, padding: 14, borderRadius: 10, backgroundColor: '#f6f8f9'},
  opponentPosition: {minWidth: 86, maxWidth: 150, alignItems: 'center', marginHorizontal: 4, padding: 5, borderRadius: 7, overflow: 'hidden', color: '#35584a', fontSize: 11, textAlign: 'center'},
  sectorGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
  sectorRow: {width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingRight: 16},
  picker: {marginTop: 12, padding: 14, borderRadius: 10, backgroundColor: '#f6f8f9'},
  summary: {marginTop: 10, padding: 14, borderRadius: 9, backgroundColor: '#f3f7f9'},
  summaryLabel: {fontSize: 11, color: '#718591'},
  summaryValue: {marginTop: 3, fontSize: 15, color: '#19384b', fontWeight: '700'},
  empty: {marginTop: 22, padding: 20, textAlign: 'center', color: '#8295a0', backgroundColor: '#f5f8fa', borderRadius: 10, overflow: 'hidden'},
  hrfInput: {height: 140, marginTop: 16, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: '#dbe4e9', borderRadius: 8, color: '#19384b', backgroundColor: '#fafcfd', textAlignVertical: 'top'},
  opponentNameInput: {height: 38, marginTop: 14, paddingHorizontal: 10, borderWidth: 1, borderColor: '#dbe4e9', borderRadius: 8, color: '#19384b', backgroundColor: '#fafcfd'},
  opponentInputGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8},
  opponentInputRow: {width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, paddingRight: 12},
  opponentInputLabel: {color: '#385465', fontSize: 13},
  opponentRatingInput: {width: 78, height: 34, paddingHorizontal: 8, borderWidth: 1, borderColor: '#dbe4e9', borderRadius: 7, color: '#19384b', backgroundColor: '#fafcfd', textAlign: 'right'},
  contextInputGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8},
  contextInputRow: {width: 250, marginRight: 18, marginTop: 6},
  contextInput: {height: 34, marginTop: 5, paddingHorizontal: 8, borderWidth: 1, borderColor: '#dbe4e9', borderRadius: 7, color: '#19384b', backgroundColor: '#fafcfd'},
  matchupRow: {paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#edf1f3'},
  matchupValue: {marginTop: 5, color: '#19384b', fontSize: 14, fontWeight: '600'},
  matchupAdvantage: {marginTop: 3, color: '#617785', fontSize: 12},
  importMessage: {marginTop: 6, color: '#267550', fontSize: 13},
  playerRow: {paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#edf1f3'},
  playerName: {color: '#19384b', fontSize: 14, fontWeight: '600'},
  playerSkills: {marginTop: 4, color: '#617785', fontSize: 12},
  metricRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#edf1f3'},
  metricName: {color: '#385465', fontSize: 14},
  metricValue: {color: '#19384b', fontSize: 15, fontWeight: '700'},
  rankingGroup: {paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#edf1f3'},
  rankingPlayer: {marginTop: 6, color: '#617785', fontSize: 13},
});
