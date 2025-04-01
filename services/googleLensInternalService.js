const axios = require('axios');
const crypto = require('crypto');
const { preprocessImage } = require('./imageProcessor');

// --- Load the generated Protobuf definitions ---
let lens_protos;
let LensOverlayServerRequest, LensOverlayServerResponse, PLATFORM_WEB, SURFACE_CHROMIUM, AUTO_FILTER;
try {
    // This should now successfully load the provided JS file
    lens_protos = require('./lens_protos'); // Assumes lens_protos.js is in the same directory

    // --- Access the definitions using the structure from the generated file ---
    // Note: The root namespace in your file is 'lens'
    LensOverlayServerRequest = lens_protos.lens.LensOverlayServerRequest;
    LensOverlayServerResponse = lens_protos.lens.LensOverlayServerResponse;
    PLATFORM_WEB = lens_protos.lens.Platform.PLATFORM_WEB;
    SURFACE_CHROMIUM = lens_protos.lens.Surface.SURFACE_CHROMIUM;
    AUTO_FILTER = lens_protos.lens.LensOverlayFilterType.AUTO_FILTER;
    // --- End definition access ---

    if (!LensOverlayServerRequest || !LensOverlayServerResponse || PLATFORM_WEB === undefined || SURFACE_CHROMIUM === undefined || AUTO_FILTER === undefined) {
        throw new Error("Protobuf definitions not loaded correctly from lens_protos.js (check internal structure).");
    }
    console.log("Successfully loaded Google Lens Protobuf definitions.");

} catch (err) {
    console.error("**************************************************************************");
    console.error("ERROR: Failed to load or parse Google Lens Protobuf definitions (lens_protos.js).");
    console.error("The Internal Google Lens API (/api/ocr/glens) WILL NOT WORK.");
    console.error("Reason:", err.message);
    // If it fails here, it likely means lens_protos.js is missing or corrupted.
    console.error("Ensure 'lens_protos.js' exists in the 'services' directory.");
    console.error("**************************************************************************");
    LensOverlayServerRequest = null; // Prevent further execution using undefined variables
}
// --- End Protobuf Dependency ---

const LENS_API_URL = 'https://lensfrontend-pa.googleapis.com/v1/crupload';
const LENS_API_KEY = 'AIzaSyDr2UxVnv_U85AbhhY8XSHSIavUW0DC-sY'; // Public key found in web requests

// Helper function to generate a pseudo-random uint64 value as a string
// protobufjs can handle string representations for 64-bit integers.
function generateUint64String() {
    // Combine timestamp with random numbers for reasonable uniqueness
    // Not cryptographically secure, but sufficient for a request ID.
    const high = Math.floor(Math.random() * 0xFFFFFFFF);
    const low = Math.floor(Math.random() * 0xFFFFFFFF);
    // Use BigInt to handle the combination correctly
    const value = (BigInt(high) << BigInt(32)) | BigInt(low);
    return value.toString(); // Return as string
}


