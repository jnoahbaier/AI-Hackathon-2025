import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
export default function DreamResultView({ images }) {
  const scrollRef = useRef(null);
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const startBounce = () => {
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
  };

  const scrollToImages = () => {
    scrollRef.current?.scrollTo({ y: 300, animated: true });
  };

  React.useEffect(() => {
    startBounce();
  }, []);

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
        {images.map((img, index) => (
          <Image
            key={index}
            source={{ uri: img.image_url || img.local_path || img.path }}
            style={styles.image}
            resizeMode='contain'
          />
        ))}
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
    paddingBottom: 60,
  },
  image: {
    width: '90%',
    height: 250,
    marginVertical: 20,
    borderRadius: 10,
  },
});
