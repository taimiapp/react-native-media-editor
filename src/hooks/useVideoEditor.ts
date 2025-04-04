import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import type {
  TCropResult,
  TUseVideoEditorStateProps,
} from '../interfaces/interface';
import {
  calculateCurrentTime,
  formatTime,
  isAndroid,
  isIOS,
} from '../utils/helpers';

const { VideoEditor } = NativeModules;

export const DEFAULT_BOOMERANG_DURATION = 1;

export const useVideoEditorState = ({
  filePath,
  duration,
  cropperRef,
  boomerangDurationMs,
}: TUseVideoEditorStateProps) => {
  const [thumbnail, setThumbnail] = useState([]);
  const [uri, setUri] = useState('');
  const [loading, setLoading] = useState(true);

  const currentTime = useSharedValue(0);
  const currentURI = useSharedValue(filePath);
  const isPaused = useSharedValue(!isAndroid);
  const scrollContentWidth = useRef(0);
  const isDragging = useRef(false);
  const isCreatingBoomerang = useRef(false);

  const boomerangDuration =
    typeof boomerangDurationMs === 'number'
      ? boomerangDurationMs / 1000
      : DEFAULT_BOOMERANG_DURATION;

  const currentTimeRef = useRef(0);

  const maxTimeAtEndOfScroll = duration - boomerangDuration;

  const createThumbnail = useCallback(
    async (cropPos?: TCropResult) => {
      try {
        const cropPosition =
          cropPos?.croppedAreaPixels ||
          cropperRef.current?.getCroppedArea()?.croppedAreaPixels;
        const position = { ...cropPosition };
        let result;
        if (position.width) {
          result = await VideoEditor.createThumbnails(
            filePath,
            duration,
            position,
            boomerangDuration
          );
        } else {
          result = await VideoEditor.createThumbnails(
            filePath,
            duration,
            {},
            boomerangDuration
          );
        }
        setThumbnail(result);
      } catch (error) {
        // TODO handle error
      }
    },
    [boomerangDuration, cropperRef, duration, filePath]
  );

  const handleEndPan = useCallback(
    (cropPos: TCropResult) => {
      createThumbnail(cropPos);
    },
    [createThumbnail]
  );

  const createBoomerang = useCallback(
    async (cropPos?: TCropResult) => {
      setLoading(true);
      isCreatingBoomerang.current = true;
      try {
        const startTime =
          duration <= boomerangDuration ? '0.0' : formatTime(currentTime.value);
        const cropPosition = cropPos?.croppedAreaPixels;
        const position = { ...cropPosition };
        let boomerangVideoPath;
        if (position.width) {
          boomerangVideoPath = await NativeModules.VideoEditor.makeBoomerang(
            filePath,
            startTime,
            position,
            boomerangDuration
          );
        } else {
          boomerangVideoPath = await NativeModules.VideoEditor.makeBoomerang(
            filePath,
            startTime,
            {},
            boomerangDuration
          );
        }

        setUri(boomerangVideoPath);

        currentURI.value = boomerangVideoPath;
        isPaused.value = false;
        setLoading(false);
        currentTimeRef.current = currentTime.value;
        isCreatingBoomerang.current = false;

        return boomerangVideoPath;
      } catch (error) {
        setLoading(false);
      }
    },
    [
      boomerangDuration,
      currentTime.value,
      currentURI,
      duration,
      filePath,
      isPaused,
    ]
  );

  useEffect(() => {
    createBoomerang();

    return () => {
      // VideoEditor.clearVideoCache();
    };
  }, [createBoomerang]);

  const onContentSizeChange = (contentWidth: number) => {
    scrollContentWidth.current = contentWidth;
  };

  useEffect(() => {
    createThumbnail();
  }, [createThumbnail]);

  const onScroll = ({
    nativeEvent,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isDragging.current) {
      return;
    }

    if (currentTime.value === currentTimeRef.current) {
      setFilePath();
    }

    currentTime.value = calculateCurrentTime({
      contentOffsetX: nativeEvent.contentOffset.x,
      maxTimeAtEndOfScroll,
      scrollContentWidth: scrollContentWidth.current,
    });

    isPaused.value = true;
  };

  const videoProps = useAnimatedProps(() => ({
    currentTime: isPaused.value ? currentTime.value : undefined,
    seek: isAndroid && isPaused.value ? currentTime.value : undefined,
    paused: isPaused.value,
    repeat: !isPaused.value,
  }));

  const setFilePath = () => setUri(filePath);

  const onScrollBeginDrag = () => {
    isDragging.current = true;
    isCreatingBoomerang.current = false;
  };

  const onTouchEnd = () => {
    isDragging.current = false;

    if (
      duration <= boomerangDuration ||
      currentTime.value === currentTimeRef.current ||
      isCreatingBoomerang.current
    ) {
      return;
    }

    if (isIOS) {
      createBoomerang();
    }
  };

  const onMomentumScrollEnd = useCallback(() => {
    if (isDragging.current && isIOS) {
      return;
    }

    if (
      duration <= boomerangDuration ||
      currentTime.value === currentTimeRef.current ||
      isCreatingBoomerang.current
    ) {
      return;
    }

    createBoomerang();
  }, [boomerangDuration, createBoomerang, currentTime.value, duration]);

  return {
    uri,
    thumbnail,
    loading,
    videoProps,
    onScroll,
    onContentSizeChange,
    createBoomerang,
    createThumbnail,
    onCropAreaChange: handleEndPan,
    onTouchEnd,
    onScrollBeginDrag,
    onMomentumScrollEnd,
  };
};
