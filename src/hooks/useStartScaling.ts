import type { TUseStartScalingParams } from '../interfaces/interface';
import { useCallback, useEffect } from 'react';

export const useStartScaling = ({
  containerData,
  nativeImgSize,
  setMediaSize,
}: TUseStartScalingParams) => {
  const getObjectFit = useCallback(() => {
    const containerAspect = containerData.width / containerData.height;
    const naturalWidth = nativeImgSize.width || 0;
    const naturalHeight = nativeImgSize.height || 0;
    const mediaAspect = naturalWidth / naturalHeight;

    return mediaAspect < containerAspect
      ? 'horizontal-cover'
      : 'vertical-cover';
  }, [
    containerData.height,
    containerData.width,
    nativeImgSize.height,
    nativeImgSize.width,
  ]);

  const scaleToImage = useCallback(() => {
    const imageRatio = nativeImgSize.width / nativeImgSize.height;
    const containerRatio = containerData.width / containerData.height; // SNAPPER_WIDTH / SNAPPER_HEIGHT;

    let renderedMediaSize;
    const objectFit = getObjectFit();

    if (objectFit === 'horizontal-cover') {
      renderedMediaSize = {
        width: containerData.width,
        height: containerData.width / imageRatio,
      };
    } else if (objectFit === 'vertical-cover') {
      renderedMediaSize = {
        width: containerData.height * imageRatio,
        height: containerData.height,
      };
    } else {
      renderedMediaSize =
        containerRatio > imageRatio
          ? {
              width: containerData.height * imageRatio,
              height: containerData.height,
            }
          : {
              width: containerData.width,
              height: containerData.width / imageRatio,
            };
    }
    setMediaSize(renderedMediaSize);
  }, [
    containerData.height,
    containerData.width,
    getObjectFit,
    nativeImgSize.height,
    nativeImgSize.width,
    setMediaSize,
  ]);

  useEffect(() => {
    if (!nativeImgSize.width || !containerData.width) {
      return;
    }
    scaleToImage();
  }, [containerData.width, nativeImgSize.width, scaleToImage]);
};
