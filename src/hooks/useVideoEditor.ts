import { NativeModules } from 'react-native';
import { useCallback, useMemo } from 'react';

const { VideoEditor } = NativeModules;


export const useVideoEditorState = () => {
  const runAction = useCallback(() => {
    VideoEditor.createThumbnails();
  }, []);

  return useMemo(() => ({ runAction }), [runAction]);
};
