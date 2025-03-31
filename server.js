require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const ocrRoutes = require('./routes/ocr');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// --- Swagger Setup ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0', // Use OpenAPI 3.0.0 spec
        info: {
            title: 'Google Lens OCR API',
            version: '1.0.0',
            description: 'API endpoints to perform OCR using different Google Lens methods (Internal & Web Simulation)',
        },
        servers: [
            {
                url: `http://localhost:${port}`, // Adjust if deployed elsewhere
                description: 'Development server'
            }
        ],
        // Schemas defined directly in route comments using @swagger definitions
    },
    // Path to the API docs files (routes/*.js)
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// --- End Swagger Setup ---


// --- Routes ---
app.get('/', (req, res) => {
    res.send('Google Lens OCR API is running. Visit /api-docs for documentation.');
});
app.use('/api/ocr', ocrRoutes); // Mount OCR routes
// --- End Routes ---

// --- Basic Error Handling ---
// Not found
app.use((req, res, next) => {
    res.status(404).json({ success: false, error: 'Not Found' });
});

// General server error
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});
// --- End Error Handling ---


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger API docs available at http://localhost:${port}/api-docs`);
    // Reminder about the internal API dependency
    require('./services/googleLensInternalService'); // This runs the warning if needed
});