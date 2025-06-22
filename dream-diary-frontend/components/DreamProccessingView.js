import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function DreamProcessingView() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Creating your dream...</Text>
      <ActivityIndicator size='large' color='#7C9DBD' style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7C9DBD',
    textAlign: 'center',
  },
  spinner: {
    marginTop: 20,
  },
});
