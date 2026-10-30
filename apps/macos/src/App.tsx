import React, {useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';

type Tab = 'Plantilla' | 'Alineación' | 'Team Analyzer';
const tabs: Tab[] = ['Plantilla', 'Alineación', 'Team Analyzer'];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Alineación');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.sidebar}>
        <Text style={styles.brand}>HO</Text>
        <Text style={styles.club}>ALIKANTE C.F.</Text>
        {tabs.map(tab => (
          <Text
            accessibilityRole="button"
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.navItem, activeTab === tab && styles.navActive]}>
            {tab}
          </Text>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>HATTRICK ORGANIZER</Text>
        <Text style={styles.title}>{activeTab}</Text>
        {activeTab === 'Alineación' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preparar partido</Text>
            <Text style={styles.muted}>Selecciona un rival para comparar ratings y probar una formación.</Text>
            <Text style={styles.empty}>Todavía no hay datos cargados</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{activeTab}</Text>
            <Text style={styles.muted}>Los datos de equipo aparecerán aquí al conectar o importar tu club.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, flexDirection: 'row', backgroundColor: '#f5f7f9'},
  sidebar: {width: 230, padding: 24, backgroundColor: '#102b3f'},
  brand: {fontSize: 34, fontWeight: '800', color: '#fff'},
  club: {marginTop: 8, marginBottom: 40, color: '#a9c1d0', fontSize: 12},
  navItem: {paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6, color: '#d5e0e7', borderRadius: 8, overflow: 'hidden'},
  navActive: {backgroundColor: '#1e526f', color: '#fff'},
  content: {padding: 48, width: '100%', maxWidth: 1100},
  eyebrow: {fontSize: 11, letterSpacing: 1.5, color: '#507084', fontWeight: '700'},
  title: {marginTop: 8, marginBottom: 28, fontSize: 32, fontWeight: '700', color: '#142d3d'},
  card: {padding: 24, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e7eb'},
  cardTitle: {fontSize: 19, fontWeight: '700', color: '#19384b'},
  muted: {marginTop: 8, color: '#617785', fontSize: 14},
  empty: {marginTop: 36, padding: 24, textAlign: 'center', color: '#8295a0', backgroundColor: '#f5f8fa', borderRadius: 10, overflow: 'hidden'},
});
