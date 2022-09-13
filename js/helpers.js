const pdfFilter = function(req, file, cb) {

    if (!file.originalname.match(/\.(PDF|pdf|JPEG|png)$/)) {
        req.fileValidationError = 'Solo PDF accettati!';
        return cb(new Error('Solo PDF accettati!'), false);
    }
    cb(null, true);
};
exports.pdfFilter = pdfFilter;