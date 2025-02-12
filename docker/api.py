import os
import logging
import aiofiles
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import RedirectResponse, FileResponse

from googletrans import Translator
from faster_whisper import WhisperModel, BatchedInferencePipeline

from gtts import gTTS
import langid

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

model_size = "tiny"  # switch to small for better accuracy (and slower inference)
logging.info(
    f"Loading Whisper model: size={model_size}, device=cuda, compute_type=float16"
)

fw_model = WhisperModel(model_size, device="cuda")
batched_model = BatchedInferencePipeline(model=fw_model)

translator = Translator()

app = FastAPI()


@app.post("/gtts/text-to-speech")
async def text_to_speech(
    text: str = Form(...), background_tasks: BackgroundTasks = BackgroundTasks()
):
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    MAX_TEXT_LENGTH = 1000
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Text is too long. Maximum allowed length is {MAX_TEXT_LENGTH} characters.",
        )
    temp_audio_path = f"temp{text[:3]}.mp3"
    try:
        logging.info(f"Received text for TTS: {text[:50]}...")

        lang, _ = langid.classify(text)  # auto-detect language of text
        logging.info(f"Detected language: {lang}")

        tts = gTTS(text=text, lang=lang)

        tts.save(temp_audio_path)
        logging.info(f"Saved generated speech to temporary file: {temp_audio_path}")

        background_tasks.add_task(
            delete_temp_file, temp_audio_path
        )  # add file deletion as background task

        return FileResponse(
            temp_audio_path,
            media_type="audio/mpeg",
            filename=os.path.basename(temp_audio_path),
        )

    except Exception as ex:
        logging.error(f"Error during TTS conversion: {ex}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during TTS conversion: {str(ex)}",
        )


def delete_temp_file(file_path: str):
    if os.path.exists(file_path):
        logging.info(f"Deleting temporary file: {file_path}")
        os.remove(file_path)


@app.post("/fwhisper/translate")
async def speech_recog_and_translate(
    file: UploadFile = File(...), target_lang: str = Form("en")
):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Please upload an audio file."
        )

    logging.info(f"Received target_lang: {target_lang}")
    supported_languages = ["en", "es", "fr", "de", "tr"]
    if target_lang not in supported_languages:
        raise HTTPException(status_code=400, detail="Unsupported target language.")

    temp_audio = f"temp_{file.filename}"
    try:
        logging.info(f"Saving uploaded file to {temp_audio}")
        async with aiofiles.open(temp_audio, "wb") as f:
            await f.write(await file.read())

        logging.info("Starting transcription...")
        segments, info = batched_model.transcribe(
            temp_audio, batch_size=8, beam_size=1
        )  # Greedy approach, saves time
        logging.info(
            f"Transcription completed. Detected language: {info.language} (Probability: {info.language_probability})"
        )
        if not segments:
            raise HTTPException(status_code=400, detail="No speech detected in audio.")

        transcription = " ".join(segment.text for segment in segments)
        logging.info(f"Transcription assembled successfully: {transcription[:50]}...")

        logging.info(f"Translating transcription to {target_lang}...")

        try:
            translation = await translator.translate(transcription, dest=target_lang)
        except Exception as ex:
            raise HTTPException(
                status_code=400, detail=f"Translation failed. Error:{str(ex)}"
            )
        logging.info("Translation completed successfully")

        return {
            "file_name": file.filename,
            "transcription": transcription,
            "language": info.language,
            "language_prob": info.language_probability,
            "translation": translation.text,
            "target_language": target_lang,
            "duration": info.duration,
        }
    except Exception as ex:
        logging.error(f"Error during processing: {ex}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"An error occurred during processing: {str(ex)}"
        )
    finally:
        # clean temp file
        if os.path.exists(temp_audio):
            logging.info(f"Deleting temporary file: {temp_audio}")
            os.remove(temp_audio)


@app.post("/fwhisper/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    logging.info(f"Received file: {file.filename}")
    temp_audio = f"temp_{file.filename}"
    try:
        logging.info(f"Saving uploaded file to {temp_audio}")
        async with aiofiles.open(temp_audio, "wb") as f:
            await f.write(await file.read())

        logging.info("Starting transcription...")
        segments, info = batched_model.transcribe(
            temp_audio, batch_size=8, word_timestamps=True, beam_size=1
        )
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


@app.get("/", response_class=RedirectResponse)
async def redirect_to_docs():
    logging.info("Redirecting to /docs")
    return "/docs"


if __name__ == "__main__":
    import uvicorn

    logging.info("Starting FastAPI server...")
    uvicorn.run(app, host="192.168.1.39", port=8000)
