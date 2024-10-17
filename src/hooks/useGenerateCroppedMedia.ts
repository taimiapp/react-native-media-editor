import { useCallback } from 'react';
import { computeCroppedArea } from '../utils/worklets';
import type { TUseGenerateCroppedMedia } from '../interfaces/interface';

export const useGenerateCroppedMedia = ({
  translateX,
  imageData,
  translateY,
  nativeImgSize,
  scale,
  overlaySize,
}: TUseGenerateCroppedMedia) => {
  const getCroppedArea = useCallback(() => {
    const result = computeCroppedArea(
      { x: translateX.value, y: translateY.value },
      {
        width: imageData.width,
        height: imageData.height,
        naturalWidth: nativeImgSize.width,
        naturalHeight: nativeImgSize.height,
      },
      { width: overlaySize.width, height: overlaySize.height },
      overlaySize.width / overlaySize.height,
      scale.value,
      0
    );
    return result;
  }, [
    imageData.height,
    imageData.width,
    nativeImgSize.height,
    nativeImgSize.width,
    overlaySize.height,
    overlaySize.width,
    scale.value,
    translateX.value,
    translateY.value,
  ]);

  return getCroppedArea;
};
