import cloudinary from '../config/cloudinary.js';

// Stream an in-memory buffer (from Multer) to Cloudinary.
export function uploadBuffer(buffer, folder = 'bizznearby/businesses') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export function uploadMany(files = [], folder) {
  return Promise.all(files.map((f) => uploadBuffer(f.buffer, folder)));
}

export async function deleteImage(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}

export async function deleteMany(publicIds = []) {
  await Promise.allSettled(publicIds.map(deleteImage));
}
