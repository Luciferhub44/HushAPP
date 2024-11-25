// Placeholder SMS service implementation
const sendSMS = async (phoneNumber, message) => {
  if (process.env.NODE_ENV === 'test') {
    return { success: true, message: 'SMS sent (test mode)' };
  }
  
  // TODO: Implement actual SMS service integration
  console.log(`[SMS Service] To: ${phoneNumber}, Message: ${message}`);
  return { success: true };
};

module.exports = sendSMS; 