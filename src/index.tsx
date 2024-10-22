import hooks from './hooks';
import components from './components';
import type {
  TCropperRef,
  TMediaCropperProps,
  TCropResult,
} from './interfaces/interface';

export const useVideoEditorState = hooks.useVideoEditorState;
export const MediaCropper = components.MediaCropper;

export type { TCropperRef, TMediaCropperProps, TCropResult };

export default { useVideoEditorState, MediaCropper };
