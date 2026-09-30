import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 16, gap: 12 },
  intro: { fontSize: 12.5, lineHeight: 18 },

  statRow: { flexDirection: 'row', gap: 8 },
  statCell: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '900' },
  statLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 13.5, paddingVertical: 0 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6 },

  card: { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, padding: 13, gap: 9 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mac: { fontSize: 13.5, fontWeight: '900', letterSpacing: 0.4 },
  deviceName: { fontSize: 11.5, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaTxt: { fontSize: 11.5 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 9 },
  primaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, flex: 1, justifyContent: 'center' },
  primaryActionTxt: { fontSize: 12.5, fontWeight: '800' },
  iconAction: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(242,56,56,0.4)', alignItems: 'center', justifyContent: 'center' },

  empty: { borderRadius: 14, borderWidth: 1, alignItems: 'center', paddingVertical: 26, gap: 10 },
  emptyTitle: { fontSize: 13.5, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  emptyBtnTxt: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  fieldLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  deleteMsg: { fontSize: 14, lineHeight: 20 },
})
