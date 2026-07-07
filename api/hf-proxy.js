export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, inputs, parameters } = req.body;
  if (!model || inputs === undefined) {
    return res.status(400).json({ error: 'Missing model or inputs' });
  }

  const hfToken = process.env.HF_API_KEY;
  if (!hfToken) {
    return res.status(500).json({ error: 'Server misconfiguration: missing HF token' });
  }

  const url = `https://api-inference.huggingface.co/models/${model}`;
  let fetchOptions = {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hfToken}` }
  };

  if (inputs && inputs.file) {
    const base64Data = inputs.file.split(',')[1] || inputs.file;
    const binary = Buffer.from(base64Data, 'base64');
    fetchOptions.body = binary;
    fetchOptions.headers['Content-Type'] = 'application/octet-stream';
  } else {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify({ inputs, parameters });
  }

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: error.error || 'HuggingFace API error' });
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    return res.status(200).json({ result: `data:${contentType};base64,${base64}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}