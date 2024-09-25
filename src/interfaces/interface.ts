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

export type TCropperRef = {
  getCroppedArea: () => TCropResult;
};

export type TUseVideoEditorStateProps = Readonly<{
  filePath: string;
  duration: number;
  boomerangDurationMs?: number;
  cropperRef: React.RefObject<TCropperRef>;
}>;
