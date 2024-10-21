import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MaskedView from '@react-native-masked-view/masked-view';
import { View } from 'react-native';
import { forwardRef, useImperativeHandle } from 'react';
import type { ForwardedRef, RefAttributes, ComponentType } from 'react';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import type {
  TCropperRef,
  TMediaCropperProps,
} from '../../interfaces/interface';
import { useStateValues } from '../../hooks/useStateValues';
import { useTranslateValues } from '../../hooks/useTranslateValues';
import { useRecalculateCropPosition } from '../../hooks/useRecalculateCropPosition';
import { useStartScaling } from '../../hooks/useStartScaling';
import { useInitialScale } from '../../hooks/useInitialScale';
import { useGenerateCroppedMedia } from '../../hooks/useGenerateCroppedMedia';
import { usePan } from '../../hooks/usePan';

import styles from './styles';

const MediaCropper = (
  { children, onCropAreaChange, renderCropOverlay }: TMediaCropperProps,
  ref: ForwardedRef<TCropperRef>
): JSX.Element => {
  const {
    nativeImgSize,
    setImgSize,
    imageData,
    onSetImageLayout,
    containerData,
    onSetContainerLayout,
    mediaSize,
    setMediaSize,
    overlaySize,
  } = useStateValues();

  const { translateX, translateY } = useTranslateValues();
  const recalculateCropPosition = useRecalculateCropPosition({
    imageData,
    overlaySize,
  });

  useStartScaling({ containerData, nativeImgSize, setMediaSize });

  const { scale } = useInitialScale({
    imageData,
    overlaySize,
  });

  const getCroppedArea = useGenerateCroppedMedia({
    translateX,
    imageData,
    translateY,
    nativeImgSize,
    scale,
    overlaySize,
  });

  const { panGesture } = usePan({
    recalculateCropPosition,
    translateX,
    translateY,
    scale,
    imageData,
    onCropAreaChange,
    getCroppedArea,
  });

  useImperativeHandle(ref, () => ({ getCroppedArea }), [getCroppedArea]);

  const animStyle = useAnimatedStyle(
    () =>
      ({
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: scale.value },
        ],
      }) as DefaultStyle,
    []
  );

  const allGestures = Gesture.Simultaneous(panGesture);

  const renderContentContainer = () => (
    <Animated.View style={[styles.mediaContainer, mediaSize, animStyle]}>
      {children(setImgSize, onSetImageLayout)}
    </Animated.View>
  );

  const renderMask = () => (
    <View style={styles.maskContainer}>
      <View
        style={[
          {
            height: overlaySize.height,
            width: overlaySize.width,
          },
          styles.mask,
        ]}
      />
    </View>
  );

  const renderOverlay = () => {
    if (typeof renderCropOverlay !== 'function') {
      return null;
    }
    return (
      <View style={styles.containerOverlay}>
        <View
          style={[
            {
              height: overlaySize.height,
              width: overlaySize.width,
            },
          ]}
        >
          {renderCropOverlay()}
        </View>
      </View>
    );
  };

  return (
    <GestureDetector gesture={allGestures}>
      <View style={styles.gestureDetectorWrap} onLayout={onSetContainerLayout}>
        <MaskedView style={styles.container} maskElement={renderMask()}>
          {renderContentContainer()}
          {renderOverlay()}
        </MaskedView>
      </View>
    </GestureDetector>
  );
};

export default forwardRef(MediaCropper) as ComponentType<
  TMediaCropperProps & RefAttributes<TCropperRef>
>;
