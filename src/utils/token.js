/**
 * 解析JWT token
 * @param {string} token JWT token字符串
 * @returns {object|null} 解析后的token对象，如果解析失败则返回null
 */
export function parseJwtToken(token) {
  if (!token) {
    return null
  }

  // 去掉可能存在的 "Bearer " 前缀
  const tokenString = token.startsWith('Bearer ') ? token.substring(7) : token

  try {
    // 将token按点分割为三部分：header.payload.signature
    const parts = tokenString.split('.')
    if (parts.length !== 3) {
      console.error('Invalid token format')
      return null
    }

    // 解码payload部分 (第二部分)
    // 需要先替换URL安全的base64字符，然后再进行base64解码
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '=')

    const decodedPayload = atob(payload)
    return JSON.parse(decodedPayload)
  } catch (error) {
    console.error('Failed to parse JWT token:', error)
    return null
  }
}

/**
 * 检查JWT token是否过期
 * @param {string} token JWT token字符串
 * @returns {boolean} 如果token已过期返回true，否则返回false
 */
export function isTokenExpired(token) {
  const parsedToken = parseJwtToken(token)

  if (!parsedToken) {
    return true // 如果无法解析token，则认为已过期
  }

  // 检查exp字段是否存在以及是否已过期
  if (parsedToken.exp) {
    const currentTime = Math.floor(Date.now() / 1000) // 当前时间戳（秒）
    return parsedToken.exp < currentTime
  }

  // 如果没有exp字段，则认为不过期
  return false
}

/**
 * 获取token的过期时间
 * @param {string} token JWT token字符串
 * @returns {Date|null} token的过期时间，如果无法获取则返回null
 */
export function getTokenExpiration(token) {
  const parsedToken = parseJwtToken(token)

  if (!parsedToken || !parsedToken.exp) {
    return null
  }

  // exp是以秒为单位的时间戳，需要转换为毫秒
  return new Date(parsedToken.exp * 1000)
}

/**
 * 获取token剩余有效时间（毫秒）
 * @param {string} token JWT token字符串
 * @returns {number|null} token剩余有效时间（毫秒），如果无法获取则返回null
 */
export function getTokenRemainingTime(token) {
  const expiration = getTokenExpiration(token)

  if (!expiration) {
    return null
  }

  const currentTime = new Date()
  return expiration.getTime() - currentTime.getTime()
}
