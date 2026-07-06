'use client';

import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <FluentProvider theme={webLightTheme}>
      <SessionProvider>{children}</SessionProvider>
    </FluentProvider>
  );
}
