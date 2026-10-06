import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 10, 18, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  content: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  closeBtn: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10, marginRight: 32, letterSpacing: -0.3 },
  body: { flexShrink: 1 },
})
