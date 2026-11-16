/**
 * Captions are published exactly as saved, so they must hold only what the audience reads.
 * The assistant has written working notes into captions ("[CAROUSEL SLIDES - text for the
 * design, not for posting]", "[CAPTION TO POST]") and checklist boxes that render as empty
 * squares, and a provider published one as it was.
 */

/** A bracketed note meant for the provider or the designer, not the audience. */
const WORKING_NOTE =
  /\[[^\]\n]*\b(caption|slides?|carousel|design|designer|posting|script|scenes?|voice ?over|on[- ]screen|image text|text on (the )?image|notes?|draft|placeholder|phone|website|handle|address)\b[^\]\n]*\]/i;

/** Box and square symbols used as checklist ticks; many phones show them as empty squares. */
const BOX_AT_LINE_START = /^([ \t]*)[☐☑☒□■▢◻◼▪▫]️?[ \t]*/gm;
const BOX_ANYWHERE = /[☐☑☒□■▢◻◼▪▫]️?/g;

/**
 * Throws when a caption carries working notes, telling the model what to do instead.
 * Placeholder fields such as "[Phone Number]" are refused by the same check.
 */
export function assertPublishable(caption: string | undefined | null): void {
  const match = (caption || '').match(WORKING_NOTE);
  if (match) {
    throw new Error(
      `The caption contains a working note, ${match[0]}. A caption is published exactly as written, so it must hold only ` +
        'what the audience reads. Put slide or scene text on the images (create_post_image) or in your reply to the ' +
        'provider, and save the caption again without any bracketed notes.',
    );
  }
}

/** Replaces checklist boxes with bullets at line starts, drops them elsewhere, and removes "�" marks. */
export function tidyCaption(caption: string): string {
  return caption
    .replace(BOX_AT_LINE_START, '$1• ')
    .replace(BOX_ANYWHERE, '')
    .replace(/�/g, '')
    .replace(/[ \t]+$/gm, '');
}
