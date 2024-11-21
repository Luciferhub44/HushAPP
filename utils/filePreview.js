const generatePreview = (file) => {
  const previewConfig = {
    image: {
      thumbnailSize: { width: 200, height: 200 },
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
    },
    document: {
      previewLength: 1024, // First 1KB for text files
      allowedTypes: ['application/pdf', 'text/plain', 'application/msword']
    },
    audio: {
      duration: 30, // 30 seconds preview
      allowedTypes: ['audio/mpeg', 'audio/wav']
    }
  };

  return {
    type: file.mimetype.split('/')[0],
    url: file.path,
    thumbnail: file.mimetype.startsWith('image/') ? file.path : null,
    previewUrl: generatePreviewUrl(file, previewConfig),
    metadata: {
      size: file.size,
      mimeType: file.mimetype,
      filename: file.originalname
    }
  };
};

const generatePreviewUrl = (file, config) => {
  // For Cloudinary, we can use their transformation APIs
  if (file.path.includes('cloudinary')) {
    const baseUrl = file.path.split('upload/')[0] + 'upload/';
    const publicId = file.path.split('upload/')[1];

    switch (file.mimetype.split('/')[0]) {
      case 'image':
        return `${baseUrl}w_${config.image.thumbnailSize.width},h_${config.image.thumbnailSize.height},c_fit/${publicId}`;
      case 'video':
        return `${baseUrl}w_400,h_300,c_fit/${publicId}`;
      case 'application':
        return `${baseUrl}w_400,h_300,c_fit/${publicId}`;
      default:
        return file.path;
    }
  }
  return file.path;
};

module.exports = { generatePreview }; 