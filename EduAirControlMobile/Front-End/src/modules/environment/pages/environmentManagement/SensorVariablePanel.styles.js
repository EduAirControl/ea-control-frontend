import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: { paddingTop: 4, gap: 12 },

  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  addBtnTxt: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCell: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  summaryValue: { fontSize: 17, fontWeight: '900' },
  summaryLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 13.5, paddingVertical: 0 },

  filterLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: -2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6 },

  sensorCard: { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, padding: 13 },
  sensorTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sensorIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sensorId: { fontSize: 13.5, fontWeight: '900' },
  sensorSync: { fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },

  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.18)', paddingTop: 10 },
  sensorCell: { width: '50%', paddingVertical: 5 },
  cellLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cellValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  sensorActions: { flexDirection: 'row', marginTop: 8, borderTopWidth: 1, paddingTop: 8, gap: 16 },
  sensorActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sensorActionTxt: { fontSize: 12, fontWeight: '700' },

  empty: { borderRadius: 14, borderWidth: 1, alignItems: 'center', paddingVertical: 26, gap: 10 },
  emptyTitle: { fontSize: 13.5, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  emptyBtnTxt: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  variablesCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 4 },
  varChip: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9, width: '100%' },
  varChipTitle: { fontSize: 12.5, fontWeight: '800' },
  varChipSub: { fontSize: 11, marginTop: 1 },

  modalHint: { fontSize: 12.5, marginBottom: 6 },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  rangeRow: { flexDirection: 'row', gap: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
})
