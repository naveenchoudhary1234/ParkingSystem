// Address Tracking Helper
// This helps debug when addresses get corrupted during property creation

const debugAddressChanges = (context, addressData) => {
  console.log(`📍 Address Debug [${context}]:`, {
    timestamp: new Date().toISOString(),
    context: context,
    addressData: addressData,
    fullAddress: addressData?.fullAddress || addressData?.address,
    coordinates: addressData?.coordinates || [addressData?.lng, addressData?.lat],
    isCoordinateAddress: addressData?.fullAddress && 
      /^[-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*$/.test(addressData.fullAddress.trim())
  });
  
  // Warn if address looks like coordinates
  if (addressData?.fullAddress && 
      /^[-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*$/.test(addressData.fullAddress.trim())) {
    console.warn(`⚠️ [${context}] Address appears to be coordinates: ${addressData.fullAddress}`);
  }
};

export default debugAddressChanges;