require('dotenv').config();
const webApp = require('./web/app');

const PORT = process.env.PORT || process.env.WEB_PORT || 3000;
const HOST = '0.0.0.0';

webApp.listen(PORT, HOST, () => {
  console.log(`🌐 Web interface running on ${HOST}:${PORT}`);
});
