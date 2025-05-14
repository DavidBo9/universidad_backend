// middleware/cors.js
module.exports = (req, res, next) => {
    // Allow specific origin
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    
    // Methods HTTP allowed
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Headers allowed
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Important for preflight
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Respond to OPTIONS requests immediately
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
