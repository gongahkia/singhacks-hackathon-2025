// utils/validation.js
module.exports = {
  requireFields(obj, fields) {
    const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
    if (missing.length) {
      const err = new Error(`Missing required fields: ${missing.join(', ')}`);
      err.status = 400;
      throw err;
    }
  }
};
