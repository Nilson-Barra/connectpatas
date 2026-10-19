// Evita try/catch repetido em toda rota: erro de promise vai para o middleware.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
