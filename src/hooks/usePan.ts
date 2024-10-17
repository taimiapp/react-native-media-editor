import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { TUsePan } from '../interfaces/interface';

export const usePan = ({
  recalculateCropPosition,
  scale,
  translateX,
  translateY,
  onCropAreaChange,
  getCroppedArea,
}: TUsePan) => {
  const ctxX = useSharedValue(0);
  const ctxY = useSharedValue(0);
  const direction: SharedValue<'x' | 'y' | undefined> =
    useSharedValue(undefined);

  const proceedEnd = useCallback(() => {
    const cropArea = getCroppedArea();
    onCropAreaChange?.({ ...cropArea, direction: direction.value });
  }, [direction.value, getCroppedArea, onCropAreaChange]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      ctxX.value = translateX.value;
      ctxY.value = translateY.value;
    })

    .onUpdate((e) => {
      const newX = ctxX.value + e.translationX;
      const newY = ctxY.value + e.translationY;
      const requestedPosition = {
        x: newX,
        y: newY,
      };
      recalculateCropPosition(requestedPosition, scale.value, {
        x: translateX,
        y: translateY,
        direction,
      });
    })
    .onEnd(() => {
      runOnJS(proceedEnd)();
    });

  return useMemo(() => ({ panGesture }), [panGesture]);
};
