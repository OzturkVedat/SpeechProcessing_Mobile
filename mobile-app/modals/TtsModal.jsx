import React, { useState } from "react";
import { Dialog, Portal, Button, Text } from "react-native-paper";
import { StyleSheet, Dimensions, TextInput, View } from "react-native";
import axios from "axios";
import Constants from "expo-constants";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

const API_URL = Constants.expoConfig.extra.API_URL;
const { width, height } = Dimensions.get("window");

const TtsModal = ({ visible, onDismiss }) => {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [error, setError] = useState(null);

  const handleTtsRequest = async () => {
    if (!text.trim()) {
      setError("Text cannot be empty");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("text", text);

      const response = await axios.post(`${API_URL}/gtts/text-to-speech`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "arraybuffer",
      });

      const base64audio = btoa(String.fromCharCode(...new Uint8Array(response.data)));
      const tempAudioPath = `${FileSystem.documentDirectory}temp_audio.mp3`;

      await FileSystem.writeAsStringAsync(tempAudioPath, base64audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setAudioUri(tempAudioPath);
    } catch (err) {
      setError("Failed to generate speech.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async () => {
    if (audioUri) {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
      await sound.playAsync();
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Text-to-Speech</Dialog.Title>
        <Dialog.Content>
          <View style={styles.inputContainer}>
            <TextInput value={text} onChangeText={setText} multiline numberOfLines={4} style={styles.textInput} placeholder="Type text here" />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" onPress={handleTtsRequest} loading={isLoading} disabled={isLoading}>
            Convert to Speech
          </Button>
        </Dialog.Actions>
        {audioUri && (
          <Dialog.Content>
            <Button mode="outlined" onPress={playAudio}>
              Play Audio
            </Button>
          </Dialog.Content>
        )}
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 10,
    width: width * 0.9,
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    marginTop: 10,
  },
  textInput: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },
  actions: {
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
});

export default TtsModal;
