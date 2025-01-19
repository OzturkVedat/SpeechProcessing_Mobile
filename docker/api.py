import os
import logging
import aiofiles
import asyncio
from faster_whisper import WhisperModel  # pip install faster_whisper
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import RedirectResponse

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

model_size = "tiny"  # switch to small for better accuracy, but slower inference
logging.info(
    f"Loading Whisper model: size={model_size}, device=cuda, compute_type=float16"
)
fw_model = WhisperModel(model_size, device="cuda")

app = FastAPI()


@app.post("/fwhisper/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    logging.info(f"Received file: {file.filename}")
    temp_audio = f"temp_{file.filename}"
    try:
        logging.info(f"Saving uploaded file to {temp_audio}")
        async with aiofiles.open(temp_audio, "wb") as f:
            await f.write(await file.read())

        file_size = os.path.getsize(temp_audio)
        logging.info(f"Saved file size: {file_size} bytes")

        logging.info("Starting transcription...")
        segments, info = fw_model.transcribe(
            temp_audio, word_timestamps=True, beam_size=1
        )  # Greedy approach, saves time
        logging.info(
            f"Transcription completed. Detected language: {info.language} (Probability: {info.language_probability})"
        )

        transcription = [
            {"start": segment.start, "end": segment.end, "text": segment.text}
            for segment in segments
        ]
        logging.info("Transcription assembled successfully")

        return {
            "file_name": file.filename,
            "transcription": transcription,
            "language": info.language,
            "language_prob": info.language_probability,
            "duration": info.duration,
        }
    except Exception as ex:
        logging.error(f"Error during transcription: {ex}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"An error occurred during transcription: {str(ex)}"
        )
    finally:
        # clean temp file
        if os.path.exists(temp_audio):
            logging.info(f"Deleting temporary file: {temp_audio}")
            os.remove(temp_audio)


@app.websocket("/fwhisper/speech-recognition")
async def ws_realtime_speech_recog(websocket: WebSocket):
    logging.info("Client connected to Websocket")
    await websocket.accept()
    try:
        audio_buffer = b""

        async for message in websocket.iter_bytes():
            audio_buffer += message

            if len(audio_buffer) > 10240:  # process if buffer is large enough(10KB)
                temp_audio = "temp_stream.wav"

                with open(temp_audio, "wb") as f:
                    f.write(audio_buffer)

                segments, _ = fw_model.transcribe(temp_audio, beam_size=1)
                for segment in segments:
                    await websocket.send_text(f"{segment.text}")

                audio_buffer = "b"  # reset buffer
                os.remove(temp_audio)

    except WebSocketDisconnect:
        logging.info("Client disconnected from WebSocket")
    except Exception as e:
        logging.error(f"Error during inference: {e}", exc_info=True)
        await websocket.close()


@app.get("/", response_class=RedirectResponse)
async def redirect_to_docs():
    logging.info("Redirecting to /docs")
    return "/docs"


if __name__ == "__main__":
    import uvicorn

    logging.info("Starting FastAPI server...")
    uvicorn.run(app, host="192.168.1.101", port=8000)
