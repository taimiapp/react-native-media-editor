import hooks from './hooks';
import components from './components';
import type { TCropperRef } from './interfaces/interface';

export const useVideoEditorState = hooks.useVideoEditorState;
export const MediaCropper = components.MediaCropper;

export type { TCropperRef };

export default { useVideoEditorState, MediaCropper };
