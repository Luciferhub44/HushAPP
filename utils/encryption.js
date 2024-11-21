const CryptoJS = require('crypto-js');

const encryptMessage = (message, secretKey = process.env.MESSAGE_ENCRYPTION_KEY) => {
  try {
    return CryptoJS.AES.encrypt(message, secretKey).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Message encryption failed');
  }
};

const decryptMessage = (encryptedMessage, secretKey = process.env.MESSAGE_ENCRYPTION_KEY) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Message decryption failed');
  }
};

module.exports = { encryptMessage, decryptMessage }; 