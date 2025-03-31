const axios = require('axios');
const FormData = require('form-data');
const JSON5 = require('json5');
const { CookieJar } = require('tough-cookie');
const { wrapper: axiosCookieJarSupport } = require('axios-cookiejar-support');
const { preprocessImage } = require('./imageProcessor');
const { URL } = require('url'); // Node's built-in URL parser

// Setup axios instance with cookie support
const jar = new CookieJar();
const client = axios.create({
    jar,
    withCredentials: true, // Needed for cookie support with axiosCookieJarSupport
    timeout: 25000 // Slightly longer timeout for multi-step process
});
axiosCookieJarSupport(client); // Apply cookie jar support wrapper


const UPLOAD_URL = 'https://lens.google.com/v3/upload';
const METADATA_URL_BASE = 'https://lens.google.com/v3/qfmetadata'; // Changed base path

async function performOcr(imageBuffer) {
    try {
        const { buffer: processedBuffer, width, height } = await preprocessImage(imageBuffer);

        const form = new FormData();
        form.append('encoded_image', processedBuffer, {
            filename: 'image.png', // Filename is usually required
            contentType: 'image/png',
        });

        const commonHeaders = {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0', // Example UA
             'Accept-Language': 'en-US,en;q=0.5',
             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
             'DNT': '1', // Do Not Track header, often sent by browsers
             'Sec-Fetch-Dest': 'document',
             'Sec-Fetch-Mode': 'navigate',
             'Sec-Fetch-User': '?1',
             'Upgrade-Insecure-Requests': '1',
        };

        // --- 1. POST Image to Upload Endpoint ---
        console.log("Posting image to Google Lens Web Upload...");
        const postResponse = await client.post(UPLOAD_URL, form, {
            headers: {
                ...form.getHeaders(), // Adds Content-Type: multipart/form-data with boundary
                ...commonHeaders,
                'Referer': 'https://lens.google.com/',
                'Origin': 'https://lens.google.com',
                'Sec-Fetch-Site': 'same-origin', // Changed from none/same-site based on typical flow
            },
            maxRedirects: 0, // IMPORTANT: Do not follow redirects automatically
            validateStatus: status => status === 303, // Expecting 303 See Other
        });

        const redirectUrl = postResponse.headers['location'];
        if (!redirectUrl) {
            console.error("Lens Web Upload Response Headers:", postResponse.headers);
            throw new Error('Redirect URL (Location header) not found after image upload.');
        }
        console.log("Received redirect URL:", redirectUrl);


        // --- 2. Extract vsrid and gsessionid ---
        let vsrid, gsessionid;
        try {
            const parsedRedirectUrl = new URL(redirectUrl, 'https://lens.google.com'); // Provide base if relative
            vsrid = parsedRedirectUrl.searchParams.get('vsrid');
            gsessionid = parsedRedirectUrl.searchParams.get('gsessionid');

            if (!vsrid || !gsessionid) {
                throw new Error('vsrid or gsessionid missing in redirect URL query parameters.');
            }
        } catch (urlError) {
             console.error("Failed to parse redirect URL:", redirectUrl, urlError);
             throw new Error(`Could not parse redirect URL: ${urlError.message}`);
        }
        console.log(`Extracted vsrid: ${vsrid}, gsessionid: ${gsessionid}`);


        // --- 3. GET Metadata ---
        const metadataUrl = `${METADATA_URL_BASE}?vsrid=${vsrid}&gsessionid=${gsessionid}&hl=en`; // Add language hint
        console.log("Fetching metadata from:", metadataUrl);

        const metaResponse = await client.get(metadataUrl, {
            headers: {
                ...commonHeaders,
                'Accept': '*/*', // Often accepts anything for metadata fetches
                'Referer': redirectUrl, // Referer is the page we were redirected to
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors', // Metadata is often fetched via JS (cors)
                'Sec-Fetch-Site': 'same-origin',
                // 'X-Client-Data': '...' // Sometimes needed, might need to sniff from browser
            },
             // Cookies are handled automatically by the jar
        });

        if (metaResponse.status !== 200) {
             throw new Error(`Metadata request failed with status ${metaResponse.status}`);
        }

        // --- 4. Parse Metadata Response ---
        // Response often starts with )]}' - remove it before parsing
        const responseText = metaResponse.data;
        let jsonData = null;
        let parsedObject = null;

        try {
            const lines = responseText.split('\n');
            let jsonString = '';
            // Find the line that likely contains the main JSON/JSON5 array/object
            // It usually starts with '[' after the initial )]}' line
            for (let i = 1; i < lines.length; i++) { // Start from index 1 to skip )]} '
                const trimmedLine = lines[i].trim();
                if (trimmedLine.startsWith('[')) {
                    jsonString = trimmedLine;
                    break;
                }
            }

            if (!jsonString) {
                 throw new Error("Could not find the JSON/JSON5 data line in the metadata response.");
            }
            // Use JSON5 for potentially non-standard JSON
            parsedObject = JSON5.parse(jsonString);
        } catch (parseError) {
            console.error("Failed to parse metadata JSON5:", parseError);
            console.debug("Metadata Response Text Snippet:", responseText.substring(0, 500));
            throw new Error(`Failed to parse metadata response: ${parseError.message}`);
        }

        // --- 5. Extract Text from Parsed Data ---
        // This structure can change! Inspect the actual 'parsedObject' if it fails.
        let resultText = '';
        try {
            // Attempt extraction based on the Python code's *original* structure assumption
            const textStructure = parsedObject?.[0]?.[2]?.[0]?.[0];
            if (textStructure && Array.isArray(textStructure)) {
                for (const paragraph of textStructure) {
                    if (paragraph?.[1] && Array.isArray(paragraph[1])) {
                        for (const line of paragraph[1]) {
                            if (line?.[0] && Array.isArray(line[0])) {
                                for (const word of line[0]) {
                                    if (word?.[1] && word?.[2] !== undefined) { // Check type if needed
                                        resultText += word[1] + word[2]; // text + separator
                                    }
                                }
                            }
                        }
                        resultText += '\n'; // Newline after paragraph
                    }
                }
            }

             // Add more robust extraction based on observed structures if the above fails
             if (!resultText.trim()) {
                  console.warn("Initial text extraction failed, trying alternative structures...");
                  // Example alternative: Check observed path like `parsedObject[0][1]['2']['1'][0]`
                  const altStructure = parsedObject?.[0]?.[1]?.['2']?.['1']; // Safer navigation
                  if (altStructure && Array.isArray(altStructure)) {
                      for (const container of altStructure) {
                          if (Array.isArray(container)) {
                              for (const item of container) {
                                  if (Array.isArray(item) && item.length > 1 && typeof item[1] === 'string') {
                                      resultText += item[1];
                                  }
                              }
                              resultText += '\n';
                          } else if (typeof container === 'string') { // Sometimes text might be directly there
                             resultText += container + '\n';
                          }
                      }
                  }
             }

            if (!resultText.trim()) {
                console.warn("Could not extract text from the parsed Lens Web response.");
                console.debug("Parsed Metadata Object:", JSON.stringify(parsedObject, null, 2));
            }

        } catch (extractError) {
            console.error("Error extracting text from parsed data:", extractError);
            console.debug("Parsed Metadata Object:", JSON.stringify(parsedObject, null, 2));
            throw new Error(`Failed to extract text from parsed response: ${extractError.message}`);
        }

        return { success: true, text: resultText.trim() };

    } catch (error) {
        console.error("Google Lens Web Error:", error.response?.data || error.message);
         let errorMessage = `Lens Web OCR failed: ${error.message}`;
         if (error.code === 'ECONNABORTED') {
            errorMessage = "Lens Web request timed out.";
        } else if (error.response) {
            errorMessage = `Lens Web request failed with status ${error.response.status}`;
        } else if (error.message.includes('303') && error.config?.url === UPLOAD_URL){
            // This specific error can happen if the validateStatus fails
            errorMessage = "Lens Web upload step did not return expected redirect (303)."
        }
        return { success: false, error: errorMessage };
    }
}

module.exports = { performOcr };