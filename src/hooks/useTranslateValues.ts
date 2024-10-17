import { useSharedValue } from 'react-native-reanimated';
import { useMemo } from 'react';

export const useTranslateValues = () => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  return useMemo(() => ({ translateX, translateY }), [translateX, translateY]);
};
