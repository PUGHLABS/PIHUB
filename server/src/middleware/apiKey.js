export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ message: 'API key required' })
  }

  // TODO: validate against stored station API keys in database
  // For now, accept any non-empty key during development
  req.stationKey = apiKey
  next()
}
