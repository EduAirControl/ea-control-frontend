import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  content: { padding: 16, gap: 12 },
  intro: { fontSize: 12.5, lineHeight: 18 },

  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },

  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deviceIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  deviceMac: { fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  deviceName: { fontSize: 11.5, marginTop: 2 },

  // Selector de ambiente destino
  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  selectValue: { flex: 1, fontSize: 14, fontWeight: '600' },
  envList: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', maxHeight: 200 },
  envRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  envName: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  envCode: { fontSize: 11.5, marginLeft: 8 },
  envEmpty: { fontSize: 12, fontStyle: 'italic', padding: 12, textAlign: 'center' },
  warn: { fontSize: 11.5, lineHeight: 16 },

  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontSize: 13.5, fontWeight: '800', marginLeft: 8, flexShrink: 1 },
  hint: { fontSize: 11, lineHeight: 16, marginTop: 2 },

  successText: { fontSize: 12.5, lineHeight: 18 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  linkTxt: { fontSize: 13, fontWeight: '800' },

  logCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  logTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  logClear: { fontSize: 11.5, fontWeight: '800' },
  logEmpty: { fontSize: 11.5, fontStyle: 'italic' },
  logLine: { flexDirection: 'row', gap: 8 },
  logIndex: { fontSize: 11, fontWeight: '700', width: 18 },
  logMsg: { fontSize: 11.5, flex: 1, lineHeight: 16 },
})
