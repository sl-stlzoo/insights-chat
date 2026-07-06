'use client';

import { Avatar, Button } from '@fluentui/react-components';
import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <div className="signin-button-wrap">
      <Avatar className="signin-avatar" name="Microsoft Entra ID" color="brand" size={28} />
      <Button
        className="signin-button"
        appearance="primary"
        onClick={() => signIn('azure-ad', { callbackUrl: '/maude' })}
        type="button"
      >
        Sign in with Microsoft Entra ID
      </Button>
    </div>
  );
}
