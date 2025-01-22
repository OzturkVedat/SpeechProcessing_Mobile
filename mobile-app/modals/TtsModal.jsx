import React, { useState } from "react";
import { Dialog, Portal, Button, Text } from "react-native-paper";
import { StyleSheet, Dimensions, TextInput, View } from "react-native";
import axios from "axios";
import Constants from "expo-constants";
import { Audio } from "expo-av";

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
        responseType: "blob", // Important to handle binary data
      });
      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });

      const audioUri = URL.createObjectURL(audioBlob);
      setAudioUri(audioUri);
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
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Text-to-Speech</Dialog.Title>
        <Dialog.Content>
          <View style={styles.inputWrapper}>
            <TextInput label="Enter Text" value={text} onChangeText={setText} multiline numberOfLines={4} style={styles.textInput} placeholder="Type text here" />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" onPress={handleTtsRequest} loading={isLoading} disabled={isLoading}>
            Convert to Speech
          </Button>
        </Dialog.Actions>
        {audioUri && (
          <Dialog.Content>
            <Button onPress={playAudio}>Play Audio</Button>
          </Dialog.Content>
        )}
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    width: width - 40,
    marginBottom: 10,
  },
  textInput: {
    width: "100%",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "white",
    borderRadius: 4,
    elevation: 2,
  },
  errorText: {
    color: "red",
    marginTop: 10,
    fontSize: 12,
  },
});

export default TtsModal;
