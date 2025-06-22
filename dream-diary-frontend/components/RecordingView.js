import React from 'react';
import {
  Animated,
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';

export default function RecordingView({ recordingUIOpacity, onPress }) {
  return (
    <Animated.View style={[styles.overlay, { opacity: recordingUIOpacity }]}>
      <View style={styles.centeredColumn}>
        {/* You can add waveform or 'Recording...' text here */}
        <TouchableOpacity onPress={onPress}>
          <Image
            source={require('../assets/Recording.png')}
            style={styles.recordButton}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredColumn: {
    alignItems: 'center',
    paddingTop: 400,
  },
  recordButton: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
});
