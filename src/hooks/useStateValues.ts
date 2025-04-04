import { runOnJS, runOnUI, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import type { LayoutRectangle } from 'react-native/Libraries/Types/CoreEventTypes';
import type {
  TSize,
  TUseGenerateCroppedMedia,
  TUsePan,
  TUsePinchParams,
  TUseRecalculateCropPosition,
  TUseStartScalingParams,
} from '../interfaces/interface';
import { computeCroppedArea, restrictPosition } from '../utils/worklets';

export const useStateValues = () => {
  const [nativeImgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [imageData, setImageData] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [containerData, setContainerData] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const handleSetLayout = useCallback(
    (layout: LayoutRectangle) => {
      setImageData({
        x: layout.x,
        y: layout.y,
        height: layout.height,
        width: layout.width,
      });
    },
    [setImageData]
  );

  const handleSetContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const data = event.nativeEvent.layout;
      if (data.width <= 0 || data.height <= 0) {
        return;
      }
      setContainerData({
        x: data.x,
        y: data.y,
        height: data.height,
        width: data.width,
      });
      const aspectDiff = data.width / data.height;

      // if width is bigger than container we need to reaspect by factor so height and width in container bounds
      const resizeFactor = aspectDiff / 0.6;

      const resH = data.height * resizeFactor;
      const resW = data.width * (0.6 / aspectDiff) * resizeFactor;
      setOverlaySize({
        height: resH,
        width: resW,
      });
    },
    [setContainerData]
  );
  return useMemo(
    () => ({
      nativeImgSize,
      setImgSize,
      imageData,
      onSetImageLayout: handleSetLayout,
      containerData,
      onSetContainerLayout: handleSetContainerLayout,
      mediaSize,
      setMediaSize,
      overlaySize,
    }),
    [
      overlaySize,
      containerData,
      handleSetContainerLayout,
      handleSetLayout,
      imageData,
      mediaSize,
      nativeImgSize,
    ]
  );
};

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
  const direction = useSharedValue<'x' | 'y' | undefined>(undefined);

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

export const useTranslateValues = () => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  return useMemo(() => ({ translateX, translateY }), [translateX, translateY]);
};

export const useRecalculateCropPosition = ({
  imageData,
  overlaySize,
}: TUseRecalculateCropPosition) => {
  const recalculateCropPosition = useCallback(
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

  return recalculateCropPosition;
};

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
