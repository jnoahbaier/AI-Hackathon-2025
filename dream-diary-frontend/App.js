import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Background from './components/Background';
import RecordDream from './components/RecordDream';
import RecordingView from './components/RecordingView';
import DreamProcessingView from './components/DreamProccessingView';
import HeaderBar from './components/HeaderBar';
import DreamResultView from './components/DreamResultView';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3001';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioPath, setRecordedAudioPath] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState([]);
  const recordingRef = useRef(null);

  const swirlBlurOpacity = useRef(new Animated.Value(0.1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(50)).current;
  const mainUIOpacity = useRef(new Animated.Value(1)).current;
  const recordingUIOpacity = useRef(new Animated.Value(0)).current;
  const defaultBgOpacity = useRef(new Animated.Value(1)).current;
  const recordingBgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(swirlBlurOpacity, {
        toValue: 0.25,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(buttonTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRecordPress = async () => {
    if (!isRecording) {
      try {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          alert('Permission to access microphone is required!');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );

        recordingRef.current = recording;
        setIsRecording(true);

        Animated.parallel([
          Animated.timing(defaultBgOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(recordingBgOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(mainUIOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(recordingUIOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      try {
        const recording = recordingRef.current;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecordedAudioPath(uri);

        Animated.parallel([
          Animated.timing(recordingBgOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(recordingUIOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(async () => {
          setIsRecording(false);
          setIsProcessing(true);

          try {
            // Step 1: Upload audio
            const formData = new FormData();

            if (Platform.OS === 'web') {
              const blob = await fetch(uri).then((res) => res.blob());
              formData.append(
                'audio',
                new File([blob], 'dream.m4a', { type: 'audio/m4a' })
              );
            } else {
              formData.append('audio', {
                uri,
                name: 'dream.m4a',
                type: 'audio/m4a', // Use m4a, not x-m4a
              });
            }

            let dreamId;
            try {
              const uploadRes = await axios.post(
                `${BASE_URL}/api/dreams/upload`,
                formData,
                {
                  headers: { 'Content-Type': 'multipart/form-data' },
                }
              );

              console.log('Upload response:', uploadRes.data);
              dreamId = uploadRes.data?.dream?.id;
              console.log('dream:', uploadRes.data.dream);
              if (!dreamId) {
                throw new Error('Dream not returned from upload response');
              }
            } catch (uploadErr) {
              console.error(
                'Upload failed:',
                uploadErr.response?.data || uploadErr.message
              );
              throw new Error('Dream upload failed');
            }
            // dreamId = '5f3a9ed2-6d29-4ffa-8c0a-a133e1c9effd';
            // Step 2: Transcribe
            await axios.post(`${BASE_URL}/api/dreams/${dreamId}/transcribe`);

            // Step 3: Process dream
            await axios.post(`${BASE_URL}/api/dreams/${dreamId}/process`);

            // Step 4: Generate images
            const imageRes = await axios.post(
              `${BASE_URL}/api/dreams/${dreamId}/generate-images`
            );
            // const imageRes = await axios.get(
            //   `${BASE_URL}/api/dreams/${dreamId}`
            // );
            // console.log(imageRes.data);
            // console.log(
            //   'images',
            //   imageRes.data.dream.comicImages.generation_metadata.saved_files
            // );
            // setImages(
            //   imageRes.data.dream.comicImages.generation_metadata.saved_files
            // );
            console.log('images', imageRes.data.saved_files);
            setImages(imageRes.data.saved_files);
            setIsProcessing(false);
            setIsComplete(true);
          } catch (apiError) {
            console.error(
              'API error:',
              apiError.response?.data || apiError.message || apiError
            );
            setIsProcessing(false);
            alert('Something went wrong while creating your dream.');
          }
        });
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style='light' />
      <Background
        isRecording={isRecording}
        defaultBgOpacity={defaultBgOpacity}
        recordingBgOpacity={recordingBgOpacity}
        swirlBlurOpacity={swirlBlurOpacity}
      />
      <HeaderBar
        title='Dream Diary'
        onLeftPress={() => console.log('Left button tapped')}
        onRightPress={() => console.log('Home button tapped')}
      />
      {!isRecording && !isComplete && !isProcessing && (
        <RecordDream
          mainUIOpacity={mainUIOpacity}
          textOpacity={textOpacity}
          buttonOpacity={buttonOpacity}
          buttonTranslateY={buttonTranslateY}
          onPress={handleRecordPress}
        />
      )}
      {isRecording && !isComplete && (
        <RecordingView
          recordingUIOpacity={recordingUIOpacity}
          onPress={handleRecordPress}
        />
      )}
      {isProcessing && !isComplete && <DreamProcessingView />}
      {isComplete && <DreamResultView images={images} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});
