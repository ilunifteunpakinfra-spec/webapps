export type AnnouncementImage = {
  id: string;
  public_url: string;
  caption: string | null;
  alt_text: string;
  position: number;
};

type Props = {
  images: AnnouncementImage[];
};

/**
 * Renders an announcement's images. Each `alt_text` comes from the author's
 * input and is a plain React attribute, so React escapes it — it is never
 * interpreted as HTML.
 */
export default function AnnouncementImages({ images }: Props) {
  if (images.length === 0) return null;

  return (
    <div className="announcement-gallery" data-testid="announcement-gallery">
      {images
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((image) => (
          <figure key={image.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.public_url}
              alt={image.alt_text}
              loading="lazy"
              className="announcement-img"
            />
            {image.caption && (
              <figcaption className="announcement-caption">
                {image.caption}
              </figcaption>
            )}
          </figure>
        ))}
    </div>
  );
}