async function performOcr(imageBuffer) {
    if (!LensOverlayServerRequest) {
        // This error is thrown if the require('./lens_protos') failed earlier.
        throw new Error("Google Lens Internal API unavailable due to missing or invalid Protobuf definitions (lens_protos.js).");
    }

    try {
        const { buffer: processedBuffer, width, height } = await preprocessImage(imageBuffer);

        // --- Create Protobuf Request Payload (Plain JavaScript Object) ---
        // Structure matches the definitions in lens_protos.js
        const requestPayload = {
            objectsRequest: { // This corresponds to LensOverlayServerRequest.objectsRequest
                requestContext: { // Corresponds to LensOverlayObjectsRequest.requestContext
                    requestId: { // Corresponds to LensOverlayRequestContext.requestId
                        // uuid: generateUint64String(), // Using helper for uint64 as string
                        // Generate uint64 (as string is safer for protobufjs)
                        uuid: require('protobufjs').util.Long.fromString(BigInt('0x' + crypto.randomBytes(8).toString('hex')).toString()),
                        sequenceId: 0,
                        imageSequenceId: 0,
                        analyticsId: crypto.randomBytes(16), // crypto.randomBytes returns a Buffer, which is correct for 'bytes' type
                        routingInfo: {} // Empty or null should work for optional/empty message
                    },
                    clientContext: { // Corresponds to LensOverlayRequestContext.clientContext
                        platform: PLATFORM_WEB,
                        surface: SURFACE_CHROMIUM,
                        localeContext: { // Corresponds to LensOverlayClientContext.localeContext
                            language: 'ja',
                            region: 'JP', // Match Python example
                            timeZone: '' // Match Python example
                        },
                        appId: '', // Match Python example
                        clientFilters: { // Corresponds to LensOverlayClientContext.clientFilters (AppliedFilters type)
                            filter: [{ // This is the repeated field inside AppliedFilters
                                filterType: AUTO_FILTER // Corresponds to AppliedFilter.filterType
                                // No payload needed for AUTO_FILTER
                            }]
                        }
                        // renderingContext and clientLoggingData omitted as in Python example
                    }
                },
                imageData: { // Corresponds to LensOverlayObjectsRequest.imageData
                    payload: { // Corresponds to ImageData.payload (ImagePayload type)
                        imageBytes: processedBuffer // Corresponds to ImagePayload.imageBytes ('bytes' type expects Buffer)
                    },
                    imageMetadata: { // Corresponds to ImageData.imageMetadata
                        width: width,
                        height: height
                    }
                    // significantRegions omitted
                }
                // payload field (type lens.Payload) omitted as in Python example
            }
            // interactionRequest and clientLogs omitted
        };
        // --- End Protobuf Request Payload ---


        // --- Verify, Create, and Encode the Request ---
        const errMsg = LensOverlayServerRequest.verify(requestPayload);
        if (errMsg) {
            console.error("Protobuf request verification failed:", errMsg);
            console.error("Payload:", JSON.stringify(requestPayload, null, 2)); // Log payload for debugging
            throw new Error(`Protobuf request structure error: ${errMsg}`);
        }
        const message = LensOverlayServerRequest.create(requestPayload);
        const serializedRequest = LensOverlayServerRequest.encode(message).finish(); // .finish() gets the Uint8Array/Buffer
        // --- End Encoding ---

        const headers = {
            'Host': 'lensfrontend-pa.googleapis.com',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-protobuf', // Correct content type
            'X-Goog-Api-Key': LENS_API_KEY,
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Dest': 'empty',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Example modern UA
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8'
        };

        console.log("Sending request to Google Lens Internal API...");
        const response = await axios.post(LENS_API_URL, serializedRequest, {
            headers: headers,
            responseType: 'arraybuffer', // IMPORTANT: Expect binary response data
            timeout: 20000 // 20 seconds
        });

        if (response.status !== 200) {
            // Attempt to decode error response if possible (might not be protobuf)
            let errorBody = response.data;
            try {
                 // Try decoding as text first
                 errorBody = Buffer.from(response.data).toString('utf-8');
            } catch (e) { /* ignore decoding error */ }
            console.error(`Lens API Error Response (Status ${response.status}):`, errorBody);
            throw new Error(`API request failed with status ${response.status}`);
        }

        // --- Decode Protobuf Response ---
        // Need Buffer or Uint8Array for decode
        const responseBuffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
        const responseProto = LensOverlayServerResponse.decode(responseBuffer);

        // Convert to plain object for easier and safer access
        // Configure options to represent types conveniently (e.g., 64-bit ints as strings)
        const responseObj = LensOverlayServerResponse.toObject(responseProto, {
            longs: String,  // Represent int64/uint64 as strings
            enums: String,  // Represent enums as strings
            bytes: Buffer,  // Represent bytes as Buffers (or String for base64)
            defaults: true, // Include fields with default values
            arrays: true,   // Include empty arrays
            objects: true,  // Include empty objects
            oneofs: true    // Include virtual oneof properties
        });
        // --- End Decode Protobuf Response ---

        // --- Extract Text ---
        // Navigate the decoded object structure (adjust if necessary based on actual responses)
        let resultText = '';
        // Use safe navigation (?. optional chaining) extensively
        const paragraphs = responseObj?.objectsResponse?.text?.textLayout?.paragraphs;

        if (paragraphs && Array.isArray(paragraphs)) {
            for (const paragraph of paragraphs) {
                const lines = paragraph?.lines; // Safe navigation
                if (lines && Array.isArray(lines)) {
                    for (const line of lines) {
                        const words = line?.words; // Safe navigation
                        if (words && Array.isArray(words)) {
                            for (const word of words) {
                                // Check for optional textSeparator using '_textSeparator' if using oneofs: true,
                                // or just check if word.textSeparator exists.
                                // Use default empty string if fields are missing.
                                const plainText = word?.plainText || '';
                                const separator = word?.textSeparator || ''; // Default to empty if missing/null
                                resultText += plainText + separator;
                            }
                        }
                    }
                    resultText += '\n'; // Add newline after processing all lines in a paragraph
                }
            }
        } else {
            console.warn("Could not find expected text structure in Lens API response.");
             // Log the response object structure for debugging if text is not found
             console.debug("Lens Response Object Structure:", JSON.stringify(responseObj, null, 2));
        }
        // --- End Extract Text ---

        return { success: true, text: resultText.trim() }; // Trim any leading/trailing whitespace

    } catch (error) {
        console.error("Google Lens Internal API Service Error:", error.message);
        // Log axios error details if available
        if (error.response) {
            console.error("Axios Error Response Status:", error.response.status);
            let errorData = error.response.data;
             try {
                 // Try decoding error response as text
                 errorData = Buffer.from(error.response.data).toString('utf-8');
            } catch (e) { /* ignore decoding error */ }
            console.error("Axios Error Response Data:", errorData);
        } else if (error.request) {
             console.error("Axios Error Request:", "No response received");
        } else {
             console.error("Error Setting Up Request:", error.message);
        }

        let errorMessage = `Internal Lens API failed: ${error.message}`;
        if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
            errorMessage = "Internal Lens API request timed out.";
        } else if (error.response) {
            errorMessage = `Internal Lens API request failed with status ${error.response.status}`;
        } else if (error.message.includes('Protobuf') || error.message.includes('structure error')) {
             errorMessage = `Internal Lens API failed due to Protobuf error: ${error.message}`; // More specific
        }
        return { success: false, error: errorMessage };
    }
}

module.exports = { performOcr };