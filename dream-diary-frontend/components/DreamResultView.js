import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  Platform,
} from 'react-native';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3001';

export default function DreamResultView({ images }) {
  const scrollRef = useRef(null);
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const [aspectRatios, setAspectRatios] = useState({});

  // Bounce animation for scroll hint
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Load image sizes on mount
  useEffect(() => {
    images.forEach((img) => {
      const uri = `${BASE_URL}/images/${img.filename}`;
      Image.getSize(
        uri,
        (width, height) => {
          setAspectRatios((prev) => ({
            ...prev,
            [img.filename]: width / height,
          }));
        },
        (error) => {
          console.error('Failed to get image size:', error);
        }
      );
    });
  }, [images]);

  const scrollToImages = () => {
    scrollRef.current?.scrollTo({ y: 300, animated: true });
  };

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Dream Created!</Text>
        <TouchableOpacity onPress={scrollToImages}>
          <Animated.Text
            style={[
              styles.scrollHint,
              {
                transform: [{ translateY: bounceAnim }],
              },
            ]}
          >
            ↓ Scroll down
          </Animated.Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imagesContainer}>
        {images.map((img, index) => {
          const ratio = aspectRatios[img.filename] || 1;

          return (
            <Image
              key={index}
              source={{ uri: `${BASE_URL}/images/${img.filename}` }}
              style={[styles.image, { aspectRatio: ratio }]}
              resizeMode='contain'
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7C9DBD',
  },
  scrollHint: {
    fontSize: 18,
    marginTop: 10,
    color: '#7C9DBD',
  },
  imagesContainer: {
    width: '100%',
    alignItems: 'center',
  },
  image: {
    height: '50%',
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'black',
  },
});
