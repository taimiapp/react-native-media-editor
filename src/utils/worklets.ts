import type { TMediaSize, TPoint, TSize } from '../interfaces/interface';

export const getRadianAngle = (degreeValue: number) => {
  'worklet';

  return (degreeValue * Math.PI) / 180;
};

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export const rotateSize = (width: number, height: number, rotation: number) => {
  'worklet';

  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export const clamp = (value: number, min: number, max: number) => {
  'worklet';

  return Math.min(Math.max(value, min), max);
};

export const restrictPositionCoord = (
  position: number,
  mediaSize: number,
  cropSize: number,
  zoom: number
) => {
  'worklet';

  const maxPosition = (mediaSize * zoom) / 2 - cropSize / 2;
  return clamp(position, -maxPosition, maxPosition);
};

export const restrictPosition = (
  position: TPoint,
  mediaSize: TSize,
  cropSize: TSize,
  zoom: number,
  rotation = 0
) => {
  'worklet';

  const { width: w, height: h } = rotateSize(
    mediaSize.width,
    mediaSize.height,
    rotation
  );

  return {
    x: restrictPositionCoord(position.x, w, cropSize.width, zoom),
    y: restrictPositionCoord(position.y, h, cropSize.height, zoom),
  };
};

const limitArea = (max: number, value: number) => {
  'worklet';

  return Math.min(max, Math.max(0, value));
};

export const computeCroppedArea = (
  crop: TPoint,
  mediaSize: TMediaSize,
  cropSize: TSize,
  aspect: number,
  zoom: number,
  rotation = 0
) => {
  'worklet';

  const limitAreaFn = limitArea;

  const mediaBBoxSize = rotateSize(mediaSize.width, mediaSize.height, rotation);
  const mediaNaturalBBoxSize = rotateSize(
    mediaSize.naturalWidth,
    mediaSize.naturalHeight,
    rotation
  );

  const croppedAreaPercentages = {
    x: limitAreaFn(
      100,
      (((mediaBBoxSize.width - cropSize.width / zoom) / 2 - crop.x / zoom) /
        mediaBBoxSize.width) *
        100
    ),
    y: limitAreaFn(
      100,
      (((mediaBBoxSize.height - cropSize.height / zoom) / 2 - crop.y / zoom) /
        mediaBBoxSize.height) *
        100
    ),
    width: limitAreaFn(
      100,
      ((cropSize.width / mediaBBoxSize.width) * 100) / zoom
    ),
    height: limitAreaFn(
      100,
      ((cropSize.height / mediaBBoxSize.height) * 100) / zoom
    ),
  };

  // we compute the pixels size naively
  const widthInPixels = Math.round(
    limitAreaFn(
      mediaNaturalBBoxSize.width,
      (croppedAreaPercentages.width * mediaNaturalBBoxSize.width) / 100
    )
  );
  const heightInPixels = Math.round(
    limitAreaFn(
      mediaNaturalBBoxSize.height,
      (croppedAreaPercentages.height * mediaNaturalBBoxSize.height) / 100
    )
  );
  const isImgWiderThanHigh =
    mediaNaturalBBoxSize.width >= mediaNaturalBBoxSize.height * aspect;

  // then we ensure the width and height exactly match the aspect (to avoid rounding approximations)
  // if the media is wider than high, when zoom is 0, the crop height will be equals to image height
  // thus we want to compute the width from the height and aspect for accuracy.
  // Otherwise, we compute the height from width and aspect.
  const sizePixels = isImgWiderThanHigh
    ? {
        width: Math.round(heightInPixels * aspect),
        height: heightInPixels,
      }
    : {
        width: widthInPixels,
        height: Math.round(widthInPixels / aspect),
      };

  const croppedAreaPixels = {
    ...sizePixels,
    x: Math.round(
      limitAreaFn(
        mediaNaturalBBoxSize.width - sizePixels.width,
        (croppedAreaPercentages.x * mediaNaturalBBoxSize.width) / 100
      )
    ),
    y: Math.round(
      limitAreaFn(
        mediaNaturalBBoxSize.height - sizePixels.height,
        (croppedAreaPercentages.y * mediaNaturalBBoxSize.height) / 100
      )
    ),
  };

  return { croppedAreaPercentages, croppedAreaPixels };
};
