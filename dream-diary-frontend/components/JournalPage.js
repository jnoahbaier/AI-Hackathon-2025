import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigate } from 'react-router-native';
import HeaderBar from './HeaderBar';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3001';

export default function JournalPage() {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDreams = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/dreams`);
        const data = await res.json();
        const completed = (data.dreams || []).filter(
          (d) =>
            d.processedData && d.comicImages && d.comicImages.images?.length > 0
        );
        setDreams(completed);
      } catch (err) {
        console.error('Failed to fetch dreams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDreams();
  }, []);

  return (
    <View style={styles.wrapper}>
      <HeaderBar
        title='Journal'
        onLeftPress={() => navigate('/')}
        onRightPress={() => navigate('/')}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size='large' color='#7C9DBD' />
          <Text style={{ marginTop: 10 }}>Loading your dreams...</Text>
        </View>
      ) : dreams.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: '#555', fontSize: 16 }}>No dreams found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {dreams.map((dream, idx) => (
            <View key={idx} style={styles.entry}>
              <Text style={styles.title}>
                {dream.title || 'Untitled Dream'}
              </Text>
              <Text style={styles.date}>
                {new Date(dream.createdAt).toLocaleString()}
              </Text>
              {dream.processedData?.summary && (
                <Text style={styles.summary}>
                  "{dream.processedData.summary}"
                </Text>
              )}
              <View style={styles.imageGrid}>
                {dream.comicImages.images
                  .filter((img) => !img.failed)
                  .map((img, i) => (
                    <Image
                      key={i}
                      source={{
                        uri: `${BASE_URL}/images/dream_${dream.id}_scene_${img.scene_sequence}.png`,
                      }}
                      style={styles.image}
                      resizeMode='cover'
                    />
                  ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: 'white',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  entry: {
    marginBottom: 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F4858',
  },
  date: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  summary: {
    fontStyle: 'italic',
    color: '#444',
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  image: {
    width: '32%', // roughly 3 images per row with spacing
    aspectRatio: 4 / 3, // maintains a slightly wider aspect
    marginBottom: 10,
    borderRadius: 1,
    borderWidth: 2,
    borderColor: 'black',
  },
});
