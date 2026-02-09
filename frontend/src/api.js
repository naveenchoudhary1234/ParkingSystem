const API_BASE = "https://parkingsystem-hgzu.onrender.com/api";

export async function apiRequest(endpoint, method = "GET", data = null, token = null) {
  const url = `${API_BASE}${endpoint}`;
  
  // Auto-get token from localStorage if not provided
  const authToken = token || localStorage.getItem("token");
  
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  
  // Add authorization header if token exists
  if (authToken) {
    options.headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  if (data) options.body = JSON.stringify(data);
  console.log(`[API] ${method} ${url}`, data);
  
  try {
    const res = await fetch(url, options);
    const json = await res.json().catch(() => ({}));

    // Prefer structured backend responses: { success: boolean, message: string, ... }
    if (!res.ok) {
      const serverMessage = json?.message || json?.error || json?.msg || "Server temporarily unavailable";
      const err = new Error(serverMessage);
      err.status = res.status;
      err.response = json;
      throw err;
    }

    console.log(`[API] Response:`, json);
    return json;
  } catch (err) {
    // Network errors (no response) should be translated to user-friendly messages
    if (!err.message) err.message = "Network error: please check your connection";
    console.error(`[API] Error:`, err.message);
    throw err;
  }
}
