import torch
import os, logging
from faster_whisper import WhisperModel
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import RedirectResponse

logging.basicConfig(level=logging.INFO)

model_size = "medium"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

fw_model = WhisperModel(model_size, device=DEVICE, compute_type="float16")
app = FastAPI()


@app.post("/fwhisper/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file.filename.endswith((".wav", ".mp3", ".flac", ".m4a")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload an audio file.",
        )

    try:
        temp_audio = f"temp{file.filename}"
        with open(temp_audio, "wb") as f:
            f.write(await file.read())

        segments, info = fw_model.transcribe(temp_audio, beam_size=3)

        transcription = "".join([segment.text for segment in segments])

        return {
            "transcription": transcription,
            "language": info.language,
            "language probability": info.language_probability,
            "duration": info.duration,
        }
    except Exception as ex:
        logging.error(f"Transcription error: {ex}")
        raise HTTPException(
            status_code=500, detail=f"An error occurred during transcription: {str(ex)}"
        )
    finally:
        if os.path.exists(temp_audio):
            os.remove(temp_audio)


@app.get("/", response_class=RedirectResponse)
async def redirect_to_docs():
    return "/docs"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
