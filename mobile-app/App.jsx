import React, { useState } from "react";
import { StyleSheet, View, Dimensions, ImageBackground, Text } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import TranscribeModal from "./modals/TranscribeModal";
import SpeechRecogModal from "./modals/SpeechRecogModal";
import TtsModal from "./modals/TtsModal";

const { width, height } = Dimensions.get("window");

const App = () => {
  const [transcribeVisible, setTranscribeVisible] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(false);
  const [ttsVisible, setTtsVisible] = useState(false);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <View style={styles.container}>
          <ImageBackground source={require("./assets/transcribe.jpeg")} style={styles.imageBackground} imageStyle={styles.imageStyle} onTouchEnd={() => setTranscribeVisible(true)}>
            <View style={styles.labelContainer}>
              <BlurView intensity={100} tint="dark" style={styles.blurView}>
                <Text style={styles.buttonLabel}>Transcribe</Text>
              </BlurView>
            </View>
          </ImageBackground>
          <TranscribeModal visible={transcribeVisible} onDismiss={() => setTranscribeVisible(false)} />

          <ImageBackground source={require("./assets/sr.png")} style={styles.imageBackground} imageStyle={styles.imageStyle} onTouchEnd={() => setSpeechVisible(true)}>
            <View style={styles.labelContainer}>
              <BlurView intensity={100} tint="dark" style={styles.blurView}>
                <Text style={styles.buttonLabel}>Speech Recognition</Text>
              </BlurView>
            </View>
          </ImageBackground>
          <SpeechRecogModal visible={speechVisible} onDismiss={() => setSpeechVisible(false)} />

          <ImageBackground source={require("./assets/tts.png")} style={styles.imageBackground} imageStyle={styles.imageStyle} onTouchEnd={() => setTtsVisible(true)}>
            <View style={styles.labelContainer}>
              <BlurView intensity={100} tint="dark" style={styles.blurView}>
                <Text style={styles.buttonLabel}>Text-to-Speech</Text>
              </BlurView>
            </View>
          </ImageBackground>
          <TtsModal visible={ttsVisible} onDismiss={() => setTtsVisible(false)} />
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    marginTop: 100,
  },
  labelContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end", // Align to the bottom
    width: width * 0.8,
    height: height * 0.2,
  },
  blurView: {
    width: "75%",
    height: "24%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
  },
  buttonLabel: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  imageBackground: {
    marginBottom: 30,
    alignItems: "center",
    justifyContent: "center",
    width: width * 0.8,
    height: height * 0.2,
    alignSelf: "center",
  },
  imageStyle: {
    borderRadius: 10,
  },
});

export default App;
