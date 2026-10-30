import React, {useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';

type Tab = 'Plantilla' | 'Alineación' | 'Team Analyzer';
type Formation = '3-5-2' | '4-4-2' | '4-5-1' | '5-3-2' | '3-4-3';
type Tactic = 'Normal' | 'Ataque por el centro' | 'Ataque por las bandas' | 'Contraataques' | 'Presionar';

const tabs: Tab[] = ['Plantilla', 'Alineación', 'Team Analyzer'];
const formations: Formation[] = ['3-5-2', '4-4-2', '4-5-1', '5-3-2', '3-4-3'];
const tactics: Tactic[] = ['Normal', 'Ataque por el centro', 'Ataque por las bandas', 'Contraataques', 'Presionar'];

function formationRows(formation: Formation): string[][] {
  const [defenders, midfielders, forwards] = formation.split('-').map(Number);
  const line = (count: number, role: string) => Array.from({length: count}, (_, i) => `${role} ${i + 1}`);
  return [line(forwards, 'Delantero'), line(midfielders, 'Centrocampista'), line(defenders, 'Defensa'), ['Portero']];
}

function Choice({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) {
  return (
    <Text accessibilityRole="button" onPress={onPress} style={[styles.choice, selected && styles.choiceActive]}>
      {label}
    </Text>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Alineación');
  const [formation, setFormation] = useState<Formation>('3-5-2');
  const [tactic, setTactic] = useState<Tactic>('Normal');
  const rows = formationRows(formation);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.sidebar}>
        <Text style={styles.brand}>HO</Text>
        <Text style={styles.club}>HATTRICK ORGANIZER</Text>
        {tabs.map(tab => (
          <Text accessibilityRole="button" key={tab} onPress={() => setActiveTab(tab)} style={[styles.navItem, activeTab === tab && styles.navActive]}>
            {tab}
          </Text>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>HATTRICK ORGANIZER · PROTOTIPO NATIVO</Text>
        <Text style={styles.title}>{activeTab}</Text>
        {activeTab === 'Alineación' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Esquema de juego</Text>
              <Text style={styles.muted}>Elige una formación para preparar el once. La conexión con los jugadores del club está pendiente.</Text>
              <View style={styles.choices}>{formations.map(item => <Choice key={item} label={item} selected={formation === item} onPress={() => setFormation(item)} />)}</View>
              <Text style={styles.sectionTitle}>Vista del campo · {formation}</Text>
              <View style={styles.pitch}>
                {rows.map((row, index) => (
                  <View key={`${formation}-${index}`} style={styles.row}>
                    {row.map(player => <View key={player} style={styles.position}><Text style={styles.positionDot}>●</Text><Text style={styles.positionText}>{player}</Text></View>)}
                  </View>
                ))}
              </View>
              <Text style={styles.caption}>Portero + {formation.split('-').reduce((a, b) => a + Number(b), 0)} jugadores de campo</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Órdenes del equipo</Text>
              <Text style={styles.muted}>Selecciona un planteamiento para este partido.</Text>
              <View style={styles.choices}>{tactics.map(item => <Choice key={item} label={item} selected={tactic === item} onPress={() => setTactic(item)} />)}</View>
              <View style={styles.summary}><Text style={styles.summaryLabel}>Planteamiento actual</Text><Text style={styles.summaryValue}>{formation} · {tactic}</Text></View>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{activeTab}</Text>
            <Text style={styles.muted}>La importación de plantilla y las valoraciones del motor original todavía no están conectadas a esta interfaz.</Text>
            <Text style={styles.empty}>Carga de datos de equipo pendiente</Text>
          </View>
        )}
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
  sectionTitle: {marginTop: 12, marginBottom: 10, color: '#19384b', fontSize: 15, fontWeight: '700'},
  pitch: {paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#e9f3ed', borderWidth: 1, borderColor: '#d6e8dc'},
  row: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 54},
  position: {minWidth: 100, alignItems: 'center', marginHorizontal: 5},
  positionDot: {color: '#267550', fontSize: 17},
  positionText: {marginTop: 3, color: '#35584a', fontSize: 11},
  caption: {marginTop: 9, color: '#758995', fontSize: 12},
  summary: {marginTop: 10, padding: 14, borderRadius: 9, backgroundColor: '#f3f7f9'},
  summaryLabel: {fontSize: 11, color: '#718591'},
  summaryValue: {marginTop: 3, fontSize: 15, color: '#19384b', fontWeight: '700'},
  empty: {marginTop: 28, padding: 20, textAlign: 'center', color: '#8295a0', backgroundColor: '#f5f8fa', borderRadius: 10, overflow: 'hidden'},
});
