import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Text, Dimensions } from "react-native";
import { Button, Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";

const App = () => {
  const [transcription, setTranscription] = useState("");
  const [metadata, setMetadata] = useState(null); // file metadata
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    try {
      console.log("Starting file selection...");
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
      });
      console.log("File selection result:", result);

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLoading(true);

        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        });
        console.log("Uploading file to the server...");

        const response = await axios.post("http://192.168.1.101:8000/fwhisper/transcribe", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        console.log("Response from server:", response.data);

        if (response.data && response.data.transcription) {
          setTranscription(response.data.transcription);
          setMetadata({
            fileName: response.data.file_name,
            duration: response.data.duration,
            language: response.data.language,
            languageProb: response.data.language_prob,
          });
        } else {
          console.error("Unexpected response:", response.data);
          alert("Failed to retrieve transcription. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An error occurred while uploading the file. Please check your network connection and try again.");
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
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <View style={styles.container}>
          <Button mode="contained" onPress={handleUpload} loading={loading} disabled={loading} style={styles.button}>
            {loading ? "Uploading..." : "Upload Audio"}
          </Button>

          <View style={styles.metadataContainer}>
            {metadata && (
              <>
                <Text style={styles.metadataText}>File: {metadata.fileName}</Text>
                <Text style={styles.metadataText}>Duration: {formatTime(metadata.duration)}</Text>
                <Text style={styles.metadataText}>
                  Language: {metadata.language} (Probability: {metadata.languageProb.toFixed(2)})
                </Text>
              </>
            )}
          </View>

          <View style={styles.transcriptionContainer}>
            {transcription ? (
              <ScrollView contentContainerStyle={styles.scrollView}>
                <Text style={styles.timestampHeader}>Transcription:</Text>
                {transcription.map((segment, index) => (
                  <Text key={index} style={styles.timestamp}>
                    {`[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}]: ${segment.text}`}
                  </Text>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.placeholder}>{loading ? "Transcribing audio..." : "Transcription will appear here"}</Text>
            )}
          </View>
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
  metadataContainer: {
    marginBottom: 20,
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
  transcriptionContainer: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 10,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  scrollView: {
    paddingBottom: 20,
  },
  placeholder: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: "gray",
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
});

export default App;
