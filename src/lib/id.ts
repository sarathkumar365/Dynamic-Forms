export function nanoid(size = 21) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-'
  let id = ''
  const array = new Uint8Array(size)
  crypto.getRandomValues(array)
  for (let i = 0; i < size; i++) id += chars[array[i] % chars.length]
  return id
}
