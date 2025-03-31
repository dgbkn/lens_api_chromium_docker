const axios = require('axios');
const crypto = require('crypto');
const { preprocessImage } = require('./imageProcessor');

// --- !!! IMPORTANT !!! ---
// This section requires 'lens_protos.js' generated from the original .proto files.
// If you don't have it, this service CANNOT work.
let LensOverlayServerRequest, LensOverlayServerResponse, PLATFORM_WEB, SURFACE_CHROMIUM, AUTO_FILTER;
try {
    // const protobuf = require("protobufjs"); // Only needed if loading .proto dynamically
    const lens_protos = require('./lens_protos'); // Assumes generated file exists

    // --- Adjust these names based on your generated JS module ---
    LensOverlayServerRequest = lens_protos.LensOverlayServerRequest;
    LensOverlayServerResponse = lens_protos.LensOverlayServerResponse;
    PLATFORM_WEB = lens_protos.PlatformType.PLATFORM_WEB; // Example enum access
    SURFACE_CHROMIUM = lens_protos.SurfaceType.SURFACE_CHROMIUM; // Example enum access
    AUTO_FILTER = lens_protos.FilterType.AUTO_FILTER; // Example enum access
    // --- End adjustment section ---

    if (!LensOverlayServerRequest || !LensOverlayServerResponse || PLATFORM_WEB === undefined || SURFACE_CHROMIUM === undefined || AUTO_FILTER === undefined) {
        throw new Error("Protobuf definitions not loaded correctly from lens_protos.js");
    }

} catch (err) {
    console.warn("**************************************************************************");
    console.warn("WARNING: Failed to load Google Lens Protobuf definitions (lens_protos.js).");
    console.warn("The Internal Google Lens API (/api/ocr/glens) WILL NOT WORK.");
    console.warn("Reason:", err.message);
    console.warn("You need the original .proto files and protobufjs-cli to generate it.");
    console.warn("**************************************************************************");
    LensOverlayServerRequest = null; // Ensure it's null if loading failed
}
// --- End Protobuf Dependency ---

const LENS_API_URL = 'https://lensfrontend-pa.googleapis.com/v1/crupload';
// This API key is public in many web examples, but use with caution or find alternatives.
const LENS_API_KEY = 'AIzaSyDr2UxVnv_U85AbhhY8XSHSIavUW0DC-sY';

async function performOcr(imageBuffer) {
    if (!LensOverlayServerRequest) {
        throw new Error("Google Lens Internal API unavailable due to missing Protobuf definitions.");
    }

    try {
        const { buffer: processedBuffer, width, height } = await preprocessImage(imageBuffer);

        // --- Create Protobuf Request Message ---
        // (Adjust field names/structure based on your generated lens_protos.js)
        const requestPayload = {
            objectsRequest: {
                requestContext: {
                    requestId: {
                        uuidLow: BigInt(Math.floor(Math.random() * (2 ** 32))), // Example for u64 split
                        uuidHigh: BigInt(Math.floor(Math.random() * (2**32))), // Needs proper 64-bit handling
                        sequenceId: 0,
                        imageSequenceId: 0,
                        analyticsId: crypto.randomBytes(16) // Generate random bytes
                        // routingInfo: {} // Clear or omit if default
                    },
                    clientContext: {
                        platform: PLATFORM_WEB,
                        surface: SURFACE_CHROMIUM,
                        localeContext: {
                            language: 'ja',
                            region: 'JP', // or Asia/Tokyo ? Check API reqs
                            timeZone: '' // Match Python
                        },
                        // appId: '', // Match Python
                        clientFilters: {
                            filter: [{ filterType: AUTO_FILTER }]
                        }
                    }
                },
                imageData: {
                    payload: {
                        imageBytes: processedBuffer
                    },
                    imageMetadata: {
                        width: width,
                        height: height
                    }
                }
            }
        };

        const errMsg = LensOverlayServerRequest.verify(requestPayload);
        if (errMsg) {
            console.error("Protobuf request verification failed:", errMsg);
            throw new Error(`Protobuf request structure error: ${errMsg}`);
        }
        const message = LensOverlayServerRequest.create(requestPayload);
        const serializedRequest = LensOverlayServerRequest.encode(message).finish();
        // --- End Protobuf Request Message ---

        const headers = {
            'Host': 'lensfrontend-pa.googleapis.com',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-protobuf',
            'X-Goog-Api-Key': LENS_API_KEY,
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Dest': 'empty',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Example UA
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8'
        };

        console.log("Sending request to Google Lens Internal API...");
        const response = await axios.post(LENS_API_URL, serializedRequest, {
            headers: headers,
            responseType: 'arraybuffer', // Crucial: receive binary data
            timeout: 20000 // 20 seconds
        });

        if (response.status !== 200) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        // --- Decode Protobuf Response ---
        const responseProto = LensOverlayServerResponse.decode(Buffer.from(response.data));
        // Convert to plain object for easier access (optional)
        const responseObj = LensOverlayServerResponse.toObject(responseProto, {
            longs: String, // Represent 64-bit integers as strings
            enums: String, // Represent enums as strings
            bytes: String, // Represent bytes as base64 strings (or Buffer)
            defaults: true, // Include default values
            arrays: true, // Include empty arrays
            objects: true, // Include empty objects
            oneofs: true // Include virtual oneof properties
        });
        // --- End Decode Protobuf Response ---


        // --- Extract Text ---
        // (Adjust navigation based on your generated lens_protos.js and actual response structure)
        let resultText = '';
        const paragraphs = responseObj?.objectsResponse?.text?.textLayout?.paragraphs;

        if (paragraphs && Array.isArray(paragraphs)) {
            for (const paragraph of paragraphs) {
                const lines = paragraph?.lines;
                if (lines && Array.isArray(lines)) {
                    for (const line of lines) {
                        const words = line?.words;
                        if (words && Array.isArray(words)) {
                            for (const word of words) {
                                resultText += (word?.plainText || '') + (word?.textSeparator || '');
                            }
                        }
                    }
                    resultText += '\n'; // Add newline after each paragraph's lines
                }
            }
        } else {
            console.warn("Could not find expected text structure in Lens API response.");
            console.debug("Lens Response Object:", JSON.stringify(responseObj, null, 2));
        }
        // --- End Extract Text ---

        return { success: true, text: resultText.trim() };

    } catch (error) {
        console.error("Google Lens Internal API Error:", error.response?.data || error.message);
        let errorMessage = `Internal Lens API failed: ${error.message}`;
        if (error.code === 'ECONNABORTED') {
            errorMessage = "Internal Lens API request timed out.";
        } else if (error.response) {
            errorMessage = `Internal Lens API request failed with status ${error.response.status}`;
        }
        return { success: false, error: errorMessage };
    }
}

module.exports = { performOcr };