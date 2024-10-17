import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent, LayoutRectangle } from 'react-native';

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
