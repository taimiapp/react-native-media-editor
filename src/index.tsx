import hooks from './hooks';
import components from './components';
import types from './interfaces';

export const useVideoEditorState = hooks.useVideoEditorState;
export const MediaCropper = components.MediaCropper;

export default { useVideoEditorState, MediaCropper, ...types };
