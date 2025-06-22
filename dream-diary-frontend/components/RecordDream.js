import React from 'react';
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';

export default function RecordDream({
  mainUIOpacity,
  textOpacity,
  buttonOpacity,
  buttonTranslateY,
  onPress,
}) {
  return (
    <Animated.View style={[styles.overlay, { opacity: mainUIOpacity }]}>
      <View style={styles.centeredColumn}>
        <Animated.Text style={[styles.mainText, { opacity: textOpacity }]}>
          What did you dream about?
        </Animated.Text>
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonTranslateY }],
            },
          ]}
        >
          <TouchableOpacity onPress={onPress}>
            <Image
              source={require('../assets/Record Button.png')}
              style={styles.recordButton}
            />
          </TouchableOpacity>
        </Animated.View>
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
    justifyContent: 'center',
    paddingTop: 175,
  },
  mainText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7C9DBD',
    textAlign: 'center',
    marginBottom: 225,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  recordButton: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
});
