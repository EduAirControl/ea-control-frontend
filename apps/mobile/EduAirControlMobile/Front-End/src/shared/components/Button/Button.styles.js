import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
  },
  leftIcon: { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
})
