import React, { useState, useEffect, useRef } from "react";
import { Dialog, Portal, Button, Text } from "react-native-paper";
import { StyleSheet, ScrollView } from "react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";

const SpeechRecogModal = ({ visible, onDismiss }) => {
  const [transcription, setTranscription] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const audioRecorder = useRef(new AudioRecorderPlayer()).current;
  const socketRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      stopStreaming(); // cleanup when modal is closed
    }
  }, [visible]);

  const startStreaming = async () => {
    try {
      const socket = new WebSocket("ws://192.168.1.101:8000/fwhisper/speech-recognition");

      socket.onopen = () => {
        console.log("Websocket connected.");
        setIsStreaming(true);
      };

      socket.onmessage = (event) => {
        setTranscription((prev) => [...prev, event.data]);
      };

      socket.onerror = (err) => {
        console.error("Ws error:", err);
        setError("Error in Ws connection. Please try again.");
      };

      socket.onclose = () => {
        console.log("Websocket closed");
        setIsStreaming(false);
      };

      socketRef.current = socket;
      if (audioRecorder) {
        await audioRecorder.startRecorder();
      } else {
        console.error("Audio recorder is not initialized");
      }
      audioRecorder.addRecordBackListener((e) => {
        const chunk = e.data;
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(chunk);
        }
      });
    } catch (err) {
      console.error("Failed to start streaming:", err);
      setError("Failed to start streaming. Please check your network and try again.");
    }
  };

  const stopStreaming = async () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsStreaming(false);

    await audioRecorder.stopRecorder();
    audioRecorder.removeRecordBackListener();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Real-Time Speech Recognition</Dialog.Title>
        <Dialog.Content>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Button mode="contained" onPress={isStreaming ? stopStreaming : startStreaming} style={styles.button}>
                {isStreaming ? "Stop Streaming" : "Start Streaming"}
              </Button>

              <ScrollView style={styles.scrollView}>
                <Text style={styles.transcriptionHeader}>Transcription:</Text>
                {transcription.map((text, index) => (
                  <Text key={index} style={styles.transcriptionText}>
                    {text}
                  </Text>
                ))}
              </ScrollView>
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
