import type { SharedValue } from 'react-native-reanimated';

export type TPoint = {
  x: number;
  y: number;
};

export type TSize = { width: number; height: number };

export type TCropResult = {
  croppedAreaPercentages: TSize & TPoint;
  croppedAreaPixels: TSize & TPoint;
  direction?: 'x' | 'y';
};

// @TODO add proper ref type when cropper is unified and moved into the lib
export type TCropperRef = {
  getCroppedArea: () => TCropResult;
};

export type TUseVideoEditorStateProps = Readonly<{
  filePath: string;
  duration: number;
  boomerangDurationMs?: number;
  cropperRef: React.RefObject<TCropperRef>;
}>;

export type TMediaSize = {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

export type TUseRecalculateCropPosition = {
  imageData: TSize;
  overlaySize: TSize;
};

export type TUseGenerateCroppedMedia = {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  imageData: TSize;
  scale: SharedValue<number>;
  nativeImgSize: TSize;
  overlaySize: TSize;
};

export type TRecalculateCropPosition = (
  requestedPosition: { x: number; y: number },
  scaling: number,
  {
    x,
    y,
  }: {
    x: SharedValue<number>;
    y: SharedValue<number>;
    direction: SharedValue<'x' | 'y' | undefined>;
  }
) => void;

export type TUsePan = {
  imageData: TSize;
  scale: SharedValue<number>;
  recalculateCropPosition: TRecalculateCropPosition;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  onCropAreaChange?: (params: TCropResult) => void;
  getCroppedArea: () => TCropResult;
};

export type TUsePinchParams = { imageData: TSize; overlaySize: TSize };

export type TSetSize = (params: { width: number; height: number }) => void;

export type TUseStartScalingParams = {
  containerData: TSize;
  nativeImgSize: TSize;
  setMediaSize: TSetSize;
};
