import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { NativeRouter, Routes, Route } from 'react-router-native';
import { StatusBar } from 'expo-status-bar';
import Background from './components/Background';
import RecordDream from './components/RecordDream';
import RecordingView from './components/RecordingView';
import DreamProcessingView from './components/DreamProccessingView';
import HeaderBar from './components/HeaderBar';
import DreamResultView from './components/DreamResultView';
import JournalPage from './components/JournalPage';
import HomeScreen from './components/HomeScreen';

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

  return (
    <NativeRouter>
      <View style={styles.container}>
        <StatusBar style='light' />
        <Background
          isRecording={isRecording}
          defaultBgOpacity={defaultBgOpacity}
          recordingBgOpacity={recordingBgOpacity}
          swirlBlurOpacity={swirlBlurOpacity}
        />
        <Routes>
          <Route
            path='/'
            element={
              <HomeScreen
                {...{
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
                  images,
                }}
              />
            }
          />
          <Route path='/journal' element={<JournalPage />} />
        </Routes>
      </View>
    </NativeRouter>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});
