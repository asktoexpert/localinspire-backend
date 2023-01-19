const cloudinary = require('cloudinary').v2;

class CloudinaryService {
  #config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };
  constructor() {
    cloudinary.config(this.#config);
  }

  async upload({ dir, filePath }) {
    console.log('In cloudinary, ', { file: filePath });
    return await cloudinary.uploader.upload(filePath, { overwrite: true, folder: dir });
  }
}

module.exports = new CloudinaryService();
// 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg'
