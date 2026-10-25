import { useState } from 'react';
import { api } from '../lib/api';

export default function Avatar({ user, size = 22 }: {
  user: { username: string; color?: string | null; avatar_url?: string | null };
  size?: number;
}) {
  const src = api.avatarSrc(user.avatar_url);
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <img src={src} alt="" width={size} height={size} onError={() => setBroken(true)}
        style={{ borderRadius: 6, marginRight: 6, verticalAlign: 'middle', objectFit: 'cover' }} />
    );
  }
  return (
    <span className="avatar" style={{ background: user.color || '#33ff66' }}>
      {user.username[0]?.toUpperCase()}
    </span>
  );
}
