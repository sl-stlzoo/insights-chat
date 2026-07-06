'use client';

import { signOut, useSession } from 'next-auth/react';

export default function UserSessionControls() {
  const { data: session } = useSession();

  return (
    <div className="chat-user-shell">
      <span className="chat-user-label">
        {session?.user?.name || session?.user?.email || 'Signed in'}
      </span>
      <button
        className="chat-signout"
        onClick={() => signOut({ callbackUrl: '/signin' })}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
