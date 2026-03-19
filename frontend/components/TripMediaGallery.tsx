'use client';

import React from 'react';
import { ExternalLink, ImageIcon, Video } from 'lucide-react';

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|#|$)/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

const cleanUrl = (value: any) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isDataImageUrl = (url: string) => /^data:image\//i.test(url);
const isDataVideoUrl = (url: string) => /^data:video\//i.test(url);
const isBlobUrl = (url: string) => /^blob:/i.test(url);
const isDirectVideoSource = (url: string) => VIDEO_EXTENSIONS.test(url) || isDataVideoUrl(url) || isBlobUrl(url);

const inferMediaType = (item: any): 'image' | 'video' | null => {
  const explicit = typeof item?.type === 'string' ? item.type.trim().toLowerCase() : '';
  if (explicit === 'image' || explicit === 'video') {
    return explicit;
  }

  const url = cleanUrl(item?.url);
  if (!url) return null;
  if (isDataImageUrl(url)) return 'image';
  if (isDataVideoUrl(url)) return 'video';
  if (IMAGE_EXTENSIONS.test(url)) return 'image';
  if (VIDEO_EXTENSIONS.test(url)) return 'video';
  if (/youtu\.be|youtube\.com|vimeo\.com/i.test(url)) return 'video';
  return null;
};

export const getTripGallery = (trip: any) =>
  ((trip?.media_gallery || []) as any[])
    .map((item: any, index: number) => {
      const url = cleanUrl(item?.url);
      const type = inferMediaType(item);
      if (!url || !type) return null;
      return {
        id: item?.id || `${type}-${index}`,
        type,
        url,
        caption: cleanUrl(item?.caption),
      };
    })
    .filter(Boolean) as Array<{ id: string; type: 'image' | 'video'; url: string; caption: string }>;

export const getTripThumbnail = (trip: any) => {
  const cover = cleanUrl(trip?.cover_image);
  if (cover) return cover;
  const firstImage = getTripGallery(trip).find((item) => item.type === 'image');
  return firstImage?.url || '';
};

const getYouTubeEmbed = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtu.be')) {
      const videoId = parsed.pathname.replace(/\//g, '');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {}
  return null;
};

type TripMediaGalleryProps = {
  trip: any;
  title?: string;
  emptyText?: string;
};

export function TripMediaGallery({
  trip,
  title = 'Trip Media',
  emptyText = 'No photos or videos added yet.',
}: TripMediaGalleryProps) {
  const gallery = getTripGallery(trip);

  if (gallery.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#11161f] p-4 md:p-5">
      <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{title}</div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {gallery.map((item) => {
          const youtubeEmbed = item.type === 'video' ? getYouTubeEmbed(item.url) : null;
          return (
            <div key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1118]">
              <div className="aspect-video bg-black/30">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.caption || 'Trip media'} className="h-full w-full object-cover" />
                ) : youtubeEmbed ? (
                  <iframe
                    src={youtubeEmbed}
                    title={item.caption || 'Trip video'}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : isDirectVideoSource(item.url) ? (
                  <video src={item.url} controls playsInline className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-300">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10"
                    >
                      <ExternalLink size={15} />
                      Open video
                    </a>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3 border-t border-white/10 px-4 py-3">
                <div className="mt-0.5 text-sky-300">
                  {item.type === 'image' ? <ImageIcon size={16} /> : <Video size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100">
                    {item.caption || (item.type === 'image' ? 'Trip photo' : 'Trip video')}
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-400">{item.url}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
