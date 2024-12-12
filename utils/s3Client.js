const AWS = require('aws-sdk');
const { awsAccessKeyID, awsSecretAccessKey, awsRegion, s3bucketName } = require('../config/keys');

// Initialize the S3 client
const s3 = new AWS.S3({
    accessKeyId: awsAccessKeyID,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
});

// Upload a file to S3
const uploadToS3 = async (file, bucketName = s3bucketName) => {
    const params = {
        Bucket: bucketName,
        Key: `${Date.now()}_${file.originalname}`, // Unique key for the file
        Body: file.buffer, // File content
        ContentType: file.mimetype, // MIME type
    };

    try {
        const uploadResult = await s3.upload(params).promise();
        return uploadResult.Location; // Return the public URL of the uploaded file
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
        await s3.deleteObject(params).promise();
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete file from S3');
    }
};

module.exports = {
    uploadToS3,
    deleteFromS3,
};
