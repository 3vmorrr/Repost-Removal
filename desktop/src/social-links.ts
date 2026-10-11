export const SOCIAL_LINKS = Object.freeze({
  instagram: 'https://instagram.com/z.3morr',
  facebook: 'https://www.facebook.com/share/186DF9U1PM/?mibextid=wwXIfr',
  whatsapp: 'https://wa.me/201026866840',
  // Keep the ampersands as query separators so all three share parameters are distinct.
  linkedin: 'https://www.linkedin.com/in/omar-ebrahim-6a94903a2?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
  youtube: 'https://www.youtube.com/@3vmorr',
  telegram: 'https://t.me/omarebrahim1'
} as const);

export type SocialPlatform = keyof typeof SOCIAL_LINKS;

export function socialLinkFor(platform: unknown): string {
  if (typeof platform !== 'string' || !Object.prototype.hasOwnProperty.call(SOCIAL_LINKS, platform)) {
    throw new Error('Unsupported social link.');
  }
  return SOCIAL_LINKS[platform as SocialPlatform];
}
