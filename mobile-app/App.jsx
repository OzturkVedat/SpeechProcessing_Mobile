import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import TranscribeModal from "./modals/TranscribeModal";
import SpeechRecogModal from "./modals/SpeechRecogModal";

const App = () => {
  const [transcribeVisible, setTranscribeVisible] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(false);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <View style={styles.container}>
          <Button mode="contained" onPress={() => setTranscribeVisible(true)} style={styles.button}>
            Transcribe
          </Button>
          <TranscribeModal visible={transcribeVisible} onDismiss={() => setTranscribeVisible(false)} />

          <Button mode="contained" onPress={() => setSpeechVisible(true)} style={styles.button}>
            Real-time Speech Recognition
          </Button>
          <SpeechRecogModal visible={speechVisible} onDismiss={() => setSpeechVisible(false)} />
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    justifyContent: "center",
    marginTop: 100,
  },
  button: {
    alignSelf: "center",
    marginBottom: 20,
    width: "80%",
    maxWidth: 400,
  },
});

export default App;
