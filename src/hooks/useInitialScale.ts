import { useCallback, useEffect, useMemo } from 'react';
import { runOnUI, useSharedValue } from 'react-native-reanimated';

import type { TSize, TUsePinchParams } from '../interfaces/interface';

export const useInitialScale = ({
  imageData,
  overlaySize,
}: TUsePinchParams) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const initStartCropValues = useCallback(
    (overlay: TSize, image: TSize) => {
      'worklet';

      if (!overlay.height || !overlay.width || !image.height || !image.width)
        return;
      const heightZoomLimit = overlay.height / image.height;
      const widthZoomLimit = overlay.width / image.width;
      const maxZoom = Math.max(heightZoomLimit, widthZoomLimit);
      scale.value = maxZoom;
      savedScale.value = maxZoom;
    },
    [savedScale, scale]
  );

  const scaleCropOverlayToContainer = useCallback(() => {
    runOnUI(initStartCropValues)(overlaySize, imageData);
  }, [initStartCropValues, overlaySize, imageData]);

  useEffect(scaleCropOverlayToContainer, [scaleCropOverlayToContainer]);

  return useMemo(() => ({ scale }), [scale]);
};
