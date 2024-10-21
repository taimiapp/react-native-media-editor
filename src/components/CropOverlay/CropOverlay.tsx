import { View } from 'react-native';

import styles from './styles';

const gridElementsCount = 9;

const getBorderStyle = (index: number) => {
  switch (index) {
    case 0:
      return styles.topLeft;
    case 2:
      return styles.topRight;
    case 6:
      return styles.bottomLeft;
    case 8:
      return styles.bottomRight;
    default:
      return null;
  }
};

const getBorderless = (index: number) => {
  switch (index) {
    case 1:
      return styles.borderlessX;
    case 4:
      return [styles.borderlessY, styles.borderlessX];
    case 3:
    case 5:
      return styles.borderlessY;
    case 7:
      return styles.borderlessX;
    default:
      return null;
  }
};

const elements = new Array(gridElementsCount)
  .fill(0)
  .map((val, index) => (
    <View
      key={`${index + val}`}
      style={[styles.gridItem, getBorderStyle(index), getBorderless(index)]}
    />
  ));

const CropOverlay = () => <View style={styles.container}>{elements}</View>;

export default CropOverlay;
