import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
  },

  gridItem: {
    width: '33.33333333%',
    height: '33.3333333%',
    borderWidth: 1,
    borderColor: 'white',
  },
  bottomRight: {
    borderBottomRightRadius: 16,
  },
  bottomLeft: {
    borderBottomLeftRadius: 16,
  },
  topLeft: {
    borderTopLeftRadius: 16,
  },
  topRight: {
    borderTopRightRadius: 16,
  },
  borderlessY: {
    borderBottomWidth: 0,
    borderTopWidth: 0,
  },
  borderlessX: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
});
