import { Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const isAndroid = Platform.OS === 'android';

export const isIOS = Platform.OS === 'ios';

export const calculateCurrentTime = ({
  maxTimeAtEndOfScroll,
  scrollContentWidth,
  contentOffsetX,
}: {
  maxTimeAtEndOfScroll: number;
  scrollContentWidth: number;
  contentOffsetX: number;
}) => {
  const maxScrollableWidth = scrollContentWidth - width;
  const scrollFraction = contentOffsetX / maxScrollableWidth;
  return scrollFraction * maxTimeAtEndOfScroll;
};

export const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${[hours, minutes, remainingSeconds].map((val) => (val < 10 ? `0${val}` : val)).join(':')}.${
    milliseconds < 100 ? '0' : ''
  }${milliseconds < 10 ? '0' : ''}${milliseconds}`;
};
