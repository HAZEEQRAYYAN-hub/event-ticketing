const httpError = require('./httpError');
module.exports = async (text) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  if (!r.ok) throw httpError(502, 'QR service unavailable');
  const buf = Buffer.from(await r.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
};