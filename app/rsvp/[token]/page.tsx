import type { Metadata } from 'next';
import { decodeRsvpToken } from '@/lib/planner/rsvpLink';
import RsvpClient from './RsvpClient';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const payload = decodeRsvpToken(token);
  if (!payload) return { title: 'RSVP' };

  const ms = (payload.lang ?? 'ms') === 'ms';
  const title = `RSVP — ${payload.couple}`;
  const description = ms
    ? `Anda dijemput ke majlis perkahwinan ${payload.couple}${payload.date ? ` pada ${payload.date}` : ''}. RSVP sekarang melalui MajlisMate.`
    : `You're invited to ${payload.couple}'s wedding${payload.date ? ` on ${payload.date}` : ''}. RSVP now via MajlisMate.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function RsvpPage({ params }: Props) {
  const { token } = await params;
  return <RsvpClient token={token} />;
}
