const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { awsAccessKeyID, awsSecretAccessKey, awsRegion, s3bucketName } = require('../config/keys');

// Initialize the S3 client
const s3 = new S3Client({
    region: awsRegion,
    credentials: {
        accessKeyId: awsAccessKeyID,
        secretAccessKey: awsSecretAccessKey,
    },
});

// Upload a file to S3
const uploadToS3 = async (file, bucketName = s3bucketName) => {
    if (!file || !file.buffer || !file.mimetype || !file.filename) {
        throw new Error('Invalid file object. Ensure "buffer", "mimetype", and "filename" are present.');
    }

    const params = {
        Bucket: bucketName,
        Key: file.filename, // Use the safe filename as the S3 key
        Body: file.buffer, // File content
        ContentType: file.mimetype, // MIME type
    };

    try {
        // Use PutObjectCommand for uploading files
        const command = new PutObjectCommand(params);
        await s3.send(command);

        // Construct the S3 URL manually
        const fileUrl = `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${file.filename}`;
        return fileUrl; // Return the public URL of the uploaded file
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload file to S3');
    }
};


// Delete a file from S3
const deleteFromS3 = async (key, bucketName = s3bucketName) => {
    const params = {
        Bucket: bucketName,
        Key: key, // Key of the file to delete
    };

    try {
        // Use DeleteObjectCommand for deleting files
        const command = new DeleteObjectCommand(params);
        await s3.send(command);
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete file from S3');
    }
};

module.exports = {
    uploadToS3,
    deleteFromS3,
};
