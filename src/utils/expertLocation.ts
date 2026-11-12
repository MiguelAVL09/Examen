export const expertHash = '#expertos';

export function isExpertLocation() {
  return location.hash === expertHash || location.hash.startsWith(expertHash + '/');
}

export function clearExpertLocation() {
  if (isExpertLocation()) history.replaceState(null, '', location.pathname + location.search);
}
