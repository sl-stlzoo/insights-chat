'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button
      className="signin-button"
      onClick={() => signIn('azure-ad', { callbackUrl: '/maude' })}
      type="button"
    >
      Sign in with Microsoft Entra ID
    </button>
  );
}
