# OCR Service

A lightweight Node.js OCR service utilizing [chrome-lens-ocr](https://www.npmjs.com/package/chrome-lens-ocr), [Express](https://expressjs.com/), and [Multer](https://www.npmjs.com/package/multer), providing a free alternative to Google Cloud Lens API..

## Table of Contents

- [About the Project](#about-the-project)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [POST /upload](#post-upload)
  - [GET /scan](#get-scan)
- [Docker Deployment](#docker-deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About the Project

This service provides Optical Character Recognition (OCR) capabilities through two endpoints:

- `POST /upload`: Accepts image file uploads and returns the extracted text.
- `GET /scan`: Fetches an image from a provided URL and returns the extracted text.

## Built With

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Multer](https://www.npmjs.com/package/multer)
- [chrome-lens-ocr](https://www.npmjs.com/package/chrome-lens-ocr)

## Getting Started

To set up the project locally, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Docker](https://www.docker.com/get-started) (optional, for containerized deployment)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/dgbkn/lens_api_chromium_docker.git
   ```


2. **Navigate to the project directory:**

   ```bash
   cd lens_api_chromium_docker
   ```


3. **Install dependencies:**

   ```bash
   npm install
   ```


4. **Start the server:**

   ```bash
   npm start
   ```


   The server will run on `http://localhost:3000`.

## Usage

### POST /upload

Endpoint to upload an image file for OCR processing.

- **URL:** `http://localhost:3000/upload`
- **Method:** `POST`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** Form-data with a key `image` containing the image file.

**Example using cURL:**


```bash
curl -X POST -F "image=@path_to_your_image.png" http://localhost:3000/upload
```


**Response:**


```json
{
  "text": "Extracted text from the image",
  "confidence": 0.98,
  "words": [
    {
      "word": "Extracted",
      "boundingBox": [x1, y1, x2, y2],
      "confidence": 0.99
    },
    ...
  ]
}
```


### GET /scan

Endpoint to fetch an image from a URL and perform OCR.

- **URL:** `http://localhost:3000/scan?url=IMAGE_URL`
- **Method:** `GET`
- **Query Parameter:**
  - `url`: The URL of the image to be processed.

**Example using cURL:**


```bash
curl "http://localhost:3000/scan?url=https://example.com/image.png"
```


**Response:**


```json
{
  "text": "Extracted text from the image",
  "confidence": 0.97,
  "words": [
    {
      "word": "Extracted",
      "boundingBox": [x1, y1, x2, y2],
      "confidence": 0.98
    },
    ...
  ]
}
```


## Docker Deployment

To deploy the service using Docker:

1. **Build the Docker image:**

   ```bash
   docker build -t ocr-service .
   ```


2. **Run the Docker container:**

   ```bash
   docker run -p 3000:3000 ocr-service
   ```


Alternatively, use Docker Compose:
1. **Start the service:**

   ```bash
   docker-compose up --build
   ```


The service will be accessible at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository.**
2. **Create a new branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```


3. **Make your changes.**
4. **Commit your changes:**

   ```bash
   git commit -m "Add your commit message"
   ```


5. **Push to the branch:**

   ```bash
   git push origin feature/your-feature-name
   ```


6. **Open a pull request.**

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

**Dev Goyal**  
📧 [anandrambkn@gmail.com](mailto:anandrambkn@gmail.com)
