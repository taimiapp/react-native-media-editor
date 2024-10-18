import { useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';

export const useTranslateValues = () => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  return useMemo(() => ({ translateX, translateY }), [translateX, translateY]);
};
