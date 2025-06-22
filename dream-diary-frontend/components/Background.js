import React from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function Background({
  isRecording,
  defaultBgOpacity,
  recordingBgOpacity,
  swirlBlurOpacity,
}) {
  return (
    <>
      <Animated.Image
        source={require('../assets/Default background 2.png')}
        style={[styles.swirlImage, { opacity: defaultBgOpacity }]}
      />
      <Animated.Image
        source={require('../assets/Voice visual.png')}
        style={[styles.swirlImage, { opacity: recordingBgOpacity }]}
      />
      {!isRecording && (
        <Animated.Image
          source={require('../assets/Default background 2.png')}
          style={[styles.swirlImage, { opacity: swirlBlurOpacity }]}
          blurRadius={2}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  swirlImage: {
    position: 'absolute',
    top: height * 0.18,
    left: width * 0.5,
    width: 325,
    height: 325,
    transform: [{ translateX: -162.5 }],
    resizeMode: 'contain',
  },
});
