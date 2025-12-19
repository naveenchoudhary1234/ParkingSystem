// API utility for backend requests
const API_BASE = "http://localhost:5000/api";

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
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.msg || "API Error");
    console.log(`[API] Response:`, json);
    return json;
  } catch (err) {
    console.error(`[API] Error:`, err.message);
    throw err;
  }
}
