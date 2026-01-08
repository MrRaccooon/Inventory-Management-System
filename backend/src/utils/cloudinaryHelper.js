/**
 * File: cloudinaryHelper.js
 * 
 * Purpose: Shared Cloudinary upload/delete helpers for image.service.js.
 *          Handles transformations, validation, folder structure.
 * 
 * Layer: Utility
 * 
 * Notes:
 * - Requires cloudinary.config.js imported in app.js first
 * - Generates secure, optimized URLs for products/employees
 * - Folders: inventory/products/, inventory/employees/
 * - Throws ApiError for upload failures
 * - Used only by image.service.js (services layer)
 * - No Express/req objects, pure helpers
 */

const cloudinary = require('cloudinary').v2;
const ApiError = require('./apiError');

/**
 * Generates Cloudinary public_id with tenant/product prefix
 * 
 * @param {string} type - 'product' | 'employee'
 * @param {string|number} entityId - productId or employeeId (UUID)
 * @param {string} [suffix=''] - Optional suffix like 'v2'
 * @returns {string} public_id e.g., 'inventory/products/123-main'
 */
const generatePublicId = (type, entityId, suffix = '') => {
  const folder = type === 'employee' ? 'inventory/employees' : 'inventory/products';
  const cleanId = String(entityId).replace(/[^a-z0-9]/gi, '');
  return `${folder}/${cleanId}${suffix ? `-${suffix}` : ''}`;
};

/**
 * Uploads buffer to Cloudinary with optimization
 * 
 * @param {Buffer} buffer - Image buffer from multer memoryStorage
 * @param {string} type - 'product' | 'employee'
 * @param {string|number} entityId - Entity ID for public_id
 * @param {Object} [options={}] - Extra upload options
 * @returns {Promise<Object>} { public_id, secure_url, transformations }
 * @throws {ApiError} On upload failure
 */
const uploadImage = async (buffer, type, entityId, options = {}) => {
  try {
    const publicId = generatePublicId(type, entityId);
    
    const result = await cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: type === 'employee' ? process.env.CLOUDINARY_FOLDER_EMPLOYEES || 'inventory/employees' : 
                                      process.env.CLOUDINARY_FOLDER_PRODUCTS || 'inventory/products',
        quality: 'auto',
        format: 'auto',
        width: 1200, 
        height: 1200,
        crop: 'limit',
        ...options
      },
      (error, result) => {
        if (error) throw error;
        return result;
      }
    ).end(buffer);
    
    return {
      public_id: result.public_id,
      image_id: result.public_id,  // For DB storage
      image_url: result.secure_url,
      transformations: {
        thumbnail: cloudinary.url(result.public_id, { width: 150, height: 150, crop: 'fill', quality: 'auto' }),
        preview: cloudinary.url(result.public_id, { width: 400, height: 300, crop: 'fill', quality: 'auto' }),
        full: cloudinary.url(result.public_id, { width: 800, height: 600, crop: 'fill', quality: 'auto' }),
        ...(type === 'employee' && {
          avatar: cloudinary.url(result.public_id, { width: 200, height: 200, crop: 'fill', gravity: 'face', radius: 30 }),
          profile: cloudinary.url(result.public_id, { width: 400, height: 400, crop: 'fill', gravity: 'face' })
        })
      }
    };
    
  } catch (error) {
    throw ApiError.VALIDATION_ERROR(
      `Cloudinary upload failed: ${error.message}`,
      { entityId, type, error: error.message }
    );
  }
};

/**
 * Deletes image from Cloudinary by public_id
 * 
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<boolean>} true if deleted
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    throw ApiError.NOT_FOUND('Image not found in Cloudinary', { publicId });
  }
};

/**
 * Validates image buffer before upload
 * 
 * @param {Buffer} buffer - Image buffer
 * @param {string} type - 'product' | 'employee'
 * @returns {boolean}
 */
const isValidImage = (buffer, type) => {
  const maxSize = type === 'employee' ? 
    parseInt(process.env.MAX_IMAGE_SIZE_EMPLOYEE) || 3 * 1024 * 1024 :  // 3MB default
    parseInt(process.env.MAX_IMAGE_SIZE_PRODUCT) || 5 * 1024 * 1024;   // 5MB default
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (buffer.length > maxSize) {
    throw ApiError.VALIDATION_ERROR(`Image too large. Max ${type} size: ${(maxSize/1024/1024).toFixed(1)}MB`);
  }
  
  // Basic MIME check (multer already filters, but double-check)
  const mimeType = buffer.toString('utf8', 0, 8).match(/^\xff\xd8\xff/) ? 'image/jpeg' : 
                   buffer.toString('utf8', 0, 8).match(/^\x89PNG/) ? 'image/png' : 
                   'unknown';
  
  if (!allowedTypes.includes(mimeType)) {
    throw ApiError.VALIDATION_ERROR('Invalid image format. Use JPEG, PNG, WebP, GIF only.');
  }
  
  return true;
};

module.exports = {
  uploadImage,
  deleteImage,
  generatePublicId,
  isValidImage
};
