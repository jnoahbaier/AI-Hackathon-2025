import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Platform } from 'react-native';
import axios from 'axios';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3001';

export default function JournalPage() {
  const [dreams, setDreams] = useState([]);

  useEffect(() => {
    const fetchDreams = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/dreams`);
        setDreams(res.data.dreams || []);
      } catch (err) {
        console.error('Failed to fetch dreams:', err);
      }
    };

    fetchDreams();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dream Journal</Text>
      {dreams.map((dream, index) => (
        <View key={index} style={styles.entry}>
          <Text style={styles.entryTitle}>
            {dream.title || 'Untitled Dream'}
          </Text>
          <Text style={styles.entrySummary}>
            {dream.processedData?.summary || 'No summary available.'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C9DBD',
    marginBottom: 20,
    textAlign: 'center',
  },
  entry: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#7C9DBD',
    borderRadius: 10,
    backgroundColor: '#f8faff',
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#345',
  },
  entrySummary: {
    fontSize: 14,
    color: '#555',
  },
});
