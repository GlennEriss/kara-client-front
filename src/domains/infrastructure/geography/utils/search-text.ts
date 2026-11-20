export function geographySearchText(
  name: string,
  ...additional: (string | undefined)[]
) {
  return [name, ...additional]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
