import { query } from '../utils/database'

export const getByOpenId = async (openid: string) => {
  const rows: any = await query(`SELECT id, openid, nickname, avatar_url AS avatarUrl, is_vip AS isVip, vip_expire_at AS vipExpireAt FROM users WHERE openid = ? LIMIT 1`, [openid])
  return rows[0] || null
}

export const createUser = async (params: { openid: string, nickname?: string, avatarUrl?: string }) => {
  const res: any = await query(`INSERT INTO users (openid, nickname, avatar_url) VALUES (?, ?, ?)`, [params.openid, params.nickname || null, params.avatarUrl || null])
  const rows: any = await query(`SELECT id, openid, nickname, avatar_url AS avatarUrl, is_vip AS isVip, vip_expire_at AS vipExpireAt FROM users WHERE id = ?`, [res.insertId])
  return rows[0]
}

export const updateLastLogin = async (openid: string) => {
  await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE openid = ?`, [openid])
}

export const getById = async (id: number) => {
  const rows: any = await query(`SELECT id, openid, nickname, avatar_url AS avatarUrl, is_vip AS isVip, vip_expire_at AS vipExpireAt FROM users WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}