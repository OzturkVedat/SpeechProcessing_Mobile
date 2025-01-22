import React, { useState } from "react";
import { Dialog, Portal, Button, Text } from "react-native-paper";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";

const API_URL = Constants.expoConfig.extra.API_URL;

const { width, height } = Dimensions.get("window");

const TranscribeModal = ({ visible, onDismiss }) => {
  const [transcription, setTranscription] = useState("");
  const [metadata, setMetadata] = useState(null); // file metadata
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLoading(true);

        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        });

        const response = await axios.post(`${API_URL}/fwhisper/transcribe`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.transcription) {
          setTranscription(response.data.transcription);
          setMetadata({
            fileName: response.data.file_name,
            duration: response.data.duration,
            language: response.data.language,
            languageProb: response.data.language_prob,
          });
        } else {
          alert("Failed to retrieve transcription. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}min ${secs}sec`;
  };

  const formatTimestamp = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialogContainer}>
        <Dialog.Title>Transcription</Dialog.Title>
        <Dialog.Content>
          {loading ? (
            <Text>Transcribing audio...</Text>
          ) : (
            <>
              <Button mode="contained" onPress={handleUpload} disabled={loading} style={styles.button}>
                Upload Audio
              </Button>

              {transcription ? (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                  {metadata && (
                    <View style={styles.metadataContainer}>
                      <Text style={styles.metadataText}>File: {metadata.fileName}</Text>
                      <Text style={styles.metadataText}>Duration: {formatTime(metadata.duration)}</Text>
                      <Text style={styles.metadataText}>
                        Language: {metadata.language} (Probability: {metadata.languageProb.toFixed(2)})
                      </Text>
                    </View>
                  )}
                  <Text style={styles.timestampHeader}>Transcription:</Text>
                  {transcription.map((segment, index) => (
                    <Text key={index} style={styles.timestamp}>
                      {`[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}]: ${segment.text}`}
                    </Text>
                  ))}
                </ScrollView>
              ) : (
                <Text>No transcription available</Text>
              )}
            </>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialogContainer: {
    width: width * 0.9,
    height: height * 0.7,
    alignSelf: "center",
    borderRadius: 10,
  },
  button: {
    marginTop: 20,
    alignSelf: "center",
    width: "90%",
    maxWidth: 400,
  },
  scrollView: {
    maxHeight: height * 0.7,
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  timestampHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#444",
  },
  timestamp: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  metadataContainer: {
    marginTop: 10,
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 8,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  metadataText: {
    fontSize: 16,
    color: "#333",
  },
});

export default TranscribeModal;
