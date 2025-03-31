const express = require('express');
const multer = require('multer');
const ocrController = require('../controllers/ocrController');

const router = express.Router();

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @swagger
 * tags:
 *   name: OCR
 *   description: Optical Character Recognition using Google Lens APIs
 */

/**
 * @swagger
 * /api/ocr/glens:
 *   post:
 *     summary: Perform OCR using the Google Lens internal API (Requires Protobuf Definitions)
 *     tags: [OCR]
 *     description: >
 *       Upload an image to perform OCR using the undocumented Google Lens internal API.
 *       **WARNING:** This endpoint requires specific Protobuf files (`.proto`) to be compiled into
 *       `services/lens_protos.js`. If these are not available, this endpoint will return a 501 error.
 *       The API is unofficial and may break without notice.
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: The image file to perform OCR on.
 *     responses:
 *       200:
 *         description: OCR successful.
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               example: true
 *             text:
 *               type: string
 *               example: "抽出されたテキスト\n日本語\n"
 *       400:
 *         description: Bad request (e.g., no image uploaded).
 *         schema:
 *           $ref: '#/definitions/ErrorResponse'
 *       500:
 *         description: Internal server error or API request failed.
 *         schema:
 *           $ref: '#/definitions/ErrorResponse'
 *       501:
 *         description: Not Implemented - Protobuf definitions are missing.
 *         schema:
 *           $ref: '#/definitions/ErrorResponse'
 */
router.post('/glens', upload.single('image'), ocrController.handleGoogleLensInternal);

/**
 * @swagger
 * /api/ocr/glensweb:
 *   post:
 *     summary: Perform OCR by mimicking the Google Lens website interaction
 *     tags: [OCR]
 *     description: >
 *       Upload an image to perform OCR by simulating the requests made by the lens.google.com website.
 *       This method is less stable than a documented API and may break if Google changes its website structure.
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: The image file to perform OCR on.
 *     responses:
 *       200:
 *         description: OCR successful.
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               example: true
 *             text:
 *               type: string
 *               example: "抽出されたテキスト\n日本語\n"
 *       400:
 *         description: Bad request (e.g., no image uploaded, or web interaction failed due to client-like error).
 *         schema:
 *           $ref: '#/definitions/ErrorResponse'
 *       500:
 *         description: Internal server error or web interaction failed unexpectedly.
 *         schema:
 *           $ref: '#/definitions/ErrorResponse'
 */
router.post('/glensweb', upload.single('image'), ocrController.handleGoogleLensWeb);


/**
 * @swagger
 * definitions:
 *   ErrorResponse:
 *     type: object
 *     properties:
 *       success:
 *         type: boolean
 *         example: false
 *       error:
 *         type: string
 *         example: "Error message describing the issue."
 */

module.exports = router;