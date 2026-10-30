import React, {useEffect, useMemo, useState} from 'react';
import {NativeModules, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {parseHrf, Player, Team} from './hrf';
import {estimateLineupSectors, estimateTacticLevel, getPlayerPositionEstimate, positionGroups, RatingTactic} from './positionRatings';
import {getBenchSuggestions, getPlayerSlotEstimate, optimizeLineup} from './lineupOptimizer';

type Tab = 'Plantilla' | 'Alineación' | 'Team Analyzer';
type Formation = '3-5-2' | '4-4-2' | '4-5-1' | '5-3-2' | '3-4-3';
type Tactic = RatingTactic;

const tabs: Tab[] = ['Plantilla', 'Alineación', 'Team Analyzer'];
const formations: Formation[] = ['3-5-2', '4-4-2', '4-5-1', '5-3-2', '3-4-3'];
const tactics: Tactic[] = ['Normal', 'Ataque por el centro', 'Ataque por las bandas', 'Contraataques', 'Presionar'];
const skillMetrics: {key: keyof Player; label: string}[] = [
  {key: 'keeper', label: 'Portería'},
  {key: 'defending', label: 'Defensa'},
  {key: 'playmaking', label: 'Jugadas'},
  {key: 'passing', label: 'Pases'},
  {key: 'winger', label: 'Lateral'},
  {key: 'scoring', label: 'Anotación'},
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

function average(players: Player[], key: keyof Player): string {
  const values = players.map(player => player[key]).filter((value): value is number => typeof value === 'number');
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Alineación');
  const [formation, setFormation] = useState<Formation>('3-5-2');
  const [tactic, setTactic] = useState<Tactic>('Normal');
  const [team, setTeam] = useState<Team | null>(null);
  const [hrfText, setHrfText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [lineupMessage, setLineupMessage] = useState('');
  const [lineup, setLineup] = useState<Record<string, string>>({});
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const rows = useMemo(() => formationRows(formation), [formation]);
  const slots = useMemo(() => rows.flat(), [rows]);
  const sectorRatings = useMemo(() => team ? estimateLineupSectors(team.players, lineup, slots, tactic) : null, [team, lineup, slots, tactic]);
  const tacticLevel = useMemo(() => team ? estimateTacticLevel(team.players, lineup, slots, tactic) : null, [team, lineup, slots, tactic]);
  const benchSuggestions = useMemo(() => team ? getBenchSuggestions(team.players, lineup, slots, tactic) : [], [team, lineup, slots, tactic]);
  const assignedElsewhere = new Set(Object.entries(lineup).filter(([slot]) => slot !== activeSlot).map(([, playerId]) => playerId));

  useEffect(() => {
    const storage = NativeModules.HOStorage;
    if (!storage) {
      setStorageReady(true);
      return;
    }

    let mounted = true;
    storage.loadState().then((saved: unknown) => {
      if (!mounted || !saved || typeof saved !== 'object') return;
      const state = saved as {team?: unknown; formation?: unknown; tactic?: unknown; lineup?: unknown};
      const savedTeam = isTeam(state.team) ? state.team : null;
      const savedFormation = formations.includes(state.formation as Formation) ? state.formation as Formation : '3-5-2';
      const savedTactic = tactics.includes(state.tactic as Tactic) ? state.tactic as Tactic : 'Normal';

      setTeam(savedTeam);
      setFormation(savedFormation);
      setTactic(savedTactic);
      if (savedTeam && isLineup(state.lineup)) {
        const playerIds = new Set(savedTeam.players.map(player => player.id));
        const slotsForFormation = new Set(formationRows(savedFormation).flat());
        setLineup(Object.fromEntries(Object.entries(state.lineup).filter(([slot, playerId]) =>
          slotsForFormation.has(slot) && playerIds.has(playerId))));
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
    NativeModules.HOStorage.saveState({team, lineup, formation, tactic}).catch((error: unknown) => {
      console.warn('No se pudieron guardar los datos de HO.', error);
    });
  }, [storageReady, team, lineup, formation, tactic]);

  const chooseFormation = (next: Formation) => {
    setFormation(next);
    const availableSlots = new Set(formationRows(next).flat());
    setLineup(previous => Object.fromEntries(Object.entries(previous).filter(([slot]) => availableSlots.has(slot))));
    setActiveSlot(null);
  };

  const importTeam = (source = hrfText) => {
    try {
      const imported = parseHrf(source);
      setTeam(imported);
      setLineup({});
      setActiveSlot(null);
      setImportMessage(`${imported.players.length} jugadores importados · ${imported.name}`);
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

  const assignedName = (slot: string) => team?.players.find(player => player.id === lineup[slot])?.name;
  const applyBestLineup = () => {
    if (!team) return;
    const result = optimizeLineup(team.players, slots, tactic);
    setLineup(result.assignments);
    setActiveSlot(null);
    setLineupMessage(`${Object.keys(result.assignments).length}/${slots.length} puestos cubiertos · suma de sectores ${result.totalRating.toFixed(1)}★`);
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
                    <Text style={styles.playerSkills}>DEF {player.defending ?? '—'} · JUG {player.playmaking ?? '—'} · LAT {player.winger ?? '—'} · ANO {player.scoring ?? '—'}</Text>
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
                      ? 'Cálculo HO al minuto 90 con defensa, forma, experiencia, fidelidad, resistencia y especialidad Potente; asume clima neutro.'
                      : 'Cálculo HO con el nivel de Pases de los diez jugadores de campo.'}</Text>
                </View>
              ) : null}
              {team && Object.keys(lineup).length > 0 && team.players.some(player => !Object.values(lineup).includes(player.id)) ? (
                <View style={styles.sectorCard}>
                  <Text style={styles.sectionTitle}>Cambios que mejoran el once</Text>
                  <Text style={styles.caption}>Mejoran la suma de los siete ratings estimados con la táctica seleccionada.</Text>
                  {benchSuggestions.length ? benchSuggestions.map(suggestion => {
                    const outgoing = team.players.find(player => player.id === suggestion.outgoingPlayerId)?.name ?? 'Vacío';
                    const incoming = team.players.find(player => player.id === suggestion.incomingPlayerId)?.name ?? 'Jugador';
                    return <Choice key={`${suggestion.slot}-${suggestion.incomingPlayerId}`} label={`${suggestion.slot}: ${outgoing} → ${incoming} · +${suggestion.gain.toFixed(2)}★`} onPress={() => setLineup(previous => ({...previous, [suggestion.slot]: suggestion.incomingPlayerId}))} />;
                  }) : <Text style={styles.muted}>Ningún cambio de un suplente mejora la suma estimada.</Text>}
                </View>
              ) : null}
              {activeSlot ? (
                <View style={styles.picker}>
                  <Text style={styles.sectionTitle}>Elige jugador · {activeSlot}</Text>
                  {team?.players
                    .map(player => ({player, rating: getPlayerSlotEstimate(player, activeSlot, slots)}))
                    .sort((a, b) => b.rating - a.rating)
                    .map(({player, rating}) => (
                      <Choice key={player.id} label={`${player.name} · ${rating.toFixed(1)}★ · DEF ${player.defending ?? '—'} · JUG ${player.playmaking ?? '—'} · ANO ${player.scoring ?? '—'}`} disabled={assignedElsewhere.has(player.id)} selected={lineup[activeSlot] === player.id} onPress={() => {setLineup(previous => ({...previous, [activeSlot]: player.id})); setActiveSlot(null);}} />
                    ))}
                  <Choice label="Dejar posición vacía" onPress={() => {setLineup(previous => {const next = {...previous}; delete next[activeSlot]; return next;}); setActiveSlot(null);}} />
                </View>
              ) : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Órdenes del equipo</Text>
              <Text style={styles.muted}>Selecciona un planteamiento para este partido.</Text>
              <View style={styles.choices}>{tactics.map(item => <Choice key={item} label={item} selected={tactic === item} onPress={() => setTactic(item)} />)}</View>
              <View style={styles.summary}><Text style={styles.summaryLabel}>Planteamiento actual</Text><Text style={styles.summaryValue}>{formation} · {tactic}</Text></View>
            </View>
          </>
        ) : null}
        {activeTab === 'Team Analyzer' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Medias de habilidades de la plantilla</Text>
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
                    .map(player => ({player, rating: getPlayerPositionEstimate(player, group.key)}))
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 3)
                    .map(({player, rating}, index) => (
                      <Text key={player.id} style={styles.rankingPlayer}>{index + 1}. {player.name} · {rating.toFixed(1)}★</Text>
                    ))}
                </View>
              ))}
            </> : <Text style={styles.empty}>Todavía no hay datos cargados</Text>}
          </View>
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
  caption: {marginTop: 9, color: '#758995', fontSize: 12},
  sectorCard: {marginTop: 14, padding: 14, borderRadius: 10, backgroundColor: '#f6f8f9'},
  sectorGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
  sectorRow: {width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingRight: 16},
  picker: {marginTop: 12, padding: 14, borderRadius: 10, backgroundColor: '#f6f8f9'},
  summary: {marginTop: 10, padding: 14, borderRadius: 9, backgroundColor: '#f3f7f9'},
  summaryLabel: {fontSize: 11, color: '#718591'},
  summaryValue: {marginTop: 3, fontSize: 15, color: '#19384b', fontWeight: '700'},
  empty: {marginTop: 22, padding: 20, textAlign: 'center', color: '#8295a0', backgroundColor: '#f5f8fa', borderRadius: 10, overflow: 'hidden'},
  hrfInput: {height: 140, marginTop: 16, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: '#dbe4e9', borderRadius: 8, color: '#19384b', backgroundColor: '#fafcfd', textAlignVertical: 'top'},
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
