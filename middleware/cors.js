// middleware/cors.js
module.exports = (req, res, next) => {
    // Permitir cualquier origen en desarrollo
    res.header('Access-Control-Allow-Origin', '*');
    
    // Métodos HTTP permitidos
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Cabeceras permitidas
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Importante para el preflight
    res.header('Access-Control-Max-Age', '86400'); // 24 horas
    
    // Responder a las solicitudes OPTIONS inmediatamente
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
