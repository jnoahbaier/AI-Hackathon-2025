import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function HeaderBar({ onLeftPress, onRightPress, title = '' }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onLeftPress} style={styles.button}>
        <Image
          source={require('../assets/Book button.png')}
          style={styles.bookButton}
        />
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity onPress={onRightPress} style={styles.button}>
        <Image
          source={require('../assets/Scroll Arrow.png')}
          style={styles.bookButton}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    color: '#7C9DBD',
    fontWeight: '600',
  },
  bookButton: {
    padding: 8,
    width: 50,
    height: 50,
  },
});
