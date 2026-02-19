const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folderPath = 'pos_system';
        let fileName = file.fieldname + '-' + Date.now();

        // Custom naming for categories
        if (req.baseUrl && req.baseUrl.includes('categories')) {
            folderPath = 'pos_system/categories';
            if (req.method === 'PUT' || req.method === 'PATCH') {
                const id = req.params.id;
                fileName = id ? `cat-${id}-001` : `cat-update-${Date.now()}`;
            } else {
                fileName = `cat-new-${Date.now()}`;
            }
        } 
        // Custom naming for brands
        else if (req.baseUrl && req.baseUrl.includes('brands')) {
            folderPath = 'pos_system/brands';
            if (req.method === 'PUT' || req.method === 'PATCH') {
                const id = req.params.id;
                fileName = id ? `brand-${id}-001` : `brand-update-${Date.now()}`;
            } else {
                fileName = `brand-new-${Date.now()}`;
            }
        }

        return {
            folder: folderPath,
            public_id: fileName,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 500, height: 500, crop: 'limit' }],
            timeout: 120000 // 2 minutes timeout
        };
    },
});

const upload = multer({ storage: storage });

module.exports = upload;
