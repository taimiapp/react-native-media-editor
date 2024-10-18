import { useCallback } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { TUseRecalculateCropPosition } from '../interfaces/interface';
import { restrictPosition } from '../utils/worklets';

export const useRecalculateCropPosition = ({
  imageData,
  overlaySize,
}: TUseRecalculateCropPosition) => {
  return useCallback(
    (
      requestedPosition: { x: number; y: number },
      scaling: number,
      {
        x,
        y,
        direction,
      }: {
        x: SharedValue<number>;
        y: SharedValue<number>;
        direction: SharedValue<'x' | 'y' | undefined>;
      }
    ) => {
      'worklet';

      const newCropPosition = restrictPosition(
        requestedPosition,
        {
          width: imageData.width,
          height: imageData.height,
        },
        { height: overlaySize.height, width: overlaySize.width },
        scaling,
        0
      );

      if (newCropPosition.x !== x.value && newCropPosition.y === y.value) {
        direction.value = 'x';
      } else if (
        newCropPosition.y !== y.value &&
        newCropPosition.x === x.value
      ) {
        direction.value = 'y';
      }

      x.value = newCropPosition.x;
      y.value = newCropPosition.y;
    },

    [imageData.height, imageData.width, overlaySize.height, overlaySize.width]
  );
};
