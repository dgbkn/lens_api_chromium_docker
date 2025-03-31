const sharp = require('sharp');
const { sqrt } = Math;

const MAX_PIXELS_LENS = 3000000; // Max pixels for both Lens methods

async function preprocessImage(imageBuffer, maxPixels = MAX_PIXELS_LENS) {
    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        let processedImage = image;
        let finalWidth = metadata.width;
        let finalHeight = metadata.height;

        // Resize if too large
        if (metadata.width * metadata.height > maxPixels) {
            const aspectRatio = metadata.width / metadata.height;
            finalWidth = Math.floor(sqrt(maxPixels * aspectRatio));
            finalHeight = Math.floor(finalWidth / aspectRatio);
            console.log(`Resizing image from ${metadata.width}x${metadata.height} to ${finalWidth}x${finalHeight}`);
            processedImage = image.resize(finalWidth, finalHeight, {
                fit: 'inside', // Ensure it doesn't exceed dimensions
                kernel: sharp.kernel.lanczos3 // High quality downsampling
            });
        }

        // Ensure PNG format (seems preferred by Lens APIs)
        // Use low compression for speed, quality is less critical than successful upload
        const outputBuffer = await processedImage.png({ compressionLevel: 3 }).toBuffer();

        return {
            buffer: outputBuffer,
            width: finalWidth,
            height: finalHeight,
            originalWidth: metadata.width,
            originalHeight: metadata.height
        };
    } catch (error) {
        console.error("Error processing image:", error);
        throw new Error(`Image processing failed: ${error.message}`);
    }
}

module.exports = { preprocessImage };