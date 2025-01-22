import React, { useState, useEffect, useRef } from "react";
import { Dialog, Portal, Button, Text, Menu, TouchableRipple, ActivityIndicator } from "react-native-paper";
import { StyleSheet, ScrollView, View, Dimensions } from "react-native";
import Constants from "expo-constants";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import axios from "axios";

const API_URL = Constants.expoConfig.extra.API_URL;
const { width, height } = Dimensions.get("window");

const SpeechRecogModal = ({ visible, onDismiss }) => {
  const [transcription, setTranscription] = useState("");
  const [translation, setTranslation] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetLang, setTargetLang] = useState("tr");
  const [menuVisible, setMenuVisible] = useState(false);
  const [error, setError] = useState(null);

  const recording = useRef(new Audio.Recording());

  useEffect(() => {
    const getPermissions = async () => {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setError("Microphone permission not granted. Please enable it in your device settings.");
        }
      } catch (err) {
        console.error("Error requesting permissions:", err);
        setError("An error occurred while requesting microphone permissions.");
      }
    };
    getPermissions();
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      setIsRecording(true);
      recording.current = new Audio.Recording();

      await recording.current.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.current.startAsync();
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Try again.");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      await sendAudioToAPI(uri);
    } catch (err) {
      console.error("Error stopping recording:", err);
      setError("Failed to stop recording. Try again.");
    } finally {
      recording.current = null;
    }
  };

  const sendAudioToAPI = async (uri) => {
    setIsProcessing(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        const formData = new FormData();
        formData.append("file", {
          uri,
          name: uri.split("/").pop(),
          type: "audio/wav",
        });
        formData.append("target_lang", targetLang);

        const response = await axios.post(`${API_URL}/fwhisper/translate`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setTranscription(response.data.transcription || "No transcription available.");
        setTranslation(response.data.translation || "No translation available.");
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } else {
        throw new Error("File does not exist.");
      }
    } catch (err) {
      console.error("Error processing audio:", err);
      setError("Failed to process the audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Speech Recognition & Translation</Dialog.Title>
        <Dialog.Content>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.languageSelector}>
            <Text style={styles.label}>Target Language:</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableRipple onPress={() => setMenuVisible(true)} style={styles.menuButton}>
                  <Text style={styles.menuText}>{targetLang.toUpperCase()}</Text>
                </TouchableRipple>
              }
            >
              {["en", "es", "fr", "de", "tr"].map((lang) => (
                <Menu.Item key={lang} onPress={() => setTargetLang(lang)} title={lang.toUpperCase()} />
              ))}
            </Menu>
          </View>

          {isProcessing ? (
            <ActivityIndicator animating size="large" style={styles.loader} />
          ) : (
            <ScrollView style={styles.resultContainer}>
              <Text style={styles.resultHeader}>Transcription:</Text>
              <Text style={styles.resultText}>{transcription || "No transcription available."}</Text>

              <Text style={styles.resultHeader}>Translation:</Text>
              <Text style={styles.resultText}>{translation || "No translation available."}</Text>
            </ScrollView>
          )}
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button onPress={onDismiss} mode="outlined">
            Close
          </Button>
          {!isRecording ? (
            <Button onPress={startRecording} mode="contained">
              Start Recording
            </Button>
          ) : (
            <Button onPress={stopRecording} mode="contained">
              Stop Recording
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    width: width * 0.9,
    alignSelf: "center",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginRight: 10,
  },
  menuButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
  },
  menuText: {
    fontSize: 16,
  },
  loader: {
    marginVertical: 20,
  },
  resultContainer: {
    maxHeight: 150,
    marginTop: 10,
  },
  resultHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  resultText: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
  },
  actions: {
    justifyContent: "space-between",
  },
});

export default SpeechRecogModal;
