import React from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import HeaderBar from './HeaderBar';
import RecordDream from './RecordDream';
import RecordingView from './RecordingView';
import DreamProcessingView from './DreamProccessingView';
import DreamResultView from './DreamResultView';
import { useNavigate } from 'react-router-native';
import { Audio } from 'expo-av';
import axios from 'axios';

const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3001';

export default function HomeScreen(props) {
  const {
    isRecording,
    setIsRecording,
    isComplete,
    setIsComplete,
    isProcessing,
    setIsProcessing,
    setImages,
    recordedAudioPath,
    setRecordedAudioPath,
    recordingRef,
    swirlBlurOpacity,
    textOpacity,
    buttonOpacity,
    buttonTranslateY,
    mainUIOpacity,
    recordingUIOpacity,
    defaultBgOpacity,
    recordingBgOpacity,
  } = props;

  const navigate = useNavigate();

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
            let dreamId = '5f3a9ed2-6d29-4ffa-8c0a-a133e1c9effd'; // placeholder
            const imageRes = await axios.get(
              `${BASE_URL}/api/dreams/${dreamId}`
            );
            setImages(
              imageRes.data.dream.comicImages.generation_metadata.saved_files
            );
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
    <>
      <HeaderBar
        title='Dream Diary'
        onLeftPress={() => navigate('/journal')}
        onRightPress={() => navigate('/')}
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
      {isComplete && <DreamResultView images={props.images} />}
    </>
  );
}
