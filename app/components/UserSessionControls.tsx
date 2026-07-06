'use client';

import { Avatar, Badge, Button } from '@fluentui/react-components';
import { signOut, useSession } from 'next-auth/react';

export default function UserSessionControls() {
  const { data: session } = useSession();
  const displayName = session?.user?.name || session?.user?.email || 'Signed in';

  return (
    <div className="chat-user-shell">
      <Avatar className="chat-user-avatar" name={displayName} size={24} color="colorful" />
      <span className="chat-user-label" title={displayName}>
        {displayName}
      </span>
      <Badge className="chat-user-badge" appearance="filled" color="success" size="tiny">
        Signed in
      </Badge>
      <Button
        className="chat-signout"
        appearance="subtle"
        size="small"
        onClick={() => signOut({ callbackUrl: '/signin' })}
        type="button"
      >
        Sign out
      </Button>
    </div>
  );
}
