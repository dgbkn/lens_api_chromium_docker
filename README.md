# OCR Service

A lightweight Node.js OCR service utilizing [chrome-lens-ocr](https://www.npmjs.com/package/chrome-lens-ocr), [Express](https://expressjs.com/), and [Multer](https://www.npmjs.com/package/multer), providing a free alternative to Google Cloud Lens API..

## Table of Contents

- [About the Project](#about-the-project)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [POST /api/ocr/glens](#post-apiocrglens)
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

### POST /api/ocr/glens

Endpoint to perform OCR using Google Lens internal API (requires Protobuf definitions).

- **URL:** `http://localhost:3000/api/ocr/glens`
- **Method:** `POST`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** Form-data with a key `image` containing the image file.

**Example using cURL:**

```bash
curl -X POST -F "image=@path_to_your_image.png" http://localhost:3000/api/ocr/glensweb
```


### POST /api/ocr/glensweb

Endpoint to perform OCR by simulating requests to the Google Lens website.

- **URL:** `http://localhost:3000/api/ocr/glensweb`
- **Method:** `POST`
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** Form-data with a key `image` containing the image file.

**Example using cURL:**

```bash
curl -X POST -F "image=@path_to_your_image.png" http://localhost:3000/api/ocr/glensweb
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
