const googleLensInternalService = require('../services/googleLensInternalService');
const googleLensWebService = require('../services/googleLensWebService');

async function handleGoogleLensInternal(req, res) {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }
    try {
        const result = await googleLensInternalService.performOcr(req.file.buffer);
        if (result.success) {
            res.json(result);
        } else {
            // Provide a more generic error for internal API failures potentially
            console.error("Internal Lens Service Error:", result.error);
            res.status(500).json({ success: false, error: result.error || 'Internal Google Lens API failed.' });
        }
    } catch (error) {
        console.error("Error in handleGoogleLensInternal:", error);
         // Handle the specific Protobuf missing error nicely
        if (error.message.includes("Protobuf definitions")) {
             return res.status(501).json({ success: false, error: error.message }); // 501 Not Implemented
        }
        res.status(500).json({ success: false, error: `Server error during internal OCR: ${error.message}` });
    }
}

async function handleGoogleLensWeb(req, res) {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }
    try {
        const result = await googleLensWebService.performOcr(req.file.buffer);
         if (result.success) {
            res.json(result);
        } else {
            console.error("Web Lens Service Error:", result.error);
            // Distinguish between client-like errors (4xx) and server errors (5xx) if possible
            const statusCode = result.error?.includes("status 4") ? 400 : 500; // Basic check
            res.status(statusCode).json({ success: false, error: result.error || 'Google Lens Web OCR failed.' });
        }
    } catch (error) {
        console.error("Error in handleGoogleLensWeb:", error);
        res.status(500).json({ success: false, error: `Server error during web OCR: ${error.message}` });
    }
}

module.exports = {
    handleGoogleLensInternal,
    handleGoogleLensWeb,
};