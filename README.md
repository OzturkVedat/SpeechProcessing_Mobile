# FastAPI Speech Recognition Microservice

## Overview

This project is designed to provide efficient audio transcription through a simple REST API, using Faster-Whisper model and FastAPI.

## Features

- **REST API**: Easy to interact with via http requests.
- **Accurate Recognitions**: Used small version of Faster-Whisper to balance speed/accuracy.
- **Dockerized**: Dockerfile for easy deployment.
  
## Requirements

- Docker Engine
- CUDA supported hardware with GPU (CPU is ignored in this project, as it can yield slow responses)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/OzturkVedat/SpeechRecognition_Microservice.git
   cd SpeechRecognition_Microservice
   ```

2. Build the Docker image:

    ```bash
    docker build -t speech-recog-img .
    ```

3. Run the Docker container:

    ```bash
    docker run --gpus all -p 8000:8000 speech-recog-img
    ```
    Wait for microservice to initialize, it can take a few minutes. FYI, you can check the container's logs within Docker Desktop to supervise the process.
     
4. Access the API:
   Open your browser and go to http://localhost:8000/ to view the API Documentation(SwaggerUI).
   
## Usage

To use the API for audio transcription, send a post request via /transcibe endpoint with the audio file. The API will return the transcription result in JSON format. Response time can vary depending on the system, particulary GPU.

### Project Structure

```bash
SpeechRecognition_Microservice/
├── .gitignore
├── Dockerfile             # For dockerizing the app to be a microservice
├── README.md
├── main.py                # Contains main app code for API and model
└── requirements.txt       # Used to add dependencies inside docker image

```

## Contributing
Feel free to open issues or submit pull requests for improvements.
