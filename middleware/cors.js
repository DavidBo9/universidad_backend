// middleware/cors.js
module.exports = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Responder inmediatamente a solicitudes OPTIONS
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };