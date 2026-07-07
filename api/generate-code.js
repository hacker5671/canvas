export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, duration, mode } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: missing API key' });
  }

  const scopeDesc = mode === '3d'
    ? `You write JavaScript Three.js scene-update code for a single per-frame function, plus a caption timeline. Scope provided: scene, camera, THREE, state, makeTextSprite, t, width, height, frame, totalFrames, totalDuration=${duration}.`
    : `You write JavaScript canvas 2D drawing code for a single animation-frame function, plus a caption timeline. Scope provided: ctx, t, width, height, frame, totalFrames, totalDuration=${duration}.`;

  const instructions = scopeDesc + "\n\n" +
    "Output format strictly as:\n" +
    "###CODE_START###\n<raw JavaScript statements only>\n###CODE_END###\n" +
    "###CAPTIONS_START###\n<a compact JSON array of 2-4 objects {\"text\":string,\"start\":number,\"end\":number} in seconds, covering the duration>\n###CAPTIONS_END###\n" +
    "No prose, no markdown fences.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instructions + "\n\nAnimation to create: " + prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );
    const data = await response.json();
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}