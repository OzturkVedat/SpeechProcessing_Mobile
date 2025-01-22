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
  const [metadata, setMetadata] = useState(null);
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

        if (response.data?.transcription) {
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

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}min ${Math.floor(seconds % 60)}sec`;
  const formatTimestamp = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialogContainer}>
        <Dialog.Title>Transcription</Dialog.Title>
        <Dialog.Content>
          {loading ? (
            <Text style={styles.loadingText}>Transcribing audio...</Text>
          ) : (
            <View>
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
                  <Text style={styles.sectionHeader}>Transcription:</Text>
                  {transcription.map((segment, index) => (
                    <Text key={index} style={styles.transcriptionText}>
                      [{formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}]: {segment.text}
                    </Text>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.placeholderText}>No transcription available</Text>
              )}
            </View>
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
    maxHeight: height * 0.9,
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  button: {
    marginVertical: 16,
    alignSelf: "center",
    width: "90%",
    maxWidth: 400,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
  },
  scrollView: {
    maxHeight: height * 0.5,
    marginTop: 16,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
    color: "#444",
  },
  transcriptionText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  metadataContainer: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
  },
  metadataText: {
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    textAlign: "center",
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
});

export default TranscribeModal;
