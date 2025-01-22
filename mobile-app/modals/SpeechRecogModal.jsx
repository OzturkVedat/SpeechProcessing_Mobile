import React, { useState, useEffect, useRef } from "react";
import { Dialog, Portal, Button, Text, Menu, TouchableRipple } from "react-native-paper";
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
          return;
        } else {
          console.log("Audio permission granted");
        }
      } catch (error) {
        console.error("Permissions not granted:", error);
        setError("An error occurred while requesting permissions.");
      }
    };
    getPermissions();
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setIsRecording(true);
      recording.current = new Audio.Recording(); // refresh

      await recording.current.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.current.startAsync();
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Error starting recording.");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      console.log("Recording stopped, file URI:", uri);
      await sendAudioToAPI(uri);
    } catch (error) {
      console.error("Error stopping recording:", error);
      setError("Error stopping recording.");
    } finally {
      recording.current = null;
    }
  };

  const sendAudioToAPI = async (uri) => {
    try {
      setIsProcessing(true);
      console.log("Selected target language:", targetLang);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        const fileName = uri.split("/").pop(); // Extract file name from URI
        const fileType = `audio/${fileName.split(".").pop()}`; // Infer MIME type from file extension
        const formData = new FormData();
        formData.append("file", {
          uri,
          name: fileName,
          type: fileType,
        });
        formData.append("target_lang", targetLang);
        console.log("Form Data being sent:", formData);

        // Call the API endpoint
        const response = await axios.post(`${API_URL}/fwhisper/translate`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const { transcription, translation } = response.data;
        setTranscription(transcription);
        setTranslation(translation);

        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log("Temporary audio file deleted successfully.");
        } catch (deleteError) {
          console.error("Error deleting temporary audio file:", deleteError);
        }
      } else {
        console.error("Audio file does not exist at the specified URI");
        setError("Audio file does not exist at the specified URI.");
      }
    } catch (error) {
      console.error("Error sending audio to API:", error);
      setError("Error processing audio.");
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialogCont}>
        <Dialog.Title>Speech Recognition & Translation</Dialog.Title>
        <Dialog.Content>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <ScrollView style={styles.scrollView}>
            <View style={styles.menuContainer}>
              <Text>Select Target Language:</Text>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableRipple onPress={() => setMenuVisible(true)}>
                    <View style={styles.menuButton}>
                      <Text>{targetLang}</Text>
                    </View>
                  </TouchableRipple>
                }
              >
                <Menu.Item onPress={() => setTargetLang("en")} title="English" />
                <Menu.Item onPress={() => setTargetLang("es")} title="Spanish" />
                <Menu.Item onPress={() => setTargetLang("fr")} title="French" />
                <Menu.Item onPress={() => setTargetLang("de")} title="German" />
                <Menu.Item onPress={() => setTargetLang("tr")} title="Turkish" />
              </Menu>
            </View>
            {isProcessing ? (
              <Text>Processing...</Text>
            ) : (
              <>
                <Text style={styles.transcriptionHeader}>Transcription:</Text>
                <Text style={styles.transcriptionText}>{transcription}</Text>

                <Text style={styles.transcriptionHeader}>Translation:</Text>
                <Text style={styles.transcriptionText}>{translation}</Text>
              </>
            )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
          {!isRecording ? <Button onPress={startRecording}>Start Recording</Button> : <Button onPress={stopRecording}>Stop Recording</Button>}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 20,
    alignSelf: "center",
    width: "80%",
    maxWidth: 400,
  },
  scrollView: {
    maxHeight: 200,
    marginVertical: 10,
  },
  dialogCont: {
    width: width * 0.9,
    height: height * 0.7,
  },
  transcriptionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#444",
  },
  transcriptionText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 5,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
});

export default SpeechRecogModal;
